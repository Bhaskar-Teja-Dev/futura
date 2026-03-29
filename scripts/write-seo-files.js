/**
 * Writes robots.txt and sitemap.xml using one origin.
 * Override: FUTURA_PUBLIC_ORIGIN=https://your.domain npm run build:static
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_ORIGIN = (
  process.env.FUTURA_PUBLIC_ORIGIN || 'https://futura.vercel.app'
).replace(/\/$/, '');

const root = path.join(__dirname, '..');
const paths = [
  '/',
  '/index.html',
  '/learn_digital_rebel_desktop.html',
  '/market_digital_rebel_desktop.html',
  '/support_digital_rebel_desktop.html',
  '/privacy.html',
  '/terms.html',
];

const priorities = {
  '/': 1.0,
  '/index.html': 1.0,
  '/learn_digital_rebel_desktop.html': 0.85,
  '/market_digital_rebel_desktop.html': 0.9,
  '/support_digital_rebel_desktop.html': 0.7,
  '/privacy.html': 0.4,
  '/terms.html': 0.4,
};

const changefreq = {
  '/': 'weekly',
  '/index.html': 'weekly',
  '/learn_digital_rebel_desktop.html': 'weekly',
  '/market_digital_rebel_desktop.html': 'daily',
  '/support_digital_rebel_desktop.html': 'monthly',
  '/privacy.html': 'yearly',
  '/terms.html': 'yearly',
};

const urlEntries = paths
  .map((p) => {
    const loc = PUBLIC_ORIGIN + (p.startsWith('/') ? p : '/' + p);
    return (
      '  <url>\n' +
      '    <loc>' +
      loc +
      '</loc>\n' +
      '    <changefreq>' +
      (changefreq[p] || 'weekly') +
      '</changefreq>\n' +
      '    <priority>' +
      (priorities[p] ?? 0.5) +
      '</priority>\n' +
      '  </url>'
    );
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Dev / tooling (not part of the static marketing app)
Disallow: /my-react-app/

Sitemap: ${PUBLIC_ORIGIN}/sitemap.xml
`;

fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(root, 'robots.txt'), robots, 'utf8');
console.log('[write-seo-files] PUBLIC_ORIGIN=' + PUBLIC_ORIGIN);
