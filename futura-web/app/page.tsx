'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '../lib/supabase/browser'

export default function LandingPage() {
  const [error, setError] = useState<string>('')

  const signInWithGoogle = async () => {
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        throw authError
      }
    } catch (e) {
      console.error(e)
      setError('Google sign-in failed. Check Supabase OAuth settings.')
    }
  }

  return (
    <main>
      <h1>Futura</h1>
      <p>Placeholder frontend is active. Core integrations are wired.</p>
      <button type="button" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
      {error ? <p>{error}</p> : null}
    </main>
  )
}
