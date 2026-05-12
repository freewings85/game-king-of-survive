import {
    _decorator,
    Camera,
    Canvas,
    Color,
    Component,
    director,
    ImageAsset,
    internal,
    Layers,
    Node,
    resources,
    Sprite,
    SpriteFrame,
    Texture2D,
    UITransform,
    Vec3,
    view,
} from 'cc';
import { ActorSpawner } from './ActorSpawner';
import { attachWastelandTerrain } from './WastelandTerrain';
import {
    BarConfig,
    DiscConfig,
    HudConfig,
    JoystickConfig,
    MinimapConfig,
    SkillConfig,
    SceneConfig,
    loadSceneConfig,
} from './SceneConfigLoader';

const { ccclass, property } = _decorator;

/**
 * M1y/M2-0 入口: 程序化建场景 (无 .scene), 全部场景参数从 m2-visual-scene.json 读.
 */
@ccclass('BootstrapMain')
export class BootstrapMain extends Component {
    @property targetWidth = 390;
    @property targetHeight = 844;
    @property maxDevicePixelRatio = 2;

    private worldLayer!: Node;
    private fxLayer!: Node;
    private hudLayer!: Node;

    onLoad() {
        // M2-X: disable dynamic atlas to avoid texSubImage2D upload failure
        const cc: any = (globalThis as any).cc;
        const dam = cc?.internal?.dynamicAtlasManager ?? (internal as any)?.dynamicAtlasManager;
        if (dam) {
            dam.enabled = false;
            console.log('[BootstrapMain] dynamicAtlasManager disabled');
        } else {
            console.warn('[BootstrapMain] dynamicAtlasManager not found — atlas not disabled');
        }
        this.applyRenderBudget();
        const layers = this.buildSceneGraph();
        this.worldLayer = layers.worldLayer;
        this.fxLayer = layers.fxLayer;
        this.hudLayer = layers.hudLayer;
    }

    async start() {
        try {
            console.log('[BootstrapMain] start() begin');

            const config = await loadSceneConfig();
            console.log('[BootstrapMain] config loaded', { canvas: config.canvas, zombies: config.zombies?.length, props: config.props?.length });
            this.applyClearColor(config);
            const painterlyTile = await preloadTerrainTile();
            attachWastelandTerrain(this.worldLayer, config.canvas.width, config.canvas.height, painterlyTile);
            console.log('[BootstrapMain] terrain attached', painterlyTile ? '(painterly)' : '(programmatic)');

            const spawner = this.node.addComponent(ActorSpawner);
            spawner.worldLayer = this.worldLayer;
            spawner.fxLayer = this.fxLayer;
            spawner.makeRadialAlpha = makeRadialGradientSpriteFrame;
            spawner.config = config;
            console.log('[BootstrapMain] spawner attached');

            // Preload painterly HUD icons (skill + portrait/minimap frame) before attachHud
            const hudIcons = await preloadHudIcons();
            console.log('[BootstrapMain] hud icons loaded', Object.keys(hudIcons));

            attachHudSkeleton(this.hudLayer, config, hudIcons);

            // Hook dynamic minimap dots into the static minimap container
            const minimapNode = this.hudLayer.getChildByName('HUD_Minimap_Frame_Painterly')
                ?? this.hudLayer.getChildByName('HUD_Minimap');
            if (minimapNode) {
                spawner.attachDynamicMinimap(minimapNode, config.hud.minimap.contentSize[0]);
            }

            // Atmospheric polish: heavy vignette + ground-shadow edge for end-of-world mood
            this.attachVignette(config.canvas.width, config.canvas.height);
            console.log('[BootstrapMain] start() done');
        } catch (e) {
            console.error('[BootstrapMain] start() FAILED', e);
        }
    }

