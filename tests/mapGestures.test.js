import { describe, it, expect } from 'vitest'
import {
  mapToScreen,
  screenToMap,
  screenToWrap,
  panToPoint,
  panToCenter,
  clampPan,
  normalizeAngle,
  touchSpan,
  pinchScale,
  snapRotation,
  flipsWhenTurned,
} from '../src/utils/mapGeometry.js'

const frame = { mapRotation: -21, mapCx: 1807.06, mapCy: 2048, vbMinX: -613.9, vbMinY: -511.5 }
const views = {
  plain: { ...frame, tx: -82, ty: 33, scale: 0.12, userRotation: 0, width: 390, height: 792, left: 0, top: 52, zoom: 1 },
  rotated: { ...frame, tx: -440, ty: -480, scale: 0.27, userRotation: 45, width: 390, height: 792, left: 0, top: 52, zoom: 1 },
  zoomed: { ...frame, tx: 129, ty: -290, scale: 0.22, userRotation: 0, width: 1024, height: 608, left: 0, top: 0, zoom: 1.25 },
  all: { ...frame, tx: 10, ty: -20, scale: 0.5, userRotation: -130, width: 800, height: 500, left: 40, top: 60, zoom: 1.25 },
}

describe('panToPoint', () => {
  it('puts the map point under the viewport point, whatever the rotation and CSS zoom', () => {
    const p = { x: 1511, y: 2726 }
    const finger = { x: 217, y: 396 }
    for (const view of Object.values(views)) {
      const pan = panToPoint(p, finger, view)
      const at = mapToScreen(p, { ...view, tx: pan.x, ty: pan.y })
      expect(at.x).toBeCloseTo(finger.x, 6)
      expect(at.y).toBeCloseTo(finger.y, 6)
    }
  })

  it('ignores the translation the view already has', () => {
    const p = { x: 900, y: 1200 }
    const a = panToPoint(p, { x: 50, y: 60 }, views.all)
    const b = panToPoint(p, { x: 50, y: 60 }, { ...views.all, tx: 999, ty: -999 })
    expect(b.x).toBeCloseTo(a.x, 9)
    expect(b.y).toBeCloseTo(a.y, 9)
  })

  it('agrees with panToCenter for the middle of the container', () => {
    for (const view of Object.values(views)) {
      const p = { x: 1679, y: 2495 }
      const middle = { x: view.left + view.width / 2 * view.zoom, y: view.top + view.height / 2 * view.zoom }
      const a = panToPoint(p, middle, view)
      const b = panToCenter(p, view)
      expect(a.x).toBeCloseTo(b.x, 6)
      expect(a.y).toBeCloseTo(b.y, 6)
    }
  })

  // A one-finger drag: the map point under the finger at the start stays under it
  it('moves the map with the finger when the map is rotated', () => {
    const view = views.rotated
    const start = { x: 200, y: 400 }
    const grabbed = screenToMap(start, view)
    const other = screenToMap({ x: 120, y: 300 }, view)
    const pan = panToPoint(grabbed, { x: start.x + 90, y: start.y + 40 }, view)
    const moved = mapToScreen(other, { ...view, tx: pan.x, ty: pan.y })
    expect(moved.x).toBeCloseTo(120 + 90, 6)
    expect(moved.y).toBeCloseTo(300 + 40, 6)
  })

  // Pinch + twist + pan in one step: new zoom and rotation, point between the
  // fingers kept between the fingers
  it('keeps the point between the fingers there while zooming and rotating', () => {
    for (const view of Object.values(views)) {
      const before = touchSpan({ x: 150, y: 380 }, { x: 250, y: 420 })
      const after = touchSpan({ x: 170, y: 300 }, { x: 330, y: 470 })
      const anchor = screenToMap(before, view)
      const next = {
        ...view,
        scale: pinchScale(view.scale, before.distance, after.distance, 0.01, 8),
        userRotation: view.userRotation + normalizeAngle(after.angle - before.angle),
      }
      const pan = panToPoint(anchor, after, next)
      const at = mapToScreen(anchor, { ...next, tx: pan.x, ty: pan.y })
      expect(at.x).toBeCloseTo(after.x, 6)
      expect(at.y).toBeCloseTo(after.y, 6)
      // and the map really is that much bigger and turned: a second point
      // sits where a similarity transform about the fingers puts it
      const second = screenToMap({ x: before.x + 40, y: before.y }, view)
      const s = mapToScreen(second, { ...next, tx: pan.x, ty: pan.y })
      const k = after.distance / before.distance
      const turn = (after.angle - before.angle) * Math.PI / 180
      expect(s.x).toBeCloseTo(after.x + 40 * k * Math.cos(turn), 6)
      expect(s.y).toBeCloseTo(after.y + 40 * k * Math.sin(turn), 6)
    }
  })

  it('a pan that is already inside the limits is left alone by clampPan', () => {
    const view = { ...views.plain, scale: 0.4 }
    const pan = panToPoint({ x: 1700, y: 2400 }, { x: 195, y: 448 }, view)
    const clamped = clampPan({ ...view, tx: pan.x, ty: pan.y }, 4842.3, 5119.1)
    expect(clamped.x).toBeCloseTo(pan.x, 9)
    expect(clamped.y).toBeCloseTo(pan.y, 9)
  })
})

