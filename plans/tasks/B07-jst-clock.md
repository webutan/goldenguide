# B07: Taskbar clock in Tokyo time

**Phase 1** · Size **S** · Agent ~30–45 min · Review ~5 min · Depends on: none · Touches: `src/components/win2000/WinTaskbar.vue`

## Why
The clock shows the visitor's local time (`WinTaskbar.vue:39`), but "Open Now" uses Tokyo time. Tourists planning from abroad see a clock that doesn't match which bars are open.

## Steps
1. Show JST (`Asia/Tokyo`, 24h, `HH:MM`) in the tray. When the visitor isn't in JST, show a tiny "JST" label next to it.
2. Hover (desktop) or tap (mobile) shows a Win95-style tooltip: "Tokyo 23:41 · Your time 15:41 (Sun)".
3. Tick every 15 s and clear the interval on unmount (the current `setInterval` is never cleared).
4. Clicking the clock opens a small Win95 "Date/Time Properties" style window (optional; skip if it gets big).

## Acceptance criteria
- [ ] With the browser timezone set to `America/New_York` (Playwright `timezoneId`), the tray shows Tokyo time plus the JST label
- [ ] With the timezone set to `Asia/Tokyo`, there's no JST label
