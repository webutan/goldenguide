# B09: New bars missing from existing partitions; stale partition cache

**Phase 1** · Size **S–M** · Agent ~1.5–2h · Review ~20 min · Depends on: B06 · Touches: `src/App.vue` (partition watcher + loader), `GoldenGaiMap.vue` (read-only checks)

## Why
- The auto-partition `watch(bars)` in `App.vue` (~166–202) only creates partitions for buildings with **no** entry. If a bar is later placed in a building that already has partitions, it isn't in any slot: it doesn't appear on the map overlay or in labels/badges, and in "independent building" mode it can't be clicked.
- Partitions merge `localStorage` + server with "server wins per key". Buildings removed on the server live on forever in the local cache, and auto-created partitions are local-only, so each visitor may see different splits.

## Steps
1. On load, the server becomes the source of truth. Replace the local cache with the server response; use localStorage only as an offline fallback when the fetch fails.
2. Auto-generated partitions are computed in memory (a `computed` that merges server data with generated defaults). They are **not** written to localStorage or the server unless an admin edits them.
3. Reconcile: for each building with a partition config, if bars exist in that building but aren't referenced by any slot, list them (a) in the admin panel as "Unassigned in this building" with a one-click "add slot", and (b) for public display, add them to a synthetic extra slot so they're visible and clickable.
4. If a slot references a bar that no longer exists or has moved buildings, ignore it when rendering (it already filters `Boolean`) and flag it in the admin panel.

## Acceptance criteria
- [ ] Placing a bar in an already-partitioned building makes it visible and clickable on the map immediately after reload
- [ ] Deleting a building's partition on the server (DB) removes it for clients after reload
- [ ] The admin panel shows unassigned/stale bars per building
