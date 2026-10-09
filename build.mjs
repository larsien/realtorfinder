// Static multi-locale site generator for Realtor Finder.
// `node build.mjs` -> dist/. Per market: a hub /<id>/ + privacy + support, and a
// per-country landing /<id>/<cc>/. hreflang: privacy/support cluster across markets;
// each market's landing (hub + its country pages) is its own reciprocal cluster
// (hub = base language, country = language-REGION). Plus sitemap/robots/llms.txt +
// JSON-LD, so Google and AI engines index & cite every country and language.
//
// ponytail: privacy/support/landing bodies are English on non-English pages (lang attr
// then mismatches content; app names, taglines, region and country names ARE localized).
// Localize render*Body + the faq array per m.lang when translations exist (StorePilot).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const { baseUrl, contactEmail, markets } = JSON.parse(
  await readFile(new URL('./data/markets.json', import.meta.url)),
);
const BASE = baseUrl.replace(/\/$/, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const appUrl = (m) => `https://apps.apple.com/app/id${m.appleId}`;
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
const ORG = { '@type': 'Organization', name: 'kahvilavalas', url: `${BASE}/`, email: contactEmail };
const langBase = (m) => m.lang.split('-')[0]; // zh-Hant -> zh, es -> es
const countryHreflang = (m, c) => `${langBase(m)}-${c.cc.toUpperCase()}`;

// privacy/support cluster: one page per market, across all markets. x-default -> English (af).
function alternates(kind) {
  const path = (m) => `${BASE}/${m.id}/${kind ? kind + '.html' : ''}`;
  const links = markets.map((m) => `  <link rel="alternate" hreflang="${m.hreflang}" href="${path(m)}">`);
  links.push(`  <link rel="alternate" hreflang="x-default" href="${BASE}/af/${kind}.html">`);
  return links.join('\n');
}

// landing cluster for ONE market: its hub + every country page, reciprocal. x-default -> hub.
function landingAlternates(m) {
  const links = [`  <link rel="alternate" hreflang="${langBase(m)}" href="${BASE}/${m.id}/">`];
  for (const c of m.countries) {
    links.push(`  <link rel="alternate" hreflang="${countryHreflang(m, c)}" href="${BASE}/${m.id}/${c.cc}/">`);
  }
  links.push(`  <link rel="alternate" hreflang="x-default" href="${BASE}/${m.id}/">`);
  return links.join('\n');
}

function head({ m, title, desc, canonical, alt, jsonld }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
${alt}
${jsonld ? jsonld.map(ld).join('\n') : ''}`;
}

const STYLE = `<style>
  :root { --fg:#111; --muted:#555; --bg:#fff; --accent:#0a7cff; --card:#f5f6f8; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme=light]){ --fg:#eee; --muted:#aaa; --bg:#111; --card:#1c1d21; } }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:720px;margin:0 auto;padding:48px 16px}
  h1{font-size:1.9rem;line-height:1.2;margin:0 0 .3em} h2{margin:1.6em 0 .4em} h3{margin:1.4em 0 .2em}
  .tag{color:var(--muted);font-size:1.15rem;margin:0 0 1.5em}
  a{color:var(--accent)} .muted{color:var(--muted)} ul{padding-inline-start:1.2em}
  .cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
    padding:12px 22px;border-radius:10px;font-weight:600;margin:.5em 0}
  nav{margin-top:3em;padding-top:1.2em;border-top:1px solid var(--card);font-size:.9rem}
  footer{margin-top:2.5em;color:var(--muted);font-size:.85rem}
</style>`;

function page({ m, title, desc, body, canonical, alt, jsonld }) {
  return `<!doctype html>
<html lang="${m.lang}" dir="${m.dir}">
<head>
${head({ m, title, desc, canonical, alt, jsonld })}
${STYLE}
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

// --- FAQ single source -> visible <h3> HTML + FAQPage JSON-LD ---
const faq = (m, where) => [
  ['Do I need an account?', 'No. There is no login or sign-up.'],
  ['Is it free?', 'Yes, it is free and contains no ads.'],
  ['Is my data stored?', 'No. Everything runs on your device; nothing is kept on a server.'],
  ['Who sends the messages?', 'You do, from your own device. The app only pre-fills them.'],
  ['Which area does this cover?', `This version covers ${where}. Other regions have their own version — see All regions.`],
  ['How do I contact several agents at once?', 'Select the agents you want from the search results; the app opens your default Messages app with all their numbers pre-filled (group SMS).'],
];
const faqHtml = (m, where) => faq(m, where).map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n');
const faqLd = (m, where) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq(m, where).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

// SoftwareApplication for a hub (place = region) or a country page (place = country).
const softwareLd = ({ m, name, desc, url, inLanguage, areaServed }) => ({
  '@context': 'https://schema.org', '@type': 'SoftwareApplication',
  name, description: desc, applicationCategory: 'BusinessApplication', operatingSystem: 'iOS',
  url, downloadUrl: appUrl(m), inLanguage,
  ...(areaServed ? { areaServed: { '@type': 'Country', name: areaServed } } : {}),
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: ORG,
});

const intro = (m, where) => `<p>Search public real-estate listings by area in ${esc(where)}, then contact several
agents at once — the app opens your phone's default messaging app with the agents' numbers
pre-filled. No account, no sign-up, nothing stored on any server.</p>
<ul>
  <li>Search agents by apartment or area name</li>
  <li>Pick the agents you want from the results</li>
  <li>Group message / call / WhatsApp handoff — you send, from your own device</li>
</ul>`;

function hubBody(m) {
  const list = m.countries.length > 1
    ? `<h2>Choose your country</h2>\n<ul>\n${m.countries.map((c) => `  <li><a href="${BASE}/${m.id}/${c.cc}/">${esc(c.name)}</a></li>`).join('\n')}\n</ul>`
    : '';
  return `<h1>${esc(m.appName)}</h1>
<p class="tag">${esc(m.tagline)}</p>
<a class="cta" href="${appUrl(m)}">Download on the App Store</a>
<h2>What it does</h2>
${intro(m, m.region)}
${list}`;
}

function countryBody(m, c) {
  return `<h1>${esc(m.appName)} — ${esc(c.name)}</h1>
<p class="tag">${esc(m.tagline)} · ${esc(c.name)}</p>
<a class="cta" href="${appUrl(m)}">Download on the App Store</a>
<h2>What it does</h2>
${intro(m, c.name)}`;
}

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
${faqHtml(m, m.region)}
<h2>Contact</h2>
<p>Email <a href="mailto:${contactEmail}">${contactEmail}</a> and we'll help.</p>`;

function rootPage() {
  const rows = markets
    .map((m) => `  <li><a href="${m.id}/">${esc(m.appName)}</a> <span class="muted">${esc(m.region)}</span></li>`)
    .join('\n');
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Realtor Finder', url: `${BASE}/`, publisher: ORG },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: markets.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.appName, url: `${BASE}/${m.id}/` })) },
  ];
  const altRoot = [
    ...markets.map((m) => `  <link rel="alternate" hreflang="${langBase(m)}" href="${BASE}/${m.id}/">`),
    `  <link rel="alternate" hreflang="x-default" href="${BASE}/">`,
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Realtor Finder — contact real estate agents at once</title>
<meta name="description" content="Realtor Finder: free iOS apps to search listings by area and contact several real estate agents at once. No account, nothing stored. Pick your country.">
<link rel="canonical" href="${BASE}/">
<meta property="og:type" content="website">
<meta property="og:title" content="Realtor Finder">
<meta property="og:url" content="${BASE}/">
${altRoot}
${jsonld.map(ld).join('\n')}
${STYLE}
</head>
<body><main>
<h1>Realtor Finder</h1>
<p>Free iOS apps to search real-estate listings by area and contact several agents at once. Choose your region:</p>
<ul>
${rows}
</ul>
</main></body></html>
`;
}

function sitemap(allUrls) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
}

function robots() {
  const bots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];
  const blocks = bots.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n');
  return `${blocks}\n\nUser-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`;
}

function llms() {
  const apps = markets.map((m) => {
    const head = `- [${m.region}](${BASE}/${m.id}/): ${m.appName} — iOS App Store id${m.appleId}`;
    if (m.countries.length <= 1) return head;
    const subs = m.countries.map((c) => `  - [${c.name}](${BASE}/${m.id}/${c.cc}/)`).join('\n');
    return `${head}\n${subs}`;
  }).join('\n');
  return `# Realtor Finder

> Free iOS apps to search real-estate listings by area and contact several agents
> at once. No account, no sign-up, nothing stored on any server, no ads. Messages
> are sent by the user from their own device. 14 regional apps, per-country pages.

## Apps by region and country
${apps}

## Each app includes
- A privacy policy (\`/<region>/privacy.html\`): no data collected, on-device only.
- Support & FAQ (\`/<region>/support.html\`): how it works, account/data/messaging questions.

## Contact
${contactEmail}
`;
}

const out = new URL('./dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const urls = [`${BASE}/`];
let files = 0;
for (const m of markets) {
  const lalt = landingAlternates(m);
  await mkdir(new URL(`./${m.id}/`, out), { recursive: true });
  // market hub
  await writeFile(new URL(`./${m.id}/index.html`, out), page({
    m, title: m.appName, desc: `${m.tagline} — ${m.region}. Free iOS app, no account, nothing stored.`,
    body: hubBody(m), canonical: `${BASE}/${m.id}/`, alt: lalt,
    jsonld: [softwareLd({ m, name: m.appName, desc: `Search listings by area and contact several agents at once in ${m.region}. No account, nothing stored, no ads.`, url: `${BASE}/${m.id}/`, inLanguage: langBase(m) })],
  }));
  // privacy + support (market level, cross-market cluster)
  await writeFile(new URL(`./${m.id}/privacy.html`, out), page({
    m, title: `Privacy Policy — ${m.appName}`, desc: `Privacy policy for ${m.appName}. No data collected, on-device only.`,
    body: privacyBody(m), canonical: `${BASE}/${m.id}/privacy.html`, alt: alternates('privacy'),
  }));
  await writeFile(new URL(`./${m.id}/support.html`, out), page({
    m, title: `Support — ${m.appName}`, desc: `Support and FAQ for ${m.appName}.`,
    body: supportBody(m), canonical: `${BASE}/${m.id}/support.html`, alt: alternates('support'), jsonld: [faqLd(m, m.region)],
  }));
  urls.push(`${BASE}/${m.id}/`, `${BASE}/${m.id}/privacy.html`, `${BASE}/${m.id}/support.html`);
  files += 3;
  // per-country landing pages
  for (const c of m.countries) {
    await mkdir(new URL(`./${m.id}/${c.cc}/`, out), { recursive: true });
    await writeFile(new URL(`./${m.id}/${c.cc}/index.html`, out), page({
      m, title: `${m.appName} — ${c.name}`, desc: `${m.tagline} · ${c.name}. Free iOS app, no account, nothing stored.`,
      body: countryBody(m, c), canonical: `${BASE}/${m.id}/${c.cc}/`, alt: lalt,
      jsonld: [softwareLd({ m, name: `${m.appName} — ${c.name}`, desc: `Search listings by area and contact several agents at once in ${c.name}. No account, nothing stored, no ads.`, url: `${BASE}/${m.id}/${c.cc}/`, inLanguage: countryHreflang(m, c), areaServed: c.name })],
    }));
    urls.push(`${BASE}/${m.id}/${c.cc}/`);
    files += 1;
  }
}
await writeFile(new URL('./index.html', out), rootPage());
await writeFile(new URL('./sitemap.xml', out), sitemap(urls));
await writeFile(new URL('./robots.txt', out), robots());
await writeFile(new URL('./llms.txt', out), llms());
const countries = markets.reduce((n, m) => n + m.countries.length, 0);
console.log(`built ${files + 4} files: ${markets.length} markets, ${countries} country pages -> dist/`);
