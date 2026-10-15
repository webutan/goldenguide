"""
Build a VRChat-ready Gai-chan (PC + Android + iOS) from media/gaichan/Gaichan1.blend.

Output (vrchat/GaiChan/, copy the folder into a VRChat Creator Companion project's Assets/):
  GaiChan.fbx                 one skinned mesh, humanoid armature, blendshapes
  Textures/GaiChan_Atlas.png  single pixel-exact texture atlas (opaque)
  Icons/*.png                 expression-menu icons (rendered separately, see render_vrchat_icons)
  gaichan_avatar.json         data the Unity setup script reads (view position, shapes, menus)

Run:
  blender -b media/gaichan/Gaichan1.blend -P scripts/blender/export_vrchat.py
  # or: python scripts/blender/export_vrchat.py media/gaichan/Gaichan1.blend   (pip `bpy`)

Why it is built this way (mobile VRChat limits: 1 skinned mesh, 1 material, VRChat/Mobile
shaders only — all opaque):
  * the 18 rigid body parts are merged into one mesh, each part weighted 100% to one bone
    (keeps the PS1 "segmented" look; no smooth skinning)
  * a humanoid rig is built from the original one, adding hips/chest/neck/hands/feet
  * every texture goes into one atlas, copied texel-for-texel (repeating textures are
    pre-tiled), so there is no resampling of the pixel art
  * alpha decals (jacket patches, hairpin, sweat drop) can't be transparent on mobile, so
    their opaque texels are turned into geometry instead
  * face expressions, lip-sync visemes, the sweat drop and the hand props are extra
    geometry layers driven by blendshapes (collapsed out of sight in the basis)
"""
import json
import math
import os
import sys

import bpy  # before bmesh/mathutils (needed when running via the pip `bpy` module)
import bmesh
import numpy as np
from mathutils import Matrix, Vector

# ── Setup ─────────────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
if argv and argv[0].endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(argv[0]))

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(REPO, 'vrchat', 'GaiChan')
os.makedirs(os.path.join(OUT, 'Textures'), exist_ok=True)

D = bpy.data
SRC_RIG = D.objects['Gai chan']

TARGET_HEIGHT = 1.5
ATLAS_SIZE = 512
PAD = 2                     # edge-extended texels around every atlas tile

# Bones of the source rig → humanoid bone that each mesh rides on
PART_BONE = {
    'Head': 'Head', 'Nervous sweat': 'Head',
    'Torso': 'Chest', 'Patches': 'Chest', 'Patches.Torso.Back': 'Chest',
    'Pelvis': 'Hips',
    'Shoulder.L': 'LeftUpperArm', 'Patches.Shoulder.L': 'LeftUpperArm',
    'Shoulder.R': 'RightUpperArm', 'Patches.Shoulder.R': 'RightUpperArm',
    'Arm.L': 'LeftLowerArm', 'Patches.Arm.L': 'LeftLowerArm',
    'ArmR': 'RightLowerArm', 'Patches.ArmR': 'RightLowerArm',
    'Thigh.L': 'LeftUpperLeg', 'Thigh.R': 'RightUpperLeg',
    'Leg.L': 'LeftLowerLeg', 'Leg.R': 'RightLowerLeg',
}
# Faces of these materials inside a part are moved to a child bone (hands/feet)
SUB_BONE = {
    ('Arm.L', 'Skin'): 'LeftHand', ('ArmR', 'Skin'): 'RightHand',
    ('Leg.L', 'boots'): 'LeftFoot', ('Leg.L', 'boots2'): 'LeftFoot',
    ('Leg.R', 'boots'): 'RightFoot', ('Leg.R', 'boots2'): 'RightFoot',
}
DECAL_MATERIALS = {'Patches', 'BackPatches', 'Hairpin', 'Zipper.001'}

