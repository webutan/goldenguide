import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  screensaverSettings, SCREENSAVER_DEFAULTS, createIdleTimer,
  stepLogo, spawnLogo,
  createSleeper, bonkSleeper, stepSleeper, bubbleSize, sitUp, breath,
  WAKE_PHASES, BREATH_SECONDS,
} from '../src/utils/screensaver.js'

describe('screensaverSettings', () => {
  it('falls back to the defaults', () => {
    expect(screensaverSettings(null)).toEqual(SCREENSAVER_DEFAULTS)
    expect(screensaverSettings('nope')).toEqual(SCREENSAVER_DEFAULTS)
    expect(screensaverSettings([])).toEqual(SCREENSAVER_DEFAULTS)
  })

  it('takes valid stored values and ignores bad ones', () => {
    expect(screensaverSettings({ idleSeconds: 2, mobile: true, enabled: false }))
      .toEqual({ enabled: false, idleSeconds: 2, mobile: true })
    expect(screensaverSettings({ idleSeconds: 0, mobile: 'yes', enabled: 1 }))
      .toEqual(SCREENSAVER_DEFAULTS)
    expect(screensaverSettings({ idleSeconds: NaN }).idleSeconds).toBe(180)
  })
})

describe('createIdleTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires once after the threshold with no input', () => {
    const onIdle = vi.fn()
    const timer = createIdleTimer({ timeoutMs: 2000, onIdle })
    timer.start()
    vi.advanceTimersByTime(1999)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onIdle).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10000)
    expect(onIdle).toHaveBeenCalledTimes(1)
    expect(timer.pending).toBe(false)
  })

  it('input pushes the deadline back', () => {
    const onIdle = vi.fn()
    const timer = createIdleTimer({ timeoutMs: 2000, onIdle })
    timer.start()
    vi.advanceTimersByTime(1500)
    timer.poke()
    vi.advanceTimersByTime(1500)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('input after firing starts a new countdown', () => {
    const onIdle = vi.fn()
    const timer = createIdleTimer({ timeoutMs: 2000, onIdle })
    timer.start()
    vi.advanceTimersByTime(2000)
    timer.poke()
    vi.advanceTimersByTime(2000)
    expect(onIdle).toHaveBeenCalledTimes(2)
  })

  it('does nothing once stopped', () => {
    const onIdle = vi.fn()
    const timer = createIdleTimer({ timeoutMs: 2000, onIdle })
    timer.start()
    timer.stop()
    timer.poke()
    vi.advanceTimersByTime(5000)
    expect(onIdle).not.toHaveBeenCalled()
  })
})

describe('stepLogo', () => {
  const bounds = { w: 400, h: 300 }

  it('moves in a straight line in open space', () => {
    const logo = { x: 100, y: 100, w: 50, h: 20, vx: 60, vy: -30 }
    const hit = stepLogo(logo, 0.5, bounds)
    expect(logo).toMatchObject({ x: 130, y: 85, vx: 60, vy: -30 })
    expect(hit).toEqual({ wall: false, obstacle: false })
  })

  it('bounces off each edge and stays inside', () => {
    const right = { x: 345, y: 100, w: 50, h: 20, vx: 100, vy: 0 }
    expect(stepLogo(right, 0.1, bounds).wall).toBe(true)
    expect(right.x).toBe(350)
    expect(right.vx).toBe(-100)

    const top = { x: 100, y: 3, w: 50, h: 20, vx: 0, vy: -100 }
    expect(stepLogo(top, 0.1, bounds).wall).toBe(true)
    expect(top.y).toBe(0)
    expect(top.vy).toBe(100)

    const corner = { x: 2, y: 277, w: 50, h: 20, vx: -100, vy: 100 }
    stepLogo(corner, 0.1, bounds)
    expect(corner).toMatchObject({ x: 0, y: 280, vx: 100, vy: -100 })
  })

  it('bounces off the top of an obstacle and reports it', () => {
    const obstacle = { x: 100, y: 200, w: 200, h: 60 }
    const logo = { x: 150, y: 175, w: 50, h: 20, vx: 40, vy: 100 }
    const hit = stepLogo(logo, 0.1, bounds, obstacle)
    expect(hit.obstacle).toBe(true)
    expect(logo.y).toBe(180)          // resting on top of it
    expect(logo.vy).toBe(-100)
    expect(logo.vx).toBe(40)          // sideways motion kept
  })

  it('bounces off the side of an obstacle', () => {
    const obstacle = { x: 100, y: 200, w: 200, h: 60 }
    const logo = { x: 45, y: 220, w: 50, h: 20, vx: 100, vy: 5 }
    const hit = stepLogo(logo, 0.1, bounds, obstacle)
    expect(hit.obstacle).toBe(true)
    expect(logo.x).toBe(50)
    expect(logo.vx).toBe(-100)
  })

  it('never ends a step overlapping the obstacle or outside the screen', () => {
    const obstacle = { x: 120, y: 210, w: 160, h: 50 }
    let seed = 7
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const logo = spawnLogo({ w: 60, h: 30 }, bounds, obstacle, 140, rand)
    let bonks = 0
    for (let i = 0; i < 20000; i++) {
      if (stepLogo(logo, 1 / 30, bounds, obstacle).obstacle) bonks++
      expect(logo.x).toBeGreaterThanOrEqual(0)
      expect(logo.x).toBeLessThanOrEqual(bounds.w - logo.w)
      expect(logo.y).toBeGreaterThanOrEqual(0)
      expect(logo.y).toBeLessThanOrEqual(bounds.h - logo.h)
      const overlap = logo.x < obstacle.x + obstacle.w && logo.x + logo.w > obstacle.x
        && logo.y < obstacle.y + obstacle.h && logo.y + logo.h > obstacle.y
      expect(overlap).toBe(false)
    }
    expect(bonks).toBeGreaterThan(0)   // it does find her eventually
  })
})

