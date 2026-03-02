<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { updateBar } from '../api/index.js'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
})
const emit = defineEmits(['reload'])

// ── Column definitions ──────────────────────────────────────────────────────
// Status (28px sticky), ID (44px sticky), name_jp (160px sticky) are outside this array
const COLS = [
  { key: 'name_en',     label: 'Name EN',     w: 150, type: 'text'   },
  { key: 'street',      label: 'Street',      w: 110, type: 'text'   },
  { key: 'floor',       label: 'Fl',          w:  42, type: 'number' },
  { key: 'is_active',   label: 'On',          w:  36, type: 'bool'   },
  { key: 'cash_only',   label: '¥cash',       w:  44, type: 'bool'   },
  { key: 'charge',      label: 'Cover',       w:  72, type: 'text'   },
  { key: 'male_charge', label: 'M.Cover',     w:  80, type: 'text'   },
  { key: 'drink_price', label: 'Drink',       w:  72, type: 'text'   },
  { key: 'seats',       label: 'Seats',       w:  50, type: 'number' },
  { key: 'hours',       label: 'Hours',       w: 150, type: 'text'   },
  { key: 'closed_days', label: 'Closed',      w: 115, type: 'text'   },
  { key: 'phone',       label: 'Phone',       w: 130, type: 'text'   },
  { key: 'sns',         label: 'SNS',         w: 160, type: 'text'   },
  { key: 'address',     label: 'Address',     w: 170, type: 'text'   },
  { key: 'plus_code',   label: 'Plus Code',   w: 100, type: 'text'   },
  { key: 'google_link', label: 'G.Maps',      w:  75, type: 'text'   },
  { key: 'description', label: 'Description', w: 220, type: 'text'   },
]

// ── Search ──────────────────────────────────────────────────────────────────
const search = ref('')
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return props.bars
  return props.bars.filter(b =>
    String(b.id).includes(q) ||
    (b.name_jp || '').toLowerCase().includes(q) ||
    (b.name_en || '').toLowerCase().includes(q) ||
    (b.street  || '').toLowerCase().includes(q)
  )
})

// ── Row status ──────────────────────────────────────────────────────────────
const rowState = ref({})
function rs(barId) {
  if (!rowState.value[barId]) {
    rowState.value[barId] = { saving: false, saved: false, error: null }
  }
  return rowState.value[barId]
}

// ── Save single field ───────────────────────────────────────────────────────
async function saveField(bar, key, rawValue) {
  let value
  if (key === 'floor' || key === 'seats') {
    value = rawValue === '' || rawValue == null ? null : Number(rawValue)
  } else if (key === 'is_active' || key === 'cash_only') {
    value = Boolean(rawValue)
  } else {
    value = rawValue === '' ? null : rawValue
  }

  const existing = bar[key] ?? null
  if (value === existing) return

  const state = rs(bar.id)
  state.saving = true
  state.error = null
  state.saved = false
  try {
    await updateBar(bar.id, { [key]: value })
    state.saved = true
    emit('reload')
    setTimeout(() => { if (rowState.value[bar.id]) rowState.value[bar.id].saved = false }, 1500)
  } catch (e) {
    state.error = String(e.message || e)
  } finally {
    state.saving = false
  }
}

// ── Tag picker ──────────────────────────────────────────────────────────────
const tagPickerBarId = ref(null)

function toggleTagPicker(bar, event) {
  event.stopPropagation()
  tagPickerBarId.value = tagPickerBarId.value === bar.id ? null : bar.id
}

async function toggleTag(bar, tagId, event) {
  event.stopPropagation()
  const currentIds = (bar.tags || []).map(t => t.id)
  const newIds = currentIds.includes(tagId)
    ? currentIds.filter(id => id !== tagId)
    : [...currentIds, tagId]
  const state = rs(bar.id)
  state.saving = true
  state.error = null
  try {
    await updateBar(bar.id, { tags: newIds })
    state.saved = true
    emit('reload')
    setTimeout(() => { if (rowState.value[bar.id]) rowState.value[bar.id].saved = false }, 1500)
  } catch (e) {
    state.error = String(e.message || e)
  } finally {
    state.saving = false
  }
}

function closeTagPicker() { tagPickerBarId.value = null }
onMounted(() => document.addEventListener('click', closeTagPicker))
onUnmounted(() => document.removeEventListener('click', closeTagPicker))
</script>

