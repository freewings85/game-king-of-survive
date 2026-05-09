(function() {
  'use strict';

  var TS = 64;

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
    { kind: 'wreck_car', name: '废车', w: 128, h: 72, color: '#6b4032', gameplay: 'cover' },
    { kind: 'crate', name: '箱体', w: 44, h: 44, color: '#765538', gameplay: 'cover_loot' },
    { kind: 'barricade', name: '路障', w: 112, h: 32, color: '#8a6a42', gameplay: 'soft_blocker' },
    { kind: 'debris', name: '碎片', w: 88, h: 58, color: '#656963', gameplay: 'soft_blocker' },
    { kind: 'fence', name: '铁网', w: 128, h: 24, color: '#6f7773', gameplay: 'lane_hint' },
    { kind: 'wall', name: '破墙', w: 32, h: 128, color: '#656963', gameplay: 'hard_blocker' },
    { kind: 'building', name: '房体', w: 112, h: 92, color: '#5a454a', gameplay: 'hard_blocker' },
    { kind: 'gas_station', name: '油站', w: 132, h: 86, color: '#7b4a32', gameplay: 'landmark' },
    { kind: 'barrel', name: '油桶', w: 40, h: 54, color: '#9a5830', gameplay: 'hazard' },
    { kind: 'tires', name: '轮胎', w: 80, h: 48, color: '#202422', gameplay: 'detail' },
    { kind: 'blood_mark', name: '血迹', w: 70, h: 42, color: '#5e1514', gameplay: 'detail' }
  ];

  var pinDefs = [
    { kind: 'spawn', name: '出生', color: '#42d9ff', list: 'spawnPoints' },
    { kind: 'zombie_entry', name: '尸群入口', color: '#8da082', list: 'zombieEntries' },
    { kind: 'reward', name: '奖励', color: '#7cff4f', list: 'rewardPoints' },
    { kind: 'rival', name: 'Rival', color: '#ff8b3d', list: 'rivalPoints' },
    { kind: 'boss', name: 'Boss', color: '#e6533f', list: 'bossPoints' },
    { kind: 'storm', name: '收圈', color: '#b95cff', list: null }
  ];

  var qualityTargets = {
    spawnPoints: 4,
    zombieEntries: 4,
    rewardPoints: 8,
    rivalPoints: 2,
    bossPoints: 1,
    structures: 20,
    wastelandDetails: 6,
    roadRatio: 0.2
  };

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

  function createMap(cols, rows) {
    var tiles = new Array(cols * rows).fill(0);
    paintRoadCross(tiles, cols, rows);
    return {
      name: 'Zombie BR Map',
      schemaVersion: 'v03-map-1',
      version: 2,
      tileSize: TS,
      cols: cols,
      rows: rows,
      width: cols * TS,
      height: rows * TS,
      visualProfile: 'zombie-br-v03',
      gameplayProfile: {
        mode: 'zombie-battle-royale',
        earlyLoopSeconds: 120,
        camera: 'portrait-orthographic-2.5d',
        renderProfile: 'v03-depth'
      },
      tiles: tiles,
      structures: [],
      spawnPoints: [
        { x: 320, y: 320 },
        { x: cols * TS - 320, y: 320 },
        { x: 320, y: rows * TS - 320 },
        { x: cols * TS - 320, y: rows * TS - 320 }
      ],
      stratPoints: [],
      bossPoints: [{ name: 'Boss', x: cols * TS / 2, y: rows * TS / 2, kind: 'boss' }],
      zombieEntries: [],
      rewardPoints: [],
      rivalPoints: [],
      stormCenter: { x: cols * TS / 2, y: rows * TS / 2 }
    };
  }

  function normalizeMap(input) {
    var cols = input.cols || Math.round((input.width || 2560) / TS);
    var rows = input.rows || Math.round((input.height || 2560) / TS);
    var base = createMap(cols, rows);
    Object.keys(input).forEach(function(key) {
      base[key] = input[key];
    });
    base.schemaVersion = base.schemaVersion || 'v03-map-1';
    base.tileSize = base.tileSize || TS;
    base.width = base.width || cols * TS;
    base.height = base.height || rows * TS;
    base.visualProfile = base.visualProfile || 'zombie-br-v03';
    base.gameplayProfile = base.gameplayProfile || createMap(cols, rows).gameplayProfile;
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

  function getQualityChecks(map) {
    var roadTiles = map.tiles.filter(function(id) { return id === 4 || id === 2; }).length;
    var roadRatio = roadTiles / Math.max(1, map.tiles.length);
    var decorKinds = { barrel: 1, tires: 1, blood_mark: 1 };
    var decorCount = (map.structures || []).filter(function(item) { return decorKinds[item.kind]; }).length;
    return [
      { label: '出生点 >= 4', detail: (map.spawnPoints || []).length + ' / 4', ok: (map.spawnPoints || []).length >= qualityTargets.spawnPoints },
      { label: '尸群入口 >= 4', detail: (map.zombieEntries || []).length + ' / 4', ok: (map.zombieEntries || []).length >= qualityTargets.zombieEntries },
      { label: '奖励点 >= 8', detail: (map.rewardPoints || []).length + ' / 8', ok: (map.rewardPoints || []).length >= qualityTargets.rewardPoints },
      { label: 'Rival 点 >= 2', detail: (map.rivalPoints || []).length + ' / 2', ok: (map.rivalPoints || []).length >= qualityTargets.rivalPoints },
      { label: 'Boss 点 >= 1', detail: (map.bossPoints || []).length + ' / 1', ok: (map.bossPoints || []).length >= qualityTargets.bossPoints },
      { label: '掩体/道具 >= 20', detail: (map.structures || []).length + ' / 20', ok: (map.structures || []).length >= qualityTargets.structures },
      { label: '废土细节 >= 6', detail: decorCount + ' / 6', ok: decorCount >= qualityTargets.wastelandDetails },
      { label: '道路/混凝土 >= 20%', detail: Math.round(roadRatio * 100) + '% / 20%', ok: roadRatio >= qualityTargets.roadRatio }
    ];
  }

  function addMissingPoints(map, listName, points) {
    map[listName] = map[listName] || [];
    for (var i = map[listName].length; i < points.length; i++) {
      map[listName].push(points[i]);
    }
  }

  function ensureStandardRoutes(map) {
    var cx = Math.floor(map.cols / 2);
    var cy = Math.floor(map.rows / 2);
    for (var y = 0; y < map.rows; y++) {
      for (var x = 0; x < map.cols; x++) {
        var idx = y * map.cols + x;
        if (Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1) map.tiles[idx] = 4;
        else if ((Math.abs(x - Math.floor(map.cols * 0.28)) <= 1 && y > map.rows * 0.18 && y < map.rows * 0.82)
          || (Math.abs(y - Math.floor(map.rows * 0.72)) <= 1 && x > map.cols * 0.12 && x < map.cols * 0.88)) {
          map.tiles[idx] = 2;
        }
      }
    }
  }

  function ensureStandardProps(map) {
    var placements = [
      [0.18,0.22,0],[0.34,0.18,4],[0.62,0.20,5],[0.78,0.24,2],
      [0.22,0.38,6],[0.42,0.36,3],[0.66,0.40,1],[0.84,0.42,4],
      [0.16,0.56,2],[0.36,0.58,1],[0.56,0.55,6],[0.74,0.58,3],
      [0.24,0.76,0],[0.44,0.78,2],[0.62,0.74,4],[0.82,0.76,1],
      [0.12,0.84,5],[0.30,0.86,3],[0.70,0.86,0],[0.88,0.84,2],
      [0.46,0.44,8],[0.53,0.42,9],[0.48,0.49,10],[0.58,0.55,8],
      [0.40,0.62,9],[0.66,0.62,10],[0.26,0.48,8],[0.74,0.34,9]
    ];
    map.structures = map.structures || [];
    for (var i = map.structures.length; i < 28 && i < placements.length; i++) {
      var p = placements[i];
      var def = propDefs[p[2] % propDefs.length];
      map.structures.push({
        kind: def.kind,
        x: Math.round(map.width * p[0] - def.w / 2),
        y: Math.round(map.height * p[1] - def.h / 2),
        w: def.w,
        h: def.h,
        color: def.color,
        gameplay: def.gameplay
      });
    }
  }

  function standardizeMap(input) {
    var map = normalizeMap(input);
    map.visualProfile = 'zombie-br-v03';
    map.schemaVersion = 'v03-map-1';
    map.gameplayProfile = map.gameplayProfile || createMap(map.cols, map.rows).gameplayProfile;
    addMissingPoints(map, 'spawnPoints', [
      { x: 320, y: 320 },
      { x: map.width - 320, y: 320 },
      { x: 320, y: map.height - 320 },
      { x: map.width - 320, y: map.height - 320 }
    ]);
    addMissingPoints(map, 'zombieEntries', [
      { x: map.width * 0.50, y: 120, kind: 'zombie_entry', name: '北部尸潮' },
      { x: map.width - 120, y: map.height * 0.46, kind: 'zombie_entry', name: '东侧尸潮' },
      { x: map.width * 0.48, y: map.height - 120, kind: 'zombie_entry', name: '南部尸潮' },
      { x: 120, y: map.height * 0.54, kind: 'zombie_entry', name: '西侧尸潮' }
    ]);
    addMissingPoints(map, 'rewardPoints', [
      { x: map.width * 0.18, y: map.height * 0.18, kind: 'reward', tier: 'small', xp: 12 },
      { x: map.width * 0.50, y: map.height * 0.16, kind: 'reward', tier: 'medium', xp: 18 },
      { x: map.width * 0.82, y: map.height * 0.20, kind: 'reward', tier: 'small', xp: 12 },
      { x: map.width * 0.20, y: map.height * 0.50, kind: 'reward', tier: 'medium', xp: 18 },
      { x: map.width * 0.80, y: map.height * 0.50, kind: 'reward', tier: 'medium', xp: 18 },
      { x: map.width * 0.24, y: map.height * 0.82, kind: 'reward', tier: 'small', xp: 12 },
      { x: map.width * 0.50, y: map.height * 0.84, kind: 'reward', tier: 'large', xp: 26 },
      { x: map.width * 0.76, y: map.height * 0.80, kind: 'reward', tier: 'small', xp: 12 }
    ]);
    addMissingPoints(map, 'rivalPoints', [
      { x: map.width * 0.30, y: map.height * 0.28, kind: 'rival' },
      { x: map.width * 0.72, y: map.height * 0.72, kind: 'rival' }
    ]);
    if (!map.bossPoints || !map.bossPoints.length) map.bossPoints = [{ name: 'Boss', x: map.width / 2, y: map.height / 2, kind: 'boss' }];
    map.stormCenter = map.stormCenter || { x: map.width / 2, y: map.height / 2 };
    ensureStandardRoutes(map);
    ensureStandardProps(map);
    return map;
  }

  function stampExport(map) {
    var checks = getQualityChecks(map);
    map.schemaVersion = 'v03-map-1';
    map.visualProfile = 'zombie-br-v03';
    map.gameplayProfile = map.gameplayProfile || createMap(map.cols, map.rows).gameplayProfile;
    map.exportMeta = {
      exportedAt: new Date().toISOString(),
      qualityPassed: checks.every(function(check) { return check.ok; }),
      qualityChecks: checks
    };
    return map;
  }

  window.KOS_MAP_CONTRACT = {
    tileSize: TS,
    tileDefs: tileDefs,
    propDefs: propDefs,
    pinDefs: pinDefs,
    qualityTargets: qualityTargets,
    createMap: createMap,
    normalizeMap: normalizeMap,
    standardizeMap: standardizeMap,
    getQualityChecks: getQualityChecks,
    stampExport: stampExport
  };
})();
