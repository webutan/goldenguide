<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, defineAsyncComponent } from 'vue'
import WinLoading from './components/win2000/WinLoading.vue'
import GoldenGaiMap from './components/GoldenGaiMap.vue'
import BarDirectory from './components/BarDirectory.vue'
import TagFilter from './components/TagFilter.vue'
import BarPopup from './components/BarPopup.vue'
import BarDrawer from './components/BarDrawer.vue'
import MapSearch from './components/MapSearch.vue'
import WinWindow from './components/win2000/WinWindow.vue'
import WinTaskbar from './components/win2000/WinTaskbar.vue'
import WinDialog from './components/win2000/WinDialog.vue'
import SuggestEditHost from './components/SuggestEditHost.vue'
import DesktopView from './components/DesktopView.vue'
import GaiChan from './components/GaiChan.vue'
import GaiChanDialogue from './components/GaiChanDialogue.vue'
import BiosScreen from './components/BiosScreen.vue'
import ReviewPanel from './components/ReviewPanel.vue'
import InstallWizard from './components/InstallWizard.vue'
import { useI18n } from './composables/useI18n.js'
import { useVisited } from './composables/useVisited.js'
import { useApi } from './composables/useApi.js'
import { useAdmin } from './composables/useAdmin.js'
import { useWindowManager } from './composables/useWindowManager.js'
import { useOpenNow } from './composables/useOpenNow.js'
import { useDialog } from './composables/useDialog.js'
import { usePwa } from './composables/usePwa.js'
import { useUrlState, parseUrl, barShareUrl, barTitle, resolveLang, canNativeShare } from './composables/useUrlState.js'
import { updateBar, fetchPartitions, savePartition } from './api/index.js'
import { readJSON, writeJSON, readString, writeString, isStringArray, isPlainObject } from './utils/storage.js'
import { withDefaultPartitions, reconcilePartitions } from './utils/partitions.js'
import { recordVisit, shouldOfferInstall, isVisitState } from './utils/installOffer.js'

// Heavy, rarely-opened windows are split into their own chunks (R06).
function lazyWindow(loader) {
  return defineAsyncComponent({ loader, loadingComponent: WinLoading, delay: 150 })
}
const AdminPanel = lazyWindow(() => import('./components/AdminPanel.vue'))
const ContactWindow = lazyWindow(() => import('./components/ContactWindow.vue'))
const FeedWindow = lazyWindow(() => import('./components/FeedWindow.vue'))
const ChatWindow = lazyWindow(() => import('./components/ChatWindow.vue'))
const BarTwitterPanel = lazyWindow(() => import('./components/BarTwitterPanel.vue'))
const DatabaseTable = lazyWindow(() => import('./components/DatabaseTable.vue'))
const ReviewsWindow = lazyWindow(() => import('./components/ReviewsWindow.vue'))

const { bars, tags, loading, error, dataTime, reload, refreshQuietly } = useApi()
const { visitedCount } = useVisited()
const { isAdmin, toggleAdmin } = useAdmin()
// The bar list differs by mode (admins also get inactive bars), so refetch on toggle
watch(isAdmin, () => reload())
const wm = useWindowManager()
const { openBarIds } = useOpenNow(bars)

// The URL the page was opened with. Anything but the desktop is a deep link:
// it fast-boots and skips the first-visit questions for this visit only,
// without saving any answer, so a later visit to "/" still gets onboarding.
const bootRoute = parseUrl(window.location.pathname, window.location.search)
const isDeepLink = bootRoute.view !== 'desktop'

const showBios = ref(true)
// Returning visitors get a fast BIOS boot (same look, near-instant)
const biosFastBoot = isDeepLink || !!readString('golden-gai-booted')
function handleBiosDone() {
  showBios.value = false
  if (!isDeepLink) writeString('golden-gai-booted', '1')
}
const reviewPanelBar = ref(null)

const activeView = ref('desktop') // 'desktop' | 'directory' | 'map'
// The map is mounted on the first visit to the map view and then only hidden,
// so its zoom and position survive a trip to the Desktop or the Directory.
const mapMounted = ref(false)
watch(activeView, (view, prev) => {
  if (view === 'map') mapMounted.value = true
  // The drawer goes away with the view and cannot report the pointer leaving a card
  if (prev === 'map') hoveredBarId.value = null
}, { flush: 'sync' })
const activeTags = ref([])
const tagMode = ref('or') // 'or' | 'and'
const chargeMin = ref(null)
const chargeMax = ref(null)
const drinkMin = ref(null)
const drinkMax = ref(null)
const floorFilter = ref(null) // null = all floors, 1 = 1F, 2 = 2F, etc.
const openNowFilter = ref(false)
const DEV = import.meta.env.DEV

// `npm run dev` ignores the saved answers so onboarding always runs on "/".
// Deep links behave the same in dev and in a build, except that in dev the
// "read the rules" balloon shows on every deep link (nothing saved is read).
const savedLang = DEV ? null : readString('golden-gai-lang')
// ?lang wins for this visit and is not saved; then the saved choice. A deep
// link never asks, so it falls back to the browser language.
const urlLang = ref(bootRoute.lang)
const lang = ref(
  bootRoute.lang || savedLang
  || (isDeepLink ? resolveLang({ browserLang: navigator.language }) : null)
)

const savedFirstTime = DEV ? null : readString('golden-gai-first-time') // 'yes' | 'no' | null
// A deep link answers "not my first time" in memory only
const firstVisit = ref(savedFirstTime === null ? (isDeepLink ? false : null) : savedFirstTime === 'yes')

const rulesAccepted = ref(!DEV && !!readString('golden-gai-rules-accepted'))
const showContact = ref(false)

// Deep-linked visitors who never went through onboarding get a small balloon
// offering the rules instead of the question flow.
const showRulesHint = ref(
  isDeepLink && savedFirstTime === null && !rulesAccepted.value
  && !(!DEV && readString('golden-gai-rules-hint-dismissed'))
)
// Bumped to remount the dialogue panel so the walkthrough starts from step one
const rulesWalkKey = ref(0)
// Where to return to once the rules started from the balloon are accepted
let routeAfterRules = null

function dismissRulesHint() {
  showRulesHint.value = false
  writeString('golden-gai-rules-hint-dismissed', '1')
}

function startRulesFromHint() {
  showRulesHint.value = false
  routeAfterRules = activeView.value === 'desktop' ? null : readRoute()
  closePopup()
  activeView.value = 'desktop'
  rulesAccepted.value = false
  handleFirstTimeAnswer(true)
  rulesWalkKey.value++
}

// Tour mode state
const tourMode = ref(false)
const tourHighlight = ref(null)

function handleTourMode(active) { tourMode.value = active }
function handleTourNavigate(view) { handleSwitchView(view) }
function handleTourHighlight(target) { tourHighlight.value = target }

