import { describe, it, expect } from 'vitest'
import {
  computePartitionGeometry,
  findPartitionAt,
  rotateAbout,
  parsePolygonPath,
  pointInPolygon,
  slotVisibleCenter,
  mapToScreen,
  screenToMap,
  panToCenter,
  clampPan,
} from '../src/utils/mapGeometry.js'

const box = (minX, minY, w, h) => ({ minX, minY, maxX: minX + w, maxY: minY + h, width: w, height: h })
const slots = (n, over = {}) => Array.from({ length: n }, (_, i) => ({ barIds: [String(i + 1)], weight: 1, ...over }))
const MAP_ROTATION = -21

// Bounding box of a set of rings, in the shape buildings.json uses
function bboxOf(rings) {
  const pts = rings.flat()
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

// A w×h rectangle that is upright on screen, i.e. turned by -MAP_ROTATION in
// map coordinates (which is how the real buildings sit in the SVG).
function screenAlignedRect(cx, cy, w, h) {
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => rotateAbout(cx + x, cy + y, -MAP_ROTATION, cx, cy))
}

// Sample points inside a polygon, with the slot that covers each
function tallyHits(pdata, rings, n = 40) {
  const b = bboxOf(rings)
  const counts = {}
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = b.minX + b.width * (i + 0.5) / n
      const y = b.minY + b.height * (j + 0.5) / n
      if (!pointInPolygon(x, y, rings)) continue
      const hit = findPartitionAt(pdata, x, y)
      const key = hit ? hit.partIndex : 'none'
      counts[key] = (counts[key] || 0) + 1
    }
  }
  return counts
}

describe('rotateAbout', () => {
  it('rotates like SVG rotate() and is undone by the opposite angle', () => {
    const p = rotateAbout(10, 0, 90, 0, 0)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(10)
    const q = rotateAbout(p.x, p.y, -90, 0, 0)
    expect(q.x).toBeCloseTo(10)
    expect(q.y).toBeCloseTo(0)
    expect(rotateAbout(3, 4, 0, 100, 100)).toEqual({ x: 3, y: 4 })
  })
})

describe('parsePolygonPath / pointInPolygon', () => {
  it('reads absolute M/L/Z paths, one ring per subpath', () => {
    const rings = parsePolygonPath('M 0 0 L 10 0 L 10 10 L 0 10 L 0 0 Z M 2 2 L 4 2 L 4 4 L 2 4 Z')
    expect(rings).toHaveLength(2)
    expect(rings[0][1]).toEqual({ x: 10, y: 0 })
    expect(rings[1]).toHaveLength(4)
    expect(parsePolygonPath('M 1.5e1 -2.25 L 3 4 L 5,6 Z')[0]).toEqual([{ x: 15, y: -2.25 }, { x: 3, y: 4 }, { x: 5, y: 6 }])
  })

  it('refuses anything that is not a plain polygon', () => {
    expect(parsePolygonPath('M 0 0 C 1 1 2 2 3 3 Z')).toBeNull()
    expect(parsePolygonPath('m 0 0 l 1 1 z')).toBeNull()
    expect(parsePolygonPath('')).toBeNull()
    expect(parsePolygonPath(null)).toBeNull()
  })

  it('tests points with the even-odd rule (holes are outside)', () => {
    const rings = parsePolygonPath('M 0 0 L 10 0 L 10 10 L 0 10 Z M 2 2 L 4 2 L 4 4 L 2 4 Z')
    expect(pointInPolygon(8, 8, rings)).toBe(true)
    expect(pointInPolygon(3, 3, rings)).toBe(false)
    expect(pointInPolygon(11, 5, rings)).toBe(false)
  })
})

