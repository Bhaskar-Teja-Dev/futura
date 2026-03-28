import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requirePro } from '../middleware/entitlement'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const projectionSchema = z.object({
  currentAge: z.number().int().min(18).max(100),
  retirementAge: z.number().int().min(40).max(90),
  monthlyContribution: z.number().min(0),
  annualReturn: z.number().min(0).max(1).optional(),
  existingPot: z.number().min(0).optional()
})

const scenariosSchema = z.object({
  scenarios: z.array(
    z.object({
      name: z.string().min(1),
      currentAge: z.number().int().min(18).max(100),
      retirementAge: z.number().int().min(40).max(90),
      monthlyContribution: z.number().min(0),
      annualReturn: z.number().min(0).max(1),
      existingPot: z.number().min(0).optional()
    })
  )
})

function projectRetirementPot(params: {
  currentAge: number
  retirementAge: number
  monthlyContribution: number
  annualReturn: number
  existingPot?: number
}) {
  const months = (params.retirementAge - params.currentAge) * 12
  const monthlyRate = params.annualReturn / 12
  if (months <= 0) {
    return Math.round(params.existingPot ?? 0)
  }

  const futureValueContributions =
    monthlyRate === 0
      ? params.monthlyContribution * months
      : params.monthlyContribution *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
  const futureValueExisting = (params.existingPot ?? 0) * Math.pow(1 + monthlyRate, months)
  return Math.round(futureValueContributions + futureValueExisting)
}

router.post('/', zValidator('json', projectionSchema), async (c) => {
  const body = c.req.valid('json')
  const projectedPot = projectRetirementPot({
    currentAge: body.currentAge,
    retirementAge: body.retirementAge,
    monthlyContribution: body.monthlyContribution,
    annualReturn: body.annualReturn ?? 0.07,
    existingPot: body.existingPot ?? 0
  })

  return c.json({
    projectedPot,
    disclaimer: 'Projections are illustrative only and not financial advice.'
  })
})

router.post('/scenarios', requirePro, zValidator('json', scenariosSchema), async (c) => {
  const body = c.req.valid('json')
  const results = body.scenarios.map((scenario) => ({
    name: scenario.name,
    projectedPot: projectRetirementPot({
      currentAge: scenario.currentAge,
      retirementAge: scenario.retirementAge,
      monthlyContribution: scenario.monthlyContribution,
      annualReturn: scenario.annualReturn,
      existingPot: scenario.existingPot ?? 0
    })
  }))

  return c.json({
    scenarios: results,
    disclaimer: 'Projections are illustrative only and not financial advice.'
  })
})

export { router as projectionRouter }
