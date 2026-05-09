import * as THREE from '/node_modules/three/build/three.module.js';

const { classDefs, demoTuning, skillDefs } = window.KOS_V03_CONFIG;

const canvas = document.getElementById('engineCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c211f);
scene.fog = new THREE.Fog(0x1c211f, 18, 48);

const camera = new THREE.OrthographicCamera(-6, 6, 8, -8, 0.1, 80);
camera.position.set(8, 9, 8);
camera.lookAt(0, 0, 0);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x2b2018, 1.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0cf, 2.4);
sun.position.set(-5, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
scene.add(sun);

const accentLight = new THREE.PointLight(0x4ec9ff, 3.2, 14);
accentLight.position.set(-2, 3.5, 2);
scene.add(accentLight);

const mats = {
  ground: new THREE.MeshStandardMaterial({ color: 0x343b36, roughness: 0.92 }),
  road: new THREE.MeshStandardMaterial({ color: 0x252a29, roughness: 0.96 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x9a5830, roughness: 0.75, metalness: 0.12 }),
  crate: new THREE.MeshStandardMaterial({ color: 0x7d552d, roughness: 0.82 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x5a5f59, roughness: 0.88 }),
  player: new THREE.MeshStandardMaterial({ color: 0x243436, roughness: 0.58, metalness: 0.12 }),
  playerAccent: new THREE.MeshStandardMaterial({ color: 0x4ec9ff, roughness: 0.35, emissive: 0x0d4d66, emissiveIntensity: 0.65 }),
  rival: new THREE.MeshStandardMaterial({ color: 0x3b2d28, roughness: 0.62, metalness: 0.10 }),
  rivalAccent: new THREE.MeshStandardMaterial({ color: 0xff8b3d, roughness: 0.36, emissive: 0x7a2600, emissiveIntensity: 0.7 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd2a164, roughness: 0.72 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.86 }),
  hand: new THREE.MeshStandardMaterial({ color: 0xc28a55, roughness: 0.76 }),
  boot: new THREE.MeshStandardMaterial({ color: 0x0d1110, roughness: 0.84 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xd8d1a3, roughness: 0.8 }),
  hood: new THREE.MeshStandardMaterial({ color: 0x273321, roughness: 0.88 }),
  armorEdge: new THREE.MeshBasicMaterial({ color: 0xdce9a0, transparent: true, opacity: 0.86 }),
  facePaint: new THREE.MeshBasicMaterial({ color: 0xffd7a2, transparent: true, opacity: 0.78 }),
  clothPatch: new THREE.MeshBasicMaterial({ color: 0x9a6b3a, transparent: true, opacity: 0.82 }),
  rotPatch: new THREE.MeshBasicMaterial({ color: 0x37513b, transparent: true, opacity: 0.80 }),
  zombie: new THREE.MeshStandardMaterial({ color: 0x83936f, roughness: 0.88 }),
  zombieCloth: new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 0.9 }),
  zombieRag: new THREE.MeshStandardMaterial({ color: 0x6c5838, roughness: 0.92 }),
  eye: new THREE.MeshStandardMaterial({ color: 0xff5a3d, emissive: 0xff2510, emissiveIntensity: 1.8 }),
  xp: new THREE.MeshStandardMaterial({ color: 0x7cff4f, emissive: 0x37ff20, emissiveIntensity: 1.5 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xf4c95a, emissive: 0x6f4c05, emissiveIntensity: 0.45 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff8b3d, emissive: 0x7a2600, emissiveIntensity: 0.8 }),
  muzzle: new THREE.MeshBasicMaterial({ color: 0xfff0a3, transparent: true, opacity: 0.9 }),
  crack: new THREE.MeshBasicMaterial({ color: 0x101412, transparent: true, opacity: 0.42 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x3e5f38, roughness: 0.96 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.9 }),
  hotCore: new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.95 }),
  smoke: new THREE.MeshBasicMaterial({ color: 0x2d2520, transparent: true, opacity: 0.28 }),
  arcGlow: new THREE.MeshBasicMaterial({ color: 0xbdf7ff, transparent: true, opacity: 0.72 }),
  hitFlash: new THREE.MeshBasicMaterial({ color: 0xfff0a3, transparent: true, opacity: 0.88 }),
  fxCardHot: new THREE.MeshBasicMaterial({ color: 0xfff0a3, transparent: true, opacity: 0.86, side: THREE.DoubleSide }),
  fxCardOrange: new THREE.MeshBasicMaterial({ color: 0xff8b3d, transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
  fxCardBlue: new THREE.MeshBasicMaterial({ color: 0x8be9ff, transparent: true, opacity: 0.70, side: THREE.DoubleSide }),
  fxCardSmoke: new THREE.MeshBasicMaterial({ color: 0x191513, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
};

const tileMats = [
  new THREE.MeshStandardMaterial({ color: 0x5f5b43, roughness: 0.98 }),
  new THREE.MeshStandardMaterial({ color: 0x5a4e3b, roughness: 0.98 }),
  new THREE.MeshStandardMaterial({ color: 0x626a64, roughness: 0.94 }),
  new THREE.MeshStandardMaterial({ color: 0x2e4541, roughness: 0.88 }),
  new THREE.MeshStandardMaterial({ color: 0x252a29, roughness: 0.96 }),
  new THREE.MeshStandardMaterial({ color: 0x3e3328, roughness: 0.98 }),
  new THREE.MeshStandardMaterial({ color: 0x454b46, roughness: 0.96 })
];
const blobShadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.22,
  depthWrite: false
});

let activeClass = 'tech';
let activeSkill = 'arc';
let activeSkin = 0;
let activeGearCount = 0;
const playerSpawn = { x: -0.8, z: 0.7 };

const game = {
  hp: demoTuning.player.hp,
  xp: 0,
  level: 1,
  kills: 0,
  shotsFired: 0,
  damageDealt: 0,
  xpDropped: 0,
  lastKillAt: 0,
  fireTimer: 0,
  hitTimer: 0,
  input: { active: false, id: null, startX: 0, startY: 0, x: 0, y: 0 }
};
let silhouettePartCount = 0;
let zombieDetailPartCount = 0;
let groundDetailCount = 0;
let unitDecalCount = 0;

function add(mesh, x, z, y = 0) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function cyl(rTop, rBot, h, mat, seg = 18) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
}

function addContactShadow(root, sx = 1, sz = 0.7, opacity = 0.22) {
  const mat = blobShadowMat.clone();
  mat.opacity = opacity;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), mat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(sx, sz, 1);
  shadow.position.y = 0.018;
  shadow.castShadow = false;
  shadow.receiveShadow = false;
  shadow.userData.contactShadow = true;
  root.add(shadow);
  return shadow;
}

