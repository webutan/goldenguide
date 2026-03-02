<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import WinTextInput from './win2000/WinTextInput.vue'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  bars: Array,
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))

const emit = defineEmits(['selectBar', 'searchMatches'])

const search = ref('')
const showDropdown = ref(false)

const filtered = computed(() => {
  if (!search.value) return []
  const q = search.value.toLowerCase()
  return props.bars.filter(b =>
    (b.name_jp && b.name_jp.toLowerCase().includes(q)) ||
    (b.name_en && b.name_en.toLowerCase().includes(q)) ||
    (b.street && b.street.toLowerCase().includes(q))
  ).slice(0, 8)
})

// Emit matching bars whenever search changes
watch(filtered, (matches) => {
  emit('searchMatches', matches)
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
  cursor: pointer;
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

.result-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.result-street {
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
}
</style>
