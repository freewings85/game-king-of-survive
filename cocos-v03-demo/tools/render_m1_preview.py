"""
M2-0 visual scene preview: composite Riley CC0 hero/zombie + Kenney CC0 props
+ procedural combat VFX (muzzle / fan bullets / hit sparks / lightning chain)
+ 4-panel HUD skeleton, all driven by m2-visual-scene.json (the same file
ActorSpawner.ts and BootstrapMain.ts read).

Outputs: can_delete/shots/m2-0-data-loader-{01-overview, 02-combat-vfx-zoom, 03-ui-prop-context}.png
"""
import json
import math
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, "cocos-v03-demo/assets/resources/art/v03")
CONFIG = os.path.join(ROOT, "cocos-v03-demo/assets/resources/config/m2-visual-scene.json")
OUT = os.path.join(ROOT, "can_delete/shots")

PROP_FILE = {
    "wreckTank":    "wreck-tank.png",
    "barrelRust":   "barrel-rust.png",
    "sandbag":      "sandbag.png",
    "tankGreen":    "tank-green.png",
    "barrelRed":    "barrel-red.png",
    "sandbagBeige": "sandbag-beige.png",
    "oilSplat":     "oil-splat.png",
}
ZOMBIE_FILE = {
    "idle": "zombie-idle.png",
    "move": "zombie-move.png",
    "attack": "zombie-attack.png",
}
HERO_FILE = {
    "idle": "survivor-idle.png",
    "shoot": "survivor-shoot.png",
}


def load_config():
    with open(CONFIG, "r", encoding="utf-8") as f:
        return json.load(f)


def to_px(x, y, w, h):
    return w // 2 + x, h // 2 - y


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


def attach_terrain(canvas, tile, W, H):
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
            px_x, px_y = to_px(world_cx, world_cy, W, H)
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


def tint_sprite(img, color):
    base = img.copy()
    r, g, b, a = base.split()
    cr, cg, cb = color[0], color[1], color[2]
    r = r.point(lambda v: int(v * cr / 255))
    g = g.point(lambda v: int(v * cg / 255))
    b = b.point(lambda v: int(v * cb / 255))
    return Image.merge("RGBA", (r, g, b, a))


def place(canvas, sprite, world_pos, content_size, W, H, angle_deg=0):
    target_w, target_h = content_size
    fitted = fit_keep_aspect(sprite, target_w, target_h)
    rotated = fitted.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
    px_x, px_y = to_px(world_pos[0], world_pos[1], W, H)
    rw, rh = rotated.size
    canvas.alpha_composite(rotated, (int(px_x - rw / 2), int(px_y - rh / 2)))


def place_radial(canvas, world_pos, content_size, inner, outer, W, H, angle_deg=0, src_size=128):
    target_w, target_h = content_size
    glow = radial_alpha(src_size, tuple(inner), tuple(outer)).resize(
        (max(1, int(target_w)), max(1, int(target_h))), Image.LANCZOS
    )
    if angle_deg:
        glow = glow.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
    px_x, px_y = to_px(world_pos[0], world_pos[1], W, H)
    gw, gh = glow.size
    canvas.alpha_composite(glow, (int(px_x - gw / 2), int(px_y - gh / 2)))


# ---------- HUD generators (mirror BootstrapMain.ts) ----------
def make_disc(size, fill, edge=None, edge_w=2):
    s2 = size * 2
    img = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    if edge:
        d.ellipse([0, 0, s2 - 1, s2 - 1], fill=tuple(edge))
        ew2 = edge_w * 2
        d.ellipse([ew2, ew2, s2 - 1 - ew2, s2 - 1 - ew2], fill=tuple(fill))
    else:
        d.ellipse([0, 0, s2 - 1, s2 - 1], fill=tuple(fill))
    return img.resize((size, size), Image.LANCZOS)


