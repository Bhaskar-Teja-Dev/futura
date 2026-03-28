'use client'

import { useEffect } from 'react'
import { createSupabaseBrowserClient } from '../lib/supabase/browser'
import { initRevenueCat } from '../lib/revenuecat'

export function RevenueCatProvider() {
  useEffect(() => {
    const boot = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {
          data: { session }
        } = await supabase.auth.getSession()

        if (session?.user?.id) {
          await initRevenueCat(session.user.id)
        }
      } catch (error) {
        console.error('RevenueCatProvider failed to initialize SDK', error)
      }
    }

    void boot()
  }, [])

  return null
}
