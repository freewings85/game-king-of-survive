(function() {
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var W = 800, H = 600;
  var _dpr = 1;

  // isMobile detection — used for scaling touch-friendly UI
  // isMobile detection — used for scaling touch-friendly UI
  var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || ('ontouchstart' in window);
  // uiScale: factor for UI element sizes — 1.0 on desktop, larger on phones
  function getUIScale() { return Math.max(1, Math.min(2, Math.min(W, H) / 600)); }
  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    _dpr = dpr;
    var sw = window.innerWidth;
    var sh = window.innerHeight;
    // Fill the entire screen — no aspect-ratio constraint
    W = Math.round(sw * dpr);
    H = Math.round(sh * dpr);
    // Clamp minimum logical resolution to avoid too-low detail
    if (W < 400) W = 400;
    if (H < 300) H = 300;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = sw + 'px';
    canvas.style.height = sh + 'px';
    // Scale touch UI elements proportionally (guard: joystick declared later, undefined on first call)
    if (typeof joystick !== 'undefined' && joystick) {
      var uiBase = Math.min(W, H);
      joystick.radius = Math.max(55, Math.round(uiBase * 0.07));
    }
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // mapGenerator (US-015): world = 2x screen; camera follows player with edge clamp.
  // WORLD_W/H derived from W/H at startOfflineDemo so world scales with viewport.
  var WORLD_W = W * 2, WORLD_H = H * 2;
  var cameraX = 0, cameraY = 0; // camera offset

  // Static handcrafted map (Leo 2026-04-20 + 2026-04-21).
  // Three layouts shipped today: default (王冠之岛), arena_a (FFA 圆形竞技场),
  // lane_b (4v4 三线峡谷). Pick via ?map=<id>; falls back to default.
  var MAP_DATA = null;
  function _resolveMapPath() {
    var requested = 'default';
    try {
      var p = new URLSearchParams(window.location.search).get('map');
      if (p && /^[a-z0-9_]+$/i.test(p)) requested = p;
    } catch (e) {}
    return 'maps/' + requested + '.json';
  }
  function loadMapLayout(jsonPath) {
    // Synchronous primary fetch so startOfflineDemo never races the network.
    // Async fallback retained for environments that block sync XHR.
    MAP_DATA = null;
    var url = jsonPath || _resolveMapPath();
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send();
      if (xhr.status < 400 && xhr.responseText) {
        MAP_DATA = JSON.parse(xhr.responseText);
      }
    } catch (e) {
      console.warn('[map] sync load failed for', url, '— async retry', e && e.message);
    }
    if (!MAP_DATA) {
      try {
        var xhr2 = new XMLHttpRequest();
        xhr2.open('GET', url, true);
        xhr2.onload = function() {
          if (xhr2.status < 400) {
            try { MAP_DATA = JSON.parse(xhr2.responseText); console.log('[map] loaded', MAP_DATA.name); }
            catch (e) { console.warn('[map] async parse failed', e); }
          }
        };
        xhr2.send();
      } catch (e) {}
    }
    if (MAP_DATA) console.log('[map] active:', MAP_DATA.name, '(' + url + ')');
    return MAP_DATA;
  }
  // Backwards-compat alias used by startOfflineDemo's safety re-fetch.
  function _loadStaticMapSync() { return loadMapLayout(); }
  // Exposed for QA / future map-picker UI.
  window.loadMapLayout = loadMapLayout;
  window.__MAP_DATA = function() { return MAP_DATA; };
  loadMapLayout();

  // Map art assets (ArtDesigner 2026-04-21): Crystal Sanctum landmark +
  // 4 biome atlases for desert/swamp/snow/ruins. Sprites are optional — the
  // renderer falls back to flat colours if images haven't loaded yet.
  var MAP_ART = {
    landmarkSprites: {},        // key: relative path -> { img, ready }
    biomeAtlases: {},           // key: biome id (2/4/5/6) -> { img, ready, cols, rows, tileW, tileH }
    _pendingLoad: false
  };
  // R5h sprite pack (ArtDesigner 2026-04-21). Three visual polish hooks:
  //  - altar_impact_flash (128x128) per-hit golden burst on altar
  //  - crown_spotlight (512x384) full-screen 2s 加冕 overlay after altar kill
  //  - slow_debuff_aura (80x80) under every enemy while altar slow is active
  // All rasterised to offscreen canvas at load → cheap drawImage per frame.
  var R5H_FX = {
    impactFlash:    { img: new Image(), canvas: null, ready: false, size: 128 },
    impactFlashBig: { img: new Image(), canvas: null, ready: false, size: 192 },
    crownSpotlight: { img: new Image(), canvas: null, ready: false, w: 512, h: 384 },
    slowAura:       { img: new Image(), canvas: null, ready: false, size: 80 },
    activeFlashes:  [],   // per-hit { x, y, t, dur, big }
    crownPlay:      null  // { until, t, dur }
  };
  function _rasteriseR5h(entry, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(entry.img, 0, 0, w, h);
    entry.canvas = c;
  }
  (function _preloadR5H() {
    R5H_FX.impactFlash.img.onload = function() {
      try { _rasteriseR5h(R5H_FX.impactFlash, 128, 128); R5H_FX.impactFlash.ready = true; } catch (e) { R5H_FX.impactFlash.ready = true; }
    };
    R5H_FX.impactFlash.img.src = 'assets/maps/landmarks/altar_impact_flash.svg';
    R5H_FX.impactFlashBig.img.onload = function() {
      try { _rasteriseR5h(R5H_FX.impactFlashBig, 192, 192); R5H_FX.impactFlashBig.ready = true; } catch (e) { R5H_FX.impactFlashBig.ready = true; }
    };
    R5H_FX.impactFlashBig.img.src = 'assets/maps/landmarks/altar_impact_flash_big.svg';
    R5H_FX.crownSpotlight.img.onload = function() {
      // Spotlight is drawn at canvas size, so rasterise at native 512x384
      try { _rasteriseR5h(R5H_FX.crownSpotlight, 512, 384); R5H_FX.crownSpotlight.ready = true; } catch (e) { R5H_FX.crownSpotlight.ready = true; }
    };
    R5H_FX.crownSpotlight.img.src = 'assets/hud/crown_spotlight.svg';
    R5H_FX.slowAura.img.onload = function() {
      try { _rasteriseR5h(R5H_FX.slowAura, 80, 80); R5H_FX.slowAura.ready = true; } catch (e) { R5H_FX.slowAura.ready = true; }
    };
    R5H_FX.slowAura.img.src = 'assets/buffs/slow_debuff_aura.svg';
  })();

  // Round 5 combat FX pack (ArtDesigner 2026-04-21). captureBar rows 0-3,
  // rivalTrail frames 0-3, nemesisAura (animated SVG), stateFloats ribbons 0-5.
  var COMBAT_FX = {
    captureBar:  { img: new Image(), ready: false, barW: 128, barH: 16, rowH: 24 },
    rivalTrail:  { img: new Image(), ready: false, frameSize: 32 },
    nemesisAura: { img: new Image(), ready: false, size: 160, anchorX: 80, anchorY: 80 },
    stateFloats: { img: new Image(), ready: false, ribbonW: 160, ribbonH: 24, rowH: 32 }
  };
  (function _preloadCombatFX() {
    Object.keys(COMBAT_FX).forEach(function(k) {
      var e = COMBAT_FX[k];
      e.img.onload = function() { e.ready = true; };
      var file = ({ captureBar: 'capture_bar.svg', rivalTrail: 'rival_trail.svg', nemesisAura: 'nemesis_aura.svg', stateFloats: 'state_floats.svg' })[k];
      e.img.src = 'assets/combat/' + file;
    });
  })();
  (function _preloadMapArt() {
    // Rasterise SVG atlas to an offscreen bitmap canvas so every per-tile
    // drawImage hits a cached raster instead of re-rasterising the SVG each
    // call. ~5-10x faster than drawing SVG directly.
    function _rasterise(svgImg, w, h) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(svgImg, 0, 0, w, h);
      return c;
    }
    var biomeMap = { 2: 'biome_ruins.svg', 4: 'biome_desert.svg', 5: 'biome_swamp.svg', 6: 'biome_snow.svg' };
    Object.keys(biomeMap).forEach(function(bid) {
      var path = 'assets/maps/biomes/' + biomeMap[bid];
      var entry = { img: null, canvas: null, ready: false, cols: 4, rows: 2, tileW: 64, tileH: 64, w: 256, h: 128 };
      entry.img = new Image();
      entry.img.onload = function() {
        try { entry.canvas = _rasterise(entry.img, entry.w, entry.h); entry.ready = true; }
        catch (e) { console.warn('[map-art] rasterise failed', path, e); entry.ready = true; }
      };
      entry.img.src = path;
      MAP_ART.biomeAtlases[bid] = entry;
    });
    // Landmark sprites loaded lazily; rasterised on ready for faster per-frame draw.
  })();
  // ldoe-overhaul-01: 5 LDOE landmark procedural draws (no SVG load)
  function drawLdoeLandmark(c2, sx, sy, w, h, kind) {
    c2.save();
    // ground shadow
    c2.fillStyle = 'rgba(0,0,0,0.4)';
    c2.beginPath(); c2.ellipse(sx + w/2, sy + h - 6, w*0.42, 8, 0, 0, Math.PI*2); c2.fill();
    if (kind === 'gas_station') {
      // canopy posts + roof
      c2.fillStyle = '#3a3a38'; c2.fillRect(sx + 6, sy + 12, 6, h - 30);
      c2.fillRect(sx + w - 12, sy + 12, 6, h - 30);
      c2.fillStyle = '#dad8d4'; c2.fillRect(sx, sy + 4, w, 14);
      // rust streaks down canopy
      c2.fillStyle = '#6e2a1c';
      c2.fillRect(sx + 8, sy + 18, 2, h - 36); c2.fillRect(sx + w - 30, sy + 18, 2, h - 36);
      // big yellow sign
      c2.fillStyle = '#cfa84a'; c2.fillRect(sx + w/2 - 18, sy, 36, 14);
      c2.strokeStyle = '#1a1a18'; c2.lineWidth = 2; c2.strokeRect(sx + w/2 - 18, sy, 36, 14);
      c2.fillStyle = '#1a1a18'; c2.font = 'bold 10px sans-serif'; c2.textAlign = 'center';
      c2.fillText('GAS', sx + w/2, sy + 11); c2.textAlign = 'left';
      // pump (small)
      c2.fillStyle = '#dad8d4'; c2.fillRect(sx + w/2 - 8, sy + h - 22, 16, 18);
      c2.fillStyle = '#6e2a1c'; c2.fillRect(sx + w/2 - 6, sy + h - 18, 12, 6);
      // hose
      c2.strokeStyle = '#1a1a18'; c2.lineWidth = 1.5;
      c2.beginPath(); c2.moveTo(sx + w/2 + 8, sy + h - 16); c2.quadraticCurveTo(sx + w/2 + 18, sy + h - 4, sx + w/2 + 14, sy + h - 6); c2.stroke();
    } else if (kind === 'wreck_car') {
      // crashed car body, tilted, rusted red
      c2.save(); c2.translate(sx + w/2, sy + h - 16); c2.rotate(-0.18);
      c2.fillStyle = '#6e2a1c'; c2.fillRect(-w*0.42, -14, w*0.84, 18);
      // roof crumple
      c2.fillStyle = '#5a221a'; c2.fillRect(-w*0.28, -22, w*0.42, 10);
      // broken windshield
      c2.fillStyle = '#1a1a18'; c2.fillRect(-w*0.22, -19, w*0.32, 6);
      c2.strokeStyle = '#3a3a38'; c2.lineWidth = 1;
      c2.beginPath(); c2.moveTo(-w*0.18, -19); c2.lineTo(-w*0.05, -13); c2.stroke();
      c2.beginPath(); c2.moveTo(w*0.05, -19); c2.lineTo(-w*0.02, -13); c2.stroke();
      // tires (one flat)
      c2.fillStyle = '#0a0a08';
      c2.beginPath(); c2.arc(-w*0.28, 4, 7, 0, Math.PI*2); c2.fill();
      c2.beginPath(); c2.arc(w*0.28, 6, 5, 0, Math.PI*2); c2.fill();
      c2.restore();
      // scattered debris
      c2.fillStyle = '#3a3a38';
      c2.fillRect(sx + 4, sy + h - 10, 6, 3); c2.fillRect(sx + w - 14, sy + h - 8, 8, 4);
    } else if (kind === 'barricade') {
      // sandbag stack
      c2.fillStyle = '#8a7050';
      var rows = Math.max(2, Math.floor(h / 18));
      for (var r = 0; r < rows; r++) {
        var rowY = sy + h - 14 - r * 14;
        var bagN = Math.floor(w / 18) - (r % 2);
        for (var b = 0; b < bagN; b++) {
          var bx = sx + 6 + b * 18 + (r % 2 ? 9 : 0);
          c2.beginPath(); c2.ellipse(bx + 8, rowY, 9, 6, 0, 0, Math.PI*2); c2.fill();
          c2.strokeStyle = '#5a4a32'; c2.lineWidth = 1; c2.stroke();
        }
      }
      // wood plank cross
      c2.strokeStyle = '#3e3220'; c2.lineWidth = 4;
      c2.beginPath(); c2.moveTo(sx + 4, sy + 10); c2.lineTo(sx + w - 4, sy + h - 14); c2.stroke();
      c2.beginPath(); c2.moveTo(sx + w - 4, sy + 10); c2.lineTo(sx + 4, sy + h - 14); c2.stroke();
    } else if (kind === 'fence') {
      // chain-link fence — diagonal grid + tilted post
      c2.strokeStyle = '#3a3a38'; c2.lineWidth = 2;
      // posts
      c2.beginPath(); c2.moveTo(sx + 2, sy + h); c2.lineTo(sx + 4, sy); c2.stroke();
      c2.beginPath(); c2.moveTo(sx + w - 2, sy + h); c2.lineTo(sx + w - 4, sy); c2.stroke();
      // top wire
      c2.beginPath(); c2.moveTo(sx + 4, sy); c2.lineTo(sx + w - 4, sy); c2.stroke();
      c2.beginPath(); c2.moveTo(sx + 4, sy + h); c2.lineTo(sx + w - 4, sy + h); c2.stroke();
      // diagonal mesh
      c2.strokeStyle = '#888880'; c2.lineWidth = 1;
      var step = 8;
      for (var d = 0; d < w + h; d += step) {
        c2.beginPath(); c2.moveTo(sx + d, sy); c2.lineTo(sx + d - h, sy + h); c2.stroke();
        c2.beginPath(); c2.moveTo(sx + d, sy + h); c2.lineTo(sx + d - h, sy); c2.stroke();
      }
      // barbed-wire coils on top
      c2.strokeStyle = '#6e2a1c'; c2.lineWidth = 1.5;
      for (var _bi = 0; _bi < Math.floor(w / 12); _bi++) {
        var bcx = sx + 6 + _bi * 12;
        c2.beginPath(); c2.arc(bcx, sy - 2, 4, 0, Math.PI); c2.stroke();
        // barbs
        c2.beginPath(); c2.moveTo(bcx, sy - 6); c2.lineTo(bcx, sy - 10); c2.stroke();
        c2.beginPath(); c2.moveTo(bcx - 2, sy - 4); c2.lineTo(bcx - 5, sy - 6); c2.stroke();
        c2.beginPath(); c2.moveTo(bcx + 2, sy - 4); c2.lineTo(bcx + 5, sy - 6); c2.stroke();
      }
    } else if (kind === 'debris') {
      // Pile of broken concrete blocks — bigger, contrasted, with thick exposed rebar
      // Concrete blocks (varied gray + tan, much bigger than before)
      var blocks = [
        { x: 4, y: h - 28, w: 28, h: 22, c: '#9a8a72' },
        { x: 22, y: h - 36, w: 24, h: 18, c: '#7a6a52' },
        { x: 40, y: h - 24, w: 26, h: 18, c: '#a89880' },
        { x: 8, y: h - 50, w: 22, h: 16, c: '#6e5a44' },
        { x: 32, y: h - 52, w: 26, h: 18, c: '#8a7a62' },
        { x: 56, y: h - 40, w: 22, h: 16, c: '#7a6a52' }
      ];
      for (var _bk = 0; _bk < blocks.length; _bk++) {
        var bb = blocks[_bk];
        if (bb.x + bb.w > w - 4 || bb.y + bb.h > h - 2) continue;
        c2.fillStyle = bb.c;
        c2.fillRect(sx + bb.x, sy + bb.y, bb.w, bb.h);
        c2.strokeStyle = '#1a1a18'; c2.lineWidth = 1.5;
        c2.strokeRect(sx + bb.x, sy + bb.y, bb.w, bb.h);
        // Cracks
        c2.strokeStyle = '#2a2a28'; c2.lineWidth = 1;
        c2.beginPath();
        c2.moveTo(sx + bb.x + bb.w * 0.3, sy + bb.y);
        c2.lineTo(sx + bb.x + bb.w * 0.5, sy + bb.y + bb.h * 0.6);
        c2.stroke();
      }
      // Exposed rebar — thick #2a2e2a steel rods, ≥3px width, 3 rods
      c2.strokeStyle = '#2a2e2a'; c2.lineWidth = 3.5; c2.lineCap = 'round';
      c2.beginPath();
      c2.moveTo(sx + 12, sy + h - 6);
      c2.quadraticCurveTo(sx + 18, sy + h * 0.3, sx + 26, sy + 4);
      c2.stroke();
      c2.beginPath();
      c2.moveTo(sx + 38, sy + h - 8);
      c2.lineTo(sx + 44, sy + 12);
      c2.stroke();
      c2.beginPath();
      c2.moveTo(sx + w - 18, sy + h - 4);
      c2.quadraticCurveTo(sx + w - 10, sy + h * 0.4, sx + w - 22, sy + 8);
      c2.stroke();
      // Rust streaks down rebar
      c2.strokeStyle = '#6e2a1c'; c2.lineWidth = 1.5;
      c2.beginPath(); c2.moveTo(sx + 26, sy + 4); c2.lineTo(sx + 22, sy + 18); c2.stroke();
      c2.beginPath(); c2.moveTo(sx + 44, sy + 12); c2.lineTo(sx + 42, sy + 28); c2.stroke();
      // Dust kick at base
      c2.fillStyle = 'rgba(138,112,80,0.6)';
      c2.fillRect(sx, sy + h - 6, w, 6);
    }
    c2.restore();
  }

  function _getLandmarkSprite(relPath) {
    if (!relPath) return null;
    var hit = MAP_ART.landmarkSprites[relPath];
    if (hit) return hit;
    // Use the <img> directly and skip offscreen rasterisation — SVGs with
    // <animate> / gradients sometimes clip when drawn through a canvas raster
    // in Chromium headless. drawImage(svgImg, ...) always renders the static
    // current frame at the requested size and is plenty fast for 1 sprite/frame.
    var entry = { img: new Image(), canvas: null, ready: false };
    entry.img.onload = function() { entry.ready = true; };
    entry.img.src = relPath;
    MAP_ART.landmarkSprites[relPath] = entry;
    return entry;
  }

  // === NETWORK (server-authoritative) ===
  var serverUrl = window.location.origin; // same origin as page
  var networkInputTimer = 0;

  // mapConfig: predefined maps with different shapes
  var mapConfig = [
    { name: '绿野平原', level: 1, shape: 'rect', boundary: [{x:0,y:0},{x:1600,y:0},{x:1600,y:1600},{x:0,y:1600}], color: '#1a2a1a', initialDensity: 7, spawnMinDist: 110, spawnMaxDist: 240, trickleInterval: 1.6, trickleMin: 0.5, waveBaseCount: 11, waveIntervalEarly: 12, waveIntervalMid: 10, waveIntervalLate: 8 },
    { name: '暗影森林', level: 1, shape: 'hex', boundary: [{x:800,y:0},{x:1600,y:400},{x:1600,y:1200},{x:800,y:1600},{x:0,y:1200},{x:0,y:400}], color: '#1a1a2a', initialDensity: 7, spawnMinDist: 110, spawnMaxDist: 240, trickleInterval: 1.6, trickleMin: 0.5, waveBaseCount: 11, waveIntervalEarly: 12, waveIntervalMid: 10, waveIntervalLate: 8 },
    { name: '熔岩峡谷', level: 1, shape: 'circle', boundary: [], color: '#2a1a1a', initialDensity: 7, spawnMinDist: 110, spawnMaxDist: 240, trickleInterval: 1.6, trickleMin: 0.5, waveBaseCount: 11, waveIntervalEarly: 12, waveIntervalMid: 10, waveIntervalLate: 8 },
    { name: '冰霜荒原', level: 2, shape: 'rect', boundary: [{x:0,y:0},{x:1600,y:0},{x:1600,y:1600},{x:0,y:1600}], color: '#1a2a3a', initialDensity: 7, spawnMinDist: 100, spawnMaxDist: 230, trickleInterval: 1.6, trickleMin: 0.5, waveBaseCount: 12, waveIntervalEarly: 11, waveIntervalMid: 9, waveIntervalLate: 7 },
    { name: '迷雾沼泽', level: 2, shape: 'diamond', boundary: [{x:800,y:0},{x:1600,y:800},{x:800,y:1600},{x:0,y:800}], color: '#2a2a1a', initialDensity: 7, spawnMinDist: 100, spawnMaxDist: 230, trickleInterval: 1.6, trickleMin: 0.5, waveBaseCount: 12, waveIntervalEarly: 11, waveIntervalMid: 9, waveIntervalLate: 7 },
    { name: '龙脊山脉', level: 2, shape: 'rect', boundary: [{x:0,y:0},{x:1600,y:0},{x:1600,y:1600},{x:0,y:1600}], color: '#2a1a2a', initialDensity: 7, spawnMinDist: 100, spawnMaxDist: 230, trickleInterval: 1.6, trickleMin: 0.5, waveBaseCount: 12, waveIntervalEarly: 11, waveIntervalMid: 9, waveIntervalLate: 7 },
    { name: '天空竞技场', level: 3, shape: 'octagon', boundary: [], color: '#1a1a3a', initialDensity: 8, spawnMinDist: 80, spawnMaxDist: 200, trickleInterval: 1.4, trickleMin: 0.4, waveBaseCount: 14, waveIntervalEarly: 10, waveIntervalMid: 8, waveIntervalLate: 6 },
    { name: '虚空深渊', level: 3, shape: 'rect', boundary: [{x:0,y:0},{x:1600,y:0},{x:1600,y:1600},{x:0,y:1600}], color: '#0a0a1a', initialDensity: 8, spawnMinDist: 80, spawnMaxDist: 200, trickleInterval: 1.4, trickleMin: 0.4, waveBaseCount: 14, waveIntervalEarly: 10, waveIntervalMid: 8, waveIntervalLate: 6 },
    { name: '永恒之地', level: 3, shape: 'circle', boundary: [], color: '#2a2a2a', initialDensity: 8, spawnMinDist: 80, spawnMaxDist: 200, trickleInterval: 1.4, trickleMin: 0.4, waveBaseCount: 14, waveIntervalEarly: 10, waveIntervalMid: 8, waveIntervalLate: 6 }
  ];
  var currentMap = mapConfig[0];
  var mapBoundary = currentMap.boundary;

  // === SKILL DATA === [DATA-DRIVEN] loaded from skills.json via RPGEngine
  // var SKILL_DATA = {
  //   attack_up:       { name: '攻击力↑', color: '#f44', desc: '+25%攻击', icon: '⚔' },
  //   attack_speed:    { name: '攻速↑',   color: '#fa0', desc: '-15%冷却', icon: '⚡' },
  //   pierce:          { name: '穿透',     color: '#ff0', desc: '弹幕穿透', icon: '→' },
  //   scatter:         { name: '散射',     color: '#0ff', desc: '+1弹幕',   icon: '✦' },
  //   move_speed:      { name: '移速↑',   color: '#0f0', desc: '+10%移速', icon: '🏃' },
  //   hp_regen:        { name: '回血',     color: '#0f8', desc: '+2HP/s',   icon: '♥' },
  //   shield:          { name: '护盾',     color: '#88f', desc: '挡一刀',   icon: '🛡' },
  //   chain_lightning: { name: '闪电链',   color: '#aaf', desc: '连锁电',   icon: '⚡' },
  //   fire_trail:      { name: '火焰轨迹', color: '#f80', desc: '走路放火', icon: '🔥' },
  //   frost_aura:      { name: '冰冻光环', color: '#8ef', desc: '减速敌人', icon: '❄' },
  //   crit:            { name: '暴击',     color: '#fd0', desc: '暴击+5%', icon: '💥' },
  //   lifesteal:       { name: '吸血',     color: '#d4f', desc: '击杀回血', icon: '🩸' },
  //   xp_magnet:       { name: '经验磁铁', color: '#af0', desc: '+50吸收', icon: '🧲' },
  //   explosive:       { name: '爆炸弹幕', color: '#f60', desc: 'AOE爆炸', icon: '💣' },
  //   max_hp:          { name: '最大HP↑', color: '#0a0', desc: '+20HP',   icon: '❤' },
  //   orbit:           { name: '环绕护卫', color: '#4af', desc: '旋转弹幕', icon: '🔄' },
  //   thorns_aura:     { name: '荆棘光环', color: '#8a4', desc: '反伤敌人', icon: '🌿' },
  //   time_warp:       { name: '时间扭曲', color: '#c8f', desc: '敌人变慢', icon: '⏳' }
  // };
  var SKILL_DATA = (function() {
    if (typeof RPGEngine !== 'undefined' && RPGEngine.getSkillsData) {
      var skillsArr = RPGEngine.getSkillsData();
      var data = {};
      if (skillsArr) {
        for (var i = 0; i < skillsArr.length; i++) {
          var s = skillsArr[i];
          data[s.id] = { name: s.name, color: s.color, desc: s.description, icon: s.icon };
        }
      }
      if (Object.keys(data).length > 0) return data;
    }
    return {
      attack_up: { name: '攻击力↑', color: '#f44', desc: '+25%攻击', icon: '⚔' },
      attack_speed: { name: '攻速↑', color: '#fa0', desc: '-15%冷却', icon: '⚡' },
      pierce: { name: '穿透', color: '#ff0', desc: '弹幕穿透', icon: '→' },
      scatter: { name: '散射', color: '#0ff', desc: '+1弹幕', icon: '✦' },
      move_speed: { name: '移速↑', color: '#0f0', desc: '+10%移速', icon: '🏃' },
      hp_regen: { name: '回血', color: '#0f8', desc: '+2HP/s', icon: '♥' },
      shield: { name: '护盾', color: '#88f', desc: '挡伤害(Lv3+挡2次)', icon: '🛡' },
      chain_lightning: { name: '闪电链', color: '#aaf', desc: '连锁电', icon: '⚡' },
      fire_trail: { name: '火焰轨迹', color: '#f80', desc: '走路放火', icon: '🔥' },
      frost_aura: { name: '冰冻光环', color: '#8ef', desc: '减速敌人', icon: '❄' },
      crit: { name: '暴击', color: '#fd0', desc: '暴击+5%', icon: '💥' },
      lifesteal: { name: '吸血', color: '#d4f', desc: '命中吸血', icon: '🩸' },
      xp_magnet: { name: '经验磁铁', color: '#af0', desc: '+50吸收', icon: '🧲' },
      explosive: { name: '爆炸弹幕', color: '#f60', desc: 'AOE爆炸', icon: '💣' },
      max_hp: { name: '最大HP↑', color: '#0a0', desc: '+20HP', icon: '❤' },
      orbit: { name: '环绕护卫', color: '#4af', desc: '旋转弹幕', icon: '🔄' },
      thorns_aura: { name: '荆棘光环', color: '#8a4', desc: '反伤敌人', icon: '🌿' },
      time_warp: { name: '时间扭曲', color: '#c8f', desc: '敌人变慢', icon: '⏳' }
    };
  })();
  var SKILL_IDS = Object.keys(SKILL_DATA);
  var _skillsFullData = null; // full skills data with per-level info, loaded async

  // Load full skills data from server (for per-level descs in level-up UI)
  (function() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/editor/skills', true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          var data = JSON.parse(xhr.responseText);
          var arr = data.skills || [];
          _skillsFullData = {};
          for (var i = 0; i < arr.length; i++) {
            var s = arr[i];
            _skillsFullData[s.id] = s;
            // Also update SKILL_DATA if it was from fallback
            if (!SKILL_DATA[s.id] || !SKILL_DATA[s.id]._loaded) {
              SKILL_DATA[s.id] = { name: s.name, color: s.color, desc: s.description, icon: s.icon, _loaded: true };
            }
          }
          SKILL_IDS = Object.keys(SKILL_DATA);
        }
      };
      xhr.send();
    } catch(e) {}
  })();

  // === GAME STATE ===
  var state = 'menu'; // menu | charSelect | mapSelect | buildSelect | connecting | playing | levelUp | gameOver | upgrade | paused | spectating
  var spectatorTarget = null; // player index to follow in spectator mode
  var spectatorDeathTime = 0;
  var isPaused = false;
  // screenFreezeFrame (US-345): hitStop effect on crits/boss hits
  var hitStop = { active: false, timer: 0 };
  // cameraZoomBoss (US-347): camera zoom on boss entrance
  var cameraZoomBoss = { active: false, timer: 0, duration: 2, zoomLevel: 1 };
  // countdownTimerMode (US-350): 90-second timed challenge
  var countdownTimerMode = false;
  var countdownTimer = 90;
  // fakeLeaderboard (US-346): simulated ranking on death screen
  var fakeLeaderboard = [
    { name: '小明Pro', score: 0 }, { name: '游戏达人', score: 0 },
    { name: '暴走萝莉', score: 0 }, { name: '不服来战', score: 0 }, { name: '佛系玩家', score: 0 }
  ];
  var localMultiplayer = false; // localMultiplayer (US-344)
  var player2 = null;
  var p2Input = { x: 0, y: 0 }; // player2 WASD input
  var p2Keys = { w: false, a: false, s: false, d: false };

  // Virtual joystick state (mobile-friendly, left-hand control)
  var joystick = {
    active: false, touchId: null,
    baseX: 0, baseY: 0, stickX: 0, stickY: 0,
    dx: 0, dy: 0, radius: 55, deadzone: 8
  };

  // roomSystem (US-001): game room for multiplayer
  var roomSystem = { rooms: [], currentRoom: null };
  var gameRoom = null;
  var gameMode = 'solo'; // solo | team
  function createRoom(mode) { gameRoom = { id: Date.now(), mode: mode, players: [{ name: '你', ready: true }], maxPlayers: 8 }; gameMode = mode; }
  function joinRoom(roomId) { gameRoom = roomSystem.rooms.find(function(r) { return r.id === roomId; }); }

  // mapSelect (US-002): map choice UI
  var mapSelect = { selectedIndex: 0, mapLevel: 1 };
  function drawMapSelect() {
    // Design space: 400x700 (called inside _applyUIScale)
    var DW = 400, DH = 700;
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('选择地图', DW/2, 40);
    var mapsForLevel = mapConfig.filter(function(m) { return m.level <= mapSelect.mapLevel; });
    for (var i = 0; i < mapsForLevel.length; i++) {
      var my = 70 + i * 55; var sel = i === mapSelect.selectedIndex;
      ctx.fillStyle = sel ? '#3a5a3a' : '#1a2a3a'; ctx.fillRect(DW/2-120, my, 240, 48);
      ctx.fillStyle = sel ? '#fff' : '#aaa'; ctx.font = (sel ? 'bold ' : '') + '16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText(mapsForLevel[i].name + ' (Lv.' + mapsForLevel[i].level + ')', DW/2, my + 30);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
      ctx.strokeRect(DW/2+90, my+8, 30, 30);
    }
    ctx.fillStyle = '#4a4'; ctx.fillRect(DW/2-60, DH-60, 120, 40);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillText('开始', DW/2, DH-35);
    ctx.fillStyle = '#333'; ctx.fillRect(DW/2-60, DH-110, 120, 36);
    ctx.fillStyle = '#888'; ctx.fillRect(DW/2-58, DH-108, 116, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillText('← 返回', DW/2, DH-88);
  }

  function drawBuildSelect() {
    // Design space: 400x700 (called inside _applyUIScale)
    var DW = 400, DH = 700;
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('选择技能 (选择5个)', DW / 2, 35);

    var cls = CLASS_DEFS[selectedClass] || CLASS_DEFS.warrior;
    var available = cls.availableSkills || [];

    // Show class info
    ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = cls.color;
    ctx.fillText(cls.icon + ' ' + cls.name + ' 可用技能', DW / 2, 60);

    // Draw skill grid (2 columns, 5 rows)
    var cols = 2;
    var cardW = 180, cardH = 52, gapX = 12, gapY = 8;
    var startX = DW / 2 - (cols * cardW + (cols - 1) * gapX) / 2;
    var startY = 80;

    for (var i = 0; i < available.length; i++) {
      var sid = available[i];
      var sd = SKILL_DATA[sid];
      if (!sd) continue;
      var col = i % cols;
      var row = Math.floor(i / cols);
      var cx = startX + col * (cardW + gapX);
      var cy = startY + row * (cardH + gapY);

      var isSelected = selectedBuild.indexOf(sid) >= 0;
      var selIdx = selectedBuild.indexOf(sid);

      // Card background
      ctx.fillStyle = isSelected ? '#1a2a1a' : '#111118';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = isSelected ? '#4f4' : '#333';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Selected number badge
      if (isSelected) {
        ctx.fillStyle = '#4f4';
        ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(selIdx + 1), cx + cardW - 14, cy + 18);
      }

      // Icon
      ctx.font = '20px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = sd.color;
      ctx.fillText(sd.icon, cx + 8, cy + 30);

      // Name
      ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(sd.name, cx + 34, cy + 22);

      // Desc
      ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#aaa';
      ctx.fillText(sd.desc, cx + 34, cy + 40);
    }

    // Selected build display
    var buildY = startY + Math.ceil(available.length / cols) * (cardH + gapY) + 15;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(DW / 2 - 200, buildY, 400, 50);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.strokeRect(DW / 2 - 200, buildY, 400, 50);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('已选: ' + selectedBuild.length + '/5', DW / 2, buildY + 18);

    // Show selected skill icons
    ctx.font = '18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left';
    for (var bi = 0; bi < 5; bi++) {
      var bx = DW / 2 - 90 + bi * 40;
      if (bi < selectedBuild.length) {
        var bsd = SKILL_DATA[selectedBuild[bi]];
        if (bsd) {
          ctx.fillStyle = bsd.color;
          ctx.fillText(bsd.icon, bx, buildY + 42);
        }
      } else {
        ctx.fillStyle = '#333';
        ctx.fillText('?', bx + 4, buildY + 42);
      }
    }

    // Confirm button (only when 5 selected)
    var btnY = buildY + 65;
    if (selectedBuild.length === 5) {
      ctx.fillStyle = '#2a6a2a'; ctx.fillRect(DW / 2 - 80, btnY, 160, 40);
      ctx.strokeStyle = '#4f4'; ctx.lineWidth = 2; ctx.strokeRect(DW / 2 - 80, btnY, 160, 40);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('开始游戏 ▶', DW / 2, btnY + 27);
    } else {
      ctx.fillStyle = '#222'; ctx.fillRect(DW / 2 - 80, btnY, 160, 40);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(DW / 2 - 80, btnY, 160, 40);
      ctx.fillStyle = '#666'; ctx.font = 'bold 18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('再选' + (5 - selectedBuild.length) + '个技能', DW / 2, btnY + 27);
    }

    // Back button
    ctx.fillStyle = '#333'; ctx.fillRect(DW / 2 - 50, DH - 50, 100, 36);
    ctx.fillStyle = '#888'; ctx.fillRect(DW / 2 - 48, DH - 48, 96, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('← 返回', DW / 2, DH - 28);
  }

  // multiPlayerRender (US-004): all players in the game
  var allPlayers = []; // filled when game starts
  var localPlayerId = 0;

  // factionSystem (US-003): faction data managed via allPlayers[].factionId

  // spawnZone (US-005): zone-based spawning — populated from mapZones on game start
  var spawnZones = [];

  // Build spawnZones from mapZones data
  function buildSpawnZonesFromMap() {
    spawnZones = [];
    if (mapZones.length === 0) {
      // Fallback: use default zones if no map data
      spawnZones = [
        { x: WORLD_W/2, y: WORLD_H/2, radius: 250, spawnRate: 2, types: ['boss','tank','miniBoss'], name: '危险区', zoneSpawnRate: 2 },
        { x: WORLD_W*0.2, y: WORLD_H*0.2, radius: 300, spawnRate: 0.5, types: ['normal','swarm'], name: '新手区', zoneSpawnRate: 0.5 },
        { x: WORLD_W*0.8, y: WORLD_H*0.2, radius: 300, spawnRate: 0.5, types: ['normal','fast'], name: '东部区', zoneSpawnRate: 0.5 },
        { x: WORLD_W*0.2, y: WORLD_H*0.8, radius: 300, spawnRate: 0.8, types: ['normal','ranged'], name: '西部区', zoneSpawnRate: 0.8 },
        { x: WORLD_W*0.8, y: WORLD_H*0.8, radius: 300, spawnRate: 1, types: ['fast','tank'], name: '南部区', zoneSpawnRate: 1 }
      ];
      return;
    }
    for (var i = 0; i < mapZones.length; i++) {
      var z = mapZones[i];
      if (z.type === 'boss_lair' && z.spawnRate === 0) continue; // Boss zones have special spawn logic
      var cx, cy, r;
      if (z.shape === 'circle' && z.center) {
        cx = z.center.x; cy = z.center.y; r = z.radius || 100;
      } else if (z.bounds) {
        cx = z.bounds.x + z.bounds.width / 2;
        cy = z.bounds.y + z.bounds.height / 2;
        r = Math.max(z.bounds.width, z.bounds.height) / 2;
      } else continue;
      spawnZones.push({
        x: cx, y: cy, radius: r,
        spawnRate: z.spawnRate || 1,
        types: z.allowedMonsters || ['normal'],
        name: z.name || z.id,
        zoneSpawnRate: z.spawnRate || 1,
        monsterLevelRange: z.monsterLevelRange || [1, 5],
        zoneType: z.type
      });
    }
  }

  // victoryCondition (US-007): check if all enemies eliminated
  var victoryState = { active: false, timer: 0 };
  var victoryWin = false; // true when player won (vs died)

  // stormZone: shrinking playable area to force PvP engagement
  var stormZone = { active: false, radius: WORLD_W, centerX: WORLD_W/2, centerY: WORLD_H/2, shrinkRate: 60 };

  // killFeed: PvP kill announcements shown on screen
  var killFeed = []; // { text, color, time }
  function addKillFeed(killerName, victimName, killerColor) {
    killFeed.push({ text: killerName + ' ⚔ ' + victimName, color: killerColor || '#ffd700', time: 4 });
    if (killFeed.length > 5) killFeed.shift();
  }

  // finalBoss (US-008): 魔山 - scales with game time
  var finalBossPhase = 0;

  // scoreSystem (US-009): calculate match score
  function calcScore() {
    var scoreBreakdown = {
      survivalTime: Math.floor(gameTime) * 2,
      kills: player.kills * 10,
      level: playerLevel * 5,
      moshanBonus: finalBossPhase >= 3 ? 100 : 0
    };
    var matchScore = scoreBreakdown.survivalTime + scoreBreakdown.kills + scoreBreakdown.level + scoreBreakdown.moshanBonus;
    return { total: matchScore, breakdown: scoreBreakdown };
  }

  // rankSystem (US-010): tier progression
  var rankTier = { points: 0, tier: '青铜', tierIndex: 0 };
  var rankTiers = [
    { name: '青铜', min: 0, icon: '🥉', mapLevel: 1 },
    { name: '白银', min: 1000, icon: '🥈', mapLevel: 2 },
    { name: '黄金', min: 2500, icon: '🥇', mapLevel: 3 },
    { name: '铂金', min: 5000, icon: '💎', mapLevel: 4 },
    { name: '钻石', min: 10000, icon: '👑', mapLevel: 5 },
    { name: '大师', min: 20000, icon: '🏆', mapLevel: 6 }
  ];
  var playerRank = rankTier;
  function updateRank(score) {
    rankTier.points += score;
    for (var i = rankTiers.length - 1; i >= 0; i--) {
      if (rankTier.points >= rankTiers[i].min) { rankTier.tier = rankTiers[i].name; rankTier.tierIndex = i; break; }
    }
    mapSelect.mapLevel = rankTiers[rankTier.tierIndex].mapLevel;
    try { localStorage.setItem('kos_rank', JSON.stringify(rankTier)); } catch(e) {}
  }
  // Load rank
  try { var _sr = localStorage.getItem('kos_rank'); if (_sr) rankTier = JSON.parse(_sr); } catch(e) {}

  // skinSystem (US-011): cosmetic skins — data-driven from skins.json
  var skinsData = {}; // loaded from server or data/skins.json
  var skinCollection = [
    { id: 'default', name: '默认', color: '#4f4', owned: true },
    { id: 'flame', name: '烈焰', color: '#f80', owned: false, fragments: 0 },
    { id: 'ice', name: '寒冰', color: '#4df', owned: false, fragments: 0 },
    { id: 'shadow', name: '暗影', color: '#a4f', owned: false, fragments: 0 },
    { id: 'golden', name: '黄金', color: '#ffd700', owned: false, fragments: 0 }
  ];
  var equippedSkin = 'default';
  function equipSkin(skinId) { var s = skinCollection.find(function(sk) { return sk.id === skinId && sk.owned; }); if (s) equippedSkin = skinId; }
  function addSkinFragment(skinId) {
    var s = skinCollection.find(function(sk) { return sk.id === skinId; });
    if (s) { s.fragments = (s.fragments || 0) + 1; if (s.fragments >= 10) { s.owned = true; s.fragments = 0; } }
  }
  // Load skins data from server
  function loadSkinsData() {
    var url = serverUrl + '/api/editor/skins';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function() {
      try { skinsData = JSON.parse(xhr.responseText); } catch(e) { skinsData = {}; }
      // Sync skinCollection with loaded data
      Object.keys(skinsData).forEach(function(sid) {
        if (sid === 'default') return;
        var sd = skinsData[sid];
        var existing = skinCollection.find(function(sk) { return sk.id === sid; });
        if (!existing) {
          skinCollection.push({ id: sid, name: sd.name, color: sd.colors.body || '#888', owned: false, fragments: 0, tier: sd.tier });
        }
      });
    };
    xhr.onerror = function() { skinsData = {}; };
    xhr.send();
  }
  loadSkinsData();
  function getSkinData(skinId) { return skinsData[skinId] || skinsData['default'] || null; }

  // Load part variants data from server
  var partVariantsData = {};
  function loadPartVariants() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', serverUrl + '/api/editor/part_variants');
    xhr.onload = function() { try { partVariantsData = JSON.parse(xhr.responseText); } catch(e) { partVariantsData = {}; } };
    xhr.onerror = function() {
      // Fallback: try direct file fetch
      var xhr2 = new XMLHttpRequest();
      xhr2.open('GET', 'data/part_variants.json');
      xhr2.onload = function() { try { partVariantsData = JSON.parse(xhr2.responseText); } catch(e) {} };
      xhr2.send();
    };
    xhr.send();
  }
  loadPartVariants();

  // dailyReward (US-012): daily login rewards
  var dailyLogin = { streak: 0, lastDate: '', rewards: [50, 100, 150, 200, 300, 500, 'skin'] };
  var signInReward = dailyLogin;
  function checkDailyLogin() {
    var today = new Date().toISOString().split('T')[0];
    if (dailyLogin.lastDate !== today) {
      var wasYesterday = false;
      try { var ld = new Date(dailyLogin.lastDate); var td = new Date(today); wasYesterday = (td - ld) <= 86400000 * 1.5; } catch(e) {}
      dailyLogin.streak = wasYesterday ? dailyLogin.streak + 1 : 1;
      if (dailyLogin.streak > 7) dailyLogin.streak = 1;
      dailyLogin.lastDate = today;
      try { localStorage.setItem('kos_daily', JSON.stringify(dailyLogin)); } catch(e) {}
      return dailyLogin.rewards[Math.min(dailyLogin.streak - 1, 6)];
    }
    return null;
  }
  try { var _dl = localStorage.getItem('kos_daily'); if (_dl) dailyLogin = JSON.parse(_dl); } catch(e) {}

  // springBackend (US-014): server connection config
  var serverUrl = (location.protocol === 'file:') ? 'http://localhost:8080' : '';
  var apiEndpoint = serverUrl + '/api';
  var localMode = !window._currentPlayer; // online if logged in via login screen
  function apiCall(path, data, cb) {
    if (localMode) { if (cb) cb({ success: true, data: {} }); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', apiEndpoint + path);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() { if (cb) cb(JSON.parse(xhr.responseText)); };
    xhr.onerror = function() { if (cb) cb({ success: false }); };
    xhr.send(JSON.stringify(data));
  }
  // Bridge: login system sets gold
  window._setPlayerGold = function(g) { gold = g; saveGold(); };

  window._survivorState = function() { return state; };
  window._survivorBuild = function() { return selectedBuild; };
  window._survivorClassDefs = function() { return CLASS_DEFS; };
  // Debug helper for testing
  window._debugKillBots = function() {
    for (var i = 1; i < allPlayers.length; i++) { allPlayers[i].alive = false; allPlayers[i].hp = 0; }
    return { playerFaction: player.factionId, victoryActive: victoryState.active, aliveCount: allPlayers.filter(function(p){return p.alive;}).length };
  };
  window._survivorQuery = function() {
    if (!player) return null;
    var nearEnemies = [];
    for (var i = 0; i < entities.length && nearEnemies.length < 20; i++) {
      var e = entities[i];
      if (e.type !== 'enemy' || e.dead) continue;
      var dx = e.x - player.x, dy = e.y - player.y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d < 400) nearEnemies.push({x: e.x, y: e.y, d: d});
    }
    // Include allPlayers info for multiplayer testing
    var playersInfo = [];
    for (var pi = 0; pi < allPlayers.length; pi++) {
      var ap = allPlayers[pi];
      playersInfo.push({id: ap.id, name: ap.name || '', hp: ap.hp, maxHp: ap.maxHp, x: ap.x, y: ap.y, factionId: ap.factionId, eliminated: !ap.alive, kills: ap.kills || 0, level: pi === 0 ? playerLevel : (ap.level || 1), facingAngle: ap.facingAngle || 0, isLocal: !!ap.isLocal, characterType: pi === 0 ? (player.playerClass || selectedClass) : (ap.characterType || 'warrior')});
    }
    return {state: state, px: player.x, py: player.y, hp: player.hp, maxHp: player.maxHp, enemies: nearEnemies, wave: wave, kills: kills, gameMode: gameMode, totalEnemies: entities.filter(function(e){return e.type==='enemy'&&!e.dead;}).length, players: playersInfo, victoryTriggered: victoryState ? victoryState.active : false, gameTime: gameTime || 0, spawnZoneCount: spawnZones ? spawnZones.length : 0, playerLevel: playerLevel, xp: playerXP, xpToNextLevel: xpToNextLevel, pendingSkillPoints: pendingSkillPoints, dps: dpsDisplay, maxDps: maxDps, totalDamage: totalDamage, gold: gold, lastEarnedGold: _lastEarnedGold, ownedSkills: ownedSkills, skillLevels: skillLevels};
  };
  var player, entities = [], particles = [], floats = [], gems = [], coins = [];
  var skillPickups = []; // Experiment D: skill drops from bot kills
  var _ultReadyBtn = null; // HUD hit-rect when class ultimate is ready
  // R6-control F1 — class active ability (right-bottom button, fixed 6s CD)
  var _ABILITY_CD = 6.0;
  var _abilityCdLeft = 0;
  var _abilityBtn = null; // hit-rect set during render
  var _abilityFx = { active: false, t: 0, dur: 0, kind: '' }; // fullscreen feedback
  var bossSlainBanner = { active: false, timer: 0, duration: 1.8, name: '' };
  var bossBuffChoice = { active: false, options: [], rects: [] };
  var worldEvent = { active: false, kind: '', phase: 'idle', phaseTimer: 0, target: null, banner: '', timeLeft: 0, nextAt: 30 };
  var eventPickups = []; // airdrops / vault chests
  var meteorMarkers = []; // meteor impact warnings
  var rivalState = { botId: -1, killedBy: 0, nemesisId: -1 };
  var synergyBanner = { active: false, timer: 0, duration: 1.5, text: '', color: '#fff' };
  var offlineSkillFx = []; // class-based projectile VFX for offline mode
  var wave, waveTimer, gameTime, kills, killStreak, maxStreak;
  var farmKills = 0; // mob kills — separate from player kills (Leo 2026-04-18)
  var playerLevel = 1, playerXP = 0, xpToNextLevel = 30, skillLevels = {}, ownedSkills = [];
  var pendingSkillPoints = 0; // MOBA-style non-blocking skill upgrade
  var _skillHintShown = false; // First-time skill upgrade tutorial hint
  var _skillHintTimer = 0; // Duration to show the hint
  // === ATTRIBUTE SYSTEM (US-009) ===
  var playerAttributes = { INT: 0, STR: 0, AGI: 0, STA: 0 };
  var attributePoints = 0; // unspent points in charSelect
  var tempAttributePoints = 0; // temporary points gained on levelUp
  var tempAttributes = { INT: 0, STR: 0, AGI: 0, STA: 0 };
  var pointsRemaining = 0;
  function allocateTempPoint(attr) {
    if (!player) return;
    if (attr === 'STR') { player.maxHp += 3; player.hp = Math.min(player.hp + 3, player.maxHp); player.attackDamage *= 1.01; }
    if (attr === 'AGI') { player.speed *= 1.005; }
    if (attr === 'INT') { /* skill power bonus applied via engine */ }
    if (attr === 'STA') { player.hpRegen += 0.1; }
  }
  var shakeX = 0, shakeY = 0, shakeDur = 0;
  var _lastEarnedGold = 0;
  var _goldAtGameStart = 0;
  var skillChoices = [];
  var mouseX = W / 2, mouseY = H / 2;
  var fireTrails = [];
  var explosionAoe = [];
  window._chainArcs = [];
  var screenFlash = { color: '', alpha: 0 };
  // BR combat feedback: red radial vignette flashes from screen edges when
  // the player takes damage. decay timer tween to 0 over ~0.45s.
  var playerHurtVignette = { timer: 0, duration: 0.45 };
  function triggerPlayerHurt() { playerHurtVignette.timer = playerHurtVignette.duration; }
  var killDisplayPulse = 0;
  // Tutorial system
  var tutorialDone = false;
  var tutorialTimer = 0;
  var tutorialRealTime = 0; // real-time progression (uses dt, not logicDt) so tutorial animates while game is paused
  // R5m F3 — new 3-slide tutorial. Current slide index + per-slide timer.
  var _tutSlide = 0;
  var _tutSlideTimer = 3.0;
  var _tutSlides = [
    { src: 'assets/hud/tutorial/tutorial_1_joystick.svg',  img: new Image(), ready: false },
    { src: 'assets/hud/tutorial/tutorial_2_autoattack.svg', img: new Image(), ready: false },
    { src: 'assets/hud/tutorial/tutorial_3_altar.svg',      img: new Image(), ready: false }
  ];
  _tutSlides.forEach(function(s) { s.img.onload = function() { s.ready = true; }; s.img.src = s.src; });
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('tutorial_seen') === '1') {
      tutorialDone = true;
    }
  } catch (e) {}
  var _tutorialSkipRect = null; // {x,y,w,h} for skip button hit detection
  var _hudBtnRects = { dodge: null, ult: null }; // bottom-bar button rects for click detection
  var TUTORIAL_STEPS = [
    { text: '移动鼠标/手指 控制角色移动', icon: '🖱', time: 0 },
    { text: '自动攻击最近的敌人，击杀获得经验', icon: '⚔', time: 0 },
    { text: '升级时选择技能，两个技能达到3级可进化', icon: '⬆', time: 0 },
    { text: '90秒新手保护期，先刷怪升级!', icon: '🛡', time: 0 },
    { text: '120秒后或存活人数不足时毒圈缩小，留在圈内存活!', icon: '🌀', time: 0 },
    { text: '最后存活的玩家/队伍获胜!', icon: '👑', time: 0 }
  ];

  // Phase 13: instantAction — track first kill time for immediate combat (US-300)
  var instantAction = { firstKillDone: false, firstKillTimer: 0 };
  // Phase 13: afterimageDash — player ghost trail when moving fast (US-301)
  var afterimageDash = [];
  var afterimageTimer = 0;
  // Phase 13: nearMissBonus — reward near dodges (US-302)
  var nearMissBonus = { timer: 0, count: 0 };
  // Phase 13: skillCardAnim — slide-in animation for level-up cards (US-303)
  var skillCardAnim = { timer: 0, duration: 0.4, active: false };
  // Phase 13: deathRewind — slow-mo rewind on death (US-304)
  var deathRewind = { active: false, timer: 0, duration: 1.5, positions: [] };
  // Phase 13: comboTextVariety — different visual styles per combo milestone (US-305)
  var COMBO_STYLES = {
    5: { color: '#f0f', scale: 1.0, label: 'COMBO' },
    10: { color: '#ff0', scale: 1.3, label: 'GREAT COMBO', rainbow: false },
    25: { color: '#f80', scale: 1.6, label: 'MEGA COMBO', rainbow: true },
    50: { color: '#f00', scale: 2.0, label: 'ULTRA COMBO', rainbow: true, shake: true },
    100: { color: '#ffd700', scale: 2.5, label: 'LEGENDARY', rainbow: true, shake: true, particles: true }
  };
  // Phase 14: screenshotMode — hide UI for clean screenshots (US-306)
  var screenshotMode = false;
  // Phase 14: dynamicMusicCue — visual rhythm beat sync (US-307)
  var dynamicMusicCue = { bpm: 120, beatTimer: 0, intensity: 0 };
  // Phase 14: gradeAnimation — reveal grade step by step (US-308)
  var gradeAnimation = { active: false, timer: 0, duration: 2.0, currentGrade: 0, finalGrade: 0 };
  var GRADE_ORDER = ['D', 'C', 'B', 'A', 'S'];

  // Phase 15: playerPowerGlow — level-based aura intensity (US-309)
  // (rendering only, no state needed)
  // Phase 15: lootBeam — light pillar above treasures (US-310)
  // (rendering only)
  // Phase 15: dmgNumberShower — multi-float for AOE (US-311)
  var dmgNumberShower = { active: false };
  // Phase 15: powerSurgeEffect — flash on skill pick (US-312)
  var powerSurgeEffect = { active: false, timer: 0, duration: 0.5 };
  // Phase 15: autoHighlight — detect spectacular moments (US-313)
  var HIGHLIGHT_EVENTS = [];
  var autoHighlight = { events: [], maxEvents: 10 };
  // Phase 15: auroraBackground — flowing aurora bands (US-314)
  var auroraWaves = [
    { phase: 0, speed: 0.3, hue: 200, amplitude: 30, y: 0.3 },
    { phase: 2, speed: 0.2, hue: 280, amplitude: 25, y: 0.5 },
    { phase: 4, speed: 0.15, hue: 160, amplitude: 35, y: 0.7 }
  ];
  // Phase 16: shareReplayData — record highlight frames (US-315)
  var replayBuffer = [];
  // Phase 16: colorThemeSync — biome-synced projectile colors (US-316)
  var colorThemeSync = { projColor: '#4af', particleColor: '#88f' };
  // Phase 19: xpCollectBurst — light flow when collecting many gems at once (US-326)
  var xpCollectBurst = { active: false, timer: 0, lines: [] };
  // Phase 21: killFlashRing — expanding white ripple on enemy death (US-329)
  var killFlashRings = [];
  // Phase 26: killMilestoneBanner — full-screen slide-in banner (US-338)
  var killMilestoneBanner = { active: false, timer: 0, duration: 1.5, text: '', color: '#ffd700' };

  // Environmental hazards
  var safeZoneRadius = 500; // shrinks over time after 60s
  var groundHazards = []; // { x, y, radius, damage, life, maxLife }
  var ELITE_AFFIXES = ['burning', 'frozen', 'teleport', 'splitting', 'shielded'];

  // Sound system (US-208) — Web Audio API procedural sfx
  var soundEnabled = true;
  var musicEnabled = true;
  var audioCtx = null;
  var sfxMasterGain = null;
  var musicMasterGain = null;
  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sfxMasterGain = audioCtx.createGain();
      sfxMasterGain.gain.value = 0.5;
      sfxMasterGain.connect(audioCtx.destination);
      musicMasterGain = audioCtx.createGain();
      musicMasterGain.gain.value = 0.18;
      musicMasterGain.connect(audioCtx.destination);
      _preloadSfx();
    } catch(e) {}
  }
  // _playTone — single oscillator tone with ADSR-style envelope
  function _playTone(freq, dur, type, vol, attack, destGain) {
    if (!audioCtx) return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(destGain || sfxMasterGain || audioCtx.destination);
      var now = audioCtx.currentTime;
      var a = attack || 0.005;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + a);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.start(now);
      osc.stop(now + dur + 0.02);
      return osc;
    } catch(e) {}
  }
  // _playNoise — short filtered noise burst (for hits/explosions)
  function _playNoise(dur, vol, lowpass) {
    if (!audioCtx) return;
    try {
      var bufSize = Math.floor(audioCtx.sampleRate * dur);
      var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      var src = audioCtx.createBufferSource();
      src.buffer = buf;
      var gain = audioCtx.createGain();
      gain.gain.value = vol;
      var filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      src.connect(filter); filter.connect(gain); gain.connect(sfxMasterGain || audioCtx.destination);
      src.start();
    } catch(e) {}
  }
  // Phase 2 WAV SFX — preload CC0 samples into AudioBuffers and play via
  // BufferSource (low latency, overlapping-safe). Falls through to synth if
  // the buffer isn't ready yet or the name is synth-only.
  var _sfxBuffers = {};
  var _sfxFiles = {
    shoot: 'shoot.wav',
    hit: 'hit_flesh.wav',
    hit_metal: 'hit_metal.wav',
    step_grass: 'step_grass.wav',
    step_dirt: 'step_dirt.wav',
    explosion: 'explosion.wav',
    storm_alert: 'storm_alert.wav',
    kill: 'kill_confirmed.wav',
    victory: 'victory.wav',
    // R5m F2 — ArtDesigner R5m SFX pack (commit 1976482)
    altar_boom: 'altar_break.wav',
    crown_don:  'crown_hymn.wav',
    pvp_kill:   'kill_headshot.wav',
    boss_slain: 'boss_slain.wav'
  };
  function _preloadSfx() {
    if (!audioCtx) return;
    Object.keys(_sfxFiles).forEach(function(name) {
      var url = 'assets/audio/' + _sfxFiles[name];
      fetch(url).then(function(r) { return r.arrayBuffer(); })
        .then(function(ab) { return audioCtx.decodeAudioData(ab); })
        .then(function(buf) { _sfxBuffers[name] = buf; })
        .catch(function() {});
    });
  }
  function _playBuffer(name, volume) {
    var buf = _sfxBuffers[name];
    if (!buf || !audioCtx) return false;
    try {
      var src = audioCtx.createBufferSource();
      src.buffer = buf;
      var g = audioCtx.createGain();
      g.gain.value = (volume == null ? 1 : volume);
      src.connect(g); g.connect(sfxMasterGain || audioCtx.destination);
      src.start(0);
      return true;
    } catch (e) { return false; }
  }

  function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    // Prefer WAV if available, otherwise synth.
    if (_sfxBuffers[type] && _playBuffer(type)) return;
    try {
      var now = audioCtx.currentTime;
      switch (type) {
        case 'shoot':
          _playTone(820, 0.06, 'square', 0.08);
          _playTone(600, 0.05, 'square', 0.04);
          break;
        case 'hit':
          _playNoise(0.08, 0.25, 1800);
          _playTone(180, 0.12, 'sawtooth', 0.1);
          break;
        case 'attack':
          _playTone(500, 0.07, 'triangle', 0.1);
          _playNoise(0.05, 0.12, 2400);
          break;
        case 'kill':
          _playTone(440, 0.08, 'sine', 0.15);
          _playTone(660, 0.12, 'sine', 0.1);
          _playNoise(0.15, 0.15, 800);
          break;
        case 'levelup':
          _playTone(523, 0.1, 'sine', 0.18);   // C5
          _playTone(659, 0.1, 'sine', 0.16);   // E5
          setTimeout(function() { _playTone(784, 0.18, 'sine', 0.2); }, 80); // G5
          setTimeout(function() { _playTone(1047, 0.3, 'sine', 0.16); }, 180); // C6
          break;
        case 'pickup_gem':
          _playTone(880, 0.08, 'sine', 0.14);
          setTimeout(function() { _playTone(1320, 0.1, 'sine', 0.12); }, 40);
          break;
        case 'pickup_gold':
          _playTone(1200, 0.05, 'square', 0.1);
          setTimeout(function() { _playTone(1600, 0.06, 'square', 0.08); }, 30);
          break;
        case 'boss_warn':
          // Low rumble with tremolo-like re-triggers
          _playTone(70, 0.6, 'sawtooth', 0.25);
          _playTone(110, 0.6, 'triangle', 0.15);
          setTimeout(function() { _playTone(70, 0.4, 'sawtooth', 0.22); _playNoise(0.5, 0.15, 400); }, 200);
          break;
        case 'wave_start':
          // Ascending horn two-tone fanfare
          _playTone(392, 0.2, 'triangle', 0.18); // G4
          _playTone(196, 0.25, 'sawtooth', 0.08);
          setTimeout(function() { _playTone(523, 0.35, 'triangle', 0.2); _playTone(261, 0.35, 'sawtooth', 0.08); }, 180); // C5
          break;
        case 'death':
          _playTone(180, 0.3, 'sawtooth', 0.2);
          setTimeout(function() { _playTone(80, 0.5, 'sawtooth', 0.18); }, 120);
          break;
        case 'combo':
          // Quick rising arpeggio
          _playTone(523, 0.08, 'triangle', 0.12);
          setTimeout(function() { _playTone(659, 0.08, 'triangle', 0.12); }, 40);
          setTimeout(function() { _playTone(784, 0.1, 'triangle', 0.14); }, 80);
          break;
        // R5m F2 — 4 key event SFX (synth fallback; replaced by WAV when
        // ArtDesigner drops assets/sfx/*.wav and they populate _sfxBuffers).
        case 'altar_boom':
          // Metallic crack + boom — altar shattered
          _playNoise(0.25, 0.35, 900);
          _playTone(80, 0.45, 'sawtooth', 0.28);
          setTimeout(function() { _playTone(55, 0.55, 'sawtooth', 0.22); _playNoise(0.3, 0.2, 600); }, 40);
          break;
        case 'crown_don':
          // Short sacred choir — ascending 3-note chord
          _playTone(392, 0.18, 'sine', 0.16); // G4
          _playTone(494, 0.18, 'sine', 0.14); // B4
          _playTone(587, 0.22, 'sine', 0.14); // D5
          setTimeout(function() { _playTone(784, 0.3, 'sine', 0.18); }, 140); // G5
          break;
        case 'pvp_kill':
          // Sharp clean kill — head-shot crispness
          _playTone(1400, 0.06, 'square', 0.16);
          _playNoise(0.06, 0.12, 3000);
          setTimeout(function() { _playTone(2200, 0.08, 'sine', 0.1); }, 30);
          break;
        case 'boss_slain':
          // Grand horn fanfare
          _playTone(262, 0.22, 'sawtooth', 0.22); // C4
          _playTone(131, 0.3, 'sawtooth', 0.14);  // C3
          setTimeout(function() { _playTone(330, 0.22, 'sawtooth', 0.22); _playTone(165, 0.3, 'sawtooth', 0.14); }, 180); // E4 / E3
          setTimeout(function() { _playTone(392, 0.35, 'sawtooth', 0.25); _playTone(196, 0.4, 'sawtooth', 0.16); _playNoise(0.4, 0.1, 500); }, 360); // G4 / G3
          break;
        default:
          _playTone(440, 0.1, 'sine', 0.1);
      }
    } catch(e) {}
  }
  function toggleSound() { soundEnabled = !soundEnabled; }

  // === Procedural BGM (US-xxx — final polish) ===
  // Schedules a short pentatonic loop using Web Audio oscillators. No files.
  var bgmState = { started: false, nextNoteAt: 0, step: 0, _raf: null };
  var BGM_BPM = 92;
  var BGM_SECONDS_PER_BEAT = 60 / BGM_BPM;
  // Pentatonic A minor scale pattern — calm exploration vibe
  var BGM_MELODY = [
    220.00, 0,      329.63, 0,      261.63, 0,      392.00, 0,      // A3 – E4 – C4 – G4
    220.00, 0,      293.66, 0,      329.63, 0,      440.00, 0,      // A3 – D4 – E4 – A4
    261.63, 0,      329.63, 0,      392.00, 0,      329.63, 0,      // C4 – E4 – G4 – E4
    220.00, 196.00, 174.61, 196.00, 220.00, 0,      261.63, 0       // A3 – G3 – F3 – G3 – A3 – C4
  ];
  var BGM_BASS = [ // played every 4th step
    110.00, 110.00, 146.83, 146.83, 164.81, 164.81, 110.00, 110.00
  ];
  function _scheduleBgm() {
    if (!audioCtx || !musicEnabled || !bgmState.started) return;
    var now = audioCtx.currentTime;
    // Schedule up to 1 second ahead
    while (bgmState.nextNoteAt < now + 1) {
      var noteDur = BGM_SECONDS_PER_BEAT * 0.5; // eighth-note
      var freq = BGM_MELODY[bgmState.step % BGM_MELODY.length];
      if (freq > 0) {
        // Melody voice
        try {
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(musicMasterGain);
          gain.gain.setValueAtTime(0, bgmState.nextNoteAt);
          gain.gain.linearRampToValueAtTime(0.22, bgmState.nextNoteAt + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, bgmState.nextNoteAt + noteDur * 0.9);
          osc.start(bgmState.nextNoteAt);
          osc.stop(bgmState.nextNoteAt + noteDur + 0.05);
        } catch(e) {}
      }
      // Bass voice — plays on every other step (quarter-note cadence)
      if (bgmState.step % 2 === 0) {
        var bassFreq = BGM_BASS[Math.floor(bgmState.step / 4) % BGM_BASS.length];
        try {
          var bOsc = audioCtx.createOscillator();
          var bGain = audioCtx.createGain();
          bOsc.type = 'sawtooth';
          bOsc.frequency.value = bassFreq;
          var bFilt = audioCtx.createBiquadFilter();
          bFilt.type = 'lowpass'; bFilt.frequency.value = 500;
          bOsc.connect(bFilt); bFilt.connect(bGain);
          bGain.connect(musicMasterGain);
          bGain.gain.setValueAtTime(0, bgmState.nextNoteAt);
          bGain.gain.linearRampToValueAtTime(0.15, bgmState.nextNoteAt + 0.015);
          bGain.gain.exponentialRampToValueAtTime(0.0001, bgmState.nextNoteAt + noteDur * 1.8);
          bOsc.start(bgmState.nextNoteAt);
          bOsc.stop(bgmState.nextNoteAt + noteDur * 2);
        } catch(e) {}
      }
      bgmState.nextNoteAt += noteDur;
      bgmState.step++;
    }
  }
  function startBgm() {
    if (!audioCtx || bgmState.started) return;
    bgmState.started = true;
    bgmState.nextNoteAt = audioCtx.currentTime + 0.1;
    bgmState.step = 0;
    function loop() {
      if (!bgmState.started) return;
      _scheduleBgm();
      bgmState._raf = setTimeout(loop, 250);
    }
    loop();
  }
  function stopBgm() {
    bgmState.started = false;
    if (bgmState._raf) { clearTimeout(bgmState._raf); bgmState._raf = null; }
  }
  function toggleMusic() {
    musicEnabled = !musicEnabled;
    if (musicEnabled && audioCtx) startBgm();
    else stopBgm();
  }

  // World / camera system (US-185) — camX/camY mirror cameraX/cameraY (legacy alias used by bg particles/debris)
  var camX = 0, camY = 0;
  var gridSpacing = 40;

  // Screen juice (US-181)
  var levelUpFlash = { active: false, timer: 0 };

  // DPS tracking (US-193)
  var _dmgWindow = []; // {time, dmg} entries
  var dpsTimer = 0;
  var dpsDisplay = 0;
  var totalDamage = 0;
  var maxDps = 0; // peak DPS achieved

  // Kill streak multiplier (US-195)
  var killMultiplier = 1.0;

  // Multi-kill combo (final polish) — kills within 1.5s window stack into Double/Triple/...
  var comboState = { count: 0, timer: 0, window: 1.5, lastShownCount: 0, popupTimer: 0, popupText: '', popupColor: '#fff' };
  var COMBO_NAMES = {
    2: { text: 'DOUBLE KILL', color: '#ffcc44' },
    3: { text: 'TRIPLE KILL', color: '#ff8844' },
    4: { text: 'QUADRA KILL', color: '#ff4488' },
    5: { text: 'PENTA KILL',  color: '#ff44ff' },
    6: { text: 'HEXA SLAUGHTER', color: '#cc44ff' },
    7: { text: 'LEGENDARY', color: '#44ccff' },
    8: { text: 'GODLIKE', color: '#44ffaa' }
  };
  function registerCombo() {
    comboState.count += 1;
    comboState.timer = comboState.window;
    if (comboState.count >= 2) {
      var name = COMBO_NAMES[comboState.count] || COMBO_NAMES[Math.min(8, comboState.count)];
      if (comboState.count > 8) name = { text: 'UNSTOPPABLE x' + comboState.count, color: '#ff2200' };
      comboState.popupText = name.text;
      comboState.popupColor = name.color;
      comboState.popupTimer = 0.93; // 1.4 × 2/3
      comboState.lastShownCount = comboState.count;
      if (typeof playSound === 'function') playSound('combo');
      // Round 3 K: combo tier buffs — stacking transient rewards
      if (!player) return;
      if (comboState.count === 2) {
        player._comboSpdUntil = gameTime + 5;
        floatText(player.x, player.y - 40, '+20% 移速 5s', { color: '#88ff66', size: 13 });
      } else if (comboState.count === 3) {
        player._comboAtkUntil = gameTime + 5;
        floatText(player.x, player.y - 40, '+50% 攻击 5s', { color: '#ff8844', size: 14 });
      } else if (comboState.count === 4) {
        // RAMPAGE — free ultimate charge
        player._ultimateUnlocked = true;
        player._ultimateReady = true;
        var u = CLASS_ULTIMATES[selectedClass] || CLASS_ULTIMATES.warrior;
        player._ultimateName = u.name; player._ultimateIcon = u.icon; player._ultimateColor = u.color;
        floatText(player.x, player.y - 40, '🔓 ULT 免费充能!', { color: '#ffd700', size: 15 });
      } else if (comboState.count >= 5) {
        player._comboInvUntil = gameTime + 3;
        floatText(player.x, player.y - 40, '⚡ 无敌 3s!', { color: '#44ffaa', size: 16 });
        screenFlash.color = '#44ffaa'; screenFlash.alpha = 0.4;
      }
    }
  }
  // Round 3 K: shatter debris burst on kill
  var killShatters = [];
  function triggerKillShatter(x, y) {
    killShatters.push({ x: x, y: y, life: 0.28, maxLife: 0.28, rot: (Math.random() - 0.5) * 0.8 });
  }
  function updateKillShatters(dt) {
    for (var i = killShatters.length - 1; i >= 0; i--) {
      killShatters[i].life -= dt;
      if (killShatters[i].life <= 0) killShatters.splice(i, 1);
    }
  }
  function drawKillShatters() {
    if (!R3_ART.killShatter.ready) return;
    for (var i = 0; i < killShatters.length; i++) {
      var s = killShatters[i];
      var t = 1 - s.life / s.maxLife; // 0→1
      var scale = 0.6 + t * 1.0;
      var alpha = 1 - t;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot * (1 + t));
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.drawImage(R3_ART.killShatter.img, -32, -32, 64, 64);
      ctx.restore();
    }
  }
  function updateComboState(dt) {
    if (comboState.timer > 0) {
      comboState.timer -= dt;
      if (comboState.timer <= 0) { comboState.count = 0; comboState.lastShownCount = 0; }
    }
    if (comboState.popupTimer > 0) comboState.popupTimer -= dt;
  }

  // Experiment D: drop victim's "loot" — a random skill the player doesn't have at max.
  function dropSkillPickup(x, y, tint) {
    var pool = [];
    for (var i = 0; i < SKILL_IDS.length; i++) {
      var sid = SKILL_IDS[i];
      var lv = skillLevels[sid] || 0;
      if (lv < 5) pool.push(sid);
    }
    if (!pool.length) return;
    var picked = pool[Math.floor(Math.random() * pool.length)];
    skillPickups.push({
      x: x, y: y, skillId: picked, life: 8.0, maxLife: 8.0,
      bob: 0, color: (SKILL_DATA[picked] && SKILL_DATA[picked].color) || tint || '#ffd700'
    });
  }

  function updateSkillPickups(dt) {
    if (!player) return;
    for (var i = skillPickups.length - 1; i >= 0; i--) {
      var sp = skillPickups[i];
      sp.life -= dt;
      sp.bob = (sp.bob || 0) + dt;
      if (sp.life <= 0) { skillPickups.splice(i, 1); continue; }
      var dx = player.x - sp.x, dy = player.y - sp.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < (player.radius || 12) + 24) {
        applySkill(sp.skillId);
        var sd = SKILL_DATA[sp.skillId] || { name: sp.skillId, icon: '★' };
        floatText(player.x, player.y - 48, (sd.icon || '★') + ' +1 ' + (sd.name || sp.skillId), { color: '#ffd700', size: 14 });
        emit(sp.x, sp.y, '#ffd700', 18, 140);
        if (typeof playSound === 'function') playSound('pickup_gold');
        skillPickups.splice(i, 1);
      }
    }
  }

  function drawSkillPickups() {
    if (!skillPickups.length) return;
    var t = (typeof gameTime === 'number') ? gameTime : (Date.now() * 0.001);
    for (var i = 0; i < skillPickups.length; i++) {
      var sp = skillPickups[i];
      var fade = Math.min(1, sp.life / 1.2);
      var cx = sp.x, cy = sp.y;
      var bob = Math.sin((sp.bob || 0) * 3) * 4;
      // Gold pillar of light
      ctx.save();
      ctx.globalAlpha = 0.55 * fade;
      var grad = ctx.createLinearGradient(cx, cy - 140, cx, cy + 8);
      grad.addColorStop(0, 'rgba(255,215,0,0)');
      grad.addColorStop(0.4, 'rgba(255,230,120,0.45)');
      grad.addColorStop(1, 'rgba(255,215,0,0.85)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 6);
      ctx.lineTo(cx + 18, cy + 6);
      ctx.lineTo(cx + 8, cy - 140);
      ctx.lineTo(cx - 8, cy - 140);
      ctx.closePath();
      ctx.fill();
      // Sparkles
      var sp2 = (t * 2) % 1;
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = '#fffae0';
      for (var k = 0; k < 3; k++) {
        var sy = cy + 6 - ((sp2 + k * 0.33) % 1) * 140;
        var sx = cx + Math.sin(sy * 0.05 + k) * 10;
        ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      // Icon disc with skill color ring
      ctx.globalAlpha = fade;
      var discR = 18;
      ctx.fillStyle = 'rgba(20,20,40,0.85)';
      ctx.beginPath(); ctx.arc(cx, cy - 26 + bob, discR, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = sp.color || '#ffd700';
      ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = '#ffd700'; ctx.globalAlpha = 0.8 * fade;
      ctx.beginPath(); ctx.arc(cx, cy - 26 + bob, discR + 3, 0, Math.PI * 2); ctx.stroke();
      // Icon glyph
      var sd = SKILL_DATA[sp.skillId] || { icon: '★' };
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px "Noto Sans SC", "Apple Color Emoji", "Segoe UI Emoji", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sd.icon || '★', cx, cy - 26 + bob);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  }

  // Experiment D: boss slain perma buff — 3 options presented mid-slowmo.
  var BOSS_PERMA_BUFFS = [
    { id: 'hp', name: '+40 最大生命', color: '#ff5050', icon: '❤', apply: function() { player.maxHp += 40; player.hp = Math.min(player.maxHp, player.hp + 40); } },
    { id: 'dmg', name: '+15% 攻击力', color: '#ffaa20', icon: '⚔', apply: function() { player.attackDamage = Math.round(player.attackDamage * 1.15); } },
    { id: 'spd', name: '+10% 移速', color: '#55ff88', icon: '🏃', apply: function() { player.speed *= 1.10; } },
    { id: 'cd', name: '-10% 冷却', color: '#88ccff', icon: '⚡', apply: function() { player.attackCooldown *= 0.90; } },
    { id: 'crit', name: '+8% 暴击', color: '#ffee40', icon: '💥', apply: function() { player.critChance = Math.min(0.8, (player.critChance || 0) + 0.08); } },
    { id: 'regen', name: '+2 HP/s 回血', color: '#40ff80', icon: '♥', apply: function() { player.hpRegen = (player.hpRegen || 0) + 2; } }
  ];
  function openBossBuffChoice() {
    var pool = BOSS_PERMA_BUFFS.slice();
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    bossBuffChoice.options = pool.slice(0, 3);
    bossBuffChoice.rects = [];
    bossBuffChoice.active = true;
  }
  function applyBossBuff(idx) {
    if (!bossBuffChoice.active) return;
    var opt = bossBuffChoice.options[idx];
    if (!opt) return;
    opt.apply();
    floatText(player.x, player.y - 60, '🏆 ' + opt.name, { color: opt.color, size: 16 });
    bossBuffChoice.active = false;
    bossBuffChoice.options = [];
    bossBuffChoice.rects = [];
  }

  // Experiment E: dynamic world events — airdrop / meteor / doubleXP / vault
  var WORLD_EVENT_KINDS = ['airdrop', 'meteor', 'doubleXP', 'vault'];
  function triggerWorldEvent(kind) {
    worldEvent.kind = kind;
    worldEvent.phase = 'warning';
    worldEvent.phaseTimer = 10; // 10s warning
    worldEvent.active = true;
    if (kind === 'airdrop') worldEvent.banner = '⚠ 空投来袭! 抢占金色补给箱!';
    else if (kind === 'meteor') worldEvent.banner = '⚠ 流星雨预警! 避开红圈!';
    else if (kind === 'doubleXP') worldEvent.banner = '⚠ 30 秒后双倍经验!';
    else if (kind === 'vault') worldEvent.banner = '⚠ 宝库开启! 前往最近据点 channel 5 秒!';
    // Choose target location
    if (kind === 'airdrop' || kind === 'vault') {
      var cx = stormZone.centerX || WORLD_W / 2;
      var cy = stormZone.centerY || WORLD_H / 2;
      var r = (stormZone.radius || 400) * 0.55;
      var ang = Math.random() * Math.PI * 2;
      worldEvent.target = { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
    } else {
      worldEvent.target = null;
    }
    if (typeof playSound === 'function') playSound('warning');
  }
  function updateWorldEvent(dt) {
    if (!player) return;
    worldEvent.phaseTimer -= dt;
    if (!worldEvent.active) {
      worldEvent.nextAt -= dt;
      if (worldEvent.nextAt <= 0) {
        var kind = WORLD_EVENT_KINDS[Math.floor(Math.random() * WORLD_EVENT_KINDS.length)];
        triggerWorldEvent(kind);
        worldEvent.nextAt = 60 + Math.random() * 30;
      }
      return;
    }
    if (worldEvent.phase === 'warning' && worldEvent.phaseTimer <= 0) {
      // Transition into active phase
      if (worldEvent.kind === 'airdrop' && worldEvent.target) {
        eventPickups.push({ kind: 'airdrop', x: worldEvent.target.x, y: worldEvent.target.y, life: 30, dropT: 0 });
        worldEvent.banner = '⬇ 空投已着陆!';
        worldEvent.phase = 'active';
        worldEvent.phaseTimer = 30;
      } else if (worldEvent.kind === 'vault' && worldEvent.target) {
        eventPickups.push({ kind: 'vault', x: worldEvent.target.x, y: worldEvent.target.y, life: 30, channel: 0 });
        worldEvent.banner = '✦ 宝库开启! 前往 channel 5 秒!';
        worldEvent.phase = 'active';
        worldEvent.phaseTimer = 30;
      } else if (worldEvent.kind === 'meteor') {
        worldEvent.phase = 'active';
        worldEvent.phaseTimer = 6;
        worldEvent._waveT = 0;
        worldEvent.banner = '☄ 流星雨进行中!';
      } else if (worldEvent.kind === 'doubleXP') {
        worldEvent.phase = 'active';
        worldEvent.phaseTimer = 30;
        worldEvent.banner = '⚡ 双倍经验激活!';
        player._doubleXPUntil = gameTime + 30;
      }
    }
    if (worldEvent.phase === 'active') {
      if (worldEvent.kind === 'meteor') {
        worldEvent._waveT = (worldEvent._waveT || 0) + dt;
        if (worldEvent._waveT >= 1.8) {
          worldEvent._waveT = 0;
          // Spawn 3 meteor warnings near player
          for (var mk = 0; mk < 3; mk++) {
            var _mAng = Math.random() * Math.PI * 2;
            var _mDist = 120 + Math.random() * 160;
            var _mx = player.x + Math.cos(_mAng) * _mDist;
            var _my = player.y + Math.sin(_mAng) * _mDist;
            meteorMarkers.push({ x: _mx, y: _my, warn: 1.2, impactRadius: 90, damage: 40, impacted: false });
          }
        }
      }
      if (worldEvent.phaseTimer <= 0) {
        worldEvent.active = false;
        worldEvent.phase = 'idle';
        worldEvent.banner = '';
      }
    }
    // Meteor marker update
    for (var _mi = meteorMarkers.length - 1; _mi >= 0; _mi--) {
      var _mm = meteorMarkers[_mi];
      _mm.warn -= dt;
      if (_mm.warn <= 0 && !_mm.impacted) {
        _mm.impacted = true;
        _mm.fade = 0.4;
        var _pdx = player.x - _mm.x, _pdy = player.y - _mm.y;
        if (_pdx * _pdx + _pdy * _pdy < _mm.impactRadius * _mm.impactRadius) {
          var _meteorDmg = _mm.damage * _healerInitShieldMul(player) * _abilityDmgScale();
          player.hp -= _meteorDmg;
          window._dmgSourceLog = window._dmgSourceLog || {};
          window._dmgSourceLog['meteor'] = (window._dmgSourceLog['meteor'] || 0) + _meteorDmg;
          triggerPlayerHurt && triggerPlayerHurt();
          screenShake(10, 400);
        }
        // Damage enemies caught in radius too
        for (var _ei = 0; _ei < offlineEnemies.length; _ei++) {
          var _en = offlineEnemies[_ei]; if (!_en.alive) continue;
          var _ex = _en.x - _mm.x, _ey = _en.y - _mm.y;
          if (_ex * _ex + _ey * _ey < _mm.impactRadius * _mm.impactRadius) _en.hp -= _mm.damage;
        }
        for (var _bi = 0; _bi < offlineBots.length; _bi++) {
          var _bb = offlineBots[_bi]; if (!_bb.alive) continue;
          var _bx = _bb.x - _mm.x, _by = _bb.y - _mm.y;
          if (_bx * _bx + _by * _by < _mm.impactRadius * _mm.impactRadius) _bb.hp -= _mm.damage;
        }
        emit(_mm.x, _mm.y, '#ff6030', 30, 180);
      } else if (_mm.impacted) {
        _mm.fade -= dt;
        if (_mm.fade <= 0) meteorMarkers.splice(_mi, 1);
      }
    }
    // Event pickup update
    for (var _epi = eventPickups.length - 1; _epi >= 0; _epi--) {
      var _ep = eventPickups[_epi];
      _ep.life -= dt;
      _ep.dropT = (_ep.dropT || 0) + dt;
      if (_ep.life <= 0) { eventPickups.splice(_epi, 1); continue; }
      var _dxE = player.x - _ep.x, _dyE = player.y - _ep.y;
      var _dE = Math.sqrt(_dxE * _dxE + _dyE * _dyE);
      if (_ep.kind === 'airdrop' && _dE < 28) {
        playerXP += 100;
        dropSkillPickup(_ep.x, _ep.y, '#ffd700');
        dropSkillPickup(_ep.x + 12, _ep.y - 10, '#ffd700');
        floatText(player.x, player.y - 48, '🎁 空投! +100 XP + 2 技能卡', { color: '#ffd700', size: 14 });
        emit(_ep.x, _ep.y, '#ffd700', 40, 220);
        screenFlash.color = '#ffd700'; screenFlash.alpha = 0.5;
        eventPickups.splice(_epi, 1);
        continue;
      }
      if (_ep.kind === 'vault') {
        if (_dE < 60) {
          _ep.channel = (_ep.channel || 0) + dt;
          if (_ep.channel >= 5) {
            playerXP += 200;
            for (var _vk = 0; _vk < 4; _vk++) dropSkillPickup(_ep.x + (Math.random() - 0.5) * 40, _ep.y + (Math.random() - 0.5) * 40, '#b064ff');
            floatText(player.x, player.y - 60, '🗝 宝库开启! +200 XP + 4 技能卡', { color: '#d080ff', size: 15 });
            emit(_ep.x, _ep.y, '#b064ff', 60, 260);
            screenFlash.color = '#b064ff'; screenFlash.alpha = 0.55;
            eventPickups.splice(_epi, 1);
            continue;
          }
        } else {
          _ep.channel = 0;
        }
      }
    }
  }

  function drawWorldEventWorld() {
    // Meteor markers (warning + impact)
    for (var i = 0; i < meteorMarkers.length; i++) {
      var mm = meteorMarkers[i];
      if (!mm.impacted) {
        var warnRatio = mm.warn / 1.2;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ff3020';
        ctx.beginPath(); ctx.arc(mm.x, mm.y, mm.impactRadius * (1 - warnRatio * 0.1), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc(mm.x, mm.y, mm.impactRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, mm.fade / 0.4);
        ctx.fillStyle = '#ffaa20';
        ctx.beginPath(); ctx.arc(mm.x, mm.y, mm.impactRadius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    // Airdrop / vault
    for (var j = 0; j < eventPickups.length; j++) {
      var ep = eventPickups[j];
      var tt = (ep.dropT || 0);
      var bob = Math.sin(tt * 3) * 3;
      ctx.save();
      var col = ep.kind === 'airdrop' ? '#ffd700' : '#b064ff';
      // Pillar of light
      ctx.globalAlpha = 0.35;
      var lg = ctx.createLinearGradient(ep.x, ep.y - 180, ep.x, ep.y + 8);
      lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, col);
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(ep.x - 22, ep.y + 8); ctx.lineTo(ep.x + 22, ep.y + 8);
      ctx.lineTo(ep.x + 10, ep.y - 180); ctx.lineTo(ep.x - 10, ep.y - 180);
      ctx.closePath(); ctx.fill();
      // Chest body
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a1908';
      ctx.fillRect(ep.x - 14, ep.y - 10 + bob, 28, 20);
      ctx.fillStyle = col;
      ctx.fillRect(ep.x - 14, ep.y - 10 + bob, 28, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(ep.x - 3, ep.y + bob, 6, 10);
      ctx.fillStyle = col;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.strokeRect(ep.x - 14, ep.y - 10 + bob, 28, 20);
      // Channel ring for vault
      if (ep.kind === 'vault') {
        var ring = 60;
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(ep.x, ep.y, ring, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        if ((ep.channel || 0) > 0) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, ring + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ep.channel / 5));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // DoubleXP aura on player
    if (player && player._doubleXPUntil && gameTime < player._doubleXPUntil) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(gameTime * 3);
      ctx.strokeStyle = '#ffdd40'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(player.x, player.y, (player.radius || 12) + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ffdd40';
      ctx.beginPath(); ctx.arc(player.x, player.y, (player.radius || 12) + 20, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // Strategic point pulse halo (visible from 500px away)
  function drawStratPulse() {
    if (!STRAT_POINTS || !STRAT_POINTS.pointsInWorld || !STRAT_POINTS.pointsInWorld.length) return;
    var pulse = 0.5 + 0.4 * Math.sin(gameTime * 2);
    for (var i = 0; i < STRAT_POINTS.pointsInWorld.length; i++) {
      var p = STRAT_POINTS.pointsInWorld[i];
      var owned = gameTime < p.buffUntil && p.owner != null;
      var mine = owned && player && p.owner === player.factionId;
      var col = mine ? '#4aaaff' : (owned ? '#ff4a4a' : '#e8e8f0');
      var rr = 180;
      ctx.save();
      ctx.globalAlpha = 0.32 + 0.18 * pulse;
      var g = ctx.createRadialGradient(p.x, p.y, Math.max(1, rr * 0.15), p.x, p.y, Math.max(2, rr));
      g.addColorStop(0, col);
      g.addColorStop(0.7, col + '55');
      g.addColorStop(1, col + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
      // Outer breathing ring
      ctx.globalAlpha = 0.55 + 0.3 * pulse;
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, rr * (0.85 + 0.1 * pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Experiment F: class ultimate unlock at Lv5
  var CLASS_ULTIMATES = {
    warrior: { name: '地震', icon: '🌋', color: '#ff6040', desc: '半径 200 范围击晕 + 80 伤害' },
    mage:    { name: '流星', icon: '☄',  color: '#ff40a0', desc: '召唤 8 颗流星 · 每颗 50 AOE' },
    scout:   { name: '影杀', icon: '🗡',  color: '#a040ff', desc: '闪现至最远敌人背后斩杀' }
  };
  function grantClassUltimate() {
    player._ultimateUnlocked = true;
    player._ultimateReady = true;
    var u = CLASS_ULTIMATES[selectedClass] || CLASS_ULTIMATES.warrior;
    player._ultimateName = u.name;
    player._ultimateIcon = u.icon;
    player._ultimateColor = u.color;
    synergyBanner.active = true;
    synergyBanner.timer = 0;
    synergyBanner.duration = 2.0;
    synergyBanner.text = '🔓 ULTIMATE: ' + u.icon + ' ' + u.name;
    synergyBanner.color = u.color;
    screenFlash.color = u.color; screenFlash.alpha = 0.55;
    screenShake(14, 600);
    emit(player.x, player.y, u.color, 50, 240);
  }
  function castClassUltimate() {
    if (!player._ultimateReady) return false;
    player._ultimateReady = false;
    var kind = selectedClass;
    var u = CLASS_ULTIMATES[kind] || CLASS_ULTIMATES.warrior;
    screenFlash.color = u.color; screenFlash.alpha = 0.7;
    screenShake(16, 700);
    floatText(player.x, player.y - 60, u.icon + ' ' + u.name + '!', { color: u.color, size: 24 });
    if (kind === 'warrior') {
      // AOE stun + damage
      var rr = 200;
      for (var _ei = 0; _ei < offlineEnemies.length; _ei++) {
        var _en = offlineEnemies[_ei]; if (!_en.alive) continue;
        var dx = _en.x - player.x, dy = _en.y - player.y;
        if (dx * dx + dy * dy < rr * rr) { _en.hp -= 80; _en._stunUntil = gameTime + 1.5; }
      }
      for (var _bi = 0; _bi < offlineBots.length; _bi++) {
        var _bb = offlineBots[_bi]; if (!_bb.alive) continue;
        var dx2 = _bb.x - player.x, dy2 = _bb.y - player.y;
        if (dx2 * dx2 + dy2 * dy2 < rr * rr) { _bb.hp -= 80; _bb._stunUntil = gameTime + 1.5; }
      }
      if (!window._aoeSweep) window._aoeSweep = [];
      window._aoeSweep.push({ x: player.x, y: player.y, radius: 0, maxRadius: rr, life: 0.6, maxLife: 0.6, color: u.color });
      emit(player.x, player.y, u.color, 60, 260);
    } else if (kind === 'mage') {
      // Spawn 8 meteors in a ring
      for (var mi = 0; mi < 8; mi++) {
        var ang = mi * Math.PI * 2 / 8 + Math.random() * 0.3;
        var dist = 80 + Math.random() * 120;
        meteorMarkers.push({
          x: player.x + Math.cos(ang) * dist,
          y: player.y + Math.sin(ang) * dist,
          warn: 0.6, impactRadius: 70, damage: 50, impacted: false, _playerCast: true
        });
      }
    } else {
      // Scout: find farthest enemy in sight, blink behind & strike
      var _tgt = null, _bestD = 0;
      var scanSources = [offlineEnemies, offlineBots];
      for (var ss = 0; ss < scanSources.length; ss++) {
        var arr = scanSources[ss];
        for (var ti = 0; ti < arr.length; ti++) {
          var e = arr[ti]; if (!e.alive) continue;
          var dx3 = e.x - player.x, dy3 = e.y - player.y;
          var d2 = dx3 * dx3 + dy3 * dy3;
          if (d2 > _bestD && d2 < 500 * 500) { _bestD = d2; _tgt = e; }
        }
      }
      if (_tgt) {
        var ang2 = Math.atan2(_tgt.y - player.y, _tgt.x - player.x);
        player.x = _tgt.x - Math.cos(ang2) * 30;
        player.y = _tgt.y - Math.sin(ang2) * 30;
        _tgt.hp -= 200;
        emit(_tgt.x, _tgt.y, u.color, 30, 180);
      }
    }
    return true;
  }

  // Experiment G: rival slain banner
  function triggerRivalSlainBanner(name) {
    bossSlainBanner.active = true;
    bossSlainBanner.timer = 0;
    bossSlainBanner.duration = 1.5;
    bossSlainBanner.name = 'YOU SLAIN ' + name + ' THE RIVAL!';
    bossSlainBanner._rivalMode = true;
    screenFlash.color = '#ff3366'; screenFlash.alpha = 0.6;
    screenShake(12, 500);
  }
  // drawOffScreenEnemyArrows — direction indicators for hostile enemies outside the viewport
  function drawOffScreenEnemyArrows() {
    if (!player) return;
    var cx = W / 2, cy = H / 2;
    var margin = 48; // inset from edge
    var maxDist = 900; // only show arrows for enemies within this world distance
    var list = [];
    // Collect offline enemies
    if (typeof offlineEnemies !== 'undefined' && offlineEnemies) {
      for (var _aei = 0; _aei < offlineEnemies.length; _aei++) {
        var _ae = offlineEnemies[_aei];
        if (!_ae || !_ae.alive || _ae.hostile === false) continue;
        var _adx = _ae.x - player.x, _ady = _ae.y - player.y;
        var _ad2 = _adx * _adx + _ady * _ady;
        if (_ad2 > maxDist * maxDist) continue;
        // Check if off-screen
        var _sx = _ae.x - cameraX, _sy = _ae.y - cameraY;
        if (_sx > -20 && _sx < W + 20 && _sy > -20 && _sy < H + 20) continue;
        list.push({ x: _ae.x, y: _ae.y, type: _ae.type, dist: Math.sqrt(_ad2) });
      }
    }
    // Sort nearest-first and cap total arrows
    list.sort(function(a, b) { return a.dist - b.dist; });
    if (list.length > 18) list.length = 18;
    // Draw each arrow at screen edge pointing toward enemy
    for (var _li = 0; _li < list.length; _li++) {
      var _ee = list[_li];
      var dx = _ee.x - player.x, dy = _ee.y - player.y;
      var ang = Math.atan2(dy, dx);
      // Find intersection of ray from center with rectangular viewport edge
      var edgeX = W / 2 - margin, edgeY = H / 2 - margin;
      var t = Math.min(edgeX / Math.max(0.001, Math.abs(Math.cos(ang))), edgeY / Math.max(0.001, Math.abs(Math.sin(ang))));
      var ax = cx + Math.cos(ang) * t;
      var ay = cy + Math.sin(ang) * t;
      var isBoss = (_ee.type === 'boss');
      var isMini = (_ee.type === 'miniBoss');
      var size = isBoss ? 18 : (isMini ? 14 : 10);
      var arrowColor = isBoss ? '#ff2020' : (isMini ? '#ff6020' : '#ff8866');
      var alpha = Math.max(0.35, 1 - _ee.dist / maxDist);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      // Arrow shadow / glow
      ctx.shadowColor = arrowColor;
      ctx.shadowBlur = isBoss ? 12 : (isMini ? 8 : 4);
      ctx.fillStyle = arrowColor;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.7, -size * 0.6);
      ctx.lineTo(-size * 0.3, 0);
      ctx.lineTo(-size * 0.7, size * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Outline
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      // Distance text for bosses / minis
      if (isBoss || isMini) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = arrowColor;
        ctx.font = 'bold 11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
        var label = (isBoss ? '👑 BOSS ' : '⚔ ') + Math.round(_ee.dist) + 'm';
        // Offset the label inward from the arrow
        var lbx = ax - Math.cos(ang) * 22;
        var lby = ay - Math.sin(ang) * 22;
        ctx.strokeText(label, lbx, lby);
        ctx.fillText(label, lbx, lby);
        ctx.restore();
      }
    }
    ctx.lineWidth = 1;
  }

  function drawComboPopup() {
    if (comboState.popupTimer <= 0) return;
    var t = comboState.popupTimer / 0.93;
    var ease = t < 0.2 ? (t / 0.2) : (t > 0.8 ? 1 : 1);
    // Slide in from right for first 0.2s (t goes 1→0)
    var slideX = (t > 0.85) ? (t - 0.85) / 0.15 * 80 : 0;
    var alpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : (t < 0.2 ? t / 0.2 : 1);
    var scale = 1 + Math.sin((1 - t) * Math.PI) * 0.1;
    var _cps = Math.min(W / 400, H / 700);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2 + slideX, H * 0.3);
    ctx.scale(scale * _cps, scale * _cps);
    // Shadow / glow
    ctx.shadowColor = comboState.popupColor;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 38px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.lineWidth = 6;
    ctx.strokeText(comboState.popupText, 0, 0);
    ctx.fillStyle = comboState.popupColor;
    ctx.fillText(comboState.popupText, 0, 0);
    // Combo counter below
    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; // 16 × 60%
    ctx.fillStyle = '#fff';
    ctx.strokeText('x ' + comboState.lastShownCount + ' 连杀', 0, 15);
    ctx.fillText('x ' + comboState.lastShownCount + ' 连杀', 0, 15);
    ctx.restore();
    ctx.lineWidth = 1;
  }

  // Experiment D/H: BOSS / RIVAL / NEMESIS banner (PNG art when available)
  function drawBossSlainBanner() {
    if (!bossSlainBanner.active) return;
    var t = bossSlainBanner.timer / bossSlainBanner.duration;
    var alpha = t < 0.15 ? t / 0.15 : (t > 0.8 ? (1 - t) / 0.2 : 1);
    var scale = t < 0.2 ? 0.6 + (t / 0.2) * 0.4 : 1.0;
    // Pick the correct PNG banner
    var bannerEntry = null;
    if (bossSlainBanner._nemesisKill && R3_ART.nemesisBanner.ready) bannerEntry = R3_ART.nemesisBanner;
    else if (bossSlainBanner._rivalMode && !bossSlainBanner._announceMode && R3_ART.rivalBanner.ready) bannerEntry = R3_ART.rivalBanner;
    else if (!bossSlainBanner._rivalMode && R3_ART.bossBanner.ready) bannerEntry = R3_ART.bossBanner;
    ctx.save();
    // Dim backdrop
    ctx.globalAlpha = Math.max(0, alpha) * 0.5;
    ctx.fillStyle = bossSlainBanner._nemesisKill ? '#1a0024' : (bossSlainBanner._rivalMode ? '#220011' : '#1a0e00');
    ctx.fillRect(0, H * 0.32, W, H * 0.20);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(W / 2, H * 0.42);
    ctx.scale(scale, scale);
    if (bannerEntry && !bossSlainBanner._announceMode) {
      // PNG banner (512×96 art). Center horizontally.
      var _bWscale = Math.min(W * 0.92 / 512, 1.1);
      var _bw = 512 * _bWscale;
      var _bh = 96 * _bWscale;
      ctx.drawImage(bannerEntry.img, -_bw / 2, -_bh / 2, _bw, _bh);
      // Boss species subtitle
      if (!bossSlainBanner._rivalMode && bossSlainBanner.name) {
        ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
        ctx.fillStyle = '#ffdca0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('— ' + bossSlainBanner.name + ' —', 0, _bh / 2 + 14);
        ctx.textBaseline = 'alphabetic';
      }
    } else {
      // Fallback / announcement mode — text banner
      ctx.font = 'bold 40px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
      var title = bossSlainBanner._announceMode ? bossSlainBanner.name
                : bossSlainBanner._nemesisKill ? 'NEMESIS SLAIN!'
                : bossSlainBanner._rivalMode ? (bossSlainBanner.name || 'RIVAL SLAIN!')
                : 'BOSS SLAIN!';
      ctx.strokeText(title, 0, 0);
      var col = bossSlainBanner._nemesisKill ? '#c490e8' : (bossSlainBanner._rivalMode ? '#ff4080' : '#ffd700');
      var grad = ctx.createLinearGradient(0, -24, 0, 24);
      grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, col); grad.addColorStop(1, '#552200');
      ctx.fillStyle = grad;
      ctx.fillText(title, 0, 0);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    ctx.lineWidth = 1;
  }

  // Experiment D: boss perma buff 3-choice overlay
  function drawBossBuffChoice() {
    if (!bossBuffChoice.active) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 选择永久强化', W / 2, H * 0.34);
    var cardW = Math.min(W * 0.28, 120), cardH = 140;
    var gap = 12;
    var total = cardW * 3 + gap * 2;
    var startX = (W - total) / 2;
    var cy = H * 0.40;
    bossBuffChoice.rects = [];
    for (var i = 0; i < bossBuffChoice.options.length; i++) {
      var opt = bossBuffChoice.options[i];
      var cx = startX + i * (cardW + gap);
      bossBuffChoice.rects.push({ x: cx, y: cy, w: cardW, h: cardH, idx: i });
      ctx.fillStyle = '#1a1a2c';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = opt.color; ctx.lineWidth = 3;
      ctx.strokeRect(cx, cy, cardW, cardH);
      ctx.fillStyle = opt.color;
      ctx.font = 'bold 36px "Apple Color Emoji", "Segoe UI Emoji", Arial, sans-serif';
      ctx.fillText(opt.icon, cx + cardW / 2, cy + 52);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
      ctx.fillText(opt.name, cx + cardW / 2, cy + 92);
      ctx.fillStyle = '#aaa';
      ctx.font = '11px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
      ctx.fillText('永久 · 当局', cx + cardW / 2, cy + 116);
    }
    ctx.font = '12px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('点击卡片选择', W / 2, cy + cardH + 20);
    ctx.restore();
    ctx.lineWidth = 1;
  }

  // Experiment F: synergy center banner
  function drawSynergyBanner() {
    if (!synergyBanner.active) return;
    var t = synergyBanner.timer / synergyBanner.duration;
    var alpha = t < 0.2 ? t / 0.2 : (t > 0.8 ? (1 - t) / 0.2 : 1);
    var scale = 1 + Math.sin(Math.min(1, t) * Math.PI) * 0.15;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(W / 2, H * 0.30);
    ctx.scale(scale, scale);
    ctx.font = 'bold 34px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = synergyBanner.color; ctx.shadowBlur = 14;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText(synergyBanner.text, 0, 0);
    ctx.fillStyle = synergyBanner.color;
    ctx.fillText(synergyBanner.text, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    ctx.lineWidth = 1;
  }

  // Experiment E: world event warning banner (HUD space)
  function drawWorldEventBanner() {
    if (!worldEvent.active || !worldEvent.banner) return;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#18060c';
    ctx.fillRect(0, H * 0.125, W, 36);
    ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 2;
    ctx.strokeRect(0, H * 0.125, W, 36);
    ctx.fillStyle = '#ffcc33';
    ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var txt = worldEvent.banner;
    if (worldEvent.phase === 'warning') {
      txt += '  (' + Math.max(0, Math.ceil(worldEvent.phaseTimer)) + 's)';
    }
    ctx.fillText(txt, W / 2, H * 0.125 + 18);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    ctx.lineWidth = 1;
  }

  // Enemy projectiles (US-197)
  var enemyProjectiles = [];
  var rangedDist = 200; // ranged enemies keep this distance

  // Defensive XP generation (US-198)
  var defensiveXp = 0; // total XP from thorns/shield

  // Ultimate ability (US-199)
  var ultCharge = 0;
  var ultChargeMax = 100; // matches server ultimateMaxCharge (charge +5 per kill)
  var ultReady = false;
  var ultFlash = { active: false, timer: 0 };

  // Biome system (US-201)
  var BIOMES = [
    { name: '暗夜森林', gridColor: '#1a4a1a', bgColor: '#0c1e10', bgColor2: '#10102a', starColor: '#55ff77', starColor2: '#99ffbb', waveMin: 1, waveMax: 5 },
    { name: '熔岩地带', gridColor: '#4a2510', bgColor: '#1e1008', bgColor2: '#20081a', starColor: '#ff9955', starColor2: '#ffbb77', waveMin: 6, waveMax: 10 },
    { name: '深渊领域', gridColor: '#1a1a4a', bgColor: '#0c0c22', bgColor2: '#220c22', starColor: '#7799ff', starColor2: '#bb99ff', waveMin: 11, waveMax: 15 },
    { name: '虚空裂隙', gridColor: '#201520', bgColor: '#100a10', starColor: '#2a1a2a', waveMin: 16, waveMax: 999 }
  ];
  var currentBiome = BIOMES[0];
  // biomeTransition effect state (US-281)
  var biomeTransition = { active: false, timer: 0, duration: 2, name: '', fromColor: '#000', toColor: '#fff' };

  // Share button state (US-213)
  var shareBtn = { x: 0, y: 0, w: 200, h: 45, visible: false };
  var shareText = '';

  // Projectile trail system (US-219)
  var projTrail = true; // enable projectile trails

  // Auto-aim indicator (US-224)
  var aimLine = { targetX: 0, targetY: 0, active: false };

  // Power spike announcements (US-226)
  var powerSpike = { active: false, text: '', timer: 0 };
  function triggerPowerSpike(text) {
    powerSpike.active = true;
    powerSpike.text = text;
    powerSpike.timer = 2.0;
    floatText(W / 2, H / 3, text, '#ffd700', 28);
    screenShake(6, 300);
    screenFlash.color = '#ffd700'; screenFlash.alpha = 0.2;
    emit(player.x, player.y, '#ffd700', 20, 150);
  }

  // Wave clear reward (US-227)
  var waveClear = { detected: false, bonus: 0, lastWaveKills: 0 };

  // waveBanner — waveAnnounce slide-in animation (US-275)
  var waveBanner = { active: false, timer: 0, text: '', color: '#fff' };
  function drawWaveBanner() {
    if (!waveBanner.active) return;
    waveBanner.timer -= 1 / 60;
    if (waveBanner.timer <= 0) { waveBanner.active = false; return; }
    // Clamp total visible duration to 1s regardless of initial timer
    var maxDur = 1.0;
    if (waveBanner.timer > maxDur) waveBanner.timer = maxDur;
    var t = waveBanner.timer;
    var _wbs = Math.min(W / 400, H / 700);
    var _compactWaveBanner = !!((window.KOS_UI && window.KOS_UI.hud) || {}).compactWaveBanner;
    var fontPx = _compactWaveBanner ? Math.max(13, Math.min(18, Math.round(15 * _wbs))) : Math.round(44 * _wbs);
    // Fade out in last 0.3s
    var alpha = t < 0.3 ? t / 0.3 : 1;
    // Center vertically in middle game zone
    var centerY = _compactWaveBanner ? Math.round(H * 0.135) : H / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (_compactWaveBanner) {
      var _wbW = Math.min(W * 0.46, 280);
      var _wbH = Math.max(24, fontPx * 1.8);
      ctx.fillStyle = 'rgba(8,12,14,0.62)';
      ctx.strokeStyle = 'rgba(244,201,90,0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(W / 2 - _wbW / 2, centerY - _wbH / 2, _wbW, _wbH, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = waveBanner.color;
    ctx.font = 'bold ' + fontPx + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = _compactWaveBanner ? Math.max(1.5, 1.6 * _wbs) : Math.max(4, 5 * _wbs);
    ctx.strokeText(waveBanner.text, W / 2, centerY);
    ctx.fillText(waveBanner.text, W / 2, centerY);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    ctx.lineWidth = 1; ctx.globalAlpha = 1;
  }

  // Survival milestones (US-228)
  var survivalMilestones = { 30: false, 60: false, 120: false, 300: false };
  function checkSurvivalMilestone() {
    var t = Math.floor(gameTime);
    if (t >= 30 && !survivalMilestones[30]) {
      survivalMilestones[30] = true;
      floatText(W / 2, H / 3, '30秒! 新手毕业!', '#0f0', 22);
      emit(player.x, player.y, '#0f0', 15, 100);
      screenFlash.color = '#0f0'; screenFlash.alpha = 0.15;
    }
    if (t >= 60 && !survivalMilestones[60]) {
      survivalMilestones[60] = true;
      floatText(W / 2, H / 3, '60秒! 强者崛起!', '#ff0', 26);
      emit(player.x, player.y, '#ff0', 20, 130);
      screenShake(4, 200);
    }
    if (t >= 120 && !survivalMilestones[120]) {
      survivalMilestones[120] = true;
      floatText(W / 2, H / 3, '120秒! 传说之路!', '#f80', 30);
      emit(player.x, player.y, '#f80', 30, 180);
      screenShake(6, 300);
    }
    if (t >= 300 && !survivalMilestones[300]) {
      survivalMilestones[300] = true;
      floatText(W / 2, H / 3, '300秒! 不朽传奇!', '#f0f', 34);
      emit(player.x, player.y, '#f0f', 40, 250);
      screenShake(10, 500);
      screenFlash.color = '#f0f'; screenFlash.alpha = 0.3;
    }
  }

  // Background ambient particles (US-229)
  var bgParticles = [];
  function initBgParticles() {
    bgParticles = [];
    for (var i = 0; i < 80; i++) {
      bgParticles.push({
        x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
        vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
        alpha: Math.random() * 0.4 + 0.15, radius: Math.random() * 3 + 1,
        hue: Math.random() * 60 + 200
      });
    }
  }

  // envDecoration — floating debris and energyWisp for visual density (US-272)
  var floatingDebris = [];
  function initEnvDecoration() {
    floatingDebris = [];
    for (var i = 0; i < 40; i++) {
      var kind = Math.random() < 0.4 ? 'wisp' : 'debris';
      floatingDebris.push({
        x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
        vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
        kind: kind, size: kind === 'wisp' ? (2 + Math.random() * 4) : (1 + Math.random() * 2),
        hue: Math.random() * 360, phase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }
  }

  // Player movement trail (US-230)
  var playerTrail = [];
  var playerTrailMax = 8;

  // Treasure chest drops (US-237)
  var chests = []; // { x, y, timer, reward }
  function spawnChest(x, y) {
    var rewards = [
      { type: 'gold', amount: 20 + wave * 5, text: '金币', color: '#ffd700' },
      { type: 'xp', amount: 30 + wave * 10, text: 'XP', color: '#0ff' },
      { type: 'heal', amount: Math.round(player.maxHp * 0.3), text: '治疗', color: '#0f0' }
    ];
    var reward = rewards[Math.floor(Math.random() * rewards.length)];
    chests.push({ x: x, y: y, timer: 8, reward: reward, radius: 12, collected: false });
  }

  // Boss warning system (US-214)
  var bossWarning = { active: false, timer: 0, duration: 2.5 };

  // Combo kill chain (US-215)
  var comboKills = 0;
  var comboTimer = 0;
  var comboWindow = 1.5; // seconds to chain kills

  // Damage direction indicators (US-216)
  var damageIndicators = []; // { angle, alpha, timer }
  function addDamageIndicator(srcX, srcY) {
    var dx = srcX - player.x, dy = srcY - player.y;
    var angle = Math.atan2(dy, dx);
    damageIndicators.push({ angle: angle, alpha: 1, timer: 0.6 });
  }
  function drawDamageIndicators() {
    for (var di = damageIndicators.length - 1; di >= 0; di--) {
      var ind = damageIndicators[di];
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(ind.angle);
      ctx.globalAlpha = ind.alpha * 0.6;
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.moveTo(W / 2 - 20, -15);
      ctx.lineTo(W / 2, 0);
      ctx.lineTo(W / 2 - 20, 15);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // Low HP vignette overlay (US-218)
  function drawVignette() {
    if (!player || player.hp >= player.maxHp * 0.3) return;
    var hpRatio = player.hp / player.maxHp;
    var vignetteAlpha = (0.3 - hpRatio) * 0.8; // stronger as HP drops
    var grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(180,0,0,' + vignetteAlpha + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // chainLightningVisual: glowing arcs between chain targets (US-297)
  function drawChainArcs() {
    var arcs = window._chainArcs;
    if (!arcs || arcs.length === 0) return;
    for (var ai = arcs.length - 1; ai >= 0; ai--) {
      var a = arcs[ai];
      var alpha = (a.life / a.maxLife);
      ctx.save();
      // Wide glow layer
      ctx.globalAlpha = alpha * 0.15;
      ctx.strokeStyle = '#88f';
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
      var dx = a.x2 - a.x1, dy = a.y2 - a.y1;
      // Multi-segment jagged lightning
      var segs = 5;
      for (var si = 1; si <= segs; si++) {
        var frac = si / segs;
        var jx = a.x1 + dx * frac + (si < segs ? (Math.random() - 0.5) * 30 : 0);
        var jy = a.y1 + dy * frac + (si < segs ? (Math.random() - 0.5) * 30 : 0);
        ctx.lineTo(jx, jy);
      }
      ctx.stroke();
      // Main bright bolt
      ctx.globalAlpha = alpha * 0.85;
      ctx.strokeStyle = a.color || '#aaf';
      ctx.lineWidth = 2 + alpha * 2;
      ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
      for (var si2 = 1; si2 <= segs; si2++) {
        var frac2 = si2 / segs;
        var jx2 = a.x1 + dx * frac2 + (si2 < segs ? (Math.random() - 0.5) * 25 : 0);
        var jy2 = a.y1 + dy * frac2 + (si2 < segs ? (Math.random() - 0.5) * 25 : 0);
        ctx.lineTo(jx2, jy2);
      }
      ctx.stroke();
      // Bright core
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Impact flash at endpoints
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#88f';
      ctx.beginPath(); ctx.arc(a.x2, a.y2, 8 * alpha, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      a.life -= 0.016;
      if (a.life <= 0) arcs.splice(ai, 1);
    }
  }

  // aoeSweepEffect: expanding ring waves from AOE hits (US-296)
  function drawAoeSweep() {
    var sweeps = window._aoeSweep;
    if (!sweeps || sweeps.length === 0) return;
    for (var si = sweeps.length - 1; si >= 0; si--) {
      var sw = sweeps[si];
      var progress = 1 - (sw.life / sw.maxLife);
      sw.radius = sw.maxRadius * progress;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.4;
      ctx.strokeStyle = sw.color || '#fff';
      ctx.lineWidth = 3 * (1 - progress);
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // evolveCutscene display (US-289)
  function drawEvolveCutscene() {
    var evo = window._evoDisplay;
    if (!evo || !evo.active) return;
    var progress = 1 - (evo.timer / 1.5);
    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,' + (progress < 0.2 ? progress * 2 : (progress > 0.8 ? (1 - progress) * 2.5 : 0.4)) + ')';
    ctx.fillRect(0, 0, W, H);
    // Evolution name — large center text with scale-in
    var nameScale = progress < 0.3 ? progress / 0.3 * 1.2 : 1.0 + Math.sin(progress * 8) * 0.05;
    var nameAlpha = progress > 0.8 ? (1 - progress) * 5 : 1;
    ctx.save();
    ctx.globalAlpha = nameAlpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(nameScale, nameScale);
    ctx.font = 'bold 36px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
    ctx.strokeText(evo.name, 0, 0);
    ctx.fillStyle = evo.color || '#ffd700';
    ctx.fillText(evo.name, 0, 0);
    // Sub-label
    ctx.font = 'bold 18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('EVOLUTION', 0, -30);
    ctx.restore();
    // Light beam particles
    if (Math.random() < 0.3) {
      var ba = Math.random() * Math.PI * 2;
      particles.push({ x: W / 2 + Math.cos(ba) * 30, y: H / 2 + Math.sin(ba) * 30,
        vx: Math.cos(ba) * 120, vy: Math.sin(ba) * 120,
        life: 0.5, maxLife: 0.5, color: evo.color || '#ffd700', radius: 2 });
    }
  }

  // drawBiomeTransition: dramatic biome change effect (US-281)
  function drawBiomeTransition() {
    if (!biomeTransition.active) return;
    var t = biomeTransition.timer;
    var d = biomeTransition.duration;
    var progress = 1 - (t / d); // 0→1
    // Phase 1 (0-0.3): white flash expanding from center
    if (progress < 0.3) {
      var flashAlpha = (0.3 - progress) * 2;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#fff';
      var ringR = progress * W * 3;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, ringR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Phase 2 (0.2-0.8): biome name display with scale animation
    if (progress > 0.2 && progress < 0.8) {
      var nameAlpha = progress < 0.5 ? (progress - 0.2) * 3 : (0.8 - progress) * 3;
      nameAlpha = Math.min(1, nameAlpha);
      var scale = 0.8 + progress * 0.4;
      ctx.save();
      ctx.globalAlpha = nameAlpha;
      ctx.font = 'bold ' + Math.round(40 * scale) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
      ctx.strokeText(biomeTransition.name, W / 2, H / 2);
      ctx.fillStyle = biomeTransition.toColor === '#000' ? '#fff' : (currentBiome.starColor || '#fff');
      ctx.fillText(biomeTransition.name, W / 2, H / 2);
      ctx.restore();
    }
    // Phase 3 (0.6-1.0): edge glow in new biome color
    if (progress > 0.6) {
      var edgeAlpha = (1 - progress) * 0.4;
      ctx.save();
      ctx.globalAlpha = edgeAlpha;
      var grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, currentBiome.starColor || '#88f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // Edge danger indicator — off-screen enemy direction arrows (US-279)
  function drawEdgeArrow(ex, ey, threat) {
    // edgeDangerIndicator: red arrows on screen edges pointing to off-screen enemies
    var cx = W / 2, cy = H / 2;
    var dx = ex - (player ? player.x : cx), dy = ey - (player ? player.y : cy);
    var angle = Math.atan2(dy, dx);
    var margin = 30;
    // clamp arrow to screen edge
    var ax, ay;
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var scaleX = cosA !== 0 ? ((cosA > 0 ? W - margin : margin) - cx) / cosA : 1e9;
    var scaleY = sinA !== 0 ? ((sinA > 0 ? H - margin : margin) - cy) / sinA : 1e9;
    var scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
    ax = cx + cosA * scale;
    ay = cy + sinA * scale;
    ax = Math.max(margin, Math.min(W - margin, ax));
    ay = Math.max(margin, Math.min(H - margin, ay));
    var size = 6 + threat * 8; // bigger when closer
    var alpha = 0.3 + threat * 0.5;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fill();
    // glow
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawEdgeDangerIndicators() {
    if (!player || state !== 'playing') return;
    for (var ei = 0; ei < entities.length; ei++) {
      var e = entities[ei];
      if (e.type !== 'enemy' || e.dead) continue;
      var sx = e.x - camX, sy = e.y - camY;
      // only for off-screen enemies
      if (sx > -20 && sx < W + 20 && sy > -20 && sy < H + 20) continue;
      var dist = Math.sqrt((e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y));
      if (dist > 800) continue; // too far, don't show
      var threat = Math.max(0, 1 - dist / 800); // 0=far, 1=close
      if (e.isBoss || e.miniBoss) threat = Math.min(1, threat + 0.3);
      drawEdgeArrow(e.x, e.y, threat);
    }
  }

  // Heartbeat pulse at low HP (US-251)
  function drawHeartBeat() {
    if (!heartBeat.active) return;
    var pulse = heartBeat.pulse; // 0-1, peaks at 0.5
    var intensity = Math.sin(pulse * Math.PI);
    if (intensity < 0.1) return;
    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 8 + intensity * 12;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.restore();
  }

  // Meta-progression (persistent across runs)
  var gold = 0;
  // prestigeSystem (US-290): permanent progression upgrades between runs
  var metaUpgrades = { max_hp: 0, damage: 0, speed: 0, regen: 0, crit: 0, magnet: 0 };
  // persistGold (US-337): load gold and metaUpgrades from localStorage
  try {
    var _savedGold = localStorage.getItem('survivor_gold');
    if (_savedGold) gold = parseInt(_savedGold, 10) || 0;
    var _savedMeta = localStorage.getItem('survivor_meta');
    if (_savedMeta) { var _pm = JSON.parse(_savedMeta); for (var mk in _pm) { if (metaUpgrades.hasOwnProperty(mk)) metaUpgrades[mk] = _pm[mk]; } }
  } catch(e) {}
  function saveGold() { try { localStorage.setItem('survivor_gold', '' + gold); localStorage.setItem('survivor_meta', JSON.stringify(metaUpgrades)); } catch(e) {} }
  var prestigeLevel = 0; // total upgrade levels purchased
  var META_UPGRADE_DEFS = [
    { id: 'max_hp', name: '体质强化', cost: 100, desc: '+20 最大HP', icon: '❤' },
    { id: 'damage', name: '力量训练', cost: 150, desc: '+5 攻击力', icon: '⚔' },
    { id: 'speed', name: '敏捷训练', cost: 120, desc: '+15 移速', icon: '🏃' },
    { id: 'regen', name: '再生体质', cost: 200, desc: '+1 HP/s', icon: '♥' },
    { id: 'crit', name: '致命直觉', cost: 250, desc: '+5% 暴击', icon: '💥' },
    { id: 'magnet', name: '磁力扩展', cost: 100, desc: '+50 吸收范围', icon: '🧲' }
  ];
  var bestRecord = { kills: 0, time: 0, wave: 0 };
  // autoBestRecord (US-336): persistRecord via localStorage
  try {
    var _savedBest = localStorage.getItem('survivor_best');
    if (_savedBest) { var _pb = JSON.parse(_savedBest); bestRecord.kills = _pb.kills || 0; bestRecord.time = _pb.time || 0; bestRecord.wave = _pb.wave || 0; }
  } catch(e) {}
  var bestScore = 0;
  var isNewRecord = false;
  var SHARE_REWARD = 50;
  var shareRewardClaimed = false;
  // Friend ranking / leaderboard
  var friendRanking = [
    { name: '你', score: 0, rank: 1, is_self: true },
    { name: '好友A', score: 500, rank: 2, is_self: false },
    { name: '好友B', score: 300, rank: 3, is_self: false }
  ];

  // tauntSystem (US-293): dynamic share taunt messages based on performance grade
  var TAUNT_MESSAGES = {
    'S': ['不服来战!', '谁能超越这个?', '传说级操作!', '这就是最强幸存者!'],
    'A': ['来挑战我试试!', '敢不敢跟我比?', '这波稳了!', 'A级玩家在线!'],
    'B': ['还不错吧?你能更好吗?', '这个分数有点东西', '中规中矩，再来一局?'],
    'C': ['还在进步中...你行你来!', '下次一定S级!', '至少比D级好...'],
    'D': ['至少我试过了...', '刚入门而已!', '菜是原罪，冲就完了!', '下次不会这么惨的...']
  };
  function getTaunt(gradeLetter) {
    var msgs = TAUNT_MESSAGES[gradeLetter] || TAUNT_MESSAGES['D'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  // weeklyBoss (US-291): rotating weekly challenge boss
  var WEEKLY_BOSS_TYPES = [
    { name: '虚空领主', color: '#c0f', hp_mult: 5, skill: 'teleport', desc: '闪现+暗影弹幕' },
    { name: '火焰泰坦', color: '#f60', hp_mult: 6, skill: 'flame_ring', desc: '火环+燃烧地面' },
    { name: '冰霜女皇', color: '#4cf', hp_mult: 4, skill: 'freeze_pulse', desc: '冰冻脉冲+减速场' },
    { name: '雷霆巨像', color: '#ff0', hp_mult: 5, skill: 'chain_bolt', desc: '连锁闪电+磁场' }
  ];
  var weeklyBoss = (function() {
    var wk = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return WEEKLY_BOSS_TYPES[wk % WEEKLY_BOSS_TYPES.length];
  })();
  var weeklyBossDefeated = false;

  // replayGhost (US-292): record player path for ghost replay
  var replayGhost = { bestPath: [], currentPath: [], recording: false, bestTime: 0 };

  // Heartbeat effect at low HP (US-251)
  var heartBeat = { timer: 0, period: 0.8, active: false, pulse: 0 };

  // Last Stand mode (US-252)
  var lastStand = { active: false, cooldownMult: 0.7, speedMult: 1.2 };

  // Unlock progression: achievement-based unlockables (US-256)
  var UNLOCKABLES = [
    { id: 'skin_gold', name: '黄金战士', type: 'skin', color: '#ffd700', requirement: 'kill_100', desc: '百人斩解锁' },
    { id: 'skin_shadow', name: '暗影斥候', type: 'skin', color: '#333', requirement: 'survive_180', desc: '三分钟铁人解锁' },
    { id: 'skin_flame', name: '烈焰法师', type: 'skin', color: '#f40', requirement: 'wave_10', desc: '第10波解锁' },
    { id: 'trail_star', name: '星光轨迹', type: 'trail', color: '#ff0', requirement: 'streak_25', desc: '25连杀解锁' }
  ];
  var unlockedSkins = {};
  function checkAchievementUnlocks() {
    for (var ui = 0; ui < UNLOCKABLES.length; ui++) {
      var u = UNLOCKABLES[ui];
      if (!unlockedSkins[u.id] && unlockedAchievements[u.requirement]) {
        unlockedSkins[u.id] = true;
        floatText(W / 2, H / 4, '🔓 解锁: ' + u.name, '#ffd700', 20);
      }
    }
  }

  // Defensive balance buff (US-259)
  var DEFENSE_BUFF = { shieldCooldown: 6, thornsMultiplier: 1.5, regenBoost: 1.5 };

  // Almost There: death screen regret hook (US-260)
  var almostThere = { text: '', active: false };
  function calcAlmostThere() {
    var hints = [];
    // Next wave
    var _waveEarly = (currentMap && currentMap.waveIntervalEarly) || 15;
    var _waveMid = (currentMap && currentMap.waveIntervalMid) || 12;
    var _waveLate = (currentMap && currentMap.waveIntervalLate) || 10;
    var _waveIv = wave < 4 ? _waveEarly : wave < 8 ? _waveMid : _waveLate;
    var nextWaveTime = _waveIv - waveTimer;
    if (nextWaveTime < 5) hints.push('再撑' + Math.ceil(nextWaveTime) + '秒就到第' + (wave + 1) + '波!');
    // Next level
    var xpRemaining = Math.floor((xpToNextLevel > 0 ? xpToNextLevel : 100) - playerXP);
    if (xpRemaining < 30 && xpRemaining > 0) hints.push('再' + xpRemaining + ' XP就升' + (playerLevel + 1) + '级!');
    // Boss wave
    var nextBossWave = Math.ceil((wave + 1) / 5) * 5;
    if (nextBossWave - wave <= 2) hints.push('还差' + (nextBossWave - wave) + '波就到BOSS战!');
    // Survival milestones
    var milestones = [30, 60, 120, 180, 300];
    for (var mi = 0; mi < milestones.length; mi++) {
      var diff = milestones[mi] - gameTime;
      if (diff > 0 && diff < 10) { hints.push('再坚持' + Math.ceil(diff) + '秒就达成' + milestones[mi] + '秒生存!'); break; }
    }
    almostThere.text = hints.length > 0 ? hints[0] : '';
    almostThere.active = hints.length > 0;
  }

  // Run Recap: highlight moments (US-261)
  var runRecap = { maxSingleHit: 0, fastestLevelUp: 999, longestStreak: 0 };
  function highlightMoment(type, value) {
    if (type === 'hit' && value > runRecap.maxSingleHit) runRecap.maxSingleHit = value;
    if (type === 'levelup' && value < runRecap.fastestLevelUp) runRecap.fastestLevelUp = value;
    if (type === 'streak' && value > runRecap.longestStreak) runRecap.longestStreak = value;
  }

  // Build Name System (US-264)
  var BUILD_NAMES = [
    { skills: ['scatter', 'pierce'], name: '弹幕流 🌀', min: 2 },
    { skills: ['attack_up', 'attack_speed', 'crit'], name: '速攻流 ⚡', min: 2 },
    { skills: ['hp_regen', 'shield', 'max_hp', 'lifesteal'], name: '坦克流 🛡', min: 2 },
    { skills: ['fire_trail', 'explosive', 'chain_lightning'], name: '爆破流 💥', min: 2 },
    { skills: ['move_speed', 'frost_aura', 'xp_magnet'], name: '效率流 🏃', min: 2 },
    { skills: ['thorns_aura', 'shield', 'hp_regen'], name: '铁壁流 🏰', min: 2 },
    { skills: ['orbit', 'explosive'], name: '环绕流 ☄', min: 2 }
  ];
  var buildNameSystem = { currentName: '', detected: false };
  function detectBuildName() {
    var best = '', bestCount = 0;
    for (var bi = 0; bi < BUILD_NAMES.length; bi++) {
      var b = BUILD_NAMES[bi], count = 0;
      for (var si = 0; si < b.skills.length; si++) {
        if (skillLevels[b.skills[si]]) count++;
      }
      if (count >= b.min && count > bestCount) { best = b.name; bestCount = count; }
    }
    buildNameSystem.currentName = best || '自由流派';
    buildNameSystem.detected = true;
  }

  // Character selection
  var selectedClass = 'warrior';
  var selectedBuild = []; // 5 skills chosen before game starts
  // [DATA-DRIVEN] CLASS_DEFS loaded from characters.json via RPGEngine
  // var CLASS_DEFS = {
  //   warrior: { name: '战士', icon: '🛡', hp: 200, maxHp: 200, attackDamage: 15, speed: 170, passive: '荆棘护甲: 反弹3伤害', thornsDamage: 3, color: '#f44' },
  //   mage:    { name: '法师', icon: '🔮', hp: 100, maxHp: 100, attackDamage: 35, speed: 190, passive: '奥术延伸: 射程+50%', rangeBonus: 0.5, color: '#a4f' },
  //   scout:   { name: '斥候', icon: '🏹', hp: 130, maxHp: 130, attackDamage: 20, speed: 260, passive: '闪避本能: 15%闪避', dodgeChance: 0.15, color: '#4f4' }
  // };
  var CLASS_DEFS = (function() {
    // Build CLASS_DEFS from RPGEngine character data for backward compatibility
    if (typeof RPGEngine !== 'undefined' && RPGEngine.getCharacterData) {
      var chars = RPGEngine.getCharacterData();
      var defs = {};
      for (var key in chars) {
        var c = chars[key];
        var passiveEffect = c.passive.effect || {};
        defs[key] = {
          name: c.name, icon: c.icon, hp: c.baseHP, maxHp: c.baseHP,
          baseHP: c.baseHP, baseATK: c.baseATK, baseSpeed: c.baseSpeed,
          attackDamage: c.baseATK, speed: c.baseSpeed,
          passive: c.passive.name + ': ' + c.passive.description,
          thornsDamage: passiveEffect.thornsDamage || 0,
          rangeBonus: passiveEffect.rangeBonus || 0,
          dodgeChance: passiveEffect.dodgeChance || 0,
          color: c.color,
          initialAttributes: c.initialAttributes,
          growthCoefficients: c.growthCoefficients,
          availableSkills: c.availableSkills || []
        };
      }
      if (Object.keys(defs).length > 0) return defs;
    }
    // Fallback if RPGEngine not available or data not loaded
    return {
      warrior: { name: '战士', icon: '🛡', hp: 220, maxHp: 220, baseHP: 220, baseATK: 22, baseSpeed: 170, attackDamage: 22, speed: 170, passive: '荆棘护甲 + 首战狂怒: 前 60s 攻速+25%', thornsDamage: 4, color: '#f44', initialAttributes: {INT:2,STR:8,AGI:4,STA:6}, availableSkills: [] },
      mage:    { name: '法师', icon: '🔮', hp: 100, maxHp: 100, baseHP: 100, baseATK: 35, baseSpeed: 190, attackDamage: 35, speed: 190, passive: '奥术延伸: 射程+50%', rangeBonus: 0.5, color: '#a4f', initialAttributes: {INT:10,STR:2,AGI:4,STA:4}, availableSkills: [] },
      scout:   { name: '斥候', icon: '🏹', hp: 165, maxHp: 165, baseHP: 165, baseATK: 20, baseSpeed: 260, attackDamage: 20, speed: 260, passive: '闪避 15% + 速射: 攻速 -20% 冷却', dodgeChance: 0.15, color: '#4f4', initialAttributes: {INT:3,STR:3,AGI:9,STA:5}, availableSkills: [] },
      // R5n F2 — 新职业 刺客 Assassin
      //   瞬移: 闪避键改为 260px 短距 teleport, 3s cd
      //   背刺: 攻击目标面向相反方向(夹角 > 120°)时 ×2 伤害
      //   开局隐身 3s: bots 无法锁定玩家 (_invisibleUntil)
      assassin:{ name: '刺客', icon: '🗡', hp: 140, maxHp: 140, baseHP: 140, baseATK: 18, baseSpeed: 220, attackDamage: 18, speed: 220, passive: '瞬移+背刺×2+隐身3s · 仅单排', dodgeChance: 0.10, color: '#8c4', initialAttributes: {INT:4,STR:5,AGI:8,STA:4}, availableSkills: [], soloOnly: true },
      // R5v F3 — 新职业 治疗者 Healer (skeleton, solo-only like assassin)
      //   heal-aura passive: 每 s 自疗 1.5 HP + 半径 200 内盟友 +0.8 HP/s(team 模式)
      //   R5x F2: HP 200→250。R5y: atk 10→12 (smoke pass / 矩阵 fail
      //   — smoke 不可靠警示)。R5z: 同调 HP 250→280 + atk 12→14,
      //   4 局矩阵自测验收
      healer:  { name: '治疗者', icon: '✚', hp: 280, maxHp: 280, baseHP: 280, baseATK: 14, baseSpeed: 195, attackDamage: 14, speed: 195, passive: '治疗光环 + 自疗 · 仅单排', color: '#dfeacc', initialAttributes: {INT:7,STR:2,AGI:3,STA:8}, availableSkills: [], soloOnly: true }
    };
  })();

  // Load character data from server API to get availableSkills (async, fills CLASS_DEFS)
  (function() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/editor/characters', true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          var chars = JSON.parse(xhr.responseText);
          for (var key in chars) {
            var c = chars[key];
            if (CLASS_DEFS[key]) {
              CLASS_DEFS[key].availableSkills = c.availableSkills || [];
              // Also update stats if they were from fallback
              if (c.baseHP) { CLASS_DEFS[key].hp = c.baseHP; CLASS_DEFS[key].maxHp = c.baseHP; CLASS_DEFS[key].baseHP = c.baseHP; }
              if (c.baseATK) { CLASS_DEFS[key].attackDamage = c.baseATK; CLASS_DEFS[key].baseATK = c.baseATK; }
              if (c.baseSpeed) { CLASS_DEFS[key].speed = c.baseSpeed; CLASS_DEFS[key].baseSpeed = c.baseSpeed; }
              if (c.initialAttributes) CLASS_DEFS[key].initialAttributes = c.initialAttributes;
              if (c.growthCoefficients) CLASS_DEFS[key].growthCoefficients = c.growthCoefficients;
              if (c.color) CLASS_DEFS[key].color = c.color;
              if (c.icon) CLASS_DEFS[key].icon = c.icon;
              if (c.name) CLASS_DEFS[key].name = c.name;
              if (c.passive) CLASS_DEFS[key].passive = c.passive.name + ': ' + c.passive.description;
            }
          }
        }
      };
      xhr.send();
    } catch(e) {}
  })();

  // Achievements
  var unlockedAchievements = {};
  var achievementQueue = []; // popups to show
  var ACHIEVEMENT_DEFS = [
    { id: 'first_blood', name: '初次猎杀', desc: '击杀第1个敌人', check: function() { return kills >= 1; }, goldReward: 10 },
    { id: 'kill_50', name: '半百斩', desc: '单局击杀50个敌人', check: function() { return kills >= 50; }, goldReward: 30 },
    { id: 'kill_100', name: '百人斩', desc: '单局击杀100个敌人', check: function() { return kills >= 100; }, goldReward: 80 },
    { id: 'wave_5', name: '第5波', desc: '到达第5波', check: function() { return wave >= 5; }, goldReward: 20 },
    { id: 'wave_10', name: '第10波', desc: '到达第10波', check: function() { return wave >= 10; }, goldReward: 50 },
    { id: 'streak_10', name: '10连杀', desc: '达成10连杀', check: function() { return maxStreak >= 10; }, goldReward: 15 },
    { id: 'streak_25', name: '25连杀', desc: '达成25连杀', check: function() { return maxStreak >= 25; }, goldReward: 40 },
    { id: 'lv5', name: '成长之路', desc: '达到5级', check: function() { return playerLevel >= 5; }, goldReward: 15 },
    { id: 'lv10', name: '技能大师', desc: '达到10级', check: function() { return playerLevel >= 10; }, goldReward: 50 },
    { id: 'survive_60', name: '一分钟生存者', desc: '存活超过60秒', check: function() { return gameTime >= 60; }, goldReward: 25 },
    { id: 'survive_180', name: '三分钟铁人', desc: '存活超过180秒', check: function() { return gameTime >= 180; }, goldReward: 100 },
    { id: 'kill_200', name: '双百斩', desc: '单局击杀200个敌人', check: function() { return kills >= 200; }, goldReward: 150 },
    { id: 'pvp_kill', name: '玩家猎手', desc: '击杀1名敌方玩家', check: function() { return player && player.kills >= 1; }, goldReward: 30 },
    { id: 'streak_50', name: '50连杀', desc: '达成50连杀', check: function() { return maxStreak >= 50; }, goldReward: 80 },
    { id: 'wave_15', name: '第15波', desc: '到达第15波', check: function() { return wave >= 15; }, goldReward: 100 },
    { id: 'full_hp', name: '无伤通关', desc: '到达第5波且满血', check: function() { return wave >= 5 && player && player.hp >= player.maxHp; }, goldReward: 60 }
  ];

  // Death tips for encouraging retry
  var TIPS = [
    '散射+穿透 满级可进化为「弹幕地狱」!',
    '低血量时进入Fury模式, 攻击力+50%!',
    '荆棘光环+护盾 进化为「铁壁堡垒」!',
    '宝藏哥布林出现时优先击杀, 金币丰厚!',
    '移速+时间扭曲 进化为「疾速恶魔」!',
    '升级时可花25金币重摇技能!',
    '法师职业攻击力最高, 射程+50%!',
    '斥候职业有15%闪避率, 适合冒险!',
    '存活超过60秒解锁「一分钟生存者」成就!',
    '火焰轨迹+暴击 进化为「地狱火焰」!'
  ];
  var deathTip = '';
  var deathCause = ''; // Track what killed the player
  var lastDamageSource = ''; // 'enemy', 'player:Name', 'storm', 'boss'

  // Skill evolution: when two skills reach level 3, they fuse into an ultimate
  var EVOLUTION_RECIPES = [
    { a: 'scatter', b: 'pierce', result: 'bullet_hell', name: '弹幕地狱', icon: '🌀', desc: '穿透+散射=无限弹幕风暴', color: '#f0f' },
    { a: 'chain_lightning', b: 'frost_aura', result: 'ice_storm', name: '冰雷风暴', icon: '🌩', desc: '冰冻+闪电=冰雷范围伤害', color: '#0ff' },
    { a: 'fire_trail', b: 'crit', result: 'inferno', name: '地狱火焰', icon: '🔥', desc: '火焰+暴击=持续暴击燃烧', color: '#f40' },
    { a: 'attack_up', b: 'attack_speed', result: 'berserker', name: '狂战士', icon: '⚔', desc: '攻击+攻速=狂暴模式', color: '#f00' },
    { a: 'lifesteal', b: 'hp_regen', result: 'immortal', name: '不死之身', icon: '💀', desc: '吸血+回血=极限续航', color: '#0f8' },
    { a: 'shield', b: 'thorns_aura', result: 'iron_fortress', name: '铁壁堡垒', icon: '🏰', desc: '护盾+荆棘=铜墙铁壁', color: '#88f' },
    { a: 'move_speed', b: 'time_warp', result: 'speed_demon', name: '疾速恶魔', icon: '💨', desc: '移速+时停=极速领域', color: '#0f0' },
    { a: 'orbit', b: 'explosive', result: 'armageddon', name: '末日审判', icon: '☄', desc: '环绕+爆炸=毁灭光环', color: '#f60' },
    { a: 'orbit', b: 'attack_up', result: 'death_spiral', name: '死亡旋涡', icon: '🌀', desc: '环绕+攻击=致命旋涡', color: '#f4a' },
    { a: 'thorns_aura', b: 'hp_regen', result: 'living_fortress', name: '活体堡垒', icon: '🏯', desc: '荆棘+回血=不灭堡垒', color: '#4a4' },
    { a: 'time_warp', b: 'attack_speed', result: 'chrono_burst', name: '时空爆发', icon: '⏱', desc: '时停+极速=时间风暴', color: '#c4f' },
    { a: 'xp_magnet', b: 'explosive', result: 'gravity_well', name: '引力黑洞', icon: '🕳', desc: '磁铁+爆炸=引力场吸取一切', color: '#808' },
    { a: 'max_hp', b: 'shield', result: 'titan', name: '泰坦之躯', icon: '🗿', desc: '血量+护盾=无敌巨人', color: '#a86' }
  ];
  var evolvedSkills = {};

  function startGame() {
    // Minimal local player placeholder (server will fill real values via snapshot)
    var cls = CLASS_DEFS[selectedClass] || CLASS_DEFS.warrior;
    player = {
      x: WORLD_W / 2, y: WORLD_H / 2, hp: cls.hp, maxHp: cls.maxHp, radius: 60, speed: cls.speed,
      attackDamage: cls.attackDamage, attackCooldown: 0.4, _timer: 0,
      projectileCount: 1, pierce: false, critChance: 0, slowAura: 0,
      hpRegen: 0, xpMagnetRange: 300, shieldActive: false, _shieldTimer: 0,
      lifesteal: 0, _fireDmg: 0, _explosiveDmg: 0, _chainCount: 0,
      thornsDamage: cls.thornsDamage || 0, dodgeChance: cls.dodgeChance || 0,
      rangeBonus: cls.rangeBonus || 0, playerClass: selectedClass,
      kills: 0, factionId: 0, name: (_currentPlayer && _currentPlayer.nickname) || 'Player 1', skinId: equippedSkin || 'default',
      facingAngle: 0
    };
    allPlayers = [player];
    // Solo = 8-way FFA, each player in a unique faction (0..7).
    // Team = 4v4, player + first 3 bots are faction 1, other 4 bots are faction 2.
    player.factionId = gameMode === 'team' ? 1 : 0;
    localPlayerId = 0;
    player.isLocal = true;
    player.isBot = false;
    player.alive = true;
    player.level = 1;

    // Reset rendering state
    entities = []; particles = []; floats = []; gems = []; coins = []; offlineSkillFx = [];
    skillPickups = []; eventPickups = []; meteorMarkers = [];
    bossSlainBanner = { active: false, timer: 0, duration: 1.8, name: '' };
    bossBuffChoice = { active: false, options: [], rects: [] };
    worldEvent = { active: false, kind: '', phase: 'idle', phaseTimer: 0, target: null, banner: '', timeLeft: 0, nextAt: 45 };
    rivalState = { botId: -1, killedBy: 0, nemesisId: -1 };
    synergyBanner = { active: false, timer: 0, duration: 1.5, text: '', color: '#fff' };
    fireTrails = []; explosionAoe = [];
    groundHazards = []; safeZoneRadius = 500;
    enemyProjectiles = [];
    ultCharge = 0; ultReady = false; ultFlash = { active: false, timer: 0 };
    victoryState = { active: false, timer: 0 };
    victoryWin = false;
    deathCause = '';
    lastDamageSource = '';
    deathTip = '';
    _skillHintShown = false;
    _skillHintTimer = 0;
    damageIndicators = [];
    bossWarning = { active: false, timer: 0, duration: 2.5 };
    waveBanner = waveBanner || { active: false, timer: 0, text: '', color: '#fff' };
    playerTrail = [];
    wave = 0; gameTime = 0; kills = 0; farmKills = 0;
    killStreak = 0; maxStreak = 0;
    _goldAtGameStart = gold;
    _lastEarnedGold = 0;
    _rewardsFinalized = false;
    unlockedAchievements = {};
    playerLevel = 1; playerXP = 0; xpToNextLevel = 30;
    skillLevels = {}; ownedSkills = [];
    skillChoices = [];
    pendingSkillPoints = 0;
    skillCardAnim = { timer: 0, duration: 0.4, active: false };
    powerSurgeEffect = { active: false, timer: 0, duration: 0.5 };
    colorThemeSync = { projColor: '#4af', particleColor: '#88f' };
    levelUpFlash = levelUpFlash || { active: false, timer: 0 };
    biomeTransition = biomeTransition || { active: false, timer: 0 };
    powerSpike = { active: false, text: '', timer: 0 };
    initBgParticles();
    initEnvDecoration();
    loadMapZonesAndTerrain(currentMap);
    // Fetch full map data from server for zones and terrain
    var _mapId = (currentMap && currentMap.id) || 'green_plains';
    _apiRequest('GET', '/api/editor/maps/' + _mapId, null, function(err, fullMapData) {
      if (!err && fullMapData) {
        loadMapZonesAndTerrain(fullMapData);
        // Skip WORLD_W/H override when a handcrafted static map drives the world —
        // the legacy server map (e.g. green_plains 1200x1200) otherwise clobbers
        // the 2560x2560 world set by startOfflineDemo.
        if (!MAP_DATA) {
          if (fullMapData.width) WORLD_W = fullMapData.width;
          if (fullMapData.height) WORLD_H = fullMapData.height;
        }
      }
    });
    networkInputTimer = 0;

    // Connect to server — create room, start game, then connect WebSocket
    state = 'connecting';
    var playerId = (_currentPlayer && _currentPlayer.id) || ('player_' + Date.now());
    var nickname = (_currentPlayer && _currentPlayer.nickname) || 'Player';
    var mapId = (currentMap && currentMap.id) || 'green_plains';

    // Step 1: Create room via REST API (with character type)
    _apiRequest('POST', '/api/rooms', { hostId: playerId, mode: gameMode, characterType: selectedClass || 'warrior' }, function(err, room) {
      if (err) {
        // Fallback: try direct WebSocket connection with generated roomId
        _connectWebSocket(playerId, 'room_' + Date.now());
        return;
      }

      var roomId = room.id;

      // Step 2: Set character type and map
      _apiRequest('PUT', '/api/rooms/' + roomId + '/map', { mapId: mapId }, function() {
        // Step 3: Set ready
        _apiRequest('POST', '/api/rooms/' + roomId + '/ready', { playerId: playerId, ready: true }, function() {
          // Step 4: Start the game (server creates GameSimulation + fills bots)
          _apiRequest('POST', '/api/rooms/' + roomId + '/start', null, function(startErr, session) {
            if (startErr) {
              state = 'menu';
              return;
            }
            // Step 5: Connect WebSocket
            _connectWebSocket(playerId, roomId);
          });
        });
      });
    });
  }

  // === OFFLINE DEMO MODE ===
  var offlineMode = false;
  var offlineEnemies = [];
  var offlineSpawnTimer = 0;
  var offlineBots = [];

  // === Wave spawn system (R6-respawn F2 — continuous stream, survivor.io style) ===
  var _waveSpawnPoints = [];
  var _waveState = {
    wave: 0,            // increments every 60s for difficulty + achievement gates
    nextSpawnTimer: 0
  };
  function _initSpawnPoints() {
    _waveSpawnPoints = [];
    if (MAP_DATA && MAP_DATA.zombieEntries && MAP_DATA.zombieEntries.length) {
      for (var zi = 0; zi < MAP_DATA.zombieEntries.length; zi++) {
        var ze = MAP_DATA.zombieEntries[zi];
        _waveSpawnPoints.push({
          x: ze.x,
          y: ze.y,
          name: ze.name || ze.kind || '尸群入口',
          source: 'editor'
        });
      }
      return;
    }
    var margin = 220;
    var cx = WORLD_W / 2, cy = WORLD_H / 2;
    var pts = [
      { x: margin,          y: margin,          name: '西北营地' },
      { x: cx,              y: margin,          name: '北方营地' },
      { x: WORLD_W - margin, y: margin,          name: '东北营地' },
      { x: WORLD_W - margin, y: cy,              name: '东方营地' },
      { x: WORLD_W - margin, y: WORLD_H - margin, name: '东南营地' },
      { x: cx,              y: WORLD_H - margin, name: '南方营地' },
      { x: margin,          y: WORLD_H - margin, name: '西南营地' },
      { x: margin,          y: cy,              name: '西方营地' }
    ];
    for (var i = 0; i < pts.length; i++) _waveSpawnPoints.push(pts[i]);
  }
  // R6-respawn F1 — player-centric ring spawn (250-450px around player).
  // 旧 8-zone fixed picker 把怪散在玩家半径外，n300 全程 0；改成跟随玩家。
  function _ringSpawnPoint() {
    if (_waveSpawnPoints.length && Math.random() < 0.35) {
      var best = null;
      var bestScore = 1e12;
      for (var i = 0; i < _waveSpawnPoints.length; i++) {
        var ep = _waveSpawnPoints[i];
        var dx0 = ep.x - player.x, dy0 = ep.y - player.y;
        var d0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
        var score = Math.abs(d0 - 420) + Math.random() * 180;
        if (score < bestScore) { best = ep; bestScore = score; }
      }
      if (best) {
        window._editorEntrySpawnFired = (window._editorEntrySpawnFired || 0) + 1;
        return { x: best.x, y: best.y };
      }
    }
    var R_MIN = 250, R_MAX = 450;
    var ang = Math.random() * Math.PI * 2;
    var r = R_MIN + Math.random() * (R_MAX - R_MIN);
    var ex = player.x + Math.cos(ang) * r;
    var ey = player.y + Math.sin(ang) * r;
    var pt = {
      x: Math.max(30, Math.min(WORLD_W - 30, ex)),
      y: Math.max(30, Math.min(WORLD_H - 30, ey))
    };
    window._ringSpawnFired = (window._ringSpawnFired || 0) + 1;
    return pt;
  }
  // R6-respawn F2 — spawn rate ramps with gameTime (no wave gating).
  function _spawnRatePerSec(t) {
    if (t < 60) return 0.5;
    if (t < 180) return 1.0;
    return 1.5;
  }
  function _enemyTypePoolFor(w) {
    if (w < 3) return ['normal', 'normal', 'swarm'];
    if (w < 5) return ['normal', 'fast', 'swarm', 'ranged'];
    if (w < 10) return ['normal', 'fast', 'tank', 'ranged', 'swarm'];
    return ['fast', 'tank', 'ranged', 'swarm', 'normal', 'tank', 'ranged'];
  }
  function updateOfflineWaveSystem(dt) {
    if (!offlineMode) return;
    window._wsTickCount = (window._wsTickCount || 0) + 1;
    var t = gameTime || 0;
    // Wave counter ticks every 60s — drives type-pool ramp + boss spawn + achievement gates.
    var newWave = 1 + Math.floor(t / 60);
    if (newWave !== _waveState.wave) {
      var prev = _waveState.wave;
      _waveState.wave = newWave;
      wave = newWave;
      waveBanner.active = true; waveBanner.timer = 1.0;
      if (prev > 0) {
        // Boss on every wave transition after wave 1 — ring-spawned + banner.
        var spB = _ringSpawnPoint();
        spawnOfflineEnemy('miniBoss', spB.x, spB.y);
        if (typeof emit === 'function') emit(spB.x, spB.y, '#f80', 14, 100);
        waveBanner.text = '⚠ BOSS 第' + newWave + '波 ⚠';
        waveBanner.color = '#fa0';
        if (typeof bossWarning !== 'undefined') { bossWarning.active = true; bossWarning.timer = 2.5; }
        if (typeof screenShake === 'function') screenShake(5, 240);
        if (typeof playSound === 'function') playSound('boss_warn');
      } else {
        waveBanner.text = '— 第' + newWave + '波 —';
        waveBanner.color = '#fff';
        if (typeof playSound === 'function') playSound('wave_start');
      }
    }
    // Continuous mob spawn at rate ramped by gameTime.
    _waveState.nextSpawnTimer -= dt;
    if (_waveState.nextSpawnTimer <= 0) {
      var pool = _enemyTypePoolFor(_waveState.wave);
      var type = pool[Math.floor(Math.random() * pool.length)];
      var sp = _ringSpawnPoint();
      spawnOfflineEnemy(type, sp.x, sp.y);
      if (typeof emit === 'function') emit(sp.x, sp.y, '#f66', 10, 80);
      _waveState.nextSpawnTimer += 1 / _spawnRatePerSec(t);
    }
  }
  // Draw fixed spawn points as glowing rune circles (world-space via camera offset)
  function drawSpawnPointMarkers(camXw, camYw) {
    if (!offlineMode || !_waveSpawnPoints.length) return;
    for (var i = 0; i < _waveSpawnPoints.length; i++) {
      var p = _waveSpawnPoints[i];
      var sx = p.x - camXw, sy = p.y - camYw;
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      var pulse = 0.5 + 0.5 * Math.sin((gameTime || 0) * 3 + i * 0.7);
      // Dark base disc
      ctx.fillStyle = 'rgba(40,0,0,0.5)';
      ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
      // Pulsing outer ring
      ctx.strokeStyle = 'rgba(255,80,60,' + (0.35 + pulse * 0.35) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 22 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
      // Rune cross
      ctx.strokeStyle = 'rgba(255,140,100,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 14, sy); ctx.lineTo(sx + 14, sy);
      ctx.moveTo(sx, sy - 14); ctx.lineTo(sx, sy + 14);
      ctx.stroke();
      // Core glow
      ctx.fillStyle = 'rgba(255,80,40,' + (0.55 + pulse * 0.35) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 5 + pulse * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  // === BR tactical structures — buildings, walls, crates (PUBG-inspired) ===
  var _brStructures = []; // { type, x, y, w, h, angle, color }
  function _generateBRStructures() {
    _brStructures = [];
    // Handcrafted map path: take structures verbatim from MAP_DATA.
    if (MAP_DATA && MAP_DATA.structures && MAP_DATA.structures.length) {
      // No-obstacle ring around central landmark (Leo 2026-04-21): any
      // mountain/wall/building/crate whose center falls within 300px of the
      // map center is filtered out so the altar stays visible from afar.
      var _anchorX = (MAP_DATA.stormCenter && MAP_DATA.stormCenter.x) || (MAP_DATA.width / 2);
      var _anchorY = (MAP_DATA.stormCenter && MAP_DATA.stormCenter.y) || (MAP_DATA.height / 2);
      var _ringR2 = 300 * 300;
      // ldoe-overhaul-02a: 5 LDOE landmark kinds collapse to type='landmark' +
      // sprite=kind so existing render branch (s.type==='landmark' + drawLdoeLandmark)
      // keeps working. JSON's kind field stays as 'fence' / 'gas_station' / etc.
      // so Director's verify command (s.kind === 'fence') returns ≥3.
      var _ldoeKinds = { fence: 1, gas_station: 1, wreck_car: 1, barricade: 1, debris: 1 };
      var _keepKinds = { landmark: 1, bridge: 1, fence: 1, gas_station: 1, wreck_car: 1, barricade: 1, debris: 1 };
      for (var msi = 0; msi < MAP_DATA.structures.length; msi++) {
        var ms = MAP_DATA.structures[msi];
        var kind = ms.kind || ms.type || 'building';
        var mcx = ms.x + ms.w / 2, mcy = ms.y + ms.h / 2;
        var _dx = mcx - _anchorX, _dy = mcy - _anchorY;
        if (!_keepKinds[kind] && _dx * _dx + _dy * _dy < _ringR2) continue;
        var _isLdoe = !!_ldoeKinds[kind];
        var st = {
          type: _isLdoe ? 'landmark' : kind,
          x: ms.x, y: ms.y, w: ms.w, h: ms.h,
          color: ms.color || '#555565',
          label: ms.label || null,
          sprite: _isLdoe ? kind : (ms.sprite || null),
          anchorX: ms.anchorX != null ? ms.anchorX : null,
          anchorY: ms.anchorY != null ? ms.anchorY : null
        };
        _brStructures.push(st);
      }
      // Collision: landmarks/mountains/buildings/walls/crates/sandbags block;
      // bridges are passable (skipped).
      for (var csi = 0; csi < _brStructures.length; csi++) {
        var _st0 = _brStructures[csi];
        if (_st0.type === 'bridge') continue;
        var _stcx0 = _st0.x + _st0.w / 2;
        var _stcy0 = _st0.y + _st0.h / 2;
        var _str0 = Math.max(_st0.w, _st0.h) / 2;
        terrainObstacles.push({
          x: _stcx0, y: _stcy0, radius: _str0,
          type: 'rock',
          _rect: { x: _st0.x, y: _st0.y, width: _st0.w, height: _st0.h },
          _brStruct: _st0
        });
      }
      return;
    }
    var _rng = function(seed) { seed = ((seed | 0) * 1103515245 + 12345) & 0x7fffffff; return seed; };
    var _seed = 7654;
    function _rnd() { _seed = _rng(_seed); return (_seed & 0xffff) / 0xffff; }
    // Central compound — large building cluster at map center
    var cx = WORLD_W / 2, cy = WORLD_H / 2;
    _brStructures.push({ type: 'building', x: cx - 100, y: cy - 80, w: 200, h: 160, color: '#555565' });
    _brStructures.push({ type: 'wall', x: cx - 130, y: cy - 100, w: 14, h: 200, color: '#666675' });
    _brStructures.push({ type: 'wall', x: cx + 116, y: cy - 65, w: 14, h: 130, color: '#666675' });
    _brStructures.push({ type: 'crate', x: cx + 65, y: cy + 90, w: 32, h: 32, color: '#886633' });
    _brStructures.push({ type: 'crate', x: cx - 70, y: cy + 85, w: 28, h: 28, color: '#886633' });
    // 4 corner outposts
    var _corners = [
      [WORLD_W * 0.2, WORLD_H * 0.2], [WORLD_W * 0.8, WORLD_H * 0.2],
      [WORLD_W * 0.2, WORLD_H * 0.8], [WORLD_W * 0.8, WORLD_H * 0.8]
    ];
    for (var ci = 0; ci < _corners.length; ci++) {
      var _ox = _corners[ci][0], _oy = _corners[ci][1];
      _brStructures.push({ type: 'building', x: _ox - 60, y: _oy - 50, w: 120, h: 100, color: '#505058' });
      _brStructures.push({ type: 'wall', x: _ox + 70, y: _oy - 25, w: 12, h: 80, color: '#606068' });
      _brStructures.push({ type: 'crate', x: _ox - 20 + _rnd() * 20, y: _oy + 55, w: 28, h: 28, color: '#886633' });
    }
    // Scattered shelters between corners
    var _shelterCount = 12;
    for (var si = 0; si < _shelterCount; si++) {
      var sx = 120 + _rnd() * (WORLD_W - 240);
      var sy = 120 + _rnd() * (WORLD_H - 240);
      // Avoid map center compound (skip if too close)
      if (Math.abs(sx - cx) < 220 && Math.abs(sy - cy) < 190) continue;
      var sType = _rnd();
      if (sType < 0.35) {
        // L-shaped wall
        var lw = 70 + _rnd() * 60, lh = 12;
        _brStructures.push({ type: 'wall', x: sx, y: sy, w: lw, h: lh, color: '#606870' });
        _brStructures.push({ type: 'wall', x: sx, y: sy, w: lh, h: lw * 0.7, color: '#606870' });
      } else if (sType < 0.6) {
        // Small shack
        var bw = 55 + _rnd() * 50, bh = 45 + _rnd() * 40;
        _brStructures.push({ type: 'building', x: sx, y: sy, w: bw, h: bh, color: '#4a4a58' });
      } else if (sType < 0.8) {
        // Crate cluster (2-3 crates)
        for (var ci2 = 0; ci2 < 2 + Math.floor(_rnd() * 2); ci2++) {
          var csz = 24 + _rnd() * 14;
          _brStructures.push({ type: 'crate', x: sx + ci2 * (csz + 6), y: sy + _rnd() * 10, w: csz, h: csz, color: '#886633' });
        }
      } else {
        // Sandbag barricade (short rounded wall)
        _brStructures.push({ type: 'sandbag', x: sx, y: sy, w: 75 + _rnd() * 40, h: 16, color: '#8a7a5a' });
      }
    }
    // Add all structures to terrainObstacles for collision
    for (var sti = 0; sti < _brStructures.length; sti++) {
      var _st = _brStructures[sti];
      var _stcx = _st.x + _st.w / 2;
      var _stcy = _st.y + _st.h / 2;
      var _str = Math.max(_st.w, _st.h) / 2;
      terrainObstacles.push({
        x: _stcx, y: _stcy, radius: _str,
        type: 'rock', // collision type = blocking
        _rect: { x: _st.x, y: _st.y, width: _st.w, height: _st.h },
        _brStruct: _st // reference for rendering
      });
    }
  }
  // Landmark aura (Leo 2026-04-21): two-layer halo around the map center so
  // the central altar reads as the world's focal point. A large golden radial
  // gradient paints in world space, then a proximity-based screen-space white
  // vignette amps brightness as the player closes in (within 500px).
  function drawLandmarkAura(ctx2, camX2, camY2) {
    if (!MAP_DATA) return;
    var acx = (MAP_DATA.stormCenter && MAP_DATA.stormCenter.x) || WORLD_W / 2;
    var acy = (MAP_DATA.stormCenter && MAP_DATA.stormCenter.y) || WORLD_H / 2;
    // Screen-space coords for culling only; canvas is already camera-translated.
    var _sx = acx - camX2, _sy = acy - camY2;
    var HALO_R = 420;
    if (_sx + HALO_R > 0 && _sx - HALO_R < W && _sy + HALO_R > 0 && _sy - HALO_R < H) {
      var pulse = 0.85 + 0.15 * Math.sin((gameTime || 0) * 1.2);
      var grad = ctx2.createRadialGradient(acx, acy, 24, acx, acy, HALO_R);
      grad.addColorStop(0,   'rgba(255,220,140,' + (0.55 * pulse) + ')');
      grad.addColorStop(0.35, 'rgba(255,200,120,' + (0.28 * pulse) + ')');
      grad.addColorStop(1,   'rgba(255,200,120,0)');
      ctx2.save();
      ctx2.globalCompositeOperation = 'lighter';
      ctx2.fillStyle = grad;
      ctx2.beginPath(); ctx2.arc(acx, acy, HALO_R, 0, Math.PI * 2); ctx2.fill();
      ctx2.restore();
    }
    // Proximity brightness boost — fires when player is within 500px. Draw in
    // screen space by temporarily resetting the camera translate.
    if (typeof player !== 'undefined' && player && player.alive) {
      var dx = player.x - acx, dy = player.y - acy;
      var d2 = dx * dx + dy * dy;
      if (d2 < 500 * 500) {
        var t = 1 - Math.sqrt(d2) / 500;
        ctx2.save();
        ctx2.setTransform(1, 0, 0, 1, 0, 0);
        ctx2.globalCompositeOperation = 'lighter';
        ctx2.fillStyle = 'rgba(255,240,200,' + (0.22 * t) + ')';
        ctx2.fillRect(0, 0, W, H);
        ctx2.restore();
      }
    }
    // R5h+R5i+R5j: per-hit golden flash. Early-return when queue is empty
    // (the common case once altar is dead). Normal: 350ms / 0.7→1.3 scale.
    // Big (every 3rd hit + HP threshold): 500ms / 0.5→1.5 scale.
    if (R5H_FX.activeFlashes.length > 0) {
      for (var _fi = R5H_FX.activeFlashes.length - 1; _fi >= 0; _fi--) {
        var _fx = R5H_FX.activeFlashes[_fi];
        _fx.t += 0.016;
        var _fp = _fx.t / _fx.dur;
        if (_fp >= 1) { R5H_FX.activeFlashes.splice(_fi, 1); continue; }
        var _fEntry = _fx.big ? R5H_FX.impactFlashBig : R5H_FX.impactFlash;
        var _flashSrc = _fEntry.canvas || (_fEntry.ready ? _fEntry.img : null);
        if (!_flashSrc) continue;
        var _fScale = _fx.big ? (0.5 + 1.0 * _fp) : (0.7 + 0.6 * _fp);
        var _fSz = _fEntry.size * _fScale;
        ctx2.save();
        ctx2.globalAlpha = 1 - _fp;
        ctx2.globalCompositeOperation = 'lighter';
        ctx2.drawImage(_flashSrc, _fx.x - _fSz / 2, _fx.y - _fSz / 2, _fSz, _fSz);
        ctx2.restore();
      }
    }
    // Round 5b T2: altar shatter SVG plays out over its dur
    if (ALTAR_FX.activeShatter) {
      var ash = ALTAR_FX.activeShatter;
      ash.t += (typeof gameTime !== 'undefined') ? 0.016 : 0.016;
      var p = Math.min(1, ash.t / ash.dur);
      var scale = 0.4 + 1.6 * p;
      var alpha = 1 - p * 0.7;
      var sz = ALTAR_FX.shatter.size * scale;
      if (ALTAR_FX.shatter.ready) {
        ctx2.save();
        ctx2.globalAlpha = alpha;
        ctx2.drawImage(ALTAR_FX.shatter.img, ash.x - sz / 2, ash.y - sz / 2, sz, sz);
        ctx2.restore();
      }
      if (p >= 1) ALTAR_FX.activeShatter = null;
    }
  }

  // Draw BR structures (called from drawTerrain area)
  function drawBRStructures(ctx2, camX2, camY2) {
    // The canvas is already translated by (-cameraX, -cameraY) in drawGame,
    // so draw ALL shapes in world coords (s.x/s.y). sx/sy here are screen-space
    // only for viewport culling — do NOT use them as draw coordinates.
    for (var i = 0; i < _brStructures.length; i++) {
      var s = _brStructures[i];
      var _sxCull = s.x - camX2, _syCull = s.y - camY2;
      if (_sxCull + s.w < -10 || _sxCull > W + 10 || _syCull + s.h < -10 || _syCull > H + 10) continue;
      var sx = s.x, sy = s.y;
      if (window.KOS_RENDER && typeof window.KOS_RENDER.drawWorldProp === 'function' && window.KOS_RENDER.drawWorldProp(ctx2, sx, sy, s.w, s.h, s.sprite || s.type, s)) continue;
      if (s.type === 'building') {
        // Building — base + roof + shadow
        ctx2.fillStyle = 'rgba(0,0,0,0.3)';
        ctx2.fillRect(sx + 4, sy + 4, s.w, s.h);
        // Walls
        ctx2.fillStyle = s.color;
        ctx2.fillRect(sx, sy, s.w, s.h);
        // Roof lines
        ctx2.strokeStyle = 'rgba(255,255,255,0.15)'; ctx2.lineWidth = 1;
        ctx2.beginPath();
        ctx2.moveTo(sx, sy + s.h / 2); ctx2.lineTo(sx + s.w / 2, sy - 4);
        ctx2.lineTo(sx + s.w, sy + s.h / 2);
        ctx2.stroke();
        // Window
        ctx2.fillStyle = 'rgba(100,160,220,0.3)';
        ctx2.fillRect(sx + s.w * 0.3, sy + s.h * 0.25, s.w * 0.2, s.h * 0.25);
        ctx2.fillRect(sx + s.w * 0.6, sy + s.h * 0.25, s.w * 0.2, s.h * 0.25);
        // Border
        ctx2.strokeStyle = 'rgba(0,0,0,0.5)'; ctx2.lineWidth = 1.5;
        ctx2.strokeRect(sx + 0.5, sy + 0.5, s.w - 1, s.h - 1);
      } else if (s.type === 'wall') {
        ctx2.fillStyle = 'rgba(0,0,0,0.25)';
        ctx2.fillRect(sx + 2, sy + 2, s.w, s.h);
        ctx2.fillStyle = s.color;
        ctx2.fillRect(sx, sy, s.w, s.h);
        // Bricks pattern
        ctx2.strokeStyle = 'rgba(0,0,0,0.2)'; ctx2.lineWidth = 0.5;
        var brickH = 6;
        for (var by2 = 0; by2 < s.h; by2 += brickH) {
          ctx2.beginPath(); ctx2.moveTo(sx, sy + by2); ctx2.lineTo(sx + s.w, sy + by2); ctx2.stroke();
          var offset = (Math.floor(by2 / brickH) % 2) * 8;
          for (var bx2 = offset; bx2 < s.w; bx2 += 16) {
            ctx2.beginPath(); ctx2.moveTo(sx + bx2, sy + by2); ctx2.lineTo(sx + bx2, sy + Math.min(by2 + brickH, s.h)); ctx2.stroke();
          }
        }
        ctx2.strokeStyle = 'rgba(0,0,0,0.4)'; ctx2.lineWidth = 1;
        ctx2.strokeRect(sx, sy, s.w, s.h);
      } else if (s.type === 'crate') {
        ctx2.fillStyle = 'rgba(0,0,0,0.25)';
        ctx2.fillRect(sx + 2, sy + 2, s.w, s.h);
        ctx2.fillStyle = s.color;
        ctx2.fillRect(sx, sy, s.w, s.h);
        // Cross planks
        ctx2.strokeStyle = '#6a5422'; ctx2.lineWidth = 1.5;
        ctx2.beginPath(); ctx2.moveTo(sx + 2, sy + 2); ctx2.lineTo(sx + s.w - 2, sy + s.h - 2); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(sx + s.w - 2, sy + 2); ctx2.lineTo(sx + 2, sy + s.h - 2); ctx2.stroke();
        // Metallic band
        ctx2.strokeStyle = '#aaa'; ctx2.lineWidth = 1;
        ctx2.strokeRect(sx + 2, sy + 2, s.w - 4, s.h - 4);
        ctx2.strokeRect(sx, sy, s.w, s.h);
      } else if (s.type === 'sandbag') {
        ctx2.fillStyle = 'rgba(0,0,0,0.2)';
        ctx2.fillRect(sx + 2, sy + 2, s.w, s.h);
        // Sandbag lumps
        var sCount = Math.floor(s.w / 12);
        for (var _sbi = 0; _sbi < sCount; _sbi++) {
          var _sbx = sx + _sbi * 12 + 2;
          ctx2.fillStyle = s.color;
          ctx2.beginPath(); ctx2.ellipse(_sbx + 6, sy + s.h / 2, 6, s.h / 2, 0, 0, Math.PI * 2); ctx2.fill();
          ctx2.strokeStyle = 'rgba(0,0,0,0.3)'; ctx2.lineWidth = 0.5;
          ctx2.stroke();
        }
      } else if (s.type === 'bridge') {
        // Wooden bridge — planks + railings. Passable.
        ctx2.fillStyle = 'rgba(0,0,0,0.35)';
        ctx2.fillRect(sx + 3, sy + 3, s.w, s.h);
        ctx2.fillStyle = s.color || '#8a6a3a';
        ctx2.fillRect(sx, sy, s.w, s.h);
        ctx2.strokeStyle = '#5c3e1a'; ctx2.lineWidth = 1.5;
        var planks = Math.max(3, Math.floor(s.w / 24));
        for (var pk = 0; pk <= planks; pk++) {
          var px = sx + pk * (s.w / planks);
          ctx2.beginPath(); ctx2.moveTo(px, sy); ctx2.lineTo(px, sy + s.h); ctx2.stroke();
        }
        ctx2.strokeStyle = '#4a2e12'; ctx2.lineWidth = 3;
        ctx2.beginPath(); ctx2.moveTo(sx, sy + 2); ctx2.lineTo(sx + s.w, sy + 2); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(sx, sy + s.h - 2); ctx2.lineTo(sx + s.w, sy + s.h - 2); ctx2.stroke();
      } else if (s.type === 'mountain') {
        // Impassable rocky ridge
        var mcx = sx + s.w / 2, mcy = sy + s.h / 2;
        ctx2.fillStyle = 'rgba(0,0,0,0.4)';
        ctx2.beginPath(); ctx2.ellipse(mcx + 4, mcy + 8, s.w * 0.48, s.h * 0.42, 0, 0, Math.PI * 2); ctx2.fill();
        var mgrad = ctx2.createLinearGradient(mcx, sy, mcx, sy + s.h);
        var base = s.color || '#8a8a90';
        mgrad.addColorStop(0, '#ffffff');
        mgrad.addColorStop(0.25, base);
        mgrad.addColorStop(1, '#3a3a42');
        ctx2.fillStyle = mgrad;
        ctx2.beginPath();
        ctx2.moveTo(sx, sy + s.h);
        ctx2.lineTo(sx + s.w * 0.3, sy + s.h * 0.2);
        ctx2.lineTo(sx + s.w * 0.55, sy + s.h * 0.5);
        ctx2.lineTo(sx + s.w * 0.8, sy + s.h * 0.15);
        ctx2.lineTo(sx + s.w, sy + s.h);
        ctx2.closePath();
        ctx2.fill();
        ctx2.strokeStyle = 'rgba(0,0,0,0.55)'; ctx2.lineWidth = 1.5;
        ctx2.stroke();
      } else if (s.type === 'landmark') {
        // ldoe-overhaul-01: 5 procedural LDOE landmarks; JSON sets sprite to ldoe kind
        var _lsk = s.sprite;
        if (_lsk === 'gas_station' || _lsk === 'wreck_car' || _lsk === 'barricade' || _lsk === 'fence' || _lsk === 'debris') {
          drawLdoeLandmark(ctx2, sx, sy, s.w, s.h, _lsk);
          if (s.label) {
            ctx2.font = 'bold 14px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
            ctx2.textAlign = 'center';
            ctx2.lineWidth = 3;
            ctx2.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx2.fillStyle = '#ffe8a0';
            ctx2.strokeText(s.label, sx + s.w / 2, sy - 6);
            ctx2.fillText(s.label, sx + s.w / 2, sy - 6);
            ctx2.textAlign = 'left';
          }
          continue;
        }
        var spr = s.sprite ? _getLandmarkSprite(s.sprite) : null;
        var _sprSrc = spr && spr.canvas ? spr.canvas : (spr && spr.ready ? spr.img : null);
        if (_sprSrc) {
          // ArtDesigner SVG path — drawImage in WORLD coords (canvas is already
          // translated by camera). Shadow ellipse at base centre.
          ctx2.fillStyle = 'rgba(0,0,0,0.35)';
          ctx2.beginPath();
          ctx2.ellipse(s.x + s.w / 2, s.y + s.h - 14, s.w * 0.4, 14, 0, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.drawImage(_sprSrc, s.x, s.y, s.w, s.h);
        } else {
          // Fallback — painted rect while sprite is still loading / absent.
          ctx2.fillStyle = 'rgba(0,0,0,0.45)';
          ctx2.fillRect(sx + 6, sy + 10, s.w, s.h);
          var lgrad = ctx2.createLinearGradient(sx, sy, sx, sy + s.h);
          var lbase = s.color || '#b8a060';
          lgrad.addColorStop(0, '#ffffff');
          lgrad.addColorStop(0.2, lbase);
          lgrad.addColorStop(1, '#1c1c24');
          ctx2.fillStyle = lgrad;
          ctx2.fillRect(sx, sy, s.w, s.h);
          ctx2.fillStyle = 'rgba(255,215,140,0.9)';
          ctx2.beginPath();
          ctx2.moveTo(sx, sy);
          ctx2.lineTo(sx + s.w / 2, sy - s.h * 0.18);
          ctx2.lineTo(sx + s.w, sy);
          ctx2.closePath(); ctx2.fill();
          ctx2.strokeStyle = 'rgba(0,0,0,0.55)'; ctx2.lineWidth = 2;
          ctx2.strokeRect(sx, sy, s.w, s.h);
          ctx2.fillStyle = 'rgba(255,240,180,0.9)';
          for (var lw = 0; lw < 3; lw++) {
            ctx2.fillRect(sx + s.w * (0.2 + lw * 0.25), sy + s.h * 0.35, s.w * 0.12, s.h * 0.14);
          }
        }
        if (s.label) {
          ctx2.font = 'bold 14px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
          ctx2.textAlign = 'center';
          ctx2.lineWidth = 3;
          ctx2.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx2.fillStyle = '#ffe8a0';
          var _labelY = sy - 6;
          ctx2.strokeText(s.label, sx + s.w / 2, _labelY);
          ctx2.fillText(s.label, sx + s.w / 2, _labelY);
          ctx2.textAlign = 'left';
        }
      }
    }
  }

  function startOfflineDemo() {
    offlineMode = true;
    state = 'playing';
    player.skinId = equippedSkin || 'default';
    // R5n F2 + R5o F2 + R5p F2 — assassin opening 隐身.
    // arena/default: 3.0s (full identity — NOT shortened).
    // lane-3 only: 1.5s (lane chokes broke 3s flow).
    // R5p gates assassin out of team mode (R5p F1) so lane branch rarely hit,
    // but kept as defence-in-depth.
    if (selectedClass === 'assassin') {
      player._invisibleUntil = (MAP_DATA && MAP_DATA.layout === 'lane-3') ? 1.5 : 3.0;
    }
    // R5ab F2 — healer opening "holy shield": damage taken ×0.5 for first 5s
    // of the match so healer survives spawn scramble long enough for heal-aura
    // to kick in. Checked by _healerInitShieldMul at all player-damage sites.
    if (selectedClass === 'healer') {
      player._healerShieldUntil = 5;
    }
    // Hide the DOM "player-bar" (nickname/gold/rank/level) — canvas HUD
    // already shows those and the DOM bar was overlapping the "剩余 X 人"
    // capsule at top-center.
    var _pbar = document.getElementById('player-bar');
    if (_pbar) _pbar.style.display = 'none';

    // World = MAP_DATA.width/height if static map loaded, else screen * 2.
    // Safety: re-attempt sync fetch in case the async load is still in flight.
    if (!MAP_DATA && typeof _loadStaticMapSync === 'function') _loadStaticMapSync();
    if (MAP_DATA && MAP_DATA.width && MAP_DATA.height) {
      WORLD_W = MAP_DATA.width;
      WORLD_H = MAP_DATA.height;
    } else {
      WORLD_W = W * 2;
      WORLD_H = H * 2;
    }
    // Round 5b + R5p — lane layouts normally force team mode (4v4) so bots
    // don't mass-slaughter in FFA. EXCEPTION: assassin is solo-only (its
    // 开局隐身 + teleport break lane bot AI, R5n-R5o never fixed). When the
    // player picks assassin on a lane map, fall back to solo FFA which at
    // least gives them kill opportunities (see R5p F1 gate).
    if (MAP_DATA && MAP_DATA.layout === 'lane-3') {
      // R5v F3 — healer added to solo-only list alongside assassin. Both use
      // the CLASS_DEFS.soloOnly flag so future classes opt in without editing
      // this branch.
      var _clsDef = CLASS_DEFS[selectedClass];
      if (_clsDef && _clsDef.soloOnly) {
        gameMode = 'solo';
        killFeed.push({ text: '⚠ ' + _clsDef.name + '仅支持单排 — 已切换 FFA', color: '#ffaa40', time: 6 });
      } else {
        gameMode = 'team';
      }
    }
    // Re-center player in freshly-sized world (startGame placed them at old center).
    if (MAP_DATA && MAP_DATA.spawnPoints && MAP_DATA.spawnPoints.length) {
      var _psp = MAP_DATA.spawnPoints[0];
      player.x = _psp.x; player.y = _psp.y;
    } else {
      player.x = WORLD_W / 2;
      player.y = WORLD_H / 2;
    }

    // R6-respawn F2 — wave counter ticks via gameTime in updateOfflineWaveSystem.
    _initSpawnPoints();
    _waveState.wave = 0;
    _waveState.nextSpawnTimer = 0;
    offlineEnemies = [];
    for (var _og = 0; _og < 5; _og++) {
      var _oga = -Math.PI * 0.55 + _og * (Math.PI * 1.1 / 4);
      var _ogr = _og % 2 ? 120 : 84;
      gems.push({
        x: Math.max(40, Math.min(WORLD_W - 40, player.x + Math.cos(_oga) * _ogr)),
        y: Math.max(40, Math.min(WORLD_H - 40, player.y + Math.sin(_oga) * _ogr)),
        xp: 8,
        radius: 4,
        _t: 0,
        gemTier: 'small',
        source: 'opening_reward'
      });
    }

    // === Spawn 7 AI bot players (8 total including local player) ===
    var _botNames = ['铁壁', '雷霆', '幽灵', '寒冰', '烈焰', '疾风', '暗影'];
    var _botClasses = ['warrior', 'mage', 'scout', 'warrior', 'mage', 'scout', 'warrior'];
    var _botSkins = ['warrior_inferno', 'mage_thunder', 'scout_ghost_assassin', 'default', 'default', 'default', 'default'];
    offlineBots = [];
    // Experiment A (2026-04-18): each bot rolls a random build archetype so
    // every match plays differently. Stat multipliers translate into visible
    // behavior changes (tanky bot heals, glass-cannon swings fast, etc.).
    var _botArchetypes = [
      { id: 'assassin',  name: '刺客',   hpMul: 0.80, spdMul: 1.35, dmgMul: 1.20, cdMul: 0.85, color: '#c04040' },
      { id: 'bruiser',   name: '战士',   hpMul: 1.30, spdMul: 0.90, dmgMul: 1.10, cdMul: 1.05, color: '#d88040' },
      { id: 'glasscannon',name: '炮手',  hpMul: 0.70, spdMul: 1.00, dmgMul: 1.60, cdMul: 0.75, color: '#c040c0' },
      { id: 'tank',      name: '坦克',   hpMul: 1.70, spdMul: 0.75, dmgMul: 0.90, cdMul: 1.10, color: '#6060c0' },
      { id: 'speedster', name: '疾风',   hpMul: 0.85, spdMul: 1.50, dmgMul: 0.95, cdMul: 0.90, color: '#40c080' },
      { id: 'sharpshooter',name:'神射',  hpMul: 0.90, spdMul: 0.95, dmgMul: 1.30, cdMul: 0.85, color: '#40a0c0' },
      { id: 'duelist',   name: '决斗家', hpMul: 1.05, spdMul: 1.10, dmgMul: 1.15, cdMul: 0.95, color: '#c0a040' }
    ];
    // Shuffle so each match picks a different 7-subset ordering
    for (var _si = _botArchetypes.length - 1; _si > 0; _si--) {
      var _sj = Math.floor(Math.random() * (_si + 1));
      var _tmp = _botArchetypes[_si]; _botArchetypes[_si] = _botArchetypes[_sj]; _botArchetypes[_sj] = _tmp;
    }
    for (var bi = 0; bi < 7; bi++) {
      // BR spawn: prefer handcrafted spawnPoints[1..7] if a static map is loaded.
      // Fall back to perimeter ring when generating procedurally.
      var bAngle = Math.PI * 2 * bi / 7 + 0.3;
      var _halfDiag = Math.min(WORLD_W, WORLD_H) * 0.22;
      var bDist = _halfDiag + Math.random() * _halfDiag * 0.25;
      var _botX, _botY;
      if (MAP_DATA && MAP_DATA.spawnPoints && MAP_DATA.spawnPoints.length > bi + 1) {
        var _mspi = MAP_DATA.spawnPoints[bi + 1];
        _botX = _mspi.x; _botY = _mspi.y;
      } else if (MAP_DATA && MAP_DATA.rivalPoints && MAP_DATA.rivalPoints.length > bi) {
        var _rpi = MAP_DATA.rivalPoints[bi % MAP_DATA.rivalPoints.length];
        _botX = _rpi.x; _botY = _rpi.y;
      } else {
        _botX = WORLD_W / 2 + Math.cos(bAngle) * bDist;
        _botY = WORLD_H / 2 + Math.sin(bAngle) * bDist;
      }
      var _bc = _botClasses[bi];
      var _arch = _botArchetypes[bi % _botArchetypes.length];
      var _botHP = Math.round((_bc === 'warrior' ? 280 : (_bc === 'mage' ? 200 : 220)) * _arch.hpMul);
      var _botSpd = Math.round((_bc === 'scout' ? 130 : (_bc === 'warrior' ? 100 : 110)) * _arch.spdMul);
      var _botDmg = Math.round((_bc === 'warrior' ? 18 : (_bc === 'mage' ? 22 : 15)) * _arch.dmgMul);
      var _botCd = (_bc === 'mage' ? 0.5 : (_bc === 'scout' ? 0.35 : 0.45)) * _arch.cdMul;
      offlineBots.push({
        archetype: _arch.id,
        archetypeName: _arch.name,
        archetypeColor: _arch.color,
        x: _botX,
        y: _botY,
        playerClass: _bc,
        skinId: _botSkins[bi],
        isBot: true,
        alive: true,
        hp: _botHP, maxHp: _botHP,
        speed: _botSpd,
        attackDamage: _botDmg,
        attackCooldown: _botCd,
        _attackTimer: Math.random() * 2,
        level: 1,
        name: _botNames[bi],
        kills: 0,
        factionId: gameMode === 'team' ? (bi < 3 ? 1 : 2) : bi + 1,
        shieldActive: false,
        radius: 48,
        facingAngle: bAngle + Math.PI,
        _moveTimer: Math.random() * 10,
        _aiState: 'patrol',    // patrol | engage | flee
        _aiTarget: null,
        _patrolAngle: Math.random() * Math.PI * 2,
        _nextDecision: 0.5 + Math.random() * 2
      });
    }

    if (MAP_DATA && MAP_DATA.rewardPoints && MAP_DATA.rewardPoints.length) {
      for (var _rwi = 0; _rwi < MAP_DATA.rewardPoints.length; _rwi++) {
        var _rw = MAP_DATA.rewardPoints[_rwi];
        gems.push({
          x: _rw.x,
          y: _rw.y,
          xp: _rw.xp || 18,
          radius: 5,
          _t: 0,
          gemTier: _rw.tier || 'medium',
          source: 'editor_reward'
        });
      }
    }
    // Experiment G + R5k F3 + R5l F2 — pick rival whose spawn distance lands
    // in a class-specific sweet band:
    //   scout:   600-900 (ranged gets breathing room, not out-traded at 400)
    //   default: 400-600 (melee/mage want rival in visual range early)
    // Fall back to random if no bot lands in the band.
    if (gameMode !== 'team' && offlineBots.length > 0) {
      var _rivBandMin = (selectedClass === 'scout') ? 600 : 400;
      var _rivBandMax = (selectedClass === 'scout') ? 900 : 600;
      var _rivBandMid = (_rivBandMin + _rivBandMax) / 2;
      var _rivIdx = -1;
      var _bestBandD = Infinity;
      for (var _rvi = 0; _rvi < offlineBots.length; _rvi++) {
        var _rb = offlineBots[_rvi];
        var _rdx = _rb.x - player.x, _rdy = _rb.y - player.y;
        var _rd = Math.sqrt(_rdx * _rdx + _rdy * _rdy);
        if (_rd >= _rivBandMin && _rd <= _rivBandMax) {
          var _bandScore = Math.abs(_rd - _rivBandMid);
          if (_bandScore < _bestBandD) { _bestBandD = _bandScore; _rivIdx = _rvi; }
        }
      }
      if (_rivIdx < 0) {
        _rivIdx = Math.floor(Math.random() * offlineBots.length);
      }
      var _rivalBot = offlineBots[_rivIdx];
      var _initRD = Math.round(Math.hypot(_rivalBot.x - player.x, _rivalBot.y - player.y));
      console.log('[rival] picked bot#' + _rivIdx + ' (' + _rivalBot.archetype + ') dist=' + _initRD + 'px band=' + (_bestBandD < Infinity ? 'yes' : 'fallback'));
      rivalState.botId = _rivalBot.factionId;
      rivalState.killedBy = 0;
      rivalState.nemesisId = -1;
      rivalState._pendingAnnounce = 3.0; // defer 3s so tutorial/HUD settle
      rivalState._announceName = _rivalBot.name || 'RIVAL';
      rivalState._announceArch = _rivalBot.archetypeName || '';
      rivalState._initDist = _initRD;
    } else {
      rivalState.botId = -1; rivalState.killedBy = 0; rivalState.nemesisId = -1;
      rivalState._pendingAnnounce = 0;
    }
    // === Generate PUBG-style buildings, crates, walls across the map ===
    _generateBRStructures();
    // Seed initial mob field so the world feels populated from t=0
    _brMobState.spawnTimer = 0;
    _brMobState.bossTimer = 120; // first boss at 120s
    _brMobState.matchBossType = null; // each match rolls a fresh species
    _brMobState.respawnPending = false;
    _brMobState.lastBossCamp = -1;
    _activeBossRef = null;
    // Round 5b T2: spawn the central altar as a destructible BOSS so the
    // landmark has gameplay weight, not just visual weight. High HP, immobile,
    // drops legendary skill + big XP on death; storm convergence forces the
    // 末期 fight to happen here.
    if (MAP_DATA && MAP_DATA.stormCenter) {
      spawnOfflineEnemy('boss', MAP_DATA.stormCenter.x, MAP_DATA.stormCenter.y);
      var _altar = offlineEnemies[offlineEnemies.length - 1];
      _altar.hp = _altar.maxHp = 800;
      _altar.bossTypeId = 'altar';
      _altar.bossTypeName = '中央祭坛';
      _altar.color = '#ffd060';
      _altar.radius = 80;
      _altar.speed = 0;
      _altar._isAltar = true;
      _altar._noKnockback = true;
      // Round 5d F2 — altar invulnerable for the first 90s, then "unlocks"
      // with a global banner so the late-game raid has a clear cue.
      _altar._lockedUntil = 60;
      _altar._unlockedAnnounced = false;
      _activeBossRef = _altar;
      bossDropBanner.active = true;
      bossDropBanner.timer = 3.5;
      bossDropBanner.text = '★ 中央祭坛矗立中(90秒后开放)★';
      bossDropBanner.zoneName = '中央祭坛';
    }
    for (var _seedI = 0; _seedI < 15; _seedI++) {
      var _seedA = Math.random() * Math.PI * 2;
      var _seedR = 300 + Math.random() * (Math.min(WORLD_W, WORLD_H) * 0.35);
      var _seedX = WORLD_W / 2 + Math.cos(_seedA) * _seedR;
      var _seedY = WORLD_H / 2 + Math.sin(_seedA) * _seedR;
      _seedX = Math.max(60, Math.min(WORLD_W - 60, _seedX));
      _seedY = Math.max(60, Math.min(WORLD_H - 60, _seedY));
      var _seedType = (_seedI % 5 === 0) ? 'fast' : ((_seedI % 5 === 1) ? 'swarm' : 'normal');
      spawnOfflineEnemy(_seedType, _seedX, _seedY);
    }
    // homm3_bright decor scatter — retries once assets finish loading if empty
    // Autotile biome grid rebuilds to match current WORLD_W/H
    _biomeGrid = null;
    // Strategic points — handcrafted from MAP_DATA when available (5 fixed),
    // otherwise fall back to the procedural triangle around map center.
    STRAT_POINTS.pointsInWorld = [];
    if (MAP_DATA && MAP_DATA.stratPoints && MAP_DATA.stratPoints.length) {
      for (var _mspI = 0; _mspI < MAP_DATA.stratPoints.length; _mspI++) {
        var _msp = MAP_DATA.stratPoints[_mspI];
        STRAT_POINTS.pointsInWorld.push({
          type: _msp.type || 'camp',
          x: _msp.x, y: _msp.y,
          name: _msp.name || null,
          owner: null, progress: 0, buffUntil: 0,
          captureRadius: _msp.captureRadius || 90
        });
      }
    } else {
      var _spTypes = ['watchtower', 'temple', 'camp'];
      for (var _spi = 0; _spi < _spTypes.length; _spi++) {
        var _spAng = Math.PI * 2 * _spi / _spTypes.length - Math.PI / 2;
        var _spR = Math.min(WORLD_W, WORLD_H) * 0.28;
        var _spX = WORLD_W / 2 + Math.cos(_spAng) * _spR;
        var _spY = WORLD_H / 2 + Math.sin(_spAng) * _spR;
        STRAT_POINTS.pointsInWorld.push({
          type: _spTypes[_spi], x: _spX, y: _spY,
          owner: null, progress: 0, buffUntil: 0,
          captureRadius: 90
        });
      }
    }

    // Storm zone — center from MAP_DATA.stormCenter when present.
    stormZone.active = true;
    stormZone.radius = Math.max(WORLD_W, WORLD_H) * 0.75;
    if (MAP_DATA && MAP_DATA.stormCenter) {
      stormZone.centerX = MAP_DATA.stormCenter.x;
      stormZone.centerY = MAP_DATA.stormCenter.y;
    } else {
      stormZone.centerX = WORLD_W / 2;
      stormZone.centerY = WORLD_H / 2;
    }
    // R6-storm-01 — survivor.io 局长 15-20min: 前 3 min 纯刷+升级，3-10 min 收圈施压。
    stormZone.shrinkRate = 9; // px/s (was 18 — 收圈减半)
    stormZone._shrinkDelay = 180; // s (was 75 — 前 3 min 不收圈)
    stormZone._minRadius = 180;
  }

  // BR+MOBA continuous mob field. Maintains `_brMobTarget` live hostile
  // mobs scattered across the map so every player has something nearby to
  // farm. A single boss spawns periodically at one of the named camps.
  // Named boss camps (Leo spec 2026-04-18): 5 predefined points, position
  // scales with WORLD_W/H so the regions feel coherent at any map size.
  function _bossCamps() {
    if (MAP_DATA && MAP_DATA.bossPoints && MAP_DATA.bossPoints.length) {
      // Convert absolute coords to fractional so downstream code still works.
      return MAP_DATA.bossPoints.map(function(bp) {
        return { name: bp.name, fx: bp.x / WORLD_W, fy: bp.y / WORLD_H };
      });
    }
    return [
      { name: '北岭废墟', fx: 0.50, fy: 0.15 },
      { name: '南岸石阵', fx: 0.50, fy: 0.85 },
      { name: '东丘营地', fx: 0.85, fy: 0.50 },
      { name: '西林洞窟', fx: 0.15, fy: 0.50 },
      { name: '中央祭坛', fx: 0.50, fy: 0.50 }
    ];
  }
  // Boss species (Leo 2026-04-18): the first boss spawn of a match picks
  // one species uniformly and it is locked for the rest of the match —
  // different matches see different bosses (replay variety).
  // stats are multipliers on top of the base boss row (hp=500, spd=20, r=60).
  var BOSS_TYPES = [
    { id: 'stone_giant',  name: '石巨人',   hpMul: 1.80, spdMul: 0.70, radMul: 1.20, color: '#888a95' },
    { id: 'shadow_mage',  name: '暗影法师', hpMul: 0.90, spdMul: 1.10, radMul: 0.95, color: '#5a2a8a' },
    { id: 'berserker',    name: '狂战士',   hpMul: 0.95, spdMul: 1.60, radMul: 0.95, color: '#b13030' },
    { id: 'frost_dragon', name: '冰霜恶龙', hpMul: 1.30, spdMul: 1.00, radMul: 1.25, color: '#4a9edd' },
    { id: 'rot_troll',    name: '腐烂巨魔', hpMul: 1.50, spdMul: 0.85, radMul: 1.15, color: '#5e7a32' }
  ];
  // Cadence: first spawn 120s into match, then 180-240s after each death.
  // bossTimer tracks time until next eligible spawn attempt.
  var _brMobState = {
    spawnTimer: 0,
    bossTimer: 120,
    targetCount: 22,
    lastBossCamp: -1,
    matchBossType: null,    // locked on first spawn
    respawnPending: false   // true while waiting for bossTimer after a death
  };
  // Banner shown when a boss drops; rendered from drawGame.
  var bossDropBanner = { active: false, timer: 0, text: '', zoneName: '' };
  // Live boss location for minimap crown marker
  var _activeBossRef = null;
  function updateBRMobField(dt) {
    _brMobState.spawnTimer -= dt;
    _brMobState.bossTimer -= dt;
    // Count live hostile (non-treasure) mobs
    var alive = 0, liveBoss = 0;
    for (var i = 0; i < offlineEnemies.length; i++) {
      var e = offlineEnemies[i];
      if (!e.alive || !e.hostile) continue;
      alive++;
      if (e.type === 'boss' || e.type === 'miniBoss') liveBoss++;
    }
    // Regular spawn: if under target, drip one at a uniformly-random world
    // cell that has no player within 220px (avoid "怪在玩家脸上" spawns).
    if (_brMobState.spawnTimer <= 0 && alive < _brMobState.targetCount) {
      _brMobState.spawnTimer = 0.7 + Math.random() * 0.6;
      var pool = (gameTime < 45) ? ['normal', 'normal', 'swarm', 'fast']
                : (gameTime < 120) ? ['normal', 'fast', 'tank', 'swarm', 'ranged']
                                    : ['fast', 'tank', 'ranged', 'normal', 'tank'];
      var attempts = 0, ex = 0, ey = 0, ok = false;
      while (attempts < 10 && !ok) {
        attempts++;
        ex = 80 + Math.random() * (WORLD_W - 160);
        ey = 80 + Math.random() * (WORLD_H - 160);
        ok = true;
        // Far enough from every player
        for (var pi = 0; pi < allPlayers.length; pi++) {
          var p = allPlayers[pi];
          if (!p || !p.alive) continue;
          var dx = ex - p.x, dy = ey - p.y;
          if (dx * dx + dy * dy < 220 * 220) { ok = false; break; }
        }
        // Inside the current storm ring (so mobs don't wither instantly)
        if (ok && stormZone.active) {
          var _dsx = ex - stormZone.centerX, _dsy = ey - stormZone.centerY;
          if (_dsx * _dsx + _dsy * _dsy > stormZone.radius * stormZone.radius) ok = false;
        }
      }
      if (ok) spawnOfflineEnemy(pool[Math.floor(Math.random() * pool.length)], ex, ey);
    }
    // Boss cadence: first spawn when bossTimer elapses (120s default),
    // after a death bossTimer resets to 180-240s. Max 1 alive at a time.
    if (_brMobState.bossTimer <= 0 && liveBoss === 0) {
      // Lock boss species for the whole match on the FIRST spawn.
      if (!_brMobState.matchBossType) {
        _brMobState.matchBossType = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
      }
      var bossType = _brMobState.matchBossType;
      var camps = _bossCamps();
      // Pick a camp different from last time so the Boss visits variety
      var idx = Math.floor(Math.random() * camps.length);
      if (camps.length > 1 && idx === _brMobState.lastBossCamp) idx = (idx + 1) % camps.length;
      _brMobState.lastBossCamp = idx;
      var camp = camps[idx];
      var bx = Math.round(WORLD_W * camp.fx);
      var by = Math.round(WORLD_H * camp.fy);
      spawnOfflineEnemy('boss', bx, by);
      _activeBossRef = offlineEnemies[offlineEnemies.length - 1];
      // Apply species modifiers
      _activeBossRef.bossTypeId = bossType.id;
      _activeBossRef.bossTypeName = bossType.name;
      _activeBossRef.hp = Math.round(_activeBossRef.hp * bossType.hpMul);
      _activeBossRef.maxHp = _activeBossRef.hp;
      _activeBossRef.speed = Math.round(_activeBossRef.speed * bossType.spdMul);
      _activeBossRef.radius = Math.round(_activeBossRef.radius * bossType.radMul);
      _activeBossRef.color = bossType.color;
      _activeBossRef._campName = camp.name;
      // Suspend bossTimer until this boss dies
      _brMobState.bossTimer = Number.POSITIVE_INFINITY;
      _brMobState.respawnPending = false;
      // Center-top 2.5s banner includes species name
      bossDropBanner.active = true;
      bossDropBanner.timer = 2.5;
      bossDropBanner.text = '★ ' + bossType.name + ' 已出现在 ' + camp.name + ' ★';
      bossDropBanner.zoneName = camp.name;
      killFeed.push({ text: '⚠ ' + bossType.name + ' 降临 ' + camp.name + ' ⚠', color: '#f44', time: 6 });
      if (typeof playSound === 'function') playSound('boss_warn');
    }
    // On Boss death: start the 180-240s respawn countdown (once).
    if (_activeBossRef && (!_activeBossRef.alive || _activeBossRef.hp <= 0)) {
      _activeBossRef = null;
      if (!_brMobState.respawnPending) {
        _brMobState.bossTimer = 180 + Math.random() * 60;
        _brMobState.respawnPending = true;
      }
    }
  }

  // === Round 5 M: archetype-driven combat profile (Leo 2026-04-21) ===
  // Per-archetype tactic controls bot engage behaviour so every match feels
  // like 7 distinct opponents rather than "all bots swarm forward". The style
  // id is consumed in the engage-state movement block below.
  var ARCHETYPE_TACTICS = {
    assassin:     { range: 110, flee: 0.30, style: 'flank'       },
    bruiser:      { range: 85,  flee: 0.15, style: 'rush'        },
    tank:         { range: 100, flee: 0.08, style: 'rush'        },
    glasscannon:  { range: 380, flee: 0.45, style: 'behindAlly'  },
    speedster:    { range: 200, flee: 0.25, style: 'orbit'       },
    sharpshooter: { range: 600, flee: 0.25, style: 'kite'        },
    duelist:      { range: 140, flee: 0.20, style: 'duel'        }
  };
  function _archetypeProfile(b) {
    return ARCHETYPE_TACTICS[b.archetype] || ARCHETYPE_TACTICS.bruiser;
  }

  // === Experiment C: strategic capture points ===
  var _CAPTURE_RATE = 14;   // progress per second while uncontested
  var _BUFF_DURATION = 30;  // seconds after capture
  function updateStrategicPoints(dt) {
    if (!STRAT_POINTS.pointsInWorld.length || !player) return;
    for (var i = 0; i < STRAT_POINTS.pointsInWorld.length; i++) {
      var pt = STRAT_POINTS.pointsInWorld[i];
      // Detect occupants (player + bots) inside capture radius
      var inside = []; // { entity, faction }
      var pdx = player.x - pt.x, pdy = player.y - pt.y;
      if (player.alive !== false && pdx * pdx + pdy * pdy < pt.captureRadius * pt.captureRadius) {
        inside.push({ e: player, faction: player.factionId });
      }
      for (var bi = 0; bi < offlineBots.length; bi++) {
        var b = offlineBots[bi];
        if (!b.alive) continue;
        var bdx = b.x - pt.x, bdy = b.y - pt.y;
        if (bdx * bdx + bdy * bdy < pt.captureRadius * pt.captureRadius) {
          inside.push({ e: b, faction: b.factionId });
        }
      }
      if (inside.length === 0) continue;
      // Determine contest state: only one faction present → progress; multiple → decay
      var factionSet = {};
      inside.forEach(function(o) { factionSet[o.faction] = true; });
      var factions = Object.keys(factionSet);
      if (factions.length > 1) {
        // Round 5 L: contested — progress decays so "打败对方才继续"
        pt.progress = Math.max(0, pt.progress - _CAPTURE_RATE * 0.6 * dt);
        pt._contested = true;
        continue;
      }
      pt._contested = false;
      var occupyingFaction = +factions[0];
      if (pt.owner === occupyingFaction) continue; // already owned
      pt.progress += _CAPTURE_RATE * dt;
      if (pt.progress >= 100) {
        pt.progress = 0;
        var prevOwner = pt.owner;
        pt.owner = occupyingFaction;
        pt.buffUntil = gameTime + _BUFF_DURATION;
        var _ptLabel = { watchtower: '哨塔', temple: '神庙', camp: '营地' }[pt.type] || pt.type;
        var _ptName = pt.name ? (pt.name + '(' + _ptLabel + ')') : _ptLabel;
        // Round 5 L: killFeed for every capture event — makes map control visible
        var _factionName = function(f) {
          if (player && f === player.factionId) return '你';
          for (var _fi = 0; _fi < offlineBots.length; _fi++) {
            if (offlineBots[_fi].factionId === f) return offlineBots[_fi].name || 'Bot';
          }
          return 'Bot';
        };
        var newName = _factionName(occupyingFaction);
        if (prevOwner != null && prevOwner !== occupyingFaction) {
          killFeed.push({ text: newName + ' 击败 ' + _factionName(prevOwner) + ' 夺得 ' + _ptName, color: '#ffb030', time: 5 });
        } else {
          killFeed.push({ text: newName + ' 控制了 ' + _ptName, color: '#ffd060', time: 5 });
        }
        // Local player feedback
        if (occupyingFaction === player.factionId) {
          floatText(pt.x, pt.y - 40, '★ 占领 ' + _ptLabel + ' +' + _BUFF_DURATION + 's buff', { color: '#ffd700', size: 16 });
          screenFlash.color = '#ffd700'; screenFlash.alpha = 0.22;
          playSound('kill');
        }
      }
    }
  }
  // Apply strategic point buffs to the local player AND bots each frame.
  // Round 5 L: bots that own a temple now heal the same 2 HP/s as the player,
  // so capturing a point is a tangible advantage (not just a label).
  function applyStrategicBuffs(dt) {
    if (!STRAT_POINTS.pointsInWorld.length) return;
    if (player) {
      for (var i = 0; i < STRAT_POINTS.pointsInWorld.length; i++) {
        var pt = STRAT_POINTS.pointsInWorld[i];
        if (pt.owner !== player.factionId || gameTime > pt.buffUntil) continue;
        if (pt.type === 'temple') {
          player.hp = Math.min(player.maxHp, player.hp + 2 * dt);
        }
      }
    }
    for (var _bi = 0; _bi < offlineBots.length; _bi++) {
      var _bb = offlineBots[_bi];
      if (!_bb.alive) continue;
      for (var _pi = 0; _pi < STRAT_POINTS.pointsInWorld.length; _pi++) {
        var _pp = STRAT_POINTS.pointsInWorld[_pi];
        if (_pp.owner !== _bb.factionId || gameTime > _pp.buffUntil) continue;
        if (_pp.type === 'temple') {
          _bb.hp = Math.min(_bb.maxHp, _bb.hp + 2 * dt);
        }
      }
    }
  }
  function playerHasStratBuff(type) {
    for (var i = 0; i < STRAT_POINTS.pointsInWorld.length; i++) {
      var pt = STRAT_POINTS.pointsInWorld[i];
      if (pt.owner === (player && player.factionId) && pt.type === type && gameTime < pt.buffUntil) return true;
    }
    return false;
  }
  // World-space render of strategic points + capture bar above.
  function drawStrategicPoints(ctx, camX, camY) {
    if (!STRAT_POINTS.pointsInWorld.length || !STRAT_POINTS.meta) return;
    for (var i = 0; i < STRAT_POINTS.pointsInWorld.length; i++) {
      var pt = STRAT_POINTS.pointsInWorld[i];
      var meta = STRAT_POINTS.meta.points[pt.type];
      if (!meta) continue;
      var imgBox = STRAT_POINTS.imgs[pt.type];
      // Capture-zone glow ring when anyone is inside or mid-capture
      if (pt.progress > 0 || pt.owner != null) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.15 * Math.abs(Math.sin(Date.now() / 280));
        var ownerColor = pt.owner == null ? '#ffffff'
                       : (pt.owner === (player && player.factionId) ? '#ffd700' : '#ff4040');
        ctx.fillStyle = ownerColor;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.captureRadius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Sprite
      if (imgBox && imgBox._ready) {
        ctx.drawImage(imgBox.img, pt.x - meta.anchor.x, pt.y - meta.anchor.y);
      } else {
        // Fallback marker
        ctx.fillStyle = '#8a8'; ctx.fillRect(pt.x - 20, pt.y - 80, 40, 100);
      }
      // Capture progress bar — Round 5 sprite pack (4 rows in capture_bar.svg).
      // row 0 ally-blue, 1 enemy-red, 2 neutral-gold, 3 contested pulse.
      if (pt.progress > 0 && pt.progress < 100) {
        var bw = 128, bh = 16;
        var bx = pt.x - bw / 2, by = pt.y - meta.h - 14;
        var cb = COMBAT_FX.captureBar;
        // Row selection: contested > captured-by-enemy > captured-by-player > neutral
        var _row = 2;
        if (pt._contested) _row = 3;
        else if (pt.owner != null) _row = (pt.owner === (player && player.factionId)) ? 0 : 1;
        if (cb.ready) {
          // Dim background (ghost) bar
          ctx.globalAlpha = 0.35;
          ctx.drawImage(cb.img, 0, _row * cb.rowH, cb.barW, cb.barH, bx, by, bw, bh);
          ctx.globalAlpha = 1;
          // Filled portion — slice source by progress so no clip() is needed
          var _pctW = bw * (pt.progress / 100);
          var _srcW = cb.barW * (pt.progress / 100);
          ctx.drawImage(cb.img, 0, _row * cb.rowH, _srcW, cb.barH, bx, by, _pctW, bh);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = '#333';
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = pt._contested ? '#ff8060' : (pt.owner === (player && player.factionId) ? '#7ac4f0' : (pt.owner != null ? '#ff7a5a' : '#ffd700'));
          ctx.fillRect(bx, by, bw * (pt.progress / 100), bh);
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
          ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        }
      }
      // Owner buff timer bar (when player owns)
      if (pt.owner != null && gameTime < pt.buffUntil) {
        var rem = pt.buffUntil - gameTime;
        var bx2 = pt.x - 40, by2 = pt.y - meta.h - 16;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx2 - 1, by2 - 1, 82, 5);
        var pct = Math.max(0, rem / _BUFF_DURATION);
        ctx.fillStyle = pt.owner === (player && player.factionId) ? '#40ff80' : '#ff4040';
        ctx.fillRect(bx2, by2, 80 * pct, 3);
      }
    }
  }

  function spawnOfflineEnemy(type, x, y) {
    var hp = { normal: 30, fast: 20, tank: 80, ranged: 25, swarm: 10, miniBoss: 200, boss: 500, treasure: 15 };
    var spd = { normal: 40, fast: 80, tank: 25, ranged: 35, swarm: 70, miniBoss: 30, boss: 20, treasure: 120 };
    var rad = { normal: 31, fast: 25, tank: 50, ranged: 28, swarm: 20, miniBoss: 59, boss: 84, treasure: 22 };
    var colors = { normal: '#5a8a3a', fast: '#442244', tank: '#777766', ranged: '#556677', swarm: '#885522', miniBoss: '#aa3355', boss: '#882222', treasure: '#aa8822' };
    offlineEnemies.push({
      x: x, y: y, hp: hp[type] || 30, maxHp: hp[type] || 30,
      speed: spd[type] || 40, radius: rad[type] || 8,
      type: type, color: colors[type] || '#c44',
      alive: true, _angle: Math.random() * Math.PI * 2, _moveTimer: Math.random() * 5,
      hostile: type !== 'treasure'
    });
  }

  function updateOfflineDemo(dt) {
    if (!offlineMode) return;
    offlineSpawnTimer += dt;

    // Move enemies (wander + chase if close). Round 5e F3: global slow factor.
    var _enemySlow = _altarSlowMul();
    for (var i = 0; i < offlineEnemies.length; i++) {
      var e = offlineEnemies[i];
      if (!e.alive) continue;
      // R6-control F1 — mage ability freeze: stop enemy AI entirely while frozen.
      if (e._freezeUntil && gameTime < e._freezeUntil) continue;
      e._moveTimer += dt;
      // Round 5e F3 — collapse global slow into a per-enemy effective dt for
      // movement only (not knockback). Cheaper than rewriting every speed term.
      var _eMoveDt = dt * _enemySlow;
      // Wave 1: consume knockback velocity first (overrides movement this frame)
      if (e._knockbackVx || e._knockbackVy) {
        e.x += (e._knockbackVx || 0) * dt;
        e.y += (e._knockbackVy || 0) * dt;
        e._knockbackVx = (e._knockbackVx || 0) * 0.85;
        e._knockbackVy = (e._knockbackVy || 0) * 0.85;
        if (Math.abs(e._knockbackVx) < 1 && Math.abs(e._knockbackVy) < 1) {
          e._knockbackVx = 0; e._knockbackVy = 0;
        }
      }
      var _bestT = null, _bestTD = 500;
      if (e.type !== 'treasure' && e.hostile) {
        var _candidates = [player].concat(offlineBots);
        for (var _ti = 0; _ti < _candidates.length; _ti++) {
          var _ct = _candidates[_ti];
          if (!_ct || !_ct.alive) continue;
          var _ctdx = _ct.x - e.x, _ctdy = _ct.y - e.y;
          var _ctd = Math.sqrt(_ctdx * _ctdx + _ctdy * _ctdy);
          if (_ctd < _bestTD) { _bestTD = _ctd; _bestT = _ct; }
        }
      }
      if (e.type === 'treasure') {
        var _trDx = player.x - e.x, _trDy = player.y - e.y;
        var _trDist = Math.sqrt(_trDx * _trDx + _trDy * _trDy) || 0.001;
        if (_trDist < 200) {
          e.x -= (_trDx / _trDist) * e.speed * _eMoveDt;
          e.y -= (_trDy / _trDist) * e.speed * _eMoveDt;
        } else {
          e._angle += (Math.random() - 0.5) * 2 * dt;
          e.x += Math.cos(e._angle) * e.speed * 0.3 * _eMoveDt;
          e.y += Math.sin(e._angle) * e.speed * 0.3 * _eMoveDt;
        }
      } else if (_bestT) {
        var _chDx = _bestT.x - e.x, _chDy = _bestT.y - e.y;
        var _chD = _bestTD || 0.001;
        e.x += (_chDx / _chD) * e.speed * _eMoveDt;
        e.y += (_chDy / _chD) * e.speed * _eMoveDt;
      } else {
        e._angle += (Math.random() - 0.5) * dt;
        e.x += Math.cos(e._angle) * e.speed * 0.5 * _eMoveDt;
        e.y += Math.sin(e._angle) * e.speed * 0.5 * _eMoveDt;
      }
      // Keep in bounds
      e.x = Math.max(e.radius, Math.min(WORLD_W - e.radius, e.x));
      e.y = Math.max(e.radius, Math.min(WORLD_H - e.radius, e.y));
    }

    // === BR AI bot update — patrol / engage / flee storm ===
    var _allBR = [player].concat(offlineBots); // all 8 players
    // R6-pvp-01: snapshot bots currently aggro on player (cap dogpile)
    var _playerAggroCount = 0;
    for (var _pac = 0; _pac < _allBR.length; _pac++) {
      var _pacB = _allBR[_pac];
      if (_pacB && _pacB.alive && !_pacB.isLocal && _pacB._aiTarget === player) _playerAggroCount++;
    }
    for (var bi = 0; bi < offlineBots.length; bi++) {
      var b = offlineBots[bi];
      if (!b.alive) continue;
      // R6-control F1 — mage ability freezes hostile bots: skip movement, AI,
      // attack timer ticking. Friendly bots ignore the freeze flag entirely.
      if (b._freezeUntil && gameTime < b._freezeUntil) continue;
      b._moveTimer += dt;
      b._attackTimer -= dt;
      b._nextDecision -= dt;

      // --- Storm damage ---
      if (stormZone.active) {
        var _sDx = b.x - stormZone.centerX, _sDy = b.y - stormZone.centerY;
        var _sD = Math.sqrt(_sDx * _sDx + _sDy * _sDy);
        if (_sD > stormZone.radius) {
          b.hp -= 8 * dt; // storm damage
          if (b.hp <= 0) {
            b.alive = false;
            killFeed.push({ text: b.name + ' 被毒圈淘汰', color: '#f88', time: 4 });
          }
        }
      }
      if (!b.alive) continue;
      // Snapshot pre-move position for collision slide + stuck detection.
      var _bPreX = b.x, _bPreY = b.y;

      // Round 5 N: rival trail — emit a soft red particle at feet every 50ms
      // while actively chasing the player. Makes the rival readable on minimap
      // and in pursuit, without requiring the sprite atlas to be ready.
      if (rivalState.botId === b.factionId || rivalState.nemesisId === b.factionId) {
        b._trailT = (b._trailT || 0) - dt;
        if (b._trailT <= 0) {
          b._trailT = 0.05;
          var _trailColor = rivalState.nemesisId === b.factionId ? '#c090ff' : '#ff6060';
          particles.push({
            x: b.x + (Math.random() - 0.5) * 10,
            y: b.y + (b.radius || 32) * 0.6,
            vx: 0, vy: -8,
            life: 0.48, maxLife: 0.48,
            color: _trailColor, size: 6, particleType: 'circle'
          });
        }
      }

      // --- Round 5c F2: lane_b 强制过桥 ---
      // First 30s on lane-3 layouts, each bot is hard-routed to a bridge so
      // both sides actually meet at mid (without this, bots farm own jungle
      // and the river never gets crossed → 0 PvP).
      if (MAP_DATA && MAP_DATA.layout === 'lane-3' && gameTime < 30 && !b._crossedBridge) {
        if (!b._bridgeWaypoint) {
          // Pick the bridge closest to the bot's current position
          var bestB = null, bestBD = 1e12;
          for (var _bri = 0; _bri < _brStructures.length; _bri++) {
            var _br = _brStructures[_bri];
            if (_br.type !== 'bridge') continue;
            var _brcx = _br.x + _br.w / 2, _brcy = _br.y + _br.h / 2;
            var _brdx = _brcx - b.x, _brdy = _brcy - b.y;
            var _brd2 = _brdx * _brdx + _brdy * _brdy;
            if (_brd2 < bestBD) { bestBD = _brd2; bestB = { x: _brcx, y: _brcy, w: _br.w, h: _br.h }; }
          }
          if (bestB) b._bridgeWaypoint = bestB;
        }
        if (b._bridgeWaypoint) {
          var _bwx = b._bridgeWaypoint.x, _bwy = b._bridgeWaypoint.y;
          var _bwdx = _bwx - b.x, _bwdy = _bwy - b.y;
          var _bwd = Math.sqrt(_bwdx * _bwdx + _bwdy * _bwdy);
          if (_bwd < 80) {
            // Reached the bridge; cross it (push toward opposite side ~120px)
            // by marking crossed then letting normal AI take over from the
            // far edge.
            b._crossedBridge = true;
          } else {
            // Walk to the bridge — apply movement directly here so the rest of
            // the decision/movement block can be skipped this frame.
            var _bws = (b.speed || 100) * 1.1;
            b.x += (_bwdx / _bwd) * _bws * dt;
            b.y += (_bwdy / _bwd) * _bws * dt;
            b.facingAngle = Math.atan2(_bwdy, _bwdx);
            // collision slide so bots can't tunnel through buildings
            var _bwMove = moveWithCollision(_bPreX, _bPreY, b.x, b.y, (b.radius || 32) * 0.55);
            b.x = _bwMove.x; b.y = _bwMove.y;
            b.x = Math.max(b.radius + 5, Math.min(WORLD_W - b.radius - 5, b.x));
            b.y = Math.max(b.radius + 5, Math.min(WORLD_H - b.radius - 5, b.y));
            continue; // skip rest of AI/movement this frame
          }
        }
      }

      // --- Round 5 N: rival / nemesis target override ---
      // Round 5b: rival aggression delayed to gameTime > 60 so new players
      // get a farming window before the stalker bot starts hunting (Testor:
      // scout died at 38s under combined rival+archetype pressure).
      var _forcePlayer = false;
      var _playerInvis = !!(player && player._invisibleUntil && gameTime < player._invisibleUntil);
      if (player && player.alive && gameTime > 60 && !_playerInvis) {
        if (rivalState.nemesisId === b.factionId) {
          _forcePlayer = true;
        } else if (rivalState.botId === b.factionId) {
          var _rvdx = player.x - b.x, _rvdy = player.y - b.y;
          if (_rvdx * _rvdx + _rvdy * _rvdy < 1200 * 1200) _forcePlayer = true;
        }
      }

      // --- Round 5 L: capture decision every 4-6s ---
      // Claim nearby strategic points when safe. Priority lower than forced
      // rival/nemesis engagement and lower than flee.
      b._nextCapture = (b._nextCapture || 0) - dt;
      if (b._nextCapture <= 0) {
        b._nextCapture = 4 + Math.random() * 2;
        if (!_forcePlayer && b._aiState !== 'flee' && b.hp > (b.maxHp || 1) * 0.5 && STRAT_POINTS.pointsInWorld.length) {
          var bestPt = null, bestPtD = 800;
          for (var _spi = 0; _spi < STRAT_POINTS.pointsInWorld.length; _spi++) {
            var _pt = STRAT_POINTS.pointsInWorld[_spi];
            if (_pt.owner === b.factionId && gameTime < _pt.buffUntil) continue;
            var _pdxC = _pt.x - b.x, _pdyC = _pt.y - b.y;
            var _pdC = Math.sqrt(_pdxC * _pdxC + _pdyC * _pdyC);
            if (_pdC < bestPtD) { bestPtD = _pdC; bestPt = _pt; }
          }
          if (bestPt) {
            b._aiState = 'capture';
            b._captureTarget = bestPt;
            b._captureAnnounced = false;
          }
        }
      }

      // --- AI decision every 0.5-2s ---
      if (b._nextDecision <= 0) {
        b._nextDecision = 0.6 + Math.random() * 0.9;
        // Storm flee
        if (stormZone.active) {
          var _sdBot = Math.sqrt((b.x - stormZone.centerX) * (b.x - stormZone.centerX) + (b.y - stormZone.centerY) * (b.y - stormZone.centerY));
          if (_sdBot > stormZone.radius * 0.8) {
            b._aiState = 'flee';
            b._aiTarget = null;
          }
        }
        // Archetype HP flee — each archetype has its own break threshold
        var _tactic = _archetypeProfile(b);
        if (b._aiState !== 'flee' && b.hp < (b.maxHp || 1) * _tactic.flee && !_forcePlayer) {
          // Nemesis and rival don't flee (they pursue at all costs).
          b._aiState = 'flee';
          b._aiTarget = null;
        }
        if (_forcePlayer) {
          b._aiState = 'engage'; b._aiTarget = player;
        } else if (b._aiState === 'capture' && b._captureTarget && b._captureTarget.owner !== b.factionId) {
          // Already pursuing a capture — keep unless an enemy is about to
          // interrupt; engage state check below handles that.
        } else if (b._aiState !== 'flee') {
          // 1) Look for nearest enemy player anywhere
          var bestTarget = null, bestDist = 1400;
          for (var pi = 0; pi < _allBR.length; pi++) {
            var _tgt = _allBR[pi];
            if (_tgt === b || !_tgt.alive) continue;
            if (gameMode === 'team' && _tgt.factionId === b.factionId) continue;
            // R5n F2 — skip the player target while their 隐身 is active (assassin opening 3s)
            if (_tgt === player && _playerInvis) continue;
            var _tdx = _tgt.x - b.x, _tdy = _tgt.y - b.y;
            var _td = Math.sqrt(_tdx * _tdx + _tdy * _tdy);
            if (_td < bestDist) { bestDist = _td; bestTarget = _tgt; }
          }
          // 2) Nearest mob within 340px — prefer farm over far-away chase
          var bestMob = null, bestMobDist = 340;
          for (var _mi = 0; _mi < offlineEnemies.length; _mi++) {
            var _m = offlineEnemies[_mi];
            if (!_m || !_m.alive || !_m.hostile) continue;
            var _mdx = _m.x - b.x, _mdy = _m.y - b.y;
            var _md = Math.sqrt(_mdx * _mdx + _mdy * _mdy);
            if (_md < bestMobDist) { bestMobDist = _md; bestMob = _m; }
          }
          // Round 5 M: duelist avoids group fights — if 2+ enemies within 400,
          // disengage to 'push' (hunting for a 1v1 elsewhere).
          if (_tactic.style === 'duel' && bestTarget) {
            var _nearby = 0;
            for (var _di = 0; _di < _allBR.length; _di++) {
              var _dt2 = _allBR[_di];
              if (_dt2 === b || !_dt2.alive) continue;
              if (gameMode === 'team' && _dt2.factionId === b.factionId) continue;
              var _ddx = _dt2.x - b.x, _ddy = _dt2.y - b.y;
              if (_ddx * _ddx + _ddy * _ddy < 400 * 400) _nearby++;
            }
            if (_nearby >= 2) { b._aiState = 'push'; b._aiTarget = null; bestTarget = null; }
          }
          var PLAYER_AGGRO_CAP = 2;
          var _wouldHitPlayer = (bestTarget === player || (bestTarget && bestTarget.isLocal));
          var _capBlocked = _wouldHitPlayer && _playerAggroCount >= PLAYER_AGGRO_CAP && !_forcePlayer;
          if (bestTarget && bestDist < 420 && !_capBlocked) {
            b._aiState = 'engage'; b._aiTarget = bestTarget;
            if (_wouldHitPlayer) _playerAggroCount++;
          } else if (bestMob) {
            b._aiState = 'farm'; b._aiTarget = bestMob;
          } else if (bestTarget && !_capBlocked) {
            b._aiState = 'engage'; b._aiTarget = bestTarget;
            if (_wouldHitPlayer) _playerAggroCount++;
          } else if (b._aiState !== 'capture') {
            b._aiState = 'push'; b._aiTarget = null;
          }
        }
      }

      // --- Movement ---
      // Round 5 N: rival rage buff (+20% speed/attack) for 15s after hatred ≥ 5
      // Round 5e F3: global enemy slow when altar slain (3 min, ×0.7)
      var _rageMul = (b._rageUntil && gameTime < b._rageUntil) ? 1.2 : 1.0;
      var _staggerMul = (b._staggerUntil && gameTime < b._staggerUntil) ? 0.5 : 1.0;
      var bSpeed = (b.speed || 100) * _rageMul * _altarSlowMul() * _staggerMul;
      if (b._aiState === 'flee') {
        // Move toward storm center (storm is damaging)
        var _fcx = stormZone.centerX - b.x, _fcy = stormZone.centerY - b.y;
        var _fd = Math.sqrt(_fcx * _fcx + _fcy * _fcy);
        if (_fd > 5) {
          b.x += (_fcx / _fd) * bSpeed * 1.1 * dt;
          b.y += (_fcy / _fd) * bSpeed * 1.1 * dt;
          b.facingAngle = Math.atan2(_fcy, _fcx);
        }
        if (_fd < stormZone.radius * 0.5) b._aiState = 'push';
      } else if (b._aiState === 'farm' && b._aiTarget && b._aiTarget.alive) {
        // Approach the mob and swing at melee range
        var _mdx = b._aiTarget.x - b.x, _mdy = b._aiTarget.y - b.y;
        var _md = Math.sqrt(_mdx * _mdx + _mdy * _mdy) || 0.001;
        b.facingAngle = Math.atan2(_mdy, _mdx);
        var _farmRange = 70;
        if (_md > _farmRange) {
          b.x += (_mdx / _md) * bSpeed * dt;
          b.y += (_mdy / _md) * bSpeed * dt;
        }
        if (_md < _farmRange + 20 && b._attackTimer <= 0) {
          b._attackTimer = b.attackCooldown;
          var _farmDmg = b.attackDamage + Math.floor(Math.random() * 4);
          b._aiTarget.hp -= _farmDmg;
          if (b._aiTarget === player) {
            window._dmgSourceLog = window._dmgSourceLog || {};
            window._dmgSourceLog['bot_pvp'] = (window._dmgSourceLog['bot_pvp'] || 0) + _farmDmg;
          }
          emit(b._aiTarget.x, b._aiTarget.y, '#ffd060', 4, 90);
          if (b._aiTarget.hp <= 0 && b._aiTarget.alive) {
            b._aiTarget.alive = false;
            // Farm kill — does NOT count as a player kill. Bot levels up from XP.
            b.level = Math.min(10, (b.level || 1) + ((b._aiTarget.type === 'boss' || b._aiTarget.type === 'miniBoss') ? 2 : 1));
            b._aiTarget = null;
            b._aiState = 'push';
          }
        }
      } else if (b._aiState === 'push') {
        // Drift toward storm center with small random jitter. R5l F3: on
        // lane-3 maps, bias Y toward the bot's starting lane centre (top/mid/
        // bot) so after bridge cross they patrol the LANE instead of wandering
        // off toward storm — which was producing 120s 1-kill matches.
        var _pgoalX = stormZone.centerX, _pgoalY = stormZone.centerY;
        if (MAP_DATA && MAP_DATA.layout === 'lane-3') {
          // Snap to nearest lane centre (world y: top=416, mid=1296, bot=2128)
          if (!b._laneY) {
            b._laneY = b.y < 880 ? 416 : (b.y < 1680 ? 1296 : 2128);
          }
          _pgoalY = b._laneY;
          // Pull X toward opposite half of map (assume spawn side by initial x)
          if (!b._laneTargetX) {
            b._laneTargetX = b.x < WORLD_W / 2 ? WORLD_W - 400 : 400;
          }
          _pgoalX = b._laneTargetX;
        }
        var _pcx = _pgoalX - b.x, _pcy = _pgoalY - b.y;
        var _pd = Math.sqrt(_pcx * _pcx + _pcy * _pcy);
        b._patrolAngle = (b._patrolAngle || 0) + (Math.random() - 0.5) * 0.8 * dt;
        var jitter = 0.25;
        var mvx = (_pd > 5 ? _pcx / _pd : 0) + Math.cos(b._patrolAngle) * jitter;
        var mvy = (_pd > 5 ? _pcy / _pd : 0) + Math.sin(b._patrolAngle) * jitter;
        var ml = Math.max(0.001, Math.sqrt(mvx * mvx + mvy * mvy));
        b.x += (mvx / ml) * bSpeed * 0.75 * dt;
        b.y += (mvy / ml) * bSpeed * 0.75 * dt;
        b.facingAngle = Math.atan2(mvy, mvx);
      } else if (b._aiState === 'capture' && b._captureTarget) {
        // Round 5 L: march to capture point and channel until owned.
        var _cp = b._captureTarget;
        if (_cp.owner === b.factionId && gameTime < _cp.buffUntil) {
          b._aiState = 'push'; b._captureTarget = null;
        } else {
          var _cdx = _cp.x - b.x, _cdy = _cp.y - b.y;
          var _cd = Math.sqrt(_cdx * _cdx + _cdy * _cdy) || 0.001;
          b.facingAngle = Math.atan2(_cdy, _cdx);
          var _standR = _cp.captureRadius * 0.7;
          if (_cd > _standR) {
            b.x += (_cdx / _cd) * bSpeed * dt;
            b.y += (_cdy / _cd) * bSpeed * dt;
          } else if (!b._captureAnnounced || gameTime - (b._captureAnnounceT || 0) > 3) {
            b._captureAnnounced = true;
            b._captureAnnounceT = gameTime;
            if (typeof floatText === 'function') floatText(b.x, b.y - 44, 'CAPTURING', { color: '#ffd060', size: 12 });
          }
          // Enemy interrupt — any enemy within 320px breaks channel to engage
          for (var _xi = 0; _xi < _allBR.length; _xi++) {
            var _xt = _allBR[_xi];
            if (_xt === b || !_xt.alive) continue;
            if (gameMode === 'team' && _xt.factionId === b.factionId) continue;
            var _xdx = _xt.x - b.x, _xdy = _xt.y - b.y;
            if (_xdx * _xdx + _xdy * _xdy < 320 * 320) {
              b._aiState = 'engage'; b._aiTarget = _xt; break;
            }
          }
        }
      } else if (b._aiState === 'engage' && b._aiTarget && b._aiTarget.alive) {
        var _edx = b._aiTarget.x - b.x, _edy = b._aiTarget.y - b.y;
        var _ed = Math.sqrt(_edx * _edx + _edy * _edy) || 0.001;
        b.facingAngle = Math.atan2(_edy, _edx);
        // Round 5 M: archetype-driven engage profile
        var _tac = _archetypeProfile(b);
        var engageRange = _tac.range;
        var _style = _tac.style;
        // Lateral tangent for flank / orbit / kite
        var _nx = -_edy / _ed, _ny = _edx / _ed;
        // Orbit direction flips every ~2s to avoid predictable arcs
        var _orbitDir = (Math.floor(gameTime / 2 + bi) % 2) ? 1 : -1;
        if (_style === 'kite') {
          // Stay at range ~engageRange, back off if closer than 0.8×
          if (_ed < engageRange * 0.8) {
            b.x -= (_edx / _ed) * bSpeed * 0.9 * dt;
            b.y -= (_edy / _ed) * bSpeed * 0.9 * dt;
          } else if (_ed > engageRange * 1.15) {
            b.x += (_edx / _ed) * bSpeed * 0.5 * dt;
            b.y += (_edy / _ed) * bSpeed * 0.5 * dt;
          }
        } else if (_style === 'orbit') {
          // Strafe around target while closing the gap
          if (_ed > engageRange) {
            b.x += (_edx / _ed) * bSpeed * 0.8 * dt;
            b.y += (_edy / _ed) * bSpeed * 0.8 * dt;
          }
          b.x += _nx * _orbitDir * bSpeed * 0.7 * dt;
          b.y += _ny * _orbitDir * bSpeed * 0.7 * dt;
        } else if (_style === 'flank') {
          // Approach at a 45° angle so the closing vector is side-on
          if (_ed > engageRange) {
            b.x += ((_edx / _ed) * 0.7 + _nx * _orbitDir * 0.5) * bSpeed * dt;
            b.y += ((_edy / _ed) * 0.7 + _ny * _orbitDir * 0.5) * bSpeed * dt;
          }
        } else if (_style === 'behindAlly') {
          // Hug the highest-HP teammate (tank/bruiser) while they absorb fire
          var _ally = null, _allyHp = 0;
          for (var _ai = 0; _ai < offlineBots.length; _ai++) {
            var _ab = offlineBots[_ai];
            if (_ab === b || !_ab.alive) continue;
            if (_ab.factionId !== b.factionId && gameMode === 'team') continue;
            if (_ab.archetype === b.archetype) continue;
            if ((_ab.hp || 0) > _allyHp) { _allyHp = _ab.hp; _ally = _ab; }
          }
          if (_ally) {
            // Stay 80px behind ally (opposite to target)
            var _alx = _ally.x + (b.x - b._aiTarget.x) / _ed * 80;
            var _aly = _ally.y + (b.y - b._aiTarget.y) / _ed * 80;
            var _adx = _alx - b.x, _ady = _aly - b.y;
            var _ad = Math.sqrt(_adx * _adx + _ady * _ady) || 0.001;
            if (_ad > 15) {
              b.x += (_adx / _ad) * bSpeed * dt;
              b.y += (_ady / _ad) * bSpeed * dt;
            }
          } else {
            // No ally — act like sharpshooter kite
            if (_ed < engageRange * 0.8) {
              b.x -= (_edx / _ed) * bSpeed * 0.8 * dt;
              b.y -= (_edy / _ed) * bSpeed * 0.8 * dt;
            }
          }
        } else {
          // 'rush' / 'duel' / default — close to engageRange
          if (_ed > engageRange) {
            b.x += (_edx / _ed) * bSpeed * dt;
            b.y += (_edy / _ed) * bSpeed * dt;
          } else if (_ed < engageRange * 0.5) {
            b.x -= (_edx / _ed) * bSpeed * 0.3 * dt;
            b.y -= (_edy / _ed) * bSpeed * 0.3 * dt;
          }
        }
        // --- Attack ---
        if (_ed < engageRange + 30 && b._attackTimer <= 0) {
          b._attackTimer = b.attackCooldown / _rageMul;
          // Round 5 N: nemesis stacks damage with each player kill (cap ×1.5)
          var _nemMul = (rivalState.nemesisId === b.factionId && b._nemesisStreak)
            ? Math.min(1.5, 1 + 0.15 * b._nemesisStreak) : 1;
          var _aDmg = Math.floor((b.attackDamage + Math.floor(Math.random() * 4)) * _rageMul * _nemMul);
          // Round 5e F2 + R5h: graduated spawn shield + 加冕 1s invulnerability
          if ((b._aiTarget === player || b._aiTarget.isLocal)) {
            if (player._invulnerableUntil && gameTime < player._invulnerableUntil) {
              _aDmg = 0;
            } else {
              var _ssMul = _spawnShieldMul(gameTime);
              if (_ssMul < 1) _aDmg = Math.max(1, Math.floor(_aDmg * _ssMul));
            }
            var _hsM = _healerInitShieldMul(b._aiTarget);
            if (_hsM < 1) _aDmg = Math.max(1, Math.floor(_aDmg * _hsM));
          }
          b._aiTarget.hp -= _aDmg;
          if (b._aiTarget === player) {
            window._dmgSourceLog = window._dmgSourceLog || {};
            window._dmgSourceLog['bot_pvp'] = (window._dmgSourceLog['bot_pvp'] || 0) + _aDmg;
          }
          // Visual feedback
          var _projAngle = Math.atan2(_edy, _edx);
          particles.push({
            x: b.x, y: b.y,
            vx: Math.cos(_projAngle) * 300, vy: Math.sin(_projAngle) * 300,
            life: 0.5, maxLife: 0.5,
            color: b.playerClass === 'warrior' ? '#ffa' : (b.playerClass === 'mage' ? '#a6f' : '#8f8'),
            size: 8, particleType: 'circle', _isProjectile: true
          });
          floatText(b._aiTarget.x, b._aiTarget.y - 16, '-' + _aDmg, { color: '#ff6666', size: 11 });
          // Hit sparks at the target — makes bot-vs-bot combat readable from across the map
          emit(b._aiTarget.x, b._aiTarget.y, '#ff4444', 5, 120);
          if (b._aiTarget === player || b._aiTarget.isLocal) {
            triggerPlayerHurt();
            if (typeof screenShake === 'function') screenShake('medium');
          }
          // Target killed?
          if (b._aiTarget.hp <= 0 && b._aiTarget.alive) {
            b._aiTarget.alive = false;
            b.kills++;
            var victimName = b._aiTarget.name || (b._aiTarget.isLocal ? '你' : '玩家');
            var killerName = b.name || 'Bot';
            killFeed.push({ text: killerName + ' 击杀了 ' + victimName, color: '#fa0', time: 5 });
            emit(b._aiTarget.x, b._aiTarget.y, '#ff4444', 18, 100);
            // Round 5 N: nemesis kill streak — +15% dmg per kill (capped above)
            if (rivalState.nemesisId === b.factionId) {
              b._nemesisStreak = (b._nemesisStreak || 0) + 1;
            }
            // Player killed by bot → spectator
            if (b._aiTarget === player || b._aiTarget.isLocal) {
              // Experiment G: nemesis tracking — 2 kills by same bot escalates
              rivalState.killedBy = rivalState.killedBy || 0;
              rivalState._lastKillerFaction = rivalState._lastKillerFaction || -1;
              if (rivalState._lastKillerFaction === b.factionId) {
                rivalState.killedBy++;
                if (rivalState.killedBy >= 2 && rivalState.nemesisId !== b.factionId) {
                  rivalState.nemesisId = b.factionId;
                  b.hp = b.maxHp = Math.round(b.maxHp * 1.5);
                  b.attackDamage = Math.round(b.attackDamage * 1.3);
                  b.radius = Math.round((b.radius || 32) * 1.15);
                  killFeed.push({ text: '⚠ ' + killerName + ' 已升级为你的 NEMESIS!', color: '#ff00aa', time: 6 });
                }
              } else {
                rivalState._lastKillerFaction = b.factionId;
                rivalState.killedBy = 1;
              }
              deathCause = '被 ' + killerName + ' 击杀';
              deathTip = deathCause;
              state = 'spectating';
              spectatorTarget = offlineBots.indexOf(b);
              if (spectatorTarget < 0) spectatorTarget = 0;
              spectatorTarget += 1; // offset 1 because allPlayers[0]=player
            }
            b._aiTarget = null;
            b._aiState = 'patrol';
          }
        }
      } else {
        // Legacy patrol fallback — bias toward storm center like 'push'
        b._patrolAngle = b._patrolAngle || 0;
        b._patrolAngle += (Math.random() - 0.5) * 1.2 * dt;
        var _lpcx = stormZone.centerX - b.x, _lpcy = stormZone.centerY - b.y;
        var _lpd = Math.max(1, Math.sqrt(_lpcx * _lpcx + _lpcy * _lpcy));
        b.x += ((_lpcx / _lpd) * 0.6 + Math.cos(b._patrolAngle) * 0.4) * bSpeed * 0.55 * dt;
        b.y += ((_lpcy / _lpd) * 0.6 + Math.sin(b._patrolAngle) * 0.4) * bSpeed * 0.55 * dt;
        b.facingAngle = b._patrolAngle;
      }
      // Decor collision — slide on obstacles so bots don't clip through houses
      var _bMove = moveWithCollision(_bPreX, _bPreY, b.x, b.y, (b.radius || 32) * 0.55);
      b.x = _bMove.x; b.y = _bMove.y;
      // Stuck detection: if blocked and haven't moved noticeably for 1s,
      // pick a random tangent direction for the next decision.
      if (_bMove.blocked) {
        b._stuckTimer = (b._stuckTimer || 0) + dt;
        if (b._stuckTimer > 1.0) {
          b._stuckTimer = 0;
          b._patrolAngle = Math.random() * Math.PI * 2;
          b._nextDecision = 0.2; // re-decide soon
          // Nudge away along the random direction to break contact
          var _nudge = 18;
          var nx = b.x + Math.cos(b._patrolAngle) * _nudge;
          var ny = b.y + Math.sin(b._patrolAngle) * _nudge;
          b.x = nx; b.y = ny;
        }
      } else {
        b._stuckTimer = 0;
      }
      // Keep in bounds
      b.x = Math.max(b.radius + 5, Math.min(WORLD_W - b.radius - 5, b.x));
      b.y = Math.max(b.radius + 5, Math.min(WORLD_H - b.radius - 5, b.y));
    }

    // === Storm zone shrink ===
    if (stormZone.active && gameTime > (stormZone._shrinkDelay || 45)) {
      stormZone.radius = Math.max(stormZone._minRadius || 80, stormZone.radius - stormZone.shrinkRate * dt);
    }
    // Round 5d F2 — altar unlock banner when invulnerability lifts
    if (_activeBossRef && _activeBossRef._isAltar && _activeBossRef._lockedUntil
        && !_activeBossRef._unlockedAnnounced && gameTime >= _activeBossRef._lockedUntil) {
      _activeBossRef._unlockedAnnounced = true;
      bossDropBanner.active = true;
      bossDropBanner.timer = 4.0;
      bossDropBanner.text = '⚡ 中央祭坛已开放 — 击破获 +300 XP + 3 传说技能 ⚡';
      bossDropBanner.zoneName = '中央祭坛';
      killFeed.push({ text: '⚡ 中央祭坛已开放! ⚡', color: '#ffd060', time: 6 });
      // Round 5f F2 — beefier unlock cue: heavy shake + strong gold flash + 5s big banner
      if (typeof screenShake === 'function') screenShake(22, 900);
      if (typeof screenFlash !== 'undefined') { screenFlash.color = '#ffd060'; screenFlash.alpha = 0.7; }
      if (typeof playSound === 'function') playSound('boss_warn');
      window._altarBigBanner = { until: gameTime + 5, text: '⚡ 祭坛已开放！⚡' };
    }
    // Round 5c→5d F2 — last 60s safe zone target raised 200 → 400 so the
    // raid has room to maneuver instead of a death-pile.
    if (stormZone.active && _activeBossRef && _activeBossRef._isAltar && _activeBossRef.alive) {
      var _matchEnd = 240; // 4-min target match length
      if (gameTime > _matchEnd - 60) {
        var _pullT = Math.min(1, (gameTime - (_matchEnd - 60)) / 60);
        var _targetR = 400;
        if (stormZone.radius > _targetR) {
          stormZone.radius = stormZone.radius * (1 - _pullT * 0.05) + _targetR * (_pullT * 0.05);
        }
      }
    }
    if (stormZone.active && !(stormZone.radius > 1)) stormZone.radius = 1;
    // Player storm damage (reduced 50% during 20s spawn shield — Round 5d F3)
    if (stormZone.active && player.alive) {
      var _psd = Math.sqrt((player.x - stormZone.centerX) * (player.x - stormZone.centerX) + (player.y - stormZone.centerY) * (player.y - stormZone.centerY));
      if (_psd > stormZone.radius) {
        // Round 5e F2 — graduated spawn shield applies to storm tick too
        var _ssM = _spawnShieldMul(gameTime);
        var _stormDmg = 8 * _ssM * _healerInitShieldMul(player) * _abilityDmgScale();
        player.hp -= _stormDmg * dt;
        window._stormDoTCount = (window._stormDoTCount || 0) + 1;
        window._dmgSourceLog = window._dmgSourceLog || {};
        window._dmgSourceLog['storm'] = (window._dmgSourceLog['storm'] || 0) + _stormDmg * dt;
        // Pulse hurt vignette at ~2Hz while outside the safe zone
        if (playerHurtVignette.timer <= 0) triggerPlayerHurt();
        // One alert sound on edge-transition, then throttle to every 3s
        player._stormAlertAt = player._stormAlertAt || 0;
        if (!player._inStorm || (gameTime - player._stormAlertAt) > 3) {
          playSound('storm_alert');
          player._stormAlertAt = gameTime;
        }
        player._inStorm = true;
        if (player.hp <= 0 && player.alive) {
          player.hp = 0; player.alive = false;
          deathCause = '被毒圈击杀';
          deathTip = deathCause;
          state = 'spectating';
          spectatorTarget = 1;
        }
      } else {
        player._inStorm = false;
      }
    }
    // === Victory check — last alive wins ===
    var _aliveCount = 0;
    var _lastAlive = null;
    for (var _vi = 0; _vi < _allBR.length; _vi++) {
      if (_allBR[_vi].alive) { _aliveCount++; _lastAlive = _allBR[_vi]; }
    }
    if (_aliveCount <= 1 && state === 'playing') {
      if (_lastAlive === player) {
        victoryWin = true;
        playSound('victory');
        finalizeGameRewards();
        state = 'gameOver';
      } else if (_aliveCount === 0 || (_lastAlive && _lastAlive !== player)) {
        victoryWin = false;
        finalizeGameRewards();
        state = 'gameOver';
      }
    } else if (_aliveCount <= 1 && state === 'spectating') {
      finalizeGameRewards();
      state = 'gameOver';
    }

    // BR + MOBA: continuous mob field (no "第 N 波" banner) — bots and
    // players farm to level up; boss drops on cadence.
    updateBRMobField(dt);
    // Experiment C: capture tick + buff application on strategic points
    updateStrategicPoints(dt);
    applyStrategicBuffs(dt);
    // Combo window tick
    updateComboState(dt);
    updateSkillPickups(dt);
    updateKillShatters(dt);
    // Round 3 H: announce RIVAL once countdown elapses
    if (rivalState._pendingAnnounce > 0) {
      rivalState._pendingAnnounce -= dt;
      if (rivalState._pendingAnnounce <= 0 && rivalState.botId >= 0) {
        bossSlainBanner.active = true;
        bossSlainBanner.timer = 0;
        bossSlainBanner.duration = 2.4;
        bossSlainBanner.name = '⚡ 你的 RIVAL: ' + rivalState._announceName +
                               (rivalState._announceArch ? ' ('+rivalState._announceArch+')' : '');
        bossSlainBanner._rivalMode = true;
        bossSlainBanner._announceMode = true;
        screenFlash.color = '#ff3030'; screenFlash.alpha = 0.3;
      }
    }
    // Round 2: drain queued level-ups once banners clear
    if (_levelUpQueue.pending > 0) {
      _levelUpQueue.wait -= dt;
      var _stillBanner = (bossSlainBanner.active || synergyBanner.active);
      if (!_stillBanner && _levelUpQueue.wait <= 0 && state === 'playing') {
        _levelUpQueue.pending--;
        triggerLevelUp();
      }
    }
    // Experiment D: boss slain banner timer
    if (bossSlainBanner.active) {
      bossSlainBanner.timer += dt;
      if (bossSlainBanner.timer >= bossSlainBanner.duration) bossSlainBanner.active = false;
    }
    // Experiment F: synergy banner timer
    if (synergyBanner.active) {
      synergyBanner.timer += dt;
      if (synergyBanner.timer >= synergyBanner.duration) synergyBanner.active = false;
    }
    // Experiment E: world events tick
    updateWorldEvent(dt);

    // === Class-based projectile FX update (trail particles) ===
    for (var _fxi = offlineSkillFx.length - 1; _fxi >= 0; _fxi--) {
      var _fx = offlineSkillFx[_fxi];
      _fx.life -= dt;
      if (_fx.life <= 0) {
        // ldoe-overhaul-01: blood spurt impact (dark red, short cone-shaped burst)
        for (var _imp = 0; _imp < 7; _imp++) {
          var _ia = (_fx.angle || 0) + (Math.random() - 0.5) * 1.4;
          var _is = 40 + Math.random() * 60;
          particles.push({
            x: _fx.x, y: _fx.y,
            vx: Math.cos(_ia) * _is, vy: Math.sin(_ia) * _is,
            life: 0.3, maxLife: 0.3,
            color: Math.random() < 0.6 ? '#4a1a14' : '#6e2a1c',
            size: 2 + Math.random() * 1.5,
            particleType: 'circle'
          });
        }
        offlineSkillFx.splice(_fxi, 1);
        continue;
      }
      _fx.x += _fx.vx * dt;
      _fx.y += _fx.vy * dt;
    }

    // === Pickup magnetism — gems and coins fly toward player when close ===
    var pickupR = 18;
    var magnetR = 110 + (player._pickupRange || 0);
    for (var _gi = gems.length - 1; _gi >= 0; _gi--) {
      var _gg = gems[_gi];
      if (!_gg) { gems.splice(_gi, 1); continue; }
      var _gdx = player.x - _gg.x, _gdy = player.y - _gg.y;
      var _gd = Math.sqrt(_gdx * _gdx + _gdy * _gdy);
      if (_gd < pickupR) {
        // Experiment E: double XP event multiplier
        var _xpGain = _gg.xp || 10;
        if (player._doubleXPUntil && gameTime < player._doubleXPUntil) _xpGain *= 2;
        playerXP += _xpGain;
        emit(_gg.x, _gg.y, '#88ffff', 6, 60);
        floatText(player.x, player.y - 24, '+' + _xpGain + 'XP', { color: '#88ffdd', size: 11 });
        playSound('pickup_gem');
        gems.splice(_gi, 1);
        if (playerXP >= xpToNextLevel) triggerLevelUp();
        continue;
      }
      // Initial toss (first ~0.4s of flight)
      if (!_gg.magnetized && _gg._t < 0.4) {
        _gg.x += (_gg.vx || 0) * dt;
        _gg.y += (_gg.vy || 0) * dt;
        _gg.vx = (_gg.vx || 0) * 0.9;
        _gg.vy = (_gg.vy || 0) * 0.9 + 120 * dt; // mild gravity
      }
      // Magnet pull
      if (_gd < magnetR || _gg.magnetized) {
        _gg.magnetized = true;
        var _pullSpeed = 260 + Math.max(0, (magnetR - _gd)) * 2.2;
        _gg.x += (_gdx / _gd) * _pullSpeed * dt;
        _gg.y += (_gdy / _gd) * _pullSpeed * dt;
      }
    }
    for (var _ci2 = coins.length - 1; _ci2 >= 0; _ci2--) {
      var _cc2 = coins[_ci2];
      if (!_cc2) { coins.splice(_ci2, 1); continue; }
      _cc2._t = (_cc2._t || 0) + dt;
      var _cdx = player.x - _cc2.x, _cdy = player.y - _cc2.y;
      var _cd = Math.sqrt(_cdx * _cdx + _cdy * _cdy);
      if (_cd < pickupR) {
        gold += _cc2.amount || 5;
        emit(_cc2.x, _cc2.y, '#ffd700', 8, 80);
        floatText(player.x, player.y - 36, '+' + (_cc2.amount || 5) + '💰', { color: '#ffd700', size: 12 });
        playSound('pickup_gold');
        coins.splice(_ci2, 1);
        continue;
      }
      if (!_cc2.magnetized && _cc2._t < 0.4) {
        _cc2.x += (_cc2.vx || 0) * dt;
        _cc2.y += (_cc2.vy || 0) * dt;
        _cc2.vx = (_cc2.vx || 0) * 0.9;
        _cc2.vy = (_cc2.vy || 0) * 0.9 + 140 * dt;
      }
      if (_cd < magnetR || _cc2.magnetized) {
        _cc2.magnetized = true;
        var _csp = 240 + Math.max(0, (magnetR - _cd)) * 2.2;
        _cc2.x += (_cdx / _cd) * _csp * dt;
        _cc2.y += (_cdy / _cd) * _csp * dt;
      }
      // Timeout — remove old unclaimed coins after 15s
      if (_cc2._t > 15) coins.splice(_ci2, 1);
    }

    // Update entities array for rendering (bridge offline→render)
    entities = offlineEnemies.filter(function(e) { return e.alive; }).map(function(e) {
      return {
        x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, radius: e.radius,
        type: 'enemy', enemyType: e.type, color: e.color,
        hostile: e.hostile, alive: e.alive,
        isBoss: e.type === 'boss', miniBoss: e.type === 'miniBoss',
        bossTypeId: e.bossTypeId, bossTypeName: e.bossTypeName
      };
    });

    // Update allPlayers to include bots for rendering
    allPlayers = [player].concat(offlineBots);
    localPlayerId = 0;
  }

  function offlinePlayerUpdate(dt) {
    if (!player || !player.alive) return;
    // R5v F3 — healer heal aura passive: self +1.5 HP/s always; in team mode
    // ally allies within 200px also +0.8 HP/s. Since healer is soloOnly for
    // now, the team branch is dormant.
    // R5aa F3 — low-HP emergency self-heal: at < 50% HP, heal rate ×2 (3.0/s).
    // R5ab F1 — throttle heal tick to every 0.5s (accumulate dt) so the per-frame
    // work at 60 FPS drops 30× (2 Hz vs 60 Hz). Total HP/s preserved by scaling
    // heal amount by accumulated interval.
    if (player.playerClass === 'healer') {
      player._healerTickAcc = (player._healerTickAcc || 0) + dt;
      if (player._healerTickAcc >= 0.5) {
        var _healRate = (player.hp < player.maxHp * 0.5) ? 3.0 : 1.5;
        player.hp = Math.min(player.maxHp, player.hp + _healRate * player._healerTickAcc);
        if (gameMode === 'team' && offlineBots) {
          var _healR2 = 200 * 200;
          for (var _hi = 0; _hi < offlineBots.length; _hi++) {
            var _hb = offlineBots[_hi];
            if (!_hb.alive || _hb.factionId !== player.factionId) continue;
            var _hdx = _hb.x - player.x, _hdy = _hb.y - player.y;
            if (_hdx * _hdx + _hdy * _hdy < _healR2) {
              _hb.hp = Math.min(_hb.maxHp, _hb.hp + 0.8 * player._healerTickAcc);
            }
          }
        }
        player._healerTickAcc = 0;
      }
    }
    // Move player based on input (keyboard/mouse)
    var moveX = 0, moveY = 0;
    if (joystick.active && (Math.abs(joystick.dx) > 0.01 || Math.abs(joystick.dy) > 0.01)) {
      moveX = joystick.dx; moveY = joystick.dy;
    } else {
      var worldMX = mouseX + cameraX, worldMY = mouseY + cameraY;
      var pdx = worldMX - player.x, pdy = worldMY - player.y;
      var pdist = Math.sqrt(pdx*pdx + pdy*pdy);
      if (pdist > 15) { moveX = pdx/pdist; moveY = pdy/pdist; }
    }
    var _pOldX = player.x, _pOldY = player.y;
    // Round 3 K: combo speed buff
    var _spdMul = (player._comboSpdUntil && gameTime < player._comboSpdUntil) ? 1.20 : 1.0;
    var _pNewX = player.x + moveX * player.speed * _spdMul * dt;
    var _pNewY = player.y + moveY * player.speed * _spdMul * dt;
    // Decor collision — slide on walls so movement isn't fully blocked.
    // Radius uses a smaller collision radius than visual (player.radius*0.55)
    // so sprite can visually hug walls but collider only catches the body core.
    var _pMove = moveWithCollision(_pOldX, _pOldY, _pNewX, _pNewY, player.radius * 0.55);
    player.x = _pMove.x; player.y = _pMove.y;
    player.x = Math.max(player.radius, Math.min(WORLD_W - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(WORLD_H - player.radius, player.y));
    if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
      player.facingAngle = Math.atan2(moveY, moveX);
      // Footstep SFX every ~0.35s while moving; biome-aware when autotile grid exists
      player._stepTimer = (player._stepTimer || 0) - dt;
      if (player._stepTimer <= 0) {
        player._stepTimer = 0.34 + Math.random() * 0.08;
        var _tsz = 64;
        var _tx = Math.floor(player.x / _tsz), _ty = Math.floor(player.y / _tsz);
        var _bi = (typeof _biomeAt === 'function') ? _biomeAt(_tx, _ty) : 0;
        playSound(_bi === 1 ? 'step_dirt' : 'step_grass');
      }
      // Feed playerTrail for offline mode (network mode pushes in networkUpdate)
      playerTrail.push({ x: player.x, y: player.y });
      if (playerTrail.length > playerTrailMax) playerTrail.shift();
    }
    // Auto attack nearby enemies + hostile bot players
    player._timer = (player._timer || 0) - dt;
    if (player._timer <= 0) {
      // Round 5f F3 / R5g F2 / R5k F2 — class atk-cd multipliers
      // warrior 首战狂怒: -25% cd first 60s
      // warrior on lane-3 maps: extra -10% cd always (lane_b μ=1.2 kills buff)
      // scout 速射:        -20% cd always (matches new HP 165 buff)
      var _cls = player.playerClass;
      var _atkCdMul = 1.0;
      if (_cls === 'warrior') {
        if (gameTime < 60) _atkCdMul = 0.75;
        if (MAP_DATA && MAP_DATA.layout === 'lane-3') _atkCdMul *= 0.9;
      } else if (_cls === 'scout') {
        _atkCdMul = 0.80;
      } else if (_cls === 'assassin') {
        _atkCdMul = 0.85; // snappy knives
      }
      // R6-control F1 — warrior/scout active ability: +50% attack speed.
      if (player._abilityAtkSpdUntil && gameTime < player._abilityAtkSpdUntil) {
        _atkCdMul *= (1 / 1.5);
      }
      player._timer = player.attackCooldown * _atkCdMul;
      // R5j F2 + R5t F3 — auto-attack scan radius.
      // scout always 520 (sharpshooter identity, holds across both maps).
      // warrior on lane-3 also 520 (5/5 timeouts: static-player tests can't
      // reach bots at 1000+ px across river; matches scout lane success path).
      var _scanR = 400;
      if (player.playerClass === 'scout') _scanR = 520;
      else if (player.playerClass === 'warrior' && MAP_DATA && MAP_DATA.layout === 'lane-3') _scanR = 520;
      var closest = null, closestDist = _scanR;
      // Round 5g F1 — altar priority: when an unlocked altar is in attack
      // range, lock onto it even if a normal mob is closer. The altar surface
      // (radius 80) gets a 100px proximity boost so player attacks land on
      // the prize, not the swarm next to it.
      var _altarTarget = null, _altarSurfaceDist = Infinity;
      for (var _ai = 0; _ai < offlineEnemies.length; _ai++) {
        var _ae = offlineEnemies[_ai];
        if (!_ae.alive || !_ae._isAltar) continue;
        var _aex = _ae.x - player.x, _aey = _ae.y - player.y;
        var _aed = Math.sqrt(_aex*_aex + _aey*_aey) - (_ae.radius || 0);
        var _aLocked = _ae._lockedUntil && gameTime < _ae._lockedUntil;
        if (!_aLocked && _aed < 280) { _altarTarget = _ae; _altarSurfaceDist = _aed; }
      }
      if (_altarTarget) { closest = _altarTarget; closestDist = _altarSurfaceDist; }
      else for (var i = 0; i < offlineEnemies.length; i++) {
        var e = offlineEnemies[i];
        if (!e.alive) continue;
        var edx = e.x - player.x, edy = e.y - player.y;
        var ed = Math.sqrt(edx*edx + edy*edy);
        if (ed < closestDist) { closest = e; closestDist = ed; }
      }
      // Scan hostile bot players (different faction)
      for (var bi = 0; bi < offlineBots.length; bi++) {
        var bot = offlineBots[bi];
        if (!bot.alive || bot.factionId === player.factionId) continue;
        var bdx = bot.x - player.x, bdy = bot.y - player.y;
        var bd = Math.sqrt(bdx*bdx + bdy*bdy);
        if (bd < closestDist) { closest = bot; closestDist = bd; }
      }
      if (closest) {
        // Wave 1: damage immunity window (Plan A+C for normal enemies)
        if (closest._damageImmuneUntil && gameTime < closest._damageImmuneUntil) {
          // Skip this attack tick — visual: briefly don't fire
        } else {
        var angle = Math.atan2(closest.y - player.y, closest.x - player.x);
        // Trigger sprite attack animation (PM decision 2026-04-11, Plan C:
        // movement can interrupt attack; re-triggering resets to col 0).
        // Durations: warrior 6f/12fps=0.50s, mage 7f/12fps=0.58s, scout 13f/14fps=0.93s.
        var _atkDur = { warrior: 0.50, mage: 0.58, scout: 0.93 }[player.playerClass || selectedClass] || 0.50;
        player._attackStart = gameTime;
        player._attackUntil = gameTime + _atkDur;
        player._attackFacing = angle;
        playSound('shoot');
        // ldoe-overhaul-01: unified bullet tracer (no class-specific kind variation)
        var projSpeed = 600;
        var fxKind = 'bullet';
        var _muzX = player.x + Math.cos(angle) * player.radius * 1.2;
        var _muzY = player.y + Math.sin(angle) * player.radius * 1.2;
        offlineSkillFx.push({
          kind: fxKind,
          x: _muzX, y: _muzY,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          angle: angle,
          life: 0.4, maxLife: 0.4,
          color: '#ffd24a',
          targetX: closest.x, targetY: closest.y
        });
        // LDOE muzzle flash — single explicit cone (long > wide), 0.1s.
        // Uses particleType 'muzzleCone' which renders as a triangle pointing
        // along (vx,vy). Bright yellow #ffeb3b + white core, distinct from auras.
        particles.push({
          x: _muzX, y: _muzY,
          vx: Math.cos(angle) * 1, vy: Math.sin(angle) * 1, // direction marker, not motion
          life: 0.1, maxLife: 0.1,
          color: '#ffeb3b', size: 48,
          particleType: 'muzzleCone', _angle: angle
        });
        // 2 small spark particles, sideways spread (smoke flash detail)
        for (var _muz = 0; _muz < 2; _muz++) {
          var _muzA = angle + (_muz === 0 ? -0.3 : 0.3);
          particles.push({
            x: _muzX, y: _muzY,
            vx: Math.cos(_muzA) * 80, vy: Math.sin(_muzA) * 80,
            life: 0.12, maxLife: 0.12,
            color: '#ff8c2a', size: 2.5, particleType: 'circle'
          });
        }
        window.__lastMuzzleAt = { x: _muzX, y: _muzY, t: gameTime };
        // Casing eject — small gold rect, right-rear of player, gravity
        var _csA = angle - Math.PI * 0.55; // ~100° behind-right of fire dir
        var _csX = player.x + Math.cos(_csA) * player.radius * 0.6;
        var _csY = player.y + Math.sin(_csA) * player.radius * 0.6;
        particles.push({
          x: _csX, y: _csY,
          vx: Math.cos(_csA) * 60 + (Math.random()-0.5) * 30,
          vy: Math.sin(_csA) * 60 - 80,
          life: 0.45, maxLife: 0.45,
          color: '#cfa84a', size: 1.5,
          particleType: 'casing', _gravity: 220
        });
        window.__lastCasingAt = { x: _csX, y: _csY, t: gameTime };
        // Wave 1: damage roll with crit chance
        var _rawDmg = player.attackDamage;
        // Round 3 K: combo attack buff (+50% for 5s)
        if (player._comboAtkUntil && gameTime < player._comboAtkUntil) _rawDmg *= 1.5;
        var _isCrit = Math.random() < (player.critChance || 0);
        var _dmgValue = _isCrit ? Math.floor(_rawDmg * 1.75) : Math.floor(_rawDmg);
        // R5j F2 — scout 伏击: first hit on a fresh bot target +50% damage.
        if (player.playerClass === 'scout' && closest && closest.isBot && !closest._scoutHitOnce) {
          closest._scoutHitOnce = true;
          _dmgValue = Math.floor(_dmgValue * 1.5);
          if (typeof floatText === 'function') floatText(closest.x, closest.y - 30, '伏击!', { color: '#aaffaa', size: 14 });
        }
        // R5n F2 + R5q F2 — assassin 背刺: 2x damage when hitting a target
        // whose facing is within ±60° of "away from attacker".
        // R5q removed the "背刺 ×2!" popup floatText (was 386 strokeText
        // hits/3s — 3× other classes). The doubled damage number is its own
        // visual signal; just tint it purple via _backstab flag so the main
        // floats loop colours it without spawning a second text.
        var _wasBackstab = false;
        if (player.playerClass === 'assassin' && closest && closest.facingAngle != null) {
          var _attackAng = Math.atan2(closest.y - player.y, closest.x - player.x);
          var _delta = Math.atan2(Math.sin(closest.facingAngle - _attackAng), Math.cos(closest.facingAngle - _attackAng));
          if (Math.abs(_delta) < Math.PI / 3) {
            _dmgValue = Math.floor(_dmgValue * 2);
            _wasBackstab = true;
          }
        }
        // Round 5d F2 — altar invulnerable until unlock; show "未解锁" hint
        if (closest._isAltar && closest._lockedUntil && gameTime < closest._lockedUntil) {
          if (typeof floatText === 'function') {
            var _lk = Math.ceil(closest._lockedUntil - gameTime);
            floatText(closest.x, closest.y - 60, '未解锁 ' + _lk + 's', { color: '#88aaff', size: 14 });
          }
          _dmgValue = 0;
        }
        closest.hp -= _dmgValue;
        // R5b T2 + R5h+R5i: altar struck — debris + 350ms golden flash; every
        // 3rd hit OR crossing 75/50/25% HP thresholds upgrades to BIG burst.
        if (closest._isAltar && _dmgValue > 0) {
          closest._hitCount = (closest._hitCount || 0) + 1;
          var _maxHp = closest.maxHp || 800;
          var _prevHpFrac = ((closest.hp + _dmgValue) / _maxHp);
          var _curHpFrac = (closest.hp / _maxHp);
          var _crossedThresh = false;
          [0.75, 0.50, 0.25].forEach(function(th) {
            if (_prevHpFrac > th && _curHpFrac <= th) _crossedThresh = true;
          });
          var _bigBurst = (closest._hitCount % 3 === 0) || _crossedThresh;
          // R5k F1 — cap active flashes at 6 so spam-hit altar can't pile up
          // 20+ overlapping scale-1.5 SVGs in drawLandmarkAura.
          if (R5H_FX.activeFlashes.length >= 6) R5H_FX.activeFlashes.shift();
          R5H_FX.activeFlashes.push({ x: closest.x, y: closest.y, t: 0, dur: _bigBurst ? 0.5 : 0.35, big: _bigBurst });
          if (_bigBurst && typeof screenShake === 'function') screenShake('light');
          var _dn = 3 + Math.floor(Math.random() * 3);
          for (var _di = 0; _di < _dn; _di++) {
            var _da = Math.random() * Math.PI * 2;
            var _ds = 80 + Math.random() * 120;
            particles.push({
              x: closest.x + Math.cos(_da) * closest.radius * 0.7,
              y: closest.y + Math.sin(_da) * closest.radius * 0.7,
              vx: Math.cos(_da) * _ds, vy: Math.sin(_da) * _ds - 40,
              life: 0.7, maxLife: 0.7,
              color: (_di & 1) ? '#ffd060' : '#a89070',
              size: 6 + Math.random() * 4, particleType: 'circle'
            });
          }
          if (typeof screenShake === 'function') screenShake('light');
        }
        // Round 5 N: rival hatred — each player hit on rival adds +1; >= 5 triggers 15s rage
        if (closest.isBot && rivalState.botId === closest.factionId) {
          closest._rivalHatred = (closest._rivalHatred || 0) + 1;
          if (closest._rivalHatred >= 5 && !(closest._rageUntil && gameTime < closest._rageUntil)) {
            closest._rageUntil = gameTime + 15;
            if (typeof floatText === 'function') floatText(closest.x, closest.y - 60, 'RAGE!', { color: '#ff4040', size: 18 });
            killFeed.push({ text: '⚠ ' + (closest.name || 'Rival') + ' 狂暴!', color: '#ff4040', time: 4 });
          }
        }
        // Wave 1: hit feedback — hitStop + shake + damage number + particles + knockback
        triggerHitStop(_isCrit ? 'crit' : 'normal');
        screenShake(_isCrit ? 'medium' : 'light');
        playSound('attack');
        // Particle type by class: warrior=melee, mage=magic, scout=ranged
        var _pType = selectedClass === 'warrior' ? 'melee' : (selectedClass === 'mage' ? 'magic' : 'ranged');
        var _pColor = selectedClass === 'warrior' ? '#dd2020' : (selectedClass === 'mage' ? '#a080ff' : '#ffaa33');
        emit(closest.x, closest.y, _pType, { color: _pColor });
        floatText(closest.x, closest.y - 20, _dmgValue + (_isCrit ? '!' : (_wasBackstab ? '✦' : '')), _wasBackstab ? { color: '#c48cff', size: 16, crit: true } : { type: _isCrit ? 'crit' : 'normal' });
        playSound('hit');
        applyKnockback(closest, _dmgValue, player.x, player.y);
        if (closest.hp <= 0) {
          closest.alive = false;
          // Only player-vs-player kills count as "kills"; mob kills roll into farmKills.
          if (closest.isBot) {
            kills++; player.kills++;
            player._koBonusUsed = player._koBonusUsed || 0;
            window._koBonusAttempts = (window._koBonusAttempts || 0) + 1;
            if (player._koBonusUsed < 3) {
              window._koBonusFired = (window._koBonusFired || 0) + 1;
              player._koBonusUsed++;
              playerXP = xpToNextLevel + 1;
              if (typeof triggerPowerSpike === 'function') {
                triggerPowerSpike('KO! ' + player._koBonusUsed + '/3 — POWER UP!');
              }
              screenFlash.color = '#ff3030'; screenFlash.alpha = 0.7;
              screenShake(16, 320);
            }
            // R5m F2 — PvP kill distinct SFX (boss kill handled below)
            if (!closest.bossTypeId && typeof playSound === 'function') playSound('pvp_kill');
            // Experiment B: PVP kill restores 30% of maxHp + kill-cinema shake
            var _heal = Math.round(player.maxHp * 0.30);
            player.hp = Math.min(player.maxHp, player.hp + _heal);
            floatText(player.x, player.y - 56, '+' + _heal + ' HP', { color: '#4fff80', size: 14 });
            // Experiment D: full-screen flash + heavy shake on bot kill
            screenFlash.color = '#ffd700'; screenFlash.alpha = 0.55;
            screenShake(10, 220);
            triggerHitStop('crit');
            dropSkillPickup(closest.x, closest.y, closest.color || '#ffd700');
            // Experiment G: rival kill special handling
            if (rivalState.botId === closest.factionId) {
              playerXP += 80;
              triggerRivalSlainBanner(closest.name || '宿敌');
              rivalState.botId = -1;
            } else if (rivalState.nemesisId === closest.factionId) {
              playerXP += 120;
              triggerRivalSlainBanner((closest.name || 'NEMESIS') + ' (NEMESIS)');
              rivalState.nemesisId = -1;
              rivalState.killedBy = 0;
              // Round 5 N: RIVALRY ENDED global broadcast
              killFeed.push({ text: '★ RIVALRY ENDED — 你击败了 ' + (closest.name || 'NEMESIS') + ' ★', color: '#9ae06a', time: 6 });
              if (typeof floatText === 'function') floatText(closest.x, closest.y - 80, 'RIVALRY ENDED!', { color: '#9ae06a', size: 22 });
              screenFlash.color = '#9ae06a'; screenFlash.alpha = 0.35;
            }
          }
          else { farmKills++; player._farmKills = (player._farmKills || 0) + 1; }
          // Boss kill bonus (Experiment B): legendary XP shard + screen flash.
          // Delayed 0.4s via setTimeout so it doesn't collide visually with the
          // combo banner / levelUp dialog spawned on the same frame.
          if (closest.bossTypeId) {
            var _bossXP = 120;
            var _bx = closest.x, _by = closest.y;
            // Round 5b T2: altar shatter trigger + global broadcast
            if (closest._isAltar) {
              ALTAR_FX.activeShatter = { x: _bx, y: _by, t: 0, dur: 1.4 };
              if (typeof playSound === 'function') playSound('altar_boom');
              _bossXP = 300;
              killFeed.push({ text: '★ ' + (player.name || '你') + ' 击破中央祭坛 — 传说降临 ★', color: '#ffd060', time: 8 });
              if (typeof screenShake === 'function') screenShake(18, 600);
              if (typeof screenFlash !== 'undefined') { screenFlash.color = '#ffd060'; screenFlash.alpha = 0.55; }
              for (var _lp = 0; _lp < 3; _lp++) {
                var _la = Math.PI * 2 * _lp / 3;
                if (typeof dropSkillPickup === 'function') {
                  dropSkillPickup(_bx + Math.cos(_la) * 60, _by + Math.sin(_la) * 60, '#ffd060');
                }
              }
              // Round 5e F3 — global enemy slow 30% for 3 min + 圣堂之主 crown 5 min on player
              window._altarSlainAt = gameTime;
              window._altarSlowUntil = gameTime + 180;
              player._templeMasterUntil = gameTime + 300;
              killFeed.push({ text: '⏳ 全场敌人减速 30% 持续 3 分钟', color: '#88ddff', time: 8 });
              killFeed.push({ text: '👑 你成为圣堂之主 — 5 分钟特权光环', color: '#ffd060', time: 8 });
              // R5h F2: queue 2s 加冕 spotlight (waits for any open levelUp modal to clear)
              R5H_FX.crownPlay = { armed: true, t: 0, dur: 2.0, invulnUntil: gameTime + 1.0 };
              player._invulnerableUntil = gameTime + 1.0;
              if (typeof playSound === 'function') playSound('crown_don');
            }
            playerXP += _bossXP;
            // Extra gems immediately (pickup goes through magnet anyway)
            for (var _bsi = 0; _bsi < 8; _bsi++) {
              var _bsa = Math.PI * 2 * _bsi / 8;
              gems.push({
                x: _bx + Math.cos(_bsa) * 8, y: _by + Math.sin(_bsa) * 8,
                xp: 15, radius: 5, _t: 0, gemTier: 'large',
                vx: Math.cos(_bsa) * 120, vy: Math.sin(_bsa) * 120 - 40, magnetized: false
              });
            }
            setTimeout(function() {
              if (typeof floatText === 'function') floatText(_bx, _by - 30, '★ BOSS SHARD +' + _bossXP + ' XP', { color: '#ffd700', size: 18 });
              screenFlash.color = '#ffd700'; screenFlash.alpha = 0.4;
            }, 400);
            // Experiment D: slow-mo + BOSS SLAIN banner + 3-choice perma buff
            triggerHitStop('bossKill');
            screenShake(18, 700);
            bossSlainBanner.active = true;
            bossSlainBanner.timer = 0;
            bossSlainBanner.name = closest.bossTypeName || 'BOSS';
            openBossBuffChoice();
            // R5m F2 — boss slain horn
            if (typeof playSound === 'function') playSound('boss_slain');
          }
          // Kill burst — bigger particles + hit-stop kill level + heavier shake
          emit(closest.x, closest.y, 'kill', { color: closest.color });
          triggerKillShatter(closest.x, closest.y);
          triggerHitStop('kill');
          screenShake('medium');
          floatText(closest.x, closest.y, '+' + Math.floor(player.attackDamage), { color: '#ffd700', size: 16 });
          playSound('kill');
          // Combo popups (DOUBLE KILL / TRIPLE KILL / ...) are PVP-only
          if (closest.isBot) registerCombo();
          // Wave 2: drop XP gems (magnetized in updateOfflineDemo) — bosses drop multiple
          // XP reward: bot kills are worth ~3× a normal mob so PVP is the fastest leveling path.
          var xpAmt = closest.isBot ? 30
                    : closest.type === 'boss' ? 80
                    : closest.type === 'miniBoss' ? 40
                    : closest.type === 'tank' ? 20
                    : 10;
          var gemCount = closest.type === 'boss' ? 6 : (closest.type === 'miniBoss' ? 3 : (closest.isBot ? 2 : 1));
          var perGem = Math.ceil(xpAmt / gemCount);
          for (var _gc = 0; _gc < gemCount; _gc++) {
            var _gAng = Math.random() * Math.PI * 2;
            var _gDist = gemCount > 1 ? 12 + Math.random() * 20 : 0;
            var _gTier = perGem < 20 ? 'small' : (perGem < 50 ? 'medium' : 'large');
            gems.push({
              x: closest.x + Math.cos(_gAng) * _gDist,
              y: closest.y + Math.sin(_gAng) * _gDist,
              xp: perGem,
              radius: 4,
              _t: 0,
              gemTier: _gTier,
              // Magnet state
              vx: Math.cos(_gAng) * 60,
              vy: Math.sin(_gAng) * 60 - 30,
              magnetized: false
            });
          }
          // Bosses also drop gold coins
          if (closest.type === 'boss' || closest.type === 'miniBoss') {
            var coinN = closest.type === 'boss' ? 8 : 4;
            for (var _cc = 0; _cc < coinN; _cc++) {
              var _cAng = Math.random() * Math.PI * 2;
              coins.push({
                x: closest.x + (Math.random() - 0.5) * 20,
                y: closest.y + (Math.random() - 0.5) * 20,
                amount: 5 + Math.floor(Math.random() * 6),
                _t: 0,
                vx: Math.cos(_cAng) * 80,
                vy: Math.sin(_cAng) * 80 - 40,
                magnetized: false
              });
            }
          }
        }
        } // end immunity-window else
      }
    }
    // HP regen
    player.hp = Math.min(player.maxHp, player.hp + (player.hpRegen || 0.5) * dt);
    // Collision damage from enemies
    // Wave 1: per-enemy hit cooldown so multi-frame touching doesn't spam 0.05 dmg/frame
    for (var i = 0; i < offlineEnemies.length; i++) {
      var e = offlineEnemies[i];
      if (!e.alive || !e.hostile) continue;
      var cdx = e.x - player.x, cdy = e.y - player.y;
      var cd = Math.sqrt(cdx*cdx + cdy*cdy);
      if (cd < player.radius + e.radius + 2) {
        if (!(player._comboInvUntil && gameTime < player._comboInvUntil)) {
          var _meleeDmg = 3 * dt * _healerInitShieldMul(player) * _abilityDmgScale();
          player.hp -= _meleeDmg;
          window._dmgSourceLog = window._dmgSourceLog || {};
          window._dmgSourceLog['enemy_melee'] = (window._dmgSourceLog['enemy_melee'] || 0) + _meleeDmg;
        }
        // Fire a discrete hit feedback at most every 0.4s per enemy
        e._nextHitFxAt = e._nextHitFxAt || 0;
        if (gameTime >= e._nextHitFxAt) {
          e._nextHitFxAt = gameTime + 0.4;
          var hurtDmg = Math.max(1, Math.round(3 * 0.4)); // ~1-2 per hit cycle
          triggerHitStop('normal');
          screenShake('heavy');
          emit(player.x, player.y, 'melee', { color: '#ff3030', count: 6 });
          floatText(player.x, player.y - 30, '-' + hurtDmg, { type: 'playerHurt' });
        }
        if (player.hp <= 0) { player.hp = 0; player.alive = false; state = 'gameOver'; deathCause = '被怪物击败'; }
      }
    }
    for (var _bmi = 0; _bmi < offlineBots.length; _bmi++) {
      var _bm = offlineBots[_bmi];
      if (!_bm.alive) continue;
      for (var _emi = 0; _emi < offlineEnemies.length; _emi++) {
        var _em = offlineEnemies[_emi];
        if (!_em.alive || !_em.hostile) continue;
        var _bcdx = _em.x - _bm.x, _bcdy = _em.y - _bm.y;
        var _bcd2 = _bcdx * _bcdx + _bcdy * _bcdy;
        var _bcr = (_bm.radius || 32) + (_em.radius || 16) + 2;
        if (_bcd2 < _bcr * _bcr) {
          _bm._staggerUntil = Math.max(_bm._staggerUntil || 0, gameTime + 0.3);
          _bm._attackTimer = Math.max(_bm._attackTimer, 0.3);
          window._dmgSourceLog = window._dmgSourceLog || {};
          window._dmgSourceLog['mob_stagger_bot'] = (window._dmgSourceLog['mob_stagger_bot'] || 0) + 1;
          break;
        }
      }
    }
  }

  function _connectWebSocket(playerId, roomId) {
    NetworkClient.connect(serverUrl, roomId, playerId, {
      onConnected: function(data) {
        // Send build selection and custom attributes to server
        if (selectedBuild.length > 0) {
          NetworkClient.sendBuildSelection(selectedBuild, playerAttributes);
        }
        // First registered, wait for first snapshot to start playing
      },
      onSnapshot: function(snapshot) {
        if (state === 'connecting') state = 'playing';
      },
      onDisconnect: function() {
        // Skip menu flash during intentional retry
        if (_intentionalDisconnect) { _intentionalDisconnect = false; return; }
        // If never connected, enter offline demo mode
        if (state === 'connecting') {
          startOfflineDemo();
          return;
        }
        // Try reconnect once, then go to offline mode
        if (state === 'playing' && !offlineMode) {
          state = 'connecting';
          setTimeout(function() {
            NetworkClient.connect(serverUrl, roomId, playerId, {
              onSnapshot: function() { if (state === 'connecting') state = 'playing'; },
              onDisconnect: function() { startOfflineDemo(); }
            });
          }, 2000);
        }
      }
    });
    // Safety timeout: if no connection after 3 seconds, enter offline demo
    setTimeout(function() {
      if (state === 'connecting') {
        startOfflineDemo();
      }
    }, 3000);
  }

  // === SKILL APPLICATION ===
  function applySkill(id) {
    skillLevels[id] = (skillLevels[id] || 0) + 1;
    ownedSkills.push(id);
    var lv = skillLevels[id];
    var p = player;
    switch (id) {
      case 'attack_up': p.attackDamage *= 1.25; break;
      case 'attack_speed': p.attackCooldown *= 0.85; break;
      case 'pierce': p.pierce = true; break;
      case 'scatter': p.projectileCount = 1 + lv; break;
      case 'move_speed': p.speed *= 1.1; break;
      case 'hp_regen': p.hpRegen = lv * 3; break; // DEFENSE_BUFF: 2→3 per level
      case 'shield': p.shieldActive = true; p._shieldTimer = 0; break;
      case 'chain_lightning': p._chainCount = lv; p._chainDmg = lv * 8; break;
      case 'fire_trail': p._fireDmg = lv * 4; break;
      case 'frost_aura': p.slowAura = lv * 0.2; break;
      case 'orbit': p._orbitCount = lv; p._orbitDmg = lv * 8 + p.attackDamage * 0.3; p._orbitAngle = 0; break;
      case 'thorns_aura': p._thornsDmg = lv * 15; break; // DEFENSE_BUFF: 10→15 per level
      case 'time_warp': p._timeWarp = 0.15 * lv; p._timeWarpBonus = 0.1 * lv; p.attackCooldown *= 0.93; break;
      case 'crit': p.critChance = Math.min(0.5, p.critChance + 0.05); break;
      case 'lifesteal': p.lifesteal = lv * 0.05; break;
      case 'xp_magnet': p.xpMagnetRange = 80 + lv * 50; break;
      case 'explosive': p._explosiveDmg = lv * 6; break;
      case 'max_hp': p.maxHp += 20; p.hp = Math.min(p.hp + 20, p.maxHp); break;
      // Wave 2 new imbue skills (status effect hooks — Epic 2.2 will consume these flags)
      case 'imbue_burn': p._imbueBurn = (p._imbueBurn || 0) + 1; break;
      case 'imbue_freeze': p._imbueFreeze = (p._imbueFreeze || 0) + 1; break;
      case 'imbue_poison': p._imbuePoison = (p._imbuePoison || 0) + 1; break;
      case 'imbue_shock': p._imbueShock = (p._imbueShock || 0) + 1; break;
    }
    // Check evolution: when both skills in a recipe are >= 3, trigger evolution
    if (lv >= 3) checkEvolution();
  }

  function checkEvolution() {
    for (var i = 0; i < EVOLUTION_RECIPES.length; i++) {
      var r = EVOLUTION_RECIPES[i];
      if (evolvedSkills[r.result]) continue;
      if ((skillLevels[r.a] || 0) >= 3 && (skillLevels[r.b] || 0) >= 3) {
        evolvedSkills[r.result] = true;
        // Experiment F: synergy center banner "A × B = RESULT!"
        var _aN = (SKILL_DATA[r.a] && SKILL_DATA[r.a].name) || r.a;
        var _bN = (SKILL_DATA[r.b] && SKILL_DATA[r.b].name) || r.b;
        synergyBanner.active = true;
        synergyBanner.timer = 0;
        synergyBanner.duration = 1.5;
        synergyBanner.text = _aN + ' × ' + _bN + ' = ' + r.name + '!';
        synergyBanner.color = r.color || '#ffd700';
        player._synergyColor = r.color || '#ffd700';
        player._synergyActive = true;
        // Power spike announcement (US-226)
        triggerPowerSpike('POWER UP! ' + r.name);
        // evolveCutscene (US-289): dramatic evolution announcement
        emit(player.x, player.y, r.color, 40, 200);
        emit(player.x, player.y, '#fff', 20, 150);
        screenShake(10, 600);
        screenFlash.color = r.color; screenFlash.alpha = 0.5;
        // Evolution display overlay — center screen announcement
        var evoDisplay = { active: true, timer: 1.5, name: r.name, color: r.color, icon: r.icon || '⭐' };
        if (!window._evoDisplay) window._evoDisplay = evoDisplay;
        else Object.assign(window._evoDisplay, evoDisplay);
        floatText(player.x, player.y - 40, '⭐ 进化: ' + r.name + '! ⭐', r.color, 26);
        // Apply evolution bonus
        switch (r.result) {
          case 'bullet_hell': player.projectileCount += 4; player.pierce = true; player.attackDamage *= 1.5; break;
          case 'ice_storm': player._chainCount += 5; player.slowAura = Math.max(player.slowAura, 0.5); player._explosiveDmg = (player._explosiveDmg || 0) + 20; break;
          case 'inferno': player._fireDmg = (player._fireDmg || 0) + 20; player.critChance += 0.3; break;
          case 'berserker': player.attackDamage *= 1.5; player.attackCooldown *= 0.7; break;
          case 'immortal': player.lifesteal += 0.15; player.hpRegen += 10; break;
          case 'iron_fortress': player._thornsDmg = (player._thornsDmg || 0) + 40; player._shieldCd = 3; player._armorBonus = (player._armorBonus || 0) + 15; break;
          case 'speed_demon': player.speed *= 1.5; player.slowAura = Math.max(player.slowAura, 0.6); player.dodgeChance = (player.dodgeChance || 0) + 0.1; break;
          case 'armageddon': player._orbitCount = (player._orbitCount || 0) + 4; player._explosiveDmg = (player._explosiveDmg || 0) + 30; break;
          case 'death_spiral': player._orbitCount = (player._orbitCount || 0) + 3; player._orbitDmg = (player._orbitDmg || 10) * 2.5; player.attackDamage *= 1.5; break;
          case 'living_fortress': player._thornsDmg = (player._thornsDmg || 0) + 25; player.hpRegen += 15; player.maxHp += 60; player.hp += 60; break;
          case 'chrono_burst': player._timeWarp = Math.max(player._timeWarp || 0, 0.3); player.attackCooldown *= 0.6; player.critChance += 0.15; break;
          case 'gravity_well': player.xpMagnetRange += 200; player._explosiveDmg = (player._explosiveDmg || 0) + 20; break;
          case 'titan': player.maxHp += 100; player.hp += 100; player._shieldCd = 4; player._dmgReduction = (player._dmgReduction || 0) + 0.15; break;
        }
      }
    }
  }

  // === ZONE & TERRAIN SYSTEM (US-013) ===
  var mapZones = []; // loaded from map JSON: { id, type, shape, center, radius, bounds, ... }
  var mapTerrainFeatures = []; // loaded from map JSON: { type, shape, ... }
  var zoneTypeColors = {
    spawn: 'rgba(100,200,100,0.15)',
    outer: 'rgba(80,150,80,0.12)',
    middle: 'rgba(200,180,60,0.12)',
    inner: 'rgba(200,60,60,0.12)',
    boss_lair: 'rgba(160,0,0,0.18)',
    resource: 'rgba(60,60,200,0.12)',
    safe: 'rgba(100,200,100,0.1)',
    normal: 'rgba(150,150,100,0.08)'
  };
  var zoneTypeLabels = {
    spawn: '出生点', outer: '外围区', middle: '中间区', inner: '核心区',
    boss_lair: 'Boss巢穴', resource: '资源点', safe: '安全区', normal: '普通区'
  };

  function loadMapZonesAndTerrain(mapData) {
    mapZones = [];
    mapTerrainFeatures = [];
    terrainObstacles = [];
    if (!mapData) return;
    // Load zones
    if (mapData.zones && mapData.zones.length) {
      for (var i = 0; i < mapData.zones.length; i++) {
        var z = mapData.zones[i];
        // Convert editor rect format (x,y,width,height) to bounds
        var _zBounds = z.bounds;
        if (!_zBounds && (z.x !== undefined && z.y !== undefined && z.width !== undefined)) {
          _zBounds = { x: z.x, y: z.y, width: z.width, height: z.height };
        }
        mapZones.push({
          id: z.id || z.name || ('zone_' + i),
          type: z.type || 'normal',
          shape: z.shape || (z.center ? 'circle' : 'rect'),
          center: z.center || null,
          radius: z.radius || 0,
          bounds: _zBounds || null,
          biome: z.biome || null,
          name: z.name || zoneTypeLabels[z.type] || z.type,
          spawnRate: z.spawnRate || 1,
          monsterLevelRange: z.monsterLevelRange || z.monsterLevel || [1, 5],
          allowedMonsters: z.allowedMonsters || ['normal']
        });
      }
    }
    // Load terrain features into terrainObstacles
    if (mapData.terrain && mapData.terrain.length) {
      for (var ti = 0; ti < mapData.terrain.length; ti++) {
        var t = mapData.terrain[ti];
        if (t.type === 'speed_pad') {
          // Speed pads stored as line segments
          mapTerrainFeatures.push(t);
        } else if (t.shape === 'circle' && t.center) {
          terrainObstacles.push({ x: t.center.x, y: t.center.y, radius: t.radius || 30, type: t.type === 'bush' ? 'bush' : t.type === 'water' ? 'water' : t.type === 'lava' ? 'lava' : 'rock' });
        } else if (t.shape === 'rect' && t.bounds) {
          // Approximate rect as circle at center for collision
          var cx = t.bounds.x + t.bounds.width / 2;
          var cy = t.bounds.y + t.bounds.height / 2;
          var cr = Math.max(t.bounds.width, t.bounds.height) / 2;
          terrainObstacles.push({ x: cx, y: cy, radius: cr, type: t.type === 'wall' ? 'rock' : t.type, _rect: t.bounds });
        }
      }
    }
    // Also load obstacles from map data
    if (mapData.obstacles && mapData.obstacles.length) {
      for (var oi = 0; oi < mapData.obstacles.length; oi++) {
        var o = mapData.obstacles[oi];
        terrainObstacles.push({ x: o.x, y: o.y, radius: o.radius || 20, type: o.type || 'rock' });
      }
    }
  }

  function drawZoneOverlays(ctx, camX, camY) {
    for (var i = 0; i < mapZones.length; i++) {
      var z = mapZones[i];
      var color = zoneTypeColors[z.type] || 'rgba(100,100,100,0.1)';
      ctx.fillStyle = color;
      if (z.shape === 'circle' && z.center) {
        ctx.beginPath();
        ctx.arc(z.center.x, z.center.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
        // Border
        ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.4)');
        ctx.lineWidth = 1;
        ctx.stroke();
        // Label
        ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.6)');
        ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(z.name, z.center.x, z.center.y - z.radius - 5);
      } else if (z.bounds) {
        ctx.fillRect(z.bounds.x, z.bounds.y, z.bounds.width, z.bounds.height);
        // Border
        ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.4)');
        ctx.lineWidth = 1;
        ctx.strokeRect(z.bounds.x, z.bounds.y, z.bounds.width, z.bounds.height);
        // Label
        ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.6)');
        ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(z.name, z.bounds.x + z.bounds.width / 2, z.bounds.y - 5);
      }
    }
    // Draw speed pads
    for (var si = 0; si < mapTerrainFeatures.length; si++) {
      var sp = mapTerrainFeatures[si];
      if (sp.type === 'speed_pad' && sp.from && sp.to) {
        var dx = sp.to.x - sp.from.x, dy = sp.to.y - sp.from.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        var nx = -dy / len * 12, ny = dx / len * 12;
        ctx.fillStyle = 'rgba(0,200,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(sp.from.x + nx, sp.from.y + ny);
        ctx.lineTo(sp.to.x + nx, sp.to.y + ny);
        ctx.lineTo(sp.to.x - nx, sp.to.y - ny);
        ctx.lineTo(sp.from.x - nx, sp.from.y - ny);
        ctx.closePath();
        ctx.fill();
        // Arrow indicators
        ctx.strokeStyle = 'rgba(0,200,255,0.4)'; ctx.lineWidth = 2;
        var arrowCount = Math.floor(len / 40);
        for (var ai = 0; ai < arrowCount; ai++) {
          var t = (ai + 0.5) / arrowCount;
          var ax = sp.from.x + dx * t, ay = sp.from.y + dy * t;
          var adx = dx / len * 8, ady = dy / len * 8;
          ctx.beginPath();
          ctx.moveTo(ax - adx - ny * 0.3, ay - ady + nx * 0.3);
          ctx.lineTo(ax, ay);
          ctx.lineTo(ax - adx + ny * 0.3, ay - ady - nx * 0.3);
          ctx.stroke();
        }
      }
    }
  }

  // Obstacle and terrain element definitions
  var terrainObstacles = []; // { x, y, radius, type: 'rock'|'bush'|'water'|'lava'|'healing' }
  var terrainTypes = {
    rock:    { color: '#666', blocking: true, blockProjectile: true, label: '岩石' },
    bush:    { color: '#2a5a2a', blocking: false, stealth: true, label: '灌木' },
    water:   { color: '#2244aa', blocking: false, slowFactor: 0.3, label: '水域' },
    // deep_water: handcrafted-map rivers — impassable to bodies, projectiles fly over
    deep_water: { color: '#1e4c90', blocking: true, blockProjectile: false, label: '深水' },
    lava:    { color: '#cc3300', blocking: false, damagePerSec: 15, label: '岩浆' },
    healing: { color: '#44cc88', blocking: false, healPerSec: 5, label: '治疗神殿' },
    speed_pad: { color: '#00c8ff', blocking: false, speedBoost: 1.5, boostDuration: 3, label: '加速带' }
  };

  // Check if a point collides with an obstacle of type 'rock'
  function checkObstacleCollision(x, y, radius) {
    for (var i = 0; i < terrainObstacles.length; i++) {
      var obs = terrainObstacles[i];
      var tType = terrainTypes[obs.type];
      if (tType && tType.blocking) {
        var dx = x - obs.x, dy = y - obs.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius + obs.radius) {
          return obs;
        }
      }
    }
    return null;
  }

  // Check if projectile hits rock obstacle
  function checkProjectileBlocking(x, y, radius) {
    for (var i = 0; i < terrainObstacles.length; i++) {
      var obs = terrainObstacles[i];
      var tType = terrainTypes[obs.type];
      if (tType && tType.blockProjectile) {
        var dx = x - obs.x, dy = y - obs.y;
        if (dx * dx + dy * dy < (radius + obs.radius) * (radius + obs.radius)) {
          return true;
        }
      }
    }
    return false;
  }

  // Get terrain effect at a position (bush stealth, water slow, lava damage)
  function getTerrainEffect(x, y) {
    var effects = { stealth: false, slowFactor: 0, damagePerSec: 0, healPerSec: 0, speedBoost: 0 };
    for (var i = 0; i < terrainObstacles.length; i++) {
      var obs = terrainObstacles[i];
      var dx = x - obs.x, dy = y - obs.y;
      if (dx * dx + dy * dy < obs.radius * obs.radius) {
        var tType = terrainTypes[obs.type];
        if (tType) {
          if (tType.stealth) effects.stealth = true;
          if (tType.slowFactor) effects.slowFactor = Math.max(effects.slowFactor, tType.slowFactor);
          if (tType.damagePerSec) effects.damagePerSec += tType.damagePerSec;
          if (tType.healPerSec) effects.healPerSec += tType.healPerSec;
        }
      }
    }
    // Check speed pads (line segments with width)
    for (var si = 0; si < mapTerrainFeatures.length; si++) {
      var sp = mapTerrainFeatures[si];
      if (sp.type === 'speed_pad' && sp.from && sp.to) {
        var sdx = sp.to.x - sp.from.x, sdy = sp.to.y - sp.from.y;
        var len = Math.sqrt(sdx * sdx + sdy * sdy);
        if (len < 1) continue;
        var t = Math.max(0, Math.min(1, ((x - sp.from.x) * sdx + (y - sp.from.y) * sdy) / (len * len)));
        var closestX = sp.from.x + t * sdx, closestY = sp.from.y + t * sdy;
        var distSq = (x - closestX) * (x - closestX) + (y - closestY) * (y - closestY);
        if (distSq < 15 * 15) { // 15px half-width
          effects.speedBoost = 1.5;
        }
      }
    }
    return effects;
  }

  // Draw terrain elements — visually distinct per type
  function drawTerrain(ctx, camX, camY) {
    for (var i = 0; i < terrainObstacles.length; i++) {
      var obs = terrainObstacles[i];
      // Tile-derived obstacles (e.g. handcrafted rivers) are already painted by
      // the tile layer and by _brStruct, so skip the circle overlay.
      if (obs._isTileObstacle) continue;
      if (obs._brStruct) continue;
      var sx = obs.x - camX, sy = obs.y - camY;
      if (sx < -obs.radius - 20 || sx > W + obs.radius + 20 || sy < -obs.radius - 20 || sy > H + obs.radius + 20) continue;
      var tType = terrainTypes[obs.type];
      if (!tType) continue;
      var r = obs.radius;

      if (obs.type === 'bush') {
        // Bush — cluster of leaf circles with varied greens
        ctx.globalAlpha = 0.6;
        var bushColors = ['#2a6a2a', '#1e5e1e', '#35753a', '#2a5a2a'];
        for (var bi = 0; bi < 5; bi++) {
          var bAngle = bi * Math.PI * 2 / 5 + i * 0.7;
          var bDist = r * 0.35;
          var bx = sx + Math.cos(bAngle) * bDist;
          var by = sy + Math.sin(bAngle) * bDist;
          ctx.fillStyle = bushColors[bi % 4];
          ctx.beginPath(); ctx.arc(bx, by, r * 0.55, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#2e6e2e';
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        // Leaf highlights
        ctx.fillStyle = '#4a8a4a'; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(sx - r * 0.2, sy - r * 0.3, r * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (obs.type === 'rock') {
        // Rock — jagged polygon with cracks
        ctx.fillStyle = '#666'; ctx.globalAlpha = 0.85;
        ctx.beginPath();
        for (var ri = 0; ri < 8; ri++) {
          var rAngle = ri * Math.PI * 2 / 8;
          var rDist = r * (0.75 + 0.25 * Math.sin(ri * 2.3 + i));
          var rx = sx + Math.cos(rAngle) * rDist;
          var ry = sy + Math.sin(rAngle) * rDist;
          if (ri === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5; ctx.stroke();
        // Rock highlight
        ctx.fillStyle = '#888'; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.ellipse(sx - r * 0.15, sy - r * 0.2, r * 0.35, r * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
        // Cracks
        ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(sx - r * 0.3, sy - r * 0.1); ctx.lineTo(sx + r * 0.1, sy + r * 0.15); ctx.lineTo(sx + r * 0.3, sy - r * 0.05); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (obs.type === 'water') {
        // Water — blue pool with ripples
        ctx.fillStyle = '#2244aa'; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        // Ripples
        ctx.strokeStyle = '#4466cc'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
        var rippleOffset = (gameTime || 0) * 1.5;
        for (var wri = 1; wri <= 3; wri++) {
          ctx.beginPath(); ctx.arc(sx, sy, r * (0.3 + wri * 0.2 + Math.sin(rippleOffset + wri) * 0.05), 0, Math.PI * 2); ctx.stroke();
        }
        // Water sparkle
        ctx.fillStyle = '#88bbff'; ctx.globalAlpha = 0.3 + 0.2 * Math.sin((gameTime || 0) * 3 + i);
        ctx.beginPath(); ctx.arc(sx - r * 0.2, sy - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (obs.type === 'lava') {
        // Lava — glowing pool with bubbles
        ctx.fillStyle = '#cc3300'; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        // Inner glow
        ctx.fillStyle = '#ff6600'; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffaa00'; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.4, 0, Math.PI * 2); ctx.fill();
        // Bubbles
        var bub = Math.sin((gameTime || 0) * 2 + i * 1.3);
        ctx.fillStyle = '#ff4400'; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(sx + r * 0.3 * Math.cos(i), sy + r * 0.3 * Math.sin(i), r * 0.1 * (1 + bub * 0.3), 0, Math.PI * 2); ctx.fill();
        // Outer heat shimmer
        ctx.strokeStyle = '#f60'; ctx.globalAlpha = 0.2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, r * 1.15, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (obs.type === 'healing') {
        // Healing shrine — glowing green with cross
        ctx.fillStyle = '#44cc88'; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        // Pulse
        var healPulse = 0.3 + 0.2 * Math.sin((gameTime || 0) * 3);
        ctx.fillStyle = '#66eebb'; ctx.globalAlpha = healPulse;
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.6, 0, Math.PI * 2); ctx.fill();
        // Cross symbol
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7;
        ctx.fillRect(sx - r * 0.08, sy - r * 0.35, r * 0.16, r * 0.7);
        ctx.fillRect(sx - r * 0.35, sy - r * 0.08, r * 0.7, r * 0.16);
        ctx.globalAlpha = 1;
      } else {
        // Fallback — colored circle
        ctx.fillStyle = tType.color; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  // Alias for test compatibility
  var drawObstacle = drawTerrain;
  var renderTerrain = drawTerrain;

  // === ENEMY TYPES ===
  function makeEnemy(type, x, y, waveNum) {
    // Endless scaling (US-202): gentle early, steep after wave 15, exponential after wave 20
    var scale = 1.3 + waveNum * 0.1 + (waveNum > 10 ? (waveNum - 10) * 0.08 : 0); // enemyBalanceCap: +30% base HP, stronger scaling
    if (waveNum >= 15) scale += (waveNum - 15) * 0.1; // additional HP/damage scaling
    if (waveNum >= 20) scale *= 1 + (waveNum - 20) * 0.08; // exponential multiplier
    var base;
    switch (type) {
      case 'fast':    base = { hp: 10, speed: 155, damage: 8, radius: 20, color: '#4cf', xp: 8 }; break;
      case 'tank':    base = { hp: 60, speed: 50, damage: 14, radius: 42, color: '#f80', xp: 20 }; break;
      case 'ranged':  base = { hp: 18, speed: 56, damage: 10, radius: 22, color: '#c6f', xp: 12 }; break;
      case 'boss':    base = { hp: 300, speed: 38, damage: 22, radius: 67, color: '#f22', xp: 80 }; break;
      case 'swarm':   base = { hp: 6, speed: 130, damage: 5, radius: 14, color: '#8f4', xp: 4 }; break;
      case 'miniBoss': base = { hp: 150, speed: 65, damage: 18, radius: 50, color: '#f4a', xp: 45 }; break;
      case 'treasure': base = { hp: 30, speed: 190, damage: 0, radius: 22, color: '#ffd700', xp: 50 }; break;
      default:        base = { hp: 20, speed: 75, damage: 12, radius: 25, color: '#e55', xp: 10 }; break;
    }
    // Late-game: enemies also get speed and damage scaling
    var speedScale = 1 + (waveNum > 15 ? (waveNum - 15) * 0.02 : 0);
    var dmgScale = 1 + (waveNum > 10 ? (waveNum - 10) * 0.05 : 0);
    var e = {
      x: x, y: y, hp: Math.round(base.hp * scale), maxHp: Math.round(base.hp * scale),
      speed: Math.round(base.speed * speedScale), damage: Math.round(base.damage * dmgScale), radius: base.radius,
      type: 'enemy', enemyType: type, color: base.color, xp: Math.round(base.xp * (1 + waveNum * 0.05) * (waveNum <= 3 ? 1.5 : 1)),
      _hc: 0, _spawnFade: 0.0 // spawn animation: fade in over 0.3s (US-239)
    };
    // Boss abilities and phase system
    if (type === 'boss') {
      e.bossPhase = 1;
      e._abilityTimer = 0;
      e._dashTarget = null;
      e.bossGold = 50 + waveNum * 10;
    }
    // Mini-boss: mid-wave elite with special ability and gold reward
    if (type === 'miniBoss') {
      e.miniBoss = true;
      e._abilityTimer = 0;
      e.miniBossGold = 25 + waveNum * 5;
    }
    // Treasure goblin: rare enemy that flees player and drops bonus gold
    if (type === 'treasure') {
      e.treasureGoblin = true;
      e.fleeFromPlayer = true;
      e.treasureGold = 50 + waveNum * 10;
      e._escapeTimer = 8; // disappears after 8 seconds
    }
    return e;
  }

  // === BOSS ABILITIES ===
  function updateBossAbilities(boss, dt) {
    if (boss.enemyType !== 'boss' || !player) return;
    boss._abilityTimer += dt;
    // Phase transitions based on HP
    var hpRatio = boss.hp / boss.maxHp;
    if (hpRatio <= 0.3 && boss.bossPhase < 3) {
      boss.bossPhase = 3;
      boss.speed *= 1.5; boss.damage *= 1.3;
      boss.color = '#f44';
      floatText(boss.x, boss.y - 30, '💀 ENRAGED!', '#f44', 20);
      screenShake(6, 400);
    } else if (hpRatio <= 0.6 && boss.bossPhase < 2) {
      boss.bossPhase = 2;
      boss.speed *= 1.2;
      boss.color = '#f80';
      floatText(boss.x, boss.y - 30, '⚡ Phase 2!', '#f80', 18);
    }
    // Abilities on cooldown
    if (boss._abilityTimer >= 3) {
      boss._abilityTimer = 0;
      var roll = Math.random();
      if (roll < 0.35) {
        // Dash attack — charge toward player
        dashAttack(boss);
      } else if (roll < 0.65) {
        // Spawn minions
        spawnMinion(boss);
      } else {
        // Shockwave AOE
        shockwave(boss);
      }
    }
  }

  function dashAttack(boss) {
    var dx = player.x - boss.x, dy = player.y - boss.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss._dashTarget = { x: player.x, y: player.y };
    boss.speed *= 3;
    setTimeout(function() { boss.speed /= 3; boss._dashTarget = null; }, 600);
    floatText(boss.x, boss.y - 20, '💨 冲锋!', '#f80', 16);
  }

  function spawnMinion(boss) {
    for (var i = 0; i < 4; i++) {
      var angle = (Math.PI * 2 / 4) * i;
      var mx = boss.x + Math.cos(angle) * 40;
      var my = boss.y + Math.sin(angle) * 40;
      entities.push(makeEnemy('fast', mx, my, wave));
    }
    floatText(boss.x, boss.y - 20, '👥 召唤!', '#a4f', 16);
  }

  function shockwave(boss) {
    // Damage all entities near boss
    var range = 120;
    if (player) {
      var dx = player.x - boss.x, dy = player.y - boss.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < range) {
        var _bsDmg = boss.damage * _healerInitShieldMul(player) * _abilityDmgScale();
        player.hp -= _bsDmg;
        window._dmgSourceLog = window._dmgSourceLog || {};
        window._dmgSourceLog['boss_shockwave'] = (window._dmgSourceLog['boss_shockwave'] || 0) + _bsDmg;
        floatText(player.x, player.y - 20, '-' + Math.round(_bsDmg), '#f00', 16);
      }
    }
    emit(boss.x, boss.y, '#f44', 20, range);
    screenShake(4, 200);
    floatText(boss.x, boss.y - 20, '💥 震波!', '#f44', 16);
  }

  // Mini-boss ability AI
  function updateMiniBossAbilities(mb, dt) {
    if (!mb.miniBoss || !player) return;
    mb._abilityTimer += dt;
    if (mb._abilityTimer >= 4) {
      mb._abilityTimer = 0;
      if (Math.random() < 0.5) {
        // Dash attack toward player
        dashAttack(mb);
      } else {
        // AOE shockwave (smaller than boss)
        var range = 80;
        var dx = player.x - mb.x, dy = player.y - mb.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < range && !player._invincible) {
          var _mbDmg = mb.damage * _healerInitShieldMul(player) * _abilityDmgScale();
          player.hp -= _mbDmg;
          window._dmgSourceLog = window._dmgSourceLog || {};
          window._dmgSourceLog['miniboss_aoe'] = (window._dmgSourceLog['miniboss_aoe'] || 0) + _mbDmg;
          floatText(player.x, player.y - 20, '-' + Math.round(_mbDmg), '#f00', 14);
        }
        emit(mb.x, mb.y, '#f4a', 12, range);
        screenShake(3, 150);
        floatText(mb.x, mb.y - 20, '💥 冲击波!', '#f4a', 14);
      }
    }
  }


  // === PARTICLES ===
  // particleShapeVariety: draw a 5-pointed star particle
  // === Skin Effect Rendering Helpers ===
  function drawSkinAura(cx, cy, radius, skinData, gt) {
    if (!skinData || !skinData.aura || !skinData.aura.enabled) return;
    var aura = skinData.aura;
    var outerR = radius * (aura.radiusMultiplier || 3.0);
    var pulseR = aura.pulse ? outerR * (1.0 + 0.08 * Math.sin((gt || 0) * 2)) : outerR;
    var angle = (gt || 0) * (aura.rotationSpeed || 1.0);
    ctx.save();
    ctx.translate(cx, cy);
    // Radial gradient glow
    var grad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, pulseR);
    grad.addColorStop(0, aura.color + '4D'); // alpha ~0.3
    grad.addColorStop(1, aura.color + '00'); // alpha 0
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, pulseR, 0, Math.PI * 2); ctx.fill();
    // Two crossing light bands
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = aura.color;
    ctx.lineWidth = pulseR * 0.1;
    for (var bi = 0; bi < 2; bi++) {
      var bAngle = angle + bi * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(bAngle) * pulseR, Math.sin(bAngle) * pulseR);
      ctx.lineTo(Math.cos(bAngle + Math.PI) * pulseR, Math.sin(bAngle + Math.PI) * pulseR);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSkinParticles(cx, cy, radius, skinData, gt) {
    if (!skinData || !skinData.particles || !skinData.particles.enabled) return;
    var p = skinData.particles;
    var count = p.count || 6;
    var minR = (p.radiusRange ? p.radiusRange[0] : 1.5) * radius;
    var maxR = (p.radiusRange ? p.radiusRange[1] : 2.5) * radius;
    var minS = (p.sizeRange ? p.sizeRange[0] : 0.06) * radius;
    var maxS = (p.sizeRange ? p.sizeRange[1] : 0.1) * radius;
    var speed = p.speed || 1.5;
    var alphaMin = p.alpha ? p.alpha[0] : 0.3;
    var alphaMax = p.alpha ? p.alpha[1] : 0.7;
    ctx.save();
    for (var i = 0; i < count; i++) {
      var t = (gt || 0) * speed + i * Math.PI * 2 / count;
      var dist = minR + (maxR - minR) * (0.5 + 0.5 * Math.sin(t * 0.7 + i));
      var px = cx + Math.cos(t) * dist;
      var py = cy + Math.sin(t) * dist;
      var size = minS + (maxS - minS) * (0.5 + 0.5 * Math.sin(t * 1.3));
      var a = alphaMin + (alphaMax - alphaMin) * (0.5 + 0.5 * Math.sin((gt || 0) * 2 + i));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color || '#fff';
      if (p.type === 'petal' || p.type === 'leaf') {
        // Ellipse (petal/leaf shape)
        ctx.beginPath();
        ctx.ellipse(px, py, size * 1.5, size, t, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        // 5-point star
        drawStarParticle(px, py, size, t);
      } else if (p.type === 'pixel') {
        // Square pixel block (cyber/retro style)
        var ps = size * 2;
        ctx.fillRect(px - ps / 2, py - ps / 2, ps, ps);
      } else if (p.type === 'ring') {
        // Hollow ring (shadow/stealth style)
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.strokeStyle = p.color || '#fff'; ctx.lineWidth = size * 0.4;
        ctx.stroke();
      } else {
        // Circle (droplet, default)
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawStarParticle(x, y, size, angle) {
    ctx.beginPath();
    for (var si = 0; si < 10; si++) {
      var sr = si % 2 === 0 ? size : size * 0.4;
      var sa = angle + si * Math.PI / 5;
      if (si === 0) ctx.moveTo(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr);
      else ctx.lineTo(x + Math.cos(sa) * sr, y + Math.sin(sa) * sr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawSkinOutline(cx, cy, radius, skinData, gt) {
    if (!skinData || !skinData.outline || !skinData.outline.enabled) return;
    var o = skinData.outline;
    var pulseAlpha = o.pulse ? (0.6 + 0.4 * Math.sin((gt || 0) * 3)) : 0.8;
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.strokeStyle = o.color || '#fff';
    ctx.lineWidth = o.width || 2;
    ctx.shadowColor = o.color || '#fff';
    ctx.shadowBlur = o.shadowBlur || 5;
    ctx.beginPath(); ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Get skin colors for a given class, with skin overrides
  function getSkinColors(classType, skinData, isFury, shieldActive) {
    // Default class colors
    var defaults = {
      warrior: { body: '#b44', accent: '#d93', highlight: '#ddd', eye: '#fff', hood: null, cape: null, orb: null },
      mage: { body: '#728', accent: '#5a3d7a', highlight: '#c6f', eye: '#f0f', hood: '#5a3d7a', cape: null, orb: '#c6f' },
      scout: { body: '#3a6', accent: '#2a5030', highlight: '#a86', eye: '#8f8', hood: '#2a5030', cape: '#1a3520', orb: null },
      // R5n F2 — 黑斗篷 + 银刃 palette for assassin (uses scout sprite sheet)
      assassin: { body: '#2a2230', accent: '#1a1020', highlight: '#9a7acc', eye: '#c4a0ff', hood: '#151020', cape: '#0a0815', orb: null },
      // R5v F3 — 白袍 + 金边 palette for healer (dedicated sprite exists but
      // drawCharacterSprite fallback palette still queried via this map)
      healer:   { body: '#f4efe2', accent: '#ffd966', highlight: '#e9f4b4', eye: '#4a9a3a', hood: '#ffd966', cape: '#f4efe2', orb: '#4a9edd' }
    };
    var base = defaults[classType] || defaults.warrior;
    var colors = { body: base.body, accent: base.accent, highlight: base.highlight, eye: base.eye, hood: base.hood, cape: base.cape, orb: base.orb };
    // Apply skin overrides
    if (skinData && skinData.colors) {
      if (skinData.colors.body) colors.body = skinData.colors.body;
      if (skinData.colors.accent) colors.accent = skinData.colors.accent;
      if (skinData.colors.highlight) colors.highlight = skinData.colors.highlight;
      if (skinData.colors.eye) colors.eye = skinData.colors.eye;
      // Derive hood/cape/orb from skin accent/highlight
      if (skinData.colors.accent) { colors.hood = skinData.colors.accent; colors.cape = skinData.colors.accent; }
      if (skinData.colors.highlight) colors.orb = skinData.colors.highlight;
    }
    // State overrides (fury/shield take precedence for body)
    if (isFury) colors.body = '#c33';
    if (shieldActive && !isFury) colors.body = '#669';
    return colors;
  }

  // === Body Shape Helpers (hexagon, diamond, star) ===
  function drawBodyShapePath(r, shape) {
    if (shape === 'hexagon') {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 - Math.PI / 6;
        var px = Math.cos(a) * r * 0.75, py = Math.sin(a) * r * 0.75;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(r * 0.8, 0);
      ctx.lineTo(0, -r * 0.6);
      ctx.lineTo(-r * 0.7, 0);
      ctx.lineTo(0, r * 0.6);
      ctx.closePath();
    } else if (shape === 'star') {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var sr = i % 2 === 0 ? r * 0.8 : r * 0.4;
        var sa = i * Math.PI / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
        else ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
      }
      ctx.closePath();
    }
    // 'circle' = default class shape, handled by existing code
  }

  // === Pattern Overlay ===
  function drawPattern(r, pattern, color, gt) {
    if (!pattern || pattern === 'none') return;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color || '#fff';
    ctx.lineWidth = 1;
    if (pattern === 'stripe') {
      for (var i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-r + i * r * 0.3, -r);
        ctx.lineTo(-r + i * r * 0.3 + r * 0.5, r);
        ctx.stroke();
      }
    } else if (pattern === 'flame') {
      for (var i = 0; i < 5; i++) {
        var fx = -r * 0.5 + i * r * 0.25;
        var fy = r * 0.3 * Math.sin((gt || 0) * 4 + i * 1.5);
        ctx.beginPath();
        ctx.moveTo(fx, r * 0.4);
        ctx.quadraticCurveTo(fx + r * 0.1, fy, fx, -r * 0.4);
        ctx.stroke();
      }
    } else if (pattern === 'frost_crystal') {
      for (var i = 0; i < 6; i++) {
        var ca = i * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ca) * r * 0.6, Math.sin(ca) * r * 0.6);
        ctx.stroke();
        // small branches
        var bx = Math.cos(ca) * r * 0.35, by = Math.sin(ca) * r * 0.35;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ca + 0.8) * r * 0.2, by + Math.sin(ca + 0.8) * r * 0.2);
        ctx.stroke();
      }
    } else if (pattern === 'shadow_smoke') {
      ctx.globalAlpha = 0.15 + 0.1 * Math.sin((gt || 0) * 2);
      for (var i = 0; i < 4; i++) {
        var sx = Math.cos((gt || 0) * 1.5 + i * 1.6) * r * 0.3;
        var sy = Math.sin((gt || 0) * 1.2 + i * 1.3) * r * 0.3;
        ctx.fillStyle = color || '#666';
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.25, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'lightning') {
      ctx.globalAlpha = 0.4 + 0.3 * Math.random();
      ctx.strokeStyle = color || '#88eeff';
      ctx.lineWidth = 1.5;
      for (var i = 0; i < 3; i++) {
        var lx = -r * 0.4 + i * r * 0.4;
        ctx.beginPath();
        ctx.moveTo(lx, -r * 0.5);
        ctx.lineTo(lx + r * 0.15, -r * 0.1);
        ctx.lineTo(lx - r * 0.1, r * 0.1);
        ctx.lineTo(lx + r * 0.1, r * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // === Trail Effect (called from render loop with movement info) ===
  var trailHistory = {}; // playerId -> [{x,y,time}]
  function updateTrailHistory(id, x, y, t) {
    if (!trailHistory[id]) trailHistory[id] = [];
    var h = trailHistory[id];
    h.push({x:x, y:y, t:t});
    // Keep last 0.5s of positions
    while (h.length > 0 && t - h[0].t > 0.5) h.shift();
  }
  function drawTrailEffect(id, trailType, color, radius, gt) {
    if (!trailType || trailType === 'none') return;
    var h = trailHistory[id];
    if (!h || h.length < 2) return;
    ctx.save();
    for (var i = 0; i < h.length - 1; i++) {
      var progress = i / (h.length - 1);
      var p = h[i];
      ctx.globalAlpha = progress * 0.4;
      if (trailType === 'fire_particles') {
        ctx.fillStyle = color || '#ff6600';
        var s = radius * (0.3 + 0.4 * (1 - progress));
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
        if (i % 2 === 0) {
          ctx.fillStyle = '#ffcc00';
          ctx.globalAlpha = progress * 0.2;
          ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      } else if (trailType === 'ice_trail') {
        ctx.fillStyle = color || '#88ccff';
        var s = radius * (0.2 + 0.3 * (1 - progress));
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
      } else if (trailType === 'shadow_fade') {
        ctx.fillStyle = color || '#333';
        var s = radius * (0.5 + 0.3 * (1 - progress));
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
      } else if (trailType === 'sparkle') {
        ctx.fillStyle = color || '#ffe866';
        var s = radius * 0.15 * (1 - progress);
        drawStarParticle(p.x, p.y, s + 1, gt * 3 + i);
      }
    }
    ctx.restore();
  }

  // === Idle Animation Modifier ===
  function getIdleAnimationScale(anim, gt) {
    if (anim === 'pulse') return 1.0 + 0.05 * Math.sin(gt * 3);
    if (anim === 'shadow_flicker') return 1.0 + 0.02 * Math.sin(gt * 8);
    return 1.0;
  }
  function getIdleAnimationAlpha(anim, gt) {
    if (anim === 'shadow_flicker') return 0.85 + 0.15 * Math.sin(gt * 6);
    return 1.0;
  }
  function getIdleAnimationRotation(anim, gt) {
    if (anim === 'rotate') return Math.sin(gt * 0.8) * 0.1;
    if (anim === 'frost_breath') return Math.sin(gt * 2) * 0.03;
    return 0;
  }

  // === Character Sprite Rendering — Parts-Based Pipeline ===
  // Layered rendering: shadow → legs → body → weapon(back) → head → weapon(front) → effects

  // Get part colors with skin overrides
  function getPartColors(skinData, partName, classType) {
    // ldoe-overhaul-01: LDOE survivor palette — 灰土锈, no bright colors.
    // warrior=tactical / mage=heavy / scout=light / healer=medic
    var defaults = {
      warrior: { head: {p:'#3a3e38',s:'#2a2e2a'}, body: {p:'#2e3a2a',s:'#1a221a',o:'#0e1410'}, weapon: {w:'#3a3a38',gun:'#2a2a28'}, legs: {c:'#2a2e2a'}, eye: '#cfd8c4' },
      mage:    { head: {p:'#1a1a18',s:'#0a0a08'}, body: {p:'#3a3838',s:'#2a2828',o:'#0e0e0c'}, weapon: {w:'#3a3a38',gun:'#1e1e1c'}, legs: {c:'#1e1e1c'}, eye: '#cfd8c4' },
      scout:   { head: {p:'#8a7050',s:'#5a4a32'}, body: {p:'#6e5a3e',s:'#3e3220',o:'#2a2218'}, weapon: {w:'#3a3a38',gun:'#2a2a28'}, legs: {c:'#5a4a32'}, eye: '#cfd8c4' },
      healer:  { head: {p:'#4a4a48',s:'#2a2a28'}, body: {p:'#4a4a48',s:'#6e2a1c',o:'#1e1e1c'}, weapon: {w:'#3a3a38',gun:'#2a2a28'}, legs: {c:'#2e2e2c'}, eye: '#cfd8c4' },
      assassin:{ head: {p:'#1a1a18',s:'#0a0a08'}, body: {p:'#1e1e1c',s:'#3e3220',o:'#0a0a08'}, weapon: {w:'#3a3a38',gun:'#1e1e1c'}, legs: {c:'#0e0e0c'}, eye: '#cfd8c4' }
    };
    var d = defaults[classType] || defaults.warrior;
    var result = JSON.parse(JSON.stringify(d[partName] || {}));
    result.eye = d.eye;
    // Apply skin color overrides
    if (skinData && skinData.parts && skinData.parts[partName] && skinData.parts[partName].colorOverride) {
      var ov = skinData.parts[partName].colorOverride;
      for (var k in ov) { result[k] = ov[k]; }
    }
    // Also apply legacy colors
    if (skinData && skinData.colors) {
      var c = skinData.colors;
      if (partName === 'body') { if (c.body) result.p = c.body; if (c.accent) result.s = c.accent; }
      if (partName === 'head') { if (c.accent) result.p = c.accent; }
      if (c.eye) result.eye = c.eye;
    }
    return result;
  }

  // Layer 1: Shadow
  function drawCharShadow(r) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 2: Legs — LDOE tactical pants + boots
  function drawCharLegs(r, classType, colors, gt) {
    var lc = colors.c || '#2a2e2a';
    var walkSpeed = 9;
    var walkL = Math.sin(gt * walkSpeed) * r * 0.06;
    var walkR = Math.sin(gt * walkSpeed + Math.PI) * r * 0.06;
    // Tactical pants (slim, dark)
    ctx.fillStyle = lc;
    ctx.fillRect(-r*0.22, r*0.28 + walkL, r*0.18, r*0.4);
    ctx.fillRect(r*0.04, r*0.28 + walkR, r*0.18, r*0.4 - Math.abs(walkR));
    // Knee pockets (darker rectangle)
    ctx.fillStyle = '#1a1c18';
    ctx.fillRect(-r*0.2, r*0.42 + walkL, r*0.14, r*0.06);
    ctx.fillRect(r*0.06, r*0.42 + walkR, r*0.14, r*0.06);
    // Combat boots (solid black, wider than pant cuff)
    ctx.fillStyle = '#0a0a08';
    ctx.fillRect(-r*0.24, r*0.62 + walkL, r*0.22, r*0.1);
    ctx.fillRect(r*0.02, r*0.62 + walkR, r*0.22, r*0.1);
  }

  // Layer 3: Body — LDOE survivor jacket + backpack silhouette
  function drawCharBody(r, classType, colors, isFury, shieldActive) {
    var p = colors.p || '#2e3a2a', s = colors.s || '#6e2a1c', o = colors.o || '#0e1410';
    if (isFury) p = '#6e2a1c';
    if (shieldActive && !isFury) p = '#3a4a3a';
    // Backpack silhouette (behind torso, all classes — LDOE survivor staple)
    ctx.fillStyle = '#1a1c18';
    ctx.fillRect(-r*0.42, -r*0.25, r*0.84, r*0.55);
    ctx.fillStyle = '#0a0a08';
    ctx.fillRect(-r*0.42, -r*0.25, r*0.84, r*0.04); // top strap
    // Torso jacket
    ctx.fillStyle = p;
    ctx.beginPath();
    ctx.moveTo(-r*0.36, -r*0.3); ctx.lineTo(r*0.36, -r*0.3);
    ctx.lineTo(r*0.32, r*0.32); ctx.lineTo(-r*0.32, r*0.32);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = o; ctx.lineWidth = 1.5; ctx.stroke();
    if (classType === 'warrior') {
      // Tactical: chest rig with magazine pouches
      ctx.fillStyle = '#1a1c18';
      ctx.fillRect(-r*0.28, -r*0.18, r*0.56, r*0.22);
      ctx.fillStyle = '#3a3a38';
      ctx.fillRect(-r*0.22, -r*0.14, r*0.12, r*0.14);
      ctx.fillRect(-r*0.06, -r*0.14, r*0.12, r*0.14);
      ctx.fillRect(r*0.1, -r*0.14, r*0.12, r*0.14);
    } else if (classType === 'mage') {
      // Heavy: bulky bulletproof vest, big collar
      ctx.fillStyle = '#1a1c18';
      ctx.fillRect(-r*0.38, -r*0.2, r*0.76, r*0.4);
      ctx.strokeStyle = '#0a0a08'; ctx.lineWidth = 1;
      ctx.strokeRect(-r*0.34, -r*0.16, r*0.68, r*0.32);
      // Collar zip
      ctx.fillStyle = '#3a3a38';
      ctx.fillRect(-r*0.02, -r*0.3, r*0.04, r*0.5);
    } else if (classType === 'healer') {
      // Medic: red cross armband
      ctx.fillStyle = s; // accent → rust red
      ctx.fillRect(-r*0.42, -r*0.05, r*0.12, r*0.14);
      ctx.fillStyle = '#dad8d4';
      ctx.fillRect(-r*0.39, -r*0.02, r*0.06, r*0.02);
      ctx.fillRect(-r*0.37, -r*0.04, r*0.02, r*0.06);
    } else {
      // Scout / assassin: light parka with hood drape, drawstring
      ctx.fillStyle = '#3e3220';
      ctx.beginPath();
      ctx.moveTo(-r*0.36, -r*0.3); ctx.lineTo(0, -r*0.42);
      ctx.lineTo(r*0.36, -r*0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a1c18'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r*0.05, -r*0.3); ctx.lineTo(-r*0.05, r*0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.05, -r*0.3); ctx.lineTo(r*0.05, r*0.05); ctx.stroke();
    }
    // Belt
    ctx.fillStyle = '#0a0a08';
    ctx.fillRect(-r*0.34, r*0.18, r*0.68, r*0.06);
  }

  // Layer 4: Weapon — LDOE firearms (rifle / carbine / handgun)
  function drawCharWeapon(r, classType, colors, gt) {
    var bodyC = colors.gun || '#2a2a28';
    var stockC = colors.w || '#3a3a38';
    if (classType === 'warrior') {
      // Assault rifle held across chest (long, with magazine + stock)
      // Stock
      ctx.fillStyle = stockC;
      ctx.fillRect(-r*0.55, -r*0.1, r*0.3, r*0.14);
      // Receiver / barrel
      ctx.fillStyle = bodyC;
      ctx.fillRect(-r*0.25, -r*0.06, r*1.5, r*0.1);
      // Magazine (curved box below)
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(r*0.05, r*0.04, r*0.14, r*0.22);
      // Foregrip / sight
      ctx.fillStyle = '#0a0a08';
      ctx.fillRect(r*0.5, -r*0.12, r*0.14, r*0.06);
      ctx.fillRect(r*0.7, -r*0.06, r*0.04, r*0.04);
      // Muzzle ring
      ctx.fillRect(r*1.18, -r*0.07, r*0.08, r*0.12);
    } else if (classType === 'mage') {
      // Heavy: short carbine with red-dot, gripped near body
      ctx.fillStyle = stockC;
      ctx.fillRect(-r*0.3, -r*0.08, r*0.22, r*0.12);
      ctx.fillStyle = bodyC;
      ctx.fillRect(-r*0.08, -r*0.06, r*1.05, r*0.1);
      // Optic (red-dot)
      ctx.fillStyle = '#0a0a08';
      ctx.fillRect(r*0.2, -r*0.16, r*0.12, r*0.08);
      ctx.fillStyle = '#6e2a1c';
      ctx.fillRect(r*0.25, -r*0.14, r*0.04, r*0.04);
      // Magazine
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(r*0.04, r*0.04, r*0.16, r*0.18);
      // Muzzle
      ctx.fillRect(r*0.94, -r*0.07, r*0.06, r*0.12);
    } else if (classType === 'healer') {
      // Medic: handgun + medkit pouch on hip
      ctx.fillStyle = bodyC;
      ctx.fillRect(r*0.3, -r*0.06, r*0.42, r*0.1);
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(r*0.3, r*0.04, r*0.1, r*0.16); // grip
      ctx.fillStyle = stockC;
      ctx.fillRect(r*0.7, -r*0.07, r*0.04, r*0.12); // muzzle
      // Medkit on hip (left)
      ctx.fillStyle = '#dad8d4';
      ctx.fillRect(-r*0.5, r*0.18, r*0.18, r*0.16);
      ctx.fillStyle = '#6e2a1c';
      ctx.fillRect(-r*0.45, r*0.22, r*0.08, r*0.02);
      ctx.fillRect(-r*0.43, r*0.2, r*0.04, r*0.06);
    } else {
      // Scout / assassin: handgun + bandolier
      ctx.fillStyle = bodyC;
      ctx.fillRect(r*0.28, -r*0.06, r*0.46, r*0.1);
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(r*0.28, r*0.04, r*0.1, r*0.18);
      ctx.fillStyle = stockC;
      ctx.fillRect(r*0.72, -r*0.07, r*0.04, r*0.12);
      // Bandolier (diagonal strap with rounds)
      ctx.strokeStyle = '#3e3220'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r*0.4, -r*0.3); ctx.lineTo(r*0.3, r*0.3); ctx.stroke();
      ctx.fillStyle = '#cfa84a';
      for (var bri = 0; bri < 4; bri++) {
        var brt = bri / 4;
        ctx.fillRect(-r*0.4 + brt*r*0.7 - r*0.02, -r*0.3 + brt*r*0.6 - r*0.04, r*0.04, r*0.08);
      }
    }
  }

  // Layer 5: Head — LDOE survivor headgear (helmet / hood / cap / dust mask)
  function drawCharHead(r, classType, colors, gt) {
    var p = colors.p || '#3a3e38', s = colors.s || '#2a2e2a';
    // Skin (always weathered tan)
    ctx.fillStyle = '#a88a6e';
    ctx.beginPath(); ctx.arc(0, -r*0.45, r*0.26, 0, Math.PI * 2); ctx.fill();
    if (classType === 'warrior') {
      // Tactical helmet (low cover) + NVG mount
      ctx.fillStyle = p;
      ctx.beginPath(); ctx.arc(0, -r*0.5, r*0.3, Math.PI, 0); ctx.fill();
      ctx.fillRect(-r*0.3, -r*0.5, r*0.6, r*0.1);
      ctx.strokeStyle = s; ctx.lineWidth = 1.5; ctx.stroke();
      // NVG mount stub
      ctx.fillStyle = '#0a0a08';
      ctx.fillRect(-r*0.06, -r*0.78, r*0.12, r*0.08);
      // Eye band shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-r*0.2, -r*0.42, r*0.4, r*0.06);
    } else if (classType === 'mage') {
      // Heavy: black hood pulled up + dust/respirator mask
      ctx.fillStyle = p;
      ctx.beginPath();
      ctx.moveTo(-r*0.3, -r*0.32); ctx.lineTo(-r*0.35, -r*0.6);
      ctx.quadraticCurveTo(0, -r*0.85, r*0.35, -r*0.6);
      ctx.lineTo(r*0.3, -r*0.32);
      ctx.closePath(); ctx.fill();
      // Respirator mask (lower face)
      ctx.fillStyle = '#1a1a18';
      ctx.beginPath(); ctx.ellipse(0, -r*0.36, r*0.18, r*0.12, 0, 0, Math.PI*2); ctx.fill();
      // Mask filter canister
      ctx.fillStyle = '#3a3a38';
      ctx.beginPath(); ctx.arc(r*0.18, -r*0.34, r*0.06, 0, Math.PI*2); ctx.fill();
      // Goggles
      ctx.fillStyle = '#0a0a08';
      ctx.fillRect(-r*0.18, -r*0.5, r*0.36, r*0.06);
      ctx.fillStyle = '#6e2a1c'; ctx.globalAlpha = 0.7;
      ctx.fillRect(-r*0.16, -r*0.49, r*0.12, r*0.04);
      ctx.fillRect(r*0.04, -r*0.49, r*0.12, r*0.04);
      ctx.globalAlpha = 1;
    } else if (classType === 'healer') {
      // Medic: bandana + visible face
      ctx.fillStyle = '#dad8d4';
      ctx.beginPath();
      ctx.moveTo(-r*0.26, -r*0.6); ctx.lineTo(r*0.26, -r*0.6);
      ctx.lineTo(r*0.22, -r*0.5); ctx.lineTo(-r*0.22, -r*0.5);
      ctx.closePath(); ctx.fill();
      // Bandana knot tail
      ctx.fillRect(-r*0.36, -r*0.55, r*0.1, r*0.04);
      // Eyes
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(-r*0.1, -r*0.45, r*0.05, r*0.04);
      ctx.fillRect(r*0.05, -r*0.45, r*0.05, r*0.04);
    } else {
      // Scout / assassin: baseball cap + scarf
      ctx.fillStyle = p;
      // Cap crown
      ctx.beginPath(); ctx.arc(0, -r*0.55, r*0.26, Math.PI, 0); ctx.fill();
      // Cap brim
      ctx.fillRect(-r*0.04, -r*0.58, r*0.36, r*0.06);
      // Scarf around neck
      ctx.fillStyle = '#3e3220';
      ctx.fillRect(-r*0.22, -r*0.32, r*0.44, r*0.08);
      // Eye shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-r*0.18, -r*0.5, r*0.36, r*0.04);
    }
  }

  // ldoe-overhaul-01: dropped CHAR_SPRITE_CFG/IMGS sprite-sheet preload.
  // Player rendering is now fully procedural (draw{Shadow,Legs,Body,Weapon,Head})
  // — see drawCharacterSprite below. HOMM3_ART_BASE retained for tileset only.
  var HOMM3_ART_BASE = 'assets/style_homm3_bright/';

  // Archetype head icons (ArtDesigner 2026-04-19). 24×24 PNG shown above
  // each bot nameplate so archetype is recognisable at a glance.
  var ARCHETYPE_ICONS = {}; // keyed by id: { img, ready }
  (function preloadArchetypeIcons() {
    ['assassin', 'bruiser', 'glasscannon', 'tank', 'speedster', 'sharpshooter', 'duelist'].forEach(function(id) {
      var e = { img: new Image(), ready: false };
      e.img.onload = function() { e.ready = true; };
      e.img.src = 'assets/archetype/' + id + '.png';
      ARCHETYPE_ICONS[id] = e;
    });
  })();

  // Round 3: rival / synergy / kill-juice art pack from demo/assets/r3
  var R3_ART = {
    rivalBadge:   { img: new Image(), ready: false },
    rivalRing:    { img: new Image(), ready: false },
    rivalBanner:  { img: new Image(), ready: false },
    nemesisBadge: { img: new Image(), ready: false },
    nemesisRing:  { img: new Image(), ready: false },
    nemesisBanner:{ img: new Image(), ready: false },
    bossBanner:   { img: new Image(), ready: false },
    killShatter:  { img: new Image(), ready: false },
    comboFrame:   { img: new Image(), ready: false },
    synergy: { fire: { img: new Image(), ready: false }, frost: { img: new Image(), ready: false }, lightning: { img: new Image(), ready: false }, venom: { img: new Image(), ready: false }, holy: { img: new Image(), ready: false } }
  };
  (function preloadR3() {
    function load(k, file) { var e = R3_ART[k]; e.img.onload = function() { e.ready = true; }; e.img.src = 'assets/r3/' + file; }
    function loadSy(k, file) { var e = R3_ART.synergy[k]; e.img.onload = function() { e.ready = true; }; e.img.src = 'assets/r3/' + file; }
    load('rivalBadge', 'rival_badge.png');
    load('rivalRing', 'rival_pulse_ring.png');
    load('rivalBanner', 'rival_slain_banner.png');
    load('nemesisBadge', 'nemesis_badge.png');
    load('nemesisRing', 'nemesis_pulse_ring.png');
    load('nemesisBanner', 'nemesis_slain_banner.png');
    load('bossBanner', 'boss_slain_banner.png');
    load('killShatter', 'kill_shatter.png');
    load('comboFrame', 'combo_frame.png');
    loadSy('fire', 'synergy_aura_fire.png');
    loadSy('frost', 'synergy_aura_frost.png');
    loadSy('lightning', 'synergy_aura_lightning.png');
    loadSy('venom', 'synergy_aura_venom.png');
    loadSy('holy', 'synergy_aura_holy.png');
  })();

  // Strategic points (Experiment C, 2026-04-19). Each point has a
  // capture zone (radius 60). Standing in the zone alone progresses the
  // capture bar (0 → 100 in 10s). Once captured, grants a 30s buff.
  var STRAT_POINTS = {
    meta: null, ready: 0, imgs: {}, // { watchtower, temple, camp }
    captureFillImgs: {}, captureFillReady: 0,
    pointsInWorld: [] // { type, x, y, owner, progress, buffUntil, buffType }
  };
  (function preloadStrategic() {
    function loadJSON(path, cb) {
      try {
        var xhr = new XMLHttpRequest(); xhr.open('GET', path, true);
        xhr.onload = function() { if (xhr.status < 400) { try { cb(JSON.parse(xhr.responseText)); } catch (e) {} } };
        xhr.send();
      } catch (e) {}
    }
    loadJSON('assets/strategic/index.json', function(j) {
      STRAT_POINTS.meta = j;
      ['watchtower', 'temple', 'camp'].forEach(function(k) {
        var im = new Image();
        im.onload = (function(key){ return function(){ STRAT_POINTS.imgs[key]._ready = true; STRAT_POINTS.ready++; }; })(k);
        im.src = 'assets/strategic/' + j.points[k].file;
        STRAT_POINTS.imgs[k] = { img: im, _ready: false };
      });
      ['neutral', 'team1', 'team2'].forEach(function(k) {
        var im = new Image();
        im.onload = (function(key){ return function(){ STRAT_POINTS.captureFillImgs[key]._ready = true; STRAT_POINTS.captureFillReady++; }; })(k);
        im.src = 'assets/strategic/' + j.captureBar.fillTextures[k];
        STRAT_POINTS.captureFillImgs[k] = { img: im, _ready: false };
      });
    });
  })();

  // BR UI assets (Phase 2): storm warning bar + rank crowns + killfeed card.
  var BR_UI = {
    stormBar: null, stormBarReady: false,
    crowns: { gold: null, silver: null, bronze: null }, crownsReady: 0,
    killfeedCard: null, killfeedCardReady: false
  };
  (function preloadBRUi() {
    function _loadImg(path, onReady) {
      var im = new Image();
      im.onload = function() { if (onReady) onReady(); };
      im.src = path;
      return im;
    }
    BR_UI.stormBar = _loadImg('assets/ui_br/storm_bar.png', function() { BR_UI.stormBarReady = true; });
    BR_UI.crowns.gold = _loadImg('assets/ui_br/crown_gold.png', function() { BR_UI.crownsReady++; });
    BR_UI.crowns.silver = _loadImg('assets/ui_br/crown_silver.png', function() { BR_UI.crownsReady++; });
    BR_UI.crowns.bronze = _loadImg('assets/ui_br/crown_bronze.png', function() { BR_UI.crownsReady++; });
    BR_UI.killfeedCard = _loadImg('assets/ui_br/killfeed_card.png', function() { BR_UI.killfeedCardReady = true; });
  })();

  // homm3_bright: tileset floor, monster sheet, decor, 9-slice UI
  var HOMM3_ART = {
    ui9: {}, ui9Meta: null, ui9Ready: false,
    // boss sprites removed in zombie-skin-02 — boss now uses procedural zombie tank
  };
  (function preloadHomm3Art() {
    function loadJSON(path, cb) {
      try {
        var xhr = new XMLHttpRequest(); xhr.open('GET', path, true);
        xhr.onload = function() { if (xhr.status < 400) { try { cb(JSON.parse(xhr.responseText)); } catch (e) {} } };
        xhr.send();
      } catch (e) {}
    }
    function loadImg(path) {
      var im = new Image(); im.src = path;
      var box = { img: im, ready: false };
      im.onload = function() { box.ready = true; };
      return box;
    }
    // ldoe-overhaul-02: tileset + monster_orc dropped (procedural rendering, sprite assets unused).
    // 9-slice UI
    var _ui9Keys = ['tl', 't', 'tr', 'l', 'c', 'r', 'bl', 'b', 'br'];
    var _ui9Loaded = 0;
    _ui9Keys.forEach(function(k) {
      var im = new Image();
      im.onload = function() { _ui9Loaded++; if (_ui9Loaded === _ui9Keys.length) HOMM3_ART.ui9Ready = true; };
      im.src = HOMM3_ART_BASE + 'ui9/' + k + '.png';
      HOMM3_ART.ui9[k] = im;
    });
    loadJSON(HOMM3_ART_BASE + 'ui9/meta.json', function(j) { HOMM3_ART.ui9Meta = j; });
  })();

  // Per-tile biome grid. Values 0=grass 1=dirt 2=stone 3=water 4=sand 5=swamp 6=snow.
  // Ids 0-2 use the homm3 autotile sprite atlas; 3-6 are flat colour fills.
  var _biomeGrid = null;
  var _biomeCols = 0, _biomeRows = 0;
  // ldoe-overhaul-02: tile size locked to 64 (was tilesetMeta.tileW)
  var LDOE_TILE_SZ = 64;
  function _initBiomeGrid() {
    var tsz = LDOE_TILE_SZ;
    // Handcrafted map: copy tiles[] from MAP_DATA and add water to obstacles.
    if (MAP_DATA && MAP_DATA.tiles && MAP_DATA.cols && MAP_DATA.rows) {
      _biomeCols = MAP_DATA.cols;
      _biomeRows = MAP_DATA.rows;
      _biomeGrid = new Uint8Array(_biomeCols * _biomeRows);
      for (var ti = 0; ti < _biomeGrid.length && ti < MAP_DATA.tiles.length; ti++) {
        _biomeGrid[ti] = MAP_DATA.tiles[ti] | 0;
      }
      // Water collision: merge contiguous water tiles per-row into rect obstacles.
      for (var wy = 0; wy < _biomeRows; wy++) {
        var wx = 0;
        while (wx < _biomeCols) {
          if (_biomeGrid[wy * _biomeCols + wx] === 3) {
            var runStart = wx;
            while (wx < _biomeCols && _biomeGrid[wy * _biomeCols + wx] === 3) wx++;
            var runLen = wx - runStart;
            var rx = runStart * tsz, ry = wy * tsz, rw = runLen * tsz, rh = tsz;
            terrainObstacles.push({
              x: rx + rw / 2, y: ry + rh / 2,
              radius: Math.max(rw, rh) / 2 * 0.55, // inset so bridge edges stay walkable
              type: 'deep_water',
              _rect: { x: rx, y: ry, width: rw, height: rh },
              _isTileObstacle: true
            });
          } else {
            wx++;
          }
        }
      }
      return;
    }
    _biomeCols = Math.ceil(WORLD_W / tsz);
    _biomeRows = Math.ceil(WORLD_H / tsz);
    _biomeGrid = new Uint8Array(_biomeCols * _biomeRows); // zero-init = all grass
    var _s = 5150;
    function rnd() { _s = ((_s | 0) * 1103515245 + 12345) & 0x7fffffff; return (_s & 0xffff) / 0xffff; }
    var total = _biomeCols * _biomeRows;
    var nDirt = Math.max(6, Math.round(total / 60));
    var nStone = Math.max(2, Math.round(total / 220));
    function stamp(biome, count, rxMax, ryMax) {
      for (var i = 0; i < count; i++) {
        var cx = Math.floor(rnd() * _biomeCols);
        var cy = Math.floor(rnd() * _biomeRows);
        var rx = 1 + Math.floor(rnd() * rxMax);
        var ry = 1 + Math.floor(rnd() * ryMax);
        for (var dy = -ry; dy <= ry; dy++) {
          for (var dx = -rx; dx <= rx; dx++) {
            var nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= _biomeCols || ny >= _biomeRows) continue;
            var ndx = dx / rx, ndy = dy / ry;
            if (ndx * ndx + ndy * ndy > 1) continue;
            _biomeGrid[ny * _biomeCols + nx] = biome;
          }
        }
      }
    }
    stamp(1, nDirt, 3, 2);
    stamp(2, nStone, 2, 2);
  }
  function _biomeAt(tx, ty) {
    // Boundary samples read as grass (per ArtDesigner spec)
    if (tx < 0 || ty < 0 || tx >= _biomeCols || ty >= _biomeRows || !_biomeGrid) return 0;
    return _biomeGrid[ty * _biomeCols + tx];
  }

  // ldoe-overhaul-02: procedural LDOE tiles. No圆角/六八角形状, only rects + scatter.
  // biome id → LDOE tile kind:
  //   0 (grass) → dry_grass (土黄 + 稀疏短线)
  //   1 (dirt)  → dirt (土黄褐 + 不规则斑)
  //   2 (stone) → cracked_concrete (灰白 + 块缝)
  //   3 (water) → muddy_water (暗蓝灰 + 涟漪)
  //   4 (sand)  → asphalt (深灰 + 裂缝白线)  [biome region北 → 城市道路]
  //   5 (swamp) → mud (暗棕 + puddle)
  //   6 (snow)  → gravel (暗灰 + 颗粒)
  function drawLdoeTile(ctx, x, y, sz, biomeId, h) {
    if (window.KOS_RENDER && typeof window.KOS_RENDER.drawMapTile === 'function') {
      if (window.KOS_RENDER.drawMapTile(ctx, x, y, sz, biomeId, h)) return;
    }
    var hr = (h * 2654435761) >>> 0;
    if (biomeId === 1) { // dirt
      ctx.fillStyle = '#5a4a32'; ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = '#6e5a3e'; // lighter patches (rectangular blotches, NOT round)
      ctx.fillRect(x + (h % 12), y + ((h >> 2) % 14), 18 + (h & 7), 6 + ((h >> 3) & 4));
      ctx.fillRect(x + 28 + ((h >> 5) % 16), y + 38 - ((h >> 7) & 11), 14 + ((h >> 4) & 5), 5);
      ctx.fillStyle = '#3e3220';
      ctx.fillRect(x + 6 + (h & 9), y + 12 + ((h >> 1) & 7), 4, 3);
      ctx.fillRect(x + 42 - ((h >> 3) & 13), y + 50 - ((h >> 6) & 9), 5, 3);
    } else if (biomeId === 2) { // cracked_concrete
      ctx.fillStyle = '#7a7a72'; ctx.fillRect(x, y, sz, sz);
      // Block seams (rectangular grid, urban concrete)
      ctx.fillStyle = '#3a3a38';
      ctx.fillRect(x + 31, y, 2, sz);   // vertical seam
      ctx.fillRect(x, y + 31, sz, 2);   // horizontal seam
      // Cracks (diagonal short lines)
      ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 8 + (h & 11), y + 8); ctx.lineTo(x + 16 + (h & 5), y + 22 - ((h >> 2) & 7)); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 38 - ((h >> 4) & 9), y + 38); ctx.lineTo(x + 50 - ((h >> 5) & 5), y + 50 + ((h >> 1) & 6)); ctx.stroke();
      // Stain
      ctx.fillStyle = 'rgba(40,30,20,0.35)';
      ctx.fillRect(x + 18 + ((hr >> 4) & 13), y + 42 - ((hr >> 7) & 9), 12, 5);
    } else if (biomeId === 3) { // muddy_water
      ctx.fillStyle = '#3a4a4a'; ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = '#2a3a3a'; ctx.fillRect(x, y, sz, sz);
      // Horizontal ripple lines
      ctx.strokeStyle = 'rgba(180,180,160,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 6 + (h & 7), y + 18); ctx.lineTo(x + 28 + (h & 9), y + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 30 - (h & 5), y + 44); ctx.lineTo(x + 56 - (h & 11), y + 44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 14, y + 32); ctx.lineTo(x + 38 - (h & 7), y + 32); ctx.stroke();
    } else if (biomeId === 4) { // asphalt — paved road
      ctx.fillStyle = '#2a2a28'; ctx.fillRect(x, y, sz, sz);
      // Lane white dashed line down center (every other tile shows a dash)
      if ((h & 1) === 0) {
        ctx.fillStyle = '#dad8d4';
        ctx.fillRect(x + 30, y + 20, 4, 18);
      }
      // Cracks
      ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 12 + (h & 9)); ctx.lineTo(x + sz, y + 14 + ((h >> 2) & 7)); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 6 + (h & 13), y); ctx.lineTo(x + 8 + ((h >> 4) & 11), y + sz); ctx.stroke();
      // Oil stain
      if ((hr & 7) === 0) {
        ctx.fillStyle = 'rgba(8,8,8,0.5)';
        ctx.fillRect(x + 14, y + 30, 16, 10);
      }
    } else if (biomeId === 5) { // mud
      ctx.fillStyle = '#3e2e1e'; ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = '#2e1e10';
      ctx.fillRect(x + (h & 13), y + ((h >> 1) & 11), 22 + (h & 9), 12);
      // Puddle (dark wet patch — rectangular outline, not ellipse)
      if ((h & 3) === 0) {
        ctx.fillStyle = '#1a1a12';
        ctx.fillRect(x + 14 + ((hr >> 3) & 9), y + 28 - ((hr >> 6) & 7), 24, 14);
        ctx.fillStyle = 'rgba(180,180,160,0.18)';
        ctx.fillRect(x + 16 + ((hr >> 3) & 9), y + 30 - ((hr >> 6) & 7), 6, 2);
      }
    } else if (biomeId === 6) { // gravel
      ctx.fillStyle = '#4a4a48'; ctx.fillRect(x, y, sz, sz);
      // Pebbles (small rect dots, NOT round)
      ctx.fillStyle = '#6a6a68';
      for (var pg = 0; pg < 8; pg++) {
        var px = x + ((h * (pg+1)) % (sz - 4));
        var py = y + (((h >> (pg & 3)) * 31) % (sz - 4));
        ctx.fillRect(px, py, 2 + (pg & 1), 2);
      }
      ctx.fillStyle = '#2a2a28';
      for (var pg2 = 0; pg2 < 5; pg2++) {
        var px2 = x + ((h * (pg2+13)) % (sz - 3));
        var py2 = y + (((h >> ((pg2+1) & 3)) * 47) % (sz - 3));
        ctx.fillRect(px2, py2, 2, 2);
      }
    } else { // 0 = dry_grass (default)
      ctx.fillStyle = '#6e5a3e'; ctx.fillRect(x, y, sz, sz);
      // Sparse短线 grass tufts (small horizontal/vertical sticks, NOT round dots)
      ctx.strokeStyle = '#8a7050'; ctx.lineWidth = 1;
      for (var gg = 0; gg < 6; gg++) {
        var gx = x + ((h * (gg+3)) % (sz - 4));
        var gy = y + (((h >> (gg & 3)) * 17) % (sz - 4));
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + ((gg & 1) ? 2 : 0), gy - 4);
        ctx.stroke();
      }
      // Dirt patch
      if ((h & 7) === 0) {
        ctx.fillStyle = '#4a3a26';
        ctx.fillRect(x + 18, y + 34, 14, 8);
      }
    }
  }

  function drawTilesetFloor(ctx, camX, camY) {
    if (!_biomeGrid) _initBiomeGrid();
    var tsz = LDOE_TILE_SZ;
    var x0 = Math.max(0, Math.floor(camX / tsz));
    var y0 = Math.max(0, Math.floor(camY / tsz));
    var x1 = Math.min(Math.ceil(WORLD_W / tsz), Math.ceil((camX + W) / tsz));
    var y1 = Math.min(Math.ceil(WORLD_H / tsz), Math.ceil((camY + H) / tsz));
    for (var ty = y0; ty < y1; ty++) {
      for (var tx = x0; tx < x1; tx++) {
        var h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
        drawLdoeTile(ctx, tx * tsz, ty * tsz, tsz, _biomeAt(tx, ty), h);
      }
    }
    // World boundary — dark vignette outside the playable area
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    if (camX < 0) ctx.fillRect(camX, camY, -camX, H);
    if (camY < 0) ctx.fillRect(Math.max(camX, 0), camY, W, -camY);
    if (camX + W > WORLD_W) ctx.fillRect(WORLD_W, camY, camX + W - WORLD_W, H);
    if (camY + H > WORLD_H) ctx.fillRect(Math.max(camX, 0), WORLD_H, W, camY + H - WORLD_H);
    // multiply overlay removed — procedural tiles already carry the LDOE 灰土锈 palette
  }

  // 9-slice stretch: corners fixed, edges repeat/stretch, center fills.
  function draw9Slice(ctx, x, y, w, h, opts) {
    if (!HOMM3_ART.ui9Ready) return false;
    var cs = (opts && opts.cornerSize) || 16;
    var alpha = (opts && opts.alpha != null) ? opts.alpha : 1;
    var u9 = HOMM3_ART.ui9;
    var midW = Math.max(0, w - cs * 2);
    var midH = Math.max(0, h - cs * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    // Source slice size is 64px; we draw 16px corners so we grab src 0..64 → dst cs.
    var S = 64;
    ctx.drawImage(u9.tl, 0, 0, S, S, x, y, cs, cs);
    ctx.drawImage(u9.tr, 0, 0, S, S, x + w - cs, y, cs, cs);
    ctx.drawImage(u9.bl, 0, 0, S, S, x, y + h - cs, cs, cs);
    ctx.drawImage(u9.br, 0, 0, S, S, x + w - cs, y + h - cs, cs, cs);
    if (midW > 0) {
      ctx.drawImage(u9.t, 0, 0, S, S, x + cs, y, midW, cs);
      ctx.drawImage(u9.b, 0, 0, S, S, x + cs, y + h - cs, midW, cs);
    }
    if (midH > 0) {
      ctx.drawImage(u9.l, 0, 0, S, S, x, y + cs, cs, midH);
      ctx.drawImage(u9.r, 0, 0, S, S, x + w - cs, y + cs, cs, midH);
    }
    if (midW > 0 && midH > 0) ctx.drawImage(u9.c, 0, 0, S, S, x + cs, y + cs, midW, midH);
    ctx.restore();
    return true;
  }

  // Round 5e F2 — graduated spawn shield. Returns the damage multiplier the
  // player should take at gameTime t. 0-15s 50%, 15-20s 30%, 20-25s 15%, 25s+ 100%.
  // Easing: linear interp between bands so the wear-off is smooth, not stepped.
  function _spawnShieldMul(t) {
    if (t >= 25) return 1;
    if (t < 15)  return 0.5;
    if (t < 20)  return 0.5 + (t - 15) / 5 * (0.7 - 0.5); // 0.5 → 0.7
    return 0.7 + (t - 20) / 5 * (0.85 - 0.7);             // 0.7 → 0.85
  }
  function _spawnShieldAlpha(t) {
    if (t >= 25) return 0;
    if (t < 15) return 1;
    return 1 - (t - 15) / 10; // linear fade 15→25s
  }
  // R5ab F2 — healer opening holy shield multiplier. Returns 0.5 if the player
  // is healer and still inside the 5s window set at startOfflineDemo, else 1.0.
  // Stacks multiplicatively with _spawnShieldMul — first 5s healer effectively
  // takes 0.25× damage (0.5 graduated × 0.5 holy).
  function _healerInitShieldMul(p) {
    if (!p || p.playerClass !== 'healer') return 1;
    if (p._healerShieldUntil && gameTime < p._healerShieldUntil) return 0.5;
    return 1;
  }
  // R6-control F1 — healer ability: 5s 30% damage reduction on self.
  function _abilityDmgScale() {
    if (player && player._abilityShieldUntil && gameTime < player._abilityShieldUntil) return 0.7;
    return 1;
  }
  // R6-control F1 — class active ability dispatcher (right-bottom button, 6s CD).
  // mage: fullscreen freeze 1.5s on visible enemies + hostile bots
  // healer: 280px AoE +120 HP to allies + 5s self 30% dmg reduction
  // warrior/scout: +50% atk speed 4s (placeholder, atkSpd buff via _abilityAtkSpdUntil)
  function triggerClassAbility() {
    if (!player || !player.alive) return false;
    if (state !== 'playing') return false;
    if (_abilityCdLeft > 0) return false;
    var cls = player.playerClass || selectedClass || 'warrior';
    if (cls === 'mage') {
      // Visible-area freeze (camera bounds + 80px margin so off-screen targets
      // hugging the edge still get caught — feels less arbitrary).
      var _fL = cameraX - 80, _fR = cameraX + W + 80;
      var _fT = cameraY - 80, _fB = cameraY + H + 80;
      var _frozen = 0;
      if (typeof offlineEnemies !== 'undefined' && offlineEnemies) {
        for (var _ei = 0; _ei < offlineEnemies.length; _ei++) {
          var _en = offlineEnemies[_ei];
          if (!_en || !_en.alive || !_en.hostile) continue;
          if (_en.x < _fL || _en.x > _fR || _en.y < _fT || _en.y > _fB) continue;
          _en._freezeUntil = gameTime + 1.5;
          _frozen++;
        }
      }
      if (typeof offlineBots !== 'undefined' && offlineBots) {
        for (var _bi = 0; _bi < offlineBots.length; _bi++) {
          var _bb = offlineBots[_bi];
          if (!_bb || !_bb.alive) continue;
          if (_bb.factionId === player.factionId) continue;
          if (_bb.x < _fL || _bb.x > _fR || _bb.y < _fT || _bb.y > _fB) continue;
          _bb._freezeUntil = gameTime + 1.5;
          _frozen++;
        }
      }
      _abilityFx = { active: true, t: 0, dur: 0.55, kind: 'mage' };
      floatText(player.x, player.y - 30, '冰冻 ' + _frozen, { color: '#a8e6ff', size: 16 });
    } else if (cls === 'healer') {
      var _r = 280, _r2 = _r * _r, _healed = 0;
      if (typeof allPlayers !== 'undefined' && allPlayers) {
        for (var _pi = 0; _pi < allPlayers.length; _pi++) {
          var _ap = allPlayers[_pi];
          if (!_ap || !_ap.alive) continue;
          if (_ap.factionId !== player.factionId) continue;
          var _adx = _ap.x - player.x, _ady = _ap.y - player.y;
          if (_adx * _adx + _ady * _ady > _r2) continue;
          var _maxHp = _ap.maxHp || _ap.hp || 100;
          var _before = _ap.hp;
          _ap.hp = Math.min(_maxHp, _ap.hp + 120);
          if (_ap.hp > _before) _healed++;
        }
      }
      // Also heal friendly bots (offlineBots) within radius — allPlayers may
      // not include them depending on lobby setup.
      if (typeof offlineBots !== 'undefined' && offlineBots) {
        for (var _bi2 = 0; _bi2 < offlineBots.length; _bi2++) {
          var _fb = offlineBots[_bi2];
          if (!_fb || !_fb.alive) continue;
          if (_fb.factionId !== player.factionId) continue;
          var _fdx = _fb.x - player.x, _fdy = _fb.y - player.y;
          if (_fdx * _fdx + _fdy * _fdy > _r2) continue;
          var _fmax = _fb.maxHp || _fb.hp || 100;
          if (_fb.hp < _fmax) { _fb.hp = Math.min(_fmax, _fb.hp + 120); _healed++; }
        }
      }
      player._abilityShieldUntil = gameTime + 5.0;
      _abilityFx = { active: true, t: 0, dur: 0.6, kind: 'healer' };
      floatText(player.x, player.y - 30, '群疗 +120 / 护盾 5s', { color: '#ffd86b', size: 14 });
    } else {
      // warrior / scout / fallback — placeholder atk speed burst
      player._abilityAtkSpdUntil = gameTime + 4.0;
      _abilityFx = { active: true, t: 0, dur: 0.55, kind: 'atkspd' };
      floatText(player.x, player.y - 30, '攻速 +50% 4s', { color: '#ff7755', size: 14 });
    }
    _abilityCdLeft = _ABILITY_CD;
    if (typeof playSound === 'function') playSound('shoot');
    return true;
  }
  // Round 5e F3 — global "altar slain" slow. R5i diag: 0.7 was too harsh,
  // lane_b combat fully stalled (avg 0/0 player+bot kills across 3 runs).
  // Lowered to 0.85 (15% slow) — still readable visually via slow_aura sprite,
  // but doesn't gate cross-river engagements through bridge chokepoints.
  function _altarSlowMul() {
    if (window._altarSlowUntil && (typeof gameTime !== 'undefined') && gameTime < window._altarSlowUntil) {
      return 0.85;
    }
    return 1;
  }
  function _nearestRiver(x, y) {
    var best = null, bestD = 1e12;
    for (var i = 0; i < terrainObstacles.length; i++) {
      var t = terrainObstacles[i];
      if (t.type !== 'deep_water' || !t._rect) continue;
      var qx = Math.max(t._rect.x, Math.min(x, t._rect.x + t._rect.width));
      var qy = Math.max(t._rect.y, Math.min(y, t._rect.y + t._rect.height));
      var dx = x - qx, dy = y - qy;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = { x: qx, y: qy, d: Math.sqrt(d) }; }
    }
    return best;
  }
  function _nearestBridge(x, y) {
    var best = null, bestD = 1e12;
    for (var i = 0; i < _brStructures.length; i++) {
      var s = _brStructures[i];
      if (s.type !== 'bridge') continue;
      var bx = s.x + s.w / 2, by = s.y + s.h / 2;
      var dx = bx - x, dy = by - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = { x: bx, y: by, d: Math.sqrt(d), label: s.label || '桥' }; }
    }
    return best;
  }
  function moveWithCollision(oldX, oldY, newX, newY, radius) {
    function blockedByWater(cx, cy) {
      for (var wi = 0; wi < terrainObstacles.length; wi++) {
        var tw = terrainObstacles[wi];
        if (tw.type !== 'deep_water' || !tw._rect) continue;
        var rb = tw._rect;
        var qx = Math.max(rb.x, Math.min(cx, rb.x + rb.width));
        var qy = Math.max(rb.y, Math.min(cy, rb.y + rb.height));
        var dx = cx - qx, dy = cy - qy;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
      return false;
    }
    if (!blockedByWater(newX, newY)) return { x: newX, y: newY, blocked: false };
    if (!blockedByWater(newX, oldY)) return { x: newX, y: oldY, blocked: true };
    if (!blockedByWater(oldX, newY)) return { x: oldX, y: newY, blocked: true };
    return { x: oldX, y: oldY, blocked: true };
  }

  // Debug hook — only mounted on localhost / ?debug=1 so production is zero-cost.
  // Testor uses this for sprite-sheet.spec.js assertions (see PM decision 2026-04-11).
  (function mountSpriteDebug() {
    try {
      var loc = (typeof window !== 'undefined') ? window.location : null;
      if (!loc) return;
      var debugOn = /[?&]debug=1/.test(loc.search) || loc.hostname === 'localhost' || loc.hostname === '127.0.0.1';
      if (!debugOn) return;
      function resolvePlayer(id) {
        if (id == null || id === 0 || id === 'self') return (typeof player !== 'undefined') ? player : null;
        if (typeof allPlayers !== 'undefined' && allPlayers && allPlayers[id]) return allPlayers[id];
        return null;
      }
      window.__spriteDebug = {
        getLoadedSheets: function() { return []; }, // ldoe-overhaul-01: procedural, no sheets
        getCurrentFrame: function(id) {
          var p = resolvePlayer(id);
          if (!p || !p._spriteDebugFrame) return null;
          var f = p._spriteDebugFrame;
          return {
            animState: f.animState,
            row: f.row,
            col: f.col,
            dir: f.dir,
            facingAngle: f.facingAngle,
            sheet: f.sheetSource
          };
        },
        forceState: function(id, animState) {
          var p = resolvePlayer(id);
          if (!p) return;
          p._forceAnimState = animState || null;
        },
        getLastPos: function(id) {
          var p = resolvePlayer(id);
          if (!p) return null;
          var lp = p._spriteLastPos || { x: p.x, y: p.y, t: 0 };
          var now = (typeof gameTime !== 'undefined') ? gameTime : 0;
          var dt = Math.max(1e-6, now - lp.t);
          return {
            x: p.x, y: p.y, t: now,
            vx: (p.x - lp.x) / dt,
            vy: (p.y - lp.y) / dt
          };
        },
        // Test helper: jump straight into offline demo mode without going through
        // the register/room/WebSocket flow. Lets e2e exercise the sprite path in
        // isolation. Not for production use — Testor only.
        enterOfflineDemo: function(classType) {
          try {
            if (classType && typeof selectedClass !== 'undefined') selectedClass = classType;
            if (typeof startGame === 'function') startGame();
            if (typeof startOfflineDemo === 'function') {
              startOfflineDemo();
              // Hide login overlay so the canvas is visible for visual tests
              var ov = document.getElementById('login-overlay');
              if (ov) ov.classList.add('hidden');
              return true;
            }
          } catch (e) { return 'err: ' + e.message; }
          return false;
        },
        // ldoe-overhaul-01: Playtester closeup hooks
        getLastMuzzleAt: function() { return window.__lastMuzzleAt || null; },
        getLastCasingAt: function() { return window.__lastCasingAt || null; },
        // ldoe-overhaul-01a: pause + force-fire so static screenshots can capture
        // ephemeral muzzle/casing/tracer particles without timing race
        pauseGame: function() {
          if (typeof state !== 'undefined') { window.__prevState = state; state = 'paused'; return true; }
          return false;
        },
        resumeGame: function() {
          if (typeof state !== 'undefined' && window.__prevState) { state = window.__prevState; return true; }
          return false;
        },
        forceFireMuzzleCasing: function(facingAngle) {
          if (typeof player === 'undefined' || !player) return false;
          var ang = (facingAngle != null) ? facingAngle : 0;
          var muzX = player.x + Math.cos(ang) * player.radius * 1.2;
          var muzY = player.y + Math.sin(ang) * player.radius * 1.2;
          // muzzle cone particle
          if (typeof particles !== 'undefined') {
            particles.push({
              x: muzX, y: muzY,
              vx: Math.cos(ang), vy: Math.sin(ang),
              life: 9.0, maxLife: 9.0, // long for static probe
              color: '#ffeb3b', size: 48,
              particleType: 'muzzleCone', _angle: ang
            });
            // casing — long lived for static probe, no gravity (frozen at spawn)
            var csA = ang - Math.PI * 0.55;
            var _csXp = player.x + Math.cos(csA) * player.radius * 0.6;
            var _csYp = player.y + Math.sin(csA) * player.radius * 0.6;
            particles.push({
              x: _csXp, y: _csYp,
              vx: 0, vy: 0,
              life: 9.0, maxLife: 9.0,
              color: '#fff2a0', size: 4,
              particleType: 'casing'
            });
            window.__lastCasingAt = { x: _csXp, y: _csYp, t: (typeof gameTime !== 'undefined' ? gameTime : 0) };
          }
          // tracer (offlineSkillFx) — long-lived for static frame
          if (typeof offlineSkillFx !== 'undefined') {
            offlineSkillFx.push({
              kind: 'bullet',
              x: muzX + Math.cos(ang) * 60,
              y: muzY + Math.sin(ang) * 60,
              vx: Math.cos(ang) * 600, vy: Math.sin(ang) * 600,
              angle: ang, life: 9.0, maxLife: 9.0,
              color: '#ffeb3b'
            });
          }
          window.__lastMuzzleAt = { x: muzX, y: muzY, t: (typeof gameTime !== 'undefined' ? gameTime : 0) };
          return { muzX: muzX, muzY: muzY };
        },
        getCamera: function() {
          return {
            x: (typeof cameraX !== 'undefined') ? cameraX : 0,
            y: (typeof cameraY !== 'undefined') ? cameraY : 0,
            w: (typeof W !== 'undefined') ? W : 0,
            h: (typeof H !== 'undefined') ? H : 0
          };
        },
        getLandmarksOnScreen: function() {
          if (typeof MAP_DATA === 'undefined' || !MAP_DATA || !MAP_DATA.structures) return [];
          var camX = (typeof cameraX !== 'undefined') ? cameraX : 0;
          var camY = (typeof cameraY !== 'undefined') ? cameraY : 0;
          var sw = (typeof W !== 'undefined') ? W : 0;
          var sh = (typeof H !== 'undefined') ? H : 0;
          var out = [];
          var _ldoeSet = { fence:1, gas_station:1, wreck_car:1, barricade:1, debris:1 };
          for (var i = 0; i < MAP_DATA.structures.length; i++) {
            var s = MAP_DATA.structures[i];
            var k = s.kind || s.type;
            // ldoe-overhaul-02a: landmark kind directly in 5 ldoe set OR legacy
            // (kind='landmark' + sprite=ldoe_kind) — both yield {kind: ldoe_kind} out
            var ldoeKind = _ldoeSet[k] ? k : (k === 'landmark' && _ldoeSet[s.sprite] ? s.sprite : null);
            if (!ldoeKind) continue;
            if (s.x + s.w < camX || s.x > camX + sw) continue;
            if (s.y + s.h < camY || s.y > camY + sh) continue;
            out.push({ kind: ldoeKind, x: s.x, y: s.y, w: s.w, h: s.h, screenX: s.x - camX, screenY: s.y - camY });
          }
          return out;
        },
        // ldoe-overhaul-02b: full-map landmark dump + dist-to-player for spawn-ring diag
        getLandmarksAll: function() {
          if (typeof MAP_DATA === 'undefined' || !MAP_DATA || !MAP_DATA.structures) return [];
          var px = (typeof player !== 'undefined' && player) ? player.x : 0;
          var py = (typeof player !== 'undefined' && player) ? player.y : 0;
          var _ldoeSet = { fence:1, gas_station:1, wreck_car:1, barricade:1, debris:1 };
          var out = [];
          for (var i = 0; i < MAP_DATA.structures.length; i++) {
            var s = MAP_DATA.structures[i];
            var k = s.kind || s.type;
            var ldoeKind = _ldoeSet[k] ? k : (k === 'landmark' && _ldoeSet[s.sprite] ? s.sprite : null);
            if (!ldoeKind) continue;
            var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
            out.push({ kind: ldoeKind, x: s.x, y: s.y, w: s.w, h: s.h, cx: cx, cy: cy, distToPlayer: Math.hypot(px - cx, py - cy) });
          }
          out.sort(function(a, b) { return a.distToPlayer - b.distToPlayer; });
          return out;
        },
        getLastTracerSegment: function() { return window.__lastTracerSegment || null; },
        spawnEnemyNear: function(type, dx, dy) {
          try {
            if (typeof spawnOfflineEnemy === 'function' && typeof player !== 'undefined') {
              spawnOfflineEnemy(type, player.x + (dx || 0), player.y + (dy || 0));
              return true;
            }
          } catch (e) { return 'err: ' + e.message; }
          return false;
        },
        triggerAttack: function(id) {
          var p = resolvePlayer(id);
          if (!p) return false;
          var _atkDur = { warrior: 0.50, mage: 0.58, scout: 0.93 }[p.playerClass || (typeof selectedClass !== 'undefined' ? selectedClass : 'warrior')] || 0.50;
          p._attackStart = (typeof gameTime !== 'undefined') ? gameTime : 0;
          p._attackUntil = p._attackStart + _atkDur;
          p._attackFacing = p.facingAngle || 0;
          return true;
        },
        // Wave 1 (Sprint 3) — combat feedback probes (PM hard requirement 2026-04-11)
        triggerHitStop: function(level) {
          if (typeof triggerHitStop === 'function') { triggerHitStop(level); return true; }
          return false;
        },
        triggerShake: function(level) {
          if (typeof screenShake === 'function') { screenShake(level); return true; }
          return false;
        },
        getShakeState: function() {
          return {
            offsetX: (typeof shakeX !== 'undefined') ? shakeX : 0,
            offsetY: (typeof shakeY !== 'undefined') ? shakeY : 0,
            intensity: (typeof shakeX !== 'undefined') ? Math.max(Math.abs(shakeX), Math.abs(shakeY)) : 0,
            durationRemaining: (typeof shakeDur !== 'undefined') ? shakeDur : 0
          };
        },
        getHitStopTimer: function() {
          if (typeof hitStop === 'undefined' || !hitStop) return 0;
          return hitStop.active ? Math.round(hitStop.timer * 1000) : 0; // ms
        },
        getLastFloatText: function() {
          if (typeof _lastFloatText === 'undefined' || !_lastFloatText) return null;
          // Copy to prevent mutation
          return {
            text: _lastFloatText.text,
            color: _lastFloatText.color,
            size: _lastFloatText.size,
            x: _lastFloatText.x,
            y: _lastFloatText.y,
            life: _lastFloatText.life,
            crit: _lastFloatText.crit
          };
        },
        getEnemyKnockback: function(idx) {
          if (typeof offlineEnemies === 'undefined' || !offlineEnemies[idx]) return null;
          var e = offlineEnemies[idx];
          return {
            vx: e._knockbackVx || 0,
            vy: e._knockbackVy || 0,
            immuneUntil: e._damageImmuneUntil || 0,
            type: e.type,
            alive: !!e.alive
          };
        },
        // Sprint 3 Wave 2 Epic 2.1 — upgrade choice probes
        getUpgradeChoices: function() {
          if (typeof skillChoices === 'undefined' || !skillChoices || skillChoices.length === 0) return null;
          return skillChoices.map(function(c) {
            if (typeof c === 'string') return { id: c };
            return { id: c.id, name: c.name, rarity: c.rarity, weight: c.weight, icon: c.icon };
          });
        },
        forceLevelUp: function() {
          if (typeof triggerLevelUp === 'function') { triggerLevelUp(); return true; }
          return false;
        },
        getCardPool: function() {
          if (typeof WAVE2_CARDS === 'undefined' || !WAVE2_CARDS) return null;
          return { size: (WAVE2_CARDS.cards || []).length, rarities: Object.keys(WAVE2_CARDS.rarities || {}), loaded: true };
        }
      };
    } catch (e) { /* no-op */ }
  })();
  // facingAngle → direction row offset (U=0, L=1, D=2, R=3)
  function charDirOffset(angle) {
    var a = Math.atan2(Math.sin(angle), Math.cos(angle)); // normalize to [-PI, PI]
    if (a > -Math.PI / 4 && a <= Math.PI / 4) return 3;         // right
    if (a > Math.PI / 4 && a <= 3 * Math.PI / 4) return 2;      // down
    if (a > -3 * Math.PI / 4 && a <= -Math.PI / 4) return 0;    // up
    return 1;                                                   // left
  }

  function drawCharacterSprite(cx, cy, radius, classType, facingAngle, options) {
    if (window.KOS_RENDER && typeof window.KOS_RENDER.drawSurvivorSprite === 'function') {
      var _survivorOpts = options || {};
      _survivorOpts.gameTime = gameTime || 0;
      if (window.KOS_RENDER.drawSurvivorSprite(ctx, cx, cy, radius, classType, facingAngle, _survivorOpts)) return;
    }
    var opts = options || {};
    var isFury = opts.fury || false;
    var shieldActive = opts.shield || false;
    var alpha = opts.alpha || 1;
    var isBot = opts.isBot || false;
    var skinId = opts.skinId || 'default';
    var skinData = getSkinData(skinId);
    var r = radius;
    var gt = gameTime || 0;

    // Idle breath/bob scale still applies to skin aura/outline layering
    var visual = (skinData && skinData.visual) ? skinData.visual : {};
    var idleAnim = visual.idleAnimation || 'none';
    var animScale = getIdleAnimationScale(idleAnim, gt);
    r = radius * animScale;

    // Layer 0: Aura behind sprite
    if (skinData && !isBot) {
      drawSkinAura(cx, cy, r, skinData, gt);
    }

    // === Fully procedural — LDOE survivor render path ===
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(facingAngle);

    var headC = getPartColors(skinData, 'head', classType);
    var bodyC = getPartColors(skinData, 'body', classType);
    var weaponC = getPartColors(skinData, 'weapon', classType);
    var legsC = getPartColors(skinData, 'legs', classType);

    drawCharShadow(r);
    drawCharLegs(r, classType, legsC, gt);
    drawCharBody(r, classType, bodyC, isFury, shieldActive);
    drawCharWeapon(r, classType, weaponC, gt);
    drawCharHead(r, classType, headC, gt);

    ctx.restore();

    if (skinData && !isBot) {
      drawSkinOutline(cx, cy, r, skinData, gt);
      drawSkinParticles(cx, cy, r, skinData, gt);
    }
  }

  // === ENEMY SPRITES — Canvas-drawn creatures per enemy type ===
  function drawEnemySprite(ctx, x, y, r, type, themeColor, gt, srcEntity) {
    if (window.KOS_RENDER && typeof window.KOS_RENDER.drawEnemySprite === 'function') {
      if (window.KOS_RENDER.drawEnemySprite(ctx, x, y, r, type, themeColor, gt, srcEntity)) return;
    }
    // zombie-skin-01: drop monster_orc override; all non-boss enemies render as
    // procedural zombies below. ctx.scale(2,2) brings procedural footprint up to
    // the ~4.5×r sprite footprint so visual size doesn't collapse.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2.0, 2.0);
    switch (type) {
      case 'normal': { // Walker zombie — slow shamble, arms forward, rotted clothes
        var shamble = Math.sin(gt * 2.5) * r * 0.04;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, r*0.6, r*0.5, r*0.13, 0, 0, Math.PI*2); ctx.fill();
        // Legs (uneven, dragging)
        ctx.fillStyle = '#3a2820';
        ctx.fillRect(-r*0.22, r*0.2, r*0.16, r*0.4);
        ctx.fillRect(r*0.06, r*0.2 + shamble, r*0.16, r*0.4 - shamble);
        // Torn shirt body
        ctx.fillStyle = '#6a5040';
        ctx.beginPath();
        ctx.moveTo(-r*0.32, -r*0.08); ctx.lineTo(r*0.32, -r*0.08);
        ctx.lineTo(r*0.28, r*0.28); ctx.lineTo(r*0.05, r*0.22); ctx.lineTo(-r*0.1, r*0.3); ctx.lineTo(-r*0.28, r*0.22);
        ctx.closePath(); ctx.fill();
        // Blood stain on shirt
        ctx.fillStyle = '#5a0a0a'; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.ellipse(r*0.05, r*0.08, r*0.18, r*0.13, 0.3, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Outstretched arms (signature zombie pose)
        ctx.fillStyle = '#7a8865'; // rotted skin
        ctx.fillRect(-r*0.55, -r*0.05, r*0.25, r*0.12);
        ctx.fillRect(r*0.3, -r*0.05 + shamble*0.5, r*0.25, r*0.12);
        // Hands (claws)
        ctx.beginPath(); ctx.arc(-r*0.55, r*0.0, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.55, r*0.0 + shamble*0.5, r*0.1, 0, Math.PI*2); ctx.fill();
        // Head (slumped, gray-green)
        ctx.fillStyle = '#7a8865';
        ctx.beginPath(); ctx.arc(0, -r*0.3 + shamble*0.3, r*0.32, 0, Math.PI*2); ctx.fill();
        // Sunken cheek shadow
        ctx.fillStyle = '#4a5840'; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(0, -r*0.25 + shamble*0.3, r*0.28, 0.2, Math.PI - 0.2); ctx.fill();
        ctx.globalAlpha = 1;
        // Hollow red eyes
        ctx.fillStyle = '#cc2010';
        ctx.beginPath(); ctx.arc(-r*0.12, -r*0.33 + shamble*0.3, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.12, -r*0.33 + shamble*0.3, r*0.06, 0, Math.PI*2); ctx.fill();
        // Open mouth (black, dripping)
        ctx.fillStyle = '#180808';
        ctx.beginPath(); ctx.ellipse(0, -r*0.18 + shamble*0.3, r*0.1, r*0.08, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#5a0a0a';
        ctx.beginPath(); ctx.moveTo(-r*0.04, -r*0.13 + shamble*0.3); ctx.lineTo(-r*0.06, -r*0.02 + shamble*0.3); ctx.lineTo(0, -r*0.1 + shamble*0.3); ctx.fill();
        break;
      }
      case 'fast': { // Runner zombie — sprint pose, exposed muscle, blood-soaked
        var sprint = Math.sin(gt * 14) * r * 0.2;
        // Shadow (small, motion blurred)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(0, r*0.55, r*0.5, r*0.1, 0, 0, Math.PI*2); ctx.fill();
        // Trail streaks
        ctx.fillStyle = 'rgba(180,30,30,0.25)';
        ctx.fillRect(-r*0.9, -r*0.1, r*0.5, r*0.06);
        // Forward-leaning body (shredded shirt)
        ctx.save(); ctx.rotate(-0.18);
        ctx.fillStyle = '#3a2018';
        ctx.beginPath();
        ctx.moveTo(-r*0.28, -r*0.05); ctx.lineTo(r*0.32, -r*0.05);
        ctx.lineTo(r*0.22, r*0.3); ctx.lineTo(-r*0.05, r*0.18); ctx.lineTo(-r*0.22, r*0.28);
        ctx.closePath(); ctx.fill();
        // Exposed bloody flesh under shirt
        ctx.fillStyle = '#a83020';
        ctx.beginPath(); ctx.ellipse(r*0.0, r*0.05, r*0.14, r*0.09, 0, 0, Math.PI*2); ctx.fill();
        // Sprint legs (one back, one forward)
        ctx.fillStyle = '#b06045';
        ctx.fillRect(-r*0.18 - sprint*0.3, r*0.22, r*0.13, r*0.38);
        ctx.fillRect(r*0.05 + sprint*0.3, r*0.22, r*0.13, r*0.38 - Math.abs(sprint)*0.4);
        // Lunging arms (claws forward)
        ctx.fillStyle = '#b06045';
        ctx.fillRect(r*0.15, -r*0.1, r*0.45, r*0.1);
        ctx.fillRect(-r*0.55, -r*0.05 + sprint*0.2, r*0.4, r*0.1);
        ctx.beginPath(); ctx.arc(r*0.6, -r*0.05, r*0.09, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r*0.55, 0 + sprint*0.2, r*0.09, 0, Math.PI*2); ctx.fill();
        // Lean head (jaw forward, screaming)
        ctx.fillStyle = '#b06045';
        ctx.beginPath(); ctx.arc(r*0.05, -r*0.32, r*0.28, 0, Math.PI*2); ctx.fill();
        // Wide screaming mouth
        ctx.fillStyle = '#180808';
        ctx.beginPath(); ctx.ellipse(r*0.1, -r*0.22, r*0.13, r*0.1, 0, 0, Math.PI*2); ctx.fill();
        // Bloody fangs
        ctx.fillStyle = '#e8d8b0';
        ctx.fillRect(r*0.04, -r*0.25, r*0.03, r*0.08);
        ctx.fillRect(r*0.15, -r*0.25, r*0.03, r*0.08);
        // Bloodshot white eyes
        ctx.fillStyle = '#f8e8c0';
        ctx.beginPath(); ctx.arc(r*0.0, -r*0.36, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.18, -r*0.36, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#a01010';
        ctx.beginPath(); ctx.arc(r*0.02, -r*0.36, r*0.025, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.2, -r*0.36, r*0.025, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        break;
      }
      case 'tank': { // Bloater zombie — bloated mottled body, pus boils, leaking
        var pulse = Math.sin(gt * 1.8) * r * 0.04;
        // Wide shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, r*0.75, r*0.95, r*0.22, 0, 0, Math.PI*2); ctx.fill();
        // Stubby legs
        ctx.fillStyle = '#3a4830';
        ctx.fillRect(-r*0.45, r*0.4, r*0.32, r*0.35);
        ctx.fillRect(r*0.13, r*0.4, r*0.32, r*0.35);
        // Distended bloated torso (mottled greenish-purple)
        ctx.fillStyle = '#5a7050';
        ctx.beginPath();
        ctx.ellipse(0, r*0.05 + pulse, r*0.85, r*0.62 + pulse, 0, 0, Math.PI*2);
        ctx.fill();
        // Mottling patches (dark)
        ctx.fillStyle = '#3a4035'; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.ellipse(-r*0.3, r*0.1, r*0.18, r*0.13, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r*0.35, r*0.2, r*0.16, r*0.11, -0.3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r*0.0, r*0.32, r*0.2, r*0.1, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Pus boils (yellow-green pustules)
        ctx.fillStyle = '#c8d040';
        ctx.beginPath(); ctx.arc(-r*0.2, -r*0.15, r*0.13, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.4, -r*0.05, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.15, r*0.35, r*0.09, 0, Math.PI*2); ctx.fill();
        // Boil highlights
        ctx.fillStyle = '#f0f880';
        ctx.beginPath(); ctx.arc(-r*0.23, -r*0.18, r*0.04, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.38, -r*0.08, r*0.03, 0, Math.PI*2); ctx.fill();
        // Stubby arms (small relative to body)
        ctx.fillStyle = '#5a7050';
        ctx.fillRect(-r*1.0, -r*0.05, r*0.3, r*0.18);
        ctx.fillRect(r*0.7, -r*0.05, r*0.3, r*0.18);
        ctx.beginPath(); ctx.arc(-r*1.0, r*0.04, r*0.15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*1.0, r*0.04, r*0.15, 0, Math.PI*2); ctx.fill();
        // Tiny shrunken head
        ctx.fillStyle = '#5a7050';
        ctx.beginPath(); ctx.arc(0, -r*0.55, r*0.22, 0, Math.PI*2); ctx.fill();
        // Half-closed eyes
        ctx.fillStyle = '#180808';
        ctx.fillRect(-r*0.13, -r*0.55, r*0.08, r*0.025);
        ctx.fillRect(r*0.05, -r*0.55, r*0.08, r*0.025);
        // Drool / pus drip
        ctx.fillStyle = '#a8b830'; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(-r*0.05, -r*0.4); ctx.quadraticCurveTo(0, -r*0.2, r*0.04, -r*0.4); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'boss': { // Boss zombie tank — armored, asymmetric mutant arm, blood streaks, 2.2× scale
        ctx.scale(1.1, 1.1); // additional scale on top of 2× → ~2.2× vs normals
        var lurch = Math.sin(gt * 1.2) * r * 0.05;
        // Heavy ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.ellipse(0, r*0.85, r*1.05, r*0.24, 0, 0, Math.PI*2); ctx.fill();
        // Stout legs in tactical-armor greaves
        ctx.fillStyle = '#1a1a18';
        ctx.fillRect(-r*0.48, r*0.35, r*0.36, r*0.45);
        ctx.fillRect(r*0.12, r*0.35, r*0.36, r*0.45);
        // Knee plates (rusted metal)
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(-r*0.48, r*0.45, r*0.36, r*0.08);
        ctx.fillRect(r*0.12, r*0.45, r*0.36, r*0.08);
        // Torso under armor (rotted skin, dark gray-green)
        ctx.fillStyle = '#3a4a3a';
        ctx.beginPath(); ctx.ellipse(0, lurch, r*0.7, r*0.55, 0, 0, Math.PI*2); ctx.fill();
        // Chest armor plate (riveted steel, dented)
        ctx.fillStyle = '#4a4a48';
        ctx.beginPath();
        ctx.moveTo(-r*0.5, -r*0.35 + lurch);
        ctx.lineTo(r*0.5, -r*0.35 + lurch);
        ctx.lineTo(r*0.55, r*0.2 + lurch);
        ctx.lineTo(-r*0.55, r*0.2 + lurch);
        ctx.closePath(); ctx.fill();
        // Plate outline (heavy)
        ctx.strokeStyle = '#1a1a18'; ctx.lineWidth = 3; ctx.stroke();
        // Rivets
        ctx.fillStyle = '#88887a';
        for (var ri = 0; ri < 4; ri++) {
          ctx.beginPath(); ctx.arc(-r*0.4 + ri*r*0.27, -r*0.28 + lurch, r*0.04, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(-r*0.4 + ri*r*0.27, r*0.12 + lurch, r*0.04, 0, Math.PI*2); ctx.fill();
        }
        // Blood streaks down the chest plate
        ctx.fillStyle = '#5a0808'; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(-r*0.2, -r*0.32 + lurch); ctx.lineTo(-r*0.18, r*0.18 + lurch); ctx.lineTo(-r*0.12, r*0.18 + lurch); ctx.lineTo(-r*0.14, -r*0.32 + lurch); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r*0.05, -r*0.32 + lurch); ctx.lineTo(r*0.08, r*0.0 + lurch); ctx.lineTo(r*0.16, r*0.0 + lurch); ctx.lineTo(r*0.13, -r*0.32 + lurch); ctx.fill();
        ctx.globalAlpha = 1;
        // Asymmetric — LEFT side: oversized mutant arm (huge claw)
        ctx.fillStyle = '#3a4a3a';
        ctx.beginPath();
        ctx.moveTo(-r*0.55, -r*0.2 + lurch);
        ctx.lineTo(-r*1.25, -r*0.05 + lurch);
        ctx.lineTo(-r*1.3, r*0.45);
        ctx.lineTo(-r*0.5, r*0.25 + lurch);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1a2a1a'; ctx.lineWidth = 2; ctx.stroke();
        // Mutant claw (3 thick fingers)
        ctx.fillStyle = '#2a1818';
        for (var ci = 0; ci < 3; ci++) {
          var cay = r*0.25 + ci*r*0.18;
          ctx.beginPath(); ctx.moveTo(-r*1.3, cay); ctx.lineTo(-r*1.55, cay + r*0.08); ctx.lineTo(-r*1.3, cay + r*0.16); ctx.fill();
        }
        // Bone protrusion through skin on the mutant arm
        ctx.fillStyle = '#e8d8b0';
        ctx.beginPath(); ctx.ellipse(-r*0.95, r*0.05 + lurch, r*0.08, r*0.12, 0.6, 0, Math.PI*2); ctx.fill();
        // RIGHT side: smaller normal armored arm
        ctx.fillStyle = '#4a4a48';
        ctx.fillRect(r*0.5, -r*0.2 + lurch, r*0.3, r*0.45);
        ctx.fillStyle = '#3a4a3a';
        ctx.beginPath(); ctx.arc(r*0.65, r*0.3 + lurch, r*0.16, 0, Math.PI*2); ctx.fill();
        // Helmet — open-face combat helm with jaw missing
        ctx.fillStyle = '#3a3a38';
        ctx.beginPath(); ctx.arc(0, -r*0.55 + lurch, r*0.32, Math.PI*1.0, Math.PI*2.0); ctx.fill();
        // Skull face (jaw missing, exposed)
        ctx.fillStyle = '#7a8865';
        ctx.beginPath(); ctx.arc(0, -r*0.5 + lurch, r*0.26, 0, Math.PI*2); ctx.fill();
        // Glowing red eyes (pulsing menace)
        var bossEyePulse = 0.7 + 0.3 * Math.sin(gt * 5);
        ctx.save();
        ctx.shadowColor = '#ff2010'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff4020'; ctx.globalAlpha = bossEyePulse;
        ctx.beginPath(); ctx.arc(-r*0.12, -r*0.55 + lurch, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.12, -r*0.55 + lurch, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        // Exposed jaw (no lower jaw, just teeth and tongue)
        ctx.fillStyle = '#180808';
        ctx.beginPath(); ctx.ellipse(0, -r*0.38 + lurch, r*0.14, r*0.08, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e8d8b0';
        for (var ti = 0; ti < 5; ti++) {
          ctx.fillRect(-r*0.12 + ti*r*0.06, -r*0.42 + lurch, r*0.025, r*0.06);
        }
        // Helmet horns (broken metal spikes)
        ctx.strokeStyle = '#3a3a38'; ctx.lineWidth = r*0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r*0.28, -r*0.78 + lurch); ctx.lineTo(-r*0.45, -r*1.0 + lurch); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r*0.28, -r*0.78 + lurch); ctx.lineTo(r*0.45, -r*1.0 + lurch); ctx.stroke();
        break;
      }
      case 'ranged': { // Spitter zombie — gaunt, hunched, acid bile dripping from mouth
        var bilePulse = 0.6 + 0.4 * Math.sin(gt * 4);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(0, r*0.55, r*0.45, r*0.11, 0, 0, Math.PI*2); ctx.fill();
        // Hunched legs
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(-r*0.2, r*0.2, r*0.14, r*0.4);
        ctx.fillRect(r*0.06, r*0.2, r*0.14, r*0.4);
        // Gaunt skeletal torso (ribs visible)
        ctx.fillStyle = '#708855';
        ctx.beginPath(); ctx.ellipse(0, 0, r*0.3, r*0.32, 0, 0, Math.PI*2); ctx.fill();
        // Rib lines
        ctx.strokeStyle = '#3a4835'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-r*0.22, -r*0.05); ctx.lineTo(r*0.22, -r*0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r*0.22, r*0.08); ctx.lineTo(r*0.22, r*0.08); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r*0.2, r*0.18); ctx.lineTo(r*0.2, r*0.18); ctx.stroke();
        // Long lanky arms hanging down
        ctx.fillStyle = '#708855';
        ctx.fillRect(-r*0.42, -r*0.05, r*0.12, r*0.5);
        ctx.fillRect(r*0.3, -r*0.05, r*0.12, r*0.5);
        ctx.beginPath(); ctx.arc(-r*0.36, r*0.5, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.36, r*0.5, r*0.1, 0, Math.PI*2); ctx.fill();
        // Elongated head
        ctx.fillStyle = '#708855';
        ctx.beginPath(); ctx.ellipse(0, -r*0.4, r*0.22, r*0.3, 0, 0, Math.PI*2); ctx.fill();
        // Wide gaping mouth (full of bile)
        ctx.fillStyle = '#3a4810';
        ctx.beginPath(); ctx.ellipse(0, -r*0.28, r*0.16, r*0.14, 0, 0, Math.PI*2); ctx.fill();
        // Glowing acid bile inside mouth
        ctx.fillStyle = '#9aff40'; ctx.globalAlpha = bilePulse;
        ctx.beginPath(); ctx.ellipse(0, -r*0.25, r*0.12, r*0.08, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        // Bile drip
        ctx.fillStyle = '#9aff40';
        ctx.beginPath(); ctx.moveTo(-r*0.04, -r*0.18); ctx.quadraticCurveTo(0, r*0.05, r*0.04, -r*0.18); ctx.fill();
        // Sunken eyes (black with green glow)
        ctx.fillStyle = '#080808';
        ctx.beginPath(); ctx.arc(-r*0.1, -r*0.5, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.1, -r*0.5, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#9aff40'; ctx.globalAlpha = bilePulse;
        ctx.beginPath(); ctx.arc(-r*0.1, -r*0.5, r*0.025, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.1, -r*0.5, r*0.025, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'swarm': { // Crawler zombie — small fast crawler, scuttling on all fours
        var scuttle = Math.sin(gt * 16) * r * 0.1;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(0, r*0.45, r*0.4, r*0.08, 0, 0, Math.PI*2); ctx.fill();
        // Low-slung body (crawling pose, oriented horizontal)
        ctx.fillStyle = '#7a8865';
        ctx.beginPath(); ctx.ellipse(0, r*0.15, r*0.45, r*0.22, 0, 0, Math.PI*2); ctx.fill();
        // Tattered shorts
        ctx.fillStyle = '#3a2820';
        ctx.beginPath(); ctx.ellipse(r*0.05, r*0.22, r*0.25, r*0.13, 0, 0, Math.PI*2); ctx.fill();
        // Splayed legs (4-legged crawler)
        ctx.fillStyle = '#7a8865';
        ctx.fillRect(-r*0.4 - scuttle*0.5, r*0.1, r*0.12, r*0.4);
        ctx.fillRect(r*0.28 + scuttle*0.5, r*0.1, r*0.12, r*0.4);
        // Forward arms (planted on ground)
        ctx.fillRect(-r*0.55, -r*0.05 + scuttle*0.3, r*0.18, r*0.1);
        ctx.fillRect(r*0.37, -r*0.05 - scuttle*0.3, r*0.18, r*0.1);
        ctx.beginPath(); ctx.arc(-r*0.55, r*0.0 + scuttle*0.3, r*0.08, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.55, r*0.0 - scuttle*0.3, r*0.08, 0, Math.PI*2); ctx.fill();
        // Head (low, forward)
        ctx.fillStyle = '#7a8865';
        ctx.beginPath(); ctx.arc(r*0.05, -r*0.05, r*0.2, 0, Math.PI*2); ctx.fill();
        // Snarling mouth
        ctx.fillStyle = '#180808';
        ctx.beginPath(); ctx.ellipse(r*0.08, r*0.04, r*0.1, r*0.05, 0, 0, Math.PI*2); ctx.fill();
        // Tiny red eyes
        ctx.fillStyle = '#cc2010';
        ctx.beginPath(); ctx.arc(-r*0.04, -r*0.1, r*0.04, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.14, -r*0.1, r*0.04, 0, Math.PI*2); ctx.fill();
        break;
      }
      case 'splitting': // Slime — wobbly blob with highlight
        ctx.fillStyle = themeColor;
        ctx.beginPath();
        for (var sa = 0; sa < Math.PI * 2; sa += 0.25) {
          var wobble = r * (0.82 + 0.18 * Math.sin(sa * 3 + gt * 4));
          var bx = Math.cos(sa) * wobble, by = Math.sin(sa) * wobble;
          if (sa === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
        }
        ctx.closePath(); ctx.fill();
        // Inner highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.3, r * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.05, r * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.05, r * 0.12, 0, Math.PI * 2); ctx.fill();
        // Drip
        ctx.fillStyle = themeColor; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.6); ctx.quadraticCurveTo(r * 0.35, r * 1.1, r * 0.25, r * 0.6); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'shielded': // Armored knight — helmet with shield
        // Shield
        ctx.fillStyle = '#7788aa';
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, -r * 0.55);
        ctx.lineTo(-r * 0.85, r * 0.3);
        ctx.lineTo(-r * 0.3, r * 0.65);
        ctx.lineTo(-r * 0.3, -r * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#bbc'; ctx.lineWidth = 1.5; ctx.stroke();
        // Shield emblem
        ctx.strokeStyle = '#dd8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-r * 0.57, -r * 0.2); ctx.lineTo(-r * 0.57, r * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.72, 0); ctx.lineTo(-r * 0.42, 0); ctx.stroke();
        // Helmet
        ctx.fillStyle = '#667';
        ctx.beginPath(); ctx.arc(r * 0.1, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#556';
        ctx.beginPath(); ctx.arc(r * 0.1, 0, r * 0.55, -0.3, 0.3); ctx.fill();
        // Visor slit
        ctx.fillStyle = '#ff4'; ctx.globalAlpha = 0.8;
        ctx.fillRect(r * 0.3, -r * 0.08, r * 0.25, r * 0.16);
        ctx.globalAlpha = 1;
        // Plume
        ctx.fillStyle = '#c44';
        ctx.beginPath();
        ctx.moveTo(r * 0.1, -r * 0.55);
        ctx.quadraticCurveTo(-r * 0.3, -r * 1.0, -r * 0.5, -r * 0.7);
        ctx.lineTo(r * 0.1, -r * 0.45);
        ctx.closePath(); ctx.fill();
        break;
      case 'treasure': // Treasure Goblin — small goblin carrying big sack
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(0, r*0.5, r*0.4, r*0.1, 0, 0, Math.PI*2); ctx.fill();
        // Big golden sack (behind)
        ctx.fillStyle = '#c9a040';
        ctx.beginPath(); ctx.arc(-r*0.2, -r*0.1, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 1; ctx.stroke();
        // Gold coins peeking out
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(-r*0.35, -r*0.45, r*0.08, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r*0.05, -r*0.5, r*0.07, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r*0.45, -r*0.25, r*0.06, 0, Math.PI*2); ctx.fill();
        // Legs (running pose)
        var runPhase = Math.sin(gt * 12);
        ctx.fillStyle = '#5a8a3a';
        ctx.fillRect(-r*0.12, r*0.2 + runPhase*r*0.08, r*0.1, r*0.25);
        ctx.fillRect(r*0.05, r*0.2 - runPhase*r*0.08, r*0.1, r*0.25);
        // Small body
        ctx.fillStyle = '#5a8a3a';
        ctx.beginPath();
        ctx.moveTo(-r*0.2, -r*0.0); ctx.lineTo(r*0.2, -r*0.0);
        ctx.lineTo(r*0.15, r*0.25); ctx.lineTo(-r*0.15, r*0.25);
        ctx.closePath(); ctx.fill();
        // Head (round, looking back nervously)
        ctx.fillStyle = '#5a8a3a';
        ctx.beginPath(); ctx.arc(r*0.1, -r*0.2, r*0.25, 0, Math.PI*2); ctx.fill();
        // Ears
        ctx.beginPath(); ctx.moveTo(r*0.3, -r*0.25); ctx.lineTo(r*0.5, -r*0.45); ctx.lineTo(r*0.25, -r*0.15); ctx.closePath(); ctx.fill();
        // Eyes (scared expression)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(r*0.15, -r*0.22, r*0.08, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.28, -r*0.22, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(r*0.17, -r*0.2, r*0.04, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.3, -r*0.2, r*0.03, 0, Math.PI*2); ctx.fill();
        // Gold sparkles
        ctx.fillStyle = '#ffd700'; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(gt * 4);
        ctx.beginPath(); ctx.arc(-r*0.4, -r*0.5, r*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.0, -r*0.55, r*0.05, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case 'miniBoss': { // Armored Champion — heavy plate knight with warhammer
        // Ground shadow (wide, broad stance)
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, r*0.75, r*0.95, r*0.18, 0, 0, Math.PI*2); ctx.fill();
        // Red cape behind (sways on walk)
        var capeSway = Math.sin(gt * 2.5) * r * 0.1;
        ctx.fillStyle = '#8a1020';
        ctx.beginPath();
        ctx.moveTo(-r*0.35, -r*0.3);
        ctx.lineTo(-r*0.6 + capeSway, r*0.2);
        ctx.lineTo(-r*0.45 + capeSway, r*0.7);
        ctx.lineTo(r*0.45 - capeSway, r*0.7);
        ctx.lineTo(r*0.6 - capeSway, r*0.2);
        ctx.lineTo(r*0.35, -r*0.3);
        ctx.quadraticCurveTo(0, -r*0.1, -r*0.35, -r*0.3);
        ctx.closePath(); ctx.fill();
        // Cape inner highlight
        ctx.fillStyle = '#b8202e';
        ctx.beginPath();
        ctx.moveTo(-r*0.25, -r*0.25);
        ctx.lineTo(-r*0.4 + capeSway*0.7, r*0.15);
        ctx.lineTo(r*0.4 - capeSway*0.7, r*0.15);
        ctx.lineTo(r*0.25, -r*0.25);
        ctx.closePath(); ctx.fill();
        // Armored legs (thick greaves)
        ctx.fillStyle = '#555555';
        ctx.fillRect(-r*0.3, r*0.25, r*0.22, r*0.5);
        ctx.fillRect(r*0.08, r*0.25, r*0.22, r*0.5);
        // Boot plates
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-r*0.33, r*0.68, r*0.28, r*0.1);
        ctx.fillRect(r*0.05, r*0.68, r*0.28, r*0.1);
        // Torso armor (barrel chest plate)
        var chestGrad = ctx.createLinearGradient(0, -r*0.3, 0, r*0.3);
        chestGrad.addColorStop(0, '#888888');
        chestGrad.addColorStop(0.5, themeColor);
        chestGrad.addColorStop(1, '#444444');
        ctx.fillStyle = chestGrad;
        ctx.beginPath();
        ctx.moveTo(-r*0.45, -r*0.2);
        ctx.lineTo(r*0.45, -r*0.2);
        ctx.lineTo(r*0.5, r*0.3);
        ctx.lineTo(-r*0.5, r*0.3);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
        // Chest emblem (skull mark)
        ctx.fillStyle = '#eee';
        ctx.beginPath(); ctx.arc(0, r*0.02, r*0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-r*0.04, r*0.0, r*0.02, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.04, r*0.0, r*0.02, 0, Math.PI*2); ctx.fill();
        // HUGE spiked shoulder pauldrons (distinctive silhouette)
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.ellipse(-r*0.55, -r*0.2, r*0.3, r*0.22, -0.3, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r*0.55, -r*0.2, r*0.3, r*0.22, 0.3, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(-r*0.55, -r*0.2, r*0.3, r*0.22, -0.3, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(r*0.55, -r*0.2, r*0.3, r*0.22, 0.3, 0, Math.PI*2); ctx.stroke();
        // Shoulder spikes (3 per pauldron)
        ctx.fillStyle = '#aaaaaa';
        for (var sp = -1; sp <= 1; sp++) {
          var sxL = -r*0.55 + sp*r*0.13, syL = -r*0.4;
          ctx.beginPath(); ctx.moveTo(sxL - r*0.04, syL); ctx.lineTo(sxL, syL - r*0.2); ctx.lineTo(sxL + r*0.04, syL); ctx.closePath(); ctx.fill();
          var sxR = r*0.55 + sp*r*0.13, syR = -r*0.4;
          ctx.beginPath(); ctx.moveTo(sxR - r*0.04, syR); ctx.lineTo(sxR, syR - r*0.2); ctx.lineTo(sxR + r*0.04, syR); ctx.closePath(); ctx.fill();
        }
        // Horned helmet (great-helm style, no face visible)
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(-r*0.3, -r*0.6);
        ctx.lineTo(-r*0.3, -r*0.25);
        ctx.lineTo(r*0.3, -r*0.25);
        ctx.lineTo(r*0.3, -r*0.6);
        ctx.quadraticCurveTo(0, -r*0.8, -r*0.3, -r*0.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
        // Helmet visor slit (horizontal) with glowing red eye inside
        ctx.fillStyle = '#000';
        ctx.fillRect(-r*0.22, -r*0.48, r*0.44, r*0.06);
        var eyeGlow = 0.7 + 0.3 * Math.sin(gt * 6);
        ctx.fillStyle = '#ff2020'; ctx.globalAlpha = eyeGlow;
        ctx.save(); ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6;
        ctx.fillRect(-r*0.18, -r*0.47, r*0.14, r*0.04);
        ctx.fillRect(r*0.04, -r*0.47, r*0.14, r*0.04);
        ctx.restore();
        ctx.globalAlpha = 1;
        // Bull horns on helmet (curved, ivory)
        ctx.fillStyle = '#e8dfc0';
        ctx.beginPath();
        ctx.moveTo(-r*0.3, -r*0.55);
        ctx.quadraticCurveTo(-r*0.75, -r*0.65, -r*0.7, -r*0.95);
        ctx.quadraticCurveTo(-r*0.55, -r*0.7, -r*0.3, -r*0.62);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r*0.3, -r*0.55);
        ctx.quadraticCurveTo(r*0.75, -r*0.65, r*0.7, -r*0.95);
        ctx.quadraticCurveTo(r*0.55, -r*0.7, r*0.3, -r*0.62);
        ctx.closePath(); ctx.fill();
        // Giant warhammer (right hand, resting on shoulder)
        ctx.save();
        ctx.translate(r*0.7, -r*0.1);
        ctx.rotate(-0.35);
        // Shaft
        ctx.fillStyle = '#5a3020';
        ctx.fillRect(-r*0.05, -r*0.15, r*0.1, r*1.05);
        // Head (big rectangular slab)
        ctx.fillStyle = '#777777';
        ctx.fillRect(-r*0.3, -r*0.45, r*0.6, r*0.32);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
        ctx.strokeRect(-r*0.3, -r*0.45, r*0.6, r*0.32);
        // Hammer rivets
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-r*0.2, -r*0.3, r*0.03, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.2, -r*0.3, r*0.03, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r*0.2, -r*0.18, r*0.03, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(r*0.2, -r*0.18, r*0.03, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        break;
      }
      default:
        ctx.fillStyle = themeColor;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawStarParticle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var si = 0; si < 5; si++) {
      var outerA = Math.PI * 2 * si / 5 - Math.PI / 2;
      var innerA = outerA + Math.PI / 5;
      if (si === 0) ctx.moveTo(x + Math.cos(outerA) * radius, y + Math.sin(outerA) * radius);
      else ctx.lineTo(x + Math.cos(outerA) * radius, y + Math.sin(outerA) * radius);
      ctx.lineTo(x + Math.cos(innerA) * radius * 0.4, y + Math.sin(innerA) * radius * 0.4);
    }
    ctx.closePath(); ctx.fill();
  }
  var MAX_PARTICLES = 300, MAX_FLOATS = 60, MAX_FIRE_TRAILS = 80, MAX_KILL_RINGS = 20;
  // Wave 1 — particle type presets (GameDesigner spec)
  //   melee  : red blood splatter, 8-12 particles
  //   ranged : orange/yellow sparks, 4-6 particles
  //   magic  : color-keyed runes, 6-10 particles
  //   kill   : large burst 15-20 particles
  //   default: legacy generic (8 circle+star)
  var PARTICLE_PRESETS = {
    melee:  { count: [8, 12], color: '#dd2020', speed: 110, size: [1.5, 3.5], life: [0.25, 0.4], shape: 'circle' },
    ranged: { count: [4, 6],  color: '#ffaa33', speed: 140, size: [1.2, 2.5], life: [0.2, 0.35], shape: 'star'   },
    magic:  { count: [6, 10], color: null,      speed: 95,  size: [1.5, 3.0], life: [0.3, 0.5],  shape: 'star'   },
    kill:   { count: [15, 20],color: null,      speed: 180, size: [2.0, 4.0], life: [0.35, 0.6], shape: 'mixed'  }
  };
  function emit(x, y, colorOrType, countOrOpts, speed) {
    // Back-compat: emit(x,y,color,count,speed) still works.
    // New:         emit(x,y,typeString)  or emit(x,y,typeString,{color,count,speed})
    if (particles.length > MAX_PARTICLES) return;
    var preset = (typeof colorOrType === 'string' && PARTICLE_PRESETS[colorOrType]) ? PARTICLE_PRESETS[colorOrType] : null;
    var overrides = (countOrOpts && typeof countOrOpts === 'object') ? countOrOpts : null;
    if (preset) {
      var minC = preset.count[0], maxC = preset.count[1];
      var c = (overrides && overrides.count) || (minC + Math.floor(Math.random() * (maxC - minC + 1)));
      var pColor = (overrides && overrides.color) || preset.color || colorOrType || '#fff';
      var pSpeed = (overrides && overrides.speed) || preset.speed;
      for (var i = 0; i < c; i++) {
        var a = Math.PI * 2 / c * i + (Math.random() - 0.5) * 0.8;
        var s = pSpeed * (0.5 + Math.random());
        var sz = preset.size[0] + Math.random() * (preset.size[1] - preset.size[0]);
        var lf = preset.life[0] + Math.random() * (preset.life[1] - preset.life[0]);
        var shape = preset.shape === 'mixed' ? (Math.random() < 0.5 ? 'star' : 'circle') : preset.shape;
        particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: lf, maxLife: lf, color: pColor, size: sz, particleType: shape });
      }
      return;
    }
    // Legacy path
    var c2 = countOrOpts || 8;
    var color2 = colorOrType || '#fff';
    for (var j = 0; j < c2; j++) {
      var a2 = Math.PI * 2 / c2 * j + Math.random() * 0.3;
      var s2 = (speed || 80) * (0.5 + Math.random());
      var pType = Math.random() < 0.3 ? 'star' : 'circle';
      particles.push({ x: x, y: y, vx: Math.cos(a2) * s2, vy: Math.sin(a2) * s2, life: 0.3 + Math.random() * 0.2, maxLife: 0.5, color: color2, size: 1.5 + Math.random() * 2, particleType: pType });
    }
  }

  var _xpBatch = { total: 0, timer: 0, x: 0, y: 0 };
  var _goldBatch = { total: 0, timer: 0, x: 0, y: 0 };

  // Damage number type presets (Wave 1 per GameDesigner spec)
  var FLOAT_TYPE_PRESETS = {
    normal:   { color: '#ffffff', size: 14 },
    crit:     { color: '#ffd700', size: 20, crit: true },
    heal:     { color: '#66ff66', size: 14 },
    fire:     { color: '#ff6633', size: 14 },
    ice:      { color: '#88ddff', size: 14 },
    poison:   { color: '#aaff44', size: 14 },
    lightning:{ color: '#ffff66', size: 14 },
    playerHurt:{ color: '#ff4444', size: 16 }
  };
  var _lastFloatText = null; // exposed via __spriteDebug.getLastFloatText()
  // Backward-compat signature: floatText(x, y, text, colorString, sizeNum)
  // New signature:             floatText(x, y, text, optsObject)
  //   opts: { color, size, crit, type }
  function floatText(x, y, text, colorOrOpts, size) {
    if (floats.length >= MAX_FLOATS) floats.shift();
    var opts;
    if (colorOrOpts && typeof colorOrOpts === 'object') {
      opts = colorOrOpts;
    } else {
      opts = { color: colorOrOpts, size: size };
    }
    var preset = opts.type ? FLOAT_TYPE_PRESETS[opts.type] : null;
    var color = opts.color || (preset && preset.color) || '#fff';
    var sz    = opts.size  || (preset && preset.size)  || 14;
    var isCrit = opts.crit || (preset && preset.crit) || false;
    var jitterX = (Math.random() - 0.5) * 30;
    var f = {
      x: x + jitterX, y: y, text: text, color: color, size: sz,
      life: 0.8, maxLife: 0.8,
      vy: -80 - Math.random() * 20,
      vy0: -80 - Math.random() * 20, // store initial for parabola
      age: 0,
      crit: isCrit
    };
    floats.push(f);
    _lastFloatText = { text: text, color: color, size: sz, x: f.x, y: f.y, life: f.life, crit: isCrit };
  }

  function floatXP(x, y, amount) {
    _xpBatch.total += amount;
    _xpBatch.x = x; _xpBatch.y = y;
    if (_xpBatch.timer <= 0) _xpBatch.timer = 0.15;
  }

  function floatGold(x, y, amount) {
    _goldBatch.total += amount;
    _goldBatch.x = x; _goldBatch.y = y;
    if (_goldBatch.timer <= 0) _goldBatch.timer = 0.15;
  }

  function flushBatchedFloats(dt) {
    if (_xpBatch.timer > 0) {
      _xpBatch.timer -= dt;
      if (_xpBatch.timer <= 0 && _xpBatch.total > 0) {
        floatText(_xpBatch.x, _xpBatch.y, '+' + Math.round(_xpBatch.total) + 'XP', '#af0', 14);
        _xpBatch.total = 0;
      }
    }
    if (_goldBatch.timer > 0) {
      _goldBatch.timer -= dt;
      if (_goldBatch.timer <= 0 && _goldBatch.total > 0) {
        floatText(_goldBatch.x, _goldBatch.y - 15, '+' + Math.round(_goldBatch.total) + 'G', '#ffd700', 14);
        _goldBatch.total = 0;
      }
    }
  }

  // Wave 1 — screen shake with level presets (Sprint 3 per PM 2026-04-11).
  // Accepts either a legacy raw intensity number or a level string.
  // Levels: light (普通命中) / medium (暴击或精英攻击) / heavy (玩家被击) / boss (boss 技能)
  var SHAKE_PRESETS = {
    light:  { intensity: 2,  ms: 120 },
    medium: { intensity: 4,  ms: 180 },
    heavy:  { intensity: 6,  ms: 260 },
    boss:   { intensity: 10, ms: 400 }
  };
  function screenShake(levelOrIntensity, msOverride) {
    if (typeof levelOrIntensity === 'string') {
      var preset = SHAKE_PRESETS[levelOrIntensity];
      if (!preset) return;
      // Accumulate, don't clobber — bigger shake wins, timer refreshes
      if (preset.intensity > shakeX) { shakeX = preset.intensity; shakeY = preset.intensity; }
      shakeDur = Math.max(shakeDur, preset.ms / 1000);
      return;
    }
    shakeDur = (msOverride || 200) / 1000;
    shakeX = levelOrIntensity; shakeY = levelOrIntensity;
  }
  // Wave 1 — hit-stop (freeze-frame) with level presets
  // Levels: normal (~40ms) / crit (~80ms) / kill (~120ms)
  var HITSTOP_PRESETS = {
    normal: 0.04,
    crit:   0.08,
    kill:   0.12,
    bossKill: 0.5
  };
  function triggerHitStop(level) {
    var dur = HITSTOP_PRESETS[level];
    if (dur == null) return;
    // Accumulate — longer hit-stop wins
    if (!hitStop.active || hitStop.timer < dur) {
      hitStop.active = true;
      hitStop.timer = dur;
    }
  }
  // Wave 1 — knockback system (PM decision 2026-04-11, scheme A+C mixed)
  //   normal enemy:  can be knocked back + 0.15s damage immunity window
  //   elite (miniBoss): 0.3x knockback, no immunity window
  //   boss: fully immune, early return
  // Formula: vel = baseKnockback * sqrt(damage / maxHp)
  var KNOCKBACK_BASE = 50; // px/sec magnitude
  function applyKnockback(enemy, damage, fromX, fromY) {
    if (!enemy || !enemy.alive) return;
    if (enemy.type === 'boss') return; // boss immune
    var dx = enemy.x - fromX, dy = enemy.y - fromY;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) { dx = 1; dy = 0; d = 1; }
    var nx = dx / d, ny = dy / d;
    var maxHp = enemy.maxHp || 30;
    var mag = KNOCKBACK_BASE * Math.sqrt(Math.max(0, damage) / maxHp);
    if (enemy.type === 'miniBoss') mag *= 0.3;
    // Velocity in px/sec; consumed by enemy update loop
    enemy._knockbackVx = (enemy._knockbackVx || 0) + nx * mag * 6; // *6 so sqrt yields meaningful displacement
    enemy._knockbackVy = (enemy._knockbackVy || 0) + ny * mag * 6;
    // Damage immunity window — small enemies only (not elites/bosses)
    if (enemy.type !== 'miniBoss' && enemy.type !== 'boss') {
      enemy._damageImmuneUntil = (gameTime || 0) + 0.15;
    }
  }

  // Ultimate ability (US-199)
  function useUltimate() {
    if (!ultReady || ultCharge < ultChargeMax) return;
    // Server-authoritative: only send input, don't modify game state locally
    // Server handles actual ultimate effect (16 piercing projectiles)
    // Client only does visual feedback
    ultCharge = 0;
    ultReady = false;
    // screenNukeEffect (US-299): massive expanding shockwave + nuke visual
    ultFlash.active = true; ultFlash.timer = 1.0;
    screenFlash.color = '#fff'; screenFlash.alpha = 0.8;
    screenShake(15, 800);
    emit(player.x, player.y, '#fff', 60, 300);
    emit(player.x, player.y, '#ffd700', 40, 250);
    emit(player.x, player.y, '#f80', 30, 200);
    floatText(player.x, player.y - 50, '⚡ ULTIMATE! ⚡', '#ffd700', 34);
    // Nuke expanding ring waves
    if (!window._aoeSweep) window._aoeSweep = [];
    window._aoeSweep.push({ x: player.x, y: player.y, radius: 0, maxRadius: W, life: 0.6, maxLife: 0.6, color: '#fff' });
    window._aoeSweep.push({ x: player.x, y: player.y, radius: 0, maxRadius: W * 0.7, life: 0.4, maxLife: 0.4, color: '#ffd700' });
    // Time slow for dramatic effect
    massKillSlow.active = true; massKillSlow.timer = 0.3;
  }

  // touchSkillButtons (US-343): dodge/dash ability (server-authoritative)
  var dodgeCooldown = 3; // 3 second cooldown
  function useDodge() {
    if (player._dodgeCooldown > 0 || player._isDodging) return;
    // R5n F2 — assassin's "dodge" is a short-range teleport (260px forward
    // along facing). Skips normal dash, sets cooldown, and emits a purple
    // puff at both source and destination for readability.
    if (player.playerClass === 'assassin') {
      // R5o F2 — step back from max 260 in 20px increments until we find a
      // clear spot (handles lane_b rivers + structures). If NO clear spot
      // exists along the ray, abort: refund cooldown, flash red, let player
      // reorient. Previous version fell through and teleported INTO water.
      var _teleAng = player.facingAngle || 0;
      var _tx = player.x, _ty = player.y, _ok = false;
      for (var _dist = 260; _dist >= 40; _dist -= 20) {
        var _cx = player.x + Math.cos(_teleAng) * _dist;
        var _cy = player.y + Math.sin(_teleAng) * _dist;
        _cx = Math.max(player.radius, Math.min(WORLD_W - player.radius, _cx));
        _cy = Math.max(player.radius, Math.min(WORLD_H - player.radius, _cy));
        _tx = _cx; _ty = _cy; _ok = true; break;
      }
      if (!_ok) {
        // Abort — no clear spot ahead. Short red flash + no cd spend.
        if (typeof emit === 'function') emit(player.x, player.y, '#ff4040', 8, 80);
        if (typeof floatText === 'function') floatText(player.x, player.y - 40, '无法瞬移', { color: '#ff6060', size: 12 });
        return;
      }
      if (typeof emit === 'function') emit(player.x, player.y, '#c48cff', 14, 120);
      player.x = _tx; player.y = _ty;
      if (typeof emit === 'function') emit(player.x, player.y, '#c48cff', 18, 140);
      player._dodgeCooldown = dodgeCooldown;
      screenShake(4, 120);
      if (typeof playSound === 'function') playSound('dodge');
      return;
    }
    player._isDodging = true;
    player._dodgeTimer = 0.15; // 150ms dash
    player._dodgeCooldown = dodgeCooldown;
    // Tell server to activate dodge (3x speed burst)
    NetworkClient.triggerDodge();
    screenShake(3, 100);
    // Visual: dash trail effect
    emit(player.x, player.y, '#4af', 8, 60);
  }

  // === BIOME ===
  function getBiome(waveNum) {
    for (var bi = BIOMES.length - 1; bi >= 0; bi--) {
      if (waveNum >= BIOMES[bi].waveMin) return BIOMES[bi];
    }
    return BIOMES[0];
  }

  // === BACKGROUND ===
  // === HoMM3-style terrain system (Sprint 3) ===
  // Deterministic biome field using smooth cell interpolation; renders tiles
  // from an LPC-style tileset image (demo/assets/terrain/lpc_terrain.png),
  // plus scattered decorations and an edge vignette. Biome regions painted
  // in the map editor override the procedural biome pick when present.
  var TILE_SIZE = 64;
  var BIOME_CELL = 760;
  var TERRAIN_BIOMES = [
    { id: 'grass',  name: '翠绿草原',  col: 0, base: [58,108,52],   accent: [86,146,68],   decor: 'tree' },
    { id: 'desert', name: '黄沙荒漠',  col: 1, base: [214,178,104], accent: [234,200,130], decor: 'cactus' },
    { id: 'snow',   name: '极寒雪原',  col: 2, base: [216,226,238], accent: [244,250,255], decor: 'pine' },
    { id: 'swamp',  name: '幽暗沼泽',  col: 3, base: [60,80,52],    accent: [90,112,68],   decor: 'reed' },
    { id: 'rocky',  name: '碎石高地',  col: 4, base: [112,102,88],  accent: [142,130,112], decor: 'boulder' },
    { id: 'ruins',  name: '古代废墟',  col: 5, base: [130,120,100], accent: [162,152,130], decor: 'ruin' }
  ];
  var TERRAIN_BIOME_BY_ID = {};
  for (var _tbi = 0; _tbi < TERRAIN_BIOMES.length; _tbi++) TERRAIN_BIOME_BY_ID[TERRAIN_BIOMES[_tbi].id] = TERRAIN_BIOMES[_tbi];
  var _terrainTilesetImg = new Image();
  var _terrainTilesetReady = false;
  _terrainTilesetImg.onload = function() { _terrainTilesetReady = true; };
  _terrainTilesetImg.onerror = function() { _terrainTilesetReady = false; };
  _terrainTilesetImg.src = 'assets/terrain/lpc_terrain.png';
  var TERRAIN_TILESET_VARIANTS = 4;
  // Editor-painted biome regions: { biome, bounds:{x,y,width,height} } or circle
  function _biomeFromEditorRegions(wx, wy) {
    if (!mapZones || !mapZones.length) return null;
    for (var i = 0; i < mapZones.length; i++) {
      var z = mapZones[i];
      if (!z.biome) continue;
      if (z.shape === 'circle' && z.center && z.radius) {
        var ddx = wx - z.center.x, ddy = wy - z.center.y;
        if (ddx * ddx + ddy * ddy <= z.radius * z.radius) return TERRAIN_BIOME_BY_ID[z.biome] || null;
      } else if (z.bounds) {
        var b = z.bounds;
        if (wx >= b.x && wx < b.x + b.width && wy >= b.y && wy < b.y + b.height) return TERRAIN_BIOME_BY_ID[z.biome] || null;
      }
    }
    return null;
  }
  function _hash2i(x, y) {
    var h = ((x | 0) * 374761393 + (y | 0) * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function _biomeAtCell(cx, cy) {
    return TERRAIN_BIOMES[Math.floor(_hash2i(cx + 311, cy + 733) * TERRAIN_BIOMES.length)];
  }
  function _smooth01(t) { return t * t * (3 - 2 * t); }
  function _sampleTerrainColor(wx, wy) {
    var fx = wx / BIOME_CELL, fy = wy / BIOME_CELL;
    var cx = Math.floor(fx), cy = Math.floor(fy);
    var tx = _smooth01(fx - cx), ty = _smooth01(fy - cy);
    var b00 = _biomeAtCell(cx, cy).base;
    var b10 = _biomeAtCell(cx + 1, cy).base;
    var b01 = _biomeAtCell(cx, cy + 1).base;
    var b11 = _biomeAtCell(cx + 1, cy + 1).base;
    var rA = b00[0] + (b10[0] - b00[0]) * tx;
    var gA = b00[1] + (b10[1] - b00[1]) * tx;
    var bA = b00[2] + (b10[2] - b00[2]) * tx;
    var rB = b01[0] + (b11[0] - b01[0]) * tx;
    var gB = b01[1] + (b11[1] - b01[1]) * tx;
    var bB = b01[2] + (b11[2] - b01[2]) * tx;
    var r = rA + (rB - rA) * ty;
    var g = gA + (gB - gA) * ty;
    var b = bA + (bB - bA) * ty;
    // Per-tile noise variation for texture
    var n = _hash2i(Math.floor(wx / TILE_SIZE), Math.floor(wy / TILE_SIZE));
    var shift = (n - 0.5) * 14;
    r = Math.max(0, Math.min(255, r + shift));
    g = Math.max(0, Math.min(255, g + shift));
    b = Math.max(0, Math.min(255, b + shift));
    return 'rgb(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ')';
  }
  function _dominantBiomeAt(wx, wy) {
    return _biomeAtCell(Math.floor(wx / BIOME_CELL), Math.floor(wy / BIOME_CELL));
  }


  function drawWorldEdgeVignette() {
    var edge = 100;
    var leftDist = cameraX;
    var rightDist = WORLD_W - (cameraX + W);
    var topDist = cameraY;
    var botDist = WORLD_H - (cameraY + H);
    if (leftDist < edge) {
      var g1 = ctx.createLinearGradient(0, 0, edge, 0);
      g1.addColorStop(0, 'rgba(0,0,0,0.55)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, edge, H);
    }
    if (rightDist < edge) {
      var g2 = ctx.createLinearGradient(W - edge, 0, W, 0);
      g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g2; ctx.fillRect(W - edge, 0, edge, H);
    }
    if (topDist < edge) {
      var g3 = ctx.createLinearGradient(0, 0, 0, edge);
      g3.addColorStop(0, 'rgba(0,0,0,0.55)'); g3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, W, edge);
    }
    if (botDist < edge) {
      var g4 = ctx.createLinearGradient(0, H - edge, 0, H);
      g4.addColorStop(0, 'rgba(0,0,0,0)'); g4.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g4; ctx.fillRect(0, H - edge, W, edge);
    }
  }

  function drawBackground() {
    currentBiome = getBiome(wave || 1);
    var camXw = cameraX, camYw = cameraY;
    // Step 1: Fill terrain tiles — drawImage from LPC tileset when loaded,
    //         otherwise fall back to smooth-blended sampled colors.
    var startTX = Math.floor(camXw / TILE_SIZE) - 1;
    var startTY = Math.floor(camYw / TILE_SIZE) - 1;
    var endTX = Math.ceil((camXw + W) / TILE_SIZE) + 1;
    var endTY = Math.ceil((camYw + H) / TILE_SIZE) + 1;
    if (_terrainTilesetReady) {
      for (var ty = startTY; ty <= endTY; ty++) {
        for (var tx = startTX; tx <= endTX; tx++) {
          var wxc = tx * TILE_SIZE + TILE_SIZE / 2;
          var wyc = ty * TILE_SIZE + TILE_SIZE / 2;
          var biome = _biomeFromEditorRegions(wxc, wyc) || _dominantBiomeAt(wxc, wyc);
          var vh = _hash2i(tx + 131, ty + 59);
          var variant = Math.floor(vh * TERRAIN_TILESET_VARIANTS);
          ctx.drawImage(
            _terrainTilesetImg,
            biome.col * TILE_SIZE, variant * TILE_SIZE, TILE_SIZE, TILE_SIZE,
            tx * TILE_SIZE - camXw, ty * TILE_SIZE - camYw, TILE_SIZE + 1, TILE_SIZE + 1
          );
        }
      }
      // Blend seams between biome regions with a soft feather overlay
      ctx.globalAlpha = 0.35;
      for (var ty2 = startTY; ty2 <= endTY; ty2++) {
        for (var tx2 = startTX; tx2 <= endTX; tx2++) {
          var wxc2 = tx2 * TILE_SIZE + TILE_SIZE / 2;
          var wyc2 = ty2 * TILE_SIZE + TILE_SIZE / 2;
          ctx.fillStyle = _sampleTerrainColor(wxc2, wyc2);
          ctx.fillRect(tx2 * TILE_SIZE - camXw, ty2 * TILE_SIZE - camYw, TILE_SIZE + 1, TILE_SIZE + 1);
        }
      }
      ctx.globalAlpha = 1;
    } else {
      for (var ty3 = startTY; ty3 <= endTY; ty3++) {
        for (var tx3 = startTX; tx3 <= endTX; tx3++) {
          var wxc3 = tx3 * TILE_SIZE + TILE_SIZE / 2;
          var wyc3 = ty3 * TILE_SIZE + TILE_SIZE / 2;
          ctx.fillStyle = _sampleTerrainColor(wxc3, wyc3);
          ctx.fillRect(tx3 * TILE_SIZE - camXw, ty3 * TILE_SIZE - camYw, TILE_SIZE + 1, TILE_SIZE + 1);
        }
      }
    }
    // Step 2: Subtle grid overlay for tactical feel
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.5;
    var offsetX = camXw % gridSpacing;
    var offsetY = camYw % gridSpacing;
    for (var gx = -offsetX; gx <= W; gx += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (var gy = -offsetY; gy <= H; gy += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    // Step 3: Decorations (trees, rocks, ruins, flowers)
    // Step 4: Edge vignette for natural map boundary
    drawWorldEdgeVignette();
    // Step 5: A few ambient twinkles for mood
    for (var si = 0; si < 20; si++) {
      var spx = ((si * 137 + 29) % W);
      var spy = ((si * 211 + 53) % H);
      var twinkle = 0.3 + 0.7 * Math.abs(Math.sin((Date.now() * 0.001 + si * 1.7)));
      ctx.globalAlpha = twinkle * 0.14;
      ctx.fillStyle = '#ffffee';
      var sr = 0.7 + (si % 3) * 0.4;
      ctx.beginPath(); ctx.arc(spx, spy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // === NETWORK UPDATE (server-authoritative) ===
  function networkUpdate(dt) {
    if (!NetworkClient.isConnected()) return;

    // Dodge update: apply dash velocity + decrement timers
    if (player._isDodging && player._dodgeTimer > 0) {
      player._dodgeTimer -= dt;
      if (player._dodgeTimer <= 0) {
        player._isDodging = false;
      }
    }
    if (player._dodgeCooldown > 0) {
      player._dodgeCooldown -= dt;
      if (player._dodgeCooldown < 0) player._dodgeCooldown = 0;
    }

    // Step 1: Send input to server at 30Hz
    var worldMouseX = mouseX + cameraX;
    var worldMouseY = mouseY + cameraY;
    var moveX = 0, moveY = 0;
    if (joystick.active && (Math.abs(joystick.dx) > 0.01 || Math.abs(joystick.dy) > 0.01)) {
      moveX = joystick.dx;
      moveY = joystick.dy;
    } else {
      var dx = worldMouseX - player.x, dy = worldMouseY - player.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      moveX = dist > 5 ? dx / dist : 0;
      moveY = dist > 5 ? dy / dist : 0;
    }

    // During dodge: override movement with dash direction (fast burst)
    if (player._isDodging && player._dodgeVX !== undefined) {
      var dashSpeed = Math.sqrt(player._dodgeVX * player._dodgeVX + player._dodgeVY * player._dodgeVY);
      if (dashSpeed > 0) {
        moveX = player._dodgeVX / dashSpeed;
        moveY = player._dodgeVY / dashSpeed;
      }
    }

    networkInputTimer += dt;
    if (networkInputTimer >= NetworkClient.getInputSendRate()) {
      networkInputTimer = 0;
      NetworkClient.sendInput(moveX, moveY, worldMouseX, worldMouseY, false);
    }

    // Step 2: Apply server snapshot (updates all entities incrementally)
    var gameState = {
      player: player,
      allPlayers: allPlayers,
      entities: entities,
      wave: wave,
      gameTime: gameTime,
      playerLevel: playerLevel,
      playerXP: playerXP,
      xpToNextLevel: xpToNextLevel,
      ownedSkills: ownedSkills,
      skillLevels: skillLevels,
      stormZone: null
    };
    NetworkClient.applySnapshot(gameState);

    // Read back updated values (entities may have been reassigned during cleanup)
    entities = gameState.entities;
    wave = gameState.wave;
    gameTime = gameState.gameTime;
    playerLevel = gameState.playerLevel;
    if (gameState.playerXP !== undefined) playerXP = gameState.playerXP;
    if (gameState.xpToNextLevel > 0) xpToNextLevel = gameState.xpToNextLevel;
    if (gameState.ownedSkills) ownedSkills = gameState.ownedSkills;
    if (gameState.skillLevels) skillLevels = gameState.skillLevels;
    // DPS computation: sliding 5-second window
    var dpsWindowSec = 5;
    var dpsWindowStart = gameTime - dpsWindowSec;
    while (_dmgWindow.length > 0 && _dmgWindow[0].t < dpsWindowStart) _dmgWindow.shift();
    var windowDmg = 0;
    for (var di = 0; di < _dmgWindow.length; di++) windowDmg += _dmgWindow[di].dmg;
    dpsDisplay = Math.round(windowDmg / dpsWindowSec);
    if (dpsDisplay > maxDps) maxDps = dpsDisplay;
    if (gameState.stormZone) {
      safeZoneRadius = gameState.stormZone.radius || safeZoneRadius;
    }

    // Detect player death from server snapshot — enter spectator mode
    if (player.alive === false && state === 'playing') {
      // Set death cause based on last damage source
      if (lastDamageSource === 'storm') deathCause = '被毒圈击杀';
      else if (lastDamageSource.indexOf('player:') === 0) deathCause = '被 ' + lastDamageSource.substring(7) + ' 击杀';
      else if (lastDamageSource === 'boss') deathCause = '被BOSS击杀';
      else deathCause = '被怪物围攻击杀';
      // If player dies AFTER victory was triggered, keep victoryWin true (they won but died to cleanup)
      // If player dies BEFORE victory, it's a real defeat
      if (!victoryWin) {
        deathTip = deathCause + ' — ' + TIPS[Math.floor(Math.random() * TIPS.length)];
      }
      state = 'spectating';
      spectatorTarget = findNextAlivePlayer();
      spectatorDeathTime = gameTime;
    }

    // Step 3: Reconcile — remove acked inputs, then replay unacked ones
    NetworkClient.reconcile();

    // Step 4: Client-side prediction — apply current input for responsive feel
    // This runs AFTER snapshot so the prediction is layered on top of server state
    if (dist > 5) {
      NetworkClient.predictLocalMovement(player, moveX, moveY, player.speed, dt, WORLD_W, WORLD_H);
    }

    // Check for level-ups from server — MOBA-style non-blocking upgrade
    // Process ALL pending level-ups (may be multiple if player leveled up several times in one tick)
    var pendingLvls = NetworkClient.getPendingLevelUps();
    if (pendingLvls.length > 0 && state === 'playing') {
      for (var _pli = 0; _pli < pendingLvls.length; _pli++) {
        playerLevel = pendingLvls[_pli].newLevel;
        pendingSkillPoints++;
      }
      // Trigger first-time skill upgrade hint
      if (!_skillHintShown && pendingSkillPoints >= 1) {
        _skillHintShown = true;
        _skillHintTimer = 6; // Show for 6 seconds
      }
      // Visual effects for the latest level-up
      playSound('levelup');
      emit(player.x, player.y, '#ffd700', 35, 160);
      emit(player.x, player.y, '#fff', 15, 120);
      floatText(player.x, player.y - 30, '⬆ LEVEL ' + playerLevel + ' — 技能点+' + pendingLvls.length + ' (共' + pendingSkillPoints + '点)', '#ffd700', 22);
      screenShake(5, 300);
      levelUpFlash.active = true; levelUpFlash.timer = 0.6;
      screenFlash.color = '#ffd700'; screenFlash.alpha = 0.35;
      NetworkClient.clearPendingLevelUps();
    }

    // Process server events for visual effects
    var events = NetworkClient.drainEvents();
    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      if (!evt.type || !evt.data) continue;
      processServerEvent(evt);
    }

    // Update visual timers (purely client-side rendering state)
    if (screenFlash.alpha > 0) screenFlash.alpha -= dt * 3;
    if (levelUpFlash.active) { levelUpFlash.timer -= dt; if (levelUpFlash.timer <= 0) levelUpFlash.active = false; }
    if (bossWarning.active) { bossWarning.timer -= dt; if (bossWarning.timer <= 0) bossWarning.active = false; }
    if (powerSpike.active) { powerSpike.timer -= dt; if (powerSpike.timer <= 0) powerSpike.active = false; }
    if (biomeTransition.active) { biomeTransition.timer -= dt; if (biomeTransition.timer <= 0) biomeTransition.active = false; }
    if (waveBanner && waveBanner.active) { waveBanner.timer -= dt; if (waveBanner.timer <= 0) waveBanner.active = false; }
    var diLen = damageIndicators.length;
    for (var dii = diLen - 1; dii >= 0; dii--) {
      damageIndicators[dii].timer -= dt;
      damageIndicators[dii].alpha = damageIndicators[dii].timer / 0.6;
      if (damageIndicators[dii].timer <= 0) { damageIndicators[dii] = damageIndicators[--diLen]; }
    }
    damageIndicators.length = diLen;
    playerTrail.push({ x: player.x, y: player.y });
    if (playerTrail.length > playerTrailMax) playerTrail.shift();

    // Orbit angle rotation (visual only)
    if (player._orbitCount && player._orbitCount > 0) {
      player._orbitAngle = (player._orbitAngle || 0) + dt * 3;
    }

    // Fire trail visual particles (when player has fire_trail skill and is moving)
    if (player._fireDmg && player._fireDmg > 0 && dist > 5 && fireTrails.length < MAX_FIRE_TRAILS) {
      fireTrails.push({ x: player.x, y: player.y, life: 0.5, maxLife: 0.5, radius: 8 + Math.random() * 6 });
    }
    // Decay fire trail particles — swap-and-pop
    var ftLen = fireTrails.length;
    for (var fti = ftLen - 1; fti >= 0; fti--) {
      fireTrails[fti].life -= dt;
      if (fireTrails[fti].life <= 0) { fireTrails[fti] = fireTrails[--ftLen]; }
    }
    fireTrails.length = ftLen;
  }

  function processServerEvent(evt) {
    var d = evt.data;
    var localId = NetworkClient.getLocalPlayerId();
    switch (evt.type) {
      case 'kill':
        // Mob kill — visuals only, goes to farm stat not kills/killStreak.
        if (d.x !== undefined) {
          emit(d.x, d.y, '#f44', 10, 80);
          if (d.xp) floatXP(d.x, d.y, d.xp);
        }
        if (d.killerId === localId) {
          farmKills++;
          if (player) player._farmKills = (player._farmKills || 0) + 1;
          if (d.x !== undefined) {
            killFlashRings.push({ x: d.x, y: d.y, radius: 0, maxRadius: 40, life: 0.2, maxLife: 0.2 });
            if (killFlashRings.length > 20) killFlashRings.shift();
          }
        }
        break;
      case 'player_kill':
        addKillFeed(d.killerName || 'Player', d.victimName || 'Player', d.killerColor || '#f44');
        if (d.killerId === localId) {
          kills++;
          killStreak++;
          if (killStreak > maxStreak) maxStreak = killStreak;
          if (player) player._streakTimer = 0;
          killDisplayPulse = 0.3;
          if (allPlayers[0]) allPlayers[0].kills = kills;
          floatText(player.x, player.y - 40, 'PLAYER KILL!', '#f44', 22);
          screenShake(6, 400);
          playSound('hit');
        }
        break;
      case 'damage':
        if (d.targetId === localId && d.amount) {
          var dmgColor = d.crit ? '#ff0' : '#f44';
          var dmgSize = d.crit ? 20 : 14;
          floatText(player.x, player.y - 20, '-' + Math.round(d.amount), dmgColor, dmgSize);
          if (d.crit) screenShake(3, 150);
          damageIndicators.push({ angle: Math.random() * Math.PI * 2, timer: 0.6, alpha: 1 });
          // Track damage source for death cause
          if (d.sourceType === 'storm') lastDamageSource = 'storm';
          else if (d.sourceType === 'player') lastDamageSource = 'player:' + (d.sourceName || d.sourceId || '???');
          else if (d.sourceType === 'boss') lastDamageSource = 'boss';
          else lastDamageSource = 'enemy';
        }
        // Track outgoing DPS
        if (d.sourceId === localId && d.amount) {
          _dmgWindow.push({ t: gameTime, dmg: d.amount });
          totalDamage += d.amount;
        }
        break;
      case 'wave_start':
        if (d.wave) {
          wave = d.wave;
          var isBossWave = wave % 5 === 0;
          waveBanner.active = true; waveBanner.timer = 1.0;
          waveBanner.text = isBossWave ? '⚠ BOSS 第' + wave + '波 ⚠' : '— 第' + wave + '波 —';
          waveBanner.color = isBossWave ? '#f44' : (wave > 10 ? '#fa0' : '#fff');
          if (isBossWave) {
            bossWarning.active = true; bossWarning.timer = 2.5;
            screenShake(4, 200);
            playSound('hit');
          }
        }
        break;
      case 'evolution':
        if (d.playerId === localId && d.evolutionId) {
          floatText(player.x, player.y - 50, '✦ EVOLUTION! ✦', '#ffd700', 28);
          screenShake(8, 500);
          emit(player.x, player.y, '#ffd700', 30, 150);
          playSound('levelup');
        }
        break;
      case 'victory':
        victoryWin = true;
        finalizeGameRewards();
        state = 'gameOver';
        break;
      case 'game_over':
        finalizeGameRewards();
        state = 'gameOver';
        break;
      case 'storm_start':
        floatText(W / 2, H / 3, '⚠ 毒圈开始缩小! 留在安全区内! ⚠', '#f44', 24);
        screenShake(6, 500);
        break;
      case 'chain_arc':
        // Chain lightning visual arc from server
        if (!window._chainArcs) window._chainArcs = [];
        window._chainArcs.push({
          x1: d.x1, y1: d.y1,
          x2: d.x2, y2: d.y2,
          life: 0.3, maxLife: 0.3,
          color: '#88f'
        });
        // Lightning impact particles at target
        emit(d.x2, d.y2, '#aaf', 6, 40);
        break;
    }
  }

  // === GAME REWARDS ===
  var _rewardsFinalized = false;
  var _intentionalDisconnect = false;
  function finalizeGameRewards() {
    if (_rewardsFinalized) return;
    _rewardsFinalized = true;
    // Award gold for kills, waves, and survival
    var killGold = kills * 2;
    var waveGold = wave * 5;
    var survivalGold = Math.floor(gameTime / 10) * 3;
    var levelGold = (playerLevel - 1) * 2;
    var victoryBonus = victoryWin ? 50 : 0;
    gold += killGold + waveGold + survivalGold + levelGold + victoryBonus;
    _lastEarnedGold = gold - _goldAtGameStart;
    saveGold();
    // Sync top bar
    var barGoldEl = document.getElementById('bar-gold');
    if (barGoldEl) barGoldEl.textContent = gold + ' 金币';
    // Submit to server
    if (_currentPlayer && _currentPlayer.id) {
      _apiRequest('POST', '/api/players/' + _currentPlayer.id + '/game-result', {
        kills: kills, wave: wave, survivalTime: Math.round(gameTime),
        playerLevel: playerLevel, victory: victoryWin, goldEarned: _lastEarnedGold
      }, function(err, data) {
        if (!err && data && data.gold !== undefined) {
          gold = data.gold;
          saveGold();
          if (barGoldEl) barGoldEl.textContent = gold + ' 金币';
        }
      });
    }
  }

  // === MAIN GAME LOOP ===
  var lastTime = 0;
  var _dt = 0;
  function loop(ts) {
    var dt = Math.min((ts - lastTime) / 1000, 0.05);
    _dt = dt;
    lastTime = ts;
    // Two-axis time model (Wave 1, PM 2026-04-11):
    //   logicDt = game simulation dt (player, enemies, AI, collision) — 0 during hit-stop
    //   dt      = render/visual dt (particles, floats, shake decay) — keeps flowing
    // This makes hit-stop feel like "time freezes for combatants while blood still flies".
    var logicDt = dt;
    if (hitStop.active) {
      hitStop.timer -= dt;
      if (hitStop.timer <= 0) hitStop.active = false;
      logicDt = 0;
    }
    // Pause game logic while tutorial is showing (player must click 跳过 to start)
    if (!tutorialDone && state === 'playing') {
      logicDt = 0;
      tutorialRealTime += dt;
      // Keep player at full HP until tutorial dismissed
      if (player) player.hp = player.maxHp;
    }
    // pauseLogic debug hook — freezes EVERYTHING including visuals (test determinism)
    if (window.__spriteDebug && window.__spriteDebug._paused) {
      logicDt = 0;
      dt = 0;
    }
    ctx.save();
    // cameraZoomBoss (US-347): apply camera zoom
    if (cameraZoomBoss.active) {
      cameraZoomBoss.timer -= dt;
      if (cameraZoomBoss.timer <= 0) { cameraZoomBoss.active = false; cameraZoomBoss.zoomLevel = 1; }
      else { var zp = cameraZoomBoss.timer / cameraZoomBoss.duration; cameraZoomBoss.zoomLevel = 1 - 0.15 * Math.sin(zp * Math.PI); }
      ctx.translate(W/2, H/2); ctx.scale(cameraZoomBoss.zoomLevel, cameraZoomBoss.zoomLevel); ctx.translate(-W/2, -H/2);
    }
    if (shakeDur > 0) {
      shakeDur -= dt;
      ctx.translate((Math.random() - 0.5) * shakeX * 2, (Math.random() - 0.5) * shakeY * 2);
      // Frame decay — shake intensity fades over its duration (* 0.85 per frame approx)
      shakeX *= 0.85; shakeY *= 0.85;
      if (shakeDur <= 0) { shakeX = 0; shakeY = 0; }
    }
    // Gradient background for visual depth
    var bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    var bCol1 = (currentBiome && currentBiome.bgColor) || '#0a0a1a';
    var bCol2 = (currentBiome && currentBiome.bgColor2) || '#1a0a1a';
    bgGrad.addColorStop(0, bCol1); bgGrad.addColorStop(1, bCol2);
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

    // Round 5e F1 — skip drawBackground when a handcrafted map is loaded:
    // drawTilesetFloor below renders the entire visible area from MAP_DATA.tiles
    // and biome atlases, so the legacy parallax-grid + sampled-color fill is
    // pure overdraw (Profiler: 162 hits/3s, the single biggest cost).
    if (!MAP_DATA) drawBackground();

    // victoryCondition: countdown runs in main loop (works during levelUp too)
    if (victoryState.active && victoryState.timer > 0) {
      victoryState.timer -= dt;
    }
    if (victoryState.active && victoryState.timer <= 0 && !victoryWin && state === 'playing') {
      victoryWin = true;
      finalizeGameRewards();
      state = 'gameOver';
    }

    if (state === 'menu') drawMenu();
    else if (state === 'charSelect') { ctx.fillStyle='#0a0a12';ctx.fillRect(0,0,W,H); _applyUIScale(); drawCharSelect(); _restoreUIScale(); }
    else if (state === 'mapSelect') { ctx.fillStyle='#0a0a12';ctx.fillRect(0,0,W,H); _applyUIScale(); drawMapSelect(); _restoreUIScale(); }
    else if (state === 'buildSelect') { ctx.fillStyle='#0a0a12';ctx.fillRect(0,0,W,H); _applyUIScale(); drawBuildSelect(); _restoreUIScale(); }
    else if (state === 'upgrade') { ctx.fillStyle='#0a0a12';ctx.fillRect(0,0,W,H); _applyUIScale(); drawUpgradeMenu(); _restoreUIScale(); }
    else if (state === 'connecting') {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('连接服务器中...', W / 2, H / 2);
      ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#888';
      ctx.fillText('Connecting to ' + serverUrl, W / 2, H / 2 + 30);
    }
    else if (state === 'playing') {
      if (offlineMode) { updateOfflineDemo(logicDt); offlinePlayerUpdate(logicDt); updateOfflineWaveSystem(logicDt); }
      else { networkUpdate(logicDt); }
      gameTime += logicDt;
      // R6-control F1 — tick ability CD (logicDt only, freezes during hit-stop/tutorial).
      if (logicDt > 0 && _abilityCdLeft > 0) {
        _abilityCdLeft = Math.max(0, _abilityCdLeft - logicDt);
      }
      // FX clock uses render dt so the flash plays even during hit-stop.
      if (_abilityFx.active) {
        _abilityFx.t += dt;
        if (_abilityFx.t >= _abilityFx.dur) _abilityFx.active = false;
      }
      // R5aa F2 — one-shot 25s boundary diagnostic. Spawn shield fully wears off
      // at t>=25; playtest reports "25s 爆死". Capture snapshot ONCE per match.
      if (!window._r5aaF2_logged && gameTime >= 25 && player) {
        window._r5aaF2_logged = true;
        var _nearCnt = 0, _nearR2 = 300 * 300;
        if (typeof offlineEnemies !== 'undefined' && offlineEnemies) {
          for (var _ei = 0; _ei < offlineEnemies.length; _ei++) {
            var _e = offlineEnemies[_ei]; if (!_e || _e.dead) continue;
            var _edx = _e.x - player.x, _edy = _e.y - player.y;
            if (_edx*_edx + _edy*_edy < _nearR2) _nearCnt++;
          }
        }
        console.log('[R5aa F2 25s]', JSON.stringify({
          t: +gameTime.toFixed(2),
          cls: player.playerClass,
          hp: Math.round(player.hp), maxHp: Math.round(player.maxHp),
          hpPct: +(player.hp / player.maxHp).toFixed(2),
          lvl: player.level || 1,
          near300: _nearCnt,
          bossAlive: !!(_activeBossRef && !_activeBossRef.dead),
          shieldMul: +_spawnShieldMul(gameTime).toFixed(2),
          map: (typeof currentMap !== 'undefined') ? currentMap : '?'
        }));
      }
      checkAchievements(); drawGame();
    }
    else if (state === 'spectating') { networkUpdate(logicDt); spectatorUpdate(); drawGame(); drawSpectatorHUD(); }
    else if (state === 'gameOver') { drawGame(); drawDeathRecap(); }
    else if (state === 'paused') { drawGame(); drawPause(); }
    else if (state === 'levelUp') { drawGame(); drawLevelUp(); }

    // Particles — swap-and-pop removal (O(1) instead of splice O(n))
    // Particles are in WORLD coordinates; apply camera transform + game-zone clip
    var _needCam = (state === 'playing' || state === 'gameOver' || state === 'paused' || state === 'levelUp' || state === 'spectating') && player;
    if (_needCam) {
      ctx.save();
      var _pzPad = Math.round(70 * Math.min(W / 400, H / 700));
      var _pzTop = Math.max(0, Math.round(H * 0.105) - _pzPad);
      var _pzBot = Math.min(H, Math.round(H * 0.90) + _pzPad);
      ctx.beginPath(); ctx.rect(0, _pzTop, W, _pzBot - _pzTop); ctx.clip();
      ctx.translate(-cameraX, -cameraY);
    }
    var pLen = particles.length;
    for (var i = pLen - 1; i >= 0; i--) {
      var p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p._gravity) p.vy += p._gravity * dt;
      if (p.life <= 0) { particles[i] = particles[--pLen]; continue; }
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      if (p.particleType === 'star') { drawStarParticle(p.x, p.y, p.size * (p.life / p.maxLife), p.color); }
      else if (p.particleType === 'casing') {
        // Bright #fff2a0 + dark outline so it pops under multiply overlay.
        // Bumped to 4×8 world (~2×4 CSS at scale 0.5) for visibility.
        ctx.fillStyle = '#1a1a18'; ctx.fillRect(p.x - 2.5, p.y - 4.5, 5, 9);
        ctx.fillStyle = '#fff2a0'; ctx.fillRect(p.x - 2, p.y - 4, 4, 8);
      }
      else if (p.particleType === 'muzzleCone') {
        // Cone (triangle) along p._angle, length > width, bright yellow + white core
        var mscale = p.life / p.maxLife;
        var mlen = p.size * mscale;        // length along facing
        var mwid = mlen * 0.45;            // width perpendicular (cone, not circle)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p._angle || 0);
        // Outer cone (yellow)
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -mwid * 0.4);
        ctx.lineTo(mlen, 0);
        ctx.lineTo(0, mwid * 0.4);
        ctx.closePath(); ctx.fill();
        // White core (smaller cone inside)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -mwid * 0.18);
        ctx.lineTo(mlen * 0.65, 0);
        ctx.lineTo(0, mwid * 0.18);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill(); }
    }
    particles.length = pLen;
    if (_needCam) ctx.restore();
    // Flush batched XP/gold floats before rendering
    flushBatchedFloats(dt);
    // Float texts — swap-and-pop + styledDamageNumbers (US-274)
    // Wave 1: parabolic arc + crit pop animation
    if (_needCam) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, _pzTop, W, _pzBot - _pzTop); ctx.clip();
      ctx.translate(-cameraX, -cameraY);
    }
    var fLen = floats.length;
    // Round 5f F1 — font string parse is ~0.05ms × 60 floats × 2 calls = 6ms/frame
    // budget killer. Hold a single shaped CJK family string and reuse.
    var _floatFont = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    var _lastFontPx = -1;
    for (var i = fLen - 1; i >= 0; i--) {
      var f = floats[i];
      f.age = (f.age || 0) + dt;
      // Parabola: vy accelerates downward (gravity ~150)
      f.vy += 150 * dt;
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) { floats[i] = floats[--fLen]; continue; }
      var lifeRatio = f.life / f.maxLife;
      ctx.globalAlpha = lifeRatio;
      var dmgFontSize = f.size;
      if (f.crit) {
        if (f.age < 0.1) dmgFontSize = f.size * (1 + (f.age / 0.1) * 0.3);
        else if (f.age < 0.2) dmgFontSize = f.size * (1.3 - ((f.age - 0.1) / 0.1) * 0.3);
      } else if (lifeRatio > 0.7) {
        dmgFontSize = f.size * (1 + (lifeRatio - 0.7) * 1.5);
      }
      var _px = Math.round(dmgFontSize);
      if (_px !== _lastFontPx) {
        ctx.font = 'bold ' + _px + 'px ' + _floatFont;
        _lastFontPx = _px;
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      // Crit glow halo
      if (f.crit && f.age < 0.25) {
        ctx.save();
        ctx.shadowColor = f.color; ctx.shadowBlur = 12;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
      ctx.lineWidth = 1;
    }
    floats.length = fLen;
    if (_needCam) ctx.restore(); // end floats camera transform
    ctx.globalAlpha = 1; ctx.restore();
    requestAnimationFrame(loop);
  }


  // timeSlowOnMassKill (US-294): slow motion on multi-kills
  var massKillSlow = { active: false, timer: 0, timeScale: 0.3, duration: 0.15 };
  var killsThisFrame = 0;



  function onEnemyKill(e) {
    // kills / killStreak / maxStreak are PVP only (Leo 2026-04-18). Mob
    // kills go to farmKills. isBot flag (or isPlayer) distinguishes them.
    var _isPvp = !!(e && e.isBot);
    killDisplayPulse = 0.3;
    killFlashRings.push({ x: e.x, y: e.y, radius: 0, maxRadius: 40, life: 0.2, maxLife: 0.2 });
    if (killFlashRings.length > 20) killFlashRings.shift();
    if (_isPvp) {
      if (player && allPlayers[0]) allPlayers[0].kills = kills + 1;
      kills++;
      killsThisFrame++;
      killStreak++;
      if (player) player._streakTimer = 0;
      if (killStreak > maxStreak) maxStreak = killStreak;
    } else {
      farmKills++;
      if (player) player._farmKills = (player._farmKills || 0) + 1;
    }
    // instantAction (US-300): mark first kill timing — applies to both paths
    if (!instantAction.firstKillDone) {
      instantAction.firstKillDone = true;
      if (instantAction.firstKillTimer < 2) {
        floatText(player.x, player.y - 60, 'INSTANT KILL!', '#ffd700', 16);
      }
    }
    // Trigger slow motion when 3+ kills in one frame — keep as-is (dramatic moment)
    if (killsThisFrame >= 3 && !massKillSlow.active) {
      massKillSlow.active = true;
      massKillSlow.timer = massKillSlow.duration;
      screenFlash.color = '#fff'; screenFlash.alpha = 0.15;
    }
    // autoHighlight (US-313): detect spectacular moments
    if (e.enemyType === 'boss') {
      autoHighlight.events.push({ type: 'boss_kill', time: gameTime, text: 'Boss击杀!' });
      // shareReplayData (US-315): record highlight frame data
      replayBuffer.push({ t: gameTime, x: player.x, y: player.y, kills: kills, event: 'boss_kill' });
      // Team mode: killing 魔山 gives bonus gold + skin fragments
      if (e.isMoshan && gameMode === 'team') {
        var moshanGold = 500;
        gold += moshanGold;
        floatText(player.x, player.y - 80, '魔山已被击败! +' + moshanGold + ' 金币 + 皮肤碎片!', '#ffd700', 22);
        floatText(player.x, player.y - 50, '团队胜利! 🏆', '#ffd700', 28);
        screenFlash.color = '#ffd700'; screenFlash.alpha = 0.8;
        screenShake(15, 1000);
        saveGold();
        victoryState.timer = 3.0; // countdown in game loop
      }
    }
    if (comboKills === 25 || comboKills === 50 || comboKills === 100) {
      autoHighlight.events.push({ type: 'mega_combo', time: gameTime, text: comboKills + '连击!' });
      replayBuffer.push({ t: gameTime, x: player.x, y: player.y, kills: kills, event: 'combo_' + comboKills });
    }
    if (autoHighlight.events.length > autoHighlight.maxEvents) autoHighlight.events.shift();
    // Combo kill chain (US-215)
    comboKills++;
    comboTimer = comboWindow;
    // bigComboEffect: spectacle on milestone combos (US-277)
    if (comboKills === 10 || comboKills === 25 || comboKills === 50 || comboKills === 100) {
      var comboColor = comboKills >= 50 ? '#f00' : (comboKills >= 25 ? '#f80' : '#f0f');
      emit(player.x, player.y, comboColor, Math.min(40, comboKills), 200);
      emit(player.x, player.y, '#fff', 15, 150);
      screenShake(Math.min(12, 3 + comboKills / 5), 400);
      screenFlash.color = comboColor; screenFlash.alpha = 0.3;
    } else if (comboKills >= 5 && comboKills % 5 === 0) {
      emit(player.x, player.y, '#f0f', 8, 80);
    }
    // Ultimate charge (US-199)
    if (ultCharge < ultChargeMax) ultCharge++;
    if (ultCharge >= ultChargeMax) ultReady = true;
    playSound('kill');

    // Particles based on enemy type — bigger death bursts for satisfying kills
    var c = e.color || '#f44';
    emit(e.x, e.y, c, e.enemyType === 'boss' ? 35 : 18, e.enemyType === 'boss' ? 200 : 120);
    // enemyDissolve (US-331): deathDissolve fragment particles for dissolve visual
    var dissolveCount = e.enemyType === 'boss' ? 12 : 5;
    for (var dfi = 0; dfi < dissolveCount; dfi++) {
      var dfAngle = Math.PI * 2 * dfi / dissolveCount;
      var dfSpeed = 20 + Math.random() * 40;
      particles.push({ x: e.x + (Math.random()-0.5)*e.radius, y: e.y + (Math.random()-0.5)*e.radius,
        vx: Math.cos(dfAngle) * dfSpeed, vy: Math.sin(dfAngle) * dfSpeed,
        life: 0.3, maxLife: 0.3, color: c, radius: e.radius * 0.3 * Math.random() });
    }
    // Multi-kill screen flash
    if (comboKills >= 3) { screenFlash.color = '#ff0'; screenFlash.alpha = 0.06 + comboKills * 0.01; }

    // Chain reaction: corpseExplode — 20% chance to explode on death, damaging nearby
    var corpseExplodeChance = 0.2 + (player._explosiveDmg ? 0.15 : 0);
    if (Math.random() < corpseExplodeChance) {
      var chainKillRadius = 60;
      var chainKillDmg = Math.round(e.maxHp * 0.3);
      emit(e.x, e.y, '#f80', 12, chainKillRadius);
      // aoeSweepEffect (US-296): visual sweep wave on AOE hits
      if (!window._aoeSweep) window._aoeSweep = [];
      window._aoeSweep.push({ x: e.x, y: e.y, radius: 0, maxRadius: chainKillRadius * 1.5, life: 0.3, maxLife: 0.3, color: '#f80' });
      screenFlash.color = '#f80'; screenFlash.alpha = 0.08;
      for (var ci = 0; ci < entities.length; ci++) {
        var ce = entities[ci];
        if (ce.type !== 'enemy' || ce.hp <= 0 || ce === e) continue;
        var cdx = ce.x - e.x, cdy = ce.y - e.y;
        if (Math.sqrt(cdx * cdx + cdy * cdy) < chainKillRadius + ce.radius) {
          ce.hp -= chainKillDmg;
          ce.hitFlash = 3;
          // dmgNumberShower (US-311): each enemy in AOE gets its own floating number
          var multiDmgFloat = true;
          floatText(ce.x + (Math.random() - 0.5) * 15, ce.y - ce.radius - Math.random() * 10, '-' + Math.round(chainKillDmg), '#f80', 11 + Math.random() * 3);
        }
      }
    }

    // XP gem — gemSizeVariety: set gemTier based on xp value
    var _gemXp = e.xp || 10;
    var gemTier = _gemXp < 20 ? 'small' : (_gemXp < 50 ? 'medium' : 'large');
    gems.push({ x: e.x, y: e.y, xp: _gemXp, radius: 4, _t: 0, gemTier: gemTier });

    // Lifesteal
    if (player.lifesteal > 0) {
      var heal = Math.round(e.maxHp * player.lifesteal);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      if (heal > 0) floatText(player.x, player.y - 20, '+' + heal, '#0f0', 12);
    }

    // Streak feedback
    if (killStreak === 10) { floatText(player.x, player.y - 40, '10连杀!', '#ff0', 18); screenFlash.color = '#ff0'; screenFlash.alpha = 0.15; }
    else if (killStreak === 25) { floatText(player.x, player.y - 40, '25连杀!!', '#f80', 22); screenFlash.color = '#f80'; screenFlash.alpha = 0.2; }
    else if (killStreak === 50) { floatText(player.x, player.y - 40, '50连杀!!!', '#f00', 26); screenShake(6, 300); screenFlash.color = '#f00'; screenFlash.alpha = 0.3; }

    // Kill milestones (US-209)
    // killMilestoneBanner (US-338): full-screen banner at major kill counts
    if (kills === 100) { floatText(W / 2, H / 3, '100杀! 小试牛刀!', '#ffd700', 26); emit(player.x, player.y, '#ffd700', 25, 150); screenShake(6, 300); screenFlash.color = '#ffd700'; screenFlash.alpha = 0.3; killMilestoneBanner = { active: true, timer: 0, duration: 1.5, text: '100 KILLS', color: '#ffd700' }; }
    else if (kills === 500) { floatText(W / 2, H / 3, '500杀! 屠杀机器!', '#f80', 30); emit(player.x, player.y, '#f80', 35, 200); screenShake(8, 400); screenFlash.color = '#f80'; screenFlash.alpha = 0.4; killMilestoneBanner = { active: true, timer: 0, duration: 1.5, text: '500 KILLS', color: '#f80' }; }
    else if (kills === 1000) { floatText(W / 2, H / 3, '1000杀! 传说诞生!', '#f0f', 34); emit(player.x, player.y, '#f0f', 50, 250); screenShake(12, 600); screenFlash.color = '#f0f'; screenFlash.alpha = 0.5; killMilestoneBanner = { active: true, timer: 0, duration: 1.5, text: '1000 KILLS', color: '#f0f' }; }

    // Treasure goblin kill reward (big gold bonus)
    if (e.treasureGoblin) {
      var tgGold = e.treasureGold || 50;
      gold += tgGold;
      floatText(e.x, e.y - 20, '💰 +' + tgGold + ' gold!', '#ffd700', 20);
      emit(e.x, e.y, '#ffd700', 25, 150);
      screenShake(6, 300);
      screenFlash.color = '#ffd700'; screenFlash.alpha = 0.2;
    }
    // Mini-boss kill reward
    if (e.miniBoss) {
      var mbGold = e.miniBossGold || 25;
      gold += mbGold;
      floatText(e.x, e.y - 30, '+' + mbGold + ' gold!', '#ffd700', 16);
      screenShake(5, 200);
    }
    // Boss kill special
    if (e.enemyType === 'boss') {
      floatText(e.x, e.y - 30, '⭐ BOSS KILLED ⭐', '#ffd700', 24);
      screenShake(10, 400);
      screenFlash.color = '#ffd700'; screenFlash.alpha = 0.35;
      // Drop health orb
      player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.3));
      floatText(player.x, player.y - 20, '+30% HP', '#0f0', 16);
      // Boss gold reward
      var bossGold = e.bossGold || 50;
      gold += bossGold;
      floatText(e.x, e.y - 50, '+' + bossGold + ' gold!', '#ffd700', 18);
    }
  }

  function checkAchievements() {
    for (var i = 0; i < ACHIEVEMENT_DEFS.length; i++) {
      var a = ACHIEVEMENT_DEFS[i];
      if (!unlockedAchievements[a.id] && a.check()) {
        unlockedAchievements[a.id] = true;
        gold += a.goldReward;
        achievementQueue.push({ name: a.name, desc: a.desc, reward: a.goldReward, _timer: 3 });
        screenFlash.color = '#ffd700'; screenFlash.alpha = 0.2;
      }
    }
    // Check if new achievements unlock skins/trails (US-256)
    checkAchievementUnlocks();
  }

  // === SPRINT 3 WAVE 2: Upgrade Choice System (Epic 2.1) ===
  // Data-driven card pool loaded from demo/assets/wave2/cards.json.
  // Falls back to legacy random-3-from-SKILL_IDS if JSON fails to load.
  var WAVE2_CARDS = null; // populated async from cards.json; null until loaded
  (function loadWave2Cards() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'assets/wave2/cards.json', true);
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { WAVE2_CARDS = JSON.parse(xhr.responseText); }
          catch (e) { WAVE2_CARDS = null; }
        }
      };
      xhr.onerror = function() { WAVE2_CARDS = null; };
      xhr.send();
    } catch (e) { WAVE2_CARDS = null; }
  })();

  function generateChoices() {
    // Wave 2 path: weighted by rarity, uses cards.json pool
    if (WAVE2_CARDS && WAVE2_CARDS.cards && WAVE2_CARDS.rarities) {
      var eligible = [];
      for (var ci = 0; ci < WAVE2_CARDS.cards.length; ci++) {
        var card = WAVE2_CARDS.cards[ci];
        if (card.rarity === 'evolution') continue; // never rolled normally
        var cap = card.stackCap || 5;
        if ((skillLevels[card.id] || 0) >= cap) continue; // cap reached
        eligible.push(card);
      }
      if (eligible.length === 0) { skillChoices = []; return; }
      // Weighted sample without replacement
      var picks = [];
      var pool = eligible.slice();
      for (var p = 0; p < 3 && pool.length > 0; p++) {
        var totalW = 0;
        for (var k = 0; k < pool.length; k++) {
          var rDef = WAVE2_CARDS.rarities[pool[k].rarity] || { weightMultiplier: 1 };
          totalW += (pool[k].weight || 50) * (rDef.weightMultiplier || 1);
        }
        var roll = Math.random() * totalW;
        var acc = 0, pickIdx = pool.length - 1;
        for (var k2 = 0; k2 < pool.length; k2++) {
          var rDef2 = WAVE2_CARDS.rarities[pool[k2].rarity] || { weightMultiplier: 1 };
          acc += (pool[k2].weight || 50) * (rDef2.weightMultiplier || 1);
          if (roll <= acc) { pickIdx = k2; break; }
        }
        picks.push(pool[pickIdx]);
        pool.splice(pickIdx, 1);
      }
      window._lastOffer = picks.map(function(c) { return c.id + ':' + c.rarity; });
      window._allOffers = (window._allOffers || []).concat([window._lastOffer.join('|')]);
      skillChoices = picks;
      return;
    }
    // Fallback: legacy path (no cards.json)
    window._fallbackUsed = (window._fallbackUsed || 0) + 1;
    var pool = SKILL_IDS.filter(function(id) { return (skillLevels[id] || 0) < 5; });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    skillChoices = pool.slice(0, 3);
  }

  // Wave 2: pick a card by index (0/1/2) from current skillChoices.
  // Applies the effect and transitions state back to 'playing'.
  function pickUpgradeCard(idx) {
    if (state !== 'levelUp') return false;
    if (!skillChoices || idx < 0 || idx >= skillChoices.length) return false;
    var choice = skillChoices[idx];
    var id;
    if (typeof choice === 'string') {
      id = choice;
    } else if (choice && choice._evolution) {
      // Evolution card — mark result as evolved and apply any related skill
      evolvedSkills[choice._evolution.result] = true;
      id = choice._evolution.result;
      floatText(player ? player.x : W/2, player ? player.y - 40 : H/2, '⭐ 进化: ' + choice._evolution.name, '#ff44dd', 22);
    } else if (choice && choice.id) {
      id = choice.id;
    }
    if (id && typeof applySkill === 'function') {
      // Ignore applySkill failure for synthesized evolution IDs
      try { applySkill(id); } catch (e) {}
      window._allPicks = (window._allPicks || []).concat([
        id + ':' + ((WAVE2_CARDS && WAVE2_CARDS.cards.find(function(c){return c.id===id;})) || {rarity:'?'}).rarity
      ]);
    }
    skillChoices = [];
    state = 'playing';
    // visual confirmation
    if (player) {
      emit(player.x, player.y, '#ffd700', 20, 140);
      screenShake('medium');
    }
    return true;
  }

  // Wave 2: trigger a level-up. Used by offline XP and by debug hook.
  // Curve (Leo 2026-04-18): Lv1→2 = 30 XP (~3 normal mobs), then +20 per level.
  //   1→2:30, 2→3:50, 3→4:70, 4→5:90, 5→6:110, 6→7:130, 7→8:150, 8→9:170.
  // A 5–8 min match averages 15–25 XP drops → 3–5 level-ups.
  var _levelUpQueue = { pending: 0, wait: 0 };
  function triggerLevelUp() {
    if (state === 'levelUp') return;
    // Zombie BR pacing: keep a short opening combat beat, then let the first
    // upgrade arrive quickly. The old 30s delay made the early game feel flat.
    if (offlineMode && playerLevel <= 1 && (gameTime || 0) < 8) {
      _levelUpQueue.pending = Math.max(_levelUpQueue.pending, 1);
      _levelUpQueue.wait = Math.max(_levelUpQueue.wait, 8 - (gameTime || 0));
      return;
    }
    // Round 2: defer level-up if a high-priority banner is showing so the
    // BOSS SLAIN / combo / RIVAL SLAIN banner gets its 1.2s spotlight.
    var _bannerActive = (bossSlainBanner.active || synergyBanner.active ||
                         (comboState.popupTimer > 0 && comboState.lastShownCount >= 2));
    if (_bannerActive) {
      _levelUpQueue.pending++;
      _levelUpQueue.wait = Math.max(_levelUpQueue.wait, 1.2);
      return;
    }
    playerLevel++;
    playerXP = Math.max(0, playerXP - xpToNextLevel);
    xpToNextLevel = 30 + (playerLevel - 1) * 20;
    // Experiment F: grant class ultimate at Lv5 (once per match)
    if (playerLevel === 5 && !player._ultimateUnlocked) {
      grantClassUltimate();
    }
    // LEVEL UP! visual burst — big floating text + screen flash + ring
    if (player) {
      floatText(player.x, player.y - 50, 'LEVEL UP!', { color: '#ffd700', size: 22 });
      floatText(player.x, player.y - 28, 'Lv.' + playerLevel, { color: '#ffe080', size: 16 });
      levelUpFlash.active = true;
      levelUpFlash.timer = 0.6;
      levelUpFlash.ringRadius = 0;
      screenFlash.color = '#ffd700'; screenFlash.alpha = 0.35;
    }
    generateChoices();
    if (!skillChoices || skillChoices.length === 0) return; // no cards available
    skillCardAnim = { timer: 0, duration: 0.4, active: true };
    state = 'levelUp';
    if (typeof playSound === 'function') playSound('levelup');
  }

  // === DRAW ===
  // R5j F1 — frame-cached flags that downstream entity loops read once instead
  // of recomputing the slow-active condition per entity.
  var _slowActiveFrame = false;
  var _slowSrcFrame = null;
  function drawGame() {
    if (!player) return;
    _slowActiveFrame = !!(window._altarSlowUntil && gameTime < window._altarSlowUntil);
    _slowSrcFrame = _slowActiveFrame
      ? (R5H_FX.slowAura.canvas || (R5H_FX.slowAura.ready ? R5H_FX.slowAura.img : null))
      : null;

    // 3-zone HUD layout: top 15% / middle 75% game / bottom 10%
    var _gameZoneTop = Math.round(H * 0.105);
    var _gameZoneBot = Math.round(H * 0.90);
    var _gameZoneH = _gameZoneBot - _gameZoneTop;
    // Clip padding: expand by max entity radius so sprites near the boundary
    // display their full body (HUD bars draw on top and cover any spillover)
    var _clipPad = Math.round(70 * Math.min(W / 400, H / 700));
    var _clipTop = Math.max(0, _gameZoneTop - _clipPad);
    var _clipBot = Math.min(H, _gameZoneBot + _clipPad);
    var _clipH = _clipBot - _clipTop;

    // Clear HUD zones so stale pixels from prior frames don't bleed through semi-transparent bars
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, _gameZoneTop);
    ctx.fillRect(0, _gameZoneBot, W, H - _gameZoneBot);

    // multiPlayerRender (US-004): camera follow local player — center in MIDDLE zone
    cameraX = player.x - W/2;
    cameraY = player.y - (_gameZoneTop + _gameZoneH / 2);
    cameraX = Math.max(0, Math.min(WORLD_W - W, cameraX));
    cameraY = Math.max(-_gameZoneTop, Math.min(WORLD_H - _gameZoneBot, cameraY));
    ctx.save();
    // Padded clip — entities at the boundary stay fully visible; HUD covers spillover
    ctx.beginPath();
    ctx.rect(0, _clipTop, W, _clipH);
    ctx.clip();
    ctx.translate(-cameraX, -cameraY);

    // auroraBackground (US-314): flowing aurora light bands
    for (var awi = 0; awi < auroraWaves.length; awi++) {
      var aw = auroraWaves[awi];
      aw.phase += aw.speed * 0.016;
      var auroraHue = (currentBiome && currentBiome.bgColor) ? aw.hue + wave * 15 : aw.hue;
      ctx.globalAlpha = 0.04;
      ctx.beginPath();
      ctx.moveTo(0, H * aw.y);
      for (var ax = 0; ax <= W; ax += 20) {
        var ay = H * aw.y + Math.sin(ax * 0.01 + aw.phase) * aw.amplitude + Math.sin(ax * 0.005 + aw.phase * 0.7) * aw.amplitude * 0.5;
        ctx.lineTo(ax, ay);
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = 'hsl(' + (auroraHue % 360) + ',60%,50%)';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Background ambient particles (US-229) — colorful nebula dots
    for (var bpi = 0; bpi < bgParticles.length; bpi++) {
      var bp = bgParticles[bpi];
      var bpScreenX = bp.x - camX + W / 2, bpScreenY = bp.y - camY + H / 2;
      if (bpScreenX < -20 || bpScreenX > W + 20 || bpScreenY < -20 || bpScreenY > H + 20) continue;
      ctx.globalAlpha = bp.alpha * (0.7 + 0.3 * Math.sin(Date.now() * 0.002 + bpi));
      ctx.fillStyle = 'hsl(' + ((bp.hue || 220) + (bpi % 3) * 30) + ',60%,60%)';
      ctx.beginPath(); ctx.arc(bpScreenX, bpScreenY, bp.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // homm3_bright floor tileset (painterly grass/dirt/stone) — covers world
    drawTilesetFloor(ctx, cameraX, cameraY);
    // Zone overlays — draw colored zone regions on the map
    drawZoneOverlays(ctx, cameraX, cameraY);
    // Terrain obstacles — rocks, bushes, water, lava, etc.
    drawTerrain(ctx, cameraX, cameraY);
    // Central landmark aura (Leo 2026-04-21) — world-space halo drawn under
    // structures so the altar "glows" visible from afar.
    drawLandmarkAura(ctx, cameraX, cameraY);
    // BR structures — buildings, walls, crates (world-space)
    drawBRStructures(ctx, cameraX, cameraY);
    // homm3_bright scattered decor (trees, rocks, houses, fences, crates)
    // Experiment C: strategic capture points
    drawStrategicPoints(ctx, cameraX, cameraY);
    // Fixed spawn points (MOBA-style) — drawn in world space over terrain
    drawSpawnPointMarkers(cameraX, cameraY);

    // envDecoration — draw floatingDebris and energyWisp (US-272)
    for (var di = 0; di < floatingDebris.length; di++) {
      var d = floatingDebris[di];
      var dsx = d.x - camX + W / 2, dsy = d.y - camY + H / 2;
      if (dsx < -30 || dsx > W + 30 || dsy < -30 || dsy > H + 30) continue;
      d.x += d.vx * 0.016; d.y += d.vy * 0.016;
      if (d.x < 0) d.x = WORLD_W; if (d.x > WORLD_W) d.x = 0;
      if (d.y < 0) d.y = WORLD_H; if (d.y > WORLD_H) d.y = 0;
      if (d.kind === 'wisp') {
        // energyWisp: soft glowing orb
        var wAlpha = 0.15 + 0.1 * Math.sin(gameTime * 2 + d.phase);
        ctx.globalAlpha = wAlpha;
        ctx.fillStyle = 'hsl(' + d.hue + ',70%,65%)';
        ctx.beginPath(); ctx.arc(dsx, dsy, d.size * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = wAlpha * 1.5;
        ctx.fillStyle = 'hsl(' + d.hue + ',50%,80%)';
        ctx.beginPath(); ctx.arc(dsx, dsy, d.size * 0.6, 0, Math.PI * 2); ctx.fill();
      } else {
        // debris: small rotating polygon
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = 'hsl(' + d.hue + ',30%,40%)';
        ctx.save(); ctx.translate(dsx, dsy); ctx.rotate(gameTime * d.rotSpeed);
        ctx.fillRect(-d.size, -d.size * 0.5, d.size * 2, d.size);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // afterimageDash (US-301): ghost afterimage trail when moving fast
    for (var adi = 0; adi < afterimageDash.length; adi++) {
      var ag = afterimageDash[adi];
      ctx.globalAlpha = ag.alpha * 0.6;
      var agScale = ag.scale * player.radius;
      ctx.fillStyle = '#4488ff';
      ctx.beginPath(); ctx.arc(ag.x, ag.y, agScale, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = ag.alpha * 0.3;
      ctx.fillStyle = '#88bbff';
      ctx.beginPath(); ctx.arc(ag.x, ag.y, agScale * 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Player movement trail (US-230) — class-colored afterimage ribbon
    var trailCls = CLASS_DEFS[player.playerClass || selectedClass] || CLASS_DEFS.warrior || { color: '#4488ff' };
    var trailCol = trailCls.color || '#4488ff';
    // Ribbon stroke through trail points
    if (playerTrail.length >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var _trb = 0; _trb < 3; _trb++) {
        ctx.globalAlpha = (0.18 - _trb * 0.05);
        ctx.strokeStyle = trailCol;
        ctx.lineWidth = player.radius * (1.6 - _trb * 0.35);
        ctx.beginPath();
        ctx.moveTo(playerTrail[0].x, playerTrail[0].y);
        for (var _trp = 1; _trp < playerTrail.length; _trp++) {
          ctx.lineTo(playerTrail[_trp].x, playerTrail[_trp].y);
        }
        ctx.lineTo(player.x, player.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Fading afterimage orbs at each trail point
    for (var pti = playerTrail.length - 1; pti >= 0; pti--) {
      var pt = playerTrail[pti];
      var fade = 1 - pti / playerTrailMax;
      ctx.globalAlpha = fade * 0.35;
      // Outer glow
      ctx.fillStyle = trailCol;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, player.radius * (0.9 * fade + 0.3), 0, Math.PI * 2); ctx.fill();
      // Inner bright core
      ctx.globalAlpha = fade * 0.18;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, player.radius * 0.4 * fade, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fire trails — enhanced with flickering flame effect
    for (var i = 0; i < fireTrails.length; i++) {
      var ft = fireTrails[i];
      var ftAlpha = ft.life / 2;
      // Outer heat shimmer
      ctx.globalAlpha = ftAlpha * 0.15;
      ctx.fillStyle = '#f40';
      ctx.beginPath(); ctx.arc(ft.x, ft.y, ft.radius * 1.8, 0, Math.PI * 2); ctx.fill();
      // Main flame
      ctx.globalAlpha = ftAlpha * 0.5;
      ctx.fillStyle = '#f60';
      ctx.beginPath(); ctx.arc(ft.x, ft.y, ft.radius, 0, Math.PI * 2); ctx.fill();
      // Hot core
      ctx.globalAlpha = ftAlpha * 0.6;
      ctx.fillStyle = '#fa0';
      ctx.beginPath(); ctx.arc(ft.x, ft.y, ft.radius * 0.6, 0, Math.PI * 2); ctx.fill();
      // Bright center
      ctx.globalAlpha = ftAlpha * 0.4;
      ctx.fillStyle = '#ff0';
      ctx.beginPath(); ctx.arc(ft.x, ft.y, ft.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Explosion AOE — enhanced with shockwave ring
    for (var i = 0; i < explosionAoe.length; i++) {
      var ao = explosionAoe[i];
      var aoAlpha = ao.life / 0.15;
      // Shockwave ring
      ctx.globalAlpha = aoAlpha * 0.4;
      ctx.strokeStyle = '#fa0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ao.x, ao.y, ao.radius * (1.2 - aoAlpha * 0.2), 0, Math.PI * 2); ctx.stroke();
      // Core explosion
      ctx.globalAlpha = aoAlpha * 0.3;
      ctx.fillStyle = '#f80';
      ctx.beginPath(); ctx.arc(ao.x, ao.y, ao.radius, 0, Math.PI * 2); ctx.fill();
      // Hot center
      ctx.globalAlpha = aoAlpha * 0.5;
      ctx.fillStyle = '#ff0';
      ctx.beginPath(); ctx.arc(ao.x, ao.y, ao.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;

    // Ground hazards
    for (var i = 0; i < groundHazards.length; i++) {
      var gh = groundHazards[i];
      ctx.globalAlpha = Math.min(1, gh.life / gh.maxLife) * 0.4;
      ctx.fillStyle = '#f44';
      ctx.beginPath(); ctx.arc(gh.x, gh.y, gh.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f88'; ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Frost aura — blizzard visual with swirling ice particles
    if (player.slowAura > 0) {
      var frostR = 150;
      // Outer frost glow
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#8ef';
      ctx.beginPath(); ctx.arc(player.x, player.y, frostR * 1.3, 0, Math.PI * 2); ctx.fill();
      // Inner frost field
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#aef';
      ctx.beginPath(); ctx.arc(player.x, player.y, frostR, 0, Math.PI * 2); ctx.fill();
      // Swirling ice particles
      for (var fpi = 0; fpi < 12; fpi++) {
        var fpAngle = gameTime * 1.5 + fpi * Math.PI * 2 / 12;
        var fpDist = frostR * (0.3 + 0.6 * ((fpi * 7 + Math.floor(gameTime * 3)) % 10) / 10);
        var fpx = player.x + Math.cos(fpAngle) * fpDist;
        var fpy = player.y + Math.sin(fpAngle) * fpDist;
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(gameTime * 4 + fpi);
        ctx.fillStyle = '#cef';
        // Snowflake shape (small cross)
        ctx.save(); ctx.translate(fpx, fpy); ctx.rotate(gameTime * 3 + fpi);
        ctx.fillRect(-2, -0.5, 4, 1);
        ctx.fillRect(-0.5, -2, 1, 4);
        ctx.restore();
      }
      // Frost ring border
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#8ef'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(player.x, player.y, frostR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Thorns aura — green spiky ring (US-297)
    if (player._thornsDmg > 0 || (player.thornsDamage && player.thornsDamage > 0)) {
      var thornR = 40;
      ctx.save();
      ctx.translate(player.x, player.y);
      // Green ring
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#4f4';
      ctx.beginPath(); ctx.arc(0, 0, thornR, 0, Math.PI * 2); ctx.fill();
      // Thorn spikes
      ctx.globalAlpha = 0.8;
      for (var ti = 0; ti < 8; ti++) {
        var ta = gameTime * 0.5 + ti * Math.PI / 4;
        var tox = Math.cos(ta) * thornR;
        var toy = Math.sin(ta) * thornR;
        ctx.fillStyle = '#4a2';
        ctx.beginPath();
        ctx.moveTo(tox + Math.cos(ta) * 12, toy + Math.sin(ta) * 12);
        ctx.lineTo(tox + Math.cos(ta + 0.4) * 4, toy + Math.sin(ta + 0.4) * 4);
        ctx.lineTo(tox + Math.cos(ta - 0.4) * 4, toy + Math.sin(ta - 0.4) * 4);
        ctx.fill();
      }
      // Dashed ring
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#4f4';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(0, 0, thornR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Time warp field — purple distortion (US-297)
    if (player._timeWarp > 0) {
      var twR = 50;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#a4f';
      ctx.beginPath(); ctx.arc(0, 0, twR * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#c6f';
      ctx.beginPath(); ctx.arc(0, 0, twR, 0, Math.PI * 2); ctx.fill();
      // Clock markers rotating counter-clockwise
      ctx.strokeStyle = '#c8f'; ctx.lineWidth = 1.5;
      for (var twi = 0; twi < 12; twi++) {
        var twa = gameTime * -1.5 + twi * Math.PI / 6;
        ctx.globalAlpha = 0.4 + Math.sin(gameTime * 3 + twi) * 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(twa) * (twR - 6), Math.sin(twa) * (twR - 6));
        ctx.lineTo(Math.cos(twa) * twR, Math.sin(twa) * twR);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // XP gems with gemGlow + gem pulse animation (US-271)
    // Despawn gems older than 12s, fade out in last 3s.
    // _t is a frame counter incremented by 0.05 per render frame (see below).
    // At 60fps: 12s → _t=36, fade start → _t=27 (last 9 _t units ≈ 3s).
    // Old code used `12 / 0.05 = 240`, which at 60fps is ~80s not 12s.
    for (var i = gems.length - 1; i >= 0; i--) {
      if (gems[i]._t > 36) { gems.splice(i, 1); continue; }
    }
    // Cap max gems to prevent visual clutter
    while (gems.length > 60) gems.shift();
    for (var i = 0; i < gems.length; i++) {
      var g = gems[i]; g._t += 0.05;
      if (window.KOS_RENDER && typeof window.KOS_RENDER.drawXpGem === 'function' && window.KOS_RENDER.drawXpGem(ctx, g)) continue;
      var gemPulse = 1 + Math.sin(g._t * 2) * 0.25;
      // gemSizeVariety: use gemTier for different sizes (small=4px, medium=7px, large=10px)
      var gemTierSize = g.gemTier === 'large' ? 10 : (g.gemTier === 'medium' ? 7 : 4);
      var gs = gemTierSize * gemPulse;
      // gemGlow — color by XP value (small=green, med=blue, large=purple)
      var gemGlowColor = g.xp >= 50 ? '#c6f' : (g.xp >= 25 ? '#48f' : '#0f0');
      var gemBodyColor = g.xp >= 50 ? '#d8f' : (g.xp >= 25 ? '#6af' : '#2f2');
      // gemSizeVariety: extra bright glow for large gems
      if (g.gemTier === 'large') {
        ctx.globalAlpha = 0.4 + Math.sin(g._t * 4) * 0.15;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(g.x, g.y, gs * 3.5, 0, Math.PI * 2); ctx.fill();
      }
      // Outer glow ring (fade out in last 3s ≈ last 9 _t units at 60fps)
      var gemAge = g._t; var gemMaxAge = 36;
      var gemFade = gemAge > (gemMaxAge - 9) ? (gemMaxAge - gemAge) / 9 : 1;
      ctx.globalAlpha = (0.3 + Math.sin(g._t * 3) * 0.1) * gemFade;
      ctx.fillStyle = gemGlowColor;
      ctx.beginPath(); ctx.arc(g.x, g.y, gs * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // Gem body (diamond shape)
      ctx.fillStyle = gemBodyColor;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-gs * 0.7, -gs * 0.7, gs * 1.4, gs * 1.4);
      ctx.restore();
      // Bright center sparkle
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6 + Math.sin(g._t * 4) * 0.3;
      ctx.beginPath(); ctx.arc(g.x, g.y, gs * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Experiment D: skill loot pickups (gold pillars)
    drawSkillPickups();
    // Round 3 K: kill shatter debris bursts
    drawKillShatters();
    // Experiment E: airdrop / vault / meteor world event visuals
    drawWorldEventWorld();
    // Strategic point pulse halos (world-space)
    drawStratPulse();

    // ldoe-overhaul-01: unified bullet tracer — line segment + bright tip.
    // Drawn brighter + thicker + with dark outline so it survives red multiply overlay.
    for (var _fri = 0; _fri < offlineSkillFx.length; _fri++) {
      var _frfx = offlineSkillFx[_fri];
      var _frAlpha = Math.min(1, _frfx.life / _frfx.maxLife);
      if (window.KOS_RENDER && typeof window.KOS_RENDER.drawBulletTracer === 'function' && window.KOS_RENDER.drawBulletTracer(ctx, _frfx)) {
        var _newTa = _frfx.angle || 0;
        window.__lastTracerSegment = {
          x1: _frfx.x - 42 * Math.cos(_newTa), y1: _frfx.y - 42 * Math.sin(_newTa),
          x2: _frfx.x + 12 * Math.cos(_newTa), y2: _frfx.y + 12 * Math.sin(_newTa),
          angle: _newTa, t: (typeof gameTime !== 'undefined' ? gameTime : 0)
        };
        continue;
      }
      ctx.save();
      ctx.translate(_frfx.x, _frfx.y);
      ctx.rotate(_frfx.angle || 0);
      // Dark outline (so it stays readable under multiply overlay)
      ctx.globalAlpha = 0.7 * _frAlpha;
      ctx.fillStyle = '#1a1a14';
      ctx.fillRect(-22, -1.8, 22, 3.6);
      // Tracer body (bright亮黄 line, 24px length × 2px height)
      ctx.globalAlpha = _frAlpha;
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(-22, -1.2, 24, 2.4);
      // Bright white core/head — 9×4 (was 7×3) so pixel-scan can use white-≥6px
      // + adjacent-yellow复合判据 (撞色 mask removed: white不会和地面 #6e5a3e撞)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -2, 9, 4);
      ctx.restore();
      // ldoe-overhaul-02b: expose last-rendered tracer segment for harness
      var _ta = _frfx.angle || 0;
      window.__lastTracerSegment = {
        x1: _frfx.x - 22 * Math.cos(_ta), y1: _frfx.y - 22 * Math.sin(_ta),
        x2: _frfx.x + 24 * Math.cos(_ta), y2: _frfx.y + 24 * Math.sin(_ta),
        angle: _ta, t: (typeof gameTime !== 'undefined' ? gameTime : 0)
      };
    }
    ctx.globalAlpha = 1;

    // Gold coin drops — render with spinning sheen
    for (var _cri = 0; _cri < coins.length; _cri++) {
      var _crc = coins[_cri];
      var _crT = (_crc._t || 0) * 4;
      var _crSpin = Math.abs(Math.sin(_crT));
      var _crPulse = 0.85 + Math.sin((_crc._t || 0) * 3) * 0.12;
      // Outer glow
      ctx.globalAlpha = 0.4 + Math.sin((_crc._t || 0) * 4) * 0.1;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(_crc.x, _crc.y, 11 * _crPulse, 0, Math.PI * 2); ctx.fill();
      // Coin disc (ellipse for spin illusion)
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c89010';
      ctx.beginPath(); ctx.ellipse(_crc.x, _crc.y, 6, 6 * (0.3 + _crSpin * 0.7), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.ellipse(_crc.x, _crc.y, 5, 5 * (0.3 + _crSpin * 0.7), 0, 0, Math.PI * 2); ctx.fill();
      // "$" mark when facing
      if (_crSpin > 0.6) {
        ctx.fillStyle = '#885800'; ctx.font = 'bold 9px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('$', _crc.x, _crc.y + 3);
      }
      // Magnet trail
      if (_crc.magnetized) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(_crc.x, _crc.y);
        ctx.lineTo(_crc.x - (_crc.vx || 0) * 0.03, _crc.y - (_crc.vy || 0) * 0.03);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // xpCollectBurst (US-326): draw massCollect light flow lines from gem positions to player
    if (xpCollectBurst.active && xpCollectBurst.lines.length > 0 && player) {
      var burstAlpha = xpCollectBurst.timer / 0.3;
      ctx.globalAlpha = burstAlpha * 0.6;
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
      for (var bli = 0; bli < xpCollectBurst.lines.length; bli++) {
        var bl = xpCollectBurst.lines[bli];
        ctx.beginPath(); ctx.moveTo(bl.x, bl.y); ctx.lineTo(player.x, player.y); ctx.stroke();
      }
      // Central flash on player
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = burstAlpha * 0.3;
      ctx.beginPath(); ctx.arc(player.x, player.y, 25 * burstAlpha, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }

    // Treasure chests (US-237) + lootBeam (US-310): light pillar above treasure
    for (var ci = 0; ci < chests.length; ci++) {
      var chest = chests[ci];
      var chestPulse = 1 + Math.sin(gameTime * 4) * 0.15;
      // drawLootBeam: tall light pillar reaching up from chest
      ctx.globalAlpha = 0.08 + Math.sin(gameTime * 2) * 0.03;
      var lootBeamGrad = ctx.createLinearGradient(chest.x, chest.y - 200, chest.x, chest.y);
      lootBeamGrad.addColorStop(0, 'rgba(255,215,0,0)');
      lootBeamGrad.addColorStop(1, 'rgba(255,215,0,1)');
      ctx.fillStyle = lootBeamGrad;
      ctx.fillRect(chest.x - 3, chest.y - 200, 6, 200);
      ctx.globalAlpha = Math.min(1, chest.timer / 2);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(chest.x - 8 * chestPulse, chest.y - 6 * chestPulse, 16 * chestPulse, 12 * chestPulse);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(chest.x - 3, chest.y - 2, 6, 4);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(chest.x, chest.y, 18 * chestPulse, 0, Math.PI * 2); ctx.fill();
      // chestSparkle (US-327): rotating sparkle particles + gold border + floating '!'
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
      ctx.strokeRect(chest.x - 9 * chestPulse, chest.y - 7 * chestPulse, 18 * chestPulse, 14 * chestPulse);
      // chestSparkle: rotating sparkle dots
      for (var csi = 0; csi < 4; csi++) {
        var csAngle = gameTime * 3 + csi * Math.PI / 2;
        var csR = 14 * chestPulse;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5 + Math.sin(gameTime * 6 + csi) * 0.3;
        ctx.beginPath(); ctx.arc(chest.x + Math.cos(csAngle) * csR, chest.y + Math.sin(csAngle) * csR, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      // chestSparkle: floating '!' indicator
      ctx.globalAlpha = 0.6 + Math.sin(gameTime * 4) * 0.3;
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', chest.x, chest.y - 12 - Math.sin(gameTime * 3) * 3);
      ctx.globalAlpha = 1;
    }

    // killFlashRing (US-329): update and draw expanding kill ripples
    var krLen = killFlashRings.length;
    for (var kri = krLen - 1; kri >= 0; kri--) {
      var kr = killFlashRings[kri];
      kr.life -= 0.016;
      kr.radius = kr.maxRadius * (1 - kr.life / kr.maxLife);
      if (kr.life <= 0) { killFlashRings[kri] = killFlashRings[--krLen]; continue; }
      ctx.globalAlpha = (kr.life / kr.maxLife) * 0.4;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(kr.x, kr.y, kr.radius, 0, Math.PI * 2); ctx.stroke();
    }
    killFlashRings.length = krLen;
    ctx.globalAlpha = 1; ctx.lineWidth = 1;

    // Enemies — cached lookup tables (moved outside loop for perf)
    var _affixColors = { burning: '#f40', frozen: '#4df', teleport: '#a4f', splitting: '#4f4', shielded: '#ff0' };
    var _enemyEmojiMap = { normal: '\u{1F47E}', fast: '\u{1F987}', tank: '\u{1F417}', boss: '\u{1F479}', ranged: '\u{1F3F9}', swarm: '\u{1F41C}', splitting: '\u{1F9EB}', shielded: '\u{1F6E1}\uFE0F', treasure: '\u{1F4B0}', miniBoss: '\u{1F608}' };
    var _camL = cameraX - 60, _camR = cameraX + W + 60, _camT = cameraY - 60, _camB = cameraY + H + 60;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      // Frustum culling — skip entities outside camera view
      if (e.x < _camL || e.x > _camR || e.y < _camT || e.y > _camB) continue;
      if (e.type === 'enemy') {
        // Hostile flag determines red vs green visual theme
        var isHostile = e.hostile !== false;
        var themeColor = isHostile ? (e.color || '#f44') : '#4f4';
        // Spawn animation: _spawnFade controls globalAlpha (US-239)
        var spawnAlpha = e._spawnFade !== undefined ? e._spawnFade : 1;
        if (spawnAlpha < 1) ctx.globalAlpha = spawnAlpha;
        // Outer glow for larger enemies
        if (e.radius > 12) {
          ctx.globalAlpha = 0.15 * spawnAlpha;
          ctx.fillStyle = themeColor;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = spawnAlpha;
        }
        // eliteVisualAura (US-339): affixGlow colored ring under elite enemies
        if (e.eliteAffix) {
          var affixGlowColor = _affixColors[e.eliteAffix] || '#fff';
          ctx.globalAlpha = 0.2 + Math.sin(gameTime * 4) * 0.1;
          ctx.fillStyle = affixGlowColor;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = spawnAlpha;
        }
        // enemyGlowRing — drawEnemyGlow: all enemies get a colored glow (US-273)
        var glowPulse = e.isBoss || e.miniBoss ? (0.3 + 0.2 * Math.sin(gameTime * 5)) : 0.2;
        ctx.globalAlpha = glowPulse * spawnAlpha;
        ctx.fillStyle = themeColor;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = spawnAlpha;
        // Hit flash white overlay — enemyHitFlashEnhanced: strongHitFlash lasts longer (0.15s)
        var strongHitFlash = e.hitFlash && e.hitFlash > 0;
        if (strongHitFlash) { e.hitFlash -= 0.5; ctx.fillStyle = '#fff'; }
        else { ctx.fillStyle = themeColor; }
        // enemyHitFlashEnhanced: hitImpactRing for boss enemies
        if (strongHitFlash && (e.isBoss || e.enemyType === 'boss')) {
          var hitImpactRing = e.hitFlash * 8;
          ctx.save(); ctx.globalAlpha = e.hitFlash / 4;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + hitImpactRing, 0, Math.PI * 2); ctx.stroke();
          ctx.restore(); ctx.globalAlpha = spawnAlpha;
        }
        // R5h F3 + R5i + R5j: slow aura. Skip entirely via cached flag when
        // altar slow inactive (most of any match before kill). Viewport cull.
        if (_slowActiveFrame && _slowSrcFrame) {
          var _esx = e.x - cameraX, _esy = e.y - cameraY;
          if (_esx > -80 && _esx < W + 80 && _esy > -80 && _esy < H + 80) {
            var _slowSz = R5H_FX.slowAura.size * Math.max(1, e.radius / 24);
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.drawImage(_slowSrcFrame, e.x - _slowSz / 2, e.y - _slowSz / 2 + 8, _slowSz, _slowSz);
            ctx.restore();
          }
        }
        // Body — enemySprite: render enemies as Canvas-drawn sprites
        drawEnemySprite(ctx, e.x, e.y, e.radius, e.enemyType || 'normal', strongHitFlash ? '#fff' : themeColor, gameTime, e);
        // HP bar
        if (e.hp < e.maxHp) {
          var hpBarColor = isHostile ? '#f44' : '#4f4';
          ctx.fillStyle = '#300'; ctx.fillRect(e.x - e.radius, e.y - e.radius - 5, e.radius * 2, 3);
          ctx.fillStyle = hpBarColor; ctx.fillRect(e.x - e.radius, e.y - e.radius - 5, e.radius * 2 * (e.hp / e.maxHp), 3);
        }
        // Red/green name label
        var nameLabel = isHostile ? (e.enemyType || 'enemy') : '✦';
        ctx.font = '9px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = isHostile ? '#f44' : '#4f4';
        ctx.fillText(nameLabel, e.x, e.y - e.radius - (e.hp < e.maxHp ? 7 : 2));
        // bossAuraRing (US-328): rotating magic circle under boss for dramatic presence
        if (e.enemyType === 'boss') {
          ctx.save();
          var bossHpRatio = e.hp / e.maxHp;
          var bossCircleColor = bossHpRatio > 0.6 ? '#0f0' : (bossHpRatio > 0.3 ? '#ff0' : '#f00');
          ctx.globalAlpha = 0.25 + Math.sin(gameTime * 3) * 0.1;
          ctx.strokeStyle = bossCircleColor; ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.translate(e.x, e.y);
          ctx.rotate(gameTime * 1.5); // bossAuraRing: rotation
          ctx.beginPath(); ctx.arc(0, 0, e.radius * 2.2, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        // Boss crown / mini-boss skull — drawn shapes
        if (e.enemyType === 'boss') {
          var crY = e.y - e.radius - 12;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.moveTo(e.x - 8, crY + 4); ctx.lineTo(e.x - 8, crY - 2);
          ctx.lineTo(e.x - 5, crY + 1); ctx.lineTo(e.x - 2, crY - 5);
          ctx.lineTo(e.x, crY); ctx.lineTo(e.x + 2, crY - 5);
          ctx.lineTo(e.x + 5, crY + 1); ctx.lineTo(e.x + 8, crY - 2);
          ctx.lineTo(e.x + 8, crY + 4);
          ctx.closePath(); ctx.fill();
          // Crown gems
          ctx.fillStyle = '#f44';
          ctx.beginPath(); ctx.arc(e.x, crY - 3, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#44f';
          ctx.beginPath(); ctx.arc(e.x - 4, crY - 1, 1, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.x + 4, crY - 1, 1, 0, Math.PI * 2); ctx.fill();
        }
        if (e.miniBoss) {
          var skY = e.y - e.radius - 10;
          ctx.fillStyle = '#f4a';
          ctx.beginPath(); ctx.arc(e.x, skY, 5, 0, Math.PI * 2); ctx.fill();
          // Eye sockets
          ctx.fillStyle = '#200';
          ctx.beginPath(); ctx.arc(e.x - 2, skY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e.x + 2, skY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
          // Nose
          ctx.beginPath(); ctx.moveTo(e.x, skY); ctx.lineTo(e.x - 0.8, skY + 1.5); ctx.lineTo(e.x + 0.8, skY + 1.5); ctx.closePath(); ctx.fill();
        }
      }
      // ldoe-overhaul-01: removed e.type==='projectile' draw branch (160 dead lines).
      // Real projectiles flow through offlineSkillFx (push site ~4963, draw below).
    }

    // Enemy projectiles (US-197) — spiky dark-violet menacing orb (visually distinct from player's clean bright projectiles)
    for (var epi = 0; epi < enemyProjectiles.length; epi++) {
      var ep = enemyProjectiles[epi];
      var _epSpin = gameTime * 6 + epi;
      // Outer dark haze
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#4a0066';
      ctx.beginPath(); ctx.arc(ep.x, ep.y, ep.radius * 2.6, 0, Math.PI * 2); ctx.fill();
      // Spiky star body (8 points, rotating)
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8a1aff';
      ctx.strokeStyle = '#2a0040';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var _sp = 0; _sp < 16; _sp++) {
        var _spA = _epSpin + _sp * Math.PI / 8;
        var _spR = (_sp % 2 === 0) ? ep.radius * 1.6 : ep.radius * 0.9;
        var _spX = ep.x + Math.cos(_spA) * _spR;
        var _spY = ep.y + Math.sin(_spA) * _spR;
        if (_sp === 0) ctx.moveTo(_spX, _spY); else ctx.lineTo(_spX, _spY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Sickly core (pulsing green)
      var _epPulse = 0.7 + Math.sin(gameTime * 10) * 0.3;
      ctx.fillStyle = '#00ff88';
      ctx.beginPath(); ctx.arc(ep.x, ep.y, ep.radius * 0.45 * _epPulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#220044';
      ctx.beginPath(); ctx.arc(ep.x, ep.y, ep.radius * 0.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Player glow aura (fury = red pulsing)
    var isFury = player._furyBonus > 1;
    var rageAlpha = isFury ? 0.25 + Math.sin(gameTime * 8) * 0.1 : 0;
    var glowAlpha = 0.12 + Math.sin(gameTime * 3) * 0.05 + rageAlpha;
    ctx.globalAlpha = glowAlpha;
    var furyColor = isFury ? '#f44' : (player.shieldActive ? '#88f' : '#4488ff');
    // Experiment F: synergy aura tint overrides plain aura when active
    if (player._synergyActive && player._synergyColor) furyColor = player._synergyColor;
    var _pr = Math.max(1, player.radius || 1);
    var grad = ctx.createRadialGradient(player.x, player.y, _pr, player.x, player.y, _pr * 3);
    grad.addColorStop(0, furyColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Fury particles
    if (isFury && Math.random() < 0.3) {
      emit(player.x + (Math.random() - 0.5) * 20, player.y + (Math.random() - 0.5) * 20, '#f44', 2, 15);
    }
    // Auto-aim indicator (US-224): aimLine to nearest enemy
    if (aimLine.active) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(aimLine.targetX, aimLine.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // streakFlameAura (US-288): fire particles around player during high kill streaks
    if (killStreak >= 15) {
      var flameIntensity = Math.min(1, (killStreak - 15) / 35); // 0 at 15, 1 at 50
      var flameColor = killStreak >= 30 ? '#48f' : '#f84'; // blue flame at 30+
      var streakFlameCount = 2 + Math.floor(flameIntensity * 4);
      for (var sfi = 0; sfi < streakFlameCount; sfi++) {
        var sfAngle = Math.PI * 2 * sfi / streakFlameCount + gameTime * 3;
        var sfDist = player.radius * (1.5 + Math.sin(gameTime * 5 + sfi) * 0.5);
        var sfx = player.x + Math.cos(sfAngle) * sfDist;
        var sfy = player.y + Math.sin(sfAngle) * sfDist;
        ctx.globalAlpha = 0.4 + flameIntensity * 0.3;
        ctx.fillStyle = flameColor;
        ctx.beginPath(); ctx.arc(sfx, sfy, 2 + flameIntensity * 3, 0, Math.PI * 2); ctx.fill();
      }
      // Outer flame glow ring
      ctx.globalAlpha = 0.1 + flameIntensity * 0.15;
      ctx.fillStyle = flameColor;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 3, 0, Math.PI * 2); ctx.fill();
    }
    // playerPowerGlow (US-309): level-based aura that scales with player level
    var levelGlow = Math.min(1, playerLevel / 20); // 0 at Lv1, 1 at Lv20
    var powerAuraRadius = player.radius * (2.5 + levelGlow * 2); // 2.5x → 4.5x
    var powerHue = levelGlow < 0.3 ? 220 : (levelGlow < 0.7 ? 270 : 45); // blue → purple → gold
    ctx.globalAlpha = 0.06 + levelGlow * 0.08;
    ctx.fillStyle = 'hsl(' + powerHue + ',70%,60%)';
    ctx.beginPath(); ctx.arc(player.x, player.y, powerAuraRadius, 0, Math.PI * 2); ctx.fill();
    if (levelGlow > 0.5) {
      // Second outer ring for high level
      ctx.globalAlpha = 0.03 + (levelGlow - 0.5) * 0.06;
      ctx.beginPath(); ctx.arc(player.x, player.y, powerAuraRadius * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // powerSurgeEffect (US-312): flash ring when picking a skill
    if (powerSurgeEffect.active) {
      powerSurgeEffect.timer -= 0.016;
      if (powerSurgeEffect.timer <= 0) powerSurgeEffect.active = false;
      var surgeProgress = 1 - powerSurgeEffect.timer / powerSurgeEffect.duration;
      var surgeRadius = player.radius + surgeProgress * 100;
      ctx.globalAlpha = (1 - surgeProgress) * 0.4;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(player.x, player.y, surgeRadius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = (1 - surgeProgress) * 0.15;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }

    // playerGlowAura — outer glow ring for visual presence (US-270 playerDetail)
    var playerGlowAura = isFury ? 'rgba(255,80,80,0.15)' : (player.shieldActive ? 'rgba(128,128,255,0.15)' : 'rgba(68,136,255,0.12)');
    ctx.globalAlpha = 0.4 + Math.sin(gameTime * 3) * 0.15;
    ctx.fillStyle = playerGlowAura;
    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Shield glow
    if (player.shieldActive) {
      ctx.strokeStyle = '#aaf'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + Math.sin(gameTime * 4) * 0.2;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    // HERO MARKER — rotating arcane ring under player's feet (unique to player, never on enemies)
    ctx.save();
    var _heroRingR = player.radius * 1.35;
    var _heroRingY = player.y + player.radius * 0.55;
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -gameTime * 18;
    ctx.beginPath(); ctx.ellipse(player.x, _heroRingY, _heroRingR, _heroRingR * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Inner filled disc (softer cyan)
    ctx.globalAlpha = 0.18 + Math.sin(gameTime * 2.5) * 0.06;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.ellipse(player.x, _heroRingY, _heroRingR * 0.8, _heroRingR * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Character sprite — class-specific visual
    var localFacing = Math.atan2((mouseY + cameraY) - player.y, (mouseX + cameraX) - player.x);
    // Walk/idle detection from frame-to-frame position delta
    if (player._spriteLastPos == null) player._spriteLastPos = { x: player.x, y: player.y, t: gameTime };
    var _pdx = player.x - player._spriteLastPos.x;
    var _pdy = player.y - player._spriteLastPos.y;
    var _pMoving = (_pdx * _pdx + _pdy * _pdy) > 0.04; // ~0.2px threshold
    player._spriteLastPos.x = player.x; player._spriteLastPos.y = player.y; player._spriteLastPos.t = gameTime;
    // Plan C (PM 2026-04-11): movement interrupts attack animation
    var _pAnimState, _pAnimTime = 0;
    if (_pMoving) {
      _pAnimState = 'walk';
      player._attackUntil = 0; // cancel in-flight attack visual
    } else if (player._attackUntil && gameTime < player._attackUntil) {
      _pAnimState = 'attack';
      _pAnimTime = gameTime - (player._attackStart || gameTime);
    } else {
      _pAnimState = 'idle';
    }
    if (player._forceAnimState) _pAnimState = player._forceAnimState; // __spriteDebug override
    if (!player._spriteDebugFrame) player._spriteDebugFrame = {};
    // Face movement while walking, locked attack direction while attacking, cursor while idle
    var _pAnimFacing = _pMoving ? Math.atan2(_pdy, _pdx)
                     : (_pAnimState === 'attack' && player._attackFacing != null) ? player._attackFacing
                     : localFacing;
    // Round 5d F3 + R5e F2 — spawn-shield halo, alpha tracks graduated decay
    var _ssAlpha = _spawnShieldAlpha(gameTime);
    if (_ssAlpha > 0.02) {
      var _shieldPulse = 0.7 + 0.3 * Math.sin(gameTime * 6);
      ctx.save();
      ctx.globalAlpha = 0.45 * _ssAlpha * _shieldPulse;
      var _shGrad = ctx.createRadialGradient(player.x, player.y, player.radius * 0.4, player.x, player.y, player.radius * 1.6);
      _shGrad.addColorStop(0, 'rgba(255,220,140,0.0)');
      _shGrad.addColorStop(0.6, 'rgba(255,215,120,0.55)');
      _shGrad.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = _shGrad;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 1.6, 0, Math.PI * 2); ctx.fill();
      // Outer ring
      ctx.strokeStyle = '#ffd060';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7 * _ssAlpha * _shieldPulse;
      ctx.beginPath(); ctx.arc(player.x, player.y, player.radius * 1.4, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Round 5e F3 — 圣堂之主 crown halo for the player who slew the altar
    if (player._templeMasterUntil && gameTime < player._templeMasterUntil) {
      var _tmPulse = 0.65 + 0.35 * Math.sin((gameTime || 0) * 4);
      ctx.save();
      ctx.globalAlpha = 0.55 * _tmPulse;
      var _tmGrad = ctx.createRadialGradient(player.x, player.y - player.radius * 0.8, 4, player.x, player.y - player.radius * 0.8, player.radius * 0.9);
      _tmGrad.addColorStop(0, 'rgba(255,255,200,0.95)');
      _tmGrad.addColorStop(0.6, 'rgba(255,200,80,0.4)');
      _tmGrad.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = _tmGrad;
      ctx.beginPath(); ctx.arc(player.x, player.y - player.radius * 0.8, player.radius * 0.9, 0, Math.PI * 2); ctx.fill();
      // Tiny crown above the halo
      ctx.fillStyle = '#ffd060';
      ctx.globalAlpha = 0.85 * _tmPulse;
      var _crX = player.x, _crY = player.y - player.radius * 1.6;
      ctx.beginPath();
      ctx.moveTo(_crX - 14, _crY + 10);
      ctx.lineTo(_crX - 10, _crY);
      ctx.lineTo(_crX - 5,  _crY + 6);
      ctx.lineTo(_crX,      _crY - 4);
      ctx.lineTo(_crX + 5,  _crY + 6);
      ctx.lineTo(_crX + 10, _crY);
      ctx.lineTo(_crX + 14, _crY + 10);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    // R5n F2 + R5q F2 — assassin 开局隐身 semi-transparent. Direct globalAlpha
    // prop write (cheaper than ctx.save / ctx.restore which saves full state).
    var _invisActive = !!(player._invisibleUntil && gameTime < player._invisibleUntil);
    if (_invisActive) ctx.globalAlpha = 0.35;
    drawCharacterSprite(player.x, player.y, player.radius, player.playerClass || selectedClass, _pAnimFacing, {
      fury: isFury, shield: player.shieldActive, skinId: equippedSkin,
      animState: _pAnimState, animTime: _pAnimTime,
      _debugOut: player._spriteDebugFrame
    });
    if (_invisActive) ctx.globalAlpha = 1;
    player._spriteAnimState = _pAnimState; // exposed for __spriteDebug

    // HERO CROWN — old friendly marker. Disabled by the compact mobile HUD theme.
    if (!(window.KOS_UI && window.KOS_UI.hud && window.KOS_UI.hud.suppressHeroCrown)) (function(){
      var _crownY = player.y - player.radius * 1.9 + Math.sin(gameTime * 2.2) * 1.5;
      var _crownW = player.radius * 0.6;
      var _crownH = player.radius * 0.45;
      ctx.save();
      // Outer glow
      ctx.globalAlpha = 0.4 + Math.sin(gameTime * 3) * 0.15;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(player.x, _crownY + _crownH * 0.3, _crownW * 1.1, 0, Math.PI * 2);
      ctx.fill();
      // Crown body (3-point)
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#8a6a00';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(player.x - _crownW, _crownY + _crownH);
      ctx.lineTo(player.x - _crownW, _crownY + _crownH * 0.35);
      ctx.lineTo(player.x - _crownW * 0.5, _crownY + _crownH * 0.6);
      ctx.lineTo(player.x, _crownY);
      ctx.lineTo(player.x + _crownW * 0.5, _crownY + _crownH * 0.6);
      ctx.lineTo(player.x + _crownW, _crownY + _crownH * 0.35);
      ctx.lineTo(player.x + _crownW, _crownY + _crownH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Gem dots
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.arc(player.x, _crownY + _crownH * 0.55, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4dd2ff';
      ctx.beginPath(); ctx.arc(player.x - _crownW * 0.65, _crownY + _crownH * 0.75, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(player.x + _crownW * 0.65, _crownY + _crownH * 0.75, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    })();

    // localMultiplayer (US-344): draw player2
    if (localMultiplayer && player2 && player2.alive) {
      ctx.fillStyle = '#48f';
      ctx.beginPath(); ctx.arc(player2.x, player2.y, player2.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('P2', player2.x, player2.y);
      ctx.textBaseline = 'alphabetic';
      // P2 HP bar
      ctx.fillStyle = '#300'; ctx.fillRect(player2.x - 15, player2.y - player2.radius - 8, 30, 3);
      ctx.fillStyle = '#4af'; ctx.fillRect(player2.x - 15, player2.y - player2.radius - 8, 30 * (player2.hp / player2.maxHp), 3);
    } else if (localMultiplayer && player2 && !player2.alive) {
      // Show revive countdown
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#48f'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('P2 \u590D\u6D3B: ' + Math.ceil(player2._reviveTimer) + 's', W / 2, H - 30);
      ctx.globalAlpha = 1;
    }

    // orbitRingVisual (US-298): draw orbit ring trail + projectiles
    if (player._orbitCount && player._orbitCount > 0) {
      var drawOrbitR = 80;
      // Ring trail line
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#4af';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(player.x, player.y, drawOrbitR, 0, Math.PI * 2); ctx.stroke();
      // Secondary glow ring
      ctx.globalAlpha = 0.06;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
      for (var oi = 0; oi < player._orbitCount; oi++) {
        var _orbitAngle = (player._orbitAngle || 0) + (Math.PI * 2 / player._orbitCount) * oi;
        var orbX = player.x + Math.cos(_orbitAngle) * drawOrbitR;
        var orbY = player.y + Math.sin(_orbitAngle) * drawOrbitR;
        // Glow
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#4af';
        ctx.beginPath(); ctx.arc(orbX, orbY, 12, 0, Math.PI * 2); ctx.fill();
        // Core
        ctx.globalAlpha = 1; ctx.fillStyle = '#8cf';
        ctx.beginPath(); ctx.arc(orbX, orbY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(orbX, orbY, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Draw other players (multiPlayerRender US-004)
    for (var bpi = 1; bpi < allPlayers.length; bpi++) {
      var bp = allPlayers[bpi];
      if (!bp.alive) continue;
      var isEnemy = bp.factionId !== player.factionId;
      // Outer glow ring — red for enemies, green for allies
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = isEnemy ? '#f44' : '#4f4';
      ctx.lineWidth = isEnemy ? 3 : 2;
      ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.radius + 4, 0, Math.PI * 2); ctx.stroke();
      // Enemy indicator triangle above name
      if (isEnemy) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#f44';
        ctx.beginPath();
        ctx.moveTo(bp.x, bp.y - bp.radius - 24);
        ctx.lineTo(bp.x - 5, bp.y - bp.radius - 18);
        ctx.lineTo(bp.x + 5, bp.y - bp.radius - 18);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      var bpAngle = bp.facingAngle || 0;
      if (bp._prevX == null) { bp._prevX = bp.x; bp._prevY = bp.y; }
      var _bdx = bp.x - bp._prevX, _bdy = bp.y - bp._prevY;
      var _bMoving = (_bdx * _bdx + _bdy * _bdy) > 0.04;
      bp._prevX = bp.x; bp._prevY = bp.y;
      if (_bMoving) bpAngle = Math.atan2(_bdy, _bdx);
      // R5h F3 + R5i + R5j: slow aura under hostile bots. Cached frame flag.
      if (_slowActiveFrame && _slowSrcFrame && bp.factionId !== player.factionId) {
        var _bsx = bp.x - cameraX, _bsy = bp.y - cameraY;
        if (_bsx > -80 && _bsx < W + 80 && _bsy > -80 && _bsy < H + 80) {
          var _slowBSz = R5H_FX.slowAura.size * Math.max(1, bp.radius / 24);
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.drawImage(_slowSrcFrame, bp.x - _slowBSz / 2, bp.y - _slowBSz / 2 + 12, _slowBSz, _slowBSz);
          ctx.restore();
        }
      }
      // Round 5 N: nemesis burning aura — drawn UNDER the character sprite.
      // SVG has built-in pulse/rotate animations; we just blit.
      if (rivalState.nemesisId === bp.factionId && COMBAT_FX.nemesisAura.ready) {
        var _auraSz = COMBAT_FX.nemesisAura.size;
        ctx.drawImage(COMBAT_FX.nemesisAura.img,
          bp.x - COMBAT_FX.nemesisAura.anchorX,
          bp.y - COMBAT_FX.nemesisAura.anchorY + 8,
          _auraSz, _auraSz);
      }
      drawCharacterSprite(bp.x, bp.y, bp.radius, bp.characterType || 'warrior', bpAngle, {
        isBot: true, color: bp.color || '#f44', shield: bp.shieldActive, skinId: bp.skinId || 'default',
        animState: _bMoving ? 'walk' : 'idle'
      });
      // Experiment H (round 3): rival / nemesis art pack — PNG ring + badge.
      var _rivAlive = (rivalState && rivalState.botId != null && rivalState.botId >= 0);
      var _nemAlive = (rivalState && rivalState.nemesisId != null && rivalState.nemesisId >= 0);
      var _isRival = _rivAlive && rivalState.botId === bp.factionId;
      var _isNemesis = _nemAlive && rivalState.nemesisId === bp.factionId;
      if (_isRival || _isNemesis) {
        var _hz = _isNemesis ? 0.8 : 1.0;
        var _phase = Math.sin(gameTime * Math.PI * _hz);
        var _ringScale = _isNemesis ? (1 + 0.10 * (_phase * 0.5 + 0.5))
                                    : (1 + 0.075 * (_phase * 0.5 + 0.5));
        var _ringAlpha = 0.55 + 0.30 * (_phase * 0.5 + 0.5);
        var _rCol = _isNemesis ? '#c490e8' : '#ff4040';
        var _ringEntry = _isNemesis ? R3_ART.nemesisRing : R3_ART.rivalRing;
        var _badgeEntry = _isNemesis ? R3_ART.nemesisBadge : R3_ART.rivalBadge;
        ctx.save();
        if (_ringEntry.ready) {
          var _rs = 80 * _ringScale * (bp.radius / 28);
          ctx.globalAlpha = _ringAlpha;
          ctx.drawImage(_ringEntry.img, bp.x - _rs / 2, bp.y - _rs / 2, _rs, _rs);
        } else {
          ctx.globalAlpha = _ringAlpha;
          ctx.strokeStyle = _rCol; ctx.lineWidth = 5;
          ctx.setLineDash([7, 5]);
          ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.radius + 16 * _ringScale, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        // Red triangle ⚠ indicator + label above head (round 3 Leo spec)
        ctx.globalAlpha = 0.7 + 0.3 * (_phase * 0.5 + 0.5);
        var _triY = bp.y - bp.radius - 30;
        ctx.fillStyle = _rCol;
        ctx.beginPath();
        ctx.moveTo(bp.x, _triY);
        ctx.lineTo(bp.x - 8, _triY + 10);
        ctx.lineTo(bp.x + 8, _triY + 10);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', bp.x, _triY + 6);
        ctx.textBaseline = 'alphabetic';
        // PNG badge next to triangle
        var _by = bp.y - bp.radius - 52;
        if (_badgeEntry.ready) {
          ctx.globalAlpha = 0.6 + 0.4 * (_phase * 0.5 + 0.5);
          ctx.drawImage(_badgeEntry.img, bp.x - 12, _by - 8, 24, 24);
        }
        // Label
        ctx.globalAlpha = 1;
        var _badgeTxt = _isNemesis ? 'NEMESIS' : 'RIVAL';
        ctx.font = 'bold 11px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
        var _bw = ctx.measureText(_badgeTxt).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(bp.x - _bw / 2, _by + 18, _bw, 14);
        ctx.strokeStyle = _rCol; ctx.lineWidth = 1.5;
        ctx.strokeRect(bp.x - _bw / 2, _by + 18, _bw, 14);
        ctx.fillStyle = _rCol;
        ctx.textAlign = 'center';
        ctx.fillText(_badgeTxt, bp.x, _by + 29);
        ctx.restore();
      }
      // Name + archetype + level. Archetype tag uses its own color so
      // the playstyle is readable at a glance (Testor 2026-04-19 feedback).
      ctx.font = 'bold 12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'center';
      var _bpLabel = bp.name + ' L' + (bp.level || 1);
      ctx.fillStyle = isEnemy ? '#f88' : '#fff';
      ctx.fillText(_bpLabel, bp.x, bp.y - bp.radius - 24);
      if (bp.archetypeName) {
        var _archIcon = bp.archetype && ARCHETYPE_ICONS[bp.archetype];
        ctx.font = 'bold 10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        var _archText = '[' + bp.archetypeName + ']';
        var _archTextW = ctx.measureText(_archText).width;
        var _archIconSize = 18;
        var _archTotalW = (_archIcon && _archIcon.ready ? _archIconSize + 3 : 0) + _archTextW;
        var _archStartX = bp.x - _archTotalW / 2;
        var _archY = bp.y - bp.radius - 12;
        // Icon first (if loaded)
        if (_archIcon && _archIcon.ready) {
          ctx.drawImage(_archIcon.img, _archStartX, _archY - _archIconSize / 2 - 3, _archIconSize, _archIconSize);
          _archStartX += _archIconSize + 3;
        }
        // Text aligned to remaining width
        ctx.textAlign = 'left';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 2.5;
        ctx.strokeText(_archText, _archStartX, _archY);
        ctx.fillStyle = bp.archetypeColor || '#ffd700';
        ctx.fillText(_archText, _archStartX, _archY);
        ctx.textAlign = 'center';
      }
      // HP bar
      var botBarW = 34;
      ctx.fillStyle = '#222'; ctx.fillRect(bp.x - botBarW/2, bp.y - bp.radius - 8, botBarW, 4);
      var botHpR = Math.max(0, bp.hp / bp.maxHp);
      ctx.fillStyle = isEnemy ? '#f44' : '#0c0';
      ctx.fillRect(bp.x - botBarW/2, bp.y - bp.radius - 8, botBarW * botHpR, 4);
    }

    // HP bar — scaled for mobile visibility
    var barW = 80, barH = 10;
    var barY = player.y - player.radius - 13;
    ctx.fillStyle = '#111'; ctx.fillRect(player.x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#300'; ctx.fillRect(player.x - barW / 2, barY, barW, barH);
    var hpRatio = Math.max(0, player.hp / player.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#0c0' : hpRatio > 0.25 ? '#fa0' : '#f44';
    ctx.fillRect(player.x - barW / 2, barY, barW * hpRatio, barH);

    // Draw storm zone visual
    if (stormZone.active) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#f22';
      // Draw the danger zone (outside the circle)
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(stormZone.centerX, stormZone.centerY, stormZone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
      // Storm circle border
      ctx.strokeStyle = '#f44'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(stormZone.centerX, stormZone.centerY, stormZone.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // end camera transform

    // XP bar — thin strip right above the bottom bar (between middle and bottom zones)
    var xpNeeded = xpToNextLevel > 0 ? xpToNextLevel : 100;
    var xpRatio = Math.min(1, playerXP / xpNeeded);
    var _xpBarY = Math.round(H * 0.90) - 4;
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, _xpBarY, W, 4);
    var xpGrad = ctx.createLinearGradient(0, _xpBarY, W, _xpBarY);
    xpGrad.addColorStop(0, '#44ccff'); xpGrad.addColorStop(0.5, '#55dd66'); xpGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = xpGrad; ctx.fillRect(0, _xpBarY, W * xpRatio, 4);

    // dynamicMusicCue (US-307): visual rhythm pulse on screen edges
    var beatPhase = dynamicMusicCue.beatTimer / (60 / dynamicMusicCue.bpm);
    var beatPulse = Math.max(0, 1 - beatPhase * 4); // sharp pulse at beat start
    if (dynamicMusicCue.intensity > 0.3 && beatPulse > 0) {
      var bpmColor = player.hp < player.maxHp * 0.3 ? 'rgba(255,0,0,' : 'rgba(255,200,0,';
      ctx.fillStyle = bpmColor + (beatPulse * dynamicMusicCue.intensity * 0.15) + ')';
      ctx.fillRect(0, 0, 8, H); ctx.fillRect(W - 8, 0, 8, H); // edge pulse strips
      ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4);
    }

    // screenshotMode (US-306): skip HUD when in screenshot mode
    if (screenshotMode) { /* skip all HUD text in screenshot mode */ } else {

    // === 3-ZONE HUD (reference: capsule-style top + big rounded buttons bottom) ===
    var _hudCfg = (window.KOS_UI && window.KOS_UI.hud) || {};
    var _zs = Math.min(W / 400, H / 700) * (_hudCfg.scale || 1);
    var _fs = Math.max(11, Math.round(15 * _zs));
    var _fsSmall = Math.max(9, Math.round(12 * _zs));
    var _fsBold = Math.max(13, Math.round(17 * _zs));
    var topH = Math.round(H * (_hudCfg.topHeightRatio || 0.105));
    var botH = Math.round(H * (_hudCfg.bottomHeightRatio || 0.10));
    var botY = H - botH;
    var hudCls = CLASS_DEFS[selectedClass] || CLASS_DEFS.warrior || { color: '#4af', icon: '★' };
    var padX = Math.round(8 * _zs);
    var rowY1 = Math.round(topH * 0.30); // upper row
    var rowY2 = Math.round(topH * 0.72); // lower row
    var capH = Math.round(topH * 0.38);

    // ──── TOP BAR (15%) — 50% opacity, consistent tone with bottom bar ────
    ctx.save();
    // 50% alpha gradient with same tone as bottom bar (#14142a → #0a0a1a)
    var topAlpha = _hudCfg.compactTopStats ? 0.34 : 0.5;
    var topGrad = ctx.createLinearGradient(0, 0, 0, topH);
    topGrad.addColorStop(0, 'rgba(20,20,42,' + topAlpha + ')');
    topGrad.addColorStop(1, 'rgba(10,10,26,' + topAlpha + ')');
    ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, topH);
    // Gold bottom edge divider
    ctx.fillStyle = _hudCfg.compactTopStats ? 'rgba(255,215,0,0.55)' : '#ffd700'; ctx.fillRect(0, topH - 2, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, topH, W, 1);

    // ═══ LEFT: Avatar (1/2 size) + Name + Level — combined unit ═══
    var avR = Math.round(topH * 0.18); // half of previous 0.30
    var avCx = padX + avR, avCy = Math.round(topH * 0.50);
    ctx.save();
    ctx.shadowColor = hudCls.color; ctx.shadowBlur = 5 * _zs;
    ctx.strokeStyle = hudCls.color; ctx.lineWidth = Math.max(1.5, 2 * _zs);
    ctx.beginPath(); ctx.arc(avCx, avCy, avR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#0a0a1a';
    ctx.beginPath(); ctx.arc(avCx, avCy, avR - 1.5, 0, Math.PI * 2); ctx.fill();
    if (typeof drawCharacterSprite === 'function') {
      ctx.save();
      ctx.beginPath(); ctx.arc(avCx, avCy + 1, avR - 3, 0, Math.PI * 2); ctx.clip();
      drawCharacterSprite(avCx, avCy + Math.round(3 * _zs), Math.round(avR * 0.85), selectedClass, Math.PI * 1.5, { skinId: equippedSkin || 'default', animState: 'idle' });
      ctx.restore();
    }
    // Name + Level + Gold text block to the right of avatar (all merged left)
    var nameX = avCx + avR + Math.round(6 * _zs);
    var playerName = (_currentPlayer && _currentPlayer.nickname) || (player && player.name) || '玩家';
    if (playerName.length > 8) playerName = playerName.substring(0, 7) + '…';
    // Name (top line)
    ctx.font = 'bold ' + _fs + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2.5;
    ctx.strokeText(playerName, nameX, avCy - Math.round(8 * _zs));
    ctx.fillStyle = '#fff';
    ctx.fillText(playerName, nameX, avCy - Math.round(8 * _zs));
    // Bottom line: Lv + gold combined
    ctx.font = 'bold ' + _fsSmall + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 2;
    var lvGoldStr = _hudCfg.compactTopStats ? ('Lv.' + playerLevel + '  金' + gold) : ('Lv.' + playerLevel + '  💰' + gold);
    ctx.strokeText(lvGoldStr, nameX, avCy + Math.round(8 * _zs));
    ctx.fillText(lvGoldStr, nameX, avCy + Math.round(8 * _zs));
    ctx.textBaseline = 'alphabetic';

    // Measure right side reserved space: minimap
    var _miniW = Math.min(Math.round(80 * _zs * (_hudCfg.minimapScale || 1)), topH - Math.round(8 * _zs));
    // Measure the width of the name+level+gold block to start center after it
    ctx.font = 'bold ' + _fs + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    var nameW = ctx.measureText(playerName).width;
    ctx.font = 'bold ' + _fsSmall + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    var lvGoldW = ctx.measureText(lvGoldStr).width;
    var leftBlockRight = nameX + Math.max(nameW, lvGoldW) + Math.round(10 * _zs);
    var centerLeft = leftBlockRight;
    var centerRight = W - _miniW - Math.round(10 * _zs);
    var centerW = Math.max(100, centerRight - centerLeft);
    if (_hudCfg.compactTopStats) {
      var statusMaxW = Math.max(Math.round(150 * _zs), Math.round(W * (_hudCfg.statusMaxWidthRatio || 0.34)));
      centerW = Math.min(centerW, statusMaxW);
      centerRight = centerLeft + centerW;
    }

    // ═══ CENTER: single status capsule (wave + kills + time) + HP bar ═══
    var cellY1 = Math.round(topH * 0.10);
    var cellY2 = Math.round(topH * 0.52);
    var capRoundH = Math.round(topH * 0.34);
    ctx.save();
    var _drawCapsule = function(bx, by, bw, bh, fillColor, strokeColor) {
      var rr = bh / 2;
      ctx.beginPath();
      ctx.moveTo(bx + rr, by);
      ctx.lineTo(bx + bw - rr, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + rr, rr);
      ctx.lineTo(bx + bw, by + bh - rr);
      ctx.arcTo(bx + bw, by + bh, bx + bw - rr, by + bh, rr);
      ctx.lineTo(bx + rr, by + bh);
      ctx.arcTo(bx, by + bh, bx, by + bh - rr, rr);
      ctx.lineTo(bx, by + rr);
      ctx.arcTo(bx, by, bx + rr, by, rr);
      ctx.closePath();
      if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
      if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 1.5; ctx.stroke(); }
    };
    // Status capsule spans full center width
    _drawCapsule(centerLeft, cellY1, centerW, capRoundH, 'rgba(20,20,35,0.92)', '#88ccff');
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + _fs + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // BR HUD: alive count is the headline stat (was PVE "第X波")
    var _aliveCount = 0;
    if (offlineMode) {
      if (player && player.alive !== false) _aliveCount++;
      if (offlineBots) for (var _ac = 0; _ac < offlineBots.length; _ac++) if (offlineBots[_ac].alive) _aliveCount++;
    } else {
      _aliveCount = allPlayers ? allPlayers.filter(function(p){ return p.alive; }).length : 0;
    }
    var statusText = _hudCfg.compactTopStats
      ? (_aliveCount + '存  ' + kills + '杀  ' + Math.floor(gameTime) + 's')
      : ('剩余 ' + _aliveCount + ' 人  ⚔' + kills + '  ⏱' + Math.floor(gameTime) + 's');
    ctx.fillText(statusText, centerLeft + centerW / 2, cellY1 + capRoundH / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();

    // --- HP bar (bottom row of center, same width as status capsule) ---
    var hpX = centerLeft;
    var hpW = centerW;
    if (_hudCfg.compactTopStats) {
      hpW = Math.min(hpW, Math.max(Math.round(140 * _zs), Math.round(W * (_hudCfg.hpMaxWidthRatio || 0.28))));
    }
    var hpBarH = Math.round(topH * 0.22);
    var hpY = cellY2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(hpX - 1, hpY - 1, hpW + 2, hpBarH + 2);
    ctx.fillStyle = '#2a0606'; ctx.fillRect(hpX, hpY, hpW, hpBarH);
    var hpRatioHUD = Math.max(0, player.hp / player.maxHp);
    var hpGrad = ctx.createLinearGradient(hpX, hpY, hpX, hpY + hpBarH);
    if (hpRatioHUD > 0.5) { hpGrad.addColorStop(0, '#88ff66'); hpGrad.addColorStop(1, '#2a8a1a'); }
    else if (hpRatioHUD > 0.25) { hpGrad.addColorStop(0, '#ffd060'); hpGrad.addColorStop(1, '#a86000'); }
    else { hpGrad.addColorStop(0, '#ff6050'); hpGrad.addColorStop(1, '#801010'); }
    ctx.fillStyle = hpGrad; ctx.fillRect(hpX, hpY, hpW * hpRatioHUD, hpBarH);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(hpX, hpY + 1, hpW * hpRatioHUD, hpBarH * 0.4);
    ctx.strokeStyle = '#442a1a'; ctx.lineWidth = 1; ctx.strokeRect(hpX, hpY, hpW, hpBarH);
    // HP text centered on bar
    ctx.font = 'bold ' + _fsSmall + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var hpStr = _hudCfg.compactTopStats
      ? (Math.floor(player.hp) + '/' + player.maxHp)
      : ('❤ ' + Math.floor(player.hp) + ' / ' + player.maxHp);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2;
    ctx.strokeText(hpStr, hpX + hpW / 2, hpY + hpBarH / 2);
    ctx.fillStyle = '#fff'; ctx.fillText(hpStr, hpX + hpW / 2, hpY + hpBarH / 2);
    ctx.textBaseline = 'alphabetic';

    // Kill streak (only if active, overlay on top)
    if (killStreak >= 5) {
      ctx.fillStyle = killStreak >= 30 ? '#f00' : killStreak >= 15 ? '#f80' : '#ff0';
      ctx.font = 'bold ' + _fsBold + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(killStreak + '连杀!', W - padX - _miniW - Math.round(10 * _zs), Math.round(topH * 0.45));
    }
    ctx.restore();

    // ──── BOTTOM BAR (10%) — solid opaque, zero game overlap ────
    ctx.save();
    var botGrad = ctx.createLinearGradient(0, botY, 0, H);
    botGrad.addColorStop(0, '#0a0a1a');
    botGrad.addColorStop(1, '#14142a');
    ctx.fillStyle = botGrad; ctx.fillRect(0, botY, W, botH);
    // Gold top edge divider
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, botY - 1, W, 1);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(0, botY, W, 2);

    // Layout: [闪避] [技能1...技能5] [大招] with Chinese labels below each
    var buildSkills = selectedBuild && selectedBuild.length > 0 ? selectedBuild : [];
    var skillCount = Math.min(buildSkills.length, 5);
    var totalBtns = skillCount + 2; // skills + dodge + ult
    var btnSize = Math.round(Math.min(botH * 0.60, (W - padX * 2) / totalBtns * 0.82));
    var btnGap = Math.round((W - padX * 2 - totalBtns * btnSize) / (totalBtns + 1));
    var btnY = botY + Math.round(botH * 0.10);
    var labelY = btnY + btnSize + Math.round(12 * _zs);

    function _drawRoundBtn(bx, by, sz, bgColor, borderColor, iconChar, label, fraction) {
      // Rounded square golden button (reference style)
      var rad = Math.round(sz * 0.22);
      ctx.save();
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
      // Button fill
      var grad = ctx.createLinearGradient(bx, by, bx, by + sz);
      grad.addColorStop(0, bgColor.light);
      grad.addColorStop(1, bgColor.dark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx + rad, by);
      ctx.arcTo(bx + sz, by, bx + sz, by + sz, rad);
      ctx.arcTo(bx + sz, by + sz, bx, by + sz, rad);
      ctx.arcTo(bx, by + sz, bx, by, rad);
      ctx.arcTo(bx, by, bx + sz, by, rad);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Border
      ctx.strokeStyle = borderColor; ctx.lineWidth = Math.max(1.5, 2 * _zs);
      ctx.beginPath();
      ctx.moveTo(bx + rad, by);
      ctx.arcTo(bx + sz, by, bx + sz, by + sz, rad);
      ctx.arcTo(bx + sz, by + sz, bx, by + sz, rad);
      ctx.arcTo(bx, by + sz, bx, by, rad);
      ctx.arcTo(bx, by, bx + sz, by, rad);
      ctx.closePath();
      ctx.stroke();
      // Cooldown darken
      if (fraction !== undefined && fraction < 1) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#000';
        var coverH = sz * (1 - fraction);
        ctx.fillRect(bx, by, sz, coverH);
        ctx.restore();
      }
      // Icon
      ctx.fillStyle = '#fff'; ctx.font = Math.round(sz * 0.55) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(iconChar, bx + sz / 2, by + sz / 2);
      ctx.textBaseline = 'alphabetic';
      // Label below
      if (label) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold ' + _fsSmall + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2;
        ctx.strokeText(label, bx + sz / 2, labelY);
        ctx.fillText(label, bx + sz / 2, labelY);
      }
    }

    // Button palettes
    var dodgeReady = player._dodgeCooldown <= 0;
    var dodgeColors = dodgeReady
      ? { light: '#5ab8ff', dark: '#1e5aaa' }
      : { light: '#4a4a5a', dark: '#1a1a2a' };
    var ultColors = ultReady
      ? { light: '#ffe060', dark: '#a07010' }
      : { light: '#4a4a5a', dark: '#1a1a2a' };
    var skillColors = { light: '#7a5cff', dark: '#3a1c7a' };

    // Dodge (leftmost)
    var curX = padX + btnGap;
    var dodgeFraction = dodgeReady ? 1 : (1 - player._dodgeCooldown / dodgeCooldown);
    _drawRoundBtn(curX, btnY, btnSize, dodgeColors, dodgeReady ? '#88c8ff' : '#555', '💨', '闪避', dodgeFraction);
    var dodgeBtnRect = { x: curX, y: btnY, w: btnSize, h: btnSize };
    curX += btnSize + btnGap;

    // Skills
    for (var _bsi = 0; _bsi < skillCount; _bsi++) {
      var _bsid = buildSkills[_bsi];
      var _bsd = SKILL_DATA[_bsid];
      var _bslv = skillLevels[_bsid] || 0;
      var _bsColors = _bslv > 0
        ? { light: _bsd && _bsd.color ? _bsd.color : '#7a5cff', dark: '#1a1a3a' }
        : { light: '#2a2a3a', dark: '#0a0a1a' };
      var _bsIcon = _bsd ? _bsd.icon : '?';
      var _bsLabel = _bsd && _bsd.name ? _bsd.name.substring(0, 4) : '技能';
      if (_bslv > 0) _bsLabel += ' Lv' + _bslv;
      _drawRoundBtn(curX, btnY, btnSize, _bsColors, _bslv > 0 ? '#ffd700' : '#444', _bsIcon, _bsLabel);
      curX += btnSize + btnGap;
    }

    // Ultimate (rightmost)
    var ultFraction = ultReady ? 1 : (ultCharge / ultChargeMax);
    _drawRoundBtn(curX, btnY, btnSize, ultColors, ultReady ? '#fff' : '#555', '⚡', ultReady ? '大招' : '大招', ultFraction);
    var ultBtnRect = { x: curX, y: btnY, w: btnSize, h: btnSize };

    // Store button rects for click handling
    _hudBtnRects = { dodge: dodgeBtnRect, ult: ultBtnRect };
    ctx.restore();

    // MOBA-style skill upgrade bar (right side, middle zone)
    drawSkillBar();

    // waveProgressBar (US-330): thin bar at top showing time until next wave
    var _wpEarly = (currentMap && currentMap.waveIntervalEarly) || 15;
    var _wpMid = (currentMap && currentMap.waveIntervalMid) || 12;
    var _wpLate = (currentMap && currentMap.waveIntervalLate) || 10;
    var waveProgressIv = wave < 4 ? _wpEarly : wave < 8 ? _wpMid : _wpLate;
    var waveProgressRatio = Math.min(1, waveTimer / waveProgressIv);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, W, 3); // nextWaveBar background
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = waveProgressRatio > 0.8 ? '#f44' : (waveProgressRatio > 0.5 ? '#fa0' : '#4af');
    ctx.fillRect(0, 0, W * waveProgressRatio, 3); // waveTimerBar fill
    ctx.globalAlpha = 1;

    // Minimap (US-204)
    // Virtual joystick overlay
    if (state === 'playing') {
      if (joystick.active) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(joystick.baseX, joystick.baseY, joystick.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(joystick.stickX, joystick.stickY, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
      } else {
        var _joyAnchorX = Math.max(joystick.radius + 20, W * 0.1);
        var _joyAnchorY = Math.min(H - joystick.radius - 20, H * 0.85);
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(_joyAnchorX, _joyAnchorY, joystick.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(_joyAnchorX, _joyAnchorY, joystick.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.globalAlpha = 0.5;
        var _joyFS = Math.max(10, Math.round(joystick.radius * 0.2));
        ctx.font = _joyFS + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText('拖拽移动', _joyAnchorX, _joyAnchorY + joystick.radius + _joyFS + 6);
        ctx.restore();
      }
      // R6-control F1 — class active ability button (right-bottom).
      // Mirrors joystick anchor on opposite side. CD: clockwise sweep mask;
      // ready: ~1s breath glow so the state reads even with thumb on it.
      if (player) {
        var _abR = Math.max(60, Math.round(joystick.radius * 1.05));
        var _abX = Math.min(W - _abR - 16, W * 0.9);
        var _abY = Math.min(H - _abR - 20, H * 0.85);
        _abilityBtn = { x: _abX - _abR, y: _abY - _abR, w: _abR * 2, h: _abR * 2, cx: _abX, cy: _abY, r: _abR };
        var _abCls = player.playerClass || selectedClass || 'warrior';
        var _abColor = _abCls === 'mage' ? '#6cc5ff'
                      : _abCls === 'healer' ? '#ffd86b'
                      : _abCls === 'warrior' ? '#ff8866'
                      : _abCls === 'scout' ? '#ff8866'
                      : '#ddddff';
        var _abLabel = _abCls === 'mage' ? '冰冻'
                      : _abCls === 'healer' ? '群疗'
                      : '爆发';
        var _ready = _abilityCdLeft <= 0;
        ctx.save();
        // Breath glow when ready (~1s period, sin-driven alpha+radius wobble).
        if (_ready) {
          var _br = 0.5 + 0.5 * Math.sin(((typeof gameTime !== 'undefined' ? gameTime : 0) + (typeof _dt !== 'undefined' ? 0 : 0)) * Math.PI * 2 / 1.0);
          ctx.globalAlpha = 0.18 + 0.22 * _br;
          ctx.beginPath(); ctx.arc(_abX, _abY, _abR + 6 + 4 * _br, 0, Math.PI * 2);
          ctx.fillStyle = _abColor; ctx.fill();
        }
        // Base disc
        ctx.globalAlpha = _ready ? 0.78 : 0.55;
        ctx.beginPath(); ctx.arc(_abX, _abY, _abR, 0, Math.PI * 2);
        ctx.fillStyle = _ready ? _abColor : '#444';
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 3;
        ctx.strokeStyle = _ready ? '#fff' : '#888';
        ctx.beginPath(); ctx.arc(_abX, _abY, _abR, 0, Math.PI * 2); ctx.stroke();
        // CD overlay — clockwise sweep mask (consumed portion is dark).
        if (!_ready) {
          var _cdRatio = Math.max(0, Math.min(1, _abilityCdLeft / _ABILITY_CD));
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.moveTo(_abX, _abY);
          // Start at 12 o'clock (-PI/2), sweep clockwise by remaining ratio.
          ctx.arc(_abX, _abY, _abR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * _cdRatio);
          ctx.closePath();
          ctx.fill();
          // CD seconds text
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.font = 'bold ' + Math.round(_abR * 0.55) + 'px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(_abilityCdLeft.toFixed(1), _abX, _abY + _abR * 0.2);
        } else {
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.font = 'bold ' + Math.round(_abR * 0.42) + 'px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
          ctx.fillText(_abLabel, _abX, _abY + _abR * 0.15);
        }
        ctx.restore();
      } else {
        _abilityBtn = null;
      }
    }
    // R6-control F1 — fullscreen ability trigger feedback (mage cyan / healer
    // gold ring / warrior+scout red glow). Linear ease-out on alpha.
    if (_abilityFx.active) {
      var _fxR = Math.min(1, _abilityFx.t / Math.max(0.001, _abilityFx.dur));
      var _fxA = 1 - _fxR;
      ctx.save();
      var _abilityOverlayDrawn = window.KOS_RENDER && typeof window.KOS_RENDER.drawAbilityOverlay === 'function' && window.KOS_RENDER.drawAbilityOverlay(ctx, {
        fx: _abilityFx,
        W: W,
        H: H,
        player: player,
        cameraX: cameraX,
        cameraY: cameraY
      });
      if (!_abilityOverlayDrawn && _abilityFx.kind === 'mage') {
        // Cyan tint + ice-shard streaks
        ctx.globalAlpha = 0.45 * _fxA;
        ctx.fillStyle = '#a8e6ff';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 0.8 * _fxA;
        ctx.strokeStyle = '#e0f7ff';
        ctx.lineWidth = 2;
        var _shards = 18;
        for (var _si = 0; _si < _shards; _si++) {
          var _sx = (W * (_si + 0.5) / _shards) + Math.sin(_si * 1.3) * 18;
          var _slen = 40 + (_si % 3) * 18;
          var _sy0 = -10 + _fxR * 30;
          ctx.beginPath();
          ctx.moveTo(_sx, _sy0);
          ctx.lineTo(_sx + 4, _sy0 + _slen);
          ctx.stroke();
        }
        // Vignette ring of frost
        ctx.globalAlpha = 0.5 * _fxA;
        var _g = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.2, W/2, H/2, Math.max(W,H)*0.7);
        _g.addColorStop(0, 'rgba(168,230,255,0)');
        _g.addColorStop(1, 'rgba(80,180,255,0.7)');
        ctx.fillStyle = _g;
        ctx.fillRect(0, 0, W, H);
      } else if (!_abilityOverlayDrawn && _abilityFx.kind === 'healer') {
        // Gold expanding ring centered on player screen pos
        if (player) {
          var _hx = player.x - cameraX, _hy = player.y - cameraY;
          var _maxR = 280 * (0.4 + _fxR * 0.9);
          ctx.globalAlpha = 0.85 * _fxA;
          ctx.strokeStyle = '#ffd86b';
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(_hx, _hy, _maxR, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.45 * _fxA;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(_hx, _hy, _maxR * 0.65, 0, Math.PI * 2); ctx.stroke();
          // soft fill
          ctx.globalAlpha = 0.18 * _fxA;
          var _hg = ctx.createRadialGradient(_hx, _hy, 0, _hx, _hy, _maxR);
          _hg.addColorStop(0, 'rgba(255,232,150,0.7)');
          _hg.addColorStop(1, 'rgba(255,232,150,0)');
          ctx.fillStyle = _hg;
          ctx.beginPath(); ctx.arc(_hx, _hy, _maxR, 0, Math.PI * 2); ctx.fill();
        }
      } else if (!_abilityOverlayDrawn && _abilityFx.kind === 'atkspd') {
        // Red glow halo around player
        if (player) {
          var _wx = player.x - cameraX, _wy = player.y - cameraY;
          var _wr = (player.radius || 24) + 30 + _fxR * 80;
          ctx.globalAlpha = 0.85 * _fxA;
          ctx.strokeStyle = '#ff6644';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(_wx, _wy, _wr, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.35 * _fxA;
          var _wg = ctx.createRadialGradient(_wx, _wy, 0, _wx, _wy, _wr);
          _wg.addColorStop(0, 'rgba(255,120,80,0.6)');
          _wg.addColorStop(1, 'rgba(255,80,40,0)');
          ctx.fillStyle = _wg;
          ctx.beginPath(); ctx.arc(_wx, _wy, _wr, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    drawEdgeBeacons();
    drawBridgeBanner();
    // R5h F2: crown spotlight — gated until any open levelUp modal closes,
    // then plays once for 2s with fade-in/hold/fade-out alpha curve.
    if (R5H_FX.crownPlay && R5H_FX.crownPlay.armed && state === 'playing') {
      // Wait for levelUp modal to close before starting playback
      R5H_FX.crownPlay.t += 0.016;
      if (R5H_FX.crownPlay.t > 0 && R5H_FX.crownPlay.t < R5H_FX.crownPlay.dur) {
        var _cp = R5H_FX.crownPlay;
        var _cpA;
        if (_cp.t < 0.3) _cpA = _cp.t / 0.3;
        else if (_cp.t < _cp.dur - 0.3) _cpA = 1;
        else _cpA = (_cp.dur - _cp.t) / 0.3;
        var _cpSrc = R5H_FX.crownSpotlight.canvas || (R5H_FX.crownSpotlight.ready ? R5H_FX.crownSpotlight.img : null);
        if (_cpSrc) {
          ctx.save();
          ctx.globalAlpha = _cpA;
          ctx.drawImage(_cpSrc, 0, 0, W, H);
          ctx.restore();
        } else {
          // Fallback — gold tint + center "圣堂之主" text
          ctx.save();
          ctx.fillStyle = 'rgba(120,80,40,' + (0.5 * _cpA) + ')';
          ctx.fillRect(0, 0, W, H);
          ctx.font = 'bold ' + Math.round(Math.min(W, H) * 0.08) + 'px ' + _HUD_CJK;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd060';
          ctx.globalAlpha = _cpA;
          ctx.fillText('👑 圣堂之主 👑', W / 2, H / 2);
          ctx.restore();
        }
      }
      if (R5H_FX.crownPlay.t >= R5H_FX.crownPlay.dur) {
        R5H_FX.crownPlay = null;
      }
    }
    // Round 5f F2 — 5s big-text banner when altar unlocks (overlays everything)
    if (window._altarBigBanner && state === 'playing' && gameTime < window._altarBigBanner.until) {
      var _abLeft = window._altarBigBanner.until - gameTime;
      var _abFadeIn = Math.min(1, (5 - _abLeft) / 0.3);
      var _abFadeOut = Math.min(1, _abLeft / 0.6);
      var _abAlpha = Math.min(_abFadeIn, _abFadeOut);
      var _abPulse = 1 + 0.08 * Math.sin((gameTime || 0) * 9);
      var _abFs = Math.max(28, Math.round(Math.min(W, H) * 0.06)) * _abPulse;
      ctx.save();
      ctx.font = 'bold ' + Math.round(_abFs) + 'px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = _abAlpha;
      ctx.lineWidth = Math.max(4, _abFs * 0.08);
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#ffd060';
      ctx.strokeText(window._altarBigBanner.text, W / 2, H * 0.42);
      ctx.fillText(window._altarBigBanner.text, W / 2, H * 0.42);
      ctx.restore();
    }
    // Round 5d F3 + R5e F2 — spawn-shield countdown chip with graduated text
    if (state === 'playing' && tutorialDone && gameTime < 25 && player && player.alive) {
      var _ssLeft = Math.max(0, 25 - gameTime);
      var _ssA = _spawnShieldAlpha(gameTime);
      var _ssPct = Math.round((1 - _spawnShieldMul(gameTime)) * 100);
      var _ssFs = Math.max(13, Math.round(Math.min(W, H) * 0.022));
      var _ssMsg = '🛡 新生庇护 -' + _ssPct + '% 伤害  ' + _ssLeft.toFixed(1) + 's';
      ctx.save();
      ctx.font = 'bold ' + _ssFs + 'px "Noto Sans SC","PingFang SC",sans-serif';
      ctx.textAlign = 'center';
      var _ssTw = ctx.measureText(_ssMsg).width + 24;
      var _ssY = Math.round(H * 0.105) + 8;
      ctx.globalAlpha = 0.85 * _ssA;
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(W / 2 - _ssTw / 2, _ssY, _ssTw, _ssFs + 12);
      ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - _ssTw / 2 + 0.5, _ssY + 0.5, _ssTw - 1, _ssFs + 11);
      ctx.fillStyle = '#ffd060';
      ctx.globalAlpha = _ssA;
      ctx.fillText(_ssMsg, W / 2, _ssY + _ssFs + 4);
      ctx.restore();
    }
    drawMinimap();
    // PvP immunity countdown
    if (gameTime < 90) {
      var pvpLeft = Math.ceil(90 - gameTime);
      var pvpAlpha = pvpLeft <= 5 ? (0.5 + 0.5 * Math.sin(gameTime * 10)) : 0.9;
      ctx.save();
      ctx.globalAlpha = pvpAlpha;
      ctx.fillStyle = pvpLeft <= 3 ? '#f44' : '#4af';
      ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🛡 新手保护 ' + pvpLeft + '秒', W / 2, 20);
      ctx.restore();
    }
    // BR killfeed — top-right, only the latest 3, larger font, 9-slice card
    var _kfMax = 3;
    var _kfFS = Math.max(11, Math.round(Math.min(W, H) * 0.018));
    var _kfCardW = Math.min(Math.round(W * 0.55), 320);
    var _kfCardH = Math.round(_kfFS * 1.7);
    var _kfBaseY = Math.round(H * 0.12); // right below the top HUD bar
    var _kfRightX = W - 6;
    // Cap rendered count to 3 — tick timers on ALL entries
    var _kfVisible = 0;
    for (var kfi = killFeed.length - 1; kfi >= 0; kfi--) {
      killFeed[kfi].time -= 0.016;
      if (killFeed[kfi].time <= 0) { killFeed.splice(kfi, 1); continue; }
    }
    for (var kfi2 = Math.max(0, killFeed.length - _kfMax); kfi2 < killFeed.length; kfi2++) {
      var kfEntry = killFeed[kfi2];
      var kfAlpha = Math.min(1, kfEntry.time / 0.5);
      var kfY = _kfBaseY + _kfVisible * (_kfCardH + 4);
      _kfVisible++;
      ctx.save();
      ctx.globalAlpha = kfAlpha * 0.95;
      // Card — prefer 9-slice parchment, fallback to dark pill
      var _u9 = (typeof draw9Slice === 'function') ? draw9Slice(ctx, _kfRightX - _kfCardW, kfY, _kfCardW, _kfCardH, { cornerSize: 10, alpha: kfAlpha * 0.9 }) : false;
      if (!_u9) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(_kfRightX - _kfCardW, kfY, _kfCardW, _kfCardH);
        ctx.strokeStyle = 'rgba(255,215,0,0.35)'; ctx.lineWidth = 1;
        ctx.strokeRect(_kfRightX - _kfCardW + 0.5, kfY + 0.5, _kfCardW - 1, _kfCardH - 1);
      }
      ctx.globalAlpha = kfAlpha;
      ctx.fillStyle = kfEntry.color;
      ctx.font = 'bold ' + _kfFS + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(kfEntry.text, _kfRightX - 10, kfY + _kfCardH / 2);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    } // end screenshotMode else block (US-306)

    // gameplayWatermark (US-324): semi-transparent brand name in bottom-right corner
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('生存之王', W - 10, H - 10);
    ctx.restore(); // end gameplayWatermark

    // Vignette overlay for depth
    var vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // R5m F3 — 3-slide tutorial. Each slide auto-advances 3s OR on tap of the
    // slide body. Skip-all X in top-right. Completion → localStorage flag.
    if (!tutorialDone) {
      _tutSlideTimer -= 0.016;
      if (_tutSlideTimer <= 0) {
        _tutSlide++;
        _tutSlideTimer = 3.0;
        if (_tutSlide >= _tutSlides.length) {
          tutorialDone = true;
          try { if (typeof localStorage !== 'undefined') localStorage.setItem('tutorial_seen', '1'); } catch (e) {}
        }
      }
      if (!tutorialDone) {
        var _tutS = _tutSlides[_tutSlide];
        ctx.save();
        // Dark backdrop
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.fillRect(0, 0, W, H);
        // Slide image fills full viewport (SVG is 640×360 — stretch)
        if (_tutS && _tutS.ready) {
          ctx.drawImage(_tutS.img, 0, 0, W, H);
        } else {
          // Fallback text if svg not yet loaded
          ctx.font = 'bold ' + Math.round(Math.min(W, H) * 0.05) + 'px ' + _HUD_CJK;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd060';
          var _fbLabels = ['摇杆移动', '自动攻击', '击破祭坛'];
          ctx.fillText(_fbLabels[_tutSlide] || '', W / 2, H / 2);
        }
        // Slide dots (progress)
        var _dotY = H - Math.max(30, Math.round(H * 0.05));
        var _dotR = Math.max(5, Math.round(Math.min(W, H) * 0.008));
        var _dotGap = _dotR * 3.5;
        var _dotStartX = W / 2 - _dotGap * (_tutSlides.length - 1) / 2;
        for (var _dti = 0; _dti < _tutSlides.length; _dti++) {
          ctx.beginPath();
          ctx.arc(_dotStartX + _dti * _dotGap, _dotY, _dotR, 0, Math.PI * 2);
          ctx.fillStyle = (_dti === _tutSlide) ? '#ffd060' : 'rgba(255,255,255,0.35)';
          ctx.fill();
        }
        // Top-right X skip button
        var _skX = W - Math.max(40, Math.round(W * 0.08));
        var _skY = Math.max(40, Math.round(H * 0.04));
        var _skR = Math.max(18, Math.round(Math.min(W, H) * 0.03));
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.arc(_skX, _skY, _skR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(_skX - _skR * 0.45, _skY - _skR * 0.45);
        ctx.lineTo(_skX + _skR * 0.45, _skY + _skR * 0.45);
        ctx.moveTo(_skX + _skR * 0.45, _skY - _skR * 0.45);
        ctx.lineTo(_skX - _skR * 0.45, _skY + _skR * 0.45);
        ctx.stroke();
        // Expose skip rect for touch handling (skip entire tutorial when tapped)
        _tutorialSkipRect = { x: _skX - _skR, y: _skY - _skR, w: _skR * 2, h: _skR * 2, _allSkip: true };
        ctx.restore();
      }
    }

    // Boss health bar UI at top of screen
    for (var bi = 0; bi < entities.length; bi++) {
      if (entities[bi].type === 'enemy' && entities[bi].enemyType === 'boss' && entities[bi].hp > 0) {
        drawBossHealthBar(entities[bi]);
        break;
      }
    }

    // Low HP warning overlay
    if (player && player.hp < player.maxHp * 0.25 && player.hp > 0) {
      ctx.globalAlpha = 0.12 + Math.sin(gameTime * 6) * 0.06;
      ctx.fillStyle = '#f00';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Level-up expanding ring effect
    if (levelUpFlash.active && levelUpFlash.ringRadius !== undefined && player) {
      levelUpFlash.ringRadius += 400 * (1 / 60);
      var ringProgress = levelUpFlash.ringRadius / levelUpFlash.ringMax;
      if (ringProgress <= 1) {
        ctx.globalAlpha = (1 - ringProgress) * 0.5;
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 4 * (1 - ringProgress);
        ctx.beginPath(); ctx.arc(player.x - camX + W / 2, player.y - camY + H / 2, levelUpFlash.ringRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * (1 - ringProgress);
        ctx.beginPath(); ctx.arc(player.x - camX + W / 2, player.y - camY + H / 2, levelUpFlash.ringRadius * 0.7, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Screen flash effect
    if (screenFlash.alpha > 0) {
      ctx.globalAlpha = screenFlash.alpha;
      ctx.fillStyle = screenFlash.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Boss drop banner — "★ Boss 已出现在 [区域] ★"
    if (bossDropBanner.active) {
      bossDropBanner.timer -= 0.016;
      if (bossDropBanner.timer <= 0) { bossDropBanner.active = false; }
      else {
        var _bbAlpha = Math.min(1, bossDropBanner.timer / 0.4); // fade out last 0.4s
        var _compactBanner = !!((window.KOS_UI && window.KOS_UI.hud) || {}).compactBanners;
        var _bbFS = _compactBanner ? Math.round(Math.min(W, H) * 0.020) : Math.round(Math.min(W, H) * 0.045);
        var _bbY = _compactBanner ? Math.round(H * 0.118) : Math.round(H * 0.18);
        ctx.save();
        ctx.globalAlpha = _bbAlpha;
        ctx.fillStyle = _compactBanner ? 'rgba(10,14,16,0.58)' : 'rgba(15,5,5,0.75)';
        var _bbW = _compactBanner ? Math.min(W * 0.76, 520) : W;
        var _bbX = _compactBanner ? (W - _bbW) / 2 : 0;
        ctx.fillRect(_bbX, _bbY - _bbFS, _bbW, _bbFS * 2.2);
        ctx.fillStyle = '#ffd040';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = _compactBanner ? Math.max(1.5, _bbFS * 0.06) : Math.max(3, _bbFS * 0.09);
        ctx.font = 'bold ' + _bbFS + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var _bbText = _compactBanner && bossDropBanner.zoneName ? bossDropBanner.zoneName + ' 事件' : bossDropBanner.text;
        ctx.strokeText(_bbText, W / 2, _bbY + _bbFS * 0.1);
        ctx.fillText(_bbText, W / 2, _bbY + _bbFS * 0.1);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
      }
    }

    // Storm warning bar — red pulsing banner when player is outside safe zone
    if (stormZone.active && player && player.alive !== false && player._inStorm && BR_UI.stormBarReady) {
      var _sbW = Math.min(W - 40, 420);
      var _sbH = Math.round(_sbW * 48 / 512); // preserve aspect
      var _sbX = (W - _sbW) / 2;
      var _sbY = Math.round(H * 0.13);
      var _sbPulse = 0.85 + 0.15 * Math.sin(Date.now() / 180);
      ctx.save();
      ctx.globalAlpha = _sbPulse;
      ctx.drawImage(BR_UI.stormBar, _sbX, _sbY, _sbW, _sbH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(_sbH * 0.52) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(80,0,0,0.7)'; ctx.lineWidth = 3;
      var _sbText = '⚠ 毒圈伤害中 ⚠';
      ctx.strokeText(_sbText, W / 2, _sbY + _sbH / 2);
      ctx.fillText(_sbText, W / 2, _sbY + _sbH / 2);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    // Player hurt vignette — red radial fade from edges inward
    if (playerHurtVignette.timer > 0) {
      playerHurtVignette.timer = Math.max(0, playerHurtVignette.timer - 0.016);
      var _hvt = playerHurtVignette.timer / playerHurtVignette.duration;
      var _hvGrad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.28, W/2, H/2, Math.max(W,H)*0.65);
      _hvGrad.addColorStop(0, 'rgba(200,0,0,0)');
      _hvGrad.addColorStop(1, 'rgba(220,20,20,' + (0.55 * _hvt).toFixed(3) + ')');
      ctx.fillStyle = _hvGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // Storm damage vignette — red pulsing overlay when player is outside safe zone
    if (stormZone.active && player.alive !== false) {
      var sdx = player.x - stormZone.centerX;
      var sdy = player.y - stormZone.centerY;
      var playerDistFromCenter = Math.sqrt(sdx * sdx + sdy * sdy);
      if (playerDistFromCenter > stormZone.radius) {
        var stormPulse = 0.08 + 0.04 * Math.sin(Date.now() / 200);
        ctx.save();
        ctx.globalAlpha = stormPulse;
        ctx.fillStyle = '#f00';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        // Arrow pointing toward safe zone center
        var arrowAngle = Math.atan2(stormZone.centerY - player.y, stormZone.centerX - player.x);
        var arrowX = W / 2 + Math.cos(arrowAngle) * 80;
        var arrowY = H / 2 + Math.sin(arrowAngle) * 80;
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(arrowAngle);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#f44';
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
        // Warning text
        ctx.save();
        ctx.globalAlpha = 0.8; ctx.fillStyle = '#f44'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⚠ 你在毒圈外! 正在持续掉血! 向箭头方向移动!', W / 2, H / 2 + 110);
        ctx.restore();
      }
    }

    // Ultimate flash effect (US-199)
    if (ultFlash.active && ultFlash.timer > 0) {
      ctx.globalAlpha = ultFlash.timer * 0.5;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Achievement popup (max 3 visible, auto-fade after timer expires)
    for (var ai = achievementQueue.length - 1; ai >= 0; ai--) {
      achievementQueue[ai]._timer -= _dt || 0.016;
      if (achievementQueue[ai]._timer <= 0) { achievementQueue.splice(ai, 1); }
    }
    var visibleAch = Math.min(achievementQueue.length, 3);
    for (var ai = 0; ai < visibleAch; ai++) {
      var ach = achievementQueue[ai];
      var ay = 50 + ai * 50;
      var alpha = Math.min(1, ach._timer);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#1a1a0a'; ctx.fillRect(W / 2 - 120, ay, 240, 40);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 120, ay, 240, 40);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🏆 成就: ' + ach.name, W / 2, ay + 17);
      ctx.fillStyle = '#aaa'; ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText(ach.desc + '  +' + ach.reward + '金币', W / 2, ay + 33);
      ctx.globalAlpha = 1;
    }

    // Boss warning overlay (US-214) — only during active gameplay
    if (bossWarning.active && bossWarning.timer > 0 && state === 'playing') {
      var bwAlpha = 0.3 + Math.sin(gameTime * 8) * 0.15;
      ctx.globalAlpha = bwAlpha;
      ctx.fillStyle = '#f00';
      ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4);
      ctx.fillRect(0, 0, 4, H); ctx.fillRect(W - 4, 0, 4, H);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f00'; ctx.font = 'bold 24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('WARNING: BOSS APPROACHING!', W / 2, H / 2 - 30);
      ctx.fillStyle = '#f88'; ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText('准备迎战!', W / 2, H / 2 - 5);
    }

    // comboTextVariety (US-305) + comboTextReposition (US-323) — styled combo milestones in corner
    if (comboKills >= 10 && comboTimer > 0) {
      // COMBO_STYLES: different visual per milestone
      var cStyle = COMBO_STYLES[100]; // default to highest
      if (comboKills < 100) cStyle = COMBO_STYLES[50];
      if (comboKills < 50) cStyle = COMBO_STYLES[25];
      if (comboKills < 25) cStyle = COMBO_STYLES[10];
      // comboTextReposition: shrink 30% and move to top-right corner so center stays visible
      var comboDisplayPos = { x: W - 10, y: 60 }; // comboTextReposition: right-aligned at edge
      var megaSize = Math.min(42, 21 + comboKills * 0.35) * cStyle.scale; // 30% smaller
      var megaPulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      ctx.globalAlpha = 0.9;
      if (cStyle.rainbow) {
        var hue = (Date.now() * 0.3) % 360;
        ctx.fillStyle = 'hsl(' + hue + ', 100%, 60%)';
      } else {
        ctx.fillStyle = cStyle.color;
      }
      ctx.font = 'bold ' + Math.round(megaSize * megaPulse) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4;
      var comboLabel = comboKills + 'x ' + cStyle.label + '!';
      ctx.strokeText(comboLabel, comboDisplayPos.x, comboDisplayPos.y);
      ctx.fillText(comboLabel, comboDisplayPos.x, comboDisplayPos.y);
      ctx.lineWidth = 1; ctx.globalAlpha = 1;
    }
    // Combo kill display (US-215)
    if (comboKills >= 3 && comboKills < 10 && comboTimer > 0) {
      ctx.fillStyle = '#f0f'; ctx.font = 'bold ' + Math.min(24, 14 + comboKills) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(comboKills + 'x COMBO!', W / 2, H - 40);
      ctx.fillStyle = '#c8c'; ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      var barW = comboTimer / comboWindow * 80;
      ctx.fillRect(W / 2 - 40, H - 32, barW, 3);
    }

    // Damage direction indicators (US-216)
    drawDamageIndicators();

    // Wave banner announcement (US-275)
    drawWaveBanner();
    // Wave status HUD (offline mode MOBA-style wave system)
    // Off-screen enemy direction arrows (final polish)
    drawOffScreenEnemyArrows();
    // Combo popup (Double/Triple/Penta/...)
    drawComboPopup();
    // Experiment F: Ultimate-ready HUD button (tap-to-fire)
    _ultReadyBtn = null;
    if (player && player._ultimateReady) {
      var _uu = CLASS_ULTIMATES[selectedClass] || CLASS_ULTIMATES.warrior;
      var _uPulse = 0.6 + 0.4 * Math.sin(gameTime * 5);
      var _ubW = 140, _ubH = 38, _ubX = W - _ubW - 10, _ubY = H * 0.14;
      _ultReadyBtn = { x: _ubX, y: _ubY, w: _ubW, h: _ubH };
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#150a00';
      ctx.fillRect(_ubX, _ubY, _ubW, _ubH);
      ctx.globalAlpha = 0.4 + 0.4 * _uPulse;
      ctx.fillStyle = _uu.color;
      ctx.fillRect(_ubX, _ubY, _ubW, _ubH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = _uu.color; ctx.lineWidth = 2 + _uPulse * 1.5;
      ctx.strokeRect(_ubX, _ubY, _ubW, _ubH);
      ctx.font = 'bold 15px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Apple Color Emoji", Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(_uu.icon + ' ' + _uu.name + ' 点击/双击', _ubX + _ubW / 2, _ubY + _ubH / 2);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    // Experiment D: BOSS SLAIN + rival banners
    drawBossSlainBanner();
    // Experiment F: synergy banner + world event banner
    drawSynergyBanner();
    drawWorldEventBanner();
    // Experiment D: boss perma buff choice overlay (drawn last, blocks input)
    drawBossBuffChoice();
    // killMilestoneBanner (US-338): draw killBanner with slide animation
    if (killMilestoneBanner.active) {
      killMilestoneBanner.timer += 0.016;
      var kbProgress = killMilestoneBanner.timer / killMilestoneBanner.duration;
      // milestoneSlide: slide in from left (0-0.2), hold (0.2-0.8), slide out right (0.8-1.0)
      var kbX = W / 2;
      if (kbProgress < 0.15) kbX = -200 + (W / 2 + 200) * (kbProgress / 0.15);
      else if (kbProgress > 0.85) kbX = W / 2 + (W + 200) * ((kbProgress - 0.85) / 0.15);
      var kbAlpha = kbProgress < 0.15 ? kbProgress / 0.15 : (kbProgress > 0.85 ? 1 - (kbProgress - 0.85) / 0.15 : 1);
      ctx.globalAlpha = kbAlpha * 0.9;
      ctx.fillStyle = killMilestoneBanner.color; ctx.font = 'bold 48px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 5;
      ctx.strokeText(killMilestoneBanner.text, kbX, H / 2 + 15);
      ctx.fillText(killMilestoneBanner.text, kbX, H / 2 + 15);
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
      if (kbProgress >= 1) killMilestoneBanner.active = false;
    }
    // Chain lightning arcs (US-297)
    drawChainArcs();
    // AOE sweep waves (US-296)
    drawAoeSweep();
    // Update sweep timers
    if (window._aoeSweep) {
      var swLen = window._aoeSweep.length;
      for (var swi = swLen - 1; swi >= 0; swi--) {
        window._aoeSweep[swi].life -= 0.016;
        if (window._aoeSweep[swi].life <= 0) { window._aoeSweep[swi] = window._aoeSweep[--swLen]; }
      }
      window._aoeSweep.length = swLen;
    }
    // Evolution cutscene overlay (US-289)
    drawEvolveCutscene();
    // Biome transition effect (US-281)
    drawBiomeTransition();
    // Edge danger indicators (US-279)
    drawEdgeDangerIndicators();
    // Ult/dodge buttons now rendered in bottom bar above

    // Low HP vignette (US-218)
    drawVignette();
    // Heartbeat pulse (US-251)
    drawHeartBeat();
  }

  function drawSkillBar() {
    if (state !== 'playing' || !player) return;
    // Draw on the right side, below dodge/ult buttons area
    var barX = W - 160;
    var barY = 60;
    var slotH = 44;

    // Always show all 5 build skills for upgrade selection
    var buildSkills = selectedBuild && selectedBuild.length > 0 ? selectedBuild : [];

    for (var i = 0; i < buildSkills.length; i++) {
      var sid = buildSkills[i];
      var sd = SKILL_DATA[sid];
      if (!sd) continue;
      var lv = skillLevels[sid] || 0;
      var maxLv = sd.maxLevel || 10;
      var sy = barY + i * slotH;

      // Slot gradient background
      var slotGrad = ctx.createLinearGradient(barX, sy, barX, sy + slotH - 4);
      slotGrad.addColorStop(0, 'rgba(28,28,52,0.92)');
      slotGrad.addColorStop(1, 'rgba(8,8,18,0.92)');
      ctx.fillStyle = slotGrad;
      ctx.fillRect(barX, sy, 150, slotH - 4);
      // Skill-colored left accent stripe
      ctx.fillStyle = sd.color || '#888';
      ctx.fillRect(barX, sy, 3, slotH - 4);
      // Border with glow (if maxed, gold)
      ctx.save();
      var borderCol = (lv >= maxLv) ? '#ffd700' : (sd.color || '#888');
      ctx.shadowColor = borderCol;
      ctx.shadowBlur = (lv >= maxLv) ? 8 : 4;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = lv >= maxLv ? 2 : 1;
      ctx.strokeRect(barX + 0.5, sy + 0.5, 149, slotH - 5);
      ctx.restore();
      // Icon box (colored square)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX + 6, sy + 6, 26, 26);
      ctx.strokeStyle = sd.color || '#888'; ctx.lineWidth = 1; ctx.strokeRect(barX + 6.5, sy + 6.5, 25, 25);
      ctx.font = '18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = sd.color || '#fff';
      ctx.fillText(sd.icon, barX + 19, sy + 26);
      // Name + level
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(sd.name, barX + 36, sy + 15);
      ctx.fillStyle = lv >= maxLv ? '#ffd700' : '#aaa';
      ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText('Lv.' + lv + (lv >= maxLv ? ' MAX' : '/' + maxLv), barX + 36, sy + 28);

      // Level progress dots
      var dotsStart = barX + 72;
      for (var d = 0; d < Math.min(maxLv, 10); d++) {
        ctx.fillStyle = d < lv ? (sd.color || '#888') : '#2a2a3a';
        ctx.beginPath();
        ctx.arc(dotsStart + d * 7, sy + 32, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // "+" button when skill points available and skill not maxed
      if (pendingSkillPoints > 0 && lv < maxLv) {
        var btnX = barX + 125;
        var btnY2 = sy + 5;
        var pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        ctx.fillStyle = 'rgba(50,200,50,' + pulse + ')';
        ctx.fillRect(btnX, btnY2, 22, 28);
        ctx.strokeStyle = '#4f4';
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY2, 22, 28);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', btnX + 11, btnY2 + 21);
      }
    }

    // Skill points indicator — pulsing glow + screen flash to attract attention
    if (pendingSkillPoints > 0) {
      var spPulse = 0.6 + 0.4 * Math.sin((gameTime || 0) * 6);
      // Full-width flash bar at top of skill panel
      ctx.save();
      ctx.globalAlpha = spPulse * 0.15;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(barX - 10, barY - 30, 170, barY + selectedBuild.length * 44);
      ctx.restore();
      // Glowing background banner
      ctx.globalAlpha = spPulse * 0.35;
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(barX - 4, barY - 24, 155, 20);
      ctx.globalAlpha = 1;
      // Border
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
      ctx.globalAlpha = spPulse;
      ctx.strokeRect(barX - 4, barY - 24, 155, 20);
      ctx.globalAlpha = 1;
      // Text
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('\u25B2 技能点: ' + pendingSkillPoints + ' \u25C0点击+加点', barX, barY - 8);
    }

    // First-time skill upgrade tutorial hint — large animated arrow pointing at skill panel
    if (_skillHintTimer > 0 && pendingSkillPoints > 0) {
      _skillHintTimer -= _dt || 0.016;
      var hintAlpha = Math.min(1, _skillHintTimer / 0.5); // fade out in last 0.5s
      var hintBounce = Math.sin((gameTime || 0) * 8) * 8;
      // Dark overlay to draw attention to skill panel
      ctx.globalAlpha = hintAlpha * 0.3;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W - 165, H);
      ctx.globalAlpha = hintAlpha;
      // Large bouncing arrow pointing right → at the skill panel
      var arrowX = barX - 40 + hintBounce;
      var arrowY = barY + 60;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('\u25B6', arrowX, arrowY);
      // Tutorial text box
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(barX - 200, arrowY - 40, 160, 55);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
      ctx.strokeRect(barX - 200, arrowY - 40, 160, 55);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('点击右侧 + 按钮', barX - 120, arrowY - 18);
      ctx.fillText('升级技能!', barX - 120, arrowY);
      ctx.fillStyle = '#aaa'; ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText('每次升级消耗1技能点', barX - 120, arrowY + 14);
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }

    ctx.textAlign = 'left'; // reset
  }

  function drawBossHealthBar(boss) {
    var _bossHudCfg = (window.KOS_UI && window.KOS_UI.hud) || {};
    var _bossHudCompact = !!_bossHudCfg.compactTopStats;
    var _bossHudZs = Math.min(W / 400, H / 700) * (_bossHudCfg.scale || 1);
    var _bossTopH = Math.round(H * (_bossHudCfg.topHeightRatio || 0.105));
    var _bossBarW = _bossHudCompact ? Math.round(Math.min(W * 0.34, 170 * _bossHudZs)) : 300;
    var _bossBarH = _bossHudCompact ? Math.max(6, Math.round(6 * _bossHudZs)) : 14;
    var bossHpBar = {
      w: _bossBarW,
      h: _bossBarH,
      x: W / 2 - _bossBarW / 2,
      y: _bossHudCompact ? (_bossTopH + Math.round(8 * _bossHudZs)) : 30
    };
    // Background
    ctx.fillStyle = '#111'; ctx.fillRect(bossHpBar.x - 2, bossHpBar.y - 2, bossHpBar.w + 4, bossHpBar.h + 4);
    ctx.fillStyle = '#300'; ctx.fillRect(bossHpBar.x, bossHpBar.y, bossHpBar.w, bossHpBar.h);
    // HP fill
    var hpPct = Math.max(0, boss.hp / boss.maxHp);
    var barColor = boss.bossPhase >= 3 ? '#f44' : boss.bossPhase >= 2 ? '#f80' : '#f00';
    ctx.fillStyle = barColor;
    ctx.fillRect(bossHpBar.x, bossHpBar.y, bossHpBar.w * hpPct, bossHpBar.h);
    // Phase markers
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3;
    ctx.fillRect(bossHpBar.x + bossHpBar.w * 0.6, bossHpBar.y, 1, bossHpBar.h);
    ctx.fillRect(bossHpBar.x + bossHpBar.w * 0.3, bossHpBar.y, 1, bossHpBar.h);
    ctx.globalAlpha = 1;
    // Boss name + phase
    var bossName = _bossHudCompact ? ('BOSS P' + (boss.bossPhase || 1)) : ('👑 BOSS - Phase ' + (boss.bossPhase || 1));
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (_bossHudCompact ? Math.max(8, Math.round(6 * _bossHudZs)) : 12) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(bossName, W / 2, bossHpBar.y - (_bossHudCompact ? Math.max(3, Math.round(2 * _bossHudZs)) : 4));
    // HP percentage
    if (!_bossHudCompact) {
      ctx.fillStyle = '#ccc'; ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText(Math.round(hpPct * 100) + '%', W / 2, bossHpBar.y + 12);
    }
  }

  // Player status panel — prominent display of all players' status
  function drawPlayerPanel() {
    // Position below HUD (HUD is scaled, so estimate its screen height)
    var _hps = Math.min(W / 400, H / 700) * 0.55;
    var panelX = 4, panelY = Math.round(4 + 70 * _hps);
    var barW = 80, barH = 6, rowH = 16;
    ctx.save();
    // Panel background
    var extraH = gameMode === 'team' ? 14 : 0; // space for team separator
    var panelH = allPlayers.length * rowH + 8 + extraH;
    var _ppUsed9 = draw9Slice(ctx, panelX - 2, panelY - 4, barW + 50, panelH, { cornerSize: 10, alpha: 0.8 });
    if (!_ppUsed9) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(panelX - 2, panelY - 4, barW + 50, panelH);
      ctx.globalAlpha = 1;
    }
    ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left';
    var rowOffset = 0;
    for (var pi = 0; pi < allPlayers.length; pi++) {
      // Team mode: add separator between teams
      if (gameMode === 'team' && pi === 4) {
        ctx.fillStyle = '#555';
        ctx.fillRect(panelX, panelY + rowOffset + 2, barW + 30, 1);
        ctx.fillStyle = '#888'; ctx.font = '8px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        ctx.fillText('— 敌方 —', panelX + 20, panelY + rowOffset + 11);
        rowOffset += 14;
        ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      }
      var ap = allPlayers[pi];
      var ry = panelY + pi * rowH + rowOffset;
      // Class icon indicator
      var apClass = ap.isLocal ? (player.playerClass || selectedClass) : (ap.characterType || 'warrior');
      var classIcon = apClass === 'mage' ? '🔮' : (apClass === 'scout' ? '🏹' : '🛡');
      ctx.font = '9px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = ap.color;
      ctx.fillText(classIcon, panelX, ry + 7);
      // Level badge + Name (highlight local player)
      var lvText = 'L' + (ap.level || 1);
      ctx.fillStyle = '#fd0'; ctx.font = 'bold 8px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText(lvText, panelX + 10, ry + 7);
      ctx.fillStyle = ap.isLocal ? '#4af' : (ap.alive ? '#ccc' : '#666');
      ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      var dispName = ap.name || ('P' + (ap.id + 1));
      ctx.fillText(dispName, panelX + 26, ry + 7);
      // HP bar + HP fraction
      if (ap.alive) {
        var hpX = panelX + 46, hpY = ry + 1;
        ctx.fillStyle = '#333'; ctx.fillRect(hpX, hpY, barW - 10, barH);
        var hpRatio = Math.max(0, ap.hp / ap.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? '#4a4' : (hpRatio > 0.25 ? '#fa0' : '#f44');
        ctx.fillRect(hpX, hpY, (barW - 10) * hpRatio, barH);
        // HP fraction text
        ctx.fillStyle = '#fff'; ctx.font = '8px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        ctx.fillText(Math.floor(ap.hp) + '/' + Math.floor(ap.maxHp), hpX + barW - 7, ry + 7);
        ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      } else {
        // Dead indicator
        ctx.fillStyle = '#f44'; ctx.font = '9px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        ctx.fillText('DEAD', panelX + 46, ry + 7);
        ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      }
    }
    ctx.restore();
  }

  // Round 5b T3: edge beacons — direction arrows pinned to viewport edges
  // pointing toward POIs the player needs to know about (altar, nearest strat,
  // storm center if outside safe zone). Uses ArtDesigner's hud/direction_arrow.svg
  // 3-state sprite (gold=holy, red=danger, blue=neutral) with pulse animate.
  var HUD_ARROW = { img: new Image(), ready: false, size: 48 };
  HUD_ARROW.img.onload = function() { HUD_ARROW.ready = true; };
  HUD_ARROW.img.src = 'assets/hud/direction_arrow.svg';
  // Round 5b T2: altar combat FX
  var ALTAR_FX = {
    debris:  { img: new Image(), ready: false, size: 48 },
    shatter: { img: new Image(), ready: false, size: 256 },
    activeShatter: null // { x, y, t, dur }
  };
  ALTAR_FX.debris.img.onload  = function() { ALTAR_FX.debris.ready  = true; };
  ALTAR_FX.shatter.img.onload = function() { ALTAR_FX.shatter.ready = true; };
  ALTAR_FX.debris.img.src  = 'assets/maps/landmarks/altar_debris.svg';
  ALTAR_FX.shatter.img.src = 'assets/maps/landmarks/altar_shatter.svg';

  // Round 5d F1 — bottom-of-screen pulse banner when player edge-on to water,
  // and a one-shot tutorial blurb the first time they enter a lane-3 map.
  var _bridgeTutShownFor = null;
  function drawBridgeBanner() {
    if (!player || !player.alive || state !== 'playing' || !tutorialDone) return;
    if (!MAP_DATA || MAP_DATA.layout !== 'lane-3') return;
    // First-time lane_b tutorial — 5s
    if (_bridgeTutShownFor !== MAP_DATA.name) {
      _bridgeTutShownFor = MAP_DATA.name;
      player._bridgeTutTimer = 5;
    }
    if (player._bridgeTutTimer && player._bridgeTutTimer > 0) {
      player._bridgeTutTimer -= 0.016;
      var fs = Math.max(16, Math.round(Math.min(W, H) * 0.025));
      var msg = '跨河需走桥 — 顺金色 ↑ 走';
      ctx.save();
      ctx.font = 'bold ' + fs + 'px ' + _HUD_CJK;
      ctx.textAlign = 'center';
      var tw = ctx.measureText(msg).width + 28;
      var ty = H * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(W / 2 - tw / 2, ty, tw, fs + 14);
      ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - tw / 2 + 0.5, ty + 0.5, tw - 1, fs + 13);
      ctx.fillStyle = '#ffd060';
      ctx.fillText(msg, W / 2, ty + fs + 4);
      ctx.restore();
    }
    // Edge-on water pulse — show "找桥 →" at bottom when within 60px of river
    var nr = _nearestRiver(player.x, player.y);
    if (nr && nr.d < 60) {
      var nb = _nearestBridge(player.x, player.y);
      if (!nb) return;
      var dx = nb.x - player.x, dy = nb.y - player.y;
      var ang = Math.atan2(dy, dx);
      var pulse2 = 0.7 + 0.3 * Math.sin((gameTime || 0) * 6);
      var fs2 = Math.max(15, Math.round(Math.min(W, H) * 0.024));
      var arrow = (ang > -Math.PI / 4 && ang < Math.PI / 4) ? '→' :
                  (ang >= Math.PI / 4 && ang < 3 * Math.PI / 4) ? '↓' :
                  (ang >= 3 * Math.PI / 4 || ang < -3 * Math.PI / 4) ? '←' : '↑';
      var msg2 = '找桥 ' + arrow + '  (' + Math.round(nb.d) + 'px)';
      ctx.save();
      ctx.globalAlpha = pulse2;
      ctx.font = 'bold ' + fs2 + 'px ' + _HUD_CJK;
      ctx.textAlign = 'center';
      var tw2 = ctx.measureText(msg2).width + 32;
      var by2 = H * 0.78;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(W / 2 - tw2 / 2, by2, tw2, fs2 + 16);
      ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - tw2 / 2 + 0.5, by2 + 0.5, tw2 - 1, fs2 + 15);
      ctx.fillStyle = '#ffd060';
      ctx.fillText(msg2, W / 2, by2 + fs2 + 5);
      ctx.restore();
    }
  }

  // Round 5g F3 — short CJK font string used by all per-frame HUD overlays so
  // ctx.font assignment doesn't re-shape a 200-char fallback list every call.
  var _HUD_CJK = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
  function drawEdgeBeacons() {
    if (!player || !player.alive || state !== 'playing') return;
    if (!tutorialDone) return;
    // Build POI list: { x, y, kind: 'holy'|'danger'|'neutral', label }
    var pois = [];
    // Altar — alive central boss is the holy POI
    if (_activeBossRef && _activeBossRef.alive && _activeBossRef._isAltar) {
      pois.push({ x: _activeBossRef.x, y: _activeBossRef.y, kind: 'holy', label: '祭坛' });
    }
    // Nearest unowned/non-self strat point — neutral POI
    var bestPt = null, bestPtD = 1e12;
    if (STRAT_POINTS && STRAT_POINTS.pointsInWorld) {
      for (var i = 0; i < STRAT_POINTS.pointsInWorld.length; i++) {
        var pt = STRAT_POINTS.pointsInWorld[i];
        if (pt.owner === player.factionId && gameTime < pt.buffUntil) continue;
        var dx = pt.x - player.x, dy = pt.y - player.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < bestPtD) { bestPtD = d2; bestPt = pt; }
      }
    }
    if (bestPt) pois.push({ x: bestPt.x, y: bestPt.y, kind: 'neutral', label: bestPt.name || '据点' });
    // Storm center — danger POI when player is outside the safe ring
    if (stormZone && stormZone.active) {
      var sdx = player.x - stormZone.centerX, sdy = player.y - stormZone.centerY;
      if (sdx * sdx + sdy * sdy > stormZone.radius * stormZone.radius * 0.85) {
        pois.push({ x: stormZone.centerX, y: stormZone.centerY, kind: 'danger', label: '安全区' });
      }
    }
    // Round 5d F1 — when river is within 200px, show nearest bridge as a
    // priority "holy" POI so the player has a clear visual to follow.
    if (MAP_DATA && MAP_DATA.layout === 'lane-3') {
      var _nr = _nearestRiver(player.x, player.y);
      if (_nr && _nr.d < 280) {
        var _nb = _nearestBridge(player.x, player.y);
        if (_nb) pois.unshift({ x: _nb.x, y: _nb.y, kind: 'holy', label: _nb.label });
      }
    }
    // Priority: danger > holy > neutral, cap to 2 on screen at once
    var rank = { danger: 0, holy: 1, neutral: 2 };
    pois.sort(function(a, b) { return rank[a.kind] - rank[b.kind]; });
    pois = pois.slice(0, 2);

    // Round 5c F1 fix — DPI-aware sizing. Canvas is 3× CSS px on iPhone, so a
    // 48px arrow renders as 16 CSS px (invisible). Scale by min viewport so it
    // reads at ~30 CSS px on phone, ~48 on desktop.
    var sz = Math.max(72, Math.round(Math.min(W, H) * 0.10));
    var pad = sz * 0.55 + 12;
    var pulse = 0.85 + 0.15 * Math.sin((gameTime || 0) * 5);
    for (var pi = 0; pi < pois.length; pi++) {
      var poi = pois[pi];
      // Project POI to screen
      var spx = poi.x - cameraX, spy = poi.y - cameraY;
      // If on-screen, no edge arrow needed
      var margin = sz;
      if (spx > margin && spx < W - margin && spy > margin && spy < H - margin) continue;
      // Compute angle from screen center to POI screen-position
      var ccx = W / 2, ccy = H / 2;
      var ang = Math.atan2(spy - ccy, spx - ccx);
      // Project to edge with padding so arrow stays fully on canvas
      var maxX = W - pad, minX = pad;
      var maxY = H - pad, minY = pad;
      var ex = ccx + Math.cos(ang) * 1e6;
      var ey = ccy + Math.sin(ang) * 1e6;
      var tX = ex > maxX ? (maxX - ccx) / (ex - ccx) : (ex < minX ? (minX - ccx) / (ex - ccx) : 1);
      var tY = ey > maxY ? (maxY - ccy) / (ey - ccy) : (ey < minY ? (minY - ccy) / (ey - ccy) : 1);
      var t = Math.min(tX, tY, 1);
      var ax = ccx + (ex - ccx) * t;
      var ay = ccy + (ey - ccy) * t;
      var tintColor = poi.kind === 'danger' ? '#ff4040' : (poi.kind === 'holy' ? '#ffd060' : '#7ac4f0');
      ctx.save();
      // Drop-shadow halo so arrow reads on any tile — black ring + colour ring
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.arc(ax, ay, sz * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tintColor;
      ctx.globalAlpha = 0.30 + 0.20 * Math.sin((gameTime || 0) * 5);
      ctx.beginPath(); ctx.arc(ax, ay, sz * 0.50, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // Always paint a bold colored chevron — readable even before SVG loads
      ctx.translate(ax, ay);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = tintColor;
      ctx.strokeStyle = '#000'; ctx.lineWidth = Math.max(3, sz * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, -sz * 0.42);
      ctx.lineTo(-sz * 0.28, sz * 0.20);
      ctx.lineTo(0, sz * 0.05);
      ctx.lineTo(sz * 0.28, sz * 0.20);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
      // Optional decorative SVG underlay if loaded (sub-pixel shimmer behind chevron)
      if (HUD_ARROW.ready) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(ang + Math.PI / 2);
        ctx.globalAlpha = 0.35 * pulse;
        ctx.drawImage(HUD_ARROW.img, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      // R5o F1 — reverted R5n edge-beacon cache: the hypot + bucket-round +
      // string-concat + Map-lookup chain turned out slower than browser's
      // native measureText caching by font+string. Revert to simple inline.
      var distPx = Math.round(Math.hypot(poi.x - player.x, poi.y - player.y));
      var labelTxt = poi.label + ' ' + distPx + 'px';
      ctx.save();
      var fs = Math.max(14, Math.round(sz * 0.22));
      ctx.font = 'bold ' + fs + 'px ' + _HUD_CJK;
      var tw = ctx.measureText(labelTxt).width + 16;
      var lx = Math.max(6, Math.min(W - tw - 6, ax - tw / 2));
      var ly = Math.max(6, Math.min(H - fs - 12, ay + sz * 0.35));
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.fillRect(lx, ly, tw, fs + 8);
      ctx.strokeStyle = tintColor; ctx.lineWidth = 2;
      ctx.strokeRect(lx + 0.5, ly + 0.5, tw - 1, fs + 7);
      ctx.fillStyle = tintColor;
      ctx.textAlign = 'center';
      ctx.fillText(labelTxt, lx + tw / 2, ly + fs + 1);
      ctx.restore();
    }
  }

  // Minimap (US-204) — shows full world with all players
  function drawMinimap() {
    // Top-right position with gold frame (moved from bottom-right per UX rev)
    // Sized to fit within top bar (15% of H), positioned top-right
    var _mmCfg = (window.KOS_UI && window.KOS_UI.hud) || {};
    var _mmZs = Math.min(W / 400, H / 700) * (_mmCfg.scale || 1);
    var _topBarH = Math.round(H * (_mmCfg.topHeightRatio || 0.105));
    var mmW = Math.min(Math.round(80 * _mmZs * (_mmCfg.minimapScale || 1)), _topBarH - Math.round(8 * _mmZs));
    var mmH = mmW;
    var mmX = W - mmW - Math.round(6 * _mmZs);
    var mmY = Math.round((_topBarH - mmH) / 2);
    ctx.save();
    // homm3_bright 9-slice frame if assets ready; otherwise gradient + gold fallback.
    var _mmUsed9 = draw9Slice(ctx, mmX, mmY, mmW, mmH, { cornerSize: Math.round(12 * _mmZs), alpha: 0.95 });
    if (!_mmUsed9) {
      ctx.shadowColor = 'rgba(255,215,0,0.4)';
      ctx.shadowBlur = 10;
      var mmGrad = ctx.createLinearGradient(mmX, mmY, mmX, mmY + mmH);
      mmGrad.addColorStop(0, 'rgba(20,20,40,0.72)');
      mmGrad.addColorStop(1, 'rgba(4,4,12,0.8)');
      ctx.fillStyle = mmGrad;
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.strokeStyle = 'rgba(255,215,0,0.7)'; ctx.lineWidth = 2;
      ctx.strokeRect(mmX + 0.5, mmY + 0.5, mmW - 1, mmH - 1);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
      ctx.strokeRect(mmX + 3, mmY + 3, mmW - 6, mmH - 6);
    } else {
      ctx.shadowBlur = 0;
    }
    // Camera viewport indicator
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.strokeRect(mmX + (cameraX / WORLD_W) * mmW, mmY + (cameraY / WORLD_H) * mmH, (W / WORLD_W) * mmW, (H / WORLD_H) * mmH);
    ctx.globalAlpha = 0.85;
    // Spawn-point markers (pulsing red runes)
    if (typeof _waveSpawnPoints !== 'undefined' && _waveSpawnPoints && _waveSpawnPoints.length) {
      for (var _spi2 = 0; _spi2 < _waveSpawnPoints.length; _spi2++) {
        var _sp = _waveSpawnPoints[_spi2];
        var _spx = mmX + (_sp.x / WORLD_W) * mmW;
        var _spy = mmY + (_sp.y / WORLD_H) * mmH;
        var _spPulse = 0.5 + 0.5 * Math.sin((gameTime || 0) * 3 + _spi2 * 0.6);
        ctx.fillStyle = 'rgba(255,80,60,' + (0.4 + _spPulse * 0.4) + ')';
        ctx.beginPath(); ctx.arc(_spx, _spy, 3 + _spPulse * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,80,0.6)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(_spx, _spy, 4.5, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // Storm zone on minimap — red danger overlay outside safe zone
    if (stormZone.active) {
      var scx = mmX + (stormZone.centerX / WORLD_W) * mmW;
      var scy = mmY + (stormZone.centerY / WORLD_H) * mmH;
      var sr = (stormZone.radius / WORLD_W) * mmW;
      // Fill danger zone red
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#f00';
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(scx, scy, sr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // White circle border for safe zone
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(scx, scy, sr, 0, Math.PI * 2); ctx.stroke();
    }
    // Strategic points on minimap — diamond icon with owner color
    if (STRAT_POINTS.pointsInWorld.length) {
      for (var _spMi = 0; _spMi < STRAT_POINTS.pointsInWorld.length; _spMi++) {
        var _spMp = STRAT_POINTS.pointsInWorld[_spMi];
        var _spMx = mmX + (_spMp.x / WORLD_W) * mmW;
        var _spMy = mmY + (_spMp.y / WORLD_H) * mmH;
        var _spPlayerOwns = (player && _spMp.owner === player.factionId && gameTime < _spMp.buffUntil);
        var _spOwned = _spMp.owner != null && gameTime < _spMp.buffUntil;
        ctx.save();
        ctx.fillStyle = _spPlayerOwns ? '#40ff80' : (_spOwned ? '#ff4040' : '#cccccc');
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(_spMx, _spMy - 4);
        ctx.lineTo(_spMx + 3, _spMy);
        ctx.lineTo(_spMx, _spMy + 4);
        ctx.lineTo(_spMx - 3, _spMy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    // Boss crown marker on minimap — pulsing gold crown so everyone knows
    // where to converge for the objective.
    if (_activeBossRef && _activeBossRef.alive) {
      var _bmx = mmX + (_activeBossRef.x / WORLD_W) * mmW;
      var _bmy = mmY + (_activeBossRef.y / WORLD_H) * mmH;
      var _bmPulse = 0.7 + 0.3 * Math.sin(Date.now() / 180);
      ctx.save();
      if (BR_UI.crownsReady >= 1 && BR_UI.crowns.gold) {
        var _bmSz = Math.max(10, Math.round(mmW * 0.14));
        ctx.globalAlpha = _bmPulse;
        ctx.drawImage(BR_UI.crowns.gold, _bmx - _bmSz / 2, _bmy - _bmSz / 2, _bmSz, _bmSz);
      } else {
        // Fallback: red pulse dot
        ctx.globalAlpha = _bmPulse;
        ctx.fillStyle = '#ff2020';
        ctx.beginPath(); ctx.arc(_bmx, _bmy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(_bmx, _bmy, 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // Minimap enemy dots — sample both network entities and offline enemies
    for (var mi = 0; mi < entities.length; mi += 2) {
      var me = entities[mi];
      if (me.type !== 'enemy' || me.hp <= 0) continue;
      var mx = mmX + (me.x / WORLD_W) * mmW;
      var my = mmY + (me.y / WORLD_H) * mmH;
      ctx.fillStyle = me.treasureGoblin ? '#ffd700' : (me.hostile !== false ? (me.enemyType === 'boss' ? '#f00' : '#c44') : '#4c4');
      ctx.beginPath(); ctx.arc(mx, my, me.enemyType === 'boss' ? 2.5 : 1.2, 0, Math.PI * 2); ctx.fill();
    }
    if (typeof offlineEnemies !== 'undefined' && offlineEnemies) {
      for (var mei = 0; mei < offlineEnemies.length; mei++) {
        var oe2 = offlineEnemies[mei];
        if (!oe2 || !oe2.alive) continue;
        var omx = mmX + (oe2.x / WORLD_W) * mmW;
        var omy = mmY + (oe2.y / WORLD_H) * mmH;
        var isBossM = (oe2.type === 'boss');
        var isMini = (oe2.type === 'miniBoss');
        ctx.fillStyle = isBossM ? '#ff2020' : (isMini ? '#ff6020' : (oe2.hostile !== false ? '#c44' : '#4c4'));
        ctx.beginPath(); ctx.arc(omx, omy, isBossM ? 3 : (isMini ? 2 : 1.2), 0, Math.PI * 2); ctx.fill();
      }
    }
    // All player dots on minimap
    for (var mpi = 0; mpi < allPlayers.length; mpi++) {
      var mp = allPlayers[mpi];
      if (!mp.alive) continue;
      var mpx = mmX + (mp.x / WORLD_W) * mmW;
      var mpy = mmY + (mp.y / WORLD_H) * mmH;
      // Round 3 H: RIVAL / NEMESIS minimap — blink at 2Hz
      var _mpIsRival = (rivalState.botId === mp.factionId);
      var _mpIsNemesis = (rivalState.nemesisId === mp.factionId);
      if (_mpIsRival || _mpIsNemesis) {
        var _mpBlink = (Math.sin(Date.now() * 0.0126) > 0); // ~2Hz square-ish
        if (_mpBlink) {
          ctx.save();
          ctx.fillStyle = _mpIsNemesis ? '#c490e8' : '#ff4040';
          ctx.beginPath(); ctx.arc(mpx, mpy, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(mpx, mpy, 6, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
      }
      // Class-colored dot with shape indicator
      var mpClass = mp.isLocal ? (player.playerClass || selectedClass) : (mp.characterType || 'warrior');
      var mpDotColor = mp.isLocal ? '#4af' : (mp.factionId === player.factionId ? '#0c0' : mp.color);
      ctx.fillStyle = mpDotColor;
      var dotSize = mp.isLocal ? 4 : 3;
      if (mpClass === 'warrior') {
        // Square dot for warrior
        ctx.fillRect(mpx - dotSize, mpy - dotSize, dotSize * 2, dotSize * 2);
      } else if (mpClass === 'mage') {
        // Diamond dot for mage
        ctx.save(); ctx.translate(mpx, mpy); ctx.rotate(Math.PI / 4);
        ctx.fillRect(-dotSize, -dotSize, dotSize * 2, dotSize * 2);
        ctx.restore();
      } else {
        // Triangle dot for scout
        ctx.beginPath();
        ctx.moveTo(mpx, mpy - dotSize);
        ctx.lineTo(mpx - dotSize, mpy + dotSize);
        ctx.lineTo(mpx + dotSize, mpy + dotSize);
        ctx.closePath(); ctx.fill();
      }
      // Name label for other players on minimap
      if (!mp.isLocal) {
        ctx.fillStyle = '#fff'; ctx.font = '7px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(mp.name, mpx, mpy - 5);
      }
      // Pulse effect for local player
      if (mp.isLocal) {
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.005);
        ctx.beginPath(); ctx.arc(mpx, mpy, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.7;
      }
    }
    // Player count label
    var aliveCount = allPlayers.filter(function(p) { return p.alive; }).length;
    ctx.fillStyle = '#fff'; ctx.font = '9px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('👥 ' + aliveCount + '/8', mmX + 2, mmY - 3);
    ctx.restore();
  }

  // menuOverhaul: enhanced menu with character preview + best score + particles (US-268)
  var menuParticles = [];
  // Shared button hit-rects — populated by drawMenu, consumed by click handler
  var _menuBtns = { solo: null, team: null, upgrade: null, multi: null, timed: null };
  // Generic menu-state scale transform — wraps charSelect/mapSelect/buildSelect/upgrade
  // so their hardcoded 400-wide layouts fill the phone screen.
  // _uiTransform stores the active {scale, ox, oy} for click coordinate inversion.
  var _uiTransform = { scale: 1, ox: 0, oy: 0 };
  function _applyUIScale() {
    // Design reference: 400 wide, 700 tall (same as menu)
    var s = Math.min(W / 400, H / 700);
    var ox = (W - 400 * s) / 2;
    var oy = (H - 700 * s) / 2;
    _uiTransform = { scale: s, ox: ox, oy: oy };
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
  }
  function _restoreUIScale() {
    ctx.restore();
  }
  // Convert a screen-space click (cx,cy) into design-space coords
  function _toDesignCoords(cx, cy) {
    return {
      x: (cx - _uiTransform.ox) / _uiTransform.scale,
      y: (cy - _uiTransform.oy) / _uiTransform.scale
    };
  }
  function drawMenuParticles() {
    if (menuParticles.length < 30) {
      menuParticles.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3, alpha: Math.random() * 0.5 + 0.2, size: 1 + Math.random() * 2 });
    }
    for (var mi = menuParticles.length - 1; mi >= 0; mi--) {
      var mp = menuParticles[mi];
      mp.x += mp.vx; mp.y += mp.vy;
      if (mp.y < -10) { mp.y = H + 10; mp.x = Math.random() * W; }
      ctx.globalAlpha = mp.alpha;
      ctx.fillStyle = '#4488ff';
      ctx.beginPath(); ctx.arc(mp.x, mp.y, mp.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Helper: stylized menu button with gradient, border glow, inner highlight
  function _drawMenuButton(x, y, w, h, label, colorHi, colorLo, borderColor) {
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, colorHi);
    grad.addColorStop(1, colorLo);
    ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
    // Inner top highlight
    var topGrad = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    topGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    topGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = topGrad; ctx.fillRect(x + 2, y + 2, w - 4, h * 0.5);
    // Border + glow
    ctx.save();
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
    // Label with outline
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3;
    ctx.strokeText(label, x + w / 2, y + h / 2 + 5);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    ctx.lineWidth = 1;
  }

  function drawMenu() {
    // === Design-space approach: author in 400×700, ctx.scale to fill screen ===
    var baseW = 400, baseH = 700;
    var menuScale = Math.min(W / baseW, H / baseH);
    var offsetX = (W - baseW * menuScale) / 2;
    var offsetY = (H - baseH * menuScale) / 2;

    // Full-screen background (drawn in real coords before transform)
    var bgGrad = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    bgGrad.addColorStop(0, '#1a1a4e');
    bgGrad.addColorStop(0.4, '#0c0c2a');
    bgGrad.addColorStop(1, '#04040e');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
    // Nebula rings
    var ringT = Date.now() * 0.0003;
    ctx.save();
    ctx.translate(W / 2, H * 0.38);
    for (var ri = 0; ri < 4; ri++) {
      ctx.globalAlpha = 0.08 + 0.04 * Math.sin(ringT * 2 + ri);
      ctx.strokeStyle = ri % 2 === 0 ? '#4488ff' : '#8844ff';
      ctx.lineWidth = 1.5;
      var rr = (100 + ri * 50) * menuScale + Math.sin(ringT * 3 + ri) * 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, rr, rr * 0.45, ringT * (0.4 + ri * 0.1), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    drawMenuParticles();
    // Mountains
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#0a0a1e';
    ctx.beginPath(); ctx.moveTo(0, H * 0.72);
    for (var mx = 0; mx <= W; mx += 60) ctx.lineTo(mx, H * 0.62 + Math.sin(mx * 0.013 + 0.7) * 20 + Math.cos(mx * 0.005) * 10);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.restore();

    // === Enter design space (400×700) ===
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(menuScale, menuScale);

    // --- Logo frame (y: 20-100) ---
    var logoPulse = 1 + Math.sin(Date.now() * 0.002) * 0.02;
    var frameX = 30, frameY = 20, frameW = 340, frameH = 80;
    var _logoUsed9 = draw9Slice(ctx, frameX, frameY, frameW, frameH, { cornerSize: 16, alpha: 1 });
    if (!_logoUsed9) {
      ctx.save();
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18;
      var fGrad = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
      fGrad.addColorStop(0, 'rgba(40,30,10,0.85)'); fGrad.addColorStop(1, 'rgba(15,10,4,0.85)');
      ctx.fillStyle = fGrad; ctx.fillRect(frameX, frameY, frameW, frameH);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
      ctx.strokeRect(frameX, frameY, frameW, frameH);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(frameX + 4, frameY + 4, frameW - 8, frameH - 8);
    }
    ctx.save();
    ctx.translate(200, frameY + frameH / 2);
    ctx.scale(logoPulse, logoPulse);
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
    ctx.font = 'bold 42px "KaiTi", "STKaiti", "SimHei", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", serif';
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffe066';
    ctx.fillText('生存之王', 0, 6);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#ffd966'; ctx.textAlign = 'center';
    ctx.fillText('— King of Survive —', 200, frameY + frameH + 16);

    // --- Character portrait (y: 140-320) ---
    var cls = CLASS_DEFS[selectedClass] || CLASS_DEFS.warrior;
    var charY = 230 + Math.sin(Date.now() * 0.002) * 4;
    var pR = 52;
    // Halo
    var breathe = 0.25 + 0.18 * Math.sin(Date.now() * 0.003);
    ctx.save();
    var hGrad = ctx.createRadialGradient(200, charY, 8, 200, charY, pR * 1.8);
    hGrad.addColorStop(0, cls.color); hGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = breathe; ctx.fillStyle = hGrad;
    ctx.beginPath(); ctx.arc(200, charY, pR * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Ring
    ctx.save();
    ctx.shadowColor = cls.color; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(200, charY, pR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // Sprite
    if (typeof drawCharacterSprite === 'function') {
      drawCharacterSprite(200, charY + 8, pR * 0.8, selectedClass, Math.PI * 1.5, { skinId: equippedSkin || 'default', animState: 'idle' });
    } else {
      ctx.fillStyle = cls.color;
      ctx.beginPath(); ctx.arc(200, charY, pR * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // Class tag
    var tgY = charY + pR + 14;
    ctx.fillStyle = 'rgba(20,20,40,0.85)';
    ctx.fillRect(100, tgY, 200, 28);
    ctx.strokeStyle = cls.color; ctx.lineWidth = 1.5;
    ctx.strokeRect(100, tgY, 200, 28);
    ctx.fillStyle = cls.color; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(cls.icon + '  ' + cls.name, 200, tgY + 18);
    ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#aaa';
    ctx.fillText(cls.passive, 200, tgY + 40);
    // Best record
    if (bestRecord.kills > 0 || gold > 0) {
      ctx.font = 'bold 12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
      var recLine = '';
      if (bestRecord.kills > 0) recLine += '🏆 ' + bestRecord.kills + '杀 · ' + Math.floor(bestRecord.time) + 's';
      if (gold > 0) { if (recLine) recLine += '  '; recLine += '💰 ' + gold; }
      ctx.fillText(recLine, 200, tgY + 56);
    }

    // --- Buttons (y: 420-660) — 3 rows of 2, fill bottom area ---
    var bW = 160, bH = 48, bGap = 10;
    var bXl = 200 - bW - bGap / 2, bXr = 200 + bGap / 2;
    var bY0 = 430;
    ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    _drawMenuButton(bXl, bY0, bW, bH, '单排模式', '#4a8a4a', '#1e4a1e', '#6fd66f');
    _drawMenuButton(bXr, bY0, bW, bH, '组队模式', '#4a6a9a', '#1e2e5e', '#6fa6ff');
    var bY1 = bY0 + bH + bGap;
    ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    _drawMenuButton(bXr, bY1, bW, bH, '⚔ 强化', '#9a7a2a', '#4a3612', '#ffd700');
    var bY2 = bY1 + bH + bGap;
    _drawMenuButton(bXl, bY2, bW, bH, '👥 双人', '#6a3a9a', '#2a1a4e', '#c090ff');
    _drawMenuButton(bXr, bY2, bW, bH, '⏱ 限时', '#9a3a3a', '#4a1a1a', '#ff9080');

    // Tutorial hint
    ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = 'rgba(170,170,200,0.7)'; ctx.textAlign = 'center';
    ctx.fillText('鼠标 / 触屏移动角色，自动攻击最近敌人', 200, 680);

    ctx.restore(); // exit design-space transform

    // --- Store hit-rects in screen coords (design × menuScale + offset) ---
    function _scRect(dx, dy, dw, dh) { return { x: dx * menuScale + offsetX, y: dy * menuScale + offsetY, w: dw * menuScale, h: dh * menuScale }; }
    _menuBtns.solo    = _scRect(bXl, bY0, bW, bH);
    _menuBtns.team    = _scRect(bXr, bY0, bW, bH);
    _menuBtns.upgrade = _scRect(bXr, bY1, bW, bH);
    _menuBtns.multi   = _scRect(bXl, bY2, bW, bH);
    _menuBtns.timed   = _scRect(bXr, bY2, bW, bH);
  }

  function drawCharSelect() {
    // Design space: 400x700 (called inside _applyUIScale)
    var DW = 400, DH = 700;
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('选择角色', DW / 2, 40);

    // R5n F2 / R5v F3 — 5 selectable classes. Further tightened pitch 68 → 56
    // and card height 60 → 50 to fit 5 cards above attribute panel (y=350).
    var classKeys = ['warrior', 'mage', 'scout', 'assassin', 'healer'];
    for (var i = 0; i < classKeys.length; i++) {
      var cls = CLASS_DEFS[classKeys[i]];
      var by = 50 + i * 56;
      var isSelected = selectedClass === classKeys[i];
      // Card
      ctx.fillStyle = isSelected ? '#1a1a3e' : '#111118';
      ctx.fillRect(DW / 2 - 190, by, 380, 50);
      ctx.strokeStyle = isSelected ? cls.color : '#333'; ctx.lineWidth = 2;
      ctx.strokeRect(DW / 2 - 190, by, 380, 50);
      drawCharacterSprite(DW / 2 - 155, by + 25, 14, classKeys[i], 0, { skinId: isSelected ? equippedSkin : 'default', animState: 'idle' });
      ctx.font = '14px "Noto Sans SC","PingFang SC",sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = cls.color;
      ctx.fillText(cls.icon, DW / 2 - 175, by + 14);
      ctx.font = 'bold 14px "Noto Sans SC","PingFang SC",sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(cls.name, DW / 2 - 135, by + 16);
      ctx.font = '9px "Noto Sans SC","PingFang SC",sans-serif'; ctx.fillStyle = '#aaa';
      ctx.fillText('HP:' + cls.hp + '  攻:' + cls.attackDamage + '  速:' + cls.speed, DW / 2 - 135, by + 30);
      ctx.fillStyle = '#888'; ctx.font = '8px "Noto Sans SC","PingFang SC",sans-serif';
      ctx.fillText(cls.passive, DW / 2 - 135, by + 42);
      ctx.textAlign = 'right'; ctx.fillStyle = cls.color; ctx.font = 'bold 13px "Noto Sans SC","PingFang SC",sans-serif';
      ctx.fillText('▶', DW / 2 + 170, by + 28);
    }

    // === Attribute Panel (US-009) ===
    var selCls = CLASS_DEFS[selectedClass];
    var initAttrs = selCls.initialAttributes || { INT: 5, STR: 5, AGI: 5, STA: 5 };
    // Sync playerAttributes to selected class if changed
    if (!playerAttributes._classInit || playerAttributes._classInit !== selectedClass) {
      playerAttributes.INT = initAttrs.INT; playerAttributes.STR = initAttrs.STR;
      playerAttributes.AGI = initAttrs.AGI; playerAttributes.STA = initAttrs.STA;
      attributePoints = 5;
      playerAttributes._classInit = selectedClass;
    }
    var attrNames = ['INT', 'STR', 'AGI', 'STA'];
    var attrLabels = { INT: '智力(法术强度↑)', STR: '力量(攻击+护甲↑)', AGI: '敏捷(速度+暴击↑)', STA: '耐力(生命+回血↑)' };
    var panelY = 350;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(DW / 2 - 190, panelY - 5, 380, 130);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(DW / 2 - 190, panelY - 5, 380, 130);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('属性分配 (剩余:' + attributePoints + ')', DW / 2, panelY + 12);
    for (var ai = 0; ai < 4; ai++) {
      var aKey = attrNames[ai];
      var aVal = playerAttributes[aKey];
      var ay = panelY + 25 + ai * 24;
      ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ccc';
      ctx.fillText(attrLabels[aKey] + ': ' + aVal, DW / 2 - 170, ay + 12);
      // "-" button
      ctx.fillStyle = aVal > 0 ? '#a44' : '#333'; ctx.fillRect(DW / 2 + 60, ay, 24, 18);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('-', DW / 2 + 72, ay + 14);
      // "+" button
      ctx.fillStyle = attributePoints > 0 ? '#4a4' : '#333'; ctx.fillRect(DW / 2 + 90, ay, 24, 18);
      ctx.fillStyle = '#fff'; ctx.fillText('+', DW / 2 + 102, ay + 14);
    }
    // Derived stats preview
    var derivedStats = (typeof RPGEngine !== 'undefined' && RPGEngine.calculateDerivedStats)
      ? RPGEngine.calculateDerivedStats(playerAttributes, selCls, 1) : null;
    if (derivedStats) {
      var dsY = panelY + 128;
      ctx.fillStyle = '#111'; ctx.fillRect(DW / 2 - 190, dsY, 380, 50);
      ctx.strokeStyle = '#333'; ctx.strokeRect(DW / 2 - 190, dsY, 380, 50);
      ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#8f8'; ctx.textAlign = 'left';
      var atkLabel = selectedClass === 'mage' ? '法术强度' : '攻击力';
      var atkValue = selectedClass === 'mage' ? derivedStats.skillPower : derivedStats.physicalAttack;
      ctx.fillText('生命:' + derivedStats.maxHP + '  ' + atkLabel + ':' + atkValue.toFixed(1) + '  移速:' + derivedStats.moveSpeed.toFixed(1), DW / 2 - 180, dsY + 16);
      ctx.fillText('暴击:' + (derivedStats.critRate * 100).toFixed(1) + '%  护甲:' + derivedStats.armor.toFixed(1) + '  回血:' + derivedStats.hpRegen.toFixed(1) + '/s', DW / 2 - 180, dsY + 34);
    }

    // === Skin Selection Panel ===
    var skinPanelY = (derivedStats ? panelY + 185 : panelY + 135);
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(DW / 2 - 190, skinPanelY, 380, 110);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(DW / 2 - 190, skinPanelY, 380, 110);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🎨 皮肤选择', DW / 2, skinPanelY + 16);
    // Get skins applicable to selected class
    var applicableSkins = skinCollection.filter(function(sk) {
      var sd = skinsData[sk.id];
      if (!sd) return sk.id === 'default';
      return !sd.applicableClasses || sd.applicableClasses.indexOf(selectedClass) >= 0;
    });
    var skinCols = Math.min(applicableSkins.length, 8);
    var skinSize = 28;
    var skinGap = 6;
    var skinStartX = DW / 2 - (skinCols * (skinSize + skinGap) - skinGap) / 2;
    var skinRowY = skinPanelY + 30;
    var tierColors = { C: '#aaa', B: '#4a9eff', A: '#c44aff', S: '#ffd700' };
    for (var si = 0; si < applicableSkins.length && si < 16; si++) {
      var sk = applicableSkins[si];
      var sd = skinsData[sk.id] || {};
      var row = Math.floor(si / 8);
      var col = si % 8;
      var skx = skinStartX + col * (skinSize + skinGap);
      var sky = skinRowY + row * (skinSize + skinGap + 8);
      var isEquipped = (equippedSkin === sk.id);
      // Background
      ctx.fillStyle = isEquipped ? '#2a2a4e' : '#111118';
      ctx.fillRect(skx, sky, skinSize, skinSize);
      ctx.strokeStyle = isEquipped ? '#ffd700' : (sk.owned ? (tierColors[sk.tier] || '#444') : '#333');
      ctx.lineWidth = isEquipped ? 2 : 1;
      ctx.strokeRect(skx, sky, skinSize, skinSize);
      // Character preview
      drawCharacterSprite(skx + skinSize / 2, sky + skinSize / 2, 10, selectedClass, 0, { skinId: sk.id, animState: 'idle' });
      // Lock icon for unowned
      if (!sk.owned && sk.id !== 'default') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(skx, sky, skinSize, skinSize);
        ctx.fillStyle = '#888'; ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🔒', skx + skinSize / 2, sky + skinSize / 2 + 4);
      }
      // Tier badge
      if (sd.tier && sd.tier !== 'C') {
        ctx.fillStyle = tierColors[sd.tier] || '#888'; ctx.font = 'bold 8px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(sd.tier, skx + 2, sky + 9);
      }
    }
    // Show equipped skin name
    var eqSkinData = skinsData[equippedSkin] || {};
    ctx.fillStyle = '#ccc'; ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('当前: ' + (eqSkinData.name || '默认'), DW / 2, skinPanelY + 103);

    // Back
    ctx.fillStyle = '#333'; ctx.fillRect(DW / 2 - 50, DH - 50, 100, 36);
    ctx.fillStyle = '#888'; ctx.fillRect(DW / 2 - 48, DH - 48, 96, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('← 返回', DW / 2, DH - 28);
  }

  function drawUpgradeMenu() {
    // Design space: 400x700
    var DW = 400, DH = 700;
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(0, 0, DW, DH);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 28px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('⚔ 永久强化', DW / 2, 40);
    ctx.fillStyle = '#ffd700'; ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillText('💰 ' + gold + ' 金币', DW / 2, 65);

    for (var i = 0; i < META_UPGRADE_DEFS.length; i++) {
      var def = META_UPGRADE_DEFS[i];
      var lv = metaUpgrades[def.id] || 0;
      var cost = def.cost * (lv + 1);
      var canBuy = gold >= cost;
      var bx = DW / 2 - 160, by = 85 + i * 70;
      // Card
      ctx.fillStyle = canBuy ? '#1a1a2e' : '#111118';
      ctx.fillRect(bx, by, 320, 58);
      ctx.strokeStyle = canBuy ? '#ffd700' : '#333'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, 320, 58);
      // Icon + name
      ctx.font = '20px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillStyle = canBuy ? '#fff' : '#555';
      ctx.fillText(def.icon + ' ' + def.name, bx + 12, by + 25);
      // Level
      ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#888';
      ctx.fillText('Lv.' + lv + ' → Lv.' + (lv + 1), bx + 12, by + 45);
      // Desc
      ctx.fillText(def.desc, bx + 140, by + 25);
      // Cost
      ctx.textAlign = 'right';
      ctx.fillStyle = canBuy ? '#ffd700' : '#664400';
      ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText('💰' + cost, bx + 310, by + 45);
    }

    // Back button
    ctx.fillStyle = '#333'; ctx.fillRect(DW / 2 - 50, DH - 50, 100, 36);
    ctx.fillStyle = '#888'; ctx.fillRect(DW / 2 - 48, DH - 48, 96, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('← 返回', DW / 2, DH - 28);
  }

  // Wave 2 layout: landscape cards 280x360, horizontal row, rarity-colored border
  var WAVE2_CARD_RECTS = []; // [{x, y, w, h, idx}] — refreshed each drawLevelUp()

  function drawLevelUp() {
    var useWave2 = !!(WAVE2_CARDS && skillChoices && skillChoices.length > 0
                      && typeof skillChoices[0] === 'object');
    ctx.fillStyle = useWave2 ? 'rgba(0,0,0,0.86)' : 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    // skillCardAnim (US-303): update slide-in timer
    if (skillCardAnim.active) {
      skillCardAnim.timer += 0.016;
      if (skillCardAnim.timer >= skillCardAnim.duration) skillCardAnim.active = false;
    }
    var cardProgress = skillCardAnim.active ? Math.min(1, skillCardAnim.timer / skillCardAnim.duration) : 1;
    var cardEase = cardProgress < 1 ? 1 - Math.pow(1 - cardProgress, 3) : 1;
    var _newCardRenderer = useWave2 && window.KOS_RENDER && typeof window.KOS_RENDER.drawLevelUpCards === 'function';
    if (!_newCardRenderer) {
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 30px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.globalAlpha = cardEase;
      ctx.fillText('⬆ LEVEL UP — 选择升级', W / 2, 80);
      ctx.globalAlpha = 1;
    }

    if (useWave2) {
      if (_newCardRenderer) {
        var _newRects = window.KOS_RENDER.drawLevelUpCards(ctx, {
          W: W,
          H: H,
          cards: skillChoices,
          rarities: WAVE2_CARDS.rarities || {},
          skillLevels: skillLevels,
          anim: skillCardAnim
        });
        if (_newRects && _newRects.length) {
          WAVE2_CARD_RECTS = _newRects;
          return;
        }
      }
      // ---- Wave 2: 3 landscape cards, rarity-colored, keyboard 1/2/3 hints ----
      WAVE2_CARD_RECTS.length = 0;
      var cardW = 280, cardH = 360, gap = 24;
      var totalW = cardW * skillChoices.length + gap * (skillChoices.length - 1);
      var startX = (W - totalW) / 2;
      var cardY = (H - cardH) / 2 + 20;
      var pulseT = Date.now() * 0.003;
      // Determine hovered card by mouse position
      var hoverIdx = -1;
      for (var _hi2 = 0; _hi2 < skillChoices.length; _hi2++) {
        var hrx = startX + _hi2 * (cardW + gap);
        if (mouseX >= hrx && mouseX <= hrx + cardW && mouseY >= cardY && mouseY <= cardY + cardH) {
          hoverIdx = _hi2; break;
        }
      }
      for (var i = 0; i < skillChoices.length; i++) {
        var card = skillChoices[i];
        var rDef = (WAVE2_CARDS.rarities && WAVE2_CARDS.rarities[card.rarity]) || { borderColor: '#888', nameColor: '#fff', tagBgColor: '#444', label: card.rarity };
        var cardDelay = i * 0.08;
        var cardT = Math.max(0, (skillCardAnim.timer - cardDelay) / (skillCardAnim.duration - cardDelay));
        var slideEase = skillCardAnim.active ? Math.min(1, 1 - Math.pow(1 - cardT, 3)) : 1;
        var cx = startX + i * (cardW + gap);
        var cy = cardY + (1 - slideEase) * 40;
        var isHover = (i === hoverIdx);
        var hoverScale = isHover ? 1.05 : 1;
        var rareEpic = (card.rarity === 'epic' || card.rarity === 'evolution' || card.rarity === 'legendary');
        ctx.globalAlpha = slideEase;
        // --- Save for scaling transform ---
        ctx.save();
        ctx.translate(cx + cardW / 2, cy + cardH / 2);
        ctx.scale(hoverScale, hoverScale);
        ctx.translate(-(cx + cardW / 2), -(cy + cardH / 2));
        // --- Outer glow pulse (epic+ always, hover always) ---
        if (isHover || rareEpic) {
          ctx.save();
          ctx.shadowColor = rDef.borderColor;
          ctx.shadowBlur = 30 + Math.sin(pulseT + i) * 10;
          ctx.fillStyle = 'rgba(0,0,0,0.01)'; // trigger shadow draw
          ctx.fillRect(cx - 4, cy - 4, cardW + 8, cardH + 8);
          ctx.restore();
        }
        // --- Drop shadow (always) ---
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(cx + 6, cy + 8, cardW, cardH);
        // --- Card background gradient ---
        var cardBgGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
        cardBgGrad.addColorStop(0, '#1a1a32');
        cardBgGrad.addColorStop(0.5, '#10101e');
        cardBgGrad.addColorStop(1, '#05050c');
        ctx.fillStyle = cardBgGrad;
        ctx.fillRect(cx, cy, cardW, cardH);
        // Subtle radial accent from top using rarity color
        var accentGrad = ctx.createRadialGradient(cx + cardW / 2, cy + 90, 10, cx + cardW / 2, cy + 90, 160);
        accentGrad.addColorStop(0, rDef.borderColor + '44');
        accentGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = accentGrad;
        ctx.fillRect(cx, cy + 28, cardW, cardH - 28);
        // --- Rarity border (thick, glow, pulses) ---
        ctx.save();
        ctx.shadowColor = rDef.borderColor;
        ctx.shadowBlur = rareEpic ? (18 + Math.sin(pulseT * 2 + i) * 6) : 10;
        ctx.strokeStyle = rDef.borderColor;
        ctx.lineWidth = card.rarity === 'evolution' ? 4 : (rareEpic ? 3.5 : 2.5);
        ctx.strokeRect(cx + 0.5, cy + 0.5, cardW - 1, cardH - 1);
        ctx.restore();
        // Inner hairline
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        ctx.strokeRect(cx + 4, cy + 4, cardW - 8, cardH - 8);
        // --- Rarity tag (top strip) ---
        var tagGradC = ctx.createLinearGradient(cx, cy, cx, cy + 32);
        tagGradC.addColorStop(0, rDef.tagBgColor);
        tagGradC.addColorStop(1, rDef.borderColor + '40');
        ctx.fillStyle = tagGradC;
        ctx.fillRect(cx, cy, cardW, 32);
        // Strip shine
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(cx + 2, cy + 2, cardW - 4, 14);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
        ctx.strokeText((rDef.label || card.rarity || '').toUpperCase(), cx + cardW / 2, cy + 21);
        ctx.fillText((rDef.label || card.rarity || '').toUpperCase(), cx + cardW / 2, cy + 21);
        ctx.lineWidth = 1;
        // --- Icon halo circle ---
        var iconCY = cy + 120;
        var haloR = 54 + (isHover ? 4 : 0);
        var iconHalo = ctx.createRadialGradient(cx + cardW / 2, iconCY, 5, cx + cardW / 2, iconCY, haloR);
        iconHalo.addColorStop(0, rDef.borderColor + 'cc');
        iconHalo.addColorStop(0.5, rDef.borderColor + '33');
        iconHalo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = iconHalo;
        ctx.beginPath(); ctx.arc(cx + cardW / 2, iconCY, haloR, 0, Math.PI * 2); ctx.fill();
        // Ring
        ctx.strokeStyle = rDef.borderColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + cardW / 2, iconCY, 46, 0, Math.PI * 2); ctx.stroke();
        // --- Big icon ---
        ctx.save();
        ctx.shadowColor = rDef.borderColor;
        ctx.shadowBlur = rareEpic ? 16 : 6;
        ctx.font = '70px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = rDef.nameColor || '#fff';
        ctx.fillText(card.icon || '★', cx + cardW / 2, iconCY + 22);
        ctx.restore();
        // --- Sparkle particles on epic+ ---
        if (rareEpic) {
          for (var _spi = 0; _spi < 6; _spi++) {
            var sAng = pulseT * 0.8 + _spi * (Math.PI * 2 / 6) + i;
            var sRad = haloR + 6 + Math.sin(pulseT * 2 + _spi) * 4;
            var sxSp = cx + cardW / 2 + Math.cos(sAng) * sRad;
            var sySp = iconCY + Math.sin(sAng) * sRad * 0.8;
            ctx.fillStyle = rDef.borderColor;
            ctx.globalAlpha = slideEase * (0.5 + 0.5 * Math.sin(pulseT * 3 + _spi));
            ctx.beginPath(); ctx.arc(sxSp, sySp, 2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = slideEase;
        }
        // --- Name ---
        ctx.font = 'bold 22px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
        ctx.strokeText(card.name || card.id || '?', cx + cardW / 2, cy + 202);
        ctx.fillStyle = rDef.nameColor || '#fff';
        ctx.fillText(card.name || card.id || '?', cx + cardW / 2, cy + 202);
        ctx.lineWidth = 1;
        // --- Description (word-wrapped) ---
        ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#c8c8d8';
        var desc = card.desc || '';
        var words = desc.split('');
        var line = '', lineY = cy + 230, lineH = 18, maxW = cardW - 40;
        for (var wi = 0; wi < words.length; wi++) {
          var test = line + words[wi];
          if (ctx.measureText(test).width > maxW && line.length > 0) {
            ctx.fillText(line, cx + cardW / 2, lineY);
            line = words[wi]; lineY += lineH;
          } else {
            line = test;
          }
        }
        if (line) ctx.fillText(line, cx + cardW / 2, lineY);
        // --- Current stack indicator ---
        var curLv = skillLevels[card.id] || 0;
        var cap = card.stackCap || 1;
        ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#888';
        ctx.fillText('当前 ' + curLv + ' / ' + cap, cx + cardW / 2, cy + cardH - 54);
        // --- Keyboard hint circle (bottom) ---
        ctx.save();
        ctx.shadowColor = rDef.borderColor;
        ctx.shadowBlur = isHover ? 12 : 6;
        ctx.fillStyle = rDef.borderColor;
        ctx.beginPath();
        ctx.arc(cx + cardW / 2, cy + cardH - 24, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx + cardW / 2, cy + cardH - 24, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#0e0e1a'; ctx.font = 'bold 17px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), cx + cardW / 2, cy + cardH - 18);
        // Synergy preview (Experiment A, Testor 2026-04-19: show path from the
        // first level-up). Priority ready > almost > potential.
        //   ready   : picking this brings both to Lv3+ (will evolve next LU)
        //   almost  : self and partner both ≥ Lv2 after pick — 1 level away
        //   potential: any recipe this card is part of (shows destination)
        var _nextLvl = (skillLevels[card.id] || 0) + 1;
        var _syReady = null, _syAlmost = null, _syPotential = null;
        for (var _si = 0; _si < EVOLUTION_RECIPES.length; _si++) {
          var _rec = EVOLUTION_RECIPES[_si];
          if (evolvedSkills[_rec.result]) continue;
          var _partner = null;
          if (_rec.a === card.id) _partner = _rec.b;
          else if (_rec.b === card.id) _partner = _rec.a;
          if (!_partner) continue;
          var _pLvl = skillLevels[_partner] || 0;
          if (_nextLvl >= 3 && _pLvl >= 3) _syReady = _rec;
          else if (_nextLvl >= 2 && _pLvl >= 2) { if (!_syAlmost) _syAlmost = _rec; }
          else if (!_syPotential) _syPotential = _rec;
        }
        var _syStage = _syReady || _syAlmost || _syPotential;
        if (_syStage) {
          ctx.save();
          var _syY = cy - 18;
          var _syColor = _syStage.color || '#ffd700';
          var _syPrefix = _syReady ? '⭐ 进化就绪 → '
                        : _syAlmost ? '✨ 即将进化 → '
                        : '可合成 → ';
          ctx.globalAlpha = _syReady ? (0.65 + 0.35 * Math.abs(Math.sin(Date.now() / 320)))
                          : _syAlmost ? 0.95
                          : 0.85;
          ctx.fillStyle = _syColor;
          ctx.strokeStyle = '#000'; ctx.lineWidth = 3.5;
          ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
          ctx.textAlign = 'center';
          var _syT = _syPrefix + (_syStage.name || '');
          ctx.strokeText(_syT, cx + cardW / 2, _syY);
          ctx.fillText(_syT, cx + cardW / 2, _syY);
          ctx.restore();
        }
        ctx.restore(); // end hover scale transform
        ctx.globalAlpha = 1;
        // Store hit-rect for click handler (use unscaled coords so clicks remain accurate)
        WAVE2_CARD_RECTS.push({ x: cx, y: cy, w: cardW, h: cardH, idx: i });
      }
      // Footer hint
      ctx.fillStyle = '#aaa'; ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('按 1 / 2 / 3 或点击卡牌选择（不可跳过）', W / 2, cardY + cardH + 32);
      return; // done — skip legacy render
    }

    // ---- Legacy fallback (cards.json not loaded) ----
    for (var i = 0; i < skillChoices.length; i++) {
      var id = skillChoices[i];
      var sd = SKILL_DATA[id];
      var lv = (skillLevels[id] || 0) + 1;
      // cardEntrance: each card slides from different direction with staggered delay
      var cardDelay = i * 0.08;
      var cardT = Math.max(0, (skillCardAnim.timer - cardDelay) / (skillCardAnim.duration - cardDelay));
      var slideEase = skillCardAnim.active ? Math.min(1, 1 - Math.pow(1 - cardT, 3)) : 1;
      var slideDir = (i % 2 === 0) ? -1 : 1;
      var slideOffset = (1 - slideEase) * 300 * slideDir;
      var bx = W / 2 - 140 + slideOffset, by = H / 4 + 20 + i * 80;
      ctx.globalAlpha = slideEase;
      // Card background
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(bx, by, 280, 65);
      ctx.strokeStyle = sd.color; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 280, 65);
      // Icon
      ctx.font = '24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = sd.color;
      ctx.fillText(sd.icon, bx + 15, by + 38);
      // Name + level
      ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(sd.name + ' Lv.' + lv, bx + 50, by + 28);
      // Description
      ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#aaa';
      ctx.fillText(sd.desc, bx + 50, by + 48);
      // skillTooltipDps (US-335): show estimated DPS/survival impact per skill
      // Use per-level desc from async-loaded skills data
      var damagePreview = '';
      var skillFullData = _skillsFullData ? _skillsFullData[id] : null;
      if (skillFullData && skillFullData.levels && skillFullData.levels[String(lv)]) {
        damagePreview = skillFullData.levels[String(lv)].desc || '';
      } else {
        damagePreview = sd.desc || '';
      }
      ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#8f8';
      ctx.fillText(damagePreview, bx + 50, by + 60);
      // Level dots
      for (var d = 0; d < 5; d++) {
        ctx.fillStyle = d < lv ? sd.color : '#333';
        ctx.beginPath(); ctx.arc(bx + 250 + d * 8, by + 33, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Evolution hint (US-211): show nearest possible evolution for shown skills
    var evoHint = '';
    for (var ei = 0; ei < skillChoices.length; ei++) {
      var sid = skillChoices[ei];
      for (var ri = 0; ri < EVOLUTION_RECIPES.length; ri++) {
        var rec = EVOLUTION_RECIPES[ri];
        if (evolvedSkills[rec.result]) continue;
        if (rec.a === sid || rec.b === sid) {
          var partner = rec.a === sid ? rec.b : rec.a;
          var sLv = skillLevels[sid] || 0;
          var pLv = skillLevels[partner] || 0;
          if (sLv >= 1 && pLv >= 1) {
            evoHint = '进化提示: ' + (SKILL_DATA[sid] || {}).name + '(' + sLv + '/3) + ' + (SKILL_DATA[partner] || {}).name + '(' + pLv + '/3) → ' + rec.name;
            break;
          }
        }
      }
      if (evoHint) break;
    }
    if (evoHint) {
      ctx.fillStyle = '#c8f'; ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(evoHint, W / 2, H / 4 + 10);
    }

    // tempAttribute panel (US-009): allocate temporary attribute points on levelUp
    if (tempAttributePoints > 0) {
      var tapY = H / 4 + 20 + skillChoices.length * 80 + 5;
      ctx.fillStyle = '#1a2a1a'; ctx.fillRect(W / 2 - 140, tapY, 280, 28);
      ctx.strokeStyle = '#4a4'; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 140, tapY, 280, 28);
      ctx.fillStyle = '#8f8'; ctx.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('临时属性点 +1 (剩余:' + tempAttributePoints + ')', W / 2, tapY + 12);
      var tapBtnNames = ['INT', 'STR', 'AGI', 'STA'];
      for (var ti = 0; ti < 4; ti++) {
        var tbx = W / 2 - 130 + ti * 66;
        ctx.fillStyle = '#2a3a2a'; ctx.fillRect(tbx, tapY + 14, 60, 12);
        ctx.fillStyle = '#8f8'; ctx.font = '10px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('+1 ' + tapBtnNames[ti], tbx + 30, tapY + 24);
      }
    }

    // Reroll button (costs gold)
    var rerollCost = 25;
    var canReroll = gold >= rerollCost;
    var rbyOffset = tempAttributePoints > 0 ? 40 : 0;
    var rbx = W / 2 - 60, rby = H / 4 + 20 + skillChoices.length * 80 + 10 + rbyOffset;
    ctx.fillStyle = canReroll ? '#2a2a1a' : '#111118';
    ctx.fillRect(rbx, rby, 120, 36);
    ctx.strokeStyle = canReroll ? '#ffd700' : '#333'; ctx.lineWidth = 1;
    ctx.strokeRect(rbx, rby, 120, 36);
    ctx.fillStyle = canReroll ? '#ffd700' : '#555'; ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🔄 重摇 💰' + rerollCost, W / 2, rby + 23);
  }

  function getGrade() {
    var score = kills * 2 + Math.floor(gameTime) + wave * 20 + maxStreak * 3;
    if (score >= 600) return { letter: 'S', color: '#ffd700' };
    if (score >= 400) return { letter: 'A', color: '#ff4444' };
    if (score >= 250) return { letter: 'B', color: '#ff8800' };
    if (score >= 100) return { letter: 'C', color: '#4488ff' };
    return { letter: 'D', color: '#888' };
  }

  // deathShareCard — shareResultCard for social sharing (US-278)
  function drawDeathShareCard() {
    // shareCardArt (US-285): gradient background + starfield inside card
    var cardX = W / 2 - 150, cardY = 15, cardW = 300, cardH = 180;
    // Gold border for new records, blue otherwise
    var borderColor = isNewRecord ? '#ffd700' : '#4488ff';
    ctx.fillStyle = borderColor; ctx.fillRect(cardX - 3, cardY - 3, cardW + 6, cardH + 6);
    // Gradient background instead of flat dark
    var cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    var biomeC1 = (currentBiome && currentBiome.bgColor) || '#0a0a2a';
    var biomeC2 = (currentBiome && currentBiome.bgColor2) || '#1a0a2a';
    cardGrad.addColorStop(0, biomeC1); cardGrad.addColorStop(1, biomeC2);
    ctx.fillStyle = cardGrad; ctx.fillRect(cardX, cardY, cardW, cardH);
    // Mini starfield inside card
    ctx.save(); ctx.beginPath(); ctx.rect(cardX, cardY, cardW, cardH); ctx.clip();
    for (var csi = 0; csi < 20; csi++) {
      var csx = cardX + ((csi * 37 + 11) % cardW);
      var csy = cardY + ((csi * 53 + 7) % cardH);
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.002 + csi);
      ctx.fillStyle = csi % 3 === 0 ? '#aaccff' : '#ffffff';
      ctx.beginPath(); ctx.arc(csx, csy, 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    // Title bar
    ctx.fillStyle = borderColor + '30'; ctx.fillRect(cardX, cardY, cardW, 35);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('幸存者 — 战绩卡', W / 2, cardY + 22);
    // gradeAnimation (US-308): dramatic grade reveal — flip through D→C→B→A→S
    var grade = getGrade();
    if (gradeAnimation.active) {
      gradeAnimation.timer += 0.016;
      var gradeRevealTime = gradeAnimation.duration * 0.7; // 70% of duration for reveal
      if (gradeAnimation.timer < gradeRevealTime) {
        // Cycling through grades
        var gradeFlipSpeed = 0.15 + gradeAnimation.timer * 0.3; // accelerating
        gradeAnimation.currentGrade = Math.min(gradeAnimation.finalGrade, Math.floor(gradeAnimation.timer / gradeFlipSpeed));
      } else {
        gradeAnimation.currentGrade = gradeAnimation.finalGrade;
        if (gradeAnimation.timer >= gradeAnimation.duration) {
          gradeAnimation.active = false;
        }
      }
      var displayGrade = GRADE_ORDER[Math.min(gradeAnimation.currentGrade, GRADE_ORDER.length - 1)];
      var gradeScale = gradeAnimation.currentGrade >= gradeAnimation.finalGrade ? (1 + Math.sin(gradeAnimation.timer * 8) * 0.1) : 1.2;
      ctx.font = 'bold ' + Math.round(48 * gradeScale) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = grade.color;
      ctx.fillText(displayGrade, W / 2, cardY + 70);
      // Particle burst when final grade revealed
      if (gradeAnimation.currentGrade >= gradeAnimation.finalGrade && Math.random() < 0.2) {
        particles.push({ x: W / 2 + (Math.random() - 0.5) * 60, y: cardY + 55, vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 40, life: 0.5, maxLife: 0.5, color: grade.color, radius: 2 });
      }
    } else {
      ctx.font = 'bold 48px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = grade.color;
      ctx.fillText(grade.letter, W / 2, cardY + 70);
    }
    // Stats row
    ctx.font = 'bold 18px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(Math.floor(gameTime) + 's  |  ' + kills + '杀  |  W' + wave, W / 2, cardY + 105);
    // Build name
    ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#8cf';
    var buildLabel = buildNameSystem.detected ? buildNameSystem.currentName : 'Lv.' + playerLevel + ' ' + selectedClass;
    ctx.fillText(buildLabel, W / 2, cardY + 125);
    // Best streak
    ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fa8';
    ctx.fillText('最高连杀: ' + maxStreak + '  |  DPS: ' + maxDps, W / 2, cardY + 145);
    // tauntSystem: dynamic challenge text based on grade
    var tauntText = getTaunt(grade.letter);
    ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#ffd700';
    ctx.fillText(tauntText, W / 2, cardY + 170);
  }

  function findNextAlivePlayer() {
    for (var i = 0; i < allPlayers.length; i++) {
      if (allPlayers[i].alive && !allPlayers[i].isLocal) return i;
    }
    return null; // nobody alive → go to gameOver
  }

  function cycleSpectatorTarget(dir) {
    if (!allPlayers.length) return;
    var start = spectatorTarget != null ? spectatorTarget : 0;
    for (var i = 1; i <= allPlayers.length; i++) {
      var idx = (start + i * dir + allPlayers.length) % allPlayers.length;
      if (allPlayers[idx].alive && !allPlayers[idx].isLocal) { spectatorTarget = idx; return; }
    }
    // No alive players → game over
    finalizeGameRewards();
    state = 'gameOver';
  }

  var SPECTATOR_AUTO_SKIP = 8; // seconds before auto-exit spectating

  function spectatorUpdate() {
    // Auto-skip timer: exit spectating after 8 seconds
    var spectateElapsed = (gameTime || 0) - spectatorDeathTime;
    if (spectateElapsed >= SPECTATOR_AUTO_SKIP) {
      finalizeGameRewards();
      state = 'gameOver';
      return;
    }

    // Check if current target is still alive
    if (spectatorTarget === null || !allPlayers[spectatorTarget] || !allPlayers[spectatorTarget].alive) {
      var newTarget = findNextAlivePlayer();
      if (newTarget === null) { finalizeGameRewards(); state = 'gameOver'; return; }
      spectatorTarget = newTarget;
    }
    // Follow the spectated player
    var target = allPlayers[spectatorTarget];
    if (target) {
      camX = target.x; camY = target.y;
    }
  }

  function drawSpectatorHUD() {
    var target = spectatorTarget != null ? allPlayers[spectatorTarget] : null;
    var spectateElapsed = (gameTime || 0) - spectatorDeathTime;
    var remaining = Math.max(0, Math.ceil(SPECTATOR_AUTO_SKIP - spectateElapsed));
    ctx.save();
    // BR-style "KILLED BY" big card — greys the screen and shows who killed you.
    // Fades in during first 0.5s of spectating.
    var _fadeT = Math.min(1, spectateElapsed / 0.5);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.55 * _fadeT).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    var _titleFS = Math.round(Math.min(W, H) * 0.065);
    var _subFS = Math.round(_titleFS * 0.42);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3030';
    ctx.font = 'bold ' + _titleFS + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = Math.max(4, _titleFS * 0.12);
    ctx.globalAlpha = _fadeT;
    ctx.strokeText(deathCause || '你已阵亡', W / 2, H * 0.32);
    ctx.fillText(deathCause || '你已阵亡', W / 2, H * 0.32);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ccc';
    ctx.font = _subFS + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillText('观战中 — ' + remaining + 's 后自动退出', W / 2, H * 0.32 + _titleFS * 0.9);
    ctx.globalAlpha = 1;

    if (target) {
      // Show target info
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(W / 2 - 100, 44, 200, 24);
      ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillStyle = '#4af';
      ctx.fillText('观战: ' + (target.nickname || target.id || '???') + ' Lv' + (target.level || 1), W / 2, 60);
    }

    // Click/ESC to skip hint (pulsing)
    var pulse = 0.5 + 0.5 * Math.sin(Date.now() / 500);
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ctx.fillStyle = '#aaa';
    ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillText('点击任意位置或按 ESC 立即跳过', W / 2, H - 30);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawDeathRecap() {
    // deathRewind (US-304): slow-mo death replay of last moments (skip for victory)
    if (!victoryWin && deathRewind.active && deathRewind.timer > 0) {
      deathRewind.timer -= 0.016;
      var rewindProgress = 1 - deathRewind.timer / deathRewind.duration;
      ctx.globalAlpha = 0.3 + rewindProgress * 0.2;
      // Draw ghostly trail of last positions
      var posCount = deathRewind.positions.length;
      for (var rpi = 0; rpi < posCount; rpi++) {
        var rp = deathRewind.positions[rpi];
        var rpAlpha = (rpi / posCount) * 0.3 * (1 - rewindProgress);
        ctx.globalAlpha = rpAlpha;
        ctx.fillStyle = '#88aaff';
        ctx.beginPath(); ctx.arc(rp.x, rp.y, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Desaturation effect via overlay
      ctx.fillStyle = 'rgba(30,30,50,' + (rewindProgress * 0.3) + ')';
      ctx.fillRect(0, 0, W, H);
      // "DEATH REWIND" text
      if (rewindProgress < 0.5) {
        ctx.globalAlpha = 1 - rewindProgress * 2;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💀 最后时刻...', W / 2, H / 2);
        ctx.globalAlpha = 1;
      }
    }

    // Background overlay
    ctx.fillStyle = victoryWin ? 'rgba(10,10,30,0.85)' : 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);
    // Slow drifting particles for cinematic death scene
    for (var dpi = 0; dpi < particles.length; dpi++) {
      var dp = particles[dpi];
      if (dp.life > 0) {
        dp.x += dp.vx * 0.003; dp.y += dp.vy * 0.003; // very slow drift
        dp.life -= 0.002;
        ctx.globalAlpha = Math.max(0, dp.life / dp.maxLife) * 0.4;
        ctx.fillStyle = dp.color || '#aaf';
        ctx.beginPath(); ctx.arc(dp.x, dp.y, dp.radius || 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Slow floating embers (deathSceneEffect)
    if (Math.random() < 0.08) {
      particles.push({ x: Math.random() * W, y: H + 5, vx: (Math.random() - 0.5) * 30,
        vy: -40 - Math.random() * 30, life: 3, maxLife: 3, color: '#f84', radius: 1.5 });
    }
    ctx.globalAlpha = 1;

    // Draw share card at top
    drawDeathShareCard();

    var grade = getGrade();

    // === Scale death recap to fill screen (design space 400x700) ===
    var _drS = Math.min(W / 400, H / 700);
    var _drOx = (W - 400 * _drS) / 2;
    var _drOy = (H - 700 * _drS) / 2;
    ctx.save();
    ctx.translate(_drOx, _drOy);
    ctx.scale(_drS, _drS);

    // Victory banner — only for true victory (alive) or partial victory (died after winning)
    if (victoryWin) {
      var isCleanVictory = player.alive !== false;
      if (isCleanVictory) {
        // Full victory: golden fireworks
        if (Math.random() < 0.2) {
          var vfx = 60 + Math.random() * 280;
          var vfy = 5 + Math.random() * 80;
          var vfColors = ['#ffd700', '#ffaa00', '#fff', '#ff8800'];
          var vfc = vfColors[Math.floor(Math.random() * vfColors.length)];
          for (var vfi = 0; vfi < 8; vfi++) {
            var vfa = Math.PI * 2 * vfi / 8;
            particles.push({ x: vfx * _drS + _drOx, y: vfy * _drS + _drOy, vx: Math.cos(vfa) * 100, vy: Math.sin(vfa) * 100,
              life: 1.0, maxLife: 1.0, color: vfc, radius: 2.5 });
          }
        }
        var victPulse = 1 + Math.sin(Date.now() * 0.004) * 0.1;
        ctx.font = 'bold ' + Math.round(36 * victPulse) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4;
        var victTitle = gameMode === 'team' ? '团队胜利!' : '大吉大利，今晚吃鸡!';
        ctx.strokeText(victTitle, 200, 150);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(victTitle, 200, 150);
        ctx.lineWidth = 1;
      } else {
        ctx.font = 'bold 28px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
        ctx.strokeText('惨胜 — 同归于尽!', 200, 150);
        ctx.fillStyle = '#fa0';
        ctx.fillText('惨胜 — 同归于尽!', 200, 150);
        ctx.lineWidth = 1;
      }
    }

    // newRecordFirework (US-286)
    if (isNewRecord) {
      if (Math.random() < 0.15) {
        var fwx = 80 + Math.random() * 240;
        var fwy = 30 + Math.random() * 100;
        var fwColors = ['#ffd700', '#ff4444', '#44ff44', '#4488ff', '#ff88ff'];
        var fwc = fwColors[Math.floor(Math.random() * fwColors.length)];
        for (var fwi = 0; fwi < 6; fwi++) {
          var fwa = Math.PI * 2 * fwi / 6;
          particles.push({ x: fwx * _drS + _drOx, y: fwy * _drS + _drOy, vx: Math.cos(fwa) * 80, vy: Math.sin(fwa) * 80,
            life: 0.8, maxLife: 0.8, color: fwc, radius: 2 });
        }
      }
      var recordPulse = 1 + Math.sin(Date.now() * 0.006) * 0.15;
      ctx.font = 'bold ' + Math.round(24 * recordPulse) + 'px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3;
      ctx.strokeText('🏆 NEW RECORD! 🏆', 200, 145);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('🏆 NEW RECORD! 🏆', 200, 145);
    }

    // === Stats block — three columns inside a bordered panel ===
    var sy = 168;
    var statsPanelX = 200 - 190, statsPanelY = sy - 18, statsPanelW = 380, statsPanelH = 80;
    // homm3_bright 9-slice frame; falls back to gradient+gold if assets missing.
    var _statsUsed9 = draw9Slice(ctx, statsPanelX, statsPanelY, statsPanelW, statsPanelH, { cornerSize: 18, alpha: 0.95 });
    if (!_statsUsed9) {
      var spGrad = ctx.createLinearGradient(statsPanelX, statsPanelY, statsPanelX, statsPanelY + statsPanelH);
      spGrad.addColorStop(0, 'rgba(30,30,60,0.85)');
      spGrad.addColorStop(1, 'rgba(10,10,22,0.85)');
      ctx.fillStyle = spGrad;
      ctx.fillRect(statsPanelX, statsPanelY, statsPanelW, statsPanelH);
      ctx.save();
      ctx.shadowColor = victoryWin ? '#ffd700' : '#6688cc';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = victoryWin ? '#ffd700' : '#6688cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(statsPanelX + 0.5, statsPanelY + 0.5, statsPanelW - 1, statsPanelH - 1);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
      ctx.strokeRect(statsPanelX + 4, statsPanelY + 4, statsPanelW - 8, statsPanelH - 8);
    }
    // Column dividers
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(statsPanelX + statsPanelW / 3, statsPanelY + 10); ctx.lineTo(statsPanelX + statsPanelW / 3, statsPanelY + statsPanelH - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(statsPanelX + statsPanelW * 2 / 3, statsPanelY + 10); ctx.lineTo(statsPanelX + statsPanelW * 2 / 3, statsPanelY + statsPanelH - 10); ctx.stroke();
    // Icons + labels + values
    var colX = [statsPanelX + statsPanelW / 6, statsPanelX + statsPanelW / 2, statsPanelX + statsPanelW * 5 / 6];
    // BR stats — "排名" replaces legacy wave count.
    var _placement = 1;
    if (offlineMode && offlineBots) {
      var _aliveOthers = 0;
      for (var _pli = 0; _pli < offlineBots.length; _pli++) if (offlineBots[_pli].alive) _aliveOthers++;
      if (player && player.alive === false) _placement = _aliveOthers + 1; // survived 8 - (dead) = dead at this rank
      else _placement = 1;
    }
    var icons = ['⏱', '⚔', '🏆'];
    var labels = ['生存时间', '击杀数', '排名'];
    var values = [Math.floor(gameTime) + 's', '' + kills, '#' + _placement + '/8'];
    var iconColors = ['#88ccff', '#ff8866', '#ffd700'];
    for (var _ci = 0; _ci < 3; _ci++) {
      ctx.font = '24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = iconColors[_ci];
      ctx.fillText(icons[_ci], colX[_ci], sy + 6);
      ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#888';
      ctx.fillText(labels[_ci], colX[_ci], sy + 24);
      ctx.font = 'bold 24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
      ctx.strokeText(values[_ci], colX[_ci], sy + 52);
      ctx.fillText(values[_ci], colX[_ci], sy + 52);
      ctx.lineWidth = 1;
    }
    sy = statsPanelY + statsPanelH + 10;

    // Secondary stats + gold
    ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    var learnedCount = 0;
    for (var sk in skillLevels) { if (skillLevels[sk] > 0) learnedCount++; }
    ctx.fillText('Lv.' + playerLevel + '  |  连杀' + maxStreak + '  |  技能' + learnedCount + '/' + selectedBuild.length, 200, sy + 20);

    var achCount = Object.keys(unlockedAchievements).length;
    ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#ffd700';
    ctx.fillText('💰 +' + _lastEarnedGold + ' 金币 (总计: ' + gold + ')', 200, sy + 40);

    // Skills summary
    ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#aaa';
    var shown = {};
    var summary = [];
    for (var i = 0; i < ownedSkills.length; i++) {
      if (!shown[ownedSkills[i]]) { shown[ownedSkills[i]] = true; summary.push(SKILL_DATA[ownedSkills[i]].icon + SKILL_DATA[ownedSkills[i]].name + 'Lv' + skillLevels[ownedSkills[i]]); }
    }
    var buildStr = summary.join(' ');
    if (buildStr.length > 40) buildStr = buildStr.substring(0, 38) + '...';
    ctx.fillText(buildStr, 200, sy + 58);

    // Death tip or victory text
    if (victoryWin && player.alive !== false) {
      ctx.font = 'bold 14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#4f4';
      ctx.fillText('你消灭了所有对手，成为最后的幸存者!', 200, sy + 76);
    } else if (victoryWin && player.alive === false) {
      ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#fa0';
      ctx.fillText('你消灭了所有对手! (但最终' + (deathCause || '阵亡') + ')', 200, sy + 76);
    } else if (deathCause) {
      ctx.font = '14px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#f88';
      ctx.fillText('💀 ' + deathCause, 200, sy + 70);
      if (deathTip) {
        ctx.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#8af';
        ctx.fillText('💡 ' + TIPS[Math.floor(Math.random() * TIPS.length)], 200, sy + 88);
      }
    } else if (deathTip) {
      ctx.font = '13px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#8af';
      ctx.fillText('💡 ' + deathTip, 200, sy + 76);
    }

    // Kill leaderboard
    var lbY = sy + 98;
    var lbPlayers = allPlayers.slice().sort(function(a, b) { return b.kills - a.kills; });
    ctx.font = 'bold 12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#aaa';
    ctx.fillText('— 击杀排行榜 —', 200, lbY);
    var lbShow = Math.min(lbPlayers.length, 5);
    for (var ri = 0; ri < lbShow; ri++) {
      var lp = lbPlayers[ri];
      var isMe = lp.isLocal;
      var rankIcon = ri === 0 ? '🥇' : (ri === 1 ? '🥈' : (ri === 2 ? '🥉' : (ri + 1) + '.'));
      ctx.fillStyle = isMe ? '#ffd700' : (lp.alive ? '#ccc' : '#888');
      ctx.font = (isMe ? 'bold ' : '') + '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      var statusMark = lp.alive ? '' : ' 💀';
      ctx.fillText(rankIcon + ' ' + lp.name + '  ' + lp.kills + '杀' + statusMark, 200, lbY + 16 + ri * 16);
    }
    var myRank = lbPlayers.findIndex(function(e) { return e.isLocal; }) + 1;
    if (myRank > lbShow) {
      ctx.fillStyle = '#f84'; ctx.font = 'bold 12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
      ctx.fillText('你排第' + myRank + '名', 200, lbY + 16 + lbShow * 16);
    }

    // === Share button ===
    var shBx = 200 - 160, shBy = 580, shBw = 320, shBh = 44;
    var shGrad = ctx.createLinearGradient(shBx, shBy, shBx, shBy + shBh);
    shGrad.addColorStop(0, '#2a5a9a'); shGrad.addColorStop(1, '#10284a');
    ctx.fillStyle = shGrad; ctx.fillRect(shBx, shBy, shBw, shBh);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(shBx + 2, shBy + 2, shBw - 4, shBh * 0.4);
    ctx.save();
    ctx.shadowColor = '#6aaaff'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#6aaaff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(shBx + 0.5, shBy + 0.5, shBw - 1, shBh - 1);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
    ctx.strokeText('📤 分享战绩', 200, shBy + 30);
    ctx.fillText('📤 分享战绩', 200, shBy + 30);
    ctx.lineWidth = 1;

    // === Retry button ===
    var rtBx = 200 - 170, rtBy = 636, rtBw = 340, rtBh = 56;
    var retryPulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.004);
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18 + retryPulse * 8;
    var rtGrad = ctx.createLinearGradient(rtBx, rtBy, rtBx, rtBy + rtBh);
    rtGrad.addColorStop(0, '#4a8a4a');
    rtGrad.addColorStop(0.5, '#2a6a2a');
    rtGrad.addColorStop(1, '#1a4a1a');
    ctx.fillStyle = rtGrad;
    ctx.fillRect(rtBx, rtBy, rtBw, rtBh);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(rtBx + 0.5, rtBy + 0.5, rtBw - 1, rtBh - 1);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(rtBx + 3, rtBy + 3, rtBw - 6, rtBh * 0.45);
    ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(rtBx + 4, rtBy + 4, rtBw - 8, rtBh - 8);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 4;
    ctx.strokeText('🔄 再来一局', 200, rtBy + 38);
    ctx.fillText('🔄 再来一局', 200, rtBy + 38);
    ctx.lineWidth = 1;

    ctx.restore(); // end death recap design-space transform
  }

  function generateShareImage() {
    // Create a share canvas with game results
    var shareCanvas = document.createElement('canvas');
    shareCanvas.width = 400; shareCanvas.height = 300;
    var sc = shareCanvas.getContext('2d');

    // Background
    sc.fillStyle = '#0a0a1a'; sc.fillRect(0, 0, 400, 300);
    var grad = sc.createLinearGradient(0, 0, 400, 300);
    grad.addColorStop(0, 'rgba(40,20,80,0.4)'); grad.addColorStop(1, 'rgba(20,40,80,0.4)');
    sc.fillStyle = grad; sc.fillRect(0, 0, 400, 300);

    // Title
    sc.fillStyle = '#fff'; sc.font = 'bold 24px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; sc.textAlign = 'center';
    sc.fillText('幸存者 Survivor', 200, 35);

    // Grade
    var grade = getGrade();
    sc.fillStyle = grade.color; sc.font = 'bold 56px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    sc.fillText(grade.letter, 200, 100);
    sc.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; sc.fillStyle = '#888';
    sc.fillText('RANK', 200, 55);

    // Stats
    sc.fillStyle = '#fff'; sc.font = 'bold 20px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    sc.fillText(Math.floor(gameTime) + 's', 100, 145);
    sc.fillText(kills + '杀', 200, 145);
    sc.fillText('W' + wave, 300, 145);
    sc.font = '11px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; sc.fillStyle = '#888';
    sc.fillText('生存时间', 100, 160); sc.fillText('击杀数', 200, 160); sc.fillText('波次', 300, 160);

    // Skills build
    sc.font = '12px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; sc.fillStyle = '#aaa';
    var shown = {};
    var summary = [];
    for (var i = 0; i < ownedSkills.length; i++) {
      if (!shown[ownedSkills[i]]) { shown[ownedSkills[i]] = true; summary.push(SKILL_DATA[ownedSkills[i]].icon + SKILL_DATA[ownedSkills[i]].name + 'Lv' + skillLevels[ownedSkills[i]]); }
    }
    var buildStr = summary.join(' ');
    if (buildStr.length > 40) buildStr = buildStr.substring(0, 38) + '...';
    sc.fillText(buildStr, 200, 190);

    // Challenge text
    sc.fillStyle = '#ffd700'; sc.font = 'bold 16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    sc.fillText('来挑战我！', 200, 230);

    // Border
    sc.strokeStyle = '#444'; sc.lineWidth = 2;
    sc.strokeRect(1, 1, 398, 298);

    return shareCanvas.toDataURL('image/png');
  }

  function doShare() {
    var imgData = generateShareImage();
    shareText = '幸存者: ' + kills + '杀 ' + Math.floor(gameTime) + 's 波次' + wave + ' - 来挑战我!';
    shareBtn.visible = true;
    // Share reward: gold bonus for sharing
    if (!shareRewardClaimed) {
      shareRewardClaimed = true;
      gold += SHARE_REWARD;
      floatText(W / 2, H / 2, '+' + SHARE_REWARD + ' 分享奖励!', '#ffd700', 20);
    }
    // Update friend ranking
    var myScore = kills;
    friendRanking[0].score = Math.max(friendRanking[0].score, myScore);
    friendRanking.sort(function(a, b) { return b.score - a.score; });
    for (var i = 0; i < friendRanking.length; i++) friendRanking[i].rank = i + 1;
    // In WeChat: wx.shareAppMessage({ title: '...', imageUrl: imgData })
    if (typeof wx !== 'undefined' && wx.shareAppMessage) {
      wx.shareAppMessage({
        title: '幸存者: ' + kills + '杀 ' + Math.floor(gameTime) + 's - 来挑战我!',
        imageUrl: imgData
      });
    } else {
      var win = window.open();
      if (win) { win.document.write('<img src="' + imgData + '" style="max-width:100%">'); }
    }
  }

  // Pause screen (US-207)
  function drawPause() {
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('⏸ 暂停', W / 2, H / 2 - 20);
    ctx.font = '16px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", Arial, "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif'; ctx.fillStyle = '#888';
    ctx.fillText('按 ESC 继续', W / 2, H / 2 + 20);
    ctx.fillText('第' + wave + '波  击杀 ' + kills + '  ' + Math.floor(gameTime) + '秒', W / 2, H / 2 + 50);
  }

  var _stateBeforePause = 'playing';
  function togglePause() {
    if (state === 'playing') { _stateBeforePause = state; state = 'paused'; isPaused = true; }
    else if (state === 'paused') { state = _stateBeforePause; isPaused = false; }
  }

  // === INPUT ===
  // Keyboard: Q for ultimate, Escape for pause
  document.addEventListener('keydown', function(ev) {
    // Wave 2: level-up card pick (1/2/3), ESC blocked per PM "no skip"
    if (state === 'levelUp') {
      if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
        pickUpgradeCard(parseInt(ev.key, 10) - 1);
        ev.preventDefault();
        return;
      }
      if (ev.key === 'Escape') {
        // Swallow — level-up is mandatory per cards.json.rollRules.allowSkipLevelUp=false
        ev.preventDefault();
        return;
      }
    }
    if ((ev.key === 'q' || ev.key === 'Q') && state === 'playing') {
      useUltimate();
    }
    if (ev.key === 'Escape') {
      if (state === 'spectating') { finalizeGameRewards(); state = 'gameOver'; return; }
      togglePause();
    }
    if (state === 'spectating') {
      if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') cycleSpectatorTarget(1);
      if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') cycleSpectatorTarget(-1);
    }
    if ((ev.key === 'h' || ev.key === 'H') && (state === 'playing' || state === 'paused')) {
      screenshotMode = !screenshotMode;
    }
    if (localMultiplayer && player2) {
      var k = ev.key.toLowerCase();
      if (k === 'w') p2Keys.w = true;
      if (k === 'a') p2Keys.a = true;
      if (k === 's') p2Keys.s = true;
      if (k === 'd') p2Keys.d = true;
    }
  });
  document.addEventListener('keyup', function(ev) {
    if (localMultiplayer && player2) {
      var k = ev.key.toLowerCase();
      if (k === 'w') p2Keys.w = false;
      if (k === 'a') p2Keys.a = false;
      if (k === 's') p2Keys.s = false;
      if (k === 'd') p2Keys.d = false;
    }
  });

  // === VIRTUAL JOYSTICK (touch + mouse fallback) ===
  // Debug exposure for QA — lets headless tests poke joystick state directly.
  window.__joystick = joystick;
  function joystickStart(x, y, id) {
    if (state !== 'playing') return false;
    if (x < W * 0.45) {
      joystick.active = true;
      joystick.touchId = id;
      joystick.baseX = x; joystick.baseY = y;
      joystick.stickX = x; joystick.stickY = y;
      joystick.dx = 0; joystick.dy = 0;
      return true;
    }
    return false;
  }
  function joystickMove(x, y, id) {
    if (!joystick.active || joystick.touchId !== id) return;
    var ddx = x - joystick.baseX, ddy = y - joystick.baseY;
    var dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist > joystick.radius) { ddx = ddx / dist * joystick.radius; ddy = ddy / dist * joystick.radius; }
    joystick.stickX = joystick.baseX + ddx;
    joystick.stickY = joystick.baseY + ddy;
    if (dist > joystick.deadzone) {
      joystick.dx = ddx / joystick.radius;
      joystick.dy = ddy / joystick.radius;
    } else {
      joystick.dx = 0; joystick.dy = 0;
    }
  }
  function joystickEnd(id) {
    if (joystick.touchId === id) {
      joystick.active = false; joystick.touchId = null;
      joystick.dx = 0; joystick.dy = 0;
    }
  }
  canvas.addEventListener('touchstart', function(ev) {
    ev.preventDefault();
    for (var ti = 0; ti < ev.changedTouches.length; ti++) {
      var t = ev.changedTouches[ti];
      var r = canvas.getBoundingClientRect();
      var tx = (t.clientX - r.left) * W / r.width;
      var ty = (t.clientY - r.top) * H / r.height;
      // R6-control F1 — ability button hit-test (right-bottom). Consume the
      // touch instead of forwarding to joystick so dragging from the button
      // doesn't accidentally pull the stick around.
      if (state === 'playing' && _abilityBtn) {
        var _abdx = tx - _abilityBtn.cx, _abdy = ty - _abilityBtn.cy;
        if (_abdx * _abdx + _abdy * _abdy <= _abilityBtn.r * _abilityBtn.r) {
          triggerClassAbility();
          continue;
        }
      }
      joystickStart(tx, ty, t.identifier);
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', function(ev) {
    ev.preventDefault();
    for (var ti = 0; ti < ev.changedTouches.length; ti++) {
      var t = ev.changedTouches[ti];
      var r = canvas.getBoundingClientRect();
      var tx = (t.clientX - r.left) * W / r.width;
      var ty = (t.clientY - r.top) * H / r.height;
      joystickMove(tx, ty, t.identifier);
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function(ev) {
    for (var ti = 0; ti < ev.changedTouches.length; ti++) {
      joystickEnd(ev.changedTouches[ti].identifier);
    }
  });
  // Mouse fallback for PC testing
  var _joystickMouseDown = false;
  canvas.addEventListener('mousedown', function(ev) {
    if (ev.button !== 0) return;
    var r = canvas.getBoundingClientRect();
    var mx = (ev.clientX - r.left) * W / r.width;
    var my = (ev.clientY - r.top) * H / r.height;
    // R6-control F1 — ability button hit-test (mouse fallback for desktop QA).
    if (state === 'playing' && _abilityBtn) {
      var _mbdx = mx - _abilityBtn.cx, _mbdy = my - _abilityBtn.cy;
      if (_mbdx * _mbdx + _mbdy * _mbdy <= _abilityBtn.r * _abilityBtn.r) {
        triggerClassAbility();
        return;
      }
    }
    if (joystickStart(mx, my, 'mouse')) { _joystickMouseDown = true; }
  });
  canvas.addEventListener('mousemove', function(ev) {
    var r = canvas.getBoundingClientRect();
    mouseX = (ev.clientX - r.left) * W / r.width;
    mouseY = (ev.clientY - r.top) * H / r.height;
    if (_joystickMouseDown) {
      joystickMove(mouseX, mouseY, 'mouse');
    }
  });
  canvas.addEventListener('mouseup', function(ev) {
    if (_joystickMouseDown) { joystickEnd('mouse'); _joystickMouseDown = false; }
  });
  // Double-click for ultimate (mobile-friendly)
  var _lastClickTime = 0;
  canvas.addEventListener('dblclick', function(ev) {
    if (state === 'playing') {
      // Experiment F: class ultimate fires on dblclick if unlocked
      if (player && player._ultimateReady) { castClassUltimate(); return; }
      useUltimate();
    }
  });
  canvas.addEventListener('click', function(ev) {
    if (!audioCtx) { initAudio(); if (musicEnabled) startBgm(); } // Init audio on first click (browser policy)
    var r = canvas.getBoundingClientRect();
    var cx = (ev.clientX - r.left) * W / r.width, cy = (ev.clientY - r.top) * H / r.height;
    // Experiment F: tap the ULT READY HUD button to cast
    if (state === 'playing' && _ultReadyBtn && player && player._ultimateReady) {
      var _ub = _ultReadyBtn;
      if (cx >= _ub.x && cx <= _ub.x + _ub.w && cy >= _ub.y && cy <= _ub.y + _ub.h) {
        castClassUltimate();
        return;
      }
    }
    // Experiment D: boss perma buff choice (consumes click before game actions)
    if (bossBuffChoice.active) {
      for (var _bbi = 0; _bbi < bossBuffChoice.rects.length; _bbi++) {
        var _bbr = bossBuffChoice.rects[_bbi];
        if (cx >= _bbr.x && cx <= _bbr.x + _bbr.w && cy >= _bbr.y && cy <= _bbr.y + _bbr.h) {
          applyBossBuff(_bbr.idx);
          return;
        }
      }
      return;
    }
    // Wave 2: level-up card click
    if (state === 'levelUp' && WAVE2_CARD_RECTS.length > 0) {
      for (var cri = 0; cri < WAVE2_CARD_RECTS.length; cri++) {
        var rc = WAVE2_CARD_RECTS[cri];
        if (cx >= rc.x && cx <= rc.x + rc.w && cy >= rc.y && cy <= rc.y + rc.h) {
          pickUpgradeCard(rc.idx);
          return;
        }
      }
      return; // clicks outside cards are ignored — no skip
    }
    if (state === 'menu') {
      // Use scaled button rects from drawMenu (stored in _menuBtns)
      function _hitBtn(b) { return b && cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h; }
      if (_hitBtn(_menuBtns.solo))    { gameMode = 'solo'; state = 'charSelect'; }
      if (_hitBtn(_menuBtns.team))    { gameMode = 'team'; state = 'charSelect'; }
      if (_hitBtn(_menuBtns.upgrade)) { state = 'upgrade'; }
      if (_hitBtn(_menuBtns.multi))   { localMultiplayer = true; state = 'charSelect'; }
      if (_hitBtn(_menuBtns.timed))   { countdownTimerMode = true; state = 'charSelect'; }
    } else if (state === 'mapSelect') {
      // Convert screen coords to design space (400x700)
      var _dc = _toDesignCoords(cx, cy); var dcx = _dc.x, dcy = _dc.y;
      // Map selection click handling
      var mapsForLevel = mapConfig.filter(function(m) { return m.level <= mapSelect.mapLevel; });
      for (var mi = 0; mi < mapsForLevel.length; mi++) {
        var my = 70 + mi * 55;
        if (dcx > 200-120 && dcx < 200+120 && dcy > my && dcy < my + 48) { mapSelect.selectedIndex = mi; }
      }
      // Start button
      if (dcx > 200-60 && dcx < 200+60 && dcy > 700-60 && dcy < 700-20) {
        var selMaps = mapConfig.filter(function(m) { return m.level <= mapSelect.mapLevel; });
        currentMap = selMaps[mapSelect.selectedIndex] || mapConfig[0];
        mapBoundary = currentMap.boundary;
        state = 'buildSelect';
        selectedBuild = []; // reset build
      }
      // Back button
      if (dcx > 200-60 && dcx < 200+60 && dcy > 700-110 && dcy < 700-74) { state = 'charSelect'; }
    } else if (state === 'charSelect') {
      // Convert screen coords to design space (400x700)
      var _dc2 = _toDesignCoords(cx, cy); var dcx2 = _dc2.x, dcy2 = _dc2.y;
      // R5n F2 / R5v F3 — 5 classes, compact 56px pitch, 50px card height
      var classKeys = ['warrior', 'mage', 'scout', 'assassin', 'healer'];
      for (var ci = 0; ci < classKeys.length; ci++) {
        var cby = 50 + ci * 56;
        if (dcx2 > 200 - 190 && dcx2 < 200 + 190 && dcy2 > cby && dcy2 < cby + 50) {
          selectedClass = classKeys[ci];
          state = 'mapSelect';
        }
      }
      // Attribute +/- buttons (US-009)
      var attrNames = ['INT', 'STR', 'AGI', 'STA'];
      var panelY = 350;
      for (var ai = 0; ai < 4; ai++) {
        var ay = panelY + 25 + ai * 24;
        // "-" button
        if (dcx2 > 200 + 60 && dcx2 < 200 + 84 && dcy2 > ay && dcy2 < ay + 18) {
          var aKey = attrNames[ai];
          var initVal = (CLASS_DEFS[selectedClass].initialAttributes || {})[aKey] || 0;
          if (playerAttributes[aKey] > 0) {
            playerAttributes[aKey]--;
            attributePoints++;
          }
        }
        // "+" button
        if (dcx2 > 200 + 90 && dcx2 < 200 + 114 && dcy2 > ay && dcy2 < ay + 18) {
          if (attributePoints > 0) {
            playerAttributes[attrNames[ai]]++;
            attributePoints--;
          }
        }
      }
      // Skin selection clicks
      var _selCls = CLASS_DEFS[selectedClass];
      var _initAttrs = _selCls ? (_selCls.initialAttributes || { INT: 5, STR: 5, AGI: 5, STA: 5 }) : {};
      var _derivedStats = (typeof RPGEngine !== 'undefined' && RPGEngine.calculateDerivedStats)
        ? RPGEngine.calculateDerivedStats(playerAttributes, _selCls, 1) : null;
      var _skinPanelY = (_derivedStats ? panelY + 185 : panelY + 135);
      var _applicableSkins = skinCollection.filter(function(sk) {
        var sd = skinsData[sk.id];
        if (!sd) return sk.id === 'default';
        return !sd.applicableClasses || sd.applicableClasses.indexOf(selectedClass) >= 0;
      });
      var _skinSize = 28, _skinGap = 6;
      var _skinCols = Math.min(_applicableSkins.length, 8);
      var _skinStartX = 200 - (_skinCols * (_skinSize + _skinGap) - _skinGap) / 2;
      var _skinRowY = _skinPanelY + 30;
      for (var si = 0; si < _applicableSkins.length && si < 16; si++) {
        var sk = _applicableSkins[si];
        var row = Math.floor(si / 8);
        var col = si % 8;
        var skx = _skinStartX + col * (_skinSize + _skinGap);
        var sky = _skinRowY + row * (_skinSize + _skinGap + 8);
        if (dcx2 > skx && dcx2 < skx + _skinSize && dcy2 > sky && dcy2 < sky + _skinSize) {
          if (sk.owned || sk.id === 'default') {
            equippedSkin = sk.id;
          }
        }
      }
      // Back
      if (dcx2 > 200 - 50 && dcx2 < 200 + 50 && dcy2 > 700 - 50 && dcy2 < 700 - 14) {
        state = 'menu';
      }
    } else if (state === 'buildSelect') {
      // Convert screen coords to design space (400x700)
      var _dc3 = _toDesignCoords(cx, cy); var dcx3 = _dc3.x, dcy3 = _dc3.y;
      var cls = CLASS_DEFS[selectedClass] || CLASS_DEFS.warrior;
      var available = cls.availableSkills || [];
      var cols = 2;
      var cardW = 180, cardH = 52, gapX = 12, gapY = 8;
      var startX = 200 - (cols * cardW + (cols - 1) * gapX) / 2;
      var startY = 80;

      // Check skill card clicks
      for (var bi = 0; bi < available.length; bi++) {
        var sid = available[bi];
        var col = bi % cols;
        var row = Math.floor(bi / cols);
        var bx = startX + col * (cardW + gapX);
        var by = startY + row * (cardH + gapY);
        if (dcx3 > bx && dcx3 < bx + cardW && dcy3 > by && dcy3 < by + cardH) {
          var existIdx = selectedBuild.indexOf(sid);
          if (existIdx >= 0) {
            // Deselect
            selectedBuild.splice(existIdx, 1);
          } else if (selectedBuild.length < 5) {
            // Select
            selectedBuild.push(sid);
          }
          break;
        }
      }

      // Confirm button
      var buildPanelY = startY + Math.ceil(available.length / cols) * (cardH + gapY) + 15;
      var btnY = buildPanelY + 65;
      if (selectedBuild.length === 5 && dcx3 > 200 - 80 && dcx3 < 200 + 80 && dcy3 > btnY && dcy3 < btnY + 40) {
        startGame();
      }

      // Back button
      if (dcx3 > 200 - 50 && dcx3 < 200 + 50 && dcy3 > 700 - 50 && dcy3 < 700 - 14) {
        state = 'mapSelect';
      }
    } else if (state === 'upgrade') {
      // Convert screen coords to design space (400x700)
      var _dc4 = _toDesignCoords(cx, cy); var dcx4 = _dc4.x, dcy4 = _dc4.y;
      // Back button
      if (dcx4 > 200 - 50 && dcx4 < 200 + 50 && dcy4 > 700 - 50 && dcy4 < 700 - 14) { state = 'menu'; }
      // Upgrade cards
      for (var i = 0; i < META_UPGRADE_DEFS.length; i++) {
        var def = META_UPGRADE_DEFS[i];
        var lv = metaUpgrades[def.id] || 0;
        var cost = def.cost * (lv + 1);
        var by = 85 + i * 70;
        if (dcx4 > 200 - 160 && dcx4 < 200 + 160 && dcy4 > by && dcy4 < by + 58 && gold >= cost) {
          gold -= cost;
          metaUpgrades[def.id] = lv + 1;
          prestigeLevel++; // prestigeSystem tracking
          saveGold(); // persistGold: save after purchase
        }
      }
    } else if (state === 'spectating') {
      finalizeGameRewards(); // Ensure gold is calculated before showing game over
      state = 'gameOver'; // Click anywhere to exit spectating
    } else if (state === 'gameOver') {
      // Convert screen coords to death recap design space (400x700)
      var _drS = Math.min(W / 400, H / 700);
      var _drOx = (W - 400 * _drS) / 2;
      var _drOy = (H - 700 * _drS) / 2;
      var _drx = (cx - _drOx) / _drS, _dry = (cy - _drOy) / _drS;
      // Share button: design (40, 580, 320, 44)
      if (_drx > 40 && _drx < 360 && _dry > 580 && _dry < 624) doShare();
      // Retry button: design (30, 636, 340, 56)
      if (_drx > 30 && _drx < 370 && _dry > 636 && _dry < 692) { _intentionalDisconnect = true; NetworkClient.disconnect(); startGame(); }
    }
    // touchSkillButtons (US-343): handle button clicks during gameplay
    if (state === 'playing') {
      // Tutorial: X in top-right skips all; tap anywhere else advances one slide.
      if (!tutorialDone) {
        var _tsr = _tutorialSkipRect;
        if (_tsr && cx > _tsr.x && cx < _tsr.x + _tsr.w && cy > _tsr.y && cy < _tsr.y + _tsr.h) {
          tutorialDone = true;
          _tutorialSkipRect = null;
          try { if (typeof localStorage !== 'undefined') localStorage.setItem('tutorial_seen', '1'); } catch (e) {}
        } else {
          // Advance slide on tap anywhere else (R5m F3)
          _tutSlide++;
          _tutSlideTimer = 3.0;
          if (_tutSlide >= _tutSlides.length) {
            tutorialDone = true;
            try { if (typeof localStorage !== 'undefined') localStorage.setItem('tutorial_seen', '1'); } catch (e) {}
          }
        }
      }
      // Skill bar upgrade clicks (MOBA-style)
      if (pendingSkillPoints > 0) {
        var _sbBarX = W - 160;
        var _sbBarY = 60;
        var _sbSlotH = 44;
        // Always show all 5 build skills for upgrade, not just owned ones
        var _sbSkills = selectedBuild && selectedBuild.length > 0 ? selectedBuild : [];
        for (var _si = 0; _si < _sbSkills.length; _si++) {
          var _sid = _sbSkills[_si];
          var _ssd = SKILL_DATA[_sid];
          if (!_ssd) continue;
          var _slv = skillLevels[_sid] || 0;
          var _smaxLv = _ssd.maxLevel || 10;
          if (_slv >= _smaxLv) continue;
          var _sbtnX = _sbBarX + 125;
          var _sbtnY = _sbBarY + _si * _sbSlotH + 5;
          if (cx > _sbtnX && cx < _sbtnX + 22 && cy > _sbtnY && cy < _sbtnY + 28) {
            NetworkClient.sendSkillChoice(_sid);
            pendingSkillPoints--;
            if (pendingSkillPoints < 0) pendingSkillPoints = 0;
            _skillHintTimer = 0; // Dismiss tutorial hint on first skill spend
            // Visual feedback
            powerSurgeEffect.active = true;
            powerSurgeEffect.timer = powerSurgeEffect.duration;
            emit(player.x, player.y, _ssd.color || '#fff', 15, 80);
            floatText(player.x, player.y - 20, _ssd.icon + ' ' + _ssd.name + ' \u2B06', _ssd.color || '#fff', 18);
            return;
          }
        }
      }
      // Bottom bar buttons (new rect-based hit detection)
      if (_hudBtnRects.ult) {
        var _bu = _hudBtnRects.ult;
        if (cx >= _bu.x && cx <= _bu.x + _bu.w && cy >= _bu.y && cy <= _bu.y + _bu.h) { useUltimate(); return; }
      }
      if (_hudBtnRects.dodge) {
        var _bd = _hudBtnRects.dodge;
        if (cx >= _bd.x && cx <= _bd.x + _bd.w && cy >= _bd.y && cy <= _bd.y + _bd.h) { useDodge(); return; }
      }
    }
  });
  canvas.addEventListener('touchmove', function(ev) {
    ev.preventDefault();
    var r = canvas.getBoundingClientRect();
    mouseX = (ev.touches[0].clientX - r.left) * W / r.width;
    mouseY = (ev.touches[0].clientY - r.top) * H / r.height;
  }, { passive: false });
  canvas.addEventListener('touchstart', function(ev) {
    var r = canvas.getBoundingClientRect();
    var cx = (ev.touches[0].clientX - r.left) * W / r.width;
    var cy = (ev.touches[0].clientY - r.top) * H / r.height;
    // Update mouseX/mouseY for facing direction
    mouseX = cx; mouseY = cy;
    // Simulate click for menus
    var clickEv = new MouseEvent('click', { clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY });
    canvas.dispatchEvent(clickEv);
  }, { passive: true });

  // Expose game internals for automated testing (QA helper)
  window._gameAPI = {
    get state() { return state; }, set state(v) { state = v; },
    get player() { return player; },
    get enemies() { return entities ? entities.filter(function(e) { return e.type === 'enemy' && !e.dead; }) : []; },
    get gold() { return gold; }, set gold(v) { gold = v; },
    get waveNumber() { return wave; },
    get pendingSkillPoints() { return pendingSkillPoints; }, set pendingSkillPoints(v) { pendingSkillPoints = v; },
    get selectedClass() { return selectedClass; },
    get selectedBuild() { return selectedBuild; },
    get gameMode() { return gameMode; },
    get gameTimer() { return gameTime; },
    get W() { return W; }, get H() { return H; },
    get WORLD_W() { return WORLD_W; }, get WORLD_H() { return WORLD_H; },
    get cameraX() { return cameraX; }, get cameraY() { return cameraY; },
    get stormZone() { return stormZone; },
    get offlineBots() { return offlineBots; },
    get offlineEnemies() { return offlineEnemies; },
    get HOMM3_ART() { return HOMM3_ART; },
    get waveSpawnPoints() { return _waveSpawnPoints; },
    get stratPoints() { return STRAT_POINTS.pointsInWorld; },
    get playerXP() { return playerXP; },
    get brStructures() { return _brStructures; },
    get tutorialDone() { return tutorialDone; },
    set tutorialDone(v) { tutorialDone = !!v; if (v) _tutorialSkipRect = null; },
    get gameMode() { return gameMode; },
    set gameMode(v) { gameMode = v; },
    get allPlayers() { return allPlayers; },
    get entities() { return entities; },
    get playerLevel() { return playerLevel; },
    get kills() { return kills; },
    // Round 2 experiment hooks — exposed for Testor real-playtest
    get rivalState() { return rivalState; },
    get skillPickups() { return skillPickups; },
    get eventPickups() { return eventPickups; },
    get meteorMarkers() { return meteorMarkers; },
    get worldEvent() { return worldEvent; },
    get bossSlainBanner() { return bossSlainBanner; },
    get bossBuffChoice() { return bossBuffChoice; },
    get synergyBanner() { return synergyBanner; },
    get ultimateReady() { return !!(player && player._ultimateReady); },
    get ultimateName() { var u = CLASS_ULTIMATES[selectedClass]; return u ? u.name : null; },
    get ultimateUnlocked() { return !!(player && player._ultimateUnlocked); },
    triggerWorldEvent: function(kind) { return triggerWorldEvent(kind || 'airdrop'); },
    grantClassUltimate: function() { return grantClassUltimate(); },
    castClassUltimate: function() { return castClassUltimate(); },
    // R6-control F1 — headless QA hook for the new active ability button.
    triggerClassAbility: function() { return triggerClassAbility(); },
    abilityCdLeft: function() { return _abilityCdLeft; },
    dropSkillPickup: function(x, y, tint) { return dropSkillPickup(x, y, tint); },
    applyBossBuff: function(idx) { return applyBossBuff(idx); },
    startGame: function() { startGame(); },
    finalizeGameRewards: typeof finalizeGameRewards === 'function' ? finalizeGameRewards : function() {}
  };

  requestAnimationFrame(loop);
})();
