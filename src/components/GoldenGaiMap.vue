<script setup>
import { ref, reactive, shallowReactive, shallowRef, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
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
  parsePolygonPath,
  findPartitionAt,
  screenToMap as screenToMapPure,
  panToCenter,
  panToPoint,
  clampPan,
  normalizeAngle,
  touchSpan,
  pinchScale,
  snapRotation,
  wheelZoomFactor,
} from '../utils/mapGeometry.js'
import { devCount, devTrackRenders } from '../utils/devPerf.js'
import { useI18n } from '../composables/useI18n.js'
import { useMapHover } from '../composables/useMapHover.js'
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
  tagMode: { type: String, default: 'or' }, // 'or' | 'and'
  hoveredBarId: { type: String, default: null },
  // false while another view is shown: the map stays mounted but hidden
  active: { type: Boolean, default: true },
})

const emit = defineEmits(['selectBuilding', 'placeBar', 'selectBuildingForEdit', 'selectPartitionBar', 'deselect'])

// Building under the pointer, shared with the drawer's hover preview
const { hoveredBuildingId } = useMapHover()

const { t } = useI18n(computed(() => props.lang))

devTrackRenders('GoldenGaiMap')

const containerRef = ref(null)
const wrapRef = ref(null)
const svgRef = ref(null)
const mapContent = ref('')
let panzoomInstance = null

const { isFavorited, isVisited } = useVisited()

// Zoom tracking — used to show/hide building labels
const currentZoom = ref(0)
const baseFitScale = ref(0)
const showLabels = computed(() => baseFitScale.value > 0 && currentZoom.value >= baseFitScale.value * 2.0)

// User rotation applied via container transform (two-finger twist), in (-180, 180]
const userRotation = ref(0)
// The same in 10-degree steps, for text that is laid out along a building or a
// street (bar labels, annotations): it turns with the map, and is turned half
// a turn when it would otherwise read upside down. Steps, so that those layers
// re-render a few times per twist and not on every frame.
const labelTurn = computed(() => Math.round(userRotation.value / 10) * 10)
const mapRotateStyle = computed(() =>
  userRotation.value !== 0 ? { transform: `rotate(${userRotation.value}deg)` } : {}
)

const isMobile = ref(window.innerWidth <= 768)
function onResize() {
  isMobile.value = window.innerWidth <= 768
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// Width (layout px) of the bar drawer, which on desktop lies over the right
// edge of the map whenever admin mode is off (see BarDrawer.vue / App.vue).
// The map stays as wide as the desktop, so everything that has to be seen or
// clicked keeps clear of that strip: the buttons, the fitted map, the pan limits.
const DRAWER_WIDTH = 300
const coveredRight = computed(() => (!isMobile.value && !props.adminMode ? DRAWER_WIDTH : 0))

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

// Rotation of a building's label group before the admin's own rotation.
// Counter-rotates the map's rotation so labels are screen-aligned; 'horizontal'
// (names side by side, each reading down its slot) gets a quarter turn more.
// 'tate' does not: writing-mode already runs the text top to bottom, and the
// extra quarter turn laid it on its side, reading right to left.
function labelBaseRotation(orientation) {
  return orientation === 'horizontal' ? -MAP_ROTATION + 90 : -MAP_ROTATION
}

// Direction the label text runs on screen (0 = left to right, 90 = down)
function labelScreenAngle(orientation, groupRotation) {
  return groupRotation + MAP_ROTATION + (orientation === 'tate' ? 90 : 0)
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
        // Estimate usable partition dimensions (geometryV2 knows the visible
        // size of the slot; the original geometry guesses from the bbox)
        const estW = rect.visibleSize
          ? rect.visibleSize.width - PAD * 2
          : pdata.dir === 'vertical'
            ? (bldg.width / pdata.count) - PAD * 2
            : bldg.width - PAD * 2
        const estH = rect.visibleSize
          ? rect.visibleSize.height - PAD * 2
          : pdata.dir === 'horizontal'
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
        let orientation = isTate ? 'tate' : (partOrientOverride === 'auto' ? autoOrient : partOrientOverride)
        let items = makeLabelItems(sortedBars, orientation, isTate, usableW, usableH, partFontSizeOverride)
        if (rect.visibleSize && partOrientOverride === 'auto') {
          // geometryV2 knows the real size of the slot, so "auto" can take
          // whichever of the two layouts fits the larger text
          const other = orientation === 'horizontal' ? 'vertical' : 'horizontal'
          const alt = makeLabelItems(sortedBars, other, false, usableW, usableH, partFontSizeOverride)
          if (alt[0].fontSize > items[0].fontSize) {
            orientation = other
            items = alt
          }
        }
        const groupRotation = labelBaseRotation(orientation) + partAdminRotation
        const cx = rect.visibleCenter.x + partOffsetX
        const cy = rect.visibleCenter.y + partOffsetY
        result[`${bldgId}__${rect.partIndex}`] = { cx, cy, groupRotation, screenAngle: labelScreenAngle(orientation, groupRotation), items }
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

    const groupRotation = labelBaseRotation(orientation) + adminRotation

    const items = makeLabelItems(sortedBars, orientation, isTate, usableW, usableH, fontSizeOverride)
    result[bldgId] = { cx, cy, groupRotation, screenAngle: labelScreenAngle(orientation, groupRotation), items }
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
      hoveredBuildingId.value = newId
      // Show the tooltip after a short delay, at wherever the pointer is by then
      hoverTimer = setTimeout(() => {
        hoverTimer = null
        showTooltip(newId)
      }, TOOLTIP_DELAY_MS)
    } else {
      interaction.hovered = null
      hoveredBuildingId.value = null
    }
  } else {
    followTooltip()
  }
}

