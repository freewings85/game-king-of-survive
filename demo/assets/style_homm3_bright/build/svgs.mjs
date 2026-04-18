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

// ─────────────────────────────────────────────────────────────
// AUTOTILE 4-bit MASK  (N=1, E=2, S=4, W=8; 0..15)
// Current cell is `fromColor`. Bits flag which neighbor is
// `toColor` — that side gets a wavy seam with `to` bleeding in.
// ─────────────────────────────────────────────────────────────
export function autotileMask(fromColor, toColor, mask, seed = 0) {
  const rnd = mulberry(seed + mask * 101 + 17);
  const parts = [`<rect width="64" height="64" fill="${fromColor}"/>`];

  // Draw "to" overlay on each direction bit that's set.
  // Overlap at corners produces natural concave seams.
  if (mask & 1) parts.push(seamPolygon('N', toColor, rnd));
  if (mask & 2) parts.push(seamPolygon('E', toColor, rnd));
  if (mask & 4) parts.push(seamPolygon('S', toColor, rnd));
  if (mask & 8) parts.push(seamPolygon('W', toColor, rnd));

  // Decor along the seam (only if mask ≠ 0 and not full coverage).
  if (mask !== 0) parts.push(seamDecor(fromColor, toColor, mask, rnd));

  return svg(64, 64, parts.join(''));
}

function seamPolygon(side, color, rnd) {
  // Irregular wavy seam, ~20-26 px deep, 7 segments.
  const steps = 7;
  const baseDepth = 20 + rnd() * 6;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const j = (rnd() - 0.5) * 6;
    const d = baseDepth + j;
    if (side === 'N') pts.push([t * 64, d]);
    if (side === 'S') pts.push([t * 64, 64 - d]);
    if (side === 'E') pts.push([64 - d, t * 64]);
    if (side === 'W') pts.push([d, t * 64]);
  }
  const asStr = arr => arr.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');

  // Build a closed polygon covering the "to" side.
  let path;
  if (side === 'N') {
    // (0,0) → (64,0) → seam right-to-left → back to (0,0)
    const rev = pts.slice().reverse();
    path = `M0 0 L64 0 L${asStr(rev)} Z`;
  } else if (side === 'S') {
    // (0,64) → seam left-to-right → (64,64) → close
    path = `M0 64 L${asStr(pts)} L64 64 Z`;
  } else if (side === 'E') {
    // (64,0) → seam top-to-bottom → (64,64) → close
    path = `M64 0 L${asStr(pts)} L64 64 Z`;
  } else {
    // W: (0,64) → seam bottom-to-top → (0,0) → close
    const rev = pts.slice().reverse();
    path = `M0 64 L${asStr(rev)} L0 0 Z`;
  }
  return `<path d="${path}" fill="${color}"/>`;
}

function seamDecor(fromColor, toColor, mask, rnd) {
  const d = [];
  // grass tufts (dark) scattered — visual noise to hide straight-line feel
  if (fromColor === P.grassMid) {
    for (let i = 0; i < 5; i++) {
      d.push(`<circle cx="${(rnd()*54+4).toFixed(1)}" cy="${(rnd()*54+4).toFixed(1)}" r="${(0.6+rnd()*0.8).toFixed(1)}" fill="${P.grassDark}" opacity="0.55"/>`);
    }
  }
  // pebbles on the "to" side (if to is dirt/stone)
  const pebbleColor = toColor === P.dirtMid ? P.dirtLight : P.stoneLight;
  const pebbleStroke = toColor === P.dirtMid ? P.dirtDark : P.stoneDark;
  for (let i = 0; i < 3; i++) {
    // Bias pebble placement toward a "to" edge (pick one enabled bit)
    const enabled = [];
    if (mask & 1) enabled.push('N');
    if (mask & 2) enabled.push('E');
    if (mask & 4) enabled.push('S');
    if (mask & 8) enabled.push('W');
    const side = enabled[Math.floor(rnd() * enabled.length)] || 'N';
    let cx = 32, cy = 32;
    if (side === 'N') { cx = rnd()*48+8; cy = rnd()*12+4; }
    if (side === 'S') { cx = rnd()*48+8; cy = 64-(rnd()*12+4); }
    if (side === 'E') { cx = 64-(rnd()*12+4); cy = rnd()*48+8; }
    if (side === 'W') { cx = rnd()*12+4; cy = rnd()*48+8; }
    const r = 0.9 + rnd() * 0.6;
    d.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${pebbleColor}" stroke="${pebbleStroke}" stroke-width="0.3" opacity="0.75"/>`);
  }
  return d.join('');
}

// Convenience: generate all 32 seam tiles for two biome pairs.
export function autotileGrassDirt(mask)  { return autotileMask(P.grassMid, P.dirtMid, mask, 1000); }
export function autotileGrassStone(mask) { return autotileMask(P.grassMid, P.stoneMid, mask, 2000); }

// ─────────────────────────────────────────────────────────────
// WARRIOR (mage-like pipeline). Hammer + shield, wide shoulders.
// Same sheet layout as mage (4 dirs walk + attack + death).
// ─────────────────────────────────────────────────────────────
export function warriorFrame(dir, anim, f) {
  if (anim === 'death') return warriorDeath(f);
  if (anim === 'attack') return warriorAttack(dir, f);
  const bob = [0, -1.2, 0, 1.2][f % 4];
  const legStep = [0, 3, 0, -3][f % 4];
  return warriorWalk(dir, bob, legStep);
}