    private applyRenderBudget() {
        // Cocos 3.8 ResolutionPolicy: 0=EXACT 1=NO_BORDER 2=SHOW_ALL 3=FIXED_HEIGHT 4=FIXED_WIDTH.
        // SHOW_ALL letterboxes both axes so HUD anchored at design edges stays on-screen.
        view.setResolutionPolicy(2);
        view.setDesignResolutionSize(this.targetWidth, this.targetHeight, 2);
        const dpr = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio);
        view.setDevicePixelRatio?.(dpr);
    }

    private attachVignette(width: number, height: number) {
        // 1) Wide outer vignette: dark corners, bright center -- adds end-of-world mood
        const vignette = new Node('VignetteOverlay');
        vignette.layer = Layers.Enum.UI_2D;
        const vsp = vignette.addComponent(Sprite);
        // Build a radial gradient sprite that's transparent in center, dark at edges.
        const vSize = 256;
        vsp.spriteFrame = makeRadialGradientSpriteFrame(vSize, [0, 0, 0, 0], [0, 0, 0, 140]);
        (vsp.spriteFrame as any).packable = false;
        const tr = vignette.addComponent(UITransform);
        // Stretch beyond canvas so the dark falloff is fully off-screen on edges
        tr.setContentSize(Math.floor(width * 1.3), Math.floor(height * 1.15));
        vignette.setPosition(0, 0, 0);
        // FX layer renders above world but below HUD
        this.fxLayer.addChild(vignette);

        // 2) Bottom haze band: warm-orange dust glow at horizon line for atmosphere
        const haze = new Node('HorizonHaze');
        haze.layer = Layers.Enum.UI_2D;
        const hsp = haze.addComponent(Sprite);
        hsp.spriteFrame = makeRadialGradientSpriteFrame(128, [180, 100, 50, 60], [180, 100, 50, 0]);
        (hsp.spriteFrame as any).packable = false;
        const htr = haze.addComponent(UITransform);
        htr.setContentSize(width + 80, 240);
        haze.setPosition(0, -height * 0.30, 0);
        this.fxLayer.addChild(haze);
    }

    private applyClearColor(config: SceneConfig) {
        const camera = this.node.scene?.getChildByName('V03Root')?.getChildByName('MainCamera')?.getComponent(Camera);
        if (camera) {
            const c = config.canvas.clearColor;
            camera.clearColor = new Color(c[0], c[1], c[2], c[3]);
        }
    }

    private buildSceneGraph(): { worldLayer: Node; fxLayer: Node; hudLayer: Node } {
        const scene = director.getScene();
        if (!scene) throw new Error('[BootstrapMain] No active scene');

        const root = new Node('V03Root');
        root.layer = Layers.Enum.UI_2D;
        scene.addChild(root);

        const cameraNode = new Node('MainCamera');
        cameraNode.layer = Layers.Enum.UI_2D;
        const camera = cameraNode.addComponent(Camera);
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = this.targetHeight / 2;
        camera.clearColor = new Color(10, 12, 14, 255);
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        camera.visibility = Layers.Enum.UI_2D;
        camera.priority = 1073741823;
        camera.near = 1;
        camera.far = 2000;
        cameraNode.setPosition(0, 0, 1000);
        root.addChild(cameraNode);
        console.log('[BootstrapMain] camera configured', { ortho: camera.orthoHeight, near: camera.near, far: camera.far, vis: camera.visibility });

        // Canvas wires the camera to the UI render pipeline (required for Sprite to render in 3.x)
        const canvas = root.addComponent(Canvas);
        canvas.cameraComponent = camera;
        const rootTr = root.addComponent(UITransform);
        rootTr.setContentSize(this.targetWidth, this.targetHeight);

        const worldLayer = new Node('World');
        const fxLayer = new Node('FX');
        const hudLayer = new Node('HUD');
        worldLayer.layer = Layers.Enum.UI_2D;
        fxLayer.layer = Layers.Enum.UI_2D;
        hudLayer.layer = Layers.Enum.UI_2D;
        worldLayer.addComponent(UITransform).setContentSize(this.targetWidth, this.targetHeight);
        fxLayer.addComponent(UITransform).setContentSize(this.targetWidth, this.targetHeight);
        hudLayer.addComponent(UITransform).setContentSize(this.targetWidth, this.targetHeight);
        root.addChild(worldLayer);
        root.addChild(fxLayer);
        root.addChild(hudLayer);
        return { worldLayer, fxLayer, hudLayer };
    }
}

interface HudIconSet {
    skillFire: SpriteFrame | null;
    skillLightning: SpriteFrame | null;
    skillShield: SpriteFrame | null;
    portraitFrame: SpriteFrame | null;
    minimapFrame: SpriteFrame | null;
}