# Props that fit in a hand. axes: where the prop's local +X / +Z point when held, in the
# source frame (+X = her forward, +Z = up, -Y = her right; T-pose: right forearm → -Y).
# Grip rules assume the common "forearm forward, palm in, thumb up" hold: thumb-up maps
# to her forward axis in T-pose, the forearm direction to -Y.
PROPS = {
    'Camera':    {'obj': 'Cube.001',    'x': (0, -1, 0), 'z': (1, 0, 0), 'size': 0.13, 'grip': (0, 0, 0)},
    'Can':       {'obj': 'Beer Can',    'x': (0, 0, -1), 'z': (1, 0, 0), 'size': 0.13, 'grip': (0, 0, 0)},
    'Bottle':    {'obj': 'Beer Bottle', 'x': (0, 0, -1), 'z': (1, 0, 0), 'size': 0.28, 'grip': (0, 0, -0.15)},
    'Cigarette': {'obj': 'Cig',         'x': (1, 0, 0),  'z': (0, 0, 1), 'size': 0.09, 'grip': (-0.25, 0, 0)},
    'Yen':       {'obj': 'Plane.001',   'x': (1, 0, 0),  'z': (0, -1, 0), 'size': 0.16, 'grip': (-0.4, 0, 0)},
    'Lantern':   {'obj': 'Lantern',     'x': (0, 0, -1), 'z': (1, 0, 0), 'size': 0.22, 'grip': (0, 0, 0.45)},
    'Cup':       {'obj': 'Cup',         'x': (0, 0, -1), 'z': (1, 0, 0), 'size': 0.15, 'grip': (0, 0, 0)},
}

# Face layers. Base eyes/mouth are the head's own faces; each layer is a copy floating
# slightly in front, collapsed in the basis and expanded by its blendshape.
EYE_LAYERS = {   # blendshape → source material
    'Eyes_Raised': 'Eye eyebrow raised neutral', 'Eyes_Narrow': 'Eye narrowed',
    'Eyes_Angry': 'Eye Angry', 'Eyes_Embarrassed': 'Eye Emberrased',
    'Eyes_Surprised': 'Eyes Surprised', 'Eyes_Happy': 'Eyes closed Downer',
    'Eyes_LookLeft': 'Eyes look left', 'Eyes_LookRight': 'Eyes look Right',
}
BLINK_LAYER = ('Blink', 'Eyes closed upper')
MOUTH_LAYERS = {
    'Mouth_Closed': 'Mouth Closed', 'Mouth_Open': 'Mouth Open Happy', 'Mouth_Half': 'Mouth Open Happy Half',
    'Mouth_O': 'Mouth O', 'Mouth_Toothy': 'Mouth toothy', 'Mouth_Eww': 'Mouth Eww',
}
# Lip-sync gets its own mouth layers in front of the expression mouths
VISEME_LAYERS = {
    'Talk_Closed': 'Mouth Closed', 'Talk_Half': 'Mouth Open Happy Half', 'Talk_Open': 'Mouth Open Happy',
    'Talk_Toothy': 'Mouth toothy', 'Talk_O': 'Mouth O',
}
VISEMES = [  # VRChat order
    ('sil', None), ('pp', 'Talk_Closed'), ('ff', 'Talk_Half'), ('th', 'Talk_Half'),
    ('dd', 'Talk_Half'), ('kk', 'Talk_Half'), ('ch', 'Talk_Toothy'), ('ss', 'Talk_Toothy'),
    ('nn', 'Talk_Half'), ('rr', 'Talk_Half'), ('aa', 'Talk_Open'), ('e', 'Talk_Toothy'),
    ('ih', 'Talk_Half'), ('oh', 'Talk_O'), ('ou', 'Talk_O'),
]
EXPRESSIONS = [  # menu order: name, blendshapes set to 100
    ('Happy', ['Eyes_Raised', 'Mouth_Open']),
    ('Joy', ['Eyes_Happy', 'Mouth_Open']),
    ('Thinking', ['Eyes_LookLeft', 'Mouth_Closed']),
    ('Surprised', ['Eyes_Surprised', 'Mouth_O']),
    ('Embarrassed', ['Eyes_Embarrassed', 'Mouth_Eww', 'Sweat']),
    ('Stern', ['Eyes_Narrow', 'Mouth_Closed']),
    ('Angry', ['Eyes_Angry', 'Mouth_Toothy']),
    ('Smug', ['Eyes_Narrow']),
]
# Offsets (metres, final scale) of each layer group in front of the face
OFF_EXPR, OFF_BLINK, OFF_VISEME = 0.002, 0.004, 0.006


# ── Helpers ───────────────────────────────────────────────────────────────────
def lin2srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def mat_source(mat):
    """(image, extension) for a textured material, or ((r,g,b) sRGB, None) for a flat one."""
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is not None:
        inp = bsdf.inputs['Base Color']
        if inp.is_linked:
            n = inp.links[0].from_node
            if n.type == 'TEX_IMAGE' and n.image:
                return n.image, n.extension
        else:
            return tuple(lin2srgb(c) for c in inp.default_value[:3]), None
    tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image), None)
    if tex:
        return tex.image, tex.extension
    if mat.name == 'Hair':  # EEVEE "Shader to RGB" toon setup; colour from its HSV input
        return tuple(lin2srgb(c) for c in (0.686, 0.194, 0.040)), None
    for n in nt.nodes:
        for i in n.inputs:
            if i.type == 'RGBA' and not i.is_linked:
                return tuple(lin2srgb(c) for c in i.default_value[:3]), None
    return (1, 0, 1), None


