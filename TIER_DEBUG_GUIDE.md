# Tier Display Debugging Guide

## Quick Test Steps

1. **Open Browser DevTools**
   - Press `F12` to open Developer Tools
   - Go to the **Console** tab

2. **Log In to Dashboard**
   - Navigate to the dashboard
   - Log in with your test account
   - Watch the Console for messages

3. **Look for These Console Logs** (in order):
   ```
   [Auth] Subscription data received: {entitlement: "elite", ...}
   [Auth] Calling TierStateManager.updateTierDisplay()...
   [TierStateManager] Updating tier display: ELITE
   ```

4. **What to Verify In Sidebar**
   - **Tier Label**: Should show "Elite Tier" (orange) or "Free Tier" (gray)
   - **Button**: 
     - ✅ Elite: Should show "🔥 Explore Benefits" with fire animation
     - ✅ Free: Should show "Upgrade Power" 

---

## If It's NOT Working

### Check 1: Console Logs Missing?
- **Problem**: No `[Auth]` or `[TierStateManager]` logs
- **Cause**: `tier-state.js` not loading or `TierStateManager` undefined
- **Fix**: Check Network tab → Look for `tier-state.js` → If 404, verify file exists
- **Verify Script Order**: View page source, confirm scripts load as:
  ```html
  <script src="./js/config.js"></script>
  <script src="./js/auth.js"></script>
  <script src="./js/tier-state.js"></script>
  ```

### Check 2: Console Logs Show But Sidebar Not Updated?
- **Problem**: Logs appear but tier label still shows "Elite Tier" (hardcoded)
- **Cause**: DOM elements missing or wrong ID
- **Fix**: In Console, run:
  ```javascript
  document.getElementById('sidebar-tier-label')
  document.getElementById('sidebar-upgrade-btn')
  ```
  - Should NOT return `null`
  - If `null`, the HTML element IDs are wrong or missing

### Check 3: Realtime Not Working (Tier doesn't update after Supabase change)
- **Check**: Change user tier in Supabase directly, then refresh page
- **Expected**: Sidebar updates without refresh
- **If fails**: Check console for `[TierStateManager] Realtime error:`

---

## Key Implementation Details

**File**: `js/tier-state.js`
- Main function: `updateTierDisplay(subscription)` 
- Reads: `subscription.entitlement` field
- Updates: `#sidebar-tier-label` (text + color) and `#sidebar-upgrade-btn` (HTML + styles)

**File**: `js/auth.js` (line ~360)
- Calls: `TierStateManager.updateTierDisplay(sub)` SYNCHRONOUSLY
- Then calls: `TierStateManager.setupRealtimeListener()` for ongoing updates
- Has fallback to `hydrateEliteSidebar()` if TierStateManager unavailable

**Data Structure**:
```javascript
subscription: {
  entitlement: "elite" // or null / "free"
  streak_recovery_tokens: 5
  // ...
}
```

---

## Tier Display Logic

| Tier | Label Color | Button Text | Button Style |
|------|------------|-------------|--------------|
| **Elite** | Orange (#FF6F00) | 🔥 Explore Benefits | Fire gradient animation |
| **Free** | Gray (#767777) | Upgrade Power | Standard button |

---

## Next Steps After Verification

1. ✅ Console logs show correct tier → Implementation is working
2. ✅ Sidebar updates reflect subscription.entitlement → DOM manipulation working
3. Test Realtime: Change tier in Supabase → Verify sidebar updates without page refresh
4. Test Cross-page: Navigate between pages → Verify tier persists

---

## Emergency Fallback

If `tier-state.js` fails to load:
- `auth.js` will use `hydrateEliteSidebar()` function (legacy)
- You'll see in console: `[Auth] Fallback: Using hydrateEliteSidebar()...`
- This is a safety net - not ideal but keeps app functional