const ground = new THREE.Mesh(new THREE.PlaneGeometry(42, 42, 1, 1), mats.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const safeZoneMat = new THREE.MeshBasicMaterial({
  color: 0xb95cff,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false
});
const safeZone = new THREE.Mesh(new THREE.RingGeometry(4.35, 4.56, 96), safeZoneMat);
safeZone.rotation.x = -Math.PI / 2;
safeZone.position.y = 0.035;
scene.add(safeZone);

for (let i = -18; i <= 18; i += 2) {
  const lineA = box(0.025, 0.01, 42, mats.road);
  lineA.rotation.y = Math.PI * 0.18;
  add(lineA, i, 0, 0.012);
  lineA.castShadow = false;
  const lineB = box(42, 0.01, 0.018, mats.road);
  lineB.rotation.y = -Math.PI * 0.08;
  add(lineB, 0, i, 0.014);
  lineB.castShadow = false;
}

function makeCrate(x, z, s = 1) {
  const root = new THREE.Group();
  addContactShadow(root, 1.25 * s, 0.88 * s, 0.20);
  const c = box(s, s, s, mats.crate);
  c.position.y = s * 0.5;
  c.castShadow = c.receiveShadow = true;
  root.add(c);
  const plank = box(s * 1.08, s * 0.08, s * 0.10, mats.gold);
  plank.position.set(0, s * 0.82, 0);
  plank.rotation.y = Math.PI / 4;
  root.add(plank);
  root.position.set(x, 0, z);
  scene.add(root);
  return root;
}

function makeWreck(x, z, rot) {
  const root = new THREE.Group();
  addContactShadow(root, 2.7, 1.38, 0.26);
  const body = box(2.2, 0.55, 1.05, mats.rust);
  body.position.y = 0.36;
  root.add(body);
  const cabin = box(0.8, 0.45, 0.82, mats.wall);
  cabin.position.set(-0.25, 0.85, -0.05);
  root.add(cabin);
  for (const dx of [-0.7, 0.75]) {
    const wheel = cyl(0.18, 0.18, 0.18, new THREE.MeshStandardMaterial({ color: 0x070908 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(dx, 0.18, 0.58);
    root.add(wheel);
  }
  root.rotation.y = rot;
  root.position.set(x, 0, z);
  scene.add(root);
  return root;
}

function makeWall(x, z, w, d) {
  const root = new THREE.Group();
  addContactShadow(root, Math.max(0.7, w * 1.2), Math.max(0.34, d * 1.45), 0.22);
  const wall = box(w, 1.35, d, mats.wall);
  wall.position.y = 0.68;
  wall.castShadow = wall.receiveShadow = true;
  root.add(wall);
  const cap = box(w * 1.04, 0.08, d * 1.04, mats.road);
  cap.position.y = 1.39;
  root.add(cap);
  root.position.set(x, 0, z);
  scene.add(root);
  return root;
}

function makeBarrel(x, z, s = 1) {
  const root = new THREE.Group();
  addContactShadow(root, 0.72 * s, 0.52 * s, 0.20);
  const barrel = cyl(0.22 * s, 0.22 * s, 0.54 * s, mats.rust, 18);
  barrel.position.y = 0.27 * s;
  root.add(barrel);
  const cap = cyl(0.23 * s, 0.23 * s, 0.04 * s, mats.orange, 18);
  cap.position.y = 0.56 * s;
  root.add(cap);
  root.position.set(x, 0, z);
  root.traverse((o) => {
    if (o.isMesh && !o.userData.contactShadow) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(root);
  return root;
}

function makeTires(x, z, s = 1) {
  const root = new THREE.Group();
  addContactShadow(root, 1.12 * s, 0.62 * s, 0.18);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x090b0a, roughness: 0.96 });
  for (let i = 0; i < 3; i++) {
    const tire = cyl(0.22 * s, 0.22 * s, 0.16 * s, tireMat, 20);
    tire.rotation.z = Math.PI / 2;
    tire.position.set((i - 1) * 0.28 * s, 0.18 * s, (i % 2) * 0.12 * s);
    root.add(tire);
  }
  root.position.set(x, 0, z);
  root.traverse((o) => {
    if (o.isMesh && !o.userData.contactShadow) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(root);
  return root;
}

function makeDebris(x, z, s = 1) {
  const root = new THREE.Group();
  addContactShadow(root, 1.18 * s, 0.72 * s, 0.18);
  for (let i = 0; i < 4; i++) {
    const chunk = box((0.28 + i * 0.04) * s, 0.16 * s, (0.18 + (i % 2) * 0.12) * s, i % 2 ? mats.wall : mats.crate);
    chunk.position.set((i - 1.5) * 0.22 * s, 0.08 * s, (i % 2 ? -0.14 : 0.16) * s);
    chunk.rotation.y = i * 0.42;
    root.add(chunk);
  }
  root.position.set(x, 0, z);
  root.traverse((o) => {
    if (o.isMesh && !o.userData.contactShadow) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(root);
  return root;
}

function makeContractMap() {
  const contract = window.KOS_MAP_CONTRACT;
  if (!contract || typeof contract.standardizeMap !== 'function') return null;
  const map = contract.standardizeMap(contract.createMap(26, 22));
  map.name = 'V03 Contract Wasteland';
  return map;
}

function toSceneX(map, x) {
  return (x / map.width - 0.5) * 12;
}

function toSceneZ(map, y) {
  return (y / map.height - 0.5) * 10;
}

function addContractProp(map, prop, index) {
  const x = toSceneX(map, prop.x + prop.w / 2);
  const z = toSceneZ(map, prop.y + prop.h / 2);
  const sx = Math.max(0.45, prop.w / 96);
  const sz = Math.max(0.28, prop.h / 96);
  if (prop.kind === 'wreck_car') return makeWreck(x, z, -0.45 + (index % 5) * 0.18);
  if (prop.kind === 'crate') return makeCrate(x, z, Math.max(0.42, prop.w / 68));
  if (prop.kind === 'wall' || prop.kind === 'building' || prop.kind === 'gas_station') return makeWall(x, z, sx, sz);
  if (prop.kind === 'barricade' || prop.kind === 'fence') return makeWall(x, z, sx, 0.18);
  if (prop.kind === 'barrel') return makeBarrel(x, z, Math.max(0.72, prop.w / 48));
  if (prop.kind === 'tires') return makeTires(x, z, Math.max(0.78, prop.w / 90));
  if (prop.kind === 'debris') return makeDebris(x, z, Math.max(0.72, prop.w / 100));
  if (prop.kind === 'blood_mark') {
    const stain = box(Math.max(0.5, sx), 0.012, Math.max(0.26, sz), mats.orange);
    stain.position.set(x, 0.016, z);
    stain.castShadow = false;
    stain.receiveShadow = true;
    scene.add(stain);
    return stain;
  }
  return makeCrate(x, z, 0.5);
}

function paintContractTiles(map) {
  const tileGroup = new THREE.Group();
  const tileW = 12 / map.cols;
  const tileD = 10 / map.rows;
  const geom = new THREE.PlaneGeometry(tileW * 0.98, tileD * 0.98);
  const crackGeom = new THREE.PlaneGeometry(tileW * 0.64, 0.018);
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const id = map.tiles[y * map.cols + x] || 0;
      const tile = new THREE.Mesh(geom, tileMats[id] || tileMats[0]);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(
        (x + 0.5) / map.cols * 12 - 6,
        0.021 + (id === 4 ? 0.006 : 0),
        (y + 0.5) / map.rows * 10 - 5
      );
      tile.receiveShadow = true;
      tileGroup.add(tile);
      if ((x * 17 + y * 23) % 9 === 0) {
        const crack = new THREE.Mesh(crackGeom, mats.crack);
        crack.rotation.x = -Math.PI / 2;
        crack.rotation.z = ((x + y) % 5 - 2) * 0.38;
        crack.position.set(tile.position.x, 0.036, tile.position.z);
        tileGroup.add(crack);
        groundDetailCount += 1;
      }
      if (id !== 4 && (x * 11 + y * 7) % 17 === 0) {
        const tuft = cyl(0.025, 0.055, 0.18, mats.grass, 5);
        tuft.position.set(tile.position.x + tileW * 0.22, 0.09, tile.position.z - tileD * 0.12);
        tuft.rotation.z = 0.28;
        tileGroup.add(tuft);
        groundDetailCount += 1;
      }
    }
  }
  scene.add(tileGroup);
  return tileGroup;
}

function keepPropForCombatReadability(map, prop) {
  const x = toSceneX(map, prop.x + prop.w / 2);
  const z = toSceneZ(map, prop.y + prop.h / 2);
  return Math.hypot(x - playerSpawn.x, z - playerSpawn.z) > 2.25;
}

function contractPointToScene(map, point) {
  return {
    x: toSceneX(map, point.x),
    z: toSceneZ(map, point.y)
  };
}

function pointNearArena(map, point, fallbackAngle, fallbackRadius) {
  if (map && point) {
    const scenePoint = contractPointToScene(map, point);
    const dx = scenePoint.x - playerSpawn.x;
    const dz = scenePoint.z - playerSpawn.z;
    const dist = Math.hypot(dx, dz) || 1;
    const radius = Math.min(6.2, Math.max(3.4, dist * 0.82));
    return {
      x: playerSpawn.x + dx / dist * radius,
      z: playerSpawn.z + dz / dist * radius
    };
  }
  return {
    x: Math.cos(fallbackAngle) * fallbackRadius + 0.8,
    z: Math.sin(fallbackAngle) * fallbackRadius - 0.1
  };
}

function makeCharacter(colorMat, accentMat, scale = 1) {
  const root = new THREE.Group();
  addContactShadow(root, 1.05 * scale, 0.72 * scale, 0.28);
  const legs = [
    box(0.18 * scale, 0.65 * scale, 0.20 * scale, mats.road),
    box(0.18 * scale, 0.65 * scale, 0.20 * scale, mats.road)
  ];
  legs[0].position.set(-0.17 * scale, 0.36 * scale, 0);
  legs[1].position.set(0.17 * scale, 0.36 * scale, 0);
  const bootA = box(0.28 * scale, 0.16 * scale, 0.34 * scale, mats.boot);
  const bootB = bootA.clone();
  bootA.position.set(-0.17 * scale, 0.08 * scale, -0.06 * scale);
  bootB.position.set(0.17 * scale, 0.08 * scale, -0.06 * scale);
  root.add(legs[0], legs[1], bootA, bootB);

  const body = box(0.78 * scale, 1.05 * scale, 0.45 * scale, colorMat);
  body.position.y = 1.05 * scale;
  root.add(body);
  const chestPlate = box(0.62 * scale, 0.36 * scale, 0.51 * scale, accentMat);
  chestPlate.position.set(0, 1.20 * scale, -0.02 * scale);
  root.add(chestPlate);
  const stripe = box(0.12 * scale, 0.92 * scale, 0.49 * scale, accentMat);
  stripe.position.y = 1.08 * scale;
  stripe.position.z = -0.01 * scale;
  root.add(stripe);

  const head = cyl(0.24 * scale, 0.24 * scale, 0.34 * scale, mats.skin, 24);
  head.position.y = 1.82 * scale;
  root.add(head);
  const faceShadow = box(0.34 * scale, 0.05 * scale, 0.28 * scale, mats.hair);
  faceShadow.position.set(0, 1.77 * scale, -0.22 * scale);
  root.add(faceShadow);
  const facePaint = box(0.20 * scale, 0.06 * scale, 0.03 * scale, mats.facePaint);
  facePaint.position.set(0.01 * scale, 1.80 * scale, -0.29 * scale);
  unitDecalCount += 1;
  root.add(facePaint);
  const eyeA = box(0.05 * scale, 0.035 * scale, 0.022 * scale, mats.boot);
  const eyeB = eyeA.clone();
  eyeA.position.set(-0.08 * scale, 1.86 * scale, -0.25 * scale);
  eyeB.position.set(0.08 * scale, 1.86 * scale, -0.25 * scale);
  root.add(eyeA, eyeB);
  const hair = box(0.42 * scale, 0.16 * scale, 0.38 * scale, mats.hair);
  hair.position.set(-0.03 * scale, 2.04 * scale, -0.03 * scale);
  hair.rotation.z = -0.18;
  root.add(hair);
  for (let i = 0; i < 3; i++) {
    const spike = box(0.10 * scale, 0.20 * scale, 0.14 * scale, mats.hair);
    spike.position.set((-0.16 + i * 0.15) * scale, 2.13 * scale, (-0.10 - i * 0.02) * scale);
    spike.rotation.z = (-0.35 + i * 0.18);
    root.add(spike);
  }
  const eyeBand = box(0.34 * scale, 0.045 * scale, 0.51 * scale, mats.road);
  eyeBand.position.set(0, 1.88 * scale, -0.02 * scale);
  root.add(eyeBand);
  const visor = box(0.44 * scale, 0.09 * scale, 0.50 * scale, accentMat);
  visor.position.y = 1.90 * scale;
  root.add(visor);
  const chestEdgeA = box(0.52 * scale, 0.035 * scale, 0.54 * scale, mats.armorEdge);
  const chestEdgeB = chestEdgeA.clone();
  chestEdgeA.position.set(0, 1.39 * scale, -0.035 * scale);
  chestEdgeB.position.set(0, 1.02 * scale, -0.035 * scale);
  unitDecalCount += 2;
  root.add(chestEdgeA, chestEdgeB);
  const backpack = box(0.42 * scale, 0.68 * scale, 0.18 * scale, mats.road);
  backpack.position.set(0, 1.18 * scale, 0.32 * scale);
  root.add(backpack);
  const shoulderA = box(0.26 * scale, 0.16 * scale, 0.52 * scale, accentMat);
  const shoulderB = shoulderA.clone();
  shoulderA.position.set(-0.52 * scale, 1.46 * scale, 0);
  shoulderB.position.set(0.52 * scale, 1.46 * scale, 0);
  root.add(shoulderA, shoulderB);
  const elbowA = cyl(0.075 * scale, 0.075 * scale, 0.58 * scale, colorMat, 10);
  const elbowB = elbowA.clone();
  elbowA.position.set(-0.54 * scale, 1.02 * scale, -0.18 * scale);
  elbowB.position.set(0.54 * scale, 1.02 * scale, -0.18 * scale);
  elbowA.rotation.x = -0.55;
  elbowB.rotation.x = -0.55;
  root.add(elbowA, elbowB);
  const handA = cyl(0.085 * scale, 0.085 * scale, 0.10 * scale, mats.hand, 12);
  const handB = handA.clone();
  handA.position.set(-0.58 * scale, 0.78 * scale, -0.42 * scale);
  handB.position.set(0.64 * scale, 0.84 * scale, -0.44 * scale);
  const gloveA = box(0.16 * scale, 0.08 * scale, 0.18 * scale, mats.boot);
  const gloveB = gloveA.clone();
  gloveA.position.set(-0.58 * scale, 0.82 * scale, -0.42 * scale);
  gloveB.position.set(0.64 * scale, 0.88 * scale, -0.44 * scale);
  root.add(handA, handB, gloveA, gloveB);

  const gun = box(0.96 * scale, 0.12 * scale, 0.16 * scale, mats.road);
  gun.position.set(0.52 * scale, 1.12 * scale, -0.28 * scale);
  gun.rotation.y = -0.24;
  root.add(gun);
  const gunStock = box(0.28 * scale, 0.18 * scale, 0.18 * scale, mats.boot);
  gunStock.position.set(0.06 * scale, 1.05 * scale, -0.15 * scale);
  gunStock.rotation.y = -0.24;
  root.add(gunStock);
  const muzzle = cyl(0.08 * scale, 0.08 * scale, 0.16 * scale, accentMat);
  muzzle.position.set(1.05 * scale, 1.12 * scale, -0.42 * scale);
  muzzle.rotation.z = Math.PI / 2;
  root.add(muzzle);

  const guardianShield = box(0.18 * scale, 0.88 * scale, 0.72 * scale, accentMat);
  guardianShield.position.set(-0.68 * scale, 1.02 * scale, -0.08 * scale);
  guardianShield.rotation.z = 0.18;
  guardianShield.userData.classGear = 'guardian';
  root.add(guardianShield);
  const guardianShieldCore = box(0.20 * scale, 0.64 * scale, 0.46 * scale, mats.boot);
  guardianShieldCore.position.set(-0.72 * scale, 1.04 * scale, -0.09 * scale);
  guardianShieldCore.rotation.z = 0.18;
  guardianShieldCore.userData.classGear = 'guardian';
  root.add(guardianShieldCore);
  const guardianShieldMark = box(0.21 * scale, 0.46 * scale, 0.08 * scale, mats.armorEdge);
  guardianShieldMark.position.set(-0.86 * scale, 1.05 * scale, -0.10 * scale);
  guardianShieldMark.rotation.z = 0.18;
  guardianShieldMark.userData.classGear = 'guardian';
  unitDecalCount += 1;
  root.add(guardianShieldMark);
  const guardianPauldronA = box(0.34 * scale, 0.22 * scale, 0.62 * scale, accentMat);
  const guardianPauldronB = guardianPauldronA.clone();
  guardianPauldronA.position.set(-0.60 * scale, 1.55 * scale, 0.02 * scale);
  guardianPauldronB.position.set(0.60 * scale, 1.55 * scale, 0.02 * scale);
  guardianPauldronA.userData.classGear = 'guardian';
  guardianPauldronB.userData.classGear = 'guardian';
  root.add(guardianPauldronA, guardianPauldronB);

  const techCoil = new THREE.Mesh(new THREE.TorusGeometry(0.25 * scale, 0.035 * scale, 10, 24), accentMat);
  techCoil.position.set(-0.38 * scale, 1.64 * scale, 0.18 * scale);
  techCoil.rotation.x = Math.PI / 2;
  techCoil.userData.classGear = 'tech';
  root.add(techCoil);
  const techMast = box(0.08 * scale, 0.62 * scale, 0.08 * scale, accentMat);
  techMast.position.set(-0.39 * scale, 1.42 * scale, 0.18 * scale);
  techMast.userData.classGear = 'tech';
  root.add(techMast);
  const techPack = box(0.46 * scale, 0.52 * scale, 0.24 * scale, mats.boot);
  techPack.position.set(-0.06 * scale, 1.28 * scale, 0.42 * scale);
  techPack.userData.classGear = 'tech';
  root.add(techPack);
  const techDish = new THREE.Mesh(new THREE.TorusGeometry(0.15 * scale, 0.025 * scale, 8, 18), accentMat);
  techDish.position.set(0.24 * scale, 1.68 * scale, 0.38 * scale);
  techDish.rotation.x = Math.PI / 2;
  techDish.userData.classGear = 'tech';
  root.add(techDish);
  const techAntenna = box(0.045 * scale, 0.72 * scale, 0.045 * scale, accentMat);
  techAntenna.position.set(0.26 * scale, 1.72 * scale, 0.36 * scale);
  techAntenna.rotation.z = -0.18;
  techAntenna.userData.classGear = 'tech';
  root.add(techAntenna);
  const techScreen = box(0.26 * scale, 0.14 * scale, 0.035 * scale, mats.armorEdge);
  techScreen.position.set(-0.08 * scale, 1.34 * scale, 0.29 * scale);
  techScreen.userData.classGear = 'tech';
  unitDecalCount += 1;
  root.add(techScreen);

  const rangerCloak = box(0.64 * scale, 0.74 * scale, 0.10 * scale, colorMat);
  rangerCloak.position.set(-0.04 * scale, 0.95 * scale, 0.44 * scale);
  rangerCloak.rotation.x = -0.22;
  rangerCloak.userData.classGear = 'ranger';
  root.add(rangerCloak);
  const rangerBarrel = box(1.18 * scale, 0.08 * scale, 0.10 * scale, accentMat);
  rangerBarrel.position.set(0.70 * scale, 1.26 * scale, -0.45 * scale);
  rangerBarrel.rotation.y = -0.20;
  rangerBarrel.userData.classGear = 'ranger';
  root.add(rangerBarrel);
  const rangerHood = cyl(0.32 * scale, 0.26 * scale, 0.30 * scale, mats.hood, 5);
  rangerHood.position.set(0, 1.98 * scale, 0.02 * scale);
  rangerHood.rotation.y = Math.PI / 5;
  rangerHood.userData.classGear = 'ranger';
  root.add(rangerHood);
  const rangerScope = cyl(0.055 * scale, 0.055 * scale, 0.34 * scale, accentMat, 10);
  rangerScope.position.set(0.58 * scale, 1.38 * scale, -0.45 * scale);
  rangerScope.rotation.z = Math.PI / 2;
  rangerScope.userData.classGear = 'ranger';
  root.add(rangerScope);
  const rangerCapeTip = box(0.52 * scale, 0.34 * scale, 0.08 * scale, mats.hood);
  rangerCapeTip.position.set(-0.08 * scale, 0.54 * scale, 0.49 * scale);
  rangerCapeTip.rotation.x = -0.38;
  rangerCapeTip.userData.classGear = 'ranger';
  root.add(rangerCapeTip);
  const rangerCapeStripe = box(0.44 * scale, 0.055 * scale, 0.09 * scale, mats.armorEdge);
  rangerCapeStripe.position.set(-0.08 * scale, 0.76 * scale, 0.55 * scale);
  rangerCapeStripe.rotation.x = -0.38;
  rangerCapeStripe.userData.classGear = 'ranger';
  unitDecalCount += 1;
  root.add(rangerCapeStripe);

  root.traverse((o) => {
    if (o.isMesh && !o.userData.contactShadow) {
      o.castShadow = true;
      o.receiveShadow = true;
      silhouettePartCount += 1;
    }
  });
  return root;
}

function makeZombie(x, z, scale = 1, fast = false, variant = 0) {
  const root = new THREE.Group();
  addContactShadow(root, 0.88 * scale, 0.58 * scale, 0.25);
  const legA = box(0.16 * scale, 0.58 * scale, 0.18 * scale, mats.road);
  const legB = box(0.16 * scale, 0.58 * scale, 0.18 * scale, mats.road);
  legA.position.set(-0.14 * scale, 0.30 * scale, 0);
  legB.position.set(0.14 * scale, 0.30 * scale, 0);
  const body = box((fast ? 0.48 : 0.62) * scale, 0.82 * scale, 0.38 * scale, mats.zombieCloth);
  body.position.y = 0.92 * scale;
  body.rotation.x = -0.18 - (variant === 1 ? 0.16 : 0);
  const rag = box((fast ? 0.54 : 0.68) * scale, 0.34 * scale, 0.42 * scale, mats.zombieRag);
  rag.position.set(0.02 * scale, 1.03 * scale, -0.04 * scale);
  rag.rotation.x = -0.2;
  const wound = box((fast ? 0.28 : 0.36) * scale, 0.10 * scale, 0.40 * scale, mats.eye);
  wound.position.set(0.05 * scale, 1.05 * scale, -0.01 * scale);
  const woundGlow = box((fast ? 0.22 : 0.30) * scale, 0.045 * scale, 0.43 * scale, mats.rotPatch);
  woundGlow.position.set(0.06 * scale, 1.12 * scale, -0.04 * scale);
  unitDecalCount += 1;
  const head = cyl(0.22 * scale, 0.23 * scale, 0.28 * scale, mats.zombie, 18);
  head.position.set(0, 1.44 * scale, -0.11 * scale);
  head.rotation.x = 0.28;
  if (variant === 1) {
    head.scale.set(1.18, 0.86, 1.05);
    head.position.z -= 0.06 * scale;
  }
  if (variant === 2) {
    head.scale.set(0.88, 1.18, 0.94);
    head.position.y += 0.08 * scale;
  }
  const jaw = box(0.22 * scale, 0.08 * scale, 0.18 * scale, mats.zombie);
  jaw.position.set(0.03 * scale, 1.32 * scale, -0.24 * scale);
  const teeth = box(0.16 * scale, 0.035 * scale, 0.05 * scale, mats.bone);
  teeth.position.set(0.03 * scale, 1.29 * scale, -0.34 * scale);
  const skullPatch = box(0.18 * scale, 0.08 * scale, 0.15 * scale, mats.bone);
  skullPatch.position.set(-0.08 * scale, 1.54 * scale, -0.17 * scale);
  skullPatch.rotation.z = -0.22;
  const cheekRot = box(0.13 * scale, 0.045 * scale, 0.03 * scale, mats.rotPatch);
  cheekRot.position.set(0.10 * scale, 1.40 * scale, -0.35 * scale);
  unitDecalCount += 1;
  const eyeA = cyl(0.035 * scale, 0.035 * scale, 0.02 * scale, mats.eye, 8);
  const eyeB = eyeA.clone();
  eyeA.position.set(-0.08 * scale, 1.48 * scale, -0.31 * scale);
  eyeB.position.set(0.09 * scale, 1.48 * scale, -0.31 * scale);
  const bootA = box(0.22 * scale, 0.10 * scale, 0.28 * scale, mats.boot);
  const bootB = bootA.clone();
  bootA.position.set(-0.14 * scale, 0.08 * scale, -0.07 * scale);
  bootB.position.set(0.14 * scale, 0.08 * scale, -0.07 * scale);
  const armA = box(0.12 * scale, 0.58 * scale, 0.14 * scale, mats.zombie);
  const armB = armA.clone();
  armA.position.set(-0.43 * scale, 1.02 * scale, -0.34 * scale);
  armB.position.set(0.43 * scale, 1.02 * scale, -0.34 * scale);
  armA.rotation.x = -1.08;
  armB.rotation.x = -1.08;
  const clawA = cyl(0.055 * scale, 0.055 * scale, 0.12 * scale, mats.zombie, 8);
  const clawB = clawA.clone();
  clawA.position.set(-0.48 * scale, 0.74 * scale, -0.66 * scale);
  clawB.position.set(0.48 * scale, 0.74 * scale, -0.66 * scale);
  const fingerA = box(0.04 * scale, 0.14 * scale, 0.035 * scale, mats.bone);
  const fingerB = fingerA.clone();
  const fingerC = fingerA.clone();
  const fingerD = fingerA.clone();
  fingerA.position.set(-0.54 * scale, 0.68 * scale, -0.72 * scale);
  fingerB.position.set(-0.45 * scale, 0.68 * scale, -0.73 * scale);
  fingerC.position.set(0.45 * scale, 0.68 * scale, -0.73 * scale);
  fingerD.position.set(0.54 * scale, 0.68 * scale, -0.72 * scale);
  const tornA = box(0.12 * scale, 0.42 * scale, 0.44 * scale, mats.zombieRag);
  const tornB = tornA.clone();
  const clothPatchA = box(0.15 * scale, 0.22 * scale, 0.45 * scale, mats.clothPatch);
  const clothPatchB = clothPatchA.clone();
  tornA.position.set(-0.34 * scale, 0.82 * scale, -0.06 * scale);
  tornB.position.set(0.34 * scale, 0.72 * scale, -0.04 * scale);
  tornA.rotation.z = 0.18;
  tornB.rotation.z = -0.15;
  clothPatchA.position.set(-0.22 * scale, 1.18 * scale, -0.09 * scale);
  clothPatchB.position.set(0.24 * scale, 0.96 * scale, -0.09 * scale);
  clothPatchA.rotation.z = 0.22;
  clothPatchB.rotation.z = -0.18;
  unitDecalCount += 2;
  const variantParts = [];
  if (variant === 1) {
    const crawlerSpine = box(0.18 * scale, 0.72 * scale, 0.16 * scale, mats.bone);
    crawlerSpine.position.set(0.02 * scale, 1.10 * scale, 0.15 * scale);
    crawlerSpine.rotation.x = -0.55;
    const longArmA = box(0.10 * scale, 0.76 * scale, 0.12 * scale, mats.zombie);
    const longArmB = longArmA.clone();
    longArmA.position.set(-0.52 * scale, 0.86 * scale, -0.44 * scale);
    longArmB.position.set(0.52 * scale, 0.86 * scale, -0.44 * scale);
    longArmA.rotation.x = -1.32;
    longArmB.rotation.x = -1.32;
    variantParts.push(crawlerSpine, longArmA, longArmB);
    root.userData.variantName = 'crawler';
  } else if (variant === 2) {
    const hood = cyl(0.31 * scale, 0.24 * scale, 0.28 * scale, mats.zombieRag, 5);
    hood.position.set(0, 1.52 * scale, -0.08 * scale);
    hood.rotation.y = Math.PI / 5;
    const pack = box(0.38 * scale, 0.48 * scale, 0.18 * scale, mats.road);
    pack.position.set(0.02 * scale, 1.04 * scale, 0.34 * scale);
    variantParts.push(hood, pack);
    root.userData.variantName = 'hooded';
  } else {
    const bellyRib = box(0.34 * scale, 0.06 * scale, 0.42 * scale, mats.bone);
    bellyRib.position.set(0.03 * scale, 0.97 * scale, -0.04 * scale);
    const shoulderRip = box(0.28 * scale, 0.12 * scale, 0.36 * scale, mats.zombieRag);
    shoulderRip.position.set(-0.22 * scale, 1.28 * scale, -0.03 * scale);
    shoulderRip.rotation.z = 0.35;
    variantParts.push(bellyRib, shoulderRip);
    root.userData.variantName = 'brute';
  }
  root.add(legA, legB, bootA, bootB, body, rag, wound, woundGlow, head, jaw, teeth, skullPatch, cheekRot, eyeA, eyeB, armA, armB, clawA, clawB, fingerA, fingerB, fingerC, fingerD, tornA, tornB, clothPatchA, clothPatchB, ...variantParts);
  root.position.set(x, 0, z);
  root.rotation.y = Math.PI + (Math.random() - 0.5) * 0.5;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.userData.fast = fast;
  root.userData.variant = variant;
  root.userData.maxHp = fast ? demoTuning.zombie.fastHp : demoTuning.zombie.normalHp;
  root.userData.hp = root.userData.maxHp;
  root.userData.alive = true;
  root.userData.hitPulse = 0;
  root.traverse((o) => {
    if (o.isMesh && !o.userData.contactShadow) {
      o.castShadow = true;
      o.receiveShadow = true;
      zombieDetailPartCount += 1;
    }
  });
  scene.add(root);
  return root;
}

function resetZombie(z, x, zPos) {
  z.position.set(x, 0, zPos);
  z.userData.hp = z.userData.maxHp + game.level * demoTuning.zombie.levelHpGrowth;
  z.userData.alive = true;
  z.userData.hitPulse = 0;
  z.visible = true;
}

function setCharacterGear(root, id) {
  let visibleCount = 0;
  root.traverse((part) => {
    if (part.userData && part.userData.classGear) {
      part.visible = part.userData.classGear === id;
      if (part.visible) visibleCount += 1;
    }
  });
  return visibleCount;
}

const contractMap = makeContractMap();
const contractProps = [];
let contractTileLayer = null;
if (contractMap && contractMap.structures.length) {
  contractTileLayer = paintContractTiles(contractMap);
  contractMap.structures.filter((prop) => keepPropForCombatReadability(contractMap, prop)).slice(0, 28).forEach((prop, index) => {
    contractProps.push(addContractProp(contractMap, prop, index));
  });
} else {
  makeWreck(-3.3, 2.8, -0.3);
  makeWreck(4.5, -2.6, 0.42);
  makeWall(2.0, 1.6, 2.5, 0.28);
  makeWall(4.2, 1.5, 0.28, 2.7);
  makeCrate(2.9, -0.7, 0.7);
  makeCrate(-4.3, -1.7, 0.55);
  makeCrate(4.7, 2.1, 0.62);
}

window.__V03_ENGINE_DEMO_STATE = {
  contractMapName: contractMap && contractMap.name,
  contractPropCount: contractProps.length,
  contractTileCount: contractTileLayer ? contractTileLayer.children.length : 0,
  contractQualityOk: !!(contractMap && window.KOS_MAP_CONTRACT.getQualityChecks(contractMap).every((check) => check.ok))
};

const player = makeCharacter(mats.player, mats.playerAccent, 1);
player.position.set(playerSpawn.x, 0, playerSpawn.z);
scene.add(player);

const rival = makeCharacter(mats.rival, mats.rivalAccent, 0.9);
rival.position.set(3.1, 0, -2.2);
setCharacterGear(rival, 'guardian');
scene.add(rival);

const rivalBeamMat = new THREE.MeshBasicMaterial({ color: 0xff8b3d, transparent: true, opacity: 0.65 });
const rivalBeam = box(1.4, 0.05, 0.05, rivalBeamMat);
rivalBeam.castShadow = false;
scene.add(rivalBeam);

const zombies = [];
const zombieEntries = contractMap && contractMap.zombieEntries ? contractMap.zombieEntries : [];
for (let i = 0; i < 10; i++) {
  const angle = i * 0.62;
  const radius = 4.0 + (i % 4) * 0.9;
  const source = zombieEntries.length ? zombieEntries[i % zombieEntries.length] : null;
  const p = pointNearArena(contractMap, source, angle, radius);
  const jitter = (i % 4 - 1.5) * 0.55;
  zombies.push(makeZombie(p.x + Math.cos(angle) * jitter, p.z + Math.sin(angle) * jitter, i % 5 === 0 ? 1.25 : 0.9, i % 3 === 0, i % 3));
}

const gems = [];
const rewardPoints = contractMap && contractMap.rewardPoints ? contractMap.rewardPoints : [];
for (let i = 0; i < 18; i++) {
  const gem = cyl(0.12, 0.12, 0.08, mats.xp, 4);
  gem.rotation.y = Math.PI / 4;
  const source = rewardPoints.length ? rewardPoints[i % rewardPoints.length] : null;
  const p = source
    ? contractPointToScene(contractMap, source)
    : { x: (Math.random() - 0.5) * 11, z: (Math.random() - 0.5) * 9 };
  gem.position.set(
    THREE.MathUtils.clamp(p.x + ((i % 3) - 1) * 0.28, -5.6, 5.6),
    0.15,
    THREE.MathUtils.clamp(p.z + (Math.floor(i / 3) % 3 - 1) * 0.28, -4.8, 4.8)
  );
  gem.castShadow = true;
  scene.add(gem);
  gems.push(gem);
}

window.__V03_ENGINE_DEMO_STATE.contractZombieEntryCount = zombieEntries.length;
window.__V03_ENGINE_DEMO_STATE.contractRewardPointCount = rewardPoints.length;

const avatarMark = document.getElementById('avatarMark');
const className = document.getElementById('className');
const activeClassCard = document.getElementById('activeClassCard');
const skinRow = document.getElementById('skinRow');
const classButtons = document.getElementById('classButtons');
const skillPanel = document.getElementById('skillPanel');
const hpFill = document.getElementById('hpFill');
const xpFill = document.getElementById('xpFill');
const aliveText = document.getElementById('aliveText');
const levelBadge = document.getElementById('levelBadge');
const stormBadge = document.getElementById('stormBadge');
const moveStick = document.getElementById('moveStick');
const miniMap = document.getElementById('miniMap');
const miniPlayer = document.getElementById('miniPlayer');
const miniRival = document.getElementById('miniRival');
const miniZone = document.getElementById('miniZone');
const miniZombies = Array.from(miniMap.querySelectorAll('.zombie'));
const miniLoot = Array.from(miniMap.querySelectorAll('.loot'));

function placeMiniDot(dot, x, z) {
  const px = THREE.MathUtils.clamp(((x + 6) / 12) * 100, 8, 92);
  const py = THREE.MathUtils.clamp(((z + 5.2) / 10.4) * 100, 8, 92);
  dot.style.left = `${px}%`;
  dot.style.top = `${py}%`;
}

function updateHud() {
  hpFill.style.width = `${Math.max(0, game.hp)}%`;
  xpFill.style.width = `${Math.min(100, game.xp)}%`;
  levelBadge.textContent = `LV ${game.level}`;
  aliveText.textContent = `ALIVE ${Math.max(demoTuning.progression.minAlive, 18 - Math.floor(game.kills / demoTuning.progression.aliveDropPerKills))}`;
  const zoneLeft = Math.max(0, Math.round(100 - game.kills * 3 - game.level * 2));
  stormBadge.textContent = `ZONE 01:${String(zoneLeft).padStart(2, '0')}`;
  placeMiniDot(miniPlayer, player.position.x, player.position.z);
  placeMiniDot(miniRival, rival.position.x, rival.position.z);
  livingZombies().slice(0, miniZombies.length).forEach((z, i) => placeMiniDot(miniZombies[i], z.position.x, z.position.z));
  gems.filter((gem) => gem.visible).slice(0, miniLoot.length).forEach((gem, i) => placeMiniDot(miniLoot[i], gem.position.x, gem.position.z));
  const zoneSize = `${Math.round(70 * (window.__V03_ENGINE_DEMO_STATE.safeZoneScale || 1))}%`;
  miniZone.style.width = zoneSize;
  miniZone.style.height = zoneSize;
  miniZone.style.left = `calc(50% - ${zoneSize} / 2)`;
  miniZone.style.top = `calc(50% - ${zoneSize} / 2)`;
}

function applyClass(id) {
  const def = classDefs[id] || classDefs.tech;
  activeClass = id;
  activeGearCount = setCharacterGear(player, id);
  mats.playerAccent.color.setHex(def.accent);
  mats.playerAccent.emissive.setHex(def.emissive);
  accentLight.color.setHex(def.accent);
  avatarMark.querySelector('span').textContent = def.mark;
  avatarMark.style.background = `#${def.accent.toString(16).padStart(6, '0')}`;
  className.textContent = def.name;
  activeClassCard.querySelector('strong').textContent = def.name;
  activeClassCard.querySelector('span').textContent = def.role;
  Array.from(skinRow.children).forEach((el, index) => {
    el.dataset.skin = String(index);
    el.style.background = def.skins[index] || def.skins[0];
  });
  Array.from(classButtons.querySelectorAll('button')).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.class === id);
  });
  applySkin(Math.min(activeSkin, def.skins.length - 1));
}

function applySkin(index) {
  const def = classDefs[activeClass] || classDefs.tech;
  activeSkin = Math.max(0, Math.min(index, def.skins.length - 1));
  const skinColor = def.skins[activeSkin] || `#${def.body.toString(16).padStart(6, '0')}`;
  mats.player.color.set(skinColor);
  Array.from(skinRow.children).forEach((el, i) => {
    el.classList.toggle('active', i === activeSkin);
  });
  window.__V03_ENGINE_DEMO_STATE = window.__V03_ENGINE_DEMO_STATE || {};
  window.__V03_ENGINE_DEMO_STATE.activeGearCount = activeGearCount;
  window.__V03_ENGINE_DEMO_STATE.activeGearClass = activeClass;
  window.__V03_ENGINE_DEMO_STATE.activeSkin = activeSkin;
  window.__V03_ENGINE_DEMO_STATE.activeSkinColor = skinColor;
}

function applySkill(id) {
  const def = skillDefs[id] || skillDefs.arc;
  activeSkill = id;
  tracers.forEach((tr, index) => {
    tr.mat.color.setHex(index % 3 === 0 ? def.color : (activeClass === 'guardian' ? 0xe95b45 : 0xf4c95a));
  });
  skillBursts.forEach((orb, index) => {
    orb.material = index % 2 ? mats.orange : mats.playerAccent;
  });
  Array.from(skillPanel.querySelectorAll('button')).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.skill === id);
  });
}