function onSvgMouseLeave() {
  clearHighlight()
  hideTooltip()
  hoveredBuildingId.value = null
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

// Outline of every building (buildingId → { rings, contains }), read from the
// injected SVG once. Feeds the geometryV2 partition layout: `rings` gives the
// building's real extent, `contains` is the exact isPointInFill test used to
// keep badges and labels inside L-shaped buildings.
const buildingShapes = shallowRef(null)

function readBuildingShapes(pathsById) {
  const shapes = {}
  for (const [id, paths] of pathsById) {
    const path = paths[0]
    let rings = parsePolygonPath(path.getAttribute('d') || '')
    if (!rings) {
      // Not a plain polygon: sample the outline instead
      try {
        const len = path.getTotalLength()
        const ring = []
        for (let i = 0; i < 128; i++) {
          const pt = path.getPointAtLength(len * i / 128)
          ring.push({ x: pt.x, y: pt.y })
        }
        rings = [ring]
      } catch {
        continue
      }
    }
    const shape = { rings }
    if (typeof path.isPointInFill === 'function') {
      const probe = svgRef.value?.createSVGPoint?.()
      if (probe) {
        shape.contains = (x, y) => {
          probe.x = x
          probe.y = y
          return path.isPointInFill(probe)
        }
      }
    }
    shapes[id] = shape
  }
  return shapes
}

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
    buildingShapes.value = readBuildingShapes(buildingPaths)
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
// Zoom all the way out: the whole map, in the middle of the part of the
// container that is not covered (the pan limits put it there)
function fitToContainer() {
  const size = containerSize()
  if (!panzoomInstance || !size || !size.w || !size.h) return
  cancelZoomAnimation()
  panzoomInstance.zoomAbs(0, 0, fitScaleFor(size))
  clampToBounds()
}

function resetView() {
  userRotation.value = 0
  fitToContainer()
}

function resetZoom() {
  fitToContainer()
}

// Zoom by a factor about the middle of the container (buttons and keyboard)
function zoomAtCentre(factor) {
  const view = currentView()
  if (!view) return
  cancelZoomAnimation()
  zoomAbout({ x: view.left + view.width * view.zoom / 2, y: view.top + view.height * view.zoom / 2 }, view.scale * factor)
}

function zoomIn() {
  zoomAtCentre(1.5)
}

function zoomOut() {
  zoomAtCentre(0.67)
}

// === Screen ↔ map coordinates ===
// Everything between a map point (raw SVG coordinates, as in buildings.json)
// and the viewport: MAP_ROTATION, the viewBox origin, panzoom, the two-finger
// userRotation of .map-svg-wrap and the CSS zoom of #app. Pure math (see
// utils/mapGeometry.js), no getScreenCTM.
function currentView() {
  if (!panzoomInstance || !containerRef.value) return null
  const el = containerRef.value
  const rect = el.getBoundingClientRect()
  const { x: tx, y: ty, scale } = panzoomInstance.getTransform()
  // getBoundingClientRect is in viewport px, the layout size in the element's
  // own px: they differ by the CSS zoom on #app (1.25 on desktop)
  const zoom = el.offsetWidth ? rect.width / el.offsetWidth : 1
  return {
    mapRotation: MAP_ROTATION, mapCx: MAP_CX, mapCy: MAP_CY,
    vbMinX: VB_MIN_X, vbMinY: VB_MIN_Y,
    tx, ty, scale,
    userRotation: userRotation.value,
    width: el.clientWidth, height: el.clientHeight,
    // overflow is hidden, but focus / scrollIntoView can still scroll the container
    left: rect.left - el.scrollLeft * zoom,
    top: rect.top - el.scrollTop * zoom,
    zoom,
    // the strip under the bar drawer does not count for the pan limits
    insetRight: coveredRight.value,
  }
}

function screenToMap(clientX, clientY) {
  const view = currentView()
  return view ? screenToMapPure({ x: clientX, y: clientY }, view) : null
}

// Pan (keeping the zoom level) so a map point sits in the middle of the container
function centerOnMapPoint(x, y) {
  const view = currentView()
  if (!view) return
  const pan = panToCenter({ x, y }, view)
  panzoomInstance.moveTo(pan.x, pan.y)
}

function clampToBounds() {
  const view = currentView()
  if (!view) return
  const { x: nx, y: ny } = clampPan(view, VB_W, VB_H)
  if (Math.abs(nx - view.tx) > 0.5 || Math.abs(ny - view.ty) > 0.5) {
    panzoomInstance.moveTo(nx, ny)
  }
}

// Size of the container: layout px (what panzoom works in) and viewport px
// (they differ by the CSS zoom of #app). All zero while the map is hidden.
function containerSize() {
  const el = containerRef.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return { w: el.clientWidth, h: el.clientHeight, rw: rect.width, rh: rect.height }
}

// Zoom at which the whole map fits the uncovered part of the container (the
// lower zoom limit). In layout px, which is what panzoom scales.
function fitScaleFor(size) {
  const w = size.w - coveredRight.value
  return Math.min((w > 0 ? w : size.w) / VB_W, size.h / VB_H)
}

// The view the map opens with was picked by eye and is kept as it was: 1.5x
// the zoom at which the map fits the container, with OPENING_POINT (viewBox
// px, around bldg-5) in the middle. On desktop that was always measured in
// viewport px, so the CSS zoom of #app is part of it: the map opens that much
// larger and the point sits that much further right and down. The bar labels
// appear at twice this zoom (baseFitScale).
const OPENING_POINT = { x: 1679.29, y: 2495.3 }
function openingScaleFor(size) {
  return Math.min(size.rw / VB_W, size.rh / VB_H) * 1.5
}

// The container size the current pan / zoom limits were worked out for
let fittedSize = null
// The injected SVG is in the DOM and panzoom may be set up
let initDue = false

// whenReady(): resolves true once panzoom is set up, false if the map is
// hidden before that happens (it cannot be measured while hidden).
let mapReady = false
let readyWaiters = []
function whenReady() {
  if (mapReady) return Promise.resolve(true)
  if (!props.active) return Promise.resolve(false)
  return new Promise(resolve => readyWaiters.push(resolve))
}
function settleReady(value) {
  const waiters = readyWaiters
  readyWaiters = []
  for (const resolve of waiters) resolve(value)
}

function initPanzoom() {
  initDue = true
  if (!svgRef.value || !containerRef.value) return
  const size = containerSize()
  // Hidden (another view is shown): set up on the next show instead
  if (!size.rw || !size.rh) return
  if (panzoomInstance) panzoomInstance.dispose()
  const fitScale = fitScaleFor(size)
  panzoomInstance = panzoom(svgRef.value, {
    maxZoom: 8,
    minZoom: fitScaleFor(size),
    smoothScroll: false,
    // panzoom keeps the transform, but measures the pointer in viewport px and
    // knows nothing about the CSS zoom of #app or the rotation of
    // .map-svg-wrap. So every input is handled here instead (see Gestures):
    // returning true makes panzoom leave the event alone (touches and
    // double-clicks never reach it). It keeps the arrow keys.
    beforeMouseDown: startMouseDrag,
    beforeWheel: zoomWithWheel,
    filterKey: (e, dx, dy, dz) => dz !== 0,
  })
  panzoomInstance.on('zoom', clampToBounds)
  panzoomInstance.on('zoom', () => { currentZoom.value = panzoomInstance.getTransform().scale })
  const scale = openingScaleFor(size)
  panzoomInstance.zoomAbs(0, 0, scale)
  // Open on OPENING_POINT, as near as the pan limits allow, so that the first
  // drag or zoom does not make the map jump
  panzoomInstance.moveTo(size.rw / 2 - (OPENING_POINT.x - VB_MIN_X) * scale, size.rh / 2 - (OPENING_POINT.y - VB_MIN_Y) * scale)
  clampToBounds()
  currentZoom.value = panzoomInstance.getTransform().scale
  baseFitScale.value = scale
  fittedSize = size
  mapReady = true
  settleReady(true)
}

// The container changed size (window resize, phone rotation, or either of
// those while the map was hidden): keep the zoom and the map point that was in
// the middle, and bring the zoom / pan limits in line with the new size.
function refitToContainer() {
  const size = containerSize()
  if (!size || !size.rw || !size.rh) return
  if (!panzoomInstance) {
    if (initDue) initPanzoom()
    return
  }
  const prev = fittedSize
  if (prev && Math.abs(prev.w - size.w) < 0.5 && Math.abs(prev.h - size.h) < 0.5 &&
      Math.abs(prev.rw - size.rw) < 0.5 && Math.abs(prev.rh - size.rh) < 0.5) return
  const view = currentView()
  // Map point at the middle of the container as it was before the change
  const centre = screenToMapPure(
    { x: prev.w / 2, y: prev.h / 2 },
    { ...view, width: prev.w, height: prev.h, left: 0, top: 0, zoom: 1 },
  )
  baseFitScale.value = openingScaleFor(size)
  fittedSize = size
  applyZoomLimit(size)
  centerOnMapPoint(centre.x, centre.y)
  clampToBounds()
}

// Bring the lower zoom limit in line with the container (and the drawer)
function applyZoomLimit(size) {
  const fitScale = fitScaleFor(size)
  panzoomInstance.setMinZoom(fitScale)
  if (panzoomInstance.getTransform().scale < fitScale) panzoomInstance.zoomAbs(0, 0, fitScale)
}

// The drawer came or went (admin mode): the limits moved with it
watch(coveredRight, () => {
  const size = containerSize()
  if (!panzoomInstance || !size || !size.rw || !size.rh) return
  applyZoomLimit(size)
  clampToBounds()
})

let resizeObserver = null
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  // Also fires when the map is shown again after being hidden
  resizeObserver = new ResizeObserver(() => refitToContainer())
  resizeObserver.observe(containerRef.value)
})
onUnmounted(() => resizeObserver?.disconnect())

