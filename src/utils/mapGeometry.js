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
 * @param {Record<string, BuildingShape> | null} [shapes] buildingId → outline of the
 *   building (see parsePolygonPath). Only read for buildings with
 *   `geometryV2: true`; without a shape those fall back to the bounding box.
 * @returns {Record<string, { rects: object[], angle: number, cx: number, cy: number, dir: string, count: number }>}
 *
 * A building whose stored config has `geometryV2: true` is laid out by
 * layoutPartitionsV2 (splits the building's own extent, centres inside the
 * slot). Every other building keeps the original layout below, unchanged:
 * admins tuned weights and label offsets by eye against it.
 */
export function computePartitionGeometry(partitions, buildingMap, barById, mapRotation = 0, shapes = null) {
  const result = {}

  for (const [bldgId, data] of Object.entries(partitions || {})) {
    const bldg = buildingMap[bldgId]
    if (!bldg || !data.partitions || data.partitions.length === 0) continue

    if (data.geometryV2) {
      result[bldgId] = layoutPartitionsV2(data, bldg, barById, mapRotation, shapes?.[bldgId] || null)
      continue
    }

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
 * @typedef {{ rings: {x:number,y:number}[][], contains?: (x:number, y:number) => boolean }} BuildingShape
 * `rings` are the outline polygons in map coordinates; `contains` is an exact
 * point-in-fill test (the map passes SVGGeometryElement.isPointInFill). Without
 * it the rings are tested with the even-odd rule.
 */

/** Rotate (x, y) by `deg` degrees around (cx, cy), same sense as SVG rotate(). */
export function rotateAbout(x, y, deg, cx = 0, cy = 0) {
  if (!deg) return { x, y }
  const rad = deg * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const dx = x - cx, dy = y - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

/**
 * Outline of a path made only of absolute M / L / Z commands (every building
 * of the map is one), as one ring of points per subpath. Null for anything else.
 * @param {string} d
 * @returns {{x:number,y:number}[][] | null}
 */
export function parsePolygonPath(d) {
  if (typeof d !== 'string' || !/^[MLZ\d\s.,eE+-]*$/.test(d)) return null
  const rings = []
  for (const sub of d.split('M')) {
    const nums = sub.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g)
    if (!nums) continue
    if (nums.length % 2 !== 0) return null
    const ring = []
    for (let i = 0; i < nums.length; i += 2) ring.push({ x: Number(nums[i]), y: Number(nums[i + 1]) })
    if (ring.length >= 3) rings.push(ring)
  }
  return rings.length > 0 ? rings : null
}

/** Even-odd point-in-polygon test over one or more rings. */
export function pointInPolygon(x, y, rings) {
  let inside = false
  for (const ring of rings || []) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
  }
  return inside
}

const CENTRE_SAMPLES = 32

// Middle (as a 0..1 fraction of the segment) of the longest stretch for which
// `inside` holds, or null when no sample is inside. The stretch is found from
// CENTRE_SAMPLES samples; its two ends are then refined by bisection so the
// middle does not depend on where the samples happen to fall.
function longestInsideRun(inside) {
  const at = (i) => (i + 0.5) / CENTRE_SAMPLES
  let first = -1, last = -1, bestLen = 0, start = -1
  for (let i = 0; i <= CENTRE_SAMPLES; i++) {
    const on = i < CENTRE_SAMPLES && inside(at(i))
    if (on && start < 0) start = i
    if (!on && start >= 0) {
      if (i - start > bestLen) { bestLen = i - start; first = start; last = i - 1 }
      start = -1
    }
  }
  if (first < 0) return null
  // edge between an outside fraction and an inside one
  const edge = (out, inn) => {
    for (let k = 0; k < 12; k++) {
      const mid = (out + inn) / 2
      if (inside(mid)) inn = mid
      else out = mid
    }
    return (out + inn) / 2
  }
  const lo = first === 0 ? (inside(0) ? 0 : edge(0, at(0))) : edge(at(first - 1), at(first))
  const hi = last === CENTRE_SAMPLES - 1 ? (inside(1) ? 1 : edge(1, at(last))) : edge(at(last + 1), at(last))
  return (lo + hi) / 2
}

/**
 * A point inside the building for the badge / label of one slot.
 *
 * `box` is the visible part of the slot in the split frame (the frame the
 * rects are defined in, before the rotate(angle, cx, cy) they are drawn with).
 * The centre line of the box (along `lineAxis`, i.e. across the split) is
 * sampled and the middle of its longest stretch inside the building wins. That
 * also handles L-shaped buildings, where the middle of the box can be outside.
 * Falls back to the other axis, then a coarse grid, then the box centre
 * clamped to the bounding box.
 *
 * @param {{ u0: number, u1: number, v0: number, v1: number }} box
 * @param {'u'|'v'} lineAxis  axis the centre line runs along
 * @param {(u: number, v: number) => {x:number,y:number}} toMap  split frame → map coordinates
 * @param {((x: number, y: number) => boolean) | null} contains
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} bbox
 * @returns {{ x: number, y: number }} map coordinates
 */
export function slotVisibleCenter(box, lineAxis, toMap, contains, bbox) {
  const um = (box.u0 + box.u1) / 2, vm = (box.v0 + box.v1) / 2
  const clampToBbox = (p) => ({
    x: Math.max(bbox.minX, Math.min(bbox.maxX, p.x)),
    y: Math.max(bbox.minY, Math.min(bbox.maxY, p.y)),
  })
  if (!contains) return clampToBbox(toMap(um, vm))
  const at = (u, v) => { const p = toMap(u, v); return contains(p.x, p.y) }
  const alongU = (f) => box.u0 + (box.u1 - box.u0) * f
  const alongV = (f) => box.v0 + (box.v1 - box.v0) * f
  const tryLine = (axis) => {
    if (axis === 'u') {
      const f = longestInsideRun(t => at(alongU(t), vm))
      return f === null ? null : toMap(alongU(f), vm)
    }
    const f = longestInsideRun(t => at(um, alongV(t)))
    return f === null ? null : toMap(um, alongV(f))
  }
  const onLine = tryLine(lineAxis) || tryLine(lineAxis === 'u' ? 'v' : 'u')
  if (onLine) return onLine
  // Nothing on either centre line: the inside point of a coarse grid nearest the middle
  let best = null, bestD = Infinity
  const N = 8
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const u = alongU((i + 0.5) / N), v = alongV((j + 0.5) / N)
      if (!at(u, v)) continue
      const d = (u - um) ** 2 + (v - vm) ** 2
      if (d < bestD) { bestD = d; best = toMap(u, v) }
    }
  }
  return best || clampToBbox(toMap(um, vm))
}

