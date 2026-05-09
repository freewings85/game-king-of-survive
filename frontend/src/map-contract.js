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
    getQualityChecks: getQualityChecks,
    stampExport: stampExport
  };
})();
