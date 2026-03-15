<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  apiLoading: { type: Boolean, default: true },
  apiError: { type: String, default: null },
})

const emit = defineEmits(['done'])

const ASSETS_TO_PRELOAD = [
  '/gaichan/gaichanicon.png',
  '/gaichan/gaichanidle.png',
  '/gaichan/gaichanwindow.png',
  '/static-off.png',
  '/wallpaper.jpg',
]

const BOOT_LINES = [
  { text: 'GAI OS BIOS v6.0, A Night Owl Ally', color: '#00ff41', delay: 0 },
  { text: 'Copyright (C) 2024, Shinjuku Software Corp.', color: '#00ff41', delay: 80 },
  { text: '', delay: 60 },
  { text: 'GAICHAN P3V133 BIOS Revision 1003 Beta 002', color: '#ffffff', delay: 80 },
  { text: '', delay: 40 },
  { text: 'Intel(R) Neon(R) II Night Vision Processor', color: '#ffffff', delay: 100 },
  { text: 'Memory Test :   65536K OK', color: '#ffffff', delay: 300 },
  { text: '', delay: 60 },
  { text: 'GAI Plug and Play BIOS Extension v1.0A', color: '#ffffff', delay: 80 },
  { text: 'Initialize Golden Gai Cards...', color: '#ffffff', delay: 120 },
  { text: 'PNP Init Completed', color: '#ffffff', delay: 200 },
  { text: '', delay: 60 },
  { text: 'ChipAwayVirus(R) On Guard', color: '#00ff41', delay: 80 },
  { text: '', delay: 100 },
  { text: 'Detecting Primary Bar List   ... [LOADING]', color: '#aaaaaa', delay: 80, loadKey: 'barlist' },
  { text: 'Detecting Map Data           ... [LOADING]', color: '#aaaaaa', delay: 80, loadKey: 'mapdata' },
  { text: 'Detecting Tag Database       ... [LOADING]', color: '#aaaaaa', delay: 80, loadKey: 'tags' },
  { text: 'Detecting Chat Service       ... [LOADING]', color: '#aaaaaa', delay: 80, loadKey: 'chat' },
  { text: '', delay: 100 },
  { text: 'GAI OS Ready.', color: '#00ff41', delay: 200 },
]

const displayedLines = ref([])
const showPrompt = ref(false)
const promptBlink = ref(true)
const assetsLoaded = ref(false)
const typingDone = ref(false)

// Keyed on actual API load — set by watcher below instead of setTimeout timers
const loadKeyDone = { barlist: false, mapdata: false, tags: false, chat: false }

watch(() => props.apiLoading, (loading) => {
  if (!loading) {
    loadKeyDone.barlist = true
    loadKeyDone.mapdata = true
    loadKeyDone.tags = true
    // Chat is a Socket.IO connection that establishes shortly after the HTTP API responds
    setTimeout(() => { loadKeyDone.chat = true }, 300)
  }
}, { immediate: true })

let dismissed = false
let blinkInterval = null

function dismiss() {
  if (dismissed) return
  dismissed = true
  emit('done')
}

function preloadAssets() {
  let loaded = 0
  const total = ASSETS_TO_PRELOAD.length
  if (total === 0) { assetsLoaded.value = true; return }
  for (const src of ASSETS_TO_PRELOAD) {
    const img = new Image()
    img.onload = img.onerror = () => {
      loaded++
      if (loaded >= total) assetsLoaded.value = true
    }
    img.src = src
  }
}

async function runBootSequence() {
  for (const line of BOOT_LINES) {
    await sleep(line.delay)

    if (line.loadKey) {
      await waitFor(() => loadKeyDone[line.loadKey])
      const failed = !!props.apiError && line.loadKey !== 'chat'
      displayedLines.value = [...displayedLines.value, {
        text: line.text.replace('[LOADING]', failed ? '[FAILED]' : '[OK]'),
        color: failed ? '#ff4444' : '#00ff41',
      }]
    } else {
      displayedLines.value = [...displayedLines.value, { text: line.text, color: line.color }]
    }
  }

  typingDone.value = true
  maybeShowPrompt()
}

function maybeShowPrompt() {
  if (typingDone.value && assetsLoaded.value) {
    showPrompt.value = true
    blinkInterval = setInterval(() => { promptBlink.value = !promptBlink.value }, 500)
    setTimeout(() => dismiss(), 2000)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitFor(condition, interval = 50) {
  return new Promise(resolve => {
    const check = () => {
      if (condition()) resolve()
      else setTimeout(check, interval)
    }
    check()
  })
}

function handleKeydown() { dismiss() }
function handleClick() { dismiss() }

onMounted(() => {
  preloadAssets()
  runBootSequence()

  const watcher = setInterval(() => {
    if (assetsLoaded.value) {
      clearInterval(watcher)
      maybeShowPrompt()
    }
  }, 100)

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClick)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClick)
  if (blinkInterval) clearInterval(blinkInterval)
})
</script>

<template>
  <div class="bios-screen">
    <!-- Desktop: logo top-right; Mobile: logo full-width at top -->
    <div class="bios-logo-wrap">
      <img src="/gaichan/gaichanicon.png" class="bios-logo" alt="GAI OS" />
    </div>
    <div class="bios-terminal">
      <div v-for="(line, i) in displayedLines" :key="i" class="bios-line" :style="{ color: line.color || '#ffffff' }">
        {{ line.text || '\u00a0' }}
      </div>
      <div v-if="showPrompt" class="bios-prompt">
        <span :class="['bios-cursor', { blink: promptBlink }]">Press F1 to continue_</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bios-screen {
  position: fixed;
  inset: 0;
  background: #000000;
  z-index: 9999;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 13px;
  overflow: hidden;
  padding: 20px;
  box-sizing: border-box;
  cursor: pointer;
}

/* Desktop: logo floated to top-right */
.bios-logo-wrap {
  position: absolute;
  top: 20px;
  right: 30px;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bios-logo {
  width: auto;
  height: 72px;
  image-rendering: pixelated;
  opacity: 0.9;
  animation: bios-bounce 2s steps(1, end) infinite;
}

@keyframes bios-bounce {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-2px); }
  100% { transform: translateY(0px); }
}

.bios-terminal {
  line-height: 1.6;
}

.bios-line {
  white-space: pre;
  min-height: 1.6em;
}

.bios-prompt {
  margin-top: 12px;
  color: #00ff41;
}

.bios-cursor {
  font-weight: bold;
}

.bios-cursor.blink {
  animation: blink-cursor 1s step-end infinite;
}

@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .bios-screen {
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .bios-logo-wrap {
    position: static;
    width: 100%;
    height: auto;
    padding: 16px 0 12px;
    background: #000;
    justify-content: center;
    flex-shrink: 0;
  }

  .bios-logo {
    width: auto;
    height: 96px;
  }

  .bios-terminal {
    padding: 12px 14px 20px;
    font-size: 11px;
    overflow-x: hidden;
  }

  .bios-line {
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
