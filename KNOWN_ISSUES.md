# Golden Gai Map — Known Issues

> Deferred concerns from the 2026-03-15 Gemini diagnostic audit.
> Items marked **FIXED** were addressed in the same audit session.

---

## Security

### CORS wildcard (Medium)
`CORS_ORIGIN` now reads from env (`FIXED: 2026-03-15`) — but production deployments must set `CORS_ORIGIN` in `.env` for the restriction to take effect. Default `'*'` remains for local dev.

### Upload MIME validation missing (Medium)
Photos are uploaded to `server/uploads/`. Files are stored with UUID names (no extension), which prevents direct execution. However, there is no server-side MIME signature check (magic bytes). A malicious file could still be stored and served.

**Mitigation:** Add `fileFilter` to multer in `server/routes/photos.js` using a library like `file-type` to verify JPEG/PNG/WEBP magic bytes before accepting the upload.

### Admin auth rate limiting (FIXED: 2026-03-15)
`express-rate-limit` added to `/api/admin/check` (20 req/15 min window). Production deployments behind a reverse proxy may need `app.set('trust proxy', 1)` in `server/index.js` for accurate IP detection.

---

## Data Safety

### Docker named volume vs bind mount for uploads (High)
`docker-compose.yml` uses a named Docker volume (`uploads`) for photo storage. Named volumes persist across `docker compose down` but live in Docker's internal storage (`/var/lib/docker/volumes/`), **not** on the NAS data array. A Docker daemon reset or volume prune would destroy all uploaded photos.

**Fix:** Change to a bind mount pointing at a NAS path:
```yaml
volumes:
  - /mnt/md0/golden-gai-uploads:/app/server/uploads
```
Back up existing named volume contents first:
```bash
docker run --rm -v golden-gai-map_uploads:/src -v /mnt/md0/golden-gai-uploads:/dst alpine cp -r /src/. /dst/
```

---

## Performance / Architecture

### Prop drilling (Low)
`App.vue` passes 15+ props through to `GoldenGaiMap` and `BarDrawer`. Filter state (`activeTags`, `floorFilter`, `chargeMin/Max`, `drinkMin/Max`, `openNowFilter`, `favoritesFilter`, `visitedFilter`) is the main offender. A Pinia store for filter state would eliminate most of the drilling, but it's a significant refactor with risk of breaking filter reactivity.

### Watcher spam / redundant filter calculations (Low)
`barPassesFilters` runs in 11+ computed/watch contexts. Seven separate watchers each call `setTimeout(updateBuildingColors, 50)`. On the current small dataset this has no visible performance impact, but the pattern is poor:
- The `setTimeout` calls should be consolidated into a single `watch(() => [...deps], updateBuildingColors)`
- `barPassesFilters` should be memoized or the building color update should read directly from already-computed filtered sets

### Imperative DOM manipulation in Vue (Medium)
`updateBuildingColors` queries SVG paths by ID and directly mutates `classList` and `style`, bypassing Vue reactivity. This works but is fragile — if the SVG structure changes, the queries silently fail.

**Better approach:** Drive building fill colors through a reactive `buildingColorMap` computed property and bind colors declaratively in the template. This requires significant restructuring of the SVG rendering.

---

## Mobile UX

### CRT readability on small screens (Low)
The orange-on-dark CRT color scheme (`#ff8800` on `#111`) can be difficult to read at small font sizes on low-brightness screens. The scanline animation also reduces legibility.

**Options:** Increase base font size in `.crt-terminal` on mobile, or reduce scanline opacity on small screens.

### Z-index not centralized in CSS variables (Low)
Static z-index values are spread throughout component styles. The window manager handles dynamic stacking for `WinWindow` instances, but fixed-position overlay elements (tooltips, taskbar, modals) use hardcoded z-index values.

**Fix:** Define a z-index scale in `win2000.css`:
```css
--z-map: 1;
--z-tooltip: 100;
--z-overlay: 200;
--z-modal: 300;
--z-taskbar: 400;
```

### Touch event / Pointer Events migration (Low)
Current touch handling uses `touchstart`/`touchend` with `preventDefault()` to suppress the 300ms synthetic click. This is correct and intentional (see PROJECT_GUIDE.md § Common Gotchas). A migration to Pointer Events API would unify mouse/touch/stylus handling but is a non-trivial refactor with panzoom integration risk.

---

## Infrastructure / Config

### Cloudflare WebSocket heartbeat (Low)
Cloudflare's proxy has an idle connection timeout (~100s by default). Socket.io's default heartbeat interval is 25s ping + 20s timeout = 45s round-trip, which is safely under the limit — but this should be verified if Cloudflare settings change or a custom timeout is applied.

**Verify/set in `server/index.js`:**
```js
const io = new SocketIOServer(httpServer, {
  pingInterval: 25000,  // 25s (default)
  pingTimeout: 20000,   // 20s (default)
  ...
})
```

---

## Documentation (resolved)

- **Misleading migration note** — PROJECT_GUIDE.md previously implied "git push/pull never affects DB". Corrected in 2026-03-15 doc split: `server/migrate.js` runs on startup, so a `git pull` + restart **will** alter the schema if new migrations are present.
- **Missing .env documentation** — `.env.example` and PROJECT_GUIDE.md now document all required environment variables including `CORS_ORIGIN`.

---

## Follow-up Bug Fixes (2026-03-15) — all RESOLVED

### Fix 1+3: Bar labels disappear on zoom (FIXED: 2026-03-15)

`charRatio` was declared inside the `for` loop in `buildingLabelData` but referenced via closure in the inner `makeLabelItems` function — causing a `ReferenceError` and silently returning `{}`. Fixed by hoisting `charRatio` to computed scope.

### Fix 2+5: Partition buildings highlight dimly / wrong color (FIXED: 2026-03-15)

`updateBuildingColors()` applied `tag-dimmed` and street fill to partitioned buildings, causing dim combined appearance with partition rects. Fixed by detecting partitioned buildings and using neutral dark fill without `tag-dimmed`. Partition rect `:opacity` now responds to hover/select state (0.95 normal, 0.3 dimmed-but-hovered).

### Fix 3: Per-partition label settings for independent building mode (FIXED: 2026-03-15)

In "Different Building" mode, all partition slots shared building-level label settings. Added per-partition label fields (`labelOrientation`, `labelFontSize`, `labelTextRotation`, `labelOffsetX`, `labelOffsetY`) read in `buildingLabelData`, plus per-slot label controls in AdminPanel.vue.

### Fix 4: Empty map click doesn't return to all-bars view (FIXED: 2026-03-15)

Clicking empty map area cleared building selection but didn't reset the drawer. Fixed by emitting `'deselect'` from `handleMapClick` and handling it with `closeDrawer` in App.vue.

### Fix 6: Fav/Visited button style in Explorer (FIXED: 2026-03-15)

Explorer filter buttons used `WinButton` without icons. Replaced with `quickbar-btn` style matching `BarDirectory.vue`, with icon images and bevel/active CSS.

### Fix 7: Empty drawer when hovering different building while one selected (FIXED: 2026-03-15)

In building mode, `BarDrawer` only received the selected building's bars, so hovering a different building showed empty content. Added `allBars` prop to `BarDrawer` used for the hover display path. Desktop binding passes `:all-bars="bars"`.

### Fix 8: Bar search should show results in drawer (FIXED: 2026-03-15)

Search highlighted buildings on the map but did not populate the drawer. `handleSearchMatches` now sets `drawerBuildingBars` to the matched bars and shows "Search Results — X bars" in the drawer title. Clearing search returns drawer to all-bars mode.
