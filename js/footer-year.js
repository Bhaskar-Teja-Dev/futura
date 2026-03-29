(function () {
  function set() {
    var r = '2024–' + new Date().getFullYear();
    document.querySelectorAll('[data-year-range]').forEach(function (el) {
      el.textContent = r;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', set);
  else set();
})();
