import { createMiddleware } from 'hono/factory'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    const supabase = getSupabase(c.env)
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return c.json({ error: 'invalid_token' }, 401)
    }

    c.set('userId', user.id)
    c.set('userEmail', user.email ?? '')
    await next()
  }
)
