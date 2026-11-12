// Gai-chan asleep, for the screensaver (F07). Takes a loaded GaiChanStage,
// lays her on a futon and drives her from a "sleeper" state object (see
// src/utils/screensaver.js): a snot bubble that swells and shrinks with her
// breathing, drifting Zs, and the jolt upright / look around / nod off again
// when the bouncing logo bonks her.
//
// Imported only through GaiChanStage.js, so it ships in the same lazy chunk
// as three.js.
import {
  Group, Mesh, PlaneGeometry, BoxGeometry, MeshBasicMaterial, DataTexture,
  RGBAFormat, NearestFilter, SRGBColorSpace, Vector3, MathUtils,
} from 'three'
import { sitUp, bubbleSize, breath, phaseProgress } from '../utils/screensaver.js'

// Scene units are roughly metres; +y is up, +z is screen left, +x is towards the viewer.
// She lies on her side facing the viewer, head to screen left.
const BODY_Y = 0.15          // height of her centre line above the floor when lying
const BODY_Z = -0.4          // where her feet end up (her head lands near z = +0.3)
const NOSE = new Vector3(0.098, 0.592, 0)     // on the standing model, world space
const HEAD_TOP = new Vector3(0, 0.76, 0)
const BUBBLE_RADIUS = 0.072
const CAMERA_DIST = 4
const HEAD_PROP = -0.95        // radians her head is propped up off the pillow when lying
const CAMERA_TILT = MathUtils.degToRad(9)     // looking slightly down at the futon

// What the logo bounces off: her head on the pillow, in world space on the
// x = 0 plane. Only her head, so the logo drifts past behind the futon and
// she gets some sleep between bonks (about one every 20 s on a monitor).
const COLLIDER = { zMin: 0.07, zMax: 0.38, yMin: 0.07, yMax: 0.35 }

const X_AXIS = new Vector3(1, 0, 0)
const Y_AXIS = new Vector3(0, 1, 0)
const Z_AXIS = new Vector3(0, 0, 1)
const _v = new Vector3()

function rgba(hex, a = 255) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}

function pixelTexture(w, h, paint) {
  const data = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = paint(x, y)
      if (c) data.set(c, ((h - 1 - y) * w + x) * 4)   // row 0 = top
    }
  }
  const tex = new DataTexture(data, w, h, RGBAFormat)
  tex.magFilter = tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// The bubble, drawn pixel by pixel so it stays crisp when upscaled: a pale
// blue ball with a darker rim and a white glint.
function bubbleTexture(size = 32) {
  const c = (size - 1) / 2
  const rim = rgba('#4f9fd8'), fill = rgba('#bfe9ff'), shade = rgba('#93d2f7'), glint = rgba('#ffffff')
  return pixelTexture(size, size, (x, y) => {
    const r = Math.hypot(x - c, y - c) / (size / 2)
    if (r > 1) return null
    if (r > 0.86) return rim
    if (Math.hypot(x - c + size * 0.2, y - c + size * 0.22) < size * 0.11) return glint
    if (Math.hypot(x - c - size * 0.1, y - c - size * 0.12) > size * 0.36) return shade
    return fill
  })
}

function glyphTexture(rows, colour) {
  const c = rgba(colour)
  return pixelTexture(rows[0].length, rows.length, (x, y) => (rows[y][x] === '#' ? c : null))
}

const GLYPH_Z = ['#####', '...#.', '..#..', '.#...', '#####']
const GLYPH_BANG = ['##', '##', '##', '##', '..', '##', '##']

// A flat picture that faces the viewer and draws over everything else
function billboard(texture, opacity = 1) {
  const mesh = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: texture, transparent: true, opacity, depthTest: false, depthWrite: false }),
  )
  mesh.rotation.y = Math.PI / 2
  mesh.renderOrder = 10
  return mesh
}

