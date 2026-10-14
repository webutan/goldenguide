"""
Export the Gai-chan 3D model (media/gaichan/Gaichan1.blend) for the website.

Produces:
  public/gaichan/model/gaichan.glb          rig + body meshes + props + pose clips
  public/gaichan/model/face/<name>.png      swappable eye / mouth textures

Run (needs Blender 4.x+/bpy; headless is fine):
  blender -b media/gaichan/Gaichan1.blend -P scripts/blender/export_gaichan.py
  # or with the pip `bpy` module:
  python scripts/blender/export_gaichan.py media/gaichan/Gaichan1.blend

What it does to the (in-memory) scene before exporting — the .blend is never saved:
  * removes lights, camera, fence and the "Face storage" swatch object
  * gives the head's eye/mouth slots stable material names (Face.EyeA/B, Face.Mouth)
    so the web runtime can swap textures on them
  * replaces the EEVEE-only "Shader to RGB" hair material with a plain colour
  * authors one action per VN pose (idle, think, surprised, wave, point, shy,
    present, hips) and exports each as a glTF animation clip

To add/adjust a pose, edit POSES below (or author an action named "pose.<name>"
by hand in Blender — any action with that prefix is exported too).
"""
import os
import sys
from math import radians

import bpy
from mathutils import Matrix, Vector

# ── Paths ─────────────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
if argv and argv[0].endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(argv[0]))

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(REPO, 'public', 'gaichan', 'model')
FACE_DIR = os.path.join(OUT_DIR, 'face')
os.makedirs(FACE_DIR, exist_ok=True)

D = bpy.data
RIG = D.objects['Gai chan']
HEAD = D.objects['Head']

# ── Face textures ─────────────────────────────────────────────────────────────
# material name in the .blend → file name used by the web runtime
FACE_TEXTURES = {
    'Eye Open Neutral':           'eyes-neutral',
    'Eye eyebrow raised neutral': 'eyes-raised',
    'Eye narrowed':               'eyes-narrow',
    'Eye Angry':                  'eyes-angry',
    'Eye Emberrased':             'eyes-embarrassed',
    'Eyes Surprised':             'eyes-surprised',
    'Eyes closed upper':          'eyes-closed',
    'Eyes closed Downer':         'eyes-happy',
    'Eyes look left':             'eyes-look-left',
    'Eyes look Right':            'eyes-look-right',
    'Mouth Neutral V':            'mouth-neutral',
    'Mouth Closed':               'mouth-closed',
    'Mouth Open Happy':           'mouth-open',
    'Mouth Open Happy Half':      'mouth-half',
    'Mouth O':                    'mouth-o',
    'Mouth toothy':               'mouth-toothy',
    'Mouth Eww':                  'mouth-eww',
}

for mat_name, slug in FACE_TEXTURES.items():
    mat = D.materials[mat_name]
    tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)
    img = tex.image
    path = os.path.join(FACE_DIR, slug + '.png')
    if img.packed_file:
        with open(path, 'wb') as f:
            f.write(img.packed_file.data)
    else:
        img.save(filepath=path)
print(f'wrote {len(FACE_TEXTURES)} face textures → {FACE_DIR}')

# Stable, unique names for the head's face slots (1/2 = eye halves, 3 = mouth)
for slot_idx, new_name in ((1, 'Face.EyeA'), (2, 'Face.EyeB'), (3, 'Face.Mouth')):
    slot = HEAD.material_slots[slot_idx]
    m = slot.material.copy()
    m.name = new_name
    slot.material = m

# Hair uses Shader-to-RGB (EEVEE only, not representable in glTF) → flat colour
hair = D.materials['Hair']
nt = hair.node_tree
nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial')
bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.686, 0.194, 0.040, 1.0)
bsdf.inputs['Roughness'].default_value = 1.0
nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

# Every material output in the .blend targets EEVEE only, which the glTF exporter
# ignores (→ blank materials). Retarget them to All.
for m in D.materials:
    if m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'OUTPUT_MATERIAL':
                n.target = 'ALL'

# ── Scene cleanup ─────────────────────────────────────────────────────────────
for o in list(D.objects):
    if o.type in {'LIGHT', 'CAMERA'} or o.name in {'Fence', 'Face storage'}:
        D.objects.remove(o, do_unlink=True)

for o in D.objects:
    o.hide_set(False)
    o.hide_render = False
    o.hide_viewport = False

# ── Poses ─────────────────────────────────────────────────────────────────────
# View space (= world space of the .blend, camera looking down -X):
#   +X = towards the viewer, +Y = screen right, +Z = up.
# Her right arm (.R) is on screen-left (-Y), her left arm (.L) on screen-right (+Y).
# Each entry aims a bone (head→tail) along a direction; 'Head' takes
# (axis, degrees) rotations: X = roll/tilt, Y = nod (+ down), Z = turn (+ to screen left).
# The rig object is rotated 180° in the .blend, so these are converted to armature
# space in aim()/rotate_about_head().
IDLE_ARMS = {
    'upper_arm.L': (0.10,  0.30, -1.0), 'Arm.L': (0.30,  0.12, -1.0),
    'upper_arm.R': (0.10, -0.30, -1.0), 'Arm.R': (0.30, -0.12, -1.0),
}


