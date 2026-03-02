<script setup>
import { ref, computed, onMounted, onUpdated, onBeforeUnmount, nextTick } from 'vue'

const contentEl = ref(null)
const trackEl = ref(null)

const scrollTop_ = ref(0)
const scrollHeight_ = ref(1)
const clientHeight_ = ref(1)

function updateMetrics() {
  const el = contentEl.value
  if (!el) return
  scrollTop_.value = el.scrollTop
  scrollHeight_.value = el.scrollHeight
  clientHeight_.value = el.clientHeight
}

const needsScrollbar = computed(() => scrollHeight_.value > clientHeight_.value + 2)

const thumbHeightPx = computed(() => {
  const trackH = trackEl.value?.clientHeight ?? 100
  return Math.max(20, (clientHeight_.value / scrollHeight_.value) * trackH)
})

const thumbTopPx = computed(() => {
  const trackH = trackEl.value?.clientHeight ?? 100
  const maxScroll = scrollHeight_.value - clientHeight_.value
  const ratio = maxScroll > 0 ? scrollTop_.value / maxScroll : 0
  return ratio * (trackH - thumbHeightPx.value)
})

// Drag
let dragging = false
let dragStartY = 0
let dragStartScrollTop = 0

function startDrag(e) {
  e.preventDefault()
  e.stopPropagation()
  dragging = true
  dragStartY = e.clientY
  dragStartScrollTop = contentEl.value.scrollTop

  const onMove = (mv) => {
    if (!dragging || !trackEl.value || !contentEl.value) return
    const delta = mv.clientY - dragStartY
    const trackH = trackEl.value.clientHeight - thumbHeightPx.value
    if (trackH <= 0) return
    contentEl.value.scrollTop = dragStartScrollTop + (delta / trackH) * (scrollHeight_.value - clientHeight_.value)
  }
  const onUp = () => {
    dragging = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onTrackClick(e) {
  if (!trackEl.value || !contentEl.value) return
  const rect = trackEl.value.getBoundingClientRect()
  const ratio = (e.clientY - rect.top) / trackEl.value.clientHeight
  contentEl.value.scrollTop = ratio * (scrollHeight_.value - clientHeight_.value)
}

// Button hold-to-scroll
let holdInterval = null

function startHold(delta) {
  if (!contentEl.value) return
  contentEl.value.scrollTop += delta
  updateMetrics()
  holdInterval = setInterval(() => {
    if (contentEl.value) { contentEl.value.scrollTop += delta; updateMetrics() }
  }, 50)
}

function stopHold() {
  clearInterval(holdInterval)
  holdInterval = null
}

let ro = null

onMounted(() => {
  nextTick(() => {
    updateMetrics()
    ro = new ResizeObserver(updateMetrics)
    if (contentEl.value) {
      ro.observe(contentEl.value)
      if (contentEl.value.firstElementChild) ro.observe(contentEl.value.firstElementChild)
    }
  })
})

onUpdated(updateMetrics)
onBeforeUnmount(() => { ro?.disconnect(); stopHold() })
</script>

<template>
  <div class="win-sc">
    <div class="win-sc-content" ref="contentEl" @scroll="updateMetrics">
      <slot />
    </div>
    <div v-if="needsScrollbar" class="win-sc-bar">
      <button
        class="win-sc-btn win-sc-btn--up"
        @mousedown.prevent="startHold(-40)"
        @mouseup="stopHold"
        @mouseleave="stopHold"
      />
      <div class="win-sc-track" ref="trackEl" @click.self="onTrackClick">
        <div
          class="win-sc-thumb"
          :style="{ top: thumbTopPx + 'px', height: thumbHeightPx + 'px' }"
          @mousedown="startDrag"
          @click.stop
        />
      </div>
      <button
        class="win-sc-btn win-sc-btn--down"
        @mousedown.prevent="startHold(40)"
        @mouseup="stopHold"
        @mouseleave="stopHold"
      />
    </div>
  </div>
</template>

<style scoped>
.win-sc {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.win-sc-content {
  flex: 1;
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  min-height: 0;
}

.win-sc-content::-webkit-scrollbar {
  display: none;
}

/* Scrollbar chrome */
.win-sc-bar {
  width: 16px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #1a1525;
  background-image:
    linear-gradient(45deg, #1e1930 25%, transparent 25%),
    linear-gradient(-45deg, #1e1930 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1e1930 75%),
    linear-gradient(-45deg, transparent 75%, #1e1930 75%);
  background-size: 4px 4px;
  background-position: 0 0, 0 2px, 2px -2px, -2px 0;
  user-select: none;
}

/* Arrow buttons */
.win-sc-btn {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  background-color: var(--win-bg);
  background-repeat: no-repeat;
  background-position: center;
  border: none;
  cursor: pointer;
  padding: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-darkest),
    inset 2px 2px 0 var(--win-bg-light),
    inset -2px -2px 0 var(--win-border-dark);
}

.win-sc-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-darkest),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-dark),
    inset -2px -2px 0 var(--win-bg-light);
  background-position: center 2px;
}

.win-sc-btn--up {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpolygon points='4,1 7,7 1,7' fill='%23c8c0d0'/%3E%3C/svg%3E");
}

.win-sc-btn--down {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpolygon points='4,7 1,1 7,1' fill='%23c8c0d0'/%3E%3C/svg%3E");
}

/* Track + thumb */
.win-sc-track {
  flex: 1;
  position: relative;
  cursor: pointer;
}

.win-sc-thumb {
  position: absolute;
  left: 0;
  right: 0;
  min-height: 20px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-darkest),
    inset 2px 2px 0 var(--win-bg-light),
    inset -2px -2px 0 var(--win-border-dark);
  cursor: ns-resize;
}
</style>
