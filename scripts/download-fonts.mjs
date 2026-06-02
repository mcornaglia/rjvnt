// Downloads all Google Fonts woff2 files to public/fonts/ and writes
// the @font-face CSS to app/fonts.css. Run once: node scripts/download-fonts.mjs
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '..', 'public', 'fonts');
const CSS_OUT   = path.join(__dirname, '..', 'app', 'fonts.css');

fs.mkdirSync(FONTS_DIR, { recursive: true });

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function get(url, headers = {}) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, r => {
      if (r.statusCode === 301 || r.statusCode === 302)
        return get(r.headers.location, headers).then(res).catch(rej);
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => res(Buffer.concat(chunks)));
      r.on('error', rej);
    }).on('error', rej);
  });
}

function download(url, dest) {
  return get(url).then(buf => fs.writeFileSync(dest, buf));
}

const GOOGLE_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700' +
  '&family=JetBrains+Mono:wght@400;500;700' +
  '&family=Rubik+Spray+Paint' +
  '&family=Permanent+Marker' +
  '&family=Rubik+Mono+One' +
  '&display=swap';

console.log('Fetching Google Fonts CSS…');
const css = (await get(GOOGLE_URL, { 'User-Agent': CHROME_UA })).toString();

// Extract unique woff2 URLs
const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^\)]+\.woff2/g) || [])];
console.log(`Found ${urls.length} unique woff2 files`);

// Download each file
for (const url of urls) {
  const name = path.basename(url);
  const dest = path.join(FONTS_DIR, name);
  if (fs.existsSync(dest)) {
    console.log(`  skip (exists): ${name}`);
  } else {
    console.log(`  downloading:   ${name}`);
    await download(url, dest);
  }
}

// Rewrite CSS: replace gstatic URLs with local paths
const localCss = css.replace(
  /https:\/\/fonts\.gstatic\.com\/[^\)]+\.woff2/g,
  url => `/fonts/${path.basename(url)}`
);

fs.writeFileSync(CSS_OUT, localCss);
console.log(`\nWrote ${CSS_OUT}`);
console.log('Done. Update layout.tsx to import ./fonts.css and remove Google CDN links.');