describe('spawnLogo', () => {
  it('starts above the obstacle, inside the screen, at the asked speed', () => {
    const bounds = { w: 800, h: 600 }
    const obstacle = { x: 200, y: 420, w: 400, h: 100 }
    for (let i = 0; i < 50; i++) {
      const logo = spawnLogo({ w: 120, h: 50 }, bounds, obstacle, 150)
      expect(logo.x).toBeGreaterThanOrEqual(0)
      expect(logo.x + logo.w).toBeLessThanOrEqual(bounds.w)
      expect(logo.y + logo.h).toBeLessThanOrEqual(obstacle.y)
      expect(Math.hypot(logo.vx, logo.vy)).toBeCloseTo(150, 5)
      expect(logo.vy).toBeGreaterThan(0)
    }
  })
})

describe('sleep cycle', () => {
  const wakeSeconds = WAKE_PHASES.reduce((sum, p) => sum + p.seconds, 0)

  it('sleeps until bonked', () => {
    const s = createSleeper()
    for (let i = 0; i < 300; i++) stepSleeper(s, 0.1)
    expect(s.phase).toBe('asleep')
    expect(sitUp(s)).toBe(0)
  })

  it('wakes, looks around and goes back to sleep', () => {
    const s = createSleeper()
    stepSleeper(s, 5)
    expect(bonkSleeper(s)).toBe(true)
    const seen = [s.phase]
    for (let t = 0; t < wakeSeconds + 0.5; t += 1 / 30) {
      if (stepSleeper(s, 1 / 30)) seen.push(s.phase)
    }
    expect(seen).toEqual(['startled', 'look-left', 'look-right', 'look-left', 'drowsy', 'asleep'])
    expect(s.wakes).toBe(1)
  })

  it('ignores a bonk while she is already awake', () => {
    const s = createSleeper()
    bonkSleeper(s)
    stepSleeper(s, 0.5)
    expect(bonkSleeper(s)).toBe(false)
    expect(s.phase).toBe('startled')
    expect(s.wakes).toBe(1)
  })

  it('gets through the whole cycle in one long step', () => {
    const s = createSleeper()
    bonkSleeper(s)
    expect(stepSleeper(s, wakeSeconds + 1)).toBe(true)
    expect(s.phase).toBe('asleep')
    expect(s.asleepFor).toBeCloseTo(1, 5)
  })

  it('sits bolt upright when startled and is lying again by the time she sleeps', () => {
    const s = createSleeper()
    bonkSleeper(s)
    expect(sitUp(s)).toBeCloseTo(0, 5)
    let peak = 0
    while (s.phase === 'startled') { stepSleeper(s, 1 / 30); peak = Math.max(peak, sitUp(s)) }
    expect(peak).toBeGreaterThan(1)       // overshoots: a proper jolt
    expect(peak).toBeLessThan(1.25)
    expect(sitUp(s)).toBe(1)              // upright while she looks around
    let last = 1
    while (s.phase !== 'asleep') {
      stepSleeper(s, 1 / 30)
      if (s.phase === 'drowsy') { expect(sitUp(s)).toBeLessThanOrEqual(last + 1e-9); last = sitUp(s) }
    }
    expect(last).toBeLessThan(0.02)
    expect(sitUp(s)).toBe(0)
  })
})

describe('snot bubble', () => {
  it('swells on the out-breath and shrinks on the in-breath', () => {
    expect(breath(0)).toBeCloseTo(0)
    expect(breath(BREATH_SECONDS / 2)).toBeCloseTo(1)
    expect(breath(BREATH_SECONDS)).toBeCloseTo(0)

    const s = createSleeper()
    stepSleeper(s, BREATH_SECONDS * 10)            // settled, breathed in
    const small = bubbleSize(s)
    stepSleeper(s, BREATH_SECONDS / 2)             // breathed out
    const big = bubbleSize(s)
    expect(big).toBeCloseTo(1)
    expect(small).toBeGreaterThan(0.2)             // never quite disappears
    expect(small).toBeLessThan(0.4)
  })

  it('pops when she wakes and grows back after she drops off', () => {
    const s = createSleeper()
    stepSleeper(s, 20)
    bonkSleeper(s)
    expect(bubbleSize(s)).toBe(0)
    while (s.phase !== 'asleep') { stepSleeper(s, 1 / 30); if (s.phase !== 'asleep') expect(bubbleSize(s)).toBe(0) }
    expect(bubbleSize(s)).toBeLessThan(0.05)       // starts from nothing
    stepSleeper(s, BREATH_SECONDS * 2.5)
    expect(bubbleSize(s)).toBeGreaterThan(0.9)
  })
})
