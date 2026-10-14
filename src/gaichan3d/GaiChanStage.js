// Real-time 3D Gai-chan for the VN dialogue screen.
//
// Loads public/gaichan/model/gaichan.glb (built by scripts/blender/export_gaichan.py)
// and drives it with three layers:
//   1. pose clips authored in Blender (idle, think, wave …) cross-faded by an AnimationMixer
//   2. face texture swaps on the head's eye/mouth slots (expressions, blinking, lip-flap)
//   3. procedural motion on top (breathing, sway, head/eyes following the pointer, poke reactions)
//
// Rendered at a low internal resolution and upscaled with `image-rendering: pixelated`
// so it matches the pixel-art sprites/CRT look of the rest of the site.
import {
  WebGLRenderer, Scene, PerspectiveCamera, AnimationMixer, LoopRepeat, LoopOnce,
  TextureLoader, NearestFilter, SRGBColorSpace, ClampToEdgeWrapping,
  HemisphereLight, DirectionalLight, MeshToonMaterial, DataTexture, RedFormat,
  Quaternion, Vector3, Raycaster, Vector2, MathUtils,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const BASE = '/gaichan/model/'

const FACE_TEXTURES = [
  'eyes-neutral', 'eyes-raised', 'eyes-narrow', 'eyes-angry', 'eyes-embarrassed',
  'eyes-surprised', 'eyes-closed', 'eyes-happy', 'eyes-look-left', 'eyes-look-right',
  'mouth-neutral', 'mouth-closed', 'mouth-open', 'mouth-half', 'mouth-o', 'mouth-toothy', 'mouth-eww',
]

// mood → resting eyes/mouth, mouth shapes cycled while talking, default pose
export const MOODS = {
  neutral:     { eyes: 'eyes-neutral',     mouth: 'mouth-neutral', talk: ['mouth-half', 'mouth-open', 'mouth-closed'], pose: 'idle' },
  happy:       { eyes: 'eyes-raised',      mouth: 'mouth-open',    talk: ['mouth-open', 'mouth-half', 'mouth-closed'], pose: 'idle' },
  wave:        { eyes: 'eyes-raised',      mouth: 'mouth-open',    talk: ['mouth-open', 'mouth-half', 'mouth-closed'], pose: 'wave' },
  thinking:    { eyes: 'eyes-look-left',   mouth: 'mouth-closed',  talk: ['mouth-half', 'mouth-closed', 'mouth-o'],    pose: 'think' },
  surprised:   { eyes: 'eyes-surprised',   mouth: 'mouth-o',       talk: ['mouth-o', 'mouth-half', 'mouth-open'],      pose: 'surprised' },
  embarrassed: { eyes: 'eyes-embarrassed', mouth: 'mouth-eww',     talk: ['mouth-eww', 'mouth-half', 'mouth-closed'],  pose: 'shy', sweat: true },
  stern:       { eyes: 'eyes-narrow',      mouth: 'mouth-closed',  talk: ['mouth-toothy', 'mouth-half', 'mouth-closed'], pose: 'point' },
  angry:       { eyes: 'eyes-angry',       mouth: 'mouth-toothy',  talk: ['mouth-toothy', 'mouth-eww', 'mouth-half'],  pose: 'hips' },
  smug:        { eyes: 'eyes-narrow',      mouth: 'mouth-neutral', talk: ['mouth-half', 'mouth-open', 'mouth-neutral'], pose: 'hips' },
}

// Props from the .blend, held in her right hand (screen left). They follow the hand tip
// but keep a fixed orientation in view space so they read clearly:
//   pos = offset from the hand tip (x → towards viewer, y ↑, z → screen left)
//   rot = Euler XYZ in degrees, same space;  scale = uniform
export const PROPS = {
  camera:     { node: 'Cube001',     pos: [0.02, 0.01, -0.01],  rot: [0, 0, 0],    scale: 1.0 },
  can:        { node: 'Beer_Can',    pos: [0.02, -0.02, 0],     rot: [0, 0, 0],    scale: 1.1 },
  bottle:     { node: 'Beer_Bottle', pos: [0.02, -0.06, 0],     rot: [0, 0, 0],    scale: 0.9 },
  cigarette:  { node: 'Cig',         pos: [0.02, 0.01, -0.02],  rot: [0, 90, 20],  scale: 1.5 },
  yen:        { node: 'Plane001',    pos: [0.03, 0.02, -0.03],  rot: [90, 0, 90],  scale: 1.6 },
  suitcase:   { node: 'Suitcase',    pos: [0.02, -0.09, -0.02], rot: [0, 0, -90],  scale: 0.3 },
  skateboard: { node: 'Skateboard',  pos: [0.04, -0.02, -0.02], rot: [25, 0, 90],  scale: 0.4 },
  lantern:    { node: 'Lantern',     pos: [0.02, -0.08, 0],     rot: [0, 0, 0],    scale: 1.1 },
  cup:        { node: 'Cup',         pos: [0.02, -0.05, 0],     rot: [0, 0, 0],    scale: 0.9 },
}

const HAND_TIP = new Vector3(0, 0.092, 0)   // forearm bone length (Arm.R in the .blend)

// Camera framings: look-at height and vertical field of view (scene units ≈ metres)
const FRAMINGS = {
  bust: { y: 0.575, dist: 2.4, fov: 13.5 },
  half: { y: 0.55, dist: 2.4, fov: 13 },
  full: { y: 0.42, dist: 2.4, fov: 22 },
}

const POSE_FADE = 0.28

const _q = new Quaternion()
const _q2 = new Quaternion()
const _v = new Vector3()
const Y_AXIS = new Vector3(0, 1, 0)
const Z_AXIS = new Vector3(0, 0, 1)
const X_AXIS = new Vector3(1, 0, 0)

function toonGradient() {
  // 3-band cel ramp, nearest-sampled
  const data = new Uint8Array([90, 180, 255])
  const tex = new DataTexture(data, data.length, 1, RedFormat)
  tex.minFilter = tex.magFilter = NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

function crispTexture(tex) {
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export class GaiChanStage {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts]
   * @param {number} [opts.pixelHeight=150]  internal render height in pixels (lower = chunkier)
   * @param {'bust'|'half'|'full'} [opts.framing='bust']
   * @param {number} [opts.fps=30]           animation step rate (retro "on twos" feel)
   * @param {boolean} [opts.reducedMotion]   disables sway/bounce
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.opts = { pixelHeight: 150, framing: 'bust', fps: 30, reducedMotion: false, procedural: true, ...opts }

    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = SRGBColorSpace

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(10, 1, 0.1, 20)

    const hemi = new HemisphereLight(0xfff1dd, 0x3a2a30, 1.6)
    const key = new DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 3, -1.2)
    const rim = new DirectionalLight(0xffa040, 2.0)   // lantern-orange rim from behind
    rim.position.set(-3, 2, 1.5)
    this.scene.add(hemi, key, rim)

    this.state = {
      mood: 'neutral',
      pose: null,          // explicit pose override (null → mood's default)
      talking: false,
      prop: null,
      look: new Vector2(0, 0),       // target, -1..1
      lookSmooth: new Vector2(0, 0),
      pointerActive: false,
    }

    this._clock = 0
    this._acc = 0
    this._last = performance.now()
    this._raf = 0
    this._nextBlink = 1.5
    this._blinkUntil = 0
    this._mouthTimer = 0
    this._mouthShape = null
    this._pokeT = -1
    this._override = null    // temporary {mood, until}
    this._listeners = {}
    this._loaded = false
    this._visible = true
  }

  on(evt, fn) { (this._listeners[evt] ||= []).push(fn); return this }
  _emit(evt, ...a) { (this._listeners[evt] || []).forEach(fn => fn(...a)) }

  async load(url = BASE + 'gaichan.glb') {
    const loader = new GLTFLoader()
    const texLoader = new TextureLoader()
    const [gltf, ...faceTex] = await Promise.all([
      loader.loadAsync(url),
      ...FACE_TEXTURES.map(n => texLoader.loadAsync(BASE + 'face/' + n + '.png')),
    ])

    this.face = {}
    FACE_TEXTURES.forEach((name, i) => {
      const t = crispTexture(faceTex[i])
      t.flipY = false                        // glTF UV convention
      t.wrapS = t.wrapT = ClampToEdgeWrapping
      this.face[name] = t
    })

    const root = gltf.scene
    const gradient = toonGradient()
    this.faceMats = {}

    root.traverse(obj => {
      if (!obj.isMesh) return
      const src = obj.material
      if (src.map) crispTexture(src.map)
      const toon = new MeshToonMaterial({
        color: src.color,
        map: src.map,
        gradientMap: gradient,
        transparent: src.transparent,
        alphaTest: src.map ? 0.5 : 0,
        side: src.side,
      })
      toon.name = src.name
      obj.material = toon
      if (src.name.startsWith('Face.')) this.faceMats[src.name] = toon
    })

    this.root = root
    this.rig = root.getObjectByName('Gai_chan')
    this.bones = {}
    this.rig.traverse(o => { if (o.isBone) this.bones[o.name] = o })
    this.sweat = root.getObjectByName('Nervous_sweat')
    if (this.sweat) this.sweat.visible = false

    // Props: detach from the floor, hide, keep for later
    this.props = {}
    for (const [key, cfg] of Object.entries(PROPS)) {
      const node = root.getObjectByName(cfg.node)
      if (!node) continue
      node.removeFromParent()
      node.visible = false
      this.props[key] = node
    }
    // leftover scenery from the .blend we don't use
    for (const n of ['Plane002', 'Plane003', 'Plane004', 'Cube']) root.getObjectByName(n)?.removeFromParent()

    this.scene.add(root)

    // Pose clips
    this.mixer = new AnimationMixer(root)
    this.actions = {}
    for (const clip of gltf.animations) {
      const name = clip.name.replace(/^pose\./, '')
      const action = this.mixer.clipAction(clip)
      const looping = clip.duration > 0.1 && name === 'wave'
      action.setLoop(looping ? LoopRepeat : LoopOnce, Infinity)
      action.clampWhenFinished = true
      this.actions[name] = action
    }
    // bones the procedural layer touches → their clip-pose rotation (see _update)
    this._basePose = new Map(['Head', 'Spine'].filter(n => this.bones[n]).map(n => [this.bones[n], this.bones[n].quaternion.clone()]))
    this._anchorY = this.bones.Anchor?.position.y ?? 0

    this._applyMood(true)
    this.setFraming(this.opts.framing)
    this._loaded = true
    this._emit('ready')
    return this
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  setMood(mood) {
    if (!MOODS[mood]) mood = 'neutral'
    if (this.state.mood === mood) return
    this.state.mood = mood
    if (this._loaded) this._applyMood()
  }

  setPose(pose) {
    this.state.pose = pose || null
    if (this._loaded) this._playPose(this._currentPoseName())
  }

  setTalking(on) {
    this.state.talking = !!on
    if (!on) this._mouthShape = null
  }

  setProp(key) {
    if ((this.state.prop || null) === (key || null)) return
    const prev = this.props?.[this.state.prop]
    if (prev) { prev.visible = false; prev.removeFromParent() }
    this.state.prop = key || null
    if (!this._loaded) return
    const node = key && this.props[key]
    if (node) {
      const cfg = PROPS[key]
      node.rotation.set(...cfg.rot.map(MathUtils.degToRad))
      node.scale.setScalar(cfg.scale)
      node.visible = true
      this.scene.add(node)
    }
    this._playPose(this._currentPoseName())
  }

  /** Pointer position relative to the stage, -1..1 each axis (+y = up). */
  lookAt(x, y) {
    // looking down hides her face under the bangs, so allow much less down than up
    this.state.look.set(MathUtils.clamp(x, -1.2, 1.2), MathUtils.clamp(y, -0.5, 1))
    this.state.pointerActive = true
  }

  lookAway() { this.state.pointerActive = false }

  /** Click/tap reaction: a surprised hop, then back to whatever mood was set. */
  poke() {
    if (!this._loaded) return
    this._pokeT = 0
    this._override = { mood: Math.random() < 0.5 ? 'surprised' : 'embarrassed', until: this._clock + 0.9 }
    this._applyMood()
  }

  setFraming(name) {
    const f = FRAMINGS[name] || FRAMINGS.bust
    this.opts.framing = name
    this.camera.fov = f.fov
    this.camera.position.set(f.dist, f.y, 0)
    this.camera.lookAt(0, f.y, 0)
    this.camera.updateProjectionMatrix()
  }

  resize(cssW, cssH) {
    if (!cssW || !cssH) return
    const h = Math.max(32, Math.round(this.opts.pixelHeight))
    const w = Math.max(32, Math.round(h * cssW / cssH))
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(w, h, false)   // internal buffer; CSS stretches it
    this.camera.aspect = cssW / cssH
    this.camera.updateProjectionMatrix()
    this._renderOnce()
  }

  /** Is a canvas-space point (-1..1) on the character? Used for poke hit-testing. */
  hitTest(x, y) {
    if (!this._loaded) return false
    const rc = new Raycaster()
    rc.setFromCamera(new Vector2(x, y), this.camera)
    return rc.intersectObject(this.rig, true).length > 0
  }

  setVisible(v) { this._visible = v }

  start() {
    if (this._raf) return
    this._last = performance.now()
    const loop = (t) => {
      this._raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (t - this._last) / 1000)
      this._last = t
      if (!this._loaded || !this._visible) return
      this._acc += dt
      const step = 1 / this.opts.fps
      if (this._acc < step) return
      const stepDt = this._acc
      this._acc = 0
      this._update(stepDt)
      this.renderer.render(this.scene, this.camera)
    }
    this._raf = requestAnimationFrame(loop)
  }

  stop() { cancelAnimationFrame(this._raf); this._raf = 0 }

  /** Advance the simulation by dt seconds and render (used for deterministic capture). */
  step(dt) { if (this._loaded) { this._update(dt); this.renderer.render(this.scene, this.camera) } }

  dispose() {
    this.stop()
    this.renderer.dispose()
    const free = o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose?.() } }
    this.scene.traverse(free)
    Object.values(this.props || {}).forEach(p => p.traverse(free))   // props not currently held
    Object.values(this.face || {}).forEach(t => t.dispose())
  }

  // ── Internals ───────────────────────────────────────────────────────────────
  _moodDef() {
    const m = this._override && this._clock < this._override.until ? this._override.mood : this.state.mood
    return MOODS[m] || MOODS.neutral
  }

  _currentPoseName() {
    if (this._override && this._clock < this._override.until) return MOODS[this._override.mood].pose
    if (this.state.prop && !this.state.pose) return 'present'
    return this.state.pose || this._moodDef().pose
  }

  _applyMood(instant = false) {
    const m = this._moodDef()
    if (this.sweat) this.sweat.visible = !!m.sweat
    this._playPose(this._currentPoseName(), instant)
  }

  _playPose(name, instant = false) {
    const next = this.actions[name] || this.actions.idle
    if (!next || next === this._activeAction) return
    next.reset().play()
    if (this._activeAction && !instant) {
      next.crossFadeFrom(this._activeAction, POSE_FADE, false)
    } else if (this._activeAction) {
      this._activeAction.stop()
    }
    this._activeAction = next
  }

  _setFace(eyes, mouth) {
    const a = this.faceMats['Face.EyeA'], b = this.faceMats['Face.EyeB'], mo = this.faceMats['Face.Mouth']
    const et = this.face[eyes], mt = this.face[mouth]
    if (a && et && a.map !== et) { a.map = et; a.needsUpdate = true }
    if (b && et && b.map !== et) { b.map = et; b.needsUpdate = true }
    if (mo && mt && mo.map !== mt) { mo.map = mt; mo.needsUpdate = true }
  }

  _update(dt) {
    this._clock += dt
    const t = this._clock
    const s = this.state

    // expire temporary override (poke)
    if (this._override && t >= this._override.until) {
      this._override = null
      this._applyMood()
    }
    const mood = this._moodDef()

    // ── pose clips. The procedural layer below writes on top of the clip pose, and the
    // mixer doesn't rewrite bones once a one-shot clip has clamped, so restore the clip
    // pose first or the offsets would accumulate frame over frame.
    for (const [bone, q] of this._basePose) bone.quaternion.copy(q)
    this.mixer.update(dt)
    for (const [bone, q] of this._basePose) q.copy(bone.quaternion)

    // ── eyes: blink + glance toward pointer
    s.lookSmooth.lerp(s.pointerActive ? s.look : new Vector2(Math.sin(t * 0.37) * 0.25, Math.sin(t * 0.23) * 0.1), 1 - Math.exp(-dt * 6))
    let eyes = mood.eyes
    if (eyes === 'eyes-neutral' || eyes === 'eyes-raised') {
      if (s.lookSmooth.x > 0.45) eyes = 'eyes-look-right'
      else if (s.lookSmooth.x < -0.45) eyes = 'eyes-look-left'
    }
    if (t >= this._nextBlink) {
      this._blinkUntil = t + 0.11
      this._nextBlink = t + (Math.random() < 0.15 ? 0.25 : 2 + Math.random() * 3.5)
    }
    if (t < this._blinkUntil && mood.eyes !== 'eyes-happy') eyes = 'eyes-closed'

    // ── mouth: flap while talking
    let mouth = mood.mouth
    if (s.talking) {
      this._mouthTimer -= dt
      if (this._mouthTimer <= 0 || !this._mouthShape) {
        const opts = mood.talk.filter(x => x !== this._mouthShape)
        this._mouthShape = opts[Math.floor(Math.random() * opts.length)]
        this._mouthTimer = 0.07 + Math.random() * 0.08
      }
      mouth = this._mouthShape
    }
    this._setFace(eyes, mouth)

    // ── procedural layer on top of the pose clip
    if (this.opts.procedural) this._procedural(dt, t, s)
    this._placeProp()
  }

  _procedural(dt, t, s) {
    const head = this.bones.Head, spine = this.bones.Spine, anchor = this.bones.Anchor
    const lk = s.lookSmooth
    const calm = this.opts.reducedMotion ? 0 : 1

    if (spine) {
      const breathe = Math.sin(t * 2.1) * 0.012 * calm
      this._addWorldRotation(spine, Z_AXIS, breathe + lk.y * 0.03)
      this._addWorldRotation(spine, Y_AXIS, lk.x * 0.05 + Math.sin(t * 0.6) * 0.02 * calm)
    }
    if (head) {
      const talkNod = s.talking ? Math.sin(t * 9) * 0.025 * calm : 0
      this._addWorldRotation(head, Y_AXIS, lk.x * 0.2)
      this._addWorldRotation(head, Z_AXIS, lk.y * 0.12 + talkNod)
      this._addWorldRotation(head, X_AXIS, -lk.x * 0.06 + Math.sin(t * 0.8) * 0.02 * calm)
    }
    if (anchor) {
      let hop = 0
      if (this._pokeT >= 0) {
        this._pokeT += dt
        const p = this._pokeT / 0.35
        hop = p < 1 ? Math.sin(p * Math.PI) * 0.035 : 0
        if (p >= 1) this._pokeT = -1
      }
      anchor.position.y = this._anchorY + (Math.sin(t * 2.1) * 0.002 * calm) + hop * calm
    }
  }

  _placeProp() {
    const key = this.state.prop
    const node = key && this.props[key]
    const hand = this.bones.ArmR
    if (!node || !hand) return
    hand.updateWorldMatrix(true, false)
    node.position.copy(HAND_TIP).applyMatrix4(hand.matrixWorld).add(_v.set(...PROPS[key].pos))
  }

  /** Rotate a bone by `angle` about a world-space axis, on top of its current local rotation. */
  _addWorldRotation(bone, axis, angle) {
    if (!angle) return
    bone.parent.getWorldQuaternion(_q)          // parent world
    _q2.setFromAxisAngle(axis, angle)          // world delta
    // local' = (P⁻¹ · Δ · P) · local
    const pInv = _q.clone().invert()
    bone.quaternion.premultiply(pInv.multiply(_q2).multiply(_q))
  }

  _renderOnce() {
    if (!this._loaded) return
    this.renderer.render(this.scene, this.camera)
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}
