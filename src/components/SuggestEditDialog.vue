<script setup>
// "Suggest an edit": a Win95 property sheet pre-filled with a bar's current
// values, so the visitor only changes what is wrong. With `bar` null it is the
// "Know a bar we're missing?" form instead.
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import WinButton from './win2000/WinButton.vue'
import WinTabs from './win2000/WinTabs.vue'
import WinCheckbox from './win2000/WinCheckbox.vue'
import WinTextInput from './win2000/WinTextInput.vue'
import { postSuggestion } from '../api/suggestions.js'
import { barToForm, buildSuggestionItems } from '../utils/suggestions.js'
import { DAY_NAMES } from '../utils/openNow.js'
import { useDialog } from '../composables/useDialog.js'
import { useI18n } from '../composables/useI18n.js'

const props = defineProps({
  bar: { type: Object, default: null },
  lang: { type: String, default: 'en' },
})
const emit = defineEmits(['close', 'sent'])

const { t } = useI18n(computed(() => props.lang))
const dialog = useDialog()

const NOTE_MAX = 1000
const CONTACT_MAX = 200
// Monday first, the way opening hours are usually written
const WEEK = [...DAY_NAMES.slice(1), DAY_NAMES[0]]

const isNewBar = computed(() => !props.bar)
const barName = computed(() => {
  if (!props.bar) return ''
  return props.lang === 'jp' ? (props.bar.name_jp || props.bar.name_en) : (props.bar.name_en || props.bar.name_jp)
})

const tab = ref('hours')
const tabs = computed(() => [
  { value: 'hours', label: t('suggestTabHours') },
  { value: 'prices', label: t('suggestTabPrices') },
  { value: 'other', label: t('suggestTabOther') },
])

// Snapshot of the bar when the dialog opened; the form starts as a copy of it
const form = reactive(barToForm(props.bar))
const newBar = reactive({ name: '', location: '', details: '' })
const note = ref('')
const contact = ref('')
const website = ref('') // honeypot: hidden from people, bots fill it in

const sending = ref(false)
const errorKey = ref(null)

const built = computed(() => (isNewBar.value ? { items: [], error: null } : buildSuggestionItems(props.bar, form)))
const canSend = computed(() => {
  if (sending.value) return false
  if (isNewBar.value) return newBar.name.trim().length > 0
  return built.value.items.length > 0 || !!built.value.error
})
const isDirty = computed(() =>
  note.value.trim().length > 0
  || (isNewBar.value
    ? !!(newBar.name.trim() || newBar.location.trim() || newBar.details.trim())
    : built.value.items.length > 0 || !!built.value.error)
)

function setClosed(day, closed) {
  form.days[day].closed = closed
  if (closed) form.days[day].custom = false
}
function setCustom(day, custom) {
  form.days[day].custom = custom
  if (custom) {
    form.days[day].closed = false
    if (!form.days[day].open) form.days[day].open = form.open
    if (!form.days[day].close) form.days[day].close = form.close
  }
}

async function submit(items) {
  if (sending.value) return
  sending.value = true
  errorKey.value = null
  try {
    await postSuggestion({
      barId: props.bar ? props.bar.id : null,
      items,
      note: note.value,
      contact: contact.value,
      website: website.value,
    })
    emit('sent')
  } catch (err) {
    errorKey.value = err.status === 429 ? 'rateLimited' : 'suggestSendFailed'
  } finally {
    sending.value = false
  }
}

function send() {
  if (!canSend.value) return
  if (isNewBar.value) {
    const payload = { name: newBar.name.trim() }
    if (newBar.location.trim()) payload.location = newBar.location.trim()
    if (newBar.details.trim()) payload.details = newBar.details.trim()
    return submit([{ kind: 'new_bar', payload }])
  }
  if (built.value.error) { errorKey.value = built.value.error; return }
  return submit(built.value.items)
}

// True while a confirm box is open on top of this dialog
let confirming = false
// Released a tick later: the Esc that closed the confirm box must not also
// reach this dialog's own Esc handler
function releaseConfirm() {
  setTimeout(() => { confirming = false }, 0)
}

async function reportClosed() {
  if (sending.value || confirming) return
  confirming = true
  const ok = await dialog.confirm(t('suggestClosedConfirm', { name: barName.value }), {
    title: t('suggestReportClosed'),
    icon: 'warning',
    yesNo: true,
    defaultButton: 1,
  })
  releaseConfirm()
  if (ok) submit([{ kind: 'closed', payload: {} }])
}

async function requestClose() {
  if (sending.value || confirming) return
  if (!isDirty.value) { emit('close'); return }
  confirming = true
  const discard = await dialog.confirm(t('suggestDiscardText'), {
    title: t('suggestTitle'),
    icon: 'warning',
    okLabel: t('reviewDiscard'),
    cancelLabel: t('reviewKeepEditing'),
  })
  releaseConfirm()
  if (discard) emit('close')
}

