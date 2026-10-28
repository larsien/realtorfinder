// Build check: run `node build.mjs` first, then `node test.mjs`.
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const { baseUrl, markets } = JSON.parse(await readFile(new URL('./data/markets.json', import.meta.url)));
const BASE = baseUrl.replace(/\/$/, '');
const dist = new URL('./dist/', import.meta.url);
const read = (p) => readFile(new URL(p, dist), 'utf8');
const langBase = (m) => m.lang.split('-')[0];
let countries = 0;

for (const m of markets) {
  // hub has the 3 market-level pages + one dir per country
  const entries = (await readdir(new URL(`./${m.id}/`, dist))).sort();
  for (const f of ['index.html', 'privacy.html', 'support.html']) assert.ok(entries.includes(f), `${m.id}/${f}`);

  const hub = await read(`${m.id}/index.html`);
  // landing cluster on the hub: base lang + one per country + x-default -> hub
  assert.ok(hub.includes(`hreflang="${langBase(m)}" href="${BASE}/${m.id}/"`), `${m.id} hub generic hreflang`);
  const xdef = hub.match(/hreflang="x-default" href="([^"]+)"/)[1];
  assert.equal(xdef, `${BASE}/${m.id}/`, `${m.id} landing x-default -> hub`);
  assert.ok(hub.includes('"SoftwareApplication"'), `${m.id} hub JSON-LD`);

  for (const c of m.countries) {
    countries += 1;
    const cp = await read(`${m.id}/${c.cc}/index.html`);
    const reg = `${langBase(m)}-${c.cc.toUpperCase()}`;
    assert.ok(cp.includes(`hreflang="${reg}" href="${BASE}/${m.id}/${c.cc}/"`), `${m.id}/${c.cc} self hreflang ${reg}`);
    assert.ok(cp.includes(`<link rel="canonical" href="${BASE}/${m.id}/${c.cc}/">`), `${m.id}/${c.cc} canonical`);
    assert.ok(cp.includes(`id${m.appleId}`), `${m.id}/${c.cc} App Store link`);
    assert.ok(cp.includes('"areaServed"') && cp.includes(c.name), `${m.id}/${c.cc} areaServed`);
  }
  // support FAQPage
  assert.ok((await read(`${m.id}/support.html`)).includes('"FAQPage"'), `${m.id} FAQPage`);
}

// sitemap: root + 3 per market + 1 per country
const sm = await read('sitemap.xml');
assert.equal((sm.match(/<loc>/g) || []).length, 1 + markets.length * 3 + countries + 4, 'sitemap url count');
// llms.txt lists every app
const ll = await read('llms.txt');
for (const m of markets) assert.ok(ll.includes(`id${m.appleId}`), `llms.txt ${m.id}`);

console.log(`ok: ${markets.length} markets, ${countries} country pages, build valid`);

for (const file of ['index.html', 'privacy.html', 'support.html']) {
  const html = await read(`unified/${file}`);
  assert.ok(html.includes('Agent Connect'));
  assert.ok(html.includes('/unified/privacy.html'));
  assert.ok(!html.includes('undefined'));
}
assert.ok((await read('unified/privacy.html')).includes('country and interface language'));

const adPolicy = await read('unified/ads-privacy.html');
assert.ok(adPolicy.includes('Agent SMS: Contact Realtors'));
assert.ok(adPolicy.includes('optional rewarded ads'));
assert.ok(adPolicy.includes('two additional searches'));
assert.ok(adPolicy.includes('search while the ad plays'));
assert.ok(adPolicy.includes('loading screens'));
assert.ok(adPolicy.includes('Non-personalized ads still involve data processing'));
assert.ok(adPolicy.includes('Ad privacy choices'));
