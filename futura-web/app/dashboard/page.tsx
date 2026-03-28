'use client'

import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

type DashboardData = {
  profile?: unknown
  goal?: unknown
  contributions?: unknown
  projection?: unknown
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({})
  const [status, setStatus] = useState('Loading...')

  const loadData = async () => {
    setStatus('Loading...')
    try {
      const [profile, goals, contributions] = await Promise.all([
        api.profile.get(),
        api.goals.get(),
        api.contributions.list()
      ])

      const goalData = (goals as { goal?: { current_age: number; retirement_age: number; target_monthly_income: number; annual_return_rate?: number } })?.goal

      let projection = null
      if (goalData) {
        // Map available goal data to realistic defaults for the full simulation engine
        projection = await api.projection.calculate({
          currentAge: goalData.current_age || 25,
          retirementAge: goalData.retirement_age || 65,
          lifeExpectancy: 85,
          monthlyIncome: 50000,                            // Default placeholder if missing
          monthlyExpense: 30000,                           // Default placeholder if missing
          currentSavings: 0,
          monthlyInvestment: goalData.target_monthly_income || 5000, // Adapting to new inputs
          inflationRate: 0.06,
          returnRate: goalData.annual_return_rate ?? 0.12,
          returnMin: 0.07,
          returnMax: 0.15,
          inflationMin: 0.04,
          inflationMax: 0.09,
          simulations: 2000
        })
      }

      setData({
        profile,
        goal: goals,
        contributions,
        projection
      })
      setStatus('Loaded')
    } catch (error) {
      console.error(error)
      setStatus('Failed to load dashboard data.')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const quickLog = async () => {
    try {
      await api.contributions.create({
        amount: 10,
        contribution_date: new Date().toISOString().slice(0, 10),
        note: 'Quick log'
      })
      await loadData()
    } catch (error) {
      console.error(error)
      setStatus('Quick log failed.')
    }
  }

  return (
    <main>
      <h1>Dashboard (Placeholder)</h1>
      <button type="button" onClick={quickLog}>
        Quick log 10 GBP
      </button>
      <p>{status}</p>

      <div className="card">
        <h2>Profile + Subscription</h2>
        <pre>{JSON.stringify(data.profile, null, 2)}</pre>
      </div>

      <div className="card">
        <h2>Goal</h2>
        <pre>{JSON.stringify(data.goal, null, 2)}</pre>
      </div>

      <div className="card">
        <h2>Contributions</h2>
        <pre>{JSON.stringify(data.contributions, null, 2)}</pre>
      </div>

      <div className="card">
        <h2>Projection</h2>
        <pre>{JSON.stringify(data.projection, null, 2)}</pre>
      </div>
    </main>
  )
}