def image_array(img):
    """Image pixels as float array [h, w, 4], row 0 = bottom (Blender/UV convention)."""
    w, h = img.size
    a = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)


SRC_TO_FINAL = None  # set once the scale is known


# ── Measure + transform ───────────────────────────────────────────────────────
body_objs = [o for o in D.objects if o.type == 'MESH' and o.parent == SRC_RIG]
deps = bpy.context.evaluated_depsgraph_get()
top = max((o.matrix_world @ v.co).z for o in body_objs for v in o.data.vertices)
SCALE = TARGET_HEIGHT / top
# source faces +X; Unity/VRChat expect Blender -Y forward → rotate -90° about Z
SRC_TO_FINAL = Matrix.Scale(SCALE, 4) @ Matrix.Rotation(math.radians(-90), 4, 'Z')
print(f'source height {top:.3f} → scale {SCALE:.3f}')


def P(v):
    """source world point → final point"""
    return SRC_TO_FINAL @ Vector(v)


def bone_world(name, end='head'):
    b = SRC_RIG.data.bones[name]
    return SRC_RIG.matrix_world @ (b.head_local if end == 'head' else b.tail_local)


# ── Armature ──────────────────────────────────────────────────────────────────
def verts_of(obj_name, mat_names):
    o = D.objects[obj_name]
    idx = [i for i, s in enumerate(o.material_slots) if s.material and s.material.name in mat_names]
    out = []
    for p in o.data.polygons:
        if p.material_index in idx:
            out += [o.matrix_world @ o.data.vertices[v].co for v in p.vertices]
    return out


def wrist(arm_obj, elbow):
    pts = verts_of(arm_obj, {'Skin'})
    d = (bone_world('Arm.L' if arm_obj == 'Arm.L' else 'Arm.R', 'tail') - elbow).normalized()
    t = min((p - elbow).dot(d) for p in pts)
    tmax = max((p - elbow).dot(d) for p in pts)
    return elbow + d * t, elbow + d * tmax


def ankle(leg_obj, knee):
    pts = verts_of(leg_obj, {'boots', 'boots2'})
    ztop = max(p.z for p in pts)
    zbot = min(p.z for p in pts)
    xs = [p.x for p in pts]
    return Vector((knee.x, knee.y, ztop)), Vector((max(xs), knee.y, zbot))  # toe: most forward point


hip_c = bone_world('Spine', 'head')
neck_base = bone_world('Head', 'head')
shoulder_z = bone_world('shoulder.L', 'head').z
src_joints = {
    'Hips': (hip_c, hip_c + Vector((0, 0, 0.03))),
    'Spine': (hip_c + Vector((0, 0, 0.03)), hip_c + Vector((0, 0, 0.09))),
    'Chest': (hip_c + Vector((0, 0, 0.09)), Vector((neck_base.x, neck_base.y, shoulder_z))),
    'Neck': (Vector((neck_base.x, neck_base.y, shoulder_z)), neck_base),
    'Head': (neck_base, neck_base + Vector((0, 0, 0.12))),
}
for side, s in (('Left', 'L'), ('Right', 'R')):
    src_joints[f'{side}Shoulder'] = (bone_world(f'shoulder.{s}'), bone_world(f'shoulder.{s}', 'tail'))
    src_joints[f'{side}UpperArm'] = (bone_world(f'upper_arm.{s}'), bone_world(f'upper_arm.{s}', 'tail'))
    elbow = bone_world(f'Arm.{s}')
    w0, w1 = wrist('Arm.L' if s == 'L' else 'ArmR', elbow)
    src_joints[f'{side}LowerArm'] = (elbow, w0)
    src_joints[f'{side}Hand'] = (w0, w1)
    src_joints[f'{side}UpperLeg'] = (bone_world(f'thigh.{s}'), bone_world(f'thigh.{s}', 'tail'))
    knee = bone_world(f'Leg.{s}')
    a0, toe = ankle(f'Leg.{s}', knee)
    src_joints[f'{side}LowerLeg'] = (knee, a0)
    src_joints[f'{side}Foot'] = (a0, Vector((toe.x, a0.y, toe.z + 0.01)))