async function preloadTerrainTile(): Promise<{ asphalt: SpriteFrame | null; sand: SpriteFrame | null; concrete: SpriteFrame | null } | null> {
    const out = { asphalt: null as SpriteFrame | null, sand: null as SpriteFrame | null, concrete: null as SpriteFrame | null };
    const paths: Array<[string, 'asphalt' | 'sand' | 'concrete']> = [
        ['art/v03/terrain/asphalt-tile/spriteFrame', 'asphalt'],
        ['art/v03/terrain/sand-tile/spriteFrame', 'sand'],
        ['art/v03/terrain/concrete-tile/spriteFrame', 'concrete'],
    ];
    await Promise.all(paths.map(([p, key]) =>
        new Promise<void>((resolve) => {
            resources.load(p, SpriteFrame, (err, sf) => {
                if (err) { console.warn('[terrain] miss:', p); resolve(); return; }
                (sf as any).packable = false;
                out[key] = sf;
                resolve();
            });
        })
    ));
    if (!out.asphalt && !out.sand && !out.concrete) return null;
    return out;
}

async function preloadHudIcons(): Promise<HudIconSet> {
    const out: HudIconSet = {
        skillFire: null, skillLightning: null, skillShield: null,
        portraitFrame: null, minimapFrame: null,
    };
    const paths: Array<[string, keyof HudIconSet]> = [
        ['art/v03/hud/skill-fire/spriteFrame', 'skillFire'],
        ['art/v03/hud/skill-lightning/spriteFrame', 'skillLightning'],
        ['art/v03/hud/skill-shield/spriteFrame', 'skillShield'],
        ['art/v03/hud/portrait-frame/spriteFrame', 'portraitFrame'],
        ['art/v03/hud/minimap-frame/spriteFrame', 'minimapFrame'],
    ];
    await Promise.all(paths.map(([p, key]) =>
        new Promise<void>((resolve) => {
            resources.load(p, SpriteFrame, (err, sf) => {
                if (err) { console.warn('[hud] miss:', p); resolve(); return; }
                (sf as any).packable = false;
                out[key] = sf;
                resolve();
            });
        })
    ));
    return out;
}

function attachHudSkeleton(parent: Node, config: SceneConfig, icons: HudIconSet) {
    const hud: HudConfig = config.hud;

    // Portrait: painterly frame on top of programmatic disc fill
    paintDisc(parent, 'HUD_Portrait_Fill', hud.portrait.fill);
    if (icons.portraitFrame) {
        addSprite(parent, 'HUD_Portrait_Frame_Painterly',
            hud.portrait.frame.pos[0], hud.portrait.frame.pos[1],
            hud.portrait.frame.contentSize[0], hud.portrait.frame.contentSize[1],
            icons.portraitFrame);
    } else {
        paintDisc(parent, 'HUD_Portrait_Frame', hud.portrait.frame);
    }

    paintBar(parent, 'HUD_HP_Bar', hud.hpBar);
    paintBar(parent, 'HUD_Armor_Bar', hud.armorBar);
    paintBar(parent, 'HUD_EXP_Bar', hud.expBar);

    // Minimap: painterly frame on top of programmatic dotted ground
    paintMinimap(parent, hud.minimap);
    if (icons.minimapFrame) {
        addSprite(parent, 'HUD_Minimap_Frame_Painterly',
            hud.minimap.pos[0], hud.minimap.pos[1],
            hud.minimap.contentSize[0], hud.minimap.contentSize[1],
            icons.minimapFrame);
    }

    paintJoystick(parent, hud.joystick);

    for (const sk of hud.skills) paintSkill(parent, sk, icons);
}

function paintDisc(parent: Node, name: string, c: DiscConfig) {
    addSprite(parent, name, c.pos[0], c.pos[1], c.contentSize[0], c.contentSize[1],
        makeDiscFrame(c.discSize, c.fill, c.edge, c.edgeWidth));
}

function paintBar(parent: Node, name: string, c: BarConfig) {
    addSprite(parent, name, c.pos[0], c.pos[1], c.contentSize[0], c.contentSize[1],
        makeRoundedBarRect(c.barW, c.barH, c.fill, c.bg, c.fillFrac));
}

function paintMinimap(parent: Node, c: MinimapConfig) {
    addSprite(parent, 'HUD_Minimap', c.pos[0], c.pos[1], c.contentSize[0], c.contentSize[1],
        makeMinimapFrame(c.size));
}