// Slot colour: per-partition custom colour first, else the floor colour of its first bar
function slotColor(slot, barIds, barById) {
  const firstBar = barIds.map(id => barById[id]).filter(Boolean)[0] ?? null
  return slot.color || (firstBar ? floorColors(firstBar.floor ?? 1)[0] : STREET_COLOR_DEFAULT)
}

/**
 * Layout of one split building whose config has `geometryV2: true`.
 *
 * The slots divide the building's own extent by weight. The extent is measured
 * in the split frame: the map axes rotated by `splitAngle - mapRotation`, so
 * screen-aligned at splitAngle 0. Every slot is therefore visible and
 * clickable for any slot count, in both split directions:
 *
 * - 4 slots: 2x2 grid crossing at the middle of the extent (weights ignored,
 *   as in the original layout)
 * - otherwise strips: 'vertical' = side by side, 'horizontal' = stacked;
 *   'auto' splits along the longer side of the extent
 *
 * splitCenterX/Y (percent of the bbox, 50 = centred) shift the split lines by
 * the distance the split point is from the bbox centre. The first and last
 * rect reach past the extent so the clipped overlay always covers the whole
 * building, and together the rects tile the frame, so findPartitionAt agrees
 * with what is drawn.
 */
function layoutPartitionsV2(data, bldg, barById, mapRotation, shape) {
  const { minX, minY, maxX, maxY, width, height } = bldg
  const slots = data.partitions
  const count = slots.length
  const angle = (data.splitAngle || 0) - mapRotation
  // Pivot of the split frame: the bbox centre
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const toFrame = (x, y) => rotateAbout(x, y, -angle, cx, cy)
  const toMap = (u, v) => rotateAbout(u, v, angle, cx, cy)

  const rings = shape?.rings?.length ? shape.rings : null
  const outline = rings
    ? rings.flat()
    : [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }]
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity
  for (const p of outline) {
    const f = toFrame(p.x, p.y)
    if (f.x < uMin) uMin = f.x
    if (f.x > uMax) uMax = f.x
    if (f.y < vMin) vMin = f.y
    if (f.y > vMax) vMax = f.y
  }
  const contains = shape?.contains || (rings ? (x, y) => pointInPolygon(x, y, rings) : null)

  const dir = data.splitDirection === 'vertical' || data.splitDirection === 'horizontal'
    ? data.splitDirection
    : ((uMax - uMin) > (vMax - vMin) ? 'vertical' : 'horizontal')

  // Split-centre shift in the split frame (0 when centred)
  const split = toFrame(
    minX + (maxX - minX) * ((data.splitCenterX ?? 50) / 100),
    minY + (maxY - minY) * ((data.splitCenterY ?? 50) / 100),
  )
  const du = split.x - cx
  const dv = split.y - cy
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const pad = Math.max(width, height) * 2

  // boxes[i] = rect of slot i in the split frame
  const boxes = []
  if (count === 4) {
    const um = clamp((uMin + uMax) / 2 + du, uMin, uMax)
    const vm = clamp((vMin + vMax) / 2 + dv, vMin, vMax)
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2)
      boxes.push({
        u0: col === 0 ? uMin - pad : um, u1: col === 0 ? um : uMax + pad,
        v0: row === 0 ? vMin - pad : vm, v1: row === 0 ? vm : vMax + pad,
      })
    }
  } else {
    const weights = slots.map(p => (Number(p.weight) > 0 ? Number(p.weight) : 1))
    const total = weights.reduce((a, b) => a + b, 0)
    const lo = dir === 'vertical' ? uMin : vMin
    const hi = dir === 'vertical' ? uMax : vMax
    const d = dir === 'vertical' ? du : dv
    const bounds = [lo - pad]
    let acc = 0
    for (let i = 0; i < count - 1; i++) {
      acc += weights[i]
      bounds.push(clamp(lo + (hi - lo) * acc / total + d, lo, hi))
    }
    bounds.push(hi + pad)
    for (let i = 0; i < count; i++) {
      boxes.push(dir === 'vertical'
        ? { u0: bounds[i], u1: bounds[i + 1], v0: vMin - pad, v1: vMax + pad }
        : { u0: uMin - pad, u1: uMax + pad, v0: bounds[i], v1: bounds[i + 1] })
    }
  }

  const lineAxis = count === 4 ? 'u' : (dir === 'vertical' ? 'v' : 'u')
  const rects = slots.map((p, i) => {
    const b = boxes[i]
    const barIds = slotBarIds(p)
    // The part of the slot within the building's extent
    const visible = {
      u0: clamp(b.u0, uMin, uMax), u1: clamp(b.u1, uMin, uMax),
      v0: clamp(b.v0, vMin, vMax), v1: clamp(b.v1, vMin, vMax),
    }
    return {
      x: b.u0, y: b.v0, width: b.u1 - b.u0, height: b.v1 - b.v0,
      color: slotColor(p, barIds, barById),
      barIds, partIndex: i,
      visibleCenter: slotVisibleCenter(visible, lineAxis, toMap, contains, bldg),
      // Size of the visible part in the split frame (used to fit the labels)
      visibleSize: { width: visible.u1 - visible.u0, height: visible.v1 - visible.v0 },
    }
  })
  return { rects, angle, cx, cy, dir, count, v2: true }
}

