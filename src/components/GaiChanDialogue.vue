<script setup>
import { ref, computed, reactive, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  lang: { type: String, default: 'en' },
  rulesAccepted: { type: Boolean, default: false },
  bars: { type: Array, default: () => [] },
})
const emit = defineEmits(['accepted', 'tour-navigate', 'tour-highlight', 'tour-mode', 'open-bar'])

// ── Script ──────────────────────────────────────────────────────────────────
const SCRIPT = [
  {
    text_en: "Welcome to Golden Gai! I'm your guide, Gai-chan! First, a few things to know:",
    text_jp: "ゴールデンガイドへようこそ！私は街（ガイ）ちゃんだよ！最初に、この街について説明するわ！",
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
    text_en: "Don't talk to the touts at the entrance, they're here to rip you off!",
    text_jp: "街の入口にいる客引きとは話さない方がいいわ。気をつけて！",
    image: null,
  },
  {
    text_en: "Most bars have a table charge. Think of it like a cover fee — it gets you your seat.",
    text_jp: "ほとんどのお店にはチャージ料金があるわよ！",
    image: '/gaichan/yen.png',
  },
  {
    text_en: "Watch your bags! Luggage thieves operate here. Keep your things close.",
    text_jp: "荷物には気をつけて！置き引きがいるの。荷物は常に手元に！",
    image: '/gaichan/luggage.png',
  },
  {
    text_en: "Now, a few rules to keep in mind!",
    text_jp: "さて、この街のルールを教えてあげるね！",
    image: null,
  },
  {
    text_en: "Don't smoke outside! The buildings here are old and made of wood.",
    text_jp: "路上での喫煙は禁止！建物は古く木造わよ。",
    image: '/gaichan/smoking.png',
  },
  {
    text_en: "No littering. No cigarette butts, no trash on the street. Take it with you.",
    text_jp: "ゴミのポイ捨て禁止！タバコの吸い殻も、全部持って帰って。",
    image: '/gaichan/trash.png',
  },
  {
    text_en: "No drinking on the street. Take it inside a bar. That's literally what they're here for.",
    text_jp: "路上飲酒も禁止よ。目の前にお店があるんだから、お店の中で飲んで！",
    image: '/gaichan/drinking.png',
  },
  {
    text_en: "No photos without consent! You don't want me taking pictures of you at work, right?",
    text_jp: "街やお店の許可なしに撮影はしちゃダメよ！",
    image: '/gaichan/photo.png',
  },
  {
    text_en: "Try to keep your voice down. No shouting or group singing in the streets.",
    text_jp: "声は絶対に小さくして。大声や大合唱は邪魔だよ！",
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
    text_en: "No urinating, vomiting or spitting on the streets. There's public toilets for that!",
    text_jp: "立ちション・嘔吐・ツバを吐くの禁止！お店の中でちゃんとして。",
    image: '/gaichan/vomit.png',
  },
  {
    text_en: "Don't block the streets or loiter. It's narrow, so please keep moving!",
    text_jp: "通行妨害禁止よ。道が狭いから、たむろしないでね。",
    image: '/gaichan/blocking.png',
  },
  {
    text_en: "No bicycles or skateboards, walk! One kickflip and I'll break your board...",
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
    text_en: "That's everything! Now go enjoy Golden Gai. If you need any more help, click me on the desktop!",
    text_jp: "以上よ！ゴールデン街を楽しんでね。何があれば、デスクトップにいるアタシに聞いてね！",
    image: null,
    isLast: true,
  },
]

