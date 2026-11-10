<script setup>
import { computed } from 'vue'
import ReviewActions from './ReviewActions.vue'

const props = defineProps({
  review: { type: Object, required: true },
  lang: { type: String, default: 'en' },
})

const COLORS = ['#ffe566', '#f9a8d4', '#86efac', '#93c5fd', '#fca5a5']

const bgColor = computed(() => COLORS[props.review.id % COLORS.length])
const rotation = computed(() => (-3 + (props.review.id % 7) - 3))
const barName = computed(() => (props.lang === 'jp'
  ? (props.review.name_jp || props.review.name_en)
  : (props.review.name_en || props.review.name_jp)) || '')

// Deterministic position based on review id — two-zone layout to avoid center sign
const isLeftZone = computed(() => props.review.id % 2 === 0)
const posX = computed(() =>
  isLeftZone.value
    ? 20 + ((props.review.id * 137) % 160)   // 20–180px (left side, clear of center sign)
    : 20 + ((props.review.id * 137) % 700)   // 20–720px (anywhere)
)
const posY = computed(() =>
  isLeftZone.value
    ? 30 + ((props.review.id * 193) % 380)   // 30–410px (fine on left side)
    : 240 + ((props.review.id * 193) % 300)  // 240–540px (below sign)
)
</script>

<template>
  <div
    class="sticky-note"
    :style="{
      background: bgColor,
      transform: `rotate(${rotation}deg)`,
      left: posX + 'px',
      top: posY + 'px',
    }"
  >
    <!-- Admin mode only (the public Report link lives in the review lists).
         At the top: the bottom of a note can sit under the taskbar. -->
    <ReviewActions class="sticky-actions" :review="review" :lang="lang" admin-only />
    <div class="sticky-bar-name">{{ barName }}</div>
    <div v-if="review.text && review.text.trim()" class="sticky-text">{{ review.text }}</div>
    <img v-if="review.drawing" :src="review.drawing" class="sticky-drawing" alt="" />
    <div class="sticky-nick">— {{ review.nickname }}</div>
  </div>
</template>

<style scoped>
.sticky-note {
  position: absolute;
  width: 160px;
  min-height: 120px;
  padding: 8px 10px;
  box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.4);
  font-family: var(--win-font);
  pointer-events: none;
  user-select: none;
  z-index: 2;
  overflow: hidden;
}

.sticky-bar-name {
  font-size: 9px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sticky-text {
  font-size: 10px;
  color: #1a1a1a;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
  margin-bottom: 4px;
}

.sticky-drawing {
  width: 100%;
  display: block;
  margin-bottom: 4px;
}

.sticky-nick {
  font-size: 9px;
  color: rgba(0, 0, 0, 0.5);
  text-align: right;
  margin-top: 4px;
}

/* The note ignores the pointer; only the admin controls take clicks */
.sticky-actions {
  margin: -2px 0 5px;
  padding-bottom: 3px;
  border-bottom: 1px dotted rgba(0, 0, 0, 0.35);
  justify-content: space-between;
}

.sticky-actions :deep(.ra-link),
.sticky-actions :deep(.ra-link:hover:not(:disabled)) {
  color: #1a1a1a;
  font-weight: bold;
}
</style>
