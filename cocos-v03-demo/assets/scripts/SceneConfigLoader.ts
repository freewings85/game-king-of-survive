import { JsonAsset, resources } from 'cc';

export type RGBA = [number, number, number, number];
export type RGB = [number, number, number];
export type Vec2 = [number, number];

export interface HeroConfig {
    pos: Vec2;
    angleDeg: number;
    frame: 'idle' | 'shoot';
    contentSize: Vec2;
    shadow: Vec2;
    /** Half-radius for prop circle collision (Leo 05-11: 桶/车/沙袋应该挡路) */
    collideRadius?: number;
}

export type ZombieBodyType = 'riley' | 'clint' | 'runner' | 'brute' | 'crawler';

export interface ZombieConfig {
    name: string;
    pos: Vec2;
    scale: number;
    tint: RGBA;
    frame: 'idle' | 'move' | 'attack';
    /** Defaults to 'riley' if omitted (M2-0 baseline). M2-2A introduces 'clint' as the second silhouette body type. */
    bodyType?: ZombieBodyType;
    baseSize: number;
    shadow: Vec2;
    rotateTowardHero: boolean;
}

export type PropKey =
    | 'wreckTank' | 'barrelRust' | 'sandbag'
    | 'tankGreen' | 'barrelRed' | 'sandbagBeige' | 'oilSplat'
    // M3-Gameplay+: painterly versions (overhead oblique, painterly tier)
    | 'wreckCarPainterly' | 'barrelRustPainterly' | 'sandbagPilePainterly' | 'oilSplatPainterly';
export interface PropConfig {
    name: string;
    key: PropKey;
    pos: Vec2;
    angleDeg: number;
    contentSize: Vec2;
    shadow: Vec2;
    tint: RGBA | null;
    /** >0 means actors are pushed out of this radius (in px) around prop.pos. 0/undefined = pass-through. */
    collideRadius?: number;
}

export interface MuzzleConfig {
    anchor: 'hero';
    distance: number;
    angleDeg: number;
    contentSize: Vec2;
    inner: RGBA;
    outer: RGBA;
    rotateDeg?: number;
    srcSize: number;
}

export interface FanBulletsConfig {
    anchor: 'hero';
    startDistance: number;
    baseDeg: number;
    spread: number[];
    lengthBase: number;
    lengthAltAdd: number;
    contentH: number;
    inner: RGBA;
    outer: RGBA;
}

export interface HitSparksConfig {
    target: Vec2;
    offsets: Array<[number, number, number]>;
    inner: RGBA;
    outer: RGBA;
}

export interface LightningChainConfig {
    nodes: Vec2[];
    segments: number;
    jitterAmp: number;
    boltContentH: number;
    boltInner: RGBA;
    boltOuter: RGBA;
    hubSize: number;
    hubInner: RGBA;
    hubOuter: RGBA;
}

export interface VfxConfig {
    muzzleCone: MuzzleConfig;
    muzzleBurst: MuzzleConfig;
    fanBullets: FanBulletsConfig;
    /** ≥1 hit-spark cluster; M2-1B raises this to 2 simultaneous impact points across body types. */
    hitSparkClusters: HitSparksConfig[];
    lightningChain: LightningChainConfig;
}

export interface DiscConfig {
    pos: Vec2;
    contentSize: Vec2;
    discSize: number;
    fill: RGBA;
    edge: RGBA | null;
    edgeWidth: number;
}

export interface BarConfig {
    pos: Vec2;
    contentSize: Vec2;
    barW: number;
    barH: number;
    fill: RGBA;
    bg: RGBA;
    fillFrac: number;
}

export interface MinimapConfig {
    pos: Vec2;
    contentSize: Vec2;
    size: number;
}

export interface JoystickConfig {
    ring: { pos: Vec2; contentSize: Vec2; size: number; outerR: number; innerR: number; fill: RGBA };
    thumb: DiscConfig;
}

export interface SkillConfig {
    name: string;
    pos: Vec2;
    size: number;
    base: RGB;
    glyph: 'bolt' | 'star' | 'flame';
    glowAlpha: number;
}

export interface HudConfig {
    portrait: { frame: DiscConfig; fill: DiscConfig };
    hpBar: BarConfig;
    armorBar: BarConfig;
    expBar: BarConfig;
    minimap: MinimapConfig;
    joystick: JoystickConfig;
    skills: SkillConfig[];
}

export interface CanvasConfig {
    width: number;
    height: number;
    clearColor: RGBA;
}

export interface SceneConfig {
    canvas: CanvasConfig;
    hero: HeroConfig;
    zombies: ZombieConfig[];
    props: PropConfig[];
    vfx: VfxConfig;
    hud: HudConfig;
}

export const SCENE_CONFIG_PATH = 'config/m2-visual-scene';

export function loadSceneConfig(path: string = SCENE_CONFIG_PATH): Promise<SceneConfig> {
    return new Promise((resolve, reject) => {
        resources.load(path, JsonAsset, (err, asset) => {
            if (err) {
                console.error('[SceneConfigLoader] load fail', path, err);
                reject(err);
                return;
            }
            const cfg = asset.json as SceneConfig;
            if (!cfg || !cfg.hero || !cfg.zombies || !cfg.hud) {
                reject(new Error(`[SceneConfigLoader] malformed config at ${path}`));
                return;
            }
            resolve(cfg);
        });
    });
}

export function resolveAnchorPos(anchor: 'hero', distance: number, angleDeg: number, hero: Vec2): Vec2 {
    const rad = (angleDeg * Math.PI) / 180;
    return [hero[0] + Math.cos(rad) * distance, hero[1] + Math.sin(rad) * distance];
}
