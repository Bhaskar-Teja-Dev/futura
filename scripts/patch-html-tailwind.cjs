/**
 * One-time / maintenance: ensure static pages use built Tailwind CSS instead of CDN.
 * Run from repo root: node scripts/patch-html-tailwind.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const linkTag = '<link rel="stylesheet" href="css/app.css" />';

function patch(html) {
  let s = html;
  // Remove Tailwind CDN + browser config (any order)
  s = s.replace(
    /<script src="https:\/\/cdn\.tailwindcss\.com\?[^"]*"><\/script>\s*\r?\n/gi,
    ''
  );
  s = s.replace(/\t<script src="https:\/\/cdn\.tailwindcss\.com\?[^"]*"><\/script>\s*\r?\n/g, '');
  s = s.replace(/<script src="js\/tailwind\.config\.js"><\/script>\s*\r?\n/gi, '');
  s = s.replace(/\t<script src="js\/tailwind\.config\.js"><\/script>\s*\r?\n/g, '');

  if (!s.includes('css/app.css')) {
    // After viewport meta (common across pages)
    const viewportRe = /(<meta[^>]*name="viewport"[^>]*\/?>)/i;
    if (viewportRe.test(s)) {
      s = s.replace(viewportRe, `$1\n${linkTag}`);
    } else if (/<head>/i.test(s)) {
      s = s.replace(/<head>\s*\r?\n/i, (m) => m + linkTag + '\n');
    }
  }
  return s;
}

const files = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let changed = 0;
for (const f of files) {
  const p = path.join(root, f);
  const before = fs.readFileSync(p, 'utf8');
  if (!before.includes('cdn.tailwindcss.com') && before.includes('css/app.css')) continue;
  const after = patch(before);
  if (after !== before) {
    fs.writeFileSync(p, after, 'utf8');
    changed++;
    console.log('patched:', f);
  }
}
console.log('done, files updated:', changed);
