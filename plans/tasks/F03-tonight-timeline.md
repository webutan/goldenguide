# F03: "Who's open tonight": timeline window

**Phase 5** · Size **M** · Agent ~3h · Review ~20 min · Depends on: B02 (exported schedule helpers), B03 · Touches: new `src/components/TonightWindow.vue`, `DesktopView.vue`, `App.vue`

## Why
Answers the #1 question ("what's open now / later?") at a glance, and looks great as a retro chart.

## Steps
1. A window styled like a Win95 Gantt/scheduler. The x-axis runs 18:00 → 06:00 JST, with one row per bar that opens tonight. Bars are sunken bevel strips coloured by street (reuse `STREET_COLORS` from the map; move them to `src/utils/streets.js`). A red "now" line updates each minute.
2. Toolbar: sort (opens earliest / closes latest / name), street filter, "Use map filters" toggle, day picker (Tonight / Tomorrow / any weekday). Unknown-hours bars go to a collapsed "Hours unknown" group at the bottom.
3. Click a row to open the bar card (same handler as the directory).
4. Mobile: rows become a vertical list with a mini horizontal bar each; horizontal scroll on the time axis is allowed only inside the window.
5. Virtualise if > 150 rows (simple windowing) to keep it smooth.

## Acceptance criteria
- [ ] The "now" line position is correct in JST regardless of the browser timezone
- [ ] Rows for past-midnight bars render correctly across the 00:00 boundary
- [ ] Clicking opens the bar