function paintJoystick(parent: Node, c: JoystickConfig) {
    addSprite(parent, 'HUD_Stick_Ring', c.ring.pos[0], c.ring.pos[1], c.ring.contentSize[0], c.ring.contentSize[1],
        makeRingFrame(c.ring.size, c.ring.outerR, c.ring.innerR, c.ring.fill));
    paintDisc(parent, 'HUD_Stick_Thumb', c.thumb);
}

function paintSkill(parent: Node, sk: SkillConfig, icons: HudIconSet) {
    // Glow halo (kept for atmosphere — programmatic radial gradient)
    addSprite(parent, sk.name + '_Glow', sk.pos[0], sk.pos[1], sk.size + 16, sk.size + 16,
        makeRadialGradientSpriteFrame(64, [sk.base[0], sk.base[1], sk.base[2], sk.glowAlpha], [sk.base[0], sk.base[1], sk.base[2], 0]));
    // Painterly icon if available, else fallback to programmatic disc + glyph
    const painterly = sk.glyph === 'flame' ? icons.skillFire
        : sk.glyph === 'bolt' ? icons.skillLightning
        : icons.skillShield;
    if (painterly) {
        addSprite(parent, sk.name + '_Painterly', sk.pos[0], sk.pos[1], sk.size, sk.size, painterly);
    } else {
        addSprite(parent, sk.name + '_Disc', sk.pos[0], sk.pos[1], sk.size, sk.size,
            makeSkillDisc(96, sk.base));
        const glyphSize = Math.floor(sk.size * 0.55);
        addSprite(parent, sk.name + '_Glyph', sk.pos[0], sk.pos[1], glyphSize, glyphSize,
            makeGlyphFrame(64, sk.glyph));
    }
}

function addSprite(parent: Node, name: string, cx: number, cy: number, w: number, h: number, frame: SpriteFrame) {
    const node = new Node(name);
    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = frame;
    const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    tr.setContentSize(w, h);
    node.setPosition(new Vec3(cx, cy, 0));
    parent.addChild(node);
}

// ---- Procedural HUD sprite generators (CONTRACT §3.4) ----

type PainterSet = (x: number, y: number, r: number, g: number, b: number, a: number) => void;
function paintFrame(size: number, painter: (set: PainterSet) => void): SpriteFrame {
    const data = new Uint8Array(size * size * 4);
    const set: PainterSet = (x, y, r, g, b, a) => {
        if (x < 0 || x >= size || y < 0 || y >= size || a <= 0) return;
        const xi = x | 0; const yi = y | 0;
        const i = (yi * size + xi) * 4;
        const af = a / 255;
        const inv = 1 - af;
        data[i]     = Math.round(data[i] * inv + r * af);
        data[i + 1] = Math.round(data[i + 1] * inv + g * af);
        data[i + 2] = Math.round(data[i + 2] * inv + b * af);
        data[i + 3] = Math.min(255, data[i + 3] + Math.round((255 - data[i + 3]) * af));
    };
    painter(set);
    const image = new ImageAsset({
        width: size, height: size, _data: data,
        format: Texture2D.PixelFormat.RGBA8888, _compressed: false,
    } as any);
    const tex = new Texture2D(); tex.image = image;
    const frame = new SpriteFrame(); frame.texture = tex; return frame;
}

function makeDiscFrame(size: number, fill: [number, number, number, number], edge: [number, number, number, number] | null, edgeWidth: number): SpriteFrame {
    return paintFrame(size, (set) => {
        const c = size / 2; const r = size / 2 - 1;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - c + 0.5; const dy = y - c + 0.5;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > r) continue;
                const aa = Math.min(1, r - d);
                if (edge && d > r - edgeWidth) {
                    set(x, y, edge[0], edge[1], edge[2], edge[3] * aa);
                } else {
                    set(x, y, fill[0], fill[1], fill[2], fill[3] * aa);
                }
            }
        }
    });
}

function makeRingFrame(size: number, outerR: number, innerR: number, fill: [number, number, number, number]): SpriteFrame {
    return paintFrame(size, (set) => {
        const c = size / 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - c + 0.5; const dy = y - c + 0.5;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > outerR || d < innerR) continue;
                const aaOuter = Math.min(1, outerR - d);
                const aaInner = Math.min(1, d - innerR);
                const aa = Math.min(aaOuter, aaInner, 1);
                set(x, y, fill[0], fill[1], fill[2], fill[3] * aa);
            }
        }
    });
}