function onKeyDown(e) {
  if (!props.active) return
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
  if (!userSvgPos.value) return
  centerOnMapPoint(userSvgPos.value.x, userSvgPos.value.y)
}

function startGeoTracking() {
  if (!navigator.geolocation) {
    geoError.value = t('geoUnsupported')
    return
  }
  geoWatching.value = true
  geoError.value = null
  watchGeoPosition(true)
}

function watchGeoPosition(panOnFirstFix) {
  let firstFix = panOnFirstFix
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
      geoWatchId = null
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

// === Hidden / shown ===
// While another view is shown the map stays mounted (so zoom and position
// survive) but must not do anything: no hover or tooltip left behind, no
// position updates, no drag in progress. Keyboard zoom checks props.active.
watch(() => props.active, (active) => {
  if (active) {
    // Location tracking the user had switched on carries on (without re-centring)
    if (geoWatching.value && geoWatchId === null) watchGeoPosition(false)
    return
  }
  clearHighlight()
  hideTooltip()
  hoveredBuildingId.value = null
  cancelGestures()
  if (draggingAnnotation) onAnnotationDragEnd()
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId)
    geoWatchId = null
  }
  // Nothing can be measured until the map is shown again
  if (!mapReady) settleReady(false)
})

onUnmounted(() => {
  cancelGestures()
  if (panzoomInstance) panzoomInstance.dispose()
  hideTooltip()
  hoveredBuildingId.value = null
  settleReady(false)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onAnnotationDrag)
  window.removeEventListener('mouseup', onAnnotationDragEnd)
  if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId)
})

