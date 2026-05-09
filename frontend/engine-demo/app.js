import * as THREE from '/node_modules/three/build/three.module.js';

const canvas = document.getElementById('engineCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

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
  skin: new THREE.MeshStandardMaterial({ color: 0xd2a164, roughness: 0.72 }),
  zombie: new THREE.MeshStandardMaterial({ color: 0x83936f, roughness: 0.88 }),
  zombieCloth: new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 0.9 }),
  eye: new THREE.MeshStandardMaterial({ color: 0xff5a3d, emissive: 0xff2510, emissiveIntensity: 1.8 }),
  xp: new THREE.MeshStandardMaterial({ color: 0x7cff4f, emissive: 0x37ff20, emissiveIntensity: 1.5 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xf4c95a, emissive: 0x6f4c05, emissiveIntensity: 0.45 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff8b3d, emissive: 0x7a2600, emissiveIntensity: 0.8 })
};

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

const ground = new THREE.Mesh(new THREE.PlaneGeometry(42, 42, 1, 1), mats.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

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
  const wall = box(w, 1.35, d, mats.wall);
  wall.position.set(x, 0.68, z);
  scene.add(wall);
  wall.castShadow = wall.receiveShadow = true;
}

function makeCharacter(colorMat, accentMat, scale = 1) {
  const root = new THREE.Group();
  const legs = [
    box(0.18 * scale, 0.65 * scale, 0.20 * scale, mats.road),
    box(0.18 * scale, 0.65 * scale, 0.20 * scale, mats.road)
  ];
  legs[0].position.set(-0.17 * scale, 0.36 * scale, 0);
  legs[1].position.set(0.17 * scale, 0.36 * scale, 0);
  root.add(legs[0], legs[1]);

  const body = box(0.78 * scale, 1.05 * scale, 0.45 * scale, colorMat);
  body.position.y = 1.05 * scale;
  root.add(body);
  const stripe = box(0.12 * scale, 0.92 * scale, 0.49 * scale, accentMat);
  stripe.position.y = 1.08 * scale;
  stripe.position.z = -0.01 * scale;
  root.add(stripe);

  const head = cyl(0.24 * scale, 0.24 * scale, 0.34 * scale, mats.skin, 24);
  head.position.y = 1.82 * scale;
  root.add(head);
  const visor = box(0.44 * scale, 0.09 * scale, 0.50 * scale, accentMat);
  visor.position.y = 1.90 * scale;
  root.add(visor);

  const gun = box(0.96 * scale, 0.12 * scale, 0.16 * scale, mats.road);
  gun.position.set(0.52 * scale, 1.12 * scale, -0.28 * scale);
  gun.rotation.y = -0.24;
  root.add(gun);
  const muzzle = cyl(0.08 * scale, 0.08 * scale, 0.16 * scale, accentMat);
  muzzle.position.set(1.05 * scale, 1.12 * scale, -0.42 * scale);
  muzzle.rotation.z = Math.PI / 2;
  root.add(muzzle);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return root;
}

function makeZombie(x, z, scale = 1, fast = false) {
  const root = new THREE.Group();
  const legA = box(0.16 * scale, 0.58 * scale, 0.18 * scale, mats.road);
  const legB = box(0.16 * scale, 0.58 * scale, 0.18 * scale, mats.road);
  legA.position.set(-0.14 * scale, 0.30 * scale, 0);
  legB.position.set(0.14 * scale, 0.30 * scale, 0);
  const body = box((fast ? 0.48 : 0.62) * scale, 0.82 * scale, 0.38 * scale, mats.zombieCloth);
  body.position.y = 0.92 * scale;
  const head = cyl(0.22 * scale, 0.23 * scale, 0.28 * scale, mats.zombie, 18);
  head.position.y = 1.50 * scale;
  const eyeA = cyl(0.035 * scale, 0.035 * scale, 0.02 * scale, mats.eye, 8);
  const eyeB = eyeA.clone();
  eyeA.position.set(-0.07 * scale, 1.54 * scale, -0.21 * scale);
  eyeB.position.set(0.08 * scale, 1.54 * scale, -0.21 * scale);
  const armA = box(0.12 * scale, 0.58 * scale, 0.14 * scale, mats.zombie);
  const armB = armA.clone();
  armA.position.set(-0.42 * scale, 0.98 * scale, -0.18 * scale);
  armB.position.set(0.42 * scale, 0.98 * scale, -0.18 * scale);
  armA.rotation.x = -0.72;
  armB.rotation.x = -0.72;
  root.add(legA, legB, body, head, eyeA, eyeB, armA, armB);
  root.position.set(x, 0, z);
  root.rotation.y = Math.PI + (Math.random() - 0.5) * 0.5;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.userData.fast = fast;
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(root);
  return root;
}