classButtons.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-class]');
  if (btn) {
    applyClass(btn.dataset.class);
    applySkill(activeSkill);
  }
});

skinRow.addEventListener('click', (ev) => {
  const swatch = ev.target.closest('i[data-skin]');
  if (swatch) applySkin(Number(swatch.dataset.skin));
});

skillPanel.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-skill]');
  if (btn) applySkill(btn.dataset.skill);
});

const tracers = [];
function makeTracer(i) {
  const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x4ec9ff : 0xf4c95a, transparent: true, opacity: 0.88 });
  const beam = box(1.6, 0.045, 0.045, mat);
  beam.castShadow = false;
  scene.add(beam);
  tracers.push({ beam, phase: i * 0.75, mat });
}
for (let i = 0; i < 8; i++) makeTracer(i);

const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.44, 18), mats.muzzle);
muzzleFlash.rotation.z = -Math.PI / 2;
muzzleFlash.castShadow = false;
scene.add(muzzleFlash);
const muzzleCards = [];
for (let i = 0; i < 4; i++) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.42 - i * 0.05, 0.18 - i * 0.015), (i % 2 ? mats.fxCardOrange : mats.fxCardHot).clone());
  card.visible = false;
  card.castShadow = false;
  scene.add(card);
  muzzleCards.push(card);
}

