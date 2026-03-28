import { createMiddleware } from 'hono/factory'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

export const requirePro = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const userId = c.get('userId')
    const supabase = getSupabase(c.env, c.get('token'))
    const { data } = await supabase
      .from('user_subscriptions')
      .select('entitlement, expires_at')
      .eq('user_id', userId)
      .single()

    const isPro =
      data?.entitlement === 'pro' &&
      (!data.expires_at || new Date(data.expires_at) > new Date())

    if (!isPro) {
      return c.json({ error: 'pro_required', upgrade_url: '/upgrade' }, 403)
    }

    await next()
  }
)