makeWreck(-3.3, 2.8, -0.3);
makeWreck(4.5, -2.6, 0.42);
makeWall(2.0, 1.6, 2.5, 0.28);
makeWall(4.2, 1.5, 0.28, 2.7);
makeCrate(2.9, -0.7, 0.7);
makeCrate(-4.3, -1.7, 0.55);
makeCrate(4.7, 2.1, 0.62);

const player = makeCharacter(mats.player, mats.playerAccent, 1);
player.position.set(-0.8, 0, 0.7);
scene.add(player);

const zombies = [];
for (let i = 0; i < 13; i++) {
  const angle = i * 0.62;
  const radius = 4.0 + (i % 4) * 0.9;
  zombies.push(makeZombie(Math.cos(angle) * radius + 0.8, Math.sin(angle) * radius - 0.1, i % 5 === 0 ? 1.25 : 0.9, i % 3 === 0));
}

const gems = [];
for (let i = 0; i < 18; i++) {
  const gem = cyl(0.12, 0.12, 0.08, mats.xp, 4);
  gem.rotation.y = Math.PI / 4;
  gem.position.set((Math.random() - 0.5) * 11, 0.15, (Math.random() - 0.5) * 9);
  gem.castShadow = true;
  scene.add(gem);
  gems.push(gem);
}

const tracers = [];
function makeTracer(i) {
  const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x4ec9ff : 0xf4c95a, transparent: true, opacity: 0.88 });
  const beam = box(1.6, 0.045, 0.045, mat);
  beam.castShadow = false;
  scene.add(beam);
  tracers.push({ beam, phase: i * 0.75, mat });
}
for (let i = 0; i < 8; i++) makeTracer(i);

const skillBursts = [];
for (let i = 0; i < 18; i++) {
  const orb = cyl(0.08, 0.08, 0.08, i % 2 ? mats.orange : mats.playerAccent, 12);
  orb.position.set(0, -20, 0);
  scene.add(orb);
  skillBursts.push(orb);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const viewH = 10.4;
  camera.left = -viewH * aspect * 0.5;
  camera.right = viewH * aspect * 0.5;
  camera.top = viewH * 0.5;
  camera.bottom = -viewH * 0.5;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let pointerX = 0;
let pointerZ = 0;
canvas.addEventListener('pointermove', (ev) => {
  pointerX = (ev.clientX / window.innerWidth - 0.5) * 2;
  pointerZ = (ev.clientY / window.innerHeight - 0.5) * 2;
});

function animate(now) {
  const t = now * 0.001;
  player.position.x = -0.8 + Math.sin(t * 0.7) * 0.28 + pointerX * 0.12;
  player.position.z = 0.7 + Math.cos(t * 0.6) * 0.18 + pointerZ * 0.12;
  player.rotation.y = Math.sin(t * 0.9) * 0.18;
  player.position.y = Math.sin(t * 5) * 0.025;
  accentLight.position.x = player.position.x;
  accentLight.position.z = player.position.z + 0.4;

  zombies.forEach((z, i) => {
    const dx = player.position.x - z.position.x;
    const dz = player.position.z - z.position.z;
    const ang = Math.atan2(dx, dz);
    z.rotation.y = ang;
    z.position.x += Math.sin(ang) * (z.userData.fast ? 0.006 : 0.003);
    z.position.z += Math.cos(ang) * (z.userData.fast ? 0.006 : 0.003);
    z.position.y = Math.abs(Math.sin(t * (z.userData.fast ? 9 : 4) + z.userData.phase)) * 0.045;
    z.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.025);
  });

  gems.forEach((g, i) => {
    g.rotation.y += 0.035;
    g.position.y = 0.18 + Math.sin(t * 3 + i) * 0.045;
  });

  tracers.forEach((tr, i) => {
    const target = zombies[(i + Math.floor(t * 2)) % zombies.length];
    const px = player.position.x + 0.6;
    const pz = player.position.z - 0.35;
    const tx = target.position.x;
    const tz = target.position.z;
    tr.beam.position.set((px + tx) * 0.5, 0.78, (pz + tz) * 0.5);
    const dist = Math.hypot(tx - px, tz - pz);
    tr.beam.scale.x = dist / 1.6;
    tr.beam.rotation.y = Math.atan2(px - tx, pz - tz) + Math.PI / 2;
    tr.mat.opacity = 0.28 + Math.abs(Math.sin(t * 4 + tr.phase)) * 0.55;
  });

  skillBursts.forEach((orb, i) => {
    const a = t * 2.2 + i * 0.52;
    const r = 1.5 + (i % 6) * 0.18;
    orb.position.set(player.position.x + Math.cos(a) * r, 0.22 + (i % 3) * 0.10, player.position.z + Math.sin(a) * r);
    orb.rotation.y += 0.05;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