function handleOpenBarFromTour(barId) {
  const bar = bars.value.find(b => String(b.id) === String(barId))
  if (!bar) return
  // Switch to directory and show bar popup
  activeView.value = 'directory'
  popupBarId.value = bar.id
  popupBuildingBars.value = [bar]
  popupBuildingId.value = bar.building_id || t('directory')
}

// Which bubble Gai-chan should show: null | 'lang' | 'first-time'
const gaichanBubbleType = computed(() => {
  if (lang.value === null) return 'lang'
  if (firstVisit.value === null) return 'first-time'
  return null
})

const showRules = computed(() => firstVisit.value === true && !rulesAccepted.value)

function handleLangSelect(l) {
  lang.value = l
  writeString('golden-gai-lang', l)
  // An explicit choice replaces whatever ?lang said
  urlLang.value = null
}

function handleFirstTimeAnswer(isFirst) {
  firstVisit.value = isFirst
  writeString('golden-gai-first-time', isFirst ? 'yes' : 'no')
}

function handleRulesAccepted() {
  rulesAccepted.value = true
  writeString('golden-gai-rules-accepted', '1')
  activeView.value = 'map'
  // Started from the deep-link balloon: go back to the bar they were sent
  if (routeAfterRules) {
    const route = routeAfterRules
    routeAfterRules = null
    applyRoute({ ...route, lang: urlLang.value }, null)
  }
}

const effectiveLang = computed(() => lang.value || 'en')
const { t } = useI18n(effectiveLang)
const mapRef = ref(null)
const placingBar = ref(null)

// Building popup state (directory / search single-bar view)
const popupBuildingBars = ref(null)
const popupBuildingId = ref(null)
const popupBarId = ref(null)   // which of popupBuildingBars the card shows
const twitterBar = ref(null)   // bar whose Twitter feed is currently shown

// The bar whose card is open: what /bar/<slug> and the page title follow
const openBar = computed(() => {
  const list = popupBuildingBars.value
  if (!list || !list.length) return null
  return list.find(b => b.id === popupBarId.value) || list[0]
})

// Drawer state (map building click)
const drawerBuildingBars = ref(null)
const drawerBuildingId = ref(null)

// Tag ordering (persisted)
const tagOrder = ref(readJSON('golden-gai-tag-order', [], isStringArray))