function warriorWalk(dir, B, legStep) {
  const steel = '#a8a8b0', steelHi = '#d4d4dc', steelLo = '#4a4a52';
  // Helmet (steel with gold trim) varies by direction
  const helmet = (() => {
    if (dir === 'D') return `<path d="M24 ${16+B} Q32 ${10+B} 40 ${16+B} L40 ${24+B} Q32 ${26+B} 24 ${24+B} Z" fill="${steel}" stroke="${P.black}" stroke-width="1"/><path d="M24 ${16+B} Q32 ${12+B} 40 ${16+B}" stroke="${P.gold}" stroke-width="1.2" fill="none"/><path d="M28 ${16+B} L28 ${24+B}" stroke="${steelLo}" stroke-width="1"/><path d="M36 ${16+B} L36 ${24+B}" stroke="${steelLo}" stroke-width="1"/>`;
    if (dir === 'U') return `<path d="M24 ${16+B} Q32 ${10+B} 40 ${16+B} L40 ${24+B} Q32 ${26+B} 24 ${24+B} Z" fill="${steelLo}" stroke="${P.black}" stroke-width="1"/>`;
    if (dir === 'L') return `<path d="M26 ${16+B} Q30 ${10+B} 38 ${16+B} L38 ${24+B} Q30 ${26+B} 26 ${24+B} Z" fill="${steel}" stroke="${P.black}" stroke-width="1"/><circle cx="30" cy="${19+B}" r="0.8" fill="${P.black}"/>`;
    return `<path d="M26 ${16+B} Q34 ${10+B} 38 ${16+B} L38 ${24+B} Q34 ${26+B} 26 ${24+B} Z" fill="${steel}" stroke="${P.black}" stroke-width="1"/><circle cx="34" cy="${19+B}" r="0.8" fill="${P.black}"/>`;
  })();

  // Big shoulder pauldrons (silhouette hook)
  const pauldrons = `<ellipse cx="20" cy="${30+B}" rx="7" ry="6" fill="${steel}" stroke="${P.black}" stroke-width="0.8"/>` +
    `<ellipse cx="44" cy="${30+B}" rx="7" ry="6" fill="${steel}" stroke="${P.black}" stroke-width="0.8"/>` +
    `<polygon points="18,${24+B} 21,${22+B} 22,${26+B}" fill="${P.goldHi}" stroke="${P.goldLo}" stroke-width="0.4"/>` +
    `<polygon points="42,${24+B} 45,${22+B} 46,${26+B}" fill="${P.goldHi}" stroke="${P.goldLo}" stroke-width="0.4"/>`;

  // Chest plate (steel + gold trim + red tabard)
  const torso = `<path d="M22 ${30+B} Q32 ${28+B} 42 ${30+B} L44 ${46+B} Q32 ${50+B} 20 ${46+B} Z" fill="${steel}" stroke="${P.black}" stroke-width="1"/>` +
    `<path d="M24 ${31+B} Q32 ${30+B} 40 ${31+B} L41 ${36+B} Q32 ${37+B} 23 ${36+B} Z" fill="${steelHi}" opacity="0.7"/>` +
    `<path d="M28 ${32+B} Q32 ${30+B} 36 ${32+B} L36 ${48+B} L28 ${48+B} Z" fill="${P.blood}" stroke="${P.robeRedLo}" stroke-width="0.6"/>` +
    `<path d="M22 ${39+B} Q32 ${38+B} 42 ${39+B}" stroke="${P.gold}" stroke-width="1" fill="none"/>`;

  // Legs (steel greaves) — step animation
  const legs = `<rect x="${26 + legStep * 0.3}" y="${50 + B}" width="4" height="7" fill="${steelLo}" stroke="${P.black}" stroke-width="0.4"/>` +
    `<rect x="${34 - legStep * 0.3}" y="${50 + B}" width="4" height="7" fill="${steelLo}" stroke="${P.black}" stroke-width="0.4"/>`;

  // SHIELD (large round, left side)
  const shield = dir === 'R'
    ? '' // hidden behind body when facing right
    : `<circle cx="${dir === 'L' ? 52 : 14}" cy="${34 + B}" r="7" fill="${P.blood}" stroke="${P.goldLo}" stroke-width="1"/><circle cx="${dir === 'L' ? 52 : 14}" cy="${34 + B}" r="4" fill="${P.gold}" stroke="${P.goldLo}" stroke-width="0.6"/><polygon points="${dir === 'L' ? 52 : 14},${30+B} ${(dir === 'L' ? 53 : 15)},${33+B} ${(dir === 'L' ? 55 : 17)},${33+B} ${(dir === 'L' ? 53 : 15)},${35+B} ${(dir === 'L' ? 54 : 16)},${38+B} ${(dir === 'L' ? 52 : 14)},${36+B} ${(dir === 'L' ? 50 : 12)},${38+B} ${(dir === 'L' ? 51 : 13)},${35+B} ${(dir === 'L' ? 49 : 11)},${33+B} ${(dir === 'L' ? 51 : 13)},${33+B}" fill="${P.blood}"/>`;

  // HAMMER (right side) — big blunt head
  const hammer = dir === 'L'
    ? `<rect x="8" y="${28+B}" width="2" height="18" fill="${P.wood}" transform="rotate(-15 9 36)"/><rect x="4" y="${22+B}" width="10" height="8" fill="${steelLo}" stroke="${P.black}" stroke-width="0.8"/>`
    : dir === 'R'
    ? `<rect x="54" y="${28+B}" width="2" height="18" fill="${P.wood}" transform="rotate(15 55 36)"/><rect x="50" y="${22+B}" width="10" height="8" fill="${steelLo}" stroke="${P.black}" stroke-width="0.8"/>`
    : dir === 'U'
    ? `<rect x="44" y="${18+B}" width="2" height="20" fill="${P.wood}"/><rect x="40" y="${12+B}" width="10" height="8" fill="${steelLo}" stroke="${P.black}" stroke-width="0.8"/>`
    : `<rect x="46" y="${28+B}" width="2" height="22" fill="${P.wood}"/><rect x="42" y="${22+B}" width="10" height="8" fill="${steelLo}" stroke="${P.black}" stroke-width="0.8"/>`;

  return svg(64, 64,
    `<ellipse cx="32" cy="60" rx="13" ry="2.5" fill="${P.black}" opacity="0.4"/>` +
    legs + torso + pauldrons + helmet + shield + hammer
  );
}

