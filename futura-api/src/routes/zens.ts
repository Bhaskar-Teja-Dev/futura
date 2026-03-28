import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const purchaseSchema = z.object({
  razorpay_payment_id: z.string().min(1)
})

const ZEN_PACK_AMOUNT_PAISE = 5000 // ₹50 in paise
const ZEN_PACK_CREDITS = 500

router.get('/balance', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const { data, error } = await supabase
    .from('profiles')
    .select('zens')
    .eq('id', c.get('userId'))
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ zens: data.zens })
})

router.post('/purchase', zValidator('json', purchaseSchema), async (c) => {
  const userId = c.get('userId')
  const { razorpay_payment_id } = c.req.valid('json')

  // Verify the payment with Razorpay API
  const credentials = btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`)
  const rzpRes = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
    {
      method: 'GET',
      headers: { Authorization: `Basic ${credentials}` }
    }
  )

  if (!rzpRes.ok) {
    return c.json({ error: 'razorpay_verification_failed' }, 400)
  }

  const payment = (await rzpRes.json()) as { status: string; amount: number }

  if (payment.status !== 'captured') {
    return c.json({ error: 'payment_not_captured', status: payment.status }, 400)
  }

  if (payment.amount !== ZEN_PACK_AMOUNT_PAISE) {
    return c.json({ error: 'amount_mismatch' }, 400)
  }

  // Credit the Zens to the user's profile
  const supabase = getSupabase(c.env)
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('zens')
    .eq('id', userId)
    .single()

  if (fetchError || !profile) {
    return c.json({ error: 'profile_not_found' }, 404)
  }

  const newBalance = (profile.zens ?? 0) + ZEN_PACK_CREDITS

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ zens: newBalance })
    .eq('id', userId)

  if (updateError) {
    return c.json({ error: updateError.message }, 500)
  }

  return c.json({ success: true, zens: newBalance })
})

export { router as zensRouter }
