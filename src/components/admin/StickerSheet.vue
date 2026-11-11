<script setup>
// AdminPanel "Stickers" view (G05): print door stickers with a QR code to a
// bar's page, one per bar or sheets of eight, and see how often they are
// scanned (the API counts /bar/<slug>?ref=sticker, see server/lib/refHits.js).
//
// Printing: the chosen stickers are rendered into a container teleported to
// <body>; stickerPrint.css hides everything else on paper. The container only
// exists between pressing Print and the browser's `afterprint`.
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import WinButton from '../win2000/WinButton.vue'
import WinCheckbox from '../win2000/WinCheckbox.vue'
import WinTextInput from '../win2000/WinTextInput.vue'
import StickerCard from './StickerCard.vue'
import './stickerPrint.css'
import { useDialog } from '../../composables/useDialog.js'
import { useI18n } from '../../composables/useI18n.js'
import { readString, writeString } from '../../utils/storage.js'
import { fetchRefStats } from '../../api/stats.js'
import { normalizeBaseUrl, isLocalBaseUrl, paginate, streetName, STICKERS_PER_PAGE, STICKER_REF } from '../../utils/sticker.js'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
})

defineEmits(['close'])

const dialog = useDialog()
const { t } = useI18n(computed(() => props.lang))

const BASE_KEY = 'golden-gai-sticker-base'
const LAYOUT_KEY = 'golden-gai-sticker-layout'
// Above this many stickers, ask before sending the job to the printer
const CONFIRM_ABOVE = STICKERS_PER_PAGE * 2

// ── Where the QR codes point ──────────────────────────────────────────────────
// Defaults to the address the admin is on; remembered once changed, because
// the admin may be working from a LAN address rather than the public one.
const baseInput = ref(readString(BASE_KEY) || window.location.origin)
const base = computed(() => normalizeBaseUrl(baseInput.value))

function onBaseInput(value) {
  baseInput.value = value
  const valid = normalizeBaseUrl(value)
  if (valid) writeString(BASE_KEY, valid)
}

const layout = ref(readString(LAYOUT_KEY) === 'card' ? 'card' : 'a4')
function setLayout(value) {
  layout.value = value
  writeString(LAYOUT_KEY, value)
}

// ── Which bars ────────────────────────────────────────────────────────────────
// Only bars the public can open: an inactive bar's link answers "not found".
const printable = computed(() => props.bars.filter(b => b.is_active !== false && b.slug))

const search = ref('')
const street = ref('')
const streets = computed(() => [...new Set(printable.value.map(b => b.street).filter(Boolean))].sort())

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return printable.value.filter(b =>
    (!street.value || b.street === street.value) &&
    (!q || (b.name_jp || '').toLowerCase().includes(q) || (b.name_en || '').toLowerCase().includes(q))
  )
})

const selectedIds = ref(new Set())
const selected = computed(() => printable.value.filter(b => selectedIds.value.has(b.id)))
const selectedPages = computed(() =>
  layout.value === 'a4' ? Math.ceil(selected.value.length / STICKERS_PER_PAGE) : selected.value.length
)

function toggle(bar, on) {
  const next = new Set(selectedIds.value)
  if (on) next.add(bar.id)
  else next.delete(bar.id)
  selectedIds.value = next
  if (on) previewId.value = bar.id
}

function selectShown() {
  const next = new Set(selectedIds.value)
  for (const bar of shown.value) next.add(bar.id)
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
}

const barLabel = (bar) => (props.lang === 'jp' ? bar.name_jp || bar.name_en : bar.name_en || bar.name_jp)

// ── Preview ───────────────────────────────────────────────────────────────────
const previewId = ref(null)
const previewBar = computed(() =>
  printable.value.find(b => b.id === previewId.value) || shown.value[0] || printable.value[0] || null
)

// ── Scan counts ───────────────────────────────────────────────────────────────
const stats = ref(null) // { days, recent, total, byBar: Map }
const statsError = ref(false)

async function loadStats() {
  statsError.value = false
  try {
    const data = await fetchRefStats(STICKER_REF)
    stats.value = { ...data, byBar: new Map(data.bars.map(row => [row.bar_id, row])) }
  } catch (err) {
    console.error('fetchRefStats error:', err.message)
    statsError.value = true
  }
}
onMounted(loadStats)

function scansOf(bar) {
  const row = stats.value && stats.value.byBar.get(bar.id)
  return row ? `${row.recent} / ${row.total}` : stats.value ? '0 / 0' : ''
}

