import { describe, it, expect } from 'vitest'
import { tokyoNow } from '../src/utils/openNow.js'
import {
  NIGHT_LENGTH, tonightDay, nowPosition, nightSegments, tonightRows, sortRows,
  formatAxisTime, formatHours, visibleRange,
} from '../src/utils/tonight.js'
import { STREET_COLORS, STREET_COLOR_DEFAULT, streetColor, streetName } from '../src/utils/streets.js'
import { STREET_COLORS as MAP_STREET_COLORS } from '../src/utils/mapGeometry.js'

const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6
const at = (day, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return { day, minutes: h * 60 + m }
}
// Minutes after 18:00 for a clock time on the axis ("01:00" is after midnight)
const pos = hhmm => {
  const [h, m] = hhmm.split(':').map(Number)
  return ((h * 60 + m - 18 * 60) + 1440) % 1440
}
const hours = (open, close, extra = {}) => ({ default: { open, close }, ...extra })
const spans = segs => segs.map(s => [formatAxisTime(s.start), formatAxisTime(s.end)])

describe('tonightDay', () => {
  it('is today from 06:00 on', () => {
    expect(tonightDay(at(WED, '06:00'))).toBe(WED)
    expect(tonightDay(at(WED, '12:00'))).toBe(WED)
    expect(tonightDay(at(WED, '23:59'))).toBe(WED)
  })

  it('is still last night before 06:00', () => {
    expect(tonightDay(at(THU, '00:00'))).toBe(WED)
    expect(tonightDay(at(THU, '05:59'))).toBe(WED)
    expect(tonightDay(at(SUN, '02:00'))).toBe(SAT)
  })
})

describe('nowPosition', () => {
  it('is minutes after 18:00, across midnight', () => {
    expect(nowPosition(at(WED, '18:00'), WED)).toBe(0)
    expect(nowPosition(at(WED, '21:30'), WED)).toBe(210)
    expect(nowPosition(at(WED, '23:59'), WED)).toBe(359)
    expect(nowPosition(at(THU, '00:00'), WED)).toBe(360)
    expect(nowPosition(at(THU, '05:59'), WED)).toBe(NIGHT_LENGTH - 1)
    expect(nowPosition(at(SUN, '01:00'), SAT)).toBe(420)
  })

  it('is null outside 18:00-06:00', () => {
    expect(nowPosition(at(WED, '06:00'), WED)).toBeNull()
    expect(nowPosition(at(WED, '17:59'), WED)).toBeNull()
  })

  it('is null for any other night', () => {
    expect(nowPosition(at(WED, '21:30'), THU)).toBeNull()
    expect(nowPosition(at(WED, '21:30'), TUE)).toBeNull()
    // Thursday 01:00 belongs to Wednesday's night, not Thursday's
    expect(nowPosition(at(THU, '01:00'), THU)).toBeNull()
  })

  // The acceptance criterion: the line is placed from Tokyo time, whatever
  // timezone the browser (here: the test process) is in.
  it.each([
    // [instant (UTC), Tokyo time, night, position]
    ['2026-11-12T12:30:00Z', 'Thu 21:30', THU, 210],
    ['2026-11-12T15:00:00Z', 'Fri 00:00', THU, 360],
    ['2026-11-12T20:59:00Z', 'Fri 05:59', THU, 719],
    ['2026-11-12T09:00:00Z', 'Thu 18:00', THU, 0],
    ['2026-11-11T16:15:00Z', 'Thu 01:15', WED, 435],
  ])('%s is %s in Tokyo', (iso, _label, night, expected) => {
    const now = tokyoNow(new Date(iso))
    expect(tonightDay(now)).toBe(night)
    expect(nowPosition(now, night)).toBe(expected)
  })

  it('does not depend on the process timezone', () => {
    const before = process.env.TZ
    const results = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Pacific/Auckland'].map(tz => {
      process.env.TZ = tz
      return nowPosition(tokyoNow(new Date('2026-11-12T12:30:00Z')), THU)
    })
    if (before === undefined) delete process.env.TZ
    else process.env.TZ = before
    expect(results).toEqual([210, 210, 210, 210])
  })
})