function panToBuilding(buildingId) {
  if (!svgRef.value || !panzoomInstance || !containerRef.value) return
  const el = buildingEl(buildingId)
  if (!el) return

  // Keep the current zoom level, just centre on the building's bbox (map coordinates)
  const bbox = el.getBBox()
  centerOnMapPoint(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2)

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

  // Where on the label (in map coordinates) it was grabbed
  const mapPt = screenToMap(e.clientX, e.clientY)
  if (!mapPt) return
  dragOffset = { x: mapPt.x - ann.x, y: mapPt.y - ann.y }

  // Pause panzoom during drag
  if (panzoomInstance) panzoomInstance.pause()

  window.addEventListener('mousemove', onAnnotationDrag)
  window.addEventListener('mouseup', onAnnotationDragEnd)
}

function onAnnotationDrag(e) {
  if (!draggingAnnotation) return
  const mapPt = screenToMap(e.clientX, e.clientY)
  const ann = annotations.value.find(a => a.id === draggingAnnotation)
  if (mapPt && ann) {
    ann.x = Math.round(mapPt.x - dragOffset.x)
    ann.y = Math.round(mapPt.y - dragOffset.y)
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
  return computePartitionGeometry(props.partitions, buildingMap, barById.value, MAP_ROTATION, buildingShapes.value)
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

// Find which partition was clicked (map coordinates). Uses the same rects the
// overlay draws, so the hit-test always agrees with what is on screen.
function findClickedPartition(buildingId, svgX, svgY) {
  return findPartitionAt(partitionGeometry.value[buildingId], svgX, svgY)
}

// Map coordinates of a mouse / touch event
function getSvgPoint(e) {
  return screenToMap(e.clientX, e.clientY)
}

// === Gestures ===
// Touch is handled here, not by panzoom: panzoom measures a touch against the
// bounding box of .map-svg-wrap, which is wrong as soon as the wrap is rotated,
// and it cannot rotate. One handler owns one- and two-finger touches, so drag,
// pinch and twist compose. They all work the same way: the map point under the
// finger (or between the two fingers) when the gesture starts is kept under
// the finger(s) as they move, at whatever zoom and rotation the fingers ask
// for. The mouse works the same way (drag, wheel, double-click), and so do the
// zoom buttons and keys, so there is one implementation, correct at any
// rotation and under the CSS zoom of #app. panzoom only holds the transform.
const TAP_MAX_MOVE = 8      // viewport px a finger may travel and still be a tap
const TAP_MAX_MS = 300
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_MAX_DIST = 30
const DRAG_MIN_MOVE = 5     // viewport px after which a mouse press is a drag, not a click
const DOUBLE_CLICK_ZOOM = 1.5 // zoom factor of a double-click / double-tap
const ROTATION_SNAP_DEG = 6 // a twist that ends this close to straight snaps back to it

// Put the map point `anchor` under the viewport point `at` with the given zoom
// and rotation, within the pan limits. Returns true when the limits held it back.
function moveAnchorTo(anchor, at, scale, rotation) {
  if (rotation !== userRotation.value) userRotation.value = rotation
  if (Math.abs(scale - panzoomInstance.getTransform().scale) > 1e-9) panzoomInstance.zoomAbs(0, 0, scale)
  const view = currentView()
  const want = panToPoint(anchor, at, view)
  const pan = clampPan({ ...view, tx: want.x, ty: want.y }, VB_W, VB_H)
  panzoomInstance.moveTo(pan.x, pan.y)
  return Math.abs(pan.x - want.x) > 0.5 || Math.abs(pan.y - want.y) > 0.5
}

// Zoom to `scale` (kept within the zoom limits), holding the map point that is
// under the viewport point `at` where it is
function zoomAbout(at, scale) {
  const anchor = screenToMap(at.x, at.y)
  if (!anchor) return
  const limited = Math.min(panzoomInstance.getMaxZoom(), Math.max(panzoomInstance.getMinZoom(), scale))
  moveAnchorTo(anchor, at, limited, userRotation.value)
}

// Double-click / double-tap: the same, eased over a few frames. Any other
// input takes over from it.
const ZOOM_ANIMATION_MS = 400
let zoomAnimation = null

function animateZoomAbout(at, factor) {
  cancelZoomAnimation()
  const anchor = screenToMap(at.x, at.y)
  if (!anchor) return
  const from = panzoomInstance.getTransform().scale
  const to = Math.min(panzoomInstance.getMaxZoom(), Math.max(panzoomInstance.getMinZoom(), from * factor))
  if (to === from) return
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, Math.max(0, (now - start) / ZOOM_ANIMATION_MS))
    const eased = 1 - (1 - t) ** 3
    moveAnchorTo(anchor, at, from + (to - from) * eased, userRotation.value)
    zoomAnimation = t < 1 ? requestAnimationFrame(step) : null
  }
  zoomAnimation = requestAnimationFrame(step)
}

