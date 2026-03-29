/* mobile-footer-nav.js
 * Auto-injects the bottom mobile navigation bar on every page.
 * Detects the current page and highlights the active link.
 */
(function () {
  var NAV_ITEMS = [
    { label: 'Home',   icon: 'home',                   href: 'dashboard_digital_rebel_desktop.html', match: 'dashboard' },
    { label: 'Market', icon: 'candlestick_chart',       href: 'market_digital_rebel_desktop.html',   match: 'market' },
    { label: 'Assets', icon: 'account_balance_wallet',  href: 'assets_digital_rebel_desktop.html',   match: 'assets' },
    { label: 'Learn',  icon: 'school',                  href: 'learn_digital_rebel_desktop.html',    match: 'learn' },
  ];

  var path = window.location.pathname.toLowerCase();

  function inject() {
    // Don't inject on pages that already have a bottom nav
    if (document.getElementById('mobile-footer-nav')) return;

    // Add bottom padding to main/body so content isn't hidden behind nav
    var main = document.querySelector('main') || document.querySelector('.main-content');
    if (main) {
      main.style.paddingBottom = 'calc(' + (main.style.paddingBottom || '0px') + ' + 4.5rem)';
    }

    var nav = document.createElement('nav');
    nav.id = 'mobile-footer-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');
    nav.style.cssText = [
      'display: none',           // hidden by default, shown via media query below
      'position: fixed',
      'bottom: 0',
      'left: 0',
      'width: 100%',
      'height: 3.75rem',         // 60px
      'z-index: 9998',
      'background: #cafd00',
      'border-top: 3px solid #121212',
      'box-shadow: 0 -4px 0 0 #121212',
    ].join(';');

    nav.style.display = 'flex';  // override — will be hidden by @media via class

    NAV_ITEMS.forEach(function (item, i) {
      var isActive = path.includes(item.match);
      var a = document.createElement('a');
      a.href = item.href;
      a.style.cssText = [
        'flex: 1',
        'display: flex',
        'flex-direction: column',
        'align-items: center',
        'justify-content: center',
        'text-decoration: none',
        'color: #121212',
        'font-family: Lexend, Inter, sans-serif',
        'font-weight: 900',
        'font-size: 9px',
        'letter-spacing: 0.08em',
        'text-transform: uppercase',
        'transition: background 0.1s, color 0.1s',
        'border-right: ' + (i < NAV_ITEMS.length - 1 ? '2px solid #121212' : 'none'),
        isActive ? 'background:#121212;color:#cafd00;' : '',
      ].join(';');

      var icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = item.icon;
      icon.style.fontSize = '22px';
      icon.style.lineHeight = '1';
      icon.style.marginBottom = '2px';

      var label = document.createElement('span');
      label.textContent = item.label;

      a.appendChild(icon);
      a.appendChild(label);

      // Touch feedback
      a.addEventListener('touchstart', function () {
        if (!isActive) { a.style.background = 'rgba(18,18,18,0.08)'; }
      }, { passive: true });
      a.addEventListener('touchend', function () {
        if (!isActive) { a.style.background = ''; }
      }, { passive: true });

      nav.appendChild(a);
    });

    // Inject style to hide on lg+ screens
    if (!document.getElementById('mfn-style')) {
      var style = document.createElement('style');
      style.id = 'mfn-style';
      style.textContent = '#mobile-footer-nav { display: flex !important; } @media (min-width: 1024px) { #mobile-footer-nav { display: none !important; } } body { padding-bottom: 3.75rem; } @media (min-width: 1024px) { body { padding-bottom: 0; } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
