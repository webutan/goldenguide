// Which requests the service worker (src/sw.js) handles. Pure, so it is
// unit-tested; anything that matches nothing here is left to the browser.

/** Public JSON the app needs to boot; cached stale-while-revalidate. */
export const PUBLIC_API_PATHS = Object.freeze(['/api/bars', '/api/tags', '/api/partitions', '/api/annotations'])

/** How long a navigation may wait for the server before the saved shell answers. */
export const NAV_TIMEOUT_MS = 3000

// Never the app: proxied to the API, or files in their own right
const NOT_APP_PREFIXES = ['/api/', '/socket.io/', '/uploads/', '/assets/']
const NOT_APP_PATHS = ['/api', '/socket.io', '/sitemap.xml', '/robots.txt', '/sw.js', '/manifest.webmanifest']

/**
 * True for a URL that nginx answers with the app shell (/, /map, /directory,
 * /bar/<slug>, and any unknown path). A path whose last segment looks like a
 * file name is a file, except under /bar/ where a slug may contain a dot.
 */
export function isAppNavigationPath(pathname) {
  const path = String(pathname || '/')
  if (NOT_APP_PATHS.includes(path)) return false
  if (NOT_APP_PREFIXES.some(prefix => path.startsWith(prefix))) return false
  if (path.startsWith('/bar/')) return true
  const last = path.slice(path.lastIndexOf('/') + 1)
  return !/\.[a-z0-9]{2,12}$/i.test(last)
}

/**
 * A GET for one of the public API lists, as an anonymous visitor sends it.
 * Admin requests carry a password header and get a different answer
 * (inactive bars), so they are never served from or written to the cache.
 * @param {URL} url
 * @param {{ has(name: string): boolean }} headers
 */
export function isPublicApiRequest(url, headers) {
  if (!PUBLIC_API_PATHS.includes(url.pathname) || url.search) return false
  return !(headers && (headers.has('X-Admin-Password') || headers.has('Authorization')))
}

/** The hashed entry script a shell (index.html) loads, or null. */
export function entryScriptOf(html) {
  const match = /<script\b[^>]*\bsrc="(\/assets\/[^"]+\.js)"/i.exec(String(html || ''))
  return match ? match[1] : null
}

/** Runtime cache for a static path: 'uploads' | 'art' | 'assets' | null. */
export function runtimeCacheFor(pathname) {
  const path = String(pathname || '')
  if (path.startsWith('/uploads/')) return 'uploads'
  if (path.startsWith('/gaichan/')) return 'art'
  if (path.startsWith('/assets/')) return 'assets'
  return null
}
