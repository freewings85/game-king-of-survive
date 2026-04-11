"""
Generate LPC-spec compliant placeholder sprite sheets for warrior/mage/scout.

Spec (locked by GameDesigner v1 doc):
  - Frame: 64x64
  - Sheet: 13 cols (max LPC frames) x 21 rows = 832 x 1344
  - Row layout (standard LPC):
      0-3   spellcast  U/L/D/R x 7 frames
      4-7   thrust     U/L/D/R x 8 frames
      8-11  walk       U/L/D/R x 9 frames  (frame 0 = idle)
      12-15 slash      U/L/D/R x 6 frames
      16-19 shoot      U/L/D/R x 13 frames
      20    hurt       D only  x 6 frames

These are spec-compliant placeholders. When real LPC art is downloaded,
just overwrite the .png files; sprites.json and game code stay unchanged.
"""
from PIL import Image, ImageDraw, ImageFont
import os

FW = FH = 64
COLS = 13
ROWS = 21
SHEET_W = COLS * FW
SHEET_H = ROWS * FH

# Row groups: (start_row, frames, name)
GROUPS = [
    (0,  7, "cast"),
    (4,  8, "thrust"),
    (8,  9, "walk"),
    (12, 6, "slash"),
    (16, 13, "shoot"),
    (20, 6, "hurt"),
]
DIRS = ["U", "L", "D", "R"]  # LPC standard order

CLASSES = {
    "warrior": {
        "body":  (180, 140, 100, 255),   # skin
        "armor": (140, 140, 160, 255),   # plate gray
        "trim":  (220, 200,  60, 255),   # gold
        "weapon":(200, 200, 220, 255),   # sword steel
        "shape": "bulky",
    },
    "mage": {
        "body":  (200, 170, 130, 255),
        "armor": ( 80,  60, 160, 255),   # purple robe
        "trim":  (240, 220, 100, 255),   # gold trim
        "weapon":(160, 100,  60, 255),   # wooden staff
        "shape": "slim",
    },
    "scout": {
        "body":  (190, 150, 110, 255),
        "armor": ( 60, 110,  60, 255),   # green leather
        "trim":  (110,  70,  40, 255),   # brown
        "weapon":(140,  90,  50, 255),   # bow wood
        "shape": "agile",
    },
}


