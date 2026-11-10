import { describe, it, expect } from 'vitest'
import { ipKey, socketIpKey, createKeyedLimiter } from '../server/lib/rateLimitCore.js'

describe('ipKey (HTTP limiter key)', () => {
  it('uses req.ip, never the X-Forwarded-For header', () => {
    const req = { ip: '203.0.113.7', headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.7' } }
    expect(ipKey(req)).toBe('203.0.113.7')
  })
  it('falls back to the socket address, then a constant', () => {
    expect(ipKey({ socket: { remoteAddress: '10.0.0.5' } })).toBe('10.0.0.5')
    expect(ipKey({})).toBe('unknown')
  })
})

describe('socketIpKey (Socket.io limiter key)', () => {
  it('prefers the x-real-ip header set by nginx', () => {
    expect(socketIpKey({ headers: { 'x-real-ip': '203.0.113.7' }, address: '172.18.0.4' })).toBe('203.0.113.7')
  })
  it('falls back to the handshake address', () => {
    expect(socketIpKey({ headers: {}, address: '172.18.0.4' })).toBe('172.18.0.4')
    expect(socketIpKey({ headers: { 'x-real-ip': '  ' }, address: '172.18.0.4' })).toBe('172.18.0.4')
  })
  it('ignores X-Forwarded-For (its first entry is client-controlled)', () => {
    const handshake = { headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }, address: '172.18.0.4' }
    expect(socketIpKey(handshake)).toBe('172.18.0.4')
  })
  it('never throws on a malformed handshake', () => {
    expect(socketIpKey(undefined)).toBe('unknown')
    expect(socketIpKey({})).toBe('unknown')
  })
})

describe('createKeyedLimiter', () => {
  function make(rules, opts = {}) {
    const clock = { t: 1_000_000 }
    const limiter = createKeyedLimiter({ rules, now: () => clock.t, ...opts })
    return { clock, limiter }
  }

  it('allows `max` hits per window and rejects the next', () => {
    const { limiter } = make([{ windowMs: 1000, max: 3 }])
    expect([1, 2, 3, 4].map(() => limiter.hit('a'))).toEqual([true, true, true, false])
  })

  it('keys are independent', () => {
    const { limiter } = make([{ windowMs: 1000, max: 1 }])
    expect(limiter.hit('a')).toBe(true)
    expect(limiter.hit('a')).toBe(false)
    expect(limiter.hit('b')).toBe(true)
  })

  it('recovers when old hits leave the window; rejected hits do not extend it', () => {
    const { clock, limiter } = make([{ windowMs: 1000, max: 1 }])
    expect(limiter.hit('a')).toBe(true)
    clock.t += 500
    expect(limiter.hit('a')).toBe(false)
    clock.t += 500
    expect(limiter.hit('a')).toBe(true)
  })

  it('applies every rule (chat: 1 per second and 20 per minute)', () => {
    const { clock, limiter } = make([{ windowMs: 1000, max: 1 }, { windowMs: 60_000, max: 20 }])
    let allowed = 0
    for (let i = 0; i < 30; i++) {
      if (limiter.hit('ip')) allowed++
      expect(limiter.hit('ip')).toBe(false) // same second
      clock.t += 1000
    }
    expect(allowed).toBe(20)
    expect(limiter.retryAfterMs('ip')).toBe(30_000) // first hit ages out at 60 s
    clock.t += 30_000
    expect(limiter.hit('ip')).toBe(true)
  })

  it('isBlocked reports without recording (failed-attempt counting)', () => {
    const { limiter } = make([{ windowMs: 15 * 60_000, max: 20 }])
    for (let i = 0; i < 100; i++) expect(limiter.isBlocked('admin')).toBe(false)
    for (let i = 0; i < 20; i++) expect(limiter.hit('attacker')).toBe(true)
    expect(limiter.isBlocked('attacker')).toBe(true)
    expect(limiter.isBlocked('admin')).toBe(false)
    expect(limiter.retryAfterMs('attacker')).toBe(15 * 60_000)
  })

  it('does not grow forever: idle keys are pruned automatically', () => {
    const { clock, limiter } = make([{ windowMs: 1000, max: 1 }], { pruneIntervalMs: 5000 })
    for (let i = 0; i < 500; i++) limiter.hit(`ip-${i}`)
    expect(limiter.size).toBe(500)
    clock.t += 6000
    limiter.hit('fresh') // any use after the prune interval sweeps idle keys
    expect(limiter.size).toBe(1)
  })

  it('prune() keeps keys that are still inside the window', () => {
    const { clock, limiter } = make([{ windowMs: 10_000, max: 5 }])
    limiter.hit('old')
    clock.t += 9000
    limiter.hit('new')
    clock.t += 2000
    limiter.prune()
    expect(limiter.size).toBe(1)
    expect(limiter.retryAfterMs('new')).toBe(0)
  })

  it('keeps at most `max` timestamps per key', () => {
    const { clock, limiter } = make([{ windowMs: 1000, max: 2 }])
    for (let i = 0; i < 50; i++) { limiter.hit('a'); clock.t += 100 }
    // 2 per second over 5 s: only the allowed ones were stored and aged out
    expect(limiter.size).toBe(1)
    clock.t += 1000
    limiter.prune()
    expect(limiter.size).toBe(0)
  })

  it('requires at least one rule', () => {
    expect(() => createKeyedLimiter({ rules: [] })).toThrow()
  })
})
