export type RetirementInputs = {
	currentAge: number
	retirementAge: number
	lifeExpectancy: number
	monthlyIncome: number
	monthlyExpense: number
	currentSavings: number
	monthlyInvestment: number
	inflationRate: number
	returnRate: number
	returnMin: number
	returnMax: number
	inflationMin: number
	inflationMax: number
	simulations: number
}

export type RetirementOutputs = {
	corpusNeeded: number
	futureSavings: number
	futureSavings_lumpsum: number
	futureSavings_SIP: number
	deficit: number
	surplus: number
	onTrack: boolean
	probability: number
	requiredMonthlyInvestment: number
	blindnessScore: number
	status: string
	statusDescription: string
	statusColor: string
	futureMonthlyExpense: number
	yearsToRetirement: number
	yearsAfterRetirement: number
	monthsToRetirement: number
	r_monthly: number
	realRate: number
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

function boxMuller(mean: number, stdDev: number): number {
	const u1 = Math.random()
	const u2 = Math.random()
	// Ensure u1 is not 0 to avoid ln(0)
	const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2)
	return mean + z0 * stdDev
}

export function calculateRetirement(inputs: RetirementInputs): RetirementOutputs | { error: string, field?: string } {
	// SECTION 1 — VALIDATION RULES
	if (inputs.retirementAge <= inputs.currentAge) return { error: 'Retirement age must be greater than current age', field: 'retirementAge' }
	if (inputs.lifeExpectancy <= inputs.retirementAge) return { error: 'Life expectancy must be greater than retirement age', field: 'lifeExpectancy' }
	if (inputs.monthlyExpense >= inputs.monthlyIncome) return { error: 'Monthly expense must be less than monthly income', field: 'monthlyExpense' }
	if (inputs.monthlyInvestment < 0) return { error: 'Monthly investment cannot be negative', field: 'monthlyInvestment' }
	if (inputs.currentSavings < 0) return { error: 'Current savings cannot be negative', field: 'currentSavings' }
	if (inputs.returnMin >= inputs.returnMax) return { error: 'Minimum return must be strictly less than maximum return', field: 'returnMin' }
	if (inputs.inflationMin >= inputs.inflationMax) return { error: 'Minimum inflation must be strictly less than maximum inflation', field: 'inflationMin' }
	if (inputs.returnRate <= inputs.inflationRate) return { error: 'Expected return must be greater than expected inflation', field: 'returnRate' }
	if (inputs.simulations < 1000) return { error: 'Must run at least 1000 simulations', field: 'simulations' }

	// SECTION 2 — DERIVED TIME VARIABLES
	const yearsToRetirement = inputs.retirementAge - inputs.currentAge
	const yearsAfterRetirement = inputs.lifeExpectancy - inputs.retirementAge
	const monthsToRetirement = yearsToRetirement * 12

	// SECTION 3 — RATE CONVERSION
	const r_monthly = Math.pow(1 + inputs.returnRate, 1 / 12) - 1

	// SECTION 4 — DETERMINISTIC CALCULATION
	// 4A. Future Monthly Expense
	const futureMonthlyExpense = inputs.monthlyExpense * Math.pow(1 + inputs.inflationRate, yearsToRetirement)

	// 4B. Corpus Needed
	const realRate = ((1 + inputs.returnRate) / (1 + inputs.inflationRate)) - 1
	let corpusNeeded = 0
	if (realRate !== 0) {
		corpusNeeded = futureMonthlyExpense * 12 * (1 - Math.pow(1 + realRate, -yearsAfterRetirement)) / realRate
	} else {
		corpusNeeded = futureMonthlyExpense * 12 * yearsAfterRetirement
	}

	// 4C. Future Savings
	const futureSavings_lumpsum = inputs.currentSavings * Math.pow(1 + inputs.returnRate, yearsToRetirement)
	let futureSavings_SIP = 0
	if (r_monthly === 0) {
		futureSavings_SIP = inputs.monthlyInvestment * monthsToRetirement
	} else {
		futureSavings_SIP = inputs.monthlyInvestment * (Math.pow(1 + r_monthly, monthsToRetirement) - 1) / r_monthly
	}
	const futureSavings = futureSavings_lumpsum + futureSavings_SIP

	// 4D. Gap / Surplus
	const rawGap = corpusNeeded - futureSavings
	let deficit = 0
	let surplus = 0
	let onTrack = false

	if (rawGap > 0) {
		deficit = rawGap
		surplus = 0
		onTrack = false
	} else {
		deficit = 0
		surplus = Math.abs(rawGap)
		onTrack = true
	}

	// 4E. Required Additional Monthly Investment
	let requiredMonthlyInvestment = 0
	if (!onTrack) {
		if (r_monthly === 0) {
			requiredMonthlyInvestment = deficit / monthsToRetirement
		} else {
			const req = deficit * r_monthly / (Math.pow(1 + r_monthly, monthsToRetirement) - 1)
			requiredMonthlyInvestment = Math.max(0, req)
		}
	}

	// SECTION 5 — MONTE CARLO SIMULATION
	const returnMean = (inputs.returnMin + inputs.returnMax) / 2
	const returnStd = (inputs.returnMax - inputs.returnMin) / 6

	const inflationMean = (inputs.inflationMin + inputs.inflationMax) / 2
	const inflationStd = (inputs.inflationMax - inputs.inflationMin) / 6

	let successCount = 0

	for (let i = 0; i < inputs.simulations; i++) {
		let simReturn = boxMuller(returnMean, returnStd)
		let simInflation = boxMuller(inflationMean, inflationStd)

		simReturn = clamp(simReturn, inputs.returnMin, inputs.returnMax)
		simInflation = clamp(simInflation, inputs.inflationMin, inputs.inflationMax)

		const r_sim_monthly = Math.pow(1 + simReturn, 1 / 12) - 1
		const simFutureExpense = inputs.monthlyExpense * Math.pow(1 + simInflation, yearsToRetirement)
		const simRealRate = ((1 + simReturn) / (1 + simInflation)) - 1

		let corpus_MC = 0
		if (simRealRate !== 0) {
			corpus_MC = simFutureExpense * 12 * (1 - Math.pow(1 + simRealRate, -yearsAfterRetirement)) / simRealRate
		} else {
			corpus_MC = simFutureExpense * 12 * yearsAfterRetirement
		}

		const savings_MC_lumpsum = inputs.currentSavings * Math.pow(1 + simReturn, yearsToRetirement)
		let savings_MC_SIP = 0
		if (r_sim_monthly === 0) {
			savings_MC_SIP = inputs.monthlyInvestment * monthsToRetirement
		} else {
			savings_MC_SIP = inputs.monthlyInvestment * (Math.pow(1 + r_sim_monthly, monthsToRetirement) - 1) / r_sim_monthly
		}
		const savings_MC = savings_MC_lumpsum + savings_MC_SIP

		if (savings_MC >= corpus_MC) {
			successCount++
		}
	}

	const probability = (successCount / inputs.simulations) * 100

	// SECTION 6 — RETIREMENT BLINDNESS SCORE
	const safeCorpusNeeded = corpusNeeded === 0 ? 1 : corpusNeeded // safety for division by zero
	const savingsRatio = clamp(futureSavings / safeCorpusNeeded, 0, 1)
	const investmentRatio = clamp(inputs.monthlyInvestment / inputs.monthlyIncome, 0, 1)
	const expenseRatio = clamp(inputs.monthlyExpense / inputs.monthlyIncome, 0, 1)
	const ageFactor = clamp(yearsToRetirement / 30, 0, 1)

	let blindnessScore = (0.40 * savingsRatio) + (0.20 * investmentRatio) + (0.20 * (1 - expenseRatio)) + (0.20 * ageFactor)
	blindnessScore = Math.round(blindnessScore * 100) / 100

	// SECTION 7 — RISK CLASSIFICATION
	let status = ''
	let statusDescription = ''
	let statusColor = ''

	if (probability >= 80 && blindnessScore >= 0.75) {
		status = "Safe"
		statusDescription = "You are well on track. Maintain your current habits."
		statusColor = "#0D9E75"
	} else if (probability >= 60 && blindnessScore >= 0.50) {
		status = "Moderate Risk"
		statusDescription = "You have a reasonable chance but need to improve savings rate."
		statusColor = "#EF9F27"
	} else if (probability >= 40 && blindnessScore >= 0.30) {
		status = "High Risk"
		statusDescription = "Your retirement is at serious risk. Immediate action needed."
		statusColor = "#D85A30"
	} else {
		status = "Retirement Blindness"
		statusDescription = "You are unlikely to have enough. Start investing today."
		statusColor = "#E24B4A"
	}

	// RETURN ALL
	return {
		corpusNeeded,
		futureSavings,
		futureSavings_lumpsum,
		futureSavings_SIP,
		deficit,
		surplus,
		onTrack,
		probability,
		requiredMonthlyInvestment,
		blindnessScore,
		status,
		statusDescription,
		statusColor,
		futureMonthlyExpense,
		yearsToRetirement,
		yearsAfterRetirement,
		monthsToRetirement,
		r_monthly,
		realRate
	}
}
