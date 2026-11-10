<script setup>
import { ref, reactive, shallowReactive, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import panzoom from 'panzoom'
import WinButton from './win2000/WinButton.vue'
import MapPartitions from './map/MapPartitions.vue'
import MapLabels from './map/MapLabels.vue'
import MapBadges from './map/MapBadges.vue'
import MapAnnotations from './map/MapAnnotations.vue'
import MapTooltip from './map/MapTooltip.vue'
import { useVisited } from '../composables/useVisited.js'
import { barPasses, hasActiveFilters as hasAnyFilter } from '../utils/barFilters.js'
import {
  BUILDING_STATE_CLASSES,
  passingBarIdSet,
  computePartitionGeometry,
  computePartitionSlotState,
  computeBuildingStyles,
  diffBuildingStyles,
} from '../utils/mapGeometry.js'
import { devCount, devTrackRenders } from '../utils/devPerf.js'
import { useI18n } from '../composables/useI18n.js'
import mapSvgUrl from '../assets/map.svg?url'
import buildings from '../data/buildings.json'
import {
  fetchAnnotations,
  createAnnotation as apiCreateAnnotation,
  updateAnnotation as apiUpdateAnnotation,
  deleteAnnotation as apiDeleteAnnotation,
  uploadAnnotationIcon,
} from '../api/index.js'
import { OpenLocationCode } from 'open-location-code'

const _olc = new OpenLocationCode()

const props = defineProps({
  bars: Array,
  tagMap: Object,
  floorFilter: { type: Number, default: null },
  activeTags: Array,
  chargeMin: { type: Number, default: null },
  chargeMax: { type: Number, default: null },
  drinkMin: { type: Number, default: null },
  drinkMax: { type: Number, default: null },
  adminMode: Boolean,
  placingBar: Object,
  lang: { type: String, default: 'en' },
  partitions: { type: Object, default: () => ({}) },
  searchHighlighted: { type: Set, default: () => new Set() },
  searchHighlightedBars: { type: Set, default: () => new Set() },
  openNowFilter: { type: Boolean, default: false },
  openBarIds: { type: Set, default: () => new Set() },
  favoritesFilter: { type: Boolean, default: false },
  visitedFilter: { type: Boolean, default: false },
  tourHighlight: { type: String, default: null },
  labelMode: { type: String, default: 'yoko' },
  tagMode: { type: String, default: 'or' }, // 'or' | 'and'
  hoveredBarId: { type: String, default: null },
})

const emit = defineEmits(['selectBuilding', 'placeBar', 'selectBuildingForEdit', 'selectPartitionBar', 'hoverBuilding', 'deselect'])

const { t } = useI18n(computed(() => props.lang))

devTrackRenders('GoldenGaiMap')

const containerRef = ref(null)
const svgRef = ref(null)
const mapContent = ref('')
let panzoomInstance = null

const { isFavorited, isVisited } = useVisited()

// Zoom tracking — used to show/hide building labels
const currentZoom = ref(0)
const baseFitScale = ref(0)
const showLabels = computed(() => baseFitScale.value > 0 && currentZoom.value >= baseFitScale.value * 2.0)

// User rotation applied via container transform (pinch-to-rotate on mobile)
const userRotation = ref(0)
const mapRotateStyle = computed(() =>
  userRotation.value !== 0 ? { transform: `rotate(${userRotation.value}deg)` } : {}
)

const isMobile = ref(window.innerWidth <= 768)
function onResize() {
  isMobile.value = window.innerWidth <= 768
  fitToContainer()
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const MAP_W = 3614.12
const MAP_H = 4096

// Rotation to straighten the map (~21 degrees CCW)
const MAP_ROTATION = -21
const MAP_CX = MAP_W / 2
const MAP_CY = MAP_H / 2
const RAD = MAP_ROTATION * Math.PI / 180
const COS_R = Math.cos(RAD)
const SIN_R = Math.sin(RAD)

// Compute expanded viewBox to fit rotated content
function rotatePoint(x, y) {
  const dx = x - MAP_CX
  const dy = y - MAP_CY
  return {
    x: dx * COS_R - dy * SIN_R + MAP_CX,
    y: dx * SIN_R + dy * COS_R + MAP_CY,
  }
}

const corners = [
  rotatePoint(0, 0),
  rotatePoint(MAP_W, 0),
  rotatePoint(MAP_W, MAP_H),
  rotatePoint(0, MAP_H),
]
const VB_MIN_X = Math.min(...corners.map(c => c.x))
const VB_MIN_Y = Math.min(...corners.map(c => c.y))
const VB_MAX_X = Math.max(...corners.map(c => c.x))
const VB_MAX_Y = Math.max(...corners.map(c => c.y))
const VB_W = VB_MAX_X - VB_MIN_X
const VB_H = VB_MAX_Y - VB_MIN_Y

// Build a lookup of building centroids
const buildingMap = {}
for (const b of buildings) {
  buildingMap[b.id] = b
}

// Group bars by building_id
const barsByBuilding = computed(() => {
  const groups = {}
  for (const bar of props.bars) {
    if (!bar.building_id) continue
    if (!groups[bar.building_id]) groups[bar.building_id] = []
    groups[bar.building_id].push(bar)
  }
  return groups
})

// Set of building IDs that have bars (for coloring)
const buildingsWithBars = computed(() => {
  return new Set(Object.keys(barsByBuilding.value))
})

// Shared filter state built from props (see src/utils/barFilters.js)
const mapFilters = computed(() => ({
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

// Whether any filter is active (includes floor filter)
const hasActiveFilters = computed(() => hasAnyFilter(mapFilters.value))

// Whether floor filter is active (separate from tag/price filters)
const hasFloorFilter = computed(() => props.floorFilter != null)

// The one place the filter function runs: IDs (as strings) of the bars that
// pass the active filters, or null when no filter is active. Badges, dimming,
// labels and the tooltip all read this set.
const passingBarIds = computed(() =>
  passingBarIdSet(props.bars, hasActiveFilters.value, (bar) =>
    barPasses(bar, mapFilters.value, { openBarIds: props.openBarIds, isFavorited, isVisited })
  )
)
const barPassesFilters = (bar) => passingBarIds.value === null || passingBarIds.value.has(String(bar.id))

// For each building, find the most common street among its bars
const buildingDominantStreet = computed(() => {
  const result = {}
  for (const [bldgId, barsInBldg] of Object.entries(barsByBuilding.value)) {
    const counts = {}
    for (const bar of barsInBldg) {
      if (bar.street) counts[bar.street] = (counts[bar.street] || 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    result[bldgId] = top?.[0] ?? null
  }
  return result
})

// Bar count badges: always shown when zoomed out
// With active filters: shows matching count (dimmed if 0); without filters: shows total
// For independent-building partitions: one badge per partition slot
const buildingBarCountBadges = computed(() => {
  if (showLabels.value) return {}
  const result = {}
  for (const [bldgId, barsInBldg] of Object.entries(barsByBuilding.value)) {
    const bldg = buildingMap[bldgId]
    if (!bldg) continue

    // Check if this building uses independent-building mode
    if (props.partitions[bldgId]?.isIndependentBuilding) {
      const pdata = partitionGeometry.value[bldgId]
      if (!pdata) continue
      const partData = props.partitions[bldgId] || {}
      const bldgOffsetX = partData.labelOffsetX ?? 0
      const bldgOffsetY = partData.labelOffsetY ?? 0
      for (const rect of pdata.rects) {
        if (!rect.barIds || rect.barIds.length === 0) continue
        const bars = rect.barIds.map(id => barById.value[id]).filter(Boolean)
        const filtered = bars.filter(barPassesFilters).length
        const key = `${bldgId}__${rect.partIndex}`
        const partObj = (partData.partitions || [])[rect.partIndex] || {}
        const offsetX = partObj.labelOffsetX ?? bldgOffsetX
        const offsetY = partObj.labelOffsetY ?? bldgOffsetY
        result[key] = {
          cx: rect.visibleCenter.x + offsetX,
          cy: rect.visibleCenter.y + offsetY,
          count: filtered,
          dimmed: hasActiveFilters.value && filtered === 0,
          active: hasActiveFilters.value,
        }
      }
      continue
    }

    const filtered = barsInBldg.filter(barPassesFilters).length
    result[bldgId] = { cx: bldg.cx, cy: bldg.cy, count: filtered, dimmed: hasActiveFilters.value && filtered === 0, active: hasActiveFilters.value }
  }
  return result
})

// Lookup bar by ID
const barById = computed(() => {
  const map = {}
  for (const bar of props.bars) {
    map[String(bar.id)] = bar
  }
  return map
})

// Lookup bar floor by ID
const barFloorMap = computed(() => {
  const map = {}
  for (const bar of props.bars) {
    map[String(bar.id)] = bar.floor ?? 1
  }
  return map
})

const unplacedBars = computed(() => {
  return props.bars.filter(b => !b.building_id)
})

// Convert ASCII digits/letters to full-width Unicode equivalents.
// Full-width chars all have the same advance width as CJK glyphs, preventing
// mixed-width squishing when combining e.g. "1" (halfwidth) with "階" (fullwidth).
function toFullWidth(str) {
  return str.replace(/[\x21-\x7E]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0))
}

// Build display text for a bar label (name + floor + icons)
// 縦書き (tate) mode — JP: full-width chars; EN: plain ASCII stacked vertically
function barLabelTextTate(bar) {
  const isJp = props.lang === 'jp'
  const name = isJp ? (bar.name_jp || bar.name_en || '') : (bar.name_en || bar.name_jp || '')
  const f = bar.floor ?? 1
  const floorLabel = isJp
    ? (f < 0 ? `Ｂ${Math.abs(f)}階` : `${toFullWidth(String(f))}階`)
    : (f < 0 ? `B${Math.abs(f)}F` : `${f}F`)
  const fav = isFavorited(bar.id) ? '♥' : ''
  const vis = isVisited(bar.id) ? '✓' : ''
  const prefix = [fav, vis].filter(Boolean).join('')
  return prefix ? `${prefix}${name}${floorLabel}` : `${name}${floorLabel}`
}

function barLabelText(bar) {
  const name = props.lang === 'jp'
    ? (bar.name_jp || bar.name_en)
    : (bar.name_en || bar.name_jp)
  const f = bar.floor ?? 1
  let floorLabel
  if (props.lang === 'jp') {
    // Use full-width chars so digits and 階 have identical advance widths
    floorLabel = f < 0
      ? `${toFullWidth(`B${Math.abs(f)}`)}階`
      : `${toFullWidth(String(f))}階`
  } else {
    floorLabel = f < 0 ? `B${Math.abs(f)}F` : `${f}F`
  }
  const fav = isFavorited(bar.id) ? '♥' : ''
  const vis = isVisited(bar.id) ? '✓' : ''
  const prefix = [fav, vis].filter(Boolean).join('')
  return prefix ? `${prefix} ${name} ${floorLabel}` : `${name} ${floorLabel}`
}

// Compute label layout for every building (only when zoomed in enough).
//
// Key insight: the map SVG is inside a rotate(MAP_ROTATION) group. If we place
// text at (same-x, different-y) SVG coords, the -21° rotation causes each label
// to appear at a different screen-x (staggered diagonally). Fix: each building
// gets a <g> positioned at its center and counter-rotated by -MAP_ROTATION so
// that dy offsets are in screen-aligned space → labels stack straight on screen.
const buildingLabelData = computed(() => {
  if (!showLabels.value) return {}
  const result = {}
  const PAD = 12
  const LINE_RATIO = 1.3
  const charRatio = props.lang === 'jp' ? 1.0 : 0.55

  // Helper: compute label items for an array of bars within a given usable area
  function makeLabelItems(sortedBars, orientation, isTate, usableW, usableH, fontSizeOverride) {
    const n = sortedBars.length
    const texts = isTate
      ? sortedBars.map(bar => barLabelTextTate(bar))
      : sortedBars.map(bar => barLabelText(bar))
    const maxLen = Math.max(...texts.map(t => t.length))
    let fontSize
    if (orientation === 'vertical') {
      const fByWidth = usableW / Math.max(1, maxLen * charRatio)
      const fByHeight = usableH / Math.max(1, n * LINE_RATIO)
      fontSize = fontSizeOverride ?? Math.max(6, Math.min(fByWidth, fByHeight, 45))
    } else if (orientation === 'tate') {
      const fByColWidth = (usableW / n) * 0.9
      const fByHeight = usableH / Math.max(1, maxLen)
      fontSize = fontSizeOverride ?? Math.max(6, Math.min(fByColWidth, fByHeight, 45))
    } else {
      const slotW = usableW / n
      const fBySlotW = slotW * 0.8
      const fByHeight = usableH / Math.max(1, maxLen * charRatio)
      fontSize = fontSizeOverride ?? Math.max(6, Math.min(fBySlotW, fByHeight, 45))
    }
    const lineSpacing = fontSize * LINE_RATIO
    return sortedBars.map((bar, i) => {
      const text = texts[i]
      let dx, dy
      if (orientation === 'vertical') {
        dx = 0
        dy = (i - (n - 1) / 2) * lineSpacing
      } else if (orientation === 'tate') {
        const colSpacing = fontSize * 1.2
        dx = (i - (n - 1) / 2) * colSpacing
        dy = 0
      } else {
        const slotW = usableW / n
        dx = (i - (n - 1) / 2) * slotW
        dy = 0
      }
      const passes = barPassesFilters(bar)
      const isSearchHL = props.searchHighlightedBars.size > 0 && props.searchHighlightedBars.has(String(bar.id))
      const faved = isFavorited(bar.id)
      const visited = isVisited(bar.id)
      let fill, opacity
      if (isSearchHL) {
        fill = '#ffd700'; opacity = 1
      } else if (!passes) {
        fill = '#aaaaaa'; opacity = 0.2
      } else if (faved) {
        fill = '#e87898'; opacity = 1
      } else if (visited) {
        fill = '#70d0a0'; opacity = 1
      } else if (hasActiveFilters.value) {
        fill = '#ffcc44'; opacity = 1
      } else {
        fill = '#ffffff'; opacity = 0.9
      }
      return { barId: String(bar.id), text, dx, dy, fontSize, fill, opacity, writingMode: isTate ? 'vertical-rl' : undefined }
    })
  }

  for (const [bldgId, barsInBldg] of Object.entries(barsByBuilding.value)) {
    const bldg = buildingMap[bldgId]
    if (!bldg || barsInBldg.length === 0) continue

    const partData = props.partitions[bldgId] || {}
    const orientOverride = partData.labelOrientation ?? 'auto'
    const fontSizeOverride = partData.labelFontSize ? Number(partData.labelFontSize) : null
    const offsetX = partData.labelOffsetX ?? 0
    const offsetY = partData.labelOffsetY ?? 0
    const adminRotation = partData.labelTextRotation ?? 0

    // Independent building mode: one label group per partition, positioned at its center
    if (partData.isIndependentBuilding) {
      const pdata = partitionGeometry.value[bldgId]
      if (!pdata) continue
      for (const rect of pdata.rects) {
        const partBarIds = rect.barIds || []
        const partBars = partBarIds.map(id => barById.value[id]).filter(Boolean)
        if (partBars.length === 0) continue
        const sortedBars = [...partBars].sort((a, b) => {
          const fd = (b.floor ?? 1) - (a.floor ?? 1)
          return fd !== 0 ? fd : (a.name_en || '').localeCompare(b.name_en || '')
        })
        // Estimate usable partition dimensions
        const estW = pdata.dir === 'vertical'
          ? (bldg.width / pdata.count) - PAD * 2
          : bldg.width - PAD * 2
        const estH = pdata.dir === 'horizontal'
          ? (bldg.height / pdata.count) - PAD * 2
          : bldg.height - PAD * 2
        const usableW = Math.max(20, estW)
        const usableH = Math.max(20, estH)
        const autoOrient = usableW >= usableH ? 'horizontal' : 'vertical'
        const partObj = (partData.partitions || [])[rect.partIndex] || {}
        const partOrientOverride = partObj.labelOrientation ?? orientOverride
        const partFontSizeOverride = partObj.labelFontSize != null
          ? (Number(partObj.labelFontSize) || null)
          : fontSizeOverride
        const partOffsetX = partObj.labelOffsetX ?? offsetX
        const partOffsetY = partObj.labelOffsetY ?? offsetY
        const partAdminRotation = partObj.labelTextRotation ?? adminRotation
        const isTate = partOrientOverride === 'tate'
        const orientation = isTate ? 'tate' : (partOrientOverride === 'auto' ? autoOrient : partOrientOverride)
        const baseRotation = (orientation === 'horizontal' || orientation === 'tate') ? (-MAP_ROTATION + 90) : -MAP_ROTATION
        const groupRotation = baseRotation + partAdminRotation
        const cx = rect.visibleCenter.x + partOffsetX
        const cy = rect.visibleCenter.y + partOffsetY
        const items = makeLabelItems(sortedBars, orientation, isTate, usableW, usableH, partFontSizeOverride)
        result[`${bldgId}__${rect.partIndex}`] = { cx, cy, groupRotation, items }
      }
      continue
    }

    const sortedBars = [...barsInBldg].sort((a, b) => {
      const fd = (b.floor ?? 1) - (a.floor ?? 1)
      return fd !== 0 ? fd : (a.name_en || '').localeCompare(b.name_en || '')
    })
    const usableW = bldg.width - PAD * 2
    const usableH = bldg.height - PAD * 2

    const autoOrient = bldg.width >= bldg.height ? 'horizontal' : 'vertical'
    const isTate = orientOverride === 'tate'
    const orientation = isTate ? 'tate' : (orientOverride === 'auto' ? autoOrient : orientOverride)

    // Group anchor = building visual center in SVG space (+ admin offset)
    const cx = bldg.minX + bldg.width / 2 + offsetX
    const cy = bldg.minY + bldg.height / 2 + offsetY

    // Counter-rotate the map's own rotation so labels are screen-aligned.
    // +90° extra for side-by-side (horizontal and tate modes).
    const baseRotation = (orientation === 'horizontal' || orientation === 'tate') ? (-MAP_ROTATION + 90) : -MAP_ROTATION
    const groupRotation = baseRotation + adminRotation

    const items = makeLabelItems(sortedBars, orientation, isTate, usableW, usableH, fontSizeOverride)
    result[bldgId] = { cx, cy, groupRotation, items }
  }
  return result
})

// Hovered / selected building. Kept in one reactive object that is handed to
// MapPartitions as-is, so a hover re-renders only the partition layer and not
// this component.
const interaction = reactive({ hovered: null, selected: null })

// The one place a building path is looked up or gets its hover/selection class.
function buildingEl(id) {
  if (!id || !svgRef.value) return null
  return svgRef.value.querySelector(`#${CSS.escape(id)}`)
}

function setBuildingFlag(id, cls, on) {
  const el = buildingEl(id)
  if (el) el.classList.toggle(cls, on)
}

function setSelectedBuilding(id) {
  setBuildingFlag(interaction.selected, 'building-selected', false)
  interaction.selected = id
  setBuildingFlag(id, 'building-selected', true)
}

// Hover tooltip state (mutated in place; only MapTooltip reads it)
const TOOLTIP_DELAY_MS = 150
const tooltip = shallowReactive({ visible: false, x: 0, y: 0, bars: [] })
let hoverTimer = null
let tooltipFrame = null
// Latest pointer position over the map, so the tooltip opens at (and then
// follows) the cursor rather than where the pointer first entered the building
const lastPointer = { clientX: 0, clientY: 0 }

function positionTooltip() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  // getBoundingClientRect returns viewport coords; CSS positioning uses local (pre-zoom) coords.
  // Divide by the effective zoom so the tooltip tracks the cursor correctly.
  const zoom = rect.width / containerRef.value.offsetWidth || 1
  const rawX = (lastPointer.clientX - rect.left) / zoom + 12
  const rawY = (lastPointer.clientY - rect.top) / zoom - 8
  const tooltipW = 220
  const tooltipH = 120
  tooltip.x = Math.min(rawX, containerRef.value.offsetWidth - tooltipW)
  tooltip.y = Math.min(rawY, containerRef.value.offsetHeight - tooltipH)
}

function showTooltip(buildingId) {
  const barsInBuilding = barsByBuilding.value[buildingId]
  if (!barsInBuilding || barsInBuilding.length === 0) return

  const barsToShow = barsInBuilding.filter(barPassesFilters)
  if (barsToShow.length === 0) return

  positionTooltip()
  tooltip.bars = barsToShow
  tooltip.visible = true
}

// At most one reposition per frame while the pointer moves inside a building
function followTooltip() {
  if (!tooltip.visible || tooltipFrame !== null) return
  tooltipFrame = requestAnimationFrame(() => {
    tooltipFrame = null
    if (tooltip.visible) positionTooltip()
  })
}

function hideTooltip() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  if (tooltipFrame !== null) {
    cancelAnimationFrame(tooltipFrame)
    tooltipFrame = null
  }
  if (tooltip.visible) {
    tooltip.visible = false
    tooltip.bars = []
  }
}

function resolveBuilding(e) {
  // Direct path click
  const path = e.target.closest('path[id^="bldg-"]')
  if (path) return { id: path.id, el: path }
  // Partition rect click — get building ID from data attribute
  const partEl = e.target.closest('[data-partition-building]')
  if (partEl) {
    const bldgId = partEl.dataset.partitionBuilding
    return { id: bldgId, el: buildingEl(bldgId) }
  }
  return { id: null, el: null }
}

function onSvgMouseMove(e) {
  lastPointer.clientX = e.clientX
  lastPointer.clientY = e.clientY
  if (props.adminMode && props.placingBar) {
    const { id: newId, el: target } = resolveBuilding(e)
    if (newId !== interaction.hovered) {
      clearHighlight()
      interaction.hovered = newId
      if (target) {
        target.classList.add('building-hover')
      }
    }
    return
  }
  // Normal mode: highlight buildings with bars
  const { id: newId, el: target } = resolveBuilding(e)
  if (newId !== interaction.hovered) {
    clearHighlight()
    hideTooltip()
    if (newId && buildingsWithBars.value.has(newId)) {
      interaction.hovered = newId
      if (target) target.classList.add('building-hover')
      emit('hoverBuilding', newId)
      // Show the tooltip after a short delay, at wherever the pointer is by then
      hoverTimer = setTimeout(() => {
        hoverTimer = null
        showTooltip(newId)
      }, TOOLTIP_DELAY_MS)
    } else {
      interaction.hovered = null
      emit('hoverBuilding', null)
    }
  } else {
    followTooltip()
  }
}

function onSvgMouseLeave() {
  clearHighlight()
  hideTooltip()
  emit('hoverBuilding', null)
}

function clearHighlight() {
  setBuildingFlag(interaction.hovered, 'building-hover', false)
  interaction.hovered = null
}

// === Building colours (declarative) ===
// Wanted fill + state classes of every building path that differs from the raw
// SVG: street colour, neutral base under partitions, filter dimming and search
// highlight. Hover / selection classes are not part of this (see setBuildingFlag).
const buildingStyle = computed(() => computeBuildingStyles({
  barsByBuilding: barsByBuilding.value,
  partitions: props.partitions,
  dominantStreet: buildingDominantStreet.value,
  passingBarIds: passingBarIds.value,
  searchHighlighted: props.searchHighlighted,
}))

// The base map is raw SVG injected with v-html, so the styles are applied to
// the DOM by hand: diff against what was applied last and touch only the paths
// that changed.
let buildingPaths = null      // id → path elements of the injected SVG
let buildingPathsFor = null   // the mapContent the index was built from
let appliedBuildingStyle = {}

watchEffect(() => {
  const wanted = buildingStyle.value
  const content = mapContent.value
  if (!content || !svgRef.value) return
  if (buildingPathsFor !== content) {
    buildingPaths = new Map()
    for (const path of svgRef.value.querySelectorAll('path[id^="bldg-"]')) {
      if (!buildingPaths.has(path.id)) buildingPaths.set(path.id, [])
      buildingPaths.get(path.id).push(path)
    }
    buildingPathsFor = content
    appliedBuildingStyle = {}
  }
  for (const { id, fill, classes } of diffBuildingStyles(appliedBuildingStyle, wanted)) {
    const wantedClasses = classes ? classes.split(' ') : []
    for (const path of buildingPaths.get(id) || []) {
      for (const cls of BUILDING_STATE_CLASSES) {
        path.classList.toggle(cls, wantedClasses.includes(cls))
      }
      if (fill === null) path.style.removeProperty('--bldg-fill')
      else path.style.setProperty('--bldg-fill', fill)
    }
  }
  appliedBuildingStyle = wanted
}, { flush: 'post' })

// Panzoom
function fitToContainer(zoomMultiplier = 1) {
  if (!containerRef.value || !svgRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const scaleX = rect.width / VB_W
  const scaleY = rect.height / VB_H
  const scale = Math.min(scaleX, scaleY) * zoomMultiplier
  const offsetX = (rect.width - VB_W * scale) / 2
  const offsetY = (rect.height - VB_H * scale) / 2
  if (panzoomInstance) {
    panzoomInstance.zoomAbs(0, 0, scale)
    panzoomInstance.moveTo(offsetX, offsetY)
  }
}

function resetView() {
  userRotation.value = 0
  fitToContainer()
}

function centerOnPoint(mapX, mapY) {
  if (!containerRef.value || !panzoomInstance) return
  const rect = containerRef.value.getBoundingClientRect()
  const scale = baseFitScale.value
  const screenX = (mapX - VB_MIN_X) * scale
  const screenY = (mapY - VB_MIN_Y) * scale
  const offsetX = rect.width / 2 - screenX
  const offsetY = rect.height / 2 - screenY
  panzoomInstance.moveTo(offsetX, offsetY)
}

function resetZoom() {
  fitToContainer()
}

function zoomIn() {
  if (!panzoomInstance || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  panzoomInstance.zoomTo(rect.width / 2, rect.height / 2, 1.5)
}

function zoomOut() {
  if (!panzoomInstance || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  panzoomInstance.zoomTo(rect.width / 2, rect.height / 2, 0.67)
}

function clampToBounds() {
  if (!panzoomInstance || !containerRef.value) return
  const { x: tx, y: ty, scale: s } = panzoomInstance.getTransform()
  const W = containerRef.value.clientWidth
  const H = containerRef.value.clientHeight
  const mapW = VB_W * s
  const mapH = VB_H * s
  const nx = mapW >= W ? Math.min(0, Math.max(tx, W - mapW)) : (W - mapW) / 2
  const ny = mapH >= H ? Math.min(0, Math.max(ty, H - mapH)) : (H - mapH) / 2
  if (Math.abs(nx - tx) > 0.5 || Math.abs(ny - ty) > 0.5) {
    panzoomInstance.moveTo(nx, ny)
  }
}

function initPanzoom() {
  if (panzoomInstance) panzoomInstance.dispose()
  if (!svgRef.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const fitScale = Math.min(rect.width / VB_W, rect.height / VB_H)
  panzoomInstance = panzoom(svgRef.value, {
    maxZoom: 8,
    minZoom: fitScale,
    smoothScroll: false,
    zoomDoubleClickSpeed: 1.5,
  })
  panzoomInstance.on('panend', clampToBounds)
  panzoomInstance.on('zoom', clampToBounds)
  panzoomInstance.on('zoom', () => { currentZoom.value = panzoomInstance.getTransform().scale })
  fitToContainer(1.5)
  const { scale: initScale } = panzoomInstance.getTransform()
  currentZoom.value = initScale
  baseFitScale.value = initScale
  // Center on bldg-5 area on initial load
  centerOnPoint(1679.29, 2495.3)
}

function onKeyDown(e) {
  // Don't intercept when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
  if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomIn()
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    zoomOut()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  loadAnnotations()
  try {
    const res = await fetch(mapSvgUrl)
    mapContent.value = await res.text()
  } catch (e) {
    console.error('Failed to load map SVG:', e)
  }
})

watch(mapContent, () => {
  setTimeout(initPanzoom, 50)
})

watch(() => props.placingBar, (val) => {
  if (!val) clearHighlight()
})

// === GPS location tracking ===

function solveLinear3(M, b) {
  const m = M.map(r => [...r])
  const v = [...b]
  for (let col = 0; col < 3; col++) {
    let maxR = col
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[maxR][col])) maxR = r
    }
    ;[m[col], m[maxR]] = [m[maxR], m[col]]
    ;[v[col], v[maxR]] = [v[maxR], v[col]]
    for (let r = col + 1; r < 3; r++) {
      const f = m[r][col] / m[col][col]
      for (let c = col; c < 3; c++) m[r][c] -= f * m[col][c]
      v[r] -= f * v[col]
    }
  }
  const x = [0, 0, 0]
  for (let r = 2; r >= 0; r--) {
    x[r] = v[r]
    for (let c = r + 1; c < 3; c++) x[r] -= m[r][c] * x[c]
    if (Math.abs(m[r][r]) < 1e-10) {
      console.warn('GPS calibration: singular matrix — calibration points may be collinear')
      return null
    }
    x[r] /= m[r][r]
  }
  return x
}

function decodePlusCode(code) {
  try {
    if (!_olc.isValid(code) || !_olc.isFull(code)) return null
    const area = _olc.decode(code)
    return { lat: area.latitudeCenter, lng: area.longitudeCenter }
  } catch {
    return null
  }
}

const gpsTransform = computed(() => {
  const pts = []
  for (const b of props.bars) {
    if (b.map_x == null || b.map_y == null) continue
    let lat = b.lat || null
    let lng = b.lng || null
    // Fall back to Plus Code if explicit coords are missing
    if (!lat || !lng) {
      const decoded = b.plus_code ? decodePlusCode(b.plus_code) : null
      if (decoded) { lat = decoded.lat; lng = decoded.lng }
    }
    if (lat && lng) pts.push({ lat, lng, map_x: b.map_x, map_y: b.map_y })
  }
  if (pts.length < 3) return null
  const AtA = [[0,0,0],[0,0,0],[0,0,0]]
  const Atbx = [0,0,0]
  const Atby = [0,0,0]
  for (const p of pts) {
    const row = [p.lng, p.lat, 1]
    for (let r = 0; r < 3; r++) {
      Atbx[r] += row[r] * p.map_x
      Atby[r] += row[r] * p.map_y
      for (let c = 0; c < 3; c++) AtA[r][c] += row[r] * row[c]
    }
  }
  try {
    const xp = solveLinear3(AtA, Atbx)
    const yp = solveLinear3(AtA, Atby)
    return { xp, yp, calibrationCount: pts.length }
  } catch {
    return null
  }
})

function gpsToSvg(lat, lng) {
  const t = gpsTransform.value
  if (!t) return null
  return {
    x: t.xp[0] * lng + t.xp[1] * lat + t.xp[2],
    y: t.yp[0] * lng + t.yp[1] * lat + t.yp[2],
  }
}

const geoWatching = ref(false)
const geoPosition = ref(null)
const geoError = ref(null)
let geoWatchId = null

const userSvgPos = computed(() => {
  if (!geoPosition.value) return null
  return gpsToSvg(geoPosition.value.lat, geoPosition.value.lng)
})

function panToUserLocation() {
  if (!userSvgPos.value || !panzoomInstance || !containerRef.value) return
  const { x, y } = userSvgPos.value
  const rotated = rotatePoint(x, y)
  const rect = containerRef.value.getBoundingClientRect()
  const { scale } = panzoomInstance.getTransform()
  const offsetX = rect.width / 2 - (rotated.x - VB_MIN_X) * scale
  const offsetY = rect.height / 2 - (rotated.y - VB_MIN_Y) * scale
  panzoomInstance.moveTo(offsetX, offsetY)
}

function startGeoTracking() {
  if (!navigator.geolocation) {
    geoError.value = t('geoUnsupported')
    return
  }
  geoWatching.value = true
  geoError.value = null
  let firstFix = true
  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      geoPosition.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }
      if (firstFix) {
        firstFix = false
        panToUserLocation()
      }
    },
    (err) => {
      geoError.value = err.message
      geoWatching.value = false
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  )
}

function stopGeoTracking() {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId)
    geoWatchId = null
  }
  geoWatching.value = false
  geoPosition.value = null
  geoError.value = null
}

