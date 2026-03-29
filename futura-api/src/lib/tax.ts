/**
 * Tax Optimization Logic for Digital Rebel Elite
 * Focused on UK-specific ISA/SIPP mechanics as per documentation.
 */

export type TaxOptimizationReport = {
  annualIncome: number
  monthlyInvestment: number
  isaAllowanceUsed: number
  estimatedSippRelief: number
  higherRateTaxSaving: number
  totalOptimizationPotential: number
  recommendation: string
}

export function calculateTaxOptimization(annualIncome: number, monthlyInvestment: number): TaxOptimizationReport {
  const annualInvestment = monthlyInvestment * 12
  
  // UK Limits 2024/25
  const ISA_LIMIT = 20000
  const PERSONAL_ALLOWANCE = 12570
  const HIGHER_RATE_THRESHOLD = 50270

  // 1. ISA Optimization
  const isaAllowanceUsed = Math.min(annualInvestment, ISA_LIMIT)

  // 2. SIPP (Pension) Relief
  // Basic rate relief (20%) is added automatically to SIPP
  // Higher rate relief (additional 20%) is claimed via self-assessment
  let estimatedSippRelief = 0
  let higherRateTaxSaving = 0

  if (annualIncome > PERSONAL_ALLOWANCE) {
    // We assume the user puts half their investment into a SIPP for this optimization estimate
    const sippContribution = annualInvestment * 0.5
    
    // Government adds 20% on top (effectively 25% of the net contribution)
    estimatedSippRelief = sippContribution * 0.25

    // Higher rate relief if income > 50270
    if (annualIncome > HIGHER_RATE_THRESHOLD) {
      const taxableInHigherRate = annualIncome - HIGHER_RATE_THRESHOLD
      const amountEligibleForHigherRelief = Math.min(sippContribution, taxableInHigherRate)
      higherRateTaxSaving = amountEligibleForHigherRelief * 0.20 // Additional 20%
    }
  }

  const totalOptimizationPotential = estimatedSippRelief + higherRateTaxSaving

  let recommendation = ""
  if (annualIncome > HIGHER_RATE_THRESHOLD) {
    recommendation = "You're in the higher tax bracket. Prioritize SIPP contributions to claim an extra 20% tax relief."
  } else if (annualInvestment > ISA_LIMIT) {
    recommendation = "You're exceeding the £20k ISA limit. Shift excess funds to a SIPP or GIA."
  } else {
    recommendation = "Maximize your £20,000 ISA allowance for tax-free growth and capital gains."
  }

  return {
    annualIncome,
    monthlyInvestment,
    isaAllowanceUsed,
    estimatedSippRelief,
    higherRateTaxSaving,
    totalOptimizationPotential,
    recommendation
  }
}