/**
 * The slot drawn at a point (map coordinates), or null. The rects live in the
 * split frame, so the point is rotated into it first (the inverse of the
 * rotate(angle, cx, cy) they are drawn with).
 * @param {{ rects: object[], angle: number, cx: number, cy: number } | null | undefined} pdata
 */
export function findPartitionAt(pdata, x, y) {
  if (!pdata) return null
  const p = rotateAbout(x, y, -(pdata.angle || 0), pdata.cx, pdata.cy)
  for (const r of pdata.rects) {
    if (p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height) return r
  }
  return null
}

// === Screen ↔ map transforms ===
//
// The chain from map coordinates (the raw SVG, what buildings.json uses) to the
// viewport, written out so nothing depends on getScreenCTM (which is unreliable
// in Safari when an HTML ancestor has a CSS transform):
//
//   map point
//   → rotate(mapRotation) about (mapCx, mapCy)        the <g> that straightens the map
//   → minus (vbMinX, vbMinY)                           viewBox origin; 1 unit = 1 CSS px
//   → times scale, plus (tx, ty)                       panzoom, transform-origin 0 0
//   → rotate(userRotation) about (width/2, height/2)   two-finger rotation of the wrap
//   → times zoom, plus (left, top)                     CSS zoom of an ancestor + container origin
//
// `view`: { mapRotation, mapCx, mapCy, vbMinX, vbMinY, tx, ty, scale,
//           userRotation, width, height, left, top, zoom }
// width / height are the container's size in its own CSS px (clientWidth),
// left / top its viewport position (getBoundingClientRect) and zoom the ratio
// between the two (1 unless an ancestor is CSS-zoomed).

