<script setup>
// Placeholder shown while a lazily-loaded window chunk is downloading.
// defineAsyncComponent forwards the wrapper's props, so `lang` arrives
// automatically when the real component takes one.
import { useI18n } from '../../composables/useI18n.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const { t } = useI18n(props.lang)
</script>

<template>
  <div class="win-loading" role="status" aria-live="polite">
    <img class="win-loading-icon" src="/cursors/wait.gif" alt="" width="32" height="32" />
    <span>{{ t('loading') }}</span>
  </div>
</template>

<style scoped>
.win-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 80px;
  height: 100%;
  padding: 16px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg);
  cursor: var(--cursor-wait);
}

.win-loading-icon {
  image-rendering: pixelated;
}
</style>