describe('nightSegments', () => {
  it('is null when the hours are unknown', () => {
    expect(nightSegments(null, WED)).toBeNull()
    expect(nightSegments({}, WED)).toBeNull()
    expect(nightSegments({ default: { open: '19:00' } }, WED)).toBeNull()
    expect(nightSegments({ closedDays: ['mon'] }, WED)).toBeNull()
  })

  it('draws a bar that closes after midnight as one strip across 00:00', () => {
    const segs = nightSegments(hours('19:00', '03:00'), WED)
    expect(segs).toHaveLength(1)
    expect(segs[0]).toMatchObject({ start: pos('19:00'), end: pos('03:00'), clippedStart: false, clippedEnd: false })
    expect(segs[0].start).toBe(60)
    expect(segs[0].end).toBe(540) // 6 h before midnight + 3 h after it
    expect(spans(segs)).toEqual([['19:00', '03:00']])
  })

  it('ends a same-day bar at its closing time', () => {
    expect(spans(nightSegments(hours('20:00', '23:30'), WED))).toEqual([['20:00', '23:30']])
  })

  it('clips hours that start before 18:00 or end after 06:00', () => {
    const early = nightSegments(hours('15:00', '22:00'), WED)
    expect(early[0]).toMatchObject({ start: 0, end: pos('22:00'), opens: -180, clippedStart: true, clippedEnd: false })

    const late = nightSegments(hours('22:00', '08:00'), WED)
    expect(late[0]).toMatchObject({ start: pos('22:00'), end: NIGHT_LENGTH, closes: 840, clippedStart: false, clippedEnd: true })
  })

  it('leaves out a bar that closes before 18:00', () => {
    expect(nightSegments(hours('10:00', '17:00'), WED)).toEqual([])
    expect(nightSegments(hours('10:00', '18:00'), WED)).toEqual([])
  })

  it('shows a bar that only opens after midnight', () => {
    // Opens 01:00 on Thursday: that is still Wednesday's night
    const s = hours('01:00', '05:00')
    expect(spans(nightSegments(s, WED))).toEqual([['01:00', '05:00']])
  })

  it('gives a morning bar a strip at the end of the night', () => {
    expect(spans(nightSegments(hours('05:00', '11:00'), WED))).toEqual([['05:00', '06:00']])
    expect(nightSegments(hours('05:00', '11:00'), WED)[0].clippedEnd).toBe(true)
  })

  it('is empty on a closed day', () => {
    const s = hours('19:00', '03:00', { closedDays: ['mon'] })
    expect(nightSegments(s, MON)).toEqual([])
    expect(spans(nightSegments(s, SUN))).toEqual([['19:00', '03:00']])
    expect(spans(nightSegments(s, TUE))).toEqual([['19:00', '03:00']])
  })

  it('uses the override of that weekday', () => {
    const s = hours('19:00', '01:00', { overrides: { fri: { open: '20:00', close: '05:00' } } })
    expect(spans(nightSegments(s, THU))).toEqual([['19:00', '01:00']])
    expect(spans(nightSegments(s, FRI))).toEqual([['20:00', '05:00']])
  })

  it('wraps the week: Saturday night uses Sunday morning, Sunday night Monday morning', () => {
    const s = hours('21:00', '04:00', { closedDays: ['sun'] })
    expect(spans(nightSegments(s, SAT))).toEqual([['21:00', '04:00']])
    expect(nightSegments(s, SUN)).toEqual([])
  })

  it('draws a 24-hour bar as one strip over the whole night', () => {
    const segs = nightSegments(hours('00:00', '00:00'), WED)
    expect(segs).toHaveLength(1)
    expect(segs[0]).toMatchObject({ start: 0, end: NIGHT_LENGTH, clippedStart: true, clippedEnd: true })
    expect(formatHours(segs)).toBeNull()
  })

  it('can have two strips: late hours from the day before, then tonight', () => {
    // Open 20:00 to 19:00 the next day: yesterday's shift is still on at 18:00
    const segs = nightSegments(hours('20:00', '19:00'), WED)
    expect(spans(segs)).toEqual([['18:00', '19:00'], ['20:00', '06:00']])
    expect(segs[0].clippedStart).toBe(true)
    expect(segs[1].clippedEnd).toBe(true)
  })

  it('keeps every strip inside the axis', () => {
    for (const s of [hours('19:00', '03:00'), hours('00:00', '00:00'), hours('12:00', '12:00'), hours('05:30', '02:15'), hours('23:00', '22:00')]) {
      for (let day = 0; day < 7; day++) {
        for (const seg of nightSegments(s, day)) {
          expect(seg.start).toBeGreaterThanOrEqual(0)
          expect(seg.end).toBeLessThanOrEqual(NIGHT_LENGTH)
          expect(seg.end).toBeGreaterThan(seg.start)
        }
      }
    }
  })
})

describe('tonightRows', () => {
  const bars = [
    { id: 1, name_en: 'Open', schedule: hours('19:00', '03:00') },
    { id: 2, name_en: 'No hours' },
    { id: 3, name_en: 'Closed Wed', schedule: hours('19:00', '03:00', { closedDays: ['wed'] }) },
    { id: 4, name_en: 'Inactive', schedule: hours('19:00', '03:00'), is_active: false },
    { id: 5, name_en: 'Lunch only', schedule: hours('11:00', '15:00') },
    null,
  ]

  it('splits bars into open, unknown and closed', () => {
    const g = tonightRows(bars, WED)
    expect(g.rows.map(r => r.bar.id)).toEqual([1])
    expect(g.unknown.map(b => b.id)).toEqual([2])
    expect(g.closed.map(b => b.id)).toEqual([3, 5])
  })

  it('follows the night asked for', () => {
    expect(tonightRows(bars, THU).rows.map(r => r.bar.id)).toEqual([1, 3])
  })

  it('copes with no bars', () => {
    expect(tonightRows(undefined, WED)).toEqual({ rows: [], unknown: [], closed: [] })
  })
})

