#!/usr/bin/env python3
"""Draw the classic Windows mouse cursors used by the site and write them as
32x32 .cur files into public/cursors/.

    python3 scripts/make-cursors.py

X = black outline, . = white fill, anything else = transparent.
"""
import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'cursors'
SIZE = 32

# Normal select: the arrow. Hotspot at its tip.
ARROW = """
X
XX
X.X
X..X
X...X
X....X
X.....X
X......X
X.......X
X........X
X.........X
X......XXXXX
X...X..X
X..X X..X
X.X  X..X
XX    X..X
X     X..X
       X..X
       X..X
        XX
"""

# Link select: the pointing hand. Hotspot at the fingertip.
HAND = """
     XX
    X..X
    X..X
    X..X
    X..X
    X..XXX
    X..X..XXX
    X..X..X..XX
    X..X..X..X.X
XXX X..X..X..X..X
X..XX........X..X
X...X...........X
 X..X...........X
  X.X...........X
  X.............X
   X............X
   X...........X
    X..........X
    X..........X
     X........X
     X........X
     XXXXXXXXXX
"""


def from_art(art):
    grid = [[None] * SIZE for _ in range(SIZE)]
    for y, row in enumerate(art.strip('\n').split('\n')):
        for x, ch in enumerate(row):
            if ch == 'X':
                grid[y][x] = (0, 0, 0)
            elif ch == '.':
                grid[y][x] = (255, 255, 255)
    return grid


def unavailable():
    """Unavailable: a black circle with a slash on a white disc."""
    c, r = 9.5, 8.5
    grid = [[None] * SIZE for _ in range(SIZE)]
    for y in range(20):
        for x in range(20):
            d = math.hypot(x - c, y - c)
            if d > r + 1:
                continue
            ring = r - 2.3 <= d <= r
            slash = d < r and abs((x - c) - (y - c)) <= 1.5
            grid[y][x] = (0, 0, 0) if ring or slash else (255, 255, 255)
    return grid


def write_cur(name, grid, hotspot):
    xor = bytearray()
    and_mask = bytearray()
    for row in reversed(grid):  # bitmap rows are stored bottom-up
        bits = 0
        for x, px in enumerate(row):
            if px is None:
                xor += b'\x00\x00\x00\x00'
                bits |= 1 << (31 - x)
            else:
                xor += bytes((px[2], px[1], px[0], 255))
        and_mask += struct.pack('>I', bits)
    header = struct.pack('<IiiHHIIiiII', 40, SIZE, SIZE * 2, 1, 32, 0, len(xor) + len(and_mask), 0, 0, 0, 0)
    image = header + bytes(xor) + bytes(and_mask)
    directory = struct.pack('<HHH', 0, 2, 1) + struct.pack('<BBBBHHII', SIZE, SIZE, 0, 0, hotspot[0], hotspot[1], len(image), 22)
    (OUT / name).write_bytes(directory + image)
    print(f'{name}: hotspot {hotspot}, {len(directory) + len(image)} bytes')


write_cur('default.cur', from_art(ARROW), (0, 0))
write_cur('pointer.cur', from_art(HAND), (5, 0))
write_cur('not-allowed.cur', unavailable(), (9, 9))
