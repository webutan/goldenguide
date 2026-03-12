<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import GoldenGaiMap from './components/GoldenGaiMap.vue'
import BarDirectory from './components/BarDirectory.vue'
import TagFilter from './components/TagFilter.vue'
import BarPopup from './components/BarPopup.vue'
import BarDrawer from './components/BarDrawer.vue'
import MapSearch from './components/MapSearch.vue'
import AdminPanel from './components/AdminPanel.vue'
import WinWindow from './components/win2000/WinWindow.vue'
import WinTaskbar from './components/win2000/WinTaskbar.vue'
import DesktopView from './components/DesktopView.vue'
import GaiChan from './components/GaiChan.vue'
import GaiChanDialogue from './components/GaiChanDialogue.vue'
import ContactWindow from './components/ContactWindow.vue'
import FeedWindow from './components/FeedWindow.vue'
import BarTwitterPanel from './components/BarTwitterPanel.vue'
import DatabaseTable from './components/DatabaseTable.vue'
import { useI18n } from './composables/useI18n.js'
import { useVisited } from './composables/useVisited.js'
import { useApi } from './composables/useApi.js'
import { useAdmin } from './composables/useAdmin.js'
import { useWindowManager } from './composables/useWindowManager.js'
import { useOpenNow } from './composables/useOpenNow.js'
import { updateBar } from './api/index.js'

const { bars, tags, loading, error, reload } = useApi()
const { visitedCount } = useVisited()
const { isAdmin, toggleAdmin } = useAdmin()
const wm = useWindowManager()
const { openBarIds } = useOpenNow(bars)

const activeView = ref('desktop') // 'desktop' | 'directory' | 'map'
const activeTags = ref([])
const chargeMin = ref(null)
const chargeMax = ref(null)
const drinkMin = ref(null)
const drinkMax = ref(null)
const floorFilter = ref(null) // null = all floors, 1 = 1F, 2 = 2F, etc.
const openNowFilter = ref(false)
const DEV = import.meta.env.DEV

const savedLang = DEV ? null : localStorage.getItem('golden-gai-lang')
const lang = ref(savedLang || null)

const savedFirstTime = DEV ? null : localStorage.getItem('golden-gai-first-time') // 'yes' | 'no' | null
const firstVisit = ref(savedFirstTime === null ? null : savedFirstTime === 'yes')

const rulesAccepted = ref(!DEV && !!localStorage.getItem('golden-gai-rules-accepted'))
const showContact = ref(false)

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
  popupBuildingBars.value = [bar]
  popupBuildingId.value = bar.building_id || 'Directory'
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
  localStorage.setItem('golden-gai-lang', l)
}

function handleFirstTimeAnswer(isFirst) {
  firstVisit.value = isFirst
  localStorage.setItem('golden-gai-first-time', isFirst ? 'yes' : 'no')
}

function handleRulesAccepted() {
  rulesAccepted.value = true
  localStorage.setItem('golden-gai-rules-accepted', '1')
}

const effectiveLang = computed(() => lang.value || 'en')
const { t } = useI18n(effectiveLang)
const mapRef = ref(null)
const placingBar = ref(null)

// Building popup state (directory / search single-bar view)
const popupBuildingBars = ref(null)
const popupBuildingId = ref(null)
const twitterBar = ref(null)   // bar whose Twitter feed is currently shown

// Drawer state (map building click)
const drawerBuildingBars = ref(null)
const drawerBuildingId = ref(null)

// Tag ordering (persisted)
const tagOrder = ref(JSON.parse(localStorage.getItem('golden-gai-tag-order') || '[]'))

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
  localStorage.setItem('golden-gai-tag-order', JSON.stringify(newOrder))
}

// Building partitions (persisted)
const partitions = ref(JSON.parse(localStorage.getItem('golden-gai-partitions') || '{}'))
const selectedBuilding = ref(null)

function handleUpdatePartitions({ buildingId, data }) {
  const updated = { ...partitions.value }
  // Keep entry even if empty (so auto-partition doesn't re-create)
  updated[buildingId] = data
  partitions.value = updated
  localStorage.setItem('golden-gai-partitions', JSON.stringify(updated))
}