// ── Printing ──────────────────────────────────────────────────────────────────
const job = ref(null) // { pages: Bar[][], layout, base } | null
let pageStyle = null

function endJob() {
  job.value = null
  document.documentElement.classList.remove('sticker-printing')
  if (pageStyle) {
    pageStyle.remove()
    pageStyle = null
  }
}

// Both pixel fonts must be in before the print snapshot is taken; the
// Japanese one is only fetched when Japanese text is first drawn.
async function fontsReady() {
  if (!document.fonts) return
  try {
    await Promise.all([
      document.fonts.load('10px W95FA', 'GaiMap.exe'),
      document.fonts.load('10px PixelMplus10', '街マップ'),
    ])
    await document.fonts.ready
  } catch {
    /* print with whatever is loaded */
  }
}

async function print(list) {
  const title = t('stickerPrintTitle')
  if (!base.value) {
    await dialog.alert(t('stickerBaseUrlInvalid'), { title, icon: 'warning' })
    return
  }
  if (!list.length) {
    await dialog.alert(t('stickerNoneSelected'), { title, icon: 'info' })
    return
  }
  if (isLocalBaseUrl(base.value) &&
      !await dialog.confirm(t('stickerBaseUrlLocal', { url: base.value }), { title, icon: 'warning', yesNo: true, defaultButton: 1 })) {
    return
  }
  const pages = paginate(list, layout.value === 'a4' ? STICKERS_PER_PAGE : 1)
  if (list.length > CONFIRM_ABOVE &&
      !await dialog.confirm(t('stickerConfirmMany', { n: list.length, pages: pages.length }), { title, yesNo: true })) {
    return
  }

  endJob()
  pageStyle = document.createElement('style')
  pageStyle.textContent = layout.value === 'a4'
    ? '@page { size: A4 portrait; margin: 0; }'
    : '@page { size: 90mm 55mm; margin: 0; }'
  document.head.appendChild(pageStyle)
  document.documentElement.classList.add('sticker-printing')
  job.value = { pages, layout: layout.value, base: base.value }

  await nextTick()
  await fontsReady()
  window.print()
}

onMounted(() => window.addEventListener('afterprint', endJob))
onBeforeUnmount(() => {
  window.removeEventListener('afterprint', endJob)
  endJob()
})

// Corner marks for one card, in millimetres from its top-left corner:
// 2.5 mm strokes that stop 1 mm short of the cut line.
const CROP_MARKS = [0, 90].flatMap(x => [0, 55].flatMap(y => {
  const dx = x === 0 ? -1 : 1
  const dy = y === 0 ? -1 : 1
  return [
    { x1: x + dx, y1: y, x2: x + dx * 3.5, y2: y },
    { x1: x, y1: y + dy, x2: x, y2: y + dy * 3.5 },
  ]
}))
</script>

