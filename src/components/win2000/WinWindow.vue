<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import WinTitleBar from './WinTitleBar.vue'
import WinScrollContainer from './WinScrollContainer.vue'
import { useDraggable, clampWindowPosition } from '../../composables/useDraggable.js'

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

const rootRef = ref(null)

// Windows are positioned inside their offset parent (the desktop area, which
// ends where the taskbar starts), in that element's own CSS pixels.
function measure() {
  const el = rootRef.value
  const container = el?.offsetParent // null while minimised (display: none)
  if (!el || !container) return null
  const bar = el.querySelector('.win-titlebar')
  const controls = el.querySelector('.win-titlebar-controls')
  return {
    width: el.offsetWidth,
    titleBarHeight: bar ? bar.offsetTop + bar.offsetHeight : 0,
    grabInsetRight: controls ? el.offsetWidth - controls.offsetLeft : 0,
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight,
  }
}

function clamp(px, py) {
  const m = measure()
  return m ? clampWindowPosition({ x: px, y: py, ...m }) : { x: px, y: py }
}

// #app is rendered with CSS `zoom` on desktop: pointer coordinates are in
// viewport px, window positions in zoomed px.
function getScale() {
  const el = rootRef.value
  if (!el) return 1
  if (typeof el.currentCSSZoom === 'number') return el.currentCSSZoom
  return el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1
}

const { x, y, startDrag, setPosition, reclamp } = useDraggable(props.initialX, props.initialY, { clamp, getScale })

defineExpose({ setPosition })

// Pull the window back into view when the viewport shrinks, and when it is
// shown again after the viewport changed while it was minimised.
onMounted(() => {
  window.addEventListener('resize', reclamp)
  nextTick(reclamp)
})
onUnmounted(() => window.removeEventListener('resize', reclamp))
watch(() => props.minimized, (min) => { if (!min) nextTick(reclamp) })

const style = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: props.height ? (typeof props.height === 'number' ? `${props.height}px` : props.height) : 'auto',
  zIndex: props.zIndex,
  display: props.minimized ? 'none' : 'flex',
}))

</script>

<template>
  <div
    ref="rootRef"
    class="win-window"
    :style="style"
    @pointerdown="emit('focus')"
  >
    <WinTitleBar
      :title="title"
      :icon="icon"
      :active="active"
      :show-minimize="showMinimize"
      :show-maximize="showMaximize"
      :show-close="showClose"
      @pointerdown="startDrag"
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
