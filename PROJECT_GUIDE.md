# Golden Gai Map — Developer Project Guide

> Paste this into a new Claude Code session for full project context. Last updated: 2026-11-10.
> For visual design, CSS variables, and Gai-chan animation details, see **UI_STYLE_GUIDE.md**.

---

## 1. Project Overview

**Golden Gai Map** is an interactive bar directory and SVG map for the Golden Gai district of Shinjuku, Tokyo. It has a deliberately retro **Windows 2000 / CRT monitor aesthetic** with Japanese visual novel elements.

- **Tech stack:** Vue 3 (Composition API, `<script setup>`), Vite, Node.js/Express, PostgreSQL, Socket.io (chatroom)
- **Deployment:** Frontend served as static build from `dist/`; backend Express API at port 3001
- **GitHub:** `https://github.com/webutan/goldenguide.git` (branch: `main`)
- **Local dev:**
  - `npm run dev` — Vite dev server (proxies `/api` and `/uploads` to localhost:3001)
  - `npm run dev:server` — Express API server
  - `npm run build` — builds to `dist/`

---

## 2. Repository Structure

```
golden-gai-map/
├── index.html            ← SPA shell; its default <head> tags are replaced per page by the API (server/lib/seo.js)
├── public/
│   ├── gaichan/          ← ALL Gai-chan assets (sprites, windows, terminal, rule images)
│   │   └── model/        ← 3D Gai-chan (gaichan.glb + face/*.png) — generated, see scripts/blender/
│   ├── icons/            ← Win2000 icons (.ico, .png); tags/ = tag icons, desktop/ = desktop icons, app/ = installable-app icons
│   ├── signs/            ← Street sign assets
│   ├── cursors/          ← Custom .cur / .ani cursor files
│   ├── og/default.png    ← Default link-preview image (scripts/make-og-image.mjs)
│   ├── manifest.webmanifest ← Installable app manifest (static; not generated)
│   ├── static-off.webp   ← Desktop wallpaper
│   └── favicon.ico
├── src/
│   ├── main.js
│   ├── App.vue           ← Root component; orchestrates all state
│   ├── sw.js             ← Service worker (offline mode); built by vite-plugin-pwa, production builds only
│   ├── api/
│   │   ├── index.js          ← Bars, tags, photos, partitions, annotations, feed; admin password header
│   │   ├── reviews.js        ← Reviews: list, post, report, admin moderation
│   │   ├── suggestions.js    ← "Suggest an edit": post, admin inbox
│   │   └── stats.js          ← Admin: sticker scan counts
│   ├── assets/map.svg    ← SVG map of Golden Gai (source geometry)
│   ├── components/
│   │   ├── BiosScreen.vue        ← Boot screen (fast for returning visitors and deep links)
│   │   ├── DesktopView.vue       ← Desktop: icon grid, sign banner, this week's review notes
│   │   ├── GaiChan.vue           ← Corner sprite window + lang/first-time dialog modals
│   │   ├── GaiChanDialogue.vue   ← VN-style rules walkthrough + interactive mode (main work area)
│   │   ├── GaiChanModel.vue      ← 3D Gai-chan canvas (lazy-loads three.js, PNG fallback)
│   │   ├── GoldenGaiMap.vue      ← SVG map: pan/zoom/rotate, building styles, labels, admin placement
│   │   ├── map/                  ← Map layers, split out so a hover re-renders one layer only
│   │   │   ├── MapPartitions.vue   ← Coloured slots of split buildings
│   │   │   ├── MapLabels.vue       ← Bar name labels (zoomed in)
│   │   │   ├── MapBadges.vue       ← Bar-count badges (zoomed out)
│   │   │   ├── MapAnnotations.vue  ← Admin-placed text/icon annotations
│   │   │   └── MapTooltip.vue      ← Hover tooltip listing a building's bars
│   │   ├── MapSearch.vue         ← Search box for the map (matches drive highlights + drawer)
│   │   ├── TagFilter.vue         ← Explorer window: filters (tags, price, floor, open now)
│   │   ├── TagIcon.vue           ← One tag's icon
│   │   ├── BarDirectory.vue      ← Directory view: searchable bar list
│   │   ├── BarDrawer.vue         ← Bar cards beside the map (desktop: all bars; mobile: one building)
│   │   ├── BarPopup.vue          ← Bar detail card (deep links, directory, search)
│   │   ├── BarTwitterPanel.vue   ← One bar's X/Twitter posts
│   │   ├── FeedWindow.vue        ← Feed of all bars' posts
│   │   ├── ChatWindow.vue        ← AIM-style anonymous chatroom (Socket.io)
│   │   ├── ReviewDialog.vue      ← Write a review (text + drawing) after "Mark as Visited"
│   │   ├── ReviewPanel.vue       ← A bar's reviews
│   │   ├── ReviewsWindow.vue     ← This week's reviews
│   │   ├── RouletteWindow.vue    ← Roulette.exe: random bar picker; 3D Gai-chan spins a wheel
│   │   ├── ReviewActions.vue     ← Report (visitor) / hide / delete (admin) links on a review
│   │   ├── StickyNote.vue        ← A review shown as a note on the desktop
│   │   ├── SuggestEditDialog.vue ← "Suggest an edit" / "report a missing bar" form
│   │   ├── SuggestEditHost.vue   ← The single mounted instance of that dialog
│   │   ├── InstallWizard.vue     ← "Install GAI OS" (installable app) wizard
│   │   ├── ContactWindow.vue
│   │   ├── AdminPanel.vue        ← Admin console: placement, bar editor, photos, tags, buildings/partitions
│   │   ├── AdminReviews.vue      ← Admin tab: reported / hidden reviews
│   │   ├── AdminInbox.vue        ← Admin tab: visitor suggestions
│   │   ├── DatabaseTable.vue     ← Spreadsheet-style DB editor
│   │   ├── admin/                ← Door stickers: StickerSheet.vue (picker + print), StickerCard.vue, stickerPrint.css
│   │   └── win2000/
│   │       ├── WinWindow.vue      ← Draggable, resizable window chrome
│   │       ├── WinTitleBar.vue    ← Title bar with minimize/close buttons
│   │       ├── WinTaskbar.vue     ← Bottom taskbar: Start menu, views, windows, lang, tray (clock, offline icon)
│   │       ├── WinDialog.vue      ← Host of the alert/confirm/prompt boxes (useDialog)
│   │       ├── WinLoading.vue     ← Placeholder while a lazy window's chunk loads
│   │       ├── WinButton.vue      ← Standard Win2000 button
│   │       ├── WinScrollContainer.vue
│   │       ├── WinTabs.vue
│   │       ├── WinTextInput.vue
│   │       └── WinCheckbox.vue
│   ├── composables/
│   │   ├── useI18n.js         ← t(key, params) helper; accepts lang ref or string
│   │   ├── useApi.js          ← bars + tags reactive fetch state
│   │   ├── useAdmin.js        ← Admin password toggle
│   │   ├── useDialog.js       ← Promise-based Win95 alert / confirm / prompt (never window.alert)
│   │   ├── useUrlState.js     ← URL <-> app state without a router (/map, /directory, /bar/<slug>, filters, ?lang)
│   │   ├── usePwa.js          ← Service-worker registration, online/offline state, install prompt
│   │   ├── useVisited.js      ← localStorage visited / favourite bar tracking
│   │   ├── useReviews.js      ← Reviews state, reporting, admin moderation
│   │   ├── useSuggestEdit.js  ← Opens the "Suggest an edit" dialog from anywhere
│   │   ├── useMapHover.js     ← Building under the pointer (shared by the map and the drawer)
│   │   ├── useWindowManager.js← WM: register/focus/minimize/unregister windows
│   │   ├── useDraggable.js    ← Pointer-event dragging + window clamping for WinWindow
│   │   ├── useOpenNow.js      ← Computed set of currently-open bar IDs
│   │   └── useChat.js         ← Socket.io chat: messages, nickname, send, check-ins
│   ├── utils/                 ← Pure, unit-tested helpers (no Vue, no DOM unless noted)
│   │   ├── barFilters.js      ← The one filter function shared by map, drawer and directory
│   │   ├── openNow.js         ← "Open now" in Tokyo time, incl. after-midnight hours
│   │   ├── searchText.js      ← Japanese-aware bar search
│   │   ├── mapGeometry.js     ← Partition layout, building styles, map <-> screen transforms, gestures
│   │   ├── partitions.js      ← Default partitions, reconciling stored slots with the bar list
│   │   ├── storage.js         ← Safe localStorage wrappers (readJSON / writeJSON / readString / writeString)
│   │   ├── suggestions.js     ← "Suggest an edit" form <-> payload
│   │   ├── sticker.js         ← Door-sticker URLs and names
│   │   ├── swRules.js         ← Which requests the service worker caches
│   │   ├── installOffer.js    ← When to offer the install wizard
│   │   ├── retryAfter.js      ← Rate-limit notice text from a Retry-After
│   │   ├── twitter.js         ← parseTwitterHandle (same rules as server/lib/feedCore.js)
│   │   ├── shuffle.js         ← Fisher–Yates shuffle
│   │   ├── roulette.js        ← Bar Roulette: candidates, weighted pick, reel order
│   │   ├── artFallback.js     ← Hide Gai-chan images that fail to load (DOM)
│   │   └── devPerf.js         ← Dev-only render counters
│   ├── gaichan3d/         ← three.js stage for the 3D Gai-chan (own chunk); lab.js = dev sandbox (dev/gaichan-lab.html); RouletteWheel.js = the wheel in Roulette.exe
│   ├── styles/            ← win2000.css (theme variables, fonts), main.css (page, cursors, #app zoom)
│   ├── fonts/             ← W95FA (Latin) and PixelMplus10 (Japanese ranges only)
│   └── data/
│       └── buildings.json     ← Building coordinate data keyed by SVG element ID
├── server/
│   ├── index.js           ← Express app entry, runs migrations, mounts routes
│   ├── db.js              ← pg Pool singleton
│   ├── migrate.js         ← Versioned SQL migrations run on startup (the only place the schema lives)
│   ├── middleware/
│   │   ├── admin.js       ← Admin password header check with lockout
│   │   └── rateLimits.js  ← Every rate limit, in one file
│   ├── lib/               ← Pure helpers, unit-tested from tests/server*.test.js
│   │   ├── seo.js             ← Per-page <head>, JSON-LD, sitemap, robots
│   │   ├── suggestions.js     ← Validation of visitor suggestions
│   │   ├── reviewModeration.js← Report / hide rules
│   │   ├── refHits.js         ← Counting ?ref= arrivals (sticker scans)
│   │   ├── feedCore.js        ← Handle parsing, single-flight cached fetch
│   │   ├── rateLimitCore.js   ← Keyed sliding-window limiter, client IP
│   │   ├── ipHash.js          ← Keyed hash of a visitor IP
│   │   └── validate.js        ← Request validation for bars, photos, partitions
│   ├── routes/
│   │   ├── bars.js        ← CRUD for bars (GET /api/bars, PATCH, POST, DELETE)
│   │   ├── tags.js        ← Tags management (GET /api/tags, POST, PATCH, DELETE)
│   │   ├── photos.js      ← Photo upload/delete
│   │   ├── partitions.js  ← Building partitions (GET, PUT /:buildingId)
│   │   ├── annotations.js ← Map text annotations (admin-placed labels)
│   │   ├── reviews.js     ← Reviews: list, post, report; admin hide/delete
│   │   ├── suggestions.js ← "Suggest an edit": public POST, admin inbox
│   │   ├── stats.js       ← Admin: sticker scan counts
│   │   ├── feed.js        ← Twitter/SNS feed proxy
│   │   ├── seo.js         ← /bar/<slug>, /, /map, /directory with per-page <head>; sitemap.xml, robots.txt
│   │   └── chat.js        ← Socket.io /chat namespace; persists to chat_messages table
│   └── jobs/              ← Background jobs (feed refresh, caching)
├── scripts/               ← One-off data / asset scripts (not deployed)
│   ├── dev-seed.mjs       ← Fill an empty dev database through the admin API
│   ├── data/              ← Script-only data: bars.json (dev seed), bar-groups.json, alleys.json, tags.json
│   ├── assets/            ← Source art used by scripts (og image sprite)
│   ├── make-og-image.mjs, optimize-images.mjs, blender/ …
├── tests/                 ← Vitest unit tests (frontend utils and server/lib)
├── plans/                 ← Task specs and the agent brief
├── media/                 ← SOURCE assets (NOT served, not in git). Always copy needed files to public/
├── nginx.conf, Dockerfile, server/Dockerfile, docker-compose.yml ← Deployment (db, api, web)
├── PROJECT_GUIDE.md       ← This file
├── UI_STYLE_GUIDE.md      ← Visual/CSS/animation reference (Win2000, GaiChan, CRT)
├── KNOWN_ISSUES.md        ← Deferred bugs and architectural concerns
├── vite.config.js         ← Dev proxy (/api, /uploads, /socket.io → localhost:3001), PWA precache list
└── package.json
```

