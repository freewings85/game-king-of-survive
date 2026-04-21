// arena_c.json — 3rd map PROTOTYPE skeleton (Leo R5af F2, "不求好玩").
// Theme: Frozen Peaks — ArtDesigner concept direction (2026-04-21). This
// generator is intentionally skeletal: spawn points, one central landmark
// placeholder, offset storm center, empty grass-id tile grid. Art + tile
// painting (snow + ice + crevasse) deferred to post-prototype round per
// Leo's "不做完整实现" directive.
// Layout 'ffa-arena' reuses arena_a engine paths so no new code branches
// are needed for Testor's first playtest.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const COLS = 40, ROWS = 40, TS = 64;
const W = COLS * TS, H = ROWS * TS;
const tiles = new Array(COLS * ROWS).fill(0); // all-grass — ArtDesigner to paint snow/ice later

const tpx = (t) => t * TS + TS / 2;
const cx = COLS / 2, cy = ROWS / 2;
const wcx = W / 2, wcy = H / 2;

// Central landmark placeholder — a frozen monolith silhouette. Sprite points
// at crystal_sanctum.svg for now; ArtDesigner will supply a dedicated
// frozen-peak landmark asset in a follow-up.
const structures = [
  {
    kind: 'landmark',
    x: wcx - 224, y: wcy - 128,
    w: 448, h: 256,
    color: '#a8c0d8',
    label: '冰封遗迹',
    sprite: 'assets/maps/landmarks/crystal_sanctum.svg',
    anchorX: 224, anchorY: 224
  }
];

// Spawn layout — 4 cardinal clusters × 2 spawns each = 8, differentiated
// from arena_a's even 8-point ring. Clusters at NE / NW / SE / SW, two
// spawns per cluster spread slightly outward.
const spawnPoints = [];
const clusterAngles = [Math.PI/4, 3*Math.PI/4, -Math.PI/4, -3*Math.PI/4];
const CLUSTER_R = 13;
clusterAngles.forEach(a => {
  const tx = cx + Math.cos(a) * CLUSTER_R;
  const ty = cy + Math.sin(a) * CLUSTER_R;
  spawnPoints.push({ x: tpx(tx), y: tpx(ty) });
  spawnPoints.push({ x: tpx(tx + Math.cos(a) * 1.2), y: tpx(ty + Math.sin(a) * 1.2) });
});

// Single-capture strategic point + 1 boss spawn — minimum to exercise
// engine's strat / boss code paths in prototype.
const stratPoints = [
  { type: 'temple', x: wcx, y: wcy, name: '冰塔' }
];
const bossPoints = [
  { name: '北峰残骸', x: tpx(cx), y: tpx(cy - 12) }
];

// Storm center offset NE from world center to differentiate circulation
// vs arena_a's dead-center storm. +2-tile shift is within bot-AI tolerance.
const stormCenter = { x: tpx(cx + 2), y: tpx(cy - 2) };

const data = {
  name: '冰峰遗迹',
  version: 1,
  tileSize: TS,
  cols: COLS, rows: ROWS,
  width: W, height: H,
  layout: 'ffa-arena',
  biomes: [
    { name: '中央冰塔', region: { x: wcx - 6*TS, y: wcy - 6*TS, w: 12*TS, h: 12*TS } },
    { name: '外环冻原', region: { x: 0, y: 0, w: W, h: H } }
  ],
  stormCenter,
  tiles,
  structures,
  spawnPoints,
  stratPoints,
  bossPoints
};

const __dirname = dirname(fileURLToPath(import.meta.url));
await writeFile(join(__dirname, 'arena_c.json'), JSON.stringify(data, null, 2));
console.log('wrote arena_c.json:', COLS, 'x', ROWS, 'structs:', structures.length, 'spawns:', spawnPoints.length, 'strat:', stratPoints.length, 'boss:', bossPoints.length);
