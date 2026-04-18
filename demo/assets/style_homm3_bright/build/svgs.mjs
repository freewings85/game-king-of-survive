// Parametric SVG generators for homm3_bright style pack.
// All outputs target 64x64 frame unless otherwise noted.
// Color palette (HoMM3-style saturated painterly):
export const P = {
  grassLight: '#7cc43c', grassMid: '#5ca226', grassDark: '#2e6812',
  dirtLight: '#c89658', dirtMid: '#a87236', dirtDark: '#6a3a14',
  stoneLight: '#d8d2c4', stoneMid: '#b8b0a0', stoneDark: '#4a443a',
  gold: '#f4d42a', goldHi: '#fff6a8', goldLo: '#8a5a0a',
  skin: '#e8c89a', skinDark: '#a87058',
  robeBlue: '#2a4ea8', robeBlueHi: '#3a64c4', robeBlueLo: '#0a1a4a',
  robeRed: '#c42020', robeRedLo: '#6a0a0a',
  orcGreen: '#4a8a2a', orcGreenHi: '#7cc442', orcGreenLo: '#1a3a06',
  leather: '#6a3a14', leatherHi: '#8a4a20', leatherLo: '#2a1a08',
  white: '#f0ecdc', black: '#1a1a1a',
  blood: '#c41a1a',
  wood: '#6a3a14', woodHi: '#8a5a20', woodLo: '#4a2408',
  parch: '#f0dca0', parchHi: '#fff0b8', parchLo: '#a88438',
};

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

// ─────────────────────────────────────────────────────────────
// TILESET (each tile 64x64). IDs: grass, dirt, stone, road,
// and edge tiles: grass_dirt_e (east dirt edge on grass), etc.
// For simplicity we produce base + 3 edge transitions per pair.
// ─────────────────────────────────────────────────────────────
function grassTile(seed = 0) {
  const rnd = mulberry(seed);
  const dots = [];
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 64, y = rnd() * 64;
    const c = rnd() < 0.5 ? P.grassDark : P.grassLight;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd() * 0.8).toFixed(1)}" fill="${c}" opacity="0.75"/>`);
  }
  if (seed % 3 === 0) dots.push(`<circle cx="${(rnd()*60+2).toFixed(1)}" cy="${(rnd()*60+2).toFixed(1)}" r="1.6" fill="${P.blood}"/><circle cx="${(rnd()*60+2).toFixed(1)}" cy="${(rnd()*60+2).toFixed(1)}" r="1.6" fill="${P.gold}"/>`);
  return svg(64, 64,
    `<rect width="64" height="64" fill="${P.grassMid}"/>` +
    `<rect width="64" height="64" fill="url(#gShade)" opacity="0.6"/>` +
    `<defs><radialGradient id="gShade" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${P.grassLight}"/><stop offset="100%" stop-color="${P.grassMid}"/></radialGradient></defs>` +
    dots.join('')
  );
}

function dirtTile(seed = 0) {
  const rnd = mulberry(seed + 100);
  const pebbles = [];
  for (let i = 0; i < 10; i++) {
    const x = rnd() * 64, y = rnd() * 64;
    const r = 1.5 + rnd() * 2;
    pebbles.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${P.dirtLight}" stroke="${P.dirtDark}" stroke-width="0.5"/>`);
  }
  return svg(64, 64,
    `<defs><radialGradient id="dShade" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${P.dirtLight}"/><stop offset="100%" stop-color="${P.dirtMid}"/></radialGradient></defs>` +
    `<rect width="64" height="64" fill="url(#dShade)"/>` +
    pebbles.join('')
  );
}

function stoneTile(seed = 0) {
  const rnd = mulberry(seed + 200);
  const cracks = [];
  for (let i = 0; i < 3; i++) {
    const x1 = rnd() * 64, y1 = rnd() * 64, x2 = rnd() * 64, y2 = rnd() * 64;
    cracks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${P.stoneDark}" stroke-width="0.8"/>`);
  }
  return svg(64, 64,
    `<defs><radialGradient id="sShade" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${P.stoneLight}"/><stop offset="100%" stop-color="${P.stoneMid}"/></radialGradient></defs>` +
    `<rect width="64" height="64" fill="url(#sShade)"/>` +
    cracks.join('') +
    `<circle cx="16" cy="48" r="2" fill="${P.stoneDark}" opacity="0.6"/>` +
    `<circle cx="50" cy="20" r="1.5" fill="${P.stoneDark}" opacity="0.6"/>`
  );
}

