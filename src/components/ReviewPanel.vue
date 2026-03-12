<script setup>
import { computed, onMounted, watch } from 'vue'
import { useReviews } from '../composables/useReviews.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  bar: { type: Object, required: true },
  lang: { type: String, default: 'en' },
})
const emit = defineEmits(['close'])

const { reviews, loadBarReviews } = useReviews()
const { t } = useI18n(computed(() => props.lang))

const displayName = computed(() => {
  if (!props.bar) return ''
  return props.lang === 'jp' ? (props.bar.name_jp || props.bar.name_en) : (props.bar.name_en || props.bar.name_jp)
})

onMounted(() => loadBarReviews(props.bar.id))
watch(() => props.bar.id, id => loadBarReviews(id))

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
</script>

<template>
  <div class="review-panel">
    <div class="rp-header">
      <img src="/icons/winrep-1.png" class="rp-icon" alt="Reviews" />
      <span class="rp-name">{{ displayName }}</span>
      <span class="rp-subtitle">{{ t('reviews') }}</span>
      <button class="rp-close" @click="emit('close')">✕</button>
    </div>

    <!-- Mobile: fixed close button at bottom-right above taskbar -->
    <button class="rp-mobile-close" @click="emit('close')" title="Close">
      <img src="/icons/msg_error-1.png" alt="Close" />
    </button>

    <div class="rp-body">
      <div v-if="reviews.length === 0" class="rp-empty">{{ t('noReviews') }}</div>
      <div v-for="review in reviews" :key="review.id" class="rp-card">
        <div class="rp-card-header">
          <span class="rp-nickname">{{ review.nickname }}</span>
          <span class="rp-time">{{ timeAgo(review.created_at) }}</span>
        </div>
        <p class="rp-text">{{ review.text }}</p>
        <img v-if="review.drawing" :src="review.drawing" class="rp-drawing" alt="drawing" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: var(--taskbar-height, 32px);
  width: 320px;
  display: flex;
  flex-direction: column;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 0 0 var(--win-border-dark),
    -3px 0 8px rgba(0, 0, 0, 0.5);
  z-index: 300;
  font-family: var(--win-font);
}

.rp-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  user-select: none;
}

.rp-icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.rp-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.rp-subtitle {
  font-size: 10px;
  opacity: 0.75;
  flex-shrink: 0;
}

.rp-close {
  width: 16px;
  height: 14px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  flex-shrink: 0;
  margin-left: 2px;
}

.rp-close:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.rp-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.rp-body::-webkit-scrollbar { width: 16px; }
.rp-body::-webkit-scrollbar-track { background: var(--win-bg); }
.rp-body::-webkit-scrollbar-thumb {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.rp-empty {
  color: var(--win-text-disabled);
  text-align: center;
  padding: 20px 8px;
  font-size: 11px;
}

.rp-card {
  padding: 6px;
  margin-bottom: 6px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.rp-card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.rp-nickname {
  font-weight: bold;
  font-size: 11px;
  color: var(--valhalla-orange);
}

.rp-time {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.rp-text {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--win-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.rp-drawing {
  width: 100%;
  display: block;
  margin-top: 4px;
  image-rendering: pixelated;
}

/* Mobile fixed close button — hidden on desktop */
.rp-mobile-close {
  display: none;
  position: fixed;
  bottom: calc(var(--taskbar-height, 32px) + 10px);
  right: 10px;
  width: 44px;
  height: 44px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    2px 2px 4px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 4px;
  z-index: 400;
}

.rp-mobile-close:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.rp-mobile-close img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}

/* ── Mobile: full-screen like the twitter panel ── */
@media (max-width: 768px) {
  .review-panel {
    top: 0;
    left: 0;
    right: 0;
    bottom: var(--taskbar-height, 32px);
    width: auto;
    height: auto;
    box-shadow: none;
  }

  /* Hide header close button — mobile uses the fixed bottom-right button instead */
  .rp-close { display: none; }

  .rp-mobile-close { display: flex; }
}
</style>
