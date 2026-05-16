'use strict';
// Minimal Node-side shim for the subset of `cc` we touch from
// BootstrapMain / ActorSpawner / WastelandTerrain / SceneConfigLoader.
// Goal: drive the real .ts runtime end-to-end, capture every spawned Node
// in a flat list so the Python renderer can paint a faithful preview.

const fs = require('fs');
const path = require('path');

const RESOURCES_ROOT = process.env.V03_RESOURCES_ROOT
    || path.join(__dirname, '..', '..', 'assets', 'resources');

// ---------- Spawn capture ----------
const captured = [];
let nextId = 1;
const pendingStarts = [];

function tagSpriteFrame(meta) {
    return Object.assign(new SpriteFrame(), { __meta: meta });
}

class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
}

class Color {
    constructor(r = 255, g = 255, b = 255, a = 255) { this.r = r; this.g = g; this.b = b; this.a = a; }
}

class SpriteFrame {
    constructor() { this.texture = null; this.__meta = null; }
}

class Texture2D {
    constructor() { this.image = null; }
}

Texture2D.PixelFormat = { RGBA8888: 'RGBA8888' };

class ImageAsset {
    constructor(spec) { this.spec = spec; }
}

class JsonAsset {
    constructor(json) { this.json = json; }
}

class UITransform {
    constructor() { this.contentSize = [0, 0]; this.anchorPoint = [0.5, 0.5]; }
    setContentSize(w, h) { this.contentSize = [w, h]; }
    setAnchorPoint(x, y) { this.anchorPoint = [x, y]; }
}

const Layers = { Enum: { UI_2D: 'UI_2D', UI_3D: 'UI_3D', DEFAULT: 'DEFAULT' } };

class Sprite {
    constructor() { this.spriteFrame = null; this.color = new Color(255, 255, 255, 255); }
}

class Component {
    constructor() { this.node = null; }
}

class Node {
    constructor(name = '') {
        this.id = nextId++;
        this.name = name;
        this.children = [];
        this.parent = null;
        this.scene = null;
        this.position = new Vec3(0, 0, 0);
        this.angle = 0;
        this.rotationEuler = [0, 0, 0];
        this.components = [];
    }
    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }
    addComponent(Cls) {
        const inst = new Cls();
        inst.node = this;
        this.components.push(inst);
        if (typeof inst.onLoad === 'function') inst.onLoad();
        if (typeof inst.start === 'function') {
            // Defer start exactly like Cocos: not invoked synchronously inside addComponent.
            pendingStarts.push(inst);
        }
        return inst;
    }
    getComponent(Cls) {
        return this.components.find((c) => c instanceof Cls) || null;
    }
    getChildByName(name) {
        return this.children.find((c) => c.name === name) || null;
    }
    setPosition(a, b, c) {
        if (a instanceof Vec3) this.position = new Vec3(a.x, a.y, a.z);
        else this.position = new Vec3(a, b || 0, c || 0);
    }
    setRotationFromEuler(x, y, z) {
        this.rotationEuler = [x, y, z];
        this.angle = z;
    }
}

class Camera {
    constructor() {
        this.projection = null;
        this.orthoHeight = 0;
        this.clearColor = new Color(0, 0, 0, 255);
    }
}
Camera.ProjectionType = { ORTHO: 'ORTHO' };

const view = {
    setResolutionPolicy(_p) {},
    setDesignResolutionSize(_w, _h, _p) {},
    setDevicePixelRatio(_d) {},
};

let mockScene = null;
const director = {
    getScene() {
        if (!mockScene) mockScene = new Node('MockScene');
        return mockScene;
    },
};

// ---------- resources.load ----------
const PROP_FILE = {
    'wreckTank': 'props/wreck-tank.png',
    'barrelRust': 'props/barrel-rust.png',
    'sandbag': 'props/sandbag.png',
};

function resolveResourcePath(virtualPath) {
    // 'art/v03/hero/survivor-idle/spriteFrame' → 'art/v03/hero/survivor-idle.png'
    if (virtualPath.endsWith('/spriteFrame')) {
        return path.join(RESOURCES_ROOT, virtualPath.replace('/spriteFrame', '.png'));
    }
    return path.join(RESOURCES_ROOT, virtualPath + '.json');
}

const resources = {
    load(virtualPath, Type, cb) {
        try {
            if (Type === JsonAsset) {
                const file = resolveResourcePath(virtualPath);
                const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
                setImmediate(() => cb(null, new JsonAsset(json)));
            } else if (Type === SpriteFrame) {
                const file = resolveResourcePath(virtualPath);
                if (!fs.existsSync(file)) throw new Error(`mock resources: missing ${file}`);
                const sf = tagSpriteFrame({ kind: 'image', sourcePath: file, virtualPath });
                setImmediate(() => cb(null, sf));
            } else {
                throw new Error(`mock resources: unsupported type ${Type && Type.name}`);
            }
        } catch (e) {
            setImmediate(() => cb(e, null));
        }
    },
};

// ---------- Decorators (no-op metadata) ----------
const _decorator = {
    ccclass(_id) {
        return function (_target) {};
    },
    property(_target, _key) {},
};
// Cocos uses ccclass as a decorator factory; if called bare with target, behave as a passthrough.
_decorator.ccclass = (id) => (cls) => cls;
// `@property` can be called with or without an argument. Our spawn code uses `@property targetWidth = 390;`,
// which after esbuild transpilation calls `property(target, key)` — make it a no-op factory either way.
_decorator.property = (...args) => {
    if (args.length >= 2) return undefined; // direct decorator call
    return () => {};
};

// ---------- Helpers exposed to driver ----------
async function flushStarts() {
    while (pendingStarts.length) {
        const inst = pendingStarts.shift();
        await inst.start();
    }
}

function dumpScene() {
    const LAYER_NAMES = new Set(['World', 'FX', 'HUD']);
    function visit(node, layerName) {
        const sprite = node.components.find((c) => c instanceof Sprite);
        const tr = node.components.find((c) => c instanceof UITransform);
        const entry = {
            id: node.id,
            name: node.name,
            layer: layerName,
            pos: [node.position.x, node.position.y, node.position.z],
            angle: node.angle,
            rotationEuler: node.rotationEuler,
            contentSize: tr ? tr.contentSize : null,
            color: sprite && sprite.color
                ? [sprite.color.r, sprite.color.g, sprite.color.b, sprite.color.a]
                : null,
            spriteMeta: sprite && sprite.spriteFrame && sprite.spriteFrame.__meta
                ? sprite.spriteFrame.__meta
                : null,
            children: [],
        };
        for (const child of node.children) {
            const childLayer = LAYER_NAMES.has(child.name) ? child.name : layerName;
            entry.children.push(visit(child, childLayer));
        }
        return entry;
    }
    return visit(mockScene, 'root');
}

function flatNodes(tree, out = []) {
    out.push(tree);
    for (const c of tree.children) flatNodes(c, out);
    return out;
}

global.window = global.window || { devicePixelRatio: 1 };

module.exports = {
    Vec3, Color, SpriteFrame, Texture2D, ImageAsset, JsonAsset,
    UITransform, Sprite, Component, Node, Camera, view, director,
    Layers,
    resources, _decorator,
    __flushStarts: flushStarts,
    __dumpScene: dumpScene,
    __flatNodes: flatNodes,
    __captureSpriteMeta: tagSpriteFrame,
    __resetCaptured() { captured.length = 0; mockScene = null; pendingStarts.length = 0; },
};
