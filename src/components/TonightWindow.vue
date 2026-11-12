<script setup>
// "Who's open tonight" (F03): a scheduler-style chart of the night, 18:00 to
// 06:00 Tokyo time, one row per bar that opens. The body of the Tonight
// window; App.vue hosts it in a WinWindow (desktop) or a full-screen panel
// (mobile). Which bars, where their strips sit and where "now" is all come
// from utils/tonight.js.
import { ref, computed, toRef, watch, onMounted, onBeforeUnmount } from 'vue'
import WinCheckbox from './win2000/WinCheckbox.vue'
import { useI18n } from '../composables/useI18n.js'
import { useVisited } from '../composables/useVisited.js'
import { useOpenNow } from '../composables/useOpenNow.js'
import { barPasses } from '../utils/barFilters.js'
import { tokyoNow } from '../utils/openNow.js'
import { streetColor, streetName } from '../utils/streets.js'
import {
  NIGHT_LENGTH, SORTS, tonightDay, nowPosition, tonightRows, sortRows,
  formatAxisTime, formatHours, visibleRange,
} from '../utils/tonight.js'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
  // The map's current filters, in the shape barPasses() takes
  mapFilters: { type: Object, default: () => ({}) },
  // Whether any of them is set (the checkbox is disabled when none is)
  hasMapFilters: { type: Boolean, default: false },
})

const emit = defineEmits(['select-bar'])

const { t } = useI18n(computed(() => props.lang))
const { isVisited, isFavorited } = useVisited()
const { openBarIds, definitivelyOpenIds } = useOpenNow(toRef(props, 'bars'))

// ── Tokyo clock: moves the "now" line once a minute, on the minute ──────────
const now = ref(tokyoNow())
let clockTimer = null
function scheduleClock() {
  clockTimer = setTimeout(() => {
    now.value = tokyoNow()
    scheduleClock()
  }, 60000 - (Date.now() % 60000) + 50)
}
// A timer can be late after the tab was in the background
function onVisible() {
  if (document.visibilityState === 'visible') now.value = tokyoNow()
}
onMounted(() => {
  scheduleClock()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  clearTimeout(clockTimer)
  document.removeEventListener('visibilitychange', onVisible)
})

// ── Toolbar ─────────────────────────────────────────────────────────────────
const sort = ref('opens')
const street = ref('')
const useMapFilters = ref(false)
// Nights from tonight: 0 = tonight, 1 = tomorrow, 2-6 = the weekdays after
const dayOffset = ref(0)

const today = computed(() => tonightDay(now.value))
const nightDay = computed(() => (today.value + dayOffset.value) % 7)

function weekdayName(day, width = 'long') {
  // 1 January 2023 was a Sunday
  return new Intl.DateTimeFormat(props.lang === 'jp' ? 'ja-JP' : 'en-US', { weekday: width, timeZone: 'UTC' })
    .format(new Date(Date.UTC(2023, 0, 1 + day)))
}
const dayOptions = computed(() => Array.from({ length: 7 }, (_, offset) => {
  const day = (today.value + offset) % 7
  if (offset === 0) return { offset, label: t('tonightDayTonight', { day: weekdayName(day, 'short') }) }
  if (offset === 1) return { offset, label: t('tonightDayTomorrow', { day: weekdayName(day, 'short') }) }
  return { offset, label: weekdayName(day) }
}))

const streets = computed(() =>
  [...new Set(props.bars.filter(b => b.is_active !== false).map(b => b.street).filter(Boolean))].sort())

// ── Rows ────────────────────────────────────────────────────────────────────
function displayName(bar) {
  return (props.lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)) || ''
}

const filteredBars = computed(() => {
  const filters = useMapFilters.value && props.hasMapFilters ? props.mapFilters : null
  const ctx = { openBarIds: openBarIds.value, isVisited, isFavorited }
  return props.bars.filter(bar =>
    (!street.value || bar.street === street.value) &&
    (!filters || barPasses(bar, filters, ctx)))
})

