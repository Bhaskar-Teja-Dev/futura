/* Hamburger + overlay for #app-sidebar (pages that include the markup) */
(function () {
  function init() {
    var toggle = document.getElementById('mobile-sidebar-toggle');
    var sidebar = document.getElementById('app-sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (!toggle || !sidebar) return;

    function desktop() {
      return window.matchMedia('(min-width: 1024px)').matches;
    }

    function close() {
      sidebar.classList.add('-translate-x-full');
      if (overlay) {
        overlay.classList.add('hidden', 'pointer-events-none');
      }
    }

    function open() {
      sidebar.classList.remove('-translate-x-full');
      if (overlay) {
        overlay.classList.remove('hidden', 'pointer-events-none');
      }
    }

    toggle.addEventListener('click', function () {
      if (desktop()) return;
      if (sidebar.classList.contains('-translate-x-full')) open();
      else close();
    });

    if (overlay) {
      overlay.addEventListener('click', close);
    }

    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (!desktop()) close();
      });
    });

    window.addEventListener('resize', function () {
      if (desktop() && overlay) {
        overlay.classList.add('hidden', 'pointer-events-none');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
