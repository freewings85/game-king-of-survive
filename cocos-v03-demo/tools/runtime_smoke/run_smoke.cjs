#!/usr/bin/env node
'use strict';
// M2-0b runtime loader proof: drive BootstrapMain.ts -> ActorSpawner.ts ->
// SceneConfigLoader.ts end-to-end with a Node-side `cc` shim. The .ts files
// are NOT modified; esbuild transpiles + bundles them, with `import 'cc'`
// aliased to ./cc-shim.cjs. After the lifecycle settles, every spawned Node
// is dumped to spawn-dump.json so the Python preview can render it.

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const HERE = __dirname;
const SCRIPTS_DIR = path.resolve(HERE, '..', '..', 'assets', 'scripts');
const BUILD_DIR = path.join(HERE, 'build');
const DUMP_PATH = path.join(BUILD_DIR, 'spawn-dump.json');
const SHIM_PATH = path.join(HERE, 'cc-shim.cjs');

fs.mkdirSync(BUILD_DIR, { recursive: true });

process.env.V03_RESOURCES_ROOT = path.resolve(HERE, '..', '..', 'assets', 'resources');

(async () => {
    // 1) bundle BootstrapMain.ts (it pulls in ActorSpawner / WastelandTerrain / SceneConfigLoader)
    const outfile = path.join(BUILD_DIR, 'bootstrap.cjs');
    await esbuild.build({
        entryPoints: [path.join(SCRIPTS_DIR, 'BootstrapMain.ts')],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'es2020',
        outfile,
        logLevel: 'silent',
        plugins: [{
            name: 'cc-extern',
            setup(build) {
                build.onResolve({ filter: /^cc$/ }, () => ({
                    path: SHIM_PATH,
                    external: true,
                }));
            },
        }],
    });

    // 2) require the bundle — this reaches into the shim for everything `cc`
    const bundle = require(outfile);
    const cc = require(SHIM_PATH);

    // 3) build a parent node for BootstrapMain (mirrors `addComponent` host)
    const scene = cc.director.getScene();
    const bmHost = new cc.Node('BMHost');
    scene.addChild(bmHost);

    const bm = new bundle.BootstrapMain();
    bm.node = bmHost;
    bm.targetWidth = 390;
    bm.targetHeight = 844;
    bm.maxDevicePixelRatio = 2;

    // 4) lifecycle: onLoad sync, then await start (BM.start awaits loadSceneConfig
    //    and addComponent(ActorSpawner). The shim defers ActorSpawner.start until
    //    we explicitly flush, mirroring Cocos's "next frame" semantics.)
    bm.onLoad();
    await bm.start();
    await cc.__flushStarts();

    // 5) dump everything beneath the mock scene
    const dump = cc.__dumpScene();
    const flat = cc.__flatNodes(dump);
    fs.writeFileSync(DUMP_PATH, JSON.stringify(dump, null, 2));

    // 6) summary so the developer can eyeball before invoking Python
    const summary = {
        totalNodes: flat.length,
        worldChildren: countLayer(flat, 'World'),
        fxChildren: countLayer(flat, 'FX'),
        hudChildren: countLayer(flat, 'HUD'),
        terrainTiles: flat.filter((n) => n.name.startsWith('tile_')).length,
        zombies: flat.filter((n) => ['lead', 'sneak', 'flank', 'back', 'far'].includes(n.name)).map((n) => ({
            name: n.name, pos: n.pos, color: n.color, contentSize: n.contentSize, angle: n.angle,
        })),
        bullets: flat.filter((n) => n.name.startsWith('Bullet_')).length,
        sparks: flat.filter((n) => n.name.startsWith('Spark_')).length,
        boltSegments: flat.filter((n) => n.name.startsWith('Bolt_')).length,
        lightningHubs: flat.filter((n) => n.name.startsWith('LightningHub_')).length,
        skillNodes: flat.filter((n) => n.name.startsWith('Skill') && (n.name.endsWith('_Disc') || n.name.endsWith('_Glow') || n.name.endsWith('_Glyph'))).length,
        hudPanels: flat.filter((n) => n.name.startsWith('HUD_')).length,
    };
    console.log(JSON.stringify(summary, null, 2));
})().catch((e) => {
    console.error('[run_smoke] FAIL:', e && e.stack || e);
    process.exit(1);
});

function countLayer(flat, layerName) {
    return flat.filter((n) => n.layer === layerName).length;
}
