<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import panzoom from 'panzoom'
import WinButton from './win2000/WinButton.vue'
import mapSvgUrl from '../assets/map.svg?url'
import buildings from '../data/buildings.json'
import {
  fetchAnnotations,
  createAnnotation as apiCreateAnnotation,
  updateAnnotation as apiUpdateAnnotation,
  deleteAnnotation as apiDeleteAnnotation,
} from '../api/index.js'

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
})

const emit = defineEmits(['selectBuilding', 'placeBar', 'selectBuildingForEdit', 'selectPartitionBar'])

const containerRef = ref(null)
const svgRef = ref(null)
const mapContent = ref('')
let panzoomInstance = null

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

// Whether any filter is active (includes floor filter)
const hasActiveFilters = computed(() => {
  return (props.activeTags && props.activeTags.length > 0) ||
    props.chargeMin != null || props.chargeMax != null ||
    props.drinkMin != null || props.drinkMax != null ||
    props.floorFilter != null ||
    props.openNowFilter
})

// Whether floor filter is active (separate from tag/price filters)
const hasFloorFilter = computed(() => props.floorFilter != null)

function barPassesFilters(bar) {
  // Floor filter: exclude bars not on the selected floor
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

// Floor color system — two variants per floor (primary, lighter)
const FLOOR_COLORS = {
  '-3': ['#0f2040', '#1e3a5f'],
  '-2': ['#2a1845', '#3d2a6a'],
  '-1': ['#1a3868', '#2a508a'],
   1:  ['#934400', '#b85800'],
   2:  ['#005559', '#007a70'],
   3:  ['#4a6030', '#607840'],
   4:  ['#7a2050', '#9a3070'],
   5:  ['#5a3020', '#7a4838'],
}

function floorColors(floor) {
  return FLOOR_COLORS[floor] ?? FLOOR_COLORS[1]
}

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

// Buildings that match active filters (tags + price)
const buildingsMatchingTags = computed(() => {
  if (!hasActiveFilters.value) return null // null = no filter active
  const matching = new Set()
  for (const [buildingId, barsInBldg] of Object.entries(barsByBuilding.value)) {
    if (barsInBldg.some(barPassesFilters)) matching.add(buildingId)
  }
  return matching
})

// Individual bar IDs that pass filters (for partition-level dimming)
// Uses String() to match partition barIds which come from <select> (always strings)
const barsMatchingFilters = computed(() => {
  if (!hasActiveFilters.value) return null
  const matching = new Set()
  for (const bar of props.bars) {
    if (barPassesFilters(bar)) matching.add(String(bar.id))
  }
  return matching
})

const unplacedBars = computed(() => {
  return props.bars.filter(b => !b.building_id)
})

// Return the primary floor color for a bar (used in tooltip swatch)
function barFloorPrimaryColor(bar) {
  return floorColors(bar.floor ?? 1)[0]
}

// Hover tooltip state
const hoveredBuilding = ref(null)
const tooltip = ref({ visible: false, x: 0, y: 0, bars: [] })
let hoverTimer = null

// Tooltip bars grouped by floor, sorted descending
const tooltipFloorGroups = computed(() => {
  const groups = {}
  for (const bar of tooltip.value.bars) {
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

function showTooltip(buildingId, mouseEvent) {
  const barsInBuilding = barsByBuilding.value[buildingId]
  if (!barsInBuilding || barsInBuilding.length === 0) return

  const barsToShow = hasActiveFilters.value
    ? barsInBuilding.filter(barPassesFilters)
    : barsInBuilding
  if (barsToShow.length === 0) return

  const rect = containerRef.value.getBoundingClientRect()
  tooltip.value = {
    visible: true,
    x: mouseEvent.clientX - rect.left + 12,
    y: mouseEvent.clientY - rect.top - 8,
    bars: barsToShow,
  }
}

function hideTooltip() {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
  tooltip.value = { visible: false, x: 0, y: 0, bars: [] }
}

function resolveBuilding(e) {
  // Direct path click
  const path = e.target.closest('path[id^="bldg-"]')
  if (path) return { id: path.id, el: path }
  // Partition rect click — get building ID from data attribute
  const partEl = e.target.closest('[data-partition-building]')
  if (partEl) {
    const bldgId = partEl.dataset.partitionBuilding
    const el = svgRef.value && svgRef.value.querySelector(`#${CSS.escape(bldgId)}`)
    return { id: bldgId, el }
  }
  return { id: null, el: null }
}

function onSvgMouseMove(e) {
  if (props.adminMode && props.placingBar) {
    const { id: newId, el: target } = resolveBuilding(e)
    if (newId !== hoveredBuilding.value) {
      clearHighlight()
      hoveredBuilding.value = newId
      if (target) {
        target.classList.add('building-hover')
      }
    }
    return
  }
  // Normal mode: highlight buildings with bars
  const { id: newId, el: target } = resolveBuilding(e)
  if (newId !== hoveredBuilding.value) {
    clearHighlight()
    hideTooltip()
    if (newId && buildingsWithBars.value.has(newId)) {
      hoveredBuilding.value = newId
      if (target) target.classList.add('building-hover')
      // Start 0.5s timer for tooltip
      hoverTimer = setTimeout(() => {
        showTooltip(newId, e)
      }, 500)
    } else {
      hoveredBuilding.value = null
    }
  }
}

function onSvgMouseLeave() {
  clearHighlight()
  hideTooltip()
}

function clearHighlight() {
  if (hoveredBuilding.value && svgRef.value) {
    const el = svgRef.value.querySelector(`#${hoveredBuilding.value}`)
    if (el) el.classList.remove('building-hover')
  }
  hoveredBuilding.value = null
}

const COUNT_CLASSES = ['has-bars-1', 'has-bars-2', 'has-bars-3', 'has-bars-4', 'has-bars-5plus']

// Color buildings based on bar count; dim those with no filter matches
function updateBuildingColors() {
  if (!svgRef.value) return
  const paths = svgRef.value.querySelectorAll('path[id^="bldg-"]')
  const tagFilter = buildingsMatchingTags.value
  const searchHL = props.searchHighlighted

  for (const path of paths) {
    // Search highlighting
    if (searchHL.size > 0 && searchHL.has(path.id)) {
      path.classList.add('search-highlight')
    } else {
      path.classList.remove('search-highlight')
    }

    const barsInBldg = barsByBuilding.value[path.id]
    if (barsInBldg && barsInBldg.length > 0) {
      // Base class (cursor, stroke-width) + count-based color class
      path.classList.add('has-bars')
      path.classList.remove(...COUNT_CLASSES)
      const countClass = barsInBldg.length <= 4
        ? `has-bars-${barsInBldg.length}`
        : 'has-bars-5plus'
      path.classList.add(countClass)

      // Dim if filters active and no bar in this building matches
      if (tagFilter !== null && !tagFilter.has(path.id)) {
        path.classList.add('tag-dimmed')
      } else {
        path.classList.remove('tag-dimmed')
      }
    } else {
      path.classList.remove('has-bars', ...COUNT_CLASSES, 'tag-dimmed')
    }
  }
}

// Panzoom
function fitToContainer() {
  if (!containerRef.value || !svgRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const scaleX = rect.width / VB_W
  const scaleY = rect.height / VB_H
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (rect.width - VB_W * scale) / 2
  const offsetY = (rect.height - VB_H * scale) / 2
  if (panzoomInstance) {
    panzoomInstance.zoomAbs(0, 0, scale)
    panzoomInstance.moveTo(offsetX, offsetY)
  }
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

function initPanzoom() {
  if (panzoomInstance) panzoomInstance.dispose()
  if (!svgRef.value) return
  panzoomInstance = panzoom(svgRef.value, {
    maxZoom: 8,
    minZoom: 0.05,
    smoothScroll: false,
    zoomDoubleClickSpeed: 1.5,
  })
  fitToContainer()
  // Delay color update to ensure SVG is rendered
  setTimeout(updateBuildingColors, 100)
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

// Re-color buildings when bars data or tag filters change
watch(buildingsWithBars, () => {
  setTimeout(updateBuildingColors, 50)
})

watch(buildingsMatchingTags, () => {
  setTimeout(updateBuildingColors, 50)
})

watch(() => props.searchHighlighted, () => {
  setTimeout(updateBuildingColors, 50)
})

watch(() => props.floorFilter, () => {
  setTimeout(updateBuildingColors, 50)
})

watch(() => props.activeTags, () => {
  setTimeout(updateBuildingColors, 50)
})

watch(() => [props.chargeMin, props.chargeMax, props.drinkMin, props.drinkMax, props.openNowFilter], () => {
  setTimeout(updateBuildingColors, 50)
})

onUnmounted(() => {
  if (panzoomInstance) panzoomInstance.dispose()
  hideTooltip()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onAnnotationDrag)
  window.removeEventListener('mouseup', onAnnotationDragEnd)
})

function panToBuilding(buildingId) {
  if (!svgRef.value || !panzoomInstance || !containerRef.value) return
  const el = svgRef.value.querySelector(`[id="${buildingId}"]`)
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

function annotationText(ann) {
  if (props.lang === 'jp' && ann.text_jp) return ann.text_jp
  return ann.text_en || ''
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

// === Partition rendering ===
// Set of building IDs that have partitions (to skip CSS-based dimming on path)
const partitionedBuildings = computed(() => {
  const s = new Set()
  for (const [bldgId, data] of Object.entries(props.partitions)) {
    if (data.partitions && data.partitions.length > 0) s.add(bldgId)
  }
  return s
})

// Display rule: should this bar's slot be visible?
function slotShouldShow(bar) {
  if (!bar) return false
  if (!hasActiveFilters.value) return (bar.floor ?? 1) === 1
  return barPassesFilters(bar)
}

const partitionRects = computed(() => {
  const result = {}
  const searchSet = props.searchHighlightedBars

  for (const [bldgId, data] of Object.entries(props.partitions)) {
    const bldg = buildingMap[bldgId]
    if (!bldg || !data.partitions || data.partitions.length === 0) continue

    const { minX, minY, maxX, maxY, width, height } = bldg
    const count = data.partitions.length
    // 3 partitions always stack horizontally for better visibility
    const dir = count === 3 ? 'horizontal'
      : data.splitDirection === 'auto'
        ? (width > height ? 'vertical' : 'horizontal')
        : data.splitDirection
    const angle = data.splitAngle || 0
    // Adjustable center point (percentage 0-100, default 50)
    const splitX = minX + (maxX - minX) * ((data.splitCenterX ?? 50) / 100)
    const splitY = minY + (maxY - minY) * ((data.splitCenterY ?? 50) / 100)
    // Extend beyond bounding box to ensure full coverage after rotation
    const pad = Math.max(width, height) * 2

    // Weighted partition sizes
    const weights = data.partitions.map(p => p.weight || 1)
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    // Pre-compute floor variant indices for this building
    // (first bar on a given floor → primary color, second → variant, etc.)
    const floorVariantCounter = {}
    const barVariantIndexMap = {}
    for (const p of data.partitions) {
      const barId = p.barId ? String(p.barId) : null
      if (!barId) continue
      const bar = barById.value[barId]
      if (!bar) continue
      const floor = bar.floor ?? 1
      if (floorVariantCounter[floor] === undefined) floorVariantCounter[floor] = 0
      barVariantIndexMap[barId] = floorVariantCounter[floor] % 2
      floorVariantCounter[floor]++
    }

    const rects = data.partitions.map((p, i) => {
      const barId = p.barId ? String(p.barId) : null
      const bar = barId ? barById.value[barId] : null

      // Visibility: dimmed when no bar or slot should not show
      const dimmed = !slotShouldShow(bar)

      // Search highlight
      const highlighted = searchSet.size > 0 && barId ? searchSet.has(barId) : false

      let x, y, w, h
      if (count === 4) {
        // 2x2 grid — split at adjustable center
        const col = i % 2
        const row = Math.floor(i / 2)
        x = col === 0 ? splitX - pad : splitX
        y = row === 0 ? splitY - pad : splitY
        w = pad
        h = pad
      } else if (dir === 'vertical') {
        const totalPad = pad * 2
        const weightBefore = weights.slice(0, i).reduce((a, b) => a + b, 0)
        const sliceStart = totalPad * weightBefore / totalWeight
        const sliceW = totalPad * weights[i] / totalWeight
        x = splitX - pad + sliceStart
        y = splitY - pad
        w = sliceW
        h = pad * 2
      } else {
        const totalPad = pad * 2
        const weightBefore = weights.slice(0, i).reduce((a, b) => a + b, 0)
        const sliceStart = totalPad * weightBefore / totalWeight
        const sliceH = totalPad * weights[i] / totalWeight
        x = splitX - pad
        y = splitY - pad + sliceStart
        w = pad * 2
        h = sliceH
      }

      // Derive color from bar's floor
      const floor = bar ? (bar.floor ?? 1) : 1
      const variantIdx = barId && barVariantIndexMap[barId] !== undefined ? barVariantIndexMap[barId] : 0
      const colors = floorColors(floor)
      const color = colors[variantIdx] || colors[0]

      return {
        x, y, width: w, height: h,
        color, dimmed, highlighted,
        barId, partIndex: i,
      }
    })
    result[bldgId] = { rects, angle, cx: splitX, cy: splitY }
  }
  return result
})

// Find which partition was clicked by checking SVG coordinates
function findClickedPartition(buildingId, svgX, svgY) {
  const pdata = partitionRects.value[buildingId]
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
  if (!buildingId) return

  if (props.adminMode && props.placingBar) {
    emit('placeBar', { bar: props.placingBar, buildingId })
    clearHighlight()
    return
  }

  if (props.adminMode) {
    emit('selectBuildingForEdit', buildingId)
  }

  // Show all bars in the building (opens drawer)
  const barsInBuilding = barsByBuilding.value[buildingId]
  if (barsInBuilding && barsInBuilding.length > 0) {
    emit('selectBuilding', { buildingId, bars: barsInBuilding })
  }
}

defineExpose({ resetZoom, unplacedBars, panToBuilding })
</script>

<template>
  <div class="map-container" ref="containerRef">
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
      <g v-html="mapContent" class="map-bg" />

      <!-- Annotations -->
      <g class="annotations">
        <text
          v-for="ann in annotations"
          :key="ann.id"
          :x="ann.x"
          :y="ann.y"
          :fill="ann.color"
          :font-size="ann.font_size"
          :transform="ann.rotation ? `rotate(${ann.rotation}, ${ann.x}, ${ann.y})` : undefined"
          text-anchor="middle"
          font-family="var(--win-font), monospace"
          font-weight="bold"
          :class="['annotation-text', { 'annotation-admin': adminMode, 'annotation-selected': selectedAnnotation === ann.id }]"
          :style="adminMode ? 'cursor: grab' : 'pointer-events: none'"
          @mousedown="onAnnotationMouseDown($event, ann)"
        >{{ annotationText(ann) }}</text>
      </g>
      </g><!-- close rotation group -->
    </svg>

    <!-- Hover tooltip -->
    <div
      v-if="tooltip.visible"
      class="map-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <template v-for="group in tooltipFloorGroups" :key="group.floor">
        <div v-if="tooltipFloorGroups.length > 1" class="tooltip-floor-header">{{ group.floorLabel }}</div>
        <div v-for="bar in group.bars" :key="bar.id" class="tooltip-bar">
          <span
            class="tooltip-color-swatch"
            :style="{ background: barFloorPrimaryColor(bar) }"
          ></span>
          <img
            v-if="bar.photo"
            :src="`/uploads/${bar.photo}`"
            :alt="lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)"
            class="tooltip-img"
          />
          <div class="tooltip-info">
            <div class="tooltip-name">{{ lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp) }}</div>
            <div v-if="bar.name_en && bar.name_jp" class="tooltip-sub">{{ lang === 'jp' ? bar.name_en : bar.name_jp }}</div>
          </div>
        </div>
      </template>
    </div>

    <div class="map-controls">
      <WinButton class="zoom-btn" title="Zoom in" @click="zoomIn">+</WinButton>
      <WinButton class="zoom-btn" title="Zoom out" @click="zoomOut">&minus;</WinButton>
      <WinButton class="zoom-btn" title="Fit to view" @click="resetZoom">&#x27F3;</WinButton>
      <WinButton v-if="adminMode" class="zoom-btn" title="Add label" @click="addAnnotation">Aa+</WinButton>
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
        type="color"
        :value="selectedAnn.color"
        @input="updateAnnotation(selectedAnn.id, 'color', $event.target.value)"
        class="ann-color"
        title="Color"
      />
      <WinButton small @click="deleteAnnotation(selectedAnn.id)">&#10005;</WinButton>
    </div>

    <div v-if="unplacedBars.length > 0 && adminMode" class="unplaced-badge">
      {{ unplacedBars.length }} unplaced
    </div>
  </div>
</template>

<style scoped>
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

/* Buildings with bars — base class (cursor + stroke-width only) */
.golden-gai-svg :deep(#BUILDINGS path.has-bars) {
  stroke-width: 1.8 !important;
  cursor: pointer;
}

/* Count-based fill colors: 1 bar = orange, 2 = teal, 3 = olive, 4 = wine, 5+ = brown */
.golden-gai-svg :deep(#BUILDINGS path.has-bars-1) {
  fill: #934400 !important;
  stroke: #4A2200 !important;
}
.golden-gai-svg :deep(#BUILDINGS path.has-bars-2) {
  fill: #005559 !important;
  stroke: #003340 !important;
}
.golden-gai-svg :deep(#BUILDINGS path.has-bars-3) {
  fill: #4a6030 !important;
  stroke: #2a4015 !important;
}
.golden-gai-svg :deep(#BUILDINGS path.has-bars-4) {
  fill: #7a2050 !important;
  stroke: #501030 !important;
}
.golden-gai-svg :deep(#BUILDINGS path.has-bars-5plus) {
  fill: #5a3020 !important;
  stroke: #3a1808 !important;
}

/* Dimmed buildings that don't match active tag filter */
.golden-gai-svg :deep(#BUILDINGS path.tag-dimmed) {
  fill: #1A0800 !important;
  stroke: #3A1800 !important;
  stroke-width: 1.2 !important;
  opacity: 0.4;
}

/* Hover: brighten for all has-bars buildings */
.golden-gai-svg :deep(#BUILDINGS path.has-bars-1:hover),
.golden-gai-svg :deep(#BUILDINGS path.has-bars-2:hover),
.golden-gai-svg :deep(#BUILDINGS path.has-bars-3:hover),
.golden-gai-svg :deep(#BUILDINGS path.has-bars-4:hover),
.golden-gai-svg :deep(#BUILDINGS path.has-bars-5plus:hover) {
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

.golden-gai-svg.placing-mode {
  cursor: crosshair;
}

/* Hover tooltip */
.map-tooltip {
  position: absolute;
  z-index: 100;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    3px 3px 6px rgba(0, 0, 0, 0.5);
  padding: 3px;
  pointer-events: none;
  max-width: 220px;
}

.tooltip-floor-header {
  font-family: var(--win-font);
  font-size: 9px;
  font-weight: bold;
  color: var(--win-text-disabled);
  text-transform: uppercase;
  padding: 2px 3px 1px;
  background: var(--win-bg-dark);
  letter-spacing: 0.5px;
}

.tooltip-bar {
  display: flex;
  gap: 6px;
  padding: 3px;
}

.tooltip-bar + .tooltip-bar {
  border-top: 1px solid var(--win-border-dark);
}

.tooltip-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.tooltip-info {
  min-width: 0;
}

.tooltip-name {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--valhalla-orange);
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-sub {
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text-disabled);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Annotations */
.annotation-text {
  opacity: 0.6;
  letter-spacing: 4px;
}

.annotation-admin {
  opacity: 0.8;
}

.annotation-selected {
  opacity: 1;
  stroke: var(--valhalla-orange);
  stroke-width: 1;
  paint-order: stroke;
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

/* Tooltip partition color swatch */
.tooltip-color-swatch {
  width: 6px;
  flex-shrink: 0;
  align-self: stretch;
  border-radius: 1px;
}

/* Larger zoom buttons */
:deep(.zoom-btn) {
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 4px 8px !important;
  font-size: 16px !important;
}
</style>
