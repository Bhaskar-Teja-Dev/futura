'use client'

import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type ProGateProps = {
  children: React.ReactNode
}

export function ProGate({ children }: ProGateProps) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const result = await api.profile.get() as {
          subscription?: { entitlement: string; expires_at: string | null }
        }
        const sub = result?.subscription
        const isPro =
          sub?.entitlement === 'pro' &&
          (!sub.expires_at || new Date(sub.expires_at) > new Date())
        setStatus(isPro ? 'allowed' : 'blocked')
      } catch {
        setStatus('blocked')
      }
    }

    void check()
  }, [])

  if (status === 'checking') {
    return <p>Checking entitlement...</p>
  }

  if (status === 'blocked') {
    return (
      <div>
        <p>This feature requires Futura Pro.</p>
        <a href="/upgrade">Upgrade now</a>
      </div>
    )
  }

  return <>{children}</>
}
