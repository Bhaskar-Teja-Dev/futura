import { createSupabaseBrowserClient } from './supabase/browser'

export type ContributionPayload = {
  amount: number
  contribution_date: string
  note?: string
  currency?: string
}

export type GoalPayload = {
  current_age: number
  retirement_age: number
  target_monthly_income: number
  annual_return_rate?: number
  risk_profile?: 'conservative' | 'moderate' | 'aggressive'
}

export type ProjectionPayload = {
  currentAge: number
  retirementAge: number
  monthlyContribution: number
  annualReturn?: number
  existingPot?: number
}

export type ScenarioPayload = {
  name: string
  currentAge: number
  retirementAge: number
  monthlyContribution: number
  annualReturn: number
  existingPot?: number
}

async function getToken(): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken()
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_API_BASE_URL')
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers
    }
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  return res.json() as Promise<T>
}

export const api = {
  profile: {
    get: () => apiFetch('/api/profile'),
    update: (body: Record<string, unknown>) =>
      apiFetch('/api/profile', { method: 'PATCH', body: JSON.stringify(body) })
  },
  goals: {
    get: () => apiFetch('/api/goals'),
    upsert: (body: GoalPayload) =>
      apiFetch('/api/goals', { method: 'POST', body: JSON.stringify(body) })
  },
  contributions: {
    list: () => apiFetch('/api/contributions'),
    create: (body: ContributionPayload) =>
      apiFetch('/api/contributions', { method: 'POST', body: JSON.stringify(body) })
  },
  projection: {
    calculate: (body: ProjectionPayload) =>
      apiFetch('/api/projection', { method: 'POST', body: JSON.stringify(body) }),
    scenarios: (body: { scenarios: ScenarioPayload[] }) =>
      apiFetch('/api/projection/scenarios', { method: 'POST', body: JSON.stringify(body) })
  },
  allocation: {
    get: () => apiFetch('/api/allocation')
  },
  zens: {
    balance: () => apiFetch('/api/zens/balance'),
    purchase: (razorpay_payment_id: string) =>
      apiFetch('/api/zens/purchase', {
        method: 'POST',
        body: JSON.stringify({ razorpay_payment_id })
      })
  },
  subscriptions: {
    purchasePro: () =>
      apiFetch('/api/subscriptions/purchase-pro', { method: 'POST' })
  }
}
