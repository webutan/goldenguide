<script setup>
// AdminPanel "Inbox" tab: edit suggestions sent by visitors, each shown as a
// diff (old -> new) against the bar's current values, with Apply / Dismiss.
import { ref, computed, watch, onMounted } from 'vue'
import WinTabs from './win2000/WinTabs.vue'
import WinButton from './win2000/WinButton.vue'
import { fetchSuggestions, setSuggestionStatus } from '../api/suggestions.js'
import { updateBar } from '../api/index.js'
import { suggestionChanges, changesToPatch, formatSchedule } from '../utils/suggestions.js'
import { useSuggestionInbox } from '../composables/useSuggestEdit.js'
import { useDialog } from '../composables/useDialog.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})
// 'reload': a bar was changed, the app should fetch the bars again
const emit = defineEmits(['reload'])

const { t } = useI18n(computed(() => props.lang))
const dialog = useDialog()
const { refreshOpenCount } = useSuggestionInbox()

const status = ref('open')
const statusTabs = computed(() => [
  { value: 'open', label: t('inboxOpen') },
  { value: 'applied', label: t('inboxApplied') },
  { value: 'dismissed', label: t('inboxDismissed') },
])

const items = ref([])
const loading = ref(false)
const loadError = ref(false)
const busyId = ref(null)
let loadSeq = 0

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = false
  try {
    const rows = await fetchSuggestions(status.value)
    if (seq === loadSeq) items.value = rows
  } catch (err) {
    console.error('fetchSuggestions error:', err.message)
    if (seq === loadSeq) { items.value = []; loadError.value = true }
  } finally {
    if (seq === loadSeq) loading.value = false
  }
  refreshOpenCount()
}

onMounted(load)
watch(status, load)

const FIELD_LABELS = {
  schedule: 'hours',
  charge: 'cover',
  male_charge: 'maleCharge',
  drink_price: 'drinks',
  cash_only: 'cashOnly',
  name_jp: 'suggestNameJp',
  name_en: 'suggestNameEn',
  phone: 'phone',
  sns: 'suggestLink',
  is_active: 'inboxListing',
}

function barName(s) {
  if (!s.bar) return t('inboxNewBar')
  return (props.lang === 'jp' ? (s.bar.name_jp || s.bar.name_en) : (s.bar.name_en || s.bar.name_jp)) || `#${s.bar_id}`
}

function formatValue(field, value) {
  if (field === 'schedule') return formatSchedule(value, d => t('day_' + d), t('suggestDayClosed')) || t('inboxEmptyValue')
  if (field === 'is_active') return t(value ? 'inboxListed' : 'inboxHidden')
  if (field === 'cash_only') return t(value ? 'dialogYes' : 'dialogNo')
  return value === null || value === undefined || value === '' ? t('inboxEmptyValue') : String(value)
}

function diffRowsFor(changes) {
  return changes.map(c => ({
    label: t(FIELD_LABELS[c.field] || c.field),
    from: formatValue(c.field, c.from),
    to: formatValue(c.field, c.to),
  }))
}

// Diff rows against the bar as it is now: [{ label, from, to }]
const diffRows = s => diffRowsFor(suggestionChanges(s, s.bar))

// What was suggested, for a suggestion the bar already matches (e.g. applied ones)
function suggestedRows(s) {
  const payload = s.payload || {}
  if (s.kind === 'closed') return [{ label: t(FIELD_LABELS.is_active), to: formatValue('is_active', false) }]
  return Object.keys(FIELD_LABELS)
    .filter(field => payload[field] !== undefined)
    .map(field => ({ label: t(FIELD_LABELS[field]), to: formatValue(field, payload[field]) }))
}

// 'moved' and 'new_bar' are handled by hand (map placement, new row)
const isManual = s => s.kind === 'moved' || s.kind === 'new_bar'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function failed(err) {
  console.error('inbox action error:', err.message)
  await dialog.alert(t('inboxActionFailed'), { title: t('adminTabInboxPlain'), icon: 'error' })
}