const sortedTags = computed(() => {
  if (!tagOrder.value.length) return tags.value
  const order = tagOrder.value
  return [...tags.value].sort((a, b) => {
    const ai = order.indexOf(a.id)
    const bi = order.indexOf(b.id)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
})

function handleReorderTags(newOrder) {
  tagOrder.value = newOrder
  writeJSON('golden-gai-tag-order', newOrder)
}

// Building partitions. The server is the source of truth: a successful fetch
// replaces both the in-memory copy and the localStorage cache wholesale, so
// buildings removed on the server disappear here too. The cache is only what
// is shown until the fetch settles, and what stays if it fails (offline).
const storedPartitions = ref(readJSON('golden-gai-partitions', {}, isPlainObject))
const selectedBuilding = ref(null)

async function loadPartitionsFromServer() {
  try {
    const serverPartitions = await fetchPartitions()
    if (!isPlainObject(serverPartitions)) throw new Error('Unexpected partitions response')
    storedPartitions.value = serverPartitions
    writeJSON('golden-gai-partitions', serverPartitions)
  } catch (err) {
    // Server unavailable — keep using localStorage cache
    console.warn('Could not load partitions from server, using local cache:', err.message)
  }
}

// What the admin panel edits: stored partitions plus in-memory defaults (one
// slot per bar) for multi-bar buildings with no stored entry. Defaults are
// never saved unless an admin edits that building.
const editablePartitions = computed(() => withDefaultPartitions(storedPartitions.value, bars.value))

// What the map draws: unassigned bars get a synthetic extra slot, references
// to deleted/moved bars are dropped. `issues` feeds the admin panel.
const reconciledPartitions = computed(() => reconcilePartitions(editablePartitions.value, bars.value))
const partitions = computed(() => reconciledPartitions.value.partitions)
const partitionIssues = computed(() => reconciledPartitions.value.issues)

async function handleUpdatePartitions({ buildingId, data }) {
  storedPartitions.value = { ...storedPartitions.value, [buildingId]: data }
  // Persist to server (non-blocking — don't await so UI stays snappy).
  // The cache mirrors the server, so it is only updated once the save lands.
  savePartition(buildingId, data).then(() => {
    writeJSON('golden-gai-partitions', storedPartitions.value)
  }).catch(err => {
    console.error('Failed to save partition to server:', err)
  })
}

function handleSelectBuildingForEdit(buildingId) {
  selectedBuilding.value = buildingId
}

// Search highlighting
const searchHighlightedBuildings = ref(new Set())
const searchHighlightedBars = ref(new Set())

function handleSearchMatches(matches) {
  const buildingIds = new Set()
  const barIds = new Set()
  for (const bar of matches) {
    barIds.add(String(bar.id))
    if (bar.building_id) buildingIds.add(bar.building_id)
  }
  searchHighlightedBuildings.value = buildingIds
  searchHighlightedBars.value = barIds

  if (matches.length > 0) {
    drawerBuildingBars.value = matches
    drawerBuildingId.value = null
    drawerMode.value = 'building'
  } else if (drawerMode.value === 'building' && drawerBuildingId.value === null) {
    closeDrawer()
  }
}

// Register windows
onMounted(() => {
  wm.register('search', t(WINDOW_TITLE_KEYS.search), '<img src="/icons/desktop/magnifying_glass.png" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">')
  wm.register('explorer', t(WINDOW_TITLE_KEYS.explorer), '&#128193;')
  loadPartitionsFromServer()
})

// i18n keys for window titles registered with wm.register
const WINDOW_TITLE_KEYS = {
  search: 'search',
  explorer: 'explorer',
  admin: 'adminConsole',
  database: 'database',
  feed: 'iconFeed',
  chatroom: 'iconChatroom',
  about: 'iconAbout',
  reviews: 'iconReviews',
}

// Keep registered window titles in sync with language
watch(effectiveLang, () => {
  for (const [id, key] of Object.entries(WINDOW_TITLE_KEYS)) {
    const win = wm.getWindow(id)
    if (win) win.title = t(key)
  }
})

const searchWin = computed(() => wm.getWindow('search'))
const explorerWin = computed(() => wm.getWindow('explorer'))
const adminWin = computed(() => wm.getWindow('admin'))
const dbWin = computed(() => wm.getWindow('database'))
const dbWinWidth  = typeof window !== 'undefined' ? Math.max(900, window.innerWidth  - 60) : 1200
const dbWinHeight = typeof window !== 'undefined' ? Math.max(500, window.innerHeight - 80) : 650
const feedWinIcon = '<img src="/icons/twitterwhite.ico" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">'

const isMobile = ref(typeof window !== 'undefined' && window.innerWidth <= 768)
function onWindowResize() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => window.addEventListener('resize', onWindowResize))
onUnmounted(() => window.removeEventListener('resize', onWindowResize))

// Drawer mode: 'all' = all-bars default (desktop), 'building' = specific building
const drawerMode = ref('all')
// Fav/visited filter state (used by Explorer + map + BarDrawer)
const favoritesFilter = ref(false)
const visitedFilter = ref(false)
// Hover sync between drawer cards ↔ map partitions. (The building hovered on
// the map lives in useMapHover, read by the drawer directly, so that moving
// over the map does not re-render this component.)
const hoveredBarId = ref(null)

// Bar label display mode: 'yoko' (横書き, horizontal, default) | 'tate' (縦書き, vertical columns)
const labelMode = ref(readString('golden-gai-label-mode', 'yoko'))
function setLabelMode(mode) {
  labelMode.value = mode
  writeString('golden-gai-label-mode', mode)
}

const mobileMapFiltersOpen = ref(false)
const hasActiveMapFilters = computed(() =>
  activeTags.value.length > 0 ||
  chargeMin.value != null || chargeMax.value != null ||
  drinkMin.value != null || drinkMax.value != null ||
  floorFilter.value != null || openNowFilter.value ||
  favoritesFilter.value || visitedFilter.value
)
function clearMapFilters() {
  activeTags.value = []
  chargeMin.value = null
  chargeMax.value = null
  drinkMin.value = null
  drinkMax.value = null
  floorFilter.value = null
  openNowFilter.value = false
  favoritesFilter.value = false
  visitedFilter.value = false
}

// Explorer window: left edge, centered vertically after mount
const explorerInitialX = 8
const explorerInitialY = 8
const explorerWinRef = ref(null)

watch(explorerWinRef, (el) => {
  if (!el) return
  nextTick(() => {
    const h = el.$el?.offsetHeight ?? 0
    const desktopH = window.innerHeight - 32
    const y = Math.max(8, Math.floor((desktopH - h) / 2))
    el.setPosition(8, y)
  })
})

const tagMap = computed(() => {
  const map = {}
  for (const tag of tags.value) {
    map[tag.id] = tag
  }
  return map
})

async function handleToggleAdmin() {
  await toggleAdmin()
  if (isAdmin.value) {
    wm.register('admin', t(WINDOW_TITLE_KEYS.admin), '&#128295;')
    wm.minimize('explorer')
  } else {
    wm.unregister('admin')
    wm.unregister('database')
    wm.restore('explorer')
    placingBar.value = null
  }
}

function handleOpenDb() {
  if (!dbWin.value) {
    wm.register('database', t(WINDOW_TITLE_KEYS.database), '&#128196;')
  }
  wm.restore('database')
  wm.focus('database')
}

function handleSwitchView(view) {
  activeView.value = view
  closePopup()
}

function handleOpenApp(app) {
  if (app === 'map') {
    activeView.value = 'map'
  } else if (app === 'directory') {
    activeView.value = 'directory'
  } else if (app === 'contact') {
    showContact.value = true
  } else {
    // Placeholder windows for feed, chatroom, about, reviews
    const icons = {
      feed: '<img src="/icons/twitterblue.ico" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">',
      chatroom: '<img src="/icons/desktop/network_internet_pcs.png" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">',
      about: '&#8505;',
      reviews: '<img src="/icons/winrep-1.png" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">',
    }
    if (!wm.getWindow(app)) {
      wm.register(app, WINDOW_TITLE_KEYS[app] ? t(WINDOW_TITLE_KEYS[app]) : app, icons[app] || '')
    }
    wm.restore(app)
    wm.focus(app)
  }
}

function handleSelectBuilding({ buildingId, bars: barsInBuilding }) {
  drawerBuildingBars.value = barsInBuilding
  drawerBuildingId.value = buildingId
  drawerMode.value = 'building'
}

function closeDrawer() {
  if (!isMobile.value) {
    // Desktop: return to all-bars mode instead of closing
    drawerMode.value = 'all'
    drawerBuildingBars.value = null
    drawerBuildingId.value = null
  } else {
    drawerBuildingBars.value = null
    drawerBuildingId.value = null
  }
  twitterBar.value = null
  if (mapRef.value) mapRef.value.clearSelection()
}

function handleSelectBarFromDirectory(bar) {
  // Show single bar in popup (wrap in array)
  popupBarId.value = bar.id
  popupBuildingBars.value = [bar]
  popupBuildingId.value = bar.building_id || t('directory')
}

function closePopup() {
  popupBuildingBars.value = null
  popupBuildingId.value = null
  popupBarId.value = null
  twitterBar.value = null
  reviewPanelBar.value = null
}

function openTwitterPanel(bar) {
  twitterBar.value = bar
}

// Opens a bar's card. The card and the view are set in the same tick (one
// history entry, and the card is up before the map has finished mounting);
// the pan follows once the map can measure itself.
function handleSearchSelect({ bar, buildingId }) {
  popupBarId.value = bar ? bar.id : null
  if (buildingId) {
    // Bar is placed in a building — pan to it and show all building's bars
    activeView.value = 'map'
    const barsInBuilding = bars.value.filter(b => b.building_id === buildingId)
    if (barsInBuilding.length > 0) {
      popupBuildingBars.value = barsInBuilding
      popupBuildingId.value = buildingId
    }
    panToBuildingWhenReady(buildingId)
  } else {
    // Bar has no building — just open popup with the single bar
    popupBuildingBars.value = [bar]
    popupBuildingId.value = bar.street || t('unplaced')
  }
}

let panRequest = 0
async function panToBuildingWhenReady(buildingId) {
  const request = ++panRequest
  // Mounts the map if this is the first visit to the map view
  await nextTick()
  // false if the user left the map view before the map was ready
  if (mapRef.value && await mapRef.value.whenReady() && request === panRequest) {
    mapRef.value.panToBuilding(buildingId)
  }
}

// ── URL <-> state (see useUrlState.js for the scheme and the history rules) ──
function readRoute() {
  return {
    view: activeView.value,
    slug: openBar.value ? openBar.value.slug : null,
    lang: urlLang.value,
    filters: {
      tags: activeTags.value,
      mode: tagMode.value,
      open: openNowFilter.value,
      floor: floorFilter.value,
      chargeMin: chargeMin.value,
      chargeMax: chargeMax.value,
      drinkMin: drinkMin.value,
      drinkMax: drinkMax.value,
    },
  }
}

// The page the API serves with a 404 for an unknown bar carries this marker
// (server/lib/seo.js). A <meta>, not an inline script, so it works under a CSP.
const serverSaidNotFound =
  document.querySelector('meta[name="golden-gai-status"]')?.getAttribute('content') === 'not-found'
let firstRoute = true

function showBarNotFound() {
  useDialog().alert(t('barNotFound'), { title: t('barNotFoundTitle'), icon: 'error' })
}

// Puts a parsed URL into the app. An unknown slug, or one of a bar that is
// not in the public list (inactive), is simply the map: the address bar is
// then rewritten to /map by useUrlState. When the page was opened on such a
// link, a "not found" dialog says so.
function applyRoute(route, historyState) {
  const opening = firstRoute
  firstRoute = false
  if (route.lang) {
    lang.value = route.lang
    urlLang.value = route.lang
  } else {
    urlLang.value = null
  }

  const bar = route.slug ? bars.value.find(b => b.slug === route.slug) : null
  // A card opened from the Directory stays over the Directory on Back/Forward;
  // a bar that is not on the map has nowhere else to open.
  const overDirectory = !!bar && (!bar.building_id || historyState?.view === 'directory')

  if (route.view === 'map' && !overDirectory) {
    const f = route.filters
    const known = new Set(tags.value.map(tag => tag.id))
    activeTags.value = f.tags.filter(id => known.has(id))
    tagMode.value = f.mode
    openNowFilter.value = f.open
    floorFilter.value = f.floor
    chargeMin.value = f.chargeMin
    chargeMax.value = f.chargeMax
    drinkMin.value = f.drinkMin
    drinkMax.value = f.drinkMax
  }

  if (!bar) {
    closePopup()
    activeView.value = route.view
    if (opening && (route.slug || serverSaidNotFound)) showBarNotFound()
  } else if (overDirectory) {
    twitterBar.value = null
    reviewPanelBar.value = null
    activeView.value = 'directory'
    handleSelectBarFromDirectory(bar)
  } else {
    reviewPanelBar.value = null
    handleSearchSelect({ bar, buildingId: bar.building_id })
  }
}

const urlState = useUrlState({
  read: readRoute,
  apply: applyRoute,
  historyState: () => ({ view: activeView.value }),
})

// Parse the URL only once the bars are there to resolve a slug against
watch([loading, error], ([isLoading, err]) => {
  if (!isLoading && !err) urlState.start()
}, { immediate: true })

// Moving between the tabs of an open card rewrites the entry instead of adding one
function handlePopupBarChange(bar) {
  popupBarId.value = bar.id
  urlState.replaceNext()
}

watch([openBar, effectiveLang], ([bar, l]) => {
  const name = bar && (l === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp))
  document.title = barTitle(name)
}, { immediate: true })

