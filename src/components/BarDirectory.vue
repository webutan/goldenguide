<script setup>
import { ref, computed } from 'vue'
import WinTextInput from './win2000/WinTextInput.vue'
import WinScrollContainer from './win2000/WinScrollContainer.vue'
import TagFilter from './TagFilter.vue'
import { useVisited } from '../composables/useVisited.js'
import { useI18n } from '../composables/useI18n.js'
import { useOpenNow } from '../composables/useOpenNow.js'

const props = defineProps({
  bars: Array,
  tags: Array,
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))
const emit = defineEmits(['selectBar'])
const { isVisited } = useVisited()

// Internal filter state
const dirActiveTags = ref([])
const dirChargeMin = ref(null)
const dirChargeMax = ref(null)
const dirDrinkMin = ref(null)
const dirDrinkMax = ref(null)
const dirFloorFilter = ref(null)
const dirOpenNowFilter = ref(false)

const barsRef = computed(() => props.bars || [])
const { openBarIds } = useOpenNow(barsRef)

const search = ref('')

function barPassesFilters(bar) {
  if (dirOpenNowFilter.value && !openBarIds.value.has(String(bar.id))) return false
  if (dirFloorFilter.value != null && (bar.floor ?? 1) !== dirFloorFilter.value) return false
  if (dirActiveTags.value.length > 0) {
    const tagIds = (bar.tags || []).map(tg => typeof tg === 'string' ? tg : tg.id)
    if (!dirActiveTags.value.some(at => tagIds.includes(at))) return false
  }
  const charge = bar.charge != null && bar.charge !== '' ? Number(bar.charge) : null
  if (dirChargeMin.value != null && (charge === null || charge < dirChargeMin.value)) return false
  if (dirChargeMax.value != null && charge !== null && charge > dirChargeMax.value) return false
  const drink = bar.drink_price != null && bar.drink_price !== '' ? Number(bar.drink_price) : null
  if (dirDrinkMin.value != null && (drink === null || drink < dirDrinkMin.value)) return false
  if (dirDrinkMax.value != null && drink !== null && drink > dirDrinkMax.value) return false
  return true
}

const filteredBars = computed(() => {
  let list = props.bars || []
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(b =>
      (b.name_jp && b.name_jp.toLowerCase().includes(q)) ||
      (b.name_en && b.name_en.toLowerCase().includes(q)) ||
      (b.street && b.street.toLowerCase().includes(q))
    )
  }
  return list.filter(barPassesFilters)
})

const barsByStreet = computed(() => {
  const groups = {}
  for (const bar of filteredBars.value) {
    const street = bar.street || 'Unknown'
    if (!groups[street]) groups[street] = []
    groups[street].push(bar)
  }
  const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  for (const [, streetBars] of sorted) {
    streetBars.sort((a, b) =>
      (a.name_en || a.name_jp || '').localeCompare(b.name_en || b.name_jp || '')
    )
  }
  return sorted
})

function floorLabel(floor) {
  if (floor == null) return '1F'
  if (floor < 0) return `B${Math.abs(floor)}F`
  return `${floor}F`
}
</script>