POSES = {
    'idle': {**IDLE_ARMS},
    'think': {
        **IDLE_ARMS,
        'upper_arm.R': (0.45, -0.20, -1.0), 'Arm.R': (0.55,  0.45, 1.0),
        'Head': [('X', -8), ('Y', 6)],
    },
    'surprised': {
        'upper_arm.L': (0.25,   1.0, -0.55), 'Arm.L': (0.35,  0.25, 1.0),
        'upper_arm.R': (0.25,  -1.0, -0.55), 'Arm.R': (0.35, -0.25, 1.0),
        'Head': [('Y', -5)],
    },
    'wave': {
        **IDLE_ARMS,
        'upper_arm.R': (0.15,  -1.0, 0.15), 'Arm.R': (0.10, -0.25, 1.0),
        'Head': [('X', 6)],
    },
    'point': {
        **IDLE_ARMS,
        'upper_arm.R': (0.55, -0.55, -0.35), 'Arm.R': (1.0,   0.0, 0.35),
        'Head': [('X', -4)],
    },
    'shy': {
        'upper_arm.L': (0.30,  0.12, -1.0), 'Arm.L': (0.75, -0.60, -0.30),
        'upper_arm.R': (0.30, -0.12, -1.0), 'Arm.R': (0.75,  0.60, -0.30),
        'Head': [('Y', 10), ('X', 8)],
    },
    'present': {
        **IDLE_ARMS,
        'upper_arm.R': (0.45, -0.30, -1.0), 'Arm.R': (1.0,  0.15, 0.20),
    },
    'hips': {
        'upper_arm.L': (-0.15,  0.80, -1.0), 'Arm.L': (0.25, -0.75, -0.45),
        'upper_arm.R': (-0.15, -0.80, -1.0), 'Arm.R': (0.25,  0.75, -0.45),
        'Head': [('Y', -6)],
    },
}

# Looping clips: pose name → list of (frame, overrides)
LOOPS = {
    'wave': [
        (1,  {'Arm.R': (0.10, -0.55, 1.0)}),
        (7,  {'Arm.R': (0.10,  0.15, 1.0)}),
        (13, {'Arm.R': (0.10, -0.55, 1.0)}),
    ],
}

AIM_ORDER = ['upper_arm.L', 'Arm.L', 'upper_arm.R', 'Arm.R']
# Bones the poses move. Every clip keys all of them so cross-fades between any two
# poses blend every bone (the exporter samples the rest of the rig as well).
KEY_BONES = ['Head', *AIM_ORDER]


def update():
    bpy.context.view_layer.update()


VIEW_TO_ARM = RIG.matrix_world.to_3x3().normalized().inverted()


def rotate_about_head(pb, rot3):
    """Rotate a pose bone about its own head (rot3 is in armature space)."""
    update()
    M = pb.matrix.copy()
    h = M.translation.copy()
    pb.matrix = Matrix.Translation(h) @ rot3.to_4x4() @ Matrix.Translation(-h) @ M
    update()


def aim(pb, direction):
    update()
    cur = (pb.tail - pb.head).normalized()
    target = (VIEW_TO_ARM @ Vector(direction)).normalized()
    rotate_about_head(pb, cur.rotation_difference(target).to_matrix())


def apply_pose(spec):
    for pb in RIG.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    update()
    for axis, deg in spec.get('Head', []):
        axis_v = VIEW_TO_ARM @ Vector({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[axis])
        rotate_about_head(RIG.pose.bones['Head'], Matrix.Rotation(radians(deg), 3, axis_v))
    for name in AIM_ORDER:
        if name in spec:
            aim(RIG.pose.bones[name], spec[name])


def key_all(frame):
    for name in KEY_BONES:
        RIG.pose.bones[name].keyframe_insert('rotation_quaternion', frame=frame)


bpy.context.view_layer.objects.active = RIG
RIG.animation_data_create()
for name in POSES:   # regenerate ours; hand-authored pose.* actions are kept
    if ('pose.' + name) in D.actions:
        D.actions.remove(D.actions['pose.' + name])

made = []
for name, spec in POSES.items():
    act = D.actions.new('pose.' + name)
    act.use_fake_user = True
    RIG.animation_data.action = act
    if name in LOOPS:
        for frame, overrides in LOOPS[name]:
            apply_pose({**spec, **overrides})
            key_all(frame)
    else:
        apply_pose(spec)
        key_all(1)
        key_all(2)  # two keys so exporters keep it as a (static) clip
    made.append(act.name)

# Push every action onto its own NLA track so the exporter emits them all
RIG.animation_data.action = None
for t in list(RIG.animation_data.nla_tracks):
    RIG.animation_data.nla_tracks.remove(t)
for act in [a for a in D.actions if a.name.startswith('pose.')]:
    track = RIG.animation_data.nla_tracks.new()
    track.name = act.name
    track.strips.new(act.name, int(act.frame_range[0]), act)
    track.mute = True

apply_pose(POSES['idle'])
print('poses:', made)

# ── Export ────────────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='DESELECT')
for o in D.objects:
    if o.type in {'MESH', 'ARMATURE'}:
        o.select_set(True)

glb = os.path.join(OUT_DIR, 'gaichan.glb')
bpy.ops.export_scene.gltf(
    filepath=glb,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=False,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_anim_single_armature=True,
    export_force_sampling=True,
    export_cameras=False,
    export_lights=False,
    export_rest_position_armature=True,
)
print('wrote', glb, os.path.getsize(glb), 'bytes')
