<script setup>
import { ref, computed } from 'vue'
import WinTextInput from './win2000/WinTextInput.vue'
import TagIcon from './TagIcon.vue'
import { useVisited } from '../composables/useVisited.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  bars: Array,
  tags: Array,
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))

const emit = defineEmits(['selectBar'])

const { isVisited } = useVisited()

const search = ref('')
const selectedTagFilter = ref('')

// Search-filtered bars (search removes, tags only dim)
const searchFiltered = computed(() => {
  let list = props.bars
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(b =>
      (b.name_jp && b.name_jp.toLowerCase().includes(q)) ||
      (b.name_en && b.name_en.toLowerCase().includes(q)) ||
      (b.street && b.street.toLowerCase().includes(q))
    )
  }
  return list
})

// Check if a bar matches the active tag filter
function matchesTag(bar) {
  if (!selectedTagFilter.value) return true
  const tagIds = (bar.tags || []).map(t => typeof t === 'string' ? t : t.id)
  return tagIds.includes(selectedTagFilter.value)
}

// Count of bars matching current tag filter
const matchCount = computed(() => {
  if (!selectedTagFilter.value) return searchFiltered.value.length
  return searchFiltered.value.filter(matchesTag).length
})

// Group by street — streets as category headers
const barsByStreet = computed(() => {
  const groups = {}
  for (const bar of searchFiltered.value) {
    const street = bar.street || 'Unknown'
    if (!groups[street]) groups[street] = []
    groups[street].push(bar)
  }
  const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  // Sort bars within each street by name
  for (const [, bars] of sorted) {
    bars.sort((a, b) =>
      (a.name_en || a.name_jp || '').localeCompare(b.name_en || b.name_jp || '')
    )
  }
  return sorted
})

function floorLabel(floor) {
  if (floor < 0) return `B${Math.abs(floor)}F`
  return `${floor}F`
}
</script>

<template>
  <div class="directory">
    <!-- Toolbar -->
    <div class="dir-toolbar">
      <WinTextInput
        v-model="search"
        :placeholder="t('searchBars')"
        style="flex: 1"
      />
      <select
        v-model="selectedTagFilter"
        class="dir-tag-select"
      >
        <option value="">{{ t('allTags') }}</option>
        <option v-for="tag in tags" :key="tag.id" :value="tag.id">
          {{ tag.icon }} {{ tag.label }}
        </option>
      </select>
    </div>

    <!-- Status bar -->
    <div class="dir-status">
      <span v-if="selectedTagFilter">{{ matchCount }} / {{ searchFiltered.length }} bar(s)</span>
      <span v-else>{{ searchFiltered.length }} bar(s)</span>
    </div>

    <!-- Icon grid grouped by street -->
    <div class="dir-content">
      <div v-for="[street, streetBars] in barsByStreet" :key="street" class="street-section">
        <!-- Street category header -->
        <div class="street-header">
          <span class="street-icon">&#128193;</span>
          <span class="street-name">{{ street }}</span>
          <span class="street-count">({{ streetBars.length }})</span>
        </div>

        <!-- Bar icons grid -->
        <div class="icon-grid">
          <div
            v-for="bar in streetBars"
            :key="bar.id"
            :class="['icon-item', { dimmed: !matchesTag(bar) }]"
            @click="emit('selectBar', bar)"
          >
            <!-- Thumbnail or file icon -->
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
              <!-- Visited badge -->
              <span v-if="isVisited(bar.id)" class="icon-visited">&#10003;</span>
              <!-- Tag dots -->
              <div v-if="bar.tags && bar.tags.length" class="icon-tags">
                <span
                  v-for="t in bar.tags.slice(0, 3)"
                  :key="typeof t === 'string' ? t : t.id"
                  class="icon-tag-dot"
                  :style="{ background: (typeof t === 'object' ? t.color : '') || '#888' }"
                ></span>
              </div>
            </div>
            <!-- Label -->
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
    </div>
  </div>
</template>

<style scoped>
.directory {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--win-bg-dark);
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.dir-toolbar {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--win-bg);
  box-shadow:
    inset 0 -1px 0 var(--win-border-dark);
}

.dir-tag-select {
  background: var(--win-bg-dark);
  color: var(--win-text);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  min-width: 120px;
  outline: none;
}

.dir-tag-select option {
  background: var(--win-bg);
  color: var(--win-text);
}

.dir-status {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  background: var(--win-bg);
  border-bottom: 1px solid var(--win-border-dark);
  font-size: 10px;
  color: var(--win-text-disabled);
}

.dir-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

/* Street category header */
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

/* Icon grid — like Windows Explorer Large Icons view */
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
  transition: opacity 0.15s;
}

/* Greyed-out bars that don't match tag filter */
.icon-item.dimmed {
  opacity: 0.3;
}

.icon-item.dimmed:hover {
  opacity: 0.6;
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

/* Thumbnail area */
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

/* Visited badge overlay */
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

/* Tag dots overlay */
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

/* Label under icon */
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
