/**
 * Streak calculation with replenish + bridge paths for a single missed calendar day (diffDays === 2):
 * - diffDays === 0  → same day, streak unchanged
 * - diffDays === 1  → consecutive day, streak increments
 * - diffDays === 2  → missed ONE day: hasMissedDayContribution OR canUseToken bridges (+2); otherwise resets to 1
 *   (Contributions POST sets canUseToken for Elite during the replenish window so UI and DB stay aligned.)
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