function warriorAttack(dir, f) {
  const base = warriorWalk(dir, 0, 0);
  // On frame 1: flash hammer head + impact radial
  const fx = f === 1
    ? `<circle cx="45" cy="26" r="9" fill="${P.goldHi}" opacity="0.45"/><circle cx="45" cy="26" r="4" fill="${P.white}" opacity="0.9"/>`
    : f === 2
    ? `<line x1="48" y1="22" x2="56" y2="14" stroke="${P.gold}" stroke-width="1.2"/><line x1="50" y1="28" x2="58" y2="28" stroke="${P.gold}" stroke-width="1.2"/>`
    : '';
  return base.replace('</svg>', fx + '</svg>');
}

function warriorDeath(f) {
  const rot = [0, 45, 80][f] || 0;
  const op = [1.0, 0.8, 0.5][f] || 0.5;
  const base = warriorWalk('D', 4, 0);
  return svg(64, 64,
    `<g transform="rotate(${rot} 32 40)" opacity="${op}">${stripSvgWrapper(base)}</g>` +
    (f === 2 ? `<text x="32" y="20" text-anchor="middle" font-family="serif" font-size="10" fill="${P.gold}" opacity="0.7">†</text>` : '')
  );
}

// ─────────────────────────────────────────────────────────────
// SCOUT (mage-like pipeline). Green hood + short bow, slim.
// ─────────────────────────────────────────────────────────────
export function scoutFrame(dir, anim, f) {
  if (anim === 'death') return scoutDeath(f);
  if (anim === 'attack') return scoutAttack(dir, f);
  const bob = [0, -1.5, 0, 1.5][f % 4];
  const legStep = [0, 3, 0, -3][f % 4];
  return scoutWalk(dir, bob, legStep);
}

