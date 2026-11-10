import { describe, it, expect, vi, afterEach } from 'vitest'
import { useDialog, useDialogHost, setDialogSound } from '../src/composables/useDialog.js'

const dialog = useDialog()
const host = useDialogHost()

function clickButton(index) {
  const d = host.current.value
  host.settle(d.id, d.buttons[index].value)
}
function pressEscape() {
  const d = host.current.value
  host.settle(d.id, d.cancelValue)
}

afterEach(() => {
  while (host.current.value) pressEscape()
  setDialogSound(null)
  host.dialogLang.value = 'en'
})

describe('useDialog', () => {
  it('alert shows one OK button with an info icon and resolves when closed', async () => {
    const p = dialog.alert('Hello')
    const d = host.current.value
    expect(d.kind).toBe('alert')
    expect(d.message).toBe('Hello')
    expect(d.icon).toBe('info')
    expect(d.buttons.map(b => b.key)).toEqual(['dialogOk'])
    clickButton(0)
    await expect(p).resolves.toBeUndefined()
    expect(host.current.value).toBeNull()
  })

  it('confirm resolves true for OK, false for Cancel and Esc', async () => {
    const a = dialog.confirm('Sure?')
    expect(host.current.value.buttons.map(b => b.key)).toEqual(['dialogOk', 'dialogCancel'])
    clickButton(0)
    await expect(a).resolves.toBe(true)

    const b = dialog.confirm('Sure?')
    clickButton(1)
    await expect(b).resolves.toBe(false)

    const c = dialog.confirm('Sure?')
    pressEscape()
    await expect(c).resolves.toBe(false)
  })

  it('confirm with yesNo uses Yes/No buttons', async () => {
    const p = dialog.confirm('Delete?', { yesNo: true, icon: 'warning' })
    const d = host.current.value
    expect(d.icon).toBe('warning')
    expect(d.buttons.map(b => b.key)).toEqual(['dialogYes', 'dialogNo'])
    clickButton(0)
    await expect(p).resolves.toBe(true)
  })

  it('prompt resolves the typed text, or null when cancelled', async () => {
    const a = dialog.prompt('Password:', { password: true, default: 'abc' })
    const d = host.current.value
    expect(d.input).toMatchObject({ password: true, value: 'abc' })
    d.input.value = 'secret'
    clickButton(0)
    await expect(a).resolves.toBe('secret')

    const b = dialog.prompt('Name:')
    host.current.value.input.value = 'typed'
    pressEscape()
    await expect(b).resolves.toBeNull()
  })

  it('queues dialogs and shows them one at a time, in order', async () => {
    const first = dialog.alert('one')
    const second = dialog.confirm('two')
    expect(host.current.value.message).toBe('one')
    clickButton(0)
    await first
    expect(host.current.value.message).toBe('two')
    clickButton(0)
    await expect(second).resolves.toBe(true)
  })

  it('ignores settle calls for a dialog that is not on screen', async () => {
    dialog.alert('one')
    const id = host.current.value.id
    host.settle(id + 999, true)
    expect(host.current.value.id).toBe(id)
  })

  it('calls the sound hook with the icon kind when a dialog appears', () => {
    const ding = vi.fn()
    setDialogSound(ding)
    dialog.alert('a', { icon: 'error' })
    dialog.alert('b', { icon: 'warning' })
    expect(ding).toHaveBeenCalledTimes(1)
    expect(ding).toHaveBeenLastCalledWith('error')
    pressEscape()
    expect(ding).toHaveBeenLastCalledWith('warning')
  })

  it('translates through the host language', () => {
    expect(dialog.t('dialogCancel')).toBe('Cancel')
    host.dialogLang.value = 'jp'
    expect(dialog.t('dialogCancel')).toBe('キャンセル')
  })
})
