<script setup>
// Partition colour overlays. This is the only map layer that depends on
// hover / selection, so a hover re-renders just these rects.
import { devTrackRenders } from '../../utils/devPerf.js'

const props = defineProps({
  // buildingId → { rects, angle, cx, cy } (pure geometry, see utils/mapGeometry.js)
  geometry: { type: Object, required: true },
  // buildingId → [{ dimmed, highlighted }] per slot
  slotState: { type: Object, required: true },
  // reactive { hovered, selected } building IDs, read here so the parent doesn't re-render
  interaction: { type: Object, required: true },
})

devTrackRenders('MapPartitions')

const NEUTRAL = { dimmed: false, highlighted: false }

function slot(bldgId, index) {
  return props.slotState[bldgId]?.[index] || NEUTRAL
}

function slotOpacity(bldgId, index) {
  const s = slot(bldgId, index)
  const active = props.interaction.selected === bldgId || props.interaction.hovered === bldgId
  if (s.dimmed) return active ? 0.3 : 0.12
  if (s.highlighted) return 0.9
  return active ? 0.95 : 0.75
}
</script>

<template>
  <!-- IMPORTANT: clip-path is on the OUTER <g> (no transform) so the clip region
       is in the building's coordinate space. The rotation (splitAngle) is on the
       INNER <g> so the split line rotates while the clip boundary stays on the building. -->
  <g class="partition-overlay">
    <g
      v-for="(pdata, bldgId) in geometry"
      :key="bldgId"
      :clip-path="`url(#pclip-${bldgId})`"
      style="pointer-events: none"
    >
      <g :transform="pdata.angle !== 0 ? `rotate(${pdata.angle}, ${pdata.cx}, ${pdata.cy})` : undefined">
        <rect
          v-for="(rect, ri) in pdata.rects"
          :key="ri"
          :x="rect.x" :y="rect.y"
          :width="rect.width" :height="rect.height"
          :fill="slot(bldgId, ri).highlighted ? '#ffffff' : rect.color"
          :opacity="slotOpacity(bldgId, ri)"
        />
      </g>
    </g>
  </g>
</template>
