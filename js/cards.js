/* ═══════════════════════════════════════════════════════
   DIGITAL REBEL — CARDS CONTROL PANEL
   ═══════════════════════════════════════════════════════ */
(async function () {
'use strict';

var BASE_LIQUIDITY = 142800;
var dailyCapVal = 5000;
var atmLimitVal = 1200;
var spentToday  = 1240;

// Attempt API-driven limits
try {
  if (typeof requireAuth !== 'undefined') {
    var session = await requireAuth();
    if (session && typeof futuraApi !== 'undefined') {
      var goalsResult = await futuraApi.goals.get();
      var goal = goalsResult.goal;
      if (goal && goal.target_monthly_income) {
        var mi = goal.target_monthly_income;
        dailyCapVal = Math.round(mi * 0.1);
        atmLimitVal = Math.round(mi * 0.024);
        if (futuraApi.projection && futuraApi.projection.calculate) {
          var pr = await futuraApi.projection.calculate({
            currentAge: goal.current_age||25, retirementAge: goal.retirement_age||65,
            monthlyIncome: mi, monthlyExpense: mi*0.6, currentSavings: 0,
            monthlyInvestment: mi*0.2, inflationRate: 0.06,
            returnRate: goal.annual_return_rate ?? 0.12, simulations: 2000
          });
          if (pr && pr.result && pr.result.futureSavings) BASE_LIQUIDITY = pr.result.futureSavings;
        }
      }
    }
  }
} catch(e) { console.error('Failed to load dynamic limits:', e); }

// Restore saved limits
var savedDaily = localStorage.getItem('daily_cap_val');
if (savedDaily) dailyCapVal = parseInt(savedDaily, 10);
var savedAtm = localStorage.getItem('atm_limit_val');
if (savedAtm) atmLimitVal = parseInt(savedAtm, 10);
var savedSpent = localStorage.getItem('spent_today');
if (savedSpent) spentToday = parseInt(savedSpent, 10);

function fmt(v) { return '$' + v.toLocaleString('en-US'); }

/* ─── TOAST ─── */
function showToast(msg, icon) {
  var t = document.getElementById('sys-toast');
  document.getElementById('sys-toast-msg').textContent = msg;
  document.getElementById('sys-toast-icon').textContent = icon || 'check_circle';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

/* ─── ACTIVITY LOG ─── */
function addLog(msg, icon) {
  var log = document.getElementById('activity-log');
  if (!log) return;
  var now = new Date();
  var ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
  var el = document.createElement('div');
  el.className = 'log-entry';
  el.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">' + (icon||'info') + '</span>' +
    '<span style="opacity:.5">' + ts + '</span> ' + msg;
  log.prepend(el);
  while (log.children.length > 5) log.removeChild(log.lastChild);
  setTimeout(function() {
    el.style.transition = 'opacity .4s ease, transform .4s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
  }, 5000);
}

/* ─── DRAWER ─── */
window.openDrawer = function(type) {
  var overlay = document.getElementById('drawer-overlay');
  var panel = document.getElementById('drawer-panel');
  var title = document.getElementById('drawer-title');
  var body = document.getElementById('drawer-body');
  overlay.classList.add('open');
  panel.classList.add('open');
  body.innerHTML = '';

  if (type === 'daily') {
    title.textContent = 'Daily Transaction Cap';
    body.innerHTML =
      '<span class="drawer-label">Current Limit</span>' +
      '<div class="drawer-val-big" id="d-cap-disp">' + fmt(dailyCapVal) + '</div>' +
      '<span class="drawer-label">Adjust Limit ($0 – $10,000)</span>' +
      '<input type="range" id="d-cap-slider" min="0" max="10000" step="100" value="' + dailyCapVal + '">' +
      '<hr class="drawer-divider">' +
      '<span class="drawer-label">Temporary Raise</span>' +
      '<div style="display:flex;gap:8px;margin-bottom:1rem">' +
        '<button class="drawer-btn" style="background:#a400a4;color:#fff;flex:1" onclick="tempRaise(500,1)">+$500 / 1 HR</button>' +
        '<button class="drawer-btn" style="background:#5b005b;color:#fff;flex:1" onclick="tempRaise(1000,24)">+$1,000 / 24 HR</button>' +
      '</div>' +
      '<hr class="drawer-divider">' +
      '<button class="drawer-btn" style="background:#cafd00" onclick="resetDaily()">Reset to Default</button>' +
      '<hr class="drawer-divider">' +
      '<span class="drawer-label">Spent Today</span>' +
      '<div style="display:flex;align-items:baseline;gap:8px">' +
        '<span class="drawer-val-big" style="font-size:2rem" id="d-spent-disp">' + fmt(spentToday) + '</span>' +
        '<span style="opacity:.5;font-weight:900;font-size:.75rem">/ ' + fmt(dailyCapVal) + '</span>' +
      '</div>';
    var slider = document.getElementById('d-cap-slider');
    slider.addEventListener('input', function() {
      document.getElementById('d-cap-disp').textContent = fmt(parseInt(this.value));
    });
    slider.addEventListener('change', function() {
      dailyCapVal = parseInt(this.value);
      localStorage.setItem('daily_cap_val', dailyCapVal);
      refreshDailyUI();
      showToast('Daily cap set to ' + fmt(dailyCapVal), 'savings');
      addLog('Daily cap → ' + fmt(dailyCapVal), 'savings');
    });
  }

  else if (type === 'atm') {
    title.textContent = 'ATM Withdrawal Limit';
    body.innerHTML =
      '<span class="drawer-label">Current Limit</span>' +
      '<div class="drawer-val-big" id="a-cap-disp">' + fmt(atmLimitVal) + '</div>' +
      '<span class="drawer-label">Adjust Limit ($0 – $5,000)</span>' +
      '<input type="range" id="a-cap-slider" min="0" max="5000" step="50" value="' + atmLimitVal + '">' +
      '<hr class="drawer-divider">' +
      '<button class="drawer-btn" style="background:#cafd00" onclick="resetAtm()">Reset to Default</button>';
    var aSlider = document.getElementById('a-cap-slider');
    aSlider.addEventListener('input', function() {
      document.getElementById('a-cap-disp').textContent = fmt(parseInt(this.value));
    });
    aSlider.addEventListener('change', function() {
      atmLimitVal = parseInt(this.value);
      localStorage.setItem('atm_limit_val', atmLimitVal);
      document.getElementById('atm-value').textContent = fmt(atmLimitVal);
      showToast('ATM limit set to ' + fmt(atmLimitVal), 'local_atm');
      addLog('ATM limit → ' + fmt(atmLimitVal), 'local_atm');
    });
  }

  else if (type === 'ecom') {
    var eState = document.getElementById('toggle-ecom').dataset.state;
    title.textContent = 'E-Commerce Blocker';
    var blocked = [
      { vendor:'STEAM DIGITAL', amt:'$59.99', time:'2 hrs ago' },
      { vendor:'AMAZON.COM', amt:'$142.50', time:'5 hrs ago' },
      { vendor:'SHOPIFY PAY', amt:'$28.00', time:'Yesterday' }
    ];
    var rows = blocked.map(function(b) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;border:2px solid #121212;padding:.6rem .8rem;margin-bottom:.4rem">' +
        '<div><p style="font-weight:900;font-size:.75rem;text-transform:uppercase;font-family:Lexend,sans-serif">' + b.vendor + '</p>' +
        '<p style="font-size:.6rem;opacity:.5;text-transform:uppercase;font-family:Lexend,sans-serif">' + b.time + '</p></div>' +
        '<span style="font-weight:900;font-family:Lexend,sans-serif;color:#b02500">' + b.amt + '</span></div>';
    }).join('');
    body.innerHTML =
      '<span class="drawer-label">Status</span>' +
      '<div class="drawer-val-big" style="color:' + (eState==='on' ? '#b02500' : '#4e6300') + '">' + (eState==='on'?'BLOCKING':'ALLOWING') + '</div>' +
      '<button class="drawer-btn" style="background:' + (eState==='on'?'#cafd00':'#f95630') + ';color:#121212;margin-bottom:1.2rem" id="ecom-toggle-btn">' + (eState==='on'?'Disable Blocker':'Enable Blocker') + '</button>' +
      '<hr class="drawer-divider">' +
      '<span class="drawer-label">Recent Blocked Transactions</span>' + rows;
    document.getElementById('ecom-toggle-btn').addEventListener('click', function() {
      toggleEcom();
      closeDrawer();
    });
  }
};

window.closeDrawer = function() {
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('drawer-panel').classList.remove('open');
};

/* ─── DAILY CAP UI ─── */
function refreshDailyUI() {
  var el = document.getElementById('daily-value');
  if (el) el.textContent = fmt(dailyCapVal);
  var pct = dailyCapVal > 0 ? Math.min(100, (spentToday / dailyCapVal) * 100) : 0;
  var bar = document.getElementById('daily-progress');
  if (bar) bar.style.width = pct.toFixed(1) + '%';
  var lbl = document.getElementById('daily-spent-label');
  if (lbl) lbl.textContent = fmt(spentToday) + ' / ' + fmt(dailyCapVal);
}

window.resetDaily = function() {
  dailyCapVal = 5000;
  localStorage.setItem('daily_cap_val', dailyCapVal);
  refreshDailyUI();
  closeDrawer();
  showToast('Daily cap reset to $5,000', 'restart_alt');
  addLog('Daily cap reset to default', 'restart_alt');
};

window.resetAtm = function() {
  atmLimitVal = 1200;
  localStorage.setItem('atm_limit_val', atmLimitVal);
  document.getElementById('atm-value').textContent = fmt(atmLimitVal);
  closeDrawer();
  showToast('ATM limit reset to $1,200', 'restart_alt');
  addLog('ATM limit reset to default', 'restart_alt');
};

/* ─── TEMP RAISE ─── */
window.tempRaise = function(amount, hours) {
  dailyCapVal += amount;
  localStorage.setItem('daily_cap_val', dailyCapVal);
  refreshDailyUI();
  var badge = document.getElementById('daily-temp-badge');
  if (badge) {
    badge.textContent = '+' + fmt(amount) + ' / ' + hours + 'HR';
    badge.classList.remove('hidden');
  }
  closeDrawer();
  showToast('Temp raise +' + fmt(amount) + ' for ' + hours + 'h', 'trending_up');
  addLog('Temp raise +' + fmt(amount) + ' (' + hours + 'h)', 'trending_up');
  setTimeout(function() {
    dailyCapVal -= amount;
    localStorage.setItem('daily_cap_val', dailyCapVal);
    refreshDailyUI();
    if (badge) badge.classList.add('hidden');
    showToast('Temp raise expired', 'timer_off');
    addLog('Temp raise expired', 'timer_off');
  }, hours * 3600 * 1000);
};

/* ─── ECOM TOGGLE ─── */
function toggleEcom() {
  var el = document.getElementById('toggle-ecom');
  var on = el.dataset.state === 'on';
  el.dataset.state = on ? 'off' : 'on';
  localStorage.setItem('toggle_ecom_block', el.dataset.state);
  var knob = el.querySelector('.toggle-knob');
  if (el.dataset.state === 'on') {
    el.style.background = '#f95630';
    if (knob) knob.style.left = 'calc(100% - 1.75rem - 2px)';
    document.getElementById('ecom-label').textContent = 'ENABLED';
    document.getElementById('ecom-label').style.color = '';
  } else {
    el.style.background = '#dbdddd';
    if (knob) knob.style.left = '2px';
    document.getElementById('ecom-label').textContent = 'DISABLED';
    document.getElementById('ecom-label').style.color = '#767777';
  }
  showToast('E-Commerce blocker ' + el.dataset.state.toUpperCase(), 'block');
  addLog('E-Commerce blocker ' + el.dataset.state.toUpperCase(), 'block');
}

// Init ecom from localStorage
(function() {
  var saved = localStorage.getItem('toggle_ecom_block');
  if (saved) {
    var el = document.getElementById('toggle-ecom');
    if (el) {
      el.dataset.state = saved;
      var knob = el.querySelector('.toggle-knob');
      if (saved === 'off') {
        el.style.background = '#dbdddd';
        if (knob) knob.style.left = '2px';
        document.getElementById('ecom-label').textContent = 'DISABLED';
        document.getElementById('ecom-label').style.color = '#767777';
      }
    }
  }
})();



/* ─── CARD PALETTES ─── */
var PALETTES = [
  { bg:'#121212', pattern:'radial-gradient(#cafd00 2px,transparent 2px)', sz:'20px 20px', fg:'#f6f6f6', accent:'#cafd00', accentFg:'#121212' },
  { bg:'#4e6300', pattern:'linear-gradient(45deg,#cafd00 25%,transparent 25%,transparent 50%,#cafd00 50%,#cafd00 75%,transparent 75%,transparent)', sz:'40px 40px', fg:'#121212', accent:'#ffffff', accentFg:'#121212' },
  { bg:'#0a0a2e', pattern:'none', sz:'auto', fg:'#cafd00', accent:'#cafd00', accentFg:'#0a0a2e' },
  { bg:'#a400a4', pattern:'radial-gradient(rgba(255,129,245,0.3) 1px,transparent 1px)', sz:'16px 16px', fg:'#ff81f5', accent:'#ff81f5', accentFg:'#121212' }
];

/* ─── BUILD/RENDER CARDS ─── */
function buildCard(card, p) {
  var frozen = !!card.frozen;
  var wrap = document.createElement('div');
  wrap.setAttribute('data-user-card', card.id);
  wrap.className = 'user-card-wrap';
  wrap.style.cssText = 'border:4px solid #121212;padding:1.4rem 1.6rem;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;aspect-ratio:1.586;width:100%;box-shadow:8px 8px 0 #121212;background-color:'+p.bg+';background-image:'+p.pattern+';background-size:'+p.sz;
  var masked = '\u2022\u2022\u2022\u2022\u00a0\u2022\u2022\u2022\u2022\u00a0\u2022\u2022\u2022\u2022\u00a0' + card.lastFour;
  var badgeBg = frozen?'#3a3a5c':p.accent, badgeFg = frozen?'#cafd00':p.accentFg, badgeTxt = frozen?'FROZEN':'ACTIVE';
  var frozenHtml = frozen ? '<div style="position:absolute;inset:0;background:rgba(10,10,46,0.88);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem"><span class="material-symbols-outlined" style="font-size:3.5rem;color:#cafd00">lock</span><span style="font-family:Lexend,sans-serif;font-weight:900;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.15em;color:#cafd00">Card Frozen</span></div>' : '';
  var fLbl = frozen?'UNFREEZE':'FREEZE', fBg = frozen?'#cafd00':'#0a0a2e', fClr = frozen?'#121212':'#cafd00';
  var actionsHtml = '<div class="user-card-actions"><button onclick="freezeCard('+card.id+')" style="background:'+fBg+';color:'+fClr+'">'+fLbl+'</button><button onclick="deleteCard('+card.id+')" style="background:#b02500;color:#fff">DELETE</button></div>';
  wrap.innerHTML = frozenHtml + actionsHtml +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:10"><span class="material-symbols-outlined" style="font-size:2.4rem;color:'+p.fg+'">'+(card.icon||'credit_card')+'</span><span style="font-family:Lexend,sans-serif;font-weight:900;font-style:italic;font-size:0.75rem;color:'+p.fg+';letter-spacing:0.08em;text-transform:uppercase;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">'+(card.title||'REBEL_CARD')+'</span></div>' +
    '<div style="position:relative;z-index:10"><p style="font-family:monospace;font-size:clamp(0.75rem,1.6vw,1.1rem);letter-spacing:0.06em;margin-bottom:0.6rem;color:'+p.fg+';white-space:nowrap;overflow:hidden">'+masked+'</p><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px"><div style="min-width:0;flex:1"><p style="font-family:Lexend,sans-serif;font-size:0.5rem;text-transform:uppercase;letter-spacing:0.12em;opacity:0.65;color:'+p.fg+';margin-bottom:2px">Card Holder</p><p style="font-family:Lexend,sans-serif;font-weight:900;text-transform:uppercase;font-size:0.7rem;color:'+p.fg+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+card.name+'</p></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0"><p style="font-family:Lexend,sans-serif;font-size:0.5rem;text-transform:uppercase;letter-spacing:0.12em;opacity:0.65;color:'+p.fg+'">Expires</p><p style="font-family:Lexend,sans-serif;font-weight:700;font-size:0.75rem;color:'+p.fg+'">'+(card.expiry||'--/--')+'</p></div><span style="font-family:Lexend,sans-serif;font-weight:900;font-size:0.6rem;background:'+badgeBg+';color:'+badgeFg+';padding:3px 10px;border:2px solid #121212;transform:rotate(2deg);display:inline-block;flex-shrink:0;letter-spacing:0.08em">'+badgeTxt+'</span></div></div>';
  return wrap;
}

function renderUserCards() {
  var grid = document.getElementById('cards-grid'); if (!grid) return;
  grid.querySelectorAll('[data-user-card]').forEach(function(el){el.remove()});
  var cards = JSON.parse(localStorage.getItem('rebel_cards')||'[]');
  cards.forEach(function(card,i) {
    var el = buildCard(card, PALETTES[i%PALETTES.length]);
    var ref = grid.lastElementChild;
    if (ref) grid.insertBefore(el, ref); else grid.appendChild(el);
  });
}

/* ─── FREEZE / DELETE ─── */
window.freezeCard = function(id) {
  var cards = JSON.parse(localStorage.getItem('rebel_cards')||'[]');
  var card=null,idx=0;
  cards.forEach(function(c,i){if(c.id===id){card=c;idx=i}});
  if (!card) return;
  card.frozen = !card.frozen;
  localStorage.setItem('rebel_cards', JSON.stringify(cards));
  var oldEl = document.querySelector('[data-user-card="'+id+'"]');
  var newEl = buildCard(card, PALETTES[idx%PALETTES.length]);
  if (oldEl) oldEl.replaceWith(newEl);
  showToast(card.frozen?'Card frozen':'Card unfrozen', card.frozen?'lock':'lock_open');
  addLog((card.frozen?'Froze':'Unfroze')+' card •'+card.lastFour, card.frozen?'lock':'lock_open');
  updateLiquidity();
};

window.deleteCard = function(id) {
  var cards = JSON.parse(localStorage.getItem('rebel_cards')||'[]');
  cards = cards.filter(function(c){return c.id!==id});
  localStorage.setItem('rebel_cards', JSON.stringify(cards));
  var el = document.querySelector('[data-user-card="'+id+'"]');
  if (el) el.remove();
  showToast('Card removed', 'delete');
  addLog('Deleted card', 'delete');
  updateLiquidity();
};



/* ─── LIQUIDITY ─── */
function updateLiquidity() {
  var cards = JSON.parse(localStorage.getItem('rebel_cards')||'[]');
  var userTotal=0, activeCount=0;
  cards.forEach(function(c){ if(!c.frozen){userTotal+=(c.balance||0);activeCount++} });
  var total = BASE_LIQUIDITY + userTotal;
  var pct = (((total-(total/1.124))/(total/1.124))*100).toFixed(1);
  var f; if (total>=1000000) f='$'+(total/1000000).toFixed(2)+'M'; else f='$'+(total/1000).toFixed(1)+'K';
  var a=document.getElementById('liquidity-amount'),c2=document.getElementById('liquidity-change'),cr=document.getElementById('liquidity-cards');
  if(a){a.style.transition='opacity 0.3s';a.style.opacity='0';setTimeout(function(){a.textContent=f;a.style.opacity='1'},200)}
  if(c2) c2.textContent='+'+pct+'% THIS MONTH';
  if(cr) cr.textContent=activeCount+' CARD'+(activeCount!==1?'S':'')+' ACTIVE';
}

/* ─── INIT ─── */
if (!localStorage.getItem('rebel_cards_init')) {
  localStorage.setItem('rebel_cards', JSON.stringify([
    {id:Date.now()+1,name:'REBEL_OPERATIVE_01',lastFour:'8829',expiry:'12/28',balance:0,frozen:false,icon:'contactless',title:'TITANIUM_ELITE'},
    {id:Date.now()+2,name:'REBEL_VAULT_77',lastFour:'4401',expiry:'05/26',balance:0,frozen:true,icon:'ac_unit',title:'COLD_STORAGE'}
  ]));
  localStorage.setItem('rebel_cards_init','true');
}

var notifBtn = document.getElementById('btn-notifications');
if (notifBtn) notifBtn.addEventListener('click', function(){ showToast('System is secure. No alerts.','notifications_active'); });

refreshDailyUI();
document.getElementById('atm-value').textContent = fmt(atmLimitVal);
renderUserCards();
updateLiquidity();



})();
