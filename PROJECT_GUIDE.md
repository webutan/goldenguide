# Golden Gai Map — Developer Project Guide

> Paste this into a new Claude Code session for full project context. Last updated: 2026-03-12.

---

## 1. Project Overview

**Golden Gai Map** is an interactive bar directory and SVG map for the Golden Gai district of Shinjuku, Tokyo. It has a deliberately retro **Windows 2000 / CRT monitor aesthetic** with Japanese visual novel elements.

- **Tech stack:** Vue 3 (Composition API, `<script setup>`), Vite, Node.js/Express, PostgreSQL
- **Deployment:** Frontend served as static build from `dist/`; backend Express API at port 3001
- **GitHub:** `https://github.com/webutan/goldenguide.git` (branch: `main`)
- **Local dev:**
  - `npm run dev` — Vite dev server (proxies `/api` and `/uploads` to localhost:3001)
  - `npm run dev:server` — Express API server
  - `npm run build` — builds to `dist/`

---

## 2. Visual Design System (CRITICAL — preserve at all costs)

### Win2000 Aesthetic
CSS variables in `src/style.css` drive the entire palette:
- `--win-bg` — main grey background
- `--win-border-light`, `--win-border-dark`, `--win-border-mid`, `--win-border-darkest` — 4-tone inset shadows for 3D raised/sunken button look
- `--win-title-active`, `--win-title-text-active` — blue title bar
- `--win-text`, `--win-text-disabled`
- `--win-font` — "W95FA" (pixel font loaded as woff/woff2)
- `--valhalla-orange` — accent orange used for highlights
- `--taskbar-height` — 32px (always respect for bottom-fixed elements)

**Button styling pattern:** Always use 4-layer inset box-shadow (light top-left, dark bottom-right, mid inner, darkest inner). See `WinButton.vue` for the canonical example.

### CRT / Terminal Aesthetic (GaiChanDialogue, terminal)
- Font: `'Courier New', monospace`
- Colors: `#ff8800` (orange glow), `#ffe4a0` / `#ffcc44` (warm text)
- Text shadow: `0 0 4px rgba(255, 136, 0, 0.5)`
- Scanlines: `repeating-linear-gradient` with moving `background-position-y` animation
- Image filter for orange monochrome: `grayscale(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.85) contrast(1.2)`

### Image Rendering
All pixel-art sprites/icons: `image-rendering: pixelated`
Photos and natural images: `image-rendering: auto`

---

## 3. Repository Structure

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
│   │   └── useOpenNow.js      ← Computed set of currently-open bar IDs
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
│   │   └── feed.js        ← Twitter/SNS feed proxy
│   └── jobs/              ← Background jobs (feed refresh, caching)
├── media/                 ← SOURCE assets (NOT served). Always copy needed files to public/
├── PROJECT_GUIDE.md       ← This file
├── vite.config.js         ← Proxies /api and /uploads to localhost:3001
└── package.json
```

---

## 4. State Flow (App.vue)

### First-Visit / Language Flow
1. `lang` ref (localStorage `golden-gai-lang`) — `null` means show lang picker
2. `firstVisit` ref (localStorage `golden-gai-first-time`: `'yes'`/`'no'`) — `null` means not answered
3. `rulesAccepted` ref (localStorage `golden-gai-rules-accepted`: `'1'`)
4. `gaichanBubbleType` computed: `null | 'lang' | 'first-time'` — drives GaiChan modal dialogs
5. `showRules` computed: `firstVisit === true && !rulesAccepted`

**Order of dialogs:**
→ Lang picker (GaiChan modal) → First time? (GaiChan modal) → If yes: GaiChanDialogue VN walkthrough → App unlocks

**DEV MODE:** `const DEV = import.meta.env.DEV` — in dev, localStorage is ignored and the full onboarding flow always runs.

### GaiChanDialogue in App.vue
```html
<GaiChanDialogue
  v-if="(activeView === 'desktop' || tourMode) && firstVisit !== null"
  :lang="effectiveLang"
  :rules-accepted="rulesAccepted || firstVisit === false"
  :bars="bars"
  @accepted="handleRulesAccepted"
  @tour-mode="handleTourMode"
  @tour-navigate="handleTourNavigate"
  @tour-highlight="handleTourHighlight"
  @open-bar="handleOpenBarFromTour"
