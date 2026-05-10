import * as THREE from '/node_modules/three/build/three.module.js';

const canvas = document.getElementById('proofCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171f18);
scene.fog = new THREE.Fog(0x171f18, 8, 19);

const camera = new THREE.OrthographicCamera(-4, 4, 7, -7, 0.1, 80);
camera.position.set(5.8, 9.6, 7.2);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();
const loader = new THREE.TextureLoader();
const assets = {
  hero: '/frontend/engine-demo/assets/units/hero-ranger-2-isometric.png',
  brute: '/frontend/engine-demo/assets/zombies/zombie-card-brute.png',
  crawler: '/frontend/engine-demo/assets/zombies/zombie-card-crawler.png',
  hooded: '/frontend/engine-demo/assets/zombies/zombie-card-hooded.png',
  wreck: '/frontend/engine-demo/assets/props/prop-cover-wreck.png',
  wall: '/frontend/engine-demo/assets/props/prop-cover-wall.png',
  crate: '/frontend/engine-demo/assets/props/prop-cover-crate.png',
  debris: '/frontend/engine-demo/assets/props/prop-cover-debris.png',
  fan: '/frontend/engine-demo/assets/skills/skill-card-fan.png',
  boom: '/frontend/engine-demo/assets/skills/skill-card-boom.png'
};

let billboardSpriteCount = 0;
let spriteAssetCount = 0;
let groundSplatCount = 0;
let stormLayerCount = 0;
let propDepthLayerCount = 0;
let skillFxLayerCount = 0;

function makeCanvasTexture(draw) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  draw(ctx, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function groundTexture() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#3b4330';
    ctx.fillRect(0, 0, w, h);
    const patches = ['#596042', '#252b24', '#776137', '#5c6d72', '#80583d'];
    for (let i = 0; i < 180; i += 1) {
      ctx.globalAlpha = 0.16 + Math.random() * 0.24;
      ctx.fillStyle = patches[i % patches.length];
      ctx.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rx = 32 + Math.random() * 120;
      const ry = 12 + Math.random() * 48;
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#161a15';
    ctx.lineWidth = 3;
    for (let i = 0; i < 28; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

function stormTexture(kind) {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    for (let i = 0; i < 80; i += 1) {
      const a = (i / 80) * Math.PI * 2;
      const r = 388 + Math.sin(i * 1.7) * 18 + Math.random() * 12;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      ctx.globalAlpha = kind === 'edge' ? 0.18 : 0.09;
      ctx.strokeStyle = kind === 'edge' ? '#d970ff' : '#74d6ff';
      ctx.lineWidth = kind === 'edge' ? 10 : 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a + 1.4) * 160, y + Math.sin(a + 1.4) * 80);
      ctx.stroke();
    }
    const grad = ctx.createRadialGradient(0, 0, 300, 0, 0, 492);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.78, kind === 'edge' ? 'rgba(222,100,255,0.08)' : 'rgba(95,190,255,0.05)');
    grad.addColorStop(0.9, kind === 'edge' ? 'rgba(210,85,255,0.32)' : 'rgba(120,205,255,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 492, 0, Math.PI * 2);
    ctx.fill();
  });
}

function addPlane(name, texture, width, depth, position, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(position[0], position[1], position[2]);
  scene.add(mesh);
  return mesh;
}

function addSprite(name, path, position, scale, order = 1) {
  const texture = loader.load(path, () => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.name = name;
  sprite.position.set(position[0], position[1], position[2]);
  sprite.scale.set(scale[0], scale[1], 1);
  sprite.renderOrder = order;
  scene.add(sprite);
  billboardSpriteCount += 1;
  spriteAssetCount += 1;
  return sprite;
}

function addShadow(x, z, sx, sz, alpha = 0.34) {
  const tex = makeCanvasTexture((ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
    grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  return addPlane('painted-shadow', tex, sx, sz, [x, 0.024, z], 0.9);
}

function addBox(name, color, size, position) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05 })
  );
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  propDepthLayerCount += 1;
  return mesh;
}

