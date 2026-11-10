<script setup>
// Bar name labels (rendered by the parent only when sufficiently zoomed in).
import { devTrackRenders } from '../../utils/devPerf.js'
import { flipsWhenTurned } from '../../utils/mapGeometry.js'

const props = defineProps({
  // key → { cx, cy, groupRotation, screenAngle, items: [{ barId, text, dx, dy, fontSize, fill, opacity, writingMode }] }
  labels: { type: Object, required: true },
  // how far the user has turned the map, in degrees
  turn: { type: Number, default: 0 },
})

// Labels are fitted to their building, so they turn with the map. One that
// would end up upside down is turned half a turn about its own middle: it
// stays where it is and keeps its place in the stack.
function flipped(bldgLabels) {
  return props.turn !== 0 && flipsWhenTurned(bldgLabels.screenAngle, props.turn)
}

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
        :transform="flipped(bldgLabels) ? `rotate(180, ${label.dx}, ${label.dy})` : undefined"
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
