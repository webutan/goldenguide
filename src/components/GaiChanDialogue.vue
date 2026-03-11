<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  lang: { type: String, default: 'en' },
  rulesAccepted: { type: Boolean, default: false },
})
const emit = defineEmits(['accepted'])

// ── Script ──────────────────────────────────────────────────────────────────
const SCRIPT = [
  {
    text_en: "Welcome to Golden Gai! I'm your guide. Before you explore, I need to walk you through the rules. Ready?",
    text_jp: "ようこそゴールデン街へ！アタシが案内してあげる。でもその前に、ここのルールを教えてあげる。準備はいい？",
    image: null,
  },
  {
    text_en: "First — these are PRIVATE streets. You're a guest here. Treat everyone around you with respect.",
    text_jp: "まず大事なこと — ここは全部私道よ。お客さんとして、周りのみんなを大切にしてね。",
    image: '/gaichan/gaichanidle.png',
  },
  {
    text_en: "Security cameras are active throughout the area. Don't say I didn't warn you.",
    text_jp: "防犯カメラがあちこちで作動してる。念のため言っておくわ。",
    image: '/gaichan/camera.png',
  },
  {
    text_en: "These buildings are OLD and made of wood. No smoking outside.",
    text_jp: "建物は古い木造よ。絶対禁煙！",
    image: '/gaichan/smoking.png',
  },
  {
    text_en: "Most bars have a table charge. Think of it like a cover fee — it gets you your seat.",
    text_jp: "ほとんどのお店にはチャージ料金がある。席料だと思って！",
    image: '/gaichan/yen.png',
  },
  {
    text_en: "Watch your bags! Luggage thieves operate here. Keep your things close.",
    text_jp: "荷物には気をつけて！置き引きが多いの。荷物は常に手元に！",
    image: '/gaichan/luggage.png',
  },
  {
    text_en: "Now for the BIG list of things you absolutely CANNOT do here. Pay attention.",
    text_jp: "さて、絶対やってはいけないことのリストよ。ちゃんと聞いてよね。",
    image: null,
  },
  {
    text_en: "No smoking outside. I already said it — but it's important enough to say again.",
    text_jp: "路上での喫煙は禁止！もう一回言うくらい大事なのよ。",
    image: '/gaichan/smoking.png',
  },
  {
    text_en: "No littering. No cigarette butts, no trash on the street. Take it with you.",
    text_jp: "ゴミのポイ捨て禁止！タバコの吸い殻も、全部持って帰って。",
    image: '/gaichan/trash.png',
  },
  {
    text_en: "No drinking on the street. Take it inside a bar. That's literally what they're here for.",
    text_jp: "路上飲酒も禁止よ。バーの中で飲んで！そのためにあるんだから。",
    image: '/gaichan/drinking.png',
  },
  {
    text_en: "No photography without consent. People come here for privacy. Respect that.",
    text_jp: "無断撮影も絶対ダメ！みんな、プライバシーを守りたいから来てるの。",
    image: '/gaichan/photo.png',
  },
  {
    text_en: "Keep your voice DOWN. No shouting, no group singing in the streets.",
    text_jp: "声は絶対に小さくして。大声や大合唱は禁止よ。",
    image: '/gaichan/shouting.png',
  },
  {
    text_en: "No graffiti. Touch a single wall and you'll answer to more than just me.",
    text_jp: "落書き禁止！壁に何か書いたら、アタシより怖い人に怒られるわよ。",
    image: '/gaichan/graffiti2.png',
  },
  {
    text_en: "No drugs. Not ever. Zero tolerance — end of discussion.",
    text_jp: "ドラッグは絶対にダメ！完全アウト。これ以上言わない。",
    image: '/gaichan/drugs.png',
  },
  {
    text_en: "No urinating, vomiting or spitting on the streets. Handle your business inside.",
    text_jp: "立ちション・嘔吐・ツバを吐くの禁止！お店の中でちゃんとして。",
    image: '/gaichan/vomit.png',
  },
  {
    text_en: "Don't block the streets or loiter. It's narrow here — keep moving.",
    text_jp: "通行妨害禁止よ。道が狭いから、たむろしないでね。",
    image: '/gaichan/blocking.png',
  },
  {
    text_en: "No bicycles or skateboards. Walk. This isn't a skatepark.",
    text_jp: "自転車・スケボーの乗り入れ禁止！ちゃんと歩いてね。",
    image: '/gaichan/skateboard.png',
  },
  {
    text_en: "And don't climb anything — buildings, fences, signs. Hands off.",
    text_jp: "建物やフェンスによじ登るのも禁止！何にも触らないで。",
    image: '/gaichan/climbing.png',
  },
  {
    text_en: "One last thing — you must be 20 or older to drink here. It's the law, no exceptions.",
    text_jp: "最後に — 20歳未満の飲酒は法律で禁止。例外はないわよ。",
    image: null,
  },
  {
    text_en: "That's everything! Now go enjoy Golden Gai.",
    text_jp: "以上よ！ゴールデン街を楽しんでね。",
    image: null,
    isLast: true,
  },
]