PARENT = {
    'Hips': None, 'Spine': 'Hips', 'Chest': 'Spine', 'Neck': 'Chest', 'Head': 'Neck',
    'LeftShoulder': 'Chest', 'LeftUpperArm': 'LeftShoulder', 'LeftLowerArm': 'LeftUpperArm', 'LeftHand': 'LeftLowerArm',
    'RightShoulder': 'Chest', 'RightUpperArm': 'RightShoulder', 'RightLowerArm': 'RightUpperArm', 'RightHand': 'RightLowerArm',
    'LeftUpperLeg': 'Hips', 'LeftLowerLeg': 'LeftUpperLeg', 'LeftFoot': 'LeftLowerLeg',
    'RightUpperLeg': 'Hips', 'RightLowerLeg': 'RightUpperLeg', 'RightFoot': 'RightLowerLeg',
}

arm_data = D.armatures.new('Armature')
ARM = D.objects.new('Armature', arm_data)
bpy.context.scene.collection.objects.link(ARM)
bpy.context.view_layer.objects.active = ARM
bpy.ops.object.mode_set(mode='EDIT')
for name in PARENT:  # dict order = parents first
    h, t = src_joints[name]
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = P(h), P(t)
    if (eb.tail - eb.head).length < 0.01:
        eb.tail = eb.head + Vector((0, 0, 0.02))
    if PARENT[name]:
        eb.parent = arm_data.edit_bones[PARENT[name]]
bpy.ops.object.mode_set(mode='OBJECT')
FINAL_BONE = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm_data.bones}


# ── Atlas tiles ───────────────────────────────────────────────────────────────
class Tile:
    def __init__(self, key, pixels, ext=None):
        self.key, self.px, self.ext = key, pixels, ext
        self.h, self.w = pixels.shape[:2]
        self.x = self.y = 0                  # placed origin (texels, bottom-left)

    def uv(self, u, v):
        """uv inside this tile's own 0..1 space → atlas uv"""
        return ((self.x + u * self.w) / ATLAS_SIZE, (self.y + v * self.h) / ATLAS_SIZE)


tiles = {}


def solid_tile(key, rgb):
    if key not in tiles:
        tiles[key] = Tile(key, np.tile(np.array([*rgb, 1.0], np.float32), (2, 2, 1)))
    return tiles[key]


def image_tile(key, img, nx=1, ny=1, mirror=False):
    k = (key, nx, ny)
    if k in tiles:
        return tiles[k]
    a = image_array(img)
    a[..., 3] = 1.0
    rows = []
    for j in range(ny):
        row = []
        for i in range(nx):
            t = a
            if mirror and i % 2:
                t = t[:, ::-1]
            if mirror and j % 2:
                t = t[::-1]
            row.append(t)
        rows.append(np.concatenate(row, axis=1))
    tiles[k] = Tile(k, np.concatenate(rows, axis=0))
    return tiles[k]


# ── Collect geometry into one bmesh ───────────────────────────────────────────
bm = bmesh.new()
uv_layer = bm.loops.layers.uv.new('UVMap')
bone_layer = bm.verts.layers.int.new('bone')      # index into BONES
group_layer = bm.verts.layers.int.new('group')    # shape-key layer id (0 = always visible)
BONES = list(PARENT)
groups = {0: ('base', None)}                      # id → (shape name, collapse anchor)
face_src = {}                                     # face → (material, uv list in source space)


def new_group(name):
    gid = len(groups)
    groups[gid] = (name, None)
    return gid


def add_face(coords, uvs_src, mat, bone, group=0, normal_hint=None):
    if normal_hint is not None:
        n = (coords[1] - coords[0]).cross(coords[2] - coords[0])
        if n.dot(normal_hint) < 0:
            coords, uvs_src = coords[::-1], uvs_src[::-1]
    vs = []
    for c in coords:
        v = bm.verts.new(c)
        v[bone_layer] = BONES.index(bone)
        v[group_layer] = group
        vs.append(v)
    f = bm.faces.new(vs)
    face_src[f] = (mat, uvs_src)
    return f


_img_cache = {}