// ── Share ─────────────────────────────────────────────────────────────────────
const dialog = useDialog()
const shareBalloon = ref(null) // { text, x, y, below } | null
let shareBalloonTimer = null

function showShareBalloon(anchorEl, text) {
  const rect = anchorEl?.getBoundingClientRect?.()
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
  const below = !rect || rect.top < 48
  shareBalloon.value = {
    text,
    x: Math.round(Math.min(Math.max(cx, 70), window.innerWidth - 70)),
    y: Math.round(rect ? (below ? rect.bottom + 8 : rect.top - 8) : window.innerHeight / 2),
    below,
  }
  clearTimeout(shareBalloonTimer)
  shareBalloonTimer = setTimeout(() => { shareBalloon.value = null }, 2000)
}
onUnmounted(() => clearTimeout(shareBalloonTimer))

async function handleShareBar({ bar, anchor }) {
  if (!bar || !bar.slug) return
  const url = barShareUrl(window.location.origin, bar.slug, effectiveLang.value)
  const name = effectiveLang.value === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)
  if (canNativeShare()) {
    try {
      await navigator.share({ title: barTitle(name), url })
      return
    } catch (err) {
      if (err && err.name === 'AbortError') return // sheet closed by the user
      // Share sheet refused (e.g. not allowed here): copy instead
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    showShareBalloon(anchor, t('linkCopied'))
  } catch {
    // No clipboard access (insecure context, denied permission): hand the URL over to copy by hand
    await dialog.prompt(t('shareCopyByHand'), { title: t('shareLinkTitle'), default: url, icon: 'info' })
  }
}

// ── Offline mode / installable app (G03) ─────────────────────────────────────
const pwa = usePwa()
const offline = pwa.offline

// Back online: fetch fresh data. While the API cannot be reached although the
// device says it is connected (weak signal), try again every so often; the
// service worker reports when a request got through.
const OFFLINE_RETRY_MS = 30000
let offlineRetryTimer = null
function refreshData() {
  refreshQuietly()
  loadPartitionsFromServer()
}
watch(offline, (isOffline) => {
  clearInterval(offlineRetryTimer)
  if (isOffline) {
    offlineRetryTimer = setInterval(() => { if (navigator.onLine !== false) refreshData() }, OFFLINE_RETRY_MS)
  } else {
    refreshData()
  }
})
// The worker answered from its saved copy and has since stored a newer one
const stopDataUpdates = pwa.onDataUpdated((path) => {
  if (path === '/api/partitions') loadPartitionsFromServer()
  else if (path === '/api/bars' || path === '/api/tags') refreshQuietly()
})
onUnmounted(() => {
  clearInterval(offlineRetryTimer)
  stopDataUpdates()
})

// "A new version of GAI OS is available": asked once per waiting version,
// after the boot screen. "Later" keeps this version until the next start.
watch([pwa.updateReady, showBios], async ([ready, booting]) => {
  if (!ready || booting) return
  pwa.updateReady.value = false
  const restart = await dialog.confirm(t('updateAvailable'), {
    title: t('updateTitle'),
    icon: 'question',
    okLabel: t('updateRestart'),
    cancelLabel: t('updateLater'),
  })
  if (restart) pwa.restartIntoUpdate()
})

// Setup wizard: from the Start menu any time, and offered once by itself from
// the second visit on (see utils/installOffer.js for when it stays quiet).
const showInstallWizard = ref(false)
const visits = recordVisit(readJSON('golden-gai-visits', null, isVisitState), Date.now())
writeJSON('golden-gai-visits', visits)
const installOffered = ref(!!readString('golden-gai-install-offered'))

function openInstallWizard() {
  showInstallWizard.value = true
  // Seen once, by either route: do not bring it up again uninvited
  installOffered.value = true
  writeString('golden-gai-install-offered', '1')
}

