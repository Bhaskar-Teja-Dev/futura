/**
 * Syncs canonical, JSON-LD, and Open Graph URL with FUTURA_CONFIG.PUBLIC_SITE_ORIGIN
 * or the current window origin when PUBLIC_SITE_ORIGIN is unset.
 * Load after js/config.js
 */
(function () {
  if (typeof window === 'undefined' || typeof FUTURA_CONFIG === 'undefined') return;

  function baseOrigin() {
    var o = FUTURA_CONFIG.PUBLIC_SITE_ORIGIN;
    if (o != null && String(o).trim() !== '') {
      return String(o).replace(/\/$/, '');
    }
    return window.location.origin;
  }

  function canonicalPath() {
    var p = window.location.pathname || '/';
    if (p === '/index.html' || p.endsWith('/index.html')) {
      return '/';
    }
    return p;
  }

  function canonicalHref() {
    var base = baseOrigin();
    var path = canonicalPath();
    if (path === '/') return base + '/';
    return base + (path.startsWith('/') ? path : '/' + path);
  }

  var href = canonicalHref();

  var link = document.querySelector('link[rel="canonical"]');
  if (link) link.setAttribute('href', href);

  var og = document.querySelector('meta[property="og:url"]');
  if (og) og.setAttribute('content', href);

  var ld = document.getElementById('futura-ld-json');
  if (ld && ld.textContent) {
    try {
      var data = JSON.parse(ld.textContent);
      if (data.url) data.url = href;
      if (data.publisher && data.publisher.url) data.publisher.url = baseOrigin() + '/';
      ld.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      /* keep static JSON */
    }
  }
})();
