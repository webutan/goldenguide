<script setup>
import TagIcon from './TagIcon.vue'

defineProps({
  tags: Array,
})
</script>

<template>
  <fieldset class="win-groupbox">
    <legend class="win-groupbox-legend">Legend</legend>
    <div class="legend-items">
      <div v-for="tag in tags" :key="tag.id" class="legend-item">
        <span class="legend-swatch" :style="{ background: tag.color }"></span>
        <TagIcon :icon="tag.icon" :size="11" />
        <span>{{ tag.label }}</span>
      </div>
      <div class="legend-item" style="margin-top: 4px">
        <span class="legend-swatch" style="background: #e94560"></span>
        <span>&#10003; Visited</span>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.win-groupbox {
  border: 2px groove var(--win-border-light);
  padding: 8px 6px 6px;
  margin: 6px 0;
}

.win-groupbox-legend {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  padding: 0 4px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.legend-swatch {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  box-shadow:
    inset 1px 1px 0 rgba(255,255,255,0.3),
    inset -1px -1px 0 rgba(0,0,0,0.3);
}
</style>
