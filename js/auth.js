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

      if (isNewLogin) {
        if (!currentPath.includes('onboarding_')) {
          window.location.href = '/onboarding_step_1_age.html';
        }
        return;
      } else {
        console.warn('Profile missing. Aggressive logout.');
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

    if (isOnboarded) {
      localStorage.setItem('futura_onboarding_complete', 'true');
      document.documentElement.classList.add('auth-verified');
      document.documentElement.classList.remove('auth-loading');
      const googleBtn = document.getElementById('btn-google-signin');
      if (googleBtn) googleBtn.style.display = 'none';

      if (currentPath === '/' || currentPath.includes('index.html') || currentPath.includes('onboarding_')) {
        if (!window.location.search.includes('redirecting')) {
          window.location.href = '/dashboard_digital_rebel_desktop.html';
          return;
        }
      }
    } else {
      localStorage.removeItem('futura_onboarding_complete');
      document.documentElement.classList.remove('auth-verified', 'auth-loading');
      if (!currentPath.includes('onboarding_')) {
        if (currentPath.includes('dashboard_') || currentPath.includes('market_') || currentPath.includes('assets_') || currentPath.includes('index.html') || currentPath === '/') {
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

  // Find "Connect Wallet" and Hero Sign-In buttons
  const authButtons = document.querySelectorAll(
    '#btn-connect-wallet, #connect-wallet-btn, #btn-google-signin, [id*="connect-wallet"]'
  );

  authButtons.forEach(btn => {
    if (session && _profileVerified) {
      if (btn.id === 'btn-google-signin') {
        btn.innerHTML = '<span class="material-symbols-outlined">terminal</span> ENTER TERMINAL';
      } else {
        btn.textContent = (session.user.email?.split('@')[0] || 'Rebel').toUpperCase();
      }

      btn.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/dashboard_digital_rebel_desktop.html';
      };
    } else {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        signInWithGoogle();
      });
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

  // Find logout links
  const logoutLinks = document.querySelectorAll('#logout-link, [href*="index.html"]:has(.material-symbols-outlined), .btn-logout');
  logoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });
  });
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
