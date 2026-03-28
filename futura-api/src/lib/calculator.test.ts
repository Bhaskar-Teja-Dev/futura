import { expect, test } from 'vitest'
import { calculateRetirement } from './calculator'

test('calculates correct retirement values based on verified numeric example', () => {
	const result = calculateRetirement({
		currentAge: 23,
		retirementAge: 60,
		lifeExpectancy: 80,
		monthlyIncome: 45000,
		monthlyExpense: 30000,
		currentSavings: 50000,
		monthlyInvestment: 2000,
		inflationRate: 0.06,
		returnRate: 0.12,
		returnMin: 0.07,
		returnMax: 0.15,
		inflationMin: 0.04,
		inflationMax: 0.09,
		simulations: 10000
	})

	// Ensure it's not an error response
	expect(result).not.toHaveProperty('error')
	const res = result as any

	// DERIVED TIME VARS
	expect(res.yearsToRetirement).toBe(37)
	expect(res.yearsAfterRetirement).toBe(20)
	expect(res.monthsToRetirement).toBe(444)

	// r_monthly ≈ 0.009489
	expect(res.r_monthly).toBeCloseTo(0.00948879, 5)
	// realRate ≈ 0.05660
	expect(res.realRate).toBeCloseTo(0.05660, 4)

	// Helper to allow up to 1% variance
	const expectApprox = (val: number, target: number) => {
		const min = target * 0.99;
		const max = target * 1.01;
		expect(val).toBeGreaterThanOrEqual(min);
		expect(val).toBeLessThanOrEqual(max);
	};

	// MACRO OUTPUTS
	expectApprox(res.futureMonthlyExpense, 259082.6)

	expectApprox(res.corpusNeeded, 36664243)

	expectApprox(res.futureSavings_lumpsum, 3313733)

	expectApprox(res.futureSavings_SIP, 13749239)

	expectApprox(res.futureSavings, 17062972)

	expectApprox(res.deficit, 19601271)

	expect(res.onTrack).toBe(false)

	expectApprox(res.requiredMonthlyInvestment, 2855)

	expectApprox(res.blindnessScore, 0.46)

	// Since probability is a random monte-carlo, keep a wide range
	expect(res.probability).toBeGreaterThanOrEqual(0)
	expect(res.probability).toBeLessThanOrEqual(15)
})
