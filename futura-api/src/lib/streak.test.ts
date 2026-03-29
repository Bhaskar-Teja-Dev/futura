import { describe, expect, test } from 'vitest'
import { calculateStreak } from './streak'

describe('calculateStreak — Elite token recovery (2-day gap)', () => {
  test('with token: continues streak (+2) when user skipped one calendar day', () => {
    // Last contribution Monday; today Wednesday (gap 2) — token bridges the missed Tuesday
    expect(
      calculateStreak('2025-03-10', 5, '2025-03-12', false, true)
    ).toBe(7)
  })

  test('without token and no missed-day contribution: streak resets to 1', () => {
    expect(
      calculateStreak('2025-03-10', 5, '2025-03-12', false, false)
    ).toBe(1)
  })

  test('missed-day replenish contribution: same +2 as token path (no token needed)', () => {
    expect(
      calculateStreak('2025-03-10', 5, '2025-03-12', true, false)
    ).toBe(7)
  })

  test('token does not help when gap is 3+ days', () => {
    expect(
      calculateStreak('2025-03-10', 10, '2025-03-13', false, true)
    ).toBe(1)
  })
})

describe('calculateStreak — normal progression', () => {
  test('consecutive day adds 1', () => {
    expect(calculateStreak('2025-03-10', 4, '2025-03-11', false, false)).toBe(5)
  })

  test('first contribution starts at 1', () => {
    expect(calculateStreak(null, 0, '2025-03-15', false, false)).toBe(1)
  })
})

/** Mirrors repair-streak restoreValue logic (pure) */
function repairRestoreValue(previousStreak: number, currentStreak: number): number {
  return previousStreak > 0 ? previousStreak : currentStreak
}

describe('repair-streak restore value', () => {
  test('prefers previous_streak when streak was lost', () => {
    expect(repairRestoreValue(12, 0)).toBe(12)
  })

  test('falls back to current_streak when no previous', () => {
    expect(repairRestoreValue(0, 3)).toBe(3)
  })
})
