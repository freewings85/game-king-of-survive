// lane_b.json — 4v4 three-lane MOBA layout (Leo 2026-04-21).
// 40x40 tile @ 64px = 2560x2560. 3 horizontal lanes separated by water +
// mountain barriers; 4 spawn nodes on each side (8 total); 5 strat points
// (1 per lane mid + 2 jungle camps); 2 boss camps in the jungle.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const COLS = 40, ROWS = 40, TS = 64;
const W = COLS * TS, H = ROWS * TS;
const tiles = new Array(COLS * ROWS).fill(0); // grass

const paintRect = (x0, y0, x1, y1, v) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x>=0 && y>=0 && x<COLS && y<ROWS) tiles[y*COLS+x] = v;
  }
};

// Top lane: rows 4-9 grass (default 0)
// Mid lane: rows 17-22 grass
// Bot lane: rows 30-35 grass
// Between lanes (rows 10-16, 23-29) → swamp (5) "jungle" with water rivers
paintRect(0, 10, COLS-1, 16, 5); // upper jungle
paintRect(0, 23, COLS-1, 29, 5); // lower jungle

// Water rivers running between lane separators (rows 13 and 26)
for (let x = 0; x < COLS; x++) {
  // Allow gap for one bridge per river so paths can crossover
  if (x === 19 || x === 20) continue; // mid bridge
  tiles[13 * COLS + x] = 3;
  tiles[26 * COLS + x] = 3;
}

// Top/bottom edges: stone border (cosmetic — out of play area)
for (let x = 0; x < COLS; x++) {
  tiles[0 * COLS + x] = 2;
  tiles[(ROWS - 1) * COLS + x] = 2;
}
for (let y = 0; y < ROWS; y++) {
  tiles[y * COLS + 0] = 2;
  tiles[y * COLS + (COLS - 1)] = 2;
}

const wcx = W / 2, wcy = H / 2;
const tpx = (t) => t * TS + TS / 2;
const structures = [];
const push = (s) => structures.push(s);

// ldoe-overhaul-02b-cap11: per-side cycle. Left column has 4 spawns
// (top-L, mid-L, mid-jungle-L, bot-L) — top/mid/bot 间距 ≤896px so
// midpoint shares ≤448px (< 700 ✓). Mirror right side. Layout per side:
// 2 shared midpoints (top-mid + mid-bot) alternating fence/wreck, plus
// 2 direct items at top/bot corners filling missing KPI. = 4 items × 2
// sides = 8 + 3 lane fillers = 11. All 8 spawns get fence+wreck within ≤466px.
const ldoeLm = [
  // Left side
  { kind: 'fence',     cx: 160,  cy: 864,  w: 200, h: 170, label: '左中上铁丝网' },
  { kind: 'wreck_car', cx: 160,  cy: 1728, w: 200, h: 180, label: '左中下翻车' },
  { kind: 'wreck_car', cx: 288,  cy: 416,  w: 200, h: 180, label: '左上翻车' },
  { kind: 'fence',     cx: 288,  cy: 2144, w: 200, h: 170, label: '左下铁丝网' },
  // Right side
  { kind: 'fence',     cx: 2400, cy: 864,  w: 200, h: 170, label: '右中上铁丝网' },
  { kind: 'wreck_car', cx: 2400, cy: 1728, w: 200, h: 180, label: '右中下翻车' },
  { kind: 'wreck_car', cx: 2272, cy: 416,  w: 200, h: 180, label: '右上翻车' },
  { kind: 'fence',     cx: 2272, cy: 2144, w: 200, h: 170, label: '右下铁丝网' },
  // 3 lane fillers (mid-map, cosmetic populating)
  { kind: 'gas_station', cx: 1280, cy: 416,  w: 200, h: 180, label: '上路加油站' },
  { kind: 'barricade',   cx: 1280, cy: 1312, w: 200, h: 180, label: '中路路障' },
  { kind: 'debris',      cx: 1280, cy: 2144, w: 200, h: 170, label: '下路废墟' }
];
ldoeLm.forEach(s => push({ kind: s.kind, x: s.cx - s.w/2, y: s.cy - s.h/2, w: s.w, h: s.h, color: '#6e2a1c', label: s.label }));

// Bridge structures across rivers at crossings
push({ kind: 'bridge', x: tpx(19) - TS, y: 13 * TS - 12, w: TS * 2, h: TS + 24, color: '#8a6a3a', label: '中桥' });
push({ kind: 'bridge', x: tpx(19) - TS, y: 26 * TS - 12, w: TS * 2, h: TS + 24, color: '#8a6a3a', label: '中桥' });
// Side bridges — one near each base so flanking is possible
push({ kind: 'bridge', x: tpx(7)  - TS, y: 13 * TS - 12, w: TS * 2, h: TS + 24, color: '#8a6a3a', label: '左桥' });
push({ kind: 'bridge', x: tpx(32) - TS, y: 26 * TS - 12, w: TS * 2, h: TS + 24, color: '#8a6a3a', label: '右桥' });

