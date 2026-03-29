/**
 * Streak calculation with replenish + optional Elite token path (only when caller passes canUseToken):
 * - diffDays === 0  → same day, streak unchanged
 * - diffDays === 1  → consecutive day, streak increments
 * - diffDays === 2  → missed ONE day; contribution on missed day continues streak; OR canUseToken bridges (explicit flows only — not contribution POST)
 * - diffDays >= 3   → streak resets to 1
 */
export function calculateStreak(
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
  if (diffDays === 2) {
    if (hasMissedDayContribution) {
      return currentStreak + 2
    }
    if (canUseToken) {
      return currentStreak + 2
    }
  }
  return 1
}
