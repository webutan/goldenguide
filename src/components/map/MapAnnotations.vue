<script setup>
// Street / landmark annotations (text or image), draggable in admin mode.
import { devTrackRenders } from '../../utils/devPerf.js'
import { flipsWhenTurned } from '../../utils/mapGeometry.js'

const props = defineProps({
  annotations: { type: Array, required: true },
  adminMode: Boolean,
  selectedId: { type: [String, Number], default: null },
  lang: { type: String, default: 'en' },
  // rotation of the whole map (the annotations are drawn inside it) and how
  // far the user has turned the map on top of that, in degrees
  mapRotation: { type: Number, default: 0 },
  turn: { type: Number, default: 0 },
})

const emit = defineEmits(['annotationMousedown'])

devTrackRenders('MapAnnotations')

// Text annotations run along their street, so they turn with the map; one
// that would end up upside down is turned half a turn. The text sits on its
// baseline at (x, y): the half turn is about the middle of the letters, a
// third of the font size above that. (Images always turn with the map.)
function textTransform(ann) {
  const parts = []
  if (ann.rotation) parts.push(`rotate(${ann.rotation}, ${ann.x}, ${ann.y})`)
  if (props.turn !== 0 && flipsWhenTurned(props.mapRotation + (ann.rotation || 0), props.turn)) {
    parts.push(`rotate(180, ${ann.x}, ${ann.y - ann.font_size * 0.35})`)
  }
  return parts.length ? parts.join(' ') : undefined
}

function annotationText(ann) {
  if (props.lang === 'jp' && ann.text_jp) return ann.text_jp
  return ann.text_en || ''
}
</script>

<template>
  <g class="annotations">
    <template v-for="ann in annotations" :key="ann.id">
      <image v-if="ann.image_url"
        :href="`/uploads/${ann.image_url}`"
        :x="ann.x - (ann.image_width || 200) / 2"
        :y="ann.y - (ann.image_height || 200) / 2"
        :width="ann.image_width || 200"
        :height="ann.image_height || 200"
        :transform="ann.rotation ? `rotate(${ann.rotation}, ${ann.x}, ${ann.y})` : undefined"
        preserveAspectRatio="xMidYMid meet"
        :class="['annotation-text', { 'annotation-admin': adminMode, 'annotation-selected': selectedId === ann.id }]"
        :style="adminMode ? 'cursor: var(--cursor-grab)' : 'pointer-events: none'"
        @mousedown="emit('annotationMousedown', $event, ann)"
      />
      <text v-else
        :x="ann.x"
        :y="ann.y"
        :fill="ann.color"
        :font-size="ann.font_size"
        :transform="textTransform(ann)"
        text-anchor="middle"
        font-family="var(--win-font), monospace"
        font-weight="bold"
        :class="['annotation-text', { 'annotation-admin': adminMode, 'annotation-selected': selectedId === ann.id }]"
        :style="adminMode ? 'cursor: var(--cursor-grab)' : 'pointer-events: none'"
        @mousedown="emit('annotationMousedown', $event, ann)"
      >{{ annotationText(ann) }}</text>
    </template>
  </g>
</template>

<style scoped>
.annotation-text {
  opacity: 0.6;
  letter-spacing: 4px;
}

.annotation-admin {
  opacity: 0.8;
}

.annotation-selected {
  opacity: 1;
  stroke: var(--valhalla-orange);
  stroke-width: 1;
  paint-order: stroke;
}
</style>