describe('computePartitionGeometry without geometryV2 (original layout)', () => {
  const buildingMap = { b: box(0, 0, 200, 100) }

  it('is not affected by building shapes', () => {
    const shapes = { b: { rings: [[{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }]] } }
    for (const n of [1, 2, 3, 4, 5]) {
      const config = { b: { partitions: slots(n), splitDirection: 'auto', splitAngle: 15, splitCenterX: 40 } }
      const plain = computePartitionGeometry(config, buildingMap, {}, MAP_ROTATION)
      expect(computePartitionGeometry(config, buildingMap, {}, MAP_ROTATION, shapes)).toEqual(plain)
      expect(plain.b.v2).toBeUndefined()
      expect(plain.b.rects[0].visibleSize).toBeUndefined()
    }
  })

  it('still shows only the middle slot of three (the reason geometryV2 exists)', () => {
    const rings = [screenAlignedRect(100, 50, 120, 80)]
    const config = { b: { partitions: slots(3), splitDirection: 'horizontal' } }
    const g = computePartitionGeometry(config, { b: bboxOf(rings) }, {}, MAP_ROTATION)
    expect(Object.keys(tallyHits(g.b, rings))).toEqual(['1'])
  })
})

describe('computePartitionGeometry with geometryV2', () => {
  const rings = [screenAlignedRect(1000, 800, 240, 120)] // wide on screen
  const buildingMap = { b: bboxOf(rings) }
  const shapes = { b: { rings } }
  const layout = (config) => computePartitionGeometry({ b: { geometryV2: true, ...config } }, buildingMap, {}, MAP_ROTATION, shapes).b

  it('marks the layout and keeps the split frame aligned with the screen', () => {
    const g = layout({ partitions: slots(3), splitDirection: 'vertical' })
    expect(g.v2).toBe(true)
    expect(g.angle).toBe(21)
    expect(g.count).toBe(3)
    expect(g.rects.map(r => r.partIndex)).toEqual([0, 1, 2])
  })

  it('every slot of 2, 3, 4, 5 and 7 gets an equal share of the building, in both directions', () => {
    for (const n of [2, 3, 4, 5, 7]) {
      for (const splitDirection of ['horizontal', 'vertical']) {
        const g = layout({ partitions: slots(n), splitDirection })
        const counts = tallyHits(g, rings)
        expect(Object.keys(counts).sort()).toEqual(Array.from({ length: n }, (_, i) => String(i)))
        const values = Object.values(counts)
        const total = values.reduce((a, b) => a + b, 0)
        for (const v of values) expect(Math.abs(v / total - 1 / n)).toBeLessThan(0.04)
      }
    }
  })

  it('honours the split direction for three slots (the original layout forces horizontal)', () => {
    expect(layout({ partitions: slots(3), splitDirection: 'vertical' }).dir).toBe('vertical')
    expect(layout({ partitions: slots(3), splitDirection: 'horizontal' }).dir).toBe('horizontal')
  })

  it('auto splits along the longer side of the building as seen on screen', () => {
    expect(layout({ partitions: slots(3), splitDirection: 'auto' }).dir).toBe('vertical')
    const tall = [screenAlignedRect(1000, 800, 100, 260)]
    const g = computePartitionGeometry(
      { b: { geometryV2: true, partitions: slots(3), splitDirection: 'auto' } },
      { b: bboxOf(tall) }, {}, MAP_ROTATION, { b: { rings: tall } },
    ).b
    expect(g.dir).toBe('horizontal')
  })

  it('divides by weight', () => {
    const g = layout({ partitions: [{ barIds: ['1'], weight: 1 }, { barIds: ['2'], weight: 3 }], splitDirection: 'vertical' })
    const counts = tallyHits(g, rings, 60)
    expect(counts[1] / counts[0]).toBeGreaterThan(2.7)
    expect(counts[1] / counts[0]).toBeLessThan(3.3)
    // visible sizes in the split frame: 240 wide building split 60 / 180
    expect(g.rects[0].visibleSize.width).toBeCloseTo(60, 3)
    expect(g.rects[1].visibleSize.width).toBeCloseTo(180, 3)
    expect(g.rects[0].visibleSize.height).toBeCloseTo(120, 3)
  })

  it('puts every badge / label centre inside its own slot and inside the building', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      for (const splitDirection of ['horizontal', 'vertical']) {
        const g = layout({ partitions: slots(n), splitDirection })
        for (const rect of g.rects) {
          const c = rect.visibleCenter
          expect(pointInPolygon(c.x, c.y, rings)).toBe(true)
          expect(findPartitionAt(g, c.x, c.y).partIndex).toBe(rect.partIndex)
        }
      }
    }
  })

  it('centres the badges of three side-by-side slots at 1/6, 3/6 and 5/6 of the building', () => {
    const g = layout({ partitions: slots(3), splitDirection: 'vertical' })
    const expected = [-80, 0, 80].map(dx => rotateAbout(1000 + dx, 800, -MAP_ROTATION, 1000, 800))
    g.rects.forEach((rect, i) => {
      expect(rect.visibleCenter.x).toBeCloseTo(expected[i].x, 0)
      expect(rect.visibleCenter.y).toBeCloseTo(expected[i].y, 0)
    })
  })

  it('moves the split lines with splitCenterX/Y and never pushes a slot off the building', () => {
    const centred = layout({ partitions: slots(2), splitDirection: 'vertical' })
    const shifted = layout({ partitions: slots(2), splitDirection: 'vertical', splitCenterX: 70 })
    expect(shifted.rects[0].visibleSize.width).toBeGreaterThan(centred.rects[0].visibleSize.width)
    const extreme = layout({ partitions: slots(3), splitDirection: 'vertical', splitCenterX: 100, splitCenterY: 100 })
    expect(extreme.rects.every(r => r.visibleSize.width >= 0)).toBe(true)
    expect(tallyHits(extreme, rings).none).toBeUndefined()
  })

  it('follows splitAngle: the split frame turns, the slots stay equal', () => {
    const g = layout({ partitions: slots(3), splitDirection: 'vertical', splitAngle: 30 })
    expect(g.angle).toBe(51)
    const counts = tallyHits(g, rings)
    expect(Object.keys(counts).sort()).toEqual(['0', '1', '2'])
  })

  it('matches the original layout for two and four equal slots of a symmetric building', () => {
    for (const n of [2, 4]) {
      for (const splitDirection of ['horizontal', 'vertical']) {
        const config = { partitions: slots(n), splitDirection }
        const v1 = computePartitionGeometry({ b: config }, buildingMap, {}, MAP_ROTATION).b
        const v2 = layout(config)
        const b = buildingMap.b
        for (let i = 0; i < 25; i++) {
          for (let j = 0; j < 25; j++) {
            const x = b.minX + b.width * (i + 0.5) / 25
            const y = b.minY + b.height * (j + 0.5) / 25
            if (!pointInPolygon(x, y, rings)) continue
            expect(findPartitionAt(v2, x, y).partIndex).toBe(findPartitionAt(v1, x, y).partIndex)
          }
        }
      }
    }
  })

  it('falls back to the bounding box when the building outline is unknown', () => {
    const g = computePartitionGeometry(
      { b: { geometryV2: true, partitions: slots(3), splitDirection: 'vertical' } },
      { b: box(0, 0, 300, 100) }, {}, 0,
    ).b
    expect(g.rects.map(r => r.visibleCenter)).toEqual([{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 250, y: 50 }])
    expect(findPartitionAt(g, 20, 90).partIndex).toBe(0)
    expect(findPartitionAt(g, 299, 1).partIndex).toBe(2)
  })

  it('keeps colours, bar ids and the slot index like the original layout', () => {
    const barById = { 1: { id: 1, floor: 2 } }
    const g = computePartitionGeometry(
      { b: { geometryV2: true, partitions: [{ barId: 1 }, { barIds: ['9'], color: '#abcdef' }, { barIds: [] }] } },
      { b: box(0, 0, 300, 100) }, barById, 0,
    ).b
    expect(g.rects.map(r => r.barIds)).toEqual([['1'], ['9'], []])
    expect(g.rects[0].color).toBe('#005559')
    expect(g.rects[1].color).toBe('#abcdef')
    expect(g.rects[2].color).toBe('#1a0e2a')
  })
})

