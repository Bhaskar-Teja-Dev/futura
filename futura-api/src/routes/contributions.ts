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

/**
 * Streak calculation with replenish mechanic:
 * - diffDays === 0  → same day, streak unchanged
 * - diffDays === 1  → consecutive day, streak increments
 * - diffDays === 2  → missed ONE day; check if user also contributed for the
 *                      missed day (replenish). If yes, streak continues (+2).
 *                      If no, streak resets to 1.
 * - diffDays >= 3   → streak resets to 1 (no recovery possible)
 */
function calculateStreak(
  lastDate: string | null,
  currentStreak: number,
  newDate: string,
  hasMissedDayContribution: boolean
): number {
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
  // Replenish window: exactly 2 days gap (missed 1 day)
  if (diffDays === 2 && hasMissedDayContribution) {
    return currentStreak + 2
  }
  // Missed too many days — reset
  return 1
}

/** Helper: format a Date into YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ─── GET /streak — fetch current streak info ────────────────────────
router.get('/streak', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const userId = c.get('userId')

  const { data: streakRow, error } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_contribution_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const currentStreak = streakRow?.current_streak ?? 0
  const longestStreak = streakRow?.longest_streak ?? 0
  const lastDate = streakRow?.last_contribution_date ?? null

  // Determine live streak status:
  // If the last contribution was NOT today and NOT yesterday, check if
  // the streak has expired or is in a replenish window.
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)

  let liveStreak = currentStreak
  let canReplenish = false
  let replenishDeadline: string | null = null

  if (lastDate) {
    const lastMs = new Date(`${lastDate}T00:00:00Z`).getTime()
    const diffDays = Math.floor((today.getTime() - lastMs) / (1000 * 60 * 60 * 24))

    if (diffDays === 0 || diffDays === 1) {
      // Still within normal streak window
      liveStreak = currentStreak
    } else if (diffDays === 2) {
      // Missed exactly 1 day — user has until end of today to replenish
      canReplenish = true
      replenishDeadline = todayStr
      liveStreak = currentStreak // Show previous streak with replenish warning
    } else {
      // Streak is dead
      liveStreak = 0
    }
  }

  return c.json({
    streak: {
      current: liveStreak,
      longest: longestStreak,
      last_contribution_date: lastDate,
      can_replenish: canReplenish,
      replenish_deadline: replenishDeadline
    }
  })
})

// ─── GET / — list contributions ─────────────────────────────────────
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

// ─── POST / — create contribution & update streak ───────────────────
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

  // Check replenish: if gap is 2, look for a contribution on the missed day
  const lastDateStr = streakRow?.last_contribution_date ?? null
  let hasMissedDayContribution = false

  if (lastDateStr) {
    const lastD = new Date(`${lastDateStr}T00:00:00Z`)
    const incomingD = new Date(`${body.contribution_date}T00:00:00Z`)
    const diffDays = Math.floor((incomingD.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 2) {
      // The missed day is lastDate + 1
      const missedDay = new Date(lastD)
      missedDay.setUTCDate(missedDay.getUTCDate() + 1)
      const missedDayStr = toDateStr(missedDay)

      const { data: missedContribs } = await supabase
        .from('contributions')
        .select('id')
        .eq('user_id', userId)
        .eq('contribution_date', missedDayStr)
        .limit(1)

      hasMissedDayContribution = !!(missedContribs && missedContribs.length > 0)
    }
  }

  const nextCurrent = calculateStreak(
    lastDateStr,
    streakRow?.current_streak ?? 0,
    body.contribution_date,
    hasMissedDayContribution
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