// edge tile: base A on left half, B on right half with irregular seam
function edgeTile(colorA, colorB, side = 'E', seed = 0) {
  // side: 'N','S','E','W' — which direction B is
  const rnd = mulberry(seed + 300);
  const pts = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jitter = (rnd() - 0.5) * 10;
    if (side === 'E') pts.push([32 + jitter, t * 64]);
    else if (side === 'W') pts.push([32 + jitter, t * 64]);
    else if (side === 'S') pts.push([t * 64, 32 + jitter]);
    else if (side === 'N') pts.push([t * 64, 32 + jitter]);
  }
  let path;
  if (side === 'E')      path = `M64 0 L${pts.map(p => `${p[0]} ${p[1]}`).join(' L ')} L64 64 Z`;
  else if (side === 'W') path = `M0 0 L${pts.map(p => `${p[0]} ${p[1]}`).join(' L ')} L0 64 Z`;
  else if (side === 'S') path = `M0 64 L${pts.map(p => `${p[0]} ${p[1]}`).join(' L ')} L64 64 Z`;
  else                    path = `M0 0 L${pts.map(p => `${p[0]} ${p[1]}`).join(' L ')} L64 0 Z`;
  // fill B with a small bit of its texture feel (just solid tint here)
  return svg(64, 64,
    `<rect width="64" height="64" fill="${colorA}"/>` +
    `<path d="${path}" fill="${colorB}"/>` +
    // edge pebbles/grass tufts
    `<circle cx="30" cy="16" r="1.2" fill="${P.grassDark}" opacity="0.6"/>` +
    `<circle cx="34" cy="48" r="1.2" fill="${P.grassDark}" opacity="0.6"/>`
  );
}

// ─────────────────────────────────────────────────────────────
// MAGE sprite frames (64×64, top-down, blue robe + pointed hat
// + gold star + white beard + staff). Direction dx/dy offsets
// limbs for walk cycle.
// ─────────────────────────────────────────────────────────────
// dir: 'U'|'L'|'D'|'R'; anim: 'walk'|'attack'|'death'; f: frame index
export function mageFrame(dir, anim, f) {
  // Walk cycle: 4 frames — frame 0/2 neutral, 1 left-step, 3 right-step
  // Attack: 3 frames — wind-up, release (orb burst), recover
  // Death: 3 frames — stagger, collapse, dissolve

  const walkBob = [0, -1.5, 0, 1.5][f % 4];   // vertical bob
  const legStep = [0, 3, 0, -3][f % 4];       // leg swap
  const robeW = [0, 1, 0, -1][f % 4];         // robe sway

  if (anim === 'death') {
    return deathFrame(f);
  }
  if (anim === 'attack') {
    return attackFrame(dir, f);
  }

  // Walk frames, 4 directions
  return walkFrame(dir, walkBob, legStep, robeW);
}

