<script setup>
// A review's drawing in admin lists, which do not carry the image: it is
// fetched from the admin endpoint the first time the placeholder scrolls into
// view (or is pressed), then kept for the rest of the visit.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { fetchReviewDrawing } from '../api/reviews.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  reviewId: { type: Number, required: true },
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))

const src = ref(drawingCache.get(props.reviewId) || null)
const loading = ref(false)
const failed = ref(false)
const rootRef = ref(null)
let observer = null

async function load() {
  if (src.value || loading.value) return
  loading.value = true
  failed.value = false
  try {
    const drawing = await fetchReviewDrawing(props.reviewId)
    remember(props.reviewId, drawing)
    src.value = drawing
  } catch (err) {
    console.error('fetchReviewDrawing error:', err.message)
    failed.value = true
  } finally {
    loading.value = false
  }
}

function stopObserving() {
  if (observer) observer.disconnect()
  observer = null
}

onMounted(() => {
  if (src.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return
    stopObserving()
    load()
  }, { rootMargin: '150px' })
  observer.observe(rootRef.value)
})
onBeforeUnmount(stopObserving)
</script>

<script>
// Shared by every instance: review id -> data URL, oldest dropped first
const CACHE_MAX = 150
const drawingCache = new Map()
function remember(id, drawing) {
  drawingCache.set(id, drawing)
  if (drawingCache.size > CACHE_MAX) drawingCache.delete(drawingCache.keys().next().value)
}
</script>

<template>
  <img v-if="src" :src="src" class="admin-drawing" :alt="t('reviewDrawing')" />
  <button
    v-else
    ref="rootRef"
    type="button"
    class="admin-drawing admin-drawing-pending"
    :disabled="loading"
    :title="failed ? t('reviewDrawingRetry') : t('reviewDrawingShow')"
    @click.stop="load"
  >{{ loading ? '...' : failed ? t('reviewDrawingRetry') : t('reviewDrawingShow') }}</button>
</template>

<style scoped>
.admin-drawing {
  display: block;
  image-rendering: pixelated;
}

.admin-drawing-pending {
  font-family: var(--win-font);
  font-size: 10px;
  line-height: 1.2;
  color: var(--win-text-disabled);
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 2px;
  cursor: pointer;
  text-align: center;
  white-space: normal;
  word-break: break-word;
  overflow: hidden;
}

.admin-drawing-pending:disabled { cursor: default; }
</style>