def decal_rects(tri_pos, tri_uv, img, mat, bone, group, normal):
    """Turn the opaque texels of a decal triangle into quads (greedy row/column merge)."""
    if img.name not in _img_cache:
        _img_cache[img.name] = image_array(img)
    a = _img_cache[img.name]
    h, w = a.shape[:2]
    (u0, v0), (u1, v1), (u2, v2) = [(u * w, v * h) for u, v in tri_uv]
    det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
    if abs(det) < 1e-9:
        return 0
    p0, p1, p2 = tri_pos

    def to3d(x, y):
        # barycentric of texel-space point → position (affine, extrapolates past edges)
        l1 = ((x - u0) * (v2 - v0) - (u2 - u0) * (y - v0)) / det
        l2 = ((u1 - u0) * (y - v0) - (x - u0) * (v1 - v0)) / det
        return p0 + (p1 - p0) * l1 + (p2 - p0) * l2

    def inside(x, y):
        l1 = ((x - u0) * (v2 - v0) - (u2 - u0) * (y - v0)) / det
        l2 = ((u1 - u0) * (y - v0) - (x - u0) * (v1 - v0)) / det
        return l1 >= -1e-6 and l2 >= -1e-6 and l1 + l2 <= 1 + 1e-6

    i0, i1 = max(0, int(min(u0, u1, u2))), min(w - 1, int(max(u0, u1, u2)))
    j0, j1 = max(0, int(min(v0, v1, v2))), min(h - 1, int(max(v0, v1, v2)))
    runs = {}
    for j in range(j0, j1 + 1):
        row, i = [], i0
        while i <= i1:
            if a[j, i, 3] > 0.5 and inside(i + 0.5, j + 0.5):
                s = i
                while i + 1 <= i1 and a[j, i + 1, 3] > 0.5 and inside(i + 1.5, j + 0.5):
                    i += 1
                row.append((s, i))
            i += 1
        runs[j] = row
    # merge identical runs on consecutive rows into rectangles
    rects, open_ = [], {}
    for j in range(j0, j1 + 2):
        cur = set(runs.get(j, []))
        for span in list(open_):
            if span not in cur:
                rects.append((span[0], open_.pop(span), span[1], j - 1))
        for span in cur:
            open_.setdefault(span, j)
    for (x0, y0, x1, y1) in rects:
        corners = [(x0, y0), (x1 + 1, y0), (x1 + 1, y1 + 1), (x0, y1 + 1)]
        add_face([to3d(x, y) for x, y in corners], [(x / w, y / h) for x, y in corners],
                 mat, bone, group, normal)
    return len(rects)


def ingest(obj, bone_for, xf, group_for=lambda mat: 0, skip_mat=lambda m: False):
    """Copy an object's faces (transformed by xf) into the shared bmesh."""
    me = obj.data
    src = bmesh.new()
    src.from_mesh(me)
    src.transform(xf)
    src.normal_update()
    uvl = src.loops.layers.uv.active
    vert_map = {}
    for f in src.faces:
        mat = obj.material_slots[f.material_index].material if obj.material_slots else None
        mname = mat.name if mat else ''
        if skip_mat(mname):
            continue
        bone = bone_for(mname)
        grp = group_for(mname)
        uvs = [tuple(l[uvl].uv) for l in f.loops]
        if mname in DECAL_MATERIALS:
            img, _ = mat_source(mat)
            tris = [(f.loops[0], f.loops[k], f.loops[k + 1]) for k in range(1, len(f.loops) - 1)]
            for tri in tris:
                decal_rects([l.vert.co.copy() for l in tri], [tuple(l[uvl].uv) for l in tri],
                            img, mat, bone, grp, f.normal.copy())
            continue
        vs = []
        for l in f.loops:
            key = (l.vert.index, bone, grp)
            if key not in vert_map:
                v = bm.verts.new(l.vert.co)
                v[bone_layer] = BONES.index(bone)
                v[group_layer] = grp
                vert_map[key] = v
            vs.append(vert_map[key])
        try:
            nf = bm.faces.new(vs)
        except ValueError:
            continue
        nf.smooth = f.smooth
        face_src[nf] = (mat, uvs)
    src.free()


# Body parts
for o in body_objs:
    bone = PART_BONE[o.name]
    xf = SRC_TO_FINAL @ o.matrix_world
    if o.name == 'Nervous sweat':
        g = new_group('Sweat')
        ingest(o, lambda m: 'Head', xf, group_for=lambda m, g=g: g)
        continue
    ingest(o, lambda m, o=o, bone=bone: SUB_BONE.get((o.name, m), bone), xf)

# Face layers (copies of the head's eye / mouth faces, pushed out along the normals)
head = D.objects['Head']
head_xf = SRC_TO_FINAL @ head.matrix_world


# The head's vertex normals aren't consistently outward, so layers are pushed radially
# out from the head's centre instead.
HEAD_CENTRE = (FINAL_BONE['Head'][0] + FINAL_BONE['Head'][1]) / 2


