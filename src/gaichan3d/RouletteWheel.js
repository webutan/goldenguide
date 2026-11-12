// The wheel Gai-chan spins in Roulette.exe (F02): a prize wheel on a stand,
// built in code and added to a GaiChanStage's scene beside her. It faces the
// camera and stands at her right hand (screen left), where her "spin" clip
// (scripts/gaichan/add_spin_clip.py) takes the rim and pulls it down.
//
// Imported only through GaiChanStage.js, so it ships in the same lazy chunk
// as three.js.
import {
  Group, Mesh, CircleGeometry, BoxGeometry, MeshBasicMaterial, DataTexture,
  RGBAFormat, NearestFilter, SRGBColorSpace,
} from 'three'

// Scene units are roughly metres; +y is up, +z is screen left, +x is towards the viewer.
// The spin clip's hand path is solved for this centre and radius: change them
// together with WHEEL_Y / WHEEL_Z / WHEEL_R in add_spin_clip.py and re-run it.
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

// Her pulls: how fast the spin clip plays, and how many strokes she gives the
// wheel before she lets it run. 1.4 loops ends just after a pull, hand coming
// down off the rim, so the fade back to idle carries on the same movement.
const PULL_SPEED = 1.4
const PULL_LOOPS = 1.4

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
   * The pose Gai-chan pulls the wheel with: her "spin" clip, or "wave" when
   * the model in use has none (an older cached gaichan.glb).
   */
  get pullPose() { return this._stage?.actions?.spin ? 'spin' : 'wave' }

  /** How long she keeps pulling before she lets the wheel run, in seconds. */
  get pullSeconds() {
    const clip = this._stage?.actions?.[this.pullPose]?.getClip()
    return clip ? (clip.duration * PULL_LOOPS) / PULL_SPEED : 0.8
  }

  /**
   * Spin for `seconds`, starting fast and slowing to a stop. The turn is
   * clockwise on screen: the side of the rim she pulls on goes down.
   */
  spin(seconds, onStop) {
    const turns = 4 + Math.random() * 2
    this._spin = { from: this._angle, turns, duration: Math.max(0.1, seconds), elapsed: 0, onStop }
    this._setPullSpeed(PULL_SPEED)
  }

  /** Stop where it is (no callback). */
  halt() {
    this._spin = null
    this._setPullSpeed(1)
  }

  _setPullSpeed(scale) {
    const actions = this._stage?.actions
    actions?.spin?.setEffectiveTimeScale(scale)
    actions?.wave?.setEffectiveTimeScale(scale)
  }

  _update(dt) {
    const s = this._spin
    if (!s) return
    s.elapsed += dt
    const p = Math.min(1, s.elapsed / s.duration)
    this._angle = s.from - easeOutCubic(p) * s.turns * Math.PI * 2
    this.disc.rotation.z = this._angle
    if (p >= 1) {
      this._spin = null
      this._setPullSpeed(1)
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