const INSTALL_OFFER_DELAY_MS = 2500
const wantInstallOffer = computed(() => shouldOfferInstall({
  visits: visits.count,
  offered: installOffered.value,
  installMode: pwa.installMode.value,
  onboarding: showBios.value || loading.value || !!error.value
    || lang.value === null || firstVisit.value === null
    || showRules.value || tourMode.value || showRulesHint.value,
  deepLink: isDeepLink,
  admin: isAdmin.value,
  busy: !!popupBuildingBars.value || !!reviewPanelBar.value || showContact.value,
}))
let installOfferTimer = null
watch(wantInstallOffer, (want) => {
  clearTimeout(installOfferTimer)
  if (!want) return
  installOfferTimer = setTimeout(() => {
    if (wantInstallOffer.value) openInstallWizard()
  }, INSTALL_OFFER_DELAY_MS)
}, { immediate: true })
onUnmounted(() => clearTimeout(installOfferTimer))

async function handlePlaceBar({ bar, buildingId }) {
  try {
    await updateBar(placingBar.value.id, { building_id: buildingId })
    placingBar.value = null
    await reload()
  } catch (err) {
    console.error('Failed to place bar:', err)
  }
}

async function handleUnplaceBar(bar) {
  try {
    await updateBar(bar.id, { building_id: null })
    await reload()
  } catch (err) {
    console.error('Failed to unplace bar:', err)
  }
}
</script>

