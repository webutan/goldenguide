// The wheel Gai-chan spins in Roulette.exe (F02): a prize wheel on a stand,
// built in code and added to a GaiChanStage's scene beside her. It faces the
// camera and stands at her right hand (screen left), so her "wave" pose reads
// as flicking the rim.
//
// Imported only through GaiChanStage.js, so it ships in the same lazy chunk
// as three.js.
import {
  Group, Mesh, CircleGeometry, BoxGeometry, MeshBasicMaterial, DataTexture,
  RGBAFormat, NearestFilter, SRGBColorSpace,
} from 'three'

// Scene units are roughly metres; +y is up, +z is screen left, +x is towards the viewer
const RADIUS = 0.165
const CENTRE = { x: -0.02, y: 0.5, z: 0.31 }
const SEGMENTS = 12
// Wedge colours: the site's lantern oranges against dark, with one lucky wedge
const WEDGES = ['#c45c1a', '#2a2535', '#e8a040', '#1a1625', '#c45c1a', '#2a2535', '#e8a040', '#1a1625', '#c45c1a', '#2a2535', '#fff2c0', '#1a1625']
const RIM = '#5a3418'
const RIM_LIGHT = '#ffcc44'
const HUB = '#ffe4a0'
const WOOD = 0x3a2416
const POINTER = 0xfff2c0

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// The wheel face, drawn pixel by pixel (no anti-aliasing) so it stays crisp
// when the low-resolution stage is upscaled.
function wheelTexture(size = 64) {
  const data = new Uint8Array(size * size * 4)
  const c = (size - 1) / 2
  const wedges = WEDGES.map(rgb)
  const rim = rgb(RIM), rimLight = rgb(RIM_LIGHT), hub = rgb(HUB)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c
      const r = Math.hypot(dx, dy) / (size / 2)
      const turn = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1
      let colour = null
      if (r <= 1) {
        if (r > 0.88) {
          // rim, with a light bulb on every wedge boundary
          const inWedge = (turn * SEGMENTS) % 1
          colour = (inWedge < 0.14 || inWedge > 0.86) ? rimLight : rim
        } else if (r < 0.14) colour = hub
        else colour = wedges[Math.floor(turn * SEGMENTS) % SEGMENTS]
      }
      const i = (y * size + x) * 4
      if (colour) { data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2]; data[i + 3] = 255 }
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat)
  tex.magFilter = tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

const easeOutCubic = p => 1 - (1 - p) ** 3

export class RouletteWheel {
  constructor() {
    this.group = new Group()
    this.group.name = 'RouletteWheel'
    this._texture = wheelTexture()

    // Everything is modelled facing +z and the group is turned to face the camera (+x)
    this.disc = new Mesh(
      new CircleGeometry(RADIUS, 32),
      new MeshBasicMaterial({ map: this._texture, transparent: true, alphaTest: 0.5 }),
    )
    const wood = new MeshBasicMaterial({ color: WOOD })
    const post = new Mesh(new BoxGeometry(0.035, CENTRE.y, 0.02), wood)
    post.position.set(0, -CENTRE.y / 2, -0.03)
    const foot = new Mesh(new BoxGeometry(0.2, 0.025, 0.08), wood)
    foot.position.set(0, -CENTRE.y + 0.0125, -0.03)
    // The pointer: a fixed triangle at the top, tip down onto the rim
    const pointer = new Mesh(new CircleGeometry(0.034, 3), new MeshBasicMaterial({ color: POINTER }))
    pointer.rotation.z = -Math.PI / 2
    pointer.position.set(0, RADIUS + 0.008, 0.01)

    this.group.add(post, foot, this.disc, pointer)
    this.group.position.set(CENTRE.x, CENTRE.y, CENTRE.z)
    this.group.rotation.y = Math.PI / 2

    this._angle = 0
    this._spin = null   // { from, turns, duration, elapsed, onStop }
    this._stage = null
    this._tick = (dt) => this._update(dt)
  }

  /** Put the wheel in a loaded GaiChanStage's scene and animate it with the stage. */
  attach(stage) {
    this._stage = stage
    stage.scene.add(this.group)
    stage.addTicker(this._tick)
    return this
  }

  get spinning() { return !!this._spin }

  /**
   * Spin for `seconds`, starting fast and slowing to a stop. While it turns,
   * Gai-chan's waving hand slows down with it.
   */
  spin(seconds, onStop) {
    const turns = 4 + Math.random() * 2
    this._spin = { from: this._angle, turns, duration: Math.max(0.1, seconds), elapsed: 0, onStop }
  }

  /** Stop where it is (no callback). */
  halt() {
    this._spin = null
    this._setWaveSpeed(1)
  }

  _setWaveSpeed(scale) {
    this._stage?.actions?.wave?.setEffectiveTimeScale(scale)
  }

  _update(dt) {
    const s = this._spin
    if (!s) return
    s.elapsed += dt
    const p = Math.min(1, s.elapsed / s.duration)
    this._angle = s.from - easeOutCubic(p) * s.turns * Math.PI * 2
    this.disc.rotation.z = this._angle
    // 1.6x at the first flick, down to a lazy 0.5x as the wheel runs out
    this._setWaveSpeed(0.5 + 1.1 * (1 - p) ** 2)
    if (p >= 1) {
      this._spin = null
      this._setWaveSpeed(1)
      s.onStop?.()
    }
  }

  dispose() {
    this.halt()
    this._stage?.removeTicker(this._tick)
    this._stage = null
    this.group.removeFromParent()
    this.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose() } })
    this._texture.dispose()
  }
}
