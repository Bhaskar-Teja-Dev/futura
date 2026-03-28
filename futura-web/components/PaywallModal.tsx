'use client'

import { useState } from 'react'
import { api } from '../lib/api'

type PaywallModalProps = {
  onSuccess?: (newBalance: number) => void
}

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
    document.head.appendChild(script)
  })
}

export function PaywallModal({ onSuccess }: PaywallModalProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleBuyZens = async () => {
    setLoading(true)
    setMessage('')

    try {
      await loadRazorpayScript()

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!keyId) {
        setMessage('Razorpay key not configured.')
        setLoading(false)
        return
      }

      const options = {
        key: keyId,
        amount: 5000, // ₹50 in paise
        currency: 'INR',
        name: 'Futura',
        description: '500 Zens Credit Pack',
        handler: async (response: { razorpay_payment_id: string }) => {
          try {
            const result = await api.zens.purchase(response.razorpay_payment_id)
            const data = result as { zens: number }
            setMessage(`Success! Your new balance: ${data.zens} Zens`)
            onSuccess?.(data.zens)
          } catch (err) {
            console.error(err)
            setMessage('Payment received but failed to credit Zens. Contact support.')
          }
        },
        theme: {
          color: '#6366f1'
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error(err)
      setMessage('Could not open payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={handleBuyZens} disabled={loading}>
        {loading ? 'Opening Razorpay...' : 'Buy 500 Zens — ₹50'}
      </button>
      {message ? <p>{message}</p> : null}
    </div>
  )
}