export class SleepScene {
  constructor() {
    this.group = new Group()
    this.group.name = 'SleepScene'
    this._textures = []
    const tex = t => { this._textures.push(t); return t }

    // Futon, pillow and a quilt over her legs
    const flat = c => new MeshBasicMaterial({ color: c })
    const futon = new Mesh(new BoxGeometry(0.5, 0.05, 1.08), flat(0xe9dfc9))
    futon.position.set(-0.02, 0.025, -0.03)
    const futonEdge = new Mesh(new BoxGeometry(0.52, 0.02, 1.1), flat(0x8c3b2a))
    futonEdge.position.set(-0.02, 0.01, -0.03)
    const pillow = new Mesh(new BoxGeometry(0.3, 0.07, 0.3), flat(0xfffaf0))
    pillow.position.set(-0.04, 0.075, 0.24)
    // The quilt covers her legs up to the hips, so they stay put when she sits up
    this.quilt = new Mesh(new BoxGeometry(0.42, 0.2, 0.45), new MeshBasicMaterial({ map: tex(this._quiltTexture()) }))
    this.quilt.position.set(-0.01, 0.15, -0.235)
    this.group.add(futonEdge, futon, pillow, this.quilt)

    this.bubble = billboard(tex(bubbleTexture()), 0.88)
    this.bubble.visible = false
    this.group.add(this.bubble)

    // Three Zs that drift up from her head, one after another
    const zTex = tex(glyphTexture(GLYPH_Z, '#ffe4a0'))
    this.zs = [0, 1, 2].map(() => {
      const z = billboard(zTex)
      z.visible = false
      this.group.add(z)
      return z
    })

    this.bang = billboard(tex(glyphTexture(GLYPH_BANG, '#ffcc44')))
    this.bang.visible = false
    this.group.add(this.bang)

    this.sleeper = null
    this._stage = null
    this._phase = null
    this._tick = (dt, t) => this._update(dt, t)
  }

  // Indigo with a paler check, like a cheap ryokan quilt
  _quiltTexture() {
    const a = rgba('#2b3a7a'), b = rgba('#3d52a0'), line = rgba('#8fa3e0')
    return pixelTexture(16, 16, (x, y) => (x % 8 === 0 || y % 8 === 0 ? line : ((x >> 3) + (y >> 3)) % 2 ? a : b))
  }

  /**
   * Lay a loaded GaiChanStage's Gai-chan down and take over her animation.
   * `sleeper` is the state from createSleeper(); the caller steps it.
   */
  attach(stage, sleeper) {
    this._stage = stage
    this.sleeper = sleeper
    stage.opts.procedural = false          // no pointer-following or idle sway
    stage.lookAway()

    // Where her nose and the top of her head are, in the head bone's own space,
    // measured while she is still standing
    stage.root.updateMatrixWorld(true)
    const head = stage.bones.Head
    this._noseLocal = head.worldToLocal(NOSE.clone())
    this._headTopLocal = head.worldToLocal(HEAD_TOP.clone())

    // On her side, facing the viewer: her "up" now points to screen left
    stage.root.rotation.x = Math.PI / 2
    stage.root.position.set(0, BODY_Y, BODY_Z)

    stage.scene.add(this.group)
    stage.addTicker(this._tick)
    this.frame(stage.camera.aspect)
    return this
  }

  /** Point the camera so the futon sits in the lower part of the picture. */
  frame(aspect) {
    const cam = this._stage?.camera
    if (!cam || !aspect) return
    // Wide screens: she takes a bit over a third of the width. Tall ones: most of it.
    const visibleWidth = aspect >= 1 ? 2 : 1.2
    const visibleHeight = visibleWidth / aspect
    cam.fov = MathUtils.radToDeg(2 * Math.atan(visibleHeight / 2 / CAMERA_DIST))
    cam.aspect = aspect
    const targetY = 0.12 + visibleHeight * 0.26
    cam.position.set(Math.cos(CAMERA_TILT) * CAMERA_DIST, targetY + Math.sin(CAMERA_TILT) * CAMERA_DIST, 0)
    cam.lookAt(0, targetY, 0)
    cam.updateProjectionMatrix()
    cam.updateMatrixWorld(true)
  }

  /**
   * Her sleeping head as a rectangle in CSS pixels of a `width` x `height`
   * canvas: what the logo bounces off.
   */
  colliderRect(width, height) {
    const cam = this._stage?.camera
    if (!cam) return null
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const z of [COLLIDER.zMin, COLLIDER.zMax]) {
      for (const y of [COLLIDER.yMin, COLLIDER.yMax]) {
        _v.set(0, y, z).project(cam)
        const px = (_v.x + 1) / 2 * width, py = (1 - _v.y) / 2 * height
        x0 = Math.min(x0, px); x1 = Math.max(x1, px)
        y0 = Math.min(y0, py); y1 = Math.max(y1, py)
      }
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }

