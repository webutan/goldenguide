// URL <-> app state without a router (G01).
//
// URL scheme
//   /                     desktop
//   /map                  map view
//   /directory            directory view
//   /bar/<slug>           a bar's card (slug percent-encoded; may be Japanese)
//   ?lang=en|jp           language for this visit (wins over the saved one)
//   ?tags=a,b&mode=and&open=1&floor=2&cmin=&cmax=&dmin=&dmax=
//                         map filters; only on map URLs (/map and /bar/<slug>)
//
// History rules
//   pushState     the view or the open bar changed through a user action
//                 (switching view, opening a bar, closing a bar)
//   replaceState  everything else: filters, language, moving between the tabs
//                 of a card that is already open, and tidying a URL that does
//                 not resolve (unknown slug -> /map)
//
// The top half of this file is pure (no DOM, no Vue) and unit-tested.
import { watch, onUnmounted } from 'vue'

export const DEFAULT_LANG = 'en'
export const SITE_TITLE = 'Golden Gai Map'

const EMPTY_FILTERS = Object.freeze({
  tags: Object.freeze([]),
  mode: 'or',
  open: false,
  floor: null,
  chargeMin: null,
  chargeMax: null,
  drinkMin: null,
  drinkMax: null,
})

export function emptyFilters() {
  return { ...EMPTY_FILTERS, tags: [] }
}

// Query names of the four price bounds
const PRICE_PARAMS = [
  ['cmin', 'chargeMin'],
  ['cmax', 'chargeMax'],
  ['dmin', 'drinkMin'],
  ['dmax', 'drinkMax'],
]

function safeDecode(str) {
  try {
    return decodeURIComponent(str)
  } catch {
    return null // malformed percent-encoding
  }
}

export function parseLang(value) {
  if (value === 'en') return 'en'
  if (value === 'jp' || value === 'ja') return 'jp'
  return null
}

function parseIntParam(value, { min = -Infinity } = {}) {
  if (value === null || !/^-?\d{1,7}$/.test(value)) return null
  const n = Number(value)
  return n >= min ? n : null
}

function parseFilters(params) {
  const filters = emptyFilters()
  const rawTags = params.get('tags')
  if (rawTags) {
    for (const tag of rawTags.split(',')) {
      const id = tag.trim()
      if (id && !filters.tags.includes(id)) filters.tags.push(id)
    }
  }
  if (params.get('mode') === 'and') filters.mode = 'and'
  if (params.get('open') === '1') filters.open = true
  const floor = parseIntParam(params.get('floor'))
  if (floor !== null && floor !== 0) filters.floor = floor
  for (const [param, key] of PRICE_PARAMS) {
    filters[key] = parseIntParam(params.get(param), { min: 0 })
  }
  return filters
}

/**
 * Parse a location into a route.
 * @param {string} pathname  as given by location.pathname (percent-encoded)
 * @param {string} [search]  as given by location.search
 * @returns {{ view: 'desktop'|'directory'|'map', slug: string|null, lang: 'en'|'jp'|null, filters: object }}
 * Anything that is not recognised is the desktop, so a mistyped URL still loads the app.
 */
export function parseUrl(pathname, search = '') {
  const params = new URLSearchParams(search)
  const segments = String(pathname || '/').split('/').filter(Boolean)
  const route = { view: 'desktop', slug: null, lang: parseLang(params.get('lang')), filters: emptyFilters() }

  if (segments[0] === 'bar' && segments.length <= 2) {
    route.view = 'map'
    route.slug = segments[1] ? safeDecode(segments[1]) : null
  } else if (segments.length === 1 && (segments[0] === 'map' || segments[0] === 'directory')) {
    route.view = segments[0]
  }

  if (route.view === 'map') route.filters = parseFilters(params)
  return route
}

