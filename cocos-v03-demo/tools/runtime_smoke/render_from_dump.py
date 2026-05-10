"""
Render spawn-dump.json (from .ts runtime) into M2-0b preview PNGs.

The dump drives EVERY spawn decision (which nodes exist, layer, position,
angle, contentSize, color tint). Paint colors for procedural sprites
(muzzle / bullet / spark / lightning / HUD bars+discs) come from the same
m2-visual-scene.json the .ts side already consumed — they're baked into
the SpriteFrame pixel buffer at runtime, so the dump can't carry them.

Outputs: can_delete/shots/m2-0b-runtime-loader-{01-overview, 02-combat-vfx-zoom, 03-ui-prop-context}.png
"""
import json
import math
import os
import random
import sys

# Reuse paint primitives from the M2-0 preview renderer.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "cocos-v03-demo", "tools"))
from render_m1_preview import (  # noqa: E402
    Image, ImageDraw, ImageFilter,
    gen_terrain_tile, attach_terrain,
    radial_alpha, place_radial,
    fit_keep_aspect, tint_sprite, place,
    make_disc, make_ring, make_rounded_bar, make_minimap,
    make_skill_disc, make_glyph,
    PROP_FILE, ZOMBIE_FILE, HERO_FILE,
    ART, OUT,
    to_px,
)

DUMP = os.path.join(HERE, "build", "spawn-dump.json")
CONFIG = os.path.join(ROOT, "cocos-v03-demo", "assets", "resources", "config", "m2-visual-scene.json")


def flatten(node, out=None):
    if out is None:
        out = []
    out.append(node)
    for c in node.get("children", []):
        flatten(c, out)
    return out


def normalize_dump(flat):
    # m2-0 baseline truncates `int(baseSize*scale)` BEFORE fit_keep_aspect / paste,
    # while .ts UITransform.setContentSize stores the raw float (e.g. 149.5).
    # Round here so px-fit math matches the baseline; the underlying spawn
    # decision is unchanged — verify_dump.py already asserted equivalence.
    for n in flat:
        cs = n.get("contentSize")
        if cs:
            n["contentSize"] = [int(cs[0]), int(cs[1])]
    return flat


def by_name(flat, name):
    for n in flat:
        if n["name"] == name:
            return n
    return None


def all_named(flat, prefix):
    return [n for n in flat if n["name"].startswith(prefix)]


def paste_centered(canvas, img, world_pos, content_size, W, H):
    # mirror render_m1_preview.py's integer rounding so px-level diffs
    # against the m2-0 baseline aren't 1px-offset artifacts of the
    # float contentSizes (e.g. 46.2 from baseSize*scale) we capture in dump.
    cw, ch = int(content_size[0]), int(content_size[1])
    target = img.resize((cw, ch), Image.LANCZOS)
    px_x, px_y = to_px(world_pos[0], world_pos[1], W, H)
    canvas.alpha_composite(target, (int(px_x - cw / 2), int(px_y - ch / 2)))