// ── Mobile detection ──────────────────────────────────────────────────────────
const mq = window.matchMedia('(max-width: 768px)')
const isMobile = ref(mq.matches)
const onMQChange = (e) => { isMobile.value = e.matches }
mq.addEventListener('change', onMQChange)

// ── State ────────────────────────────────────────────────────────────────────
const isTucked = ref(props.rulesAccepted)
const stepIndex = ref(0)

const displayedText = ref('')
const typingDone = ref(false)
let typingTimer = null

// Mouth animation (mouthopen/mouthclosed alternation while typing)
const mouthOpen = ref(false)
let mouthTimer = null

// Terminal (opens once, stays open, updates in place)
const terminalVisible = ref(false)
const terminalEverOpened = ref(false)
const terminalLines = ref([])
const terminalImageSrc = ref(null)
const terminalImageVisible = ref(false)
const terminalImageKey = ref(0)
let terminalTimer = null

// ── Computed ──────────────────────────────────────────────────────────────────
const currentStep = computed(() => SCRIPT[stepIndex.value])
const isLastStep = computed(() => !!currentStep.value.isLast)
const nextLabel = computed(() => {
  if (props.lang === 'jp') return isLastStep.value ? 'わかった！▶' : '次へ ▶'
  return isLastStep.value ? 'Got it! ▶' : 'Next ▶'
})

const currentText = computed(() =>
  props.lang === 'jp' ? currentStep.value.text_jp : currentStep.value.text_en
)
const ruleId = computed(() => String(stepIndex.value + 1).padStart(3, '0'))

// Sprite sets per mood
const SPRITE_SETS = {
  regular:  { closed: '/gaichan/gaichanmouthclosed.png',        open: '/gaichan/gaichanmouthopen.png' },
  thinking: { closed: '/gaichan/gaichanthinking.png',            open: '/gaichan/gaichanthinkingmouthopen.png' },
  surprised:{ closed: '/gaichan/gaichansurprised.png',           open: '/gaichan/gaichansurprisedmouthopen.png' },
}

// Step → sprite set mapping:
//  0        regular   (welcome)
//  1–3      thinking  (private streets, cameras, smoking)
//  4        regular   (table charge)
//  5        surprised (luggage thieves)
//  6        regular   (big list intro)
//  7–12     thinking  (no smoking repeat … no graffiti)
//  13       surprised (drugs)
//  14–17    thinking  (vomiting … climbing)
//  18+      regular   (one last thing, farewell)
const spriteSet = computed(() => {
  const i = stepIndex.value
  if (i >= 1 && i <= 3)   return SPRITE_SETS.thinking
  if (i === 5)             return SPRITE_SETS.surprised
  if (i >= 7 && i <= 12)  return SPRITE_SETS.thinking
  if (i === 13)            return SPRITE_SETS.surprised
  if (i >= 14 && i <= 17) return SPRITE_SETS.thinking
  return SPRITE_SETS.regular
})

const spriteImg = computed(() =>
  mouthOpen.value ? spriteSet.value.open : spriteSet.value.closed
)

// ── Mouth animation ───────────────────────────────────────────────────────────
function startMouthAnim() {
  clearInterval(mouthTimer)
  mouthTimer = setInterval(() => {
    mouthOpen.value = !mouthOpen.value
  }, 140)
}

