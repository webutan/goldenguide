<script setup>
// "GAI OS Setup": the install flow as a Win95 setup wizard (G03).
//
//   welcome -> working (browser install dialog + progress bar) -> done | cancelled
//   welcome -> ios      (illustrated Share -> Add to Home Screen)  -> close
//   welcome -> manual   (browser offers no install prompt)         -> close
//   installed            (already running as the installed app)    -> close
//
// On <body> like WinDialog: it is modal and sized in real pixels (#app is zoomed).
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import WinTitleBar from './win2000/WinTitleBar.vue'
import WinButton from './win2000/WinButton.vue'
import { useI18n } from '../composables/useI18n.js'
import { usePwa } from '../composables/usePwa.js'

const props = defineProps({
  lang: { type: String, default: 'en' },
})
const emit = defineEmits(['close'])

const { t } = useI18n(computed(() => props.lang))
const { installMode, promptInstall, whenOfflineReady } = usePwa()

// Decided when the wizard opens; the prompt event is consumed along the way
const initialMode = installMode.value
const page = ref(initialMode === 'installed' ? 'installed' : 'welcome')
const waitingForBrowser = ref(false)
const offlineReady = ref(false)

// Progress bar: 20 blocks, like the Win95 file-copy bar
const BLOCKS = 20
const progress = ref(0) // 0..1
const filledBlocks = computed(() => Math.round(progress.value * BLOCKS))
let progressTimer = null
let closed = false

function creepTo(limit) {
  clearInterval(progressTimer)
  progressTimer = setInterval(() => {
    if (progress.value >= limit) return clearInterval(progressTimer)
    progress.value = Math.min(limit, progress.value + 0.05)
  }, 120)
}

async function next() {
  if (page.value !== 'welcome') return
  // The live value: the browser may have offered a prompt since the wizard opened
  const mode = installMode.value
  if (mode === 'ios' || mode === 'manual') {
    page.value = mode
    focusPrimary()
    return
  }
  if (mode === 'installed') {
    page.value = 'installed'
    focusPrimary()
    return
  }

  page.value = 'working'
  waitingForBrowser.value = true
  progress.value = 0
  creepTo(0.4)
  // Must run inside this click: opens the browser's own install dialog
  const outcome = await promptInstall()
  if (closed) return
  waitingForBrowser.value = false
  if (outcome !== 'accepted') {
    clearInterval(progressTimer)
    page.value = outcome === 'dismissed' ? 'cancelled' : 'manual'
    focusPrimary()
    return
  }
  creepTo(0.9)
  offlineReady.value = await whenOfflineReady()
  if (closed) return
  clearInterval(progressTimer)
  progress.value = 1
  // Let the full bar be seen for a moment
  await new Promise(resolve => setTimeout(resolve, 500))
  if (closed) return
  page.value = 'done'
  focusPrimary()
}

function back() {
  if (page.value === 'ios' || page.value === 'manual' || page.value === 'cancelled') {
    page.value = 'welcome'
    focusPrimary()
  }
}

function close() {
  closed = true
  emit('close')
}

const canGoBack = computed(() => ['ios', 'manual', 'cancelled'].includes(page.value))
const isLastPage = computed(() => ['ios', 'manual', 'done', 'installed'].includes(page.value))

// ── Focus / keys ──────────────────────────────────────────────────────────────
const boxRef = ref(null)
let returnFocusTo = null

function focusPrimary() {
  nextTick(() => boxRef.value?.querySelector('[data-wizard-primary]')?.focus())
}

function onKeydown(e) {
  e.stopPropagation()
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab') {
    const els = [...(boxRef.value?.querySelectorAll('button:not([disabled])') || [])]
    if (!els.length) return
    e.preventDefault()
    const i = els.indexOf(document.activeElement)
    els[e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : (i + 1) % els.length].focus()
  }
}

