// Pure helpers that turn the stored building partitions + the bar list into
// what the map should draw.
//
// Stored shape (server `building_partitions.data`, keyed by building id):
//   { partitions: [{ barIds: ['12'], weight: 1, color, ... }], splitDirection, ... }
// Legacy slots use a single `barId` instead of `barIds`.
//
// `geometryV2: true` on a config opts that building into the corrected map
// geometry (slots split the building's own extent, badges and labels centred
// inside their slot; see layoutPartitionsV2 in mapGeometry.js). Configs without
// it were tuned by eye against the original geometry and keep it until an
// admin switches them over.
//
// Nothing here touches localStorage or the network; App.vue owns that.

/** Bar ids referenced by a slot, as strings (supports legacy `barId`). */
export function slotBarIds(slot) {
  if (!slot || typeof slot !== 'object') return []
  if (Array.isArray(slot.barIds)) return slot.barIds.map(String).filter(Boolean)
  return slot.barId != null && slot.barId !== '' ? [String(slot.barId)] : []
}

/**
 * `config` without the slot at `index`. Every other slot is kept exactly as
 * it is (bars, weight, colour, label settings), as are the building-level
 * settings. An index that is not a slot returns `config` unchanged.
 */
export function removeSlotAt(config, index) {
  const slots = config && Array.isArray(config.partitions) ? config.partitions : []
  if (!Number.isInteger(index) || index < 0 || index >= slots.length) return config
  return { ...config, partitions: slots.filter((_, i) => i !== index) }
}

/** { buildingId: [bar, ...] } for every placed bar. */
export function groupBarsByBuilding(bars) {
  const groups = {}
  for (const bar of bars || []) {
    if (!bar || !bar.building_id) continue
    if (!groups[bar.building_id]) groups[bar.building_id] = []
    groups[bar.building_id].push(bar)
  }
  return groups
}

function compareBars(a, b) {
  const fa = a.floor ?? 1
  const fb = b.floor ?? 1
  if (fa !== fb) return fa - fb
  const na = (a.name_en || a.name_jp || '').toLowerCase()
  const nb = (b.name_en || b.name_jp || '').toLowerCase()
  return na < nb ? -1 : na > nb ? 1 : 0
}

/**
 * Default config for a building: one slot per bar, by floor then name.
 * Defaults are generated, never tuned by hand, so they use the corrected
 * geometry straight away.
 */
export function defaultPartition(barsInBuilding) {
  return {
    partitions: [...barsInBuilding].sort(compareBars).map(bar => ({ barId: bar.id, weight: 1 })),
    splitDirection: 'auto',
    geometryV2: true,
  }
}

/**
 * Stored partitions plus an in-memory default for every building that holds
 * two or more bars and has no stored entry. A stored entry always wins, even
 * one with no slots (an admin can deliberately leave a building unsplit).
 */
export function withDefaultPartitions(stored, bars) {
  const result = { ...(stored || {}) }
  for (const [buildingId, barsInBuilding] of Object.entries(groupBarsByBuilding(bars))) {
    if (barsInBuilding.length <= 1) continue
    if (result[buildingId] !== undefined) continue
    result[buildingId] = defaultPartition(barsInBuilding)
  }
  return result
}

// Slot counts the ORIGINAL map geometry lays out so that every slot is visible
// inside the building: 1 (whole building), 2 (two halves) and 4 (2x2 grid).
// For any other count it divides a padded span much larger than the building
// by weight, so with 3 equal slots the middle one covers the whole building
// and the outer two cannot be seen or clicked. For a building still on that
// geometry (no `geometryV2`) an extra slot is only added when it lands on one
// of these counts. With `geometryV2` every count is fully visible.
const FULLY_VISIBLE_SLOT_COUNTS = new Set([1, 2, 4])

/**
 * Reconcile partition configs against the current bars.
 *
 * Returns `{ partitions, issues }`:
 * - `partitions` is what the map should render. Slot references to bars that
 *   no longer exist or now sit in another building are removed (a slot left
 *   with no bars because of that is dropped; a slot that was already empty is
 *   kept). Bars in the building that no slot references stay visible and
 *   clickable: they get one extra slot marked `synthetic: true`. A building
 *   without `geometryV2` only gets that slot when the original geometry can
 *   show that many slots; otherwise the bars join the last slot that has bars
 *   (which then lists them in `syntheticBarIds`).
 * - `issues[buildingId] = { unassigned: [barId], stale: [{ slotIndex, barId, reason }] }`
 *   for buildings that have something to report. `slotIndex` indexes the
 *   input config; `reason` is 'missing' or 'moved'.
 *
 * With no bars loaded yet there is nothing to reconcile against, so the input
 * is returned unchanged.
 */
export function reconcilePartitions(configs, bars) {
  const source = configs || {}
  if (!bars || bars.length === 0) return { partitions: source, issues: {} }

  const barById = {}
  for (const bar of bars) {
    if (bar) barById[String(bar.id)] = bar
  }
  const groups = groupBarsByBuilding(bars)

  const partitions = {}
  const issues = {}

  for (const [buildingId, config] of Object.entries(source)) {
    const slots = config && Array.isArray(config.partitions) ? config.partitions : []
    if (slots.length === 0) {
      partitions[buildingId] = config
      continue
    }

    const stale = []
    const referenced = new Set()
    const outSlots = []
    let changed = false

    slots.forEach((slot, slotIndex) => {
      const ids = slotBarIds(slot)
      const kept = []
      for (const id of ids) {
        const bar = barById[id]
        if (!bar) {
          stale.push({ slotIndex, barId: id, reason: 'missing' })
        } else if (bar.building_id !== buildingId) {
          stale.push({ slotIndex, barId: id, reason: 'moved' })
        } else {
          kept.push(id)
          referenced.add(id)
        }
      }
      if (kept.length === ids.length) {
        outSlots.push(slot)
        return
      }
      changed = true
      if (kept.length === 0) return
      const { barId: _legacy, ...rest } = slot
      outSlots.push({ ...rest, barIds: kept })
    })

    const unassigned = (groups[buildingId] || [])
      .filter(bar => !referenced.has(String(bar.id)))
      .sort(compareBars)
      .map(bar => String(bar.id))

    if (unassigned.length > 0) {
      changed = true
      if (config.geometryV2 || FULLY_VISIBLE_SLOT_COUNTS.has(outSlots.length + 1)) {
        outSlots.push({ barIds: unassigned, weight: 1, synthetic: true })
      } else {
        let target = outSlots.length - 1
        for (let i = outSlots.length - 1; i >= 0; i--) {
          if (slotBarIds(outSlots[i]).length > 0) { target = i; break }
        }
        const { barId: _legacy, ...rest } = outSlots[target]
        outSlots[target] = {
          ...rest,
          barIds: [...slotBarIds(outSlots[target]), ...unassigned],
          syntheticBarIds: unassigned,
        }
      }
    }

    partitions[buildingId] = changed ? { ...config, partitions: outSlots } : config
    if (unassigned.length > 0 || stale.length > 0) {
      issues[buildingId] = { unassigned, stale }
    }
  }

  return { partitions, issues }
}
