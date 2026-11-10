import { describe, it, expect } from 'vitest'
import {
  slotBarIds,
  groupBarsByBuilding,
  defaultPartition,
  withDefaultPartitions,
  reconcilePartitions,
} from '../src/utils/partitions.js'

const bar = (id, building_id, over = {}) => ({ id, building_id, floor: 1, name_en: `Bar ${id}`, ...over })

describe('slotBarIds', () => {
  it('reads barIds and the legacy barId as strings', () => {
    expect(slotBarIds({ barIds: [1, '2'] })).toEqual(['1', '2'])
    expect(slotBarIds({ barId: 7 })).toEqual(['7'])
    expect(slotBarIds({ barIds: [], barId: 7 })).toEqual([])
    expect(slotBarIds({})).toEqual([])
    expect(slotBarIds(null)).toEqual([])
  })
})

describe('groupBarsByBuilding', () => {
  it('skips unplaced bars', () => {
    const groups = groupBarsByBuilding([bar(1, 'bldg-a'), bar(2, null), bar(3, 'bldg-a'), bar(4, 'bldg-b')])
    expect(Object.keys(groups).sort()).toEqual(['bldg-a', 'bldg-b'])
    expect(groups['bldg-a'].map(b => b.id)).toEqual([1, 3])
  })
})

describe('defaultPartition', () => {
  it('makes one slot per bar sorted by floor, then name', () => {
    const p = defaultPartition([
      bar(1, 'bldg-a', { floor: 2, name_en: 'Alpha' }),
      bar(2, 'bldg-a', { floor: 1, name_en: 'Zulu' }),
      bar(3, 'bldg-a', { floor: 1, name_en: 'beta' }),
    ])
    expect(p.splitDirection).toBe('auto')
    expect(p.partitions).toEqual([
      { barId: 3, weight: 1 },
      { barId: 2, weight: 1 },
      { barId: 1, weight: 1 },
    ])
  })
})

describe('withDefaultPartitions', () => {
  const bars = [bar(1, 'bldg-a'), bar(2, 'bldg-a'), bar(3, 'bldg-b'), bar(4, 'bldg-c'), bar(5, 'bldg-c')]

  it('generates defaults only for multi-bar buildings without a stored entry', () => {
    const stored = { 'bldg-c': { partitions: [{ barIds: ['4'] }], splitDirection: 'horizontal' } }
    const out = withDefaultPartitions(stored, bars)
    expect(Object.keys(out).sort()).toEqual(['bldg-a', 'bldg-c'])
    expect(out['bldg-a'].partitions.map(p => p.barId)).toEqual([1, 2])
    expect(out['bldg-c']).toBe(stored['bldg-c'])
  })

  it('does not override a stored entry that has no slots', () => {
    const stored = { 'bldg-a': { buildingColor: '#ff0000' } }
    expect(withDefaultPartitions(stored, bars)['bldg-a']).toBe(stored['bldg-a'])
  })

  it('does not mutate the stored object', () => {
    const stored = {}
    withDefaultPartitions(stored, bars)
    expect(stored).toEqual({})
  })
})

