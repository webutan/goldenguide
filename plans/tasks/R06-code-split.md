# R06: Lazy-load heavy windows

**Phase 3** · Size **S** · Agent ~1h · Review ~10 min · Depends on: none · Touches: `src/App.vue`, `vite.config.js`

## Why
The main chunk is 373 kB (123 kB gzipped). AdminPanel (1.9k lines), DatabaseTable, ChatWindow (+ socket.io-client), FeedWindow, ReviewsWindow and GaiChanDialogue are all eagerly imported, even though most visitors never open admin.

## Steps
1. `defineAsyncComponent(() => import(...))` for AdminPanel, DatabaseTable, ChatWindow, FeedWindow, BarTwitterPanel, ReviewsWindow, ContactWindow. Also import `socket.io-client` dynamically inside `useChat`.
2. Show a tiny Win95 hourglass (`/cursors/wait.ani` exists; or a "Loading…" status bar) while a window chunk loads.
3. Report the before/after chunk sizes.

## Acceptance criteria
- [ ] Main chunk reduced by ≥ 25%
- [ ] Each lazy window opens correctly on first click (desktop + mobile)
