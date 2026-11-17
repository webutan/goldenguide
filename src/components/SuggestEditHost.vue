<script setup>
// Single host for the "Suggest an edit" dialog and Gai-chan's thank-you
// balloon. Mounted once in App.vue; opened through useSuggestEdit().
import { ref, computed, watch, onUnmounted } from 'vue'
import SuggestEditDialog from './SuggestEditDialog.vue'
import { useSuggestEdit } from '../composables/useSuggestEdit.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(computed(() => props.lang))
const { request, thanksKey, closeSuggestEdit, showThanks } = useSuggestEdit()

const THANKS_MS = 6000
const thanksVisible = ref(false)
let thanksTimer = null

watch(thanksKey, () => {
  thanksVisible.value = true
  clearTimeout(thanksTimer)
  thanksTimer = setTimeout(() => { thanksVisible.value = false }, THANKS_MS)
})
onUnmounted(() => clearTimeout(thanksTimer))

function handleSent() {
  closeSuggestEdit()
  showThanks()
}
</script>

<template>
  <SuggestEditDialog
    v-if="request"
    :key="request.bar ? request.bar.id : 'new'"
    :bar="request.bar"
    :lang="lang"
    @close="closeSuggestEdit"
    @sent="handleSent"
  />

  <!-- On <body>: #app is zoomed on desktop, which would misplace a fixed box -->
  <Teleport to="body">
    <div v-if="thanksVisible" class="suggest-thanks" role="status">
      <img src="/gaichan/gaichanicon.png" class="suggest-thanks-face" alt="" />
      <span class="suggest-thanks-text">
        <span class="suggest-thanks-title">{{ t('suggestThanksTitle') }}</span>
        <span>{{ t('suggestThanksText') }}</span>
      </span>
      <button class="suggest-thanks-close" :title="t('close')" :aria-label="t('close')" @click="thanksVisible = false">
        <span class="suggest-thanks-close-box">&#10005;</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/* A small Gai-chan message window, like the deep-link "read the rules" balloon */
.suggest-thanks {
  position: fixed;
  left: 8px;
  bottom: calc(var(--taskbar-height, 32px) * var(--thanks-zoom, 1.25) + 8px);
  z-index: 2100;
  display: flex;
  align-items: stretch;
  max-width: min(340px, calc(100vw - 16px));
  background: var(--win-bg);
  padding: 3px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.6);
  font-family: var(--win-font);
  color: var(--win-text);
}

.suggest-thanks-face {
  width: 32px;
  height: 32px;
  margin: 6px 0 6px 6px;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.suggest-thanks-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.3;
}

.suggest-thanks-title {
  color: var(--valhalla-orange);
  font-weight: bold;
}

.suggest-thanks-close {
  flex-shrink: 0;
  width: 40px;
  min-height: 44px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 2px;
  background: transparent;
  border: none;
  cursor: var(--cursor-pointer);
}

.suggest-thanks-close-box {
  width: 16px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--win-bg);
  color: var(--win-text);
  font-size: 8px;
  line-height: 1;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

@media (max-width: 768px) {
  /* No zoom on mobile: the taskbar is its CSS height */
  .suggest-thanks { --thanks-zoom: 1; }
}
</style>
