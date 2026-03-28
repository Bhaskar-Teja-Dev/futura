'use client'

import { useEffect, useState } from 'react'
import { getCustomerInfo } from '../../lib/revenuecat'
import { CustomerPortalLink } from '../../components/CustomerPortalLink'

export default function SettingsPage() {
  const [customerInfoText, setCustomerInfoText] = useState('Loading customer info...')
  const [portalUrl, setPortalUrl] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const info = await getCustomerInfo()
        setCustomerInfoText(JSON.stringify(info, null, 2))
        // RevenueCat's customer management UX for web is hosted. Keep this placeholder
        // ready to be swapped with your configured management URL.
        setPortalUrl('https://www.revenuecat.com/docs/web/web-billing/web-sdk')
      } catch (error) {
        console.error(error)
        setCustomerInfoText('Could not load customer info.')
      }
    }

    void load()
  }, [])

  return (
    <main>
      <h1>Settings (Placeholder)</h1>
      <div className="card">
        <h2>Subscription</h2>
        <CustomerPortalLink url={portalUrl} />
      </div>
      <div className="card">
        <h2>Customer info</h2>
        <pre>{customerInfoText}</pre>
      </div>
    </main>
  )
}