function stopMouthAnim() {
  clearInterval(mouthTimer)
  mouthTimer = null
  mouthOpen.value = false
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function startTypewriter(text) {
  clearInterval(typingTimer)
  displayedText.value = ''
  typingDone.value = false
  startMouthAnim()
  let i = 0
  typingTimer = setInterval(() => {
    if (i < text.length) {
      displayedText.value += text[i++]
    } else {
      clearInterval(typingTimer)
      typingTimer = null
      typingDone.value = true
      stopMouthAnim()
    }
  }, 28)
}

function skipTypewriter() {
  clearInterval(typingTimer)
  typingTimer = null
  displayedText.value = currentText.value
  typingDone.value = true
  stopMouthAnim()
}

// ── Terminal ──────────────────────────────────────────────────────────────────
function typeTerminalLines(step) {
  clearTimeout(terminalTimer)
  terminalLines.value = []
  terminalImageVisible.value = false

  const lines = [
    '> ACCESSING REGULATION DATABASE...',
    `> RULE_ID: ${ruleId.value} — ${step.image ? 'LOADING...' : 'NO_IMAGE_DATA'}`,
  ]

  let lineIdx = 0
  function nextLine() {
    if (lineIdx < lines.length) {
      terminalLines.value = [...terminalLines.value, lines[lineIdx++]]
      terminalTimer = setTimeout(nextLine, 80)
    } else {
      if (step.image) {
        terminalTimer = setTimeout(() => {
          terminalImageSrc.value = step.image
          terminalImageKey.value++
          terminalImageVisible.value = true
          terminalTimer = setTimeout(() => startTypewriter(currentText.value), 450)
        }, 100)
      } else {
        startTypewriter(currentText.value)
      }
    }
  }
  terminalTimer = setTimeout(nextLine, 80)
}

function openOrUpdateTerminal(step) {
  if (!terminalEverOpened.value) {
    terminalVisible.value = true
    terminalEverOpened.value = true
    setTimeout(() => typeTerminalLines(step), 270)
  } else {
    typeTerminalLines(step)
  }
}

function closeTerminalThen(callback) {
  if (!terminalVisible.value) {
    callback()
    return
  }
  terminalVisible.value = false
  setTimeout(callback, 240)
}

// ── Step logic ────────────────────────────────────────────────────────────────
function loadStep(idx) {
  clearInterval(typingTimer)
  clearTimeout(terminalTimer)
  typingTimer = null
  terminalTimer = null
  stopMouthAnim()

  stepIndex.value = idx
  displayedText.value = ''
  typingDone.value = false

  const step = SCRIPT[idx]
  nextTick(() => {
    if (isMobile.value) {
      // Mobile: terminal is always open (no CRT text lines)
      const isFirstOpen = !terminalEverOpened.value
      if (isFirstOpen) {
        terminalVisible.value = true
        terminalEverOpened.value = true
      }
      // Brief delay on first open to let slide-in complete, then load step content
      terminalTimer = setTimeout(() => {
        if (step.image) {
          // Switch image directly without going through gai-chan — prevents flicker
          terminalLines.value = []
          terminalImageSrc.value = step.image
          terminalImageKey.value++
          terminalImageVisible.value = true
          terminalTimer = setTimeout(() => startTypewriter(currentText.value), 300)
        } else {
          // No image: reveal gai-chan background, start typewriter
          terminalLines.value = []
          terminalImageVisible.value = false
          terminalImageSrc.value = null
          startTypewriter(currentText.value)
        }
      }, isFirstOpen ? 270 : 0)
    } else {
      // Desktop: existing behaviour
      if (terminalEverOpened.value || step.image) {
        openOrUpdateTerminal(step)
      } else {
        startTypewriter(currentText.value)
      }
    }
  })
}

function handleAdvance() {
  if (!typingDone.value) {
    skipTypewriter()
    return
  }
  if (isLastStep.value) {
    clearInterval(typingTimer)
    clearTimeout(terminalTimer)
    stopMouthAnim()
    closeTerminalThen(() => {
      emit('accepted')
      isTucked.value = true
    })
    return
  }
  loadStep(stepIndex.value + 1)
}

function handleSkip() {
  clearInterval(typingTimer)
  clearTimeout(terminalTimer)
  clearInterval(mouthTimer)
  typingTimer = null
  terminalTimer = null
  mouthTimer = null
  mouthOpen.value = false
  terminalVisible.value = false
  emit('accepted')
  isTucked.value = true
}

// Click anywhere on panel (not a button) to advance — VN style
// Debounce prevents a rapid double-click from skipping AND advancing in one gesture
let lastAdvanceTime = 0
function handleDialogueClick(e) {
  if (e.target.closest('button')) return
  const now = Date.now()
  if (now - lastAdvanceTime < 300) return
  lastAdvanceTime = now
  handleAdvance()
}

// ── Init ──────────────────────────────────────────────────────────────────────
if (!props.rulesAccepted) {
  loadStep(0)
}

onUnmounted(() => {
  clearInterval(typingTimer)
  clearTimeout(terminalTimer)
  clearInterval(mouthTimer)
  mq.removeEventListener('change', onMQChange)
})

watch(() => props.lang, () => {
  skipTypewriter()
})
</script>

<template>
  <Teleport to="body">
    <!-- Terminal window (slides down from top) -->
    <Transition name="crt">
      <div v-if="terminalVisible" class="crt-terminal">
        <!--
          Layer stack:
          1. crt-screen  — CRT content clipped to the screen opening in terminal.png
          2. crt-window  — terminal.png masked by terminaltp.png (hides frame area's dark fill,
                           shows only the decorative frame, screen area is transparent/cut out)
        -->
        <div class="crt-screen" :class="{ 'crt-screen--gaichan': !terminalImageVisible }">
          <!--
            Mobile only: gai-chan sprite fills the terminal screen.
            Fades out when a rule image appears, fades back in when done.
          -->
          <img
            :src="spriteImg"
            class="crt-gaichan-sprite"
            :class="{ 'crt-gaichan-sprite--hidden': terminalImageVisible }"
            alt="Gai-chan"
            draggable="false"
          />
          <div class="crt-lines">
            <div v-for="(line, i) in terminalLines" :key="i" class="crt-line">{{ line }}</div>
          </div>
          <div v-if="terminalImageVisible && terminalImageSrc" class="crt-image-wrap">
            <img :key="terminalImageKey" :src="terminalImageSrc" class="crt-image" alt="" />
          </div>
          <div class="crt-scanlines" aria-hidden="true"></div>
        </div>
        <img src="/gaichan/terminal.png" class="crt-window" alt="" draggable="false" />
      </div>
    </Transition>

    <!-- Main dialogue panel -->
    <div
      class="gaichan-dialogue"
      :class="{ tucked: isTucked }"
      @click="handleDialogueClick"
    >
      <div class="dialogue-body">

        <!--
          Layer stack (bottom → top):
          1. screen-content  — background + sprite, clipped to monitor screen bounds
          2. layer--window   — gaichanwindow.png masked by gaichanwindowtp.png
                               (mask hides the dark screen area, shows only the frame)
          3. text-panel      — dialogue text + buttons in the right panel area
        -->

        <!-- 1. Screen content: background scene + gai-chan sprite + scanlines -->
        <div class="screen-content" :class="{ 'screen-content--tucked': isTucked }">
          <img
            v-if="!isTucked"
            src="/gaichan/gaichanbackground.png"
            class="screen-bg"
            alt=""
            draggable="false"
          />
          <img
            v-if="isTucked"
            src="/gaichan/gaichanicon.png"
            class="screen-icon"
            alt="Gai-chan"
            draggable="false"
          />
          <img
            v-else
            :src="spriteImg"
            class="screen-sprite"
            alt="Gai-chan"
            draggable="false"
          />
          <!-- Scanlines overlay: above sprite, below window frame -->
          <div class="screen-scanlines" aria-hidden="true"></div>
        </div>

        <!--
          2. gaichanwindow.png — the full panel image.
             CSS mask-image uses gaichanwindowtp.png (transparent screen hole) so
             gaichanwindow is invisible in the screen area, revealing layers below.
        -->
        <img
          src="/gaichan/gaichanwindow.png"
          class="layer--window"
          alt=""
          draggable="false"
        />

        <!-- Speaker name — in the small top label window (cols 50%–79.7%, rows 0–3.7%) -->
        <div v-if="!isTucked" class="speaker-name">{{ lang === 'jp' ? '街ちゃん' : 'Gai-chan' }}</div>

        <!-- 3. Text panel — in the large right window (left 33.7%, top 20.2%, right 7.7%, bottom 20.6%) -->
        <div v-if="!isTucked" class="text-panel">
          <!-- Skip: top-right corner -->
          <button class="skip-btn" @click.stop="handleSkip">
            {{ lang === 'jp' ? 'スキップ' : 'Skip' }} ▶▶
          </button>

          <div class="dialogue-text">
            {{ displayedText }}<span v-if="!typingDone" class="dialogue-cursor">▋</span>
          </div>

          <div class="text-footer">
            <span class="step-counter">{{ stepIndex + 1 }} / {{ SCRIPT.length }}</span>
            <Transition name="fade">
              <button v-if="typingDone" class="next-btn" @click.stop="handleAdvance">
                {{ nextLabel }}
              </button>
            </Transition>
          </div>
        </div>

      </div><!-- /.dialogue-body -->
    </div><!-- /.gaichan-dialogue -->
  </Teleport>
</template>

<style scoped>
/*
  Layout dimensions (all derived from image analysis at 820px panel width / 263px body height):
    gaichanwindow.png / gaichanwindowtp.png: 2155×693 → aspect-ratio 2155/693
    Screen opening in gaichanwindowtp.png (transparent area):
      full-image: cols 142-539, rows 141-510
      rendered:   left 6.59%, right 25%, top 20.15%, bottom 73.76%
    Right text panel starts at ~39% from left
*/
.gaichan-dialogue {
  /* Screen area variables */
  --screen-l: 6.59%;
  --screen-t: 20.15%;
  --screen-w: 18.41%;  /* 151px at 820px */
  --screen-h: 53.61%;  /* 141px at 263px */

  /* Portrait zone width — used for tuck animation */
  --pw: 30%;

  position: fixed;
  bottom: var(--taskbar-height, 32px);
  left: 50%;
  transform: translateX(-50%);
  width: min(820px, 98vw);
  z-index: 1100;
  isolation: isolate;
  background: transparent;
  transition:
    left 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
}

/* Tuck to the RIGHT — portrait section peeks from right viewport edge */
.gaichan-dialogue.tucked {
  left: 100%;
  transform: translateX(calc(-1 * var(--pw)));
}

/* ── Body ──────────────────────────────────────────────────────────────────── */
.dialogue-body {
  position: relative;
  aspect-ratio: 2155 / 693;
  isolation: isolate;
}


/* ── Layer 1: Screen content (background + sprite) ────────────────────────── */
.screen-content {
  position: absolute;
  left: var(--screen-l);
  top: var(--screen-t);
  width: var(--screen-w);
  height: var(--screen-h);
  overflow: hidden;
  z-index: 1;
}

.screen-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  image-rendering: auto;
}

