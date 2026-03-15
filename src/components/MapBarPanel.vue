<script setup>
import { ref, computed, watch } from 'vue'
import { useVisited } from '../composables/useVisited.js'
import { useI18n } from '../composables/useI18n.js'
import WinButton from './win2000/WinButton.vue'
import ReviewDialog from './ReviewDialog.vue'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
  buildingId: { type: String, default: null }, // null = all-bars mode
  openBarIds: { type: Set, default: () => new Set() },
})

const emit = defineEmits(['close', 'show-reviews', 'select-bar', 'clear-building'])

const { isVisited, toggleVisited, isFavorited, toggleFavorited } = useVisited()
const { t } = useI18n(computed(() => props.lang))

// Filter toggles
const favFilter = ref(false)
const visitedFilter = ref(false)

// Bar detail selection
const selectedBar = ref(null)

// Review dialog
const reviewDialogBar = ref(null)

// Reset selected bar when building changes
watch(() => props.buildingId, () => { selectedBar.value = null })

const FLOOR_COLORS = {
  '-3': '#0f2040', '-2': '#2a1845', '-1': '#1a3868',
  1: '#934400', 2: '#005559', 3: '#4a6030', 4: '#7a2050', 5: '#5a3020',
}
function floorColor(floor) { return FLOOR_COLORS[floor] ?? '#934400' }

const barsInScope = computed(() => {
  if (props.buildingId) {
    return props.bars.filter(b => b.building_id === props.buildingId)
  }
  return props.bars.filter(b => b.building_id) // only placed bars
})

const filteredBars = computed(() => {
  return barsInScope.value.filter(bar => {
    if (favFilter.value && !isFavorited(bar.id)) return false
    if (visitedFilter.value && !isVisited(bar.id)) return false
    return true
  })
})

const floorGroups = computed(() => {
  const groups = {}
  for (const bar of filteredBars.value) {
    const f = bar.floor ?? 1
    if (!groups[f]) groups[f] = []
    groups[f].push(bar)
  }
  return Object.entries(groups)
    .map(([f, bars]) => ({
      floor: Number(f),
      floorLabel: Number(f) < 0 ? `B${Math.abs(Number(f))}F` : `${f}F`,
      bars,
    }))
    .sort((a, b) => b.floor - a.floor)
})

// Group by building when in all-bars mode
const buildingGroups = computed(() => {
  if (props.buildingId) return null
  const groups = {}
  for (const bar of filteredBars.value) {
    const id = bar.building_id
    if (!groups[id]) groups[id] = []
    groups[id].push(bar)
  }
  return Object.entries(groups)
    .map(([id, bars]) => ({ id, bars }))
    .sort((a, b) => a.id.localeCompare(b.id))
})

const headerTitle = computed(() => {
  if (selectedBar.value) return getDisplayName(selectedBar.value)
  if (props.buildingId) return props.buildingId
  return 'Golden Gai'
})

const barCount = computed(() => {
  if (selectedBar.value) return null
  return filteredBars.value.length
})

function getDisplayName(bar) {
  if (props.lang === 'jp') return bar.name_jp || bar.name_en
  return bar.name_en || bar.name_jp
}

function getSubName(bar) {
  if (props.lang === 'jp') return bar.name_en
  return bar.name_jp
}

function getOpenStatus(bar) {
  if (!bar.schedule?.default) return null
  return props.openBarIds.has(String(bar.id)) ? 'open' : 'closed'
}

function handleBarClick(bar) {
  selectedBar.value = bar
}

function handleBack() {
  if (selectedBar.value) {
    selectedBar.value = null
  } else if (props.buildingId) {
    emit('clear-building')
  }
}
</script>

