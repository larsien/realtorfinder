# realtorfinder-web

Static multi-locale landing / privacy / support site for the Realtor Finder apps
(14 markets). Built so Google indexes every locale: one static HTML page per
market with `hreflang` alternates + a sitemap.

## Build

```sh
node build.mjs   # -> dist/ (45 files: 14 markets x 3 pages + root + sitemap + robots)
node test.mjs    # sanity check on dist/
```

No dependencies (Node 18+). Content lives in `data/markets.json`; page templates
and the English privacy/support copy are inline in `build.mjs`.

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
/                      language picker (hreflang x-default)
/<market>/             landing + App Store link
/<market>/privacy.html
/<market>/support.html
```

Markets: ar es esco esar vi hk ph kh mm lk pk af ka sr.