def draw_character(draw, ox, oy, cls, dir_letter, frame_idx, anim_name):
    """Draw a single 64x64 character frame at offset (ox, oy)."""
    c = CLASSES[cls]
    cx = ox + FW // 2
    cy = oy + FH // 2

    # Subtle frame border for debug visibility (1px, very dark)
    draw.rectangle([ox, oy, ox + FW - 1, oy + FH - 1],
                   outline=(0, 0, 0, 40))

    # Walk bob: vertical offset based on frame
    bob = 0
    if anim_name == "walk":
        bob = [0, -1, -2, -1, 0, -1, -2, -1, 0][frame_idx % 9]
    elif anim_name == "slash" or anim_name == "thrust":
        bob = [0, -1, -2, -1, 0, 0, 0, 0][frame_idx % 8]

    # Body silhouette varies by class shape
    shape = c["shape"]
    if shape == "bulky":
        body_w, body_h = 22, 24
    elif shape == "slim":
        body_w, body_h = 16, 26
    else:  # agile
        body_w, body_h = 18, 24

    # Torso (armor color)
    draw.rectangle(
        [cx - body_w // 2, cy - 4 + bob,
         cx + body_w // 2, cy + body_h // 2 + bob],
        fill=c["armor"], outline=(0, 0, 0, 200))

    # Trim line across chest
    draw.line(
        [cx - body_w // 2, cy + 4 + bob,
         cx + body_w // 2, cy + 4 + bob],
        fill=c["trim"], width=1)

    # Head
    head_r = 7
    draw.ellipse(
        [cx - head_r, cy - 18 + bob, cx + head_r, cy - 18 + 2 * head_r + bob],
        fill=c["body"], outline=(0, 0, 0, 200))

    # Direction indicator: a small marker showing facing
    if dir_letter == "U":
        draw.polygon([(cx, cy - 22 + bob), (cx - 3, cy - 18 + bob), (cx + 3, cy - 18 + bob)],
                     fill=(255, 255, 255, 220))
    elif dir_letter == "D":
        draw.polygon([(cx, cy - 10 + bob), (cx - 3, cy - 14 + bob), (cx + 3, cy - 14 + bob)],
                     fill=(255, 255, 255, 220))
    elif dir_letter == "L":
        draw.polygon([(cx - 7, cy - 14 + bob), (cx - 3, cy - 17 + bob), (cx - 3, cy - 11 + bob)],
                     fill=(255, 255, 255, 220))
    elif dir_letter == "R":
        draw.polygon([(cx + 7, cy - 14 + bob), (cx + 3, cy - 17 + bob), (cx + 3, cy - 11 + bob)],
                     fill=(255, 255, 255, 220))

    # Legs
    leg_top = cy + body_h // 2 + bob
    leg_bot = cy + body_h // 2 + 8
    leg_offset = 2 if anim_name == "walk" and frame_idx % 2 == 1 else 0
    draw.rectangle([cx - 5 + leg_offset, leg_top, cx - 1 + leg_offset, leg_bot],
                   fill=c["trim"])
    draw.rectangle([cx + 1 - leg_offset, leg_top, cx + 5 - leg_offset, leg_bot],
                   fill=c["trim"])

    # Weapon: position depends on direction + animation
    weapon_color = c["weapon"]
    if cls == "warrior":
        # Sword: side of body
        if dir_letter == "R":
            sx, sy = cx + 10, cy - 6 + bob
            sx2, sy2 = cx + 10, cy + 8 + bob
        elif dir_letter == "L":
            sx, sy = cx - 10, cy - 6 + bob
            sx2, sy2 = cx - 10, cy + 8 + bob
        else:
            sx, sy = cx + 8, cy - 4 + bob
            sx2, sy2 = cx + 8, cy + 6 + bob
        # Slash extends weapon
        if anim_name == "slash":
            ext = [0, 2, 4, 6, 4, 2][frame_idx % 6]
            sy -= ext
        draw.line([sx, sy, sx2, sy2], fill=weapon_color, width=2)
    elif cls == "mage":
        # Staff: tall stick with orb
        if dir_letter == "R":
            stx = cx + 10
        elif dir_letter == "L":
            stx = cx - 10
        else:
            stx = cx + 8
        draw.line([stx, cy - 14 + bob, stx, cy + 10 + bob], fill=weapon_color, width=2)
        # Orb (spellcast lights up)
        orb_color = c["trim"] if anim_name == "cast" else (200, 180, 80, 200)
        orb_r = 3 if anim_name != "cast" else 4 + (frame_idx % 3)
        draw.ellipse([stx - orb_r, cy - 14 - orb_r + bob,
                      stx + orb_r, cy - 14 + orb_r + bob],
                     fill=orb_color)
    elif cls == "scout":
        # Bow: curved line
        if dir_letter == "R":
            bx = cx + 10
        elif dir_letter == "L":
            bx = cx - 10
        else:
            bx = cx + 8
        draw.arc([bx - 4, cy - 10 + bob, bx + 4, cy + 10 + bob],
                 start=270, end=90, fill=weapon_color, width=2)
        # Shoot animation: arrow
        if anim_name == "shoot" and frame_idx >= 8:
            ax = bx + (8 if dir_letter == "R" else -8 if dir_letter == "L" else 0)
            draw.line([bx, cy + bob, ax + 6, cy + bob],
                      fill=(80, 60, 40, 255), width=1)


def make_sheet(cls):
    img = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    for start_row, n_frames, anim in GROUPS:
        if anim == "hurt":
            # hurt is single row, direction = D
            for f in range(n_frames):
                ox = f * FW
                oy = start_row * FH
                draw_character(draw, ox, oy, cls, "D", f, anim)
        else:
            for d_idx, dir_letter in enumerate(DIRS):
                row = start_row + d_idx
                for f in range(n_frames):
                    ox = f * FW
                    oy = row * FH
                    draw_character(draw, ox, oy, cls, dir_letter, f, anim)

    return img


def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    for cls in CLASSES.keys():
        img = make_sheet(cls)
        path = os.path.join(out_dir, f"lpc_{cls}.png")
        img.save(path, "PNG")
        print(f"Wrote {path}  ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