def face_layer(shape, src_mat_name, base_slots, offset):
    g = new_group(shape)
    hb = bmesh.new()
    hb.from_mesh(head.data)
    hb.transform(head_xf)
    hb.normal_update()
    uvl = hb.loops.layers.uv.active
    vmap = {}
    for f in hb.faces:
        if f.material_index not in base_slots:
            continue
        vs = []
        for l in f.loops:
            if l.vert.index not in vmap:
                v = bm.verts.new(l.vert.co + (l.vert.co - HEAD_CENTRE).normalized() * offset)
                v[bone_layer] = BONES.index('Head')
                v[group_layer] = g
                vmap[l.vert.index] = v
            vs.append(vmap[l.vert.index])
        nf = bm.faces.new(vs)
        nf.smooth = f.smooth
        face_src[nf] = (D.materials[src_mat_name], [tuple(l[uvl].uv) for l in f.loops])
    hb.free()


EYE_SLOTS = {i for i, s in enumerate(head.material_slots) if s.material and s.material.name == 'Eye Open Neutral'}
MOUTH_SLOTS = {i for i, s in enumerate(head.material_slots) if s.material and s.material.name == 'Mouth Neutral V'}
for shape, mat in EYE_LAYERS.items():
    face_layer(shape, mat, EYE_SLOTS, OFF_EXPR)
for shape, mat in MOUTH_LAYERS.items():
    face_layer(shape, mat, MOUTH_SLOTS, OFF_EXPR)
face_layer(BLINK_LAYER[0], BLINK_LAYER[1], EYE_SLOTS, OFF_BLINK)
for k, (shape, mat) in enumerate(VISEME_LAYERS.items()):
    face_layer(shape, mat, MOUTH_SLOTS, OFF_VISEME + k * 0.0004)

# Props in the right hand
hand_h, hand_t = FINAL_BONE['RightHand']
palm = (hand_h + hand_t) / 2
prop_report = {}
for name, cfg in PROPS.items():
    o = D.objects[cfg['obj']]
    g = new_group('Prop_' + name)
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    centre, ext = (lo + hi) / 2, hi - lo
    # local (bbox-normalised) grip point → source world
    grip = centre + Vector([cfg['grip'][i] * ext[i] for i in range(3)])
    # orientation: prop's world X/Z → target axes (source frame)
    X, Z = Vector(cfg['x']).normalized(), Vector(cfg['z']).normalized()
    Y = Z.cross(X)
    R = Matrix((X, Y, Z)).transposed().to_4x4()
    s = cfg['size'] / max(ext) / SCALE   # size is in final metres
    # palm side is -Z in T-pose; push the prop down by half its (rotated) thickness
    rot_ext = [abs((R.to_3x3() @ Vector((ext.x, 0, 0))).z), abs((R.to_3x3() @ Vector((0, ext.y, 0))).z),
               abs((R.to_3x3() @ Vector((0, 0, ext.z))).z)]
    drop = 0.5 * sum(rot_ext) * s * SCALE * 0.6
    xf = (Matrix.Translation(palm - Vector((0, 0, drop))) @ SRC_TO_FINAL.to_3x3().normalized().to_4x4()
          @ Matrix.Scale(s * SCALE, 4) @ R @ Matrix.Translation(-grip) @ o.matrix_world)
    before = len(bm.faces)
    ingest(o, lambda m: 'RightHand', xf, group_for=lambda m, g=g: g)
    prop_report[name] = len(bm.faces) - before

# ── Atlas: create tiles, pack, assign UVs ─────────────────────────────────────
face_tiles = {}
by_mat = {}
for f, (mat, uvs) in face_src.items():
    by_mat.setdefault(mat.name if mat else '', []).append(f)

for mname, faces in by_mat.items():
    mat = D.materials.get(mname)
    src, ext = mat_source(mat) if mat else ((1, 0, 1), None)
    if not isinstance(src, bpy.types.Image):
        t = solid_tile(('solid', mname), src)
        for f in faces:
            face_tiles[f] = (t, [(0.5, 0.5)] * len(f.loops))
        continue
    if mname in DECAL_MATERIALS or ext in ('CLIP', 'EXTEND'):
        t = image_tile(mname, src)
        for f in faces:
            uvs = face_src[f][1]
            if mname not in DECAL_MATERIALS:
                uvs = [(min(max(u, 0), 1), min(max(v, 0), 1)) for u, v in uvs]
            face_tiles[f] = (t, uvs)
        continue
    # REPEAT / MIRROR: shift each face by whole tiles, then pre-tile the texture
    step = 2 if ext == 'MIRROR' else 1
    shifted = {}
    nx = ny = 1
    for f in faces:
        uvs = face_src[f][1]
        su = math.floor(min(u for u, _ in uvs) / step) * step
        sv = math.floor(min(v for _, v in uvs) / step) * step
        s_uvs = [(u - su, v - sv) for u, v in uvs]
        shifted[f] = s_uvs
        nx = max(nx, math.ceil(max(u for u, _ in s_uvs) - 1e-4))
        ny = max(ny, math.ceil(max(v for _, v in s_uvs) - 1e-4))
    t = image_tile(mname, src, nx, ny, mirror=ext == 'MIRROR')
    for f in faces:
        face_tiles[f] = (t, [(u / nx, v / ny) for u, v in shifted[f]])

