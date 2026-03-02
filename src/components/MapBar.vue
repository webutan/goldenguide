<script setup>
import { computed } from 'vue'
import { useVisited } from '../composables/useVisited.js'

const props = defineProps({
  bar: Object,
  x: Number,
  y: Number,
  width: { type: Number, default: 90 },
  height: { type: Number, default: 40 },
  dimmed: Boolean,
  tagMap: Object,
})

const emit = defineEmits(['select'])

const { isVisited } = useVisited()

const visited = computed(() => isVisited(props.bar.id))

const displayName = computed(() => {
  const name = props.bar.name_en || props.bar.name_jp
  if (name.length > 11) return name.slice(0, 10) + '…'
  return name
})

const fillColor = computed(() => {
  if (props.bar.tags.length > 0 && props.tagMap) {
    const tag = props.tagMap[props.bar.tags[0]]
    if (tag) return tag.color + '33'
  }
  return '#3a3a5c'
})

const strokeColor = computed(() => {
  if (props.bar.tags.length > 0 && props.tagMap) {
    const tag = props.tagMap[props.bar.tags[0]]
    if (tag) return tag.color + '88'
  }
  return '#5a5a7c'
})
</script>

<template>
  <g
    :class="['bar-rect', { dimmed }]"
    @click="emit('select', bar)"
  >
    <rect
      :x="x"
      :y="y"
      :width="width"
      :height="height"
      :fill="fillColor"
      :stroke="strokeColor"
      stroke-width="1"
      rx="3"
    />
    <text
      class="bar-text"
      :x="x + width / 2"
      :y="y + height / 2 - 3"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#e0e0e0"
      font-size="8"
    >
      {{ displayName }}
    </text>
    <text
      class="bar-text"
      :x="x + width / 2"
      :y="y + height / 2 + 10"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#666"
      font-size="7"
    >
      {{ bar.floor >= 0 ? bar.floor + 'F' : 'B' + Math.abs(bar.floor) + 'F' }}
      <tspan v-if="bar.charge" dx="2" fill="#888">{{ bar.charge }}</tspan>
    </text>
    <g v-if="visited" class="visited-marker">
      <circle
        :cx="x + width - 8"
        :cy="y + 8"
        r="6"
        fill="#e94560"
      />
      <text
        :x="x + width - 8"
        :y="y + 9"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-size="7"
      >✓</text>
    </g>
  </g>
</template>
