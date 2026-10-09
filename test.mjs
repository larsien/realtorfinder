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

// JSON-LD: landing has SoftwareApplication, support has FAQPage
assert.ok(html.includes('"SoftwareApplication"'), 'landing SoftwareApplication JSON-LD');
const sup = await readFile(new URL(`./${markets[0].id}/support.html`, dist), 'utf8');
assert.ok(sup.includes('"FAQPage"') && sup.includes('"Question"'), 'support FAQPage JSON-LD');
// x-default on index points to the site root, not a locale landing page
const xdef = html.match(/hreflang="x-default" href="([^"]+)"/)[1];
assert.ok(/\/realtorfinder\/$/.test(xdef), `x-default -> root, got ${xdef}`);
// llms.txt generated and lists every market
const ll = await readFile(new URL('./llms.txt', dist), 'utf8');
for (const m of markets) assert.ok(ll.includes(`id${m.appleId}`), `llms.txt lists ${m.id}`);

console.log('ok: build output valid');