<template>
  <div class="map-bar-panel">
    <!-- Header -->
    <div class="mbp-header">
      <button v-if="selectedBar || buildingId" class="mbp-back" @click="handleBack" title="Back">&#9664;</button>
      <img src="/icons/desktop/directory_open_cool.png" class="mbp-icon" alt="" />
      <span class="mbp-title">{{ headerTitle }}</span>
      <span v-if="barCount !== null" class="mbp-count">{{ barCount }} bar{{ barCount !== 1 ? 's' : '' }}</span>
      <button class="mbp-close" @click="emit('close')" title="Close">&#10005;</button>
    </div>

    <!-- Filter toggles (list modes only) -->
    <div v-if="!selectedBar" class="mbp-filters">
      <button
        :class="['mbp-filter-btn', { active: favFilter }]"
        @click="favFilter = !favFilter"
      >&#9829; {{ t('favorites') }}</button>
      <button
        :class="['mbp-filter-btn', { active: visitedFilter }]"
        @click="visitedFilter = !visitedFilter"
      >&#10003; {{ t('visited') }}</button>
    </div>

    <!-- Bar detail view -->
    <div v-if="selectedBar" class="mbp-body">
      <div class="mbp-detail">
        <div v-if="selectedBar.photo" class="mbp-detail-photo">
          <img :src="`/uploads/${selectedBar.photo}`" :alt="getDisplayName(selectedBar)" />
        </div>
        <div class="mbp-detail-name">{{ getDisplayName(selectedBar) }}</div>
        <div v-if="getSubName(selectedBar)" class="mbp-detail-subname">{{ getSubName(selectedBar) }}</div>

        <div class="mbp-detail-info">
          <div v-if="selectedBar.charge" class="mbp-info-row">
            <span class="mbp-info-label">{{ t('cover') }}</span>
            <span>&yen;{{ selectedBar.charge }}</span>
          </div>
          <div v-if="selectedBar.drink_price" class="mbp-info-row">
            <span class="mbp-info-label">{{ t('drinks') }}</span>
            <span>&yen;{{ selectedBar.drink_price }}~</span>
          </div>
          <div v-if="selectedBar.seats" class="mbp-info-row">
            <span class="mbp-info-label">{{ t('seats') }}</span>
            <span>~{{ selectedBar.seats }}</span>
          </div>
          <div v-if="selectedBar.hours" class="mbp-info-row">
            <span class="mbp-info-label">{{ t('hours') }}</span>
            <span>{{ selectedBar.hours }}
              <span v-if="getOpenStatus(selectedBar) === 'open'" class="status-open">&#9679; {{ t('open') }}</span>
              <span v-else-if="getOpenStatus(selectedBar) === 'closed'" class="status-closed">&#9679; {{ t('closed') }}</span>
            </span>
          </div>
          <div v-if="selectedBar.description" class="mbp-description">{{ selectedBar.description }}</div>
        </div>

        <div class="mbp-detail-actions">
          <WinButton small :pressed="isVisited(selectedBar.id)" @click="toggleVisited(selectedBar.id, () => { reviewDialogBar = selectedBar })">
            <template v-if="isVisited(selectedBar.id)">&#10003; {{ t('visited') }}</template>
            <template v-else>{{ t('markVisited') }}</template>
          </WinButton>
          <WinButton small :pressed="isFavorited(selectedBar.id)" @click="toggleFavorited(selectedBar.id)">
            <template v-if="isFavorited(selectedBar.id)">&#9829; {{ t('favorited') }}</template>
            <template v-else>{{ t('markFavorite') }}</template>
          </WinButton>
          <WinButton small @click="emit('show-reviews', selectedBar)">{{ t('reviews') }}</WinButton>
        </div>
      </div>
    </div>

    <!-- Building-mode: floor-grouped list -->
    <div v-else-if="buildingId" class="mbp-body">
      <div v-if="filteredBars.length === 0" class="mbp-empty">No bars match current filter.</div>
      <template v-for="group in floorGroups" :key="group.floor">
        <div class="mbp-floor-header" :style="{ borderLeftColor: floorColor(group.floor) }">{{ group.floorLabel }}</div>
        <div
          v-for="bar in group.bars"
          :key="bar.id"
          class="mbp-bar-row"
          @click="handleBarClick(bar)"
        >
          <img v-if="bar.photo" :src="`/uploads/${bar.photo}`" class="mbp-bar-thumb" :alt="getDisplayName(bar)" />
          <div class="mbp-bar-info">
            <div class="mbp-bar-name" :class="{ 'name-faved': isFavorited(bar.id) }">
              <span v-if="isVisited(bar.id)" class="bar-visited-mark">&#10003;</span>
              <span v-if="isFavorited(bar.id)" class="bar-fav-mark">&#9829;</span>
              {{ getDisplayName(bar) }}
            </div>
            <div v-if="getSubName(bar)" class="mbp-bar-subname">{{ getSubName(bar) }}</div>
          </div>
          <span class="mbp-bar-floor" :style="{ background: floorColor(bar.floor ?? 1) }">{{ (bar.floor ?? 1) < 0 ? `B${Math.abs(bar.floor)}F` : `${bar.floor ?? 1}F` }}</span>
        </div>
      </template>
    </div>

    <!-- All-bars mode: grouped by building -->
    <div v-else class="mbp-body">
      <div v-if="filteredBars.length === 0" class="mbp-empty">No bars match current filter.</div>
      <template v-for="bldg in buildingGroups" :key="bldg.id">
        <div class="mbp-bldg-header">{{ bldg.id }} <span class="mbp-bldg-count">{{ bldg.bars.length }}</span></div>
        <div
          v-for="bar in bldg.bars"
          :key="bar.id"
          class="mbp-bar-row"
          @click="handleBarClick(bar)"
        >
          <img v-if="bar.photo" :src="`/uploads/${bar.photo}`" class="mbp-bar-thumb" :alt="getDisplayName(bar)" />
          <div class="mbp-bar-info">
            <div class="mbp-bar-name" :class="{ 'name-faved': isFavorited(bar.id) }">
              <span v-if="isVisited(bar.id)" class="bar-visited-mark">&#10003;</span>
              <span v-if="isFavorited(bar.id)" class="bar-fav-mark">&#9829;</span>
              {{ getDisplayName(bar) }}
            </div>
            <div v-if="getSubName(bar)" class="mbp-bar-subname">{{ getSubName(bar) }}</div>
          </div>
          <span class="mbp-bar-floor" :style="{ background: floorColor(bar.floor ?? 1) }">{{ (bar.floor ?? 1) < 0 ? `B${Math.abs(bar.floor ?? 1)}F` : `${bar.floor ?? 1}F` }}</span>
        </div>
      </template>
    </div>
  </div>

  <ReviewDialog
    v-if="reviewDialogBar"
    :bar="reviewDialogBar"
    :lang="lang"
    @done="reviewDialogBar = null"
  />