# shelf-pack (tallest first)
order = sorted(tiles.values(), key=lambda t: (-t.h, -t.w))
x = y = shelf_h = 0
for t in order:
    W, H = t.w + 2 * PAD, t.h + 2 * PAD
    if x + W > ATLAS_SIZE:
        x, y, shelf_h = 0, y + shelf_h, 0
    t.x, t.y = x + PAD, y + PAD
    x += W
    shelf_h = max(shelf_h, H)
assert y + shelf_h <= ATLAS_SIZE, f'atlas overflow: {y + shelf_h} > {ATLAS_SIZE}'

atlas = np.zeros((ATLAS_SIZE, ATLAS_SIZE, 4), np.float32)
for t in tiles.values():
    padded = np.pad(t.px, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
    atlas[t.y - PAD:t.y + t.h + PAD, t.x - PAD:t.x + t.w + PAD] = padded
atlas[..., 3] = 1.0
img = D.images.new('GaiChan_Atlas', ATLAS_SIZE, ATLAS_SIZE, alpha=True)
img.pixels.foreach_set(atlas.ravel())
img.filepath_raw = os.path.join(OUT, 'Textures', 'GaiChan_Atlas.png')
img.file_format = 'PNG'
img.save()

for f, (t, uvs) in face_tiles.items():
    for l, (u, v) in zip(f.loops, uvs):
        l[uv_layer].uv = t.uv(u, v)

# The source model's winding is inconsistent (most body parts face inward; it was authored
# with double-sided materials). VRChat's mobile shaders always cull back faces, so make the
# mesh double-sided in geometry: every face gets a reversed twin on its own vertices.
dup = {}
for f in list(bm.faces):
    vs = []
    for v in f.verts:
        if v not in dup:
            nv = bm.verts.new(v.co)
            nv[bone_layer] = v[bone_layer]
            nv[group_layer] = v[group_layer]
            dup[v] = nv
        vs.append(dup[v])
    uvs = [tuple(l[uv_layer].uv) for l in f.loops]
    nf = bm.faces.new(vs[::-1])
    nf.smooth = f.smooth
    for l, uv in zip(nf.loops, uvs[::-1]):
        l[uv_layer].uv = uv

# ── Mesh object, weights, shape keys ──────────────────────────────────────────
me = D.meshes.new('Body')
bm.to_mesh(me)
bm.free()
BODY = D.objects.new('Body', me)
bpy.context.scene.collection.objects.link(BODY)

bone_attr = [0] * len(me.vertices)
me.attributes['bone'].data.foreach_get('value', bone_attr)
group_attr = [0] * len(me.vertices)
me.attributes['group'].data.foreach_get('value', group_attr)
for b in BONES:
    BODY.vertex_groups.new(name=b)
for vi, bi in enumerate(bone_attr):
    BODY.vertex_groups[bi].add([vi], 1.0, 'REPLACE')
me.attributes.remove(me.attributes['bone'])

mat = D.materials.new('GaiChan')
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
tex = nt.nodes.new('ShaderNodeTexImage')
tex.image = img
tex.interpolation = 'Closest'
emit = nt.nodes.new('ShaderNodeEmission')
outn = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tex.outputs['Color'], emit.inputs['Color'])
nt.links.new(emit.outputs['Emission'], outn.inputs['Surface'])
me.materials.append(mat)

# group → vertex indices
members = {}
for vi, g in enumerate(group_attr):
    members.setdefault(g, []).append(vi)
me.attributes.remove(me.attributes['group'])