describe('geometryV2 on an L-shaped building', () => {
  // Upright L (map rotation 0 for readability): 300 wide at the bottom, 100 wide at the top
  //   (0,0)──(100,0)
  //     │       │
  //     │    (100,200)──(300,200)
  //     │                   │
  //   (0,300)───────────(300,300)
  const rings = [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 300 }, { x: 0, y: 300 }]]
  const buildingMap = { l: box(0, 0, 300, 300) }
  const layout = (config, shape = { rings }) =>
    computePartitionGeometry({ l: { geometryV2: true, ...config } }, buildingMap, {}, 0, { l: shape }).l

  it('keeps every centre inside the building where the middle of the slot is not', () => {
    // three columns: the middle of columns 2 and 3 (y = 150) is in the empty corner
    const g = layout({ partitions: slots(3), splitDirection: 'vertical' })
    const centres = g.rects.map(r => r.visibleCenter)
    expect(centres.map(c => c.x)).toEqual([50, 150, 250])
    expect(centres[0].y).toBeCloseTo(150, 0)
    expect(centres[1].y).toBeCloseTo(250, 0)
    expect(centres[2].y).toBeCloseTo(250, 0)
    // the original layout would have clamped to the bbox and landed outside
    expect(pointInPolygon(150, 150, rings)).toBe(false)
  })

  it('does the same for stacked slots and for the 2x2 grid', () => {
    for (const config of [
      { partitions: slots(3), splitDirection: 'horizontal' },
      { partitions: slots(5), splitDirection: 'horizontal' },
      { partitions: slots(4) },
    ]) {
      const g = layout(config)
      for (const rect of g.rects) {
        if (rect.partIndex === 1 && g.count === 4) continue // top-right quadrant is entirely outside the L
        expect(pointInPolygon(rect.visibleCenter.x, rect.visibleCenter.y, rings)).toBe(true)
        expect(findPartitionAt(g, rect.visibleCenter.x, rect.visibleCenter.y).partIndex).toBe(rect.partIndex)
      }
    }
  })

  it('uses the exact contains() test when the map supplies one', () => {
    const calls = []
    const contains = (x, y) => { calls.push([x, y]); return pointInPolygon(x, y, rings) }
    const g = layout({ partitions: slots(3), splitDirection: 'vertical' }, { rings, contains })
    expect(calls.length).toBeGreaterThan(0)
    expect(g.rects[1].visibleCenter.x).toBe(150)
    expect(g.rects[1].visibleCenter.y).toBeCloseTo(250, 0)
  })
})