/>
```
**Important:** The dialogue is only rendered when `activeView === 'desktop'` OR `tourMode` is true. It is NOT shown when user is in the map/directory view (unless the tour is active).

### Window Manager
`useWindowManager()` provides a reactive window registry. Key methods: `register(id, title, icon)`, `wm.getWindow(id)`, `wm.focus(id)`, `wm.minimize(id)`, `wm.unregister(id)`. z-index is auto-managed.

---

## 5. GaiChanDialogue.vue — Complete Reference

### Purpose
Two modes in one component:
1. **Rules walkthrough** — VN-style 20-step dialogue with Gai-chan sprite, CRT terminal for rule images, typewriter text. Shown on first visit.
2. **Interactive help mode** — After rules (or if `rulesAccepted=true`), user taps the tucked panel to open a choice-based dialogue tree: recommendations, tour mode, Gai-chan dialogue.

### Props
```js
lang: String ('en' | 'jp')
rulesAccepted: Boolean   // true → start tucked immediately (skip rules)
bars: Array              // bar data for recommendation engine
```

### Emits
```js
'accepted'                      // rules done / skipped → App saves localStorage
'tour-mode', Boolean            // enter/exit guided tour
'tour-navigate', String         // navigate to a view ('map', 'directory')
'tour-highlight', String|null   // highlight a UI element by name
'open-bar', Number              // open a specific bar by ID
```

### Layout Architecture

**Panel dimensions:** `min(820px, 98vw)` wide, aspect-ratio `2155/693` (from gaichanwindow.png)

**Image masking pattern (critical):**
- `gaichanwindow.png` — full decorative panel image with opaque frame + dark screen area
- `gaichanwindowtp.png` — TRANSPARENT MASK: transparent=screen area, opaque=frame/panels
- CSS `mask-image: url(gaichanwindowtp.png)` on `.layer--window` img hides gaichanwindow where mask is transparent, revealing layers beneath

**Layer stack (bottom → top inside `.dialogue-body`):**
1. `.screen-content` (z=1) — Gai-chan sprite or `gaichanicon.png` on black when tucked
2. `.layer--window` (z=2) — gaichanwindow.png masked by gaichanwindowtp.png (shows only frame)
3. `.text-panel` (z=3) — dialogue text, skip button (top-right), next button (bottom-right)
4. `.speaker-name` (z=4) — "Gai-chan" label in small top window area

**CSS variables:**
```css
--screen-l: 6.59%;  --screen-t: 20.15%;
--screen-w: 18.41%; --screen-h: 53.61%;
--pw: 30%;  /* portrait zone width for tuck animation */
```

### Tuck Behavior
- Active: `left: 50%; transform: translateX(-50%)` — centered
- Tucked: `left: 100%; transform: translateX(calc(-1 * var(--pw)))` — right edge, portrait zone visible
- When tucked: monitor shows black + `gaichanicon.png` bouncing; text panel hidden via `v-if="!isTucked"`

**Tapping a tucked panel on mobile:** handled by `@touchend="handleTouchEnd"` which calls `e.preventDefault()` (to suppress the 300ms synthetic click) then `openInteractiveDialogue()`. The `@click` handler alone had a timing issue on mobile.

### Mobile Layout (≤768px)
The panel uses an aspect-ratio-based approach, not a fixed pixel offset:
```css
.gaichan-dialogue {
  width: calc(100vw * 2155 / 1434);   /* ~150% viewport width */
  left: 0;
  transform: translateX(calc(-100vw * 642 / 1434));  /* shift left ~45vw */
}
```
This positions the text panel (at ~33% from panel left) at approximately x=5vw in viewport — visible on screen. The monitor/screen-content area is at ~6.59% of panel width which is at about -35vw (off-screen left).

**IMPORTANT:** On mobile, `.screen-content:not(.screen-content--tucked) { display: none; }` explicitly hides the monitor section in non-tucked state. The Gai-chan sprite lives inside the **CRT terminal** on mobile, not the dialogue panel screen.

Text panel positioning on mobile uses the same percentage-based values as desktop (`left: 33.0%, right: 6.9%`).

Tucked state on mobile: same rule as desktop (`left: 100%; translateX(-30%)`), showing the portrait zone at the right viewport edge.

### Interactive Mode
Triggered by tapping the tucked Gai-chan panel. Key functions:
- `openInteractiveDialogue()` — untuces panel, sets `interactiveMode = true`, loads 'menu' node
- `loadInteractiveNode(nodeId)` — loads a dialogue node; some nodes trigger tour actions (`tour-*` emits)
- `selectChoice(choiceId)` — handles user choice buttons
- `closeInteractiveDialogue()` — re-tucks panel, clears tour state

**Tour nodes** (`nodeId.startsWith('tour-')`) trigger `tourMode` in App.vue via `emit('tour-mode', true)`.

On mobile during interactive mode, dialogue text appears in `.crt-dialogue-overlay` (overlay on terminal screen) rather than the text panel.

### CRT Terminal
- Desktop: slides down from above via Vue `<Transition name="crt">`; stays open once opened
- Mobile: always open after first dialogue step; no slide animation; Gai-chan sprite inside screen
- Images scan in via `clip-path: inset(0 0 100% 0)` → `inset(0 0 0% 0)`

### Sprite Sets
```js
SPRITE_SETS = {
  regular:   { closed: 'gaichanmouthclosed.png',        open: 'gaichanmouthopen.png' },
  thinking:  { closed: 'gaichanthinking.png',            open: 'gaichanthinkingmouthopen.png' },
  surprised: { closed: 'gaichansurprised.png',           open: 'gaichansurprisedmouthopen.png' },
}
```
`mouthOpen` ref toggles at 140ms intervals while typewriter is active.

---

## 6. GoldenGaiMap.vue — Complete Reference

### Purpose
SVG-based interactive map with panzoom, building color coding, bar name labels, GPS tracking, admin annotations, and touch rotation.

### Key Constants
```js
const MAP_W = 3614.12, MAP_H = 4096  // SVG coordinate space
const MAP_ROTATION = -21              // degrees to straighten the map
const MAP_CX = MAP_W / 2, MAP_CY = MAP_H / 2
```
The SVG content is inside `<g :transform="rotate(-21, MAP_CX, MAP_CY)">` to straighten it visually.

The viewBox (`VB_*`) is expanded to contain the rotated map's bounding corners so nothing is clipped.

### Props
```js
bars, tagMap, floorFilter, activeTags, chargeMin, chargeMax, drinkMin, drinkMax,
adminMode, placingBar, lang, partitions, searchHighlighted, searchHighlightedBars,
openNowFilter, openBarIds, favoritesFilter, visitedFilter, tourHighlight,
labelMode   // 'yoko' | 'tate' (reserved for future global toggle — per-building override is in partitions)
```

### Emits
```js
'selectBuilding', { buildingId, bars }
'placeBar', { bar, buildingId }
'selectBuildingForEdit', buildingId
'selectPartitionBar', { buildingId, barId }
```

### Exposed Methods
```js
resetZoom()         // fit to container (no rotation reset)
resetView()         // reset userRotation to 0 + fit to container
panToBuilding(id)
clearSelection()
```

### Building Labels (`buildingLabelData` computed)
Labels appear when `currentZoom >= baseFitScale * 2.5`.

Each building in `buildingLabelData` has `{ cx, cy, groupRotation, items[] }`:
- `cx/cy` — building visual center in SVG space
- `groupRotation` — counter-rotates MAP_ROTATION so labels appear screen-aligned
- `items[i]` — `{ barId, text, dx, dy, fontSize, fill, opacity, writingMode }`

**Label orientations** (set per-building in `partitions[bldgId].labelOrientation`):
- `'auto'` — picks horizontal if building is wider than tall, vertical otherwise
- `'vertical'` — bars stacked top-to-bottom (traditional rows)
- `'horizontal'` — bars side by side (each in a slot)
- `'tate'` — 縦書き: bars side by side with `writing-mode: vertical-rl`, Japanese-only text. Kanji reads top-to-bottom; English renders sideways.

**Tate mode (`orientOverride === 'tate'`):**
- Uses `barLabelTextTate()` which always uses `bar.name_jp || bar.name_en` + full-width floor (e.g. `２階`)
- `groupRotation = -MAP_ROTATION + 90` (same as horizontal)
- Column spacing = `fontSize * 1.2`
- Font size = `min(usableW/n * 0.9, usableH / maxLen, 45)`

**Admin label overrides** (per-building in `partitions[bldgId]`):
- `labelOrientation` — see above
- `labelFontSize` — override auto font size
- `labelTextRotation` — additional rotation in degrees
- `labelOffsetX / labelOffsetY` — shift the label group

### Partitions System
Admin can split a building into colored rectangles for individual bars. `partitions` prop is `{ [bldgId]: { partitions: [...], splitDirection, splitAngle, labelOrientation, ... } }`.

Each partition: `{ barId, weight, color }`. Colors follow `FLOOR_COLORS` (floor → primary/variant colors).

### Touch Handling
**Panzoom conflict:** panzoom consumes all touch events on the SVG, so `@click` never fires on mobile. Solution: `@touchstart.passive` / `@touchend` on the SVG itself track single-finger taps manually.

**Touch rotation (2-finger):** `@touchstart/move/end.passive` on `.map-container` track 2-finger angle deltas → `userRotation` ref. Applied as `transform: rotate(${userRotation}deg)` on `.map-svg-wrap` (a div wrapping only the SVG, not the controls).

**Compass reset button:** ⟳ button in the mobile controls calls `resetView()`.

### GPS / Location Tracking
Uses browser Geolocation API + `open-location-code` (Plus Codes). Requires 3+ bars with Plus Codes or lat/lng set to calibrate the SVG→GPS transform. Toggle via ⊕ location button.

### Admin Annotations
Free-text labels placed directly on the SVG map. Managed via `/api/annotations`. Admin can drag, rotate, resize annotations.

---

## 7. GaiChan.vue — Corner Window

Separate component from GaiChanDialogue. Shows in bottom-right corner.
- Hidden when `hidden` prop is true (`showRules || firstVisit === true` in App.vue)
- Shows lang picker modal and first-time modal
- Sprites: `windowsprite.png` (idle), `windowspritethink.png` (thinking)
- Corner window: `position: fixed; bottom: calc(var(--taskbar-height) + 8px); right: 8px`

---

## 8. Public Assets — Gaichan Folder

All in `public/gaichan/`:

| File | Purpose |
|------|---------|
| `gaichanwindow.png` | Full panel image (decorative frame) |
| `gaichanwindowtp.png` | Mask for panel (transparent=screen+text areas) |
| `gaichanbackground.png` | Background scene behind sprite |
| `gaichanmouthclosed.png` | Regular sprite, mouth closed |
| `gaichanmouthopen.png` | Regular sprite, mouth open |
| `gaichanthinking.png` | Thinking sprite, mouth closed |
| `gaichanthinkingmouthopen.png` | Thinking sprite, mouth open |
| `gaichansurprised.png` | Surprised sprite, mouth closed |
| `gaichansurprisedmouthopen.png` | Surprised sprite, mouth open |
| `gaichanicon.png` | Small icon shown in tucked monitor |
| `gaichanidle.png` | Rule image: private streets |
| `terminal.png` | CRT terminal frame |
| `terminaltp.png` | CRT terminal mask (transparent=screen area) |
| `windowsprite.png` | GaiChan corner sprite (idle) |
| `windowspritethink.png` | GaiChan corner sprite (thinking) |
| `windowspritehappy.png` | GaiChan corner sprite (happy) |
| `camera.png`, `smoking.png`, `yen.png`, etc. | Rule images |

**IMPORTANT:** Source assets live in `media/gaichan/`. When new sprites are provided, copy to `public/gaichan/`:
```bash
cp media/gaichan/FILENAME.png public/gaichan/FILENAME.png
```

---

## 9. API Layer

### Frontend (`src/api/index.js`)
All fetch calls go through this file:
- `fetchBars()` — `GET /api/bars` — bars with tags + first photo filename
- `fetchTags()` — `GET /api/tags`
- `updateBar(id, data)` — `PATCH /api/bars/:id` (requires admin header)
- Admin password stored in module-level `adminPassword` var, set via `setAdminPassword()`

### Backend Routes (`server/routes/`)
All `GET` endpoints set `Cache-Control: no-store` to prevent nginx/CDN caching stale data.

**`bars.js`:**
- `GET /` — all bars with tags aggregated + first photo filename
- `GET /:slug` — single bar with photos array
- `PATCH /:id` — update fields + replace tags (admin)
- `POST /` — create bar (admin)
- `DELETE /:id` — delete bar (admin)

**`tags.js`:**
- `GET /` — all tags ordered by id
- `POST /` — create tag (admin)
- `PATCH /:id` — update tag fields (admin)
- `DELETE /:id` — delete tag (admin)

### Database Schema (key tables)
`bars`: id, slug, name_en, name_jp, building_id, floor, street, hours, charge, drink_price, cash_only, seats, phone, description, sns, other_links, schedule, lat, lng, plus_code, google_link, is_active, updated_at

`tags`: id (text), label, label_jp, icon, color

`bar_tags`: bar_id, tag_id (join table)

`annotations`: id, x, y, text_en, text_jp, rotation, font_size, color

Migrations run automatically on server start via `server/migrate.js` (versioned, idempotent).

---

## 10. i18n Pattern

```js
const { t } = useI18n(effectiveLang) // effectiveLang is a computed/ref
t('search') // returns 'Search' or '検索'
```
All strings in `src/composables/useI18n.js`. Lang: `'en'` or `'jp'`.

For components not using `useI18n`, pass `lang` prop and inline ternary:
```js
lang === 'jp' ? '...' : '...'
```

---

## 11. Common Gotchas & Lessons Learned

### CSS Specificity — Mobile vs Desktop Tucked State
`.gaichan-dialogue.tucked` has higher specificity than the mobile media query's `.gaichan-dialogue`. Always explicitly override `.gaichan-dialogue.tucked` inside `@media (max-width: 768px)` when you need different mobile tucked behavior.

### Mobile Touch — 300ms Click Delay on Tucked Panel
On mobile, `@click` has a ~300ms delay after `touchend`. If state changes between touch and click, the handler may see stale state. Fix: bind `@touchend` alongside `@click` and call `e.preventDefault()` inside `touchend` to suppress the synthetic click when you've already handled it.

```js
function handleTouchEnd(e) {
  if (isTucked.value) {
    e.preventDefault()  // prevent synthetic click
    openInteractiveDialogue()
  }
}
```

### panzoom Consumes SVG Touch Events
The panzoom library attaches touch listeners to the SVG element. `@click` will NOT fire on mobile for SVG taps. Solution: manually track `touchstart`/`touchend` on the SVG, detect taps (small dx/dy, short dt), and call `e.preventDefault()` in `touchend` to suppress the 300ms synthetic click.

For **touch rotation** (2-finger), add handlers to the container DIV (not the SVG) — this runs alongside panzoom's pinch-zoom without conflict.

### Touch Rotation and panzoom Layers
The `.map-svg-wrap` div wraps the SVG and receives `transform: rotate(${userRotation}deg)`. The controls (zoom buttons, location button, compass reset) are siblings of this wrapper, not children, so they stay upright while the map rotates.

### Image Analysis for Pixel-Perfect Positioning
When `gaichanwindowtp.png` is updated with new transparent windows, use Python PIL:
```python
from PIL import Image
import numpy as np
img = Image.open('public/gaichan/gaichanwindowtp.png').convert('RGBA')
arr = np.array(img)
alpha = arr[:,:,3]
rows = np.any(alpha < 10, axis=1)
cols = np.any(alpha < 10, axis=0)
print(np.where(rows)[0][[0,-1]], np.where(cols)[0][[0,-1]])
```

### Vue Transitions with CSS transforms
When a `<Transition>` sets `transform` on enter/leave AND the element has a base `transform`, the enter/leave must include the base:
```css
/* Desktop: base transform is translateX(-50%) */
.crt-enter-from { transform: translateX(-50%) translateY(-160%); }
/* Mobile: no centering transform */
.crt-enter-from { transform: translateY(-160%); }
```

### Cache-Control on API GET Responses
All GET endpoints set `res.set('Cache-Control', 'no-store')` before responding. Without this, nginx or browser may cache stale bar/tag data after admin panel updates.

### media/ vs public/
New assets land in `media/gaichan/`. The Vite dev server only serves `public/`. Always copy to `public/` before testing.

### DEV vs Production Behavior
`const DEV = import.meta.env.DEV` — in dev, all localStorage values are skipped so the full onboarding flow always runs. Remove `DEV ? null :` guards to test localStorage persistence.

### useWindowManager.js is a Module Singleton
`windows` and `nextZ` are at module scope — persists across HMR refreshes. Clear the page to reset window state during dev.

---

## 12. Admin Panel — Building Label Controls

In the admin panel's building editor (after clicking a building), the **Label Layout** dropdown sets `partitions[bldgId].labelOrientation`:

| Value | Behaviour |
|-------|-----------|
| `auto` | Horizontal if building wider than tall, vertical otherwise |
| `vertical` | Bar names stacked top-to-bottom |
| `horizontal` | Bar names side by side |
| `tate` | 縦書き: vertical writing mode, Japanese-only text, columns side by side |

Additional controls: Label Size (px), Label Rotation (°), Label Offset X/Y. These are all stored in the `partitions` object in the database and are per-building.

---

## 13. Git & Deployment Strategy

### Repository State
- Remote: `https://github.com/webutan/goldenguide.git` (branch: `main`)