</template>

<style scoped>
.map-bar-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: var(--taskbar-height, 32px);
  width: 320px;
  display: flex;
  flex-direction: column;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 0 0 var(--win-border-dark),
    -3px 0 8px rgba(0, 0, 0, 0.5);
  z-index: 300;
  font-family: var(--win-font);
}

/* Header */
.mbp-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  height: 20px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  user-select: none;
}

.mbp-back {
  width: 16px;
  height: 14px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: var(--win-text);
  flex-shrink: 0;
}

.mbp-back:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.mbp-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.mbp-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.mbp-count {
  font-size: 10px;
  opacity: 0.75;
  flex-shrink: 0;
}

.mbp-close {
  width: 16px;
  height: 14px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  flex-shrink: 0;
  margin-left: 2px;
}

.mbp-close:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

/* Filter bar */
.mbp-filters {
  display: flex;
  gap: 2px;
  padding: 3px 4px;
  background: var(--win-bg);
  border-bottom: 1px solid var(--win-border-dark);
  flex-shrink: 0;
}

.mbp-filter-btn {
  flex: 1;
  height: 22px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 11px;
  color: var(--win-text);
}

.mbp-filter-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

/* Body */
.mbp-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.mbp-body::-webkit-scrollbar { width: 16px; }
.mbp-body::-webkit-scrollbar-track { background: var(--win-bg); }
.mbp-body::-webkit-scrollbar-thumb {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.mbp-empty {
  padding: 20px 8px;
  text-align: center;
  color: var(--win-text-disabled);
  font-size: 11px;
}

/* Floor / building headers */
.mbp-floor-header {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  color: var(--win-text-disabled);
  text-transform: uppercase;
  letter-spacing: 1px;
  border-left: 3px solid #934400;
  margin: 4px 0 2px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.mbp-bldg-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  color: var(--win-text-disabled);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 4px 0 2px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.mbp-bldg-count {
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  padding: 0 4px;
  font-size: 9px;
}

/* Bar rows */
.mbp-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  margin-bottom: 2px;
  background: var(--win-bg);
  cursor: pointer;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.mbp-bar-row:hover {
  background: var(--win-bg-dark);
}

.mbp-bar-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  flex-shrink: 0;
  image-rendering: auto;
}

.mbp-bar-info {
  flex: 1;
  min-width: 0;
}

.mbp-bar-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--valhalla-orange);
  display: flex;
  align-items: center;
  gap: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mbp-bar-name.name-faved {
  color: #e87898;
}

.bar-visited-mark {
  color: #4caf50;
  font-size: 10px;
  flex-shrink: 0;
}

.bar-fav-mark {
  color: #e87898;
  font-size: 10px;
  flex-shrink: 0;
}

.mbp-bar-subname {
  font-size: 10px;
  color: var(--win-text-disabled);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mbp-bar-floor {
  font-size: 9px;
  font-weight: bold;
  color: #fff;
  padding: 1px 4px;
  flex-shrink: 0;
}

/* Detail view */
.mbp-detail {
  padding: 6px;
}

.mbp-detail-photo {
  margin-bottom: 8px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px;
}

.mbp-detail-photo img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}

.mbp-detail-name {
  font-size: 13px;
  font-weight: bold;
  color: var(--valhalla-orange);
  margin-bottom: 2px;
}

.mbp-detail-subname {
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-bottom: 6px;
}

.mbp-detail-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.mbp-info-row {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--win-text);
}

.mbp-info-label {
  color: var(--win-text-disabled);
  min-width: 60px;
  flex-shrink: 0;
}

.mbp-description {
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-top: 4px;
  padding: 3px 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  line-height: 1.4;
}

.mbp-detail-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.status-open {
  color: #4caf50;
  font-size: 10px;
  margin-left: 4px;
  font-weight: bold;
}

.status-closed {
  color: #e05050;
  font-size: 10px;
  margin-left: 4px;
  font-weight: bold;
}

/* Hidden on mobile */
@media (max-width: 768px) {
  .map-bar-panel {
    display: none;
  }
}
</style>
