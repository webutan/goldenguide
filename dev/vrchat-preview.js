// Dev-only preview of the VRChat avatar (vrchat/GaiChan) with a GLSL port of the PS1 shader.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const W = 360, H = 480
const tex = await new THREE.TextureLoader().loadAsync('/vrchat/GaiChan/Textures/GaiChan_Atlas.png')
tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false  // glTF UV convention
const data = await (await fetch('/vrchat/GaiChan/gaichan_avatar.json')).json()

const ps1 = new THREE.ShaderMaterial({
  uniforms: { map: { value: tex }, snapRes: { value: 200 }, stepSize: { value: 0.006 }, affine: { value: 0.85 },
              lightDir: { value: new THREE.Vector3(0.4, 0.8, 0.6).normalize() }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: `
    #include <common>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>
    uniform float snapRes, stepSize; uniform vec3 lightDir;
    varying vec2 vUv; varying vec3 vAff; varying vec3 vLight;
    void main(){
      #include <beginnormal_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>
      vec4 world = modelMatrix * vec4(transformed, 1.0);
      if (stepSize > 0.0) world.xyz = floor(world.xyz / stepSize + 0.5) * stepSize;   // stepped motion
      vec4 clip = projectionMatrix * viewMatrix * world;
      vec2 grid = vec2(snapRes * ${W / H}, snapRes) * 0.5;
      clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;                  // vertex snap
      gl_Position = clip;
      vUv = uv; vAff = vec3(uv * clip.w, clip.w);
      vec3 n = normalize(mat3(modelMatrix) * objectNormal);
      float ndl = clamp((dot(n, lightDir) + 0.5) / 1.5, 0.0, 1.0);
      vLight = vec3(0.55) + vec3(0.75) * ndl;                                           // Gouraud
    }`,
  fragmentShader: `
    uniform sampler2D map; uniform float affine; varying vec2 vUv; varying vec3 vAff; varying vec3 vLight;
    float bayer(vec2 p){ int x=int(mod(p.x,4.)), y=int(mod(p.y,4.)); int i=x+y*4;
      int b[16]=int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); return float(b[i])/16.0; }
    void main(){
      vec2 uv = mix(vUv, vAff.xy / vAff.z, affine);
      vec3 c = texture2D(map, uv).rgb;
      c = pow(clamp(c * vLight, 0., 1.), vec3(1.0/2.2));                               // linear → gamma
      float d = bayer(gl_FragCoord.xy) - 0.5;
      c = floor(c * 31.0 + 0.5 + d) / 31.0;                                             // 15-bit + dither
      gl_FragColor = vec4(c, 1.0);
    }`,
})
const mobileMat = new THREE.MeshLambertMaterial({ map: tex })

async function makeView(id, material, pixelScale) {
  const canvas = document.getElementById(id)
  const r = new THREE.WebGLRenderer({ canvas, antialias: false })
  r.setPixelRatio(1); r.setSize(W / pixelScale, H / pixelScale, false)
  r.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1b1724)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x554455, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1, 2, 2); scene.add(sun)
  const fbx = (await new GLTFLoader().loadAsync('/dev/gaichan-vrchat-preview.glb')).scene  // same mesh as the FBX
  const box = new THREE.Box3().setFromObject(fbx); const h = box.max.y - box.min.y
  fbx.scale.setScalar(1.5 / h); fbx.position.y = -box.min.y * 1.5 / h
  let body
  fbx.traverse(o => { if (o.isSkinnedMesh) { o.material = material; body = o } })
  scene.add(fbx)
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 20)
  cam.position.set(0.55, 1.25, 1.75); cam.lookAt(0, 0.95, 0)
  const bones = {}; fbx.traverse(o => { if (o.isBone) bones[o.name] = o })
  fbx.traverse(o => { if (o.isSkinnedMesh) o.frustumCulled = false })
  const rest = Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, b.quaternion.clone()]))
  return { r, scene, cam, body, bones, rest, fbx }
}

const _q = new THREE.Quaternion(), _p = new THREE.Quaternion()
function rotWorld(bone, axis, ang) {
  bone.parent.getWorldQuaternion(_p); _q.setFromAxisAngle(axis, ang)
  bone.quaternion.premultiply(_p.clone().invert().multiply(_q).multiply(_p))
}
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1)

const views = [await makeView('pc', ps1, 2), await makeView('mobile', mobileMat, 1)]
window.__views = views
const dict = views[0].body.morphTargetDictionary
const hud = document.getElementById('hud')

// timeline: expressions and props cycle; she waves, looks around, talks
const steps = [
  { face: null, prop: null, wave: true }, { face: 'Happy', prop: null, wave: true },
  { face: 'Joy', prop: 'Can' }, { face: 'Smug', prop: 'Camera' }, { face: 'Surprised', prop: 'Yen' },
  { face: 'Embarrassed', prop: 'Cigarette' }, { face: 'Angry', prop: 'Bottle' }, { face: 'Thinking', prop: 'Lantern' },
  { face: 'Stern', prop: 'Cup' },
]
const STEP = 1.6
window.__t = 0
function frame(t) {
  const i = Math.floor(t / STEP) % steps.length, s = steps[i]
  const shapes = new Set(s.face ? data.expressions.find(e => e.name === s.face).shapes : [])
  if (s.prop) shapes.add('Prop_' + s.prop)
  const talking = (t % STEP) < 1.0
  const vis = ['vrc.v_aa', 'vrc.v_oh', 'vrc.v_ch', 'vrc.v_ff', 'vrc.v_pp']
  const viseme = talking ? vis[Math.floor(t * 9) % vis.length] : null
  const blink = (t % 3.1) < 0.12
  for (const v of views) {
    const inf = v.body.morphTargetInfluences
    inf.fill(0)
    for (const n of shapes) inf[dict[n]] = 1
    if (viseme) inf[dict[viseme]] = 1
    if (blink) inf[dict['Blink']] = 1
    const b = v.bones
    for (const [k, q] of Object.entries(v.rest)) b[k].quaternion.copy(q)
    v.fbx.updateMatrixWorld(true)
    // arms down from the T-pose, right forearm forward when holding something
    rotWorld(b.LeftUpperArm, Z, -1.2); rotWorld(b.RightUpperArm, Z, 1.2)
    v.fbx.updateMatrixWorld(true)
    if (s.wave) {
      rotWorld(b.RightUpperArm, Z, -2.0); v.fbx.updateMatrixWorld(true)
      rotWorld(b.RightLowerArm, Z, -(0.9 + Math.sin(t * 9) * 0.45))
    } else if (s.prop) {
      rotWorld(b.RightLowerArm, X, -1.35); v.fbx.updateMatrixWorld(true)
      rotWorld(b.RightLowerArm, Y, 0.35)
    }
    v.fbx.updateMatrixWorld(true)
    rotWorld(b.Head, Y, Math.sin(t * 0.9) * 0.35); rotWorld(b.Head, X, Math.sin(t * 1.3) * 0.08)
    rotWorld(b.Spine, Y, Math.sin(t * 0.6) * 0.12)
    v.fbx.rotation.y = Math.sin(t * 0.4) * 0.25
    v.r.render(v.scene, v.cam)
  }
  hud.textContent = `expression: ${s.face || 'Neutral'}   prop: ${s.prop || '—'}   ${viseme ? 'talking' : ''}`
}
window.__frame = frame
function loop(ms) { frame(ms / 1000); if (!window.__manual) requestAnimationFrame(loop) }
requestAnimationFrame(loop)
window.__ready = true
