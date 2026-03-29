/* Flyout menu for pages with only top nav (no #app-sidebar) */
(function () {
  function init() {
    var toggle = document.getElementById('mobile-topnav-toggle');
    var panel = document.getElementById('mobile-topnav-panel');
    var overlay = document.getElementById('mobile-topnav-overlay');
    if (!toggle || !panel) return;

    function close() {
      panel.classList.add('hidden');
      if (overlay) overlay.classList.add('hidden', 'pointer-events-none');
    }

    function open() {
      panel.classList.remove('hidden');
      if (overlay) overlay.classList.remove('hidden', 'pointer-events-none');
    }

    toggle.addEventListener('click', function () {
      if (panel.classList.contains('hidden')) open();
      else close();
    });

    if (overlay) overlay.addEventListener('click', close);

    panel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