### CRITICAL: Server May Have Unretracked Changes
The production server may have:
1. **PostgreSQL bar data** — NOT in git, lives in the DB. Git push/pull never affects this.
2. **Server-side code** (`server/routes/`, `server/migrate.js`, `server/index.js`) that is AHEAD of local.

**DO NOT overwrite server/ files without first pulling the server's version.**

### Safe Push Strategy
Stage frontend + explicitly modified server files separately:
```bash
# Stage frontend changes
git add src/ public/

# Stage server changes only if you've intentionally modified them
git add server/routes/bars.js server/routes/tags.js

# Leave unstaged: server/index.js, server/migrate.js, server/jobs/
# unless you've confirmed those are intentional local changes

git commit -m "feat: description of changes"
git push origin main
```

On the server: `git pull origin main` brings in changes while leaving untracked DB data untouched.

---

## 14. Potential Improvements / Known Issues

1. **Touch rotation and label counter-rotation** — when `userRotation` is non-zero, bar name labels inside the SVG still counter-rotate only by `-MAP_ROTATION` (the fixed -21° map tilt). They don't counter-rotate the user's touch rotation, so labels tilt with the map when rotated. To fix: thread `userRotation` into `buildingLabelData`'s `groupRotation` calculation (`baseRotation - userRotation`).