/* Mouth sprite: 80% of screen width, face area centered */
.screen-sprite {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 112%;                    /* taller than screen → top is cropped */
  object-fit: cover;
  object-position: 50% 15%;       /* show the face, not the chest */
  image-rendering: pixelated;
}

/* Moving CRT scanlines: above sprite (z=2), below window frame (screen-content is z=1 in body) */
.screen-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.35) 2px,
    rgba(0, 0, 0, 0.35) 4px
  );
  background-size: 100% 4px;
  animation: screen-scanroll 0.5s linear infinite;
  opacity: 70%
}

/* Tucked screen: black background */
.screen-content--tucked {
  background: #000;
}

/* Tucked icon: centered, 2px bounce every 1s (up then down) */
.screen-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70%;
  height: auto;
  object-fit: contain;
  image-rendering: pixelated;
  animation: icon-bounce 2s steps(1, end) infinite;
}

@keyframes icon-bounce {
  0%   { transform: translate(-50%, -50%) translateY(0px); }
  50%  { transform: translate(-50%, -50%) translateY(-2px); }
  100% { transform: translate(-50%, -50%) translateY(0px); }
}

/* ── Layer 2: gaichanwindow.png masked by gaichanwindowtp.png ─────────────── */
/*
   gaichanwindowtp.png has:
     - TRANSPARENT pixels in the screen area (α ≈ 0)
     - OPAQUE pixels in the frame/panel area (α = 255)
   CSS mask: opaque = show content, transparent = hide content
   → gaichanwindow.png is HIDDEN in the screen area (reveals layers below)
   → gaichanwindow.png is SHOWN in the frame/panel area
*/
.layer--window {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  -webkit-mask-image: url('/gaichan/gaichanwindowtp.png');
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-image: url('/gaichan/gaichanwindowtp.png');
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  pointer-events: none;
  z-index: 2;
}