function onKeydown(e) {
  // A confirm on top of this dialog handles its own Esc
  if (e.key === 'Escape' && !confirming) requestClose()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="se-overlay" @click.self="requestClose">
      <form class="se-dialog" role="dialog" aria-modal="true" :aria-label="t(isNewBar ? 'suggestMissingTitle' : 'suggestTitle')" novalidate @submit.prevent="send">
        <div class="se-titlebar">
          <span class="se-title">
            <template v-if="isNewBar">{{ t('suggestMissingTitle') }}</template>
            <template v-else>{{ t('suggestTitle') }} &mdash; {{ barName }}</template>
          </span>
          <button type="button" class="se-ctrl-btn" :title="t('close')" :aria-label="t('close')" @click="requestClose">
            <span class="se-ctrl-icon">&#10005;</span>
          </button>
        </div>

        <div class="se-body">
          <p class="se-intro">{{ t(isNewBar ? 'suggestMissingIntro' : 'suggestIntro') }}</p>

          <!-- Missing bar -->
          <div v-if="isNewBar" class="se-fields">
            <label class="se-field">
              <span class="se-label">{{ t('suggestNewName') }}</span>
              <WinTextInput v-model="newBar.name" maxlength="120" class="se-new-name" />
            </label>
            <label class="se-field">
              <span class="se-label">{{ t('suggestNewLocation') }}</span>
              <WinTextInput v-model="newBar.location" maxlength="300" :placeholder="t('suggestNewLocationHint')" />
            </label>
            <label class="se-field">
              <span class="se-label">{{ t('suggestNewDetails') }}</span>
              <textarea v-model="newBar.details" class="se-textarea" rows="3" maxlength="500"></textarea>
            </label>
          </div>

          <!-- Existing bar: property sheet -->
          <WinTabs v-else v-model="tab" :tabs="tabs" class="se-tabs">
            <div v-show="tab === 'hours'" class="se-pane">
              <div class="se-row se-usual">
                <span class="se-label">{{ t('suggestUsualHours') }}</span>
                <span class="se-times">
                  <input v-model="form.open" type="time" class="se-time" :aria-label="t('suggestOpens')" />
                  <span class="se-dash">&ndash;</span>
                  <input v-model="form.close" type="time" class="se-time" :aria-label="t('suggestCloses')" />
                </span>
              </div>
              <div class="se-days">
                <div v-for="day in WEEK" :key="day" class="se-day">
                  <span class="se-day-name">{{ t('day_' + day) }}</span>
                  <WinCheckbox :model-value="form.days[day].closed" :label="t('suggestDayClosed')" @update:model-value="setClosed(day, $event)" />
                  <WinCheckbox :model-value="form.days[day].custom" :label="t('suggestDayOther')" @update:model-value="setCustom(day, $event)" />
                  <span v-if="form.days[day].custom" class="se-times se-day-times">
                    <input v-model="form.days[day].open" type="time" class="se-time" :aria-label="t('suggestOpens')" />
                    <span class="se-dash">&ndash;</span>
                    <input v-model="form.days[day].close" type="time" class="se-time" :aria-label="t('suggestCloses')" />
                  </span>
                </div>
              </div>
            </div>

            <div v-show="tab === 'prices'" class="se-pane se-fields">
              <label class="se-field">
                <span class="se-label">{{ t('cover') }}</span>
                <WinTextInput v-model="form.charge" maxlength="60" :placeholder="t('suggestPriceHint')" />
              </label>
              <label class="se-field">
                <span class="se-label">{{ t('maleCharge') }}</span>
                <WinTextInput v-model="form.male_charge" maxlength="60" />
              </label>
              <label class="se-field">
                <span class="se-label">{{ t('suggestDrinkFrom') }}</span>
                <WinTextInput v-model="form.drink_price" maxlength="60" />
              </label>
              <WinCheckbox v-model="form.cash_only" :label="t('cashOnly')" class="se-check" />
            </div>

            <div v-show="tab === 'other'" class="se-pane se-fields">
              <label class="se-field">
                <span class="se-label">{{ t('suggestNameJp') }}</span>
                <WinTextInput v-model="form.name_jp" maxlength="120" />
              </label>
              <label class="se-field">
                <span class="se-label">{{ t('suggestNameEn') }}</span>
                <WinTextInput v-model="form.name_en" maxlength="120" />
              </label>
              <label class="se-field">
                <span class="se-label">{{ t('phone') }}</span>
                <WinTextInput v-model="form.phone" maxlength="40" inputmode="tel" />
              </label>
              <label class="se-field">
                <span class="se-label">{{ t('suggestLink') }}</span>
                <WinTextInput v-model="form.sns" maxlength="300" inputmode="url" placeholder="https://" />
              </label>
              <WinCheckbox v-model="form.moved" :label="t('suggestMoved')" class="se-check" />
              <label v-if="form.moved" class="se-field">
                <span class="se-label">{{ t('suggestMovedWhere') }}</span>
                <WinTextInput v-model="form.location" maxlength="300" :placeholder="t('suggestNewLocationHint')" />
              </label>
            </div>
          </WinTabs>

          <div class="se-fields se-common">
            <label class="se-field">
              <span class="se-label">{{ t('suggestNote') }}</span>
              <textarea v-model="note" class="se-textarea" rows="2" :maxlength="NOTE_MAX" :placeholder="t('suggestNoteHint')"></textarea>
            </label>
            <label class="se-field">
              <span class="se-label">{{ t('suggestContact') }}</span>
              <WinTextInput v-model="contact" :maxlength="CONTACT_MAX" :placeholder="t('suggestContactHint')" />
            </label>
            <!-- Honeypot: off-screen, skipped by keyboard and screen readers -->
            <div class="se-hp" aria-hidden="true">
              <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
            </div>
          </div>

          <p v-if="errorKey" class="se-error" role="alert">{{ t(errorKey) }}</p>
        </div>

        <div class="se-footer">
          <WinButton v-if="!isNewBar" type="button" class="se-closed-btn" :disabled="sending" @click="reportClosed">{{ t('suggestReportClosed') }}</WinButton>
          <span class="se-spacer"></span>
          <WinButton type="button" class="se-send" :disabled="!canSend" @click="send">{{ sending ? t('suggestSending') : t('suggestSend') }}</WinButton>
          <WinButton type="button" :disabled="sending" @click="requestClose">{{ t('dialogCancel') }}</WinButton>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
/* Above the taskbar (1000) and Gai-chan (1050-1200); below the system dialogs (5000) */
.se-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.se-dialog {
  background: var(--win-bg);
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark),
    inset 2px 2px 0 var(--win-border-mid),
    inset -2px -2px 0 var(--win-border-darkest),
    4px 4px 10px rgba(0, 0, 0, 0.6);
  padding: 3px;
  width: 400px;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.se-titlebar {
  display: flex;
  align-items: center;
  height: 20px;
  padding: 0 3px;
  background: var(--win-title-active);
  color: var(--win-title-text-active);
  font-size: 11px;
  font-weight: bold;
  user-select: none;
  flex-shrink: 0;
}

.se-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 2px;
}

