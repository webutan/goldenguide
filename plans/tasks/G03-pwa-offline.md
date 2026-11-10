# G03: Offline mode / installable app ("Installing GAI OS…")

**Phase 4** · Size **M** · Agent ~3–4h · Review ~30 min · Depends on: P01 (smaller assets), R06 · Touches: `vite.config.js`, `package.json`, new `public/manifest.webmanifest`, icons in `public/icons/app/`, `src/App.vue`, new `src/components/InstallWizard.vue`

## Why
Signal inside Golden Gai's alleys is bad, and visitors are often on roaming data. If the map, bar list and rules work offline, it becomes the app people keep on their phone.

## Steps
1. Add `vite-plugin-pwa` (Workbox):
   - Precache the app shell, fonts, map SVG and icons.
   - Runtime-cache `/api/bars`, `/api/tags`, `/api/partitions` and `/api/annotations` with **stale-while-revalidate**.
   - Cache `/uploads/` with cache-first and a cap of ~60 entries.
   - Don't cache `/api/admin`, chat or POSTs.
2. Manifest: name "Golden Gai Map", short "GaiMap", `display: standalone`, the purple theme colour from tokens, and 192/512 pixel-art icons (upscale `gaios.ico` with nearest-neighbour; no smoothing).
3. Install UX as a Win95 setup wizard (`InstallWizard.vue`): "Welcome to the GAI OS Setup Wizard" → Next → progress bar → "Finish". It triggers `beforeinstallprompt` on Android/desktop. On iOS it shows illustrated "Share → Add to Home Screen" steps. Offer it from the Start menu ("Install GAI OS…") and once after a user's 2nd visit. Never on the first visit.
4. Offline indicator: a tray icon in the taskbar (the network-PCs icon with a red ✕ when offline) and a balloon "You're offline: showing saved data from <time>". Chat, reviews and feed show a polite offline message.
5. Update flow: when a new SW is waiting, show a Win95 dialog "A new version of GAI OS is available. Restart now?".

## Acceptance criteria
- [ ] Lighthouse PWA installability passes
- [ ] Load once, go offline (Playwright `context.setOffline(true)`), reload: the map, directory, bar cards and rules all work
- [ ] The admin and chat sockets aren't intercepted by the SW
