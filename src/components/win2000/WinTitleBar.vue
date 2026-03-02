<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  active: { type: Boolean, default: true },
  showMinimize: { type: Boolean, default: true },
  showMaximize: { type: Boolean, default: false },
  showClose: { type: Boolean, default: true },
})

defineEmits(['minimize', 'maximize', 'close', 'mousedown'])
</script>

<template>
  <div
    :class="['win-titlebar', { active }]"
    @mousedown="$emit('mousedown', $event)"
  >
    <span v-if="icon" class="win-titlebar-icon">{{ icon }}</span>
    <span class="win-titlebar-text">{{ title }}</span>
    <div class="win-titlebar-controls">
      <button v-if="showMinimize" class="win-ctrl-btn" @click.stop="$emit('minimize')" title="Minimize">
        <span class="win-ctrl-icon">_</span>
      </button>
      <button v-if="showMaximize" class="win-ctrl-btn" @click.stop="$emit('maximize')" title="Maximize">
        <span class="win-ctrl-icon">&#9633;</span>
      </button>
      <button v-if="showClose" class="win-ctrl-btn win-close-btn" @click.stop="$emit('close')" title="Close">
        <span class="win-ctrl-icon">&#10005;</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.win-titlebar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 3px;
  background: var(--win-title-inactive);
  color: var(--win-title-text-inactive);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  cursor: default;
  flex-shrink: 0;
}

.win-titlebar.active {
  background: var(--win-title-active);
  color: var(--win-title-text-active);
}

.win-titlebar-icon {
  margin-right: 3px;
  font-size: 12px;
}

.win-titlebar-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 2px;
}

.win-titlebar-controls {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.win-ctrl-btn {
  width: 16px;
  height: 14px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.win-ctrl-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.win-ctrl-icon {
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  line-height: 1;
}
</style>