describe('slotVisibleCenter', () => {
  const bbox = box(0, 0, 100, 100)
  const id = (u, v) => ({ x: u, y: v })

  it('is the clamped middle of the box without a contains test', () => {
    expect(slotVisibleCenter({ u0: 0, u1: 40, v0: 0, v1: 100 }, 'v', id, null, bbox)).toEqual({ x: 20, y: 50 })
    expect(slotVisibleCenter({ u0: 80, u1: 140, v0: 0, v1: 100 }, 'v', id, null, bbox)).toEqual({ x: 100, y: 50 })
  })

  it('takes the middle of the longest inside stretch of the centre line', () => {
    const inside = (x, y) => y >= 60 // only the lower part is building
    expect(slotVisibleCenter({ u0: 0, u1: 40, v0: 0, v1: 100 }, 'v', id, inside, bbox).y).toBeCloseTo(80, 0)
  })

  it('searches off the centre line, then gives up on the bbox clamp', () => {
    const corner = (x, y) => x < 12 && y < 12
    const p = slotVisibleCenter({ u0: 0, u1: 100, v0: 0, v1: 100 }, 'v', id, corner, bbox)
    expect(corner(p.x, p.y)).toBe(true)
    expect(slotVisibleCenter({ u0: 0, u1: 100, v0: 0, v1: 100 }, 'v', id, () => false, bbox)).toEqual({ x: 50, y: 50 })
  })
})

