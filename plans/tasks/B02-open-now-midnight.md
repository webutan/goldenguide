# B02: "Open Now" wrong after midnight

**Phase 1** · Size **S** · Agent ~1–1.5h · Review ~15 min · Depends on: Q00 (tests) · Touches: `src/composables/useOpenNow.js`, `tests/openNow.test.js`

## Why
In `isBarOpen()` (`useOpenNow.js`), for a past-midnight schedule (close < open) the line `if (currentMinutes < closeMin) return true` uses **today's** hours for the early-morning window. Example: Monday closed, Tuesday 18:00–02:00. At 01:00 Tuesday the bar shows OPEN, but nothing was open on Monday night. The yesterday-carry-over branch below it is effectively unreachable. Also, `new Date(new Date().toLocaleString('en-US', {timeZone:'Asia/Tokyo'}))` is a fragile way to get Tokyo time.

## Steps
1. Refactor into a pure, exported function `isBarOpen(schedule, { day, minutes })`, where `day` is 0–6 and `minutes` is minutes since Tokyo midnight. Put it in `src/utils/openNow.js` so tests don't need Vue.
2. Correct logic:
   - **Early window** (before today's open time): open if *yesterday* was not a closed day, yesterday's hours wrap past midnight, and `minutes < yesterday.close`.
   - **Main window**: today not closed, `minutes >= today.open`, and either `close > open` with `minutes < close`, or wrap-around.
   - Handle `close === open` (24h) as always open, and a missing `open` or `close` as unknown (`null`).
3. Get Tokyo day/minutes with `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts()`.
4. Keep the composable's public API (`openBarIds`, `definitivelyOpenIds`, `closedBarIds`) unchanged.
5. Also export `minutesUntilClose(schedule, now)` and `nextOpen(schedule, now)`. F03 (timeline) and F05 (Gai-chan "closing soon") will use them.

## Acceptance criteria
- [ ] Table-driven tests cover: same-day hours, wrap-around, closed today, closed yesterday + wrap, 24h, missing schedule, an override day
- [ ] The Monday-closed / Tuesday 01:00 case returns `false`
- [ ] Map, drawer and directory "Open Now" filters behave as before for normal cases
