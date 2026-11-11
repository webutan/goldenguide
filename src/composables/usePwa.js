// Installable app / offline mode (G03): service worker registration, the
// "new version" flag, the browser's install prompt and the online state.
// The worker itself is src/sw.js. It is only registered in a production
// build; `npm run dev` and the tests never get one.
import { ref, computed } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import { PUBLIC_API_PATHS } from '../utils/swRules.js'

const hasWindow = typeof window !== 'undefined'

// ── Online state ──────────────────────────────────────────────────────────────
// navigator.onLine only knows about the network interface. The worker also
// reports when the API could not be reached (bad signal in the alleys), which
// counts as offline until a request gets through again.
const browserOffline = ref(hasWindow && navigator.onLine === false)
const apiUnreachable = ref(false)
const offline = computed(() => browserOffline.value || apiUnreachable.value)

// ── Update ────────────────────────────────────────────────────────────────────
const updateReady = ref(false)
let applyUpdate = null

/** Activate the waiting worker and reload the page on the new version. */
function restartIntoUpdate() {
  updateReady.value = false
  if (applyUpdate) applyUpdate(true)
}

// ── Install prompt ────────────────────────────────────────────────────────────
// Chromium (Android, desktop) hands over an event that can open its install
// dialog later, from a click. iOS has no such thing: the wizard explains the
// Share menu instead.
const installPrompt = ref(null)
const installed = ref(false)

function isStandalone() {
  if (!hasWindow) return false
  return (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    || navigator.standalone === true
}

function isIos() {
  if (!hasWindow) return false
  const ua = navigator.userAgent || ''
  // iPadOS reports itself as a Mac, but has a touch screen
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

/** 'prompt' (browser dialog available) | 'ios' | 'manual' | 'installed' */
const installMode = computed(() => {
  if (installed.value || isStandalone()) return 'installed'
  if (installPrompt.value) return 'prompt'
  return isIos() ? 'ios' : 'manual'
})

/**
 * Open the browser's install dialog. Must be called from a click.
 * Resolves 'accepted' | 'dismissed' | 'unavailable'.
 */
async function promptInstall() {
  const event = installPrompt.value
  if (!event) return 'unavailable'
  // The event can be used once
  installPrompt.value = null
  try {
    await event.prompt()
    const choice = await event.userChoice
    return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
  } catch {
    return 'unavailable'
  }
}

/** Resolves true once a service worker controls this page (offline files are in place). */
function whenOfflineReady(timeoutMs = 8000) {
  if (!hasWindow || !('serviceWorker' in navigator) || !import.meta.env.PROD) return Promise.resolve(false)
  return Promise.race([
    navigator.serviceWorker.ready.then(() => true, () => false),
    new Promise(resolve => setTimeout(() => resolve(false), timeoutMs)),
  ])
}

// ── Wiring (once) ─────────────────────────────────────────────────────────────
const dataListeners = new Set()

/** Call `fn(path)` when the worker stored a changed copy of a public API list. */
function onDataUpdated(fn) {
  dataListeners.add(fn)
  return () => dataListeners.delete(fn)
}

// What the page loaded before the worker took control, for it to cache
function sendBackfill(worker) {
  if (!worker) return
  let urls = []
  try {
    urls = performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => name.startsWith(window.location.origin + '/'))
  } catch { /* no Resource Timing: the API lists are still fetched */ }
  worker.postMessage({ type: 'gg-backfill', urls: [...PUBLIC_API_PATHS, ...urls] })
}

const UPDATE_CHECK_MS = 60 * 60 * 1000

let started = false
function start() {
  if (started || !hasWindow) return
  started = true

  window.addEventListener('online', () => {
    browserOffline.value = false
    apiUnreachable.value = false
  })
  window.addEventListener('offline', () => { browserOffline.value = true })

  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep it for the wizard instead of the browser's own banner
    event.preventDefault()
    installPrompt.value = event
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installPrompt.value = null
  })

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  const firstInstall = !navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === 'gg-api-unreachable') apiUnreachable.value = true
    else if (data.type === 'gg-api-reachable') apiUnreachable.value = false
    else if (data.type === 'gg-data-updated') dataListeners.forEach(fn => fn(data.path))
  })

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() { updateReady.value = true },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // A long-lived installed app never navigates: look for a new build when
      // it comes back to the foreground, at most once an hour.
      let lastCheck = Date.now()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || navigator.onLine === false) return
        if (Date.now() - lastCheck < UPDATE_CHECK_MS) return
        lastCheck = Date.now()
        registration.update().catch(() => {})
      })
    },
  })

  if (firstInstall) {
    navigator.serviceWorker.ready.then((registration) => {
      // Give the first page load a moment to finish fetching what it shows
      setTimeout(() => sendBackfill(registration.active), 3000)
    }).catch(() => {})
  }
}

export function usePwa() {
  start()
  return {
    offline, updateReady, restartIntoUpdate,
    installMode, promptInstall, whenOfflineReady, isStandalone, onDataUpdated,
  }
}

/** Just the online state, for components that only show an offline message. */
export function useOnline() {
  start()
  return { offline }
}
