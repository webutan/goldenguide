<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import WinButton from './win2000/WinButton.vue'

const props = defineProps({
  bubbleType: { type: String, default: null }, // null | 'lang' | 'first-time'
  lang: String,
  hidden: Boolean,
})
const emit = defineEmits(['select-lang', 'first-time-answer'])

const DIALOG_TEXTS = {
  'lang':       'Do you speak English or Japanese?\n言語を選んでください。',
  'first-time': 'Is it your first time in Golden Gai?\n初めてゴールデン街に来ましたか？',
}

const currentSprite = computed(() =>
  props.bubbleType !== null
    ? '/gaichan/windowspritethink.png'
    : '/gaichan/windowsprite.png'
)

const displayedText = ref('')
const typingDone = ref(false)
let typingTimer = null

function startTypewriter() {
  const fullText = DIALOG_TEXTS[props.bubbleType] || ''
  displayedText.value = ''
  typingDone.value = false
  let i = 0
  typingTimer = setInterval(() => {
    if (i < fullText.length) {
      displayedText.value += fullText[i++]
    } else {
      clearInterval(typingTimer)
      typingTimer = null
      typingDone.value = true
    }
  }, 25)
}

watch(() => props.bubbleType, (val) => {
  clearInterval(typingTimer)
  typingTimer = null
  displayedText.value = ''
  typingDone.value = false
  if (val) nextTick(startTypewriter)
}, { immediate: true })

onUnmounted(() => clearInterval(typingTimer))
</script>

<template>
  <Teleport to="body">
    <!-- Win2000 dialog modal -->
    <Transition name="dialog">
      <div v-if="bubbleType" class="gaichan-overlay">
        <div class="gaichan-dialog">
          <!-- Title bar -->
          <div class="gaichan-dialog-titlebar">
            <img src="/icons/gaios.ico" class="gaichan-dialog-title-icon" alt="" />
            <span>街ちゃん / Gai-chan</span>
          </div>

          <!-- Body: sprite + text -->
          <div class="gaichan-dialog-body">
            <div class="gaichan-dialog-sprite-box">
              <img :src="currentSprite" class="gaichan-dialog-sprite" alt="Gai-chan" />
            </div>
            <div class="gaichan-dialog-text">
              {{ displayedText }}<span v-if="!typingDone" class="gaichan-cursor">▋</span>
            </div>
          </div>

          <!-- Separator -->
          <div class="gaichan-dialog-sep"></div>

          <!-- Buttons -->
          <div class="gaichan-dialog-actions">
            <Transition name="fade">
              <div v-if="typingDone" class="gaichan-dialog-buttons">
                <template v-if="bubbleType === 'lang'">
                  <button class="gaichan-lang-btn" @click="emit('select-lang', 'en')">
                    <img src="/icons/uk.ico" class="gaichan-lang-flag" alt="" />
                    <span>English</span>
                  </button>
                  <button class="gaichan-lang-btn" @click="emit('select-lang', 'jp')">
                    <img src="/icons/japan.ico" class="gaichan-lang-flag" alt="" />
                    <span>日本語</span>
                  </button>
                </template>
                <template v-else-if="bubbleType === 'first-time'">
                  <WinButton @click="emit('first-time-answer', true)">Yes / はい</WinButton>
                  <WinButton @click="emit('first-time-answer', false)">No / いいえ</WinButton>
                </template>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Gai-chan character window (bottom-right corner) -->
    <div class="gaichan-window" :class="{ 'gaichan-window--hidden': hidden || bubbleType }">
      <div class="gaichan-titlebar">街ちゃん / Gai-chan</div>
      <div class="gaichan-imgwrap">
        <img class="gaichan-bg" src="/gaichan/gaichanwindow.png" alt="" />
        <img class="gaichan-sprite" :src="currentSprite" alt="Gai-chan" />
        <div class="gaichan-scanlines" aria-hidden="true"></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Dialog overlay ── */
.gaichan-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gaichan-dialog {
  width: 400px;
  max-width: calc(100vw - 32px);
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    8px 8px 24px rgba(0, 0, 0, 0.8);
  padding: 3px;
  display: flex;
  flex-direction: column;
}

.gaichan-dialog-titlebar {
  height: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  user-select: none;
}

.gaichan-dialog-title-icon {
  width: 14px;
  height: 14px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.gaichan-dialog-body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
}

.gaichan-dialog-sprite-box {
  flex-shrink: 0;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gaichan-dialog-sprite {
  height: 110px;
  width: auto;
  image-rendering: pixelated;
  display: block;
  transform: scaleX(-1);
}

.gaichan-dialog-text {
  flex: 1;
  font-family: var(--win-font);
  font-size: 15px;
  color: var(--win-text);
  line-height: 1.6;
  white-space: pre-wrap;
  padding-top: 4px;
  min-height: 60px;
}

.gaichan-cursor {
  color: var(--valhalla-orange);
  animation: gaichan-blink 0.7s step-end infinite;
}

.gaichan-dialog-sep {
  height: 1px;
  background: var(--win-border-dark);
  box-shadow: 0 1px 0 var(--win-border-light);
  margin: 0 2px;
}

.gaichan-dialog-actions {
  padding: 8px 8px 6px;
  min-height: 34px;
}

.gaichan-dialog-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.gaichan-lang-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px 3px 6px;
  height: 26px;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 12px;
  color: var(--win-text);
}

.gaichan-lang-btn:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
}

.gaichan-lang-flag {
  width: 24px;
  height: 16px;
  display: block;
  image-rendering: pixelated;
  object-fit: cover;
}

/* ── Gai-chan corner window ── */
.gaichan-window {
  position: fixed;
  bottom: calc(var(--taskbar-height) + 8px);
  right: 8px;
  z-index: 1050;
  width: 200px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.5);
  padding: 3px;
  transition: opacity 300ms ease;
}

.gaichan-window--hidden {
  opacity: 0;
  pointer-events: none;
}

.gaichan-titlebar {
  height: 20px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-family: var(--win-font);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
}

.gaichan-imgwrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 928 / 1152;
}

.gaichan-bg {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.gaichan-sprite {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: 50% 100%;
  animation: gaichan-bounce 0.5s steps(1, end) alternate infinite;
}

.gaichan-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 1px,
    rgba(0, 0, 0, 0.22) 1px,
    rgba(0, 0, 0, 0.22) 2px
  );
  background-size: 100% 4px;
  animation: gaichan-scanroll 3s linear infinite;
}

/* ── Animations ── */
@keyframes gaichan-scanroll {
  from { background-position-y: 0px; }
  to   { background-position-y: 4px; }
}

@keyframes gaichan-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

@keyframes gaichan-bounce {
  from { transform: translateY(0); }
  to   { transform: translateY(-1px); }
}

/* Dialog transition */
.dialog-enter-active { transition: opacity 150ms ease, transform 150ms ease; }
.dialog-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.dialog-enter-from  { opacity: 0; transform: scale(0.97); }
.dialog-leave-to    { opacity: 0; transform: scale(0.97); }

/* Fade for buttons */
.fade-enter-active { transition: opacity 200ms ease; }
.fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from   { opacity: 0; }
.fade-leave-to     { opacity: 0; }

/* ── Mobile: enlarged corner window ─────────────────────────────────────── */
@media (max-width: 768px) {
  .gaichan-window {
    width: min(260px, 55vw);
    bottom: calc(var(--taskbar-height) + 8px);
    right: 0;
  }
}
</style>