const groups = computed(() => tonightRows(filteredBars.value, nightDay.value))
const rows = computed(() => sortRows(groups.value.rows, sort.value, displayName))
const unknownBars = computed(() =>
  [...groups.value.unknown].sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base', numeric: true })))

// Minutes after 18:00, or null when the night shown is not on right now
const nowPos = computed(() => nowPosition(now.value, nightDay.value))
const nowFraction = computed(() => (nowPos.value == null ? null : nowPos.value / NIGHT_LENGTH))
const nowClock = computed(() => {
  const m = now.value.minutes
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})
// The green dot: open right now (only when looking at tonight), by the same
// rule as "Open Now" everywhere else, so it is also right outside 18:00-06:00
function isOpenNow(bar) {
  return dayOffset.value === 0 && definitivelyOpenIds.value.has(String(bar.id))
}
const openNowCount = computed(() => rows.value.filter(row => isOpenNow(row.bar)).length)

function hoursText(row) {
  return formatHours(row.segments) ?? t('tonight24h')
}
function stripText(seg) {
  return formatHours([seg]) ?? t('tonight24h')
}
function rowTitle(row) {
  const parts = [displayName(row.bar), hoursText(row)]
  if (row.bar.street) parts.push(streetName(row.bar.street))
  return parts.join(' · ')
}
function stripStyle(bar, seg) {
  return {
    left: `${(seg.start / NIGHT_LENGTH) * 100}%`,
    width: `${((seg.end - seg.start) / NIGHT_LENGTH) * 100}%`,
    background: streetColor(bar.street),
  }
}

// Axis: a tick every hour, 18:00 ... 06:00
const HOURS = NIGHT_LENGTH / 60
const ticks = Array.from({ length: HOURS + 1 }, (_, i) => ({
  i,
  left: `${(i / HOURS) * 100}%`,
  label: String((18 + i) % 24).padStart(2, '0'),
  midnight: (18 + i) % 24 === 0,
}))
const MIDNIGHT_FRACTION = (24 - 18) / HOURS

// ── Windowing: with more than 150 rows only the ones in view are rendered ───
const VIRTUAL_FROM = 150
const mobileQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)') : null
const mobile = ref(!!mobileQuery?.matches)
function onMobileChange(e) { mobile.value = e.matches }
// Row heights are fixed (CSS reads --row-h) so the list can be windowed
const rowHeight = computed(() => (mobile.value ? 48 : 22))

const scrollEl = ref(null)
const scrollTop = ref(0)
const viewportHeight = ref(400)
let resizeObserver = null
function onScroll() { scrollTop.value = scrollEl.value ? scrollEl.value.scrollTop : 0 }
onMounted(() => {
  mobileQuery?.addEventListener('change', onMobileChange)
  if (scrollEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      const el = scrollEl.value
      if (!el || !el.clientHeight) return // hidden: minimised
      viewportHeight.value = el.clientHeight
      // A hidden box forgets how far it was scrolled: put it back
      if (el.scrollTop !== scrollTop.value) el.scrollTop = scrollTop.value
    })
    resizeObserver.observe(scrollEl.value)
  }
})
onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', onMobileChange)
  resizeObserver?.disconnect()
})

const range = computed(() => {
  const count = rows.value.length
  if (count <= VIRTUAL_FROM) return { start: 0, end: count, padTop: 0, padBottom: 0 }
  return visibleRange({ scrollTop: scrollTop.value, viewportHeight: viewportHeight.value, rowHeight: rowHeight.value, count })
})
const shownRows = computed(() => rows.value.slice(range.value.start, range.value.end))

// A different list: back to the top
watch([sort, street, dayOffset, useMapFilters], () => {
  if (scrollEl.value) scrollEl.value.scrollTop = 0
  scrollTop.value = 0
})

// ── "Hours unknown" group, collapsed until asked for ────────────────────────
const unknownOpen = ref(false)
</script>