async function apply(suggestion) {
  if (busyId.value != null) return
  busyId.value = suggestion.id
  try {
    // Fetch again first: the bar or the suggestion may have changed since the list was loaded
    const fresh = (await fetchSuggestions('open')).find(s => s.id === suggestion.id)
    if (!fresh || !fresh.bar) {
      await dialog.alert(t('inboxGone'), { title: t('adminTabInboxPlain'), icon: 'info' })
      return
    }
    const changes = suggestionChanges(fresh, fresh.bar)
    if (changes.length === 0) {
      await dialog.alert(t('inboxNoChanges'), { title: t('adminTabInboxPlain'), icon: 'info' })
      return
    }
    const name = barName(fresh)
    const closing = changes.some(c => c.field === 'is_active')
    const lines = diffRowsFor(changes).map(r => `${r.label}: ${r.from} → ${r.to}`).join('\n')
    const ok = closing
      ? await dialog.confirm(t('inboxApplyClosedConfirm', { name }), {
        title: t('inboxApplyClosedTitle'), icon: 'warning', yesNo: true, defaultButton: 1,
      })
      : await dialog.confirm(`${t('inboxApplyConfirm', { name })}\n\n${lines}`, {
        title: t('inboxApply'), icon: 'question', yesNo: true,
      })
    if (!ok) return
    // Same endpoint (and field whitelist) the rest of the admin UI uses
    await updateBar(fresh.bar.id, changesToPatch(changes))
    await setSuggestionStatus(fresh.id, 'applied')
    emit('reload')
  } catch (err) {
    await failed(err)
  } finally {
    busyId.value = null
    await load()
  }
}

async function setStatus(suggestion, next) {
  if (busyId.value != null) return
  busyId.value = suggestion.id
  try {
    await setSuggestionStatus(suggestion.id, next)
  } catch (err) {
    await failed(err)
  } finally {
    busyId.value = null
    await load()
  }
}
</script>