function makeRoundedBarRect(w: number, h: number, fill: [number, number, number, number], bg: [number, number, number, number], fillFrac: number): SpriteFrame {
    const data = new Uint8Array(w * h * 4);
    const set = (x: number, y: number, r: number, g: number, b: number, a: number) => {
        if (x < 0 || x >= w || y < 0 || y >= h || a <= 0) return;
        const i = ((y | 0) * w + (x | 0)) * 4;
        const af = a / 255;
        const inv = 1 - af;
        data[i] = Math.round(data[i] * inv + r * af);
        data[i + 1] = Math.round(data[i + 1] * inv + g * af);
        data[i + 2] = Math.round(data[i + 2] * inv + b * af);
        data[i + 3] = Math.min(255, data[i + 3] + Math.round((255 - data[i + 3]) * af));
    };
    const radius = h / 2;
    const fillEndX = radius + (w - 2 * radius) * fillFrac + radius;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const inLeftCap = x < radius && Math.hypot(x - radius + 0.5, y - radius + 0.5) > radius;
            const inRightCap = x > w - radius && Math.hypot(x - (w - radius) + 0.5, y - radius + 0.5) > radius;
            if (inLeftCap || inRightCap) continue;
            let aa = 1;
            if (x < radius) {
                const d = Math.hypot(x - radius + 0.5, y - radius + 0.5);
                aa = Math.min(1, Math.max(0, radius - d));
            } else if (x > w - radius) {
                const d = Math.hypot(x - (w - radius) + 0.5, y - radius + 0.5);
                aa = Math.min(1, Math.max(0, radius - d));
            } else {
                const dy = Math.min(y, h - 1 - y);
                aa = Math.min(1, dy + 1);
            }
            set(x, y, bg[0], bg[1], bg[2], bg[3] * aa);
            if (x < fillEndX) {
                set(x, y, fill[0], fill[1], fill[2], fill[3] * aa);
            }
        }
    }
    const image = new ImageAsset({
        width: w, height: h, _data: data,
        format: Texture2D.PixelFormat.RGBA8888, _compressed: false,
    } as any);
    const tex = new Texture2D(); tex.image = image;
    const frame = new SpriteFrame(); frame.texture = tex; return frame;
}

function makeMinimapFrame(size: number): SpriteFrame {
    return paintFrame(size, (set) => {
        const c = size / 2; const rOuter = size / 2 - 1;
        const rInner = rOuter - 5;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - c + 0.5; const dy = y - c + 0.5;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > rOuter) continue;
                const aa = Math.min(1, rOuter - d);
                if (d > rInner) {
                    set(x, y, 195, 215, 230, 240 * aa);
                } else {
                    const t = d / rInner;
                    const r = Math.round(22 + t * 14);
                    const g = Math.round(34 + t * 18);
                    const b = Math.round(40 + t * 22);
                    set(x, y, r, g, b, 235 * aa);
                }
            }
        }
        for (let i = 0; i < size; i++) {
            set(c | 0, i, 80, 130, 150, 50);
            set(i, c | 0, 80, 130, 150, 50);
        }
        const dots: Array<[number, number, number, number, number]> = [
            [c, c, 110, 230, 130, 4],
            [c + size * 0.18, c - size * 0.12, 230, 70, 70, 3],
            [c + size * 0.28, c + size * 0.08, 230, 70, 70, 3],
            [c + size * 0.10, c + size * 0.22, 230, 70, 70, 3],
            [c - size * 0.20, c + size * 0.18, 230, 70, 70, 3],
            [c - size * 0.10, c - size * 0.22, 100, 200, 240, 3],
        ];
        for (const [dx, dy, dr, dg, db, dRad] of dots) {
            for (let y = -dRad - 1; y <= dRad + 1; y++) {
                for (let x = -dRad - 1; x <= dRad + 1; x++) {
                    const d = Math.hypot(x, y);
                    if (d > dRad + 0.5) continue;
                    const aa = Math.min(1, dRad + 0.5 - d);
                    set(dx + x, dy + y, dr, dg, db, 255 * aa);
                }
            }
        }
    });
}

