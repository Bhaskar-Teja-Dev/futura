import type { Env } from '../types'

const RC_BASE_URL = 'https://api.revenuecat.com/v1'

export type Entitlement = 'free' | 'pro'

type SubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null }>
  }
}

export async function getOrCreateSubscriber(env: Env, userId: string) {
  const res = await fetch(`${RC_BASE_URL}/subscribers/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.REVENUECAT_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    throw new Error(`RevenueCat subscriber fetch failed: ${res.status} ${await res.text()}`)
  }

  return (await res.json()) as SubscriberResponse
}

export function mapSubscriberToEntitlement(
  subscriber: SubscriberResponse['subscriber'],
  entitlementName = 'Futura Pro'
): Entitlement {
  const activeEntitlement = subscriber?.entitlements?.[entitlementName]
  if (!activeEntitlement) {
    return 'free'
  }

  if (!activeEntitlement.expires_date) {
    return 'pro'
  }

  return new Date(activeEntitlement.expires_date) > new Date() ? 'pro' : 'free'
}
