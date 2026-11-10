import { describe, it, expect } from 'vitest'
import {
  parseAdminReviewLimit, parseAdminReviewCursor, encodeAdminReviewCursor,
  ADMIN_REVIEW_PAGE_DEFAULT, ADMIN_REVIEW_PAGE_MAX,
} from '../server/lib/reviewModeration.js'
import { mergeBarReviews, matchesAdminStatus, applyReviewUpdate, appendReviewPage } from '../src/utils/reviewLists.js'
import { removeSlotAt } from '../src/utils/partitions.js'

describe('admin review paging (server)', () => {
  it('clamps the page size', () => {
    expect(parseAdminReviewLimit(undefined)).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
    expect(parseAdminReviewLimit('')).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
    expect(parseAdminReviewLimit('abc')).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
    expect(parseAdminReviewLimit('0')).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
    expect(parseAdminReviewLimit('-5')).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
    expect(parseAdminReviewLimit(['5', '6'])).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
    expect(parseAdminReviewLimit('1')).toBe(1)
    expect(parseAdminReviewLimit('20')).toBe(20)
    expect(parseAdminReviewLimit('5000')).toBe(ADMIN_REVIEW_PAGE_MAX)
    expect(parseAdminReviewLimit('99999')).toBe(ADMIN_REVIEW_PAGE_DEFAULT)
  })

  const row = { id: 84, report_count: 2, cursor_ts: '2026-11-10T17:26:32.957717Z' }

  it('round-trips a cursor per list order', () => {
    const plain = encodeAdminReviewCursor('all', row)
    expect(plain).toBe('2026-11-10T17:26:32.957717Z_84')
    expect(parseAdminReviewCursor('all', plain)).toEqual({ ts: row.cursor_ts, id: 84 })
    expect(parseAdminReviewCursor('hidden', encodeAdminReviewCursor('hidden', row))).toEqual({ ts: row.cursor_ts, id: 84 })
    const reported = encodeAdminReviewCursor('reported', row)
    expect(reported).toBe('2_2026-11-10T17:26:32.957717Z_84')
    expect(parseAdminReviewCursor('reported', reported)).toEqual({ ts: row.cursor_ts, id: 84, reports: 2 })
  })

  it('no cursor is the first page', () => {
    expect(parseAdminReviewCursor('all', undefined)).toBeNull()
    expect(parseAdminReviewCursor('all', '')).toBeNull()
  })

  it('rejects anything that is not exactly a cursor of that list', () => {
    const bad = [
      'abc', '84', '2026-11-10T17:26:32.957717Z', '2026-11-10T17:26:32.957Z_84', '2026-11-10 17:26:32.957717_84',
      "2026-11-10T17:26:32.957717Z_84'; DROP TABLE reviews;--", '2026-11-10T17:26:32.957717Z_-1',
      '2026-11-10T17:26:32.957717Z_99999999999', '2026-11-10T17:26:32.957717Z_1.5',
      '2_2026-11-10T17:26:32.957717Z_84', ['a', 'b'], { ts: 'x' },
    ]
    for (const value of bad) expect(parseAdminReviewCursor('all', value), String(value)).toEqual({ error: 'Invalid cursor' })
    for (const value of ['2026-11-10T17:26:32.957717Z_84', 'x_2026-11-10T17:26:32.957717Z_84', '-1_2026-11-10T17:26:32.957717Z_84']) {
      expect(parseAdminReviewCursor('reported', value), value).toEqual({ error: 'Invalid cursor' })
    }
  })
})