function toggleGeoTracking() {
  if (geoWatching.value) stopGeoTracking()
  else startGeoTracking()
}

onUnmounted(() => {
  if (panzoomInstance) panzoomInstance.dispose()
  hideTooltip()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onAnnotationDrag)
  window.removeEventListener('mouseup', onAnnotationDragEnd)
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId)
})

function panToBuilding(buildingId) {
  if (!svgRef.value || !panzoomInstance || !containerRef.value) return
  const el = buildingEl(buildingId)
  if (!el) return

  const bbox = el.getBBox()
  // Center in local (unrotated) coordinates
  const localCx = bbox.x + bbox.width / 2
  const localCy = bbox.y + bbox.height / 2
  // Transform through the rotation to get viewport coordinates
  const rotated = rotatePoint(localCx, localCy)

  const rect = containerRef.value.getBoundingClientRect()
  // Keep current zoom level, just center on the building
  const { scale } = panzoomInstance.getTransform()
  // Account for viewBox origin offset when computing pan target
  const offsetX = rect.width / 2 - (rotated.x - VB_MIN_X) * scale
  const offsetY = rect.height / 2 - (rotated.y - VB_MIN_Y) * scale

  panzoomInstance.moveTo(offsetX, offsetY)

  // Pulse highlight
  el.classList.add('building-highlight-pulse')
  setTimeout(() => el.classList.remove('building-highlight-pulse'), 2000)
}

