// Win95-style modal dialogs — promise-based replacements for the browser's
// native alert, confirm and prompt boxes (never use those in this app).
//
//   const dialog = useDialog()
//   await dialog.alert('Saved.', { icon: 'info' })
//   if (await dialog.confirm('Delete this bar?', { icon: 'warning', yesNo: true })) { ... }
//   const pwd = await dialog.prompt('Password:', { password: true })   // string, or null if cancelled
//
// Dialogs are queued (one on screen at a time) and rendered by the single
// <WinDialog /> host mounted in App.vue.
import { ref, computed } from 'vue'
import { useI18n } from './useI18n.js'

/** @typedef {'info'|'warning'|'error'|'question'|'none'} DialogIcon */

const queue = ref([])
const current = computed(() => queue.value[0] || null)
// Language the host renders in; App.vue passes it to <WinDialog :lang>.
const dialogLang = ref('en')
const { t } = useI18n(dialogLang)

let nextId = 1
let soundHook = null

/**
 * Register a function called whenever a dialog opens, e.g. to play a "ding"
 * (F08's sound setting). Receives the dialog's icon kind. Pass null to disable.
 * No sound by default.
 */
export function setDialogSound(fn) {
  soundHook = typeof fn === 'function' ? fn : null
}

function open(kind, message, opts = {}) {
  let buttons
  if (kind === 'alert') {
    buttons = [{ key: 'dialogOk', label: opts.okLabel, value: undefined }]
  } else if (kind === 'confirm' && opts.yesNo) {
    buttons = [
      { key: 'dialogYes', label: opts.okLabel, value: true },
      { key: 'dialogNo', label: opts.cancelLabel, value: false },
    ]
  } else {
    buttons = [
      { key: 'dialogOk', label: opts.okLabel, value: kind === 'confirm' ? true : 'input' },
      { key: 'dialogCancel', label: opts.cancelLabel, value: kind === 'confirm' ? false : null },
    ]
  }

  const defaultIcon = { alert: 'info', confirm: 'question', prompt: 'none' }[kind]
  const dialog = {
    id: nextId++,
    kind,
    message: String(message ?? ''),
    title: opts.title || '',
    icon: opts.icon || defaultIcon,
    buttons,
    defaultButton: Math.min(Math.max(0, opts.defaultButton ?? 0), buttons.length - 1),
    // Value returned by Esc / the title-bar close button
    cancelValue: kind === 'alert' ? undefined : kind === 'confirm' ? false : null,
    input: kind === 'prompt'
      ? { password: !!opts.password, value: opts.default != null ? String(opts.default) : '', placeholder: opts.placeholder || '' }
      : null,
    resolve: null,
  }

  const promise = new Promise((resolve) => { dialog.resolve = resolve })
  queue.value.push(dialog)
  if (queue.value.length === 1) playSound(dialog)
  return promise
}

function playSound(dialog) {
  if (!soundHook) return
  try { soundHook(dialog.icon) } catch { /* sound is best-effort */ }
}

/**
 * Close the dialog on screen. `value` is the clicked button's value;
 * the sentinel 'input' resolves a prompt with its current text.
 */
function settle(id, value) {
  const dialog = queue.value[0]
  if (!dialog || dialog.id !== id) return
  queue.value.shift()
  dialog.resolve(value === 'input' ? dialog.input.value : value)
  if (queue.value[0]) playSound(queue.value[0])
}

/** @param {string} message @param {{ title?: string, icon?: DialogIcon, okLabel?: string }} [opts] */
function alertDialog(message, opts) { return open('alert', message, opts) }

/**
 * @param {string} message
 * @param {{ title?: string, icon?: DialogIcon, yesNo?: boolean, okLabel?: string, cancelLabel?: string, defaultButton?: number }} [opts]
 * @returns {Promise<boolean>}
 */
function confirmDialog(message, opts) { return open('confirm', message, opts) }

/**
 * @param {string} message
 * @param {{ title?: string, icon?: DialogIcon, password?: boolean, default?: string, placeholder?: string, okLabel?: string, cancelLabel?: string }} [opts]
 * @returns {Promise<string|null>}
 */
function promptDialog(message, opts) { return open('prompt', message, opts) }

export function useDialog() {
  return { alert: alertDialog, confirm: confirmDialog, prompt: promptDialog, t }
}

/** Internal: state for the <WinDialog /> host component. */
export function useDialogHost() {
  return { current, settle, dialogLang, t }
}