---

## 3. State Flow (App.vue)

### First-Visit / Language Flow
1. `lang` ref (localStorage `golden-gai-lang`) — `null` means show lang picker
2. `firstVisit` ref (localStorage `golden-gai-first-time`: `'yes'`/`'no'`) — `null` means not answered
3. `rulesAccepted` ref (localStorage `golden-gai-rules-accepted`: `'1'`)
4. `gaichanBubbleType` computed: `null | 'lang' | 'first-time'` — drives GaiChan modal dialogs
5. `showRules` computed: `firstVisit === true && !rulesAccepted`

**Order of dialogs:**
→ Lang picker (GaiChan modal) → First time? (GaiChan modal) → If yes: GaiChanDialogue VN walkthrough → App unlocks

**DEV MODE:** `const DEV = import.meta.env.DEV` — in dev, localStorage is ignored and the full onboarding flow always runs.

### Window Manager
`useWindowManager()` provides a reactive window registry. Key methods: `register(id, title, icon)`, `wm.getWindow(id)`, `wm.focus(id)`, `wm.minimize(id)`, `wm.unregister(id)`. z-index is auto-managed.

---

## 4. Chatroom Feature

Anonymous IRC-style chat with AIM aesthetic, powered by Socket.io.

- **Frontend:** `ChatWindow.vue` + `useChat.js` composable
- **Backend:** `server/routes/chat.js` registers a `/chat` Socket.io namespace
- **DB:** `chat_messages (id, nickname, message, created_at)` — last 500 kept, older pruned on insert
- **Nginx:** `/socket.io/` location block with `Upgrade`/`Connection` WebSocket headers
- `nickname` persisted in localStorage key `golden-gai-chat-nickname`
- Rate limiting: enforced server-side per visitor IP (1 message/second and 20/minute, 1 check-in per 5 seconds; limits in `server/middleware/rateLimits.js`)
- Events: `chat:send`, `chat:message`, `chat:history`, `chat:usercount`, `checkin:set`, `checkin:list`, `chat:rate_limited` (`{ kind, barId, retryAfterMs }`, sent to the client whose action was dropped)

