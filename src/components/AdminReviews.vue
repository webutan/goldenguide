<script setup>
// AdminPanel "Reviews" tab: moderation list (reported / hidden / all).
import { ref, computed, watch, onMounted } from 'vue'
import WinTabs from './win2000/WinTabs.vue'
import WinButton from './win2000/WinButton.vue'
import AdminDrawing from './AdminDrawing.vue'
import { fetchAdminReviews } from '../api/reviews.js'
import { applyReviewUpdate, appendReviewPage } from '../utils/reviewLists.js'
import { useReviews } from '../composables/useReviews.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))
const { setHidden, removeReview } = useReviews()

const status = ref('reported')
const statusTabs = computed(() => [
  { value: 'reported', label: t('adminReviewsReported') },
  { value: 'hidden', label: t('adminReviewsHidden') },
  { value: 'all', label: t('adminReviewsAll') },
])

// The list is paged by cursor: `items` grows with "Load more", `nextCursor`
// is null once the last page is in, `total` is every review the filter matches.
const items = ref([])
const nextCursor = ref(null)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref(false)
const moreError = ref(false)
const busyId = ref(null)
let loadSeq = 0

// First page (also Refresh, and a change of filter)
async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadingMore.value = false
  loadError.value = false
  moreError.value = false
  try {
    const page = await fetchAdminReviews({ status: status.value })
    if (seq !== loadSeq) return
    items.value = page.items
    nextCursor.value = page.nextCursor
    total.value = page.total
  } catch (err) {
    console.error('fetchAdminReviews error:', err.message)
    if (seq === loadSeq) { items.value = []; nextCursor.value = null; total.value = 0; loadError.value = true }
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || loading.value || loadingMore.value) return
  const seq = loadSeq
  loadingMore.value = true
  moreError.value = false
  try {
    const page = await fetchAdminReviews({ status: status.value, cursor: nextCursor.value })
    if (seq !== loadSeq) return
    items.value = appendReviewPage(items.value, page.items)
    nextCursor.value = page.nextCursor
    total.value = page.total
  } catch (err) {
    console.error('fetchAdminReviews (more) error:', err.message)
    if (seq === loadSeq) moreError.value = true
  } finally {
    if (seq === loadSeq) loadingMore.value = false
  }
}

onMounted(load)
watch(status, load)

function barName(review) {
  return (props.lang === 'jp'
    ? (review.name_jp || review.name_en)
    : (review.name_en || review.name_jp)) || `#${review.bar_id}`
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function toggleHidden(review) {
  if (busyId.value != null) return
  busyId.value = review.id
  try {
    // Updated in place (no reload: the pages already loaded stay put). A
    // review that no longer matches the filter leaves the list.
    const updated = await setHidden(review, !review.hidden)
    if (!updated) return
    const next = applyReviewUpdate(items.value, updated, status.value)
    items.value = next.items
    if (next.removed) total.value = Math.max(0, total.value - 1)
  } finally {
    busyId.value = null
  }
}

async function remove(review) {
  if (busyId.value != null) return
  busyId.value = review.id
  try {
    if (!await removeReview(review)) return
    items.value = items.value.filter(r => r.id !== review.id)
    total.value = Math.max(0, total.value - 1)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="admin-reviews">
    <WinTabs v-model="status" :tabs="statusTabs">
      <div class="ar-toolbar">
        <span class="ar-count" data-testid="ar-count">{{
          loading ? t('adminReviewsLoading')
          : items.length < total ? t('adminReviewsCountOf', { shown: items.length, total })
          : t('adminReviewsCount', { n: items.length })
        }}</span>
        <WinButton small :disabled="loading" @click="load">{{ t('adminReviewsRefresh') }}</WinButton>
      </div>

      <div v-if="loadError" class="ar-empty">{{ t('adminReviewsLoadFailed') }}</div>
      <div v-else-if="!loading && items.length === 0" class="ar-empty">{{ t('adminReviewsEmpty') }}</div>

      <div class="ar-list">
        <div v-for="review in items" :key="review.id" :class="['ar-item', { 'ar-item-hidden': review.hidden }]">
          <div class="ar-head">
            <span class="ar-bar">{{ barName(review) }}</span>
            <span class="ar-date">{{ formatDate(review.created_at) }}</span>
          </div>
          <div class="ar-main">
            <AdminDrawing v-if="review.has_drawing" :review-id="review.id" :lang="lang" class="ar-thumb" />
            <div class="ar-content">
              <div class="ar-nick">{{ review.nickname }}</div>
              <p v-if="review.text && review.text.trim()" class="ar-text">{{ review.text }}</p>
            </div>
          </div>
          <div class="ar-foot">
            <span :class="['ar-badge', { 'ar-badge-hot': review.report_count > 0 }]">{{ t('adminReviewsReports', { n: review.report_count }) }}</span>
            <span v-if="review.hidden" class="ar-badge ar-badge-hidden">{{ t('adminReviewsHiddenBadge') }}</span>
            <span v-else-if="review.auto_hide_exempt" class="ar-badge" :title="t('adminReviewsApprovedHint')">{{ t('adminReviewsApproved') }}</span>
            <span class="ar-spacer"></span>
            <WinButton small :disabled="busyId != null" @click="toggleHidden(review)">{{ review.hidden ? t('reviewUnhide') : t('reviewHide') }}</WinButton>
            <WinButton small :disabled="busyId != null" @click="remove(review)">{{ t('reviewDelete') }}</WinButton>
          </div>
        </div>
      </div>

      <div v-if="nextCursor && !loading" class="ar-more">
        <div v-if="moreError" class="ar-more-error">{{ t('adminReviewsLoadFailed') }}</div>
        <WinButton class="ar-more-btn" data-testid="ar-load-more" :disabled="loadingMore" @click="loadMore">{{
          loadingMore ? t('adminReviewsLoading') : t('adminReviewsLoadMore', { n: Math.max(0, total - items.length) })
        }}</WinButton>
      </div>
    </WinTabs>
  </div>
</template>

<style scoped>
.admin-reviews {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.ar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.ar-count {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.ar-empty {
  color: var(--win-text-disabled);
  text-align: center;
  padding: 16px 8px;
  font-size: 11px;
}

.ar-item {
  padding: 6px;
  margin-bottom: 6px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.ar-head {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}

.ar-bar {
  font-weight: bold;
  font-size: 11px;
  color: var(--valhalla-orange);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ar-date {
  font-size: 10px;
  color: var(--win-text-disabled);
  flex-shrink: 0;
}

.ar-main {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.ar-item-hidden .ar-main { opacity: 0.55; }

.ar-thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  object-fit: contain;
  image-rendering: pixelated;
  background: #fff;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 1px;
}

.ar-content {
  flex: 1;
  min-width: 0;
}

.ar-nick {
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-bottom: 2px;
}

.ar-text {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.ar-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.ar-spacer { flex: 1; }

.ar-badge {
  font-size: 10px;
  padding: 1px 4px;
  color: var(--win-text-disabled);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  white-space: nowrap;
}

.ar-badge-hot { color: var(--valhalla-orange); }
.ar-badge-hidden { color: var(--valhalla-pink); }

.ar-foot :deep(.win-btn) { min-width: 0; }

.ar-more {
  margin: 2px 0 6px;
  text-align: center;
}

.ar-more-btn { width: 100%; }

.ar-more-error {
  color: var(--valhalla-pink);
  font-size: 10px;
  margin-bottom: 4px;
}

@media (max-width: 768px) {
  .ar-foot :deep(.win-btn) { min-height: 40px; min-width: 64px; }
  .ar-more-btn { min-height: 40px; }
}
</style>
