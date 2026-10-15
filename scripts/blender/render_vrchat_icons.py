"""
Render the expression-menu icons for the VRChat Gai-chan from the exported FBX.
Run after export_vrchat.py (needs EEVEE, i.e. a normal Blender install):

  blender -b -P scripts/blender/render_vrchat_icons.py
"""
import json
import math
import os
import sys

import bpy  # noqa: F401  (before mathutils with the pip `bpy` module)
from mathutils import Euler, Matrix, Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ROOT = os.path.join(REPO, 'vrchat', 'GaiChan')
ICONS = os.path.join(ROOT, 'Icons')
os.makedirs(ICONS, exist_ok=True)
data = json.load(open(os.path.join(ROOT, 'gaichan_avatar.json')))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(ROOT, 'GaiChan.fbx'))
body = next(o for o in bpy.data.objects if o.type == 'MESH')
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')

img = bpy.data.images.load(os.path.join(ROOT, 'Textures', 'GaiChan_Atlas.png'))
mat = bpy.data.materials.new('Icon')
nt = mat.node_tree if mat.node_tree else None
if nt is None:
    mat.use_nodes = True
    nt = mat.node_tree
nt.nodes.clear()
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Closest'
diff = nt.nodes.new('ShaderNodeBsdfDiffuse'); emit = nt.nodes.new('ShaderNodeEmission'); add = nt.nodes.new('ShaderNodeAddShader')
out = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tex.outputs[0], diff.inputs[0]); nt.links.new(tex.outputs[0], emit.inputs[0]); emit.inputs[1].default_value = 0.6
nt.links.new(diff.outputs[0], add.inputs[0]); nt.links.new(emit.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out.inputs[0])
body.data.materials.clear(); body.data.materials.append(mat)

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = sc.render.resolution_y = 256
sc.render.film_transparent = True
sun = bpy.data.objects.new('Sun', bpy.data.lights.new('Sun', 'SUN'))
sun.data.energy = 2.5; sun.rotation_euler = Euler((math.radians(50), 0, math.radians(-30)))
sc.collection.objects.link(sun)
cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam')); cam.data.type = 'ORTHO'
sc.collection.objects.link(cam); sc.camera = cam
keys = body.data.shape_keys.key_blocks


def set_keys(names):
    for k in keys:
        k.value = 1.0 if k.name in names else 0.0


def look(target, scale, frm=(0, -3, 0)):
    cam.location = target + Vector(frm)
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale


def shot(name):
    sc.render.filepath = os.path.join(ICONS, name + '.png')
    bpy.ops.render.render(write_still=True)


head = arm.matrix_world @ arm.data.bones['Head'].head_local
face = head + Vector((0, 0, 0.16))
for e in data['expressions']:
    set_keys(e['shapes']); look(face, 0.5); shot('Face_' + e['name'])

# props: render each prop on its own (its vertices only), stood upright
import bmesh  # noqa: E402

set_keys(set())
body.hide_render = True
for p in data['props']:
    kb = keys['Prop_' + p]
    basis = keys['Basis']
    moved = {i for i in range(len(kb.data)) if (kb.data[i].co - basis.data[i].co).length > 1e-7}
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    for i, v in enumerate(bm.verts):
        v.co = kb.data[i].co
    bmesh.ops.delete(bm, geom=[v for i, v in enumerate(bm.verts) if i not in moved], context='VERTS')
    me = bpy.data.meshes.new('icon_' + p)
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(mat)
    ob = bpy.data.objects.new('icon_' + p, me)
    sc.collection.objects.link(ob)
    ob.matrix_world = body.matrix_world
    ob.shape_key_clear() if me.shape_keys else None
    # held items point "up" along her forward axis (-Y) in T-pose → stand them up
    ob.matrix_world = Matrix.Rotation(math.radians(-90), 4, 'X') @ ob.matrix_world
    bpy.context.view_layer.update()
    pts = [ob.matrix_world @ v.co for v in me.vertices]
    lo = Vector([min(q[i] for q in pts) for i in range(3)])
    hi = Vector([max(q[i] for q in pts) for i in range(3)])
    c = (lo + hi) / 2
    ext = hi - lo
    thin = min(range(3), key=lambda i: ext[i])
    if ext[thin] < 0.2 * max(ext):          # flat/thin items (note, cigarette): face-on
        d = Vector((0, 0, 0)); d[thin] = -3.0
        d += Vector((-0.6, -0.6, 0.6)) - Vector([(-0.6, -0.6, 0.6)[i] if i == thin else 0 for i in range(3)])
        look(c, max(ext) * 1.25, frm=tuple(d))
    else:
        look(c, max(ext) * 1.35, frm=(-2.2, -2.2, 1.3))
    shot('Prop_' + p)
    bpy.data.objects.remove(ob)
body.hide_render = False
set_keys(set())
print('icons →', ICONS)
