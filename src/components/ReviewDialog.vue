<script setup>
import { ref, computed, onMounted } from 'vue'
import WinButton from './win2000/WinButton.vue'
import { useReviews } from '../composables/useReviews.js'
import { useChat } from '../composables/useChat.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  bar: { type: Object, required: true },
  lang: { type: String, default: 'en' },
})
const emit = defineEmits(['done'])

const { t } = useI18n(computed(() => props.lang))
const { submitReview } = useReviews()
const { nickname } = useChat()

const phase = ref('ask')   // 'ask' | 'write'
const reviewText = ref('')
const submitting = ref(false)
const canvasRef = ref(null)
const canvasTouched = ref(false)
const selectedColor = ref('#ffffff')
const drawing = ref(false)
const lastPos = ref(null)
const selectedTool = ref('pen')  // 'pen' | 'eraser'

const COLORS = ['#ffffff', '#ffe566', '#93c5fd']

const charCount = computed(() => reviewText.value.length)
const canSubmit = computed(() => reviewText.value.trim().length > 0 || canvasTouched.value)

const displayName = computed(() => {
  if (!props.bar) return ''
  return props.lang === 'jp' ? (props.bar.name_jp || props.bar.name_en) : (props.bar.name_en || props.bar.name_jp)
})

function getCtx() {
  if (!canvasRef.value) return null
  const ctx = canvasRef.value.getContext('2d')
  return ctx
}

onMounted(() => {
  if (canvasRef.value) {
    const ctx = getCtx()
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 280, 140)
  }
})

function getPos(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  }
}

function startDraw(e) {
  e.preventDefault()
  drawing.value = true
  lastPos.value = getPos(e)
  canvasTouched.value = true
}

function moveDraw(e) {
  if (!drawing.value) return
  e.preventDefault()
  const ctx = getCtx()
  if (!ctx) return
  const pos = getPos(e)
  ctx.beginPath()
  ctx.lineWidth = selectedTool.value === 'eraser' ? 10 : 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = selectedTool.value === 'eraser' ? '#000000' : selectedColor.value
  ctx.moveTo(lastPos.value.x, lastPos.value.y)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastPos.value = pos
}

function endDraw() {
  drawing.value = false
  lastPos.value = null
}

function clearCanvas() {
  const ctx = getCtx()
  if (!ctx) return
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 280, 140)
  canvasTouched.value = false
}

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    let drawingData = null
    if (canvasTouched.value && canvasRef.value) {
      drawingData = canvasRef.value.toDataURL('image/png')
    }
    await submitReview({
      barId: props.bar.id,
      nickname: nickname.value,
      text: reviewText.value.trim() || ' ',
      drawing: drawingData,
    })
  } catch (err) {
    console.error('Review submit error:', err)
  } finally {
    submitting.value = false
    emit('done')
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="review-overlay" @click.self="emit('done')">
      <!-- Phase 1: Ask -->
      <div v-if="phase === 'ask'" class="win-dialog">
        <div class="win-dialog-titlebar">
          <span class="win-dialog-title">GAI OS</span>
          <button class="win-ctrl-btn" @click="emit('done')"><span class="win-ctrl-icon">&#10005;</span></button>
        </div>
        <div class="win-dialog-body ask-body">
          <p class="ask-text">{{ t('leaveReview') }}</p>
          <div class="ask-actions">
            <WinButton @click="phase = 'write'">{{ t('reviewPromptYes') }}</WinButton>
            <WinButton @click="emit('done')">{{ t('reviewPromptNo') }}</WinButton>
          </div>
        </div>
      </div>

      <!-- Phase 2: Write -->
      <div v-else class="win-dialog write-dialog">
        <div class="win-dialog-titlebar">
          <span class="win-dialog-title">{{ t('reviews') }}: {{ displayName }}</span>
          <button class="win-ctrl-btn" @click="emit('done')"><span class="win-ctrl-icon">&#10005;</span></button>
        </div>
        <div class="win-dialog-body">
          <textarea
            v-model="reviewText"
            class="review-textarea"
            :placeholder="t('reviewPlaceholder')"
            maxlength="500"
          ></textarea>
          <div class="char-counter">{{ charCount }}/500</div>

          <div class="canvas-section">
            <div class="canvas-toolbar">
              <span class="canvas-label">Draw? (optional)</span>
              <div class="color-swatches">
                <button
                  v-for="c in COLORS"
                  :key="c"
                  :class="['color-swatch', { active: selectedColor === c && selectedTool === 'pen' }]"
                  :style="{ background: c }"
                  @click="selectedColor = c; selectedTool = 'pen'"
                />
              </div>
              <button
                :class="['tool-btn', { active: selectedTool === 'eraser' }]"
                @click="selectedTool = 'eraser'"
              >Eraser</button>
              <button class="tool-btn" @click="clearCanvas">Clear</button>
            </div>
            <canvas
              ref="canvasRef"
              width="280"
              height="140"
              class="review-canvas"
              @mousedown="startDraw"
              @mousemove="moveDraw"
              @mouseup="endDraw"
              @mouseleave="endDraw"
              @touchstart="startDraw"
              @touchmove="moveDraw"
              @touchend="endDraw"
            />
          </div>

          <div class="write-actions">
            <WinButton :disabled="!canSubmit || submitting" @click="handleSubmit">
              {{ submitting ? '...' : t('submitReview') }}
            </WinButton>
            <WinButton @click="emit('done')">Skip</WinButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.review-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-dialog {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.6);
  padding: 3px;
  width: 340px;
  max-width: 95vw;
}

.write-dialog {
  width: 360px;
}

.win-dialog-titlebar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 3px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
}

.win-dialog-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 2px;
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

.win-ctrl-icon {
  font-size: 8px;
  font-weight: bold;
  color: var(--win-text);
  line-height: 1;
}

.win-dialog-body {
  padding: 12px 10px 10px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.ask-body {
  text-align: center;
}

.ask-text {
  margin: 0 0 14px;
  font-size: 12px;
}

.ask-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.review-textarea {
  width: 100%;
  height: 80px;
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  font-family: var(--win-font);
  font-size: 11px;
  color: var(--win-text);
  padding: 4px;
  resize: none;
  box-sizing: border-box;
}

.char-counter {
  text-align: right;
  font-size: 10px;
  color: var(--win-text-disabled);
  margin-bottom: 8px;
}

.canvas-section {
  margin-bottom: 10px;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.canvas-label {
  font-size: 10px;
  color: var(--win-text-disabled);
}

.color-swatches {
  display: flex;
  gap: 3px;
}

.color-swatch {
  width: 14px;
  height: 14px;
  border: none;
  cursor: pointer;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  padding: 0;
}

.color-swatch.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    0 0 0 2px var(--valhalla-orange);
}

.tool-btn {
  padding: 1px 6px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  cursor: pointer;
}

.tool-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
}

.review-canvas {
  display: block;
  width: 280px;
  height: 140px;
  max-width: 100%;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  touch-action: none;
  cursor: crosshair;
}

.write-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--win-border-dark);
}
</style>