// ── Interactive dialogue nodes ───────────────────────────────────────────────
const INTERACTIVE_DIALOGUE = {
  'menu': {
    text_en: "How can I GAI-de you today?",
    text_jp: "私に”街ド”できることある？",
    choices: [
      { id: 'tour-1', label_en: 'Give me a tour!', label_jp: 'サイトの使い方教えて！' },
      { id: 'recommend-1', label_en: 'Recommend a bar!', label_jp: 'バーを紹介して！' },
      { id: 'cute-1', label_en: "You're so cute!", label_jp: '街ちゃん好きだよ…' },
    ],
  },

  // ── TOUR TREE ──────────────────────────────────────────────────────────────
  'tour-1': {
    text_en: "You got it! First, let's take a look at the taskbar.",
    text_jp: "わかった！まずはタスクバーを見てみよう！",
    next: 'tour-2',
    action: { type: 'highlight', target: 'taskbar' },
  },
  'tour-2': {
    text_en: "This is the map button! Here you can see an interactive map of Golden Gai and explore all the bars.",
    text_jp: "これがマップボタンよ！ゴールデン街のインタラクティブマップで、全部のバーを探索できるわ。",
    next: 'tour-3',
    action: { type: 'navigate+highlight', view: 'map', target: 'taskbar-map' },
  },
  'tour-3': {
    text_en: "Using this filter section, you can narrow down bars by tags, price range, and more!",
    text_jp: "このフィルターを使うと、タグや価格帯でバーを絞り込めるわ！",
    next: 'tour-4',
    action: { type: 'highlight', target: 'map-filter' },
  },
  'tour-4': {
    text_en: "This button here shows your location in Golden Gai!",
    text_jp: "このボタンで街内での自分の位置を確認できるの！",
    next: 'tour-5',
    action: { type: 'highlight', target: 'map-location' },
  },
  'tour-5': {
    text_en: "When you click on a bar, all the information you need is written there!",
    text_jp: "バーをクリックすると、必要な情報が全部表示されるわよ！",
    next: 'tour-6',
    action: { type: 'highlight', target: null },
  },
  'tour-6': {
    text_en: "This is the bar directory, for those who prefer a list view.",
    text_jp: "これはバーのディレクトリよ。リスト形式で見たい人向けね。",
    next: 'tour-7',
    action: { type: 'navigate+highlight', view: 'directory', target: 'taskbar-directory' },
  },
  'tour-7': {
    text_en: "You can also filter bars here and view their social media feeds.",
    text_jp: "ここでもバーを絞り込んだり、SNSのフィードを見ることができるわ。",
    next: 'tour-8',
    action: { type: 'highlight', target: 'directory-filter' },
  },
  'tour-8': {
    text_en: "The desktop is my favorite, because… I live here! Ahaha!!",
    text_jp: "デスクトップはアタシのお気に入り…だって、ここに住んでるんだもん！！！",
    next: 'tour-9',
    action: { type: 'navigate+highlight', view: 'desktop', target: 'taskbar-desktop' },
  },
  'tour-9': {
    text_en: "Here you can access all the other applications, as well as a few more!",
    text_jp: "ここから他のアプリにもアクセスできるし、もう少し機能もあるの！",
    next: 'tour-10',
    action: { type: 'highlight', target: null },
  },
  'tour-10': {
    text_en: "Here you can see the Twitter feeds of all the bars in Golden Gai!",
    text_jp: "ここでゴールデン街の全バーのTwitterフィードが見られるわ！",
    next: 'tour-11',
    action: { type: 'highlight', target: 'btn-feed' },
  },
  'tour-11': {
    text_en: "Use the contact form if something is wrong or if you have suggestions.",
    text_jp: "何か問題があったり、提案があればコンタクトフォームを使ってね。",
    next: 'tour-12',
    action: { type: 'highlight', target: 'btn-contact' },
  },
  'tour-12': {
    text_en: "If you want some helpful links or want to know more about Golden Gai, click here!",
    text_jp: "役立つリンクやゴールデン街について詳しく知りたいなら、ここをクリックして！",
    next: 'tour-13',
    action: { type: 'highlight', target: 'btn-about' },
  },
  'tour-13': {
    text_en: "If you want to chat with other people in Golden Gai, use this one!",
    text_jp: "ゴールデン街の人たちとチャットしたいなら、これを使ってね！",
    next: 'tour-14',
    action: { type: 'highlight', target: 'btn-chatroom' },
  },
  'tour-14': {
    text_en: "That's about everything! Now repeat it all back… just kidding. Enjoy!",
    text_jp: "以上で全部よ！じゃあ始めからもう一度…なんちって…　楽しんでね！",
    next: 'menu',
    isLast: true,
    action: { type: 'highlight', target: null },
  },

  // ── RECOMMEND TREE ─────────────────────────────────────────────────────────
  'recommend-1': {
    text_en: "You got it! Should I pick a random one or tailor it to your liking?",
    text_jp: "わかった！ランダムに選ぶ？それともあなた好みに絞る？",
    choices: [
      { id: 'recommend-random', label_en: "I'm feeling lucky!", label_jp: 'お任せで！' },
      { id: 'recommend-filter-1', label_en: 'Filter for me', label_jp: '絞り込んで' },
    ],
  },
  'recommend-random': {
    text_en: '', // filled dynamically
    text_jp: '',
    next: 'menu',
    isLast: true,
  },
  'recommend-filter-1': {
    text_en: "Do you smoke, or are you okay with smoking bars?",
    text_jp: "喫煙しますか？または喫煙可能なバーでも大丈夫？",
    choices: [
      { id: 'rf-smoke-yes', label_en: "Yes / that's fine", label_jp: 'はい／大丈夫' },
      { id: 'rf-smoke-no', label_en: "No smoking, please", label_jp: '禁煙希望' },
    ],
  },
  'rf-smoke-yes': {
    text_en: "Got it! Is a cash-only bar okay?",
    text_jp: "わかった！現金のみのバーでも大丈夫？",
    choices: [
      { id: 'rf-cash-yes', label_en: 'Cash is fine', label_jp: '現金でいい' },
      { id: 'rf-cash-no', label_en: 'I need card payment', label_jp: 'カードが使いたい' },
    ],
  },
  'rf-smoke-no': {
    text_en: "Got it! Is a cash-only bar okay?",
    text_jp: "わかった！現金のみのバーでも大丈夫？",
    choices: [
      { id: 'rf-cash-yes', label_en: 'Cash is fine', label_jp: '現金でいい' },
      { id: 'rf-cash-no', label_en: 'I need card payment', label_jp: 'カードが使いたい' },
    ],
  },
  'rf-cash-yes': {
    text_en: "Do you speak Japanese?",
    text_jp: "日本語は話せますか？",
    choices: [
      { id: 'rf-jp-yes', label_en: 'Yes, I speak Japanese', label_jp: 'はい、話せます' },
      { id: 'rf-jp-no', label_en: 'No, English please', label_jp: 'いいえ、英語希望' },
    ],
  },
  'rf-cash-no': {
    text_en: "Do you speak Japanese?",
    text_jp: "日本語は話せますか？",
    choices: [
      { id: 'rf-jp-yes', label_en: 'Yes, I speak Japanese', label_jp: 'はい、話せます' },
      { id: 'rf-jp-no', label_en: 'No, English please', label_jp: 'いいえ、英語希望' },
    ],
  },
  'rf-jp-yes': {
    text_en: '', // filled dynamically
    text_jp: '',
    next: 'menu',
    isLast: true,
  },
  'rf-jp-no': {
    text_en: '', // filled dynamically
    text_jp: '',
    next: 'menu',
    isLast: true,
  },

  // ── CUTE TREE ───────────────────────────────────────────────────────────────
  'cute-1': {
    text_en: "Wh-wha! You can't just say things like that so suddenly!! You've only just met me...",
    text_jp: "ちょ、ちょっと！そんなこといきなり言わないでよ！！出会ったばかりじゃない...",
    next: 'menu',
    isLast: true,
  },
}

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