---

## 5. GoldenGaiMap.vue — Architecture

### Key Constants
```js
const MAP_W = 3614.12, MAP_H = 4096  // SVG coordinate space
const MAP_ROTATION = -21              // degrees to straighten the map
```
The SVG content is inside `<g :transform="rotate(-21, MAP_CX, MAP_CY)">`. The viewBox is expanded to contain the rotated map's bounding corners.

### Props
```js
bars, tagMap, floorFilter, activeTags, chargeMin, chargeMax, drinkMin, drinkMax,
adminMode, placingBar, lang, partitions, searchHighlighted, searchHighlightedBars,
openNowFilter, openBarIds, favoritesFilter, visitedFilter, tourHighlight, tagMode,
hoveredBarId, active
```

### Partitions System
Admin can split a building into colored rectangles. `partitions` prop: `{ [bldgId]: { partitions: [...], splitDirection, splitAngle, labelOrientation, ... } }`. Each partition: `{ barId, weight, color }`.

`geometryV2: true` on a building's config opts it into the corrected geometry (`layoutPartitionsV2` in `src/utils/mapGeometry.js`): the slots divide the building's own on-screen extent, so every slot is visible and clickable for any slot count, and badges/labels are centred inside their slot (also in L-shaped buildings). Configs without the flag keep the original layout, because admins tuned their slot sizes and label offsets by eye against it; they are switched over from Admin → Buildings ("Reset offsets & use auto centre/split", or "Apply to all"). Auto-generated defaults and buildings split for the first time get the flag automatically.

