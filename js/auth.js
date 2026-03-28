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
      redirectTo: window.location.origin + '/index.html'
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

// Check if onboarding is completed
async function checkOnboarding() {
  const session = await getSession();
  if (!session) return;

  try {
    // We call the API instead of direct Supabase to trigger auto-initialization
    // and to get the source-of-truth profile data.
    const res = await fetch(`${FUTURA_CONFIG.API_BASE_URL}/api/profile`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (!res.ok) throw new Error('Failed to fetch profile');
    const { profile } = await res.json();

    const isOnboarded = profile && profile.onboarding_complete;
    const currentPath = window.location.pathname;

    // Redirection Logic
    if (isOnboarded) {
      // If onboarded, only allow dashboard/market/assets etc. 
      // Redirect away from index/onboarding
      if (currentPath === '/' || currentPath.includes('index.html') || currentPath.includes('onboarding_')) {
        window.location.href = '/dashboard_digital_rebel_desktop.html';
      }
    } else {
      // If not onboarded, only allow onboarding pages
      // Redirect away from dashboard/market/assets
      if (currentPath.includes('dashboard_') || currentPath.includes('market_') || currentPath.includes('assets_') || currentPath.includes('index.html') || currentPath === '/') {
        window.location.href = '/onboarding_step_1_age.html';
      }
    }
  } catch (err) {
    console.error('Onboarding check failed:', err);
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

  // Find "Connect Wallet" buttons and convert to user indicator
  const connectBtns = document.querySelectorAll(
    '#btn-connect-wallet, #connect-wallet-btn, [id*="connect-wallet"]'
  );

  connectBtns.forEach(btn => {
    if (session) {
      btn.textContent = (session.user.email?.split('@')[0] || 'Rebel').toUpperCase();
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

  // Only check onboarding once session is established
  getSupabase().auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      checkOnboarding();
      updateNavAuth();
    }
  });
});
