import { describe, it, expect } from 'vitest'
import { clampWindowPosition, MIN_VISIBLE_TITLE } from '../src/composables/useDraggable.js'

// A 200px-wide window with a 23px title bar (3px frame + 20px bar) and 41px of
// minimise/close buttons, on a 1024x608 desktop area (taskbar excluded).
const base = {
  width: 200,
  titleBarHeight: 23,
  grabInsetRight: 41,
  containerWidth: 1024,
  containerHeight: 608,
}
const clamp = (x, y, extra = {}) => clampWindowPosition({ x, y, ...base, ...extra })

describe('clampWindowPosition', () => {
  it('leaves a window that is fully inside where it is', () => {
    expect(clamp(120, 60)).toEqual({ x: 120, y: 60 })
    expect(clamp(0, 0)).toEqual({ x: 0, y: 0 })
  })

  it('keeps 40px of title bar visible at the right edge', () => {
    expect(MIN_VISIBLE_TITLE).toBe(40)
    expect(clamp(5000, 60)).toEqual({ x: 1024 - 40, y: 60 })
    expect(clamp(984, 60).x).toBe(984)
    expect(clamp(985, 60).x).toBe(984)
  })

  it('keeps 40px of draggable title bar (not just the buttons) visible at the left edge', () => {
    // right edge of the window ends up at 40 + 41 = 81px
    expect(clamp(-5000, 60)).toEqual({ x: -(200 - 81), y: 60 })
    expect(clamp(-5000, 60, { grabInsetRight: 0 }).x).toBe(-160)
  })

  it('never lets the title bar go above the top', () => {
    expect(clamp(120, -300)).toEqual({ x: 120, y: 0 })
  })

  it('never lets the title bar go under the taskbar (container bottom)', () => {
    expect(clamp(120, 5000)).toEqual({ x: 120, y: 608 - 23 })
    expect(clamp(120, 585).y).toBe(585)
    expect(clamp(120, 586).y).toBe(585)
  })

  it('allows the body of a tall window to hang below the desktop area', () => {
    // e.g. the 560px-high Feed window at y=60 on a 582px desktop
    expect(clamp(120, 60, { containerHeight: 582 })).toEqual({ x: 120, y: 60 })
  })

  it('pulls a window back when the container shrinks', () => {
    const before = clamp(900, 500)
    expect(before).toEqual({ x: 900, y: 500 })
    const after = clampWindowPosition({ ...before, ...base, containerWidth: 640, containerHeight: 300 })
    expect(after).toEqual({ x: 600, y: 277 })
  })

  it('does not push a narrow window off the left edge', () => {
    expect(clamp(-50, 10, { width: 60 })).toEqual({ x: 0, y: 10 })
  })

  it('copes with a container smaller than the minimum visible strip', () => {
    expect(clamp(300, 300, { containerWidth: 20, containerHeight: 10 })).toEqual({ x: -20, y: 0 })
    expect(clamp(300, 300, { width: 60, containerWidth: 20, containerHeight: 10 })).toEqual({ x: 0, y: 0 })
  })

  it('honours a custom minVisible', () => {
    expect(clamp(5000, 0, { minVisible: 100 }).x).toBe(924)
  })

  it('falls back to 0 for non-finite input', () => {
    expect(clamp(NaN, undefined)).toEqual({ x: 0, y: 0 })
  })
})
