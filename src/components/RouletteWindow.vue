<script setup>
// Bar Roulette (F02): "just pick one for me". The body of the Roulette.exe
// window; App.vue hosts it in a WinWindow (desktop) or a full-screen panel
// (mobile). The draw itself lives in utils/roulette.js.
import { ref, computed, toRef, watch, onBeforeUnmount, onUnmounted } from 'vue'
import GaiChanModel from './GaiChanModel.vue'
import WinButton from './win2000/WinButton.vue'
import WinCheckbox from './win2000/WinCheckbox.vue'
import TagIcon from './TagIcon.vue'
import { useI18n } from '../composables/useI18n.js'
import { useVisited } from '../composables/useVisited.js'
import { useOpenNow } from '../composables/useOpenNow.js'
import { useDialog } from '../composables/useDialog.js'
import { canNativeShare } from '../composables/useUrlState.js'
import { yen } from '../utils/barFilters.js'
import { rouletteCandidates, pickBar, reelSequence, ENGLISH_TAG } from '../utils/roulette.js'

const props = defineProps({
  bars: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
  lang: { type: String, default: 'en' },
  // The map's current filters, in the shape barPasses() takes
  mapFilters: { type: Object, default: () => ({}) },
  // Whether any of them is set (the checkbox is disabled when none is)
  hasMapFilters: { type: Boolean, default: false },
})

const emit = defineEmits(['show-on-map', 'share-bar'])

const { t } = useI18n(computed(() => props.lang))
const { isVisited, isFavorited } = useVisited()
const { openBarIds, definitivelyOpenIds, closedBarIds } = useOpenNow(toRef(props, 'bars'))
const dialog = useDialog()
const nativeShare = canNativeShare()

// Options
const optOpenNow = ref(true)
const optMapFilters = ref(false)
const optUnvisited = ref(false)
const optNoCover = ref(false)
const optEnglish = ref(false)

const englishTag = computed(() => props.tags.find(tag => tag.id === ENGLISH_TAG) || null)
const englishLabel = computed(() => {
  const tag = englishTag.value
  if (!tag) return ''
  return props.lang === 'jp' && tag.label_jp ? tag.label_jp : tag.label
})

const candidates = computed(() => rouletteCandidates(props.bars, {
  openNow: optOpenNow.value,
  unvisited: optUnvisited.value,
  noCover: optNoCover.value,
  english: optEnglish.value && !!englishTag.value,
  mapFilters: optMapFilters.value && props.hasMapFilters ? props.mapFilters : null,
}, { openBarIds: openBarIds.value, isVisited, isFavorited }))

// Spin
const BLOCKS = 20
const REEL_LENGTH = 18
const phase = ref('idle') // 'idle' | 'spinning' | 'result'
const reel = ref([])
const reelIndex = ref(0)
const winner = ref(null)
const drawSize = ref(0)
let timer = null

const progress = computed(() => {
  if (phase.value === 'result') return 1
  if (phase.value !== 'spinning' || reel.value.length < 2) return 0
  return reelIndex.value / (reel.value.length - 1)
})
const filledBlocks = computed(() => Math.round(progress.value * BLOCKS))

const reelRows = computed(() => {
  if (phase.value === 'idle') return [null, null, null]
  const i = reelIndex.value
  return [reel.value[i - 1] || null, reel.value[i] || null, reel.value[i + 1] || null]
})

// ── Gai-chan and her wheel (3D). Decoration only: the draw and the reel work
// the same without it, and the stage is dropped if WebGL is unavailable.
const stageOk = ref(true)
const gaichanMood = ref('happy')
const gaichanPose = ref(null)
const gaichanTalking = ref(false)
let stage = null
let wheel = null
let talkTimer = null
let pullTimer = null
let unmounted = false

async function onStageReady(readyStage) {
  // Already downloaded by GaiChanModel; this only reads the same chunk
  const { RouletteWheel } = await import('../gaichan3d/GaiChanStage.js')
  if (unmounted) return
  stage = readyStage
  wheel = new RouletteWheel().attach(stage)
}

// How long the reel runs before it stops on the winner (see tick)
function reelSeconds(steps) {
  let ms = 0
  for (let i = 0; i < steps - 1; i++) ms += tickDelay(i, steps)
  return ms / 1000
}