scene.add(new THREE.HemisphereLight(0xc6fff3, 0x1b2018, 1.4));
const sun = new THREE.DirectionalLight(0xffd38a, 2.2);
sun.position.set(-4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

addPlane('cocos-target-ground-splat', groundTexture(), 11, 16, [0, 0, 0], 1);
groundSplatCount += 1;
[
  [-2.7, -3.1, 2.2, 0.6],
  [1.6, -2.0, 1.8, 0.5],
  [-0.8, 1.6, 2.5, 0.7],
  [2.7, 2.2, 1.6, 0.44]
].forEach(([x, z, w, d]) => {
  addPlane('road-value-splat', groundTexture(), w, d, [x, 0.012, z], 0.42);
  groundSplatCount += 1;
});

const stormHaze = addPlane('storm-haze-layer', stormTexture('haze'), 10.8, 14.2, [0, 0.05, 0], 0.82);
const stormEdge = addPlane('storm-edge-layer', stormTexture('edge'), 9.8, 13.2, [0, 0.06, 0], 0.9);
stormLayerCount += 2;

[
  ['wreck-root', 0x4a2418, [1.9, 0.24, 0.92], [-1.6, 0.24, -2.55], assets.wreck, [1.7, 1.05]],
  ['wall-root', 0x5e635b, [0.28, 1.0, 1.7], [2.0, 0.5, -0.3], assets.wall, [1.45, 1.35]],
  ['crate-root', 0x6a462a, [0.75, 0.55, 0.75], [2.35, 0.28, 2.7], assets.crate, [0.95, 0.78]],
  ['debris-root', 0x35362f, [0.85, 0.22, 0.62], [-2.6, 0.11, 1.4], assets.debris, [0.9, 0.58]]
].forEach(([name, color, size, pos, spritePath, spriteScale]) => {
  addShadow(pos[0], pos[2], size[0] * 1.6, size[2] * 1.5, 0.28);
  addBox(name, color, size, pos);
  addSprite(`${name}-sprite`, spritePath, [pos[0], pos[1] + size[1] * 0.46, pos[2] + 0.04], spriteScale, 2);
});

const hero = addSprite('hero-ranger-billboard', assets.hero, [-0.25, 1.15, -0.95], [1.25, 1.62], 5);
addShadow(-0.25, -1.02, 1.45, 0.82, 0.45);

[
  ['zombie-brute', assets.brute, [0.95, 1.1, -0.45], [1.05, 1.42]],
  ['zombie-crawler', assets.crawler, [-2.4, 0.82, -1.1], [0.86, 1.12]],
  ['zombie-hooded', assets.hooded, [2.55, 0.96, 1.45], [0.88, 1.24]],
  ['zombie-brute-b', assets.brute, [-1.75, 1.0, 2.25], [0.92, 1.26]],
  ['zombie-hooded-b', assets.hooded, [2.9, 0.92, -2.1], [0.78, 1.08]]
].forEach(([name, path, pos, scale]) => {
  addShadow(pos[0], pos[2], scale[0], 0.55, 0.34);
  addSprite(name, path, pos, scale, 4);
});

[
  [-0.45, -0.82, -1.5, -1.5],
  [-0.2, -0.88, -1.8, -1.1],
  [-0.05, -0.92, -2.05, -0.7]
].forEach(([x1, z1, x2, z2], index) => {
  const points = [new THREE.Vector3(x1, 0.18 + index * 0.02, z1), new THREE.Vector3(x2, 0.18, z2)];
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: index === 0 ? 0xffe078 : 0xff8d45, transparent: true, opacity: 0.9 })
  );
  scene.add(line);
  skillFxLayerCount += 1;
});
addSprite('fan-skill-card-world', assets.fan, [-1.45, 0.36, -1.22], [0.7, 0.34], 6);
addSprite('boom-skill-card-world', assets.boom, [1.35, 0.32, -0.18], [0.58, 0.30], 6);
skillFxLayerCount += 2;

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  camera.left = -5.25 * aspect;
  camera.right = 5.25 * aspect;
  camera.top = 5.25;
  camera.bottom = -5.25;
  camera.updateProjectionMatrix();
}

function animate() {
  resize();
  const t = clock.getElapsedTime();
  stormHaze.rotation.z = t * 0.025;
  stormEdge.rotation.z = -t * 0.052;
  stormHaze.material.opacity = 0.46 + Math.sin(t * 0.9) * 0.08;
  stormEdge.material.opacity = 0.62 + Math.sin(t * 1.6) * 0.10;
  hero.position.y = 1.13 + Math.sin(t * 2.0) * 0.035;
  renderer.render(scene, camera);
  window.__V03_ENGINE_PROOF_STATE = {
    engineRecommendation: 'cocos-creator-3.x',
    renderRoute: 'orthographic-2.5d-sprite-billboard-plus-prop-depth',
    hasWebgl: !!renderer.getContext(),
    usesOrthographicCamera: camera.isOrthographicCamera === true,
    billboardSpriteCount,
    spriteAssetCount,
    propDepthLayerCount,
    groundSplatCount,
    stormLayerCount,
    skillFxLayerCount,
    targetReference: 'candidate_pics/zombie-battle-royale-visual-direction-03-classes-skills-skins.png'
  };
  requestAnimationFrame(animate);
}

resize();
animate();
