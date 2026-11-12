<script setup>
// The screensaver (F07): Gai-chan asleep on a futon with a snot bubble, while
// the GAI OS logo bounces around the screen. When it bonks her she jolts
// awake, looks around and nods off again.
//
// One requestAnimationFrame loop, capped at 30 fps, drives everything; it is
// stopped while the tab is hidden and for good when the component goes away.
// Any input dismisses it, and that input never reaches what is underneath.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '../composables/useI18n.js'
import {
  stepLogo, spawnLogo, LOGO_TINTS,
  createSleeper, bonkSleeper, stepSleeper,
} from '../utils/screensaver.js'

const props = defineProps({ lang: { type: String, default: 'en' } })
const emit = defineEmits(['dismiss'])
const { t } = useI18n(computed(() => props.lang))

const FPS = 30
const PIXEL_HEIGHT = 240       // rows of pixels the 3D scene is drawn at (chunky on purpose)
const MOVE_TOLERANCE = 10      // px of mouse travel before it counts as input
const MOVE_GRACE_MS = 700      // the mouse is still settling after "Screen Saver" was clicked

const root = ref(null)
const canvas = ref(null)
const logoEl = ref(null)
const tint = ref(LOGO_TINTS[0])
const sceneReady = ref(false)

const sleeper = createSleeper()
let logo = null
let bounds = { w: 0, h: 0 }
let collider = null
let stage = null
let scene = null
let raf = 0
let last = 0
let acc = 0
let tintIndex = 0
let disposed = false
let dismissing = false
let moveFrom = null
let armedAt = 0
let swallowTimer = 0

function measure() {
  bounds = { w: window.innerWidth, h: window.innerHeight }
  if (stage) {
    // Same chunky pixels on a phone as on a monitor: about PIXEL_HEIGHT rows
    // across the screen's short side, and never finer than 2 CSS px each
    const pixel = Math.max(2, Math.min(bounds.w, bounds.h) / PIXEL_HEIGHT)
    stage.opts.pixelHeight = bounds.h / pixel
    stage.resize(bounds.w, bounds.h)
    scene.frame(bounds.w / bounds.h)
    collider = scene.colliderRect(bounds.w, bounds.h)
  }
  const size = logoEl.value ? { w: logoEl.value.offsetWidth, h: logoEl.value.offsetHeight } : { w: 160, h: 60 }
  const speed = Math.max(70, Math.min(bounds.w, bounds.h) * 0.145)
  if (!logo) {
    logo = spawnLogo(size, bounds, collider, speed)
  } else {
    // Keep the heading, refit to the new screen
    const k = speed / (Math.hypot(logo.vx, logo.vy) || 1)
    Object.assign(logo, { w: size.w, h: size.h, vx: logo.vx * k, vy: logo.vy * k })
    if (collider && logo.y + logo.h > collider.y) logo.y = Math.max(0, collider.y - logo.h - 1)
  }
}

// Dev aid (lab page, ?hitbox): outline what the logo bounces off
function showHitbox() {
  const box = document.createElement('div')
  box.style.cssText = `position:absolute;outline:1px solid #f0f;pointer-events:none;left:${collider.x}px;top:${collider.y}px;width:${collider.w}px;height:${collider.h}px`
  root.value.appendChild(box)
}

function draw() {
  if (logoEl.value && logo) {
    logoEl.value.style.transform = `translate3d(${Math.round(logo.x)}px, ${Math.round(logo.y)}px, 0)`
  }
}

function frame(now) {
  raf = requestAnimationFrame(frame)
  acc += Math.min(0.1, (now - last) / 1000)
  last = now
  if (acc < 1 / FPS) return
  const dt = acc
  acc = 0

  const hit = stepLogo(logo, dt, bounds, collider)
  if (hit.wall || hit.obstacle) {
    tintIndex = (tintIndex + 1) % LOGO_TINTS.length
    tint.value = LOGO_TINTS[tintIndex]
  }
  if (hit.obstacle) bonkSleeper(sleeper)
  stepSleeper(sleeper, dt)
  stage?.step(dt)
  draw()
}

function startLoop() {
  if (raf || disposed || document.hidden) return
  last = performance.now()
  acc = 0
  raf = requestAnimationFrame(frame)
}

function stopLoop() {
  cancelAnimationFrame(raf)
  raf = 0
}

function onVisibility() {
  if (document.hidden) stopLoop()
  else startLoop()
}

// ── Dismissal ────────────────────────────────────────────────────────────────
// The overlay covers the whole screen, so pointer input lands on it and not on
// the desktop. Keys are stopped in the capture phase for the same reason.
function swallow(e) {
  e.preventDefault()
  e.stopPropagation()
}

function dismiss() {
  if (dismissing) return
  dismissing = true
  stopLoop()
  emit('dismiss')
}

