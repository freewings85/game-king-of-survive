// arena_c.json — 3rd map (Leo R5af F2 skeleton → R5ah F1 integration).
// Theme: Frozen Peaks — ArtDesigner concept (2026-04-21, altar_center_frozen.svg
// at 61e49c9). R5ah promoted from skeleton to first-playable: snow base + stone
// fight pit + frozen landmark sprite + 2 minor landmarks (snow_minor.svg). Tile
// id convention (demo/survivor.html:6747): 0=grass 1=dirt 2=stone 6=snow.
// Still uses layout='ffa-arena' to reuse arena_a engine code paths (no new
// rendering branch) per prototype cost discipline.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const COLS = 40, ROWS = 40, TS = 64;
const W = COLS * TS, H = ROWS * TS;

// Snow base (tile id 6) — ArtDesigner asset biomes/biome_snow.svg maps to id 6.
const tiles = new Array(COLS * ROWS).fill(6);

const paintCircle = (cx, cy, r, v) => {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx*dx + dy*dy <= r*r && x>=0 && y>=0 && x<COLS && y<ROWS) tiles[y*COLS + x] = v;
  }
};
const paintRing = (cx, cy, rOuter, rInner, v) => {
  for (let y = cy - rOuter; y <= cy + rOuter; y++) for (let x = cx - rOuter; x <= cx + rOuter; x++) {
    const dx = x - cx, dy = y - cy;
    const d2 = dx*dx + dy*dy;
    if (d2 <= rOuter*rOuter && d2 > rInner*rInner && x>=0 && y>=0 && x<COLS && y<ROWS) tiles[y*COLS + x] = v;
  }
};

const cx = COLS / 2, cy = ROWS / 2;
const tpx = (t) => t * TS + TS / 2;
const wcx = W / 2, wcy = H / 2;

// Stone fight pit in the centre (id 2) — visual contrast with snow base.
// Smaller pit than arena_a (r=7 vs 9) so the snow apron reads wider.
paintCircle(cx, cy, 7, 2);
// Small grass island at the very centre for the altar (id 0) — differentiates
// the altar from the pit floor and matches arena_a's inner clearing pattern.
paintCircle(cx, cy, 3, 0);

const structures = [];
const push = (s) => structures.push(s);

// Central landmark — ArtDesigner's frozen altar (commit 61e49c9).
push({
  kind: 'landmark',
  x: wcx - 192, y: wcy - 256,
  w: 384, h: 512,
  color: '#a8c0d8',
  label: '冰封祭坛',
  sprite: 'assets/maps/landmarks/altar_center_frozen.svg',
  anchorX: 192, anchorY: 498
});

// Mountain ring — snowy peaks (mountains/mountains.svg col=0). Engine may not
// wire spriteCol yet; the hint is durable for when it does. Same cadence as
// arena_a (16 blocks, RING_R_TILES 18) so enclosed-arena silhouette reads
// identically.
const RING_R_TILES = 18;
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2;
  const tx = cx + Math.cos(a) * RING_R_TILES;
  const ty = cy + Math.sin(a) * RING_R_TILES;
  push({
    kind: 'mountain',
    x: tx * TS - 48, y: ty * TS - 48, w: 96, h: 96,
    color: '#c8d4e4',
    sprite: 'assets/maps/mountains/mountains.svg',
    spriteCol: 0 // snowy_peak
  });
}

// 6 cover crates (stone debris) around the fight pit for line-of-sight breaks.
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 + Math.PI / 12;
  const r = 10;
  const tx = cx + Math.cos(a) * r, ty = cy + Math.sin(a) * r;
  push({ kind: 'crate', x: tx * TS - 16, y: ty * TS - 16, w: 32, h: 32, color: '#8a95a3' });
}

// Two minor landmarks (ArtDesigner snow_minor.svg — 冰龙 + 熊巢 per chat).
// Placed at N and S apron positions so players pass them on approach routes.
push({
  kind: 'minor_landmark',
  x: wcx - 64, y: tpx(cy - 14) - 64,
  w: 128, h: 128,
  color: '#a8bdd4',
  label: '冰龙穴',
  sprite: 'assets/maps/minor/snow_minor.svg'
});
push({
  kind: 'minor_landmark',
  x: wcx - 64, y: tpx(cy + 14) - 64,
  w: 128, h: 128,
  color: '#a8bdd4',
  label: '熊巢',
  sprite: 'assets/maps/minor/snow_minor.svg'
});

// Strategic points + boss spawns (minimal — matches arena_a surface area).
const stratR = 13;
const stratPoints = [
  { type: 'temple',     x: wcx, y: wcy, name: '冰封祭坛' },
  { type: 'watchtower', x: tpx(cx),            y: tpx(cy - stratR), name: '北哨' },
  { type: 'watchtower', x: tpx(cx),            y: tpx(cy + stratR), name: '南哨' },
  { type: 'camp',       x: tpx(cx - stratR),   y: tpx(cy),          name: '西营' },
  { type: 'camp',       x: tpx(cx + stratR),   y: tpx(cy),          name: '东营' }
];
const bossPoints = [
  { name: 'NE 冰巨怪', x: tpx(cx + 10), y: tpx(cy - 10) },
  { name: 'SW 冰龙穴', x: tpx(cx - 10), y: tpx(cy + 10) }
];

// 8 spawn points evenly around the apron — mirror arena_a density so bot AI
// behaves identically on the ffa-arena layout.
const spawnPoints = [];
const spawnR = 15;
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  spawnPoints.push({ x: tpx(cx + Math.cos(a) * spawnR), y: tpx(cy + Math.sin(a) * spawnR) });
}

const data = {
  name: '冰峰遗迹',
  version: 1,
  tileSize: TS,
  cols: COLS, rows: ROWS,
  width: W, height: H,
  layout: 'ffa-arena',
  biomes: [
    { name: '中央冰塔',  region: { x: wcx - 7*TS,  y: wcy - 7*TS,  w: 14*TS, h: 14*TS } },
    { name: '外环冻原',  region: { x: 0, y: 0, w: W, h: H } }
  ],
  stormCenter: { x: wcx, y: wcy },
  tiles,
  structures,
  spawnPoints,
  stratPoints,
  bossPoints,
  // Class whitelist hint (Leo R5ah F1, extended R5aj). Engine is permissive;
  // menu flow honours this list. R5aj added healer after stable R5ai signoff
  // (healer kills 1.5 / TTL 53s / σ=0 across runs). assassin still arena-only
  // pending lane pathfinding fixes.
  classWhitelist: ['mage', 'warrior', 'scout', 'healer']
};

const __dirname = dirname(fileURLToPath(import.meta.url));
await writeFile(join(__dirname, 'arena_c.json'), JSON.stringify(data, null, 2));
console.log('wrote arena_c.json:', COLS, 'x', ROWS, 'structs:', structures.length, 'spawns:', spawnPoints.length, 'strat:', stratPoints.length, 'boss:', bossPoints.length);
