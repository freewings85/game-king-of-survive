"""
Generate an LPC-style terrain tileset placeholder.

Layout: 6 biomes (columns) x 4 variants (rows), each 64x64 → 384x256 PNG.

Biomes: grass, desert, snow, swamp, rocky, ruins.

This is a spec-compliant placeholder — when real LPC terrain art is
downloaded from OpenGameArt's Liberated Pixel Cup Base Assets, just
overwrite `lpc_terrain.png` with a 384x256 sheet using the same column
order (see tileset.json) and no code changes are required.

Source (when swapped in):
  https://opengameart.org/content/lpc-terrains
  https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles
"""
from PIL import Image, ImageDraw
import os
import random

TILE = 64
BIOMES = [
    # (id, base, accent, shadow)
    ("grass",  (58, 108, 52),  (86, 146, 68),  (38, 74, 34)),
    ("desert", (214, 178, 104),(234, 200, 130),(162, 118, 58)),
    ("snow",   (216, 226, 238),(244, 250, 255),(176, 198, 220)),
    ("swamp",  (60, 80, 52),   (90, 112, 68),  (30, 46, 24)),
    ("rocky",  (112, 102, 88), (142, 130, 112),(66, 58, 50)),
    ("ruins",  (130, 120, 100),(162, 152, 130),(80, 74, 60)),
]
VARIANTS = 4
SHEET_W = len(BIOMES) * TILE
SHEET_H = VARIANTS * TILE

img = Image.new("RGB", (SHEET_W, SHEET_H))
draw = ImageDraw.Draw(img)
rng = random.Random(4242)

def clamp(v):
    return max(0, min(255, v))

def jitter(col, amt=10):
    return (clamp(col[0] + rng.randint(-amt, amt)),
            clamp(col[1] + rng.randint(-amt, amt)),
            clamp(col[2] + rng.randint(-amt, amt)))

for bi, (name, base, accent, shadow) in enumerate(BIOMES):
    for vi in range(VARIANTS):
        x0 = bi * TILE
        y0 = vi * TILE

        # Base noise fill — weighted between base/accent/shadow
        for y in range(TILE):
            for x in range(TILE):
                n = rng.random()
                if n < 0.18:
                    col = jitter(shadow, 8)
                elif n < 0.85:
                    col = jitter(base, 10)
                else:
                    col = jitter(accent, 8)
                img.putpixel((x0 + x, y0 + y), col)

        # Biome-specific decorative details
        if name == "grass":
            # Grass blade strokes
            for _ in range(22):
                px = x0 + rng.randint(2, TILE - 3)
                py = y0 + rng.randint(2, TILE - 3)
                blade_h = rng.randint(2, 5)
                c = (clamp(accent[0] - 15), clamp(accent[1] - 5), clamp(accent[2] - 15))
                draw.line([(px, py), (px, py - blade_h)], fill=c)
            # Tiny flowers in variant 3
            if vi == 3:
                for _ in range(3):
                    px = x0 + rng.randint(6, TILE - 7)
                    py = y0 + rng.randint(6, TILE - 7)
                    img.putpixel((px, py), (240, 220, 80))
                    img.putpixel((px + 1, py), (240, 220, 80))

        elif name == "desert":
            # Sand dune ripples
            for _ in range(8):
                px = x0 + rng.randint(2, TILE - 12)
                py = y0 + rng.randint(2, TILE - 2)
                draw.line([(px, py), (px + rng.randint(4, 10), py)], fill=shadow)
            # Scattered pebbles
            for _ in range(5):
                px = x0 + rng.randint(2, TILE - 3)
                py = y0 + rng.randint(2, TILE - 3)
                img.putpixel((px, py), (clamp(shadow[0] - 10), clamp(shadow[1] - 10), clamp(shadow[2] - 10)))

        elif name == "snow":
            # Sparkles
            for _ in range(18):
                px = x0 + rng.randint(0, TILE - 1)
                py = y0 + rng.randint(0, TILE - 1)
                img.putpixel((px, py), (255, 255, 255))
            # Faint ice cracks
            for _ in range(2):
                px = x0 + rng.randint(4, TILE - 14)
                py = y0 + rng.randint(4, TILE - 4)
                draw.line([(px, py), (px + rng.randint(6, 12), py + rng.randint(-3, 3))], fill=shadow)

        elif name == "swamp":
            # Muddy bubbles
            for _ in range(6):
                px = x0 + rng.randint(4, TILE - 6)
                py = y0 + rng.randint(4, TILE - 6)
                draw.ellipse([(px, py), (px + 3, py + 2)], fill=(28, 44, 26))
            # Algae patches
            for _ in range(10):
                px = x0 + rng.randint(2, TILE - 2)
                py = y0 + rng.randint(2, TILE - 2)
                img.putpixel((px, py), (70, 104, 52))

        elif name == "rocky":
            # Cracks
            for _ in range(6):
                px = x0 + rng.randint(2, TILE - 12)
                py = y0 + rng.randint(2, TILE - 2)
                draw.line([(px, py), (px + rng.randint(5, 10), py + rng.randint(-3, 3))], fill=shadow)
            # Tiny rocks
            for _ in range(4):
                px = x0 + rng.randint(4, TILE - 6)
                py = y0 + rng.randint(4, TILE - 6)
                draw.ellipse([(px, py), (px + 2, py + 2)], fill=jitter(base, 20))

        elif name == "ruins":
            # Broken tile grout pattern
            for _ in range(3):
                px = x0 + rng.randint(2, TILE - 22)
                py = y0 + rng.randint(2, TILE - 22)
                w = rng.randint(10, 18)
                h = rng.randint(10, 18)
                draw.rectangle([(px, py), (px + w, py + h)], outline=shadow)
            # Cracked stones
            for _ in range(4):
                px = x0 + rng.randint(4, TILE - 6)
                py = y0 + rng.randint(4, TILE - 6)
                img.putpixel((px, py), shadow)

out_path = os.path.join(os.path.dirname(__file__), "lpc_terrain.png")
img.save(out_path)
print("wrote", out_path, SHEET_W, "x", SHEET_H)
