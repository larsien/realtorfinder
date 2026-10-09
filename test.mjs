// Minimal build check: run `node build.mjs` first, then `node test.mjs`.
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const { markets } = JSON.parse(await readFile(new URL('./data/markets.json', import.meta.url)));
const dist = new URL('./dist/', import.meta.url);

// every market has 3 pages
for (const m of markets) {
  const files = await readdir(new URL(`./${m.id}/`, dist));
  assert.deepEqual(files.sort(), ['index.html', 'privacy.html', 'support.html'], `${m.id} pages`);
}
// hreflang: one alternate per market + x-default on each page
const html = await readFile(new URL(`./${markets[0].id}/index.html`, dist), 'utf8');
const alts = (html.match(/rel="alternate"/g) || []).length;
assert.equal(alts, markets.length + 1, 'hreflang alternates = markets + x-default');
assert.ok(html.includes('hreflang="x-default"'), 'x-default present');
// App Store deep link uses the market's real id
assert.ok(html.includes(`id${markets[0].appleId}`), 'App Store link');
// sitemap lists every page (1 root + 3 per market)
const sm = await readFile(new URL('./sitemap.xml', dist), 'utf8');
assert.equal((sm.match(/<loc>/g) || []).length, 1 + markets.length * 3, 'sitemap url count');

console.log('ok: build output valid');
