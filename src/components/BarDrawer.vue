<script setup>
import { computed } from 'vue'
import { useVisited } from '../composables/useVisited.js'
import { useI18n } from '../composables/useI18n.js'
import WinButton from './win2000/WinButton.vue'
import WinScrollContainer from './win2000/WinScrollContainer.vue'
import TagIcon from './TagIcon.vue'

const props = defineProps({
  buildingId: String,
  bars: Array,
  activeTags: { type: Array, default: () => [] },
  chargeMin: { type: Number, default: null },
  chargeMax: { type: Number, default: null },
  drinkMin: { type: Number, default: null },
  drinkMax: { type: Number, default: null },
  floorFilter: { type: Number, default: null },
  openNowFilter: { type: Boolean, default: false },
  openBarIds: { type: Set, default: () => new Set() },
  tags: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
})

const emit = defineEmits(['close'])
const { isVisited, toggleVisited, isFavorited, toggleFavorited } = useVisited()
const { t } = useI18n(computed(() => props.lang))

const FLOOR_COLORS = {
  '-3': '#0f2040',
  '-2': '#2a1845',
  '-1': '#1a3868',
  1: '#934400',
  2: '#005559',
  3: '#4a6030',
  4: '#7a2050',
  5: '#5a3020',
}

function floorColor(floor) {
  return FLOOR_COLORS[floor] ?? '#934400'
}

const hasActiveFilters = computed(() =>
  (props.activeTags && props.activeTags.length > 0) ||
  props.chargeMin != null || props.chargeMax != null ||
  props.drinkMin != null || props.drinkMax != null ||
  props.floorFilter != null || props.openNowFilter
)

function barPassesFilters(bar) {
  if (props.floorFilter != null && (bar.floor ?? 1) !== props.floorFilter) return false
  if (props.activeTags && props.activeTags.length > 0) {
    const tagIds = (bar.tags || []).map(t => typeof t === 'string' ? t : t.id)
    if (!props.activeTags.some(at => tagIds.includes(at))) return false
  }
  const charge = bar.charge != null && bar.charge !== '' ? Number(bar.charge) : null
  const drinkPrice = bar.drink_price != null && bar.drink_price !== '' ? Number(bar.drink_price) : null
  if (props.chargeMin != null && charge != null && !isNaN(charge) && charge < props.chargeMin) return false
  if (props.chargeMax != null && charge != null && !isNaN(charge) && charge > props.chargeMax) return false
  if (props.drinkMin != null && drinkPrice != null && !isNaN(drinkPrice) && drinkPrice < props.drinkMin) return false
  if (props.drinkMax != null && drinkPrice != null && !isNaN(drinkPrice) && drinkPrice > props.drinkMax) return false
  if (props.openNowFilter && !props.openBarIds.has(String(bar.id))) return false
  return true
}

const visibleBars = computed(() => {
  if (!hasActiveFilters.value) return props.bars
  return props.bars.filter(barPassesFilters)
})