// === Annotations (admin-mode text labels) ===
const annotations = ref([])
const selectedAnnotation = ref(null)
let draggingAnnotation = null
let dragOffset = { x: 0, y: 0 }

async function loadAnnotations() {
  try {
    annotations.value = await fetchAnnotations()
  } catch (err) {
    console.error('Failed to load annotations:', err)
  }
}

async function addAnnotation() {
  const id = Date.now().toString(36)
  const ann = {
    id,
    text_en: 'Label',
    text_jp: '',
    x: MAP_W / 2,
    y: MAP_H / 2,
    font_size: 250,
    color: '#8a6540',
    rotation: 0,
  }
  try {
    const saved = await apiCreateAnnotation(ann)
    annotations.value.push(saved)
    selectedAnnotation.value = id
  } catch (err) {
    console.error('Failed to create annotation:', err)
  }
}

async function updateAnnotation(id, field, value) {
  const ann = annotations.value.find(a => a.id === id)
  if (!ann) return
  ann[field] = value
  try {
    await apiUpdateAnnotation(id, { [field]: value })
  } catch (err) {
    console.error('Failed to update annotation:', err)
  }
}

async function deleteAnnotation(id) {
  annotations.value = annotations.value.filter(a => a.id !== id)
  if (selectedAnnotation.value === id) selectedAnnotation.value = null
  try {
    await apiDeleteAnnotation(id)
  } catch (err) {
    console.error('Failed to delete annotation:', err)
  }
}

