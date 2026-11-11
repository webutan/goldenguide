<script setup>
// Win95 message box host. Mounted once in App.vue; renders the dialog at the
// front of the useDialog() queue. Use useDialog() to open dialogs — never
// mount this component anywhere else.
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import WinTitleBar from './WinTitleBar.vue'
import WinButton from './WinButton.vue'
import { useDialogHost } from '../../composables/useDialog.js'
import { useDraggable } from '../../composables/useDraggable.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})

const { current, settle, dialogLang, t } = useDialogHost()
watch(() => props.lang, (l) => { dialogLang.value = l || 'en' }, { immediate: true })

const ICONS = {
  info: '/icons/msg_info-1.png',
  warning: '/icons/msg_warning-1.png',
  error: '/icons/msg_error-1.png',
  question: '/icons/msg_question-1.png',
}

const boxRef = ref(null)
const inputRef = ref(null)
const buttonRefs = ref([])
const focusedButton = ref(-1)
const flashing = ref(false)

const d = current
const iconSrc = computed(() => (d.value ? ICONS[d.value.icon] || '' : ''))
const title = computed(() => d.value?.title || t('dialogTitle'))
// Win95: the focused button is the default; with focus elsewhere (the text
// field) the dialog's own default button gets the heavy border.
const defaultIndex = computed(() => (focusedButton.value >= 0 ? focusedButton.value : d.value?.defaultButton ?? 0))

function buttonEl(i) {
  const c = buttonRefs.value[i]
  return c?.$el || c || null
}

function finish(value) {
  if (d.value) settle(d.value.id, value)
}

function cancel() {
  if (d.value) finish(d.value.cancelValue)
}

function focusables() {
  if (!boxRef.value) return []
  return [...boxRef.value.querySelectorAll('[data-dialog-focus]')].filter(el => !el.disabled)
}

function onKeydown(e) {
  if (!d.value) return
  // Keep keys away from global shortcuts (map controls etc.)
  e.stopPropagation()
  if (e.isComposing || e.keyCode === 229) return // IME (Japanese input) in progress

  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  } else if (e.key === 'Enter') {
    // A focused button handles Enter natively (fires its own click)
    if (e.target instanceof HTMLButtonElement && e.target.hasAttribute('data-dialog-focus')) return
    e.preventDefault()
    finish(d.value.buttons[defaultIndex.value].value)
  } else if (e.key === 'Tab') {
    const els = focusables()
    if (!els.length) return
    e.preventDefault()
    const i = els.indexOf(document.activeElement)
    const next = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i + 1) % els.length
    els[next].focus()
  }
}

function onFocusIn(e) {
  const i = buttonRefs.value.findIndex((_, idx) => buttonEl(idx) === e.target)
  focusedButton.value = i
}

// Clicking outside a modal box: Win95 flashes the title bar.
let flashTimer = null
function flash() {
  if (flashTimer) return
  let n = 0
  flashTimer = setInterval(() => {
    flashing.value = !flashing.value
    if (++n >= 6) {
      clearInterval(flashTimer)
      flashTimer = null
      flashing.value = false
    }
  }, 70)
  focusInitial()
}

// --- Focus management ---
let returnFocusTo = null

function focusInitial() {
  if (!d.value) return
  if (inputRef.value) {
    inputRef.value.focus()
    inputRef.value.select()
  } else {
    buttonEl(d.value.defaultButton)?.focus()
  }
}

// Focus trap: pull focus back if it escapes the dialog (e.g. via the mouse)
function onDocumentFocusIn(e) {
  if (d.value && boxRef.value && !boxRef.value.contains(e.target)) focusInitial()
}

watch(() => d.value?.id, async (id, oldId) => {
  if (id && !oldId) {
    returnFocusTo = document.activeElement
  }
  focusedButton.value = -1
  stopDrag()
  setPosition(0, 0)
  if (id) {
    await nextTick()
    focusInitial()
  } else if (returnFocusTo && document.contains(returnFocusTo)) {
    returnFocusTo.focus?.()
    returnFocusTo = null
  }
}, { flush: 'post' })

// --- Drag by title bar (mouse, touch, pen) ---
// The position is an offset from the centred spot; keep the title bar on screen.
const { x: dragX, y: dragY, startDrag, stopDrag, setPosition } = useDraggable(0, 0, {
  clamp(px, py) {
    const maxX = window.innerWidth / 2
    const maxY = window.innerHeight / 2
    return {
      x: Math.max(-maxX, Math.min(maxX, px)),
      y: Math.max(-maxY + 20, Math.min(maxY - 20, py)),
    }
  },
})