describe('reconcilePartitions', () => {
  it('leaves fully assigned buildings untouched and reports nothing', () => {
    const configs = { 'bldg-a': { partitions: [{ barId: 1, weight: 1 }, { barIds: ['2'], weight: 2 }], splitDirection: 'auto' } }
    const { partitions, issues } = reconcilePartitions(configs, [bar(1, 'bldg-a'), bar(2, 'bldg-a')])
    expect(partitions['bldg-a']).toBe(configs['bldg-a'])
    expect(issues).toEqual({})
  })

  it('adds a synthetic slot for bars no slot references (1 -> 2 slots)', () => {
    const configs = { 'bldg-a': { partitions: [{ barIds: ['1', '2'] }], splitAngle: 10 } }
    const bars = [bar(1, 'bldg-a'), bar(2, 'bldg-a'), bar(9, 'bldg-a', { floor: 2 }), bar(8, 'bldg-a')]
    const { partitions, issues } = reconcilePartitions(configs, bars)
    const slots = partitions['bldg-a'].partitions
    expect(slots).toHaveLength(2)
    expect(slots[0]).toBe(configs['bldg-a'].partitions[0])
    expect(slots[1]).toEqual({ barIds: ['8', '9'], weight: 1, synthetic: true })
    expect(partitions['bldg-a'].splitAngle).toBe(10)
    expect(issues['bldg-a']).toEqual({ unassigned: ['8', '9'], stale: [] })
    // input untouched
    expect(configs['bldg-a'].partitions).toHaveLength(1)
  })

  it('adds a synthetic fourth slot to a three-slot building (2x2 grid)', () => {
    const configs = { 'bldg-a': { partitions: [{ barId: 1 }, { barId: 2 }, { barId: 3 }] } }
    const bars = [1, 2, 3, 4].map(id => bar(id, 'bldg-a'))
    const { partitions } = reconcilePartitions(configs, bars)
    expect(partitions['bldg-a'].partitions).toHaveLength(4)
    expect(partitions['bldg-a'].partitions[3]).toEqual({ barIds: ['4'], weight: 1, synthetic: true })
  })

  it('joins the last slot with bars when an extra slot would not be visible (2 slots)', () => {
    const configs = {
      'bldg-a': { partitions: [{ barIds: ['1'], color: '#111111' }, { barId: 2, weight: 2, color: '#222222' }], isIndependentBuilding: true },
    }
    const bars = [bar(1, 'bldg-a'), bar(2, 'bldg-a'), bar(3, 'bldg-a')]
    const { partitions, issues } = reconcilePartitions(configs, bars)
    const slots = partitions['bldg-a'].partitions
    expect(slots).toHaveLength(2)
    expect(slots[0]).toBe(configs['bldg-a'].partitions[0])
    expect(slots[1]).toEqual({ weight: 2, color: '#222222', barIds: ['2', '3'], syntheticBarIds: ['3'] })
    expect(partitions['bldg-a'].isIndependentBuilding).toBe(true)
    expect(issues['bldg-a']).toEqual({ unassigned: ['3'], stale: [] })
    // input untouched
    expect(configs['bldg-a'].partitions[1]).toEqual({ barId: 2, weight: 2, color: '#222222' })
  })

  it('skips trailing empty slots when joining an existing slot', () => {
    const configs = { 'bldg-a': { partitions: [{ barIds: ['1'] }, { barIds: ['2'] }, { barIds: ['3'] }, { barIds: [] }] } }
    const { partitions } = reconcilePartitions(configs, [1, 2, 3, 4].map(id => bar(id, 'bldg-a')))
    expect(partitions['bldg-a'].partitions).toEqual([
      { barIds: ['1'] },
      { barIds: ['2'] },
      { barIds: ['3', '4'], syntheticBarIds: ['4'] },
      { barIds: [] },
    ])
  })

  it('every bar in a partitioned building ends up in exactly one drawn slot', () => {
    for (let n = 1; n <= 6; n++) {
      const ids = Array.from({ length: n + 2 }, (_, i) => i + 1)
      const configs = { 'bldg-a': { partitions: ids.slice(0, n).map(id => ({ barId: id })) } }
      const { partitions } = reconcilePartitions(configs, ids.map(id => bar(id, 'bldg-a')))
      const drawn = partitions['bldg-a'].partitions.flatMap(slotBarIds)
      expect(drawn.sort()).toEqual(ids.map(String).sort())
    }
  })

  it('drops references to missing and moved bars and reports them', () => {
    const configs = {
      'bldg-a': {
        partitions: [
          { barId: 1, weight: 1, color: '#123456' }, // moved to bldg-b
          { barIds: ['2', '99'], weight: 3 },         // 99 deleted
          { barIds: [], weight: 1 },                  // deliberately empty
        ],
      },
    }
    const bars = [bar(1, 'bldg-b'), bar(2, 'bldg-a')]
    const { partitions, issues } = reconcilePartitions(configs, bars)
    expect(partitions['bldg-a'].partitions).toEqual([
      { barIds: ['2'], weight: 3 },
      { barIds: [], weight: 1 },
    ])
    expect(issues['bldg-a']).toEqual({
      unassigned: [],
      stale: [
        { slotIndex: 0, barId: '1', reason: 'moved' },
        { slotIndex: 1, barId: '99', reason: 'missing' },
      ],
    })
    expect(issues['bldg-b']).toBeUndefined()
  })

  it('treats an unplaced bar still referenced by a slot as moved', () => {
    const configs = { 'bldg-a': { partitions: [{ barIds: ['1'] }, { barIds: ['2'] }] } }
    const { partitions, issues } = reconcilePartitions(configs, [bar(1, null), bar(2, 'bldg-a')])
    expect(partitions['bldg-a'].partitions).toEqual([{ barIds: ['2'] }])
    expect(issues['bldg-a'].unassigned).toEqual([])
    expect(issues['bldg-a'].stale).toEqual([{ slotIndex: 0, barId: '1', reason: 'moved' }])
  })

  it('does not add a synthetic slot to a building with no slots', () => {
    const configs = { 'bldg-a': { buildingColor: '#ff0000' }, 'bldg-b': { partitions: [] } }
    const { partitions, issues } = reconcilePartitions(configs, [bar(1, 'bldg-a'), bar(2, 'bldg-a'), bar(3, 'bldg-b')])
    expect(partitions['bldg-a']).toBe(configs['bldg-a'])
    expect(partitions['bldg-b']).toBe(configs['bldg-b'])
    expect(issues).toEqual({})
  })

  it('returns the input unchanged while bars have not loaded', () => {
    const configs = { 'bldg-a': { partitions: [{ barIds: ['1'] }] } }
    expect(reconcilePartitions(configs, [])).toEqual({ partitions: configs, issues: {} })
    expect(reconcilePartitions(null, [bar(1, 'bldg-a')])).toEqual({ partitions: {}, issues: {} })
  })

  it('generated defaults reconcile cleanly', () => {
    const bars = [bar(1, 'bldg-a'), bar(2, 'bldg-a'), bar(3, 'bldg-a')]
    const { partitions, issues } = reconcilePartitions(withDefaultPartitions({}, bars), bars)
    expect(partitions['bldg-a'].partitions).toHaveLength(3)
    expect(issues).toEqual({})
  })
})
