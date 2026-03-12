<script setup>
import { ref, computed } from 'vue'

import TagIcon from './TagIcon.vue'
import { useI18n } from '../composables/useI18n.js'

const SLIDER_MAX = 1000
const SLIDER_STEP = 100

const props = defineProps({
  tags: Array,
  bars: { type: Array, default: () => [] },
  modelValue: Array,
  chargeMin: { type: [Number, null], default: null },
  chargeMax: { type: [Number, null], default: null },
  drinkMin: { type: [Number, null], default: null },
  drinkMax: { type: [Number, null], default: null },
  floorFilter: { type: [Number, null], default: null },
  openNowFilter: { type: Boolean, default: false },
  lang: { type: String, default: 'en' },
  collapseByDefault: { type: Boolean, default: false },
  tagMode: { type: String, default: 'or' }, // 'or' | 'and'
})

const { t } = useI18n(computed(() => props.lang))

const emit = defineEmits([
  'update:modelValue',
  'update:chargeMin',
  'update:chargeMax',
  'update:drinkMin',
  'update:drinkMax',
  'update:floorFilter',
  'update:openNowFilter',
  'update:tagMode',
])

// Derive available floors from bars data
const availableFloors = computed(() => {
  const floors = new Set()
  for (const bar of props.bars) {
    if (bar.floor != null) floors.add(bar.floor)
  }
  return [...floors].sort((a, b) => a - b)
})

const tagsExpanded = ref(!props.collapseByDefault)
const priceExpanded = ref(!props.collapseByDefault)

function toggle(tagId, currentValue) {
  const next = currentValue.includes(tagId)
    ? currentValue.filter(id => id !== tagId)
    : [...currentValue, tagId]
  emit('update:modelValue', next)
}

// Slider values: 0 = no filter (null), SLIDER_MAX = no upper cap (null for max)
function sliderToValue(v) {
  return Number(v)
}

function onMinChange(val, emitMin, currentMax, emitMax) {
  const v = sliderToValue(val)
  emit(emitMin, v === 0 ? null : v)
  // Push max up if min exceeds it
  const maxVal = currentMax ?? SLIDER_MAX
  if (v > maxVal) {
    emit(emitMax, v >= SLIDER_MAX ? null : v)
  }
}

function onMaxChange(val, emitMax, currentMin, emitMin) {
  const v = sliderToValue(val)
  emit(emitMax, v >= SLIDER_MAX ? null : v)
  // Push min down if max goes below it
  const minVal = currentMin ?? 0
  if (v < minVal) {
    emit(emitMin, v === 0 ? null : v)
  }
}

function formatYen(v, isMax) {
  if (v == null) return isMax ? '1000+' : '0'
  if (isMax && v >= SLIDER_MAX) return '1000+'
  return `${v}`
}

// Compute percentages for the active range highlight
function rangePercent(min, max) {
  const lo = (min ?? 0) / SLIDER_MAX * 100
  const hi = (max ?? SLIDER_MAX) / SLIDER_MAX * 100
  return { left: `${lo}%`, width: `${hi - lo}%` }
}

const chargeRange = computed(() => rangePercent(props.chargeMin, props.chargeMax))
const drinkRange = computed(() => rangePercent(props.drinkMin, props.drinkMax))

const hasAnyFilter = computed(() =>
  props.modelValue.length > 0 ||
  props.chargeMin != null || props.chargeMax != null ||
  props.drinkMin != null || props.drinkMax != null ||
  props.floorFilter != null || props.openNowFilter
)

function clearAll() {
  emit('update:modelValue', [])
  emit('update:chargeMin', null)
  emit('update:chargeMax', null)
  emit('update:drinkMin', null)
  emit('update:drinkMax', null)
  emit('update:floorFilter', null)
  emit('update:openNowFilter', false)
}
</script>