  _update(dt, t) {
    const stage = this._stage, s = this.sleeper
    if (!stage || !s) return
    const { Spine: spine, Head: head } = stage.bones
    const phase = s.phase
    const p = phaseProgress(s)
    const up = sitUp(s)
    const out = phase === 'asleep' ? breath(s.asleepFor) : 0

    if (phase !== this._phase) {
      this._phase = phase
      stage.setPose(phase === 'startled' ? 'surprised' : 'idle')
    }

    // ── face
    let eyes = 'eyes-closed', mouth = 'mouth-closed'
    if (phase === 'asleep') mouth = out > 0.55 ? 'mouth-half' : 'mouth-closed'
    else if (phase === 'startled') { eyes = 'eyes-surprised'; mouth = 'mouth-o' }
    else if (phase === 'look-left') { eyes = 'eyes-look-left'; mouth = 'mouth-half' }
    else if (phase === 'look-right') { eyes = 'eyes-look-right'; mouth = 'mouth-half' }
    else if (phase === 'drowsy') {
      // a yawn, heavy eyelids, gone
      eyes = p < 0.3 ? 'eyes-closed' : p < 0.6 ? 'eyes-narrow' : 'eyes-closed'
      mouth = p < 0.3 ? 'mouth-open' : 'mouth-closed'
    }
    stage._setFace(eyes, mouth)

    // ── body: the torso swings up from the hips, so she sits with her legs
    // still under the quilt. The stage has just reset the spine and head to
    // their clip pose, so these rotations don't pile up.
    if (spine) {
      stage._addWorldRotation(spine, X_AXIS, -up * Math.PI / 2 + out * 0.035)
    }
    if (head) {
      let yaw = 0, nod = 0
      if (phase === 'look-left') yaw = Math.sin(Math.min(1, p * 3) * Math.PI / 2) * 0.6
      else if (phase === 'look-right') yaw = 0.6 - Math.sin(Math.min(1, p * 2.4) * Math.PI / 2) * 1.2
      else if (phase === 'drowsy') { yaw = 0.6 * Math.max(0, 1 - p * 4); nod = Math.sin(p * Math.PI * 3) * 0.08 * (1 - p) }
      // Lying: head propped up on the pillow, so her face reads. Sitting: level.
      stage._addWorldRotation(head, X_AXIS, (1 - Math.min(1, up)) * HEAD_PROP + nod)
      if (yaw) stage._addWorldRotation(head, Y_AXIS, yaw)
      if (phase === 'drowsy' && p < 0.3) stage._addWorldRotation(head, Z_AXIS, 0.12 * Math.sin(p / 0.3 * Math.PI))
    }
    // the jolt lifts her off the futon for a moment
    const hop = phase === 'startled' && p < 0.3 ? Math.sin(p / 0.3 * Math.PI) * 0.05 : 0
    stage.root.position.y = BODY_Y + hop + out * 0.004
    stage.root.updateMatrixWorld(true)

    // ── snot bubble: hangs off her nose, swelling up and away from her face
    const size = bubbleSize(s)
    this.bubble.visible = size > 0.01
    if (this.bubble.visible) {
      const r = BUBBLE_RADIUS * size
      head.localToWorld(_v.copy(this._noseLocal))
      this.bubble.position.set(_v.x + 0.05, _v.y + r * 0.8, _v.z - r * 0.8)
      this.bubble.scale.setScalar(r * 2)
    }

    // ── Zs: each takes 3 s to drift up and fade, a second apart
    head.localToWorld(_v.copy(this._headTopLocal))
    const settled = phase === 'asleep' && s.asleepFor > 1.5
    this.zs.forEach((z, i) => {
      const life = ((s.asleepFor - 1.5 + (3 - i)) % 3) / 3
      z.visible = settled && s.asleepFor - 1.5 > i
      if (!z.visible) return
      z.position.set(_v.x + 0.05, _v.y + 0.12 + life * 0.3, _v.z + 0.06 + life * 0.16 + Math.sin(life * 6) * 0.015)
      z.scale.setScalar(0.035 + life * 0.05)
      z.material.opacity = life < 0.75 ? 1 : (1 - life) * 4
    })

    // ── "!" over her head as she jolts awake
    this.bang.visible = phase === 'startled' && p < 0.75
    if (this.bang.visible) {
      this.bang.position.set(_v.x + 0.05, _v.y + 0.08 + Math.min(1, p * 6) * 0.03, _v.z - 0.02)
      this.bang.scale.set(0.034, 0.12, 1)
    }
  }

  dispose() {
    this._stage?.removeTicker(this._tick)
    this._stage = null
    this.group.removeFromParent()
    this.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose() } })
    this._textures.forEach(t => t.dispose())
  }
}
