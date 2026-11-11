import { describe, it, expect } from 'vitest'
import {
  STREET_COLORS,
  STREET_COLOR_DEFAULT,
  PARTITIONED_BASE_FILL,
  floorColors,
  passingBarIdSet,
  slotBarIds,
  computePartitionGeometry,
  computePartitionSlotState,
  computeBuildingStyles,
  diffBuildingStyles,
} from '../src/utils/mapGeometry.js'

const box = (minX, minY, w, h) => ({ minX, minY, maxX: minX + w, maxY: minY + h, width: w, height: h })
const buildingMap = { wide: box(0, 0, 200, 100), tall: box(1000, 0, 100, 200) }
const barById = {
  1: { id: 1, floor: 1 },
  2: { id: 2, floor: 2 },
  3: { id: 3, floor: -1 },
}

describe('passingBarIdSet', () => {
  const bars = [{ id: 1 }, { id: 2 }, { id: 3 }]
  it('is null when no filter is active and never calls the filter', () => {
    let calls = 0
    expect(passingBarIdSet(bars, false, () => { calls++; return true })).toBeNull()
    expect(calls).toBe(0)
  })
  it('holds string IDs and calls the filter once per bar', () => {
    let calls = 0
    const set = passingBarIdSet(bars, true, (b) => { calls++; return b.id !== 2 })
    expect([...set]).toEqual(['1', '3'])
    expect(calls).toBe(3)
  })
})

describe('slotBarIds', () => {
  it('supports barIds arrays and the legacy single barId', () => {
    expect(slotBarIds({ barIds: [5, '6', ''] })).toEqual(['5', '6'])
    expect(slotBarIds({ barId: 7 })).toEqual(['7'])
    expect(slotBarIds({})).toEqual([])
    expect(slotBarIds({ barIds: [], barId: 7 })).toEqual([])
  })
})

describe('computePartitionGeometry', () => {
  it('skips unknown buildings and buildings without slots', () => {
    const g = computePartitionGeometry(
      { nope: { partitions: [{ barId: 1 }] }, wide: { partitions: [] }, tall: { buildingColor: '#fff' } },
      buildingMap, barById, 0
    )
    expect(g).toEqual({})
  })

  it('auto-splits a wide building vertically and a tall one horizontally', () => {
    const data = { partitions: [{ barId: 1 }, { barId: 2 }], splitDirection: 'auto' }
    const g = computePartitionGeometry({ wide: data, tall: data }, buildingMap, barById, 0)
    expect(g.wide.dir).toBe('vertical')
    expect(g.tall.dir).toBe('horizontal')
    // wide: pad = 400, split at the centre (100, 50)
    expect(g.wide.rects.map(r => [r.x, r.y, r.width, r.height])).toEqual([[-300, -350, 400, 800], [100, -350, 400, 800]])
    expect(g.tall.rects.map(r => [r.x, r.y, r.width, r.height])).toEqual([[650, -300, 800, 400], [650, 100, 800, 400]])
    expect(g.wide).toMatchObject({ cx: 100, cy: 50, count: 2 })
  })

  it('honours weights, three slots are always horizontal, four make a 2×2 grid', () => {
    const three = computePartitionGeometry(
      { wide: { partitions: [{ barId: 1, weight: 2 }, { barId: 2 }, { barIds: [] }], splitDirection: 'vertical' } },
      buildingMap, barById, 0
    ).wide
    expect(three.dir).toBe('horizontal')
    expect(three.rects.map(r => r.height)).toEqual([400, 200, 200])
    expect(three.rects.map(r => r.y)).toEqual([-350, 50, 250])

    const four = computePartitionGeometry(
      { wide: { partitions: [{}, {}, {}, {}], splitCenterX: 25, splitCenterY: 100 } },
      buildingMap, barById, 0
    ).wide
    expect(four.rects.map(r => [r.x, r.y, r.width, r.height])).toEqual([
      [-350, -300, 400, 400], [50, -300, 400, 400], [-350, 100, 400, 400], [50, 100, 400, 400],
    ])
  })

  it('takes the slot colour from the slot, else the first bar floor, else the default', () => {
    const g = computePartitionGeometry(
      { wide: { partitions: [{ barId: 2, color: '#123456' }, { barIds: [99, 3] }, { barIds: [] }] } },
      buildingMap, barById, 0
    ).wide
    expect(g.rects.map(r => r.color)).toEqual(['#123456', floorColors(-1)[0], STREET_COLOR_DEFAULT])
    expect(g.rects.map(r => r.barIds)).toEqual([['2'], ['99', '3'], []])
    expect(g.rects.map(r => r.partIndex)).toEqual([0, 1, 2])
  })

  it('compensates the map rotation in the angle and clamps visible centres to the building', () => {
    const g = computePartitionGeometry(
      { wide: { partitions: [{ barId: 1 }, { barId: 2 }], splitDirection: 'vertical', splitAngle: 10 } },
      buildingMap, barById, -21
    ).wide
    expect(g.angle).toBe(31)
    expect(g.rects.map(r => r.visibleCenter)).toEqual([{ x: 0, y: 50 }, { x: 200, y: 50 }])
  })

  it('carries no hover / search / filter state', () => {
    const g = computePartitionGeometry({ wide: { partitions: [{ barId: 1 }] } }, buildingMap, barById, 0)
    expect(Object.keys(g.wide.rects[0]).sort()).toEqual(
      ['barIds', 'color', 'height', 'partIndex', 'visibleCenter', 'width', 'x', 'y']
    )
  })
})

