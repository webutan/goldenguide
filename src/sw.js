// Service worker (G03): offline mode. Built by vite-plugin-pwa (injectManifest);
// `self.__WB_MANIFEST` is replaced with the precache list at build time.
//
// What each kind of request gets:
//
//   navigations (/, /map, /directory, /bar/<slug>, any other app URL)
//       network first, never cached. The server's answer is passed through as
//       it is (per-page <head>, the 404 + "not-found" marker for an unknown
//       bar). Only when the network fails, answers 5xx or takes longer than
//       NAV_TIMEOUT_MS does the precached shell answer instead; the app then
//       routes the URL itself.
//   precached files (shell, app JS/CSS, fonts, map SVG, icons, cursors)
//       from the precache, revisioned per build.
//   GET /api/bars, /api/tags, /api/partitions, /api/annotations (public only)
//       stale-while-revalidate. The page is told when the copy changed.
//   GET /uploads/*          cache first, at most 60 photos
//   GET /gaichan/*          stale-while-revalidate (Gai-chan art, 3D model)
//   GET /assets/* not in the precache (3D chunk, admin chunks)   cache first
//
// Everything else is not touched at all (no respondWith): /socket.io/, every
// non-GET, /api/admin, /api/reviews, /api/feed, /api/suggestions, /api/stats,
// /sitemap.xml, /robots.txt, other origins, and any request that carries an
// admin password (admins get inactive bars from /api/bars; that answer must
// neither come from nor go into the public cache).
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache, getCacheKeyForURL } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  PUBLIC_API_PATHS, NAV_TIMEOUT_MS, isAppNavigationPath, isPublicApiRequest, runtimeCacheFor,
} from './utils/swRules.js'

const ORIGIN = self.location.origin

async function postToClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of clients) client.postMessage(message)
}

// ── Navigations ───────────────────────────────────────────────────────────────

async function handleNavigation({ request }) {
  const shell = await matchPrecache('index.html')
  const network = fetch(request).then((response) => {
    // A broken upstream (502 from a tunnel etc.): the saved app beats an error page
    if (response.status >= 500 && shell) return shell.clone()
    return response
  })
  if (!shell) return network

  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(shell.clone()), NAV_TIMEOUT_MS)
  })
  try {
    return await Promise.race([network.catch(() => shell.clone()), timeout])
  } finally {
    clearTimeout(timer)
  }
}

// Registered before the precache route so that no navigation is ever answered
// cache-first (not even one to /index.html).
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.origin === ORIGIN && isAppNavigationPath(url.pathname),
  handleNavigation,
)

// ── Precache ──────────────────────────────────────────────────────────────────

precacheAndRoute(self.__WB_MANIFEST, { directoryIndex: null, cleanURLs: false })
cleanupOutdatedCaches()

// ── Runtime caches ────────────────────────────────────────────────────────────

// Tells the page whether the API could be reached, and when saved data changed
// (so it can show the fresh list without a manual reload).
const apiNotifyPlugin = {
  async fetchDidSucceed({ response }) {
    postToClients({ type: response.status < 500 ? 'gg-api-reachable' : 'gg-api-unreachable' })
    return response
  },
  async fetchDidFail() {
    postToClients({ type: 'gg-api-unreachable' })
  },
  async cacheDidUpdate({ request, oldResponse, newResponse }) {
    if (!oldResponse) return
    const [before, after] = await Promise.all([oldResponse.text(), newResponse.text()])
    if (before !== after) postToClients({ type: 'gg-data-updated', path: new URL(request.url).pathname })
  },
}

const strategies = {
  api: new StaleWhileRevalidate({ cacheName: 'gg-api', plugins: [apiNotifyPlugin] }),
  uploads: new CacheFirst({
    cacheName: 'gg-uploads',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true })],
  }),
  art: new StaleWhileRevalidate({
    cacheName: 'gg-art',
    plugins: [new ExpirationPlugin({ maxEntries: 80, purgeOnQuotaError: true })],
  }),
  assets: new CacheFirst({
    cacheName: 'gg-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 24 * 60 * 60, purgeOnQuotaError: true })],
  }),
}

function strategyFor(request, url) {
  if (request.method !== 'GET' || url.origin !== ORIGIN) return null
  if (isPublicApiRequest(url, request.headers)) return strategies.api
  const kind = runtimeCacheFor(url.pathname)
  return kind ? strategies[kind] : null
}

registerRoute(
  ({ request, url }) => !!strategyFor(request, url),
  ({ request, url, event }) => strategyFor(request, url).handle({ request, event }),
)

// ── Messages from the page ────────────────────────────────────────────────────

// The very first visit loads everything before this worker controls the page,
// so nothing of it would be in the runtime caches. The page sends the URLs it
// has loaded; the cacheable ones are fetched again (mostly from the HTTP
// cache) and stored.
async function backfill(urls, event) {
  const wanted = new Set(PUBLIC_API_PATHS)
  for (const raw of urls.slice(0, 300)) {
    if (typeof raw === 'string') wanted.add(raw)
  }
  for (const raw of wanted) {
    let url
    try { url = new URL(raw, ORIGIN) } catch { continue }
    // Already in the precache (the app's own JS/CSS, fonts, map)
    if (getCacheKeyForURL(url.href)) continue
    const request = new Request(url.href)
    const strategy = strategyFor(request, url)
    if (!strategy) continue
    try {
      if (await caches.match(request, { cacheName: strategy.cacheName })) continue
      await strategy.handle({ request, event })
    } catch { /* best effort */ }
  }
}

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return
  // "Restart" in the update dialog
  if (data.type === 'SKIP_WAITING') self.skipWaiting()
  else if (data.type === 'gg-backfill' && Array.isArray(data.urls)) event.waitUntil(backfill(data.urls, event))
})

self.addEventListener('activate', (event) => {
  // Take over the page that registered us, so its next requests are cached
  event.waitUntil(self.clients.claim())
})
