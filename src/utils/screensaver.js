// Pure logic for the screensaver (F07), independent of Vue, the DOM and
// three.js so it can be unit tested:
//   - settings (idle threshold etc.) read from storage
//   - an idle timer
//   - the bouncing GAI OS logo
//   - Gai-chan's sleep / wake cycle and her snot bubble

// ── Settings ────────────────────────────────────────────────────────────────
export const SCREENSAVER_KEY = 'golden-gai-screensaver'
export const SCREENSAVER_DEFAULTS = Object.freeze({
  enabled: true,
  idleSeconds: 180,
  mobile: false,     // off on phones unless switched on
})

/** Merge a stored settings object over the defaults, ignoring bad values. */
export function screensaverSettings(stored) {
  const s = { ...SCREENSAVER_DEFAULTS }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return s
  if (typeof stored.enabled === 'boolean') s.enabled = stored.enabled
  if (typeof stored.mobile === 'boolean') s.mobile = stored.mobile
  if (Number.isFinite(stored.idleSeconds) && stored.idleSeconds >= 1) s.idleSeconds = stored.idleSeconds
  return s
}

// ── Idle timer ──────────────────────────────────────────────────────────────
/**
 * Calls `onIdle` once `timeoutMs` passes with no `poke()`. After firing it
 * stays quiet until the next `poke()` (or `start()`), so the caller decides
 * when watching resumes.
 * @param {{timeoutMs: number, onIdle: () => void, setTimer?: Function, clearTimer?: Function}} opts
 */
