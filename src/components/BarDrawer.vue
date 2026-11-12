<script setup>
import { ref, computed, watch, onBeforeUnmount, toRaw } from 'vue'
import { useVisited } from '../composables/useVisited.js'
import { useI18n } from '../composables/useI18n.js'
import { useMapHover } from '../composables/useMapHover.js'
import { barPasses, hasActiveFilters as hasAnyFilter } from '../utils/barFilters.js'
import WinButton from './win2000/WinButton.vue'
import WinScrollContainer from './win2000/WinScrollContainer.vue'
import BarDrawerCards from './BarDrawerCards.vue'
import ReviewDialog from './ReviewDialog.vue'

const props = defineProps({
  buildingId: String,
  bars: Array,
  allBars: { type: Array, default: () => [] },
  activeTags: { type: Array, default: () => [] },
  chargeMin: { type: Number, default: null },
  chargeMax: { type: Number, default: null },
  drinkMin: { type: Number, default: null },
  drinkMax: { type: Number, default: null },
  floorFilter: { type: Number, default: null },
  tagMode: { type: String, default: 'or' }, // 'or' | 'and'
  openNowFilter: { type: Boolean, default: false },
  openBarIds: { type: Set, default: () => new Set() },
  tags: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
  allBarsMode: { type: Boolean, default: false },
  favoritesFilter: { type: Boolean, default: false },
  visitedFilter: { type: Boolean, default: false },
  // Preview the bars of the building under the pointer on the map (desktop drawer)
  followMapHover: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select-bar', 'show-reviews', 'share-bar', 'hover-bar', 'unhover-bar', 'back-to-all'])

// A card under the pointer never gets its mouseleave if the drawer is removed
// (admin toggle, leaving the map): report it so the map highlight clears.
onBeforeUnmount(() => emit('unhover-bar'))
const { isVisited, isFavorited } = useVisited()
const { t } = useI18n(computed(() => props.lang))
const { hoveredBuildingId } = useMapHover()
const hoverBuildingId = computed(() => props.followMapHover ? hoveredBuildingId.value : null)

const reviewDialogBar = ref(null)

const drawerFilters = computed(() => ({
  tags: props.activeTags || [],
  tagMode: props.tagMode,
  chargeMin: props.chargeMin,
  chargeMax: props.chargeMax,
  drinkMin: props.drinkMin,
  drinkMax: props.drinkMax,
  floor: props.floorFilter,
  openNow: props.openNowFilter,
  favorites: props.favoritesFilter,
  visited: props.visitedFilter,
}))

const hasActiveFilters = computed(() => hasAnyFilter(drawerFilters.value))

const barPassesFilters = (bar) =>
  barPasses(bar, drawerFilters.value, { openBarIds: props.openBarIds, isFavorited, isVisited })

const visibleBars = computed(() => {
  if (!hasActiveFilters.value) return props.bars
  return props.bars.filter(barPassesFilters)
})

function makeFloorGroups(barsArr) {
  const groups = {}
  for (const bar of barsArr) {
    const f = bar.floor ?? 1
    if (!groups[f]) groups[f] = []
    groups[f].push(bar)
  }
  return Object.entries(groups)
    .map(([f, bars]) => ({
      key: `floor-${f}`,
      label: Number(f) < 0 ? `B${Math.abs(Number(f))}F` : `${f}F`,
      floor: Number(f),
      bars,
      isBuilding: false,
    }))
    .sort((a, b) => b.floor - a.floor)
}

// The list. All-bars mode: grouped by building; a selected building or
// search results: grouped by floor. It does not depend on the map hover, so
// moving the pointer over the map never rebuilds it.
const listGroups = computed(() => {
  if (props.allBarsMode) {
    const groups = {}
    for (const bar of visibleBars.value) {
      const bldg = bar.building_id || 'unplaced'
      if (!groups[bldg]) groups[bldg] = []
      groups[bldg].push(bar)
    }
    return Object.entries(groups)
      .map(([bldgId, bars]) => ({
        key: `bldg-${bldgId}`,
        label: bldgId === 'unplaced' ? t('unplaced') : bldgId,
        floor: null,
        bars,
        isBuilding: true,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
  return makeFloorGroups(visibleBars.value)
})

// The hover preview: every bar of the building under the pointer, by floor
// (no filter, transient). Shown as a layer over the list.
const previewBars = computed(() => {
  const id = hoverBuildingId.value
  if (!id) return []
  // The plain array: filtering through the reactive proxy costs more than
  // everything else here, and this runs on every move to another building.
  // (props.allBars itself is still read, so a reload updates the preview.)
  const all = props.allBars
  return toRaw(all).filter(b => String(b.building_id) === String(id))
})
const previewGroups = computed(() => makeFloorGroups(previewBars.value))

// While the preview is up the list is still there underneath, invisible. A
// button in it that has the keyboard focus must not stay reachable (Enter
// would press something that cannot be seen): drop the focus, which is what
// happened when the list used to be removed.
const listScroller = ref(null)
watch(hoverBuildingId, (id, was) => {
  if (!id || was) return
  const list = listScroller.value?.$el
  const focused = document.activeElement
  if (list && focused && list.contains(focused)) focused.blur()
})

// Title bar text
const drawerTitle = computed(() => {
  if (hoverBuildingId.value) {
    const count = previewBars.value.length
    return `${hoverBuildingId.value} \u2014 ${t(count === 1 ? 'barCountOne' : 'barCount', { n: count })}`
  }
  if (props.allBarsMode) {
    const n = visibleBars.value.length
    return `${t('goldenGai')} \u2014 ${t(n === 1 ? 'barCountOne' : 'barCount', { n })}`
  }
  if (!props.buildingId) {
    const count = props.bars?.length ?? 0
    return `${t('searchResults')} \u2014 ${t(count === 1 ? 'barCountOne' : 'barCount', { n: count })}`
  }
  const count = props.bars?.length ?? 0
  return `${props.buildingId} \u2014 ${t(count === 1 ? 'barCountOne' : 'barCount', { n: count })}`
})
</script>

<template>
  <Transition name="drawer">
    <div class="bar-drawer">
      <div class="bar-drawer-titlebar">
        <WinButton v-if="!allBarsMode && !hoverBuildingId && buildingId" small class="back-btn" @click="emit('back-to-all')" :title="t('allBars')">&#9664;</WinButton>
        <span class="bar-drawer-title">{{ drawerTitle }}</span>
        <button class="win-ctrl-btn" @click="emit('close')" :title="t('close')">
          <span class="win-ctrl-icon">&#10005;</span>
        </button>
      </div>
      <div class="bar-drawer-body">
        <WinScrollContainer ref="listScroller" :class="{ 'is-covered': hoverBuildingId }"><div class="bar-drawer-body-inner">
          <div v-if="visibleBars.length === 0" class="drawer-empty">
            {{ t('noBarsMatchFilter') }}
          </div>
          <BarDrawerCards
            :groups="listGroups"
            :charge-min="chargeMin"
            :charge-max="chargeMax"
            :drink-min="drinkMin"
            :drink-max="drinkMax"
            :open-bar-ids="openBarIds"
            :tags="tags"
            :lang="lang"
            @hover-bar="emit('hover-bar', $event)"
            @unhover-bar="emit('unhover-bar')"
            @select-bar="emit('select-bar', $event)"
            @show-reviews="emit('show-reviews', $event)"
            @share-bar="emit('share-bar', $event)"
            @review-bar="reviewDialogBar = $event"
          />
        </div></WinScrollContainer>
        <!-- Map-hover preview: a layer over the list. The list stays mounted
             underneath (hidden), so it keeps its scroll position and is not
             rebuilt when the pointer leaves the building. -->
        <div v-if="hoverBuildingId" class="bar-drawer-preview">
          <WinScrollContainer><div class="bar-drawer-body-inner">
          <BarDrawerCards
            :groups="previewGroups"
            reuse-cards
            :charge-min="chargeMin"
            :charge-max="chargeMax"
            :drink-min="drinkMin"
            :drink-max="drinkMax"
            :open-bar-ids="openBarIds"
            :tags="tags"
            :lang="lang"
            @hover-bar="emit('hover-bar', $event)"
            @unhover-bar="emit('unhover-bar')"
            @select-bar="emit('select-bar', $event)"
            @show-reviews="emit('show-reviews', $event)"
            @share-bar="emit('share-bar', $event)"
            @review-bar="reviewDialogBar = $event"
          />
          </div></WinScrollContainer>
        </div>
      </div>
    </div>

  </Transition>

  <ReviewDialog
    v-if="reviewDialogBar"
    :bar="reviewDialogBar"
    :lang="lang"
    @done="reviewDialogBar = null"
  />
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

.back-btn {
  flex-shrink: 0;
  margin-right: 2px;
}

.win-ctrl-btn {
  width: 16px;
  height: 14px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: var(--cursor-pointer);
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
  position: relative;
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

/* Hover preview: same box as the list, which stays under it, invisible. Not
   covered with an opaque layer: the drawer's bevel shows through the body
   around the list and has to show around the preview too. Not
   `visibility: hidden` either: that restyles every card (~11 ms each way),
   opacity touches only this one element. The preview is on top, so the
   list cannot be clicked meanwhile. */
.bar-drawer-preview {
  position: absolute;
  inset: 0;
  display: flex;
}

.is-covered {
  opacity: 0;
}

.drawer-empty {
  padding: 16px 8px;
  text-align: center;
  color: var(--win-text-disabled);
  font-size: 11px;
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
}
</style>
