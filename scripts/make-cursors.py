#!/usr/bin/env python3
"""Draw the site's mouse cursors in the classic Windows style and write them
into public/cursors/ as 32x32 .cur files (plus wait.gif, the animated
hourglass shown in loading placeholders).

    python3 scripts/make-cursors.py        (needs Pillow, for wait.gif only)

The set: arrow, hand, help, text, crosshair, move, four resize arrows, up
arrow, unavailable, hourglass, arrow + hourglass. White shapes have a black
outline and black shapes a white one, so every cursor reads on any background.
"""
import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'cursors'
SIZE = 32
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)


def blank():
    return [[None] * SIZE for _ in range(SIZE)]


def from_art(art, grid=None, ox=0, oy=0):
    """X = black, . = white, anything else = transparent."""
    grid = grid or blank()
    for y, row in enumerate(art.strip('\n').split('\n')):
        for x, ch in enumerate(row):
            if ch == 'X':
                grid[oy + y][ox + x] = BLACK
            elif ch == '.':
                grid[oy + y][ox + x] = WHITE
    return grid


def stamp(points, fill=BLACK, edge=WHITE, grid=None, ox=1, oy=1):
    """Put a one-colour shape on the grid with a 1px edge around it."""
    grid = grid or blank()
    points = {(x + ox, y + oy) for (x, y) in points}
    for (x, y) in points:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and (nx, ny) not in points:
                    grid[ny][nx] = edge
    for (x, y) in points:
        grid[y][x] = fill
    return grid


# ── Shapes ───────────────────────────────────────────────────────────────────

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

QUESTION = """
 XXXXX
XXX XXX
XX   XX
    XXX
   XXX
  XXX
  XX

  XX
  XX
"""


def art_points(art):
    return {(x, y) for y, row in enumerate(art.strip('\n').split('\n')) for x, ch in enumerate(row) if ch == 'X'}


def head_up(cx, top, rows):
    """An arrowhead pointing up: 1, 3, 5... pixels wide."""
    return {(cx + dx, top + i) for i in range(rows) for dx in range(-i, i + 1)}


def flip_v(points, height):
    return {(x, height - 1 - y) for (x, y) in points}


def transpose(points):
    return {(y, x) for (x, y) in points}


def mirror_h(points, width):
    return {(width - 1 - x, y) for (x, y) in points}


def double_arrow(length=21, head=5):
    """Vertical two-headed arrow, `length` tall and 2*head-1 wide."""
    cx = head - 1
    top = head_up(cx, 0, head)
    shaft = {(cx, y) for y in range(head, length - head)}
    return top | shaft | flip_v(top, length)


def diagonal_arrow(size=15, head=6):
    """Two-headed arrow from the top-left corner to the bottom-right one."""
    corner = {(x, y) for y in range(head) for x in range(head - y)}
    shaft = {(i, i) for i in range(2, size - 2)}
    far = {(size - 1 - x, size - 1 - y) for (x, y) in corner}
    return corner | shaft | far


def four_arrows(size=21, head=4):
    c = size // 2
    up = head_up(c, 0, head) | {(c, y) for y in range(head, c + 1)}
    vertical = up | flip_v(up, size)
    return vertical | transpose(vertical)


def up_arrow():
    return head_up(4, 0, 5) | {(x, y) for y in range(5, 18) for x in (3, 4, 5)}


def i_beam(height=17):
    caps = {(x, y) for y in (0, height - 1) for x in (0, 1, 2, 4, 5, 6)}
    return caps | {(3, y) for y in range(1, height - 1)}


def cross(size=19):
    c = size // 2
    return {(c, i) for i in range(size)} | {(i, c) for i in range(size)}


def unavailable():
    """A black circle with a slash on a white disc."""
    c, r = 9.5, 8.5
    grid = blank()
    for y in range(20):
        for x in range(20):
            d = math.hypot(x - c, y - c)
            if d > r + 1:
                continue
            ring = r - 2.3 <= d <= r
            slash = d < r and abs((x - c) - (y - c)) <= 1.5
            grid[y][x] = BLACK if ring or slash else WHITE
    return grid


