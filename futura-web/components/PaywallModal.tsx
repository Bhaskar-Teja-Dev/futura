'use client'

import { useState } from 'react'
import { presentPaywall } from '../lib/revenuecat'

type PaywallModalProps = {
  offeringId?: string
}

export function PaywallModal({ offeringId }: PaywallModalProps) {
  const [message, setMessage] = useState<string>('')

  const showPaywall = async () => {
    const target = document.getElementById('rc-paywall-target')
    if (!target) {
      setMessage('Paywall container not found.')
      return
    }

    try {
      const result = await presentPaywall(target, offeringId)
      setMessage(
        result?.customerInfo?.entitlements?.active?.['Futura Pro']
          ? 'Purchase successful. Futura Pro is now active.'
          : 'Paywall closed.'
      )
    } catch (error) {
      console.error(error)
      setMessage('Could not present paywall. Check RevenueCat setup.')
    }
  }

  return (
    <div>
      <button type="button" onClick={showPaywall}>
        Show RevenueCat Paywall
      </button>
      <div id="rc-paywall-target" style={{ minHeight: 400, marginTop: 12 }} />
      {message ? <p>{message}</p> : null}
    </div>
  )
}