<template>
  <BiosScreen v-if="showBios" :api-loading="loading" :api-error="error" :fast="biosFastBoot" @done="handleBiosDone" />
  <WinDialog :lang="effectiveLang" />
  <!-- "Suggest an edit" dialog + thank-you balloon (opened via useSuggestEdit) -->
  <SuggestEditHost :lang="effectiveLang" />
  <!-- "Install GAI OS" setup wizard -->
  <InstallWizard v-if="showInstallWizard" :lang="effectiveLang" @close="showInstallWizard = false" />

  <div v-if="loading" class="loading-screen">{{ t('loading') }}</div>
  <div v-else-if="error" class="loading-screen">{{ t('errorPrefix') }} {{ error }}</div>

  <template v-else>
    <!-- Gai-chan character helper — only while questions are still pending -->
    <GaiChan
      v-if="activeView === 'desktop' && !wm.getWindow('feed') && firstVisit === null"
      :bubble-type="gaichanBubbleType"
      :lang="effectiveLang"
      :hidden="showRules || firstVisit === true"
      @select-lang="handleLangSelect"
      @first-time-answer="handleFirstTimeAnswer"
    />

    <!-- Dialogue panel:
         - firstVisit === true: show rules walkthrough, then tuck
         - firstVisit === false: start tucked (skip rules), ready for interactive help
         - firstVisit === null: don't show yet (waiting for first-time answer) -->
    <GaiChanDialogue
      :key="rulesWalkKey"
      v-if="(activeView === 'desktop' || tourMode) && firstVisit !== null && !(isMobile && wm.getWindow('chatroom'))"
      :lang="effectiveLang"
      :rules-accepted="rulesAccepted || firstVisit === false"
      :bars="bars"
      @accepted="handleRulesAccepted"
      @tour-mode="handleTourMode"
      @tour-navigate="handleTourNavigate"
      @tour-highlight="handleTourHighlight"
      @open-bar="handleOpenBarFromTour"
    />

    <!-- Contact window -->
    <ContactWindow
      v-if="showContact"
      :lang="effectiveLang"
      @close="showContact = false"
    />

    <!-- Desktop: content area fills here -->
    <div class="desktop">

      <!-- Desktop view (default) -->
      <DesktopView
        v-if="activeView === 'desktop'"
        :lang="effectiveLang"
        :tour-highlight="tourHighlight"
        @open-app="handleOpenApp"
      />

      <!-- Directory view -->
      <div v-if="activeView === 'directory'" class="directory-container">
        <BarDirectory
          :bars="bars"
          :tags="sortedTags"
          :lang="effectiveLang"
          :tour-highlight="tourHighlight"
          @select-bar="handleSelectBarFromDirectory"
        />
      </div>

      <!-- Map view -->
      <GoldenGaiMap
          v-if="mapMounted"
          v-show="activeView === 'map'"
          ref="mapRef"
          :active="activeView === 'map'"
          :bars="bars"
          :tag-map="tagMap"
          :active-tags="activeTags"
          :charge-min="chargeMin"
          :charge-max="chargeMax"
          :drink-min="drinkMin"
          :drink-max="drinkMax"
          :floor-filter="floorFilter"
          :admin-mode="isAdmin"
          :placing-bar="placingBar"
          :lang="effectiveLang"
          :partitions="partitions"
          :open-now-filter="openNowFilter"
          :open-bar-ids="openBarIds"
          :favorites-filter="favoritesFilter"
          :visited-filter="visitedFilter"
          :hovered-bar-id="hoveredBarId"
          :search-highlighted="searchHighlightedBuildings"
          :search-highlighted-bars="searchHighlightedBars"
          :tour-highlight="tourHighlight"
          :label-mode="labelMode"
          :tag-mode="tagMode"
          @select-building="handleSelectBuilding"
          @deselect="closeDrawer"
          @place-bar="handlePlaceBar"
          @select-building-for-edit="handleSelectBuildingForEdit"
        />

      <template v-if="activeView === 'map'">
        <!-- Mobile controls: search + filter bar -->
        <div v-if="isMobile && !isAdmin" class="mobile-map-controls">
          <div class="mobile-search-bar">
            <MapSearch
              :bars="bars"
              :lang="effectiveLang"
              @select-bar="handleSearchSelect"
              @search-matches="handleSearchMatches"
            />
          </div>
          <div class="mobile-map-filterbar">
            <button
              :class="['mobile-map-filter-btn', { active: favoritesFilter }]"
              @click="favoritesFilter = !favoritesFilter"
            >
              <img src="/icons/heart.ico" class="mobile-map-filter-icon" alt="" />
              {{ t('favorites') }}
            </button>
            <button
              :class="['mobile-map-filter-btn', { active: visitedFilter }]"
              @click="visitedFilter = !visitedFilter"
            >
              <img src="/icons/desktop/trust0.png" class="mobile-map-filter-icon" alt="" />
              {{ t('visited') }}
            </button>
            <button
              :class="['mobile-map-filter-btn', { active: mobileMapFiltersOpen, 'tour-highlight': tourHighlight === 'map-filter' }, 'ml-auto']"
              @click="mobileMapFiltersOpen = !mobileMapFiltersOpen"
            >
              <img src="/icons/desktop/magnifying_glass.png" class="mobile-map-filter-icon" alt="" />
              {{ t('filters') }}
              <span v-if="hasActiveMapFilters" class="mobile-map-filter-badge"></span>
            </button>
            <button
              v-if="hasActiveMapFilters"
              class="mobile-map-clear-btn"
              @click="clearMapFilters"
            >
              &#10005; {{ t('clear') }}
            </button>
          </div>
          <div v-if="mobileMapFiltersOpen" class="mobile-map-filter-panel">
            <TagFilter
              v-model="activeTags"
              :tags="sortedTags"
              :bars="bars"
              :lang="effectiveLang"
              :collapse-by-default="true"
              v-model:charge-min="chargeMin"
              v-model:charge-max="chargeMax"
              v-model:drink-min="drinkMin"
              v-model:drink-max="drinkMax"
              v-model:floor-filter="floorFilter"
              v-model:open-now-filter="openNowFilter"
              :tag-mode="tagMode"
              @update:tag-mode="tagMode = $event"
            />
          </div>
        </div>

        <!-- Search window (desktop only) -->
        <WinWindow
          v-if="searchWin && !isAdmin && !isMobile"
          :title="searchWin.title"
          icon="&#128269;"
          :width="200"
          :initial-x="8"
          :initial-y="8"
          :active="wm.isActive('search')"
          :minimized="searchWin.minimized"
          :z-index="searchWin.zIndex"
          :show-close="false"
          @focus="wm.focus('search')"
          @minimize="wm.minimize('search')"
        >
          <MapSearch
            :bars="bars"
            :lang="effectiveLang"
            @select-bar="handleSearchSelect"
            @search-matches="handleSearchMatches"
          />
        </WinWindow>

        <!-- Explorer window (filters) — desktop only -->
        <WinWindow
          ref="explorerWinRef"
          v-if="explorerWin && !isAdmin && !isMobile"
          :class="{ 'tour-highlight': tourHighlight === 'map-filter' }"
          :title="explorerWin.title"
          icon="&#128193;"
          :width="200"
          :initial-x="explorerInitialX"
          :initial-y="explorerInitialY"
          :active="wm.isActive('explorer')"
          :minimized="explorerWin.minimized"
          :z-index="explorerWin.zIndex"
          :show-close="false"
          @focus="wm.focus('explorer')"
          @minimize="wm.minimize('explorer')"
        >
          <div class="explorer-quick-filters">
            <button :class="['quickbar-btn', { active: favoritesFilter }]" @click="favoritesFilter = !favoritesFilter">
              <img src="/icons/heart.ico" class="quickbar-icon" aria-hidden="true" />
              {{ t('favorites') }}
            </button>
            <button :class="['quickbar-btn', { active: visitedFilter }]" @click="visitedFilter = !visitedFilter">
              <img src="/icons/desktop/trust0.png" class="quickbar-icon" aria-hidden="true" />
              {{ t('visited') }}
            </button>
          </div>
          <TagFilter
            v-model="activeTags"
            :tags="sortedTags"
            :bars="bars"
            :lang="effectiveLang"
            v-model:charge-min="chargeMin"
            v-model:charge-max="chargeMax"
            v-model:drink-min="drinkMin"
            v-model:drink-max="drinkMax"
            v-model:floor-filter="floorFilter"
            v-model:open-now-filter="openNowFilter"
            :tag-mode="tagMode"
            @update:tag-mode="tagMode = $event"
          />
        </WinWindow>
        <!-- Desktop: always-visible BarDrawer (all-bars mode by default) -->
        <BarDrawer
          v-if="!isMobile && !isAdmin"
          :all-bars-mode="drawerMode === 'all'"
          :building-id="drawerBuildingId"
          :bars="drawerMode === 'all' ? bars : (drawerBuildingBars || [])"
          :active-tags="activeTags"
          :charge-min="chargeMin"
          :charge-max="chargeMax"
          :drink-min="drinkMin"
          :drink-max="drinkMax"
          :floor-filter="floorFilter"
          :tag-mode="tagMode"
          :open-now-filter="openNowFilter"
          :open-bar-ids="openBarIds"
          :tags="sortedTags"
          :lang="effectiveLang"
          :favorites-filter="favoritesFilter"
          :visited-filter="visitedFilter"
          :all-bars="bars"
          follow-map-hover
          @close="closeDrawer"
          @back-to-all="drawerMode = 'all'; drawerBuildingBars = null; drawerBuildingId = null"
          @select-bar="openTwitterPanel"
          @show-reviews="reviewPanelBar = $event"
          @share-bar="handleShareBar"
          @hover-bar="hoveredBarId = $event"
          @unhover-bar="hoveredBarId = null"
        />

        <!-- Mobile: conditional BarDrawer (only when building selected) -->
        <BarDrawer
          v-if="isMobile && drawerBuildingBars"
          :building-id="drawerBuildingId"
          :bars="drawerBuildingBars"
          :active-tags="activeTags"
          :charge-min="chargeMin"
          :charge-max="chargeMax"
          :drink-min="drinkMin"
          :drink-max="drinkMax"
          :floor-filter="floorFilter"
          :tag-mode="tagMode"
          :open-now-filter="openNowFilter"
          :open-bar-ids="openBarIds"
          :tags="sortedTags"
          :lang="effectiveLang"
          :favorites-filter="favoritesFilter"
          :visited-filter="visitedFilter"
          @close="closeDrawer"
          @select-bar="openTwitterPanel"
          @show-reviews="reviewPanelBar = $event"
          @share-bar="handleShareBar"
          @hover-bar="hoveredBarId = $event"
          @unhover-bar="hoveredBarId = null"
        />
      </template>

      <!-- Admin window (visible in both views) -->
      <WinWindow
        v-if="adminWin && isAdmin"
        :title="adminWin.title"
        icon="&#128295;"
        :width="280"
        :height="550"
        :initial-x="8"
        :initial-y="8"
        :active="wm.isActive('admin')"
        :minimized="adminWin.minimized"
        :z-index="adminWin.zIndex"
        :show-close="false"
        @focus="wm.focus('admin')"
        @minimize="wm.minimize('admin')"
      >
        <AdminPanel
          :bars="bars"
          :tags="sortedTags"
          :placing-bar="placingBar"
          :partitions="editablePartitions"
          :partition-issues="partitionIssues"
          :lang="effectiveLang"
          :selected-building="selectedBuilding"
          @select-for-placement="placingBar = $event"
          @unplace-bar="handleUnplaceBar"
          @reload="reload"
          @reorder-tags="handleReorderTags"
          @update-partitions="handleUpdatePartitions"
          @open-db="handleOpenDb"
        />
      </WinWindow>

      <!-- Database spreadsheet window -->
      <WinWindow
        v-if="dbWin && isAdmin"
        :title="dbWin.title"
        icon="&#128196;"
        :width="dbWinWidth"
        :height="dbWinHeight"
        :initial-x="20"
        :initial-y="20"
        :active="wm.isActive('database')"
        :minimized="dbWin.minimized"
        :z-index="dbWin.zIndex"
        @focus="wm.focus('database')"
        @minimize="wm.minimize('database')"
        @close="wm.unregister('database')"
      >
        <DatabaseTable
          :bars="bars.filter(b => !!b.building_id)"
          :tags="sortedTags"
          @reload="reload"
        />
      </WinWindow>

      <!-- Feed window: mobile = full-screen panel, desktop = draggable WinWindow -->
      <template v-if="wm.getWindow('feed')">
        <!-- Mobile: full-screen feed (v-show keeps FeedWindow mounted/cached when switching views) -->
        <div v-if="isMobile" v-show="activeView === 'desktop'" class="mobile-feed-panel">
          <div class="mobile-feed-titlebar">
            <span v-html="feedWinIcon" class="mobile-feed-icon"></span>
            <span class="mobile-feed-title">{{ wm.getWindow('feed').title }}</span>
            <button class="mobile-feed-close" @click="wm.unregister('feed')">&#10005;</button>
          </div>
          <FeedWindow :lang="effectiveLang" @close="wm.unregister('feed')" />
        </div>

        <!-- Desktop: draggable WinWindow, hidden when not on desktop view (cached) -->
        <WinWindow
          v-else
          :title="wm.getWindow('feed').title"
          :icon="feedWinIcon"
          :width="420"
          :height="560"
          :initial-x="120"
          :initial-y="60"
          :active="wm.isActive('feed')"
          :minimized="wm.getWindow('feed').minimized || activeView !== 'desktop'"
          :z-index="wm.getWindow('feed').zIndex"
          @focus="wm.focus('feed')"
          @minimize="wm.minimize('feed')"
          @close="wm.unregister('feed')"
        >
          <FeedWindow :lang="effectiveLang" @close="wm.unregister('feed')" />
        </WinWindow>
      </template>

      <!-- Chatroom window: mobile = full-screen panel, desktop = draggable WinWindow -->
      <template v-if="wm.getWindow('chatroom')">
        <!-- Mobile: full-screen -->
        <div v-if="isMobile" class="mobile-feed-panel">
          <div class="mobile-feed-titlebar">
            <span v-html="wm.getWindow('chatroom').icon" class="mobile-feed-icon"></span>
            <span class="mobile-feed-title">{{ wm.getWindow('chatroom').title }}</span>
            <button class="mobile-feed-close" @click="wm.unregister('chatroom')">&#10005;</button>
          </div>
          <ChatWindow :lang="effectiveLang" :bars="bars" />
        </div>

        <!-- Desktop: draggable WinWindow -->
        <WinWindow
          v-else
          :title="wm.getWindow('chatroom').title"
          :icon="wm.getWindow('chatroom').icon"
          :width="360"
          :height="480"
          :initial-x="100"
          :initial-y="60"
          :active="wm.isActive('chatroom')"
          :minimized="wm.getWindow('chatroom').minimized"
          :z-index="wm.getWindow('chatroom').zIndex"
          @focus="wm.focus('chatroom')"
          @minimize="wm.minimize('chatroom')"
          @close="wm.unregister('chatroom')"
        >
          <ChatWindow :lang="effectiveLang" :bars="bars" />
        </WinWindow>
      </template>

      <!-- Reviews window -->
      <template v-if="wm.getWindow('reviews')">
        <div v-if="isMobile" class="mobile-feed-panel">
          <div class="mobile-feed-titlebar">
            <span v-html="wm.getWindow('reviews').icon" class="mobile-feed-icon"></span>
            <span class="mobile-feed-title">{{ wm.getWindow('reviews').title }}</span>
            <button class="mobile-feed-close" @click="wm.unregister('reviews')">&#10005;</button>
          </div>
          <ReviewsWindow :lang="effectiveLang" />
        </div>
        <WinWindow
          v-else
          :title="wm.getWindow('reviews').title"
          :icon="wm.getWindow('reviews').icon"
          :width="360"
          :height="500"
          :initial-x="130"
          :initial-y="60"
          :active="wm.isActive('reviews')"
          :minimized="wm.getWindow('reviews').minimized"
          :z-index="wm.getWindow('reviews').zIndex"
          @focus="wm.focus('reviews')"
          @minimize="wm.minimize('reviews')"
          @close="wm.unregister('reviews')"
        >
          <ReviewsWindow :lang="effectiveLang" />
        </WinWindow>
      </template>

      <!-- Placeholder windows (about, contact) -->
      <template v-for="appId in ['about', 'contact']" :key="appId">
        <WinWindow
          v-if="wm.getWindow(appId)"
          :title="wm.getWindow(appId).title"
          :icon="wm.getWindow(appId).icon"
          :width="260"
          :initial-x="80 + ['about', 'contact'].indexOf(appId) * 30"
          :initial-y="60 + ['about', 'contact'].indexOf(appId) * 30"
          :active="wm.isActive(appId)"
          :minimized="wm.getWindow(appId).minimized"
          :z-index="wm.getWindow(appId).zIndex"
          @focus="wm.focus(appId)"
          @minimize="wm.minimize(appId)"
          @close="wm.unregister(appId)"
        >
          <div style="padding: 16px; text-align: center; color: var(--win-text-disabled)">
            {{ t('comingSoon') }}
          </div>
        </WinWindow>
      </template>

      <!-- Bar details popup (directory / search selection only) -->
      <BarPopup
        v-if="popupBuildingBars"
        :building-bars="popupBuildingBars"
        :building-id="popupBuildingId"
        :tags="sortedTags"
        :lang="effectiveLang"
        :open-bar-ids="openBarIds"
        :twitter-open="!!twitterBar"
        :auto-twitter="!isMobile"
        :selected-bar-id="popupBarId"
        @close="closePopup"
        @select-bar="openTwitterPanel"
        @show-reviews="reviewPanelBar = $event"
        @change-bar="handlePopupBarChange"
        @share-bar="handleShareBar"
      />

      <!-- Twitter panel — desktop: right sidebar; mobile: full-screen -->
      <BarTwitterPanel
        v-if="twitterBar && twitterBar.sns"
        :bar="twitterBar"
        :lang="effectiveLang"
        @close="twitterBar = null"
      />

      <!-- Review panel -->
      <ReviewPanel
        v-if="reviewPanelBar"
        :bar="reviewPanelBar"
        :lang="effectiveLang"
        @close="reviewPanelBar = null"
      />

    </div>

    <!-- "Link copied!" tooltip, pointing at the share button that was pressed.
         On <body> like the bar card, so viewport coordinates apply as they are
         (#app is zoomed on desktop). -->
    <Teleport to="body">
      <div
        v-if="shareBalloon"
        :class="['share-balloon', { 'share-balloon--below': shareBalloon.below }]"
        :style="{ left: shareBalloon.x + 'px', top: shareBalloon.y + 'px' }"
        role="status"
      >{{ shareBalloon.text }}</div>
    </Teleport>

    <!-- Deep-link visitors: offer the rules instead of the question flow -->
    <div v-if="showRulesHint && !showBios" class="rules-hint">
      <button class="rules-hint-main" @click="startRulesFromHint">
        <img src="/gaichan/gaichanicon.png" class="rules-hint-face" alt="" />
        <span class="rules-hint-text">
          <span class="rules-hint-q">{{ t('rulesHintQuestion') }}</span>
          <span class="rules-hint-link">{{ t('rulesHintAction') }} &#9654;</span>
        </span>
      </button>
      <button class="rules-hint-close" :title="t('close')" :aria-label="t('close')" @click="dismissRulesHint">
        <span class="rules-hint-close-box">&#10005;</span>
      </button>
    </div>

    <!-- CRT monitor overlay -->
    <div class="crt-overlay"></div>

    <!-- Taskbar -->
    <WinTaskbar
      :visited-count="visitedCount"
      :total-bars="bars.length"
      :is-admin="isAdmin"
      :active-view="activeView"
      :lang="effectiveLang"
      :tour-highlight="tourHighlight"
      :offline="offline"
      :data-time="dataTime"
      @install="openInstallWizard"
      @toggle-admin="handleToggleAdmin"
      @switch-view="handleSwitchView"
      @update:lang="handleLangSelect"
    />
  </template>
</template>

<style>
/* Tour highlight pulse — shared class used by App, WinTaskbar, DesktopView, BarDirectory */
.tour-highlight {
  box-shadow: 0 0 0 2px #ffcc44, 0 0 10px 2px rgba(255, 204, 68, 0.6) !important;
  animation: tour-pulse 1s ease-in-out infinite;
  position: relative;
  z-index: 5;
}

@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 2px #ffcc44, 0 0 10px 2px rgba(255, 204, 68, 0.6); }
  50%       { box-shadow: 0 0 0 2px #ffcc44, 0 0 16px 4px rgba(255, 204, 68, 0.8); }
}

.explorer-quick-filters {
  display: flex;
  gap: 4px;
  padding: 4px 4px 2px;
  border-bottom: 1px solid var(--win-border-dark);
}

.explorer-quick-filters .quickbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  height: 22px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  user-select: none;
}