### Building Labels
Labels appear at `currentZoom >= baseFitScale * 2.5`. Per-building label orientation options: `auto`, `vertical`, `horizontal`, `tate` (縦書き). Admin overrides: `labelFontSize`, `labelTextRotation`, `labelOffsetX/Y`.

### Touch Handling
panzoom consumes all SVG touch events — `@click` never fires on mobile. Solution: track `touchstart`/`touchend` manually for single-finger taps. Touch rotation (2-finger) is handled on `.map-container` div alongside panzoom's pinch-zoom.

---

## 6. API Layer

### Frontend (`src/api/index.js`)
- `fetchBars()` — `GET /api/bars`
- `fetchTags()` — `GET /api/tags`
- `updateBar(id, data)` — `PATCH /api/bars/:id` (requires admin header)
- Admin password stored in module-level `adminPassword` var via `setAdminPassword()`

### Backend Routes
All `GET` endpoints set `Cache-Control: no-store`.

| Route | Methods |
|-------|---------|
| `/api/bars` | GET (all), GET `/:slug`, PATCH `/:id`, POST, DELETE `/:id` |
| `/api/tags` | GET (all), POST, PATCH `/:id`, DELETE `/:id` |
| `/api/annotations` | GET, POST, PATCH `/:id`, DELETE `/:id` |
| `/api/admin/check` | GET (rate-limited: 20 req/15 min) |