function onAnnotationMouseDown(e, ann) {
  if (!props.adminMode) return
  e.stopPropagation()
  e.preventDefault()
  selectedAnnotation.value = ann.id
  draggingAnnotation = ann.id

  // Get SVG coordinates
  const pt = svgRef.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const svgPt = pt.matrixTransform(svgRef.value.getScreenCTM().inverse())
  dragOffset = { x: svgPt.x - ann.x, y: svgPt.y - ann.y }

  // Pause panzoom during drag
  if (panzoomInstance) panzoomInstance.pause()

  window.addEventListener('mousemove', onAnnotationDrag)
  window.addEventListener('mouseup', onAnnotationDragEnd)
}

function onAnnotationDrag(e) {
  if (!draggingAnnotation || !svgRef.value) return
  const pt = svgRef.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const svgPt = pt.matrixTransform(svgRef.value.getScreenCTM().inverse())

  const ann = annotations.value.find(a => a.id === draggingAnnotation)
  if (ann) {
    ann.x = Math.round(svgPt.x - dragOffset.x)
    ann.y = Math.round(svgPt.y - dragOffset.y)
  }
}

function onAnnotationDragEnd() {
  if (draggingAnnotation) {
    const ann = annotations.value.find(a => a.id === draggingAnnotation)
    if (ann) {
      apiUpdateAnnotation(draggingAnnotation, { x: ann.x, y: ann.y }).catch(err => {
        console.error('Failed to save annotation position:', err)
      })
    }
    draggingAnnotation = null
  }
  if (panzoomInstance) panzoomInstance.resume()
  window.removeEventListener('mousemove', onAnnotationDrag)
  window.removeEventListener('mouseup', onAnnotationDragEnd)
}

