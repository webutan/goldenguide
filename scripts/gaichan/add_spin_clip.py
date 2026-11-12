#!/usr/bin/env python3
"""
Add (or replace) the "pose.spin" animation clip in public/gaichan/model/gaichan.glb:
Gai-chan reaching up to the rim of the roulette wheel at her right hand and
pulling it down, over and over (Roulette.exe, see src/gaichan3d/RouletteWheel.js).

Only the animation is touched. Meshes, materials, textures, the skeleton and the
other clips stay byte-for-byte what they were: the new keyframes are appended to
the end of the binary chunk and one entry is added to "animations". The script
checks that before it writes.

  python3 scripts/gaichan/add_spin_clip.py            # edit the .glb in place
  python3 scripts/gaichan/add_spin_clip.py --check    # verify the maths only

Why not Blender: the clip is authored against the skeleton that is already in
the .glb, so it needs no .blend (the source file is not in git) and no export
that could change the model. scripts/blender/export_gaichan.py has the same
motion as keyed poses (LOOPS['spin']) so a later re-export keeps it; this
script prints those keys with --keys.

The hand path is solved with two-bone IK in the web stage's coordinates
(+x towards the viewer, +y up, +z screen left) and sampled on every frame.
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

GLB = Path(__file__).resolve().parents[2] / 'public' / 'gaichan' / 'model' / 'gaichan.glb'
CLIP = 'pose.spin'
TEMPLATE = 'pose.idle'      # every bone the spin does not move keeps its idle pose
FPS = 24
FRAMES = 20                 # loop length; frame FRAMES + 1 repeats frame 1

# The wheel, as placed by RouletteWheel.js (keep in step with CENTRE / RADIUS there)
WHEEL_Y, WHEEL_Z, WHEEL_R = 0.5, 0.31, 0.165
HAND_X = 0.035              # the hand travels just in front of the wheel face
FOREARM = 0.092             # Arm.R bone length (HAND_TIP in GaiChanStage.js)

# Hand path. On the rim a point is given by its angle seen from the wheel's
# centre: 0 deg = the point nearest her, positive = up. She takes the rim high
# on her side, pulls it down, lets go, and brings the hand back up clear of it.
#   (frame, position)   position = ('rim', degrees) or (x, y, z)
PATH = [
    (1,  ('rim', 52)),            # hand on the rim, up high
    (3,  ('rim', 34)),
    (5,  ('rim', 4)),             # the pull
    (7,  ('rim', -30)),           # let go at the bottom of the stroke
    (9,  (0.060, 0.385, 0.120)),  # follow through, down and in towards her hip
    (12, (0.095, 0.430, 0.085)),  # hand comes back up in front of her...
    (15, (0.100, 0.540, 0.095)),
    (18, (0.070, 0.625, 0.150)),  # ...and over to the rim again
    (21, ('rim', 52)),
]
# Which way the elbow bends (it is pushed towards this direction)
ELBOW_POLE = np.array([-0.25, -1.0, -0.55])
# Head: (view axis, degrees) as in export_gaichan.py. She watches the wheel.
HEAD = [('Z', 10), ('X', 5)]
# Idle arm directions in the .blend's view space, for the arm that stays down
VIEW_AXES = {'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}


# ── quaternions (x, y, z, w), as glTF stores them ────────────────────────────
def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array([
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ])


def qinv(q):
    return np.array([-q[0], -q[1], -q[2], q[3]])


def qrot(q, v):
    return qmul(qmul(q, np.array([*v, 0.0])), qinv(q))[:3]


def qnorm(q):
    return q / np.linalg.norm(q)


def q_axis_angle(axis, degrees):
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    h = np.radians(degrees) / 2
    return np.array([*(axis * np.sin(h)), np.cos(h)])


def q_between(a, b):
    """Shortest rotation taking direction a to direction b."""
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    d = float(np.dot(a, b))
    if d < -0.999999:
        axis = np.cross(a, [1, 0, 0])
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, [0, 1, 0])
        return q_axis_angle(axis, 180)
    return qnorm(np.array([*np.cross(a, b), 1 + d]))


def view_to_world(v):
    """.blend view space (+X viewer, +Y screen right, +Z up) to glTF/stage space."""
    x, y, z = v
    return np.array([x, z, -y], float)


# ── the .glb ─────────────────────────────────────────────────────────────────
class Glb:
    def __init__(self, path):
        data = Path(path).read_bytes()
        magic, version, _ = struct.unpack('<4sII', data[:12])
        assert magic == b'glTF' and version == 2, 'not a glTF 2 binary'
        jlen, jtype = struct.unpack('<I4s', data[12:20])
        assert jtype == b'JSON'
        self.json = json.loads(data[20:20 + jlen])
        blen, btype = struct.unpack('<I4s', data[20 + jlen:28 + jlen])
        assert btype == b'BIN\x00'
        # the chunk may be padded past the buffer's own length
        self.bin = bytearray(data[28 + jlen:28 + jlen + blen][:self.json['buffers'][0]['byteLength']])
        assert len(self.json['buffers']) == 1

    def floats(self, accessor_index):
        a = self.json['accessors'][accessor_index]
        v = self.json['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(bytes(self.bin), '<f4', a['count'] * n, off).reshape(a['count'], n).astype(float)

    def add_floats(self, array, kind):
        """Append float data as a new bufferView + accessor; returns the accessor index."""
        array = np.asarray(array, '<f4')
        while len(self.bin) % 4:
            self.bin.append(0)
        view = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': array.nbytes}
        self.bin.extend(array.tobytes())
        self.json['bufferViews'].append(view)
        acc = {'bufferView': len(self.json['bufferViews']) - 1, 'componentType': 5126,
               'count': int(array.shape[0]), 'type': kind}
        if kind == 'SCALAR':   # glTF requires min/max on animation inputs
            acc['min'] = [float(array.min())]
            acc['max'] = [float(array.max())]
        self.json['accessors'].append(acc)
        return len(self.json['accessors']) - 1

    def write(self, path):
        self.json['buffers'][0]['byteLength'] = len(self.bin)
        js = json.dumps(self.json, separators=(',', ':')).encode()
        js += b' ' * (-len(js) % 4)
        bn = bytes(self.bin) + b'\x00' * (-len(self.bin) % 4)
        total = 12 + 8 + len(js) + 8 + len(bn)
        Path(path).write_bytes(
            struct.pack('<4sII', b'glTF', 2, total)
            + struct.pack('<I4s', len(js), b'JSON') + js
            + struct.pack('<I4s', len(bn), b'BIN\x00') + bn)


class Skeleton:
    """The rig's bone nodes, posed from rest. Bones run along their local +Y."""
    def __init__(self, gltf):
        self.nodes = gltf['nodes']
        self.parent = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []):
                self.parent[c] = i
        # bone nodes only (a mesh node can share a bone's name)
        joints = set(gltf['skins'][0]['joints'])
        self.index = {self.nodes[i]['name']: i for i in joints}
        self.reset()

    def reset(self):
        self.local = {i: np.array(n.get('rotation', [0, 0, 0, 1]), float) for i, n in enumerate(self.nodes)}

    def world_rot(self, i):
        q = self.local[i]
        while i in self.parent:
            i = self.parent[i]
            q = qmul(self.local[i], q)
        return q

    def world_pos(self, i):
        """World position of a node's origin (rig scales are 1 to float precision)."""
        p = np.array(self.nodes[i].get('translation', [0, 0, 0]), float)
        while i in self.parent:
            i = self.parent[i]
            p = np.array(self.nodes[i].get('translation', [0, 0, 0]), float) + qrot(self.local[i], p)
        return p

    def rotate_world(self, name, q_world):
        """Turn a bone about its own head by a world-space rotation."""
        i = self.index[name]
        parent_world = self.world_rot(self.parent[i])
        new_world = qmul(q_world, self.world_rot(i))
        self.local[i] = qnorm(qmul(qinv(parent_world), new_world))

    def aim(self, name, direction):
        """Point a bone (head to tail) along a world direction, by the shortest turn."""
        cur = qrot(self.world_rot(self.index[name]), [0, 1, 0])
        self.rotate_world(name, q_between(cur, np.asarray(direction, float)))


