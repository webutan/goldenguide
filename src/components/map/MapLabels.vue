<script setup>
// Bar name labels (rendered by the parent only when sufficiently zoomed in).
import { devTrackRenders } from '../../utils/devPerf.js'

defineProps({
  // key → { cx, cy, groupRotation, items: [{ barId, text, dx, dy, fontSize, fill, opacity, writingMode }] }
  labels: { type: Object, required: true },
})

devTrackRenders('MapLabels')
</script>

<template>
  <g class="building-labels" style="pointer-events: none">
    <g
      v-for="(bldgLabels, bldgId) in labels"
      :key="bldgId"
      :transform="`translate(${bldgLabels.cx}, ${bldgLabels.cy}) rotate(${bldgLabels.groupRotation})`"
    >
      <text
        v-for="label in bldgLabels.items"
        :key="label.barId"
        :x="label.dx"
        :y="label.dy"
        :font-size="label.fontSize"
        :fill="label.fill"
        :opacity="label.opacity"
        :style="label.writingMode ? `font-weight:bold;writing-mode:${label.writingMode}` : 'font-weight:bold'"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="var(--win-font), sans-serif"
      >{{ label.text }}</text>
    </g>
  </g>
</template>

<style scoped>
/* Building name labels */
.building-labels text {
  paint-order: stroke fill;
  stroke: rgba(0, 0, 0, 0.9);
  stroke-width: 5;
  stroke-linejoin: round;
  font-family: var(--win-font), 'MS Gothic', sans-serif;
  letter-spacing: 0.5px;
}
</style>