/* ── Speaker name — in the small top label window ─────────────────────────── */
/*
  Top label window in gaichanwindowtp.png (updated):
    cols 1078–1717 / 2155 = 50.0%–79.7% from left
    rows 0–22 / 693      = 0%–3.2% from top
*/
.speaker-name {
  position: absolute;
  top: 0;
  left: 50%;
  right: 20.3%;
  height: 3.7%;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  font-weight: bold;
  color: #ffe4a0;
  text-shadow: 0 0 4px rgba(255, 200, 80, 0.7);
  pointer-events: none;
  overflow: hidden;
}

/* ── Layer 3: Text panel ─────────────────────────────────────────────────── */
/*
  Large right window in gaichanwindowtp.png (updated):
    left 33.7%, top 20.2%, right 7.7%, bottom 20.6%
*/
.text-panel {
  position: absolute;
  left: 33.7%;
  top: 20.2%;
  right: 7.7%;
  bottom: 20.6%;
  z-index: 3;
  display: flex;
  flex-direction: column;
  padding: 30px 12px 10px 12px;
  box-sizing: border-box;
}

/* Skip: top-right corner of text panel */
.skip-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: rgba(255, 220, 140, 0.6);
  background: transparent;
  border: 1px solid rgba(255, 220, 140, 0.25);
  padding: 2px 7px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: color 0.15s, border-color 0.15s;
  z-index: 5;
}
.skip-btn:hover {
  color: #ffe4a0;
  border-color: rgba(255, 220, 140, 0.6);
}