function walkFrame(dir, bob, legStep, robeW) {
  // 64x64 canvas. Center at (32,36) ~ body center. Head at top.
  const B = bob;
  // Direction defines where face points. We draw a simplified sprite with
  // hat visible from back/side/front appropriately.
  const hatPath = (() => {
    if (dir === 'D') return `<path d="M26 ${18 + B} Q32 ${-2 + B} 38 ${18 + B} Z" fill="${P.robeBlue}" stroke="${P.robeBlueLo}" stroke-width="1"/><path d="M28 ${18 + B} Q32 ${2 + B} 36 ${18 + B}" fill="${P.robeBlueHi}"/><polygon points="32,${6+B} 33,${10+B} 36,${10+B} 33.5,${13+B} 34.5,${17+B} 32,${14+B} 29.5,${17+B} 30.5,${13+B} 28,${10+B} 31,${10+B}" fill="${P.gold}" stroke="${P.goldLo}" stroke-width="0.5"/>`;
    if (dir === 'U') return `<path d="M26 ${18 + B} Q32 ${-2 + B} 38 ${18 + B} Z" fill="${P.robeBlueLo}" stroke="${P.black}" stroke-width="1"/>`;
    if (dir === 'L') return `<path d="M29 ${18 + B} Q26 ${0 + B} 37 ${18 + B} Z" fill="${P.robeBlue}" stroke="${P.robeBlueLo}" stroke-width="1"/><polygon points="30,${6+B} 31,${10+B} 32,${10+B}" fill="${P.gold}"/>`;
    return `<path d="M27 ${18 + B} Q38 ${0 + B} 35 ${18 + B} Z" fill="${P.robeBlue}" stroke="${P.robeBlueLo}" stroke-width="1"/><polygon points="34,${6+B} 33,${10+B} 32,${10+B}" fill="${P.gold}"/>`;
  })();

  // head
  const headFill = dir === 'U' ? P.robeBlueLo : P.skin;
  const face = dir === 'D'
    ? `<circle cx="29" cy="${21 + B}" r="0.8" fill="${P.black}"/><circle cx="35" cy="${21 + B}" r="0.8" fill="${P.black}"/><path d="M28 ${24 + B} Q32 ${30 + B} 36 ${24 + B} Q34 ${27 + B} 32 ${28 + B} Q30 ${27 + B} 28 ${24 + B} Z" fill="${P.white}" stroke="${P.black}" stroke-width="0.4"/>`
    : dir === 'L' ? `<circle cx="28" cy="${21 + B}" r="0.7" fill="${P.black}"/><path d="M26 ${24 + B} Q28 ${28 + B} 32 ${26 + B}" fill="${P.white}" stroke="${P.black}" stroke-width="0.4"/>`
    : dir === 'R' ? `<circle cx="36" cy="${21 + B}" r="0.7" fill="${P.black}"/><path d="M38 ${24 + B} Q36 ${28 + B} 32 ${26 + B}" fill="${P.white}" stroke="${P.black}" stroke-width="0.4"/>`
    : ''; // back view: no face

  // body (blue robe)
  const body = `<path d="M${22 + robeW} ${32 + B} Q32 ${28 + B} ${42 - robeW} ${32 + B} Q42 ${48 + B} 32 ${50 + B} Q22 ${48 + B} ${22 + robeW} ${32 + B} Z" fill="${P.robeBlue}" stroke="${P.robeBlueLo}" stroke-width="1"/>` +
    // gold trim top
    `<path d="M${22 + robeW} ${32 + B} Q32 ${29 + B} ${42 - robeW} ${32 + B}" stroke="${P.gold}" stroke-width="1.2" fill="none"/>` +
    // red sash
    `<path d="M24 ${41 + B} Q32 ${43 + B} 40 ${41 + B} L40 ${44 + B} Q32 ${46 + B} 24 ${44 + B} Z" fill="${P.robeRed}" stroke="${P.robeRedLo}" stroke-width="0.5"/>`;

  // legs peeking below robe (walk cycle moves them)
  const legs = `<rect x="${26 + legStep * 0.3}" y="${50 + B}" width="3" height="5" fill="${P.leather}" stroke="${P.black}" stroke-width="0.4"/>` +
    `<rect x="${35 - legStep * 0.3}" y="${50 + B}" width="3" height="5" fill="${P.leather}" stroke="${P.black}" stroke-width="0.4"/>`;

  // staff on right (hand-held); swings slightly on bob
  const staff = dir === 'L'
    ? `<line x1="22" y1="${24 + B}" x2="18" y2="${48 + B}" stroke="${P.wood}" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="${22 + B}" r="3" fill="${P.goldHi}" stroke="${P.goldLo}" stroke-width="0.6"/>`
    : dir === 'R'
    ? `<line x1="42" y1="${24 + B}" x2="46" y2="${48 + B}" stroke="${P.wood}" stroke-width="2" stroke-linecap="round"/><circle cx="42" cy="${22 + B}" r="3" fill="${P.goldHi}" stroke="${P.goldLo}" stroke-width="0.6"/>`
    : dir === 'U'
    ? `<line x1="40" y1="${20 + B}" x2="46" y2="${44 + B}" stroke="${P.wood}" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="${18 + B}" r="3" fill="${P.goldHi}" stroke="${P.goldLo}" stroke-width="0.6"/>`
    : `<line x1="44" y1="${26 + B}" x2="40" y2="${50 + B}" stroke="${P.wood}" stroke-width="2" stroke-linecap="round"/><circle cx="45" cy="${23 + B}" r="3" fill="${P.goldHi}" stroke="${P.goldLo}" stroke-width="0.6"/>`;

  // head circle base
  const head = `<circle cx="32" cy="${22 + B}" r="5" fill="${headFill}" stroke="${P.black}" stroke-width="0.7"/>`;

  return svg(64, 64,
    `<ellipse cx="32" cy="57" rx="10" ry="2.2" fill="${P.black}" opacity="0.35"/>` +
    legs + body + head + face + hatPath + staff
  );
}