def make_ring(size, outer_r, inner_r, fill):
    s2 = size * 2
    img = Image.new("RGBA", (s2, s2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    cx = cy = s2 // 2
    or2 = outer_r * 2
    ir2 = inner_r * 2
    d.ellipse([cx - or2, cy - or2, cx + or2 - 1, cy + or2 - 1], fill=tuple(fill))
    d.ellipse([cx - ir2, cy - ir2, cx + ir2 - 1, cy + ir2 - 1], fill=(0, 0, 0, 0))
    return img.resize((size, size), Image.LANCZOS)


def make_rounded_bar(w, h, fill, bg, fill_frac):
    img = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], radius=h, fill=tuple(bg))
    fill_w = int(w * 2 * fill_frac)
    if fill_w > h:
        d.rounded_rectangle([0, 0, fill_w, h * 2 - 1], radius=h, fill=tuple(fill))
    return img.resize((w, h), Image.LANCZOS)


def make_minimap(size):
    img = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    s2 = size * 2
    d.ellipse([0, 0, s2 - 1, s2 - 1], fill=(195, 215, 230, 240))
    inset = 10
    d.ellipse([inset, inset, s2 - 1 - inset, s2 - 1 - inset], fill=(28, 42, 50, 235))
    d.line([(s2 // 2, inset + 4), (s2 // 2, s2 - inset - 4)], fill=(80, 130, 150, 90), width=1)
    d.line([(inset + 4, s2 // 2), (s2 - inset - 4, s2 // 2)], fill=(80, 130, 150, 90), width=1)
    c = s2 // 2
    dots = [
        (c, c, (110, 230, 130, 255), 8),
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
    d.ellipse([0, 0, s2 - 1, s2 - 1], fill=(int(base[0] * 0.4), int(base[1] * 0.4), int(base[2] * 0.4), 255))
    d.ellipse([6, 6, s2 - 7, s2 - 7], fill=(min(255, base[0] + 30), min(255, base[1] + 30), min(255, base[2] + 30), 240))
    d.ellipse([12, 12, s2 - 13, s2 - 13], fill=(base[0], base[1], base[2], 250))
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
    else:
        d.polygon([(c, c - s2 * 0.35),
                   (c - s2 * 0.22, c + s2 * 0.12),
                   (c + s2 * 0.22, c + s2 * 0.12)], fill=white)
        d.polygon([(c, c - s2 * 0.10),
                   (c - s2 * 0.10, c + s2 * 0.18),
                   (c + s2 * 0.10, c + s2 * 0.18)], fill=(255, 230, 180, 255))
    return img.resize((size, size), Image.LANCZOS)


def paint_hud(canvas, hud, W, H):
    def paste_centered(img, world_pos, content_size):
        target = img.resize((int(content_size[0]), int(content_size[1])), Image.LANCZOS)
        px_x, px_y = to_px(world_pos[0], world_pos[1], W, H)
        canvas.alpha_composite(target, (int(px_x - content_size[0] / 2), int(px_y - content_size[1] / 2)))

    p_frame = hud["portrait"]["frame"]
    p_fill = hud["portrait"]["fill"]
    paste_centered(make_disc(p_frame["discSize"], p_frame["fill"], edge=p_frame["edge"], edge_w=p_frame["edgeWidth"]),
                   p_frame["pos"], p_frame["contentSize"])
    paste_centered(make_disc(p_fill["discSize"], p_fill["fill"]),
                   p_fill["pos"], p_fill["contentSize"])

    for key in ("hpBar", "armorBar", "expBar"):
        b = hud[key]
        paste_centered(make_rounded_bar(b["barW"], b["barH"], b["fill"], b["bg"], b["fillFrac"]),
                       b["pos"], b["contentSize"])

    mm = hud["minimap"]
    paste_centered(make_minimap(mm["size"]), mm["pos"], mm["contentSize"])

    js = hud["joystick"]
    paste_centered(make_ring(js["ring"]["size"], js["ring"]["outerR"], js["ring"]["innerR"], js["ring"]["fill"]),
                   js["ring"]["pos"], js["ring"]["contentSize"])
    paste_centered(make_disc(js["thumb"]["discSize"], js["thumb"]["fill"], edge=js["thumb"]["edge"], edge_w=js["thumb"]["edgeWidth"]),
                   js["thumb"]["pos"], js["thumb"]["contentSize"])

    for sk in hud["skills"]:
        place_radial(canvas, sk["pos"], (sk["size"] + 16, sk["size"] + 16),
                     [sk["base"][0], sk["base"][1], sk["base"][2], sk["glowAlpha"]],
                     [sk["base"][0], sk["base"][1], sk["base"][2], 0], W, H)
        paste_centered(make_skill_disc(96, sk["base"]), sk["pos"], (sk["size"], sk["size"]))
        glyph_size = int(sk["size"] * 0.55)
        paste_centered(make_glyph(64, sk["glyph"]), sk["pos"], (glyph_size, glyph_size))


# ---------- Build scene from config ----------
def render(config):
    canvas_cfg = config["canvas"]
    W, H = canvas_cfg["width"], canvas_cfg["height"]
    canvas = Image.new("RGBA", (W, H), tuple(canvas_cfg["clearColor"]))
    tile = gen_terrain_tile(seed=12345)
    attach_terrain(canvas, tile, W, H)

    hero = config["hero"]
    HERO_POS = tuple(hero["pos"])

    # Props (back layer with shadows)
    for p in config["props"]:
        sx, sy = p["pos"][0], p["pos"][1] - 6
        place_radial(canvas, (sx, sy), p["shadow"], [0, 0, 0, 205], [0, 0, 0, 0], W, H)
        spr = load_sprite(f"props/{PROP_FILE[p['key']]}")
        if p["tint"]:
            spr = tint_sprite(spr, p["tint"])
        place(canvas, spr, p["pos"], p["contentSize"], W, H, angle_deg=p["angleDeg"])

    # Hero shadow (drawn before zombie shadows so layer order matches runtime addChild seq)
    place_radial(canvas, (HERO_POS[0], HERO_POS[1] - 6), hero["shadow"],
                 [0, 0, 0, 205], [0, 0, 0, 0], W, H)

    # Zombie shadows (in spawn order)
    for z in config["zombies"]:
        sw = z["shadow"][0] * z["scale"]
        sh = z["shadow"][1] * z["scale"]
        place_radial(canvas, (z["pos"][0], z["pos"][1] - 6), (sw, sh),
                     [0, 0, 0, 205], [0, 0, 0, 0], W, H)

    # Hero sprite
    place(canvas, load_sprite(f"hero/{HERO_FILE[hero['frame']]}"), HERO_POS,
          hero["contentSize"], W, H, angle_deg=hero["angleDeg"])

    # Zombie sprites
    z_frames = {k: load_sprite(f"zombie/{v}") for k, v in ZOMBIE_FILE.items()}
    for z in config["zombies"]:
        if z["rotateTowardHero"]:
            dx = HERO_POS[0] - z["pos"][0]
            dy = HERO_POS[1] - z["pos"][1]
            angle = math.degrees(math.atan2(dy, dx))
        else:
            angle = 0
        base_size = int(z["baseSize"] * z["scale"])
        place(canvas, tint_sprite(z_frames[z["frame"]], z["tint"]),
              z["pos"], (base_size, base_size), W, H, angle_deg=angle)

    # ---- Combat VFX ----
    vfx = config["vfx"]

    # Muzzle cone + burst
    for fx_key in ("muzzleCone", "muzzleBurst"):
        m = vfx[fx_key]
        rad = math.radians(m["angleDeg"])
        mx = HERO_POS[0] + math.cos(rad) * m["distance"]
        my = HERO_POS[1] + math.sin(rad) * m["distance"]
        rotate_deg = m.get("rotateDeg", 0)
        place_radial(canvas, (mx, my), m["contentSize"], m["inner"], m["outer"], W, H,
                     angle_deg=rotate_deg, src_size=m["srcSize"])

    # Fan bullets
    fb = vfx["fanBullets"]
    rad_base = math.radians(fb["baseDeg"])
    start_x = HERO_POS[0] + math.cos(rad_base) * fb["startDistance"]
    start_y = HERO_POS[1] + math.sin(rad_base) * fb["startDistance"]
    for i, off in enumerate(fb["spread"]):
        ang = fb["baseDeg"] + off
        rad = math.radians(ang)
        length = fb["lengthBase"] + (fb["lengthAltAdd"] if i % 2 == 0 else 0)
        cx = start_x + math.cos(rad) * (length / 2)
        cy = start_y + math.sin(rad) * (length / 2)
        place_radial(canvas, (cx, cy), (length, fb["contentH"]), fb["inner"], fb["outer"], W, H,
                     angle_deg=ang)

    # Hit sparks (one or more clusters)
    for hs in vfx["hitSparkClusters"]:
        tx, ty = hs["target"]
        for ox, oy, sz in hs["offsets"]:
            place_radial(canvas, (tx + ox, ty + oy), (sz * 2, sz * 2),
                         hs["inner"], hs["outer"], W, H, src_size=64)

    # Lightning chain
    lc = vfx["lightningChain"]
    chain = lc["nodes"]
    for seg_idx in range(len(chain) - 1):
        fx, fy = chain[seg_idx]
        tx, ty = chain[seg_idx + 1]
        dx = tx - fx; dy = ty - fy
        length = math.hypot(dx, dy)
        nx = -dy / length; ny = dx / length
        prev = (fx, fy)
        segments = lc["segments"]
        for s in range(1, segments + 1):
            t = s / segments
            base_x = fx + dx * t
            base_y = fy + dy * t
            jitter = 0 if s == segments else math.sin(s * 13 + seg_idx * 3) * lc["jitterAmp"]
            px = base_x + nx * jitter
            py = base_y + ny * jitter
            seg_len = math.hypot(px - prev[0], py - prev[1])
            seg_ang = math.degrees(math.atan2(py - prev[1], px - prev[0]))
            cx = (px + prev[0]) / 2
            cy = (py + prev[1]) / 2
            place_radial(canvas, (cx, cy), (int(seg_len), lc["boltContentH"]),
                         lc["boltInner"], lc["boltOuter"], W, H,
                         angle_deg=seg_ang, src_size=64)
            prev = (px, py)
    for c in chain:
        place_radial(canvas, c, (lc["hubSize"], lc["hubSize"]),
                     lc["hubInner"], lc["hubOuter"], W, H, src_size=64)

    # ---- HUD ----
    paint_hud(canvas, config["hud"], W, H)

    return canvas, W, H


def main():
    os.makedirs(OUT, exist_ok=True)
    config = load_config()
    img, W, H = render(config)
    prefix = sys.argv[1] if len(sys.argv) > 1 else "m2-0-data-loader"
    img.convert("RGB").save(os.path.join(OUT, f"{prefix}-01-overview.png"), "PNG")
    z1 = img.crop((50, 380, 390, 720))
    z1.convert("RGB").save(os.path.join(OUT, f"{prefix}-02-combat-vfx-zoom.png"), "PNG")
    top = img.crop((0, 0, 390, 80))
    mid = img.crop((0, 540, 390, 800))
    bot = img.crop((0, 760, 390, 844))
    out = Image.new("RGBA", (390, top.size[1] + mid.size[1] + bot.size[1] + 8), (10, 12, 14, 255))
    out.alpha_composite(top, (0, 0))
    out.alpha_composite(mid, (0, top.size[1] + 4))
    out.alpha_composite(bot, (0, top.size[1] + mid.size[1] + 8))
    out.convert("RGB").save(os.path.join(OUT, f"{prefix}-03-ui-prop-context.png"), "PNG")
    print(f"wrote 3 shots to {OUT} (prefix={prefix})")


if __name__ == "__main__":
    main()