expanded = {vi: me.vertices[vi].co.copy() for g, vs in members.items() if g for vi in vs}
head_centre = (Vector(FINAL_BONE['Head'][0]) + Vector(FINAL_BONE['Head'][1])) / 2
collapsed = {}
for g, vs in members.items():
    if not g:
        continue
    c = sum((me.vertices[v].co for v in vs), Vector()) / len(vs)
    name = groups[g][0]
    if name.startswith('Prop_'):
        anchor = palm                                 # shrink into the palm
    else:
        anchor = c + (head_centre - c).normalized() * 0.02   # tuck behind the face/skin
    for v in vs:
        collapsed[v] = anchor
for v, co in collapsed.items():
    me.vertices[v].co = co

BODY.shape_key_add(name='Basis', from_mix=False)


def add_shape(name, group_names):
    sk = BODY.shape_key_add(name=name, from_mix=False)
    for g, vs in members.items():
        if g and groups[g][0] in group_names:
            for v in vs:
                sk.data[v].co = expanded[v]
    return sk


for g, (name, _) in groups.items():
    if g:
        add_shape(name, {name})
for vis, layer in VISEMES:
    sk = add_shape('vrc.v_' + vis, {layer} if layer else set())
    if layer is None:  # keep 'sil' non-empty so the FBX exporter doesn't drop it
        sk.data[0].co = sk.data[0].co + Vector((0, 0, 1e-5))

# Hide-able layer geometry should not affect normals of the base; smooth-shade everything
for p in me.polygons:
    p.use_smooth = True

# Not parented to the armature, so Unity gets "Armature" and "Body" as siblings (path "Body")
mod = BODY.modifiers.new('Armature', 'ARMATURE')
mod.object = ARM

# ── Report + export ───────────────────────────────────────────────────────────
base_tris = sum(len(p.vertices) - 2 for p in me.polygons)
print(f'verts {len(me.vertices)}  tris {base_tris}  shape keys {len(me.shape_keys.key_blocks)}')
print('props (faces):', prop_report)
print('atlas tiles:', len(tiles))

# Avatar data for the Unity setup script. Blender → Unity: (x, y, z) → (-x, z, -y)
hb = bmesh.new()
hb.from_mesh(head.data)
hb.transform(head_xf)
eyes = [v.co for f in hb.faces if f.material_index in EYE_SLOTS for v in f.verts]
hb.free()
eye_c = sum(eyes, Vector()) / len(eyes)
eye_front = min(p.y for p in eyes)           # forward is -Y
view = Vector((eye_c.x, eye_front - 0.02, eye_c.z))
data = {
    'viewPosition': [-view.x, view.z, -view.y],
    'visemes': ['vrc.v_' + v for v, _ in VISEMES],
    'blink': 'Blink',
    'expressions': [{'name': n, 'shapes': s} for n, s in EXPRESSIONS],
    'props': list(PROPS),
    'faceShapes': list(EYE_LAYERS) + list(MOUTH_LAYERS) + ['Sweat'],
    'humanBones': BONES,
    'triangles': base_tris,
    'height': TARGET_HEIGHT,
}
with open(os.path.join(OUT, 'gaichan_avatar.json'), 'w') as f:
    json.dump(data, f, indent=2)

# Remove the source scene, keep only the new avatar
for o in list(D.objects):
    if o not in (ARM, BODY):
        D.objects.remove(o, do_unlink=True)

bpy.ops.object.select_all(action='DESELECT')
ARM.select_set(True)
BODY.select_set(True)
bpy.context.view_layer.objects.active = ARM
fbx = os.path.join(OUT, 'GaiChan.fbx')
bpy.ops.export_scene.fbx(
    filepath=fbx,
    use_selection=True,
    object_types={'ARMATURE', 'MESH'},
    apply_unit_scale=True,
    apply_scale_options='FBX_SCALE_ALL',
    axis_forward='-Z',
    axis_up='Y',
    bake_space_transform=True,
    use_mesh_modifiers=False,
    mesh_smooth_type='FACE',
    add_leaf_bones=False,
    primary_bone_axis='Y',
    secondary_bone_axis='X',
    armature_nodetype='NULL',
    bake_anim=False,
    path_mode='STRIP',
)
print('wrote', fbx, os.path.getsize(fbx), 'bytes')

if '--preview-glb' in sys.argv:   # dev preview only (dev/vrchat-preview.html); not used by VRChat
    bpy.ops.export_scene.gltf(filepath=sys.argv[sys.argv.index('--preview-glb') + 1], export_format='GLB',
                              use_selection=True, export_morph=True, export_skins=True, export_animations=False,
                              export_yup=True)

if '--save-blend' in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(REPO, 'media', 'gaichan', 'GaiChan_VRChat.blend'))
