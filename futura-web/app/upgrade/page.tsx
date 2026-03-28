'use client'

import { useEffect, useState } from 'react'
import { PaywallModal } from '../../components/PaywallModal'
import { api } from '../../lib/api'

export default function UpgradePage() {
  const [zens, setZens] = useState<number | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [message, setMessage] = useState('')

  const loadProfile = async () => {
    try {
      const result = await api.profile.get() as {
        profile?: { zens: number }
        subscription?: { entitlement: string; expires_at: string | null }
      }

      setZens(result?.profile?.zens ?? 0)

      const sub = result?.subscription
      const active =
        sub?.entitlement === 'pro' &&
        (!sub.expires_at || new Date(sub.expires_at) > new Date())
      setIsPro(active)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const handlePurchasePro = async () => {
    setPurchasing(true)
    setMessage('')
    try {
      await api.subscriptions.purchasePro()
      setMessage('Pro unlocked for 30 days!')
      await loadProfile()
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.includes('insufficient_zens')) {
        setMessage('Not enough Zens. Buy more below!')
      } else {
        setMessage('Failed to purchase Pro. Please try again.')
      }
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <main>
      <h1>Upgrade to Futura Pro</h1>

      <div className="card">
        <h2>Your Balance</h2>
        <p>{zens !== null ? `${zens} Zens` : 'Loading...'}</p>
        {isPro && <p><strong>✅ Pro is active</strong></p>}
      </div>

      <div className="card">
        <h2>Unlock Pro — 500 Zens for 30 Days</h2>
        <button
          type="button"
          onClick={handlePurchasePro}
          disabled={purchasing || isPro || (zens !== null && zens < 500)}
        >
          {isPro
            ? 'Already Pro'
            : zens !== null && zens < 500
              ? `Need ${500 - zens} more Zens`
              : purchasing
                ? 'Processing...'
                : 'Unlock Pro (500 Zens)'}
        </button>
        {message ? <p>{message}</p> : null}
      </div>

      <div className="card">
        <h2>Buy Zens</h2>
        <PaywallModal onSuccess={(newBalance) => setZens(newBalance)} />
      </div>
    </main>
  )
}
