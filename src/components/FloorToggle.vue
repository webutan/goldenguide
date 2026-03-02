<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: String,
  bars: Array,
})

const emit = defineEmits(['update:modelValue'])

const floorOptions = computed(() => {
  const floors = new Set()
  for (const bar of props.bars) {
    floors.add(bar.floor)
  }
  const sorted = [...floors].sort((a, b) => a - b)
  return [
    { value: 'all', label: 'All' },
    ...sorted.map(f => ({
      value: String(f),
      label: f < 0 ? `B${Math.abs(f)}F` : `${f}F`,
    })),
  ]
})
</script>

<template>
  <div class="floor-toggle">
    <button
      v-for="opt in floorOptions"
      :key="opt.value"
      :class="['floor-btn', { pressed: modelValue === opt.value }]"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.floor-toggle {
  display: flex;
  gap: 1px;
  margin-bottom: 8px;
}

.floor-btn {
  flex: 1;
  padding: 3px 0;
  background: var(--win-bg);
  color: var(--win-text);
  border: none;
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 10px;
  font-weight: 600;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.floor-btn:active,
.floor-btn.pressed {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: #c0c0c0;
}
</style>