export function createIdleTimer({ timeoutMs, onIdle, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let handle = null
  let running = false
  function arm() {
    clearTimer(handle)
    handle = setTimer(() => { handle = null; onIdle() }, timeoutMs)
  }
  return {
    start() { running = true; arm() },
    poke() { if (running) arm() },
    stop() { running = false; clearTimer(handle); handle = null },
    get pending() { return handle !== null },
  }
}

// ── Bouncing logo ───────────────────────────────────────────────────────────
// Everything is in pixels, y down. The logo is `{ x, y, w, h, vx, vy }` with
// x/y its top-left corner; velocities are pixels per second.

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * Move the logo by `dt` seconds inside `bounds` ({ w, h }), bouncing off the
 * edges and off `obstacle` ({ x, y, w, h } or null). Mutates `logo`.
 * @returns {{ wall: boolean, obstacle: boolean }} what it bounced off this step
 */
export function stepLogo(logo, dt, bounds, obstacle = null) {
  const hit = { wall: false, obstacle: false }
  logo.x += logo.vx * dt
  logo.y += logo.vy * dt

  if (obstacle && overlaps(logo, obstacle)) {
    // Push out along the shallowest side and reflect that component
    const left = logo.x + logo.w - obstacle.x
    const right = obstacle.x + obstacle.w - logo.x
    const top = logo.y + logo.h - obstacle.y
    const bottom = obstacle.y + obstacle.h - logo.y
    const min = Math.min(left, right, top, bottom)
    if (min === top) { logo.y = obstacle.y - logo.h; logo.vy = -Math.abs(logo.vy) }
    else if (min === bottom) { logo.y = obstacle.y + obstacle.h; logo.vy = Math.abs(logo.vy) }
    else if (min === left) { logo.x = obstacle.x - logo.w; logo.vx = -Math.abs(logo.vx) }
    else { logo.x = obstacle.x + obstacle.w; logo.vx = Math.abs(logo.vx) }
    hit.obstacle = true
  }

  const maxX = Math.max(0, bounds.w - logo.w)
  const maxY = Math.max(0, bounds.h - logo.h)
  if (logo.x <= 0) { logo.x = 0; logo.vx = Math.abs(logo.vx); hit.wall = true }
  else if (logo.x >= maxX) { logo.x = maxX; logo.vx = -Math.abs(logo.vx); hit.wall = true }
  if (logo.y <= 0) { logo.y = 0; logo.vy = Math.abs(logo.vy); hit.wall = true }
  else if (logo.y >= maxY) { logo.y = maxY; logo.vy = -Math.abs(logo.vy); hit.wall = true }
  return hit
}

/**
 * A starting position and velocity for the logo: in the top part of the
 * screen, clear of `obstacle`, heading diagonally at `speed` px/s.
 * `rand` is a 0..1 generator (injectable for tests).
 */
export function spawnLogo(size, bounds, obstacle, speed, rand = Math.random) {
  const roomY = obstacle ? Math.max(0, obstacle.y - size.h) : Math.max(0, bounds.h - size.h)
  const angle = (Math.PI / 180) * (32 + rand() * 26)      // 32°–58° off horizontal
  return {
    x: rand() * Math.max(0, bounds.w - size.w),
    y: rand() * roomY * 0.6,
    w: size.w,
    h: size.h,
    vx: Math.cos(angle) * speed * (rand() < 0.5 ? -1 : 1),
    vy: Math.sin(angle) * speed,
  }
}

// Logo tints, cycled on every bounce like the DVD logo. Site neon colours.
export const LOGO_TINTS = ['#ff9a2e', '#ff5fa2', '#3fd6c6', '#ffe45c', '#b48cff', '#7dd3ff']

// ── Gai-chan's sleep cycle ──────────────────────────────────────────────────
// asleep → (bonk) → startled → look-left → look-right → look-left → drowsy → asleep
// Each waking phase lasts a fixed time; `asleep` lasts until the next bonk.
export const WAKE_PHASES = [
  { name: 'startled',   seconds: 1.0 },
  { name: 'look-left',  seconds: 0.75 },
  { name: 'look-right', seconds: 0.9 },
  { name: 'look-left',  seconds: 0.6 },
  { name: 'drowsy',     seconds: 1.9 },
]
export const BREATH_SECONDS = 3.6

export function createSleeper() {
  return {
    phase: 'asleep',
    index: -1,        // position in WAKE_PHASES, -1 while asleep
    t: 0,             // seconds in the current phase
    asleepFor: 0,     // seconds since she last fell asleep (drives the bubble)
    wakes: 0,         // how many times she has been woken
  }
}

/** Wake her. Returns false (and does nothing) if she is already awake. */
export function bonkSleeper(s) {
  if (s.phase !== 'asleep') return false
  s.index = 0
  s.phase = WAKE_PHASES[0].name
  s.t = 0
  s.wakes++
  return true
}

/** Advance the cycle by `dt` seconds. Returns true when the phase changed. */
export function stepSleeper(s, dt) {
  if (s.phase === 'asleep') {
    s.asleepFor += dt
    return false
  }
  s.t += dt
  let changed = false
  while (s.index >= 0 && s.t >= WAKE_PHASES[s.index].seconds) {
    s.t -= WAKE_PHASES[s.index].seconds
    s.index++
    changed = true
    if (s.index >= WAKE_PHASES.length) {
      s.index = -1
      s.phase = 'asleep'
      s.asleepFor = s.t
      s.t = 0
    } else {
      s.phase = WAKE_PHASES[s.index].name
    }
  }
  return changed
}

/** 0..1 through the current waking phase (0 while asleep). */
export function phaseProgress(s) {
  return s.index < 0 ? 0 : Math.min(1, s.t / WAKE_PHASES[s.index].seconds)
}

/**
 * How far out the breath is, 0 (breathed in) to 1 (breathed out), `seconds`
 * after falling asleep. The bubble swells on the out-breath.
 */
export function breath(seconds) {
  return 0.5 - 0.5 * Math.cos((seconds / BREATH_SECONDS) * Math.PI * 2)
}

/**
 * Snot-bubble size, 0..1 of its full radius. It is gone while she is awake,
 * grows back over the first breaths after she drops off, then swells and
 * shrinks with her breathing without ever quite disappearing.
 */
export function bubbleSize(s) {
  if (s.phase !== 'asleep') return 0
  const regrow = Math.min(1, s.asleepFor / (BREATH_SECONDS * 1.5))
  return regrow * (0.28 + 0.72 * breath(s.asleepFor))
}

/**
 * How upright she is, 0 (lying down) to 1 (sitting bolt upright).
 * She springs up with a little overshoot and sinks back while drowsy.
 */
export function sitUp(s) {
  if (s.phase === 'asleep') return 0
  const p = phaseProgress(s)
  if (s.phase === 'startled') {
    const q = Math.min(1, p / 0.32)
    const c = 2.2                                   // ease-out-back overshoot
    return 1 + (c + 1) * (q - 1) ** 3 + c * (q - 1) ** 2
  }
  if (s.phase === 'drowsy') {
    const q = Math.max(0, (p - 0.35) / 0.65)
    return 1 - q * q * (3 - 2 * q)                   // smoothstep down
  }
  return 1
}