describe('screenToWrap', () => {
  it('is the viewport point without the CSS zoom, the container origin and the user rotation', () => {
    expect(screenToWrap({ x: 100, y: 152 }, views.plain)).toEqual({ x: 100, y: 100 })
    const z = screenToWrap({ x: 125, y: 250 }, views.zoomed)
    expect(z.x).toBeCloseTo(100, 9)
    expect(z.y).toBeCloseTo(200, 9)
  })

  it('leaves the middle of the container where it is when rotated', () => {
    const v = views.all
    const p = screenToWrap({ x: v.left + v.width / 2 * v.zoom, y: v.top + v.height / 2 * v.zoom }, v)
    expect(p.x).toBeCloseTo(v.width / 2, 9)
    expect(p.y).toBeCloseTo(v.height / 2, 9)
  })

  // panzoom zooms about a point given in these coordinates: the map point
  // there must be the one under the pointer
  it('names the same map point as screenToMap', () => {
    for (const view of Object.values(views)) {
      const screen = { x: 180, y: 333 }
      const w = screenToWrap(screen, view)
      const viaWrap = screenToMap(
        { x: w.x, y: w.y },
        { ...view, userRotation: 0, left: 0, top: 0, zoom: 1 },
      )
      const direct = screenToMap(screen, view)
      expect(viaWrap.x).toBeCloseTo(direct.x, 6)
      expect(viaWrap.y).toBeCloseTo(direct.y, 6)
    }
  })
})