<template>
  <div class="dbt-root">

    <!-- Toolbar -->
    <div class="dbt-toolbar">
      <input
        v-model="search"
        class="dbt-search"
        type="search"
        placeholder="Search by ID, name, street…"
      />
      <span class="dbt-count">{{ filtered.length }} / {{ bars.length }} bars</span>
      <span class="dbt-hint">Click a cell to edit · Enter or Tab to save</span>
    </div>

    <!-- Spreadsheet -->
    <div class="dbt-scroll">
      <table class="dbt-table">
        <thead>
          <tr>
            <th class="dbt-th dbt-th--status"></th>
            <th class="dbt-th dbt-th--id">ID</th>
            <th class="dbt-th dbt-th--namejp">Name JP</th>
            <th
              v-for="col in COLS"
              :key="col.key"
              class="dbt-th"
              :style="{ minWidth: col.w + 'px', width: col.w + 'px' }"
            >{{ col.label }}</th>
            <th class="dbt-th" style="min-width:180px;width:180px">Tags</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="bar in filtered"
            :key="bar.id"
            class="dbt-row"
            :class="{
              'dbt-row--saved':  rs(bar.id).saved,
              'dbt-row--error':  !!rs(bar.id).error,
            }"
          >
            <!-- Status indicator -->
            <td class="dbt-td dbt-td--status">
              <span v-if="rs(bar.id).saving" class="dbt-status dbt-status--saving" title="Saving…">↻</span>
              <span v-else-if="rs(bar.id).saved"  class="dbt-status dbt-status--saved"  title="Saved">✓</span>
              <span v-else-if="rs(bar.id).error"  class="dbt-status dbt-status--error"  :title="rs(bar.id).error">✗</span>
            </td>

            <!-- ID (read-only, sticky) -->
            <td class="dbt-td dbt-td--id">{{ bar.id }}</td>

            <!-- Name JP (sticky) -->
            <td class="dbt-td dbt-td--namejp">
              <input
                class="dbt-input"
                type="text"
                :value="bar.name_jp ?? ''"
                @change="saveField(bar, 'name_jp', $event.target.value)"
                @keydown.enter.prevent="$event.target.blur()"
              />
            </td>

            <!-- Variable columns -->
            <template v-for="col in COLS" :key="col.key">
              <!-- Boolean: checkbox -->
              <td
                v-if="col.type === 'bool'"
                class="dbt-td dbt-td--bool"
                :style="{ minWidth: col.w + 'px', width: col.w + 'px' }"
              >
                <input
                  class="dbt-check"
                  type="checkbox"
                  :checked="!!bar[col.key]"
                  @change="saveField(bar, col.key, $event.target.checked)"
                />
              </td>
              <!-- Text / number input -->
              <td
                v-else
                class="dbt-td"
                :style="{ minWidth: col.w + 'px', width: col.w + 'px' }"
              >
                <input
                  class="dbt-input"
                  :type="col.type === 'number' ? 'number' : 'text'"
                  :value="bar[col.key] ?? ''"
                  @change="saveField(bar, col.key, $event.target.value)"
                  @keydown.enter.prevent="$event.target.blur()"
                />
              </td>
            </template>

            <!-- Tags (click-to-edit) -->
            <td
              class="dbt-td dbt-td--tags"
              style="min-width:180px;width:180px;position:relative;cursor:pointer"
              @click.stop="toggleTagPicker(bar, $event)"
            >
              <div class="dbt-tag-chips">
                <span
                  v-for="t in (bar.tags || [])"
                  :key="t.id"
                  class="dbt-chip"
                  :style="{ background: t.color || 'var(--valhalla-purple)' }"
                >{{ t.label }}</span>
                <span v-if="!(bar.tags || []).length" class="dbt-chip-empty">—</span>
              </div>

              <!-- Floating tag picker -->
              <div
                v-if="tagPickerBarId === bar.id"
                class="dbt-tag-picker"
                @click.stop
              >
                <label
                  v-for="tag in tags"
                  :key="tag.id"
                  class="dbt-picker-row"
                >
                  <input
                    type="checkbox"
                    :checked="(bar.tags || []).some(t => t.id === tag.id)"
                    @change="toggleTag(bar, tag.id, $event)"
                  />
                  <span class="dbt-picker-dot" :style="{ background: tag.color || 'var(--valhalla-purple)' }"></span>
                  <span class="dbt-picker-label">{{ tag.label }}</span>
                </label>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
/* ── Root & toolbar ────────────────────────────────────────────────────────── */
.dbt-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--win-bg-dark);
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.dbt-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  background: var(--win-bg);
  border-bottom: 1px solid var(--win-border-dark);
  flex-shrink: 0;
}

.dbt-search {
  width: 220px;
  height: 20px;
  padding: 0 6px;
  background: var(--win-bg-dark);
  color: var(--win-text);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  font: inherit;
  outline: none;
}

.dbt-search:focus {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    0 0 0 1px var(--win-highlight);
}

