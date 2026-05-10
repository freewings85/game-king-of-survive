"""
Cross-check spawn-dump.json (produced by run_smoke.cjs) against
m2-visual-scene.json. Asserts the .ts runtime really consumed the JSON
config and produced the expected actors / VFX / HUD nodes.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.join(HERE, "build", "spawn-dump.json")
CONFIG = os.path.join(HERE, "..", "..", "assets", "resources", "config", "m2-visual-scene.json")


def flatten(node, out=None):
    if out is None:
        out = []
    out.append(node)
    for c in node.get("children", []):
        flatten(c, out)
    return out


def find(flat, name):
    return [n for n in flat if n["name"] == name]


def approx(a, b, tol=1e-3):
    return abs(a - b) <= tol


def main():
    dump = json.load(open(DUMP, encoding="utf-8"))
    config = json.load(open(CONFIG, encoding="utf-8"))
    flat = flatten(dump)

    failures = []

    def expect(cond, msg):
        if not cond:
            failures.append(msg)

    # --- Hero ---
    heroes = find(flat, "Hero")
    expect(len(heroes) == 1, f"Hero count: expected 1, got {len(heroes)}")
    if heroes:
        h = heroes[0]
        cfg = config["hero"]
        expect(approx(h["pos"][0], cfg["pos"][0]) and approx(h["pos"][1], cfg["pos"][1]),
               f"Hero pos: dump={h['pos'][:2]} config={cfg['pos']}")
        expect(approx(h["angle"], cfg["angleDeg"]),
               f"Hero angle: dump={h['angle']} config={cfg['angleDeg']}")
        expect(h["contentSize"] == cfg["contentSize"],
               f"Hero contentSize: dump={h['contentSize']} config={cfg['contentSize']}")
        expect(h["layer"] == "World", f"Hero layer: {h['layer']}")

    # --- Zombies ---
    for z_cfg in config["zombies"]:
        nodes = find(flat, z_cfg["name"])
        expect(len(nodes) == 1, f"Zombie {z_cfg['name']} count: {len(nodes)}")
        if not nodes:
            continue
        n = nodes[0]
        expect(approx(n["pos"][0], z_cfg["pos"][0]) and approx(n["pos"][1], z_cfg["pos"][1]),
               f"Zombie {z_cfg['name']} pos: {n['pos'][:2]} vs {z_cfg['pos']}")
        expect(n["color"] == z_cfg["tint"],
               f"Zombie {z_cfg['name']} tint: dump={n['color']} cfg={z_cfg['tint']}")
        expected_size = z_cfg["baseSize"] * z_cfg["scale"]
        expect(approx(n["contentSize"][0], expected_size) and approx(n["contentSize"][1], expected_size),
               f"Zombie {z_cfg['name']} contentSize: {n['contentSize']} vs {expected_size}")
        if z_cfg["rotateTowardHero"]:
            hero = config["hero"]["pos"]
            expected_angle = math.degrees(math.atan2(hero[1] - z_cfg["pos"][1], hero[0] - z_cfg["pos"][0]))
            expect(approx(n["angle"], expected_angle, tol=1e-6),
                   f"Zombie {z_cfg['name']} angle: dump={n['angle']} expected={expected_angle}")
        expect(n["layer"] == "World", f"Zombie {z_cfg['name']} layer: {n['layer']}")

    # --- Props ---
    for p_cfg in config["props"]:
        nodes = find(flat, p_cfg["name"])
        expect(len(nodes) == 1, f"Prop {p_cfg['name']} count: {len(nodes)}")
        if not nodes:
            continue
        n = nodes[0]
        expect(approx(n["pos"][0], p_cfg["pos"][0]) and approx(n["pos"][1], p_cfg["pos"][1]),
               f"Prop {p_cfg['name']} pos: {n['pos'][:2]} vs {p_cfg['pos']}")
        expect(approx(n["angle"], p_cfg["angleDeg"]),
               f"Prop {p_cfg['name']} angle: {n['angle']} vs {p_cfg['angleDeg']}")
        expect(n["contentSize"] == p_cfg["contentSize"],
               f"Prop {p_cfg['name']} size: {n['contentSize']} vs {p_cfg['contentSize']}")
        if p_cfg["tint"]:
            expect(n["color"] == p_cfg["tint"], f"Prop {p_cfg['name']} tint: {n['color']} vs {p_cfg['tint']}")

    # --- VFX counts ---
    expect(len(find(flat, "MuzzleCone")) == 1, "MuzzleCone missing")
    expect(len(find(flat, "MuzzleBurst")) == 1, "MuzzleBurst missing")

    bullets = [n for n in flat if n["name"].startswith("Bullet_")]
    expect(len(bullets) == len(config["vfx"]["fanBullets"]["spread"]),
           f"Bullets count: {len(bullets)} vs {len(config['vfx']['fanBullets']['spread'])}")

    sparks = [n for n in flat if n["name"].startswith("Spark_")]
    expect(len(sparks) == len(config["vfx"]["hitSparks"]["offsets"]),
           f"Sparks count: {len(sparks)} vs {len(config['vfx']['hitSparks']['offsets'])}")

    chain = config["vfx"]["lightningChain"]
    expected_bolts = (len(chain["nodes"]) - 1) * chain["segments"]
    bolts = [n for n in flat if n["name"].startswith("Bolt_")]
    expect(len(bolts) == expected_bolts, f"Bolt segments: {len(bolts)} vs {expected_bolts}")

    hubs = [n for n in flat if n["name"].startswith("LightningHub_")]
    expect(len(hubs) == len(chain["nodes"]), f"Lightning hubs: {len(hubs)} vs {len(chain['nodes'])}")

    # --- HUD ---
    hud_names = ["HUD_Portrait_Frame", "HUD_Portrait_Fill", "HUD_HP_Bar", "HUD_Armor_Bar",
                 "HUD_EXP_Bar", "HUD_Minimap", "HUD_Stick_Ring", "HUD_Stick_Thumb"]
    for hn in hud_names:
        nodes = find(flat, hn)
        expect(len(nodes) == 1, f"HUD {hn} count: {len(nodes)}")
        if nodes:
            expect(nodes[0]["layer"] == "HUD", f"HUD {hn} layer: {nodes[0]['layer']}")

    for sk_cfg in config["hud"]["skills"]:
        for suffix in ("_Glow", "_Disc", "_Glyph"):
            name = sk_cfg["name"] + suffix
            nodes = find(flat, name)
            expect(len(nodes) == 1, f"Skill {name}: count {len(nodes)}")

    # --- Pickup deletion ---
    pickup_like = [n for n in flat if "ickup" in n["name"]]
    expect(not pickup_like, f"Pickup nodes leaked into spawn: {[n['name'] for n in pickup_like]}")

    # --- Report ---
    if failures:
        print(f"FAIL: {len(failures)} assertion(s)")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print(f"OK: dump {DUMP} matches config {CONFIG} ({len(flat)} nodes verified)")


if __name__ == "__main__":
    main()
