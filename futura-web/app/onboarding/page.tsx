'use client'

import { useState } from 'react'
import { api } from '../../lib/api'

export default function OnboardingPage() {
  const [currentAge, setCurrentAge] = useState(22)
  const [retirementAge, setRetirementAge] = useState(65)
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(2000)
  const [status, setStatus] = useState('')

  const saveGoal = async () => {
    setStatus('Saving...')
    try {
      await api.goals.upsert({
        current_age: currentAge,
        retirement_age: retirementAge,
        target_monthly_income: targetMonthlyIncome,
        annual_return_rate: 0.07,
        risk_profile: 'moderate'
      })
      setStatus('Goal saved. Go to dashboard.')
    } catch (error) {
      console.error(error)
      setStatus('Failed to save goal.')
    }
  }

  return (
    <main>
      <h1>Onboarding (Placeholder)</h1>
      <div className="card">
        <label htmlFor="currentAge">Current age</label>
        <input
          id="currentAge"
          type="number"
          value={currentAge}
          onChange={(e) => setCurrentAge(Number(e.target.value))}
        />

        <label htmlFor="retirementAge">Retirement age</label>
        <input
          id="retirementAge"
          type="number"
          value={retirementAge}
          onChange={(e) => setRetirementAge(Number(e.target.value))}
        />

        <label htmlFor="targetMonthlyIncome">Target monthly income (GBP)</label>
        <input
          id="targetMonthlyIncome"
          type="number"
          value={targetMonthlyIncome}
          onChange={(e) => setTargetMonthlyIncome(Number(e.target.value))}
        />

        <button type="button" onClick={saveGoal}>
          Save goal
        </button>
        <p>{status}</p>
      </div>
      <a href="/dashboard">Go to Dashboard</a>
    </main>
  )
}
