import { describe, it, expect, vi } from 'vitest'

const ioSpy = vi.hoisted(() => vi.fn())
vi.mock('socket.io-client', () => ({ io: ioSpy }))

import { isNearBottom, useNickname } from '../src/composables/useChat.js'

// scrollHeight 1000, viewport 300: the bottom is scrollTop 700
const pane = (scrollTop) => ({ scrollHeight: 1000, clientHeight: 300, scrollTop })

describe('isNearBottom', () => {
  it('is true at the bottom and within the threshold', () => {
    expect(isNearBottom(pane(700))).toBe(true)
    expect(isNearBottom(pane(660))).toBe(true)
  })

  it('is false once the reader has scrolled further up', () => {
    expect(isNearBottom(pane(659))).toBe(false)
    expect(isNearBottom(pane(0))).toBe(false)
  })

  it('honours a custom threshold', () => {
    expect(isNearBottom(pane(600), 100)).toBe(true)
    expect(isNearBottom(pane(599), 100)).toBe(false)
  })

  it('treats a pane that does not scroll, or a missing element, as at the bottom', () => {
    expect(isNearBottom({ scrollHeight: 200, clientHeight: 300, scrollTop: 0 })).toBe(true)
    expect(isNearBottom(null)).toBe(true)
  })
})

describe('useNickname', () => {
  it('gives the nickname without opening a chat socket', async () => {
    const { nickname } = useNickname()
    expect(nickname.value).toMatch(/^Guest\d{4}$/)
    await new Promise(r => setTimeout(r, 0))
    expect(ioSpy).not.toHaveBeenCalled()
  })

  it('setNickname trims, caps at 30 characters and falls back to a guest name', () => {
    const { nickname, setNickname } = useNickname()
    setNickname('  Mama-san  ')
    expect(nickname.value).toBe('Mama-san')
    setNickname('x'.repeat(40))
    expect(nickname.value).toHaveLength(30)
    setNickname('   ')
    expect(nickname.value).toMatch(/^Guest\d{4}$/)
    expect(useNickname().nickname).toBe(nickname)
  })
})