const floorGroups = computed(() => {
  const groups = {}
  for (const bar of visibleBars.value) {
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

const tagMap = computed(() => {
  const map = {}
  for (const tag of props.tags) map[tag.id] = tag
  return map
})

function getBarTags(bar) {
  return (bar.tags || []).map(t => {
    if (typeof t === 'object' && t.id) return t
    return tagMap.value[t]
  }).filter(Boolean)
}

function getDisplayName(bar) {
  if (props.lang === 'jp') return bar.name_jp || bar.name_en
  return bar.name_en || bar.name_jp
}

function getSubName(bar) {
  if (props.lang === 'jp') return bar.name_en
  return bar.name_jp
}

function getGoogleMapsUrl(bar) {
  if (bar.google_link) return bar.google_link
  if (bar.plus_code) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bar.plus_code)}`
  return null
}

function openGoogleMaps(bar) {
  const url = getGoogleMapsUrl(bar)
  if (url) window.open(url, '_blank')
}

function getOpenStatus(bar) {
  const hasSchedule = bar.schedule && bar.schedule.default
  if (!hasSchedule) return null
  return props.openBarIds.has(String(bar.id)) ? 'open' : 'closed'
}
</script>

<template>
  <Transition name="drawer">
    <div class="bar-drawer">
      <div class="bar-drawer-titlebar">
        <span class="bar-drawer-title">{{ buildingId }} &mdash; {{ bars.length }} bar{{ bars.length !== 1 ? 's' : '' }}</span>
        <button class="win-ctrl-btn" @click="emit('close')" title="Close">
          <span class="win-ctrl-icon">&#10005;</span>
        </button>
      </div>
      <div class="bar-drawer-body">
        <WinScrollContainer><div class="bar-drawer-body-inner">
        <div v-if="visibleBars.length === 0" class="drawer-empty">
          No bars match the current filter.
        </div>
        <template v-for="group in floorGroups" :key="group.floor">
          <div class="drawer-floor-header" :style="{ borderLeftColor: floorColor(group.floor) }">
            {{ group.floorLabel }}
          </div>
          <div v-for="bar in group.bars" :key="bar.id" class="drawer-bar-card">
            <div v-if="bar.photo" class="drawer-bar-photo">
              <img :src="`/uploads/${bar.photo}`" :alt="getDisplayName(bar)" />
            </div>
            <div class="drawer-bar-header">
              <div class="drawer-bar-name-en" :class="{ 'name-favorited': isFavorited(bar.id) }">
                <svg v-if="isVisited(bar.id)" class="bar-status-icon" viewBox="0 0 10 10" width="10" height="10" fill="none">
                  <polyline points="1,5 3.5,8.5 9,1.5" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg v-if="isFavorited(bar.id)" class="bar-status-icon" viewBox="0 0 10 10" width="10" height="10">
                  <path d="M5,8.5C5,8.5 1,5.5 1,3C1,1.8 2,1 3,1.5C4,2 5,3 5,3C5,3 6,2 7,1.5C8,1 9,1.8 9,3C9,5.5 5,8.5 5,8.5Z" fill="#e87898"/>
                </svg>
                {{ getDisplayName(bar) }}
              </div>
              <div v-if="getSubName(bar)" class="drawer-bar-name-jp">{{ getSubName(bar) }}</div>
            </div>
            <div v-if="getBarTags(bar).length" class="drawer-bar-tags">
              <span
                v-for="tag in getBarTags(bar)"
                :key="tag.id"
                class="drawer-tag"
                :style="{ borderLeft: `3px solid ${tag.color}` }"
              >
                <TagIcon :icon="tag.icon" :size="10" /> {{ tag.label }}
              </span>
            </div>
            <div class="drawer-bar-info">
              <div v-if="bar.charge" class="info-row">
                <span class="info-label">{{ t('cover') }}</span>
                <span>&yen;{{ bar.charge }}</span>
              </div>
              <div v-if="bar.male_charge" class="info-row">
                <span class="info-label">{{ t('maleCharge') }}</span>
                <span>&yen;{{ bar.male_charge }}</span>
              </div>
              <div v-if="bar.drink_price" class="info-row">
                <span class="info-label">{{ t('drinks') }}</span>
                <span>&yen;{{ bar.drink_price }}~</span>
              </div>
              <div v-if="bar.seats" class="info-row">
                <span class="info-label">{{ t('seats') }}</span>
                <span>~{{ bar.seats }}</span>
              </div>
              <div v-if="bar.hours" class="info-row">
                <span class="info-label">{{ t('hours') }}</span>
                <span>{{ bar.hours }}
                  <span v-if="getOpenStatus(bar) === 'open'" class="status-open">&#9679; {{ t('open') }}</span>
                  <span v-else-if="getOpenStatus(bar) === 'closed'" class="status-closed">&#9679; {{ t('closed') }}</span>
                </span>
              </div>
              <div v-if="bar.description" class="info-description">{{ bar.description }}</div>
            </div>
            <div class="drawer-bar-actions">
              <button v-if="getGoogleMapsUrl(bar)" class="maps-icon-btn" :title="t('googleMaps')" @click="openGoogleMaps(bar)">
                <img src="/icons/googlemaps.png" alt="Google Maps" class="maps-icon-img" />
              </button>
              <WinButton small :pressed="isVisited(bar.id)" @click="toggleVisited(bar.id)">
                <template v-if="isVisited(bar.id)">&#10003; {{ t('visited') }}</template>
                <template v-else>{{ t('markVisited') }}</template>
              </WinButton>
              <WinButton small :pressed="isFavorited(bar.id)" @click="toggleFavorited(bar.id)">
                <template v-if="isFavorited(bar.id)">&#9829; {{ t('favorited') }}</template>
                <template v-else>{{ t('markFavorite') }}</template>
              </WinButton>
            </div>
          </div>
        </template>
        </div></WinScrollContainer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.bar-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: var(--taskbar-height);
  width: 300px;
  z-index: 150;
  display: flex;
  flex-direction: column;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    -4px 0 12px rgba(0, 0, 0, 0.6);
}

.bar-drawer-titlebar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 3px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  flex-shrink: 0;
}

.bar-drawer-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 2px;
}

.win-ctrl-btn {
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
  padding: 0;
}

.win-ctrl-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.win-ctrl-icon {
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  line-height: 1;
}

.bar-drawer-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  min-height: 0;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.bar-drawer-body-inner {
  padding: 4px;
}

.drawer-empty {
  padding: 16px 8px;
  text-align: center;
  color: var(--win-text-disabled);
  font-size: 11px;
}

.drawer-floor-header {
  padding: 3px 6px;
  font-size: 10px;
  font-weight: bold;
  font-family: var(--win-font);
  color: var(--win-text-disabled);
  text-transform: uppercase;
  letter-spacing: 1px;
  border-left: 4px solid #934400;
  margin: 6px 0 2px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.drawer-bar-card {
  margin-bottom: 4px;
  padding: 5px 6px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.drawer-bar-photo {
  margin-bottom: 5px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px;
}

.drawer-bar-photo img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
}

.drawer-bar-header {
  margin-bottom: 4px;
}

.drawer-bar-name-en {
  font-size: 12px;
  font-weight: 700;
  color: var(--valhalla-orange);
  display: flex;
  align-items: center;
  gap: 3px;
}

.drawer-bar-name-en.name-favorited {
  color: #e87898;
}

.bar-status-icon {
  flex-shrink: 0;
}

.drawer-bar-name-jp {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.drawer-bar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 4px;
}

.drawer-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 5px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  font-size: 10px;
}

.drawer-bar-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 5px;
}

.info-row {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.info-label {
  color: var(--win-text-disabled);
  min-width: 70px;
  flex-shrink: 0;
}

.info-description {
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-top: 2px;
  padding: 3px 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  line-height: 1.4;
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

.drawer-bar-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.maps-icon-btn {
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
}

.maps-icon-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.maps-icon-img {
  width: 80px;
  height: 15px;
  display: block;
  image-rendering: pixelated;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .bar-drawer {
    left: 0;
    right: 0;
    top: auto;
    width: 100%;
    height: 45dvh;
    bottom: var(--taskbar-height, 32px);
    box-shadow:
      inset 1px 1px 0 var(--win-border-light),
      inset -1px -1px 0 var(--win-border-dark),
      0 -4px 12px rgba(0, 0, 0, 0.6);
  }

  .drawer-enter-from,
  .drawer-leave-to {
    transform: translateY(100%);
  }

  .bar-drawer-titlebar {
    height: 32px;
    font-size: 14px;
    padding: 0 8px;
  }

  .win-ctrl-btn {
    width: 26px;
    height: 24px;
  }

  .win-ctrl-icon {
    font-size: 12px;
  }

  .drawer-floor-header {
    font-size: 13px;
    padding: 5px 8px;
    margin: 8px 0 3px;
  }

  .drawer-bar-card {
    padding: 8px 10px;
    margin-bottom: 6px;
  }

  .drawer-bar-name-en {
    font-size: 16px;
  }

  .drawer-bar-name-jp {
    font-size: 13px;
  }

  .drawer-tag {
    font-size: 12px;
    padding: 3px 8px;
  }

  .info-row {
    font-size: 13px;
  }

  .info-label {
    min-width: 90px;
  }

  .info-description {
    font-size: 12px;
  }

  .drawer-bar-photo img {
    height: 120px;
  }

  .maps-icon-img {
    width: 100px;
    height: 19px;
  }
}
</style>
