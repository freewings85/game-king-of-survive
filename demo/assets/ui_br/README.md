# BR UI elements — homm3_bright style pack

UI assets specific to the BR ("chicken dinner") experience Leo is pivoting to in Phase 2.

## Files

### Storm warning
- `storm_bar.png` (512×48) — horizontal pulsing red bar with skull + chevron arrows + "STORM CLOSING" text (twice). Intended to be overlaid at screen edge / HUD top during storm-ring collapse, with opacity/scale pulse driven by JS.
- Tint it darker/brighter by alpha-blending; the bar already has fade-at-ends so it reads clean if sliced horizontally.

### Rank crowns
- `crown_gold.png`   (64×64) — #1 gold crown + red gem
- `crown_silver.png` (64×64) — #2 silver crown + blue gem
- `crown_bronze.png` (64×64) — #3 bronze crown + green gem
- Use at top-right of HUD next to "剩余 X 人", or at end-of-match victory screen.

### Killfeed
- `killfeed_card.png` (192×64) — semi-transparent black card with gold trim + skull icon, placeholder "<killer> killed <victim>" text. Developer should render his own text on top; the PNG is the background.
- `killfeed9/{tl,t,tr,l,c,r,bl,b,br}.png` — 9-slice source (cornerSize=16). Use if the card needs to stretch for longer names.
- `killfeed9/meta.json` — slice metadata.

## Recommended usage (Developer)

```js
// Storm closing — alpha pulse 0.7 ↔ 1.0 at 2 Hz
const pulse = 0.85 + Math.sin(performance.now() / 160) * 0.15;
ctx.globalAlpha = pulse;
ctx.drawImage(stormBar, 0, stormBarY, screenW, 48);
ctx.globalAlpha = 1;

// Killfeed: stack 3 most recent at top-right
for (let i = 0; i < killfeed.length && i < 3; i++) {
  const y = 60 + i * 68;
  draw9SliceKillfeed(ctx, screenW - 200, y, 192, 64);
  ctx.fillText(killfeed[i].killer, screenW - 160, y + 26);
  ctx.fillText(`killed ${killfeed[i].victim}`, screenW - 160, y + 46);
}

// Crown next to rank number at end-of-match
if (rank === 1) ctx.drawImage(crownGold, cx, cy, 64, 64);
```

## QA preview
- `_qa.png` — all elements rendered together on grass background.
- `_qa.html` — same, live in a browser.

## LICENSE
**CC0 (Public Domain).** Generated from parametric SVG in `_build.mjs` via playwright rasterization.

Re-generate:
```
node demo/assets/ui_br/_build.mjs
```