// Auto-create partitions for buildings with multiple bars.
// One slot per bar, sorted ascending by floor then name.
watch(bars, (newBars) => {
  if (!newBars || newBars.length === 0) return
  const groups = {}
  for (const bar of newBars) {
    if (!bar.building_id) continue
    if (!groups[bar.building_id]) groups[bar.building_id] = []
    groups[bar.building_id].push(bar)
  }
  let updated = false
  const newPartitions = { ...partitions.value }

  for (const [buildingId, barsInBldg] of Object.entries(groups)) {
    if (barsInBldg.length <= 1) continue
    if (newPartitions[buildingId] !== undefined) continue
    const sorted = [...barsInBldg].sort((a, b) => {
      const fa = a.floor ?? 1
      const fb = b.floor ?? 1
      if (fa !== fb) return fa - fb
      const na = (a.name_en || a.name_jp || '').toLowerCase()
      const nb = (b.name_en || b.name_jp || '').toLowerCase()
      return na < nb ? -1 : na > nb ? 1 : 0
    })
    newPartitions[buildingId] = {
      partitions: sorted.map(bar => ({
        barId: bar.id,
        weight: 1,
      })),
      splitDirection: 'auto',
    }
    updated = true
  }

  if (updated) {
    partitions.value = newPartitions
    localStorage.setItem('golden-gai-partitions', JSON.stringify(newPartitions))
  }
}, { immediate: true })

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
}

// Register windows
onMounted(() => {
  wm.register('search', t('search'), '<img src="/icons/desktop/magnifying_glass.png" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">')
  wm.register('explorer', 'Explorer', '&#128193;')
})

