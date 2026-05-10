import {
    Color,
    ImageAsset,
    Node,
    Sprite,
    SpriteFrame,
    Texture2D,
    UITransform,
    Vec3,
} from 'cc';

/**
 * 程序化末日地表 (CONTRACT §3.4 工具贴图, 非角色美术).
 * 暗灰沥青基调 + 裂纹 + 污渍 + 锈红 / 烧痕图层. 512² tile, 平铺覆盖 ortho 视口.
 */

interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

// M1b: mid-tone 提亮一档 (BASE +16, DARK +8), Riley 轮廓不再被地面吞
const ASPHALT_BASE: RGBA = { r: 48, g: 52, b: 56, a: 255 };
const ASPHALT_DARK: RGBA = { r: 26, g: 28, b: 32, a: 255 };
const CRACK: RGBA = { r: 8, g: 8, b: 10, a: 220 };
const STAIN: RGBA = { r: 24, g: 18, b: 14, a: 180 };
const RUST: RGBA = { r: 80, g: 38, b: 22, a: 130 };
const BURN: RGBA = { r: 14, g: 10, b: 8, a: 200 };

export function attachWastelandTerrain(parent: Node, viewportWidth: number, viewportHeight: number, painterlyTile?: SpriteFrame | null): Node {
    // Painterly tile from brick #7 (256px tileable). Falls back to programmatic 512 tile.
    const tile = painterlyTile ?? generateTile(512, Date.now() & 0xffff);
    const tileSize = painterlyTile ? 256 : 512;

    const root = new Node('WastelandTerrain');
    parent.addChild(root);

    // 平铺覆盖 viewport (留 1 tile buffer 应对相机微抖)
    const cols = Math.ceil(viewportWidth / tileSize) + 1;
    const rows = Math.ceil(viewportHeight / tileSize) + 1;
    const startX = -((cols - 1) * tileSize) / 2;
    const startY = -((rows - 1) * tileSize) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const node = new Node(`tile_${r}_${c}`);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = tile;
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(tileSize, tileSize);
            node.setPosition(new Vec3(startX + c * tileSize, startY + r * tileSize, -10));
            // 相邻 tile 旋转/翻转打破重复感
            const flip = ((r * 31 + c * 17) & 3);
            node.setRotationFromEuler(0, 0, flip * 90);
            root.addChild(node);
        }
    }

    return root;
}

function generateTile(size: number, seed: number): SpriteFrame {
    const data = new Uint8Array(size * size * 4);
    const rand = mulberry32(seed);

    // Layer 1: 暗灰沥青基调 + per-pixel noise
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const n = rand();
            const t = 0.55 + n * 0.45;
            const c = lerpRGBA(ASPHALT_DARK, ASPHALT_BASE, t);
            data[i] = c.r;
            data[i + 1] = c.g;
            data[i + 2] = c.b;
            data[i + 3] = c.a;
        }
    }

    // Layer 2: 裂纹 (8-12 条 wandering line, 黑色)
    const cracks = 10 + Math.floor(rand() * 4);
    for (let k = 0; k < cracks; k++) {
        let x = rand() * size;
        let y = rand() * size;
        const len = 60 + Math.floor(rand() * 200);
        let dx = (rand() - 0.5) * 2;
        let dy = (rand() - 0.5) * 2;
        for (let s = 0; s < len; s++) {
            blendPixel(data, size, x | 0, y | 0, CRACK, 0.9);
            // 裂纹边缘羽化
            blendPixel(data, size, (x + 1) | 0, y | 0, CRACK, 0.4);
            blendPixel(data, size, x | 0, (y + 1) | 0, CRACK, 0.4);
            x += dx;
            y += dy;
            // 偶尔抖动方向
            if (rand() < 0.08) {
                dx += (rand() - 0.5) * 0.6;
                dy += (rand() - 0.5) * 0.6;
            }
        }
    }

    // Layer 3: 污渍 (大块 soft blob, 暗棕)
    const stains = 6 + Math.floor(rand() * 4);
    for (let k = 0; k < stains; k++) {
        const cx = rand() * size;
        const cy = rand() * size;
        const radius = 30 + rand() * 80;
        splat(data, size, cx, cy, radius, STAIN, 0.55);
    }

    // Layer 4: 锈红斑 (小块, 偏红)
    const rusts = 4 + Math.floor(rand() * 4);
    for (let k = 0; k < rusts; k++) {
        const cx = rand() * size;
        const cy = rand() * size;
        const radius = 18 + rand() * 36;
        splat(data, size, cx, cy, radius, RUST, 0.45);
    }

    // Layer 5: 烧痕 (1-3 个大焦黑圆斑 + 中心更深)
    const burns = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < burns; k++) {
        const cx = rand() * size;
        const cy = rand() * size;
        const radius = 60 + rand() * 80;
        splat(data, size, cx, cy, radius, BURN, 0.7);
    }

    return makeSpriteFrame(size, data);
}

function blendPixel(data: Uint8Array, size: number, x: number, y: number, c: RGBA, alpha: number) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    const a = alpha * (c.a / 255);
    data[i] = Math.round(data[i] * (1 - a) + c.r * a);
    data[i + 1] = Math.round(data[i + 1] * (1 - a) + c.g * a);
    data[i + 2] = Math.round(data[i + 2] * (1 - a) + c.b * a);
    // alpha 保持 base 255 (地表完全不透)
}

function splat(data: Uint8Array, size: number, cx: number, cy: number, radius: number, c: RGBA, peak: number) {
    const r2 = radius * radius;
    const xMin = Math.max(0, Math.floor(cx - radius));
    const xMax = Math.min(size, Math.ceil(cx + radius));
    const yMin = Math.max(0, Math.floor(cy - radius));
    const yMax = Math.min(size, Math.ceil(cy + radius));
    for (let y = yMin; y < yMax; y++) {
        for (let x = xMin; x < xMax; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 > r2) continue;
            const t = 1 - d2 / r2;
            const a = peak * t * t; // soft falloff
            blendPixel(data, size, x, y, c, a);
        }
    }
}

function lerpRGBA(a: RGBA, b: RGBA, t: number): RGBA {
    return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
        a: Math.round(a.a + (b.a - a.a) * t),
    };
}

function makeSpriteFrame(size: number, data: Uint8Array): SpriteFrame {
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

function mulberry32(a: number): () => number {
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