// ── Interactive state ─────────────────────────────────────────────────────────
const interactiveMode = ref(false)
const interactiveNodeId = ref('menu')
const filterState = reactive({ smoking: null, cash: null, japanese: null })
const tourHighlightTarget = ref(null)
const recommendedBars = ref([])

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
  embarrassed: { closed: '/gaichan/gaichanembarassed.png',       open: '/gaichan/gaichanembarassedmouthopen.png' },
}

const spriteSet = computed(() => {
  // Interactive mode sprite selection
  if (interactiveMode.value) {
    if (interactiveNodeId.value === 'cute-1') return SPRITE_SETS.embarrassed
    return SPRITE_SETS.regular
  }
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

const currentNode = computed(() => INTERACTIVE_DIALOGUE[interactiveNodeId.value])
const showChoices = computed(() =>
  interactiveMode.value && !!currentNode.value?.choices && typingDone.value
)
const showNextBtn = computed(() =>
  interactiveMode.value && typingDone.value && !currentNode.value?.choices
)
const isLastNode = computed(() => !!currentNode.value?.isLast)

// True when we're in the tour tree (node IDs start with 'tour-')
const isTourNode = computed(() => interactiveNodeId.value.startsWith('tour-'))

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
  }, 15)
}

function skipTypewriter() {
  clearInterval(typingTimer)
  typingTimer = null
  if (interactiveMode.value) {
    const node = currentNode.value
    if (node) {
      displayedText.value = props.lang === 'jp' ? (node.text_jp || node.text_en) : node.text_en
    }
  } else {
    displayedText.value = currentText.value
  }
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
          startTypewriter(currentText.value)
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
      const isFirstOpen = !terminalEverOpened.value
      if (isFirstOpen) {
        terminalVisible.value = true
        terminalEverOpened.value = true
      }
      terminalTimer = setTimeout(() => {
        if (step.image) {
          terminalLines.value = []
          terminalImageSrc.value = step.image
          terminalImageKey.value++
          terminalImageVisible.value = true
          startTypewriter(currentText.value)
        } else {
          terminalLines.value = []
          terminalImageVisible.value = false
          terminalImageSrc.value = null
          startTypewriter(currentText.value)
        }
      }, isFirstOpen ? 270 : 0)
    } else {
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

// ── Interactive dialogue functions ────────────────────────────────────────────
function getRecommendedBars(count = 3) {
  let filtered = [...props.bars]
  if (filterState.smoking === false)  filtered = filtered.filter(b => !b.tags?.includes('smoking'))
  if (filterState.cash === false)     filtered = filtered.filter(b => !b.tags?.includes('cash-only'))
  if (filterState.japanese === false) filtered = filtered.filter(b => b.tags?.includes('english-ok'))
  // Shuffle and take count
  return filtered.sort(() => Math.random() - 0.5).slice(0, count)
}

function buildRecommendText(bars) {
  if (!bars || bars.length === 0) {
    return props.lang === 'jp'
      ? 'あなたの条件に合うバーが見つからなかったわ…もう少しゆるめてみて？'
      : "I couldn't find any bars matching your criteria… try loosening the filters?"
  }
  const names = bars.map(b => b.name_en || b.name_jp || '?').join(', ')
  return props.lang === 'jp'
    ? `私のおすすめは：${names}！`
    : `I would check out: ${names}!`
}

function executeAction(action) {
  if (!action) return
  if (action.type === 'navigate' || action.type === 'navigate+highlight') {
    emit('tour-navigate', action.view)
  }
  if (action.type === 'highlight' || action.type === 'navigate+highlight') {
    const target = action.target ?? null
    tourHighlightTarget.value = target
    emit('tour-highlight', target)
  }
}

// Determine if we're in the recommendation result phase
function isRecommendResultNode(nodeId) {
  return nodeId === 'recommend-random' || nodeId === 'rf-jp-yes' || nodeId === 'rf-jp-no'
}

function interactiveSkip() {
  // At menu: close/tuck the whole dialogue. Elsewhere: return to menu.
  if (interactiveNodeId.value === 'menu') {
    closeInteractiveDialogue()
  } else {
    tourHighlightTarget.value = null
    emit('tour-highlight', null)
    recommendedBars.value = []
    filterState.smoking = null
    filterState.cash = null
    filterState.japanese = null
    loadInteractiveNode('menu')
  }
}

function loadInteractiveNode(nodeId) {
  const wasInTour = isTourNode.value  // capture before nodeId changes
  interactiveNodeId.value = nodeId
  const node = INTERACTIVE_DIALOGUE[nodeId]
  if (!node) return

  // On mobile: handle transitions between tour and non-tour interactive modes
  if (isMobile.value && interactiveMode.value) {
    const nowInTour = nodeId.startsWith('tour-')
    if (!wasInTour && nowInTour) {
      // Entering tour: close CRT terminal (main dialogue text will show tour content)
      terminalVisible.value = false
    } else if (wasInTour && !nowInTour) {
      // Leaving tour: re-open CRT terminal for interactive panel
      terminalLines.value = []
      terminalImageVisible.value = false
      terminalImageSrc.value = null
      terminalVisible.value = true
    }
  }

  // Clear recommended bars when leaving recommend result nodes
  if (!isRecommendResultNode(nodeId)) {
    recommendedBars.value = []
  }

  if (node.action) executeAction(node.action)

  // Handle dynamic text nodes
  if (nodeId === 'recommend-random') {
    const bar = props.bars.length > 0
      ? props.bars[Math.floor(Math.random() * props.bars.length)]
      : null
    const name = bar ? (bar.name_en || bar.name_jp || '?') : '...'
    node.text_en = `How about ${name}?`
    node.text_jp = `${name}なんてどうかしら？`
    recommendedBars.value = bar ? [bar] : []
  }

  if (nodeId === 'rf-jp-yes' || nodeId === 'rf-jp-no') {
    filterState.japanese = nodeId === 'rf-jp-yes'
    const bars = getRecommendedBars(3)
    recommendedBars.value = bars
    const text = buildRecommendText(bars)
    node.text_en = text
    node.text_jp = text
  }

  const text = props.lang === 'jp' ? (node.text_jp || node.text_en) : node.text_en
  startTypewriter(text)
}

function openInteractiveDialogue() {
  isTucked.value = false
  interactiveMode.value = true
  if (isMobile.value) {
    // On mobile: open CRT terminal for the interactive panel
    terminalLines.value = []
    terminalImageVisible.value = false
    terminalImageSrc.value = null
    terminalVisible.value = true
  } else {
    // Desktop: close CRT terminal if it was open from rules
    terminalVisible.value = false
  }
  emit('tour-mode', true)
  loadInteractiveNode('menu')
}

function selectChoice(choiceId) {
  if (choiceId.startsWith('rf-smoke-')) filterState.smoking = choiceId === 'rf-smoke-yes'
  if (choiceId.startsWith('rf-cash-'))  filterState.cash    = choiceId === 'rf-cash-yes'
  // rf-jp handled in loadInteractiveNode
  loadInteractiveNode(choiceId)
}

function advanceInteractive() {
  if (!typingDone.value) { skipTypewriter(); return }
  const next = currentNode.value?.next ?? 'menu'
  if (next === 'menu') {
    tourHighlightTarget.value = null
    emit('tour-highlight', null)
    recommendedBars.value = []
    filterState.smoking = null
    filterState.cash = null
    filterState.japanese = null
    loadInteractiveNode('menu')
  } else {
    loadInteractiveNode(next)
  }
}

function closeInteractiveDialogue() {
  interactiveMode.value = false
  isTucked.value = true
  if (isMobile.value) {
    terminalVisible.value = false
  }
  tourHighlightTarget.value = null
  emit('tour-highlight', null)
  emit('tour-mode', false)
}

// Touch handler for tucked panel — fires immediately without 300ms delay
function handleTouchEnd(e) {
  if (isTucked.value) {
    e.preventDefault() // prevent subsequent synthetic click
    openInteractiveDialogue()
  }
}

// Click anywhere on panel (not a button) to advance — VN style
let lastAdvanceTime = 0
function handleDialogueClick(e) {
  if (isTucked.value) {
    openInteractiveDialogue()
    return
  }
  if (interactiveMode.value) {
    if (e.target.closest('button')) return
    if (!typingDone.value) { skipTypewriter(); return }
    return
  }
  if (e.target.closest('button')) return
  const now = Date.now()
  if (now - lastAdvanceTime < 300) return
  lastAdvanceTime = now
  handleAdvance()
}

// Click on CRT terminal body (not buttons): skip typewriter in interactive mode
function handleTerminalClick(e) {
  if (!interactiveMode.value) return
  if (e.target.closest('button')) return
  if (!typingDone.value) { skipTypewriter() }
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
  if (interactiveMode.value) {
    // Re-type current interactive node text in new language
    const node = currentNode.value
    if (node) {
      const text = props.lang === 'jp' ? (node.text_jp || node.text_en) : node.text_en
      startTypewriter(text)
    }
  } else {
    skipTypewriter()
  }
})
</script>

