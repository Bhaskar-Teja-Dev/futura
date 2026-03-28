import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const goalsSchema = z.object({
  current_age: z.number().int().min(18).max(100),
  retirement_age: z.number().int().min(40).max(90),
  target_monthly_income: z.number().positive().max(100000),
  annual_return_rate: z.number().min(0).max(1).optional(),
  risk_profile: z.enum(['conservative', 'moderate', 'aggressive']).optional()
})

router.get('/', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', c.get('userId'))
    .maybeSingle()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ goal: data })
})

router.post('/', zValidator('json', goalsSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const supabaseAdmin = getSupabase(c.env)

  // 1. Ensure profile row exists FIRST (Fixes foreign key constraint violation)
  await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, onboarding_complete: true }, { onConflict: 'id' })

  // 2. Now it is safe to upsert goals
  const { data, error } = await supabaseAdmin
    .from('user_goals')
    .upsert(
      {
        user_id: userId,
        ...body,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) {
    console.error("Supabase goals error:", error)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ goal: data }, 201)
})

export { router as goalsRouter }
