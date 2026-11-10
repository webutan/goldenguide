# B03: One shared bar-filter function (fixes map/drawer/directory disagreeing)

**Phase 1** · Size **M** · Agent ~2–3h · Review ~30 min · Depends on: Q00 · Touches: new `src/utils/barFilters.js`, `GoldenGaiMap.vue`, `BarDrawer.vue`, `BarDirectory.vue`, `App.vue`, `tests/barFilters.test.js`

## Why
`barPassesFilters` is copy-pasted three times and the copies disagree:
- `BarDrawer.vue` (~line 63) ignores AND/OR tag mode and always uses OR, and `App.vue` doesn't pass `tagMode` to `BarDrawer`. With "AND" selected, the map and the list show different bars.
- `BarDirectory.vue` (~line 74) **excludes** bars with no price once a min price is set. The map and drawer **include** them.
- Price fields are TEXT, so values like `"¥1,000"` become `NaN` and are treated as unknown.

## Decision (already made)
Bars with an unknown price **pass** price filters, but they get a small "?" price marker in lists (BarDrawer cards, directory rows) so users know the price is unconfirmed. Use `Number(String(v).replace(/[^\d.]/g, ''))` style parsing so `"¥1,000"` → 1000.

## Steps
1. Create `src/utils/barFilters.js`:
   - `parsePrice(v) → number|null`
   - `barPasses(bar, filters, ctx) → boolean`, where `filters = { tags, tagMode, chargeMin, chargeMax, drinkMin, drinkMax, floor, openNow, favorites, visited }` and `ctx = { openBarIds, isFavorited, isVisited }`
   - `hasActiveFilters(filters)`
2. Replace all three local copies with it. The map and drawer build `filters` from props; the directory builds it from its local `dir*` refs.
3. Pass `:tag-mode="tagMode"` to both `BarDrawer` instances in `App.vue` and add the prop to `BarDrawer`.
4. Add the "?" marker for unknown price.
5. Tests: tag AND/OR, each price bound, unparseable price, floor 0/negative floors, open-now, favorites/visited.

## Acceptance criteria
- [ ] Only one implementation of filter logic remains (`grep -rn "function barPassesFilters" src` returns nothing)
- [ ] With tags A+B in AND mode, the map's highlighted buildings and the drawer's list agree
- [ ] Directory and map agree for every filter combination you try
- [ ] Tests pass