function cancelZoomAnimation() {
  if (zoomAnimation !== null) cancelAnimationFrame(zoomAnimation)
  zoomAnimation = null
}

// The touch gesture in progress: { ids, target, startX, startY, startTime,
// moved, multi, anchor, at, scale, distance, angle }
let gesture = null
let lastTap = null

// The (at most two) fingers of the gesture that are still down, as viewport points
function gesturePoints(e) {
  const points = []
  for (const id of gesture.ids) {
    for (const t of e.touches) {
      if (t.identifier === id) points.push({ x: t.clientX, y: t.clientY })
    }
  }
  return points
}

function spanOf(points) {
  return points.length === 2
    ? touchSpan(points[0], points[1])
    : { x: points[0].x, y: points[0].y, distance: 0, angle: 0 }
}

// (Re)start measuring from the fingers that are down now: called whenever a
// finger lands or lifts, so the map does not jump when the finger count changes
function rebaseGesture(points) {
  const span = spanOf(points)
  gesture.at = { x: span.x, y: span.y }
  gesture.anchor = screenToMap(span.x, span.y)
  gesture.scale = panzoomInstance.getTransform().scale
  gesture.distance = span.distance
  gesture.angle = span.angle
}

function onTouchStart(e) {
  if (!panzoomInstance || !props.active) return
  // Only touches on the map itself; the buttons and the toolbar keep theirs
  if (e.target !== containerRef.value && !wrapRef.value.contains(e.target)) return
  // Keep the touch from panzoom, and from scrolling / zooming the page or
  // turning into a synthetic click
  e.stopPropagation()
  if (e.cancelable) e.preventDefault()
  cancelZoomAnimation()
  if (!gesture) {
    const t = e.changedTouches[0]
    gesture = { ids: [], target: e.target, startX: t.clientX, startY: t.clientY, startTime: Date.now(), moved: 0, multi: false }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchEnd)
  }
  // Forget fingers whose end was never seen, then take up to two
  const down = [...e.touches].map(t => t.identifier)
  gesture.ids = gesture.ids.filter(id => down.includes(id))
  for (const t of e.changedTouches) {
    if (gesture.ids.length < 2 && !gesture.ids.includes(t.identifier)) gesture.ids.push(t.identifier)
  }
  if (gesture.ids.length > 1) gesture.multi = true
  rebaseGesture(gesturePoints(e))
}