describe('findPartitionAt', () => {
  it('returns null without geometry or outside every rect', () => {
    expect(findPartitionAt(null, 0, 0)).toBeNull()
    expect(findPartitionAt({ rects: [{ x: 0, y: 0, width: 1, height: 1 }], angle: 0, cx: 0, cy: 0 }, 5, 5)).toBeNull()
  })

  it('undoes the rotation the rects are drawn with', () => {
    const pdata = { rects: [{ x: 0, y: -5, width: 10, height: 10, partIndex: 7 }], angle: 90, cx: 0, cy: 0 }
    // drawn rect covers x ∈ [-5, 5], y ∈ [0, 10] after rotate(90)
    expect(findPartitionAt(pdata, 0, 8).partIndex).toBe(7)
    expect(findPartitionAt(pdata, 8, 0)).toBeNull()
  })
})

describe('screenToMap / mapToScreen', () => {
  const frame = { mapRotation: MAP_ROTATION, mapCx: 1807.06, mapCy: 2048, vbMinX: -613.9, vbMinY: -511.5 }
  const views = {
    plain: { ...frame, tx: -82, ty: 33, scale: 0.12, userRotation: 0, width: 390, height: 792, left: 0, top: 52, zoom: 1 },
    rotated: { ...frame, tx: -440, ty: -480, scale: 0.27, userRotation: 45, width: 390, height: 792, left: 0, top: 52, zoom: 1 },
    zoomed: { ...frame, tx: 129, ty: -290, scale: 0.22, userRotation: 0, width: 1024, height: 608, left: 0, top: 0, zoom: 1.25 },
    all: { ...frame, tx: 10, ty: -20, scale: 0.5, userRotation: -130, width: 800, height: 500, left: 40, top: 60, zoom: 1.25 },
  }

  it('round-trips in every combination of pan, zoom, user rotation and CSS zoom', () => {
    for (const view of Object.values(views)) {
      for (const p of [{ x: 0, y: 0 }, { x: 1511, y: 2726 }, { x: 3614, y: 4096 }]) {
        const back = screenToMap(mapToScreen(p, view), view)
        expect(back.x).toBeCloseTo(p.x, 6)
        expect(back.y).toBeCloseTo(p.y, 6)
      }
    }
  })

  it('with no rotation and no pan is just the viewBox offset', () => {
    const view = { mapRotation: 0, mapCx: 0, mapCy: 0, vbMinX: -100, vbMinY: -50, tx: 0, ty: 0, scale: 1, userRotation: 0, width: 400, height: 300, left: 0, top: 0, zoom: 1 }
    expect(mapToScreen({ x: 0, y: 0 }, view)).toEqual({ x: 100, y: 50 })
    expect(mapToScreen({ x: 20, y: 30 }, { ...view, scale: 2, tx: 5, ty: 7 })).toEqual({ x: 245, y: 167 })
    expect(screenToMap({ x: 245, y: 167 }, { ...view, scale: 2, tx: 5, ty: 7 })).toEqual({ x: 20, y: 30 })
  })

  it('applies the CSS zoom of the page after everything else', () => {
    const view = { mapRotation: 0, mapCx: 0, mapCy: 0, vbMinX: 0, vbMinY: 0, tx: 0, ty: 0, scale: 1, userRotation: 0, width: 400, height: 300, left: 10, top: 20, zoom: 1.25 }
    expect(mapToScreen({ x: 100, y: 40 }, view)).toEqual({ x: 135, y: 70 })
  })

  it('turns about the middle of the container for the user rotation', () => {
    const view = { mapRotation: 0, mapCx: 0, mapCy: 0, vbMinX: 0, vbMinY: 0, tx: 0, ty: 0, scale: 1, userRotation: 90, width: 400, height: 300, left: 0, top: 0, zoom: 1 }
    // the middle stays put
    expect(mapToScreen({ x: 200, y: 150 }, view)).toEqual({ x: 200, y: 150 })
    // a point 50 to the right of the middle ends up 50 below it
    const p = mapToScreen({ x: 250, y: 150 }, view)
    expect(p.x).toBeCloseTo(200)
    expect(p.y).toBeCloseTo(200)
  })

  it('a tap resolves to the same map point whatever the user rotation', () => {
    const target = { x: 1511, y: 2726 }
    for (const userRotation of [0, 45, -90, 170]) {
      const view = { ...views.rotated, userRotation }
      const screen = mapToScreen(target, view)
      const back = screenToMap(screen, view)
      expect(back.x).toBeCloseTo(target.x, 6)
      expect(back.y).toBeCloseTo(target.y, 6)
    }
  })
})