<template>
  <div class="directory">

    <!-- Left-side filter panel -->
    <div class="dir-filter-panel">
      <div class="dir-filter-body">
        <WinScrollContainer>
          <TagFilter
            v-model="dirActiveTags"
            :tags="tags"
            :bars="bars"
            :lang="lang"
            v-model:charge-min="dirChargeMin"
            v-model:charge-max="dirChargeMax"
            v-model:drink-min="dirDrinkMin"
            v-model:drink-max="dirDrinkMax"
            v-model:floor-filter="dirFloorFilter"
            v-model:open-now-filter="dirOpenNowFilter"
          />
        </WinScrollContainer>
      </div>
    </div>

    <!-- Main content -->
    <div class="dir-main">
      <div class="dir-toolbar">
        <WinTextInput
          v-model="search"
          :placeholder="t('searchBars')"
          style="flex: 1"
        />
      </div>

      <div class="dir-status">
        <span>{{ filteredBars.length }} / {{ (bars || []).length }} bar(s)</span>
      </div>

      <div class="dir-content">
        <WinScrollContainer><div class="dir-content-inner">
          <div v-for="[street, streetBars] in barsByStreet" :key="street" class="street-section">
            <div class="street-header">
              <span class="street-icon">&#128193;</span>
              <span class="street-name">{{ street }}</span>
              <span class="street-count">({{ streetBars.length }})</span>
            </div>
            <div class="icon-grid">
              <div
                v-for="bar in streetBars"
                :key="bar.id"
                class="icon-item"
                @click="emit('selectBar', bar)"
              >
                <div class="icon-thumb">
                  <img
                    v-if="bar.photo"
                    :src="`/uploads/${bar.photo}`"
                    :alt="lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)"
                    class="icon-img"
                  />
                  <div v-else class="icon-placeholder">
                    <span class="icon-file-glyph">&#128196;</span>
                  </div>
                  <span v-if="isVisited(bar.id)" class="icon-visited">&#10003;</span>
                  <div v-if="bar.tags && bar.tags.length" class="icon-tags">
                    <span
                      v-for="tg in bar.tags.slice(0, 3)"
                      :key="typeof tg === 'string' ? tg : tg.id"
                      class="icon-tag-dot"
                      :style="{ background: (typeof tg === 'object' ? tg.color : '') || '#888' }"
                    ></span>
                  </div>
                </div>
                <div class="icon-label">
                  <div class="icon-name">{{ lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp) }}</div>
                  <div class="icon-floor">{{ floorLabel(bar.floor) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="barsByStreet.length === 0" class="dir-empty">
            {{ t('noBarsFound') }}
          </div>
        </div></WinScrollContainer>
      </div>
    </div>


  </div>
</template>

<style scoped>
.directory {
  display: flex;
  flex-direction: row;
  height: 100%;
  background: var(--win-bg-dark);
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

/* ── Main content column ── */
.dir-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.dir-toolbar {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--win-bg);
  box-shadow: inset 0 -1px 0 var(--win-border-dark);
  flex-shrink: 0;
}

.dir-status {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  background: var(--win-bg);
  border-bottom: 1px solid var(--win-border-dark);
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
}

.dir-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  min-height: 0;
}

.dir-content-inner {
  padding: 4px;
  min-width: 0;
  flex: 1;
}

/* ── Right filter panel ── */
.dir-filter-panel {
  width: 190px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--win-bg);
  box-shadow:
    inset -1px 0 0 var(--win-border-light),
    inset -2px 0 0 var(--win-border-mid);
  border-right: 1px solid var(--win-border-darkest);
}


.dir-filter-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* ── Street sections ── */
.street-section {
  margin-bottom: 8px;
}

.street-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  margin-bottom: 4px;
  user-select: none;
}

.street-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.street-name {
  flex: 1;
  font-weight: bold;
  color: var(--valhalla-orange);
}

.street-count {
  font-size: 10px;
  color: var(--win-text-disabled);
  font-weight: normal;
}

/* ── Icon grid ── */
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px;
}

.icon-item {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  cursor: pointer;
  user-select: none;
}

.icon-item:hover {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.icon-item:hover .icon-name {
  color: var(--win-highlight-text);
}

.icon-item:hover .icon-floor {
  color: var(--win-highlight-text);
  opacity: 0.8;
}

.icon-thumb {
  width: 64px;
  height: 64px;
  position: relative;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 3px;
}

.icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.icon-file-glyph {
  font-size: 32px;
  opacity: 0.5;
}

.icon-visited {
  position: absolute;
  top: 1px;
  right: 1px;
  background: var(--valhalla-pink);
  color: #fff;
  font-size: 8px;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.icon-tags {
  position: absolute;
  bottom: 2px;
  left: 2px;
  display: flex;
  gap: 1px;
}

.icon-tag-dot {
  width: 6px;
  height: 6px;
  display: inline-block;
}

.icon-label {
  text-align: center;
  width: 100%;
}

.icon-name {
  font-size: 10px;
  color: var(--win-text);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-floor {
  font-size: 9px;
  color: var(--win-text-disabled);
}

.dir-empty {
  padding: 20px;
  text-align: center;
  color: var(--win-text-disabled);
}
</style>