function onTouchMove(e) {
  if (!gesture) return
  const points = gesturePoints(e)
  if (!points.length || !gesture.anchor) return
  if (e.cancelable) e.preventDefault()
  const span = spanOf(points)
  gesture.at = { x: span.x, y: span.y }
  if (points.length === 1) {
    gesture.moved = Math.max(gesture.moved, Math.hypot(span.x - gesture.startX, span.y - gesture.startY))
    const held = moveAnchorTo(gesture.anchor, gesture.at, gesture.scale, userRotation.value)
    // At the edge of the map, let go of the anchor so that dragging back
    // moves the map straight away
    if (held) gesture.anchor = screenToMap(span.x, span.y)
    return
  }
  // Twist: by how much the line between the fingers has turned since the last move
  const rotation = normalizeAngle(userRotation.value + normalizeAngle(span.angle - gesture.angle))
  gesture.angle = span.angle
  const scale = pinchScale(gesture.scale, gesture.distance, span.distance,
    panzoomInstance.getMinZoom(), panzoomInstance.getMaxZoom())
  moveAnchorTo(gesture.anchor, gesture.at, scale, rotation)
}

function onTouchEnd(e) {
  if (!gesture) return
  const points = gesturePoints(e)
  const down = [...e.touches].map(t => t.identifier)
  gesture.ids = gesture.ids.filter(id => down.includes(id))
  if (points.length) {
    // One of two fingers lifted: carry on as a drag with the other
    rebaseGesture(points)
    return
  }
  const g = endGesture()
  if (e.type === 'touchcancel' || g.multi || g.moved >= TAP_MAX_MOVE || Date.now() - g.startTime >= TAP_MAX_MS) return
  // A tap (the touch never becomes a click, see onTouchStart)
  const t = e.changedTouches[0]
  const now = Date.now()
  if (lastTap && now - lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < DOUBLE_TAP_MAX_DIST) {
    lastTap = null
    animateZoomAbout({ x: t.clientX, y: t.clientY }, DOUBLE_CLICK_ZOOM)
  } else {
    lastTap = { time: now, x: t.clientX, y: t.clientY }
  }
  handleMapClick({ target: g.target, clientX: t.clientX, clientY: t.clientY })
}