.se-ctrl-btn {
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
  flex-shrink: 0;
  position: relative;
}

.se-ctrl-icon {
  font-size: 8px;
  line-height: 1;
  color: var(--win-text);
}

.se-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
}

.se-intro {
  margin: 0 0 8px;
  line-height: 1.4;
}

.se-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.se-common { margin-top: 8px; }

.se-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.se-label {
  color: var(--win-text);
}

.se-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.se-usual {
  padding-bottom: 6px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--win-border-dark);
}

.se-times {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.se-time,
.se-textarea {
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  outline: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light),
    inset 2px 2px 0 var(--win-border-darkest),
    inset -2px -2px 0 var(--win-border-mid);
}

.se-time {
  height: 21px;
  padding: 2px 4px;
  color-scheme: dark;
}

.se-textarea {
  width: 100%;
  padding: 4px;
  resize: vertical;
  line-height: 1.3;
}

.se-day {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 10px;
  min-height: 24px;
}

.se-day-name {
  width: 34px;
  flex-shrink: 0;
  font-weight: bold;
}

.se-error {
  margin: 8px 0 0;
  color: var(--valhalla-pink);
  line-height: 1.4;
}

.se-hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.se-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px 5px;
  flex-shrink: 0;
  border-top: 1px solid var(--win-border-dark);
}

.se-spacer { flex: 1; }

.se-closed-btn { color: var(--valhalla-pink); }

@media (max-width: 768px) {
  .se-overlay { padding: 6px; }

  .se-titlebar { height: 28px; }
  /* The visible box stays small; the tap area is 40px */
  .se-ctrl-btn::after {
    content: '';
    position: absolute;
    inset: -13px -12px;
  }

  .se-tabs :deep(.win-tab) {
    min-height: 40px;
    padding-left: 14px;
    padding-right: 14px;
  }

  /* 16px keeps iOS from zooming the page when a field gets focus */
  .se-body :deep(.win-text-input),
  .se-time,
  .se-textarea {
    font-size: 16px;
  }
  .se-body :deep(.win-text-input),
  .se-time {
    height: 40px;
    padding: 4px 6px;
  }

  .se-day { min-height: 40px; }
  .se-body :deep(.win-checkbox) { min-height: 40px; padding-right: 4px; }
  .se-body :deep(.win-checkbox-box) { width: 18px; height: 18px; }
  .se-day-times { flex-basis: 100%; padding: 0 0 4px 44px; }

  .se-footer :deep(.win-btn) { min-height: 40px; }
}
</style>
