# Dynamic Tier State Management - Implementation Guide

## Overview
This implementation provides **real-time tier state management** that reflects subscription changes from Supabase instantly without any latency. The "Free Tier" or "Elite Tier" status and corresponding buttons ("Upgrade Power" or "Explore Benefits") now update dynamically across all pages.

## Architecture

### Core Components

#### 1. **tier-state.js** (New Module)
Located at: `js/tier-state.js`

**Responsibilities:**
- Maintains global tier state (`free` or `elite`)
- Sets up Supabase Realtime listener on `user_subscriptions` table
- Updates all UI elements when subscription changes
- Manages localStorage cache for instant page loads
- Notifies registered listeners of tier changes

**Key Functions:**
```javascript
TierStateManager.getCurrentTier()        // Returns: 'free' | 'elite'
TierStateManager.isElite()               // Returns: boolean
TierStateManager.onTierChange(callback)  // Subscribe to tier changes
TierStateManager.initializeFromProfile(subscription) // Initialize state
TierStateManager.cleanup()               // Cleanup Realtime connection
```

#### 2. **auth.js** (Modified)
**Changes:**
- Calls `TierStateManager.initializeFromProfile()` instead of standalone `hydrateEliteSidebar()`
- Passes subscription data to TierStateManager
- Automatically sets up Realtime listener

**Updated Section:**
```javascript
// In updateNavAuth(), around line 361:
if (typeof TierStateManager !== 'undefined') {
  await TierStateManager.initializeFromProfile(sub);
} else if (typeof hydrateEliteSidebar === 'function') {
  // Fallback for backward compatibility
  await hydrateEliteSidebar(sub, streakData);
}
```

### UI Updates

When tier changes (via Realtime), the following elements update instantly:

**1. Tier Label**
- **Free**: "Free Tier" (gray #767777)
- **Elite**: "Elite Tier" (orange #FF6F00, animated pulse)

**2. Upgrade/Explore Button**
- **Free**: "Upgrade Power" button linking to `upgrade_digital_rebel_desktop.html`
- **Elite**: "Explore Benefits" button with premium fire animation (orange gradient, pulsing fire icon)

**3. Token Pill** (Elite only)
- Shows recovery tokens count in nav header
- Only visible for Elite users
- Displays fire icon with animated glow

**4. localStorage Cache**
- Cached at key `futura_sidebar_v1`
- Ensures zero-flash tier display on page load
- Automatically updated when tier changes

## Supabase Realtime Integration

### Real-time Listener Setup
```javascript
channel = supabase
  .channel(`realtime:user_subscriptions:{userId}`)
  .on(
    'postgres_changes',
    {
      event: '*',  // Listens to INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'user_subscriptions',
      filter: `user_id=eq.{userId}`
    },
    (payload) => {...}
  )
  .subscribe()
```

### Trigger Points
The Realtime listener updates UI when:
1. ✅ User purchases Elite tier (INSERT new subscription with `entitlement='elite'`)
2. ✅ User downgrades to Free (UPDATE subscription to `entitlement='free'` or NULL)
3. ✅ User cancels subscription (DELETE)
4. ✅ Admin updates subscription (any direct DB change)

### No Latency Implementation
- **Instant updates**: Realtime payload processed immediately
- **Optimistic UI**: localStorage cache prevents flash on page load
- **Auto-toast**: Users see "Welcome to Elite Tier!" notification when upgrading
- **Global broadcast**: All open pages update simultaneously

## Pages Updated

All pages now include `tier-state.js`:

```
✅ dashboard_digital_rebel_desktop.html
✅ projections_digital_rebel_desktop.html
✅ upgrade_digital_rebel_desktop.html
✅ settings_digital_rebel_desktop.html
✅ assets_digital_rebel_desktop.html
✅ cards_digital_rebel_desktop.html
✅ checkout_digital_rebel_desktop.html
✅ staking_digital_rebel_desktop.html
✅ support_digital_rebel_desktop.html
✅ learn_digital_rebel_desktop.html
✅ transactions.html
✅ market_digital_rebel_desktop.html
✅ market_detail.html
✅ onboarding_step_1_age.html
✅ onboarding_step_2_retirement.html
✅ onboarding_step_3_income.html
✅ add_manual_asset_digital_rebel.html
```

## Usage Example

### For Developers

**Subscribe to tier changes in custom code:**
```javascript
// Listen for tier changes
TierStateManager.onTierChange(({ newTier, oldTier, subscription }) => {
  console.log(`Tier changed: ${oldTier} → ${newTier}`);
  if (newTier === 'elite') {
    // Show Elite-specific features
    document.getElementById('elite-feature').style.display = 'block';
  }
});

// Check current tier
if (TierStateManager.isElite()) {
  console.log('User is Elite');
}
```

### For Checkout Flow

After successful payment in checkout:
1. Backend updates `user_subscriptions` with `entitlement='elite'`
2. Realtime listener fires on all open pages
3. `TierStateManager` automatically updates UI
4. User sees "Explore Benefits" button instantly
5. No page reload required!

## Preventing Race Conditions

The implementation handles several edge cases:

**Race Condition 1: Realtime fires before page load completes**
- ✅ Listener is set up AFTER `initializeFromProfile()`
- ✅ UI is already in correct state before Realtime events arrive

**Race Condition 2: Multiple rapid tier changes**
- ✅ Each Realtime payload is processed independently
- ✅ localStorage ensures consistency

**Race Condition 3: Page refresh during upgrade**
- ✅ localStorage cache shows correct tier immediately
- ✅ Realtime updates cache after confirming DB state

## Performance Considerations

- **Bundle Size**: tier-state.js ~ 3.5 KB (minified)
- **Realtime Cost**: One channel subscription per user per session
- **DOM Updates**: Only updated elements re-render (efficient)
- **Memory**: Listeners are cleaned up on logout (`TierStateManager.cleanup()`)

## Fallback & Compatibility

- If `TierStateManager` is not loaded, falls back to `hydrateEliteSidebar()`
- Backward compatible with existing `hydrateEliteSidebar()` function
- Works with existing localStorage cache system

## Testing Checklist

To verify the implementation works:

1. **Initial Load**
   - ✅ Free user sees "Upgrade Power" button
   - ✅ Elite user sees "Explore Benefits" with fire animation
   - ✅ Zero flash on page refresh

2. **During Upgrade** (Checkout Flow)
   - ✅ Payment success → opens to Elite Hub (redirect)
   - ✅ Return to any page → button updates instantly
   - ✅ Toast notification appears: "Welcome to Elite Tier!"

3. **Cross-Tab Sync**
   - ✅ Upgrade in Tab A
   - ✅ Tab B's tier updates instantly (Realtime)
   - ✅ No need to refresh Tab B

4. **Realtime Connection Loss**
   - ✅ Tier display remains correct (cached)
   - ✅ Updates resume when connection restored
   - ✅ Console logs: "[TierStateManager] Realtime subscription error"

## Troubleshooting

### Issue: Tier not updating after purchase
**Solution**: 
- Check Supabase RLS policies on `user_subscriptions`
- Verify backend updates `entitlement='elite'`
- Check browser console for Realtime errors
- Verify user's `user_id` matches in `user_subscriptions`

### Issue: "Explore Benefits" button doesn't open modal
**Solution**:
- Ensure `elite-hub-modal` exists on page
- Check that modal click handler is properly bound
- Verify `hydrateEliteSidebar()` is called as fallback

### Issue: localStorage cache shows wrong tier
**Solution**:
- Clear localStorage: `localStorage.clear()`
- Reload page to resync from Supabase
- Check that `TierStateManager.initializeFromProfile()` receives correct data

## Future Enhancements

1. **Tier-based Feature Flags**
   - Store feature availability in `TierStateManager`
   - Enable/disable UI elements dynamically

2. **Usage Metrics**
   - Track token usage for Elite users
   - Display usage dashboard in real-time

3. **Subscription Expiry**
   - Add countdown to tier expiration
   - Auto-downgrade UI before expiry

4. **WebSocket Metrics**
   - Monitor Realtime channel health
   - Report connection quality to admin

## External Dependencies

- **supabase-js**: v2+ (already required)
- **No new npm packages needed**

## Migration Notes

If upgrading from old `hydrateEliteSidebar()` only:
1. Page will work with or without `tier-state.js`
2. With `tier-state.js`: Real-time updates ✅
3. Without `tier-state.js`: Only on page load (old behavior)
4. Backward compatible - no breaking changes

---

**Last Updated**: March 30, 2026  
**Maintained By**: Digital Rebel Team  
**Status**: ✅ Production Ready