<template>
  <div class="admin-inbox">
    <WinTabs v-model="status" :tabs="statusTabs">
      <div class="ai-toolbar">
        <span class="ai-count">{{ loading ? t('adminReviewsLoading') : t('inboxCount', { n: items.length }) }}</span>
        <WinButton small :disabled="loading" @click="load">{{ t('adminReviewsRefresh') }}</WinButton>
      </div>

      <div v-if="loadError" class="ai-empty">{{ t('inboxLoadFailed') }}</div>
      <div v-else-if="!loading && items.length === 0" class="ai-empty">{{ t('inboxEmpty') }}</div>

      <div class="ai-list">
        <div v-for="s in items" :key="s.id" class="ai-item" :data-kind="s.kind">
          <div class="ai-head">
            <span class="ai-bar">{{ barName(s) }}</span>
            <span class="ai-date">{{ formatDate(s.created_at) }}</span>
          </div>
          <div class="ai-kind">
            <span class="ai-badge ai-badge-kind">{{ t('inboxKind_' + s.kind) }}</span>
            <span v-if="s.bar && !s.bar.is_active" class="ai-badge ai-badge-hidden">{{ t('inboxHidden') }}</span>
          </div>

          <!-- New bar / moved: free text from the visitor -->
          <dl v-if="s.kind === 'new_bar'" class="ai-diff">
            <div class="ai-diff-row"><dt>{{ t('suggestNewName') }}</dt><dd>{{ s.payload.name }}</dd></div>
            <div v-if="s.payload.location" class="ai-diff-row"><dt>{{ t('suggestNewLocation') }}</dt><dd>{{ s.payload.location }}</dd></div>
            <div v-if="s.payload.details" class="ai-diff-row"><dt>{{ t('suggestNewDetails') }}</dt><dd>{{ s.payload.details }}</dd></div>
          </dl>
          <dl v-else-if="s.kind === 'moved'" class="ai-diff">
            <div class="ai-diff-row"><dt>{{ t('suggestMovedWhere') }}</dt><dd>{{ s.payload.location }}</dd></div>
          </dl>
          <!-- Everything else: old -> new against the bar's current values -->
          <template v-else>
            <dl v-if="diffRows(s).length > 0" class="ai-diff">
              <div v-for="row in diffRows(s)" :key="row.label" class="ai-diff-row">
                <dt>{{ row.label }}</dt>
                <dd><span class="ai-old">{{ row.from }}</span> <span class="ai-arrow">&rarr;</span> <span class="ai-new">{{ row.to }}</span></dd>
              </div>
            </dl>
            <template v-else>
              <dl class="ai-diff">
                <div v-for="row in suggestedRows(s)" :key="row.label" class="ai-diff-row">
                  <dt>{{ row.label }}</dt>
                  <dd>{{ row.to }}</dd>
                </div>
              </dl>
              <div class="ai-same">{{ t('inboxNoChanges') }}</div>
            </template>
          </template>

          <p v-if="s.note" class="ai-note"><span class="ai-note-label">{{ t('inboxNote') }}</span> {{ s.note }}</p>
          <p v-if="s.contact" class="ai-note"><span class="ai-note-label">{{ t('inboxContact') }}</span> {{ s.contact }}</p>

          <div class="ai-foot">
            <span class="ai-spacer"></span>
            <template v-if="s.status === 'open'">
              <WinButton v-if="isManual(s)" small :disabled="busyId != null" @click="setStatus(s, 'applied')">{{ t('inboxDone') }}</WinButton>
              <WinButton v-else small class="ai-apply" :disabled="busyId != null || diffRows(s).length === 0" @click="apply(s)">{{ t('inboxApply') }}</WinButton>
              <WinButton small class="ai-dismiss" :disabled="busyId != null" @click="setStatus(s, 'dismissed')">{{ t('inboxDismiss') }}</WinButton>
            </template>
            <WinButton v-else small :disabled="busyId != null" @click="setStatus(s, 'open')">{{ t('inboxReopen') }}</WinButton>
          </div>
        </div>
      </div>
    </WinTabs>
  </div>
</template>

<style scoped>
.admin-inbox {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.ai-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.ai-count {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.ai-empty {
  color: var(--win-text-disabled);
  text-align: center;
  padding: 16px 8px;
  font-size: 11px;
}

.ai-item {
  padding: 6px;
  margin-bottom: 6px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.ai-head {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}

.ai-bar {
  font-weight: bold;
  font-size: 11px;
  color: var(--valhalla-orange);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ai-date {
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
}

.ai-kind {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.ai-badge {
  font-size: 10px;
  padding: 1px 4px;
  color: var(--win-text-disabled);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  white-space: nowrap;
}

.ai-badge-kind { color: var(--win-text); }
.ai-badge-hidden { color: var(--valhalla-pink); }
.ai-item[data-kind="closed"] .ai-badge-kind { color: var(--valhalla-pink); }

.ai-diff {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
}

.ai-diff-row { margin-bottom: 2px; }

.ai-diff dt {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.ai-diff dd {
  margin: 0;
  word-break: break-word;
  white-space: pre-wrap;
}

.ai-old {
  color: var(--win-text-disabled);
  text-decoration: line-through;
}

.ai-arrow { color: var(--win-text-disabled); }

.ai-new {
  color: var(--valhalla-orange);
  font-weight: bold;
}

.ai-same {
  font-size: 11px;
  color: var(--win-text-disabled);
}

.ai-note {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-note-label {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.ai-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.ai-spacer { flex: 1; }

.ai-foot :deep(.win-btn) { min-width: 0; }

@media (max-width: 768px) {
  .ai-foot :deep(.win-btn) { min-height: 40px; min-width: 64px; }
}
</style>
