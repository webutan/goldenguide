# Agent Brief — read this before any task in `plans/tasks/`

You are implementing **one** task from `plans/tasks/`. This brief is the shared context; the task file is your spec. If the two conflict, the task file wins. If the task file conflicts with the code (e.g. a line number moved), trust the code and note it in your summary.

## The project in one paragraph

Golden Gai Map is a bilingual (EN/JP) bar guide for Golden Gai, Shinjuku. It looks like a **Windows 95/2000 desktop on a CRT monitor**, with a visual-novel guide character called **Gai-chan**. Frontend: Vue 3 (`<script setup>`, Composition API) + Vite, no router, no Pinia. Backend: Express + PostgreSQL + Socket.io in `server/`. Deployed with Docker Compose (`db`, `api`, `web`=nginx). Read `PROJECT_GUIDE.md` (architecture) and `UI_STYLE_GUIDE.md` (visual system) before touching UI.

## Non-negotiable: the look

The retro Win95 style is the product. Anything you add must look like it shipped with Windows 95.

- Use the existing primitives in `src/components/win2000/` (`WinWindow`, `WinButton`, `WinTabs`, `WinCheckbox`, `WinTextInput`, `WinScrollContainer`, `WinTitleBar`) and the CSS variables in `src/styles/win2000.css`. Don't add a UI library, rounded corners, gradients-for-decoration, drop shadows (other than the 4-layer bevel), or modern fonts.
- Bevels: the 4-layer inset `box-shadow` pattern from `WinButton.vue`.
- Fonts: `var(--win-font)` (W95FA) for Latin, PixelMplus for Japanese. Font smoothing stays off.
- Pixel icons use `image-rendering: pixelated`; photos use `auto`. Reuse icons in `public/icons/` before adding new ones; new icons must be 16×16 / 32×32 pixel-art style.
- CRT/terminal pieces use the orange palette in `UI_STYLE_GUIDE.md §2`.
- Never use `window.alert/confirm/prompt` in new code. Once task **R05** lands, use `useDialog()`; before that, use an inline `WinWindow`.
- New desktop "apps" register through `useWindowManager()` and open from `handleOpenApp` in `src/App.vue` + an icon in `src/components/DesktopView.vue` (and/or the Start menu in `WinTaskbar.vue`).
- Every app must also work on mobile (≤768px). The pattern there is the full-screen `mobile-feed-panel` used for Feed/Chat/Reviews in `App.vue`. Touch targets ≥ 40px.

## i18n

Every user-visible string goes through `t()` from `src/composables/useI18n.js` with both `en` and `jp`. If you can't write natural Japanese, write your best attempt and add `// TODO(jp-review)` next to it.

## Data and persistence rules

- **Migrations:** append a new entry to the `MIGRATIONS` array in `server/migrate.js` with the next number (`015-...`, `016-...`). Never edit an existing migration. Migrations run automatically on API start. The `sql/` folder is stale; don't add files there.
- **localStorage:** keys are prefixed `golden-gai-`. After task **B06** lands, use `src/utils/storage.js` (`readJSON`/`writeJSON`); never call bare `JSON.parse(localStorage...)`.
- **Admin endpoints** use the `admin` middleware (`server/middleware/admin.js`). Public write endpoints must be rate-limited (after **S02**, use the shared limiter in `server/middleware/rateLimits.js`).
- User-generated text is always rendered with `{{ }}` interpolation, never `v-html`.

## How to verify (required before you finish)

1. `npm run build` must succeed with no new warnings, apart from the existing chunk-size warning (until R06).
2. If `npm test` exists (task **Q00**), it must pass, and you should add tests for any pure logic you touch.
3. For backend changes: `node --check` each changed server file. If Postgres is available (`docker compose up db`), start the API with `npm run dev:server` and exercise the endpoint with `curl`.
4. For UI changes: run `npm run dev` and look at the change in Chromium via Playwright (pre-installed: `require('playwright')`), at **1280×800 and 390×844 (mobile)**. Save screenshots to your scratchpad and describe what you saw. In dev mode the onboarding flow always runs (`DEV` guard in `App.vue`), so click through it or temporarily stub it, but don't commit the stub.
5. Re-read the "Acceptance criteria" in your task and tick each one off in your final summary.

## Local environment tips

- **Database:** if `psql` is installed, a local Postgres works without Docker: create a `golden_gai` database and put `DATABASE_URL=postgres://...`, `ADMIN_PASSWORD=devpass` in `.env` (git-ignored; a worktree needs its own copy). `npm run dev:server` runs the migrations. For data, `ADMIN_PASSWORD=devpass node scripts/dev-seed.mjs` fills an empty DB from `scripts/data/bars.json` (placeholder buildings/prices/schedules, 4 inactive bars).
- **Don't share mutable state with other agents:** if your task writes to the DB (partitions, reviews, bars), copy the database (`createdb x && pg_dump golden_gai | psql x`) and run your own API on another `PORT`.
- **Skipping onboarding in Playwright:** the `DEV` guard only applies to `npm run dev`. Against `npm run build && npx vite preview`, set these before the page loads (`context.addInitScript`): `golden-gai-lang=en`, `golden-gai-first-time=no`, `golden-gai-rules-accepted=1`, `golden-gai-booted=1`.
- **Driving the UI:** desktop icons open on double-click; the taskbar buttons switch views on single click; the admin toggle is in the Start menu (first taskbar button).
- A `locator.click` on an element under a Teleported dropdown often needs `dispatchEvent('mousedown')`, because several menus act on mousedown.

## Service worker (after G03)

Production builds register a service worker (`src/sw.js`, rules in `src/utils/swRules.js`). Navigations are network-first; only a fixed list of public GETs is cached. A new public GET endpoint that should work offline needs a rule there (and a test in `tests/pwa.test.js`); admin, per-visitor and write endpoints must never be cached. The worker is off in `npm run dev`. When testing a production build in Playwright, a stale worker from an earlier build can serve old files: use a fresh browser context.

## Git

- Work on the branch you are given. Keep commits scoped to your task ID, e.g. `fix(B02): open-now uses yesterday's hours after midnight`.
- Don't reformat files you aren't changing. Don't touch files outside your task's "Files" list unless you have to, and if you do, say why.
- Don't put model names or identifiers in commits, code or docs.
- If you discover a separate bug, don't fix it. List it under "Found while working" in your summary.

## Your final summary must contain

- What changed (files + one line each)
- How you verified (commands run, screenshots taken, what you saw)
- Acceptance criteria checklist
- Anything left undone, risky, or found while working