function scoutWalk(dir, B, legStep) {
  const hoodGreen = '#2a5a22', hoodGreenHi = '#4a8a2e', tunic = '#6aa02a';

  // Hood (varies by direction)
  const hood = (() => {
    if (dir === 'D') return `<path d="M22 ${14+B} Q32 ${4+B} 42 ${14+B} L40 ${24+B} Q32 ${26+B} 24 ${24+B} Z" fill="${hoodGreen}" stroke="${P.black}" stroke-width="1"/><path d="M24 ${15+B} Q32 ${8+B} 40 ${15+B}" stroke="${hoodGreenHi}" stroke-width="0.8" fill="none"/>`;
    if (dir === 'U') return `<path d="M22 ${14+B} Q32 ${4+B} 42 ${14+B} L40 ${24+B} Q32 ${26+B} 24 ${24+B} Z" fill="${hoodGreenHi}" stroke="${P.black}" stroke-width="1"/>`;
    if (dir === 'L') return `<path d="M20 ${14+B} Q28 ${2+B} 40 ${14+B} L38 ${24+B} Q28 ${26+B} 24 ${24+B} Z" fill="${hoodGreen}" stroke="${P.black}" stroke-width="1"/>`;
    return `<path d="M24 ${14+B} Q36 ${2+B} 44 ${14+B} L40 ${24+B} Q36 ${26+B} 26 ${24+B} Z" fill="${hoodGreen}" stroke="${P.black}" stroke-width="1"/>`;
  })();

  // Face peeking
  const face = dir === 'D'
    ? `<circle cx="32" cy="${22 + B}" r="4" fill="${P.skin}"/><circle cx="30" cy="${22+B}" r="0.7" fill="${P.black}"/><circle cx="34" cy="${22+B}" r="0.7" fill="${P.black}"/>`
    : dir === 'L'
    ? `<circle cx="30" cy="${22 + B}" r="3.5" fill="${P.skin}"/><circle cx="28" cy="${22+B}" r="0.6" fill="${P.black}"/>`
    : dir === 'R'
    ? `<circle cx="34" cy="${22 + B}" r="3.5" fill="${P.skin}"/><circle cx="36" cy="${22+B}" r="0.6" fill="${P.black}"/>`
    : '';

  // Tunic body (slim)
  const body = `<path d="M24 ${28+B} Q32 ${26+B} 40 ${28+B} L42 ${44+B} Q32 ${47+B} 22 ${44+B} Z" fill="${tunic}" stroke="${hoodGreen}" stroke-width="1"/>` +
    `<path d="M26 ${29+B} Q32 ${27+B} 38 ${29+B} L38 ${38+B} Q32 ${40+B} 26 ${38+B} Z" fill="${hoodGreenHi}" opacity="0.45"/>` +
    // brown belt
    `<rect x="24" y="${40+B}" width="16" height="3" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.3"/>` +
    `<rect x="30" y="${40+B}" width="4" height="3" fill="${P.gold}"/>`;

  // Quiver at back (visible on D/L/R)
  const quiver = dir === 'U' ? '' :
    `<rect x="${dir === 'R' ? 40 : dir === 'L' ? 20 : 38}" y="${30+B}" width="4" height="12" fill="${P.leatherLo}"/>` +
    `<rect x="${dir === 'R' ? 41 : dir === 'L' ? 21 : 39}" y="${28+B}" width="1" height="3" fill="${P.goldHi}"/>` +
    `<rect x="${dir === 'R' ? 42 : dir === 'L' ? 22 : 40}" y="${28+B}" width="1" height="3" fill="${P.goldHi}"/>`;

  // Legs
  const legs = `<rect x="${26 + legStep * 0.3}" y="${47 + B}" width="3" height="6" fill="${P.leather}" stroke="${P.black}" stroke-width="0.4"/>` +
    `<rect x="35 - legStep * 0.3}" y="${47 + B}" width="3" height="6" fill="${P.leather}" stroke="${P.black}" stroke-width="0.4"/>`
    .replace('35 - legStep * 0.3}', (35 - legStep * 0.3).toString() + '}');
  // fallback proper legs (string templating for second leg):
  const legs2 = `<rect x="${(26 + legStep * 0.3).toFixed(1)}" y="${47 + B}" width="3" height="6" fill="${P.leather}" stroke="${P.black}" stroke-width="0.4"/>` +
    `<rect x="${(35 - legStep * 0.3).toFixed(1)}" y="${47 + B}" width="3" height="6" fill="${P.leather}" stroke="${P.black}" stroke-width="0.4"/>`;

  // Short bow (curved, smaller than mage staff)
  const bow = dir === 'L'
    ? `<path d="M18 ${22+B} Q12 ${34+B} 18 ${46+B}" fill="none" stroke="${P.wood}" stroke-width="1.5" stroke-linecap="round"/><path d="M18 ${22+B} L18 ${46+B}" stroke="${P.white}" stroke-width="0.6"/>`
    : dir === 'R'
    ? `<path d="M46 ${22+B} Q52 ${34+B} 46 ${46+B}" fill="none" stroke="${P.wood}" stroke-width="1.5" stroke-linecap="round"/><path d="M46 ${22+B} L46 ${46+B}" stroke="${P.white}" stroke-width="0.6"/>`
    : dir === 'U'
    ? `<path d="M22 ${34+B} Q32 ${28+B} 42 ${34+B}" fill="none" stroke="${P.wood}" stroke-width="1.5" stroke-linecap="round"/>`
    : `<path d="M22 ${36+B} Q32 ${42+B} 42 ${36+B}" fill="none" stroke="${P.wood}" stroke-width="1.5" stroke-linecap="round"/>`;

  return svg(64, 64,
    `<ellipse cx="32" cy="57" rx="10" ry="2" fill="${P.black}" opacity="0.35"/>` +
    legs2 + body + quiver + hood + face + bow
  );
}

function scoutAttack(dir, f) {
  const base = scoutWalk(dir, 0, 0);
  // Frame 1: draw string back + arrow; Frame 2: release flash
  const fx = f === 1
    ? `<line x1="32" y1="30" x2="32" y2="10" stroke="${P.wood}" stroke-width="0.8"/><polygon points="30,10 32,6 34,10" fill="${P.blood}"/>`
    : f === 2
    ? `<line x1="32" y1="28" x2="32" y2="0" stroke="${P.wood}" stroke-width="1"/><polygon points="30,2 32,-2 34,2" fill="${P.blood}"/>`
    : '';
  return base.replace('</svg>', fx + '</svg>');
}

function scoutDeath(f) {
  const rot = [0, 40, 70][f] || 0;
  const op = [1.0, 0.8, 0.5][f] || 0.5;
  const base = scoutWalk('D', 4, 0);
  return svg(64, 64,
    `<g transform="rotate(${rot} 32 40)" opacity="${op}">${stripSvgWrapper(base)}</g>` +
    (f === 2 ? `<text x="32" y="20" text-anchor="middle" font-family="serif" font-size="10" fill="${P.grassDark}" opacity="0.7">✦</text>` : '')
  );
}

// ─────────────────────────────────────────────────────────────
// SMALL MOBS — 64×64, 4-dir walk + 3-frame death.
// All follow the same schema:
//   row 0: up    walk × 4
//   row 1: left  walk × 4
//   row 2: down  walk × 4
//   row 3: right walk × 4
//   row 4: death × 3 (col 3 blank) — shared across directions
// ─────────────────────────────────────────────────────────────

// helper: death overlay (rotate+fade)
function mobDeath(baseFrame, f, tint) {
  const rot = [0, 35, 70][f] || 0;
  const op = [1.0, 0.8, 0.5][f] || 0.5;
  return svg(64, 64,
    `<g transform="rotate(${rot} 32 40)" opacity="${op}">${stripSvgWrapper(baseFrame)}</g>` +
    (f === 2 ? `<text x="32" y="14" text-anchor="middle" font-family="serif" font-size="10" fill="${tint}" opacity="0.75">✦</text>` : '')
  );
}