const projectileTips = [];
for (let i = 0; i < 8; i++) {
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mats.muzzle.clone());
  tip.castShadow = false;
  scene.add(tip);
  projectileTips.push(tip);
}

const fanRounds = [];
for (let i = 0; i < 7; i++) {
  const round = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.28, 4, 10), mats.spark.clone());
  round.castShadow = false;
  scene.add(round);
  fanRounds.push(round);
}
const fanTrails = [];
for (let i = 0; i < 7; i++) {
  const trail = box(0.52, 0.028, 0.028, new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.38 }));
  trail.castShadow = false;
  scene.add(trail);
  fanTrails.push(trail);
}
const fanBulletCards = [];
for (let i = 0; i < 7; i++) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), mats.fxCardHot.clone());
  card.visible = false;
  card.castShadow = false;
  scene.add(card);
  fanBulletCards.push(card);
}
const fanImpactMarks = [];
for (let i = 0; i < 7; i++) {
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 16), mats.fxCardOrange.clone());
  mark.visible = false;
  mark.rotation.x = -Math.PI / 2;
  mark.castShadow = false;
  scene.add(mark);
  fanImpactMarks.push(mark);
}

const boomRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 48), mats.orange.clone());
boomRing.rotation.x = -Math.PI / 2;
boomRing.castShadow = false;
scene.add(boomRing);
const boomCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), mats.hotCore.clone());
boomCore.castShadow = false;
scene.add(boomCore);
const boomSmoke = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.62, 36), mats.smoke.clone());
boomSmoke.rotation.x = -Math.PI / 2;
boomSmoke.castShadow = false;
scene.add(boomSmoke);
const boomSparks = [];
for (let i = 0; i < 10; i++) {
  const spark = box(0.18, 0.035, 0.035, mats.spark.clone());
  spark.castShadow = false;
  scene.add(spark);
  boomSparks.push(spark);
}
const boomDebrisCards = [];
for (let i = 0; i < 8; i++) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.08), (i % 3 === 0 ? mats.fxCardSmoke : mats.fxCardOrange).clone());
  card.visible = false;
  card.rotation.x = -Math.PI / 2;
  card.castShadow = false;
  scene.add(card);
  boomDebrisCards.push(card);
}

