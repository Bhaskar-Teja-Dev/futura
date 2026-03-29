// Futura — API client module
// Requires: auth.js loaded before this

async function apiFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${FUTURA_CONFIG.API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return res.json();
}

const futuraApi = {
  profile: {
    get: () => apiFetch('/api/profile'),
    update: (body) => apiFetch('/api/profile', { method: 'PATCH', body: JSON.stringify(body) })
  },
  goals: {
    get: () => apiFetch('/api/goals'),
    upsert: (body) => apiFetch('/api/goals', { method: 'POST', body: JSON.stringify(body) })
  },
  contributions: {
    list: () => apiFetch('/api/contributions'),
    create: (body) => apiFetch('/api/contributions', { method: 'POST', body: JSON.stringify(body) }),
    streak: () => apiFetch('/api/contributions/streak')
  },
  projection: {
    calculate: (body) => apiFetch('/api/projection', { method: 'POST', body: JSON.stringify(body) })
  },
  allocation: {
    get: () => apiFetch('/api/allocation')
  },
  zens: {
    purchase: (razorpay_payment_id) =>
      apiFetch('/api/zens/purchase', {
        method: 'POST',
        body: JSON.stringify({ razorpay_payment_id })
      }),
    spend: (amount) =>
      apiFetch('/api/zens/spend', {
        method: 'POST',
        body: JSON.stringify({ amount })
      }),
    add: (amount) =>
      apiFetch('/api/zens/credit', {
        method: 'POST',
        body: JSON.stringify({ amount })
      }),
    balance: () => apiFetch('/api/zens/balance')
  },
  subscriptions: {
    purchasePro: (razorpay_payment_id) =>
      apiFetch('/api/subscriptions/purchase-pro', { 
        method: 'POST',
        body: JSON.stringify({ razorpay_payment_id })
      })
  }
};

// Load Razorpay SDK dynamically
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(script);
  });
}

// Dynamic Zens Purchasing Menu & Razorpay Handler
async function buyZens(onSuccess) {
  await loadRazorpayScript();

  // Create Overlay Menu
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(18,18,18,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease;';
  
  const INRD_RATE = 10; // Zens per 1 INR

  ov.innerHTML = `
    <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    <div style="background:#fff;border:3px solid #121212;box-shadow:8px 8px 0 #121212;width:100%;max-width:480px;animation:slideUp .2s ease;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 24px 16px;border-bottom:2px solid #121212;">
        <h2 style="font-family:'Lexend',sans-serif;font-weight:900;font-size:24px;text-transform:uppercase;letter-spacing:-.02em;">ADD ZENS 🪙</h2>
        <button id="close-buy-menu" style="background:none;border:none;font-size:32px;cursor:pointer;font-weight:900;line-height:1;margin-top:-8px;">×</button>
      </div>
      
      <div style="padding:24px;display:flex;flex-direction:column;gap:16px;">
        <p style="font-family:'Inter',sans-serif;font-size:14px;color:#5a5a5a;margin-top:-8px;">Choose a package to top up your virtual wallet.</p>
        
        <!-- Package 1 -->
        <button data-amount="50" data-zens="500" class="zens-pack" style="display:flex;justify-content:space-between;align-items:center;padding:16px;border:3px solid #121212;background:#f8f8f8;cursor:pointer;transition:all 0.1s;">
          <div style="text-align:left;">
            <div style="font-family:'Lexend',sans-serif;font-weight:900;font-size:20px;">🪙 500 <span style="font-size:12px;color:#767777;">ZENS</span></div>
            <div style="font-family:'Lexend',sans-serif;font-weight:700;font-size:12px;color:#000000;margin-top:4px;">STARTER PACK</div>
          </div>
          <div style="font-family:'Lexend',sans-serif;font-weight:900;font-size:18px;">₹50</div>
        </button>

        <!-- Package 2 -->
        <button data-amount="200" data-zens="2000" class="zens-pack" style="display:flex;justify-content:space-between;align-items:center;padding:16px;border:3px solid #121212;background:#cafd00;cursor:pointer;transition:all 0.1s;position:relative;box-shadow:4px 4px 0 #121212;">
          <div style="position:absolute;top:-12px;right:-12px;background:#121212;color:#fff;font-family:'Lexend',sans-serif;font-weight:900;font-size:10px;padding:4px 8px;border:2px solid #fff;transform:rotate(4deg);">MOST POPULAR</div>
          <div style="text-align:left;">
            <div style="font-family:'Lexend',sans-serif;font-weight:900;font-size:20px;color:#121212;">🪙 2,000 <span style="font-size:12px;color:#121212;opacity:0.8;">ZENS</span></div>
            <div style="font-family:'Lexend',sans-serif;font-weight:700;font-size:12px;color:#121212;margin-top:4px;">PREMIUM PACK</div>
          </div>
          <div style="font-family:'Lexend',sans-serif;font-weight:900;font-size:18px;color:#121212;">₹200</div>
        </button>

        <!-- Package 3 -->
        <button data-amount="1000" data-zens="10000" class="zens-pack" style="display:flex;justify-content:space-between;align-items:center;padding:16px;border:3px solid #121212;background:#121212;color:#fff;cursor:pointer;transition:all 0.1s;">
          <div style="text-align:left;">
            <div style="font-family:'Lexend',sans-serif;font-weight:900;font-size:20px;color:#cafd00;">🪙 10,000 <span style="font-size:12px;color:#fff;opacity:0.7;">ZENS</span></div>
            <div style="font-family:'Lexend',sans-serif;font-weight:700;font-size:12px;color:#fff;opacity:0.9;margin-top:4px;">WHALE PACK</div>
          </div>
          <div style="font-family:'Lexend',sans-serif;font-weight:900;font-size:18px;">₹1000</div>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  ov.querySelector('#close-buy-menu').addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  
  // Wire Buttons
  ov.querySelectorAll('.zens-pack').forEach(btn => {
    btn.addEventListener('click', () => {
      const amountINR = parseInt(btn.dataset.amount, 10);
      const zensDesc = parseInt(btn.dataset.zens, 10);
      ov.remove();
      initiateRazorpayPurchase(amountINR, zensDesc, onSuccess);
    });
  });
}

function initiateRazorpayPurchase(amountINR, zensExpected, onSuccess) {
  const options = {
    key: FUTURA_CONFIG.RAZORPAY_KEY_ID,
    amount: amountINR * 100, // INR to paise
    currency: 'INR',
    name: 'Digital Rebel',
    description: `${zensExpected.toLocaleString('en-US')} Zens Credit Pack`,
    handler: async (response) => {
      try {
        const result = await futuraApi.zens.purchase(response.razorpay_payment_id);
        
        // Add notification for successful purchase
        if (typeof RebelNotifications !== 'undefined') {
          RebelNotifications.add(
            'ZENS Credited',
            `Successfully added ${zensExpected.toLocaleString('en-US')} ZENS to your warchest.`,
            'success'
          );
        }

        if (onSuccess) onSuccess(result.newBalance || result.zens); // Pass new balance
      } catch (err) {
        console.error('Zens credit failed:', err);
        alert('Payment received but failed to credit Zens. Contact support.');
      }
    },
    theme: { color: '#68FD00' }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

// Purchase Elite / Pro using Razorpay Payment ID
async function buyPro(razorpay_payment_id) {
  try {
    const result = await futuraApi.subscriptions.purchasePro(razorpay_payment_id);
    return result;
  } catch (err) {
    const msg = err.message || '';
    alert('Failed to upgrade to Elite: ' + msg);
    throw err;
  }
}