def idle_arms(sk):
    """The idle arm pose, exactly as export_gaichan.py builds it."""
    for name, d in (('upper_arm.L', (0.10, 0.30, -1.0)), ('Arm.L', (0.30, 0.12, -1.0)),
                    ('upper_arm.R', (0.10, -0.30, -1.0)), ('Arm.R', (0.30, -0.12, -1.0))):
        sk.aim(name, view_to_world(d))


def rim(degrees):
    a = np.radians(degrees)
    return np.array([HAND_X, WHEEL_Y + WHEEL_R * np.sin(a), WHEEL_Z - WHEEL_R * np.cos(a)])


def hand_path():
    """Hand position on every frame 1..FRAMES+1: a closed Catmull-Rom curve through PATH."""
    keys = [(f, rim(p[1]) if p[0] == 'rim' else np.array(p, float)) for f, p in PATH]
    assert keys[0][0] == 1 and keys[-1][0] == FRAMES + 1
    pts = [p for _, p in keys[:-1]]          # the last key repeats the first
    frames = [f for f, _ in keys]
    out = []
    for frame in range(1, FRAMES + 2):
        seg = max(i for i in range(len(frames) - 1) if frames[i] <= frame) if frame <= FRAMES else 0
        if frame == FRAMES + 1:
            out.append(pts[0])
            continue
        u = (frame - frames[seg]) / (frames[seg + 1] - frames[seg])
        p0, p1, p2, p3 = (pts[(seg + k) % len(pts)] for k in (-1, 0, 1, 2))
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out


