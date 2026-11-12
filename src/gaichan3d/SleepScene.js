// Gai-chan asleep, for the screensaver (F07). Takes a loaded GaiChanStage,
// tucks her into a futon and drives her from a "sleeper" state object (see
// src/utils/screensaver.js): a snot bubble that swells and shrinks with her
// breathing, drifting Zs, and the jolt upright / look around / nod off again
// when the bouncing logo bonks her.
//
// She has no sleeping clip in the .blend, so the pose is made here on top of
// her idle pose: she lies on her back with her head turned on the pillow, her
// arms are placed by a two-bone reach (hands resting on the blanket, or
// clutching its edge), and the blanket is a cloth-like sheet re-draped over
// her every frame.
//
// Imported only through GaiChanStage.js, so it ships in the same lazy chunk
// as three.js.
import {
  Group, Mesh, PlaneGeometry, BoxGeometry, SphereGeometry, MeshBasicMaterial, MeshToonMaterial,
  DataTexture, RGBAFormat, RedFormat, NearestFilter, RepeatWrapping, SRGBColorSpace, DoubleSide,
  Vector3, Quaternion, Matrix4, MathUtils, Raycaster, Float32BufferAttribute,
} from 'three'
import { sitUp, clutch, reach, bubbleSize, breath, phaseProgress } from '../utils/screensaver.js'

const { lerp, smoothstep, clamp } = MathUtils

// Scene units are roughly metres; +y is up, +z is screen left, +x is towards the viewer.
// The model stands facing +x with her right hand at +z. In bed she lies on her
// back, head to screen left, so her own axes land as: front → up, up → screen
// left, right-hand side → towards the viewer.
const FUTON_TOP = 0.05
const BODY_Y = 0.115         // height of her centre line above the floor when lying
const BODY_Z = -0.42         // where her heels end up (her head lands near z = +0.2)
const BODY_ROLL = 0.2        // rolled a little towards the viewer, radians
const CAMERA_DIST = 4
const CAMERA_TILT = MathUtils.degToRad(24)    // looking down at the futon, so the bedding reads

// Points on the standing model (world space before she is laid down)
const NOSE = new Vector3(0.098, 0.592, 0)
const HEAD_TOP = new Vector3(0, 0.76, 0)
const HEAD_CENTRE = new Vector3(0.01, 0.635, 0)
const BUBBLE_RADIUS = 0.072

// Pose
const SIT_ANGLE = 1.3        // how far her torso swings up from the futon, radians
const SIT_TWIST = 0.75       // and turns towards the viewer once she is up
const HEAD_TURN = 0.42       // head turned to the viewer on the pillow (more and her twin-tail digs into the bed)
const CHEST_PROP = 0.2       // her shoulders propped up a little on the pillow, radians
const HEAD_TUCK = 0.3        // chin tucked by the pillow
const UPPER_ARM = 0.104      // bone lengths (shoulder → elbow, elbow → fingertips)
const FOREARM = 0.092

// Hand targets on the standing model. `grip`: clutching the blanket's top edge
// under her chin, as [height, sideways]; how far forward is measured off her
// body in attach(). `rest`, asleep: the arm on the viewer's side (R) lies
// along her side on top of the covers, the other hand rests on the cuff
// (`rest` as a point, or [height, sideways] likewise).
// Elbows (standing model's axes: x forward, y up, z to her right): lying, they
// rest on the futon out to her sides; sitting with the blanket in her fists,
// they stick out sideways, which keeps her forearms above the hanging cloth.
const ELBOW_LYING = new Vector3(-1, -0.35, 0.75)
const ELBOW_SITTING = new Vector3(0.25, -0.2, 1)
const HANDS = {
  R: { bones: ['upper_armR', 'ArmR'], rest: new Vector3(0.048, 0.375, 0.1), grip: [0.497, 0.04], side: 1 },
  L: { bones: ['upper_armL', 'ArmL'], rest: [0.468, -0.025], grip: [0.497, -0.04], side: -1 },
}
const CLOTH = 0.014          // the blanket's thickness over her body

