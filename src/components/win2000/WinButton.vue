<script setup>
defineProps({
  pressed: Boolean,
  disabled: Boolean,
  small: Boolean,
})
defineEmits(['click'])
</script>

<template>
  <button
    :class="['win-btn', { pressed, small }]"
    :disabled="disabled"
    @click.stop="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.win-btn {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  background: var(--win-bg);
  color: var(--win-text);
  border: none;
  padding: 4px 12px;
  cursor: pointer;
  min-width: 75px;
  min-height: 23px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
  outline: none;
  user-select: none;
}

.win-btn:active,
.win-btn.pressed {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
  padding: 5px 11px 3px 13px;
}

.win-btn:focus-visible {
  outline: 1px dotted #000;
  outline-offset: -4px;
}

.win-btn:disabled {
  color: var(--win-text-disabled);
  cursor: default;
}

.win-btn.small {
  min-width: auto;
  min-height: auto;
  padding: 2px 6px;
}
</style>
