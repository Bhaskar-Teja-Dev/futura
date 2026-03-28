import { createClient } from '@supabase/supabase-js'
import type { Env } from '../types'

export function getSupabase(env: Env, token?: string) {
  const key = token ? env.SUPABASE_ANON_KEY : env.SUPABASE_SERVICE_ROLE_KEY
  const options: any = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
  if (token) {
    options.global = { headers: { Authorization: `Bearer ${token}` } }
  }
  return createClient(env.SUPABASE_URL, key, options)
}