function onPointerDown(e) {
  swallow(e)
  // Wait for the release: taking the overlay away mid-press would hand the
  // click to whatever is underneath.
  if (swallowTimer) return
  const done = (ev) => {
    if (ev) swallow(ev)
    window.removeEventListener('pointerup', done, true)
    window.removeEventListener('pointercancel', done, true)
    clearTimeout(swallowTimer)
    // let the click that follows the release land on the overlay first
    setTimeout(dismiss, 0)
  }
  window.addEventListener('pointerup', done, true)
  window.addEventListener('pointercancel', done, true)
  swallowTimer = setTimeout(done, 1500)
}

function onPointerMove(e) {
  if (e.pointerType !== 'mouse' || performance.now() < armedAt) return
  if (!moveFrom) { moveFrom = { x: e.clientX, y: e.clientY }; return }
  if (Math.hypot(e.clientX - moveFrom.x, e.clientY - moveFrom.y) > MOVE_TOLERANCE) dismiss()
}

function onKey(e) {
  swallow(e)
  if (e.type === 'keydown') {
    // the matching keyup must not reach the desktop either
    const up = (ev) => { swallow(ev); window.removeEventListener('keyup', up, true) }
    window.addEventListener('keyup', up, true)
    setTimeout(() => window.removeEventListener('keyup', up, true), 1500)
    dismiss()
  }
}

function onWheel(e) {
  swallow(e)
  dismiss()
}

onMounted(async () => {
  armedAt = performance.now() + MOVE_GRACE_MS
  measure()
  draw()
  window.addEventListener('resize', measure)
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('wheel', onWheel, { capture: true, passive: false })
  document.addEventListener('visibilitychange', onVisibility)
  startLoop()

  // The 3D scene loads lazily; until then (or without WebGL) the logo bounces alone.
  try {
    const mod = await import('../gaichan3d/GaiChanStage.js')
    if (disposed) return
    if (!mod.webglAvailable()) throw new Error('WebGL unavailable')
    const st = new mod.GaiChanStage(canvas.value, { pixelHeight: PIXEL_HEIGHT, framing: 'full', fps: FPS })
    await st.load()
    if (disposed) { st.dispose(); return }
    stage = st
    scene = new mod.SleepScene().attach(stage, sleeper)
    measure()
    stage.step(0)
    sceneReady.value = true
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('hitbox')) showHitbox()
    if (import.meta.env.DEV) window.__screensaver = { sleeper, stage, scene, get logo() { return logo }, get collider() { return collider } }
  } catch (err) {
    console.warn('[Screensaver] no 3D scene:', err)
    stage?.dispose()
    stage = null
    scene = null
  }
})

onBeforeUnmount(() => {
  disposed = true
  stopLoop()
  clearTimeout(swallowTimer)
  window.removeEventListener('resize', measure)
  window.removeEventListener('keydown', onKey, true)
  window.removeEventListener('wheel', onWheel, { capture: true })
  document.removeEventListener('visibilitychange', onVisibility)
  scene?.dispose()
  stage?.dispose()
  scene = null
  stage = null
  if (import.meta.env.DEV) delete window.__screensaver
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      class="screensaver"
      role="img"
      :aria-label="t('screensaverLabel')"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @click="swallow"
      @contextmenu="swallow"
    >
      <div ref="logoEl" class="screensaver-logo" :style="{ color: tint }">
        <span class="screensaver-logo-mark"></span>
        <span class="screensaver-logo-text">GAI OS</span>
      </div>
      <canvas ref="canvas" :class="['screensaver-canvas', { 'is-ready': sceneReady }]"></canvas>
    </div>
  </Teleport>
</template>

<style scoped>
.screensaver {
  position: fixed;
  inset: 0;
  z-index: 9990;            /* over every window and dialog, under the CRT overlay */
  background: #05040a;
  overflow: hidden;
  cursor: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.screensaver-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  opacity: 0;
  pointer-events: none;
}
.screensaver-canvas.is-ready { opacity: 1; }

/* The logo sits behind the canvas, so Gai-chan is always drawn over it */
.screensaver-logo {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 0.22em;
  padding: 0.1em 0.18em;
  font-family: var(--win-font);
  font-size: clamp(24px, 5.6vmin, 56px);
  line-height: 1;
  white-space: nowrap;
  will-change: transform;
  pointer-events: none;
  -webkit-font-smoothing: none;
}

/* The Start-button mark, tinted with the logo colour */
.screensaver-logo-mark {
  width: 1em;
  height: 1em;
  background-color: currentColor;
  -webkit-mask: url('/icons/gaios.png') center / contain no-repeat;
  mask: url('/icons/gaios.png') center / contain no-repeat;
  image-rendering: pixelated;
}

.screensaver-logo-text {
  letter-spacing: 0.04em;
  text-shadow: 0.06em 0.06em 0 rgba(0, 0, 0, 0.6);
}
</style>
