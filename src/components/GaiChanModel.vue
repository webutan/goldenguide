<script setup>
// 3D Gai-chan for the VN screens. Lazy-loads three.js + the model; until it's ready
// (or if WebGL is unavailable) the regular PNG sprite passed as `fallbackSrc` is shown.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  mood: { type: String, default: 'neutral' },      // see MOODS in gaichan3d/GaiChanStage.js
  pose: { type: String, default: null },           // optional override of the mood's pose
  prop: { type: String, default: null },           // held item (camera, can, cigarette …)
  talking: { type: Boolean, default: false },
  framing: { type: String, default: 'bust' },      // bust | half | full
  pixelHeight: { type: Number, default: 150 },     // internal render height (lower = chunkier)
  followPointer: { type: Boolean, default: true },
  fallbackSrc: { type: String, default: '/gaichan/gaichanmouthclosed.png' },
})
const emit = defineEmits(['ready', 'poke', 'fallback'])

const wrap = ref(null)
const canvas = ref(null)
const ready = ref(false)
let stage = null
let ro = null
let io = null
let idleTimer = null
let disposed = false

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function onPointerMove(e) {
  if (!stage || !wrap.value) return
  const r = wrap.value.getBoundingClientRect()
  if (!r.width) return
  // Normalised so the pointer anywhere over the dialogue panel gives a moderate turn
  const x = (e.clientX - (r.left + r.width / 2)) / (r.width * 1.6)
  const y = -(e.clientY - (r.top + r.height * 0.3)) / (r.height * 2.2)
  stage.lookAt(x, y)
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => stage?.lookAway(), 3500)
}

function onPointerLeave() { stage?.lookAway() }

function onClick(e) {
  if (!stage || !ready.value) return
  const r = canvas.value.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * 2 - 1
  const y = -((e.clientY - r.top) / r.height) * 2 + 1
  if (stage.hitTest(x, y)) {
    e.stopPropagation()
    stage.poke()
    emit('poke')
  }
}

function onVisibility() { stage?.setVisible(!document.hidden) }

onMounted(async () => {
  let mod
  try {
    mod = await import('../gaichan3d/GaiChanStage.js')
    if (disposed) return
    if (!mod.webglAvailable()) throw new Error('WebGL unavailable')
    stage = new mod.GaiChanStage(canvas.value, {
      framing: props.framing,
      pixelHeight: props.pixelHeight,
      reducedMotion,
    })
    stage.setMood(props.mood)
    await stage.load()
    if (disposed) { stage.dispose(); stage = null; return }
  } catch (err) {
    console.warn('[GaiChanModel] falling back to sprite:', err)
    stage?.dispose()
    stage = null
    emit('fallback', err)
    return
  }

  stage.setMood(props.mood)
  stage.setPose(props.pose)
  stage.setProp(props.prop)
  stage.setTalking(props.talking)

  const r = wrap.value.getBoundingClientRect()
  stage.resize(r.width, r.height)
  ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    stage?.resize(width, height)
  })
  ro.observe(wrap.value)

  io = new IntersectionObserver(([entry]) => stage?.setVisible(entry.isIntersecting && !document.hidden))
  io.observe(wrap.value)
  document.addEventListener('visibilitychange', onVisibility)
  if (props.followPointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
  }

  stage.start()
  if (import.meta.env.DEV) (window.__gaichanStages ||= []).push(stage)
  ready.value = true
  emit('ready', stage)
})

onBeforeUnmount(() => {
  disposed = true
  clearTimeout(idleTimer)
  ro?.disconnect()
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointermove', onPointerMove)
  document.documentElement.removeEventListener('pointerleave', onPointerLeave)
  if (import.meta.env.DEV && stage) window.__gaichanStages = window.__gaichanStages?.filter(s => s !== stage)
  stage?.dispose()
  stage = null
})

watch(() => props.mood, v => stage?.setMood(v))
watch(() => props.pose, v => stage?.setPose(v))
watch(() => props.prop, v => stage?.setProp(v))
watch(() => props.talking, v => stage?.setTalking(v))
watch(() => props.framing, v => stage?.setFraming(v))

defineExpose({ getStage: () => stage })
</script>

<template>
  <div ref="wrap" class="gaichan-model" @click="onClick">
    <img
      v-if="!ready"
      :src="fallbackSrc"
      class="gaichan-model__fallback"
      alt="Gai-chan"
      draggable="false"
    />
    <canvas
      ref="canvas"
      class="gaichan-model__canvas"
      :class="{ 'is-ready': ready }"
      aria-label="Gai-chan"
      role="img"
    ></canvas>
  </div>
</template>

<style scoped>
.gaichan-model {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.gaichan-model__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  opacity: 0;
  transition: opacity 0.25s steps(4, end);
}
.gaichan-model__canvas.is-ready { opacity: 1; }

/* Matches .screen-sprite in GaiChanDialogue so the swap is seamless */
.gaichan-model__fallback {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 112%;
  object-fit: cover;
  object-position: 50% 15%;
  image-rendering: pixelated;
}
</style>
