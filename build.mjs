// Static multi-locale site generator for Realtor Finder landing/privacy/support.
// No deps. `node build.mjs` -> dist/. Each market gets /<id>/{index,privacy,support}.html
// with hreflang alternates + a sitemap, so Google indexes every locale.
//
// ponytail: English body for privacy/support across markets (a legal page in English
// is App-Store-acceptable as a start). Localize per-market via data/markets.json taglines
// now; translate bodies later (StorePilot) by swapping the two renderBody* functions.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const { baseUrl, contactEmail, markets } = JSON.parse(
  await readFile(new URL('./data/markets.json', import.meta.url)),
);
const BASE = baseUrl.replace(/\/$/, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const appUrl = (m) => `https://apps.apple.com/app/id${m.appleId}`;

// hreflang alternates for one page kind ('', 'privacy', 'support'), shared by every market.
function alternates(kind) {
  const path = (m) => `${BASE}/${m.id}/${kind ? kind + '.html' : ''}`;
  const links = markets.map(
    (m) => `  <link rel="alternate" hreflang="${m.hreflang}" href="${path(m)}">`,
  );
  links.push(`  <link rel="alternate" hreflang="x-default" href="${BASE}/${markets[0].id}/${kind ? kind + '.html' : ''}">`);
  return links.join('\n');
}

function page({ m, kind, title, desc, body }) {
  const canonical = `${BASE}/${m.id}/${kind ? kind + '.html' : ''}`;
  return `<!doctype html>
<html lang="${m.lang}" dir="${m.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
${alternates(kind)}
<style>
  :root { --fg:#111; --muted:#555; --bg:#fff; --accent:#0a7cff; --card:#f5f6f8; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme=light]){ --fg:#eee; --muted:#aaa; --bg:#111; --card:#1c1d21; } }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:720px;margin:0 auto;padding:48px 16px}
  h1{font-size:1.9rem;line-height:1.2;margin:0 0 .3em} h2{margin:1.6em 0 .4em}
  .tag{color:var(--muted);font-size:1.15rem;margin:0 0 1.5em}
  a{color:var(--accent)} .muted{color:var(--muted)}
  .cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
    padding:12px 22px;border-radius:10px;font-weight:600;margin:.5em 0}
  nav{margin-top:3em;padding-top:1.2em;border-top:1px solid var(--card);font-size:.9rem}
  footer{margin-top:2.5em;color:var(--muted);font-size:.85rem}
</style>
</head>
<body>
<main>
${body}
<nav>
  <a href="${BASE}/${m.id}/">Home</a> ·
  <a href="${BASE}/${m.id}/privacy.html">Privacy</a> ·
  <a href="${BASE}/${m.id}/support.html">Support</a> ·
  <a href="${BASE}/">All regions</a>
</nav>
<footer>© 2026 kahvilavalas · <a href="mailto:${contactEmail}">${contactEmail}</a></footer>
</main>
</body>
</html>
`;
}

const landingBody = (m) => `<h1>${esc(m.appName)}</h1>
<p class="tag">${esc(m.tagline)}</p>
<a class="cta" href="${appUrl(m)}">Download on the App Store</a>
<h2>What it does</h2>
<p>Search public real-estate listings by area, then contact several agents at once —
the app opens your phone's default messaging app with the agents' numbers pre-filled.
No account, no sign-up, nothing stored on any server.</p>
<ul>
  <li>Search agents by apartment or area name</li>
  <li>Pick the agents you want from the results</li>
  <li>Group message / call / WhatsApp handoff — you send, from your own device</li>
</ul>`;

const privacyBody = (m) => `<h1>Privacy Policy</h1>
<p class="muted">${esc(m.appName)} · last updated 2026-10-09</p>
<p><strong>${esc(m.appName)} collects no data.</strong> The app stores nothing on our
servers and we do not operate any backend that receives your information.</p>
<h2>Location</h2>
<p>If you grant location permission, your approximate or precise location is used
<strong>on your device only</strong>, to pre-select the nearest supported search area.
It is never transmitted to us.</p>
<h2>Listings &amp; contact</h2>
<p>Searches fetch publicly available listings from third-party real-estate portals over
HTTPS. When you choose to contact agents, the app opens your device's default Messages,
phone, or messaging app with the recipients pre-filled. Messages are sent by you, from
your device. The app does not send on your behalf and does not save contacts.</p>
<h2>No tracking, no ads</h2>
<p>The app contains no advertising SDKs, no analytics, and no third-party trackers.</p>
<h2>Contact</h2>
<p>Questions: <a href="mailto:${contactEmail}">${contactEmail}</a></p>`;

const supportBody = (m) => `<h1>Support — ${esc(m.appName)}</h1>
<h2>How to use</h2>
<ol>
  <li>Search by an apartment or area name.</li>
  <li>Select the agents you want from the results.</li>
  <li>Tap to open your default Messages / phone / messaging app with the numbers filled in, and send.</li>
</ol>
<h2>FAQ</h2>
<p><strong>Do I need an account?</strong> No. There is no login or sign-up.</p>
<p><strong>Is my data stored?</strong> No. Everything runs on your device; nothing is kept on a server.</p>
<p><strong>Who sends the messages?</strong> You do, from your own device. The app only pre-fills them.</p>
<h2>Contact</h2>
<p>Email <a href="mailto:${contactEmail}">${contactEmail}</a> and we'll help.</p>`;

// root language picker
function rootPage() {
  const rows = markets
    .map((m) => `  <li><a href="${m.id}/">${esc(m.appName)}</a> <span class="muted">(${m.hreflang})</span></li>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Realtor Finder — contact real estate agents at once</title>
<meta name="description" content="Realtor Finder: search listings by area and contact several real estate agents at once. Available per region.">
<link rel="canonical" href="${BASE}/">
${alternates('')}
<style>body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fff;color:#111}
@media (prefers-color-scheme:dark){body{background:#111;color:#eee}} main{max-width:640px;margin:0 auto;padding:48px 16px}
ul{list-style:none;padding:0} li{padding:.5em 0;border-bottom:1px solid #8882} a{color:#0a7cff} .muted{color:#888;font-size:.85em}</style>
</head>
<body><main>
<h1>Realtor Finder</h1>
<p>Search real-estate listings by area and contact several agents at once. Choose your region:</p>
<ul>
${rows}
</ul>
</main></body></html>
`;
}

function sitemap() {
  const urls = [`${BASE}/`];
  for (const m of markets) {
    urls.push(`${BASE}/${m.id}/`, `${BASE}/${m.id}/privacy.html`, `${BASE}/${m.id}/support.html`);
  }
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
}

const out = new URL('./dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(new URL('./index.html', out), rootPage());
await writeFile(new URL('./sitemap.xml', out), sitemap());
await writeFile(new URL('./robots.txt', out), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
let count = 0;
for (const m of markets) {
  await mkdir(new URL(`./${m.id}/`, out), { recursive: true });
  await writeFile(new URL(`./${m.id}/index.html`, out), page({ m, kind: '', title: `${m.appName}`, desc: m.tagline, body: landingBody(m) }));
  await writeFile(new URL(`./${m.id}/privacy.html`, out), page({ m, kind: 'privacy', title: `Privacy Policy — ${m.appName}`, desc: `Privacy policy for ${m.appName}. No data collected.`, body: privacyBody(m) }));
  await writeFile(new URL(`./${m.id}/support.html`, out), page({ m, kind: 'support', title: `Support — ${m.appName}`, desc: `Support and FAQ for ${m.appName}.`, body: supportBody(m) }));
  count += 3;
}
console.log(`built ${count + 3} files for ${markets.length} markets -> dist/`);
