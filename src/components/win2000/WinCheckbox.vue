<script setup>
defineProps({
  modelValue: Boolean,
  label: String,
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="win-checkbox">
    <span class="win-checkbox-box" :class="{ checked: modelValue }">
      <span v-if="modelValue" class="win-checkbox-mark">&#10003;</span>
    </span>
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
      class="win-checkbox-input"
    />
    <span class="win-checkbox-label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.win-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  user-select: none;
}

.win-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.win-checkbox-box {
  width: 13px;
  height: 13px;
  background: var(--win-bg-dark);
  flex-shrink: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-checkbox-mark {
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
  color: var(--win-text);
}

.win-checkbox-label {
  line-height: 1.2;
}
</style>
