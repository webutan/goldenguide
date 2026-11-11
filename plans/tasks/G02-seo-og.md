# G02: Link previews & SEO (OG tags per bar, sitemap, hreflang, JSON-LD)

**Phase 4** · Size **M–L** · Agent ~4–5h · Review ~45 min · Depends on: G01, S01 · Touches: new `server/routes/seo.js`, `server/index.js`, `nginx.conf`, `index.html`, `docker-compose.yml`, `public/og/` (default share image)

## Why
Crawlers and link-preview bots (X, LINE, WhatsApp, Discord, Slack) don't run JS. Today every shared link previews as "Golden Gai Map" with no image, and Google can't index individual bars.

## Design (recommended)
- nginx: `location ^~ /bar/` and `= /sitemap.xml` and `= /robots.txt` proxy to `api`.
- The API's `GET /bar/:slug` loads the built `index.html` template, fetched once from the web container at `http://web/index.html` and cached for 5 min. Alternative: copy `dist/index.html` into a shared volume; pick whichever is simpler with compose, and document it. It injects into `<head>`:
  - `<title>`, `meta description` (from the description, else "Charge ¥X · N seats · Hanazono-3 · Golden Gai")
  - `og:title/description/image/url`, `twitter:card=summary_large_image`
  - `link rel=canonical`, `hreflang` en/ja alternates (`?lang=jp`)
  - JSON-LD `BarOrPub` (name, address, geo, openingHours from the schedule, url)
  - It returns the full SPA, so humans get the normal app.
- `og:image`: the bar's first photo if there is one, else a generated 1200×630 Win95-style card (a "window" with the bar name in W95FA plus the map silhouette). Render it on the server with `@napi-rs/canvas` or `satori` + `resvg` and cache it in `uploads/og/`. If generation is too heavy, fall back to one static `public/og/default.png` designed in the Win95 style. Generation is a stretch goal.
- `GET /sitemap.xml`: `/`, `/map`, `/directory`, and every active `/bar/<slug>` with `lastmod = updated_at`.
- `index.html`: improve the default title, description and OG tags for `/`, add `theme-color`, and set `lang` properly.

Also (found in S05): `GET /api/bars/:slug` still returns inactive bars to anyone. Treat inactive bars as 404 for public deep links, OG pages and the sitemap, unless the request is admin.

## Acceptance criteria
- [ ] `curl -A "Twitterbot" https://host/bar/<slug>` shows bar-specific `og:*` tags
- [ ] The same URL in a browser is the normal app (G01 behaviour)
- [ ] `/sitemap.xml` validates and lists all active bars
- [ ] An unknown slug returns 404 with the SPA (the app shows a Win95 "File not found" dialog)
- [ ] Facebook Sharing Debugger / X card validator screenshots (owner can do this after deploy)