/** Map coordinates → viewport (client) coordinates. */
export function mapToScreen(point, view) {
  const r = rotateAbout(point.x, point.y, view.mapRotation || 0, view.mapCx, view.mapCy)
  const lx = (r.x - view.vbMinX) * view.scale + view.tx
  const ly = (r.y - view.vbMinY) * view.scale + view.ty
  const q = rotateAbout(lx, ly, view.userRotation || 0, view.width / 2, view.height / 2)
  const zoom = view.zoom || 1
  return { x: (view.left || 0) + q.x * zoom, y: (view.top || 0) + q.y * zoom }
}

/** Viewport (client) coordinates → map coordinates. Inverse of mapToScreen. */
export function screenToMap(point, view) {
  const zoom = view.zoom || 1
  const qx = (point.x - (view.left || 0)) / zoom
  const qy = (point.y - (view.top || 0)) / zoom
  const l = rotateAbout(qx, qy, -(view.userRotation || 0), view.width / 2, view.height / 2)
  const vx = (l.x - view.tx) / view.scale + view.vbMinX
  const vy = (l.y - view.ty) / view.scale + view.vbMinY
  return rotateAbout(vx, vy, -(view.mapRotation || 0), view.mapCx, view.mapCy)
}

/**
 * The panzoom translation that puts a map point at the middle of the
 * container at the view's current scale. (The user rotation turns about that
 * same middle, so it does not move the target.)
 * @returns {{ x: number, y: number }}
 */
export function panToCenter(point, view) {
  const r = rotateAbout(point.x, point.y, view.mapRotation || 0, view.mapCx, view.mapCy)
  return {
    x: view.width / 2 - (r.x - view.vbMinX) * view.scale,
    y: view.height / 2 - (r.y - view.vbMinY) * view.scale,
  }
}

/**
 * Viewport (client) coordinates → the un-rotated coordinates of the container
 * that panzoom works in (its zoomTo / smoothZoom take a point in this space).
 */
export function screenToWrap(point, view) {
  const zoom = view.zoom || 1
  return rotateAbout(
    (point.x - (view.left || 0)) / zoom,
    (point.y - (view.top || 0)) / zoom,
    -(view.userRotation || 0), view.width / 2, view.height / 2,
  )
}