def render():
    dump = json.load(open(DUMP, encoding="utf-8"))
    config = json.load(open(CONFIG, encoding="utf-8"))
    flat = normalize_dump(flatten(dump))

    W = config["canvas"]["width"]
    H = config["canvas"]["height"]
    canvas = Image.new("RGBA", (W, H), tuple(config["canvas"]["clearColor"]))

    # Terrain — dump confirms tiles exist; paint with the same deterministic
    # seed the M2-0 preview uses (the .ts runtime uses Date.now(), but the
    # tile content itself is procedural and CONTRACT §3.4 wallpaper, not
    # part of M1y's "6 UI parts" visual contract).
    tile = gen_terrain_tile(seed=12345)
    attach_terrain(canvas, tile, W, H)

    # Props (back layer) — pos/size/angle/tint all from dump
    for p_cfg in config["props"]:
        n = by_name(flat, p_cfg["name"])
        if not n:
            continue
        # contact shadow: dump captured a 'ContactShadow' node co-spawned with
        # each prop, but they share a name — we just paint the shadow under
        # the prop based on prop pos and config shadow size.
        place_radial(canvas, (n["pos"][0], n["pos"][1] - 6), p_cfg["shadow"],
                     [0, 0, 0, 205], [0, 0, 0, 0], W, H)
        spr = Image.open(os.path.join(ART, "props", PROP_FILE[p_cfg["key"]])).convert("RGBA")
        if n["color"] and n["color"] != [255, 255, 255, 255]:
            spr = tint_sprite(spr, n["color"])
        place(canvas, spr, n["pos"], n["contentSize"], W, H, angle_deg=n["angle"])

    # Hero shadow + sprite
    hero_node = by_name(flat, "Hero")
    hero_cfg = config["hero"]
    place_radial(canvas, (hero_node["pos"][0], hero_node["pos"][1] - 6), hero_cfg["shadow"],
                 [0, 0, 0, 205], [0, 0, 0, 0], W, H)

    # Zombie shadows (config still owns the shadow ellipse size — runtime
    # spawns a same-named 'ContactShadow' but dump doesn't disambiguate per zombie)
    for z_cfg in config["zombies"]:
        n = by_name(flat, z_cfg["name"])
        if not n:
            continue
        sw = z_cfg["shadow"][0] * z_cfg["scale"]
        sh = z_cfg["shadow"][1] * z_cfg["scale"]
        place_radial(canvas, (n["pos"][0], n["pos"][1] - 6), (sw, sh),
                     [0, 0, 0, 205], [0, 0, 0, 0], W, H)

    # Hero
    hero_img = Image.open(os.path.join(ART, "hero", HERO_FILE[hero_cfg["frame"]])).convert("RGBA")
    place(canvas, hero_img, hero_node["pos"], hero_node["contentSize"], W, H, angle_deg=hero_node["angle"])

    # Zombies — sprite frame chosen by config.frame, everything else from dump
    z_frames = {k: Image.open(os.path.join(ART, "zombie", v)).convert("RGBA") for k, v in ZOMBIE_FILE.items()}
    for z_cfg in config["zombies"]:
        n = by_name(flat, z_cfg["name"])
        if not n:
            continue
        place(canvas, tint_sprite(z_frames[z_cfg["frame"]], n["color"]),
              n["pos"], n["contentSize"], W, H, angle_deg=n["angle"])

    # ---- VFX ----
    vfx = config["vfx"]

    # Muzzle cone + burst — dump gives pos/contentSize/angle, config gives inner/outer/srcSize
    for fx_key, node_name in (("muzzleCone", "MuzzleCone"), ("muzzleBurst", "MuzzleBurst")):
        n = by_name(flat, node_name)
        if not n:
            continue
        m = vfx[fx_key]
        place_radial(canvas, n["pos"], n["contentSize"], m["inner"], m["outer"], W, H,
                     angle_deg=n["angle"], src_size=m["srcSize"])

    # Fan bullets
    for n in all_named(flat, "Bullet_"):
        place_radial(canvas, n["pos"], n["contentSize"], vfx["fanBullets"]["inner"],
                     vfx["fanBullets"]["outer"], W, H, angle_deg=n["angle"])

    # Hit sparks
    for n in all_named(flat, "Spark_"):
        place_radial(canvas, n["pos"], n["contentSize"], vfx["hitSparks"]["inner"],
                     vfx["hitSparks"]["outer"], W, H, src_size=64)

    # Lightning bolt segments
    for n in all_named(flat, "Bolt_"):
        place_radial(canvas, n["pos"], n["contentSize"], vfx["lightningChain"]["boltInner"],
                     vfx["lightningChain"]["boltOuter"], W, H, angle_deg=n["angle"], src_size=64)

    # Lightning hubs
    for n in all_named(flat, "LightningHub_"):
        place_radial(canvas, n["pos"], n["contentSize"], vfx["lightningChain"]["hubInner"],
                     vfx["lightningChain"]["hubOuter"], W, H, src_size=64)

    # ---- HUD ----
    hud = config["hud"]

    def paint_disc_node(name, disc_cfg):
        n = by_name(flat, name)
        if not n:
            return
        paste_centered(canvas, make_disc(disc_cfg["discSize"], disc_cfg["fill"],
                                         edge=disc_cfg.get("edge"), edge_w=disc_cfg.get("edgeWidth", 0)),
                       n["pos"], n["contentSize"], W, H)

    paint_disc_node("HUD_Portrait_Frame", hud["portrait"]["frame"])
    paint_disc_node("HUD_Portrait_Fill", hud["portrait"]["fill"])

    for bar_name, bar_key in (("HUD_HP_Bar", "hpBar"), ("HUD_Armor_Bar", "armorBar"), ("HUD_EXP_Bar", "expBar")):
        n = by_name(flat, bar_name)
        b = hud[bar_key]
        if n:
            paste_centered(canvas, make_rounded_bar(b["barW"], b["barH"], b["fill"], b["bg"], b["fillFrac"]),
                           n["pos"], n["contentSize"], W, H)

    n_mm = by_name(flat, "HUD_Minimap")
    if n_mm:
        paste_centered(canvas, make_minimap(hud["minimap"]["size"]), n_mm["pos"], n_mm["contentSize"], W, H)

    n_ring = by_name(flat, "HUD_Stick_Ring")
    if n_ring:
        paste_centered(canvas, make_ring(hud["joystick"]["ring"]["size"], hud["joystick"]["ring"]["outerR"],
                                         hud["joystick"]["ring"]["innerR"], hud["joystick"]["ring"]["fill"]),
                       n_ring["pos"], n_ring["contentSize"], W, H)
    paint_disc_node("HUD_Stick_Thumb", hud["joystick"]["thumb"])

    for sk_cfg in hud["skills"]:
        n_glow = by_name(flat, sk_cfg["name"] + "_Glow")
        n_disc = by_name(flat, sk_cfg["name"] + "_Disc")
        n_glyph = by_name(flat, sk_cfg["name"] + "_Glyph")
        if n_glow:
            place_radial(canvas, n_glow["pos"], n_glow["contentSize"],
                         [sk_cfg["base"][0], sk_cfg["base"][1], sk_cfg["base"][2], sk_cfg["glowAlpha"]],
                         [sk_cfg["base"][0], sk_cfg["base"][1], sk_cfg["base"][2], 0], W, H)
        if n_disc:
            paste_centered(canvas, make_skill_disc(96, sk_cfg["base"]),
                           n_disc["pos"], n_disc["contentSize"], W, H)
        if n_glyph:
            paste_centered(canvas, make_glyph(64, sk_cfg["glyph"]),
                           n_glyph["pos"], n_glyph["contentSize"], W, H)

    return canvas, W, H


def main():
    os.makedirs(OUT, exist_ok=True)
    img, W, H = render()
    prefix = "m2-0b-runtime-loader"
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
    print(f"wrote 3 m2-0b shots to {OUT}")


if __name__ == "__main__":
    main()