// Stop following the fingers and settle the view
function endGesture() {
  const g = gesture
  gesture = null
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  document.removeEventListener('touchcancel', onTouchEnd)
  // The pan limits were applied on every move, so there is nothing to settle
  // but the rotation (and a plain tap leaves the view exactly as it was)
  if (g && g.multi && g.anchor && panzoomInstance) {
    const settled = snapRotation(userRotation.value, ROTATION_SNAP_DEG)
    if (settled !== userRotation.value) {
      moveAnchorTo(g.anchor, g.at, panzoomInstance.getTransform().scale, settled)
    }
  }
  return g
}

// --- Mouse (panzoom's beforeMouseDown / beforeWheel: returning true makes
// panzoom leave the event alone) ---
let mouseDrag = null

function startMouseDrag(e) {
  if (e.button !== 0) return true
  cancelZoomAnimation()
  const anchor = screenToMap(e.clientX, e.clientY)
  if (!anchor) return true
  e.preventDefault() // no text selection while dragging
  // ...which also keeps the click from focusing the map, and the arrow keys need that
  wrapRef.value?.focus({ preventScroll: true })
  mouseDrag = { anchor }
  window.addEventListener('mousemove', onMouseDrag)
  window.addEventListener('mouseup', endMouseDrag)
  return true
}

function onMouseDrag(e) {
  if (!mouseDrag || !panzoomInstance) return
  const scale = panzoomInstance.getTransform().scale
  const held = moveAnchorTo(mouseDrag.anchor, { x: e.clientX, y: e.clientY }, scale, userRotation.value)
  // At the edge of the map, let go of the anchor (as for a finger)
  if (held) mouseDrag.anchor = screenToMap(e.clientX, e.clientY)
}

function endMouseDrag() {
  mouseDrag = null
  window.removeEventListener('mousemove', onMouseDrag)
  window.removeEventListener('mouseup', endMouseDrag)
}

function zoomWithWheel(e) {
  if (!currentView()) return true
  // Same step per wheel notch as panzoom, about the point under the pointer
  const factor = wheelZoomFactor(e.deltaY, e.deltaMode)
  if (factor !== 1) {
    cancelZoomAnimation()
    zoomAbout({ x: e.clientX, y: e.clientY }, panzoomInstance.getTransform().scale * factor)
    e.preventDefault()
  }
  return true
}