.explorer-quick-filters .quickbar-btn:hover {
  border-color: var(--win-border-dark);
  background: var(--win-bg);
}

.explorer-quick-filters .quickbar-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  border-color: transparent;
}

.explorer-quick-filters .quickbar-icon {
  flex-shrink: 0;
  image-rendering: pixelated;
  width: 15px;
  height: 15px;
  display: block;
}

.directory-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.mobile-map-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.mobile-search-bar {
  padding: 6px 8px;
  background: var(--win-bg);
  box-shadow: inset -1px -1px 0 var(--win-border-dark);
}

.mobile-search-bar .map-search {
  width: 100%;
}

.mobile-search-bar input {
  height: 30px !important;
  font-size: 14px !important;
  width: 100%;
  box-sizing: border-box;
}

.mobile-map-filterbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  background: var(--win-bg);
  border-bottom: 1px solid var(--win-border-dark);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.ml-auto {
  margin-left: auto;
}

.mobile-map-filter-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 38px;
  padding: 4px 12px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  font-family: var(--win-font);
  font-size: 12px;
  color: var(--win-text);
  cursor: pointer;
  flex-shrink: 0;
}

.mobile-map-filter-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

.mobile-map-filter-icon {
  width: 18px;
  height: 18px;
  image-rendering: pixelated;
  object-fit: contain;
  flex-shrink: 0;
}