<template>
  <div class="tonight" :style="{ '--row-h': rowHeight + 'px' }">
    <div class="tonight-toolbar">
      <label class="tonight-field">
        <span class="tonight-field-label">{{ t('tonightDay') }}</span>
        <select v-model.number="dayOffset" class="tonight-select" data-control="day">
          <option v-for="opt in dayOptions" :key="opt.offset" :value="opt.offset">{{ opt.label }}</option>
        </select>
      </label>
      <label class="tonight-field">
        <span class="tonight-field-label">{{ t('tonightSort') }}</span>
        <select v-model="sort" class="tonight-select" data-control="sort">
          <option v-for="s in SORTS" :key="s" :value="s">{{ t('tonightSort_' + s) }}</option>
        </select>
      </label>
      <label class="tonight-field">
        <span class="tonight-field-label">{{ t('tonightStreet') }}</span>
        <select v-model="street" class="tonight-select" data-control="street">
          <option value="">{{ t('stickerAllStreets') }}</option>
          <option v-for="s in streets" :key="s" :value="s">{{ streetName(s) }}</option>
        </select>
      </label>
      <WinCheckbox
        :model-value="useMapFilters && hasMapFilters"
        :class="['tonight-mapfilters', { 'is-disabled': !hasMapFilters }]"
        :title="hasMapFilters ? '' : t('rouletteNoMapFilters')"
        @update:model-value="useMapFilters = hasMapFilters && $event"
      >
        {{ t('tonightMapFilters') }}
      </WinCheckbox>
    </div>

    <div ref="scrollEl" class="tonight-chart" @scroll.passive="onScroll">
      <!-- Time axis: stays at the top of the scrolling chart -->
      <div class="tonight-axis" aria-hidden="true">
        <div class="axis-corner">{{ t('tonightBarColumn') }}</div>
        <div class="axis-track">
          <span
            v-for="tick in ticks"
            :key="tick.i"
            :class="['axis-tick', { midnight: tick.midnight, minor: tick.i % 2 === 1, last: tick.i === ticks.length - 1 }]"
            :style="{ left: tick.left }"
          >{{ tick.label }}</span>
          <span v-if="nowFraction != null" class="axis-now" :style="{ left: `clamp(16px, ${nowFraction * 100}%, calc(100% - 16px))` }">{{ nowClock }}</span>
        </div>
      </div>

      <div
        v-if="rows.length"
        class="tonight-rows"
        :style="{ paddingTop: range.padTop + 'px', paddingBottom: range.padBottom + 'px' }"
      >
        <!-- Lines over every row: midnight, and "now" -->
        <div class="tonight-lines" aria-hidden="true">
          <span class="line-midnight" :style="{ left: (MIDNIGHT_FRACTION * 100) + '%' }"></span>
          <span v-if="nowFraction != null" class="line-now" data-now-line :style="{ left: (nowFraction * 100) + '%' }"></span>
        </div>

        <button
          v-for="row in shownRows"
          :key="row.bar.id"
          type="button"
          class="tonight-row"
          :data-bar-id="row.bar.id"
          :title="rowTitle(row)"
          @click="emit('select-bar', row.bar)"
        >
          <span class="row-name">
            <span :class="['row-dot', { on: isOpenNow(row.bar) }]"></span>
            <span class="row-name-text">{{ displayName(row.bar) }}</span>
          </span>
          <span class="row-hours">{{ hoursText(row) }}</span>
          <span class="row-track">
            <span
              v-for="(seg, i) in row.segments"
              :key="i"
              :class="['row-strip', { 'clipped-start': seg.clippedStart, 'clipped-end': seg.clippedEnd }]"
              :style="stripStyle(row.bar, seg)"
            ><span class="strip-text">{{ stripText(seg) }}</span></span>
          </span>
        </button>
      </div>
      <div v-else class="tonight-empty">{{ t('tonightEmpty') }}</div>

      <!-- Bars whose hours nobody has told us yet -->
      <div v-if="unknownBars.length" class="tonight-unknown">
        <button
          type="button"
          class="unknown-header"
          :aria-expanded="unknownOpen"
          @click="unknownOpen = !unknownOpen"
        >
          <span class="unknown-arrow">{{ unknownOpen ? '▼' : '►' }}</span>
          {{ t('tonightUnknown', { n: unknownBars.length }) }}
        </button>
        <div v-if="unknownOpen" class="unknown-list">
          <button
            v-for="bar in unknownBars"
            :key="bar.id"
            type="button"
            class="unknown-item"
            :data-bar-id="bar.id"
            @click="emit('select-bar', bar)"
          >
            <span class="unknown-swatch" :style="{ background: streetColor(bar.street) }"></span>
            <span class="unknown-name">{{ displayName(bar) }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="tonight-status" aria-live="polite">
      <span class="status-field status-grow">{{ t('tonightCount', { n: rows.length, closed: groups.closed.length }) }}</span>
      <span v-if="dayOffset === 0" class="status-field">{{ t('tonightOpenNow', { n: openNowCount }) }}</span>
      <span class="status-field">{{ t('tonightClock', { time: nowClock }) }}</span>
    </div>
  </div>
</template>

<style scoped>
.tonight {
  --name-w: 132px;
  --line-now: #ff3030;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  min-height: 0;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

/* In a desktop WinWindow the body is auto-height, so `height: 100%` above
   would be "as tall as every row". Give the window body a definite height so
   the chart is the scroller (as ChatWindow does). */
:global(.win-window-body-inner:has(> .tonight)) {
  height: 100%;
  box-sizing: border-box;
}

/* ── Toolbar ── */
.tonight-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  flex-shrink: 0;
  padding: 2px;
}

.tonight-field {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.tonight-field-label {
  white-space: nowrap;
}

.tonight-select {
  min-width: 0;
  max-width: 130px;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  border-radius: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
  outline: none;
}

.tonight-select:focus-visible {
  outline: 1px dotted var(--win-text);
  outline-offset: -4px;
}

.tonight-mapfilters.is-disabled {
  color: var(--win-text-disabled);
  cursor: var(--cursor-default);
}

/* ── Chart: a sunken field that scrolls ── */
.tonight-chart {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--win-bg-dark);
  border: 2px solid transparent;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
}

/* Time axis: raised like a column header */
.tonight-axis {
  position: sticky;
  top: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: var(--name-w) minmax(0, 1fr);
  height: 20px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-darkest);
}