onMounted(() => {
  returnFocusTo = document.activeElement
  focusPrimary()
  whenOfflineReady(1).then((ready) => { if (ready) offlineReady.value = true })
})
onUnmounted(() => {
  closed = true
  clearInterval(progressTimer)
  if (returnFocusTo && document.contains(returnFocusTo)) returnFocusTo.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="wizard-overlay" @keydown="onKeydown">
      <div ref="boxRef" class="wizard" role="dialog" aria-modal="true" :aria-label="t('installTitle')">
        <WinTitleBar
          :title="t('installTitle')"
          :show-minimize="false"
          :show-maximize="false"
          @close="close"
        />

        <div class="wizard-main">
          <!-- Side banner, as on every Win95 wizard -->
          <div class="wizard-banner" aria-hidden="true">
            <img src="/icons/gaios.ico" class="wizard-banner-logo" alt="" />
            <span class="wizard-banner-text">GAI OS</span>
          </div>

          <div class="wizard-page" aria-live="polite">
            <template v-if="page === 'welcome'">
              <h2 class="wizard-heading">{{ t('installWelcomeTitle') }}</h2>
              <p>{{ t('installWelcomeText') }}</p>
              <p>{{ t('installWelcomeNext') }}</p>
            </template>

            <template v-else-if="page === 'working'">
              <h2 class="wizard-heading">{{ t('installWorkingTitle') }}</h2>
              <p>{{ waitingForBrowser ? t('installConfirmHint') : t('installSavingFiles') }}</p>
              <div
                class="wizard-progress"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="Math.round(progress * 100)"
              >
                <span v-for="n in BLOCKS" :key="n" :class="['wizard-progress-block', { on: n <= filledBlocks }]"></span>
              </div>
            </template>

            <template v-else-if="page === 'ios'">
              <h2 class="wizard-heading">{{ t('installIosTitle') }}</h2>
              <p>{{ t('installIosIntro') }}</p>
              <ol class="wizard-steps">
                <li>
                  <!-- Share: a box with an arrow leaving through the top -->
                  <svg class="wizard-step-art" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
                    <path d="M3 6h3v1H4v7h8V7h-2V6h3v9H3z M7 3h2v8H7z M6 4h4v1H6z M5 5h1v1H5z M10 5h1v1h-1z M7 2h2v1H7z" />
                  </svg>
                  <span>{{ t('installIosStep1') }}</span>
                </li>
                <li>
                  <!-- Add to Home Screen: a plus in a square -->
                  <svg class="wizard-step-art" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
                    <path d="M2 2h12v12H2z M3 3v10h10V3z" fill-rule="evenodd" />
                    <path d="M7 5h2v6H7z M5 7h6v2H5z" />
                  </svg>
                  <span>{{ t('installIosStep2') }}</span>
                </li>
                <li>
                  <img src="/icons/gaios.ico" class="wizard-step-art wizard-step-art--icon" alt="" />
                  <span>{{ t('installIosStep3') }}</span>
                </li>
              </ol>
              <p class="wizard-note">{{ t('installIosNote') }}</p>
            </template>

            <template v-else-if="page === 'manual'">
              <h2 class="wizard-heading">{{ t('installManualTitle') }}</h2>
              <p>{{ t('installManualText') }}</p>
              <p class="wizard-note">{{ t('installManualNote') }}</p>
            </template>

            <template v-else-if="page === 'cancelled'">
              <h2 class="wizard-heading">{{ t('installCancelledTitle') }}</h2>
              <p>{{ t('installCancelledText') }}</p>
            </template>

            <template v-else-if="page === 'done'">
              <h2 class="wizard-heading">{{ t('installDoneTitle') }}</h2>
              <p>{{ t('installDoneText') }}</p>
              <p v-if="offlineReady" class="wizard-note">{{ t('installOfflineReady') }}</p>
            </template>

            <template v-else>
              <h2 class="wizard-heading">{{ t('installAlreadyTitle') }}</h2>
              <p>{{ t('installAlreadyText') }}</p>
              <p v-if="offlineReady" class="wizard-note">{{ t('installOfflineReady') }}</p>
            </template>
          </div>
        </div>

        <div class="wizard-rule"></div>

        <div class="wizard-buttons">
          <WinButton :disabled="!canGoBack" @click="back">{{ t('installBack') }}</WinButton>
          <WinButton
            v-if="page === 'welcome'"
            class="is-default wizard-next"
            data-wizard-primary
            @click="next"
          >{{ t('installNext') }}</WinButton>
          <WinButton
            v-else-if="isLastPage"
            class="is-default wizard-next"
            data-wizard-primary
            @click="close"
          >{{ t('installFinish') }}</WinButton>
          <WinButton v-else class="wizard-next" disabled>{{ t('installNext') }}</WinButton>
          <WinButton
            class="wizard-cancel"
            :data-wizard-primary="page === 'cancelled' || page === 'working' ? '' : null"
            :disabled="isLastPage"
            @click="close"
          >{{ t('dialogCancel') }}</WinButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Same layer as the message boxes: above windows and the taskbar, transparent */
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 4900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.wizard {
  display: flex;
  flex-direction: column;
  width: 480px;
  max-width: 100%;
  max-height: 100%;
  padding: 3px;
  background: var(--win-bg);
  color: var(--win-text);
  font-family: var(--win-font);
  font-size: 12px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    2px 2px 6px rgba(0, 0, 0, 0.4);
}

.wizard-main {
  display: flex;
  min-height: 250px;
  overflow: hidden;
}

.wizard-banner {
  flex-shrink: 0;
  width: 120px;
  margin: 10px 0 10px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 16px 8px 10px;
  background: var(--valhalla-purple);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.wizard-banner-logo {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.wizard-banner-text {
  color: var(--valhalla-orange);
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}

.wizard-page {
  flex: 1;
  min-width: 0;
  padding: 14px 16px 10px;
  line-height: 1.45;
  overflow-y: auto;
}

.wizard-page p {
  margin: 0 0 10px;
}

.wizard-heading {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: bold;
  line-height: 1.3;
  color: var(--valhalla-orange);
}

.wizard-note {
  color: var(--win-text-disabled);
}

.wizard-progress {
  display: flex;
  gap: 2px;
  height: 20px;
  margin-top: 16px;
  padding: 3px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.wizard-progress-block {
  flex: 1;
}

.wizard-progress-block.on {
  background: var(--win-highlight);
}

.wizard-steps {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  counter-reset: step;
}

.wizard-steps li {
  counter-increment: step;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}

.wizard-steps li::before {
  content: counter(step) '.';
  flex-shrink: 0;
  width: 14px;
  font-weight: bold;
}

.wizard-step-art {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 4px;
  box-sizing: border-box;
  background: var(--win-bg-dark);
  fill: var(--valhalla-orange);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.wizard-step-art--icon {
  image-rendering: pixelated;
  object-fit: contain;
}

/* Etched line above the buttons */
.wizard-rule {
  height: 2px;
  margin: 0 10px;
  box-shadow:
    inset 0 1px 0 var(--win-border-dark),
    inset 0 -1px 0 var(--win-border-light);
}

.wizard-buttons {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
}

.wizard-cancel {
  margin-left: 10px;
}

.wizard-buttons .win-btn.is-default {
  box-shadow:
    0 0 0 1px var(--win-border-darkest),
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest);
}

.wizard-buttons .win-btn:focus-visible {
  outline: 1px dotted var(--win-text);
  outline-offset: -5px;
}

.wizard-buttons .win-btn:disabled {
  color: var(--win-text-disabled);
  cursor: var(--cursor-default);
}

@media (max-width: 768px) {
  .wizard {
    font-size: 13px;
  }

  .wizard-main {
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
  }

  /* The banner becomes a strip across the top */
  .wizard-banner {
    width: auto;
    margin: 8px 8px 0;
    flex-direction: row;
    justify-content: flex-start;
    gap: 10px;
    padding: 6px 10px;
  }

  .wizard-banner-logo {
    width: 32px;
    height: 32px;
  }

  .wizard-page {
    overflow-y: visible;
    padding: 12px;
  }

  .wizard-buttons {
    padding: 8px;
  }

  .wizard-buttons .win-btn {
    flex: 1 1 0;
    min-width: 0;
    min-height: 40px;
  }

  .wizard-cancel {
    margin-left: 8px;
  }
}
</style>