const selectedAnn = computed(() => {
  if (!selectedAnnotation.value) return null
  return annotations.value.find(a => a.id === selectedAnnotation.value) || null
})

async function onAnnotationIconUpload(e) {
  const file = e.target.files?.[0]
  if (!file || !selectedAnnotation.value) return
  try {
    const { image_url } = await uploadAnnotationIcon(selectedAnnotation.value, file)
    const ann = annotations.value.find(a => a.id === selectedAnnotation.value)
    if (ann) ann.image_url = image_url
  } catch (err) {
    console.error('Failed to upload annotation icon:', err)
  }
}

// === Partition rendering ===
// Set of building IDs that have partitions
const partitionedBuildings = computed(() => {
  const s = new Set()
  for (const [bldgId, data] of Object.entries(props.partitions)) {
    if (data.partitions && data.partitions.length > 0) s.add(bldgId)
  }
  return s
})

// Pure geometry of the split buildings: depends only on the partition data,
// the building boxes and the bars. Hover, search and filters must not be read
// here, or every hover would recompute every split building.
const partitionGeometry = computed(() => {
  devCount('geometry')
  return computePartitionGeometry(props.partitions, buildingMap, barById.value, MAP_ROTATION)
})

// Highlight / dim state per building and slot (cheap; changes on hover, search and filters)
const partitionSlotState = computed(() => computePartitionSlotState(partitionGeometry.value, {
  barById: barById.value,
  passingBarIds: passingBarIds.value,
  hoveredBarId: props.hoveredBarId,
  searchBarIds: props.searchHighlightedBars,
}))

