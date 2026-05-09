(function() {
  'use strict';

  var TS = 64;
  var DPR = window.devicePixelRatio || 1;

  var tileDefs = [
    { id: 0, name: '荒草', color: '#6b6248' },
    { id: 1, name: '泥地', color: '#655842' },
    { id: 2, name: '混凝土', color: '#687069' },
    { id: 3, name: '污水', color: '#314845' },
    { id: 4, name: '道路', color: '#2f3432' },
    { id: 5, name: '淤泥', color: '#44372a' },
    { id: 6, name: '碎石', color: '#4b504b' }
  ];

  var propDefs = [
    { kind: 'wreck_car', name: '废车', w: 128, h: 72, color: '#6b4032' },
    { kind: 'crate', name: '箱体', w: 44, h: 44, color: '#765538' },
    { kind: 'barricade', name: '路障', w: 112, h: 32, color: '#8a6a42' },
    { kind: 'debris', name: '碎片', w: 88, h: 58, color: '#656963' },
    { kind: 'fence', name: '铁网', w: 128, h: 24, color: '#6f7773' },
    { kind: 'wall', name: '破墙', w: 32, h: 128, color: '#656963' },
    { kind: 'building', name: '房体', w: 112, h: 92, color: '#5a454a' },
    { kind: 'gas_station', name: '油站', w: 132, h: 86, color: '#7b4a32' },
    { kind: 'barrel', name: '油桶', w: 40, h: 54, color: '#9a5830' },
    { kind: 'tires', name: '轮胎', w: 80, h: 48, color: '#202422' },
    { kind: 'blood_mark', name: '血迹', w: 70, h: 42, color: '#5e1514' }
  ];

  var pinDefs = [
    { kind: 'spawn', name: '出生', color: '#42d9ff', list: 'spawnPoints' },
    { kind: 'zombie_entry', name: '尸群入口', color: '#8da082', list: 'zombieEntries' },
    { kind: 'reward', name: '奖励', color: '#7cff4f', list: 'rewardPoints' },
    { kind: 'rival', name: 'Rival', color: '#ff8b3d', list: 'rivalPoints' },
    { kind: 'boss', name: 'Boss', color: '#e6533f', list: 'bossPoints' },
    { kind: 'storm', name: '收圈', color: '#b95cff', list: null }
  ];

  var state = {
    map: createMap(40, 40),
    tool: { type: 'tile', id: 4 },
    selected: null,
    zoom: 0.42,
    panX: 24,
    panY: 24,
    painting: false,
    panning: false,
    lastMouse: null
  };

  var canvas = document.getElementById('mapCanvas');
  var ctx = canvas.getContext('2d');
  var stage = document.querySelector('.stage');
  var statusText = document.getElementById('statusText');

  function createMap(cols, rows) {
    var tiles = new Array(cols * rows).fill(0);
    paintRoadCross(tiles, cols, rows);
    return {
      name: 'Zombie BR Map',
      version: 2,
      tileSize: TS,
      cols: cols,
      rows: rows,
      width: cols * TS,
      height: rows * TS,
      visualProfile: 'zombie-br-v03',
      tiles: tiles,
      structures: [],
      spawnPoints: [
        { x: 320, y: 320 },
        { x: cols * TS - 320, y: 320 },
        { x: 320, y: rows * TS - 320 },
        { x: cols * TS - 320, y: rows * TS - 320 }
      ],
      stratPoints: [],
      bossPoints: [{ name: 'Boss', x: cols * TS / 2, y: rows * TS / 2 }],
      zombieEntries: [],
      rewardPoints: [],
      rivalPoints: [],
      stormCenter: { x: cols * TS / 2, y: rows * TS / 2 }
    };
  }

  function paintRoadCross(tiles, cols, rows) {
    var cx = Math.floor(cols / 2);
    var cy = Math.floor(rows / 2);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        if (Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1) tiles[y * cols + x] = 4;
        else if ((x + y) % 7 === 0) tiles[y * cols + x] = 2;
        else tiles[y * cols + x] = 0;
      }
    }
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function setStatus(text) {
    statusText.textContent = text;
  }

  function buildTools() {
    fillToolGroup(qs('tileTools'), tileDefs, function(def) {
      return { type: 'tile', id: def.id };
    });
    fillToolGroup(qs('propTools'), propDefs, function(def) {
      return { type: 'prop', id: def.kind };
    });
    fillToolGroup(qs('pinTools'), pinDefs, function(def) {
      return { type: 'pin', id: def.kind };
    });
  }

  function fillToolGroup(root, defs, makeTool) {
    root.innerHTML = '';
    defs.forEach(function(def) {
      var btn = document.createElement('button');
      btn.className = 'tool';
      btn.dataset.type = makeTool(def).type;
      btn.dataset.id = makeTool(def).id;
      btn.innerHTML = '<span class="swatch"></span><span></span>';
      btn.querySelector('.swatch').style.background = def.color;
      btn.querySelector('span:last-child').textContent = def.name;
      btn.addEventListener('click', function() {
        state.tool = makeTool(def);
        state.selected = null;
        refreshTools();
        draw();
        renderSelection();
      });
      root.appendChild(btn);
    });
  }

  function refreshTools() {
    document.querySelectorAll('.tool').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.type === state.tool.type && String(btn.dataset.id) === String(state.tool.id));
    });
  }

  function resize() {
    var rect = stage.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * DPR));
    canvas.height = Math.max(1, Math.floor(rect.height * DPR));
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw();
  }

  function fit() {
    var rect = stage.getBoundingClientRect();
    state.zoom = Math.min(rect.width / state.map.width, rect.height / state.map.height) * 0.9;
    state.panX = (rect.width - state.map.width * state.zoom) / 2;
    state.panY = (rect.height - state.map.height * state.zoom) / 2;
    updateInspector();
  }

  function screenToWorld(x, y) {
    return {
      x: (x - state.panX) / state.zoom,
      y: (y - state.panY) / state.zoom
    };
  }

  function worldToScreen(x, y) {
    return {
      x: x * state.zoom + state.panX,
      y: y * state.zoom + state.panY
    };
  }

  function hashTile(tx, ty) {
    return ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
  }

  function draw() {
    var rect = stage.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#0b0d0d';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.zoom, state.zoom);
    drawMapTiles();
    drawProps();
    drawPins();
    drawGrid();
    ctx.restore();
  }

  function drawMapTiles() {
    var map = state.map;
    for (var y = 0; y < map.rows; y++) {
      for (var x = 0; x < map.cols; x++) {
        var id = map.tiles[y * map.cols + x] | 0;
        if (window.KOS_RENDER && window.KOS_RENDER.drawMapTile) {
          window.KOS_RENDER.drawMapTile(ctx, x * TS, y * TS, TS, id, hashTile(x, y));
        } else {
          ctx.fillStyle = tileDefs[id] ? tileDefs[id].color : '#333';
          ctx.fillRect(x * TS, y * TS, TS, TS);
        }
      }
    }
  }

  function drawGrid() {
    var map = state.map;
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1 / state.zoom;
    if (state.zoom > 0.28) {
      ctx.beginPath();
      for (var x = 0; x <= map.cols; x++) {
        ctx.moveTo(x * TS, 0);
        ctx.lineTo(x * TS, map.height);
      }
      for (var y = 0; y <= map.rows; y++) {
        ctx.moveTo(0, y * TS);
        ctx.lineTo(map.width, y * TS);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#f4c95a';
    ctx.lineWidth = 2 / state.zoom;
    ctx.strokeRect(0, 0, map.width, map.height);
  }

  function drawProps() {
    state.map.structures.forEach(function(prop, index) {
      drawProp(prop, state.selected && state.selected.type === 'prop' && state.selected.index === index);
    });
  }

  function drawProp(prop, selected) {
    ctx.save();
    ctx.translate(prop.x, prop.y);
    if (window.KOS_RENDER && typeof window.KOS_RENDER.drawWorldProp === 'function') {
      ctx.restore();
      window.KOS_RENDER.drawWorldProp(ctx, prop.x, prop.y, prop.w, prop.h, prop.kind, prop);
      if (selected) {
        ctx.save();
        ctx.strokeStyle = '#f4c95a';
        ctx.lineWidth = 4 / state.zoom;
        ctx.strokeRect(prop.x - 4, prop.y - 4, prop.w + 8, prop.h + 8);
        ctx.restore();
      }
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(6, 8, prop.w, prop.h);
    if (prop.kind === 'wreck_car') {
      ctx.fillStyle = prop.color || '#6b4032';
      ctx.fillRect(0, 14, prop.w, prop.h - 20);
      ctx.fillStyle = '#2a2f2d';
      ctx.fillRect(18, 4, 44, 24);
      ctx.fillRect(70, 4, 34, 24);
      ctx.strokeStyle = '#2a1712';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(8, prop.h - 6);
      ctx.lineTo(prop.w - 10, 10);
      ctx.stroke();
    } else if (prop.kind === 'barricade') {
      ctx.fillStyle = prop.color || '#8a6a42';
      for (var i = 0; i < 5; i++) ctx.fillRect(i * 22, 5 + (i % 2) * 8, 18, 14);
      ctx.strokeStyle = '#3b2618';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, prop.h);
      ctx.lineTo(prop.w, 0);
      ctx.stroke();
    } else if (prop.kind === 'fence') {
      ctx.strokeStyle = prop.color || '#6f7773';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, prop.h * 0.2);
      ctx.lineTo(prop.w, prop.h * 0.2);
      ctx.moveTo(0, prop.h * 0.8);
      ctx.lineTo(prop.w, prop.h * 0.8);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (var f = 0; f < prop.w; f += 14) {
        ctx.beginPath();
        ctx.moveTo(f, 0);
        ctx.lineTo(f + 18, prop.h);
        ctx.stroke();
      }
    } else if (prop.kind === 'debris') {
      ctx.fillStyle = prop.color || '#656963';
      for (var d = 0; d < 5; d++) {
        var dx = (d * 19) % prop.w;
        var dy = (d * 11) % prop.h;
        ctx.fillRect(dx, dy, 22 + (d % 2) * 12, 10 + (d % 3) * 5);
      }
    } else {
      ctx.fillStyle = prop.color || '#656963';
      ctx.fillRect(0, 0, prop.w, prop.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(prop.w * 0.2, prop.h * 0.2, prop.w * 0.22, prop.h * 0.18);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(0, 0, prop.w, prop.h);
    }
    if (selected) {
      ctx.strokeStyle = '#f4c95a';
      ctx.lineWidth = 4 / state.zoom;
      ctx.strokeRect(-4, -4, prop.w + 8, prop.h + 8);
    }
    ctx.restore();
  }

  function drawPins() {
    pinDefs.forEach(function(def) {
      if (def.kind === 'storm') {
        drawPin(state.map.stormCenter, def, false);
        return;
      }
      var list = state.map[def.list] || [];
      list.forEach(function(pin, index) {
        var selected = state.selected && state.selected.type === 'pin' && state.selected.list === def.list && state.selected.index === index;
        drawPin(pin, def, selected);
      });
    });
  }

  function drawPin(pin, def, selected) {
    if (!pin) return;
    ctx.save();
    ctx.translate(pin.x, pin.y);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(4, 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = selected ? 4 / state.zoom : 2 / state.zoom;
    ctx.stroke();
    ctx.fillStyle = '#101313';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name.slice(0, 1), 0, 1);
    ctx.restore();
  }

  function placeAt(world) {
    var map = state.map;
    if (world.x < 0 || world.y < 0 || world.x > map.width || world.y > map.height) return;
    if (state.tool.type === 'tile') {
      paintTile(world);
      return;
    }
    if (state.tool.type === 'prop') {
      var def = propDefs.find(function(item) { return item.kind === state.tool.id; });
      if (!def) return;
      map.structures.push({
        kind: def.kind,
        x: Math.round(world.x - def.w / 2),
        y: Math.round(world.y - def.h / 2),
        w: def.w,
        h: def.h,
        color: def.color
      });
      state.selected = { type: 'prop', index: map.structures.length - 1 };
      updateInspector();
      return;
    }
    if (state.tool.type === 'pin') {
      var pinDef = pinDefs.find(function(item) { return item.kind === state.tool.id; });
      if (!pinDef) return;
      if (pinDef.kind === 'storm') {
        map.stormCenter = { x: Math.round(world.x), y: Math.round(world.y) };
      } else {
        map[pinDef.list] = map[pinDef.list] || [];
        map[pinDef.list].push({ x: Math.round(world.x), y: Math.round(world.y), kind: pinDef.kind });
        if (pinDef.kind === 'boss') map[pinDef.list][map[pinDef.list].length - 1].name = 'Boss';
        state.selected = { type: 'pin', list: pinDef.list, index: map[pinDef.list].length - 1 };
      }
      updateInspector();
    }
  }

  function paintTile(world) {
    var tx = Math.floor(world.x / TS);
    var ty = Math.floor(world.y / TS);
    if (tx < 0 || ty < 0 || tx >= state.map.cols || ty >= state.map.rows) return;
    state.map.tiles[ty * state.map.cols + tx] = state.tool.id | 0;
  }

  function hitTest(world) {
    for (var p = 0; p < pinDefs.length; p++) {
      var def = pinDefs[p];
      if (def.kind === 'storm') continue;
      var list = state.map[def.list] || [];
      for (var i = list.length - 1; i >= 0; i--) {
        if (Math.hypot(world.x - list[i].x, world.y - list[i].y) < 24) {
          return { type: 'pin', list: def.list, index: i };
        }
      }
    }
    for (var s = state.map.structures.length - 1; s >= 0; s--) {
      var prop = state.map.structures[s];
      if (world.x >= prop.x && world.x <= prop.x + prop.w && world.y >= prop.y && world.y <= prop.y + prop.h) {
        return { type: 'prop', index: s };
      }
    }
    return null;
  }

  function removeSelection() {
    if (!state.selected) return;
    if (state.selected.type === 'prop') {
      state.map.structures.splice(state.selected.index, 1);
    } else if (state.selected.type === 'pin') {
      state.map[state.selected.list].splice(state.selected.index, 1);
    }
    state.selected = null;
    updateInspector();
    draw();
  }

  function updateInspector() {
    qs('mapName').value = state.map.name || '';
    qs('mapSize').value = state.map.cols + 'x' + state.map.rows;
    qs('zoomReadout').value = Math.round(state.zoom * 100) + '%';
    renderQuality();
    renderSelection();
  }

  function renderQuality() {
    var checks = getQualityChecks();
    var root = qs('qualityList');
    root.innerHTML = '';
    checks.forEach(function(check) {
      var row = document.createElement('div');
      row.className = 'quality ' + (check.ok ? 'ok' : 'warn');
      row.innerHTML = '<span><strong></strong><small></small></span><span class="badge"></span>';
      row.querySelector('strong').textContent = check.label;
      row.querySelector('small').textContent = check.detail || '';
      row.querySelector('.badge').textContent = check.ok ? 'OK' : '补';
      root.appendChild(row);
    });
  }

  function getQualityChecks() {
    var m = state.map;
    var roadTiles = m.tiles.filter(function(id) { return id === 4 || id === 2; }).length;
    var roadRatio = roadTiles / Math.max(1, m.tiles.length);
    var decorKinds = { barrel: 1, tires: 1, blood_mark: 1 };
    var decorCount = (m.structures || []).filter(function(item) { return decorKinds[item.kind]; }).length;
    return [
      { label: '出生点 >= 4', detail: (m.spawnPoints || []).length + ' / 4', ok: (m.spawnPoints || []).length >= 4 },
      { label: '尸群入口 >= 4', detail: (m.zombieEntries || []).length + ' / 4', ok: (m.zombieEntries || []).length >= 4 },
      { label: '奖励点 >= 8', detail: (m.rewardPoints || []).length + ' / 8', ok: (m.rewardPoints || []).length >= 8 },
      { label: 'Rival 点 >= 2', detail: (m.rivalPoints || []).length + ' / 2', ok: (m.rivalPoints || []).length >= 2 },
      { label: 'Boss 点 >= 1', detail: (m.bossPoints || []).length + ' / 1', ok: (m.bossPoints || []).length >= 1 },
      { label: '掩体/道具 >= 20', detail: (m.structures || []).length + ' / 20', ok: (m.structures || []).length >= 20 },
      { label: '废土细节 >= 6', detail: decorCount + ' / 6', ok: decorCount >= 6 },
      { label: '道路/混凝土 >= 20%', detail: Math.round(roadRatio * 100) + '% / 20%', ok: roadRatio >= 0.2 }
    ];
  }

  function addMissingPoints(listName, points) {
    state.map[listName] = state.map[listName] || [];
    for (var i = state.map[listName].length; i < points.length; i++) {
      state.map[listName].push(points[i]);
    }
  }

  function ensureStandardRoutes() {
    var m = state.map;
    var cx = Math.floor(m.cols / 2);
    var cy = Math.floor(m.rows / 2);
    for (var y = 0; y < m.rows; y++) {
      for (var x = 0; x < m.cols; x++) {
        var idx = y * m.cols + x;
        if (Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1) m.tiles[idx] = 4;
        else if ((Math.abs(x - Math.floor(m.cols * 0.28)) <= 1 && y > m.rows * 0.18 && y < m.rows * 0.82)
          || (Math.abs(y - Math.floor(m.rows * 0.72)) <= 1 && x > m.cols * 0.12 && x < m.cols * 0.88)) {
          m.tiles[idx] = 2;
        }
      }
    }
  }

  function ensureStandardProps() {
    var m = state.map;
    var defs = propDefs;
    var placements = [
      [0.18,0.22,0],[0.34,0.18,4],[0.62,0.20,5],[0.78,0.24,2],
      [0.22,0.38,6],[0.42,0.36,3],[0.66,0.40,1],[0.84,0.42,4],
      [0.16,0.56,2],[0.36,0.58,1],[0.56,0.55,6],[0.74,0.58,3],
      [0.24,0.76,0],[0.44,0.78,2],[0.62,0.74,4],[0.82,0.76,1],
      [0.12,0.84,5],[0.30,0.86,3],[0.70,0.86,0],[0.88,0.84,2],
      [0.46,0.44,8],[0.53,0.42,9],[0.48,0.49,10],[0.58,0.55,8],
      [0.40,0.62,9],[0.66,0.62,10],[0.26,0.48,8],[0.74,0.34,9]
    ];
    for (var i = m.structures.length; i < 28 && i < placements.length; i++) {
      var p = placements[i];
      var def = defs[p[2] % defs.length];
      m.structures.push({
        kind: def.kind,
        x: Math.round(m.width * p[0] - def.w / 2),
        y: Math.round(m.height * p[1] - def.h / 2),
        w: def.w,
        h: def.h,
        color: def.color
      });
    }
  }

  function autoStandardize() {
    var m = state.map;
    m.visualProfile = 'zombie-br-v03';
    addMissingPoints('spawnPoints', [
      { x: 320, y: 320 },
      { x: m.width - 320, y: 320 },
      { x: 320, y: m.height - 320 },
      { x: m.width - 320, y: m.height - 320 }
    ]);
    addMissingPoints('zombieEntries', [
      { x: m.width * 0.50, y: 120, kind: 'zombie_entry', name: '北部尸潮' },
      { x: m.width - 120, y: m.height * 0.46, kind: 'zombie_entry', name: '东侧尸潮' },
      { x: m.width * 0.48, y: m.height - 120, kind: 'zombie_entry', name: '南部尸潮' },
      { x: 120, y: m.height * 0.54, kind: 'zombie_entry', name: '西侧尸潮' }
    ]);
    addMissingPoints('rewardPoints', [
      { x: m.width * 0.18, y: m.height * 0.18, kind: 'reward', tier: 'small', xp: 12 },
      { x: m.width * 0.50, y: m.height * 0.16, kind: 'reward', tier: 'medium', xp: 18 },
      { x: m.width * 0.82, y: m.height * 0.20, kind: 'reward', tier: 'small', xp: 12 },
      { x: m.width * 0.20, y: m.height * 0.50, kind: 'reward', tier: 'medium', xp: 18 },
      { x: m.width * 0.80, y: m.height * 0.50, kind: 'reward', tier: 'medium', xp: 18 },
      { x: m.width * 0.24, y: m.height * 0.82, kind: 'reward', tier: 'small', xp: 12 },
      { x: m.width * 0.50, y: m.height * 0.84, kind: 'reward', tier: 'large', xp: 26 },
      { x: m.width * 0.76, y: m.height * 0.80, kind: 'reward', tier: 'small', xp: 12 }
    ]);
    addMissingPoints('rivalPoints', [
      { x: m.width * 0.30, y: m.height * 0.28, kind: 'rival' },
      { x: m.width * 0.72, y: m.height * 0.72, kind: 'rival' }
    ]);
    if (!m.bossPoints || !m.bossPoints.length) m.bossPoints = [{ name: 'Boss', x: m.width / 2, y: m.height / 2, kind: 'boss' }];
    m.stormCenter = m.stormCenter || { x: m.width / 2, y: m.height / 2 };
    ensureStandardRoutes();
    ensureStandardProps();
    state.selected = null;
    updateInspector();
    draw();
    setStatus('standardized: gameplay points and cover ready');
  }

  function renderSelection() {
    var panel = qs('selectionPanel');
    if (!state.selected) {
      panel.textContent = '无';
      return;
    }
    panel.innerHTML = '';
    var title = document.createElement('div');
    if (state.selected.type === 'prop') {
      var prop = state.map.structures[state.selected.index];
      title.textContent = prop ? prop.kind + ' @ ' + Math.round(prop.x) + ',' + Math.round(prop.y) : '无';
    } else {
      var pin = state.map[state.selected.list][state.selected.index];
      title.textContent = state.selected.list + ' @ ' + Math.round(pin.x) + ',' + Math.round(pin.y);
    }
    var btn = document.createElement('button');
    btn.textContent = '删除';
    btn.addEventListener('click', removeSelection);
    panel.appendChild(title);
    panel.appendChild(btn);
  }

  function normalizeMap(input) {
    var cols = input.cols || Math.round((input.width || 2560) / TS);
    var rows = input.rows || Math.round((input.height || 2560) / TS);
    var base = createMap(cols, rows);
    Object.keys(input).forEach(function(key) {
      base[key] = input[key];
    });
    base.tileSize = base.tileSize || TS;
    base.width = base.width || cols * TS;
    base.height = base.height || rows * TS;
    base.tiles = Array.from(base.tiles || new Array(cols * rows).fill(0));
    base.structures = base.structures || [];
    base.spawnPoints = base.spawnPoints || [];
    base.stratPoints = base.stratPoints || [];
    base.bossPoints = base.bossPoints || [];
    base.zombieEntries = base.zombieEntries || [];
    base.rewardPoints = base.rewardPoints || [];
    base.rivalPoints = base.rivalPoints || [];
    base.stormCenter = base.stormCenter || { x: base.width / 2, y: base.height / 2 };
    return base;
  }

  function loadMap(map) {
    state.map = normalizeMap(map);
    state.selected = null;
    fit();
    updateInspector();
    draw();
    setStatus('loaded ' + state.map.name);
  }

  function downloadMap() {
    state.map.name = qs('mapName').value || state.map.name;
    var blob = new Blob([JSON.stringify(state.map, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (state.map.name || 'zombie-br-map').replace(/\s+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCanvasDown(event) {
    var rect = canvas.getBoundingClientRect();
    var world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    if (event.button === 1 || event.button === 2 || event.altKey) {
      state.panning = true;
      state.lastMouse = { x: event.clientX, y: event.clientY };
      return;
    }
    if (event.shiftKey) {
      state.selected = hitTest(world);
      removeSelection();
      return;
    }
    var hit = hitTest(world);
    if (hit && state.tool.type !== 'tile') {
      state.selected = hit;
      updateInspector();
      draw();
      return;
    }
    placeAt(world);
    if (state.tool.type === 'tile') state.painting = true;
    draw();
  }

  function handleCanvasMove(event) {
    if (state.panning) {
      state.panX += event.clientX - state.lastMouse.x;
      state.panY += event.clientY - state.lastMouse.y;
      state.lastMouse = { x: event.clientX, y: event.clientY };
      draw();
      return;
    }
    if (state.painting) {
      var rect = canvas.getBoundingClientRect();
      paintTile(screenToWorld(event.clientX - rect.left, event.clientY - rect.top));
      draw();
    }
  }

  function handleWheel(event) {
    event.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var sx = event.clientX - rect.left;
    var sy = event.clientY - rect.top;
    var world = screenToWorld(sx, sy);
    var factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    state.zoom = Math.max(0.12, Math.min(2.5, state.zoom * factor));
    state.panX = sx - world.x * state.zoom;
    state.panY = sy - world.y * state.zoom;
    updateInspector();
    draw();
  }

  function bindEvents() {
    canvas.addEventListener('contextmenu', function(event) { event.preventDefault(); });
    canvas.addEventListener('mousedown', handleCanvasDown);
    canvas.addEventListener('mousemove', handleCanvasMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mouseup', function() {
      state.painting = false;
      state.panning = false;
    });
    window.addEventListener('resize', resize);
    qs('mapName').addEventListener('input', function(event) {
      state.map.name = event.target.value;
    });
    qs('mapSize').addEventListener('change', function(event) {
      var match = event.target.value.match(/(\d+)\s*[xX×]\s*(\d+)/);
      if (!match) return;
      loadMap(createMap(Math.max(12, Number(match[1])), Math.max(12, Number(match[2]))));
    });
    qs('newMap').addEventListener('click', function() {
      loadMap(createMap(40, 40));
    });
    qs('loadDefault').addEventListener('click', function() {
      fetch('/demo/maps/default.json').then(function(res) { return res.json(); }).then(loadMap).catch(function(error) {
        setStatus('load failed: ' + error.message);
      });
    });
    qs('autoStandard').addEventListener('click', autoStandardize);
    qs('loadFile').addEventListener('click', function() { qs('fileInput').click(); });
    qs('fileInput').addEventListener('change', function(event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() {
        try {
          loadMap(JSON.parse(reader.result));
        } catch (error) {
          setStatus('json failed: ' + error.message);
        }
      };
      reader.readAsText(file);
    });
    qs('downloadMap').addEventListener('click', downloadMap);
  }

  function boot() {
    buildTools();
    refreshTools();
    bindEvents();
    fit();
    resize();
    updateInspector();
  }

  boot();
})();