function attackFrame(dir, f) {
  // windup / release / recover
  const scale = [1.0, 1.35, 1.1][f] || 1.0;
  const flash = f === 1;
  const base = walkFrame(dir, 0, 0, 0);
  // overlay orb burst at staff tip
  const orbSize = 4 * scale;
  const orbColor = flash ? P.goldHi : P.gold;
  const burst = f === 1
    ? `<g><circle cx="44" cy="20" r="${(orbSize * 1.3).toFixed(1)}" fill="${P.goldHi}" opacity="0.6"/><circle cx="44" cy="20" r="${(orbSize * 0.7).toFixed(1)}" fill="${P.white}"/></g><polygon points="52,12 54,16 58,16 55,19 57,24 52,22 47,24 49,19 46,16 50,16" fill="${P.gold}" opacity="0.9"/>`
    : '';
  return base.replace('</svg>', burst + '</svg>');
}

function deathFrame(f) {
  // stagger / fall / fade
  const rot = [0, 45, 70][f] || 0;
  const opacity = [1.0, 0.85, 0.55][f] || 0.5;
  const fall = walkFrame('D', 4, 0, 0);
  return svg(64, 64,
    `<g transform="rotate(${rot} 32 40)" opacity="${opacity}">${stripSvgWrapper(fall)}</g>` +
    (f === 2 ? `<text x="32" y="20" text-anchor="middle" font-family="serif" font-size="10" fill="${P.gold}" opacity="0.7">✦</text>` : '')
  );
}

// ─────────────────────────────────────────────────────────────
// ORC sprite frames (64×64, top-down, green, kilt, club)
// Walk only: 4 dirs × 4 frames
// ─────────────────────────────────────────────────────────────
export function orcFrame(dir, f) {
  const B = [0, -1, 0, 1][f % 4];
  const legStep = [0, 2, 0, -2][f % 4];

  const head = `<ellipse cx="32" cy="${22 + B}" rx="6" ry="5.5" fill="${P.orcGreen}" stroke="${P.orcGreenLo}" stroke-width="0.7"/>` +
    (dir !== 'U'
      ? `<polygon points="28,${26+B} 27,${29+B} 29,${28+B}" fill="${P.white}" stroke="${P.black}" stroke-width="0.3"/>` +
        `<polygon points="36,${26+B} 37,${29+B} 35,${28+B}" fill="${P.white}" stroke="${P.black}" stroke-width="0.3"/>`
      : '');

  const eyes = dir === 'D'
    ? `<circle cx="29" cy="${21 + B}" r="0.7" fill="${P.gold}"/><circle cx="35" cy="${21 + B}" r="0.7" fill="${P.gold}"/><circle cx="29" cy="${21 + B}" r="0.3" fill="${P.blood}"/><circle cx="35" cy="${21 + B}" r="0.3" fill="${P.blood}"/>`
    : dir === 'L' ? `<circle cx="28" cy="${21 + B}" r="0.6" fill="${P.blood}"/>`
    : dir === 'R' ? `<circle cx="36" cy="${21 + B}" r="0.6" fill="${P.blood}"/>`
    : '';

  const body = `<path d="M22 ${32 + B} Q32 ${27 + B} 42 ${32 + B} L44 ${46 + B} Q32 ${50 + B} 20 ${46 + B} Z" fill="${P.orcGreen}" stroke="${P.orcGreenLo}" stroke-width="0.8"/>` +
    `<path d="M24 ${33 + B} Q32 ${29 + B} 40 ${33 + B} L40 ${43 + B} Q32 ${46 + B} 24 ${43 + B} Z" fill="${P.orcGreenHi}" opacity="0.7"/>` +
    // kilt
    `<path d="M22 ${46 + B} Q32 ${50 + B} 42 ${46 + B} L43 ${56 + B} Q32 ${58 + B} 21 ${56 + B} Z" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.7"/>` +
    `<line x1="27" y1="${47 + B}" x2="27" y2="${57 + B}" stroke="${P.leatherLo}" stroke-width="0.5"/>` +
    `<line x1="32" y1="${47 + B}" x2="32" y2="${57 + B}" stroke="${P.leatherLo}" stroke-width="0.5"/>` +
    `<line x1="37" y1="${47 + B}" x2="37" y2="${57 + B}" stroke="${P.leatherLo}" stroke-width="0.5"/>`;

  const club = dir === 'L'
    ? `<rect x="18" y="${26 + B}" width="2" height="16" fill="${P.wood}" transform="rotate(-20 19 34)"/><ellipse cx="14" cy="${22 + B}" rx="4" ry="3" fill="${P.woodHi}" stroke="${P.black}" stroke-width="0.6"/>`
    : dir === 'R'
    ? `<rect x="44" y="${26 + B}" width="2" height="16" fill="${P.wood}" transform="rotate(20 45 34)"/><ellipse cx="50" cy="${22 + B}" rx="4" ry="3" fill="${P.woodHi}" stroke="${P.black}" stroke-width="0.6"/>`
    : dir === 'U'
    ? `<rect x="42" y="${22 + B}" width="2" height="16" fill="${P.wood}"/><ellipse cx="43" cy="${19 + B}" rx="4" ry="3" fill="${P.woodHi}" stroke="${P.black}" stroke-width="0.6"/>`
    : `<rect x="44" y="${28 + B}" width="2" height="16" fill="${P.wood}"/><ellipse cx="45" cy="${26 + B}" rx="4" ry="3" fill="${P.woodHi}" stroke="${P.black}" stroke-width="0.6"/>`;

  const legs = `<rect x="${26 + legStep * 0.4}" y="${56 + B}" width="3" height="5" fill="${P.orcGreenLo}"/>` +
    `<rect x="${35 - legStep * 0.4}" y="${56 + B}" width="3" height="5" fill="${P.orcGreenLo}"/>`;

  return svg(64, 64,
    `<ellipse cx="32" cy="60" rx="11" ry="2" fill="${P.black}" opacity="0.35"/>` +
    legs + body + head + eyes + club
  );
}

