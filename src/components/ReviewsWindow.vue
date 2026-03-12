<script setup>
import { computed } from 'vue'
import { useReviews } from '../composables/useReviews.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const { weeklyReviews } = useReviews()
const { t } = useI18n(computed(() => props.lang))

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

function barName(review) {
  return props.lang === 'jp' ? (review.name_jp || review.name_en) : (review.name_en || review.name_jp)
}
</script>

<template>
  <div class="reviews-window">
    <div v-if="weeklyReviews.length === 0" class="reviews-empty">{{ t('noReviews') }}</div>
    <div v-for="review in weeklyReviews" :key="review.id" class="review-item">
      <div class="review-item-header">
        <span class="review-bar-name">{{ barName(review) }}</span>
        <span class="review-item-time">{{ timeAgo(review.created_at) }}</span>
      </div>
      <div class="review-item-nick">{{ review.nickname }}</div>
      <p class="review-item-text">{{ review.text }}</p>
      <img v-if="review.drawing" :src="review.drawing" class="review-item-drawing" alt="drawing" />
    </div>
  </div>
</template>

<style scoped>
.reviews-window {
  padding: 8px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  overflow-y: auto;
  height: 100%;
}

.reviews-empty {
  color: var(--win-text-disabled);
  text-align: center;
  padding: 20px 8px;
  font-size: 11px;
}

.review-item {
  padding: 6px;
  margin-bottom: 6px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.review-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.review-bar-name {
  font-weight: bold;
  color: var(--valhalla-orange);
  font-size: 11px;
}

.review-item-time {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.review-item-nick {
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-bottom: 4px;
}

.review-item-text {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.review-item-drawing {
  width: 100%;
  display: block;
  margin-top: 4px;
}
</style>
