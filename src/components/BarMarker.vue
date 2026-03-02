<script setup>
import { computed } from 'vue'
import { useVisited } from '../composables/useVisited.js'

const props = defineProps({
  bar: Object,
  x: Number,
  y: Number,
  dimmed: Boolean,
  tagMap: Object,
  adminMode: Boolean,
})

const emit = defineEmits(['select', 'dragstart'])

const { isVisited } = useVisited()
const visited = computed(() => isVisited(props.bar.id))

const displayName = computed(() => {
  return props.bar.name_en || props.bar.name_jp || '?'
})

const markerColor = computed(() => {
  const tags = props.bar.tags || []
  if (tags.length > 0 && props.tagMap) {
    const firstTag = typeof tags[0] === 'string' ? tags[0] : tags[0].id
    const tag = props.tagMap[firstTag]
    if (tag) return tag.color
  }
  return '#8888aa'
})

const MARKER_R = 18
</script>

<template>
  <g
    :class="['bar-marker', { dimmed, 'admin-draggable': adminMode }]"
    :transform="`translate(${x}, ${y})`"
    @click.stop="emit('select', bar)"
    @mousedown="adminMode ? emit('dragstart', $event) : null"
  >
    <circle
      :r="MARKER_R"
      :fill="markerColor"
      fill-opacity="0.7"
      :stroke="markerColor"
      stroke-width="2"
      stroke-opacity="0.9"
    />

    <text
      text-anchor="middle"
      dominant-baseline="central"
      fill="white"
      font-size="11"
      font-weight="bold"
      font-family="Tahoma, sans-serif"
      style="pointer-events: none"
    >
      {{ bar.floor >= 0 ? bar.floor + 'F' : 'B' + Math.abs(bar.floor) + 'F' }}
    </text>

    <text
      y="28"
      text-anchor="middle"
      dominant-baseline="hanging"
      fill="#c0e0e0"
      font-size="9"
      font-family="Tahoma, sans-serif"
      style="pointer-events: none"
    >
      {{ displayName.length > 12 ? displayName.slice(0, 11) + '...' : displayName }}
    </text>

    <g v-if="visited">
      <circle cx="12" cy="-12" r="7" fill="#e94560" />
      <text x="12" y="-11" text-anchor="middle" dominant-baseline="central" fill="white" font-size="8" font-family="Tahoma, sans-serif" style="pointer-events: none">&#10003;</text>
    </g>
  </g>
</template>

<style scoped>
.bar-marker {
  cursor: pointer;
  transition: opacity 0.2s;
}

.bar-marker:hover circle:first-child {
  fill-opacity: 1;
  stroke-width: 3;
}

.bar-marker.dimmed {
  opacity: 0.15;
  pointer-events: none;
}

.bar-marker.admin-draggable {
  cursor: move;
}
</style>