// Map bar ID → its partition color (for tooltip swatches)
const barPartitionColor = computed(() => {
  const map = {}
  for (const pdata of Object.values(partitionGeometry.value)) {
    for (const rect of pdata.rects) {
      for (const id of rect.barIds) {
        map[id] = rect.color
      }
    }
  }
  return map
})

// Find which partition was clicked by checking SVG coordinates
function findClickedPartition(buildingId, svgX, svgY) {
  const pdata = partitionGeometry.value[buildingId]
  if (!pdata) return null
  const { rects, angle, cx, cy } = pdata
  // Rotate click point into the partition coordinate space (inverse of splitAngle)
  let px = svgX, py = svgY
  if (angle) {
    const rad = -angle * Math.PI / 180
    const dx = svgX - cx, dy = svgY - cy
    px = cx + dx * Math.cos(rad) - dy * Math.sin(rad)
    py = cy + dx * Math.sin(rad) + dy * Math.cos(rad)
  }
  for (const r of rects) {
    if (px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height) {
      return r
    }
  }
  return null
}

function getSvgPoint(e) {
  if (!svgRef.value) return null
  const pt = svgRef.value.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  // Transform through the SVG's CTM (includes panzoom transforms)
  const ctm = svgRef.value.getScreenCTM()
  if (!ctm) return null
  const svgPt = pt.matrixTransform(ctm.inverse())
  // Also undo the map rotation
  const rad = -MAP_ROTATION * Math.PI / 180
  const dx = svgPt.x - MAP_CX, dy = svgPt.y - MAP_CY
  return {
    x: MAP_CX + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: MAP_CY + dx * Math.sin(rad) + dy * Math.cos(rad),
  }
}

// Emit building selection for admin editing
let rotTouchStartAngle = null
let rotTouchStartRotation = 0

function getTouchAngle(touches) {
  const dx = touches[1].clientX - touches[0].clientX
  const dy = touches[1].clientY - touches[0].clientY
  return Math.atan2(dy, dx) * 180 / Math.PI
}

function onContainerTouchStart(e) {
  if (e.touches.length === 2) {
    rotTouchStartAngle = getTouchAngle(e.touches)
    rotTouchStartRotation = userRotation.value
  }
}

function onContainerTouchMove(e) {
  if (e.touches.length === 2 && rotTouchStartAngle !== null) {
    const currentAngle = getTouchAngle(e.touches)
    const delta = currentAngle - rotTouchStartAngle
    userRotation.value = rotTouchStartRotation + delta
  }
}

function onContainerTouchEnd(e) {
  if (e.touches.length < 2) {
    rotTouchStartAngle = null
  }
}


// Touch tap detection (panzoom consumes touch events so @click never fires on mobile)
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0

function onSvgTouchStart(e) {
  if (e.touches.length !== 1) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchStartTime = Date.now()
}

function onSvgTouchEnd(e) {
  if (e.changedTouches.length !== 1) return
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const dt = Date.now() - touchStartTime
  if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 300) {
    e.preventDefault() // prevent the 300ms-delayed synthetic click
    handleMapClick({
      target: e.target,
      clientX: e.changedTouches[0].clientX,
      clientY: e.changedTouches[0].clientY,
    })
  }
}