// ─────────────────────────────────────────────────────────────
// UI 9-slice (source 192×192 — a 3×3 grid, each cell 64×64 that
// gets sliced out). Renders the full frame then the render
// script crops into 9 PNGs.
// ─────────────────────────────────────────────────────────────
export function uiFrameFull() {
  return svg(192, 192,
    `<defs>
      <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${P.parchHi}"/>
        <stop offset="60%" stop-color="${P.parch}"/>
        <stop offset="100%" stop-color="${P.parchLo}"/>
      </linearGradient>
      <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${P.goldHi}"/>
        <stop offset="50%" stop-color="${P.gold}"/>
        <stop offset="100%" stop-color="${P.goldLo}"/>
      </linearGradient>
    </defs>` +
    // parchment bg
    `<rect width="192" height="192" fill="url(#pg)"/>` +
    // outer gold border (16px wide)
    `<rect x="8" y="8" width="176" height="176" fill="none" stroke="url(#go)" stroke-width="10"/>` +
    `<rect x="14" y="14" width="164" height="164" fill="none" stroke="${P.goldLo}" stroke-width="1.2"/>` +
    // corner curls (4)
    cornerCurl(20, 20, 0) + cornerCurl(172, 20, 90) + cornerCurl(172, 172, 180) + cornerCurl(20, 172, 270) +
    // edge ornaments (mid of each side)
    `<circle cx="96" cy="16" r="4" fill="${P.blood}" stroke="${P.goldLo}" stroke-width="0.8"/>` +
    `<circle cx="96" cy="176" r="4" fill="${P.blood}" stroke="${P.goldLo}" stroke-width="0.8"/>` +
    `<circle cx="16" cy="96" r="4" fill="${P.blood}" stroke="${P.goldLo}" stroke-width="0.8"/>` +
    `<circle cx="176" cy="96" r="4" fill="${P.blood}" stroke="${P.goldLo}" stroke-width="0.8"/>`
  );
}
function cornerCurl(cx, cy, rot) {
  return `<g transform="rotate(${rot} ${cx} ${cy})"><path d="M${cx - 8} ${cy} Q${cx - 4} ${cy - 8} ${cx} ${cy} Q${cx - 2} ${cy + 4} ${cx - 8} ${cy} Z" fill="url(#go)" stroke="${P.goldLo}" stroke-width="0.8"/></g>`;
}

