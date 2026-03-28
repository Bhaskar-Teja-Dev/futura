import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const profileUpdateSchema = z.object({
  display_name: z.string().min(1).max(120).optional(),
  onboarding_complete: z.boolean().optional()
})

router.get('/', async (c) => {
  const supabase = getSupabase(c.env)
  const userId = c.get('userId')

  const [{ data: profile, error: profileError }, { data: subscription, error: subError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle()
    ])

  if (profileError || subError) {
    return c.json({ error: profileError?.message ?? subError?.message ?? 'unknown_error' }, 500)
  }

  return c.json({ profile, subscription })
})

router.patch('/', zValidator('json', profileUpdateSchema), async (c) => {
  const supabase = getSupabase(c.env)
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ profile: data })
})

export { router as profileRouter }
