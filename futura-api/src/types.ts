export type Env = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  FRONTEND_ORIGIN?: string
}

export type Variables = {
  userId: string
  userEmail: string
  token: string
}

export type GoalPayload = {
  current_age: number
  retirement_age: number
  target_monthly_income: number
  annual_return_rate?: number
  risk_profile?: 'conservative' | 'moderate' | 'aggressive'
}

export type ContributionPayload = {
  amount: number
  contribution_date: string
  note?: string
  currency?: string
}

export type ProjectionPayload = {
  currentAge: number
  retirementAge: number
  monthlyContribution: number
  annualReturn?: number
  existingPot?: number
}