<template>
  <div class="explorer-tree">
    <!-- Root node -->
    <div class="tree-root">
      <img src="/icons/desktop/directory_explorer.png" class="tree-icon" alt="" />
      <span class="tree-label">{{ t('filters') }}</span>
      <button v-if="hasAnyFilter" class="clear-all-btn" @click="clearAll">&#10005; Clear</button>
    </div>

    <!-- Status filter branch (Open Now) -->
    <div class="tree-branch">
      <div class="tree-connector">
        <span class="tree-vline"></span>
        <span class="tree-hline"></span>
      </div>
      <div class="tree-node">
        <img src="/icons/desktop/tune-up.ico" class="tree-icon" alt="" />
        <span class="tree-label">{{ t('status') }}</span>
      </div>
      <div class="tree-children">
        <div class="tree-branch">
          <div class="tree-connector child last">
            <span class="tree-vline"></span>
            <span class="tree-hline"></span>
          </div>
          <div class="floor-buttons">
            <button
              :class="['floor-btn', { active: !openNowFilter }]"
              @click="emit('update:openNowFilter', false)"
            >{{ t('all') }}</button>
            <button
              :class="['floor-btn', { active: openNowFilter }]"
              @click="emit('update:openNowFilter', true)"
            >{{ t('openNow') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Floor filter branch -->
    <div v-if="availableFloors.length > 1" class="tree-branch">
      <div class="tree-connector">
        <span class="tree-vline"></span>
        <span class="tree-hline"></span>
      </div>
      <div class="tree-node">
        <img src="/icons/desktop/address_book_home.png" class="tree-icon" alt="" />
        <span class="tree-label">{{ t('floor') }}</span>
      </div>
      <div class="tree-children">
        <div class="tree-branch">
          <div class="tree-connector child last">
            <span class="tree-vline"></span>
            <span class="tree-hline"></span>
          </div>
          <div class="floor-buttons">
            <button
              :class="['floor-btn', { active: floorFilter == null }]"
              @click="emit('update:floorFilter', null)"
            >{{ t('all') }}</button>
            <button
              v-for="f in availableFloors"
              :key="f"
              :class="['floor-btn', { active: floorFilter === f }]"
              @click="emit('update:floorFilter', f)"
            >{{ f >= 0 ? f + 'F' : 'B' + Math.abs(f) + 'F' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Price filters branch -->
    <div class="tree-branch">
      <div class="tree-connector">
        <span class="tree-vline"></span>
        <span class="tree-hline"></span>
      </div>
      <div class="tree-node">
        <button class="tree-toggle" @click="priceExpanded = !priceExpanded">
          <span class="tree-expand-icon">{{ priceExpanded ? '&#9660;' : '&#9654;' }}</span>
        </button>
        <img src="/icons/desktop/chart1.ico" class="tree-icon" alt="" />
        <span class="tree-label">{{ t('priceRange') }}</span>
      </div>
      <div v-if="priceExpanded" class="tree-children">
        <!-- Charge slider -->
        <div class="tree-branch">
          <div class="tree-connector child">
            <span class="tree-vline"></span>
            <span class="tree-hline"></span>
          </div>
          <div class="tree-leaf-slider">
            <div class="slider-header">
              <span class="slider-title">{{ t('cover') }}</span>
              <span class="slider-value">&yen;{{ formatYen(chargeMin, false) }} &ndash; &yen;{{ formatYen(chargeMax, true) }}</span>
            </div>
            <div class="dual-slider">
              <div class="slider-track">
                <div class="slider-track-fill" :style="{ left: chargeRange.left, width: chargeRange.width }"></div>
              </div>
              <input
                type="range"
                class="win-slider win-slider-min"
                :min="0"
                :max="SLIDER_MAX"
                :step="SLIDER_STEP"
                :value="chargeMin ?? 0"
                @input="onMinChange($event.target.value, 'update:chargeMin', chargeMax, 'update:chargeMax')"
              />
              <input
                type="range"
                class="win-slider win-slider-max"
                :min="0"
                :max="SLIDER_MAX"
                :step="SLIDER_STEP"
                :value="chargeMax ?? SLIDER_MAX"
                @input="onMaxChange($event.target.value, 'update:chargeMax', chargeMin, 'update:chargeMin')"
              />
            </div>
          </div>
        </div>
        <!-- Drink slider -->
        <div class="tree-branch">
          <div class="tree-connector child last">
            <span class="tree-vline"></span>
            <span class="tree-hline"></span>
          </div>
          <div class="tree-leaf-slider">
            <div class="slider-header">
              <span class="slider-title">{{ t('drinks') }}</span>
              <span class="slider-value">&yen;{{ formatYen(drinkMin, false) }} &ndash; &yen;{{ formatYen(drinkMax, true) }}</span>
            </div>
            <div class="dual-slider">
              <div class="slider-track">
                <div class="slider-track-fill" :style="{ left: drinkRange.left, width: drinkRange.width }"></div>
              </div>
              <input
                type="range"
                class="win-slider win-slider-min"
                :min="0"
                :max="SLIDER_MAX"
                :step="SLIDER_STEP"
                :value="drinkMin ?? 0"
                @input="onMinChange($event.target.value, 'update:drinkMin', drinkMax, 'update:drinkMax')"
              />
              <input
                type="range"
                class="win-slider win-slider-max"
                :min="0"
                :max="SLIDER_MAX"
                :step="SLIDER_STEP"
                :value="drinkMax ?? SLIDER_MAX"
                @input="onMaxChange($event.target.value, 'update:drinkMax', drinkMin, 'update:drinkMin')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tags branch -->
    <div class="tree-branch">
      <div class="tree-connector last">
        <span class="tree-hline"></span>
      </div>
      <div class="tree-node">
        <button class="tree-toggle" @click="tagsExpanded = !tagsExpanded">
          <span class="tree-expand-icon">{{ tagsExpanded ? '&#9660;' : '&#9654;' }}</span>
        </button>
        <img src="/icons/desktop/message_tack.png" class="tree-icon" alt="" />
        <span class="tree-label">{{ t('tags') }}</span>
        <span v-if="modelValue.length > 0" class="tree-count">({{ modelValue.length }})</span>
        <span v-if="modelValue.length > 1" class="tag-mode-toggle">
          <button
            :class="['tag-mode-btn', { active: tagMode === 'or' }]"
            @click.stop="emit('update:tagMode', 'or')"
            title="Match any selected tag"
          >Or</button><button
            :class="['tag-mode-btn', { active: tagMode === 'and' }]"
            @click.stop="emit('update:tagMode', 'and')"
            title="Match all selected tags"
          >And</button>
        </span>
      </div>
      <div v-if="tagsExpanded" class="tree-children">
        <div
          v-for="(tag, index) in tags"
          :key="tag.id"
          class="tree-branch"
        >
          <div class="tree-connector child" :class="{ last: index === tags.length - 1 }">
            <span class="tree-vline"></span>
            <span class="tree-hline"></span>
          </div>
          <label class="tree-tag-item" @click.prevent="toggle(tag.id, modelValue)">
            <span class="win-cb-box" :class="{ checked: modelValue.includes(tag.id) }">
              <span v-if="modelValue.includes(tag.id)" class="win-cb-mark">&#10003;</span>
            </span>
            <TagIcon :icon="tag.icon" :size="11" />
            <span class="tag-label" :style="{ color: tag.color }">{{ props.lang === 'jp' && tag.label_jp ? tag.label_jp : tag.label }}</span>
          </label>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.explorer-tree {
  padding: 4px 2px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  user-select: none;
}

/* Root node */
.tree-root {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 2px;
  font-weight: bold;
}

.clear-all-btn {
  margin-left: auto;
  height: 14px;
  padding: 0 5px;
  font-family: var(--win-font);
  font-size: 10px;
  font-weight: normal;
  color: var(--win-text);
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  white-space: nowrap;
}
.clear-all-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.tree-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  object-fit: contain;
  display: block;
}

.tree-label {
  white-space: nowrap;
}

/* Branch structure */
.tree-branch {
  position: relative;
  padding-left: 20px;
}

/* Tree connector lines */
.tree-connector {
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 13px;
  pointer-events: none;
}

.tree-connector .tree-vline {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--win-text-disabled);
}

.tree-connector.last .tree-vline {
  bottom: 50%;
}

.tree-connector .tree-hline {
  position: absolute;
  left: 0;
  top: 10px;
  width: 12px;
  height: 1px;
  background: var(--win-text-disabled);
}

.tree-connector.child .tree-hline {
  top: 9px;
}

/* Node (expandable) */
.tree-node {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 2px;
  min-height: 20px;
}

.tree-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tree-expand-icon {
  font-size: 7px;
  color: var(--win-text);
  line-height: 1;
}

.tree-count {
  color: var(--win-text-disabled);
  font-size: 10px;
}

.tag-mode-toggle {
  display: inline-flex;
  margin-left: 4px;
  border: 1px solid var(--win-border-dark);
}

.tag-mode-btn {
  font-family: var(--win-font);
  font-size: 9px;
  padding: 0 4px;
  line-height: 14px;
  background: var(--win-bg);
  border: none;
  color: var(--win-text-disabled);
  cursor: pointer;
}

.tag-mode-btn.active {
  background: var(--win-active-title, #0a246a);
  color: #fff;
}

/* Slider leaf nodes */
.tree-leaf-slider {
  padding: 2px 2px 6px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.slider-title {
  font-size: 10px;
  color: var(--win-text);
  font-weight: bold;
}

.slider-value {
  font-size: 9px;
  color: var(--win-text-disabled);
}

/* Dual range slider */
.dual-slider {
  position: relative;
  height: 20px;
  width: 100%;
}

.slider-track {
  position: absolute;
  top: 9px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--win-border-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-darkest),
    inset -1px -1px 0 var(--win-border-light);
}

.slider-track-fill {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--win-highlight, #000080);
}

/* Win2000-style range input */
.win-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  margin: 0;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
  outline: none;
}

/* Thumb — shared base */
.win-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: all;
  cursor: pointer;
  width: 11px;
  height: 18px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
  position: relative;
  z-index: 2;
}

.win-slider::-moz-range-thumb {
  pointer-events: all;
  cursor: pointer;
  width: 11px;
  height: 18px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
  border-radius: 0;
}

.win-slider::-webkit-slider-runnable-track {
  height: 20px;
  background: transparent;
}

.win-slider::-moz-range-track {
  height: 20px;
  background: transparent;
  border: none;
}

/* Make max slider thumb sit on top when overlapping */
.win-slider-max {
  z-index: 1;
}

/* Tag items */
.tree-tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 1px 2px;
  min-height: 18px;
}

.tree-tag-item:hover {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.tree-tag-item:hover .tag-label {
  color: var(--win-highlight-text) !important;
}

.win-cb-box {
  width: 13px;
  height: 13px;
  background: var(--win-bg-dark);
  flex-shrink: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-cb-mark {
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
  color: var(--win-text);
}

.tag-label {
  flex: 1;
  font-size: 11px;
}

.tree-children {
  /* no extra styling needed */
}

/* Floor filter buttons */
.floor-buttons {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  padding: 2px 0;
}

.floor-btn {
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  background: var(--win-bg);
  border: none;
  padding: 2px 6px;
  cursor: pointer;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.floor-btn:active,
.floor-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

</style>
