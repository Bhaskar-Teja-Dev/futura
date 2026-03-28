import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const contributionSchema = z.object({
  amount: z.number().positive().max(100000),
  contribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
  currency: z.string().length(3).optional()
})

function calculateStreak(lastDate: string | null, currentStreak: number, newDate: string) {
  if (!lastDate) {
    return 1
  }

  const last = new Date(`${lastDate}T00:00:00Z`)
  const current = new Date(`${newDate}T00:00:00Z`)
  const diffDays = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return currentStreak
  }
  if (diffDays === 1) {
    return currentStreak + 1
  }
  return 1
}

router.get('/', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('user_id', c.get('userId'))
    .order('contribution_date', { ascending: false })
    .limit(50)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ contributions: data })
})

router.post('/', zValidator('json', contributionSchema), async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const { data, error } = await supabase
    .from('contributions')
    .insert({
      user_id: userId,
      amount: body.amount,
      contribution_date: body.contribution_date,
      note: body.note ?? null,
      currency: body.currency ?? 'GBP'
    })
    .select('*')
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const { data: streakRow } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_contribution_date')
    .eq('user_id', userId)
    .maybeSingle()

  // If the incoming date is older than (or same as) the recorded last date,
  // skip the streak update entirely — back-dated contributions must not reset
  // or alter an already-established streak.
  let streakToReturn = streakRow?.current_streak ?? 0

  if (streakRow?.last_contribution_date) {
    const lastMs = new Date(`${streakRow.last_contribution_date}T00:00:00Z`).getTime()
    const incomingMs = new Date(`${body.contribution_date}T00:00:00Z`).getTime()

    if (incomingMs <= lastMs) {
      // Back-dated or duplicate-dated entry — do not touch the streak row
      return c.json({ contribution: data, streak: streakToReturn }, 201)
    }
  }

  const nextCurrent = calculateStreak(
    streakRow?.last_contribution_date ?? null,
    streakRow?.current_streak ?? 0,
    body.contribution_date
  )
  const nextLongest = Math.max(nextCurrent, streakRow?.longest_streak ?? 0)
  streakToReturn = nextCurrent

  await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      last_contribution_date: body.contribution_date,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  return c.json({ contribution: data, streak: streakToReturn }, 201)
})

export { router as contributionsRouter }