---

## 7. Database Schema (key tables)

`bars`: id, slug, name_en, name_jp, building_id, floor, street, hours, charge, drink_price, cash_only, seats, phone, description, sns, other_links, schedule, lat, lng, plus_code, google_link, is_active, updated_at

`tags`: id (text), label, label_jp, icon, color

`bar_tags`: bar_id, tag_id (join table)

`annotations`: id, x, y, text_en, text_jp, rotation, font_size, color

Also: `photos`, `building_partitions` (building_id, data JSON), `reviews` and `review_reports`, `chat_messages`, `bar_suggestions`, `ref_hits`, and a `cache` table for the feed. The full definitions are the `MIGRATIONS` in `server/migrate.js`.

**Reserved, unused:** the `users` and `visited` tables (and their indexes) were created by migration `001-schema` for accounts that were never built. No code reads or writes them: visited/favourite bars live in the visitor's localStorage (`useVisited.js`). They are kept on purpose; don't drop them, and don't assume they hold data.

**Important:** Migrations in `server/migrate.js` run automatically on server startup. A `git pull` followed by a server restart **will** alter the schema if new migrations are present.

---

## 8. i18n Pattern

```js
const { t } = useI18n(effectiveLang) // effectiveLang is a computed/ref
t('search') // returns 'Search' or '検索'
```
All strings in `src/composables/useI18n.js`. Lang: `'en'` or `'jp'`.

---

## 9. Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | Yes | PostgreSQL database password |
| `APP_PORT` | Yes | Port exposed by Docker (reverse proxy forwards here) |
| `ADMIN_PASSWORD` | Yes | Password required to enable admin mode in the UI |
| `CORS_ORIGIN` | Recommended | Allowed origin for CORS (e.g. Cloudflare tunnel URL). Defaults to `'*'` if unset. |
| `TWITTER_BEARER_TOKEN` | Optional | X/Twitter API v2 bearer token for the Feed refresh job. Empty = feed refresh disabled. |
| `PUBLIC_URL` | Recommended | Public address of the site (`https://example.com`, no trailing slash) for the absolute URLs in link previews, canonical links, `sitemap.xml` and `robots.txt`. Empty = taken from each request's `Host` + `X-Forwarded-Proto`. |
| `SPA_TEMPLATE_URL` | Optional | Where the API fetches the built `index.html` (default `http://web/index.html`). |