def hourglass(grid=None, ox=0, oy=0, half=6, sand=0.0):
    """
    The hourglass: two bars, white glass with a black rim, black sand.
    `half` is half its width; `sand` is how much has run through (0..1).
    """
    grid = grid or blank()
    width = half * 2 + 1
    straight = max(1, half // 2)         # rows of full width next to each bar
    body = 2 * (straight + half - 1) + 1  # rows between the bars
    rows = []                             # the glass's half-width, row by row
    for i in range(body):
        from_end = min(i, body - 1 - i)
        rows.append(half - 1 if from_end < straight else max(0, half - 1 - (from_end - straight + 1)))
    mid = body // 2
    chamber = mid - 1                     # sand rows per chamber
    fallen = round(sand * chamber)
    for y in (0, 1, body + 2, body + 3):
        for x in range(width):
            grid[oy + y][ox + x] = BLACK
    for i, hw in enumerate(rows):
        y = oy + 2 + i
        for dx in range(-hw, hw + 1):
            x = ox + half + dx
            rim = abs(dx) == hw and hw > 0
            if rim or hw == 0:
                grid[y][x] = BLACK
                continue
            grid[y][x] = WHITE
            top_sand = i < mid and i >= 1 + fallen and abs(dx) < hw - 1
            bottom_sand = i > mid and i >= body - 1 - fallen and abs(dx) < hw - 1
            falling = 0 < sand < 1 and i > mid and dx == 0
            if ((top_sand or bottom_sand) and (x + y) % 2 == 0) or falling:
                grid[y][x] = BLACK
    return grid


def edged(grid, around=BLACK, edge=WHITE):
    """Give the black parts of a drawing a white edge on the outside."""
    out = [row[:] for row in grid]
    for y in range(SIZE):
        for x in range(SIZE):
            if grid[y][x] is not None:
                continue
            near = [grid[ny][nx] for nx in (x - 1, x, x + 1) for ny in (y - 1, y, y + 1) if 0 <= nx < SIZE and 0 <= ny < SIZE]
            if around in near:
                out[y][x] = edge
    return out


# ── Files ────────────────────────────────────────────────────────────────────

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
    print(f'{name}: hotspot {hotspot}')


def write_gif(name, grids, ms):
    from PIL import Image
    frames = []
    for grid in grids:
        im = Image.new('P', (SIZE, SIZE), 2)
        im.putpalette([0, 0, 0, 255, 255, 255, 255, 0, 255])
        for y, row in enumerate(grid):
            for x, px in enumerate(row):
                if px is not None:
                    im.putpixel((x, y), 0 if px == BLACK else 1)
        frames.append(im)
    frames[0].save(OUT / name, save_all=True, append_images=frames[1:], duration=ms, loop=0, transparency=2, disposal=2)
    print(f'{name}: {len(frames)} frames')


write_cur('default.cur', from_art(ARROW), (0, 0))
write_cur('pointer.cur', from_art(HAND), (5, 0))
write_cur('help.cur', stamp(art_points(QUESTION), grid=from_art(ARROW), ox=14, oy=6), (0, 0))
write_cur('not-allowed.cur', unavailable(), (9, 9))
write_cur('text.cur', stamp(i_beam()), (4, 9))
write_cur('crosshair.cur', stamp(cross()), (10, 10))
write_cur('move.cur', stamp(four_arrows()), (11, 11))
write_cur('ns-resize.cur', stamp(double_arrow()), (5, 11))
write_cur('ew-resize.cur', stamp(transpose(double_arrow())), (11, 5))
write_cur('nwse-resize.cur', stamp(diagonal_arrow()), (8, 8))
write_cur('nesw-resize.cur', stamp(mirror_h(diagonal_arrow(), 15)), (8, 8))
write_cur('alternate.cur', stamp(up_arrow(), fill=WHITE, edge=BLACK), (5, 1))
write_cur('wait.cur', edged(hourglass(ox=9, oy=5, sand=0.4)), (15, 16))
write_cur('progress.cur', from_art(ARROW, grid=edged(hourglass(ox=15, oy=12, half=4, sand=0.4))), (0, 0))
write_gif('wait.gif', [edged(hourglass(ox=9, oy=5, sand=s)) for s in (0, 0.25, 0.5, 0.75, 1)], 220)
