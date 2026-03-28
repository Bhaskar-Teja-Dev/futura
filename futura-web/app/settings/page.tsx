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
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '1rem', marginBottom: '2rem' }}>Settings</h1>

      {error ? (
        <p style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '4px' }}>{error}</p>
      ) : (
        <>
          <div style={{ padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#444' }}>Zens Balance</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
              {zens !== null ? `🪙 ${zens} Zens` : 'Loading...'}
            </p>
          </div>

          <div style={{ padding: '1.5rem', border: '1px solid #eaeaea', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#444' }}>Subscription Plan</h2>
            <p style={{
              fontSize: '1.1rem',
              fontWeight: '500',
              color: proStatus.includes('Free') ? '#666' : '#16a34a',
              margin: '0.5rem 0 1.5rem'
            }}>
              {proStatus}
            </p>
            <a
              href="/upgrade"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: '500',
                border: '1px solid #d1d5db'
              }}
            >
              Manage subscription
            </a>
          </div>
        </>
      )}
    </main>
  )
}