def solve_arm(sk, target):
    """Two-bone IK for the right arm: put the hand (forearm tip) on `target`."""
    upper, fore = sk.index['upper_arm.R'], sk.index['Arm.R']
    shoulder = sk.world_pos(upper)
    a = np.linalg.norm(np.array(sk.nodes[fore]['translation'], float))   # upper arm length
    b = FOREARM
    to = target - shoulder
    dist = np.linalg.norm(to)
    reach = min(dist, (a + b) * 0.999)       # out of reach: stretch towards it
    n = to / dist
    # elbow: on the circle around the shoulder-hand line, on the pole's side
    along = (a * a - b * b + reach * reach) / (2 * reach)
    radius = np.sqrt(max(a * a - along * along, 0.0))
    side = ELBOW_POLE - n * np.dot(ELBOW_POLE, n)
    side /= np.linalg.norm(side)
    elbow = shoulder + n * along + side * radius
    sk.aim('upper_arm.R', elbow - shoulder)
    sk.aim('Arm.R', shoulder + n * reach - elbow)
    return dist <= a + b


def build_clip(sk):
    """Per-frame local rotations for the bones the clip animates."""
    tracks = {name: [] for name in ('Head', 'upper_arm.L', 'Arm.L', 'upper_arm.R', 'Arm.R')}
    reachable = True
    for target in hand_path():
        sk.reset()
        for axis, deg in HEAD:
            sk.rotate_world('Head', q_axis_angle(view_to_world(VIEW_AXES[axis]), deg))
        idle_arms(sk)
        reachable &= solve_arm(sk, target)
        for name in tracks:
            tracks[name].append(sk.local[sk.index[name]].copy())
    # keep each track on one side of the quaternion double cover so it interpolates the short way
    for qs in tracks.values():
        for i in range(1, len(qs)):
            if np.dot(qs[i], qs[i - 1]) < 0:
                qs[i] = -qs[i]
    return tracks, reachable


def check_against_idle(glb, sk):
    """The aim maths must reproduce the idle pose Blender exported, or nothing here can be trusted."""
    idle = next(a for a in glb.json['animations'] if a['name'] == TEMPLATE)
    sk.reset()
    idle_arms(sk)
    worst = 0.0
    for ch in idle['channels']:
        name = glb.json['nodes'][ch['target']['node']]['name']
        if ch['target']['path'] != 'rotation' or name not in ('upper_arm.L', 'Arm.L', 'upper_arm.R', 'Arm.R'):
            continue
        want = glb.floats(idle['samplers'][ch['sampler']]['output'])[0]
        got = sk.local[sk.index[name]]
        worst = max(worst, min(np.abs(want - got).max(), np.abs(want + got).max()))
    return worst


