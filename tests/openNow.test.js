import { describe, it, expect } from 'vitest'
import { isBarOpen, minutesUntilClose, nextOpen, tokyoNow } from '../src/utils/openNow.js'

const SUN = 0, MON = 1, TUE = 2, WED = 3, FRI = 5, SAT = 6
const at = (day, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return { day, minutes: h * 60 + m }
}

const sameDay = { default: { open: '10:00', close: '22:00' } }
const wrap = { default: { open: '18:00', close: '02:00' } }
const wrapMonClosed = { default: { open: '18:00', close: '02:00' }, closedDays: ['mon'] }
const allDay = { default: { open: '00:00', close: '00:00' } }
const allDaySunClosed = { default: { open: '12:00', close: '12:00' }, closedDays: ['sun'] }
const withOverride = {
  default: { open: '19:00', close: '01:00' },
  overrides: { fri: { open: '20:00', close: '05:00' }, sat: { open: '15:00', close: '23:00' } },
}

describe('isBarOpen', () => {
  it.each([
    // [label, schedule, now, expected]
    ['same-day: before open', sameDay, at(WED, '09:59'), false],
    ['same-day: at open', sameDay, at(WED, '10:00'), true],
    ['same-day: midday', sameDay, at(WED, '15:00'), true],
    ['same-day: at close', sameDay, at(WED, '22:00'), false],
    ['same-day: after midnight', sameDay, at(WED, '01:00'), false],

    ['wrap: evening', wrap, at(WED, '20:00'), true],
    ['wrap: before midnight', wrap, at(WED, '23:59'), true],
    ['wrap: after midnight (yesterday carry-over)', wrap, at(WED, '01:00'), true],
    ['wrap: at close', wrap, at(WED, '02:00'), false],
    ['wrap: afternoon gap', wrap, at(WED, '12:00'), false],

    ['closed today: evening', wrapMonClosed, at(MON, '20:00'), false],
    ['closed today: Sunday night carries into Monday', wrapMonClosed, at(MON, '01:00'), true],
    ['closed today: after carry-over ends', wrapMonClosed, at(MON, '03:00'), false],

    ['closed yesterday + wrap: Tue 01:00 after closed Mon', wrapMonClosed, at(TUE, '01:00'), false],
    ['closed yesterday + wrap: Tue evening opens', wrapMonClosed, at(TUE, '18:00'), true],
    ['closed yesterday + wrap: Wed 01:00 from Tue night', wrapMonClosed, at(WED, '01:00'), true],

    ['24h: midnight', allDay, at(WED, '00:00'), true],
    ['24h: noon', allDay, at(WED, '12:00'), true],
    ['24h: late night', allDay, at(WED, '23:59'), true],
    ['24h with closed day: Sunday closed', allDaySunClosed, at(SUN, '13:00'), false],
    ['24h with closed day: Monday open', allDaySunClosed, at(MON, '05:00'), true],

    ['override: Fri open later', withOverride, at(FRI, '19:30'), false],
    ['override: Fri evening', withOverride, at(FRI, '21:00'), true],
    ['override: Sat 04:00 uses Fri close 05:00', withOverride, at(SAT, '04:00'), true],
    ['override: Sat 05:00 Fri hours over', withOverride, at(SAT, '05:00'), false],
    ['override: Sat 16:00 uses Sat override', withOverride, at(SAT, '16:00'), true],
    ['override: Sun 00:30 Sat closed at 23:00', withOverride, at(SUN, '00:30'), false],
    ['override: Fri 00:30 uses Thu default close', withOverride, at(FRI, '00:30'), true],
    ['override: Fri 02:00 default Thu close passed', withOverride, at(FRI, '02:00'), false],

    ['missing schedule', null, at(WED, '20:00'), null],
    ['missing default', { closedDays: ['mon'] }, at(WED, '20:00'), null],
    ['missing open', { default: { close: '02:00' } }, at(WED, '20:00'), null],
    ['missing close', { default: { open: '18:00' } }, at(WED, '20:00'), null],
  ])('%s', (_label, schedule, now, expected) => {
    expect(isBarOpen(schedule, now)).toBe(expected)
  })

  it('Monday closed, Tuesday 18:00-02:00: Tuesday 01:00 is closed', () => {
    const schedule = {
      default: { open: '18:00', close: '02:00' },
      closedDays: ['mon'],
    }
    expect(isBarOpen(schedule, at(TUE, '01:00'))).toBe(false)
  })
})

describe('minutesUntilClose', () => {
  it.each([
    ['same-day', sameDay, at(WED, '21:00'), 60],
    ['wrap before midnight', wrap, at(WED, '23:00'), 180],
    ['wrap after midnight', wrap, at(WED, '01:30'), 30],
    ['override Fri night', withOverride, at(FRI, '23:00'), 360],
    ['24h every day never closes', allDay, at(WED, '12:00'), Infinity],
    ['24h until closed day', allDaySunClosed, at(SAT, '23:00'), 60],
    ['closed now', sameDay, at(WED, '23:00'), null],
    ['unknown schedule', null, at(WED, '23:00'), null],
  ])('%s', (_label, schedule, now, expected) => {
    expect(minutesUntilClose(schedule, now)).toBe(expected)
  })
})

describe('nextOpen', () => {
  it.each([
    ['later today', sameDay, at(WED, '08:00'), { day: WED, minutes: 600, inMinutes: 120 }],
    ['tomorrow', sameDay, at(WED, '23:00'), { day: 4, minutes: 600, inMinutes: 660 }],
    ['skips closed day', wrapMonClosed, at(MON, '03:00'), { day: TUE, minutes: 1080, inMinutes: 1440 + 900 }],
    ['override day', withOverride, at(FRI, '19:30'), { day: FRI, minutes: 1200, inMinutes: 30 }],
    ['after a 24h closed day', allDaySunClosed, at(SUN, '10:00'), { day: MON, minutes: 0, inMinutes: 840 }],
    ['open now', wrap, at(WED, '20:00'), null],
    ['unknown schedule', null, at(WED, '20:00'), null],
    ['every day closed', { default: { open: '18:00', close: '02:00' }, closedDays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }, at(WED, '20:00'), null],
  ])('%s', (_label, schedule, now, expected) => {
    expect(nextOpen(schedule, now)).toEqual(expected)
  })
})

describe('tokyoNow', () => {
  it('converts a UTC instant to Tokyo day and minutes', () => {
    // 2026-11-09T16:30Z (Monday) is Tuesday 01:30 in Tokyo (UTC+9).
    expect(tokyoNow(new Date('2026-11-09T16:30:00Z'))).toEqual({ day: TUE, minutes: 90 })
  })

  it('reports Tokyo midnight as 0 minutes', () => {
    // 2026-11-10T15:00Z is Wednesday 00:00 in Tokyo.
    expect(tokyoNow(new Date('2026-11-10T15:00:00Z'))).toEqual({ day: WED, minutes: 0 })
  })
})
