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
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Welcome to Futura</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
        Let's set up your financial goals so we can project your retirement pot.
      </p>

      <div style={{ padding: '2rem', border: '1px solid #eaeaea', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="currentAge" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            Current age
          </label>
          <input
            id="currentAge"
            type="number"
            value={currentAge}
            onChange={(e) => setCurrentAge(Number(e.target.value))}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="retirementAge" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            Retirement age
          </label>
          <input
            id="retirementAge"
            type="number"
            value={retirementAge}
            onChange={(e) => setRetirementAge(Number(e.target.value))}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="targetMonthlyIncome" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            Target monthly income (GBP)
          </label>
          <input
            id="targetMonthlyIncome"
            type="number"
            value={targetMonthlyIncome}
            onChange={(e) => setTargetMonthlyIncome(Number(e.target.value))}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="button"
          onClick={saveGoal}
          disabled={status === 'Saving...'}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: status === 'Saving...' ? '#9ca3af' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'Saving...' ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            width: '100%',
            marginBottom: '1rem'
          }}
        >
          {status === 'Saving...' ? 'Saving...' : 'Save goal'}
        </button>

        {status && (
          <p style={{ textAlign: 'center', color: status.includes('Failed') ? '#dc2626' : '#16a34a', margin: '0 0 1rem 0' }}>
            {status}
          </p>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <a href="/dashboard" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '500' }}>
          Skip for now →
        </a>
      </div>
    </main>
  )
}
