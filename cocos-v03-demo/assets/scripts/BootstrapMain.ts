import {
    _decorator,
    Camera,
    Color,
    Component,
    director,
    ImageAsset,
    Node,
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
        this.applyRenderBudget();
        const layers = this.buildSceneGraph();
        this.worldLayer = layers.worldLayer;
        this.fxLayer = layers.fxLayer;
        this.hudLayer = layers.hudLayer;
    }

    async start() {
        const config = await loadSceneConfig();
        this.applyClearColor(config);
        attachWastelandTerrain(this.worldLayer, config.canvas.width, config.canvas.height);

        const spawner = this.node.addComponent(ActorSpawner);
        spawner.worldLayer = this.worldLayer;
        spawner.fxLayer = this.fxLayer;
        spawner.makeRadialAlpha = makeRadialGradientSpriteFrame;
        spawner.config = config;

        attachHudSkeleton(this.hudLayer, config);
    }

    private applyRenderBudget() {
        view.setResolutionPolicy(4);
        view.setDesignResolutionSize(this.targetWidth, this.targetHeight, 4);
        const dpr = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio);
        view.setDevicePixelRatio?.(dpr);
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
        scene.addChild(root);

        const cameraNode = new Node('MainCamera');
        const camera = cameraNode.addComponent(Camera);
        camera.projection = Camera.ProjectionType.ORTHO;
        camera.orthoHeight = this.targetHeight / 2;
        camera.clearColor = new Color(10, 12, 14, 255);
        cameraNode.setPosition(0, 0, 1000);
        root.addChild(cameraNode);

        const worldLayer = new Node('World');
        const fxLayer = new Node('FX');
        const hudLayer = new Node('HUD');
        root.addChild(worldLayer);
        root.addChild(fxLayer);
        root.addChild(hudLayer);
        return { worldLayer, fxLayer, hudLayer };
    }
}

function attachHudSkeleton(parent: Node, config: SceneConfig) {
    const hud: HudConfig = config.hud;

    paintDisc(parent, 'HUD_Portrait_Frame', hud.portrait.frame);
    paintDisc(parent, 'HUD_Portrait_Fill', hud.portrait.fill);
    paintBar(parent, 'HUD_HP_Bar', hud.hpBar);
    paintBar(parent, 'HUD_Armor_Bar', hud.armorBar);
    paintBar(parent, 'HUD_EXP_Bar', hud.expBar);
    paintMinimap(parent, hud.minimap);
    paintJoystick(parent, hud.joystick);
    for (const sk of hud.skills) paintSkill(parent, sk);
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

function paintSkill(parent: Node, sk: SkillConfig) {
    addSprite(parent, sk.name + '_Glow', sk.pos[0], sk.pos[1], sk.size + 16, sk.size + 16,
        makeRadialGradientSpriteFrame(64, [sk.base[0], sk.base[1], sk.base[2], sk.glowAlpha], [sk.base[0], sk.base[1], sk.base[2], 0]));
    addSprite(parent, sk.name + '_Disc', sk.pos[0], sk.pos[1], sk.size, sk.size,
        makeSkillDisc(96, sk.base));
    const glyphSize = Math.floor(sk.size * 0.55);
    addSprite(parent, sk.name + '_Glyph', sk.pos[0], sk.pos[1], glyphSize, glyphSize,
        makeGlyphFrame(64, sk.glyph));
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
