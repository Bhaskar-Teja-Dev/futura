import { Hono } from 'hono'
import { getSupabase } from '../lib/supabase'
import type { Env } from '../types'

const router = new Hono<{ Bindings: Env }>()

type RevenueCatWebhookEvent = {
  event: {
    type: string
    app_user_id: string
    expiration_at_ms?: number | null
  }
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function verifySignature(body: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = toHex(digest)

  if (signature.length !== expected.length) {
    return false
  }

  const encoder = new TextEncoder()
  const sigBuf = encoder.encode(signature)
  const expBuf = encoder.encode(expected)

  // timingSafeEqual is available globally in Cloudflare Workers (nodejs_compat)
  if (typeof globalThis.crypto !== 'undefined' && 'timingSafeEqual' in globalThis.crypto) {
    return (globalThis.crypto as unknown as { timingSafeEqual: (a: BufferSource, b: BufferSource) => boolean }).timingSafeEqual(sigBuf, expBuf)
  }

  // Fallback: constant-time comparison
  let mismatch = 0
  for (let i = 0; i < sigBuf.length; i++) {
    mismatch |= sigBuf[i] ^ expBuf[i]
  }
  return mismatch === 0
}

router.post('/revenuecat', async (c) => {
  const signature = c.req.header('X-RevenueCat-Signature') ?? ''
  const body = await c.req.text()

  if (!(await verifySignature(body, signature, c.env.REVENUECAT_WEBHOOK_SECRET))) {
    return c.json({ error: 'invalid_signature' }, 401)
  }

  const payload = JSON.parse(body) as RevenueCatWebhookEvent
  const event = payload.event
  const entitlement = ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION'].includes(event.type)
    ? 'pro'
    : 'free'
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null

  const supabase = getSupabase(c.env)
  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: event.app_user_id,
      revenuecat_customer_id: event.app_user_id,
      entitlement,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ received: true })
})

export { router as webhooksRouter }
