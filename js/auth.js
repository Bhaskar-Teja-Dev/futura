// Futura — Supabase Auth module
// Requires: supabase-js CDN + config.js loaded before this

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(
      FUTURA_CONFIG.SUPABASE_URL,
      FUTURA_CONFIG.SUPABASE_ANON_KEY
    );
  }
  return _supabase;
}

// Get current session (returns null if not logged in)
async function getSession() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session;
}

// Get access token for API calls
async function getAccessToken() {
  const session = await getSession();
  return session?.access_token ?? null;
}

// Sign in with Google OAuth
async function signInWithGoogle() {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html?auth_callback=true'
    }
  });
  if (error) {
    console.error('Google sign-in error:', error.message);
    alert('Sign-in failed: ' + error.message);
  }
}

// Sign out
async function signOut() {
  await getSupabase().auth.signOut();
  window.location.href = '/index.html';
}

let _profileVerified = false;

// Check if onboarding is completed
async function checkOnboarding() {
  const session = await getSession();
  const currentPath = window.location.pathname;

  if (!session) {
    _profileVerified = true;
    updateNavAuth();
    return;
  }

  try {
    const res = await fetch(`${FUTURA_CONFIG.API_BASE_URL}/api/profile`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (res.status === 404) {
      const urlParams = new URLSearchParams(window.location.search);
      const isNewLogin = urlParams.has('auth_callback') || window.location.hash.includes('access_token');
      const isOnboardingPage = currentPath.includes('onboarding_');

      if (isNewLogin || isOnboardingPage) {
        if (!isOnboardingPage) {
          window.location.href = '/onboarding_step_1_age.html';
        }
        return;
      } else {
        console.warn('Profile missing and not onboarding. Aggressive logout.');
        document.documentElement.classList.remove('auth-verified', 'auth-loading');
        localStorage.clear();
        sessionStorage.clear();
        await signOut();
        return;
      }
    }

    if (!res.ok) throw new Error('Failed to fetch profile');
    const { profile } = await res.json();
    _profileVerified = true;

    const isOnboarded = profile && profile.onboarding_complete;
    localStorage.setItem('futura_onboarding_complete', isOnboarded ? 'true' : 'false');

    if (isOnboarded) {
      document.documentElement.classList.add('auth-verified');
      document.documentElement.classList.remove('auth-loading');

      // If user is on landing or onboarding pages but IS already onboarded, send to dashboard
      const shouldRedirectToDash = currentPath === '/' || 
                                   currentPath.includes('index.html') || 
                                   currentPath.includes('landing_') ||
                                   currentPath.includes('onboarding_');
      
      if (shouldRedirectToDash) {
        if (!window.location.search.includes('redirecting')) {
          window.location.href = '/dashboard_digital_rebel_desktop.html?redirecting=true';
          return;
        }
      }
    } else {
      document.documentElement.classList.remove('auth-verified', 'auth-loading');
      // If NOT onboarded and NOT already on an onboarding page, send to Step 1
      if (!currentPath.includes('onboarding_')) {
        const protectedPaths = ['dashboard_', 'market_', 'assets_', 'index.html', 'landing_'];
        const isProtected = protectedPaths.some(p => currentPath.includes(p)) || currentPath === '/';
        
        if (isProtected) {
          window.location.href = '/onboarding_step_1_age.html';
          return;
        }
      }
    }

    // UI is now safe to update
    updateNavAuth();
    document.body.style.opacity = '1';
  } catch (err) {
    console.error('Onboarding check failed:', err);
    document.documentElement.classList.remove('auth-verified', 'auth-loading');
    _profileVerified = true;
    updateNavAuth();
    document.body.style.opacity = '1';
  }
}

// Protect a page — redirect to index if not authenticated
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/index.html';
    return null;
  }
  return session;
}

