import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../lib/supabase'
import type { Env, Variables } from '../types'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const contributionSchema = z.object({
  amount: z.number().positive().max(100000000000), // increased to 100 billion
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
  hasMissedDayContribution: boolean,
  canUseToken: boolean = false
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
  if (diffDays === 2) {
    if (hasMissedDayContribution) {
      return currentStreak + 2
    }
    // Elite Recovery Token Usage
    if (canUseToken) {
      return currentStreak + 2 // Treat the missed day as recovered
    }
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

  // Fetch subscription and tokens
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('entitlement, streak_recovery_tokens')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: streakRow2 } = await supabase
    .from('streaks')
    .select('previous_streak')
    .eq('user_id', userId)
    .maybeSingle()

  return c.json({
    streak: {
      current: liveStreak,
      longest: longestStreak,
      previous: streakRow2?.previous_streak ?? 0,
      last_contribution_date: lastDate,
      can_replenish: canReplenish,
      replenish_deadline: replenishDeadline,
      recovery_tokens: sub?.streak_recovery_tokens ?? 0,
      is_elite: sub?.entitlement === 'elite'
    }
  })
})

// ─── POST /repair-streak — manually use a token to restore a streak ─────
router.post('/repair-streak', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const userId = c.get('userId')

  // 1. Check eligibility
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('entitlement, streak_recovery_tokens')
    .eq('user_id', userId)
    .maybeSingle()

  if (sub?.entitlement !== 'elite' || (sub?.streak_recovery_tokens ?? 0) <= 0) {
    return c.json({ error: 'Not eligible or no tokens available' }, 403)
  }

  // 2. Fetch current streak data
  const { data: streakRow } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!streakRow) {
    return c.json({ error: 'No streak record found' }, 404)
  }

  // A streak can be repaired if it's currently at 0 BUT we have a previous_streak
  // OR if it's currently "at risk" (can_replenish would be true in GET)

  // For simplicity, if they have a previous_streak > 0 and current is 0, we allow repair.
  // Or if it's still alive but they want to "secure" it? Usually it's when it breaks.

  const restoreValue = streakRow.previous_streak > 0 ? streakRow.previous_streak : streakRow.current_streak

  // 3. Perform repair
  // - Decrement tokens
  // - Restore current_streak
  // - Update last_contribution_date to "yesterday" so next contribution continues it
  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { error: subErr } = await supabase
    .from('user_subscriptions')
    .update({ streak_recovery_tokens: sub.streak_recovery_tokens - 1 })
    .eq('user_id', userId)

  if (subErr) return c.json({ error: subErr.message }, 500)

  const { error: streakErr } = await supabase
    .from('streaks')
    .update({
      current_streak: restoreValue,
      last_contribution_date: yesterdayStr,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (streakErr) return c.json({ error: streakErr.message }, 500)

  return c.json({
    success: true,
    newStreak: restoreValue,
    tokensLeft: sub.streak_recovery_tokens - 1
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
    .select('current_streak, longest_streak, last_contribution_date, previous_streak')
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

  // Fetch subscription and tokens
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('entitlement, streak_recovery_tokens')
    .eq('user_id', userId)
    .maybeSingle()

  const isElite = sub?.entitlement === 'elite'
  let tokens = sub?.streak_recovery_tokens ?? 0
  let usedToken = false

  const diffDays = lastDateStr ? Math.floor((new Date(`${body.contribution_date}T00:00:00Z`).getTime() - new Date(`${lastDateStr}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)) : 0

  const canUseToken = isElite && tokens > 0 && diffDays === 2 && !hasMissedDayContribution

  const nextCurrent = calculateStreak(
    lastDateStr,
    streakRow?.current_streak ?? 0,
    body.contribution_date,
    hasMissedDayContribution,
    canUseToken
  )

  if (canUseToken) {
    usedToken = true
    tokens -= 1
    await supabase
      .from('user_subscriptions')
      .update({ streak_recovery_tokens: tokens })
      .eq('user_id', userId)
  }
  const nextLongest = Math.max(nextCurrent, streakRow?.longest_streak ?? 0)
  streakToReturn = nextCurrent

  // If the streak reset to 1, save the old current_streak as previous_streak for potential Elite recovery
  const finalPrevious = (nextCurrent === 1 && (streakRow?.current_streak ?? 0) > 1)
    ? (streakRow?.current_streak ?? 0)
    : (streakRow?.previous_streak ?? 0);

  await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      previous_streak: finalPrevious,
      last_contribution_date: body.contribution_date,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )

  return c.json({ contribution: data, streak: streakToReturn }, 201)
})

// ─── DELETE /:id — remove a contribution ────────────────────────────
router.delete('/:id', async (c) => {
  const supabase = getSupabase(c.env, c.get('token'))
  const userId = c.get('userId')
  const id = c.req.param('id')

  const { error } = await supabase
    .from('contributions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ success: true, id })
})

export { router as contributionsRouter }