describe('touchSpan', () => {
  it('gives the midpoint, the distance and the direction of two fingers', () => {
    expect(touchSpan({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({ x: 15, y: 20, distance: 50, angle: Math.atan2(40, 30) * 180 / Math.PI })
    expect(touchSpan({ x: 10, y: 10 }, { x: 10, y: 110 }).angle).toBeCloseTo(90, 9)
    expect(touchSpan({ x: 10, y: 10 }, { x: -90, y: 10 }).angle).toBeCloseTo(180, 9)
  })

  it('is finite for two fingers on the same spot', () => {
    expect(touchSpan({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5, distance: 0, angle: 0 })
  })
})

describe('normalizeAngle', () => {
  it('brings any angle into (-180, 180]', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(180)).toBe(180)
    expect(normalizeAngle(-180)).toBe(180)
    expect(normalizeAngle(190)).toBe(-170)
    expect(normalizeAngle(-190)).toBe(170)
    expect(normalizeAngle(725)).toBe(5)
    expect(normalizeAngle(-725)).toBe(-5)
  })

  // the direction between two fingers jumps from 179 to -179 when it crosses
  // "pointing left": the twist is 2 degrees, not 358
  it('makes the step across the +-180 seam a small one', () => {
    expect(normalizeAngle(-179 - 179)).toBe(2)
    expect(normalizeAngle(179 - -179)).toBe(-2)
  })
})

describe('pinchScale', () => {
  it('scales by how much the fingers have spread', () => {
    expect(pinchScale(0.2, 100, 150, 0.05, 8)).toBeCloseTo(0.3, 12)
    expect(pinchScale(0.2, 100, 50, 0.05, 8)).toBeCloseTo(0.1, 12)
  })

  it('stays within the zoom limits', () => {
    expect(pinchScale(0.2, 100, 10, 0.08, 8)).toBe(0.08)
    expect(pinchScale(4, 10, 400, 0.08, 8)).toBe(8)
  })

  // what made panzoom throw "zoom requires valid numbers"
  it('never returns NaN or Infinity: no start distance, or fingers on one spot', () => {
    expect(pinchScale(0.2, 0, 150, 0.05, 8)).toBe(0.2)
    expect(pinchScale(0.2, undefined, 150, 0.05, 8)).toBe(0.2)
    expect(pinchScale(0.2, 100, 0, 0.05, 8)).toBe(0.2)
    expect(pinchScale(0.2, NaN, NaN, 0.05, 8)).toBe(0.2)
  })
})

describe('snapRotation', () => {
  it('goes back to straight within the tolerance, either way round', () => {
    expect(snapRotation(4, 6)).toBe(0)
    expect(snapRotation(-6, 6)).toBe(0)
    expect(snapRotation(357, 6)).toBe(0)
  })

  it('keeps (and normalises) any other angle', () => {
    expect(snapRotation(45, 6)).toBe(45)
    expect(snapRotation(-7, 6)).toBe(-7)
    expect(snapRotation(270, 6)).toBe(-90)
    expect(snapRotation(180, 6)).toBe(180)
  })
})

describe('flipsWhenTurned', () => {
  it('never flips while the map is straight', () => {
    for (const angle of [0, 90, -90, 135, 180, 270]) expect(flipsWhenTurned(angle, 0)).toBe(false)
  })

  it('flips text that the turn would leave upside down', () => {
    // left-to-right text
    expect(flipsWhenTurned(0, 45)).toBe(false)
    expect(flipsWhenTurned(0, 100)).toBe(false)
    expect(flipsWhenTurned(0, 110)).toBe(true)
    expect(flipsWhenTurned(0, 180)).toBe(true)
    expect(flipsWhenTurned(0, -110)).toBe(true)
    expect(flipsWhenTurned(0, -90)).toBe(false)
    // top-to-bottom text: a small turn one way is enough, the other way is not
    expect(flipsWhenTurned(90, 10)).toBe(false)
    expect(flipsWhenTurned(90, 20)).toBe(true)
    expect(flipsWhenTurned(90, -100)).toBe(false)
    expect(flipsWhenTurned(90, -170)).toBe(false)
    expect(flipsWhenTurned(90, 150)).toBe(true)
    expect(flipsWhenTurned(90, 170)).toBe(false) // 260 = -100: bottom to top again
  })

  it('leaves text that is upside down by design alone', () => {
    expect(flipsWhenTurned(180, 30)).toBe(false)
    expect(flipsWhenTurned(180, 180)).toBe(false)
    expect(flipsWhenTurned(150, -100)).toBe(false)
  })

  it('a flipped label reads within the limit again', () => {
    for (let angle = -100; angle <= 100; angle += 10) {
      for (let turn = -180; turn <= 180; turn += 10) {
        const shown = angle + turn + (flipsWhenTurned(angle, turn) ? 180 : 0)
        expect(Math.abs(normalizeAngle(shown))).toBeLessThanOrEqual(100)
      }
    }
  })
})