<template>
  <Teleport to="body">
    <!-- Terminal window (slides down from top) -->
    <Transition name="crt">
      <div v-if="terminalVisible" class="crt-terminal" @click.stop="handleTerminalClick">
        <div class="crt-screen" :class="{ 'crt-screen--gaichan': !terminalImageVisible }">
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
          <!-- Dialogue text overlay: bottom 25% of terminal screen (mobile non-tour mode) -->
          <div v-if="interactiveMode && isMobile" class="crt-dialogue-overlay">
            {{ displayedText }}<span v-if="!typingDone" class="dialogue-cursor">▋</span>
          </div>
        </div>
        <img src="/gaichan/terminal.png" class="crt-window" alt="" draggable="false" />
      </div>
    </Transition>

    <!-- Main dialogue panel -->
    <div
      class="gaichan-dialogue"
      :class="{ tucked: isTucked }"
      @click="handleDialogueClick"
      @touchend="handleTouchEnd"
    >
      <div class="dialogue-body">

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
          <div class="screen-scanlines" aria-hidden="true"></div>
        </div>

        <!-- 2. gaichanwindow.png masked by gaichanwindowtp.png -->
        <img
          src="/gaichan/gaichanwindow.png"
          class="layer--window"
          alt=""
          draggable="false"
        />

        <!-- Speaker name -->
        <div v-if="!isTucked" class="speaker-name">{{ lang === 'jp' ? '街ちゃん' : 'Gai-chan' }}</div>

        <!-- 3. Text panel -->
        <div v-if="!isTucked" class="text-panel">
          <!-- Hide dialogue text on mobile in non-tour interactive mode (it's shown in the terminal overlay instead) -->
          <div v-if="!(interactiveMode && isMobile && !isTourNode)" class="dialogue-text">
            {{ displayedText }}<span v-if="!typingDone" class="dialogue-cursor">▋</span>
          </div>

          <!-- Recommended bars (clickable) — only shown in recommend result nodes -->
          <div v-if="interactiveMode && typingDone && recommendedBars.length > 0 && isRecommendResultNode(interactiveNodeId)" class="bar-links">
            <span
              v-for="bar in recommendedBars"
              :key="bar.id"
              class="bar-link"
              @click.stop="emit('open-bar', bar.id)"
            >{{ bar.name_en || bar.name_jp }}</span>
          </div>

          <!-- Interactive close/skip — always shown in interactive mode (positioned absolute) -->
          <button
            v-if="interactiveMode"
            class="skip-btn interactive-close"
            @click.stop="interactiveSkip()"
          >
            {{ interactiveNodeId === 'menu'
              ? (lang === 'jp' ? '閉じる' : 'Close')
              : (lang === 'jp' ? 'スキップ' : 'Skip') }}
          </button>

          <!-- Choice buttons (shown when showChoices) -->
          <div v-if="showChoices" class="choice-list">
            <button
              v-for="choice in currentNode.choices"
              :key="choice.id"
              class="choice-btn"
              @click.stop="selectChoice(choice.id)"
            >{{ lang === 'jp' ? choice.label_jp : choice.label_en }}</button>
          </div>

          <!-- Footer (shown when NOT showing choices) -->
          <div v-else class="text-footer">
            <span class="step-counter">
              <template v-if="!interactiveMode">{{ stepIndex + 1 }} / {{ SCRIPT.length }}</template>
            </span>

            <!-- Rules mode: skip button -->
            <button v-if="!interactiveMode" class="skip-btn" @click.stop="handleSkip">
              {{ lang === 'jp' ? 'スキップ' : 'Skip' }} ▶▶
            </button>

            <!-- Interactive: Close/Next button -->
            <Transition name="fade">
              <button
                v-if="interactiveMode && showNextBtn"
                class="next-btn"
                @click.stop="advanceInteractive()"
              >
                {{ isLastNode ? (lang === 'jp' ? '閉じる' : 'Close') : (lang === 'jp' ? '次へ ▶' : 'Next ▶') }}
              </button>
            </Transition>

            <!-- Original rules next button (non-interactive) -->
            <Transition name="fade">
              <button v-if="!interactiveMode && typingDone" class="next-btn" @click.stop="handleAdvance">
                {{ nextLabel }}
              </button>
            </Transition>
          </div>
        </div>

      </div><!-- /.dialogue-body -->
    </div><!-- /.gaichan-dialogue -->

    <!-- Mobile small terminal — shown ONLY during site tour (not recommend/cute/menu) -->
    <div
      v-if="interactiveMode && isMobile && isTourNode"
      class="small-terminal"
    >
      <div class="small-terminal-screen">
        <img :src="spriteImg" class="small-terminal-sprite" alt="" draggable="false" />
        <div class="small-terminal-scanlines" aria-hidden="true"></div>
      </div>
      <img src="/gaichan/smallterminaltp.png" class="small-terminal-mask" alt="" draggable="false" />
    </div>
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
  background: #000;
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
.speaker-name {
  position: absolute;
  left: 33.2%;
  top: 3.3%;
  width: 15.8%;
  height: 10.8%;
  background: #000;
  z-index: 1;
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
.text-panel {
  position: absolute;
  left: 33.0%;
  top: 19.5%;
  right: 6.9%;
  bottom: 19.3%;
  background: #000;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 12px 10px 12px;
  box-sizing: border-box;
}

/* Skip: top-right corner of text panel on desktop; in footer on mobile */
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

/* ── Choice buttons ────────────────────────────────────────────────────────── */
.choice-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  margin-top: 6px;
}

.choice-btn {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #ffe4a0;
  background: transparent;
  border: 1px solid rgba(255, 220, 140, 0.3);
  padding: 4px 10px;
  cursor: pointer;
  text-align: left;
  letter-spacing: 0.03em;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.choice-btn:hover {
  color: #fff5cc;
  border-color: rgba(255, 220, 140, 0.7);
  background: rgba(255, 200, 80, 0.08);
}
.choice-btn:active {
  opacity: 0.75;
}

/* ── Bar links ────────────────────────────────────────────────────────────── */
.bar-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex-shrink: 0;
  margin-top: 4px;
}

.bar-link {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #ffcc44;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.15s;
}
.bar-link:hover {
  color: #fff5cc;
}

/* ── CRT Terminal ──────────────────────────────────────────────────────────── */
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

/* ── Dialogue text overlay in terminal screen (hidden on desktop) ──────────── */
.crt-dialogue-overlay {
  display: none;
}

/* ── Mobile small terminal ─────────────────────────────────────────────────── */
.small-terminal {
  display: none;
}

/* ════════════════════════════════════════════════════════════════════════════
   MOBILE  (≤ 768px)
   ════════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {

  .gaichan-dialogue {
    width: calc(100vw * 2155 / 1434);
    left: 0;
    transform: translateX(calc(-100vw * 642 / 1434));
    transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Tucked: same as desktop — show leftmost --pw (30%) of panel from right viewport edge */
  .gaichan-dialogue.tucked {
    left: 100%;
    transform: translateX(calc(-1 * var(--pw)));
  }

  /* Bug fix: hide screen-content on mobile only when NOT tucked */
  .screen-content:not(.screen-content--tucked) {
    display: none;
  }

  /* Remove pixel overrides — percentage-based desktop values handle positioning */
  .text-panel {
    left: 33.0%;
    right: 6.9%;
    top: 19.5%;
    bottom: 19.3%;
  }

  /* Speaker name: same percentage positioning as desktop */
  .speaker-name {
    font-size: 9px;
  }

  /* Skip button in rules mode: static in footer flex row */
  .skip-btn:not(.interactive-close) {
    position: static;
    top: auto;
    right: auto;
    font-size: 9px;
  }

  /* Interactive close button: stays absolute top-right even on mobile */
  .interactive-close {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 9px;
  }

  /* Choice buttons: slightly smaller on mobile */
  .choice-btn {
    font-size: 10px;
    padding: 5px 8px;
  }

  /* ── Terminal: anchored symmetrically around screen content ──────────── */
  .crt-terminal {
    width: calc(100vw * 1268 / 701);
    left: 0;
    transform: translateX(calc(-100vw * 275 / 701));
  }
  /* Slide animation: preserve horizontal offset during enter/leave */
  .crt-enter-from { transform: translateX(calc(-100vw * 275 / 701)) translateY(-160%); }
  .crt-leave-to   { transform: translateX(calc(-100vw * 275 / 701)) translateY(-160%); }

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
    height: 104%;
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

  /* ── Mobile small terminal — fixed at top-left, shown during site tour only ─ */
  /*
    smallterminaltp.png: 189x186
    Screen (transparent) area: left 11%, top 11%, width 77%, height 76%
  */
  .small-terminal {
    display: block;
    position: fixed;
    width: 175px;
    aspect-ratio: 189 / 186;
    left: 0;
    bottom: calc(var(--taskbar-height, 42px) + 50vw);
    z-index: 1200;
    pointer-events: none;
    isolation: isolate;
  }

  /* Screen area — clipped, black background */
  .small-terminal-screen {
    position: absolute;
    left: 11%;
    top: 11%;
    width: 77%;
    height: 76%;
    overflow: hidden;
    background: #000;
    z-index: 0;
  }

  .small-terminal-sprite {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 15%;
    image-rendering: pixelated;
  }

  .small-terminal-scanlines {
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
  }

  .small-terminal-mask {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
    z-index: 1;
  }

  /* ── Dialogue text overlay: black bar at bottom of CRT screen ───────────── */
  .crt-dialogue-overlay {
    display: block;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 25%;
    background: rgba(0, 0, 0, 0.92);
    z-index: 4;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #ffe4a0;
    padding: 5px 7px;
    overflow: hidden;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    box-sizing: border-box;
  }

  /* ── Choice buttons: 2/3 width to leave room for the close button ────────── */
  .choice-btn {
    font-size: 10px;
    padding: 5px 8px;
    width: 66%;
  }

  /* ── Footer: push to bottom so Close/Next doesn't overlap the Skip button ── */
  /* When dialogue-text (flex:1) is hidden, footer would otherwise be at the top */
  .text-footer {
    margin-top: auto;
  }

}

/* ── Tour highlight pulse (for WinTaskbar / DesktopView) ────────────────── */
:global(.tour-highlight) {
  box-shadow: 0 0 0 2px #ffcc44, 0 0 10px 2px rgba(255, 204, 68, 0.6) !important;
  animation: tour-pulse 1s ease-in-out infinite;
}

@keyframes tour-pulse {
  0%, 100% { box-shadow: 0 0 0 2px #ffcc44, 0 0 10px 2px rgba(255, 204, 68, 0.6); }
  50%       { box-shadow: 0 0 0 2px #ffcc44, 0 0 16px 4px rgba(255, 204, 68, 0.8); }
}
</style>
