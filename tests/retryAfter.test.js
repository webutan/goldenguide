import { describe, it, expect } from 'vitest'
import { parseRetryAfter, retryAfterOf, rateLimitMessage } from '../src/utils/retryAfter.js'
import { useI18n } from '../src/composables/useI18n.js'

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfter('540')).toBe(540)
    expect(parseRetryAfter(' 0 ')).toBe(0)
    expect(parseRetryAfter(600)).toBe(600)
  })

  it('reads an HTTP date relative to now', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:09:00 GMT', now)).toBe(540)
    // a date in the past means "now"
    expect(parseRetryAfter('Wed, 31 Dec 2025 23:00:00 GMT', now)).toBe(0)
  })

  it('returns null when missing or unreadable', () => {
    for (const v of [null, undefined, '', '  ', 'soon', '-5', '1.5']) expect(parseRetryAfter(v)).toBeNull()
  })
})

describe('retryAfterOf', () => {
  it('reads the header of a fetch Response', () => {
    expect(retryAfterOf(new Response('', { status: 429, headers: { 'Retry-After': '540' } }))).toBe(540)
    expect(retryAfterOf(new Response('', { status: 429 }))).toBeNull()
    expect(retryAfterOf(null)).toBeNull()
  })
})

describe('rateLimitMessage', () => {
  const en = useI18n('en').t
  const jp = useI18n('jp').t

  it('rounds up to whole minutes', () => {
    expect(rateLimitMessage(en, 540)).toBe('Slow down! Try again in about 9 minutes.')
    expect(rateLimitMessage(en, 541)).toBe('Slow down! Try again in about 10 minutes.')
    expect(rateLimitMessage(en, 3600)).toBe('Slow down! Try again in about 60 minutes.')
    expect(rateLimitMessage(jp, 540)).toBe('ちょっと待って！約9分後にもう一度お試しください。')
  })

  it('uses the singular for one minute', () => {
    expect(rateLimitMessage(en, 60)).toBe('Slow down! Try again in about 1 minute.')
    expect(rateLimitMessage(en, 61)).toBe('Slow down! Try again in about 2 minutes.')
    expect(rateLimitMessage(jp, 60)).toBe('ちょっと待って！約1分後にもう一度お試しください。')
  })

  it('says "in a moment" under a minute', () => {
    for (const s of [0, 0.8, 1, 59, 59.9]) expect(rateLimitMessage(en, s)).toBe('Slow down! Try again in a moment.')
    expect(rateLimitMessage(jp, 5)).toBe('ちょっと待って！少し待ってからもう一度お試しください。')
  })

  it('falls back to "later" when the wait is unknown', () => {
    for (const s of [null, undefined, NaN, Infinity, '540']) {
      expect(rateLimitMessage(en, s)).toBe('Slow down! Try again later.')
    }
    expect(rateLimitMessage(jp, null)).toBe('ちょっと待って！しばらくしてからもう一度お試しください。')
  })

  it('fills the admin lockout sentence too', () => {
    expect(rateLimitMessage(en, 900, 'adminLockedOut')).toBe('Too many failed attempts. Try again in about 15 minutes.')
    expect(rateLimitMessage(jp, 900, 'adminLockedOut')).toBe('失敗回数が多すぎます。約15分後にもう一度お試しください。')
    expect(rateLimitMessage(en, null, 'adminLockedOut')).toBe('Too many failed attempts. Try again later.')
  })

  it('leaves no placeholder behind in either language', () => {
    for (const t of [en, jp]) {
      for (const s of [null, 3, 60, 540]) expect(rateLimitMessage(t, s)).not.toMatch(/[{}]/)
    }
  })
})