onMounted(() => document.addEventListener('focusin', onDocumentFocusIn))
onUnmounted(() => {
  document.removeEventListener('focusin', onDocumentFocusIn)
  if (flashTimer) clearInterval(flashTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="d"
      class="win-dialog-overlay"
      @mousedown.self.prevent="flash"
      @keydown="onKeydown"
    >
      <div
        :key="d.id"
        ref="boxRef"
        class="win-dialog"
        :class="`win-dialog--${d.kind}`"
        role="alertdialog"
        aria-modal="true"
        :aria-label="title"
        :aria-describedby="`win-dialog-msg-${d.id}`"
        :style="{ transform: `translate(${dragX}px, ${dragY}px)` }"
        @focusin="onFocusIn"
      >
        <WinTitleBar
          :title="title"
          :active="!flashing"
          :show-minimize="false"
          :show-maximize="false"
          @pointerdown="startDrag"
          @close="cancel"
        />

        <div class="win-dialog-body">
          <img
            v-if="iconSrc"
            :src="iconSrc"
            class="win-dialog-icon"
            width="32"
            height="32"
            alt=""
          />
          <div class="win-dialog-content">
            <p :id="`win-dialog-msg-${d.id}`" class="win-dialog-message">{{ d.message }}</p>
            <input
              v-if="d.input"
              ref="inputRef"
              v-model="d.input.value"
              data-dialog-focus
              class="win-dialog-input"
              :type="d.input.password ? 'password' : 'text'"
              :placeholder="d.input.placeholder"
              :autocomplete="d.input.password ? 'current-password' : 'off'"
              autocapitalize="off"
              spellcheck="false"
              :aria-label="d.message"
            />
          </div>
        </div>

        <div class="win-dialog-buttons">
          <WinButton
            v-for="(b, i) in d.buttons"
            :key="b.key"
            :ref="(el) => { buttonRefs[i] = el }"
            data-dialog-focus
            :class="{ 'is-default': i === defaultIndex }"
            @click="finish(b.value)"
          >{{ b.label || t(b.key) }}</WinButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Above every window, the taskbar and Gai-chan (≤1300); below the BIOS (9999)
   and the CRT scanline overlay. Win95 doesn't dim the desktop behind a
   message box, so the overlay is transparent — it only blocks clicks. */
.win-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.win-dialog {
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 260px;
  max-width: min(440px, calc(100vw - 32px));
  padding: 3px;
  background: var(--win-bg);
  color: var(--win-text);
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    2px 2px 6px rgba(0, 0, 0, 0.4);
}

.win-dialog-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 16px 8px 12px;
}

.win-dialog-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.win-dialog-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.win-dialog-message {
  margin: 0;
  /* Vertically centre one-liners against the 32px icon, like Win95 */
  min-height: 32px;
  display: flex;
  align-items: center;
  line-height: 1.4;
  white-space: pre-line;
  overflow-wrap: anywhere;
  user-select: text;
}

.win-dialog--prompt .win-dialog-message {
  min-height: 0;
}

.win-dialog-input {
  width: 100%;
  min-width: 200px;
  height: 21px;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  border-radius: 0;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.win-dialog-input:focus {
  background: var(--win-bg-dark);
}

.win-dialog-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px 12px;
}

/* Default button: Win95's 1px dark frame around the usual bevel */
.win-dialog-buttons .win-btn.is-default {
  box-shadow:
    0 0 0 1px var(--win-border-darkest),
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
}

.win-dialog-buttons .win-btn.is-default:active {
  box-shadow:
    0 0 0 1px var(--win-border-darkest),
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
}

/* Win95 dotted focus rectangle, in the theme's text colour so it shows on purple */
.win-dialog-buttons .win-btn:focus-visible {
  outline: 1px dotted var(--win-text);
  outline-offset: -5px;
}

@media (max-width: 768px) {
  .win-dialog {
    width: 100%;
    min-width: 0;
    max-width: 360px;
  }

  .win-dialog-input {
    min-width: 0;
    height: 40px;
    /* 16px stops iOS from zooming the page when the field is focused */
    font-size: 16px;
  }

  .win-dialog-buttons {
    gap: 8px;
  }

  .win-dialog-buttons .win-btn {
    flex: 1 1 0;
    min-width: 88px;
    max-width: 160px;
    min-height: 40px;
  }
}
</style>
