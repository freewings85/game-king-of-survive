// One-shot generator for demo/maps/default.json.
// Run: node demo/maps/_gen_default.mjs
// Produces a 40x40 handcrafted map (tileSize=64 -> 2560x2560 world).
// Biome tile ids: 0=grass 1=dirt 2=stone 3=water 4=sand 5=swamp 6=snow
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const COLS = 40, ROWS = 40, TS = 64;
const W = COLS * TS, H = ROWS * TS;
const tiles = new Array(COLS * ROWS).fill(0);

const paintRect = (x0, y0, x1, y1, v) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x >= 0 && y >= 0 && x < COLS && y < ROWS) tiles[y * COLS + x] = v;
  }
};
const paintCircle = (cx, cy, r, v) => {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r * r && x >= 0 && y >= 0 && x < COLS && y < ROWS) tiles[y * COLS + x] = v;
  }
};

// --- 4 biome quadrants ---
paintRect(0,  0,  18, 18, 6); // NW snow
paintRect(21, 0,  39, 18, 4); // NE sand
paintRect(0,  21, 18, 39, 2); // SW stone ruins
paintRect(21, 21, 39, 39, 5); // SE swamp

// --- Rivers (cross with altar opening) ---
const RIVER_ROW_A = 19, RIVER_ROW_B = 20;
const RIVER_COL_A = 19, RIVER_COL_B = 20;
const WEST_BRIDGE = [9, 10];
const EAST_BRIDGE = [29, 30];
const NORTH_BRIDGE = [9, 10];
const SOUTH_BRIDGE = [29, 30];
for (let x = 2; x < 17; x++) {
  if (WEST_BRIDGE.includes(x)) continue;
  tiles[RIVER_ROW_A * COLS + x] = 3;
  tiles[RIVER_ROW_B * COLS + x] = 3;
}
for (let x = 23; x < 38; x++) {
  if (EAST_BRIDGE.includes(x)) continue;
  tiles[RIVER_ROW_A * COLS + x] = 3;
  tiles[RIVER_ROW_B * COLS + x] = 3;
}
for (let y = 2; y < 17; y++) {
  if (NORTH_BRIDGE.includes(y)) continue;
  tiles[y * COLS + RIVER_COL_A] = 3;
  tiles[y * COLS + RIVER_COL_B] = 3;
}
for (let y = 23; y < 38; y++) {
  if (SOUTH_BRIDGE.includes(y)) continue;
  tiles[y * COLS + RIVER_COL_A] = 3;
  tiles[y * COLS + RIVER_COL_B] = 3;
}

// --- Central altar clearing (grass) ---
for (let y = 17; y <= 22; y++) for (let x = 17; x <= 22; x++) tiles[y * COLS + x] = 0;
paintCircle(20, 20, 4, 0);
// Stone inner ring (altar plaza)
paintCircle(20, 20, 2, 2);

// --- Quadrant secondary detail ---
paintCircle(6,  6,  3, 2); // frozen rock cluster in snow
paintCircle(33, 6,  3, 2); // oasis dirt in sand
paintCircle(6,  33, 3, 1); // dirt road hub in ruins
paintCircle(33, 33, 3, 1); // swamp path

// --- Structures ---
const cx = W / 2, cy = H / 2;
const tpx = (tx) => tx * TS + TS / 2;
const structures = [];
const push = (s) => structures.push(s);

// Central landmark — huge altar, 320x320, centered
push({ kind: 'landmark', x: cx - 160, y: cy - 160, w: 320, h: 320, color: '#b8a060', label: '中央祭坛' });

// Bridges over rivers (passable, rendered as planks)
push({ kind: 'bridge', x: tpx(WEST_BRIDGE[0]) - TS, y: RIVER_ROW_A * TS, w: TS * 2, h: TS * 2, color: '#8a6a3a', label: '西桥' });
push({ kind: 'bridge', x: tpx(EAST_BRIDGE[0]) - TS, y: RIVER_ROW_A * TS, w: TS * 2, h: TS * 2, color: '#8a6a3a', label: '东桥' });
push({ kind: 'bridge', x: RIVER_COL_A * TS, y: tpx(NORTH_BRIDGE[0]) - TS, w: TS * 2, h: TS * 2, color: '#8a6a3a', label: '北桥' });
push({ kind: 'bridge', x: RIVER_COL_A * TS, y: tpx(SOUTH_BRIDGE[0]) - TS, w: TS * 2, h: TS * 2, color: '#8a6a3a', label: '南桥' });

// Mountain ranges — diagonals between quadrants (impassable)
const pushRow = (kind, x0, y0, count, dx, dy, w, h, color) => {
  for (let i = 0; i < count; i++) push({ kind, x: x0 + i * dx, y: y0 + i * dy, w, h, color });
};
// NW mountain chain (snow/glaciers) along diagonal from (0,9) down to (9,0)
pushRow('mountain', tpx(1) - 48,  tpx(9), 5, 96, -96, 96, 96, '#b8c8d8');
// NE desert mesas along (21,10)...(29,2)
pushRow('mountain', tpx(24), tpx(10),  4, 96, -96, 96, 96, '#c4a070');
// SW ruins mountains along (1,30)...(9,38)
pushRow('mountain', tpx(2), tpx(31),  4, 96, 96,  96, 96, '#8a8a90');
// SE swamp mangrove ridges along (24,29)...(32,36)
pushRow('mountain', tpx(26),tpx(29),  4, 96, 96,  96, 96, '#6a7a4a');