describe('panToCenter', () => {
  const frame = { mapRotation: MAP_ROTATION, mapCx: 1807.06, mapCy: 2048, vbMinX: -613.9, vbMinY: -511.5 }

  it('puts the map point in the middle of the container at any user rotation and CSS zoom', () => {
    const target = { x: 1511, y: 2726 }
    for (const userRotation of [0, 45, -120]) {
      for (const zoom of [1, 1.25]) {
        const view = { ...frame, tx: 3, ty: -900, scale: 0.4, userRotation, width: 390, height: 792, left: 0, top: 52, zoom }
        const pan = panToCenter(target, view)
        const screen = mapToScreen(target, { ...view, tx: pan.x, ty: pan.y })
        expect(screen.x).toBeCloseTo(view.left + view.width / 2 * zoom, 6)
        expect(screen.y).toBeCloseTo(view.top + view.height / 2 * zoom, 6)
      }
    }
  })
})

describe('clampPan', () => {
  // the rule the map used before the user rotation was taken into account
  const original = ({ tx, ty, scale, width, height }, mapW, mapH) => {
    const w = mapW * scale, h = mapH * scale
    return {
      x: w >= width ? Math.min(0, Math.max(tx, width - w)) : (width - w) / 2,
      y: h >= height ? Math.min(0, Math.max(ty, height - h)) : (height - h) / 2,
    }
  }

  it('is exactly the original rule when the map is not rotated', () => {
    for (const scale of [0.05, 0.12, 0.5, 2]) {
      for (const [tx, ty] of [[0, 0], [500, 500], [-5000, -5000], [-120.5, 33.25]]) {
        const view = { tx, ty, scale, width: 390, height: 792, userRotation: 0 }
        expect(clampPan(view, 4842, 5119)).toEqual(original(view, 4842, 5119))
      }
    }
  })

  it('lets a rotated map be panned until its corner reaches the middle window', () => {
    const view = { tx: 500, ty: 500, scale: 0.5, width: 400, height: 800, userRotation: 45 }
    const p = clampPan(view, 4000, 4000)
    // unrotated the left / top edge stops at 0; rotated it may come further in
    expect(p.x).toBeGreaterThan(0)
    expect(p.y).toBeGreaterThan(0)
    expect(p.x).toBeLessThan(view.width / 2)
    expect(p.y).toBeLessThan(view.height / 2)
    // and a pan that is already inside the limits is left alone
    const ok = { ...view, tx: -700, ty: -600 }
    expect(clampPan(ok, 4000, 4000)).toEqual({ x: -700, y: -600 })
  })

  it('changes smoothly with the angle (no jump right after 0°)', () => {
    const base = { tx: 500, ty: 500, scale: 0.5, width: 400, height: 800 }
    const at0 = clampPan({ ...base, userRotation: 0 }, 4000, 4000)
    const at1 = clampPan({ ...base, userRotation: 0.5 }, 4000, 4000)
    expect(Math.abs(at1.x - at0.x)).toBeLessThan(10)
    expect(Math.abs(at1.y - at0.y)).toBeLessThan(10)
  })

  it('still centres a map smaller than the window', () => {
    const p = clampPan({ tx: 0, ty: 0, scale: 0.01, width: 400, height: 800, userRotation: 30 }, 4000, 4000)
    expect(p).toEqual({ x: 180, y: 380 })
  })
})
