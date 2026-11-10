// Pure helpers for the map (GoldenGaiMap.vue and src/components/map/*).
// Nothing in here reads hover, search or filter state unless it is passed in,
// so the expensive partition geometry can be memoised separately from the
// cheap per-slot highlight/dim state.

// Street-based building colors
export const STREET_COLORS = {
  'hanazono-1':  '#8B2500',   // deep red-orange
  'hanazono-3':  '#005559',   // teal
  'hanazono-5':  '#3a5c20',   // olive green
  'hanazono-8':  '#6a1a48',   // dark wine
  'maneki-dori': '#4a3010',   // dark brown
}
export const STREET_COLOR_DEFAULT = '#1a0e2a'  // fallback: dark purple

// Neutral base under partition overlays (the overlay rects carry the colour)
export const PARTITIONED_BASE_FILL = '#111122'

// Floor color system — two variants per floor (primary, lighter)
export const FLOOR_COLORS = {
  '-3': ['#0f2040', '#1e3a5f'],
  '-2': ['#2a1845', '#3d2a6a'],
  '-1': ['#1a3868', '#2a508a'],
   1:  ['#934400', '#b85800'],
   2:  ['#005559', '#007a70'],
   3:  ['#4a6030', '#607840'],
   4:  ['#7a2050', '#9a3070'],
   5:  ['#5a3020', '#7a4838'],
}

export function floorColors(floor) {
  return FLOOR_COLORS[floor] ?? FLOOR_COLORS[1]
}

/**
 * IDs (as strings) of the bars that pass `passes`, or null when no filter is
 * active. Partition barIds come from <select> values, hence the strings.
 * @param {object[]} bars
 * @param {boolean} active  whether any filter is active
 * @param {(bar: object) => boolean} passes
 * @returns {Set<string> | null}
 */
export function passingBarIdSet(bars, active, passes) {
  if (!active) return null
  const out = new Set()
  for (const bar of bars || []) {
    if (passes(bar)) out.add(String(bar.id))
  }
  return out
}

// Bar IDs of one partition slot: `barIds` (array) or the legacy single `barId`.
export function slotBarIds(slot) {
  return slot.barIds
    ? slot.barIds.map(String).filter(Boolean)
    : (slot.barId ? [String(slot.barId)] : [])
}

/**
 * Geometry of every split building. Depends only on the partition data, the
 * building boxes and the bars (for the default slot colour).
 *
 * @param {Record<string, object>} partitions  buildingId → partition data
 * @param {Record<string, object>} buildingMap buildingId → { minX, minY, maxX, maxY, width, height }
 * @param {Record<string, object>} barById     String(bar.id) → bar
 * @param {number} mapRotation                 rotation of the whole map in degrees
 * @returns {Record<string, { rects: object[], angle: number, cx: number, cy: number, dir: string, count: number }>}
 */
export function computePartitionGeometry(partitions, buildingMap, barById, mapRotation = 0) {
  const result = {}

  for (const [bldgId, data] of Object.entries(partitions || {})) {
    const bldg = buildingMap[bldgId]
    if (!bldg || !data.partitions || data.partitions.length === 0) continue

    const { minX, minY, maxX, maxY, width, height } = bldg
    const count = data.partitions.length
    const dir = count === 3 ? 'horizontal'
      : data.splitDirection === 'auto'
        ? (width > height ? 'vertical' : 'horizontal')
        : (data.splitDirection || 'horizontal')

    // SVG-space angle: user's splitAngle offset compensates for the map's own rotation
    // so that splitAngle=0 means "aligned with the screen", not the raw SVG axes.
    const svgAngle = (data.splitAngle || 0) - mapRotation

    const splitX = minX + (maxX - minX) * ((data.splitCenterX ?? 50) / 100)
    const splitY = minY + (maxY - minY) * ((data.splitCenterY ?? 50) / 100)
    // Extend well beyond bounding box so rects fully cover the building after clipping
    const pad = Math.max(width, height) * 2

    const weights = data.partitions.map(p => p.weight || 1)
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    const rects = data.partitions.map((p, i) => {
      const barIds = slotBarIds(p)
      const firstBar = barIds.map(id => barById[id]).filter(Boolean)[0] ?? null

      let x, y, w, h
      if (count === 4) {
        const col = i % 2
        const row = Math.floor(i / 2)
        x = col === 0 ? splitX - pad : splitX
        y = row === 0 ? splitY - pad : splitY
        w = pad
        h = pad
      } else if (dir === 'vertical') {
        const totalPad = pad * 2
        const weightBefore = weights.slice(0, i).reduce((a, b) => a + b, 0)
        x = splitX - pad + totalPad * weightBefore / totalWeight
        y = splitY - pad
        w = totalPad * weights[i] / totalWeight
        h = pad * 2
      } else {
        const totalPad = pad * 2
        const weightBefore = weights.slice(0, i).reduce((a, b) => a + b, 0)
        x = splitX - pad
        y = splitY - pad + totalPad * weightBefore / totalWeight
        w = pad * 2
        h = totalPad * weights[i] / totalWeight
      }

      // Color: use per-partition custom color first, then derive from first bar's floor
      const color = p.color
        || (firstBar ? floorColors(firstBar.floor ?? 1)[0] : STREET_COLOR_DEFAULT)

      // Visible center: midpoint of this rect clamped to building bounding box
      const vcx = Math.max(minX, Math.min(maxX, x + w / 2))
      const vcy = Math.max(minY, Math.min(maxY, y + h / 2))

      return {
        x, y, width: w, height: h,
        color,
        barIds, partIndex: i,
        visibleCenter: { x: vcx, y: vcy },
      }
    })
    result[bldgId] = { rects, angle: svgAngle, cx: splitX, cy: splitY, dir, count }
  }
  return result
}