.dialogue-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #ffe4a0;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  text-shadow: 0 0 6px rgba(255, 200, 80, 0.4);
  overflow-y: auto;
  padding-right: 68px; /* stop text flowing behind the skip button */
}

.dialogue-cursor {
  color: #ffaa00;
  animation: crt-blink 0.7s step-end infinite;
}

.text-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 6px;
}

.step-counter {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  color: rgba(255, 200, 80, 0.4);
  flex: 1;
}

.next-btn {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: bold;
  color: #ffcc44;
  background: transparent;
  border: 1px solid rgba(255, 200, 80, 0.45);
  padding: 3px 12px;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.next-btn:hover {
  color: #fff5cc;
  border-color: rgba(255, 200, 80, 0.8);
  background: rgba(255, 200, 80, 0.08);
}
.next-btn:active {
  opacity: 0.75;
}

/* ── CRT Terminal ──────────────────────────────────────────────────────────── */
/*
  terminal.png / terminaltp.png: 1268×706
  Screen opening (transparent in terminaltp.png):
    left: 24.61%, top: 15.86%, width: 49.45%, height: 65.72%
*/
.crt-terminal {
  position: fixed;
  bottom: calc(var(--taskbar-height, 32px) + 282px);
  left: 50%;
  transform: translateX(-50%);
  width: min(580px, 90vw);
  aspect-ratio: 1268 / 706;
  background: transparent;
  font-family: 'Courier New', monospace;
  color: #ff8800;
  z-index: 1101;
  isolation: isolate;
}

/* Screen content — clipped to the terminal screen opening */
.crt-screen {
  position: absolute;
  left: 23.61%;
  top: 13.86%;
  width: 49.45%;
  height: 70.72%;
  overflow: hidden;
  background: #000;
  z-index: 1;
  padding: 6px 8px 4px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* Terminal frame: terminal.png masked by terminaltp.png */
.crt-window {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  -webkit-mask-image: url('/gaichan/terminaltp.png');
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-image: url('/gaichan/terminaltp.png');
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  pointer-events: none;
  z-index: 2;
}

.crt-lines {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
  margin-bottom: 4px;
}

.crt-line {
  font-size: 9px;
  color: #ff8800;
  opacity: 0.85;
  text-shadow: 0 0 4px rgba(255, 136, 0, 0.5);
  white-space: pre;
}

.crt-image-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.crt-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: grayscale(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.85) contrast(1.2);
  animation: img-scan-in 0.4s ease-out forwards;
}

.crt-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 1px,
    rgba(0, 0, 0, 0.25) 1px,
    rgba(0, 0, 0, 0.25) 2px
  );
  background-size: 100% 4px;
  animation: scanroll 0.5s linear infinite;
}