const arcBranches = [];
for (let i = 0; i < 4; i++) {
  const branch = box(1, 0.035, 0.035, new THREE.MeshBasicMaterial({ color: 0x62e5ff, transparent: true, opacity: 0.65 }));
  branch.castShadow = false;
  scene.add(branch);
  arcBranches.push(branch);
}
const arcGlowNodes = [];
for (let i = 0; i < 4; i++) {
  const glow = box(1, 0.07, 0.07, mats.arcGlow.clone());
  glow.castShadow = false;
  scene.add(glow);
  arcGlowNodes.push(glow);
}
const arcNodeCards = [];
for (let i = 0; i < 5; i++) {
  const node = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.14, 18), mats.fxCardBlue.clone());
  node.visible = false;
  node.rotation.x = -Math.PI / 2;
  node.castShadow = false;
  scene.add(node);
  arcNodeCards.push(node);
}

const skillBursts = [];
for (let i = 0; i < 18; i++) {
  const orb = cyl(0.08, 0.08, 0.08, i % 2 ? mats.orange : mats.playerAccent, 12);
  orb.position.set(0, -20, 0);
  scene.add(orb);
  skillBursts.push(orb);
}

const impactSparks = [];
for (let i = 0; i < 28; i++) {
  const spark = box(0.16, 0.035, 0.035, mats.hitFlash.clone());
  spark.visible = false;
  spark.castShadow = false;
  spark.userData.life = 0;
  spark.userData.maxLife = 0.72;
  spark.userData.speed = 1;
  spark.userData.angle = 0;
  scene.add(spark);
  impactSparks.push(spark);
}
const impactCards = [];
for (let i = 0; i < 14; i++) {
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), mats.fxCardHot.clone());
  card.visible = false;
  card.castShadow = false;
  card.userData.life = 0;
  card.userData.maxLife = 0.38;
  card.userData.angle = 0;
  scene.add(card);
  impactCards.push(card);
}

