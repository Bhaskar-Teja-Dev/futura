'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function SettingsPage() {
  const [zens, setZens] = useState<number | null>(null)
  const [proStatus, setProStatus] = useState<string>('Loading...')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const result = await api.profile.get() as {
          profile?: { zens: number }
          subscription?: { entitlement: string; expires_at: string | null }
        }

        setZens(result?.profile?.zens ?? 0)

        const sub = result?.subscription
        if (sub?.entitlement === 'pro') {
          const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null
          if (!expiresAt || expiresAt > new Date()) {
            setProStatus(`Pro active${expiresAt ? ` — expires ${expiresAt.toLocaleDateString()}` : ''}`)
          } else {
            setProStatus('Pro expired')
          }
        } else {
          setProStatus('Free')
        }
      } catch (err) {
        console.error(err)
        setError('Could not load profile info.')
      }
    }

    void load()
  }, [])

  return (
    <main>
      <h1>Settings</h1>
      {error ? (
        <p>{error}</p>
      ) : (
        <>
          <div className="card">
            <h2>Zens Balance</h2>
            <p>{zens !== null ? `${zens} Zens` : 'Loading...'}</p>
          </div>
          <div className="card">
            <h2>Subscription</h2>
            <p>{proStatus}</p>
            <a href="/upgrade">Manage subscription</a>
          </div>
        </>
      )}
    </main>
  )
}
