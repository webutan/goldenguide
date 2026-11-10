<script setup>
// Hover tooltip listing the bars of the hovered building.
import { computed } from 'vue'
import { useVisited } from '../../composables/useVisited.js'
import { useI18n } from '../../composables/useI18n.js'
import { floorColors } from '../../utils/mapGeometry.js'
import { devTrackRenders } from '../../utils/devPerf.js'

const props = defineProps({
  // reactive { visible, x, y, bars }, mutated by the parent; read here so that
  // showing / moving the tooltip doesn't re-render the map
  tooltip: { type: Object, required: true },
  // String(bar.id) → partition colour (falls back to the floor colour)
  barColors: { type: Object, default: () => ({}) },
  lang: { type: String, default: 'en' },
})

devTrackRenders('MapTooltip')

const { isFavorited, isVisited } = useVisited()
const { t } = useI18n(computed(() => props.lang))

// Tooltip bars grouped by floor, sorted descending
const floorGroups = computed(() => {
  const groups = {}
  for (const bar of props.tooltip.bars) {
    const f = bar.floor ?? 1
    if (!groups[f]) groups[f] = []
    groups[f].push(bar)
  }
  return Object.entries(groups)
    .map(([f, bars]) => ({
      floor: Number(f),
      floorLabel: Number(f) < 0 ? `B${Math.abs(Number(f))}F` : `${f}F`,
      bars,
    }))
    .sort((a, b) => b.floor - a.floor)
})

// Primary color for a bar — its partition color if assigned, else its floor color
function barColor(bar) {
  return props.barColors[String(bar.id)] || floorColors(bar.floor ?? 1)[0]
}
</script>

<template>
  <div
    v-if="tooltip.visible"
    class="map-tooltip"
    :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
  >
    <template v-for="group in floorGroups" :key="group.floor">
      <div v-if="floorGroups.length > 1" class="tooltip-floor-header">{{ group.floorLabel }}</div>
      <div v-for="bar in group.bars" :key="bar.id" class="tooltip-bar">
        <span
          class="tooltip-color-swatch"
          :style="{ background: barColor(bar) }"
        ></span>
        <img
          v-if="bar.photo"
          :src="`/uploads/${bar.photo}`"
          :alt="lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)"
          class="tooltip-img"
        />
        <div class="tooltip-info">
          <div class="tooltip-name">
            <span v-if="isFavorited(bar.id)" class="tooltip-fav">&#9829;</span>
            <span v-if="isVisited(bar.id)" class="tooltip-visited">&#10003;</span>
            {{ lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp) }}
          </div>
          <div v-if="bar.name_en && bar.name_jp" class="tooltip-sub">{{ lang === 'jp' ? bar.name_en : bar.name_jp }}</div>
          <div v-if="bar.charge" class="tooltip-meta">{{ t('tooltipCover', { price: `¥${bar.charge}` }) }}</div>
          <div v-if="bar.hours" class="tooltip-meta">{{ bar.hours }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.map-tooltip {
  position: absolute;
  z-index: 100;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    3px 3px 6px rgba(0, 0, 0, 0.5);
  padding: 3px;
  pointer-events: none;
  max-width: 220px;
}

.tooltip-floor-header {
  font-family: var(--win-font);
  font-size: 9px;
  font-weight: bold;
  color: var(--win-text-disabled);
  text-transform: uppercase;
  padding: 2px 3px 1px;
  background: var(--win-bg-dark);
  letter-spacing: 0.5px;
}

.tooltip-bar {
  display: flex;
  gap: 6px;
  padding: 3px;
}

.tooltip-bar + .tooltip-bar {
  border-top: 1px solid var(--win-border-dark);
}

.tooltip-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.tooltip-info {
  min-width: 0;
}

.tooltip-name {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--valhalla-orange);
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-fav {
  color: #e87898;
  margin-right: 2px;
}

.tooltip-visited {
  color: #70d0a0;
  margin-right: 2px;
}

.tooltip-sub {
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text-disabled);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tooltip-meta {
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text-disabled);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

/* Tooltip partition color swatch */
.tooltip-color-swatch {
  width: 6px;
  flex-shrink: 0;
  align-self: stretch;
  border-radius: 1px;
}
</style>