describe('review lists (client)', () => {
  const pub = [
    { id: 9, created_at: '2026-01-03T00:00:00Z', nickname: 'c' },
    { id: 5, created_at: '2026-01-01T00:00:00Z', nickname: 'a' },
  ]
  const hidden = [
    { id: 7, created_at: '2026-01-02T00:00:00Z', nickname: 'b', hidden: true, has_drawing: true },
    { id: 2, created_at: '2025-12-01T00:00:00Z', nickname: 'old', hidden: true },
  ]

  it('merges hidden reviews in place, newest first', () => {
    const merged = mergeBarReviews(pub, hidden)
    expect(merged.map(r => r.id)).toEqual([9, 7, 5, 2])
    expect(merged.map(r => !!r.hidden)).toEqual([false, true, false, true])
    expect(pub.length).toBe(2) // inputs untouched
  })

  it('a review in both lists shows once, as hidden; equal times order by id', () => {
    const merged = mergeBarReviews(
      [{ id: 3, created_at: '2026-01-01T00:00:00Z' }, { id: 4, created_at: '2026-01-01T00:00:00Z' }],
      [{ id: 3, created_at: '2026-01-01T00:00:00Z' }],
    )
    expect(merged.map(r => [r.id, !!r.hidden])).toEqual([[4, false], [3, true]])
    expect(mergeBarReviews(null, undefined)).toEqual([])
  })

  it('knows which filter a review belongs to', () => {
    const reported = { hidden: false, report_count: 2, auto_hide_exempt: false }
    expect(matchesAdminStatus(reported, 'reported')).toBe(true)
    expect(matchesAdminStatus({ ...reported, auto_hide_exempt: true }, 'reported')).toBe(false)
    expect(matchesAdminStatus({ ...reported, report_count: 0 }, 'reported')).toBe(false)
    expect(matchesAdminStatus(reported, 'hidden')).toBe(false)
    expect(matchesAdminStatus({ ...reported, hidden: true }, 'hidden')).toBe(true)
    expect(matchesAdminStatus(reported, 'all')).toBe(true)
  })

  it('updates a moderated review in place, or drops it from a filter it left', () => {
    const items = [
      { id: 1, hidden: true, report_count: 0, auto_hide_exempt: false, name_jp: 'x' },
      { id: 2, hidden: true, report_count: 3, auto_hide_exempt: false },
    ]
    const unhidden = { id: 2, hidden: false, report_count: 3, auto_hide_exempt: true }
    expect(applyReviewUpdate(items, unhidden, 'all')).toEqual({ items: [items[0], unhidden], removed: false })
    expect(applyReviewUpdate(items, unhidden, 'hidden')).toEqual({ items: [items[0]], removed: true })
    expect(applyReviewUpdate(items, unhidden, 'reported')).toEqual({ items: [items[0]], removed: true })
    // fields the update does not carry are kept
    expect(applyReviewUpdate(items, { id: 1, hidden: true, report_count: 1 }, 'hidden').items[0].name_jp).toBe('x')
    // not in the pages loaded so far: nothing to do
    expect(applyReviewUpdate(items, { id: 99, hidden: true }, 'all')).toEqual({ items, removed: false })
  })

  it('appends a page without repeating reviews', () => {
    expect(appendReviewPage([{ id: 3 }, { id: 2 }], [{ id: 2 }, { id: 1 }]).map(r => r.id)).toEqual([3, 2, 1])
  })
})

describe('removeSlotAt', () => {
  const config = {
    splitDirection: 'vertical',
    geometryV2: true,
    buildingColor: '#123456',
    partitions: [
      { barIds: ['1'], weight: 1.5, color: '#ff0000' },
      { barIds: ['2', '3'], weight: 0.5, color: null, labelOrientation: 'tate' },
      { barId: 4, weight: 2, color: '#00ff00' },
    ],
  }

  it('removes a middle slot and leaves the others exactly as they were', () => {
    const next = removeSlotAt(config, 1)
    expect(next.partitions).toEqual([config.partitions[0], config.partitions[2]])
    expect(next.partitions[0]).toBe(config.partitions[0])
    expect(next.partitions[1]).toBe(config.partitions[2])
    expect(next.splitDirection).toBe('vertical')
    expect(next.buildingColor).toBe('#123456')
    expect(next.geometryV2).toBe(true)
    expect(config.partitions.length).toBe(3) // input untouched
  })

  it('removes the first and the last slot', () => {
    expect(removeSlotAt(config, 0).partitions).toEqual(config.partitions.slice(1))
    expect(removeSlotAt(config, 2).partitions).toEqual(config.partitions.slice(0, 2))
  })

  it('ignores an index that is not a slot', () => {
    for (const index of [-1, 3, 1.5, '1', null, undefined]) expect(removeSlotAt(config, index)).toBe(config)
    expect(removeSlotAt(null, 0)).toBeNull()
    const noSlots = { splitDirection: 'auto' }
    expect(removeSlotAt(noSlots, 0)).toBe(noSlots)
  })
})
