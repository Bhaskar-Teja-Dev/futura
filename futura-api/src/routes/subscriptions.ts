import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const purchaseSchema = z.object({
  razorpay_payment_id: z.string().min(1)
})

const ELITE_PRICE_PAISE = 19900 // 199 INR

router.post('/purchase-elite', zValidator('json', purchaseSchema), async (c) => {
  const userId = c.get('userId')
  const { razorpay_payment_id } = c.req.valid('json')

  const credentials = btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`)
  const rzpRes = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` }
    }
  )

  if (!rzpRes.ok) return c.json({ error: 'razorpay_verification_failed' }, 400)

  let payment = (await rzpRes.json()) as { status: string; amount: number }

  if (payment.status === 'authorized') {
    const captureRes = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}/capture`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payment.amount, currency: "INR" })
      }
    )
    if (captureRes.ok) payment = (await captureRes.json()) as any
  }

  if (payment.status !== 'captured') return c.json({ error: 'payment_not_captured' }, 400)
  if (payment.amount < ELITE_PRICE_PAISE) return c.json({ error: 'insufficient_payment_amount' }, 400)

  // Successfully paid 199 INR for Elite
  const supabase = getSupabase(c.env, c.get('token'))
  
  console.log('Starting subscription update for user:', userId)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  // Step 1: Upsert subscription
  const { data: subData, error: subError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      entitlement: 'elite',
      streak_recovery_tokens: 2,
      display_name: profileRow?.display_name ?? null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()

  if (subError) {
    console.error('Upsert failed:', JSON.stringify(subError))
    return c.json({ error: 'subscription_update_failed', details: subError.message }, 500)
  }

  console.log('Upsert successful:', subData)

  // Step 2: Update tokens via RPC (fallback if upsert didn't set tokens)
  const { error: rpcError } = await supabase.rpc('increment_streak_tokens', { user_id: userId, amount: 0 })
  
  if (rpcError) {
    console.error('RPC failed:', JSON.stringify(rpcError))
    // Don't fail the request if RPC fails - tokens were already set in upsert
  }

  return c.json({ success: true, message: 'Welcome to the Elite' })
})

export { router as subscriptionsRouter }