/* ── CRT transitions: slide down from above, back up on leave ────────────── */
.crt-enter-active {
  transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.crt-leave-active {
  transition: transform 0.35s cubic-bezier(0.55, 0, 0.1, 1);
}
.crt-enter-from { transform: translateX(-50%) translateY(-160%); }
.crt-leave-to   { transform: translateX(-50%) translateY(-160%); }

/* Button fade */
.fade-enter-active { transition: opacity 200ms ease; }
.fade-leave-active { transition: opacity 150ms ease; }
.fade-enter-from   { opacity: 0; }
.fade-leave-to     { opacity: 0; }

/* ── Keyframes ─────────────────────────────────────────────────────────────── */

@keyframes img-scan-in {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0% 0); }
}
@keyframes crt-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes sprite-bounce {
  from { bottom: 0; }
  to   { bottom: 5px; }
}
@keyframes scanroll {
  from { background-position-y: 0px; }
  to   { background-position-y: 4px; }
}
@keyframes screen-scanroll {
  from { background-position-y: 0px; }
  to   { background-position-y: 4px; }
}

/* ── Gai-chan sprite in terminal (hidden on desktop, shown on mobile) ───────── */
.crt-gaichan-sprite {
  display: none;
}

/* ════════════════════════════════════════════════════════════════════════════
   MOBILE  (≤ 768px)
   ════════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {

  /*
    Panel = viewport + 270px (monitor offset).
    translateX(-270px) hides the monitor off-screen left.
    Text section (left:33% → ~218px at 660px) is overridden below to
    start exactly at the left viewport edge.
    Right edge lands ~30px past the viewport right — "a tiny bit" off.
  */
  .gaichan-dialogue {
    width: calc(100vw + 270px);
    left: 0;
    transform: translateX(-270px);
    transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  /* Tuck: desktop rule handles it (left:100%; translateX(-30%)) — no override needed */

  /* Text panel: pinned to viewport edges in fixed pixels */
  .text-panel {
    left: 270px;  /* = monitor offset → viewport x = 0 after -270px shift */
    right: 15px;
    top: 20.2%;
    bottom: 20.6%;
  }

  /* Speaker name: repositioned into the text panel top area on mobile
     (the top label window is only ~8px tall when rendered, too small to read) */
  .speaker-name {
    left: 320px;
    right: 15px;
    top: 5%;
    height: auto;
    font-size: 14px;
    justify-content: flex-start;
  }

  /* ── Terminal: full viewport width, no side gaps ─────────────────────── */
  .crt-terminal {
    width: 100vw;
    left: 0;
    transform: none;  /* no translateX(-50%) centering */
  }
  /* Override slide animation (no translateX needed when left:0) */
  .crt-enter-from { transform: translateY(-160%); }
  .crt-leave-to   { transform: translateY(-160%); }

  /* ── Terminal screen: no side padding; background only when gai-chan shows ── */
  .crt-screen {
    padding: 0;
  }
  .crt-screen--gaichan {
    background-image: url('/gaichan/gaichanbackground.png');
    background-size: cover;
    background-position: center 30%;
  }
  /* Hide CRT text lines on mobile (images load directly, no preamble text) */
  .crt-lines { display: none; }

  /* ── Gai-chan sprite inside terminal screen ───────────────────────────── */
  .crt-gaichan-sprite {
    display: block;
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    height: 104%;    /* 130% → –20% = 104% */
    object-fit: cover;
    object-position: 50% 15%;
    image-rendering: pixelated;
    z-index: 1;
    opacity: 1;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .crt-gaichan-sprite--hidden {
    opacity: 0;
  }

}
</style>