watch(phase, (now) => {
  clearTimeout(talkTimer)
  clearTimeout(pullTimer)
  gaichanTalking.value = false
  if (now === 'spinning') {
    // She takes the rim and pulls it down a couple of times (the spin clip),
    // then lets the wheel run and watches it slow down
    gaichanMood.value = 'happy'
    gaichanPose.value = wheel ? wheel.pullPose : null
    stage?.lookAt(-0.9, 0.15)
    wheel?.spin(reelSeconds(reel.value.length))
    if (wheel) pullTimer = setTimeout(() => { gaichanPose.value = null }, wheel.pullSeconds * 1000)
  } else {
    wheel?.halt()
    stage?.lookAway()
    gaichanMood.value = 'happy'
    // Result: she points at the wheel and announces it
    gaichanPose.value = now === 'result' ? 'point' : null
    if (now === 'result') {
      gaichanTalking.value = true
      talkTimer = setTimeout(() => { gaichanTalking.value = false }, 1200)
    }
  }
})

onBeforeUnmount(() => {
  unmounted = true
  clearTimeout(talkTimer)
  clearTimeout(pullTimer)
  // Before GaiChanModel disposes the stage the wheel lives in
  wheel?.dispose()
  wheel = null
  stage = null
})

function reducedMotion() {
  return typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function land() {
  timer = null
  reelIndex.value = reel.value.length - 1
  phase.value = 'result'
}

// The reel starts fast and slows down as it nears the winner
function tickDelay(step, steps) {
  const p = steps > 1 ? step / (steps - 1) : 1
  return 45 + Math.round(215 * p * p)
}

function tick() {
  if (reelIndex.value >= reel.value.length - 1) return land()
  reelIndex.value++
  if (reelIndex.value >= reel.value.length - 1) {
    // Hold the winner in the reel for a beat before the card appears
    timer = setTimeout(land, 350)
  } else {
    timer = setTimeout(tick, tickDelay(reelIndex.value, reel.value.length))
  }
}

async function spin() {
  if (phase.value === 'spinning') return
  const pool = candidates.value
  if (pool.length === 0) {
    const before = [gaichanMood.value, gaichanPose.value]
    gaichanMood.value = 'embarrassed'
    gaichanPose.value = null
    await dialog.alert(t('rouletteNoMatch'), { title: t('rouletteTitle'), icon: 'warning' })
    ;[gaichanMood.value, gaichanPose.value] = before
    return
  }
  const picked = pickBar(pool, { isVisited, confirmedOpenIds: definitivelyOpenIds.value })
  winner.value = picked
  drawSize.value = pool.length
  reel.value = reelSequence(pool, picked, REEL_LENGTH)
  if (reducedMotion() || reel.value.length < 2) {
    reelIndex.value = reel.value.length - 1
    phase.value = 'result'
    return
  }
  reelIndex.value = 0
  phase.value = 'spinning'
  timer = setTimeout(tick, tickDelay(0, reel.value.length))
}

onUnmounted(() => clearTimeout(timer))

// Display helpers
function displayName(bar) {
  if (!bar) return ''
  return (props.lang === 'jp' ? (bar.name_jp || bar.name_en) : (bar.name_en || bar.name_jp)) || ''
}
function subName(bar) {
  const sub = props.lang === 'jp' ? bar.name_en : bar.name_jp
  return sub && sub !== displayName(bar) ? sub : ''
}
function openStatus(bar) {
  const id = String(bar.id)
  if (definitivelyOpenIds.value.has(id)) return 'open'
  if (closedBarIds.value.has(id)) return 'closed'
  return null
}
const winnerTags = computed(() => {
  if (!winner.value) return []
  return (winner.value.tags || [])
    .map(tag => (typeof tag === 'string' ? props.tags.find(x => x.id === tag) : tag))
    .filter(Boolean)
})
</script>

<template>
  <div class="roulette">
    <fieldset class="roulette-options" :disabled="phase === 'spinning'">
      <legend>{{ t('rouletteOptions') }}</legend>
      <WinCheckbox v-model="optOpenNow" :label="t('openNow')" />
      <WinCheckbox v-model="optUnvisited" :label="t('rouletteUnvisited')" />
      <WinCheckbox v-model="optNoCover" :label="t('rouletteNoCover')" />
      <WinCheckbox v-if="englishTag" v-model="optEnglish" :label="englishLabel" />
      <WinCheckbox
        :model-value="optMapFilters && hasMapFilters"
        :class="{ 'is-disabled': !hasMapFilters }"
        :title="hasMapFilters ? '' : t('rouletteNoMapFilters')"
        @update:model-value="optMapFilters = hasMapFilters && $event"
      >
        {{ t('rouletteMapFilters') }}
      </WinCheckbox>
    </fieldset>

    <div class="roulette-count" aria-live="polite">{{ t('rouletteInDraw', { n: candidates.length }) }}</div>

    <!-- Gai-chan spins the wheel -->
    <div v-if="stageOk" class="roulette-stage">
      <GaiChanModel
        :mood="gaichanMood"
        :pose="gaichanPose"
        :talking="gaichanTalking"
        framing="wheel"
        :pixel-height="96"
        :follow-pointer="false"
        fallback-src=""
        @ready="onStageReady"
        @fallback="stageOk = false"
      />
    </div>

    <!-- The reel: three names, the middle one is where it stops -->
    <div :class="['roulette-reel', phase]" aria-hidden="true">
      <div class="reel-row reel-side">{{ displayName(reelRows[0]) }}</div>
      <div class="reel-row reel-current">
        <span class="reel-arrow">&#9658;</span>
        <span class="reel-name">{{ phase === 'idle' ? '? ? ?' : displayName(reelRows[1]) }}</span>
        <span class="reel-arrow">&#9668;</span>
      </div>
      <div class="reel-row reel-side">{{ displayName(reelRows[2]) }}</div>
    </div>

    <div class="roulette-status">
      <template v-if="phase === 'spinning'">{{ t('rouletteConsulting') }}</template>
      <template v-else-if="phase === 'result'">{{ t('rouletteDecided') }}</template>
      <template v-else>{{ t('rouletteReady') }}</template>
    </div>
    <div
      class="roulette-progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progress * 100)"
      :aria-label="t('rouletteConsulting')"
    >
      <span v-for="n in BLOCKS" :key="n" :class="['roulette-progress-block', { on: n <= filledBlocks }]"></span>
    </div>

    <!-- Result: the bar's mini card -->
    <div v-if="phase === 'result' && winner" class="roulette-card" role="status" aria-live="polite">
      <div class="card-names">
        <div class="card-name">
          <svg v-if="isVisited(winner.id)" class="card-visited" viewBox="0 0 10 10" width="10" height="10" fill="none" :aria-label="t('visited')">
            <polyline points="1,5 3.5,8.5 9,1.5" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ displayName(winner) }}
        </div>
        <div v-if="subName(winner)" class="card-subname">{{ subName(winner) }}</div>
      </div>
      <div v-if="winnerTags.length" class="card-tags">
        <span
          v-for="tag in winnerTags"
          :key="tag.id"
          class="card-tag"
          :style="{ borderLeft: `3px solid ${tag.color}` }"
        >
          <TagIcon :icon="tag.icon" :size="10" /> {{ lang === 'jp' && tag.label_jp ? tag.label_jp : tag.label }}
        </span>
      </div>
      <div class="card-info">
        <div class="info-row">
          <span class="info-label">{{ t('status') }}</span>
          <span v-if="openStatus(winner) === 'open'" class="status-open">&#9679; {{ t('open') }}</span>
          <span v-else-if="openStatus(winner) === 'closed'" class="status-closed">&#9679; {{ t('closed') }}</span>
          <span v-else class="status-unknown">{{ t('rouletteHoursUnknown') }}</span>
        </div>
        <div v-if="winner.hours" class="info-row">
          <span class="info-label">{{ t('hours') }}</span>
          <span>{{ winner.hours }}</span>
        </div>
        <div v-if="winner.charge" class="info-row">
          <span class="info-label">{{ t('cover') }}</span>
          <span>{{ yen(winner.charge) }}</span>
        </div>
        <div v-if="winner.drink_price" class="info-row">
          <span class="info-label">{{ t('drinks') }}</span>
          <span>{{ yen(winner.drink_price) }}~</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('floor') }}</span>
          <span>{{ winner.floor ?? 1 }}F</span>
        </div>
      </div>
      <div class="card-odds">{{ t('roulettePickedFrom', { n: drawSize }) }}</div>
    </div>

    <div class="roulette-buttons">
      <template v-if="phase === 'result' && winner">
        <WinButton class="roulette-btn" @click="emit('show-on-map', winner)">{{ t('rouletteShowOnMap') }}</WinButton>
        <WinButton class="roulette-btn" @click="spin">{{ t('rouletteSpinAgain') }}</WinButton>
        <WinButton
          v-if="winner.slug"
          class="roulette-btn"
          @click="emit('share-bar', { bar: winner, anchor: $event.currentTarget })"
        >
          {{ t(nativeShare ? 'shareBar' : 'copyLink') }}
        </WinButton>
      </template>
      <WinButton v-else class="roulette-btn roulette-spin" :disabled="phase === 'spinning'" @click="spin">
        {{ t('rouletteSpin') }}
      </WinButton>
    </div>
  </div>