describe('sortRows', () => {
  const rows = tonightRows([
    { id: 'b', name_en: 'Bravo', schedule: hours('20:00', '02:00') },
    { id: 'a', name_en: 'alpha', schedule: hours('20:00', '05:00') },
    { id: 'c', name_en: 'Charlie', schedule: hours('18:30', '23:00') },
    { id: 'd', name_en: 'Delta', schedule: hours('15:00', '01:00') },
    { id: 'e', name_en: 'Echo 10', schedule: hours('21:00', '08:00') },
    { id: 'f', name_en: 'Echo 9', schedule: hours('21:00', '08:00') },
  ], WED).rows
  const ids = sorted => sorted.map(r => r.bar.id).join('')

  it('opens earliest: real opening time, then earlier close, then name', () => {
    expect(ids(sortRows(rows, 'opens'))).toBe('dcbafe')
  })

  it('closes latest: real closing time, also past 06:00', () => {
    expect(ids(sortRows(rows, 'closes'))).toBe('feabdc')
  })

  it('name: case-insensitive, numbers in order', () => {
    expect(ids(sortRows(rows, 'name'))).toBe('abcdfe')
  })

  it('sorts by the name it is given (the language shown)', () => {
    const jp = tonightRows([
      { id: 1, name_en: 'Zebra', name_jp: 'あ', schedule: hours('20:00', '02:00') },
      { id: 2, name_en: 'Apple', name_jp: 'ん', schedule: hours('20:00', '02:00') },
    ], WED).rows
    expect(sortRows(jp, 'name').map(r => r.bar.id)).toEqual([2, 1])
    expect(sortRows(jp, 'name', bar => bar.name_jp).map(r => r.bar.id)).toEqual([1, 2])
  })

  it('does not change the list it is given', () => {
    const before = ids(rows)
    sortRows(rows, 'closes')
    expect(ids(rows)).toBe(before)
  })
})

describe('formatAxisTime / formatHours', () => {
  it('formats axis minutes as a clock time', () => {
    expect(formatAxisTime(0)).toBe('18:00')
    expect(formatAxisTime(360)).toBe('00:00')
    expect(formatAxisTime(545)).toBe('03:05')
    expect(formatAxisTime(720)).toBe('06:00')
    expect(formatAxisTime(-180)).toBe('15:00')
    expect(formatAxisTime(840)).toBe('08:00')
  })

  it('shows the real hours, not the clipped ones', () => {
    expect(formatHours(nightSegments(hours('19:00', '03:00'), WED))).toBe('19:00–03:00')
    expect(formatHours(nightSegments(hours('15:00', '22:00'), WED))).toBe('15:00–22:00')
    expect(formatHours(nightSegments(hours('17:00', '07:00'), WED))).toBe('17:00–07:00')
  })

  it('lists each strip, once when they are the same daily hours', () => {
    expect(formatHours(nightSegments(hours('20:00', '19:00'), WED))).toBe('20:00–19:00')
    const split = hours('20:00', '19:00', { overrides: { tue: { open: '21:00', close: '18:30' } } })
    expect(formatHours(nightSegments(split, WED))).toBe('21:00–18:30, 20:00–19:00')
  })
})

describe('visibleRange', () => {
  it('renders the rows in view plus the overscan', () => {
    const r = visibleRange({ scrollTop: 0, viewportHeight: 220, rowHeight: 22, count: 300, overscan: 5 })
    expect(r).toEqual({ start: 0, end: 16, padTop: 0, padBottom: (300 - 16) * 22 })
  })

  it('moves with the scroll position and keeps the total height', () => {
    const r = visibleRange({ scrollTop: 2200, viewportHeight: 220, rowHeight: 22, count: 300, overscan: 5 })
    expect(r.start).toBe(95)
    expect(r.end).toBe(116)
    expect(r.padTop + (r.end - r.start) * 22 + r.padBottom).toBe(300 * 22)
  })

  it('stops at the end of the list', () => {
    const r = visibleRange({ scrollTop: 999999, viewportHeight: 220, rowHeight: 22, count: 300, overscan: 5 })
    expect(r.end).toBe(300)
    expect(r.start).toBeLessThanOrEqual(300)
    expect(r.padBottom).toBe(0)
  })

  it('copes with nothing to show', () => {
    expect(visibleRange({ rowHeight: 22, count: 0 })).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0 })
    expect(visibleRange({ rowHeight: 0, count: 10 })).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0 })
  })
})

describe('streets', () => {
  it('has one colour per street and a fallback', () => {
    expect(streetColor('hanazono-3')).toBe(STREET_COLORS['hanazono-3'])
    expect(streetColor('nowhere')).toBe(STREET_COLOR_DEFAULT)
    expect(streetColor(undefined)).toBe(STREET_COLOR_DEFAULT)
  })

  it('is the same table the map uses', () => {
    expect(MAP_STREET_COLORS).toBe(STREET_COLORS)
  })

  it('names a street from its id', () => {
    expect(streetName('hanazono-1')).toBe('Hanazono 1')
    expect(streetName('maneki-dori')).toBe('Maneki Dori')
    expect(streetName('')).toBe('')
  })
})