// ── GOBLIN (small, green, hunched, dagger) ──────────────────
export function goblinFrame(dir, anim, f) {
  if (anim === 'death') return mobDeath(goblinWalk('D', 0, 0), f, P.blood);
  const B = [0, -1, 0, 1][f % 4];
  const leg = [0, 2, 0, -2][f % 4];
  return goblinWalk(dir, B, leg);
}
function goblinWalk(dir, B, legStep) {
  const skin = '#5aa048', skinDark = '#3a7028';
  const head = `<ellipse cx="32" cy="${26 + B}" rx="7" ry="6" fill="${skin}" stroke="${skinDark}" stroke-width="0.7"/>`;
  const ears = `<polygon points="25,${23+B} 22,${19+B} 28,${24+B}" fill="${skin}" stroke="${skinDark}" stroke-width="0.4"/>` +
    `<polygon points="39,${23+B} 42,${19+B} 36,${24+B}" fill="${skin}" stroke="${skinDark}" stroke-width="0.4"/>`;
  const eyes = dir === 'D'
    ? `<ellipse cx="29" cy="${26+B}" rx="1.8" ry="1.3" fill="${P.gold}"/><circle cx="29" cy="${26+B}" r="0.6" fill="${P.black}"/><ellipse cx="35" cy="${26+B}" rx="1.8" ry="1.3" fill="${P.gold}"/><circle cx="35" cy="${26+B}" r="0.6" fill="${P.black}"/>`
    : dir === 'L' ? `<circle cx="28" cy="${26+B}" r="1" fill="${P.gold}"/>`
    : dir === 'R' ? `<circle cx="36" cy="${26+B}" r="1" fill="${P.gold}"/>`
    : '';
  const body = `<path d="M24 ${34+B} Q32 ${31+B} 40 ${34+B} L42 ${48+B} Q32 ${51+B} 22 ${48+B} Z" fill="${skin}" stroke="${skinDark}" stroke-width="0.8"/>` +
    `<path d="M24 ${38+B} Q32 ${42+B} 40 ${38+B}" stroke="${skinDark}" stroke-width="0.6" fill="none"/>` +
    `<rect x="26" y="${44+B}" width="12" height="4" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.4"/>`;
  const legs = `<rect x="${(27 + legStep * 0.3).toFixed(1)}" y="${48 + B}" width="3" height="6" fill="${skinDark}"/>` +
    `<rect x="${(34 - legStep * 0.3).toFixed(1)}" y="${48 + B}" width="3" height="6" fill="${skinDark}"/>`;
  // dagger
  const dagger = dir === 'L'
    ? `<rect x="18" y="${32+B}" width="2" height="10" fill="#b8b8c2" stroke="${P.black}" stroke-width="0.4"/><rect x="17" y="${40+B}" width="4" height="2" fill="${P.wood}"/>`
    : dir === 'R'
    ? `<rect x="44" y="${32+B}" width="2" height="10" fill="#b8b8c2" stroke="${P.black}" stroke-width="0.4"/><rect x="43" y="${40+B}" width="4" height="2" fill="${P.wood}"/>`
    : dir === 'U'
    ? `<rect x="41" y="${24+B}" width="2" height="10" fill="#b8b8c2" stroke="${P.black}" stroke-width="0.4"/><rect x="40" y="${32+B}" width="4" height="2" fill="${P.wood}"/>`
    : `<rect x="42" y="${34+B}" width="2" height="10" fill="#b8b8c2" stroke="${P.black}" stroke-width="0.4"/><rect x="41" y="${42+B}" width="4" height="2" fill="${P.wood}"/>`;
  return svg(64, 64,
    `<ellipse cx="32" cy="56" rx="9" ry="2" fill="${P.black}" opacity="0.35"/>` +
    legs + body + ears + head + eyes + dagger
  );
}

// ── SLIME (blob, no legs; walk = squash/stretch pulse) ──────
export function slimeFrame(dir, anim, f) {
  if (anim === 'death') return mobDeath(slimeWalk('D', 0), f, '#6aaaff');
  const pulse = [0, 2, 0, -2][f % 4];
  return slimeWalk(dir, pulse);
}
function slimeWalk(dir, pulse) {
  const body = '#6aaaff', hi = '#c8e4ff', lo = '#1c5a9a';
  // body dimensions shift with pulse — wider when squashed, taller when stretched
  const rx = 18 + pulse, ry = 14 - pulse * 0.5;
  const cy = 42 + pulse * 0.3;
  // eye position shifts with direction to show gaze
  const eyeDX = dir === 'L' ? -3 : dir === 'R' ? 3 : 0;
  const eyeDY = dir === 'U' ? -1 : dir === 'D' ? 1 : 0;
  return svg(64, 64,
    `<ellipse cx="32" cy="58" rx="${rx * 0.7}" ry="2" fill="${P.black}" opacity="0.4"/>` +
    // gelatinous body
    `<ellipse cx="32" cy="${cy}" rx="${rx}" ry="${ry}" fill="${body}" stroke="${lo}" stroke-width="1.2"/>` +
    // highlight (top-left)
    `<ellipse cx="${26 + eyeDX * 0.3}" cy="${cy - ry * 0.45}" rx="${rx * 0.35}" ry="${ry * 0.3}" fill="${hi}" opacity="0.7"/>` +
    // eye whites
    `<circle cx="${27 + eyeDX}" cy="${cy - 2 + eyeDY}" r="2.5" fill="${P.white}" stroke="${lo}" stroke-width="0.5"/>` +
    `<circle cx="${37 + eyeDX}" cy="${cy - 2 + eyeDY}" r="2.5" fill="${P.white}" stroke="${lo}" stroke-width="0.5"/>` +
    // pupils
    `<circle cx="${27 + eyeDX + eyeDX * 0.15}" cy="${cy - 2 + eyeDY}" r="1" fill="${P.black}"/>` +
    `<circle cx="${37 + eyeDX + eyeDX * 0.15}" cy="${cy - 2 + eyeDY}" r="1" fill="${P.black}"/>` +
    // smile (dir=down) or flat (side) — keeps it cute-creepy
    (dir === 'D' || dir === 'U'
      ? `<path d="M26 ${cy + 4} Q32 ${cy + 8} 38 ${cy + 4}" stroke="${lo}" stroke-width="1.2" fill="none"/>`
      : `<line x1="28" y1="${cy + 5}" x2="36" y2="${cy + 5}" stroke="${lo}" stroke-width="1"/>`)
  );
}