// Blanket: a sheet of ROWS x COLS quads. It runs from past her feet to her
// lap along the futon, then on up her front to its top edge on her chest.
const ROWS = 40, COLS = 26
const BLANKET_HALF_WIDTH = 0.235
const U_LAP = 0.66                           // how far along the sheet her lap is
const BLANKET_FOOT_Z = BODY_Z - 0.11
const LAP_HEIGHT = 0.365                     // standing model: where the sheet leaves her lap
const EDGE_REST = 0.482                      // … where its top edge lies on her chest
const EDGE_GRIP = 0.502                      // … and pulled up under her chin

const X_AXIS = new Vector3(1, 0, 0)
const Y_AXIS = new Vector3(0, 1, 0)
const Z_AXIS = new Vector3(0, 0, 1)
const _v = new Vector3()
const _a = new Vector3()
const _b = new Vector3()
const _q = new Quaternion()
const _p = new Quaternion()

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

// Same 3-band cel ramp as the character, so cloth and pillow shade like her
function toonGradient() {
  const data = new Uint8Array([105, 185, 255])
  const tex = new DataTexture(data, data.length, 1, RedFormat)
  tex.minFilter = tex.magFilter = NearestFilter
  tex.generateMipmaps = false
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

// Indigo with thin pale stripes running the length of the bed (so they bend
// with every fold), and a turned-back cream cuff along the top edge (row 0 =
// the edge on her chest).
function blanketTexture() {
  const a = rgba('#33469a'), b = rgba('#3c52ad'), line = rgba('#9fb0ea'), cuff = rgba('#f3ead6'), seam = rgba('#c9bc9c')
  return pixelTexture(32, 64, (x, y) => {
    if (y < 5) return cuff
    if (y === 5) return seam
    return x % 8 === 3 ? line : (x >> 3) % 2 ? a : b
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
    const gradient = tex(toonGradient())
    const toon = (color, extra) => new MeshToonMaterial({ color, gradientMap: gradient, ...extra })

    // Futon with a dark edge, and a soft pillow her head sinks into
    const futon = new Mesh(new BoxGeometry(0.62, FUTON_TOP, 1.12), toon(0xe9dfc9))
    futon.position.set(0, FUTON_TOP / 2, -0.06)
    const futonEdge = new Mesh(new BoxGeometry(0.64, 0.02, 1.14), new MeshBasicMaterial({ color: 0x8c3b2a }))
    futonEdge.position.set(0, 0.01, -0.06)
    // (a squashed ball; _dentPillow() presses her head's shape into it)
    const pillow = this.pillow = new Mesh(new SphereGeometry(1, 20, 12), toon(0xfffaf0))
    pillow.scale.set(0.2, 0.062, 0.16)
    pillow.position.set(0, FUTON_TOP + 0.04, 0.24)
    this.group.add(futonEdge, futon, pillow)

    // The blanket: vertices are placed in _drape() every frame
    const cloth = tex(blanketTexture())
    cloth.wrapS = RepeatWrapping
    const sheet = new PlaneGeometry(1, 1, COLS, ROWS)
    // per-vertex shade: creases dark, ridges light (set in _drape)
    sheet.setAttribute('color', new Float32BufferAttribute(new Float32Array((COLS + 1) * (ROWS + 1) * 3).fill(1), 3))
    this.blanket = new Mesh(sheet, toon(0xffffff, { map: cloth, side: DoubleSide, vertexColors: true }))
    this.blanket.frustumCulled = false
    this.group.add(this.blanket)

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
    this._tick = (dt, t) => this._update(dt, t)
  }

  /**
   * Put a loaded GaiChanStage's Gai-chan to bed and take over her animation.
   * `sleeper` is the state from createSleeper(); the caller steps it.
   */
  attach(stage, sleeper) {
    this._stage = stage
    this.sleeper = sleeper
    stage.opts.procedural = false          // no pointer-following or idle sway
    stage.lookAway()

    // Everything below is measured on the standing idle pose, then expressed
    // in a bone's own space so it follows her once she is lying down.
    stage.mixer.update(0)
    stage.root.updateMatrixWorld(true)
    const { Head: head, Spine: spine } = stage.bones
    const inHead = v => head.worldToLocal(v.clone())
    const inSpine = v => spine.worldToLocal(v.clone())
    // The front of her torso at a given height: found by looking at her from
    // the front, so cloth and hands sit on her jacket rather than in it.
    // (Her arms and head are left out; they would get in the way.)
    const torso = []
    stage.rig.traverse(o => { if (o.isMesh && /^(Torso|Pelvis|Patches)$/.test(o.name)) torso.push(o) })
    const ray = new Raycaster()
    const front = (height, sideways, gap) => {
      ray.set(new Vector3(1, height, sideways), new Vector3(-1, 0, 0))
      const hit = ray.intersectObjects(torso, false)[0]
      return new Vector3((hit ? hit.point.x : 0.06) + gap, height, sideways)
    }
    this._nose = inHead(NOSE)
    this._headTop = inHead(HEAD_TOP)
    this._headCentre = inHead(HEAD_CENTRE)
    this._lapStanding = front(LAP_HEIGHT, 0, CLOTH)
    this._edgeRest = inSpine(front(EDGE_REST, 0, CLOTH))
    this._edgeGrip = inSpine(front(EDGE_GRIP, 0, CLOTH + 0.006))
    // across her chest (towards her right hand), as a direction in spine space
    this._across = inSpine(new Vector3(0, 0, 1).add(spine.getWorldPosition(_v))).sub(inSpine(spine.getWorldPosition(_v))).normalize()
    this._arms = Object.values(HANDS).map(h => ({
      upper: stage.bones[h.bones[0]],
      fore: stage.bones[h.bones[1]],
      rest: inSpine(h.rest.isVector3 ? h.rest : front(h.rest[0], h.rest[1], CLOTH + 0.04)),
      grip: inSpine(front(h.grip[0], h.grip[1], CLOTH + 0.03)),
      side: h.side,
    })).filter(a => a.upper && a.fore)
    // The bones posed here, and the idle pose they start each frame from
    // How thick each arm segment is and how far it runs, measured off its
    // meshes: the blanket is kept clear of these (see _clearArms)
    for (const a of this._arms) {
      a.capsules = [a.upper, a.fore].map(bone => {
        let radius = 0, length = 0
        bone.updateWorldMatrix(true, true)
        bone.traverse(o => {
          if (!o.isMesh) return
          const pos = o.geometry.attributes.position
          for (let i = 0; i < pos.count; i++) {
            bone.worldToLocal(_v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld))
            radius = Math.max(radius, Math.hypot(_v.x, _v.z))
            length = Math.max(length, _v.y)
          }
        })
        return { bone, radius: radius || 0.03, length: length || 0.1, a: new Vector3(), b: new Vector3() }
      })
    }
    // Her head and hair, for pressing their shape into the pillow
    this._headMeshes = []
    head.traverse(o => { if (o.isMesh && o.visible) this._headMeshes.push(o) })
    // straight out from her chest, as a direction in spine space
    this._forward = inSpine(new Vector3(1, 0, 0).add(spine.getWorldPosition(_v))).sub(inSpine(spine.getWorldPosition(_v))).normalize()
    // standing-model directions → spine space
    this._spineFromStanding = spine.getWorldQuaternion(new Quaternion()).invert()
    this._restPose = new Map()
    for (const a of this._arms) for (const b of [a.upper, a.fore]) this._restPose.set(b, b.quaternion.clone())

    // On her back, head to screen left, rolled a touch towards the viewer
    const m = new Matrix4().makeBasis(new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0))
    stage.root.quaternion.setFromRotationMatrix(m)
      .premultiply(_q.setFromAxisAngle(Z_AXIS, -BODY_ROLL))
    stage.root.position.set(0, BODY_Y, BODY_Z)
    // Her lap stays put when she sits up; so does the line the blanket's top
    // edge lies along while she is flat.
    stage.root.updateMatrixWorld(true)
    this._lapWorld = stage.root.localToWorld(this._lapStanding.clone())
    this._edgeLyingZ = spine.localToWorld(this._edgeRest.clone()).z

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
    const visibleWidth = aspect >= 1 ? 1.8 : 1.2
    const visibleHeight = visibleWidth / aspect
    cam.fov = MathUtils.radToDeg(2 * Math.atan(visibleHeight / 2 / CAMERA_DIST))
    cam.aspect = aspect
    const targetY = 0.12 + visibleHeight * 0.26
    cam.position.set(Math.cos(CAMERA_TILT) * CAMERA_DIST, targetY + Math.sin(CAMERA_TILT) * CAMERA_DIST, -0.06)
    cam.lookAt(0, targetY, -0.06)
    cam.updateProjectionMatrix()
    cam.updateMatrixWorld(true)
  }

  /**
   * Her sleeping head as a rectangle in CSS pixels of a `width` x `height`
   * canvas: what the logo bounces off. Only her head, so the logo drifts past
   * behind the futon and she gets some sleep between bonks.
   */
  colliderRect(width, height) {
    const cam = this._stage?.camera
    if (!cam) return null
    const c = this._sleepingHead || new Vector3(0, 0.2, 0.2)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const dz of [-0.13, 0.14]) {
      for (const dy of [-0.15, 0.06]) {
        _v.set(c.x, c.y + dy, c.z + dz).project(cam)
        const px = (_v.x + 1) / 2 * width, py = (1 - _v.y) / 2 * height
        x0 = Math.min(x0, px); x1 = Math.max(x1, px)
        y0 = Math.min(y0, py); y1 = Math.max(y1, py)
      }
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }

  // Swing a bone so its length (+y) points along a world direction
  _aim(bone, dir) {
    bone.updateWorldMatrix(true, false)
    _a.setFromMatrixColumn(bone.matrixWorld, 1).normalize()
    _q.setFromUnitVectors(_a, _b.copy(dir).normalize())
    bone.parent.getWorldQuaternion(_p)
    // local' = (P⁻¹ · Δ · P) · local
    bone.quaternion.premultiply(_p.clone().invert().multiply(_q).multiply(_p))
  }

  _update(dt, t) {
    const stage = this._stage, s = this.sleeper
    if (!stage || !s) return
    const { Spine: spine, Head: head } = stage.bones
    const phase = s.phase
    const p = phaseProgress(s)
    const up = sitUp(s)                       // 0 lying … 1 sitting (overshoots a little)
    const upc = clamp(up, 0, 1)
    const hold = clutch(s)                    // 0 arms at rest … 1 clutching the blanket
    const out = phase === 'asleep' ? breath(s.asleepFor) : 0

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

    // ── torso: swings up from the hips and turns to the viewer, legs stay
    // under the blanket. (The stage has just reset spine and head to the idle
    // pose, so these rotations don't pile up.)
    if (spine) {
      stage._addWorldRotation(spine, X_AXIS, -up * SIT_ANGLE - (1 - upc) * CHEST_PROP - out * 0.03)
      if (upc) stage._addWorldRotation(spine, Y_AXIS, -upc * SIT_TWIST)
    }
    // ── head: turned on the pillow while lying; looks about once she is up
    if (head) {
      let yaw = 0, nod = 0
      // + turns her away towards her feet, - round to the viewer and past
      if (phase === 'look-left') yaw = Math.sin(Math.min(1, p * 3) * Math.PI / 2) * 0.65
      else if (phase === 'look-right') yaw = 0.65 - Math.sin(Math.min(1, p * 2.4) * Math.PI / 2) * 1.5
      else if (phase === 'drowsy') { yaw = -0.85 * Math.max(0, 1 - p * 3); nod = Math.sin(p * Math.PI * 3) * 0.1 * (1 - p) }
      const lying = 1 - upc
      if (lying) {
        stage._addWorldRotation(head, X_AXIS, -lying * HEAD_TUCK)
        stage._addWorldRotation(head, Z_AXIS, -lying * HEAD_TURN)
      }
      if (yaw) stage._addWorldRotation(head, Y_AXIS, yaw)
      if (nod) stage._addWorldRotation(head, X_AXIS, nod)
    }

    // ── arms: back to the idle pose, then each hand reaches for its spot
    for (const [bone, q] of this._restPose) bone.quaternion.copy(q)
    stage.root.updateMatrixWorld(true)
    // the jolt throws her hands out before they find the blanket
    const flinch = phase === 'startled' && p < 0.22 ? Math.sin(p / 0.22 * Math.PI) : 0
    const spineTurn = spine.getWorldQuaternion(new Quaternion())
    const spineFromStanding = this._spineFromStanding
    for (const arm of this._arms) {
      const target = _v.lerpVectors(arm.rest, arm.grip, hold)
      target.addScaledVector(this._across, arm.side * flinch * 0.07)
      // between resting and gripping, her hand swings out and round the
      // blanket rather than straight through it
      const swing = Math.sin(hold * Math.PI)
      target.addScaledVector(this._forward, swing * 0.055).addScaledVector(this._across, arm.side * swing * 0.04)
      spine.localToWorld(target)
      target.y += flinch * 0.05 + (1 - hold) * out * 0.004
      const shoulder = arm.upper.getWorldPosition(new Vector3())
      const pole = new Vector3().lerpVectors(ELBOW_LYING, ELBOW_SITTING, upc)
      pole.z *= arm.side
      pole.normalize().applyQuaternion(spineFromStanding).applyQuaternion(spineTurn)
      const r = reach(shoulder.toArray(), target.toArray(), pole.toArray(), UPPER_ARM, FOREARM)
      const elbow = new Vector3().fromArray(r.elbow), hand = new Vector3().fromArray(r.hand)
      this._aim(arm.upper, elbow.clone().sub(shoulder))
      this._aim(arm.fore, hand.sub(elbow))
    }
    stage.root.updateMatrixWorld(true)

    this._drape(upc, hold, out)

    if (!this._sleepingHead && phase === 'asleep') {
      this._sleepingHead = head.localToWorld(this._headCentre.clone())
      this._dentPillow()
    }

    // ── snot bubble: hangs off her nose, swelling up and away from her face
    const size = bubbleSize(s)
    this.bubble.visible = size > 0.01
    if (this.bubble.visible) {
      const r = BUBBLE_RADIUS * size
      head.localToWorld(_v.copy(this._nose))
      this.bubble.position.set(_v.x + 0.05, _v.y + r * 0.85, _v.z - r * 0.55)
      this.bubble.scale.setScalar(r * 2)
    }

    // ── Zs: each takes 3 s to drift up and fade, a second apart
    head.localToWorld(_v.copy(this._headCentre))
    const settled = phase === 'asleep' && s.asleepFor > 1.5
    this.zs.forEach((z, i) => {
      const life = ((s.asleepFor - 1.5 + (3 - i)) % 3) / 3
      z.visible = settled && s.asleepFor - 1.5 > i
      if (!z.visible) return
      z.position.set(_v.x + 0.05, _v.y + 0.2 + life * 0.3, _v.z + 0.14 + life * 0.16 + Math.sin(life * 6) * 0.015)
      z.scale.setScalar(0.035 + life * 0.05)
      z.material.opacity = life < 0.75 ? 1 : (1 - life) * 4
    })

    // ── "!" over her head as she jolts awake
    this.bang.visible = phase === 'startled' && p > 0.12 && p < 0.8
    if (this.bang.visible) {
      head.localToWorld(_v.copy(this._headTop))
      this.bang.position.set(_v.x + 0.05, _v.y + 0.1, _v.z)
      this.bang.scale.set(0.034, 0.12, 1)
    }
  }

  // Lay the blanket over her. Along its length (u: 0 at her feet, 1 at the
  // top edge) its middle follows the futon to her lap and then her front up
  // to the edge on her chest, so the middle comes up with her when she sits.
  // Its two long sides (v: -1 far side, +1 viewer's side) stay on the futon,
  // dragged in a little, and the cloth hangs between: a low hump over her
  // while she sleeps, a tent from her fists when she clutches it.
  _drape(up, hold, out) {
    const spine = this._stage.bones.Spine
    const pos = this.blanket.geometry.attributes.position
    const colour = this.blanket.geometry.attributes.color
    const floor = FUTON_TOP + 0.01
    const lap = this._lapWorld
    const edge = _b.lerpVectors(this._edgeRest, this._edgeGrip, hold)

    let i = 0
    for (let row = 0; row <= ROWS; row++) {
      const u = 1 - row / ROWS                 // PlaneGeometry rows run top to bottom
      // the middle of the sheet at this row, and where its sides lie
      let cx = 0, cy, cz, sideZ, torso = 0
      if (u <= U_LAP) {
        const k = u / U_LAP
        cz = sideZ = lerp(BLANKET_FOOT_Z, lap.z, k)
        // up over her toes, a dip at the shins, up again over her thighs
        const toes = Math.exp(-(((k - 0.2) / 0.11) ** 2)) * 0.03
        // (her thighs stand a little prouder than her lap: give them room)
        cy = lerp(floor, lap.y + 0.012, smoothstep(k, 0, 0.2)) + toes - Math.sin(k * Math.PI) * 0.008 + smoothstep(k, 0.4, 0.75) * 0.016
      } else {
        torso = (u - U_LAP) / (1 - U_LAP)
        spine.localToWorld(_v.copy(edge))
        // slack between lap and fists when she is sitting
        const sag = Math.sin(torso * Math.PI) * 0.035 * up
        cx = _v.x * torso
        cy = lerp(lap.y + 0.028, _v.y, torso) - sag * 0.5 + out * 0.007 * Math.sin(torso * Math.PI)
        cz = lerp(lap.z, _v.z, torso) - sag
        // the sides stay up by the pillow (a little further, even), so the
        // cloth wraps round her hips when she sits
        // … and trail back a little, so the top edge curves round her shoulders
        sideZ = lerp(lap.z, this._edgeLyingZ + 0.06 * up, torso) - 0.03 * torso * (1 - up)
      }
      const lift = cy - floor
      for (let col = 0; col <= COLS; col++) {
        const v = col / COLS * 2 - 1
        const side = Math.abs(v)
        // 1 over her middle, easing to 0 where the cloth reaches the futon
        const over = 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, side / 0.86))
        const hang = over * (1 - over) * 4       // most on the slopes
        // gathered in her fists at the top when she holds it up
        const gather = 1 - 0.62 * up * torso * over
        let x = cx * over + v * BLANKET_HALF_WIDTH * gather
        // held up, it hangs in a curve from her fists rather than a straight slope
        let y = floor + lift * over ** (1 + 0.9 * up * torso)
        let z = lerp(sideZ, cz, over)
        // folds: fine creases over her, deeper ones down the slopes, and
        // long ones pulled towards her fists when it is held up
        const crease = Math.sin(u * 33 + v * 4) * 0.25 * over
          + Math.sin(u * 19 + side * 7) * hang * Math.min(1, lift / 0.08)
          + Math.sin(v * 11 + u * 5) * 1.2 * hang * up * torso
        y += crease * 0.012
        // shade: valleys of the folds darker, crests and her outline lighter
        const shade = clamp(0.86 + crease * 0.2 + over * 0.12 - hang * 0.1, 0.55, 1.1)
        colour.setXYZ(i, shade, shade, Math.min(1, shade + 0.04))
        x += Math.sin(u * 13 + 1) * 0.012 * (1 - over)           // wavy hem
        z += Math.sin(v * 7) * 0.008 * (1 - over) * (u > 0.9 || u < 0.1 ? 1 : 0.3)
        // the turned-back cuff is a little puffy
        if (u > 0.93) y += 0.005 * over
        pos.setXYZ(i++, x, Math.max(y, floor - 0.002), z)
      }
    }
    this.blanket.geometry.computeVertexNormals()
    this._clearArms(floor, hold, up)
    pos.needsUpdate = true
    colour.needsUpdate = true
    this.blanket.geometry.computeVertexNormals()
  }

  // Her arms always lie outside the blanket: wherever an arm would pass
  // through or under the cloth, the cloth is pressed in beneath it (towards
  // her, along its own surface normal), with a soft rim so it reads as
  // weight on a quilt rather than a cut.
  _clearArms(floor, hold, up) {
    const geo = this.blanket.geometry
    const pos = geo.attributes.position, nor = geo.attributes.normal
    const capsules = []
    for (const arm of this._arms) {
      for (const c of arm.capsules) {
        c.bone.updateWorldMatrix(true, false)
        c.a.setFromMatrixPosition(c.bone.matrixWorld)
        c.b.set(0, c.length, 0).applyMatrix4(c.bone.matrixWorld)
        capsules.push(c)
      }
    }
    // which way is "out"? The sheet's winding decides the normals' sign: the
    // middle of the foot end faces up.
    const probe = (ROWS - 2) * (COLS + 1) + (COLS >> 1)
    const out = nor.getY(probe) >= 0 ? 1 : -1
    const RIM = 0.035, SKIN = 0.011
    // Asleep, an arm lying on the covers is dug out from under them however
    // deep it is. Sitting up or holding the blanket, her arms are clear of it and
    // only cloth actually touching an arm moves (anything more would press
    // the cloth into her lap).
    const dig = lerp(0.13, 0, Math.max(hold, up))
    const n = _a, p = _b, q = _v
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i)
      n.fromBufferAttribute(nor, i).multiplyScalar(out)
      let push = 0
      for (const c of capsules) {
        // nearest point of the arm segment to this bit of cloth
        const abx = c.b.x - c.a.x, aby = c.b.y - c.a.y, abz = c.b.z - c.a.z
        const t = clamp(((p.x - c.a.x) * abx + (p.y - c.a.y) * aby + (p.z - c.a.z) * abz) / (abx * abx + aby * aby + abz * abz), 0, 1)
        q.set(p.x - (c.a.x + abx * t), p.y - (c.a.y + aby * t), p.z - (c.a.z + abz * t))
        const above = q.dot(n)                              // cloth's height over the arm's axis
        const aside = Math.sqrt(Math.max(0, q.lengthSq() - above * above))
        const r = c.radius + SKIN
        if (aside > r + RIM || above > Math.max(r, dig) || above < -r) continue
        // straight under the arm: all the way beneath it. Out at the rim: easing off.
        const depth = aside < r ? Math.sqrt(r * r - aside * aside) : 0
        const ease = aside < r ? 1 : 1 - smoothstep(aside, r, r + RIM)
        push = Math.max(push, (above + depth) * ease)
      }
      if (push > 0) {
        // over her middle there is a body right under the cloth: only a
        // shallow dent there, as deep as it likes out on the slopes
        const side = Math.abs((i % (COLS + 1)) / COLS * 2 - 1)
        push = Math.min(push, lerp(0.022, 0.13, smoothstep(side, 0.2, 0.5)))
        p.addScaledVector(n, -push)
        pos.setXYZ(i, p.x, Math.max(p.y, floor - 0.004), p.z)
      }
    }
  }

  // Press the shape of her sleeping head and hair into the pillow, once: the
  // pillow's top is lowered to just under them wherever they would sink in.
  _dentPillow() {
    const pillow = this.pillow
    const geo = pillow.geometry, pos = geo.attributes.position
    pillow.updateWorldMatrix(true, false)
    const ray = new Raycaster()
    ray.far = 0.5
    const up = new Vector3(0, 1, 0)
    // hair cards are one-sided: look at both faces while measuring
    const sides = this._headMeshes.map(m => m.material.side)
    this._headMeshes.forEach(m => { m.material.side = DoubleSide; m.updateWorldMatrix(true, false) })
    // every hair/head vertex too, so thin strands the rays slip past still count
    const points = []
    for (const m of this._headMeshes) {
      const hp = m.geometry.attributes.position
      for (let i = 0; i < hp.count; i++) points.push(new Vector3().fromBufferAttribute(hp, i).applyMatrix4(m.matrixWorld))
    }
    const bottom = FUTON_TOP + 0.003
    const GAP = 0.009, NEAR = 0.035
    for (let i = 0; i < pos.count; i++) {
      const w = pillow.localToWorld(_v.fromBufferAttribute(pos, i))
      let ceiling = Infinity
      ray.set(_a.set(w.x, bottom - 0.2, w.z), up)
      const first = ray.intersectObjects(this._headMeshes, false)[0]
      if (first) ceiling = first.point.y
      for (const pt of points) {
        if (Math.abs(pt.x - w.x) < NEAR && Math.abs(pt.z - w.z) < NEAR) ceiling = Math.min(ceiling, pt.y)
      }
      if (ceiling - GAP < w.y) {
        w.y = Math.max(bottom, ceiling - GAP)
        pillow.worldToLocal(w)
        pos.setXYZ(i, w.x, w.y, w.z)
      }
    }
    this._headMeshes.forEach((m, i) => { m.material.side = sides[i] })
    pos.needsUpdate = true
    geo.computeVertexNormals()
  }

  dispose() {
    this._stage?.removeTicker(this._tick)
    this._stage = null
    this.group.removeFromParent()
    this.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose() } })
    this._textures.forEach(t => t.dispose())
  }
}