.mobile-map-filter-badge {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--valhalla-orange, #c86400);
  flex-shrink: 0;
}

.mobile-map-clear-btn {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 4px 12px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  font-family: var(--win-font);
  font-size: 12px;
  color: var(--valhalla-orange, #c86400);
  cursor: pointer;
  flex-shrink: 0;
}

.mobile-map-filter-panel {
  background: var(--win-bg);
  border-bottom: 1px solid var(--win-border-dark);
  padding: 4px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  max-height: 50dvh;
  overflow-y: auto;
}

/* "Link copied!" — Win95 tooltip with a tail */
.share-balloon {
  position: fixed;
  z-index: 3000;
  transform: translate(-50%, -100%);
  padding: 3px 8px;
  background: #ffffe1;
  color: #000;
  border: 1px solid #000;
  font-family: var(--win-font);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}

.share-balloon--below {
  transform: translate(-50%, 0);
}

.share-balloon::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 7px;
  height: 7px;
  margin-left: -4px;
  background: #ffffe1;
  border-right: 1px solid #000;
  border-bottom: 1px solid #000;
  transform: rotate(45deg);
}

.share-balloon--below::after {
  bottom: auto;
  top: -5px;
  border: none;
  border-left: 1px solid #000;
  border-top: 1px solid #000;
}

/* Deep-link "read the rules" balloon: a small Gai-chan message window */
.rules-hint {
  position: fixed;
  left: 8px;
  bottom: calc(var(--taskbar-height, 32px) + 8px);
  z-index: 260;
  display: flex;
  align-items: stretch;
  max-width: calc(100vw - 16px);
  background: var(--win-bg);
  padding: 3px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.6);
  font-family: var(--win-font);
}

.rules-hint-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  min-width: 0;
  padding: 4px 8px 4px 6px;
  background: transparent;
  border: none;
  font-family: inherit;
  color: var(--win-text);
  text-align: left;
  cursor: pointer;
}

.rules-hint-main:focus-visible {
  outline: 1px dotted #000;
  outline-offset: -2px;
}

.rules-hint-face {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.rules-hint-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.25;
}

.rules-hint-link {
  color: var(--valhalla-orange);
  text-decoration: underline;
}

.rules-hint-close {
  flex-shrink: 0;
  width: 40px;
  min-height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.rules-hint-close-box {
  width: 16px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  font-size: 8px;
  font-weight: bold;
  line-height: 1;
  color: var(--win-text);
}

.rules-hint-close:active .rules-hint-close-box {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

/* Mobile full-screen feed panel */
.mobile-feed-panel {
  position: fixed;
  inset: 0;
  bottom: var(--taskbar-height, 32px);
  display: flex;
  flex-direction: column;
  background: var(--win-bg-dark);
  z-index: 250;
  font-family: var(--win-font);
}

.mobile-feed-titlebar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  height: 44px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
  user-select: none;
}

.mobile-feed-icon {
  font-size: 16px;
  flex-shrink: 0;
  line-height: 1;
}

.mobile-feed-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-feed-close {
  width: 32px;
  height: 28px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: var(--win-text);
  flex-shrink: 0;
}

.mobile-feed-close:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}
</style>