/** Serialise a route. Inverse of parseUrl for everything parseUrl accepts. */
export function buildUrl(route) {
  let path = '/'
  if (route.slug) path = `/bar/${encodeURIComponent(route.slug)}`
  else if (route.view === 'map') path = '/map'
  else if (route.view === 'directory') path = '/directory'

  const query = []
  if (route.lang) query.push(`lang=${route.lang}`)
  const f = route.filters
  if (f && route.view === 'map') {
    // Commas stay literal so the URL reads tags=karaoke,jazz
    if (f.tags && f.tags.length) query.push(`tags=${f.tags.map(encodeURIComponent).join(',')}`)
    if (f.mode === 'and') query.push('mode=and')
    if (f.open) query.push('open=1')
    if (f.floor != null) query.push(`floor=${f.floor}`)
    for (const [param, key] of PRICE_PARAMS) {
      if (f[key] != null) query.push(`${param}=${f[key]}`)
    }
  }
  return query.length ? `${path}?${query.join('&')}` : path
}

/**
 * How moving from one route to another should be recorded in history.
 * A change of view or of the open bar is a new entry; anything else
 * (filters, language) rewrites the current one.
 */
export function navigationKind(from, to) {
  if (buildUrl(from) === buildUrl(to)) return 'none'
  if (from.view !== to.view || (from.slug || null) !== (to.slug || null)) return 'push'
  return 'replace'
}

/** The link handed out by the share button: no filters, ?lang only when not the default. */
export function barShareUrl(origin, slug, lang) {
  const url = buildUrl({ view: 'map', slug, lang: lang && lang !== DEFAULT_LANG ? lang : null })
  return `${String(origin || '').replace(/\/+$/, '')}${url}`
}

/** Language for a visit: ?lang, then the saved choice, then the browser's. */
export function resolveLang({ urlLang, savedLang, browserLang } = {}) {
  return parseLang(urlLang) || parseLang(savedLang) || langFromBrowser(browserLang)
}

export function langFromBrowser(browserLang) {
  return /^ja\b/i.test(String(browserLang || '')) ? 'jp' : 'en'
}

export function barTitle(barName) {
  return barName ? `${barName} — ${SITE_TITLE}` : SITE_TITLE
}

// ── Browser glue ──────────────────────────────────────────────────────────────

/** Native share sheet only where it is the expected thing: touch devices. */
export function canNativeShare() {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768
}

/**
 * Keep the address bar and the app state in step.
 *
 * @param {object} opts
 * @param {() => object} opts.read   current route, read from reactive app state
 * @param {(route: object, historyState: any) => void} opts.apply
 *        put a route into app state (synchronously; it may start async work)
 * @param {() => any} [opts.historyState]  extra data stored with each entry
 *
 * Loops are impossible by construction: a state change only writes to history
 * when the URL it serialises to differs from the one in the address bar, and
 * nothing is written while a URL is being applied (popstate / boot). Once the
 * apply has finished the address bar is rewritten in place if the state ended
 * up somewhere else (e.g. an unknown slug).
 */
export function useUrlState({ read, apply, historyState = () => null }) {
  let started = false
  let applying = 0
  let nextKind = null

  const here = () => window.location.pathname + window.location.search

  function write(kind, url) {
    try {
      window.history[kind === 'push' ? 'pushState' : 'replaceState'](historyState(), '', url)
    } catch {
      /* history can be unavailable (sandboxed frames); the app still works */
    }
  }

  function sync(forceKind) {
    if (!started || applying) return
    const route = read()
    const url = buildUrl(route)
    const hint = nextKind
    nextKind = null
    if (url === here()) return
    const kind = forceKind || hint || navigationKind(parseUrl(window.location.pathname, window.location.search), route)
    write(kind === 'push' ? 'push' : 'replace', url)
  }

  function applyLocation() {
    applying++
    try {
      apply(parseUrl(window.location.pathname, window.location.search), window.history.state)
    } finally {
      applying--
    }
    // The watcher below is flush:'post'; hold it off until the state it would
    // see is the applied one, then canonicalise in place.
    applying++
    Promise.resolve().then(() => {
      applying--
      sync('replace')
    })
  }

  watch(() => buildUrl(read()), () => sync(), { flush: 'post' })

  window.addEventListener('popstate', applyLocation)
  onUnmounted(() => window.removeEventListener('popstate', applyLocation))

  return {
    /** Apply the address bar to the app and start tracking. Call once the data is loaded. */
    start() {
      if (started) return
      started = true
      applyLocation()
    },
    /** The state change about to happen should rewrite the current entry. */
    replaceNext() {
      nextKind = 'replace'
      // Dropped after the pending flush if the change turned out not to move the URL
      setTimeout(() => { nextKind = null }, 0)
    },
  }
}
