// When the screensaver (F07) comes on: after a stretch with no pointer, key or
// touch input, if the caller says the moment is right. The settings live in
// localStorage under `golden-gai-screensaver` (see utils/screensaver.js), which
// is where a Control Panel can change them and where tests shorten the wait.
import { ref, onMounted, onUnmounted } from 'vue'
import { readJSON } from '../utils/storage.js'
import { SCREENSAVER_KEY, screensaverSettings, createIdleTimer } from '../utils/screensaver.js'

const INPUT_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']

function typingSomewhere() {
  const el = document.activeElement
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

/**
 * @param {object} opts
 * @param {() => boolean} opts.canStart  is this a moment it may come on by itself?
 *   (desktop view, nothing modal open …). Called when the idle time is up.
 * @param {() => boolean} opts.isMobile
 */
export function useScreensaver({ canStart, isMobile }) {
  const active = ref(false)
  const settings = screensaverSettings(readJSON(SCREENSAVER_KEY, null))
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const timer = createIdleTimer({
    timeoutMs: settings.idleSeconds * 1000,
    onIdle() {
      const ok = !document.hidden && !typingSomewhere()
        && (settings.mobile || !isMobile()) && canStart()
      if (ok) active.value = true
      else timer.start()          // not now: wait another full stretch
    },
  })

  function onInput() {
    if (!active.value) timer.poke()
  }

  /** Show it now, whatever the settings say (Start menu). */
  function show() {
    timer.stop()
    active.value = true
  }

  function dismiss() {
    active.value = false
    if (auto) timer.start()
  }

  // It never starts by itself when switched off or when the visitor asked for less motion
  const auto = settings.enabled && !reducedMotion

  onMounted(() => {
    for (const evt of INPUT_EVENTS) window.addEventListener(evt, onInput, { capture: true, passive: true })
    if (auto) timer.start()
  })
  onUnmounted(() => {
    for (const evt of INPUT_EVENTS) window.removeEventListener(evt, onInput, { capture: true })
    timer.stop()
  })

  return { active, show, dismiss }
}
