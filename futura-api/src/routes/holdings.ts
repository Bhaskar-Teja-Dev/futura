import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const createSchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  company_name: z.string().min(1).max(120),
  amount_zens: z.number().int().positive(),
  price_at_purchase: z.number().int().nonnegative().optional(),
  purchase_date: z.string().optional()
})

const sellSchema = z.object({
  sell_proceeds: z.number().int().nonnegative(),
  sell_pnl: z.number().int(),
  sell_date: z.string().optional()
})

// GET /api/holdings — list all holdings for the user
router.get('/', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('user_id', c.get('userId'))
    .order('purchase_date', { ascending: false })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ holdings: data ?? [] })
})

// POST /api/holdings — record a new stock purchase
router.post('/', zValidator('json', createSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  const supabaseAdmin = getSupabase(c.env)

  const { data, error } = await supabaseAdmin
    .from('portfolio_holdings')
    .insert({
      user_id: userId,
      ticker: body.ticker,
      company_name: body.company_name,
      amount_zens: body.amount_zens,
      price_at_purchase: body.price_at_purchase ?? 0,
      purchase_date: body.purchase_date ?? new Date().toISOString().split('T')[0],
      sold: false
    })
    .select('*')
    .single()

  if (error) {
    console.error('holdings insert error:', error)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ holding: data }, 201)
})

// PATCH /api/holdings/:id/sell — mark a holding as sold
router.patch('/:id/sell', zValidator('json', sellSchema), async (c) => {
  const userId = c.get('userId')
  const holdingId = c.req.param('id')
  const body = c.req.valid('json')
  const supabaseAdmin = getSupabase(c.env)

  const { data, error } = await supabaseAdmin
    .from('portfolio_holdings')
    .update({
      sold: true,
      sell_proceeds: body.sell_proceeds,
      sell_pnl: body.sell_pnl,
      sell_date: body.sell_date ?? new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', holdingId)
    .eq('user_id', userId)   // RLS double-check: user can only sell their own
    .select('*')
    .single()

  if (error) {
    console.error('holdings sell error:', error)
    return c.json({ error: error.message }, 500)
  }

  return c.json({ holding: data })
})

// DELETE /api/holdings/:id
router.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const holdingId = c.req.param('id')
  const supabaseAdmin = getSupabase(c.env)

  const { error } = await supabaseAdmin
    .from('portfolio_holdings')
    .delete()
    .eq('id', holdingId)
    .eq('user_id', userId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ success: true })
})

export { router as holdingsRouter }
