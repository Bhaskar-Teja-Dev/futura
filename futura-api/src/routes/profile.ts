import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const profileUpdateSchema = z.object({
  display_name: z.string().min(1).max(120).optional(),
  age: z.number().int().min(10).max(120).optional(),
  retirement_age: z.number().int().min(40).max(90).optional(),
  monthly_income: z.number().positive().optional(),
  onboarding_complete: z.boolean().optional()
})

router.get('/', async (c) => {
  const supabaseAdmin = getSupabase(c.env)
  const supabase = getSupabase(c.env, c.get('token'))
  const userId = c.get('userId')

  // Fetch existing profile (bypass RLS for existence check)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  let profile = existingProfile
  if (!existingProfile) {
    // Only initialize if missing
    const { data: newProfile, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: userId })
      .select('*')
      .single()

    if (insertError) {
      return c.json({ error: insertError.message }, 500)
    }
    profile = newProfile
  }

  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (subError) {
    return c.json({ error: subError.message }, 500)
  }

  return c.json({ profile, subscription })
})

router.patch('/', zValidator('json', profileUpdateSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')

  // Use Service Role and UPSERT to ensure the row exists (bypass RLS for initialization)
  const supabaseAdmin = getSupabase(c.env)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, ...body }, { onConflict: 'id' })
    .select('*')
    .maybeSingle()

  if (error) {
    console.error("Supabase update error:", error)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ profile: data })
})

export { router as profileRouter }