// Keep search window title in sync with language
watch(effectiveLang, () => {
  if (searchWin.value) searchWin.value.title = t('search')
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

// Bar label display mode: 'yoko' (横書き, horizontal, default) | 'tate' (縦書き, vertical columns)
const labelMode = ref(localStorage.getItem('golden-gai-label-mode') || 'yoko')
function setLabelMode(mode) {
  labelMode.value = mode
  localStorage.setItem('golden-gai-label-mode', mode)
}

const mobileMapFiltersOpen = ref(false)
const mapFavoritesFilter = ref(false)
const mapVisitedFilter = ref(false)
const hasActiveMapFilters = computed(() =>
  activeTags.value.length > 0 ||
  chargeMin.value != null || chargeMax.value != null ||
  drinkMin.value != null || drinkMax.value != null ||
  floorFilter.value != null || openNowFilter.value ||
  mapFavoritesFilter.value || mapVisitedFilter.value
)
function clearMapFilters() {
  activeTags.value = []
  chargeMin.value = null
  chargeMax.value = null
  drinkMin.value = null
  drinkMax.value = null
  floorFilter.value = null
  openNowFilter.value = false
  mapFavoritesFilter.value = false
  mapVisitedFilter.value = false
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
    wm.register('admin', 'Admin Console', '&#128295;')
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
    wm.register('database', 'Database', '&#128196;')
  }
  wm.restore('database')
  wm.focus('database')
}

function handleSwitchView(view) {
  activeView.value = view
}

function handleOpenApp(app) {
  if (app === 'map') {
    activeView.value = 'map'
  } else if (app === 'directory') {
    activeView.value = 'directory'
  } else if (app === 'contact') {
    showContact.value = true
  } else {
    // Placeholder windows for feed, chatroom, about
    const titles = { feed: 'Feed', chatroom: 'Chatroom', about: 'About' }
    const icons = { feed: '<img src="/icons/twitterblue.ico" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">', chatroom: '<img src="/icons/desktop/network_internet_pcs.png" width="16" height="16" style="image-rendering:pixelated;vertical-align:middle">', about: '&#8505;' }
    if (!wm.getWindow(app)) {
      wm.register(app, titles[app] || app, icons[app] || '')
    }
    wm.restore(app)
    wm.focus(app)
  }
}

function handleSelectBuilding({ buildingId, bars: barsInBuilding }) {
  drawerBuildingBars.value = barsInBuilding
  drawerBuildingId.value = buildingId
}

function closeDrawer() {
  drawerBuildingBars.value = null
  drawerBuildingId.value = null
  twitterBar.value = null
  if (mapRef.value) mapRef.value.clearSelection()
}

function handleSelectBarFromDirectory(bar) {
  // Show single bar in popup (wrap in array)
  popupBuildingBars.value = [bar]
  popupBuildingId.value = bar.building_id || 'Directory'
}

function closePopup() {
  popupBuildingBars.value = null
  popupBuildingId.value = null
  twitterBar.value = null
}

function openTwitterPanel(bar) {
  twitterBar.value = bar
}

async function handleSearchSelect({ bar, buildingId }) {
  if (buildingId) {
    // Bar is placed in a building — pan to it and show all building's bars
    if (activeView.value !== 'map') {
      activeView.value = 'map'
      await nextTick()
      await new Promise(r => setTimeout(r, 200))
    }
    if (mapRef.value) {
      mapRef.value.panToBuilding(buildingId)
    }
    const barsInBuilding = bars.value.filter(b => b.building_id === buildingId)
    if (barsInBuilding.length > 0) {
      popupBuildingBars.value = barsInBuilding
      popupBuildingId.value = buildingId
    }
  } else {
    // Bar has no building — just open popup with the single bar
    popupBuildingBars.value = [bar]
    popupBuildingId.value = bar.street || 'Unplaced'
  }
}

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
  <div v-if="loading" class="loading-screen">Loading...</div>
  <div v-else-if="error" class="loading-screen">Error: {{ error }}</div>

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
      v-if="(activeView === 'desktop' || tourMode) && firstVisit !== null"
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
      <template v-if="activeView === 'map'">
        <GoldenGaiMap
          ref="mapRef"
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
          :favorites-filter="mapFavoritesFilter"
          :visited-filter="mapVisitedFilter"
          :search-highlighted="searchHighlightedBuildings"
          :search-highlighted-bars="searchHighlightedBars"
          :tour-highlight="tourHighlight"
          :label-mode="labelMode"
          @select-building="handleSelectBuilding"
          @place-bar="handlePlaceBar"
          @select-building-for-edit="handleSelectBuildingForEdit"
        />

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
              :class="['mobile-map-filter-btn', { active: mapFavoritesFilter }]"
              @click="mapFavoritesFilter = !mapFavoritesFilter"
            >
              <img src="/icons/heart.ico" class="mobile-map-filter-icon" alt="" />
              {{ t('favorites') }}
            </button>
            <button
              :class="['mobile-map-filter-btn', { active: mapVisitedFilter }]"
              @click="mapVisitedFilter = !mapVisitedFilter"
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
              &#10005; Clear
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
            />
          </div>
        </div>

        <!-- Search window (desktop only) -->
        <WinWindow
          v-if="searchWin && !isAdmin && !isMobile"
          :title="t('search')"
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
          title="Explorer"
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
          />
        </WinWindow>
        <!-- Building drawer (map building clicks) -->
        <BarDrawer
          v-if="drawerBuildingBars"
          :building-id="drawerBuildingId"
          :bars="drawerBuildingBars"
          :active-tags="activeTags"
          :charge-min="chargeMin"
          :charge-max="chargeMax"
          :drink-min="drinkMin"
          :drink-max="drinkMax"
          :floor-filter="floorFilter"
          :open-now-filter="openNowFilter"
          :open-bar-ids="openBarIds"
          :tags="sortedTags"
          :lang="effectiveLang"
          @close="closeDrawer"
          @select-bar="openTwitterPanel"
        />
      </template>

      <!-- Admin window (visible in both views) -->
      <WinWindow
        v-if="adminWin && isAdmin"
        title="Admin Console"
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
          :partitions="partitions"
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
        title="Database"
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

      <!-- Placeholder windows (chatroom, about, contact) -->
      <template v-for="appId in ['chatroom', 'about', 'contact']" :key="appId">
        <WinWindow
          v-if="wm.getWindow(appId)"
          :title="wm.getWindow(appId).title"
          :icon="wm.getWindow(appId).icon"
          :width="260"
          :initial-x="80 + ['chatroom', 'about', 'contact'].indexOf(appId) * 30"
          :initial-y="60 + ['chatroom', 'about', 'contact'].indexOf(appId) * 30"
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
        @close="closePopup"
        @select-bar="openTwitterPanel"
      />

      <!-- Twitter panel — desktop: right sidebar; mobile: full-screen -->
      <BarTwitterPanel
        v-if="twitterBar && twitterBar.sns"
        :bar="twitterBar"
        :lang="effectiveLang"
        @close="twitterBar = null"
      />

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