function handleMapClick(e) {
  hideTooltip()

  const { id: buildingId } = resolveBuilding(e)
  if (!buildingId) {
    setSelectedBuilding(null)
    emit('deselect')
    return
  }

  if (props.adminMode && props.placingBar) {
    emit('placeBar', { bar: props.placingBar, buildingId })
    clearHighlight()
    return
  }

  if (props.adminMode) {
    emit('selectBuildingForEdit', buildingId)
  }

  // Independent building mode: each partition acts as its own building
  if (props.partitions[buildingId]?.isIndependentBuilding) {
    const svgPt = getSvgPoint(e)
    if (svgPt) {
      const clickedPart = findClickedPartition(buildingId, svgPt.x, svgPt.y)
      if (clickedPart?.barIds?.length) {
        const bars = clickedPart.barIds.map(id => barById.value[String(id)]).filter(Boolean)
        if (bars.length > 0) {
          setSelectedBuilding(buildingId)
          emit('selectBuilding', { buildingId, bars })
          return
        }
      }
    }
  }

  // Show all bars in the building (opens drawer)
  const barsInBuilding = barsByBuilding.value[buildingId]
  if (barsInBuilding && barsInBuilding.length > 0) {
    setSelectedBuilding(buildingId)
    emit('selectBuilding', { buildingId, bars: barsInBuilding })
  }
}

defineExpose({ resetZoom, resetView, unplacedBars, panToBuilding, clearSelection: () => setSelectedBuilding(null) })
</script>

<template>
  <div
    class="map-container"
    ref="containerRef"
    @touchstart.passive="onContainerTouchStart"
    @touchmove.passive="onContainerTouchMove"
    @touchend.passive="onContainerTouchEnd"
  >
    <div class="map-svg-wrap" :style="mapRotateStyle">
    <svg
      ref="svgRef"
      :viewBox="`${VB_MIN_X} ${VB_MIN_Y} ${VB_W} ${VB_H}`"
      :width="VB_W"
      :height="VB_H"
      :class="['golden-gai-svg', { 'placing-mode': adminMode && placingBar }]"
      @click="handleMapClick"
      @mousemove="onSvgMouseMove"
      @mouseleave="onSvgMouseLeave"
      @touchstart.passive="onSvgTouchStart"
      @touchend="onSvgTouchEnd"
    >
      <g :transform="`rotate(${MAP_ROTATION}, ${MAP_CX}, ${MAP_CY})`">
      <!-- ClipPaths must live inside the rotation group so their coordinate space
           matches the space of the elements being clipped (pre-map-rotation SVG coords). -->
      <defs>
        <clipPath
          v-for="bldgId in partitionedBuildings"
          :key="`pclip-${bldgId}`"
          :id="`pclip-${bldgId}`"
        >
          <use :href="`#${bldgId}`" />
        </clipPath>
      </defs>
      <g v-html="mapContent" class="map-bg" />

      <!-- Partition color overlays (clipped to each building shape) -->
      <MapPartitions
        :geometry="partitionGeometry"
        :slot-state="partitionSlotState"
        :interaction="interaction"
      />

      <!-- Bar name labels (visible when sufficiently zoomed in) -->
      <Transition name="labels-fade">
        <MapLabels v-if="showLabels" :labels="buildingLabelData" />
      </Transition>

      <!-- Bar count badges: always shown when zoomed out -->
      <MapBadges v-if="!showLabels" :badges="buildingBarCountBadges" :rotation="-MAP_ROTATION" />

      <!-- Annotations -->
      <MapAnnotations
        :annotations="annotations"
        :admin-mode="adminMode"
        :selected-id="selectedAnnotation"
        :lang="lang"
        @annotation-mousedown="onAnnotationMouseDown"
      />
      <!-- User GPS location marker -->
      <g v-if="userSvgPos" :transform="`translate(${userSvgPos.x}, ${userSvgPos.y})`" class="user-location-marker" style="pointer-events: none">
        <circle class="user-pulse-ring" r="60" />
        <circle r="22" fill="#2563EB" stroke="white" stroke-width="9" />
      </g>
      </g><!-- close rotation group -->
    </svg>
    </div><!-- close map-svg-wrap -->

    <!-- Hover tooltip -->
    <MapTooltip :tooltip="tooltip" :bar-colors="barPartitionColor" :lang="lang" />

    <div v-if="!isMobile" class="map-controls" style="right: 8px">
      <WinButton class="zoom-btn" :title="t('zoomIn')" @click="zoomIn">+</WinButton>
      <WinButton class="zoom-btn" :title="t('zoomOut')" @click="zoomOut">&minus;</WinButton>
      <WinButton class="zoom-btn" :title="t('fitToView')" @click="resetZoom">&#x27F3;</WinButton>
      <WinButton v-if="adminMode" class="zoom-btn" title="Add label" @click="addAnnotation">Aa+</WinButton>
      <WinButton
        class="zoom-btn"
        :class="{ 'geo-btn-active': geoWatching, 'geo-btn-error': geoError, 'tour-highlight': tourHighlight === 'map-location' }"
        :title="geoError ? geoError : (geoWatching ? `${t('stopLocation')} (${t('locationCalibrated', { n: gpsTransform?.calibrationCount })})` : (gpsTransform ? `${t('showLocation')} (${t('locationCalibrated', { n: gpsTransform.calibrationCount })})` : `${t('showLocation')} (${t('locationNeedsCalibration')})`) )"
        @click="toggleGeoTracking"
      >&#x2316;</WinButton>
    </div>

    <!-- Location + reset buttons always visible on mobile, below filter bar -->
    <div v-if="isMobile" class="map-controls map-controls--mobile-location">
      <WinButton
        class="zoom-btn zoom-btn--location-mobile"
        :class="{ 'tour-highlight': tourHighlight === 'map-location', 'geo-btn-active': geoWatching, 'geo-btn-error': geoError }"
        :title="geoError ? geoError : (geoWatching ? t('stopLocation') : t('showLocation'))"
        @click="toggleGeoTracking"
      >&#x2316;</WinButton>
      <WinButton
        class="zoom-btn zoom-btn--location-mobile"
        :title="t('resetView')"
        @click="resetView"
      >&#x27F3;</WinButton>
    </div>

    <!-- Annotation edit toolbar (admin only) -->
    <div v-if="adminMode && selectedAnn" class="annotation-toolbar">
      <label class="ann-field">
        <span>EN</span>
        <input
          type="text"
          :value="selectedAnn.text_en || selectedAnn.text || ''"
          @input="updateAnnotation(selectedAnn.id, 'text_en', $event.target.value)"
          class="ann-input"
          placeholder="English text"
        />
      </label>
      <label class="ann-field">
        <span>JP</span>
        <input
          type="text"
          :value="selectedAnn.text_jp || ''"
          @input="updateAnnotation(selectedAnn.id, 'text_jp', $event.target.value)"
          class="ann-input"
          placeholder="Japanese text"
        />
      </label>
      <label class="ann-field">
        <span>Size</span>
        <input
          type="number"
          :value="selectedAnn.font_size"
          @input="updateAnnotation(selectedAnn.id, 'font_size', Number($event.target.value))"
          class="ann-num"
          min="10"
          max="2000"
        />
      </label>
      <label class="ann-field">
        <span>Rot</span>
        <input
          type="number"
          :value="selectedAnn.rotation"
          @input="updateAnnotation(selectedAnn.id, 'rotation', Number($event.target.value))"
          class="ann-num"
          min="-180"
          max="180"
        />
      </label>
      <input
        v-if="!selectedAnn.image_url"
        type="color"
        :value="selectedAnn.color"
        @input="updateAnnotation(selectedAnn.id, 'color', $event.target.value)"
        class="ann-color"
        title="Color"
      />
      <label v-if="selectedAnn.image_url" class="ann-field">
        <span>W</span>
        <input type="number" :value="selectedAnn.image_width || 200"
          @input="updateAnnotation(selectedAnn.id, 'image_width', Number($event.target.value))"
          class="ann-num" min="10" max="5000" />
      </label>
      <label v-if="selectedAnn.image_url" class="ann-field">
        <span>H</span>
        <input type="number" :value="selectedAnn.image_height || 200"
          @input="updateAnnotation(selectedAnn.id, 'image_height', Number($event.target.value))"
          class="ann-num" min="10" max="5000" />
      </label>
      <label v-if="!selectedAnn.image_url" class="ann-field">
        <span>Icon</span>
        <input type="file" accept="image/*" @change="onAnnotationIconUpload($event)" style="width:80px;font-size:9px" />
      </label>
      <WinButton small @click="deleteAnnotation(selectedAnn.id)">&#10005;</WinButton>
    </div>

    <div v-if="unplacedBars.length > 0 && adminMode" class="unplaced-badge">
      {{ unplacedBars.length }} unplaced
    </div>
  </div>