.axis-corner {
  padding: 0 6px;
  line-height: 20px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: inset -1px 0 0 var(--win-border-darkest);
}

.axis-track {
  position: relative;
  min-width: 0;
}

.axis-tick {
  position: absolute;
  top: 0;
  height: 20px;
  padding-left: 3px;
  line-height: 20px;
  font-size: 10px;
  white-space: nowrap;
  border-left: 1px solid var(--win-border-light);
}

.axis-tick.midnight {
  color: var(--valhalla-orange);
  border-left-color: var(--valhalla-orange);
}

/* 06:00 sits on the right edge: only its line would fit */
.axis-tick.last {
  display: none;
}

.axis-now {
  position: absolute;
  top: 3px;
  z-index: 1;
  transform: translateX(-50%);
  padding: 0 3px;
  height: 14px;
  line-height: 14px;
  font-size: 10px;
  color: #ffffff;
  background: var(--line-now);
  white-space: nowrap;
}

/* ── Rows ── */
.tonight-rows {
  position: relative;
}

.tonight-lines {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--name-w);
  right: 0;
  z-index: 2;
  pointer-events: none;
}

.line-midnight,
.line-now {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
}

.line-midnight {
  border-left: 1px dotted var(--valhalla-orange);
  opacity: 0.7;
}

.line-now {
  margin-left: -1px;
  border-left: 2px solid var(--line-now);
}

.tonight-row {
  display: grid;
  grid-template-columns: var(--name-w) minmax(0, 1fr);
  align-items: center;
  width: 100%;
  height: var(--row-h);
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid var(--win-border-dark);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: var(--cursor-pointer);
}

.tonight-row,
.unknown-header,
.unknown-item {
  -webkit-tap-highlight-color: transparent;
}

.tonight-row:hover,
.tonight-row:focus-visible {
  background: var(--win-bg-light);
  outline: none;
}

.tonight-row:focus-visible .row-name {
  outline: 1px dotted var(--win-text);
  outline-offset: -2px;
}

.row-name {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: 100%;
  padding: 0 6px;
  box-shadow: inset -1px 0 0 var(--win-border-dark);
}

.row-name-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Lit when the bar is open right now */
.row-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  background: var(--win-border-light);
}

.row-dot.on {
  background: #4caf50;
}

/* Hours as text: on the strip on desktop, beside the name on phones */
.row-hours {
  display: none;
}

.row-track {
  position: relative;
  min-width: 0;
  height: 100%;
  /* a faint line every hour */
  background-image: linear-gradient(to right, var(--win-border-dark) 1px, transparent 1px);
  background-size: calc(100% / 12) 100%;
}

