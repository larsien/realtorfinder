# realtorfinder-web

Static multi-locale landing / privacy / support site for the Realtor Finder apps
(14 markets). Built so Google indexes every locale: one static HTML page per
market with `hreflang` alternates + a sitemap.

## Build

```sh
node build.mjs   # -> dist/ (14 markets x 3 pages + root + sitemap + robots + llms.txt)
node test.mjs    # sanity check on dist/
```

No dependencies (Node 18+). Content lives in `data/markets.json`; page templates
and the English privacy/support copy are inline in `build.mjs`.

## SEO / AEO built in

- `hreflang` alternates (14 + `x-default` → root) and self-canonical per page.
- JSON-LD: `SoftwareApplication` (landing, with App Store link), `FAQPage` (support,
  single-sourced with the visible FAQ), `WebSite` + `ItemList` (root).
- `llms.txt`, Open Graph tags, AI-crawler `robots.txt` allow blocks.
- `sitemap.xml` — submit it in **Google Search Console** (on a Pages *project* site
  the `robots.txt`/`Sitemap:` directive sits under `/realtorfinder/` and isn't read
  from the host root; a custom domain or root repo fixes that).

Known debt: privacy/support/landing bodies are English on non-English locales
(lang attr then mismatches content). Localize the `*Body` functions + the `faq`
array per `m.lang` when translations exist.

## Deploy (free, GitHub Pages)

1. Create a repo named `realtorfinder` under the GitHub account that serves
   `larsien.github.io` (so the site is `https://larsien.github.io/realtorfinder/`).
   For a different repo name or account, change `baseUrl` in `data/markets.json`.
2. Push this folder. `.github/workflows/pages.yml` builds and deploys `dist/`.
3. Repo **Settings → Pages → Source: GitHub Actions** (one-time).
4. In [Google Search Console](https://search.google.com/search-console), add the
   property and submit `…/sitemap.xml`.

## After deploy

- Replace the App Store Connect privacy-policy URL per app with the matching
  `…/<market>/privacy.html` (currently points at boorini's page).
- Localize the privacy/support bodies (today English). Swap `privacyBody` /
  `supportBody` in `build.mjs`, or feed translations from StorePilot.

## URL shape

```
/                        language/region picker (hreflang x-default)
/<market>/               market hub: landing + App Store link + country list
/<market>/<country>/     per-country landing (hreflang <lang>-<CC>)
/<market>/privacy.html
/<market>/support.html
```

Markets: ar es esco esar vi hk ph kh mm lk pk af ka sr (14 apps, 28 countries).

**hreflang design:** each market's landing is its own reciprocal cluster — the hub
carries the base language (`es`), each country page a region tag (`es-MX`, `es-CO`…),
`x-default` → the hub. privacy/support form a separate across-markets cluster.
Country pages add `areaServed` to their `SoftwareApplication` JSON-LD.

Per-country content lives in `data/markets.json` (`countries: [{cc, name}]`, names
localized to the market language).