// ─────────────────────────────────────────────────────────────
// DECORATIONS (128×128 each except fence/crate at 64×64)
// ─────────────────────────────────────────────────────────────
export function treeBig() {
  return svg(128, 128,
    `<ellipse cx="64" cy="118" rx="28" ry="5" fill="${P.black}" opacity="0.35"/>` +
    `<rect x="58" y="72" width="12" height="36" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="1.2"/>` +
    `<line x1="62" y1="80" x2="62" y2="105" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<ellipse cx="64" cy="56" rx="42" ry="38" fill="${P.grassDark}" stroke="${P.black}" stroke-width="1.5"/>` +
    `<ellipse cx="50" cy="44" rx="22" ry="18" fill="${P.grassMid}" opacity="0.8"/>` +
    `<ellipse cx="80" cy="50" rx="20" ry="16" fill="${P.grassMid}" opacity="0.7"/>` +
    `<ellipse cx="60" cy="70" rx="18" ry="10" fill="${P.grassLight}" opacity="0.6"/>` +
    // red apples
    `<circle cx="48" cy="40" r="2.5" fill="${P.blood}"/>` +
    `<circle cx="74" cy="36" r="2.5" fill="${P.blood}"/>` +
    `<circle cx="86" cy="58" r="2.5" fill="${P.blood}"/>`
  );
}

export function treeSmall() {
  return svg(64, 64,
    `<ellipse cx="32" cy="60" rx="14" ry="3" fill="${P.black}" opacity="0.35"/>` +
    `<rect x="29" y="40" width="6" height="18" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<ellipse cx="32" cy="30" rx="20" ry="20" fill="${P.grassDark}" stroke="${P.black}" stroke-width="1"/>` +
    `<ellipse cx="26" cy="24" rx="10" ry="8" fill="${P.grassMid}" opacity="0.8"/>` +
    `<ellipse cx="38" cy="28" rx="9" ry="7" fill="${P.grassLight}" opacity="0.6"/>`
  );
}

export function rock() {
  return svg(64, 64,
    `<ellipse cx="32" cy="54" rx="24" ry="4" fill="${P.black}" opacity="0.35"/>` +
    `<path d="M12 46 Q10 28 22 22 Q32 14 42 22 Q54 28 52 46 Q42 52 32 50 Q22 52 12 46 Z" fill="${P.stoneMid}" stroke="${P.stoneDark}" stroke-width="1.3"/>` +
    `<path d="M16 32 Q22 24 32 28 Q28 32 22 32 Q18 34 16 32 Z" fill="${P.stoneLight}" opacity="0.75"/>` +
    `<line x1="30" y1="38" x2="40" y2="30" stroke="${P.stoneDark}" stroke-width="0.6"/>`
  );
}

export function house() {
  return svg(128, 128,
    `<ellipse cx="64" cy="118" rx="40" ry="5" fill="${P.black}" opacity="0.35"/>` +
    // wall
    `<rect x="24" y="54" width="80" height="56" fill="${P.parch}" stroke="${P.leatherLo}" stroke-width="1.5"/>` +
    // wood planks shading
    `<line x1="40" y1="54" x2="40" y2="110" stroke="${P.leather}" stroke-width="0.8" opacity="0.5"/>` +
    `<line x1="64" y1="54" x2="64" y2="110" stroke="${P.leather}" stroke-width="0.8" opacity="0.5"/>` +
    `<line x1="88" y1="54" x2="88" y2="110" stroke="${P.leather}" stroke-width="0.8" opacity="0.5"/>` +
    // roof (thatched red)
    `<polygon points="18,54 110,54 92,20 36,20" fill="${P.blood}" stroke="${P.robeRedLo}" stroke-width="1.5"/>` +
    `<line x1="40" y1="22" x2="26" y2="54" stroke="${P.robeRedLo}" stroke-width="0.6"/>` +
    `<line x1="64" y1="20" x2="64" y2="54" stroke="${P.robeRedLo}" stroke-width="0.6"/>` +
    `<line x1="88" y1="22" x2="102" y2="54" stroke="${P.robeRedLo}" stroke-width="0.6"/>` +
    // chimney
    `<rect x="82" y="6" width="10" height="18" fill="${P.stoneMid}" stroke="${P.black}" stroke-width="1"/>` +
    // door
    `<rect x="56" y="78" width="16" height="32" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="1.2"/>` +
    `<circle cx="68" cy="94" r="1.5" fill="${P.gold}"/>` +
    // window
    `<rect x="32" y="64" width="14" height="14" fill="${P.robeBlueHi}" stroke="${P.leatherLo}" stroke-width="1"/>` +
    `<line x1="39" y1="64" x2="39" y2="78" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<line x1="32" y1="71" x2="46" y2="71" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<rect x="86" y="64" width="14" height="14" fill="${P.robeBlueHi}" stroke="${P.leatherLo}" stroke-width="1"/>` +
    `<line x1="93" y1="64" x2="93" y2="78" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<line x1="86" y1="71" x2="100" y2="71" stroke="${P.leatherLo}" stroke-width="0.8"/>`
  );
}

