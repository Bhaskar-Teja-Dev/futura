import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requirePro } from '../middleware/entitlement'
import { calculateRetirement } from '../lib/calculator'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const projectionSchema = z.object({
  currentAge: z.number().int().min(18).max(100),
  retirementAge: z.number().int().min(40).max(90),
  lifeExpectancy: z.number().int().min(60).max(120).default(80),
  monthlyIncome: z.number().min(0),
  monthlyExpense: z.number().min(0),
  currentSavings: z.number().min(0).default(0),
  monthlyInvestment: z.number().min(0),
  inflationRate: z.number().min(0).max(1).default(0.06),
  returnRate: z.number().min(0).max(1).default(0.12),
  returnMin: z.number().min(0).max(1).default(0.07),
  returnMax: z.number().min(0).max(1).default(0.15),
  inflationMin: z.number().min(0).max(1).default(0.04),
  inflationMax: z.number().min(0).max(1).default(0.09),
  simulations: z.number().int().min(1000).max(20000).default(10000)
})

const scenariosSchema = z.object({
  scenarios: z.array(
    z.object({
      name: z.string().min(1),
      currentAge: z.number().int().min(18).max(100),
      retirementAge: z.number().int().min(40).max(90),
      lifeExpectancy: z.number().int().min(60).max(120).default(80),
      monthlyIncome: z.number().min(0),
      monthlyExpense: z.number().min(0),
      currentSavings: z.number().min(0).default(0),
      monthlyInvestment: z.number().min(0),
      inflationRate: z.number().min(0).max(1).default(0.06),
      returnRate: z.number().min(0).max(1).default(0.12),
      returnMin: z.number().min(0).max(1).default(0.07),
      returnMax: z.number().min(0).max(1).default(0.15),
      inflationMin: z.number().min(0).max(1).default(0.04),
      inflationMax: z.number().min(0).max(1).default(0.09),
      simulations: z.number().int().min(1000).max(20000).default(10000)
    })
  )
})

router.post('/', zValidator('json', projectionSchema), async (c) => {
  const body = c.req.valid('json')

  const result = calculateRetirement(body)

  if ('error' in result) {
    return c.json({ error: result.error, field: result.field }, 400)
  }

  return c.json({
    result,
    disclaimer: 'Projections are illustrative only and not financial advice.'
  })
})

router.post('/scenarios', requirePro, zValidator('json', scenariosSchema), async (c) => {
  const body = c.req.valid('json')

  const scenarios = body.scenarios.map((scenario) => {
    const result = calculateRetirement(scenario)
    return {
      name: scenario.name,
      result: 'error' in result ? { error: result.error } : result
    }
  })

  return c.json({
    scenarios,
    disclaimer: 'Projections are illustrative only and not financial advice.'
  })
})

export { router as projectionRouter }
