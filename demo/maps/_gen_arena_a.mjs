// arena_a.json — FFA round-arena layout (Leo 2026-04-21).
// 40x40 tile @ 64px = 2560x2560. Concentric stone fight pit + grass apron +
// mountain ring; 8 perimeter spawns; central altar; 4 satellite strat points.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const COLS = 40, ROWS = 40, TS = 64;
const W = COLS * TS, H = ROWS * TS;
const tiles = new Array(COLS * ROWS).fill(0); // grass

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
// Outer mountain ring (4 tile thick) — keeps players inside the arena visually
paintRing(cx, cy, 19, 17, 2); // stone ring marks the boundary visually (use stone tile for style)
// Sand apron between fight pit and outer ring (tile id 4)
paintRing(cx, cy, 16, 9, 4);
// Central stone fight pit
paintCircle(cx, cy, 9, 2);
// Center inner grass clearing for the altar
paintCircle(cx, cy, 3, 0);

const wcx = W / 2, wcy = H / 2;
const tpx = (t) => t * TS + TS / 2;
const structures = [];
const push = (s) => structures.push(s);

// ldoe-overhaul-02a: 11 LDOE landmarks真的入地图 (arena_a — circular arena).
// Distributed in 4 cardinal sectors so harness fence_hit_rate ≥ 2/3 reachable.
const ldoeLm = [
  // North sector
  { kind: 'fence',       tx: 20, ty: 6,  w: 130, h: 110, label: '北铁丝网' },
  { kind: 'gas_station', tx: 14, ty: 8,  w: 144, h: 132, label: '北加油站' },
  { kind: 'wreck_car',   tx: 26, ty: 8,  w: 140, h: 130, label: '北翻车' },
  // East sector
  { kind: 'fence',       tx: 33, ty: 20, w: 130, h: 110, label: '东铁丝网' },
  { kind: 'barricade',   tx: 31, ty: 14, w: 140, h: 130, label: '东路障' },
  // South sector
  { kind: 'fence',       tx: 20, ty: 33, w: 130, h: 110, label: '南铁丝网' },
  { kind: 'wreck_car',   tx: 26, ty: 31, w: 140, h: 130, label: '南翻车' },
  { kind: 'debris',      tx: 14, ty: 31, w: 130, h: 110, label: '南废墟' },
  // West sector
  { kind: 'gas_station', tx: 7,  ty: 20, w: 144, h: 132, label: '西加油站' },
  { kind: 'barricade',   tx: 9,  ty: 14, w: 140, h: 130, label: '西路障' },
  { kind: 'debris',      tx: 9,  ty: 26, w: 130, h: 110, label: '西废墟' }
];
ldoeLm.forEach(s => push({ kind: s.kind, x: s.tx * TS - s.w/2, y: s.ty * TS - s.h/2, w: s.w, h: s.h, color: '#6e2a1c', label: s.label }));

// Mountain ring: place 16 mountain blocks evenly around the outer wall so
// the arena reads as enclosed, with gaps wide enough for movement.
const RING_R_TILES = 18;
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2;
  const tx = cx + Math.cos(a) * RING_R_TILES;
  const ty = cy + Math.sin(a) * RING_R_TILES;
  push({ kind: 'mountain', x: tx * TS - 48, y: ty * TS - 48, w: 96, h: 96, color: '#8a8a90' });
}

// 8 cover crates evenly placed in the apron so the fight pit has line-of-sight breaks
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
  const r = 12;
  const tx = cx + Math.cos(a) * r, ty = cy + Math.sin(a) * r;
  push({ kind: 'crate', x: tx * TS - 16, y: ty * TS - 16, w: 32, h: 32, color: '#886633' });
}

// Strategic points — center temple + 4 cardinal camps in the apron
const stratR = 13;
const stratPoints = [
  { type: 'temple',     x: wcx, y: wcy, name: '王座' },
  { type: 'watchtower', x: tpx(cx),                    y: tpx(cy - stratR),         name: '北塔' },
  { type: 'watchtower', x: tpx(cx),                    y: tpx(cy + stratR),         name: '南塔' },
  { type: 'camp',       x: tpx(cx - stratR),           y: tpx(cy),                  name: '西营' },
  { type: 'camp',       x: tpx(cx + stratR),           y: tpx(cy),                  name: '东营' }
];

// Boss spawn: 2 points on diagonals (NE / SW), inside the apron
const bossPoints = [
  { name: 'NE 巨怪窟', x: tpx(cx + 10), y: tpx(cy - 10) },
  { name: 'SW 古龙穴', x: tpx(cx - 10), y: tpx(cy + 10) }
];

// 8 spawn points evenly around the apron (radius ~14 tiles from center)
const spawnPoints = [];
const spawnR = 15;
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  spawnPoints.push({ x: tpx(cx + Math.cos(a) * spawnR), y: tpx(cy + Math.sin(a) * spawnR) });
}

const data = {
  name: '王者竞技场',
  version: 1,
  tileSize: TS,
  cols: COLS, rows: ROWS,
  width: W, height: H,
  layout: 'ffa-arena',
  biomes: [
    { name: '中央祭坛',  region: { x: wcx - 7*TS,  y: wcy - 7*TS,  w: 14*TS,  h: 14*TS } },
    { name: '外环沙地',  region: { x: 0, y: 0, w: W, h: H } }
  ],
  stormCenter: { x: wcx, y: wcy },
  tiles,
  structures,
  spawnPoints,
  stratPoints,
  bossPoints
};

const __dirname = dirname(fileURLToPath(import.meta.url));
await writeFile(join(__dirname, 'arena_a.json'), JSON.stringify(data, null, 2));
console.log('wrote arena_a.json:', COLS, 'x', ROWS, 'structs:', structures.length, 'spawns:', spawnPoints.length, 'strat:', stratPoints.length, 'boss:', bossPoints.length);