/* A sunken strip in the street's colour */
.row-strip {
  position: absolute;
  top: 3px;
  bottom: 3px;
  min-width: 3px;
  overflow: hidden;
  box-shadow:
    inset 1px 1px 0 var(--win-border-darkest),
    inset -1px -1px 0 rgba(255, 255, 255, 0.35),
    inset 2px 2px 0 rgba(0, 0, 0, 0.35);
}

/* Already open at 18:00 / still open at 06:00: the strip runs off the chart */
.row-strip.clipped-start {
  box-shadow:
    inset 0 1px 0 var(--win-border-darkest),
    inset -1px -1px 0 rgba(255, 255, 255, 0.35),
    inset 0 2px 0 rgba(0, 0, 0, 0.35);
}

.row-strip.clipped-end {
  box-shadow:
    inset 1px 1px 0 var(--win-border-darkest),
    inset 0 -1px 0 rgba(255, 255, 255, 0.35),
    inset 2px 2px 0 rgba(0, 0, 0, 0.35);
}

.row-strip.clipped-start.clipped-end {
  box-shadow:
    inset 0 1px 0 var(--win-border-darkest),
    inset 0 -1px 0 rgba(255, 255, 255, 0.35),
    inset 0 2px 0 rgba(0, 0, 0, 0.35);
}

.strip-text {
  display: block;
  padding: 0 5px;
  font-size: 10px;
  line-height: calc(var(--row-h) - 7px);
  color: #ffe4a0;
  white-space: nowrap;
}

.tonight-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--win-text-disabled);
}

/* ── Hours unknown ── */
.unknown-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 22px;
  margin: 0;
  padding: 2px 6px;
  border: none;
  background: var(--win-bg);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: var(--cursor-pointer);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-darkest);
}

.unknown-header:focus-visible {
  outline: 1px dotted var(--win-text);
  outline-offset: -3px;
}

.unknown-arrow {
  font-size: 8px;
  width: 8px;
}

.unknown-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.unknown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 20px;
  margin: 0;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: var(--cursor-pointer);
}

.unknown-item:hover,
.unknown-item:focus-visible {
  background: var(--win-bg-light);
  outline: none;
}

.unknown-swatch {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  box-shadow: inset 1px 1px 0 var(--win-border-darkest), inset -1px -1px 0 rgba(255, 255, 255, 0.35);
}

.unknown-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── Status bar ── */
.tonight-status {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.status-field {
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.status-grow {
  flex: 1;
  min-width: 0;
}

/* ── Phones: a list, each bar with its own mini strip under the name ── */
@media (max-width: 768px) {
  .tonight {
    --name-w: 0px;
    flex: 1;
    gap: 6px;
    padding: 8px;
    font-size: 13px;
    background: var(--win-bg);
  }

  .tonight-toolbar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 8px;
    padding: 0;
  }

  .tonight-field {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
  }

  .tonight-field-label {
    font-size: 11px;
  }

  .tonight-select {
    max-width: none;
    width: 100%;
    min-height: 40px;
    font-size: 13px;
  }

  .tonight-mapfilters {
    min-height: 40px;
    font-size: 13px;
    align-self: end;
  }

  .tonight-axis {
    grid-template-columns: minmax(0, 1fr);
    height: 24px;
  }

  .axis-corner {
    display: none;
  }

  .axis-tick {
    height: 24px;
    line-height: 24px;
  }

  .axis-now {
    top: 5px;
  }

  .axis-tick {
    font-size: 11px;
  }

  .axis-tick.minor {
    color: transparent;
  }

  .tonight-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 1fr 18px;
    align-items: stretch;
  }

  .row-name {
    padding: 0 6px;
    box-shadow: none;
    font-size: 14px;
  }

  .row-dot {
    width: 8px;
    height: 8px;
  }

  .row-hours {
    display: flex;
    align-items: center;
    padding: 0 6px;
    font-size: 12px;
    white-space: nowrap;
  }

  .row-track {
    grid-column: 1 / -1;
    height: 18px;
  }

  .row-strip {
    top: 2px;
    bottom: 5px;
  }

  .strip-text {
    display: none;
  }

  .unknown-header {
    min-height: 44px;
    font-size: 13px;
  }

  .unknown-list {
    grid-template-columns: 1fr 1fr;
  }

  .unknown-item {
    height: 40px;
    font-size: 13px;
  }

  .tonight-status {
    font-size: 12px;
  }
}
</style>