// Mountain bookends at each lane edge to push fights into the lane
const laneEdges = [
  // Top lane (rows 4-9): mountains at row 3 and row 10 left/right
  { tx: 4, ty: 3 }, { tx: 35, ty: 3 },
  { tx: 4, ty: 10 }, { tx: 35, ty: 10 },
  // Mid lane (rows 17-22)
  { tx: 4, ty: 16 }, { tx: 35, ty: 16 },
  { tx: 4, ty: 23 }, { tx: 35, ty: 23 },
  // Bot lane (rows 30-35)
  { tx: 4, ty: 29 }, { tx: 35, ty: 29 },
  { tx: 4, ty: 36 }, { tx: 35, ty: 36 }
];
laneEdges.forEach(({tx, ty}) => {
  push({ kind: 'mountain', x: tpx(tx) - 48, y: tpx(ty) - 48, w: 96, h: 96, color: '#8a8a90' });
});

// Buildings as base markers — left base + right base
// Left team base (faction 1) — west edge mid lane
push({ kind: 'building', x: tpx(2) - 48, y: tpx(20) - 48, w: 96, h: 96, color: '#3a5a8a', label: '蓝方基地' });
push({ kind: 'wall', x: tpx(3), y: tpx(18), w: 16, h: 128, color: '#506080' });
// Right team base (faction 2) — east edge mid lane
push({ kind: 'building', x: tpx(37) - 48, y: tpx(20) - 48, w: 96, h: 96, color: '#8a3a3a', label: '红方基地' });
push({ kind: 'wall', x: tpx(36) - 12, y: tpx(18), w: 16, h: 128, color: '#805060' });

// Strategic points — one mid-lane per lane (3) + 2 jungle camps
const stratPoints = [
  { type: 'watchtower', x: tpx(20), y: tpx(6),  name: '上路塔' },
  { type: 'temple',     x: tpx(20), y: tpx(20), name: '中央祭坛' },
  { type: 'watchtower', x: tpx(20), y: tpx(33), name: '下路塔' },
  { type: 'camp',       x: tpx(10), y: tpx(20), name: '蓝野' },
  { type: 'camp',       x: tpx(30), y: tpx(20), name: '红野' }
];

// Boss camps — 2 jungle pits between mid and outer lanes
const bossPoints = [
  { name: '上河巨怪', x: tpx(20), y: tpx(13) },
  { name: '下河古龙', x: tpx(20), y: tpx(26) }
];

// 8 spawn points — 4 on each side (one per lane + jungle entry)
const spawnPoints = [
  // Left team (faction 1) — leftmost column of each lane
  { x: tpx(2), y: tpx(6)  },  // top
  { x: tpx(2), y: tpx(20) },  // mid
  { x: tpx(2), y: tpx(33) },  // bot
  { x: tpx(4), y: tpx(20) },  // mid jungle entry
  // Right team (faction 2) — rightmost column
  { x: tpx(37), y: tpx(6)  },
  { x: tpx(37), y: tpx(20) },
  { x: tpx(37), y: tpx(33) },
  { x: tpx(35), y: tpx(20) }
];

const data = {
  name: '三线峡谷',
  version: 1,
  tileSize: TS,
  cols: COLS, rows: ROWS,
  width: W, height: H,
  layout: 'lane-3',
  biomes: [
    { name: '上路', region: { x: 0,         y: 4*TS,  w: W, h: 6*TS } },
    { name: '上野', region: { x: 0,         y: 10*TS, w: W, h: 7*TS } },
    { name: '中路', region: { x: 0,         y: 17*TS, w: W, h: 6*TS } },
    { name: '下野', region: { x: 0,         y: 23*TS, w: W, h: 7*TS } },
    { name: '下路', region: { x: 0,         y: 30*TS, w: W, h: 6*TS } }
  ],
  stormCenter: { x: wcx, y: wcy },
  tiles,
  structures,
  spawnPoints,
  stratPoints,
  bossPoints
};

const __dirname = dirname(fileURLToPath(import.meta.url));
await writeFile(join(__dirname, 'lane_b.json'), JSON.stringify(data, null, 2));
console.log('wrote lane_b.json:', COLS, 'x', ROWS, 'structs:', structures.length, 'spawns:', spawnPoints.length, 'strat:', stratPoints.length, 'boss:', bossPoints.length);