/**
 * Highlight / dim state of every partition slot, keyed by building then slot
 * index. Cheap: no geometry, just set lookups.
 *
 * - dimmed: no bar assigned, or filters active and no bar of the slot passes
 * - highlighted: a bar of the slot is hovered in the drawer or search-matched
 *
 * @param {ReturnType<typeof computePartitionGeometry>} geometry
 * @param {{ barById: Record<string, object>, passingBarIds: Set<string>|null,
 *   hoveredBarId: string|null, searchBarIds: Set<string> }} state
 * @returns {Record<string, { dimmed: boolean, highlighted: boolean }[]>}
 */
export function computePartitionSlotState(geometry, { barById, passingBarIds, hoveredBarId, searchBarIds }) {
  const result = {}
  const hovered = hoveredBarId != null ? String(hoveredBarId) : null
  const searching = !!searchBarIds && searchBarIds.size > 0
  for (const [bldgId, pdata] of Object.entries(geometry)) {
    result[bldgId] = pdata.rects.map(({ barIds }) => {
      const dimmed = barIds.length === 0
        ? true
        : passingBarIds
          ? !barIds.some(id => barById[id] && passingBarIds.has(id))
          : false
      const isHoveredBar = hovered != null && barIds.includes(hovered)
      const isSearchHL = searching && barIds.some(id => searchBarIds.has(id))
      return { dimmed, highlighted: isHoveredBar || isSearchHL }
    })
  }
  return result
}

/**
 * Declarative style of the building paths of the base map.
 * Only buildings that differ from the untouched SVG are listed.
 *
 * @param {{ barsByBuilding: Record<string, object[]>, partitions: Record<string, object>,
 *   dominantStreet: Record<string, string|null>, passingBarIds: Set<string>|null,
 *   searchHighlighted: Set<string> }} input
 * @returns {Record<string, { fill: string|null, classes: string }>}
 *   `classes` is a space-separated subset of BUILDING_STATE_CLASSES
 */
export function computeBuildingStyles({ barsByBuilding, partitions, dominantStreet, passingBarIds, searchHighlighted }) {
  const result = {}
  for (const [bldgId, barsInBldg] of Object.entries(barsByBuilding)) {
    if (!barsInBldg || barsInBldg.length === 0) continue
    const pdata = partitions?.[bldgId]
    if (pdata?.partitions?.length) {
      // Partition rects handle per-rect coloring; use a neutral base and never dim
      result[bldgId] = { fill: PARTITIONED_BASE_FILL, classes: 'has-bars' }
      continue
    }
    const fill = pdata?.buildingColor || STREET_COLORS[dominantStreet[bldgId]] || STREET_COLOR_DEFAULT
    const dimmed = passingBarIds !== null && !barsInBldg.some(b => passingBarIds.has(String(b.id)))
    result[bldgId] = { fill, classes: dimmed ? 'has-bars tag-dimmed' : 'has-bars' }
  }
  if (searchHighlighted && searchHighlighted.size > 0) {
    for (const bldgId of searchHighlighted) {
      const cur = result[bldgId]
      result[bldgId] = cur
        ? { fill: cur.fill, classes: `${cur.classes} search-highlight` }
        : { fill: null, classes: 'search-highlight' }
    }
  }
  return result
}

// Classes owned by the building-style apply step (hover/selection are separate)
export const BUILDING_STATE_CLASSES = ['has-bars', 'tag-dimmed', 'search-highlight']

const NO_STYLE = { fill: null, classes: '' }

/**
 * Changes needed to go from the applied styles to the wanted ones.
 * @param {Record<string, { fill: string|null, classes: string }>} applied
 * @param {Record<string, { fill: string|null, classes: string }>} wanted
 * @returns {{ id: string, fill: string|null, classes: string }[]}
 */
export function diffBuildingStyles(applied, wanted) {
  const changes = []
  for (const [id, next] of Object.entries(wanted)) {
    const prev = applied[id] || NO_STYLE
    if (prev.fill !== next.fill || prev.classes !== next.classes) {
      changes.push({ id, fill: next.fill, classes: next.classes })
    }
  }
  for (const id of Object.keys(applied)) {
    if (!(id in wanted)) {
      const prev = applied[id]
      if (prev.fill !== null || prev.classes !== '') changes.push({ id, ...NO_STYLE })
    }
  }
  return changes
}
