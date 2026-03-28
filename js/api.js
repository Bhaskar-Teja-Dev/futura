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
      })
  },
  subscriptions: {
    purchasePro: () =>
      apiFetch('/api/subscriptions/purchase-pro', { method: 'POST' })
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

// Open Razorpay checkout for 500 Zens (₹50)
async function buyZens(onSuccess) {
  await loadRazorpayScript();

  const options = {
    key: FUTURA_CONFIG.RAZORPAY_KEY_ID,
    amount: 5000, // ₹50 in paise
    currency: 'INR',
    name: 'Digital Rebel',
    description: '500 Zens Credit Pack',
    handler: async (response) => {
      try {
        const result = await futuraApi.zens.purchase(response.razorpay_payment_id);
        if (onSuccess) onSuccess(result.zens);
      } catch (err) {
        console.error('Zens credit failed:', err);
        alert('Payment received but failed to credit Zens. Contact support.');
      }
    },
    theme: { color: '#cafd00' }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

// Purchase Pro with Zens (500 Zens → 30 days)
async function buyPro(onSuccess) {
  try {
    const result = await futuraApi.subscriptions.purchasePro();
    if (onSuccess) onSuccess(result);
    return result;
  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('insufficient_zens')) {
      alert('Not enough Zens! Buy more first.');
    } else {
      alert('Failed to purchase Pro: ' + msg);
    }
    throw err;
  }
}
