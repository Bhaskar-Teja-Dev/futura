// Futura — Direct Tier State Manager with Realtime
// SYNCHRONOUSLY updates tier label and button from subscription
// Requires: supabase-js, config.js, auth.js

const TierStateManager = (() => {
  let _currentTier = 'free';
  let _subscription = null;
  let _realtimeListener = null;

  /**
   * UPDATE TIER DISPLAY - Direct DOM manipulation
   * Immediately updates tier label and button
   */
  function updateTierDisplay(subscription) {
    const isElite = subscription && 
                   typeof subscription.entitlement === 'string' && 
                   subscription.entitlement.toLowerCase() === 'elite';

    _currentTier = isElite ? 'elite' : 'free';
    _subscription = subscription;

    console.log('[TierStateManager] Updating tier display:', isElite ? 'ELITE' : 'FREE');

    // ═══ UPDATE TIER LABEL ═══
    const tierLabel = document.getElementById('sidebar-tier-label');
    if (tierLabel) {
      tierLabel.textContent = isElite ? 'Elite Tier' : 'Free Tier';
      tierLabel.style.color = isElite ? '#FF6F00' : '#767777';
    }

    // ═══ UPDATE BUTTON ═══
    const upgradeBtn = document.getElementById('sidebar-upgrade-btn');
    if (upgradeBtn) {
      if (isElite) {
        // ELITE: Fire button
        upgradeBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right:8px; animation: premiumPulse 2s infinite;">local_fire_department</span> <span class="relative z-10">Explore Benefits</span>';
        upgradeBtn.href = '#';
        upgradeBtn.className = 'w-full py-4 mt-8 font-headline font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-all flex items-center justify-center relative overflow-hidden group border-2 border-[#121212] dark:border-[#f6f6f6]';
        upgradeBtn.style.cssText = 'background: linear-gradient(90deg, #ffb300, #ff6f00, #ffb300); background-size: 200% auto; animation: premiumFire 3s linear infinite; box-shadow: 0 0 15px rgba(255,111,0,0.7); text-shadow: 1px 1px 0px rgba(255,255,255,0.3); color: #121212 !important;';

        // Add animations
        if (!document.getElementById('rebel-premium-styles')) {
          const style = document.createElement('style');
          style.id = 'rebel-premium-styles';
          style.textContent = `
            @keyframes premiumFire { 
              0% { background-position: 0% center; box-shadow: 0 0 15px rgba(255,111,0,0.6); } 
              50% { background-position: 100% center; box-shadow: 0 0 25px rgba(255,215,0,0.9); } 
              100% { background-position: 0% center; box-shadow: 0 0 15px rgba(255,111,0,0.6); } 
            }
            @keyframes premiumPulse { 
              0% { transform: scale(1); opacity: 0.8; } 
              50% { transform: scale(1.2); opacity: 1; text-shadow: 0 0 10px #fff; } 
              100% { transform: scale(1); opacity: 0.8; } 
            }
          `;
          document.head.appendChild(style);
        }

        // Clone to remove old listeners
        const newBtn = upgradeBtn.cloneNode(true);
        upgradeBtn.parentNode.replaceChild(newBtn, upgradeBtn);

        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const modal = document.getElementById('elite-hub-modal');
          if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
          }
        });
      } else {
        // FREE: Upgrade button
        upgradeBtn.innerHTML = 'Upgrade Power';
        upgradeBtn.href = 'upgrade_digital_rebel_desktop.html';
        upgradeBtn.className = 'w-full py-4 mt-8 font-headline font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs bg-primary-fixed text-on-primary-fixed border-2 border-[#121212] transition-all hover:bg-[#d4af37] neo-shadow';
        upgradeBtn.style.cssText = '';
      }
    }

    // ═══ UPDATE CACHE ═══
    try {
      localStorage.setItem('futura_sidebar_v1', JSON.stringify({
        isElite,
        exploreBenefitsLabel: isElite ? 'Explore Benefits' : 'Upgrade Power'
      }));
    } catch (e) {
      // ignore
    }

    return isElite;
  }

  /**
   * Initialize from subscription on page load
   */
  function initializeFromProfile(subscription) {
    updateTierDisplay(subscription);
    setupRealtimeListener();
  }

  /**
   * Setup Realtime listener
   */
  async function setupRealtimeListener() {
    try {
      if (!window.getSession) return;
      
      const session = await window.getSession();
      if (!session?.user?.id) return;

      if (_realtimeListener) {
        _realtimeListener.unsubscribe();
      }

      const userId = session.user.id;
      const supabase = window.getSupabase?.();
      if (!supabase) return;

      _realtimeListener = supabase
        .channel(`subscriptions:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[TierStateManager] Realtime event:', payload);
            const newSub = payload.new || payload.old || {};
            updateTierDisplay(newSub);
            
            // Toast on upgrade
            if (payload.new?.entitlement === 'elite' && _currentTier === 'elite') {
              if (typeof _futuraNotify === 'function') {
                _futuraNotify('🔥 Welcome to Elite Tier!', 'success');
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[TierStateManager] Realtime error:', e);
    }
  }

  function getCurrentTier() {
    return _currentTier;
  }

  function isElite() {
    return _currentTier === 'elite';
  }

  function cleanup() {
    if (_realtimeListener) {
      _realtimeListener.unsubscribe();
    }
  }

  return {
    updateTierDisplay,
    initializeFromProfile,
    getCurrentTier,
    isElite,
    cleanup
  };
})();

window.TierStateManager = TierStateManager;
