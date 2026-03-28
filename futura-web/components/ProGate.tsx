'use client'

import { useEffect, useState } from 'react'
import { hasFuturaProEntitlement } from '../lib/revenuecat'

type ProGateProps = {
  children: React.ReactNode
}

export function ProGate({ children }: ProGateProps) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking')

  useEffect(() => {
    const check = async () => {
      try {
        const hasPro = await hasFuturaProEntitlement()
        setStatus(hasPro ? 'allowed' : 'blocked')
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