export function fence() {
  return svg(64, 64,
    `<ellipse cx="32" cy="58" rx="24" ry="2.5" fill="${P.black}" opacity="0.3"/>` +
    // 3 posts
    fencePost(14) + fencePost(32) + fencePost(50) +
    // horizontal rails
    `<rect x="8" y="30" width="48" height="4" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.6"/>` +
    `<rect x="8" y="42" width="48" height="4" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.6"/>`
  );
}
function fencePost(x) {
  return `<polygon points="${x-3},24 ${x+3},24 ${x+3},54 ${x},58 ${x-3},54" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<polygon points="${x-3},24 ${x},20 ${x+3},24" fill="${P.leatherHi}" stroke="${P.leatherLo}" stroke-width="0.6"/>`;
}

export function crate() {
  return svg(64, 64,
    `<ellipse cx="32" cy="56" rx="22" ry="2.5" fill="${P.black}" opacity="0.35"/>` +
    `<rect x="12" y="18" width="40" height="36" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="1.5"/>` +
    `<rect x="12" y="18" width="40" height="8" fill="${P.leatherHi}" opacity="0.6"/>` +
    // planks
    `<line x1="22" y1="18" x2="22" y2="54" stroke="${P.leatherLo}" stroke-width="1"/>` +
    `<line x1="32" y1="18" x2="32" y2="54" stroke="${P.leatherLo}" stroke-width="1"/>` +
    `<line x1="42" y1="18" x2="42" y2="54" stroke="${P.leatherLo}" stroke-width="1"/>` +
    `<line x1="12" y1="36" x2="52" y2="36" stroke="${P.leatherLo}" stroke-width="1"/>` +
    // iron corners
    `<rect x="12" y="18" width="6" height="6" fill="${P.stoneDark}"/>` +
    `<rect x="46" y="18" width="6" height="6" fill="${P.stoneDark}"/>` +
    `<rect x="12" y="48" width="6" height="6" fill="${P.stoneDark}"/>` +
    `<rect x="46" y="48" width="6" height="6" fill="${P.stoneDark}"/>` +
    // gold stud
    `<circle cx="32" cy="36" r="2" fill="${P.gold}" stroke="${P.goldLo}" stroke-width="0.5"/>`
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function mulberry(seed) {
  let t = (seed >>> 0) || 1;
  return function () {
    t += 0x6D2B79F5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function stripSvgWrapper(s) {
  return s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

export const TILES = {
  grass0: () => grassTile(1),
  grass1: () => grassTile(2),
  dirt0:  () => dirtTile(3),
  dirt1:  () => dirtTile(4),
  stone0: () => stoneTile(5),
  stone1: () => stoneTile(6),
  gd_E:   () => edgeTile(P.grassMid, P.dirtMid, 'E', 7),
  gd_W:   () => edgeTile(P.grassMid, P.dirtMid, 'W', 8),
  gd_N:   () => edgeTile(P.grassMid, P.dirtMid, 'N', 9),
  gd_S:   () => edgeTile(P.grassMid, P.dirtMid, 'S', 10),
  gs_E:   () => edgeTile(P.grassMid, P.stoneMid, 'E', 11),
  gs_S:   () => edgeTile(P.grassMid, P.stoneMid, 'S', 12),
};