// Quadrant landmarks (memorable structures)
push({ kind: 'landmark', x: tpx(6)  - 72, y: tpx(4)  - 72, w: 144, h: 144, color: '#a0b8d8', label: '冰龙骨塔' });
push({ kind: 'landmark', x: tpx(33) - 72, y: tpx(4)  - 72, w: 144, h: 144, color: '#d8b870', label: '黄金金字塔' });
push({ kind: 'landmark', x: tpx(6)  - 72, y: tpx(35) - 72, w: 144, h: 144, color: '#7a7080', label: '废墟高塔' });
push({ kind: 'landmark', x: tpx(33) - 72, y: tpx(35) - 72, w: 144, h: 144, color: '#5a6a40', label: '巫婆木屋' });

// Buildings + crates scattered in each quadrant (cover/farm targets)
const farmSpots = [
  [8, 12], [12, 7], [4, 15],   // NW
  [27, 7], [32, 13], [35, 5],  // NE
  [8, 27], [13, 35], [4, 31],  // SW
  [28, 32], [33, 27], [35, 36] // SE
];
farmSpots.forEach(([tx, ty], i) => {
  const x = tpx(tx) - 44, y = tpx(ty) - 36;
  push({ kind: 'building', x, y, w: 88, h: 72, color: (i % 2) ? '#4a4a58' : '#55555f' });
  push({ kind: 'crate', x: x + 96, y: y + 24, w: 28, h: 28, color: '#886633' });
});

// Perimeter walls near corner outposts
push({ kind: 'wall', x: tpx(2) - 8,  y: tpx(2),  w: 16, h: 128, color: '#606068' });
push({ kind: 'wall', x: tpx(37) - 8, y: tpx(2),  w: 16, h: 128, color: '#606068' });
push({ kind: 'wall', x: tpx(2) - 8,  y: tpx(30), w: 16, h: 128, color: '#606068' });
push({ kind: 'wall', x: tpx(37) - 8, y: tpx(30), w: 16, h: 128, color: '#606068' });

// --- Strategic points (5 fixed) ---
const stratPoints = [
  { type: 'temple',     x: cx,              y: cy,             name: '祭坛' },
  { type: 'watchtower', x: tpx(20),         y: tpx(4),         name: '北哨塔' },
  { type: 'watchtower', x: tpx(20),         y: tpx(35),        name: '南哨塔' },
  { type: 'camp',       x: tpx(4),          y: tpx(20),        name: '西营' },
  { type: 'camp',       x: tpx(35),         y: tpx(20),        name: '东营' }
];

// --- Boss spawn camps (2) ---
const bossPoints = [
  { name: '北岭废墟',  x: tpx(20), y: tpx(9) },
  { name: '南岸石阵',  x: tpx(20), y: tpx(31) }
];

// --- Player spawn points (8 — perimeter) ---
const spawnPoints = [
  { x: tpx(4),  y: tpx(4)  }, { x: tpx(35), y: tpx(4)  },
  { x: tpx(4),  y: tpx(35) }, { x: tpx(35), y: tpx(35) },
  { x: tpx(20), y: tpx(2)  }, { x: tpx(20), y: tpx(37) },
  { x: tpx(2),  y: tpx(20) }, { x: tpx(37), y: tpx(20) }
];

const data = {
  name: '王冠之岛',
  version: 1,
  tileSize: TS,
  cols: COLS,
  rows: ROWS,
  width: W,
  height: H,
  biomes: [
    { name: '北雪原', region: { x: 0,        y: 0,        w: COLS * TS / 2, h: ROWS * TS / 2 } },
    { name: '东沙漠', region: { x: COLS*TS/2,y: 0,        w: COLS * TS / 2, h: ROWS * TS / 2 } },
    { name: '西废墟', region: { x: 0,        y: ROWS*TS/2,w: COLS * TS / 2, h: ROWS * TS / 2 } },
    { name: '南沼泽', region: { x: COLS*TS/2,y: ROWS*TS/2,w: COLS * TS / 2, h: ROWS * TS / 2 } }
  ],
  stormCenter: { x: cx, y: cy },
  tiles,
  structures,
  spawnPoints,
  stratPoints,
  bossPoints
};

const __dirname = dirname(fileURLToPath(import.meta.url));
await writeFile(join(__dirname, 'default.json'), JSON.stringify(data, null, 2));
console.log('wrote default.json:', data.cols, 'x', data.rows, 'structures:', structures.length, 'strat:', stratPoints.length, 'boss:', bossPoints.length);