<template>
  <div class="sticker-tab">
    <div class="sticker-row">
      <WinButton small data-action="back" @click="$emit('close')">&#9668; {{ t('stickerBack') }}</WinButton>
      <span class="sticker-heading">{{ t('adminStickers') }}</span>
    </div>
    <p class="sticker-intro">{{ t('stickerIntro') }}</p>

    <label class="sticker-label">{{ t('stickerBaseUrl') }}</label>
    <WinTextInput
      :model-value="baseInput"
      placeholder="https://"
      class="sticker-base-input"
      @update:model-value="onBaseInput"
    />
    <p :class="['sticker-hint', { 'sticker-hint-bad': !base }]">
      {{ base ? t('stickerBaseUrlHint') : t('stickerBaseUrlInvalid') }}
    </p>

    <label class="sticker-label">{{ t('stickerLayout') }}</label>
    <div class="sticker-row">
      <WinButton small :pressed="layout === 'a4'" class="sticker-grow" data-layout="a4" @click="setLayout('a4')">{{ t('stickerLayoutA4') }}</WinButton>
      <WinButton small :pressed="layout === 'card'" class="sticker-grow" data-layout="card" @click="setLayout('card')">{{ t('stickerLayoutCard') }}</WinButton>
    </div>

    <div v-if="previewBar && base" class="sticker-preview" :title="t('stickerPreview')">
      <div class="sticker-preview-scale">
        <StickerCard :bar="previewBar" :base-url="base" />
      </div>
    </div>

    <div class="sticker-row sticker-filter">
      <WinTextInput v-model="search" :placeholder="t('stickerSearch')" class="sticker-grow" />
      <select v-model="street" class="sticker-select" :aria-label="t('stickerAllStreets')">
        <option value="">{{ t('stickerAllStreets') }}</option>
        <option v-for="s in streets" :key="s" :value="s">{{ streetName(s) }}</option>
      </select>
    </div>

    <div class="sticker-row">
      <WinButton small class="sticker-grow" data-action="select-shown" @click="selectShown">{{ t('stickerSelectShown', { n: shown.length }) }}</WinButton>
      <WinButton small class="sticker-grow" data-action="clear" :disabled="!selectedIds.size" @click="clearSelection">{{ t('stickerSelectNone') }}</WinButton>
    </div>

    <div class="sticker-list-head">
      <span>{{ t('stickerSelected', { n: selected.length, pages: selectedPages }) }}</span>
      <span>{{ t('stickerScansHeader') }}</span>
    </div>
    <div class="sticker-list">
      <div
        v-for="bar in shown"
        :key="bar.id"
        :class="['sticker-item', { current: previewBar && previewBar.id === bar.id }]"
        :data-bar-id="bar.id"
        @mouseenter="previewId = bar.id"
      >
        <WinCheckbox
          class="sticker-item-check"
          :model-value="selectedIds.has(bar.id)"
          @update:model-value="toggle(bar, $event)"
        >{{ barLabel(bar) }}</WinCheckbox>
        <span class="sticker-item-scans">{{ scansOf(bar) }}</span>
        <WinButton small class="sticker-item-print" :title="t('stickerPrintOne')" :aria-label="t('stickerPrintOne')" @click="print([bar])">&#128424;</WinButton>
      </div>
      <div v-if="!shown.length" class="sticker-empty">{{ t('stickerNoBars') }}</div>
    </div>

    <div class="sticker-row">
      <WinButton class="sticker-grow" data-action="print-selected" :disabled="!selected.length" @click="print(selected)">&#128424; {{ t('stickerPrintSelected', { n: selected.length }) }}</WinButton>
      <WinButton class="sticker-grow" data-action="print-all" :disabled="!printable.length" @click="print(printable)">{{ t('stickerPrintAll', { n: printable.length }) }}</WinButton>
    </div>

    <p v-if="statsError" class="sticker-hint sticker-hint-bad">{{ t('stickerScansError') }}</p>
    <p v-else-if="stats" class="sticker-hint sticker-scans-total">
      {{ t('stickerScansTotal', { recent: stats.recent, days: stats.days, total: stats.total }) }}
    </p>

    <Teleport to="body">
      <div v-if="job" :class="['sticker-print-root', `layout-${job.layout}`]">
        <div v-for="(page, p) in job.pages" :key="p" class="sticker-page">
          <div v-for="bar in page" :key="bar.id" class="sticker-cell">
            <svg class="sticker-crop" viewBox="-5 -4 100 63" aria-hidden="true">
              <line v-for="(m, i) in CROP_MARKS" :key="i" :x1="m.x1" :y1="m.y1" :x2="m.x2" :y2="m.y2" />
            </svg>
            <StickerCard :bar="bar" :base-url="job.base" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.sticker-tab {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
}

.sticker-intro,
.sticker-hint {
  color: var(--win-text-disabled);
  line-height: 1.3;
}

.sticker-hint-bad {
  color: var(--valhalla-pink);
}

.sticker-scans-total {
  color: var(--win-text);
}

.sticker-heading {
  margin-left: 4px;
}

.sticker-label {
  margin-top: 4px;
}

.sticker-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.sticker-grow {
  flex: 1;
  min-width: 0;
}

.sticker-filter {
  margin-top: 4px;
}

.sticker-select {
  flex: none;
  width: 96px;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  outline: none;
}

/* The card is 90 mm wide; shrink it to the panel */
.sticker-preview {
  margin-top: 4px;
  padding: 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.sticker-preview-scale {
  zoom: 0.62;
}

.sticker-list-head {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 2px;
  color: var(--win-text-disabled);
}

.sticker-list {
  height: 190px;
  overflow-y: auto;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px;
}

.sticker-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 2px;
}

.sticker-item.current {
  background: var(--win-bg-light);
}

.sticker-item-check {
  flex: 1;
  min-width: 0;
}

.sticker-item-check :deep(.win-checkbox-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticker-item-scans {
  flex: none;
  color: var(--win-text-disabled);
  white-space: nowrap;
}

.sticker-item-print {
  flex: none;
}

.sticker-empty {
  padding: 8px;
  text-align: center;
  color: var(--win-text-disabled);
}

@media (max-width: 768px) {
  .sticker-item {
    min-height: 40px;
  }

  .sticker-tab :deep(.win-btn) {
    min-height: 40px;
  }
}
</style>
