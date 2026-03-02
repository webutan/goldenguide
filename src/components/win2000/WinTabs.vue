<script setup>
defineProps({
  tabs: Array, // [{ value, label }]
  modelValue: String,
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="win-tabs">
    <div class="win-tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['win-tab', { active: modelValue === tab.value }]"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="win-tabs-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.win-tabs {
  display: flex;
  flex-direction: column;
}

.win-tabs-header {
  display: flex;
  gap: 0;
  padding-left: 4px;
}

.win-tab {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg);
  border: none;
  padding: 3px 10px;
  cursor: pointer;
  position: relative;
  top: 2px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px 0 0 var(--win-border-dark),
    1px 0 0 var(--win-border-darkest);
  z-index: 0;
}

.win-tab.active {
  z-index: 2;
  top: 0;
  padding-bottom: 5px;
  color: var(--valhalla-orange);
  font-weight: bold;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px 0 0 var(--win-border-dark),
    1px 0 0 var(--win-border-darkest);
}

.win-tabs-body {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
  padding: 8px;
  position: relative;
  z-index: 1;
}
</style>
