import zlib, struct, math

W = H = 1024

def lerp(a, b, t): return a + (b - a) * t

# Palette: soft Marian sky-blue -> gentle blue, with a luminous gold cross.
top = (183, 211, 238)   # soft celestial blue  #B7D3EE
bot = (120, 160, 210)   # gentle deeper blue   #78A0D2
gold = (245, 189, 66)   # rich, saturated gold  #F5BD42
gold_hi = (255, 236, 168)

# Destellos (sparkles) alrededor de la cruz: (x_frac, y_frac, size_px)
SPARKS = [
    (0.30, 0.25, 78),
    (0.72, 0.23, 58),
    (0.205, 0.50, 46),
    (0.805, 0.53, 70),
    (0.32, 0.71, 52),
    (0.69, 0.73, 44),
    (0.50, 0.135, 50),
]

def spark_val(x, y):
    best = 0.0
    for fx, fy, size in SPARKS:
        dx = x - fx * W
        dy = y - fy * H
        ax, ay = abs(dx), abs(dy)
        thin = size * 0.085
        core = size * 0.17
        v = max(0.0, 1 - ay / size) * max(0.0, 1 - ax / thin)   # espiga vertical
        h = max(0.0, 1 - ax / size) * max(0.0, 1 - ay / thin)   # espiga horizontal
        c = max(0.0, 1 - math.hypot(dx, dy) / core)             # núcleo
        best = max(best, v, h, c)
    return best ** 1.25

def px(x, y):
    t = y / (H - 1)
    # base gradient
    r = lerp(top[0], bot[0], t)
    g = lerp(top[1], bot[1], t)
    b = lerp(top[2], bot[2], t)
    # soft luminous halo behind the cross (center a bit high)
    cx, cy = W/2, H*0.44
    d = math.hypot(x - cx, y - cy) / (W*0.5)
    glow = max(0.0, 1.0 - d)
    glow = glow ** 2.2
    # blend toward a soft warm white for a peaceful glow
    r = lerp(r, 250, glow*0.55)
    g = lerp(g, 250, glow*0.55)
    b = lerp(b, 252, glow*0.55)

    # Cross geometry (Latin cross)
    bar_w = W * 0.115          # thickness
    v_top, v_bot = H*0.20, H*0.80
    v_x0, v_x1 = cx - bar_w/2, cx + bar_w/2
    h_y0, h_y1 = H*0.36, H*0.36 + bar_w
    h_x0, h_x1 = cx - W*0.20, cx + W*0.20

    in_vert = (v_x0 <= x <= v_x1) and (v_top <= y <= v_bot)
    in_horz = (h_x0 <= x <= h_x1) and (h_y0 <= y <= h_y1)
    if in_vert or in_horz:
        # gold with subtle vertical sheen
        s = (y - v_top) / (v_bot - v_top)
        cr = lerp(gold_hi[0], gold[0], s)
        cg = lerp(gold_hi[1], gold[1], s)
        cb = lerp(gold_hi[2], gold[2], s)
        return (int(cr), int(cg), int(cb))

    # Destellos dorados alrededor de la cruz (aditivos sobre el fondo azul)
    sp = spark_val(x, y)
    if sp > 0.0:
        r = lerp(r, 255, sp * 0.95)
        g = lerp(g, 240, sp * 0.9)
        b = lerp(b, 205, sp * 0.75)
    return (min(255, int(r)), min(255, int(g)), min(255, int(b)))

raw = bytearray()
for y in range(H):
    raw.append(0)  # filter type 0
    for x in range(W):
        r, g, b = px(x, y)
        raw += bytes((r, g, b))

def chunk(typ, data):
    c = struct.pack(">I", len(data)) + typ + data
    crc = zlib.crc32(typ + data) & 0xffffffff
    return c + struct.pack(">I", crc)

sig = b"\x89PNG\r\n\x1a\n"
ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)  # 8-bit RGB
idat = zlib.compress(bytes(raw), 9)
png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

import sys
open(sys.argv[1], "wb").write(png)
print("wrote", sys.argv[1], len(png), "bytes")