// ── WOLF (quadruped, fur, menacing) ────────────────────────
export function wolfFrame(dir, anim, f) {
  if (anim === 'death') return mobDeath(wolfWalk('D', 0, 0), f, P.blood);
  const B = [0, -1.5, 0, 1.5][f % 4];
  const legAlt = [0, 3, 0, -3][f % 4];
  return wolfWalk(dir, B, legAlt);
}
function wolfWalk(dir, B, legAlt) {
  const fur = '#7a6a52', furDark = '#3a2e1e', furHi = '#a89474';
  const head = `<ellipse cx="32" cy="${22 + B}" rx="8" ry="7" fill="${fur}" stroke="${furDark}" stroke-width="0.9"/>`;
  // ears (pointed)
  const ears = `<polygon points="26,${18+B} 22,${12+B} 30,${17+B}" fill="${fur}" stroke="${furDark}" stroke-width="0.5"/>` +
    `<polygon points="38,${18+B} 42,${12+B} 34,${17+B}" fill="${fur}" stroke="${furDark}" stroke-width="0.5"/>`;
  const snout = `<ellipse cx="32" cy="${27 + B}" rx="4" ry="3" fill="${furHi}" stroke="${furDark}" stroke-width="0.5"/><ellipse cx="32" cy="${26 + B}" rx="1" ry="1" fill="${P.black}"/>`;
  const eyes = dir === 'D' ? `<circle cx="29" cy="${22+B}" r="0.9" fill="${P.gold}"/><circle cx="35" cy="${22+B}" r="0.9" fill="${P.gold}"/>`
    : dir === 'L' ? `<circle cx="28" cy="${22+B}" r="0.9" fill="${P.gold}"/>`
    : dir === 'R' ? `<circle cx="36" cy="${22+B}" r="0.9" fill="${P.gold}"/>`
    : '';
  // body (elongated, long axis along direction of travel — we keep top-down cylinder)
  const body = `<ellipse cx="32" cy="${40 + B}" rx="10" ry="11" fill="${fur}" stroke="${furDark}" stroke-width="1"/>` +
    `<ellipse cx="32" cy="${40 + B}" rx="6" ry="9" fill="${furHi}" opacity="0.4"/>` +
    // fur clumps / back ridge
    `<line x1="32" y1="${30+B}" x2="32" y2="${50+B}" stroke="${furDark}" stroke-width="0.6" opacity="0.7"/>` +
    `<line x1="28" y1="${32+B}" x2="28" y2="${48+B}" stroke="${furDark}" stroke-width="0.4" opacity="0.5"/>` +
    `<line x1="36" y1="${32+B}" x2="36" y2="${48+B}" stroke="${furDark}" stroke-width="0.4" opacity="0.5"/>`;
  // four paws — front pair + back pair, alternating
  const paws = `<rect x="${(22 + legAlt * 0.3).toFixed(1)}" y="${32 + B}" width="3" height="5" fill="${furDark}"/>` +
    `<rect x="${(39 - legAlt * 0.3).toFixed(1)}" y="${32 + B}" width="3" height="5" fill="${furDark}"/>` +
    `<rect x="${(22 - legAlt * 0.3).toFixed(1)}" y="${48 + B}" width="3" height="5" fill="${furDark}"/>` +
    `<rect x="${(39 + legAlt * 0.3).toFixed(1)}" y="${48 + B}" width="3" height="5" fill="${furDark}"/>`;
  // tail (back of body)
  const tail = `<path d="M32 ${50+B} Q${34 + legAlt * 0.2} ${56+B} ${36 + legAlt * 0.4} ${55+B}" stroke="${fur}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  return svg(64, 64,
    `<ellipse cx="32" cy="58" rx="13" ry="2.5" fill="${P.black}" opacity="0.35"/>` +
    paws + tail + body + head + ears + snout + eyes
  );
}

// ── SKELETON (small, bony, short sword) ────────────────────
export function skeletonFrame(dir, anim, f) {
  if (anim === 'death') return mobDeath(skeletonWalk('D', 0, 0), f, '#d8cdb5');
  const B = [0, -1.2, 0, 1.2][f % 4];
  const leg = [0, 2.5, 0, -2.5][f % 4];
  return skeletonWalk(dir, B, leg);
}
function skeletonWalk(dir, B, legStep) {
  const bone = '#e4d9bf', boneDark = '#8a7458';
  // skull
  const skull = `<ellipse cx="32" cy="${22 + B}" rx="6" ry="6.5" fill="${bone}" stroke="${boneDark}" stroke-width="0.7"/>`;
  // eye sockets (glowing)
  const eyes = `<ellipse cx="${dir === 'R' ? 35 : 29}" cy="${22+B}" rx="1.5" ry="2" fill="${P.black}"/>` +
    `<circle cx="${dir === 'R' ? 35 : 29}" cy="${22+B}" r="0.6" fill="${P.blood}"/>` +
    (dir !== 'L' && dir !== 'R'
      ? `<ellipse cx="${dir === 'L' ? 29 : 35}" cy="${22+B}" rx="1.5" ry="2" fill="${P.black}"/><circle cx="${dir === 'L' ? 29 : 35}" cy="${22+B}" r="0.6" fill="${P.blood}"/>`
      : '');
  // teeth
  const teeth = `<line x1="28" y1="${27+B}" x2="28" y2="${29+B}" stroke="${boneDark}" stroke-width="0.6"/><line x1="31" y1="${27+B}" x2="31" y2="${29+B}" stroke="${boneDark}" stroke-width="0.6"/><line x1="34" y1="${27+B}" x2="34" y2="${29+B}" stroke="${boneDark}" stroke-width="0.6"/>`;
  // ribcage
  const ribs = `<ellipse cx="32" cy="${40 + B}" rx="8" ry="9" fill="${bone}" stroke="${boneDark}" stroke-width="0.8"/>` +
    `<line x1="25" y1="${36+B}" x2="39" y2="${36+B}" stroke="${boneDark}" stroke-width="0.7"/>` +
    `<line x1="24" y1="${40+B}" x2="40" y2="${40+B}" stroke="${boneDark}" stroke-width="0.7"/>` +
    `<line x1="25" y1="${44+B}" x2="39" y2="${44+B}" stroke="${boneDark}" stroke-width="0.7"/>` +
    `<line x1="32" y1="${32+B}" x2="32" y2="${48+B}" stroke="${boneDark}" stroke-width="0.8"/>`;
  // pelvis
  const pelvis = `<path d="M25 ${48+B} L32 ${50+B} L39 ${48+B} L37 ${52+B} L27 ${52+B} Z" fill="${bone}" stroke="${boneDark}" stroke-width="0.7"/>`;
  // leg bones
  const legs = `<rect x="${(27 + legStep * 0.3).toFixed(1)}" y="${52 + B}" width="2" height="7" fill="${bone}" stroke="${boneDark}" stroke-width="0.4"/>` +
    `<rect x="${(35 - legStep * 0.3).toFixed(1)}" y="${52 + B}" width="2" height="7" fill="${bone}" stroke="${boneDark}" stroke-width="0.4"/>`;
  // short rusty sword
  const sword = dir === 'L'
    ? `<rect x="19" y="${34+B}" width="2" height="12" fill="#7a6240" stroke="${P.black}" stroke-width="0.3"/><rect x="18" y="${44+B}" width="4" height="2" fill="${P.wood}"/>`
    : dir === 'R'
    ? `<rect x="43" y="${34+B}" width="2" height="12" fill="#7a6240" stroke="${P.black}" stroke-width="0.3"/><rect x="42" y="${44+B}" width="4" height="2" fill="${P.wood}"/>`
    : dir === 'U'
    ? `<rect x="41" y="${26+B}" width="2" height="12" fill="#7a6240" stroke="${P.black}" stroke-width="0.3"/><rect x="40" y="${36+B}" width="4" height="2" fill="${P.wood}"/>`
    : `<rect x="42" y="${34+B}" width="2" height="12" fill="#7a6240" stroke="${P.black}" stroke-width="0.3"/><rect x="41" y="${44+B}" width="4" height="2" fill="${P.wood}"/>`;
  return svg(64, 64,
    `<ellipse cx="32" cy="58" rx="10" ry="2" fill="${P.black}" opacity="0.35"/>` +
    legs + pelvis + ribs + skull + eyes + teeth + sword
  );
}

// ─────────────────────────────────────────────────────────────
// BOSS TROLL (128×128 frames, bigger + club + fangs)
// Layout: 4×6 grid (walk 4dir × 4f, attack × 3, death × 3)
// ─────────────────────────────────────────────────────────────
export function trollFrame(dir, anim, f) {
  if (anim === 'death') return trollDeath(f);
  if (anim === 'attack') return trollAttack(dir, f);
  const B = [0, -2, 0, 2][f % 4];
  const legStep = [0, 4, 0, -4][f % 4];
  return trollWalk(dir, B, legStep);
}
function trollWalk(dir, B, legStep) {
  const skin = '#4a7028', skinDark = '#2a4618', skinHi = '#6aa036';
  const head = `<ellipse cx="64" cy="${42 + B}" rx="18" ry="17" fill="${skin}" stroke="${skinDark}" stroke-width="1.5"/>`;
  const headHi = `<ellipse cx="58" cy="${36 + B}" rx="8" ry="6" fill="${skinHi}" opacity="0.6"/>`;
  // horn nubs
  const horns = `<polygon points="52,${28+B} 54,${18+B} 58,${30+B}" fill="${skinHi}" stroke="${skinDark}" stroke-width="0.9"/>` +
    `<polygon points="76,${28+B} 74,${18+B} 70,${30+B}" fill="${skinHi}" stroke="${skinDark}" stroke-width="0.9"/>`;
  // big eyes
  const eyes = dir === 'D'
    ? `<ellipse cx="56" cy="${40+B}" rx="3" ry="2.5" fill="${P.gold}"/><circle cx="57" cy="${40+B}" r="1.4" fill="${P.blood}"/><ellipse cx="72" cy="${40+B}" rx="3" ry="2.5" fill="${P.gold}"/><circle cx="71" cy="${40+B}" r="1.4" fill="${P.blood}"/>`
    : dir === 'L' ? `<ellipse cx="54" cy="${40+B}" rx="2.5" ry="2" fill="${P.gold}"/><circle cx="53" cy="${40+B}" r="1" fill="${P.blood}"/>`
    : dir === 'R' ? `<ellipse cx="74" cy="${40+B}" rx="2.5" ry="2" fill="${P.gold}"/><circle cx="75" cy="${40+B}" r="1" fill="${P.blood}"/>`
    : '';
  // lower fangs (only visible when facing D/L/R)
  const fangs = dir !== 'U'
    ? `<polygon points="58,${52+B} 56,${62+B} 60,${58+B}" fill="${P.white}" stroke="${P.black}" stroke-width="0.5"/><polygon points="70,${52+B} 72,${62+B} 68,${58+B}" fill="${P.white}" stroke="${P.black}" stroke-width="0.5"/>`
    : '';
  // hulking body
  const body = `<path d="M36 ${70+B} Q64 ${64+B} 92 ${70+B} L96 ${100+B} Q64 ${106+B} 32 ${100+B} Z" fill="${skin}" stroke="${skinDark}" stroke-width="1.5"/>` +
    `<path d="M42 ${74+B} Q64 ${70+B} 86 ${74+B} L86 ${96+B} Q64 ${100+B} 42 ${96+B} Z" fill="${skinHi}" opacity="0.45"/>` +
    // belt
    `<rect x="36" y="${94+B}" width="56" height="6" fill="${P.leather}" stroke="${P.leatherLo}" stroke-width="0.8"/>` +
    `<rect x="60" y="${92+B}" width="8" height="10" fill="${P.gold}" stroke="${P.goldLo}" stroke-width="0.8"/>`;
  // arms (one holds club, other dangles)
  const armFree = dir === 'R' ? 'R' : dir === 'L' ? 'L' : 'R';
  // legs
  const legs = `<rect x="${(50 + legStep * 0.3).toFixed(1)}" y="${100 + B}" width="8" height="14" fill="${skinDark}" stroke="${P.black}" stroke-width="0.5"/>` +
    `<rect x="${(70 - legStep * 0.3).toFixed(1)}" y="${100 + B}" width="8" height="14" fill="${skinDark}" stroke="${P.black}" stroke-width="0.5"/>`;
  // HUGE club
  const club = dir === 'L'
    ? `<rect x="18" y="${60+B}" width="4" height="36" fill="${P.wood}" stroke="${P.leatherLo}" stroke-width="1" transform="rotate(-20 20 78)"/><ellipse cx="12" cy="${50+B}" rx="10" ry="8" fill="${P.leatherHi}" stroke="${P.black}" stroke-width="1.2"/><polygon points="6,${42+B} 10,${48+B} 4,${50+B}" fill="${P.stoneDark}" stroke="${P.black}" stroke-width="0.6"/><polygon points="20,${42+B} 16,${48+B} 22,${50+B}" fill="${P.stoneDark}" stroke="${P.black}" stroke-width="0.6"/>`
    : dir === 'R'
    ? `<rect x="106" y="${60+B}" width="4" height="36" fill="${P.wood}" stroke="${P.leatherLo}" stroke-width="1" transform="rotate(20 108 78)"/><ellipse cx="116" cy="${50+B}" rx="10" ry="8" fill="${P.leatherHi}" stroke="${P.black}" stroke-width="1.2"/><polygon points="122,${42+B} 118,${48+B} 124,${50+B}" fill="${P.stoneDark}"/><polygon points="108,${42+B} 112,${48+B} 106,${50+B}" fill="${P.stoneDark}"/>`
    : dir === 'U'
    ? `<rect x="92" y="${42+B}" width="4" height="36" fill="${P.wood}" stroke="${P.leatherLo}" stroke-width="1"/><ellipse cx="94" cy="${34+B}" rx="9" ry="7" fill="${P.leatherHi}" stroke="${P.black}" stroke-width="1.2"/>`
    : `<rect x="94" y="${62+B}" width="4" height="40" fill="${P.wood}" stroke="${P.leatherLo}" stroke-width="1"/><ellipse cx="96" cy="${56+B}" rx="9" ry="7" fill="${P.leatherHi}" stroke="${P.black}" stroke-width="1.2"/>`;
  return svg(128, 128,
    `<ellipse cx="64" cy="118" rx="26" ry="5" fill="${P.black}" opacity="0.45"/>` +
    legs + body + horns + head + headHi + eyes + fangs + club
  );
}
function trollAttack(dir, f) {
  const base = trollWalk(dir, 0, 0);
  // impact ring + club glow on frame 1
  const fx = f === 1
    ? `<circle cx="96" cy="48" r="18" fill="${P.goldHi}" opacity="0.4"/><circle cx="96" cy="48" r="10" fill="${P.white}" opacity="0.85"/>`
    : f === 2
    ? `<g stroke="${P.gold}" stroke-width="1.5"><line x1="110" y1="34" x2="120" y2="24"/><line x1="114" y1="48" x2="126" y2="48"/><line x1="110" y1="62" x2="120" y2="72"/></g>`
    : '';
  return base.replace('</svg>', fx + '</svg>');
}
function trollDeath(f) {
  const rot = [0, 50, 85][f] || 0;
  const op = [1.0, 0.82, 0.5][f] || 0.5;
  const base = trollWalk('D', 8, 0);
  return svg(128, 128,
    `<g transform="rotate(${rot} 64 72)" opacity="${op}">${stripSvgWrapper(base)}</g>` +
    (f === 2 ? `<text x="64" y="30" text-anchor="middle" font-family="serif" font-size="18" fill="${P.gold}" opacity="0.75">†</text>` : '')
  );
}
