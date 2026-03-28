'use client'

import { useEffect, useState } from 'react'
import { PaywallModal } from '../../components/PaywallModal'
import {
  getEntitlementName,
  getExpectedProductId,
  validateRevenueCatConfiguration
} from '../../lib/revenuecat'

export default function UpgradePage() {
  const [offeringInfo, setOfferingInfo] = useState<string>('Loading offerings...')

  useEffect(() => {
    const load = async () => {
      try {
        const config = await validateRevenueCatConfiguration()
        setOfferingInfo(
          `Entitlement: ${getEntitlementName()} | Expected product: ${getExpectedProductId()} | Current offering: ${config.currentOfferingId ?? 'none'} | Products: ${config.productIds.join(', ') || 'none'} | Product configured: ${config.hasExpectedProduct ? 'yes' : 'no'}`
        )
      } catch (error) {
        console.error(error)
        setOfferingInfo('Could not load offerings. Make sure RevenueCat app/offering is configured.')
      }
    }

    void load()
  }, [])

  return (
    <main>
      <h1>Upgrade to Futura Pro</h1>
      <p>{offeringInfo}</p>
      <PaywallModal />
    </main>
  )
}