/**
 * The panzoom translation that puts a map point under a viewport point at the
 * view's scale and user rotation (the view's own tx / ty are ignored). This is
 * what keeps the map under the finger: drag, pinch and twist all anchor the
 * map point they started on to wherever the finger(s) are now.
 * @returns {{ x: number, y: number }}
 */
export function panToPoint(mapPoint, screenPoint, view) {
  const at = mapToScreen(mapPoint, { ...view, tx: 0, ty: 0 })
  const zoom = view.zoom || 1
  // the translation is applied before the user rotation and the CSS zoom
  return rotateAbout((screenPoint.x - at.x) / zoom, (screenPoint.y - at.y) / zoom, -(view.userRotation || 0))
}

/** An angle in degrees brought into (-180, 180]. */
export function normalizeAngle(deg) {
  const a = ((deg % 360) + 360) % 360
  return a > 180 ? a - 360 : a
}

/**
 * Whether text should be turned half a turn because the map has been rotated.
 * `angle` is the direction the text runs on screen with the map straight
 * (0 = left to right, 90 = top to bottom), `turn` how far the map is turned.
 * Text is left alone while it still reads within `limit` degrees of upright.
 * Text that is beyond the limit to begin with was set that way on purpose and
 * is never flipped.
 */
export function flipsWhenTurned(angle, turn, limit = 100) {
  const readable = a => Math.abs(normalizeAngle(a)) <= limit
  return readable(angle) && !readable(angle + turn)
}

/**
 * Two touch points as one gesture reading: the point between the fingers,
 * how far apart they are and the direction from the first to the second.
 * @returns {{ x: number, y: number, distance: number, angle: number }} angle in degrees
 */
export function touchSpan(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    distance: Math.hypot(dx, dy),
    angle: Math.atan2(dy, dx) * 180 / Math.PI,
  }
}

/**
 * Zoom of a pinch: the zoom it started at times how much the fingers have
 * spread, kept within the zoom limits. Fingers on the same spot (a distance of
 * 0, at the start or now) leave the zoom as it was instead of producing NaN.
 */
export function pinchScale(startScale, startDistance, distance, minScale, maxScale) {
  const ratio = startDistance > 0 && distance > 0 ? distance / startDistance : 1
  return Math.min(maxScale, Math.max(minScale, startScale * ratio))
}

/**
 * Rotation to settle on when a twist ends: straight (0) when the map is
 * within `tolerance` degrees of it, so a pinch does not leave the map
 * slightly crooked; otherwise the angle itself, normalised.
 */
export function snapRotation(deg, tolerance) {
  const a = normalizeAngle(deg)
  return Math.abs(a) <= tolerance ? 0 : a
}

/**
 * Pan limits. `view` needs tx, ty, scale, width, height, userRotation;
 * mapW / mapH are the unscaled size of the map (the viewBox).
 *
 * Not rotated: the map always covers the container (or is centred when it is
 * smaller). Once the user has rotated the map that rule would lock its corners
 * off screen, so the map only has to cover a smaller window in the middle of
 * the container: the container scaled by `k`, the largest factor at which it
 * still fits inside itself when turned by the rotation. k is 1 at 0°, so the
 * limits change smoothly with the angle.
 * @returns {{ x: number, y: number }} the clamped translation
 */
export function clampPan(view, mapW, mapH) {
  const { tx, ty, scale, width, height } = view
  const w = mapW * scale
  const h = mapH * scale
  let k = 1
  if (view.userRotation) {
    const rad = view.userRotation * Math.PI / 180
    const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad))
    k = Math.min(width / (width * c + height * s), height / (width * s + height * c))
  }
  const iw = width * k
  const ih = height * k
  return {
    x: w >= iw ? Math.min((width - iw) / 2, Math.max(tx, (width + iw) / 2 - w)) : (width - w) / 2,
    y: h >= ih ? Math.min((height - ih) / 2, Math.max(ty, (height + ih) / 2 - h)) : (height - h) / 2,
  }
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
