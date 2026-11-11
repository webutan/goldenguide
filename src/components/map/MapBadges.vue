<script setup>
// Bar count badges (rendered by the parent only when zoomed out).
import { devTrackRenders } from '../../utils/devPerf.js'

defineProps({
  // key → { cx, cy, count, dimmed, active }
  badges: { type: Object, required: true },
  // counter-rotation (degrees) that keeps the digits upright on screen
  rotation: { type: Number, default: 0 },
})

devTrackRenders('MapBadges')
</script>

<template>
  <g class="filter-count-badges" style="pointer-events: none">
    <g
      v-for="(badge, bldgId) in badges"
      :key="bldgId"
      :transform="`translate(${badge.cx}, ${badge.cy}) rotate(${rotation})`"
    >
      <text
        x="0" y="0"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="80"
        font-weight="bold"
        :fill="badge.dimmed ? '#666' : (badge.active ? '#ffcc44' : '#ffffff')"
        :opacity="badge.dimmed ? 0.3 : 1"
        stroke="#1a0800"
        stroke-width="14"
        paint-order="stroke"
        font-family="var(--win-font), sans-serif"
      >{{ badge.count }}</text>
    </g>
  </g>
</template>