2. **Mobile text panel right overflow** — the right side of the dialogue panel extends ~5-10px past the viewport. Intentional aesthetic, but monitor for horizontal scroll issues on real devices.

3. **Terminal on mobile has no rule text lines** — `crt-lines` is hidden on mobile; only the image shows. If image is null, only the Gai-chan background shows.

4. **`gaichanwindowtp.png` analysis** — when this file is updated, run the Python PIL analysis (see section 11) to get new pixel coordinates before adjusting CSS.

5. **Global label mode toggle (横書き/縦書き)** — `labelMode` prop is wired to GoldenGaiMap and `App.vue` has localStorage state for it, but no UI toggle is exposed yet. The per-building `tate` option in the admin panel is the current entry point. The global toggle is ready to wire up to a button when needed.

6. **Speaker name label on mobile** — the top label window in `gaichanwindowtp.png` renders very small on mobile (~9px font). A long-term fix would be to redraw the sprite at larger size.

---

## 15. Quick Context Commands

```bash
# See all source components
ls src/components/

# See all Gai-chan assets
ls public/gaichan/

# See media source assets (before copying to public)
ls media/gaichan/

# Check current git state
git status && git log --oneline -5

# Check what's been modified vs origin
git diff --name-only HEAD origin/main

# Build to verify no compile errors
npm run build
```

**Key files to read first for context:**
1. `src/App.vue` — understand state flow and component wiring
2. `src/components/GaiChanDialogue.vue` — rules walkthrough + interactive Gai-chan
3. `src/components/GoldenGaiMap.vue` — map with panzoom, labels, touch rotation
4. `src/components/AdminPanel.vue` — admin building/label controls
5. `public/gaichan/` — understand available assets before adding new ones