applyClass(activeClass);
applySkill(activeSkill);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const viewH = aspect < 0.65 ? 12.6 : 10.4;
  camera.left = -viewH * aspect * 0.5;
  camera.right = viewH * aspect * 0.5;
  camera.top = viewH * 0.5;
  camera.bottom = -viewH * 0.5;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function setInputFromPointer(ev) {
  const dx = ev.clientX - game.input.startX;
  const dy = ev.clientY - game.input.startY;
  const len = Math.hypot(dx, dy);
  const max = 38;
  const k = len > max ? max / len : 1;
  game.input.x = (dx * k) / max;
  game.input.y = (dy * k) / max;
  moveStick.style.setProperty('--stick-x', `${dx * k}px`);
  moveStick.style.setProperty('--stick-y', `${dy * k}px`);
}

canvas.addEventListener('pointerdown', (ev) => {
  game.input.active = true;
  game.input.id = ev.pointerId;
  game.input.startX = ev.clientX;
  game.input.startY = ev.clientY;
  canvas.setPointerCapture(ev.pointerId);
  setInputFromPointer(ev);
});

canvas.addEventListener('pointermove', (ev) => {
  if (game.input.active && ev.pointerId === game.input.id) setInputFromPointer(ev);
});

function releaseInput(ev) {
  if (ev.pointerId !== game.input.id) return;
  game.input.active = false;
  game.input.id = null;
  game.input.x = 0;
  game.input.y = 0;
  moveStick.style.setProperty('--stick-x', '0px');
  moveStick.style.setProperty('--stick-y', '0px');
}

canvas.addEventListener('pointerup', releaseInput);
canvas.addEventListener('pointercancel', releaseInput);

function livingZombies() {
  return zombies.filter((z) => z.userData.alive);
}

function nearestZombies(range) {
  return livingZombies()
    .map((z) => ({
      z,
      d: Math.hypot(z.position.x - player.position.x, z.position.z - player.position.z)
    }))
    .filter((item) => item.d <= range)
    .sort((a, b) => a.d - b.d);
}

function dropXpAt(x, z) {
  const gem = gems.find((g) => !g.visible) || gems[game.kills % gems.length];
  gem.visible = true;
  gem.position.set(x, 0.18, z);
}

function spawnImpactAt(z, targetIndex) {
  z.userData.hitPulse = 0.46;
  const skill = skillDefs[activeSkill] || skillDefs.arc;
  const sparkCount = activeSkill === 'boom' ? 7 : activeSkill === 'fan' ? 4 : 5;
  const card = impactCards.find((item) => !item.visible) || impactCards[(game.shotsFired + targetIndex) % impactCards.length];
  card.visible = true;
  card.userData.life = card.userData.maxLife;
  card.userData.angle = targetIndex * 0.7 + Math.PI * 0.25;
  card.position.set(z.position.x, 0.98, z.position.z - 0.08);
  card.rotation.set(-Math.PI / 2, 0, card.userData.angle);
  card.scale.setScalar(activeSkill === 'boom' ? 1.55 : activeSkill === 'arc' ? 1.18 : 1);
  card.material.color.setHex(activeSkill === 'arc' ? 0xbdf7ff : skill.color);
  card.material.opacity = 0.72;
  for (let i = 0; i < sparkCount; i++) {
    const spark = impactSparks.find((item) => !item.visible) || impactSparks[(game.shotsFired + targetIndex + i) % impactSparks.length];
    const angle = (i / sparkCount) * Math.PI * 2 + targetIndex * 0.7;
    spark.visible = true;
    spark.userData.life = spark.userData.maxLife;
    spark.userData.angle = angle;
    spark.userData.speed = activeSkill === 'boom' ? 2.6 : 1.5 + i * 0.16;
    spark.position.set(z.position.x + Math.cos(angle) * 0.18, 0.88 + (i % 3) * 0.08, z.position.z + Math.sin(angle) * 0.18);
    spark.rotation.y = -angle;
    spark.scale.setScalar(activeSkill === 'boom' ? 1.35 : 1);
    spark.material.color.setHex(activeSkill === 'arc' ? 0xbdf7ff : skill.color);
    spark.material.opacity = 0.88;
  }
}

function defeatZombie(z) {
  z.userData.alive = false;
  z.visible = false;
  game.kills += 1;
  game.xpDropped += 1;
  game.lastKillAt = performance.now() * 0.001;
  game.xp += demoTuning.progression.killXp;
  dropXpAt(z.position.x, z.position.z);
  if (game.xp >= 100) {
    game.xp -= 100;
    game.level += 1;
    game.hp = Math.min(demoTuning.player.hp, game.hp + demoTuning.progression.levelHealOnKill);
  }
  const angle = Math.random() * Math.PI * 2;
  resetZombie(z, Math.cos(angle) * demoTuning.zombie.respawnRadiusX, Math.sin(angle) * demoTuning.zombie.respawnRadiusZ);
}

function fireWeapon(dt) {
  game.fireTimer -= dt;
  if (game.fireTimer > 0) return;
  const skill = skillDefs[activeSkill] || skillDefs.arc;
  const targets = nearestZombies(skill.range).slice(0, skill.targets);
  if (!targets.length) return;
  game.fireTimer = activeClass === 'ranger' ? demoTuning.player.rangerFireCooldown : demoTuning.player.defaultFireCooldown;
  game.shotsFired += 1;
  targets.forEach(({ z }, index) => {
    const splash = activeSkill === 'boom' && index === 0 ? 1.35 : 1;
    const damage = (skill.damage + game.level * 1.1) * splash;
    z.userData.hp -= damage;
    game.damageDealt += damage;
    spawnImpactAt(z, index);
    if (z.userData.hp <= 0) defeatZombie(z);
  });
}

