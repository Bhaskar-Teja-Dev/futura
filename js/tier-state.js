// Futura — Real-time Tier State Manager with Supabase Realtime
// Listens to subscription changes and updates UI instantly without latency
// Requires: supabase-js, config.js, auth.js

/**
 * Global tier state manager
 * Maintains current tier, listens for changes, updates UI reactively
 */
const TierStateManager = (() => {
  let _currentTier = 'free'; // 'free' or 'elite'
  let _subscription = null; // Current subscription object
  let _realtimeListener = null; // Supabase Realtime subscription
  let _listeners = []; // UI update callbacks

  /**
   * Get current tier
   * @returns {'free' | 'elite'}
   */
  function getCurrentTier() {
    return _currentTier;
  }

  /**
   * Check if user is elite
   * @returns {boolean}
   */
  function isElite() {
    return _currentTier === 'elite';
  }

  /**
   * Subscribe to tier changes
   * @param {Function} callback - Called when tier changes
   */
  function onTierChange(callback) {
    if (typeof callback === 'function') {
      _listeners.push(callback);
    }
  }

  /**
   * Notify all listeners of tier change
   */
  function _notifyListeners(newTier, oldTier, subscription) {
    _listeners.forEach(listener => {
      try {
        listener({ newTier, oldTier, subscription });
      } catch (e) {
        console.error('[TierStateManager] Listener error:', e);
      }
    });
  }

  /**
   * Update UI elements based on tier
   * @param {boolean} isElite - Whether user is elite
   * @param {Object} subscription - Subscription object with metadata
   */
  function _updateAllUIElements(isElite, subscription) {
    // Update tier label
    const tierLabel = document.getElementById('sidebar-tier-label');
    if (tierLabel) {
      tierLabel.textContent = isElite ? 'Elite Tier' : 'Free Tier';
      tierLabel.style.color = isElite ? '#FF6F00' : '#767777';
      if (isElite) {
        tierLabel.classList.add('text-[#FF6F00]', 'animate-pulse');
      } else {
        tierLabel.classList.remove('text-[#FF6F00]', 'animate-pulse');
      }
    }

    // Update upgrade button
    const upgradeBtn = document.getElementById('sidebar-upgrade-btn');
    if (upgradeBtn) {
      if (isElite) {
        // Elite mode: show "Explore Benefits" with premium styling
        upgradeBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right:8px; animation: premiumPulse 2s infinite;">local_fire_department</span> <span class="relative z-10">Explore Benefits</span>';
        upgradeBtn.href = '#';
        upgradeBtn.className = 'w-full py-4 mt-8 font-headline font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-all flex items-center justify-center relative overflow-hidden group border-2 border-[#121212] dark:border-[#f6f6f6]';
        upgradeBtn.style.cssText = 'background: linear-gradient(90deg, #ffb300, #ff6f00, #ffb300); background-size: 200% auto; animation: premiumFire 3s linear infinite; box-shadow: 0 0 15px rgba(255,111,0,0.7); text-shadow: 1px 1px 0px rgba(255,255,255,0.3); color: #121212 !important;';

        // Inject global animation styles if not present
        if (!document.getElementById('rebel-premium-styles')) {
          const style = document.createElement('style');
          style.id = 'rebel-premium-styles';
          style.textContent = `
            @keyframes premiumFire { 0% { background-position: 0% center; box-shadow: 0 0 15px rgba(255,111,0,0.6); } 50% { background-position: 100% center; box-shadow: 0 0 25px rgba(255,215,0,0.9); } 100% { background-position: 0% center; box-shadow: 0 0 15px rgba(255,111,0,0.6); } }
            @keyframes premiumPulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; text-shadow: 0 0 10px #fff; } 100% { transform: scale(1); opacity: 0.8; } }
          `;
          document.head.appendChild(style);
        }

        // Clean up any existing listeners by cloning
        const newBtn = upgradeBtn.cloneNode(true);
        upgradeBtn.parentNode.replaceChild(newBtn, upgradeBtn);

        // Re-attach click handler for elite mode
        newBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const modal = document.getElementById('elite-hub-modal');
          if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
          }
        });
      } else {
        // Free mode: show "Upgrade Power" button
        upgradeBtn.innerHTML = 'Upgrade Power';
        upgradeBtn.href = 'upgrade_digital_rebel_desktop.html';
        upgradeBtn.className = 'w-full py-4 mt-8 font-headline font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs bg-primary-fixed text-on-primary-fixed border-2 border-[#121212] transition-all hover:bg-[#d4af37] neo-shadow';
        upgradeBtn.style.cssText = '';
      }
    }

    // Update token pill visibility
    const tokenPill = document.getElementById('nav-tokens-pill');
    if (tokenPill) {
      if (isElite && subscription?.streak_recovery_tokens !== undefined) {
        tokenPill.style.display = 'flex';
        const countEl = document.getElementById('nav-tokens-count');
        if (countEl) {
          countEl.textContent = '+' + (subscription.streak_recovery_tokens || 0);
        }
      } else {
        tokenPill.style.display = 'none';
      }
    }

    // Update localStorage cache for instant sidebar on page load
    try {
      const cached = JSON.parse(localStorage.getItem('futura_sidebar_v1') || '{}');
      localStorage.setItem('futura_sidebar_v1', JSON.stringify({
        ...cached,
        isElite,
        exploreBenefitsLabel: isElite ? 'Explore Benefits' : 'Upgrade Power'
      }));
    } catch (e) {
      // ignore quota errors
    }
  }

  /**
   * Initialize tier state from profile data
   * @param {Object} subscription - Subscription object from API
   */
  async function initializeFromProfile(subscription) {
    const isElit = typeof subscription?.entitlement === 'string' && 
                   subscription.entitlement.toLowerCase() === 'elite';
    
    _subscription = subscription;
    const oldTier = _currentTier;
    _currentTier = isElit ? 'elite' : 'free';

    localStorage.setItem('isElite', isElit ? 'true' : 'false');
    _updateAllUIElements(isElit, subscription);

    if (oldTier !== _currentTier) {
      _notifyListeners(_currentTier, oldTier, subscription);
    }

    // Set up Realtime listener after initialization
    _setupRealtimeListener();
  }

  /**
   * Set up Supabase Realtime listener for subscription changes
   * This listens to the user_subscriptions table and updates tier instantly
   */
  async function _setupRealtimeListener() {
    try {
      const session = await getSession();
      if (!session?.user?.id) return;

      // Kill existing listener
      if (_realtimeListener) {
        _realtimeListener.unsubscribe();
      }

      const userId = session.user.id;
      const supabase = getSupabase();

      // Set up Realtime listener on user_subscriptions table
      _realtimeListener = supabase
        .channel(`realtime:user_subscriptions:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // ALL events: INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[TierStateManager] Subscription change detected:', payload);
            _handleSubscriptionChange(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[TierStateManager] Realtime subscription active for user:', userId);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[TierStateManager] Realtime subscription error:', status);
          }
        });
    } catch (e) {
      console.warn('[TierStateManager] Failed to set up Realtime listener:', e);
    }
  }

  /**
   * Handle subscription change from Realtime
   * @param {Object} payload - Realtime payload
   */
  function _handleSubscriptionChange(payload) {
    try {
      const newSub = payload.new || payload.old || {};
      const oldTier = _currentTier;

      const isElit = typeof newSub?.entitlement === 'string' && 
                     newSub.entitlement.toLowerCase() === 'elite';

      _subscription = newSub;
      _currentTier = isElit ? 'elite' : 'free';

      localStorage.setItem('isElite', isElit ? 'true' : 'false');
      _updateAllUIElements(isElit, newSub);

      // Notify listeners if tier changed
      if (oldTier !== _currentTier) {
        console.log(`[TierStateManager] Tier changed: ${oldTier} → ${_currentTier}`);
        _notifyListeners(_currentTier, oldTier, newSub);

        // Show toast notification
        if (isElit && oldTier === 'free') {
          _futuraNotify('🔥 Welcome to Elite Tier! Enjoy premium benefits!', 'success');
        }
      }
    } catch (e) {
      console.error('[TierStateManager] Error handling subscription change:', e);
    }
  }

  /**
   * Cleanup Realtime connection
   */
  function cleanup() {
    if (_realtimeListener) {
      _realtimeListener.unsubscribe();
      _realtimeListener = null;
    }
    _listeners = [];
  }

  return {
    getCurrentTier,
    isElite,
    onTierChange,
    initializeFromProfile,
    cleanup
  };
})();

// Register global reference
window.TierStateManager = TierStateManager;