</template>

<style scoped>
.roulette {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.roulette-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  margin: 0;
  padding: 8px 8px 8px;
  min-width: 0;
  border: 1px solid var(--win-border-light);
  outline: 1px solid var(--win-border-dark);
  outline-offset: -2px;
}

.roulette-options legend {
  padding: 0 4px;
}

.roulette-options:disabled {
  color: var(--win-text-disabled);
}

.roulette-options:disabled :deep(.win-checkbox),
.roulette-options :deep(.win-checkbox.is-disabled) {
  color: var(--win-text-disabled);
  cursor: default;
}

.roulette-count {
  color: var(--win-text-disabled);
}

/* The little window Gai-chan and her wheel are in */
.roulette-stage {
  position: relative;
  height: 128px;
  flex-shrink: 0;
  background:
    linear-gradient(rgba(13, 10, 21, 0.45), rgba(13, 10, 21, 0.45)),
    url('/gaichan/gaichanbg.webp') center 35% / cover,
    var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
}

.roulette-stage :deep(.gaichan-model) {
  inset: 2px;
}

/* Sunken field the names run through */
.roulette-reel {
  background: var(--win-bg-dark);
  padding: 4px 6px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
  overflow: hidden;
}

.reel-row {
  height: 20px;
  line-height: 20px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reel-side {
  color: var(--win-text-disabled);
  font-size: 11px;
}

.reel-current {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  line-height: 26px;
  font-size: 16px;
  color: #ffb060;
  border-top: 1px solid var(--win-border-light);
  border-bottom: 1px solid var(--win-border-light);
}

.reel-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reel-arrow {
  flex-shrink: 0;
  font-size: 9px;
  color: var(--win-highlight);
}

.roulette-reel.result .reel-current {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.roulette-reel.result .reel-arrow {
  color: var(--win-highlight-text);
}

.roulette-status {
  min-height: 14px;
}

.roulette-progress {
  display: flex;
  gap: 2px;
  height: 18px;
  padding: 3px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.roulette-progress-block {
  flex: 1;
}

.roulette-progress-block.on {
  background: var(--win-highlight);
}

.roulette-card {
  padding: 6px 8px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.card-name {
  font-size: 14px;
  color: #ffb060;
  overflow-wrap: anywhere;
}

.card-visited {
  margin-right: 2px;
}

.card-subname {
  color: var(--win-text-disabled);
  overflow-wrap: anywhere;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 5px;
}

.card-tag {
  padding: 1px 4px;
  background: var(--win-bg);
  font-size: 10px;
  white-space: nowrap;
}

.card-info {
  margin-top: 5px;
}

.info-row {
  display: flex;
  gap: 6px;
  line-height: 1.5;
}

.info-label {
  flex-shrink: 0;
  width: 64px;
  color: var(--win-text-disabled);
}

.status-open { color: #4caf50; }
.status-closed { color: #e05050; }
.status-unknown { color: var(--win-text-disabled); }

.card-odds {
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid var(--win-border-light);
  color: var(--win-text-disabled);
  font-size: 10px;
}

.roulette-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.roulette-spin {
  min-width: 110px;
}

@media (max-width: 768px) {
  .roulette {
    gap: 12px;
    padding: 12px;
    font-size: 13px;
    background: var(--win-bg);
    flex: 1;
    overflow-y: auto;
  }

  .roulette-options {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .roulette-options :deep(.win-checkbox) {
    min-height: 40px;
    font-size: 13px;
  }

  .roulette-stage { height: 150px; }
  .reel-row { height: 26px; line-height: 26px; }
  .reel-side { font-size: 13px; }
  .reel-current { height: 36px; line-height: 36px; font-size: 19px; }
  .card-name { font-size: 17px; }
  .card-tag { font-size: 12px; }
  .card-odds { font-size: 12px; }
  .info-label { width: 84px; }

  .roulette-btn {
    flex: 1 1 30%;
    min-height: 40px;
    font-size: 13px;
  }
}
</style>