// Update nav UI based on auth state
async function updateNavAuth() {
  const session = await getSession();

  // Header Button: Hide if signed in, show name instead
  const headerBtn = document.getElementById('btn-auth-header');
  const nameLabel = document.getElementById('user-name-header');
  const displayName = document.getElementById('user-display-name');

  if (session && _profileVerified) {
    if (headerBtn) headerBtn.style.display = 'none';
    if (nameLabel) {
      nameLabel.classList.remove('hidden');
      if (displayName) displayName.textContent = (session.user.email?.split('@')[0] || 'REBEL').toUpperCase();
    }
  } else {
    if (headerBtn) {
      headerBtn.style.display = 'flex';
      headerBtn.onclick = (e) => { e.preventDefault(); signInWithGoogle(); };
    }
    if (nameLabel) nameLabel.classList.add('hidden');
  }

  // Hero Button: Change to ENTER TERMINAL if signed in
  const heroBtn = document.getElementById('btn-auth-hero');
  if (heroBtn) {
    if (session && _profileVerified) {
      heroBtn.innerHTML = '<span class="material-symbols-outlined">terminal</span> ENTER TERMINAL';
      heroBtn.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/dashboard_digital_rebel_desktop.html';
      };
    } else {
      heroBtn.innerHTML = `
        <img alt="G" class="w-6 h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGbSlYWQx7duriQ_rj1NkH12h0GPa6HXIDIMazPgvscwHaU0LrccorkuzuIhtDpMuUMIEvQc27qUB_AaYDxuJNz7VeElyUlxaHNGnABnsN5QMzTBTDVSGsx05jIxorxhKmdzR_IiiffekEIQR4xadI5EnXGV8YwxwVHVVo88rn9uq2i-uyNK-W1jaVVwvyb9vqadxunjI4sluWlaRmjOGa0sqxde0pAYhzni0eKL2qxhiuPvpW56hqN44MwRReBRJzNUdWS-P6qOwh" />
        Sign in with Google
      `;
      heroBtn.onclick = (e) => { e.preventDefault(); signInWithGoogle(); };
    }
  }

  // Legacy/General Buttons (Connect Wallet etc)
  const otherAuthButtons = document.querySelectorAll(
    '#btn-connect-wallet, #connect-wallet-btn, [id*="connect-wallet"]'
  );

  otherAuthButtons.forEach(btn => {
    if (session && _profileVerified) {
      btn.textContent = (session.user.email?.split('@')[0] || 'Rebel').toUpperCase();
      btn.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/dashboard_digital_rebel_desktop.html';
      };
    } else {
      btn.onclick = (e) => {
        e.preventDefault();
        signInWithGoogle();
      };
    }
  });

  // Populate Zens Balance in Nav if applicable
  if (session) {
    const zensPill = document.getElementById('nav-zens-balance');
    if (zensPill) {
      try {
        const { zens } = await futuraApi.zens.balance();
        zensPill.textContent = (zens || 0).toLocaleString('en-US') + ' ZENS';
      } catch (err) {
        console.error("Failed to load Zens balance:", err);
      }
    }
  }

  // ── Logout Listener (Event Delegation) ───────────────────────────────────
  // Using delegation so that dynamically injected elements (like dropdowns) 
  // also get the logout functionality automatically.
  if (!window._logoutListenerAttached) {
    document.addEventListener('click', async (e) => {
      const logoutTarget = e.target.closest('#logout-link, .btn-logout, [href*="logout"]');
      const isLogoutText = e.target.textContent.toLowerCase().includes('logout') && 
                          (e.target.closest('a') || e.target.closest('button'));

      if (logoutTarget || isLogoutText) {
        e.preventDefault();
        console.log('Logout triggered');
        await signOut();
      }
    });
    window._logoutListenerAttached = true;
  }

  // ── Global Avatar Dropdown ────────────────────────────────────────────────
  // Attaches a consistent dropdown to any #nav-avatar element
  const avatarWrap = document.getElementById('nav-avatar');
  if (avatarWrap && !avatarWrap._hasDropdown) {
    avatarWrap.style.cursor = 'pointer';
    avatarWrap.addEventListener('click', e => {
      e.stopPropagation();
      // Remove any existing dropdowns
      document.querySelectorAll('.avatar-dropdown').forEach(d => d.remove());

      const dd = document.createElement('div');
      dd.className = 'avatar-dropdown';
      dd.id = 'dynamic-avatar-dropdown';
      dd.style.cssText = `
        position: fixed;
        background: #fff;
        border: 2px solid #121212;
        box-shadow: 4px 4px 0 #121212;
        z-index: 9999;
        min-width: 200px;
        animation: slideIn 0.1s ease-out;
      `;

      // Simple slide-in animation
      const style = document.createElement('style');
      style.textContent = `@keyframes slideIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`;
      if (!document.getElementById('dropdown-styles')) {
        style.id = 'dropdown-styles';
        document.head.appendChild(style);
      }

      const rect = avatarWrap.getBoundingClientRect();
      dd.style.top = (rect.bottom + 8) + 'px';
      dd.style.right = (window.innerWidth - rect.right) + 'px';

      const links = [
        { label: 'My Dashboard', href: 'dashboard_digital_rebel_desktop.html', icon: 'grid_view' },
        { label: 'My Settings', href: 'settings_digital_rebel_desktop.html', icon: 'settings' },
        { label: 'Assets', href: 'assets_digital_rebel_desktop.html', icon: 'account_balance_wallet' },
        { label: 'Logout', href: '#', icon: 'logout', id: 'logout-link', color: '#b02500' }
      ];

      links.forEach(({ label, href, icon, id, color }) => {
        const a = document.createElement('a');
        a.href = href;
        if (id) a.id = id;
        a.className = 'flex items-center gap-3 px-4 py-3 font-headline font-black text-xs uppercase tracking-widest text-[#121212] hover:bg-[#cafd00] transition-colors border-b border-[#e0e0e0] last:border-none';
        a.style.textDecoration = 'none';
        if (color) a.style.color = color;

        a.innerHTML = `<span class="material-symbols-outlined text-sm">${icon}</span> ${label}`;
        
        a.addEventListener('click', async (e) => {
          if (label === 'Logout') {
            e.preventDefault();
            await signOut();
          }
        });

        dd.appendChild(a);
      });

      document.body.appendChild(dd);

      // Close when clicking outside
      const closeDropdown = (event) => {
        if (!dd.contains(event.target) && event.target !== avatarWrap) {
          dd.remove();
          document.removeEventListener('click', closeDropdown);
        }
      };
      setTimeout(() => document.addEventListener('click', closeDropdown), 10);
    });
    avatarWrap._hasDropdown = true;
  }
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();

  // Safety Reveal: Ensure body is never permanently hidden if auth/api hangs
  setTimeout(() => {
    if (document.body.style.opacity === '0' || getComputedStyle(document.body).opacity === '0') {
      document.body.style.opacity = '1';
    }
  }, 2500);

  // Only check onboarding once session is established
  getSupabase().auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      checkOnboarding();
      updateNavAuth();
    } else if (event === 'SIGNED_OUT') {
      document.documentElement.classList.remove('auth-verified', 'auth-loading');
      _profileVerified = true;
      updateNavAuth();
      document.body.style.opacity = '1';
    }
  });
});