describe('computePartitionSlotState', () => {
  const geometry = computePartitionGeometry(
    { wide: { partitions: [{ barId: 1 }, { barIds: [2, 3] }, { barIds: [] }, { barId: 404 }] } },
    buildingMap, barById, 0
  )
  const state = (over = {}) => computePartitionSlotState(geometry, {
    barById, passingBarIds: null, hoveredBarId: null, searchBarIds: new Set(), ...over,
  }).wide

  it('dims only empty slots when no filter is active', () => {
    expect(state()).toEqual([
      { dimmed: false, highlighted: false },
      { dimmed: false, highlighted: false },
      { dimmed: true, highlighted: false },
      { dimmed: false, highlighted: false },
    ])
  })
  it('dims slots with no passing (known) bar when a filter is active', () => {
    expect(state({ passingBarIds: new Set(['3', '404']) }).map(s => s.dimmed)).toEqual([true, false, true, true])
  })
  it('highlights the slot of the hovered bar (number or string id)', () => {
    expect(state({ hoveredBarId: '3' }).map(s => s.highlighted)).toEqual([false, true, false, false])
    expect(state({ hoveredBarId: 1 }).map(s => s.highlighted)).toEqual([true, false, false, false])
  })
  it('highlights search-matched slots', () => {
    expect(state({ searchBarIds: new Set(['1', '2']) }).map(s => s.highlighted)).toEqual([true, true, false, false])
  })
})

describe('computeBuildingStyles', () => {
  const base = {
    barsByBuilding: { a: [{ id: 1 }], b: [{ id: 2 }, { id: 3 }], c: [{ id: 4 }], empty: [] },
    partitions: { b: { partitions: [{ barId: 2 }, { barId: 3 }] }, c: { buildingColor: '#abcdef' } },
    dominantStreet: { a: 'hanazono-3', b: 'hanazono-1', c: 'hanazono-1' },
    passingBarIds: null,
    searchHighlighted: new Set(),
  }
  it('colours by street, override colour, or the neutral base under partitions', () => {
    expect(computeBuildingStyles(base)).toEqual({
      a: { fill: STREET_COLORS['hanazono-3'], classes: 'has-bars' },
      b: { fill: PARTITIONED_BASE_FILL, classes: 'has-bars' },
      c: { fill: '#abcdef', classes: 'has-bars' },
    })
  })
  it('falls back to the default colour for an unknown street', () => {
    expect(computeBuildingStyles({ ...base, dominantStreet: {} }).a.fill).toBe(STREET_COLOR_DEFAULT)
  })
  it('dims unpartitioned buildings with no passing bar, never partitioned ones', () => {
    const s = computeBuildingStyles({ ...base, passingBarIds: new Set(['4']) })
    expect(s.a.classes).toBe('has-bars tag-dimmed')
    expect(s.b.classes).toBe('has-bars')
    expect(s.c.classes).toBe('has-bars')
  })
  it('adds the search highlight, also to buildings without bars', () => {
    const s = computeBuildingStyles({ ...base, passingBarIds: new Set(), searchHighlighted: new Set(['a', 'zzz']) })
    expect(s.a).toEqual({ fill: STREET_COLORS['hanazono-3'], classes: 'has-bars tag-dimmed search-highlight' })
    expect(s.zzz).toEqual({ fill: null, classes: 'search-highlight' })
  })
})

describe('diffBuildingStyles', () => {
  const a = { fill: '#111', classes: 'has-bars' }
  it('returns everything on first apply and nothing when unchanged', () => {
    expect(diffBuildingStyles({}, { x: a })).toEqual([{ id: 'x', ...a }])
    expect(diffBuildingStyles({ x: a }, { x: { ...a } })).toEqual([])
  })
  it('returns only the buildings whose fill or classes changed', () => {
    const applied = { x: a, y: a, z: a }
    const wanted = { x: a, y: { fill: '#111', classes: 'has-bars tag-dimmed' }, z: { fill: '#222', classes: 'has-bars' } }
    expect(diffBuildingStyles(applied, wanted)).toEqual([
      { id: 'y', fill: '#111', classes: 'has-bars tag-dimmed' },
      { id: 'z', fill: '#222', classes: 'has-bars' },
    ])
  })
  it('clears buildings that are no longer styled', () => {
    expect(diffBuildingStyles({ x: a, gone: a }, { x: a })).toEqual([{ id: 'gone', fill: null, classes: '' }])
    expect(diffBuildingStyles({ gone: { fill: null, classes: '' } }, {})).toEqual([])
  })
})