.dbt-count {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.dbt-hint {
  margin-left: auto;
  font-size: 10px;
  color: var(--win-text-disabled);
  font-style: italic;
}

/* ── Scroll container ──────────────────────────────────────────────────────── */
.dbt-scroll {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* ── Table ─────────────────────────────────────────────────────────────────── */
.dbt-table {
  border-collapse: collapse;
  table-layout: fixed;
  white-space: nowrap;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.dbt-th {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--win-bg-dark);
  border-bottom: 2px solid var(--win-border-dark);
  border-right: 1px solid var(--win-border-dark);
  padding: 3px 5px;
  text-align: left;
  font-size: 10px;
  font-weight: bold;
  color: var(--win-text-disabled);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  user-select: none;
}

.dbt-th--status {
  position: sticky;
  left: 0;
  z-index: 4;
  width: 28px;
  min-width: 28px;
  padding: 0;
}

.dbt-th--id {
  position: sticky;
  left: 28px;
  z-index: 4;
  width: 44px;
  min-width: 44px;
}

.dbt-th--namejp {
  position: sticky;
  left: 72px;   /* 28 + 44 */
  z-index: 4;
  width: 160px;
  min-width: 160px;
}

/* ── Rows ──────────────────────────────────────────────────────────────────── */
.dbt-row {
  transition: background 200ms ease;
}

.dbt-row:nth-child(odd)  { background: var(--win-bg-dark); }
.dbt-row:nth-child(even) { background: var(--win-bg); }
.dbt-row:hover           { background: #32303f; }
.dbt-row--saved          { background: rgba(25, 97, 58, 0.18) !important; }
.dbt-row--error          { background: rgba(168, 46, 40, 0.18) !important; }

/* ── Cells ─────────────────────────────────────────────────────────────────── */
.dbt-td {
  border-right: 1px solid var(--win-border-dark);
  border-bottom: 1px solid var(--win-border-dark);
  padding: 0;
  height: 22px;
  vertical-align: middle;
  overflow: hidden;
}

.dbt-td--status {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 28px;
  min-width: 28px;
  text-align: center;
  background: inherit;
}

.dbt-td--id {
  position: sticky;
  left: 28px;
  z-index: 2;
  width: 44px;
  min-width: 44px;
  text-align: right;
  padding: 0 5px;
  font-size: 10px;
  color: var(--win-text-disabled);
  background: inherit;
}

.dbt-td--namejp {
  position: sticky;
  left: 72px;
  z-index: 2;
  width: 160px;
  min-width: 160px;
  background: inherit;
}

.dbt-td--bool {
  text-align: center;
}

/* ── Status indicators ─────────────────────────────────────────────────────── */
.dbt-status {
  font-size: 11px;
  display: inline-block;
  width: 100%;
  text-align: center;
  line-height: 22px;
}

.dbt-status--saving { color: var(--valhalla-orange); animation: dbt-spin 0.8s linear infinite; }
.dbt-status--saved  { color: #5cba6a; }
.dbt-status--error  { color: #e94560; cursor: help; }

@keyframes dbt-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Inputs ────────────────────────────────────────────────────────────────── */
.dbt-input {
  display: block;
  width: 100%;
  height: 22px;
  padding: 0 5px;
  background: transparent;
  border: none;
  outline: none;
  font: inherit;
  color: var(--win-text);
  cursor: default;
}

.dbt-input:focus {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
  cursor: text;
}

.dbt-input[type="number"] {
  text-align: right;
}

.dbt-check {
  cursor: pointer;
  accent-color: var(--valhalla-orange);
  width: 13px;
  height: 13px;
}

/* ── Tags cell ─────────────────────────────────────────────────────────────── */
.dbt-td--tags {
  overflow: visible;
}

.dbt-tag-chips {
  display: flex;
  gap: 3px;
  align-items: center;
  padding: 0 5px;
  height: 22px;
  overflow: hidden;
  flex-wrap: nowrap;
}

.dbt-chip {
  display: inline-block;
  padding: 0 5px;
  height: 14px;
  line-height: 14px;
  font-size: 9px;
  color: #fff;
  white-space: nowrap;
  opacity: 0.9;
}

.dbt-chip-empty {
  color: var(--win-text-disabled);
  font-size: 11px;
}

/* ── Tag picker dropdown ───────────────────────────────────────────────────── */
.dbt-tag-picker {
  position: absolute;
  right: 0;
  top: 22px;
  z-index: 200;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    4px 4px 8px rgba(0,0,0,0.6);
  min-width: 160px;
  max-height: 240px;
  overflow-y: auto;
  padding: 3px 0;
}

.dbt-picker-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 11px;
  color: var(--win-text);
}

.dbt-picker-row:hover {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.dbt-picker-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.dbt-picker-label {
  flex: 1;
  white-space: nowrap;
}
</style>
