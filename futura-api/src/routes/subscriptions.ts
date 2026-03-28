import { Hono } from 'hono'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const PRO_COST_ZENS = 500
const PRO_DURATION_DAYS = 30

router.post('/purchase-pro', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)

  // Call the atomic database function
  const { data, error } = await supabase.rpc('purchase_pro_with_zens', {
    p_user_id: userId,
    p_cost: PRO_COST_ZENS,
    p_days: PRO_DURATION_DAYS
  })

  if (error) {
    // The DB function raises an exception if insufficient Zens
    const isInsufficientZens = error.message?.includes('Insufficient')
    return c.json(
      { error: isInsufficientZens ? 'insufficient_zens' : error.message },
      isInsufficientZens ? 400 : 500
    )
  }

  return c.json({ success: true, result: data })
})

export { router as subscriptionsRouter }
