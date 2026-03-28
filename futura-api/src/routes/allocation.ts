import { Hono } from 'hono'
import { requirePro } from '../middleware/entitlement'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

router.get('/', requirePro, async (c) => {
  const supabase = getSupabase(c.env)
  const userId = c.get('userId')

  const { data: goal } = await supabase
    .from('user_goals')
    .select('risk_profile, current_age')
    .eq('user_id', userId)
    .maybeSingle()

  const riskProfile = goal?.risk_profile ?? 'moderate'
  const currentAge = goal?.current_age ?? 25

  let allocation = { stocks: 70, bonds: 25, cash: 5 }

  if (riskProfile === 'conservative') {
    allocation = { stocks: 45, bonds: 45, cash: 10 }
  } else if (riskProfile === 'aggressive') {
    allocation = { stocks: 85, bonds: 10, cash: 5 }
  }

  if (currentAge > 45) {
    allocation = {
      stocks: Math.max(35, allocation.stocks - 10),
      bonds: allocation.bonds + 8,
      cash: allocation.cash + 2
    }
  }

  return c.json({ riskProfile, allocation })
})

export { router as allocationRouter }
