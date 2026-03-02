<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
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
import RulesWindow from './components/RulesWindow.vue'
import ContactWindow from './components/ContactWindow.vue'
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
  wm.register('search', 'Search', '&#128269;')
  wm.register('explorer', 'Explorer', '&#128193;')
})

const searchWin = computed(() => wm.getWindow('search'))
const explorerWin = computed(() => wm.getWindow('explorer'))
const adminWin = computed(() => wm.getWindow('admin'))
const dbWin = computed(() => wm.getWindow('database'))
const dbWinWidth  = typeof window !== 'undefined' ? Math.max(900, window.innerWidth  - 60) : 1200
const dbWinHeight = typeof window !== 'undefined' ? Math.max(500, window.innerHeight - 80) : 650

// Position explorer window center-left of screen
const explorerInitialX = 8
const explorerInitialY = typeof window !== 'undefined' ? Math.max(8, Math.floor(window.innerHeight / 2 - 200)) : 200

const tagMap = computed(() => {
  const map = {}
  for (const tag of tags.value) {
    map[tag.id] = tag
  }
  return map
})

function handleToggleAdmin() {
  toggleAdmin()
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
    const icons = { feed: '&#127760;', chatroom: '&#128172;', about: '&#8505;' }
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
}

function handleSelectBarFromDirectory(bar) {
  // Show single bar in popup (wrap in array)
  popupBuildingBars.value = [bar]
  popupBuildingId.value = bar.building_id || 'Directory'
}

function closePopup() {
  popupBuildingBars.value = null
  popupBuildingId.value = null
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
    <!-- Gai-chan character helper -->
    <GaiChan
      v-if="activeView === 'desktop'"
      :bubble-type="gaichanBubbleType"
      :lang="effectiveLang"
      :hidden="showRules"
      @select-lang="handleLangSelect"
      @first-time-answer="handleFirstTimeAnswer"
    />

    <!-- Rules window (shown to first-time visitors) -->
    <RulesWindow
      v-if="showRules"
      :lang="effectiveLang"
      @accepted="handleRulesAccepted"
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
        @open-app="handleOpenApp"
      />

      <!-- Directory view -->
      <div v-if="activeView === 'directory'" class="directory-container">
        <BarDirectory
          :bars="bars"
          :tags="sortedTags"
          :lang="effectiveLang"
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
          :search-highlighted="searchHighlightedBuildings"
          :search-highlighted-bars="searchHighlightedBars"
          @select-building="handleSelectBuilding"
          @place-bar="handlePlaceBar"
          @select-building-for-edit="handleSelectBuildingForEdit"
        />

        <!-- Search window -->
        <WinWindow
          v-if="searchWin && !isAdmin"
          title="Search"
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

        <!-- Explorer window (filters) — bottom left -->
        <WinWindow
          v-if="explorerWin && !isAdmin"
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

      <!-- Placeholder windows (feed, chatroom, about, contact) -->
      <template v-for="appId in ['feed', 'chatroom', 'about', 'contact']" :key="appId">
        <WinWindow
          v-if="wm.getWindow(appId)"
          :title="wm.getWindow(appId).title"
          :icon="wm.getWindow(appId).icon"
          :width="260"
          :initial-x="80 + ['feed', 'chatroom', 'about', 'contact'].indexOf(appId) * 30"
          :initial-y="60 + ['feed', 'chatroom', 'about', 'contact'].indexOf(appId) * 30"
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
        :building-bars="popupBuildingBars"
        :building-id="popupBuildingId"
        :tags="sortedTags"
        :lang="effectiveLang"
        :open-bar-ids="openBarIds"
        @close="closePopup"
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
      @toggle-admin="handleToggleAdmin"
      @switch-view="handleSwitchView"
      @update:lang="handleLangSelect"
    />
  </template>
</template>

<style>
.directory-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

</style>