def remove_clip(glb):
    """Take an earlier pose.spin back out, with the data it appended, so a re-run does not grow the file."""
    j = glb.json
    old = next((a for a in j['animations'] if a['name'] == CLIP), None)
    if not old:
        return
    j['animations'].remove(old)
    others = {s[k] for a in j['animations'] for s in a['samplers'] for k in ('input', 'output')}
    mine = sorted({s[k] for s in old['samplers'] for k in ('input', 'output')} - others)
    # its accessors and views are the tail of both lists, and its bytes the tail of the buffer
    assert mine == list(range(len(j['accessors']) - len(mine), len(j['accessors'])))
    views = sorted(j['accessors'][i]['bufferView'] for i in mine)
    assert views == list(range(len(j['bufferViews']) - len(views), len(j['bufferViews'])))
    end = j['bufferViews'][views[0]]['byteOffset']
    del j['accessors'][mine[0]:]
    del j['bufferViews'][views[0]:]
    del glb.bin[end:]
    j['buffers'][0]['byteLength'] = len(glb.bin)


def main():
    glb = Glb(GLB)
    sk = Skeleton(glb.json)
    err = check_against_idle(glb, sk)
    print(f'idle pose reproduced to within {err:.5f}')
    assert err < 2e-3, 'aim maths does not match the exported idle pose'

    tracks, reachable = build_clip(sk)
    print('hand path reachable on every frame:', reachable)

    if '--keys' in sys.argv:
        # the same motion as aim directions in the .blend's view space, for export_gaichan.py
        for frame in range(1, FRAMES + 2, 2):
            sk.reset()
            sk.local[sk.index['upper_arm.R']] = tracks['upper_arm.R'][frame - 1]
            sk.local[sk.index['Arm.R']] = tracks['Arm.R'][frame - 1]
            dirs = []
            for name in ('upper_arm.R', 'Arm.R'):
                x, y, z = qrot(sk.world_rot(sk.index[name]), [0, 1, 0])
                dirs.append(f"'{name}': ({x:.2f}, {-z:.2f}, {y:.2f})")
            print(f"        ({frame}, {{{', '.join(dirs)}}}),")
        return
    if '--check' in sys.argv:
        return

    remove_clip(glb)
    before = json.loads(json.dumps(glb.json))
    bin_before = bytes(glb.bin)
    template = next(a for a in glb.json['animations'] if a['name'] == TEMPLATE)

    times = np.arange(1, FRAMES + 2) / FPS
    t_all = glb.add_floats(times, 'SCALAR')
    t_ends = glb.add_floats(times[[0, -1]], 'SCALAR')
    clip = {'name': CLIP, 'channels': [], 'samplers': []}
    for ch in template['channels']:
        src = template['samplers'][ch['sampler']]
        name = glb.json['nodes'][ch['target']['node']]['name']
        if ch['target']['path'] == 'rotation' and name in tracks:
            sampler = {'input': t_all, 'interpolation': 'LINEAR',
                       'output': glb.add_floats(np.array(tracks[name]), 'VEC4')}
        else:
            # held at the idle value: reuse the idle clip's two keys
            assert glb.json['accessors'][src['output']]['count'] == 2
            sampler = {'input': t_ends, 'interpolation': 'STEP', 'output': src['output']}
        clip['samplers'].append(sampler)
        clip['channels'].append({'sampler': len(clip['samplers']) - 1, 'target': dict(ch['target'])})
    glb.json['animations'].append(clip)
    glb.json['animations'].sort(key=lambda a: a['name'])

    # nothing but the new clip may differ from the file without it
    assert [a for a in glb.json['animations'] if a['name'] != CLIP] == before['animations']
    for key in before:
        if key in ('animations', 'accessors', 'bufferViews', 'buffers'):
            continue
        assert glb.json[key] == before[key], f'{key} changed'
    for key in ('accessors', 'bufferViews'):
        assert glb.json[key][:len(before[key])] == before[key], f'{key} changed'
    assert bytes(glb.bin[:len(bin_before)]) == bin_before, 'existing binary data changed'

    glb.write(GLB)
    print(f'wrote {GLB} ({GLB.stat().st_size} bytes): {CLIP}, {FRAMES} frames at {FPS} fps, '
          f'{len(clip["channels"])} channels')


if __name__ == '__main__':
    main()
