"""
M1x layout preview: composite real Riley CC0 hero/zombie + Kenney CC0 props
+ procedural combat VFX (muzzle burst / fan bullets / hit sparks / lightning chain)
+ 4-panel HUD skeleton, mirroring ActorSpawner.ts + BootstrapMain.ts.

Outputs: can_delete/shots/m1y-ui-pass-{01-overview, 02-combat-vfx-zoom, 03-ui-prop-context}.png
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, "cocos-v03-demo/assets/resources/art/v03")
OUT = os.path.join(ROOT, "can_delete/shots")

W, H = 390, 844
CX, CY = W // 2, H // 2

def to_px(x, y):
    return CX + x, CY - y

# ---------- Wasteland terrain ----------
def gen_terrain_tile(size=512, seed=12345):
    rng = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    px = img.load()
    BASE = (48, 52, 56)
    DARK = (26, 28, 32)
    for y in range(size):
        for x in range(size):
            t = 0.55 + rng.random() * 0.45
            r = int(DARK[0] + (BASE[0] - DARK[0]) * t)
            g = int(DARK[1] + (BASE[1] - DARK[1]) * t)
            b = int(DARK[2] + (BASE[2] - DARK[2]) * t)
            px[x, y] = (r, g, b, 255)
    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(10 + rng.randint(0, 3)):
        x = rng.random() * size; y = rng.random() * size
        dx = (rng.random() - 0.5) * 2; dy = (rng.random() - 0.5) * 2
        for _s in range(60 + rng.randint(0, 200)):
            xi, yi = int(x), int(y)
            if 0 <= xi < size and 0 <= yi < size:
                draw.point((xi, yi), fill=(8, 8, 10, 220))
            x += dx; y += dy
            if rng.random() < 0.08:
                dx += (rng.random() - 0.5) * 0.6
                dy += (rng.random() - 0.5) * 0.6
    def splat(cx, cy, radius, color, peak):
        blob = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bd = ImageDraw.Draw(blob)
        bd.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                   fill=(color[0], color[1], color[2], int(255 * peak)))
        blob = blob.filter(ImageFilter.GaussianBlur(radius * 0.4))
        img.alpha_composite(blob)
    for _ in range(6 + rng.randint(0, 3)):
        splat(rng.random() * size, rng.random() * size, 30 + rng.random() * 80, (24, 18, 14), 0.55)
    for _ in range(4 + rng.randint(0, 3)):
        splat(rng.random() * size, rng.random() * size, 18 + rng.random() * 36, (80, 38, 22), 0.45)
    for _ in range(1 + rng.randint(0, 2)):
        splat(rng.random() * size, rng.random() * size, 60 + rng.random() * 80, (14, 10, 8), 0.7)
    return img

def attach_terrain(canvas, tile):
    tw, th = tile.size
    cols = (W // tw) + 2
    rows = (H // th) + 2
    sx = -((cols - 1) * tw) // 2
    sy = -((rows - 1) * th) // 2
    for r in range(rows):
        for c in range(cols):
            flip = ((r * 31 + c * 17) & 3)
            t = tile.rotate(flip * 90)
            world_cx = sx + c * tw + tw / 2
            world_cy = sy + r * th + tw / 2
            px_x, px_y = to_px(world_cx, world_cy)
            canvas.alpha_composite(t, (int(px_x - tw / 2), int(px_y - th / 2)))

def radial_alpha(size, inner_rgba, outer_rgba):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    cx = cy = size / 2
    maxR = size / 2
    for y in range(size):
        for x in range(size):
            dx = x - cx; dy = y - cy
            t = min(1.0, math.hypot(dx, dy) / maxR)
            r = int(inner_rgba[0] + (outer_rgba[0] - inner_rgba[0]) * t)
            g = int(inner_rgba[1] + (outer_rgba[1] - inner_rgba[1]) * t)
            b = int(inner_rgba[2] + (outer_rgba[2] - inner_rgba[2]) * t)
            a = int(inner_rgba[3] + (outer_rgba[3] - inner_rgba[3]) * t)
            px[x, y] = (r, g, b, a)
    return img

def load_sprite(rel):
    return Image.open(os.path.join(ART, rel)).convert("RGBA")

def fit_keep_aspect(img, target_w, target_h):
    iw, ih = img.size
    scale = min(target_w / iw, target_h / ih)
    return img.resize((max(1, int(iw * scale)), max(1, int(ih * scale))), Image.LANCZOS)

def fit_stretch(img, target_w, target_h):
    return img.resize((max(1, target_w), max(1, target_h)), Image.LANCZOS)

def tint_sprite(img, color):
    base = img.copy()
    r, g, b, a = base.split()
    cr, cg, cb = color
    r = r.point(lambda v: int(v * cr / 255))
    g = g.point(lambda v: int(v * cg / 255))
    b = b.point(lambda v: int(v * cb / 255))
    return Image.merge("RGBA", (r, g, b, a))

def place(canvas, sprite, world_pos, content_size, angle_deg=0, stretch=False):
    target_w, target_h = content_size
    fitted = fit_stretch(sprite, target_w, target_h) if stretch else fit_keep_aspect(sprite, target_w, target_h)
    rotated = fitted.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
    px_x, px_y = to_px(world_pos[0], world_pos[1])
    rw, rh = rotated.size
    canvas.alpha_composite(rotated, (int(px_x - rw / 2), int(px_y - rh / 2)))

def place_radial(canvas, world_pos, content_size, inner, outer, angle_deg=0, src_size=128):
    target_w, target_h = content_size
    glow = radial_alpha(src_size, inner, outer).resize((target_w, target_h), Image.LANCZOS)
    if angle_deg:
        glow = glow.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
    px_x, px_y = to_px(world_pos[0], world_pos[1])
    gw, gh = glow.size
    canvas.alpha_composite(glow, (int(px_x - gw / 2), int(px_y - gh / 2)))

def place_solid(canvas, world_pos, content_size, rgba):
    target_w, target_h = content_size
    box = Image.new("RGBA", (target_w, target_h), rgba)
    px_x, px_y = to_px(world_pos[0], world_pos[1])
    canvas.alpha_composite(box, (int(px_x - target_w / 2), int(px_y - target_h / 2)))

# ---------- M1y HUD generators (procedural, mirror BootstrapMain) ----------
def make_disc(size, fill, edge=None, edge_w=2):
    s2 = size * 2
    img = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    if edge:
        d.ellipse([0, 0, s2 - 1, s2 - 1], fill=edge)
        ew2 = edge_w * 2
        d.ellipse([ew2, ew2, s2 - 1 - ew2, s2 - 1 - ew2], fill=fill)
    else:
        d.ellipse([0, 0, s2 - 1, s2 - 1], fill=fill)
    return img.resize((size, size), Image.LANCZOS)

def make_ring(size, outer_r, inner_r, fill):
    s2 = size * 2
    img = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = s2 // 2
    or2 = outer_r * 2
    ir2 = inner_r * 2
    d.ellipse([cx - or2, cy - or2, cx + or2 - 1, cy + or2 - 1], fill=fill)
    d.ellipse([cx - ir2, cy - ir2, cx + ir2 - 1, cy + ir2 - 1], fill=(0, 0, 0, 0))
    return img.resize((size, size), Image.LANCZOS)

def make_rounded_bar(w, h, fill, bg, fill_frac):
    img = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=h, fill=bg)
    fill_w = int(w * 2 * fill_frac)
    if fill_w > h:
        d.rounded_rectangle([0, 0, fill_w, h * 2 - 1], radius=h, fill=fill)
    return img.resize((w, h), Image.LANCZOS)

def make_minimap(size):
    img = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    s2 = size * 2
    # outer ring
    d.ellipse([0, 0, s2 - 1, s2 - 1], fill=(195, 215, 230, 240))
    inset = 10
    d.ellipse([inset, inset, s2 - 1 - inset, s2 - 1 - inset], fill=(28, 42, 50, 235))
    # cross grid
    d.line([(s2 // 2, inset + 4), (s2 // 2, s2 - inset - 4)], fill=(80, 130, 150, 90), width=1)
    d.line([(inset + 4, s2 // 2), (s2 - inset - 4, s2 // 2)], fill=(80, 130, 150, 90), width=1)
    # dots
    c = s2 // 2
    dots = [
        (c, c, (110, 230, 130, 255), 8),  # player
        (c + int(s2 * 0.18), c - int(s2 * 0.12), (230, 70, 70, 255), 6),
        (c + int(s2 * 0.28), c + int(s2 * 0.08), (230, 70, 70, 255), 6),
        (c + int(s2 * 0.10), c + int(s2 * 0.22), (230, 70, 70, 255), 6),
        (c - int(s2 * 0.20), c + int(s2 * 0.18), (230, 70, 70, 255), 6),
        (c - int(s2 * 0.10), c - int(s2 * 0.22), (100, 200, 240, 255), 6),
    ]
    for x, y, col, r in dots:
        d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    return img.resize((size, size), Image.LANCZOS)

def make_skill_disc(size, base):
    s2 = size * 2
    img = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    # dark rim
    d.ellipse([0, 0, s2 - 1, s2 - 1], fill=(int(base[0] * 0.4), int(base[1] * 0.4), int(base[2] * 0.4), 255))
    # mid highlight ring
    d.ellipse([6, 6, s2 - 7, s2 - 7], fill=(min(255, base[0] + 30), min(255, base[1] + 30), min(255, base[2] + 30), 240))
    # body
    d.ellipse([12, 12, s2 - 13, s2 - 13], fill=(base[0], base[1], base[2], 250))
    # upper-left highlight gloss
    gloss = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss, "RGBA")
    gd.ellipse([14, 12, s2 // 2 + 8, s2 // 2 - 4], fill=(255, 255, 255, 70))
    gloss = gloss.filter(ImageFilter.GaussianBlur(4))
    img.alpha_composite(gloss)
    return img.resize((size, size), Image.LANCZOS)

def make_glyph(size, kind):
    s2 = size * 2
    img = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    c = s2 // 2
    white = (255, 255, 255, 255)
    if kind == "bolt":
        d.line([(c + s2 * 0.18, c - s2 * 0.32), (c - s2 * 0.05, c - s2 * 0.02)], fill=white, width=5)
        d.line([(c - s2 * 0.05, c - s2 * 0.02), (c + s2 * 0.10, c + s2 * 0.02)], fill=white, width=5)
        d.line([(c + s2 * 0.10, c + s2 * 0.02), (c - s2 * 0.18, c + s2 * 0.32)], fill=white, width=5)
    elif kind == "star":
        d.line([(c, c - s2 * 0.32), (c, c + s2 * 0.32)], fill=white, width=5)
        d.line([(c - s2 * 0.32, c), (c + s2 * 0.32, c)], fill=white, width=5)
        d.line([(c - s2 * 0.20, c - s2 * 0.20), (c + s2 * 0.20, c + s2 * 0.20)], fill=white, width=4)
        d.line([(c - s2 * 0.20, c + s2 * 0.20), (c + s2 * 0.20, c - s2 * 0.20)], fill=white, width=4)
    else:  # flame
        d.polygon([(c, c - s2 * 0.35),
                   (c - s2 * 0.22, c + s2 * 0.12),
                   (c + s2 * 0.22, c + s2 * 0.12)], fill=white)
        d.polygon([(c, c - s2 * 0.10),
                   (c - s2 * 0.10, c + s2 * 0.18),
                   (c + s2 * 0.10, c + s2 * 0.18)], fill=(255, 230, 180, 255))
    return img.resize((size, size), Image.LANCZOS)

def paint_hud(canvas, halfW, halfH):
    def paste_centered(img, world_pos, content_size):
        target = img.resize((content_size[0], content_size[1]), Image.LANCZOS)
        px_x, px_y = to_px(world_pos[0], world_pos[1])
        canvas.alpha_composite(target, (int(px_x - content_size[0] / 2), int(px_y - content_size[1] / 2)))

    # Portrait
    portrait_x = -halfW + 36; portrait_y = halfH - 36
    paste_centered(make_disc(96, (40, 48, 60, 240), edge=(205, 215, 230, 250), edge_w=4), (portrait_x, portrait_y), (64, 64))
    paste_centered(make_disc(80, (120, 160, 175, 255)), (portrait_x, portrait_y), (52, 52))
    # HP bar (right of portrait)
    paste_centered(make_rounded_bar(160, 24, (205, 55, 50, 250), (20, 22, 28, 230), 0.78),
                   (-halfW + 76 + 56, halfH - 32), (112, 16))
    # Armor bar (silver-gray, ~70%, between HP and EXP)
    paste_centered(make_rounded_bar(160, 12, (180, 195, 210, 250), (20, 22, 28, 220), 0.70),
                   (-halfW + 76 + 56, halfH - 48), (112, 8))
    # EXP bar (cyan, under Armor)
    paste_centered(make_rounded_bar(160, 12, (120, 220, 255, 250), (18, 22, 28, 220), 0.45),
                   (-halfW + 76 + 56, halfH - 64), (112, 8))
    # Minimap
    paste_centered(make_minimap(160), (halfW - 52, halfH - 52), (96, 96))
    # Joystick ring + thumb
    stick_x = -halfW + 80; stick_y = -halfH + 100
    paste_centered(make_ring(160, 78, 64, (200, 220, 230, 110)), (stick_x, stick_y), (110, 110))
    paste_centered(make_disc(96, (220, 235, 245, 200), edge=(40, 50, 65, 230), edge_w=3),
                   (stick_x + 12, stick_y + 6), (50, 50))
    # 3 skill discs (purple bolt / yellow star / orange flame)
    skills = [
        dict(name="bolt",  cx=halfW - 138, cy=-halfH + 96,  size=62, base=(180, 130, 230)),
        dict(name="star",  cx=halfW - 78,  cy=-halfH + 152, size=62, base=(255, 220, 100)),
        dict(name="flame", cx=halfW - 50,  cy=-halfH + 78,  size=84, base=(255, 150, 80)),
    ]
    for sk in skills:
        # outer glow (radial)
        place_radial(canvas, (sk["cx"], sk["cy"]), (sk["size"] + 16, sk["size"] + 16),
                     (sk["base"][0], sk["base"][1], sk["base"][2], 110), (sk["base"][0], sk["base"][1], sk["base"][2], 0))
        paste_centered(make_skill_disc(96, sk["base"]), (sk["cx"], sk["cy"]), (sk["size"], sk["size"]))
        glyph_size = int(sk["size"] * 0.55)
        paste_centered(make_glyph(64, sk["name"]), (sk["cx"], sk["cy"]), (glyph_size, glyph_size))

# ---------- Build M1x layout ----------
def render():
    canvas = Image.new("RGBA", (W, H), (10, 12, 14, 255))
    tile = gen_terrain_tile(seed=12345)
    attach_terrain(canvas, tile)

    HERO_POS = (-90, -260)

    # --- Props (back layer) ---
    props = [
        dict(key="wreck-tank.png", pos=(-200, -110), angle=65, w=130, h=110, sw=150, sh=50, tint=(155, 130, 105)),
        dict(key="sandbag.png",   pos=(110, -310),  angle=10, w=70,  h=38,  sw=80,  sh=22, tint=None),
        dict(key="barrel-rust.png", pos=(20, -200), angle=0,  w=36,  h=36,  sw=42,  sh=14, tint=None),
    ]
    for p in props:
        place_radial(canvas, (p["pos"][0], p["pos"][1] - 6), (p["sw"], p["sh"]),
                     (0, 0, 0, 205), (0, 0, 0, 0))
        spr = load_sprite(f"props/{p['key']}")
        if p["tint"]:
            spr = tint_sprite(spr, p["tint"])
        place(canvas, spr, p["pos"], (p["w"], p["h"]), angle_deg=p["angle"])

    # --- Zombies + shadows ---
    zombies = [
        dict(name="lead",  pos=(152, -120), scale=1.15, tint=(225, 160, 145), frame="attack"),
        dict(name="sneak", pos=(50, -160),  scale=1.10, tint=(215, 180, 160), frame="move"),
        dict(name="flank", pos=(220, 80),   scale=1.00, tint=(200, 195, 170), frame="move"),
        dict(name="back",  pos=(-160, 150), scale=0.95, tint=(190, 200, 185), frame="idle"),
        dict(name="far",   pos=(190, 310),  scale=0.78, tint=(170, 180, 175), frame="move"),
    ]
    place_radial(canvas, (HERO_POS[0], HERO_POS[1] - 6), (110, 36), (0, 0, 0, 205), (0, 0, 0, 0))
    for z in zombies:
        place_radial(canvas, (z["pos"][0], z["pos"][1] - 6),
                     (int(80 * z["scale"]), int(26 * z["scale"])),
                     (0, 0, 0, 205), (0, 0, 0, 0))

    # Hero
    place(canvas, load_sprite("hero/survivor-shoot.png"), HERO_POS, (160, 105), angle_deg=30)

    # Zombies
    z_frames = {
        "idle": load_sprite("zombie/zombie-idle.png"),
        "move": load_sprite("zombie/zombie-move.png"),
        "attack": load_sprite("zombie/zombie-attack.png"),
    }
    for z in zombies:
        dx = HERO_POS[0] - z["pos"][0]
        dy = HERO_POS[1] - z["pos"][1]
        angle = math.degrees(math.atan2(dy, dx))
        base_size = int(130 * z["scale"])
        place(canvas, tint_sprite(z_frames[z["frame"]], z["tint"]), z["pos"], (base_size, base_size), angle_deg=angle)

    # --- Combat VFX (fxLayer) ---
    # Muzzle cone (glow)
    rad30 = math.radians(30)
    mx_cone = HERO_POS[0] + math.cos(rad30) * 90
    my_cone = HERO_POS[1] + math.sin(rad30) * 90
    place_radial(canvas, (mx_cone, my_cone), (180, 80), (255, 230, 140, 130), (255, 180, 60, 0),
                 angle_deg=30, src_size=256)
    # Big muzzle burst (flash at barrel)
    mb_x = HERO_POS[0] + math.cos(rad30) * 60
    mb_y = HERO_POS[1] + math.sin(rad30) * 60
    place_radial(canvas, (mb_x, mb_y), (110, 110), (255, 250, 220, 250), (255, 200, 90, 0))

    # Fan bullets (5 streaks at 30°±14°)
    spread = [-14, -7, 0, 7, 14]
    start_x = HERO_POS[0] + math.cos(rad30) * 80
    start_y = HERO_POS[1] + math.sin(rad30) * 80
    for i, off in enumerate(spread):
        ang = 30 + off
        rad = math.radians(ang)
        length = 130 + (30 if i % 2 == 0 else 0)
        cx = start_x + math.cos(rad) * (length / 2)
        cy = start_y + math.sin(rad) * (length / 2)
        place_radial(canvas, (cx, cy), (length, 8), (255, 240, 180, 230), (255, 200, 80, 0),
                     angle_deg=ang)

    # Hit sparks at lead zombie (152, -120)
    target = (152, -120)
    spark_offsets = [(-12, 8, 14), (10, 14, 12), (18, -6, 10), (-6, -14, 11),
                     (4, 22, 9), (22, 4, 8), (-18, -2, 7)]
    for ox, oy, sz in spark_offsets:
        place_radial(canvas, (target[0] + ox, target[1] + oy), (sz * 2, sz * 2),
                     (255, 250, 220, 240), (255, 180, 60, 0), src_size=64)

    # Lightning chain: lead → flank → far
    chain = [(152, -120), (220, 80), (190, 310)]
    for seg_idx in range(len(chain) - 1):
        fx, fy = chain[seg_idx]
        tx, ty = chain[seg_idx + 1]
        dx = tx - fx; dy = ty - fy
        length = math.hypot(dx, dy)
        nx = -dy / length; ny = dx / length
        prev = (fx, fy)
        segments = 6
        for s in range(1, segments + 1):
            t = s / segments
            base_x = fx + dx * t
            base_y = fy + dy * t
            jitter = 0 if s == segments else math.sin(s * 13 + seg_idx * 3) * 14
            px = base_x + nx * jitter
            py = base_y + ny * jitter
            seg_len = math.hypot(px - prev[0], py - prev[1])
            seg_ang = math.degrees(math.atan2(py - prev[1], px - prev[0]))
            cx = (px + prev[0]) / 2
            cy = (py + prev[1]) / 2
            place_radial(canvas, (cx, cy), (int(seg_len), 6),
                         (240, 250, 255, 235), (120, 180, 255, 0), angle_deg=seg_ang, src_size=64)
            prev = (px, py)
    # Hub glows at chain nodes
    for c in chain:
        place_radial(canvas, c, (28, 28), (220, 240, 255, 230), (120, 180, 255, 0), src_size=64)

    # --- HUD M1y: round portrait+HP+EXP / round minimap / joystick / 3 color skill discs ---
    halfW = W / 2; halfH = H / 2
    paint_hud(canvas, halfW, halfH)

    return canvas

def main():
    os.makedirs(OUT, exist_ok=True)
    img = render()
    img.convert("RGB").save(os.path.join(OUT, "m1y-ui-pass-01-overview.png"), "PNG")
    # Zoom 1: combat VFX (muzzle + bullets + sparks + lightning start)
    z1 = img.crop((50, 380, 390, 720))
    z1.convert("RGB").save(os.path.join(OUT, "m1y-ui-pass-02-combat-vfx-zoom.png"), "PNG")
    # Zoom 3: UI + prop context — top HUD strip + bottom HUD strip + prop band stitched
    top = img.crop((0, 0, 390, 80))         # HP + timer
    mid = img.crop((0, 540, 390, 800))      # hero / props / skill slots cluster
    bot = img.crop((0, 760, 390, 844))      # bottom HUD row
    out = Image.new("RGBA", (390, top.size[1] + mid.size[1] + bot.size[1] + 8), (10, 12, 14, 255))
    out.alpha_composite(top, (0, 0))
    out.alpha_composite(mid, (0, top.size[1] + 4))
    out.alpha_composite(bot, (0, top.size[1] + mid.size[1] + 8))
    out.convert("RGB").save(os.path.join(OUT, "m1y-ui-pass-03-ui-prop-context.png"), "PNG")
    print(f"wrote 3 shots to {OUT}")

if __name__ == "__main__":
    main()
