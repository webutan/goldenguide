<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import WinButton from './win2000/WinButton.vue'

const props = defineProps({
  bubbleType: { type: String, default: null }, // null | 'lang' | 'first-time'
  lang: String,
  hidden: Boolean,
})
const emit = defineEmits(['select-lang', 'first-time-answer'])

const BUBBLE_TEXTS = {
  'lang':       'Do you speak English or Japanese?\n英語と日本語、どちらがわかりますか？',
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
  const fullText = BUBBLE_TEXTS[props.bubbleType] || ''
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
    <div class="gaichan-root">
      <Transition name="bubble">
        <div v-if="bubbleType" class="gaichan-bubble">
          <div class="gaichan-bubble-text">
            {{ displayedText }}<span v-if="!typingDone" class="gaichan-cursor">▋</span>
          </div>
          <Transition name="fade">
            <div v-if="typingDone" class="gaichan-bubble-actions">
              <!-- Lang selection -->
              <template v-if="bubbleType === 'lang'">
                <WinButton @click="emit('select-lang', 'en')">English</WinButton>
                <WinButton @click="emit('select-lang', 'jp')">日本語</WinButton>
              </template>
              <!-- First-time question -->
              <template v-else-if="bubbleType === 'first-time'">
                <WinButton @click="emit('first-time-answer', false)">No / いいえ</WinButton>
                <WinButton @click="emit('first-time-answer', true)">Yes / はい</WinButton>
              </template>
            </div>
          </Transition>
          <div class="gaichan-bubble-tail"></div>
        </div>
      </Transition>

      <div class="gaichan-window" :class="{ 'gaichan-window--hidden': hidden }">
        <div class="gaichan-titlebar">街ちゃん / Gai-chan</div>
        <div class="gaichan-imgwrap">
          <img class="gaichan-bg" src="/gaichan/gaichanwindow.png" alt="" />
          <img class="gaichan-sprite" :src="currentSprite" alt="Gai-chan" />
          <div class="gaichan-scanlines" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gaichan-root {
  position: fixed;
  bottom: calc(var(--taskbar-height) + 8px);
  right: 8px;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

/* --- Bubble --- */
.gaichan-bubble {
  position: relative;
  width: 220px;
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.5);
  padding: 8px 10px 10px;
}

.gaichan-bubble-text {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  line-height: 1.55;
  white-space: pre-wrap;
  min-height: 2.5em;
}

.gaichan-cursor {
  color: var(--valhalla-orange);
  animation: gaichan-blink 0.7s step-end infinite;
}

.gaichan-bubble-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.gaichan-bubble-tail {
  position: absolute;
  bottom: -10px;
  right: 18px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid var(--win-bg);
}

/* --- Window chrome --- */
.gaichan-window {
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
  object-position: bottom center;
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

/* --- Animations --- */
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

/* Bubble transition */
.bubble-enter-active { transition: opacity 150ms ease, transform 150ms ease; }
.bubble-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.bubble-enter-from  { opacity: 0; transform: translateY(4px); }
.bubble-leave-to    { opacity: 0; transform: translateY(4px); }

/* Fade transition for action buttons */
.fade-enter-active { transition: opacity 200ms ease; }
.fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from   { opacity: 0; }
.fade-leave-to     { opacity: 0; }
</style>