function makeSkillDisc(size: number, base: [number, number, number]): SpriteFrame {
    return paintFrame(size, (set) => {
        const c = size / 2; const r = size / 2 - 1;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - c + 0.5; const dy = y - c + 0.5;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > r) continue;
                const aa = Math.min(1, r - d);
                if (d > r - 3) {
                    set(x, y, Math.round(base[0] * 0.4), Math.round(base[1] * 0.4), Math.round(base[2] * 0.4), 255 * aa);
                    continue;
                }
                if (d > r - 6) {
                    set(x, y, Math.min(255, base[0] + 30), Math.min(255, base[1] + 30), Math.min(255, base[2] + 30), 230 * aa);
                    continue;
                }
                const t = d / (r - 6);
                const lift = Math.max(0, 1 - Math.hypot((x - c * 0.7), (y - c * 0.7)) / r);
                const r0 = Math.round(base[0] * (0.85 + lift * 0.25) - t * 30);
                const g0 = Math.round(base[1] * (0.85 + lift * 0.25) - t * 30);
                const b0 = Math.round(base[2] * (0.85 + lift * 0.25) - t * 30);
                set(x, y, Math.max(0, r0), Math.max(0, g0), Math.max(0, b0), 250 * aa);
            }
        }
    });
}

function makeGlyphFrame(size: number, kind: 'bolt' | 'star' | 'flame'): SpriteFrame {
    return paintFrame(size, (set) => {
        const c = size / 2;
        const stroke = (x0: number, y0: number, x1: number, y1: number, width: number) => {
            const dx = x1 - x0; const dy = y1 - y0;
            const len = Math.hypot(dx, dy);
            const steps = Math.max(1, Math.ceil(len * 2));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const px = x0 + dx * t; const py = y0 + dy * t;
                for (let oy = -width; oy <= width; oy++) {
                    for (let ox = -width; ox <= width; ox++) {
                        const d = Math.hypot(ox, oy);
                        if (d > width) continue;
                        const aa = Math.min(1, width - d + 0.5);
                        set(px + ox, py + oy, 255, 255, 255, 255 * aa);
                    }
                }
            }
        };
        if (kind === 'bolt') {
            stroke(c + size * 0.18, c - size * 0.32, c - size * 0.05, c - size * 0.02, 2.5);
            stroke(c - size * 0.05, c - size * 0.02, c + size * 0.10, c + size * 0.02, 2.5);
            stroke(c + size * 0.10, c + size * 0.02, c - size * 0.18, c + size * 0.32, 2.5);
        } else if (kind === 'star') {
            stroke(c, c - size * 0.32, c, c + size * 0.32, 2.5);
            stroke(c - size * 0.32, c, c + size * 0.32, c, 2.5);
            stroke(c - size * 0.20, c - size * 0.20, c + size * 0.20, c + size * 0.20, 2);
            stroke(c - size * 0.20, c + size * 0.20, c + size * 0.20, c - size * 0.20, 2);
        } else {
            stroke(c, c - size * 0.35, c - size * 0.20, c + size * 0.10, 3);
            stroke(c, c - size * 0.35, c + size * 0.20, c + size * 0.10, 3);
            stroke(c - size * 0.20, c + size * 0.10, c + size * 0.20, c + size * 0.10, 3);
            stroke(c - size * 0.05, c, c + size * 0.05, c + size * 0.18, 2);
        }
    });
}

/**
 * FX 工具贴图: 程序生成 radial alpha mask. CONTRACT §3.4 允许 (非角色美术).
 * Export 给 ActorSpawner 共享 (contact shadow / muzzle cone / fan bullets / sparks / lightning).
 */
export function makeRadialGradientSpriteFrame(
    size: number,
    inner: [number, number, number, number],
    outer: [number, number, number, number],
): SpriteFrame {
    const data = new Uint8Array(size * size * 4);
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxR);
            const i = (y * size + x) * 4;
            data[i] = lerp(inner[0], outer[0], t);
            data[i + 1] = lerp(inner[1], outer[1], t);
            data[i + 2] = lerp(inner[2], outer[2], t);
            data[i + 3] = lerp(inner[3], outer[3], t);
        }
    }
    const image = new ImageAsset({
        width: size,
        height: size,
        _data: data,
        format: Texture2D.PixelFormat.RGBA8888,
        _compressed: false,
    } as any);
    const tex = new Texture2D();
    tex.image = image;
    const frame = new SpriteFrame();
    frame.texture = tex;
    return frame;
}

function lerp(a: number, b: number, t: number): number {
    return Math.round(a + (b - a) * t);
}

export function forceLayerRecursive(node: Node, layer: number) {
    node.layer = layer;
    for (const c of node.children) forceLayerRecursive(c, layer);
}
