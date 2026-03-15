# Golden Gai Map — Developer Project Guide

> Paste this into a new Claude Code session for full project context. Last updated: 2026-03-15.
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
├── public/
│   ├── gaichan/          ← ALL Gai-chan assets (sprites, windows, terminal, rule images)
│   ├── icons/            ← Win2000 icons (.ico, .png), tag icons in icons/tags/
│   ├── signs/            ← Street sign assets
│   ├── cursors/          ← Custom .cur / .ani cursor files
│   └── favicon.ico
├── src/
│   ├── App.vue           ← Root component; orchestrates all state
│   ├── api/index.js      ← All fetch calls to /api/
│   ├── assets/map.svg    ← SVG map of Golden Gai (source geometry)
│   ├── components/
│   │   ├── GaiChan.vue           ← Corner sprite window + lang/first-time dialog modals
│   │   ├── GaiChanDialogue.vue   ← VN-style rules walkthrough + interactive mode (main work area)
│   │   ├── GoldenGaiMap.vue      ← SVG map with panzoom, building labels, touch rotation
│   │   ├── BarDirectory.vue      ← Scrollable bar list
│   │   ├── BarDrawer.vue         ← Slide-up drawer on map building click (mobile)
│   │   ├── BarPopup.vue          ← Bar detail popup (desktop)
│   │   ├── BarTwitterPanel.vue   ← Twitter/SNS feed panel for individual bars
│   │   ├── FeedWindow.vue        ← General feed window
│   │   ├── ChatWindow.vue        ← AIM-style anonymous chatroom (Socket.io)
│   │   ├── AdminPanel.vue        ← Admin building/label/partition controls
│   │   ├── DatabaseTable.vue     ← Spreadsheet-style DB editor
│   │   ├── TagFilter.vue         ← Filter sidebar (tags, price, floor, open now)
│   │   ├── MapSearch.vue         ← Search bar for map
│   │   ├── DesktopView.vue       ← Desktop icon grid
│   │   ├── ContactWindow.vue
│   │   └── win2000/
│   │       ├── WinWindow.vue      ← Draggable, resizable window chrome
│   │       ├── WinTitleBar.vue    ← Title bar with minimize/close buttons
│   │       ├── WinTaskbar.vue     ← Bottom taskbar with Start, views, lang
│   │       ├── WinButton.vue      ← Standard Win2000 button
│   │       ├── WinScrollContainer.vue
│   │       ├── WinTabs.vue
│   │       ├── WinTextInput.vue
│   │       └── WinCheckbox.vue
│   ├── composables/
│   │   ├── useI18n.js         ← t(key) helper; accepts lang ref or string
│   │   ├── useApi.js          ← bars + tags reactive fetch state
│   │   ├── useAdmin.js        ← Admin password toggle
│   │   ├── useVisited.js      ← localStorage visited bar tracking
│   │   ├── useWindowManager.js← WM: register/focus/minimize/unregister windows
│   │   ├── useDraggable.js    ← Drag composable for WinWindow
│   │   ├── useOpenNow.js      ← Computed set of currently-open bar IDs
│   │   └── useChat.js         ← Socket.io chat: messages, nickname, send
│   └── data/
│       ├── buildings.json     ← Building coordinate data keyed by SVG element ID
│       └── tags.json          ← Tag definitions (id, label, label_jp, icon, color)
├── server/
│   ├── index.js           ← Express app entry, runs migrations, mounts routes
│   ├── db.js              ← pg Pool singleton
│   ├── migrate.js         ← Versioned SQL migrations run on startup
│   ├── middleware/admin.js ← Admin password header check
│   ├── routes/
│   │   ├── bars.js        ← CRUD for bars (GET /api/bars, GET /api/bars/:slug, PATCH, POST, DELETE)
│   │   ├── tags.js        ← Tags management (GET /api/tags, POST, PATCH, DELETE)
│   │   ├── photos.js      ← Photo upload/delete
│   │   ├── annotations.js ← Map text annotations (admin-placed labels)
│   │   ├── feed.js        ← Twitter/SNS feed proxy
│   │   └── chat.js        ← Socket.io /chat namespace; persists to chat_messages table
│   └── jobs/              ← Background jobs (feed refresh, caching)
├── media/                 ← SOURCE assets (NOT served). Always copy needed files to public/
├── PROJECT_GUIDE.md       ← This file
├── UI_STYLE_GUIDE.md      ← Visual/CSS/animation reference (Win2000, GaiChan, CRT)
├── KNOWN_ISSUES.md        ← Deferred bugs and architectural concerns
├── vite.config.js         ← Proxies /api and /uploads to localhost:3001
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
- Rate limiting: enforced server-side (1 msg/sec per socket)
- Events: `chat:send`, `chat:message`, `chat:history`, `chat:usercount`

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
openNowFilter, openBarIds, favoritesFilter, visitedFilter, tourHighlight, labelMode
```

### Partitions System
Admin can split a building into colored rectangles. `partitions` prop: `{ [bldgId]: { partitions: [...], splitDirection, splitAngle, labelOrientation, ... } }`. Each partition: `{ barId, weight, color }`.

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

---

## 10. Admin Panel — Building Label Controls

| Value | Behaviour |
|-------|-----------|
| `auto` | Horizontal if building wider than tall, vertical otherwise |
| `vertical` | Bar names stacked top-to-bottom |
| `horizontal` | Bar names side by side |
| `tate` | 縦書き: vertical writing mode, Japanese-only text, columns side by side |

Additional controls: Label Size (px), Label Rotation (°), Label Offset X/Y. All stored in the `partitions` object in the DB, per-building.

---

## 11. Git & Deployment Strategy

- Remote: `https://github.com/webutan/goldenguide.git` (branch: `main`)

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