</template>

<style scoped>
.map-svg-wrap {
  width: 100%;
  height: 100%;
  transform-origin: center center;
}

.golden-gai-svg {
  background: #0a0810;
}

/* Roads — subtle warm orange tint */
.golden-gai-svg :deep(#ROADS_OUTLINES) {
  opacity: 0.8;
}
.golden-gai-svg :deep(#ROADS_OUTLINES path) {
  fill: #1a1018 !important;
  stroke: #5a3d2a !important;
  stroke-width: 1.2 !important;
}

.golden-gai-svg :deep(#ROADS) {
  opacity: 0.75;
}
.golden-gai-svg :deep(#ROADS path) {
  stroke: #6b4a30 !important;
  stroke-width: 1 !important;
}

/* Buildings — dark, pixelated borders */
.golden-gai-svg :deep(#BUILDINGS) {
  opacity: 1;
}
.golden-gai-svg :deep(#BUILDINGS path) {
  fill: #0e0a18 !important;
  stroke: #3a2855 !important;
  stroke-width: 1.5 !important;
  transition: fill 0.15s, stroke 0.15s;
}

/* Buildings with bars — street-based fill via CSS custom property */
.golden-gai-svg :deep(#BUILDINGS path.has-bars) {
  fill: var(--bldg-fill, #3a2010) !important;
  stroke: #1a0a00 !important;
  stroke-width: 1.8 !important;
  cursor: pointer;
}

/* Dimmed buildings that don't match active tag filter */
.golden-gai-svg :deep(#BUILDINGS path.tag-dimmed) {
  fill: #1A0800 !important;
  stroke: #3A1800 !important;
  stroke-width: 1.2 !important;
  opacity: 0.4;
}

/* Hover: brighten for all has-bars buildings */
.golden-gai-svg :deep(#BUILDINGS path.has-bars:hover) {
  filter: brightness(1.5) !important;
}

/* Search highlight */
.golden-gai-svg :deep(#BUILDINGS path.search-highlight) {
  fill: #BD5700 !important;
  stroke: #ED6E00 !important;
  stroke-width: 2.5 !important;
}

/* Admin placing mode */
.placing-mode :deep(#BUILDINGS path) {
  cursor: pointer;
}

.placing-mode :deep(#BUILDINGS path:hover) {
  fill: #2a1845 !important;
  stroke: #e8a040 !important;
  stroke-width: 2 !important;
}

:deep(.building-hover) {
  filter: brightness(1.5) !important;
}

:deep(.building-selected) {
  filter: brightness(2) !important;
  stroke: #f0c060 !important;
  stroke-width: 3 !important;
}

.golden-gai-svg.placing-mode {
  cursor: crosshair;
}

:deep(.building-highlight-pulse) {
  animation: building-pulse 0.5s ease-in-out 4;
}

@keyframes building-pulse {
  0%, 100% {
    stroke: #7A3800 !important;
    stroke-width: 2.5 !important;
    fill: #BD5700 !important;
  }
  50% {
    stroke: #ED6E00 !important;
    stroke-width: 4 !important;
    fill: #ED6E00 !important;
  }
}

/* Building name labels — fade in/out */
.labels-fade-enter-active {
  transition: opacity 0.25s ease;
}
.labels-fade-leave-active {
  transition: opacity 0.15s ease;
}
.labels-fade-enter-from,
.labels-fade-leave-to {
  opacity: 0;
}

/* Annotation toolbar */
.annotation-toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--win-bg);
  padding: 4px 6px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    3px 3px 6px rgba(0, 0, 0, 0.5);
  z-index: 10;
  font-family: var(--win-font);
  font-size: 10px;
}

.ann-input {
  width: 80px;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  outline: none;
}

.ann-field {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--win-text-disabled);
  font-size: 9px;
}

.ann-num {
  width: 40px;
  padding: 2px 3px;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  outline: none;
}

.ann-color {
  width: 22px;
  height: 18px;
  padding: 0;
  border: none;
  cursor: pointer;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.unplaced-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: var(--win-bg);
  color: var(--valhalla-orange);
  padding: 3px 8px;
  font-family: var(--win-font);
  font-size: 10px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  z-index: 5;
}

/* Larger zoom buttons */
:deep(.zoom-btn) {
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 16px !important;
}

/* Mobile location button — always visible, below the search + filter bar */
.map-controls--mobile-location {
  position: fixed;
  top: 90px;  /* below search bar (~44px) + filter bar (~44px) + 2px */
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 250;
}

:deep(.zoom-btn--location-mobile) {
  min-width: 44px !important;
  min-height: 44px !important;
  font-size: 20px !important;
  padding: 8px !important;
}

/* Tour highlight on map buttons */
:deep(.tour-highlight) {
  box-shadow: 0 0 0 2px #ffcc44, 0 0 10px 2px rgba(255, 204, 68, 0.6) !important;
  animation: tour-pulse 1s ease-in-out infinite;
}

@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 2px #ffcc44, 0 0 10px 2px rgba(255, 204, 68, 0.6); }
  50%       { box-shadow: 0 0 0 2px #ffcc44, 0 0 16px 4px rgba(255, 204, 68, 0.8); }
}

/* GPS locate button states */
:deep(.geo-btn-active) {
  background: #b8deff !important;
  border-color: #3a70b0 !important;
}
:deep(.geo-btn-error) {
  color: #cc0000 !important;
}

/* User location dot */
.user-pulse-ring {
  fill: #2563EB;
  fill-opacity: 0.35;
  animation: user-gps-pulse 1.8s ease-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes user-gps-pulse {
  0%   { transform: scale(0.8); opacity: 0.7; }
  100% { transform: scale(3.5); opacity: 0; }
}
</style>