`docker-compose.yml` passes every variable above (except `DB_PASSWORD`/`APP_PORT`, which compose itself uses) into the `api` container explicitly. The API's `dotenv` lookup does **not** find the repo's `.env` inside the container, so any new server variable must also be added to `api.environment` in `docker-compose.yml`.

**Operational notes**
- `GET /api/health` runs `SELECT 1` and returns `200 {ok:true}` or `503`. The `api` service has a compose `healthcheck` on it (`docker compose ps` shows `healthy`/`unhealthy`).
- The API sets `trust proxy` to `1` (nginx is the single hop), so rate limits key on the real client IP from `X-Forwarded-For`. If another proxy is added in front of nginx that forwards to it directly, revisit this value.
- **Link previews / SEO** (`server/routes/seo.js`, pure helpers in `server/lib/seo.js`): nginx proxies `/bar/<slug>`, `/`, `/map`, `/directory`, `/sitemap.xml` and `/robots.txt` to the API. The API fetches the built `index.html` from the `web` container (cached 15 s, last good copy kept if a refresh fails) and replaces the default `<head>` tags from `index.html` with per-page ones (title, description, Open Graph/Twitter, canonical, hreflang, JSON-LD). An unknown or inactive bar is a 404 with `noindex` and a `<meta name="golden-gai-status" content="not-found">` marker that makes the app show its "not found" dialog. If the API is down, slow (4 s) or answers 429/5xx, nginx serves the static `index.html` instead, so the app always loads. The cache is short because the shell names the current build's hashed assets; after deploying a new `web` image the API picks the new shell up within 15 s. The default share image is `public/og/default.png`, regenerated with `node scripts/make-og-image.mjs`.
- The `pg` pool has an `error` listener, so a Postgres restart no longer crashes the API; queries fail with 503/500 until the DB is back, then recover on their own.
- The `db` service no longer bind-mounts the repo (it used to mount `./` at `/import`, which exposed `.env` inside the DB container; nothing used it). To load a SQL dump, pipe it in: `docker compose exec -T db psql -U golden_gai -d golden_gai < dump.sql`.
- Photo uploads still live in the named `uploads` volume. Moving them to a NAS bind mount is recommended; see `KNOWN_ISSUES.md` → *Docker named volume vs bind mount for uploads* (manual, owner-run migration).

---

## 10. Admin Panel — Building Label Controls

| Value | Behaviour |
|-------|-----------|
| `auto` | Horizontal if building wider than tall, vertical otherwise |
| `vertical` | Bar names stacked top-to-bottom |
| `horizontal` | Bar names side by side |
| `tate` | 縦書き: vertical writing mode, text runs top to bottom, columns side by side |

Additional controls: Label Size (px), Label Rotation (°), Label Offset X/Y. All stored in the `partitions` object in the DB, per-building. Rotation 0 is upright for every orientation, including `tate` (which used to need -90).

---

## 11. Git & Deployment Strategy

- Remote: `https://github.com/webutan/goldenguide.git` (branch: `main`)

### Deploying: update `web` and `api` together
`docker compose up -d --build` rebuilds both; don't update one image alone.
- nginx (`web`) proxies `/bar/<slug>`, `/`, `/map`, `/directory`, `/sitemap.xml` and `/robots.txt` to the API. A **new `web` with an old `api`** that has no SEO routes answers `/bar/<slug>` (and the other proxied pages) with Express's plain "Cannot GET" 404 page instead of the app: nginx falls back to the static shell on 429/5xx or a timeout, but passes a 404 through, because a 404 is also the API's deliberate answer for an unknown bar.
- The reverse (new `api`, old `web`) is safe for pages, but new API behaviour the old frontend does not know about is simply unused.
- Set `PUBLIC_URL` (see §9) to the site's public address. Without it link previews, canonical URLs, `sitemap.xml` and `robots.txt` are built from each request's `Host` header.