function onDoubleClick(e) {
  if (!panzoomInstance || !props.active || e.button !== 0) return
  // Only on the map itself (as for touches), and never panzoom's own zoom
  if (e.target !== containerRef.value && !wrapRef.value.contains(e.target)) return
  e.stopPropagation()
  animateZoomAbout({ x: e.clientX, y: e.clientY }, DOUBLE_CLICK_ZOOM)
}

// --- A mouse press that turns into a drag must not end in a click ---
let mousePress = null
let mouseDragged = false

function onSvgMouseDown(e) {
  mousePress = { x: e.clientX, y: e.clientY }
  mouseDragged = false
  window.addEventListener('mousemove', trackMousePress)
  window.addEventListener('mouseup', endMousePress)
}

function trackMousePress(e) {
  if (mousePress && Math.hypot(e.clientX - mousePress.x, e.clientY - mousePress.y) >= DRAG_MIN_MOVE) mouseDragged = true
}

function endMousePress() {
  mousePress = null
  window.removeEventListener('mousemove', trackMousePress)
  window.removeEventListener('mouseup', endMousePress)
}

function onSvgClick(e) {
  // mouseDragged is still set here: the click comes right after the mouseup
  if (mouseDragged) {
    mouseDragged = false
    return
  }
  handleMapClick(e)
}

// Drop whatever touch or mouse gesture is in progress (the map is being hidden or removed)
function cancelGestures() {
  if (gesture) endGesture()
  cancelZoomAnimation()
  endMouseDrag()
  endMousePress()
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

defineExpose({ resetZoom, resetView, unplacedBars, panToBuilding, whenReady, clearSelection: () => setSelectedBuilding(null) })
</script>

<template>
  <div
    class="map-container"
    ref="containerRef"
    @touchstart.capture="onTouchStart"
    @dblclick.capture="onDoubleClick"
  >
    <div class="map-svg-wrap" ref="wrapRef" :style="mapRotateStyle">
    <svg
      ref="svgRef"
      :viewBox="`${VB_MIN_X} ${VB_MIN_Y} ${VB_W} ${VB_H}`"
      :width="VB_W"
      :height="VB_H"
      :class="['golden-gai-svg', { 'placing-mode': adminMode && placingBar }]"
      @mousedown="onSvgMouseDown"
      @click="onSvgClick"
      @mousemove="onSvgMouseMove"
      @mouseleave="onSvgMouseLeave"
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
        <MapLabels v-if="showLabels" :labels="buildingLabelData" :turn="labelTurn" />
      </Transition>

      <!-- Bar count badges: always shown when zoomed out -->
      <MapBadges v-if="!showLabels" :badges="buildingBarCountBadges" :rotation="-MAP_ROTATION - userRotation" />

      <!-- Annotations -->
      <MapAnnotations
        :annotations="annotations"
        :admin-mode="adminMode"
        :selected-id="selectedAnnotation"
        :lang="lang"
        :map-rotation="MAP_ROTATION"
        :turn="labelTurn"
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

    <div v-if="!isMobile" class="map-controls" :style="{ right: `${coveredRight + 8}px` }">
      <WinButton class="zoom-btn" :title="t('zoomIn')" @click="zoomIn">+</WinButton>
      <WinButton class="zoom-btn" :title="t('zoomOut')" @click="zoomOut">&minus;</WinButton>
      <WinButton class="zoom-btn" :title="t('fitToView')" @click="resetZoom">&#x27F3;</WinButton>
      <WinButton v-if="adminMode" class="zoom-btn" :title="t('annAddLabel')" @click="addAnnotation">Aa+</WinButton>
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
          :placeholder="t('annTextEn')"
        />
      </label>
      <label class="ann-field">
        <span>JP</span>
        <input
          type="text"
          :value="selectedAnn.text_jp || ''"
          @input="updateAnnotation(selectedAnn.id, 'text_jp', $event.target.value)"
          class="ann-input"
          :placeholder="t('annTextJp')"
        />
      </label>
      <label class="ann-field">
        <span>{{ t('annSize') }}</span>
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
        <span>{{ t('annRotation') }}</span>
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
        :title="t('annColor')"
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
        <span>{{ t('annIcon') }}</span>
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
  /* every touch on the map is a map gesture (see onTouchStart) */
  touch-action: none;
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
