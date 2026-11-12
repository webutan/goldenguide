<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import WinTextInput from './win2000/WinTextInput.vue'
import { useI18n } from '../composables/useI18n.js'
import { buildSearchIndex, searchBars } from '../utils/searchText.js'

const props = defineProps({
  bars: Array,
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))

const emit = defineEmits(['selectBar', 'searchMatches'])

const search = ref('')
const showDropdown = ref(false)

const DROPDOWN_LIMIT = 8

// Normalised fields are computed once per bar list, not on every keystroke
const searchIndex = computed(() => buildSearchIndex(props.bars))

// Every match drives the map highlights and the results drawer
const allMatches = computed(() => searchBars(searchIndex.value, search.value))

// The dropdown itself stays short
const filtered = computed(() => allMatches.value.slice(0, DROPDOWN_LIMIT))
const moreCount = computed(() => Math.max(0, allMatches.value.length - DROPDOWN_LIMIT))

watch(allMatches, (matches) => {
  emit('searchMatches', matches)
})

// The box is recreated empty the next time it is shown (leaving the map,
// admin mode, crossing the mobile width), so the matches go with it.
onBeforeUnmount(() => {
  if (allMatches.value.length > 0) emit('searchMatches', [])
})

function displayName(bar) {
  if (props.lang === 'jp') return bar.name_jp || bar.name_en
  return bar.name_en || bar.name_jp
}

function selectResult(bar) {
  emit('selectBar', { bar, buildingId: bar.building_id })
  search.value = ''
  showDropdown.value = false
}

// "+N more": every result is already listed in the drawer, so just get the
// dropdown out of its way (the search text and highlights stay).
function showAllResults() {
  showDropdown.value = false
  document.activeElement?.blur?.()
}

function onFocus() {
  showDropdown.value = true
}

function onBlur() {
  setTimeout(() => { showDropdown.value = false }, 150)
}

// Dropdown positioning via teleport to escape WinWindow overflow clipping
const dropdownStyle = ref({})

function updateDropdownPosition() {
  const el = document.querySelector('.map-search')
  if (!el) return
  const rect = el.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: 9999,
  }
}

watch(showDropdown, async (val) => {
  if (val) {
    await nextTick()
    updateDropdownPosition()
  }
})
</script>

<template>
  <div class="map-search">
    <WinTextInput
      v-model="search"
      :placeholder="t('searchBars')"
      @focus="onFocus"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div
        v-if="showDropdown && filtered.length > 0"
        class="search-dropdown"
        :style="dropdownStyle"
      >
        <div
          v-for="bar in filtered"
          :key="bar.id"
          class="search-result"
          @mousedown.prevent="selectResult(bar)"
        >
          <span class="result-name">{{ displayName(bar) }}</span>
          <span class="result-street">{{ bar.street }}</span>
        </div>
        <div
          v-if="moreCount > 0"
          class="search-result search-more"
          @mousedown.prevent="showAllResults"
        >
          {{ t('searchMore', { n: moreCount }) }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.map-search {
  position: relative;
}
</style>

<style>
.search-dropdown {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    3px 3px 6px rgba(0, 0, 0, 0.5);
  max-height: 200px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 6px;
  cursor: var(--cursor-pointer);
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  gap: 6px;
}

.search-result:hover {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.search-result:hover .result-street {
  color: var(--win-highlight-text);
  opacity: 0.8;
}

.search-more {
  justify-content: center;
  color: var(--win-text-disabled);
  border-top: 1px solid var(--win-border-dark);
}

.search-more:hover {
  color: var(--win-highlight-text);
}

.result-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: bold;
}

.result-street {
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
}
</style>