### Automatic database backup on every update

Every time the API container starts (so on every `docker compose up -d --build`, and on restarts) it dumps the database with `pg_dump` **before** running any migration (`server/lib/backup.js`, called from `server/migrate.js`). Files are gzipped SQL in `./backups/` next to `docker-compose.yml`:

- `golden-gai-<UTC date>-<time>-before-<first pending migration>.sql.gz` when the update changes the database, otherwise `golden-gai-<date>-<time>.sql.gz`.
- The newest `BACKUP_KEEP` (14) are kept. A plain restart within an hour of the last backup doesn't take another; an update with pending migrations always does.
- `BACKUP_ON_START=required` (the Docker default): if the backup fails (disk full, folder not writable) and migrations are pending, the API refuses to start and changes nothing. `auto` warns and carries on; `off` disables it.
- **Not included:** uploaded photos (the `uploads` Docker volume; updates don't touch it) and the code (that's git).

**If an update goes wrong:**

1. Go back to the previous code: `git log` to find the commit you were on, `git checkout <commit>`, `docker compose up -d --build`.
2. Restore the data: `./scripts/restore-db.sh` lists the backups; `./scripts/restore-db.sh backups/<file>` restores one. It stops the API, saves the current database as `...-before-restore.sql.gz` (so a restore can be undone), replaces the database in one transaction, and starts the API.

If you restore without going back to the old code, the API just re-applies the newer migrations to the restored data on start, which is what you want after losing data but not after a bad migration.

### CRITICAL: Server May Have Untracked Changes
1. **PostgreSQL bar data** — NOT in git. Git push/pull never affects this.
2. **Server-side code** may be ahead of local. **DO NOT overwrite server/ files without first pulling the server's version.**

### Safe Push Strategy
```bash
git add src/ public/
git add server/routes/bars.js server/routes/tags.js  # only if intentionally modified
git commit -m "feat: description"
git push origin main
```

---

## 12. Common Gotchas

- **panzoom consumes SVG touch events** — `@click` won't fire on mobile; manually track `touchstart`/`touchend`.
- **Cache-Control** — All GET endpoints set `no-store`; without it nginx may cache stale data.
- **media/ vs public/** — New assets land in `media/gaichan/`. Vite only serves `public/`. Always copy first.
- **DEV vs Production** — In dev, all localStorage values are skipped. Remove `DEV ? null :` guards to test persistence.
- **useWindowManager.js is a module singleton** — persists across HMR; clear page to reset window state.
- **Vue transitions with CSS transforms** — Enter/leave must include base transform (e.g. `translateX(-50%)` for centered elements).

---

## 13. Quick Context Commands

```bash
ls src/components/         # all source components
ls public/gaichan/         # all Gai-chan assets
git status && git log --oneline -5
git diff --name-only HEAD origin/main
npm run build              # verify no compile errors
```

**Key files to read first:**
1. `src/App.vue` — state flow and component wiring
2. `src/components/GaiChanDialogue.vue` — rules walkthrough + interactive Gai-chan
3. `src/components/GoldenGaiMap.vue` — map with panzoom, labels, touch rotation
4. `src/components/AdminPanel.vue` — admin building/label controls
5. `UI_STYLE_GUIDE.md` — visual design system, CSS variables, animations

---

## 14. Testing

Unit tests use Vitest and live in `tests/` (`*.test.js`).

```bash
npm ci && (cd server && npm ci)   # one server test needs server/node_modules
npm test                          # run all tests once (vitest run)
```

- `npm test` runs frontend and server tests together. Most server tests only load `server/lib/` (no dependencies), but `tests/serverSuggestions.test.js` imports `server/middleware/rateLimits.js`, which needs `express-rate-limit` from `server/node_modules`; without `npm ci` in `server/` that file fails with "Cannot find package".

- Config is `vitest.config.js`; it extends `vite.config.js`, so the Vue plugin is shared.
- Default environment is `node`: prefer testing pure logic (composables, utils).
- Tests are never imported by the app, so they don't end up in `dist/`.
