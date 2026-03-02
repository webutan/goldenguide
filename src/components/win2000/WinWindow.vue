<script setup>
import { computed } from 'vue'
import WinTitleBar from './WinTitleBar.vue'
import WinScrollContainer from './WinScrollContainer.vue'
import { useDraggable } from '../../composables/useDraggable.js'

const props = defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  width: { type: [Number, String], default: 260 },
  height: { type: [Number, String], default: null },
  initialX: { type: Number, default: 50 },
  initialY: { type: Number, default: 50 },
  active: { type: Boolean, default: true },
  minimized: { type: Boolean, default: false },
  showMinimize: { type: Boolean, default: true },
  showMaximize: { type: Boolean, default: false },
  showClose: { type: Boolean, default: true },
  zIndex: { type: Number, default: 10 },
  resizable: { type: Boolean, default: false },
})

const emit = defineEmits(['minimize', 'maximize', 'close', 'focus'])

const { x, y, startDrag } = useDraggable(props.initialX, props.initialY)

const style = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: props.height ? (typeof props.height === 'number' ? `${props.height}px` : props.height) : 'auto',
  zIndex: props.zIndex,
  display: props.minimized ? 'none' : 'flex',
}))

function onTitleMouseDown(e) {
  emit('focus')
  startDrag(e)
}
</script>

<template>
  <div
    class="win-window"
    :style="style"
    @mousedown="emit('focus')"
  >
    <WinTitleBar
      :title="title"
      :icon="icon"
      :active="active"
      :show-minimize="showMinimize"
      :show-maximize="showMaximize"
      :show-close="showClose"
      @mousedown="onTitleMouseDown"
      @minimize="emit('minimize')"
      @maximize="emit('maximize')"
      @close="emit('close')"
    />
    <div class="win-window-body">
      <WinScrollContainer><div class="win-window-body-inner"><slot /></div></WinScrollContainer>
    </div>
  </div>
</template>

<style scoped>
.win-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    2px 2px 6px rgba(0, 0, 0, 0.4);
  padding: 3px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.win-window-body {
  flex: 1;
  overflow: hidden;
  background: var(--win-bg);
  min-height: 0;
  display: flex;
}

.win-window-body-inner {
  padding: 4px;
  flex: 1;
}
</style>