function collectXp() {
  gems.forEach((g) => {
    if (!g.visible) return;
    const dx = player.position.x - g.position.x;
    const dz = player.position.z - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.25) {
      g.position.x += dx * 0.08;
      g.position.z += dz * 0.08;
    }
    if (d < 0.34) {
      g.visible = false;
      game.xp += demoTuning.progression.pickupXp;
      if (game.xp >= 100) {
        game.xp -= 100;
        game.level += 1;
        game.hp = Math.min(demoTuning.player.hp, game.hp + demoTuning.progression.levelHealOnPickup);
      }
    }
  });
}

let lastNow = 0;
function animate(now) {
  const t = now * 0.001;
  const dt = Math.min(0.05, lastNow ? (now - lastNow) * 0.001 : 0.016);
  lastNow = now;
  const speed = (classDefs[activeClass] || classDefs.tech).moveSpeed;
  player.position.x = THREE.MathUtils.clamp(player.position.x + game.input.x * speed * dt, -5.6, 5.6);
  player.position.z = THREE.MathUtils.clamp(player.position.z + game.input.y * speed * dt, -4.9, 4.9);
  player.rotation.y = game.input.active ? Math.atan2(game.input.x, game.input.y) : Math.sin(t * 0.9) * 0.18;
  player.position.y = Math.sin(t * 5) * 0.025;
  accentLight.position.x = player.position.x;
  accentLight.position.z = player.position.z + 0.4;
  const zoneScale = 1 - Math.min(0.24, t * 0.006 + game.kills * 0.002);
  safeZone.scale.set(zoneScale * 1.08, zoneScale * 0.92, 1);
  safeZone.rotation.z += dt * 0.08;
  safeZoneMat.opacity = 0.14 + Math.abs(Math.sin(t * 1.4)) * 0.06;
  rival.position.x = 3.1 + Math.sin(t * 0.42) * 0.55;
  rival.position.z = -2.2 + Math.cos(t * 0.35) * 0.45;
  rival.position.y = Math.sin(t * 4.5) * 0.018;
  rival.rotation.y = Math.atan2(player.position.x - rival.position.x, player.position.z - rival.position.z);
  rivalBeam.position.set((rival.position.x + player.position.x) * 0.5, 0.94, (rival.position.z + player.position.z) * 0.5);
  rivalBeam.scale.x = Math.hypot(player.position.x - rival.position.x, player.position.z - rival.position.z) / 1.4;
  rivalBeam.rotation.y = Math.atan2(rival.position.x - player.position.x, rival.position.z - player.position.z) + Math.PI / 2;
  rivalBeamMat.opacity = 0.18 + Math.abs(Math.sin(t * 3.2)) * 0.35;
  fireWeapon(dt);
  collectXp();

  zombies.forEach((z, i) => {
    if (!z.userData.alive) return;
    const dx = player.position.x - z.position.x;
    const dz = player.position.z - z.position.z;
    const dist = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    z.rotation.y = ang;
    z.position.x += Math.sin(ang) * (z.userData.fast ? demoTuning.zombie.fastSpeed : demoTuning.zombie.normalSpeed) * dt;
    z.position.z += Math.cos(ang) * (z.userData.fast ? demoTuning.zombie.fastSpeed : demoTuning.zombie.normalSpeed) * dt;
    z.position.y = Math.abs(Math.sin(t * (z.userData.fast ? 9 : 4) + z.userData.phase)) * 0.045;
    z.userData.hitPulse = Math.max(0, (z.userData.hitPulse || 0) - dt);
    const hitScale = z.userData.hitPulse > 0 ? 0.18 * (z.userData.hitPulse / 0.46) : 0;
    z.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.025 + hitScale);
    if (dist < 0.75 && game.hitTimer <= 0) {
      game.hp = Math.max(0, game.hp - (classDefs[activeClass] || classDefs.tech).contactDamage);
      game.hitTimer = demoTuning.player.hitCooldown;
    }
  });
  game.hitTimer = Math.max(0, game.hitTimer - dt);

  gems.forEach((g, i) => {
    g.rotation.y += 0.035;
    g.position.y = 0.18 + Math.sin(t * 3 + i) * 0.045;
  });

  tracers.forEach((tr, i) => {
    const skill = skillDefs[activeSkill] || skillDefs.arc;
    const targets = nearestZombies(skill.range);
    const target = targets[i % Math.max(1, Math.min(targets.length, skill.targets))]?.z;
    if (!target) {
      tr.beam.visible = false;
      if (projectileTips[i]) projectileTips[i].visible = false;
      return;
    }
    tr.beam.visible = i < skill.targets + 3;
    const px = player.position.x + 0.6;
    const pz = player.position.z - 0.35;
    const tx = target.position.x;
    const tz = target.position.z;
    const spread = (i - 3.5) * 0.08 * skill.spread;
    tr.beam.position.set((px + tx) * 0.5 + spread, 0.78, (pz + tz) * 0.5 - spread);
    const dist = Math.hypot(tx - px, tz - pz);
    tr.beam.scale.x = dist / 1.6;
    tr.beam.rotation.y = Math.atan2(px - tx, pz - tz) + Math.PI / 2;
    tr.mat.opacity = 0.22 + Math.abs(Math.sin(t * skill.pulse + tr.phase)) * 0.62;
    if (projectileTips[i]) {
      projectileTips[i].visible = tr.beam.visible;
      projectileTips[i].position.set(tx, 0.82 + Math.sin(t * 18 + i) * 0.04, tz);
      projectileTips[i].scale.setScalar(activeSkill === 'boom' ? 1.8 : 1 + Math.sin(t * 12 + i) * 0.18);
      projectileTips[i].material.color.setHex(skill.color);
      projectileTips[i].material.opacity = tr.mat.opacity;
    }
  });

  const muzzlePulse = 0.45 + Math.abs(Math.sin(t * 18)) * 0.8;
  muzzleFlash.position.set(player.position.x + 0.82, 1.12, player.position.z - 0.48);
  muzzleFlash.scale.setScalar(muzzlePulse);
  muzzleFlash.material.opacity = nearestZombies((skillDefs[activeSkill] || skillDefs.arc).range).length ? 0.34 + muzzlePulse * 0.34 : 0;
  muzzleFlash.rotation.y = player.rotation.y - Math.PI / 2;
  muzzleCards.forEach((card, i) => {
    card.visible = muzzleFlash.material.opacity > 0.38;
    const spread = (i - 1.5) * 0.08;
    card.position.set(player.position.x + 0.96 + spread, 1.12 + (i % 2) * 0.04, player.position.z - 0.50 - spread);
    card.rotation.set(-Math.PI / 2, 0, player.rotation.y + i * 0.32);
    card.scale.setScalar(0.88 + Math.abs(Math.sin(t * 18 + i)) * 0.45);
    card.material.opacity = card.visible ? 0.30 + Math.abs(Math.sin(t * 20 + i)) * 0.48 : 0;
  });

  const fanAngle = player.rotation.y || 0;
  fanRounds.forEach((round, i) => {
    const spread = (i - 3) * 0.22;
    const travel = 1.25 + ((t * 4.8 + i * 0.17) % 1.9);
    const a = fanAngle + spread;
    round.visible = activeSkill === 'fan';
    round.position.set(
      player.position.x + Math.sin(a) * travel,
      0.86,
      player.position.z + Math.cos(a) * travel
    );
    round.rotation.y = -a;
    round.material.opacity = 0.42 + Math.sin(t * 9 + i) * 0.16;
    if (fanBulletCards[i]) {
      fanBulletCards[i].visible = round.visible;
      fanBulletCards[i].position.set(round.position.x, 0.88, round.position.z);
      fanBulletCards[i].rotation.set(-Math.PI / 2, 0, -a + Math.PI / 2);
      fanBulletCards[i].scale.setScalar(0.82 + Math.abs(Math.sin(t * 10 + i)) * 0.22);
      fanBulletCards[i].material.opacity = 0.34 + Math.abs(Math.sin(t * 12 + i)) * 0.42;
    }
    if (fanTrails[i]) {
      fanTrails[i].visible = round.visible;
      fanTrails[i].position.set(
        player.position.x + Math.sin(a) * (travel - 0.28),
        0.84,
        player.position.z + Math.cos(a) * (travel - 0.28)
      );
      fanTrails[i].rotation.y = -a + Math.PI / 2;
      fanTrails[i].material.opacity = 0.22 + Math.sin(t * 7 + i) * 0.10;
    }
    if (fanImpactMarks[i]) {
      const targets = nearestZombies((skillDefs.fan || skillDefs.arc).range);
      const target = targets[i % Math.max(1, Math.min(targets.length, skillDefs.fan.targets))]?.z;
      fanImpactMarks[i].visible = activeSkill === 'fan' && !!target;
      if (target) {
        fanImpactMarks[i].position.set(target.position.x, 0.12, target.position.z);
        fanImpactMarks[i].scale.setScalar(0.7 + Math.abs(Math.sin(t * 9 + i)) * 0.5);
        fanImpactMarks[i].material.opacity = 0.24 + Math.abs(Math.sin(t * 11 + i)) * 0.42;
      }
    }
  });

  const nearest = nearestZombies((skillDefs[activeSkill] || skillDefs.arc).range);
  const boomTarget = nearest[0] && nearest[0].z;
  boomRing.visible = activeSkill === 'boom' && !!boomTarget;
  boomCore.visible = boomRing.visible;
  boomSmoke.visible = boomRing.visible;
  if (boomTarget) {
    const pulse = 1.3 + Math.abs(Math.sin(t * 5.6)) * 1.15;
    boomRing.position.set(boomTarget.position.x, 0.075, boomTarget.position.z);
    boomRing.scale.set(pulse, pulse, 1);
    boomRing.material.opacity = activeSkill === 'boom' ? 0.28 + Math.abs(Math.sin(t * 7)) * 0.35 : 0;
    boomCore.position.set(boomTarget.position.x, 0.44, boomTarget.position.z);
    boomCore.scale.setScalar(activeSkill === 'boom' ? 0.75 + Math.abs(Math.sin(t * 8)) * 0.55 : 0.01);
    boomCore.material.opacity = activeSkill === 'boom' ? 0.36 + Math.abs(Math.sin(t * 9)) * 0.45 : 0;
    boomSmoke.position.set(boomTarget.position.x, 0.06, boomTarget.position.z);
    boomSmoke.scale.set(pulse * 1.18, pulse * 0.9, 1);
    boomSmoke.material.opacity = activeSkill === 'boom' ? 0.16 + Math.abs(Math.sin(t * 4)) * 0.16 : 0;
  }
  boomSparks.forEach((spark, i) => {
    spark.visible = activeSkill === 'boom' && !!boomTarget;
    if (!boomTarget) return;
    const a = i * Math.PI * 0.2 + t * 1.8;
    const r = 0.45 + (i % 4) * 0.18;
    spark.position.set(boomTarget.position.x + Math.cos(a) * r, 0.42 + (i % 3) * 0.07, boomTarget.position.z + Math.sin(a) * r);
    spark.rotation.y = -a;
    spark.material.opacity = 0.28 + Math.abs(Math.sin(t * 10 + i)) * 0.45;
  });
  boomDebrisCards.forEach((card, i) => {
    card.visible = activeSkill === 'boom' && !!boomTarget;
    if (!boomTarget) return;
    const a = i * Math.PI * 0.25 - t * 0.8;
    const r = 0.36 + (i % 4) * 0.22;
    card.position.set(boomTarget.position.x + Math.cos(a) * r, 0.09, boomTarget.position.z + Math.sin(a) * r);
    card.rotation.z = a;
    card.scale.setScalar(0.75 + Math.abs(Math.sin(t * 4 + i)) * 0.65);
    card.material.opacity = i % 3 === 0 ? 0.16 + Math.abs(Math.sin(t * 3 + i)) * 0.16 : 0.32 + Math.abs(Math.sin(t * 8 + i)) * 0.36;
  });

  arcBranches.forEach((branch, i) => {
    const a = nearest[i] && nearest[i].z;
    const b = nearest[i + 1] && nearest[i + 1].z;
    branch.visible = activeSkill === 'arc' && !!a && !!b;
    if (arcGlowNodes[i]) arcGlowNodes[i].visible = branch.visible;
    if (!a || !b) return;
    const mx = (a.position.x + b.position.x) * 0.5;
    const mz = (a.position.z + b.position.z) * 0.5;
    const dist = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
    const jitter = Math.sin(t * 18 + i) * 0.10;
    branch.position.set(mx + jitter, 0.96 + Math.sin(t * 14 + i) * 0.05, mz - jitter);
    branch.scale.x = dist;
    branch.rotation.y = Math.atan2(a.position.x - b.position.x, a.position.z - b.position.z) + Math.PI / 2;
    branch.material.opacity = 0.38 + Math.abs(Math.sin(t * 12 + i)) * 0.58;
    if (arcGlowNodes[i]) {
      arcGlowNodes[i].position.copy(branch.position);
      arcGlowNodes[i].scale.x = dist;
      arcGlowNodes[i].rotation.y = branch.rotation.y;
      arcGlowNodes[i].material.opacity = 0.18 + Math.abs(Math.sin(t * 11 + i)) * 0.34;
    }
  });
  arcNodeCards.forEach((node, i) => {
    const target = nearest[i] && nearest[i].z;
    node.visible = activeSkill === 'arc' && !!target;
    if (!target) return;
    node.position.set(target.position.x, 0.10, target.position.z);
    node.scale.setScalar(0.9 + Math.abs(Math.sin(t * 8 + i)) * 0.42);
    node.material.opacity = 0.24 + Math.abs(Math.sin(t * 10 + i)) * 0.44;
  });

  skillBursts.forEach((orb, i) => {
    const skill = skillDefs[activeSkill] || skillDefs.arc;
    const a = t * (activeSkill === 'boom' ? 1.3 : 2.2) + i * 0.52;
    const r = (activeSkill === 'fan' ? 1.15 : 1.5) + (i % 6) * 0.18 * skill.spread;
    orb.position.set(player.position.x + Math.cos(a) * r, 0.22 + (i % 3) * 0.10, player.position.z + Math.sin(a) * r);
    orb.scale.setScalar(activeSkill === 'boom' ? 1.35 + Math.sin(t * 5 + i) * 0.22 : 1);
    orb.rotation.y += 0.05;
  });

  impactSparks.forEach((spark) => {
    if (!spark.visible) return;
    spark.userData.life -= dt;
    if (spark.userData.life <= 0) {
      spark.visible = false;
      return;
    }
    const fade = spark.userData.life / spark.userData.maxLife;
    spark.position.x += Math.cos(spark.userData.angle) * spark.userData.speed * dt;
    spark.position.z += Math.sin(spark.userData.angle) * spark.userData.speed * dt;
    spark.position.y += 0.35 * dt;
    spark.scale.setScalar(0.65 + fade * 0.9);
    spark.material.opacity = fade * 0.88;
  });
  impactCards.forEach((card) => {
    if (!card.visible) return;
    card.userData.life -= dt;
    if (card.userData.life <= 0) {
      card.visible = false;
      return;
    }
    const fade = card.userData.life / card.userData.maxLife;
    card.position.y += 0.12 * dt;
    card.rotation.z += 1.8 * dt;
    card.scale.setScalar(0.68 + fade * 0.72);
    card.material.opacity = fade * 0.72;
  });

  updateHud();
  window.__V03_ENGINE_DEMO_STATE.hp = Math.round(game.hp);
  window.__V03_ENGINE_DEMO_STATE.xp = Math.round(game.xp);
  window.__V03_ENGINE_DEMO_STATE.level = game.level;
  window.__V03_ENGINE_DEMO_STATE.kills = game.kills;
  window.__V03_ENGINE_DEMO_STATE.shotsFired = game.shotsFired;
  window.__V03_ENGINE_DEMO_STATE.damageDealt = Math.round(game.damageDealt);
  window.__V03_ENGINE_DEMO_STATE.xpDropped = game.xpDropped;
  window.__V03_ENGINE_DEMO_STATE.livingZombieCount = livingZombies().length;
  window.__V03_ENGINE_DEMO_STATE.visibleGemCount = gems.filter((gem) => gem.visible).length;
  window.__V03_ENGINE_DEMO_STATE.silhouettePartCount = silhouettePartCount;
  window.__V03_ENGINE_DEMO_STATE.zombieDetailPartCount = zombieDetailPartCount;
  window.__V03_ENGINE_DEMO_STATE.zombieVariantCount = new Set(zombies.map((z) => z.userData.variantName)).size;
  window.__V03_ENGINE_DEMO_STATE.unitDecalCount = unitDecalCount;
  window.__V03_ENGINE_DEMO_STATE.fxTipCount = projectileTips.filter((tip) => tip.visible).length;
  window.__V03_ENGINE_DEMO_STATE.groundDetailCount = groundDetailCount;
  window.__V03_ENGINE_DEMO_STATE.fanRoundCount = fanRounds.filter((round) => round.visible).length;
  window.__V03_ENGINE_DEMO_STATE.fanTrailCount = fanTrails.filter((trail) => trail.visible).length;
  window.__V03_ENGINE_DEMO_STATE.boomRingReady = boomRing.visible || activeSkill !== 'boom';
  window.__V03_ENGINE_DEMO_STATE.boomSparkCount = boomSparks.filter((spark) => spark.visible).length;
  window.__V03_ENGINE_DEMO_STATE.arcBranchCount = arcBranches.filter((branch) => branch.visible).length;
  window.__V03_ENGINE_DEMO_STATE.arcGlowCount = arcGlowNodes.filter((glow) => glow.visible).length;
  window.__V03_ENGINE_DEMO_STATE.impactSparkCount = impactSparks.filter((spark) => spark.visible).length;
  window.__V03_ENGINE_DEMO_STATE.fanBulletCardCount = fanBulletCards.filter((card) => card.visible).length;
  window.__V03_ENGINE_DEMO_STATE.fanImpactMarkCount = fanImpactMarks.filter((mark) => mark.visible).length;
  window.__V03_ENGINE_DEMO_STATE.fxCardCount = muzzleCards.filter((card) => card.visible).length + impactCards.filter((card) => card.visible).length + boomDebrisCards.filter((card) => card.visible).length + arcNodeCards.filter((node) => node.visible).length + fanBulletCards.filter((card) => card.visible).length + fanImpactMarks.filter((mark) => mark.visible).length;
  window.__V03_ENGINE_DEMO_STATE.hitPulseCount = livingZombies().filter((z) => z.userData.hitPulse > 0).length;
  window.__V03_ENGINE_DEMO_STATE.hasMiniMap = !!miniMap;
  window.__V03_ENGINE_DEMO_STATE.miniMapZombieDots = miniZombies.length;
  window.__V03_ENGINE_DEMO_STATE.iconSkillButtons = Array.from(skillPanel.querySelectorAll('.skill i')).length;
  window.__V03_ENGINE_DEMO_STATE.lastKillAgo = game.lastKillAt ? Number((t - game.lastKillAt).toFixed(2)) : null;
  window.__V03_ENGINE_DEMO_STATE.rivalVisible = rival.visible;
  window.__V03_ENGINE_DEMO_STATE.safeZoneScale = Number(zoneScale.toFixed(3));

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
