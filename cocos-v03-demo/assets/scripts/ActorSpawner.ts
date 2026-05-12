import {
    _decorator,
    Color,
    Component,
    EventKeyboard,
    EventTouch,
    Input,
    KeyCode,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2 as CcVec2,
    Vec3,
    input,
    resources,
} from 'cc';
import { forceLayerRecursive } from './BootstrapMain';
import { NetClient, GameStateSnapshot, EnemySnapshot, ProjectileSnapshot } from './NetClient';

interface ZombieEntity {
    node: Node;
    sprite: Sprite;
    hp: number;
    maxHp: number;
    speed: number;
    bodyType: ZombieBodyType;
    scale: number;
    baseSize: number;
    baseColor: Color;
    hitFlashTimer: number;
    deathTimer: number; // -1 = alive, >=0 = dying (counting up to fade duration)
    hpBarFill: Node | null;
    hpBarBg: Node | null;
    currentFrame: 'idle' | 'move' | 'attack';
    facingLeft: boolean;
    bobPhase: number;
    attackPhase: number; // 0..1 lunge cycle when within range
}

interface BulletEntity {
    node: Node;
    vx: number;
    vy: number;
    ttl: number;
}
import {
    SceneConfig,
    HeroConfig,
    ZombieConfig,
    ZombieBodyType,
    PropConfig,
    PropKey,
    MuzzleConfig,
    FanBulletsConfig,
    HitSparksConfig,
    LightningChainConfig,
    RGBA,
    Vec2,
    resolveAnchorPos,
} from './SceneConfigLoader';

const ZOMBIE_PACK_PATHS: Record<ZombieBodyType, Record<ZombieConfig['frame'], string>> = {
    'riley': {
        idle:   'art/v03/zombie/zombie-idle',
        move:   'art/v03/zombie/zombie-move',
        attack: 'art/v03/zombie/zombie-attack',
    },
    'clint': {
        idle:   'art/v03/zombie2/clint-idle',
        move:   'art/v03/zombie2/clint-move',
        attack: 'art/v03/zombie2/clint-attack',
    },
    // M3-Gameplay+ painterly baseline. Brick #6 produces *-attack; brick #6+ would
    // produce *-walk. Until those land, resources.load fails gracefully and the
    // frame falls back to idle in spawnZombies.
    'runner': {
        idle:   'art/v03/zombie/runner-idle',
        move:   'art/v03/zombie/runner-idle',
        attack: 'art/v03/zombie/runner-attack',
    },
    'brute': {
        idle:   'art/v03/zombie/brute-idle',
        move:   'art/v03/zombie/brute-idle',
        attack: 'art/v03/zombie/brute-attack',
    },
    'crawler': {
        idle:   'art/v03/zombie/crawler-idle',
        move:   'art/v03/zombie/crawler-idle',
        attack: 'art/v03/zombie/crawler-attack',
    },
};

const { ccclass } = _decorator;

@ccclass('ActorSpawner')
export class ActorSpawner extends Component {
    public worldLayer!: Node;
    public fxLayer!: Node;
    public makeRadialAlpha!: (size: number, inner: RGBA, outer: RGBA) => SpriteFrame;
    public config!: SceneConfig;

    private heroFrames: Record<string, SpriteFrame | null> = { idle: null, shoot: null, walk: null, walk2: null };
    private heroShootFlash = 0;
    private zombieFrames: Map<string, SpriteFrame> = new Map(); // key = `${bodyType}:${frame}`
    private propFrames: Map<PropKey, SpriteFrame> = new Map();

    // === gameplay state ===
    private heroNode: Node | null = null;
    private heroSprite: Sprite | null = null;
    private heroFacingLeft = false;
    private heroBobPhase = 0;
    private heroLastHop = 0;
    private heroHpFill: Node | null = null;
    private heroHp = 100;
    private readonly HERO_MAX_HP = 100;
    private heroIFrameTimer = 0;            // post-hit invincibility
    private readonly HERO_IFRAME = 0.6;
    private readonly HERO_TOUCH_DAMAGE = 12;
    private shakeAmp = 0;                   // current screen shake amplitude
    private readonly HERO_SPEED = 220;        // px/sec
    private readonly HERO_SCREEN_HALF_W = 195;
    private readonly HERO_SCREEN_HALF_H = 422;
    private zombies: ZombieEntity[] = [];
    private bullets: BulletEntity[] = [];
    private joystickDir = new CcVec2(0, 0);     // normalized [-1,1] direction
    private keyDir = new CcVec2(0, 0);
    private heroFireTimer = 0;
    private readonly FIRE_INTERVAL = 0.28;    // sec
    private readonly BULLET_SPEED = 720;
    private readonly BULLET_DAMAGE = 28;
    private readonly BULLET_TTL = 1.4;
    private readonly ZOMBIE_HIT_RADIUS = 36;
    private spawnTimer = 0;
    private readonly SPAWN_INTERVAL = 1.2;
    private waveStartTime = 0;
    private waveNumber = 1;
    private kills = 0;
    private heroDeathTimer = 0;             // counts up after HP=0 for respawn delay
    private readonly RESPAWN_DELAY = 4;
    private bulletFrame: SpriteFrame | null = null;
    private touchAnchor: CcVec2 | null = null;
    private touchId: number | null = null;
    private readonly JOYSTICK_RADIUS = 80;

    // === network mode (B轨 — Java server authoritative) ===
    // null = local sim (default). non-null = follow server snapshots.
    private netClient: NetClient | null = null;
    private serverEnemies = new Map<string, ZombieEntity>();
    private serverPlayerId: string | null = null;
    private serverProjectiles = new Map<string, Node>();

    // === minimap dynamic dots (A轨) ===
    private minimapContainer: Node | null = null;
    private minimapRadius = 0;
    private minimapHeroDot: Node | null = null;
    private minimapEnemyDots: Node[] = [];

    // === prop circle blockers (Leo 05-11: 桶/车/沙袋挡路) ===
    private propBlocks: { x: number; y: number; r: number }[] = [];
    private heroCollideR = 14;

    private static readonly PROP_PATHS: Record<PropKey, string> = {
        wreckTank:    'art/v03/props/wreck-tank',
        barrelRust:   'art/v03/props/barrel-rust',
        sandbag:      'art/v03/props/sandbag',
        tankGreen:    'art/v03/props/tank-green',
        barrelRed:    'art/v03/props/barrel-red',
        sandbagBeige: 'art/v03/props/sandbag-beige',
        oilSplat:     'art/v03/props/oil-splat',
        // M3-Gameplay+ painterly versions
        wreckCarPainterly:    'art/v03/props/wreck-car-painterly',
        barrelRustPainterly:  'art/v03/props/barrel-rust-painterly',
        sandbagPilePainterly: 'art/v03/props/sandbag-pile-painterly',
        oilSplatPainterly:    'art/v03/props/oil-splat-painterly',
    };

    async start() {
        try {
            console.log('[ActorSpawner] start() begin');
            if (!this.config) {
                throw new Error('[ActorSpawner] config not injected — caller must set .config before adding the component');
            }
            console.log('[ActorSpawner] loading frames...');
            await this.loadAllFrames();
            console.log('[ActorSpawner] frames loaded, spawning...');
            this.spawnProps(this.config.props);
            this.spawnHero(this.config.hero);
            this.spawnZombies(this.config.zombies, this.config.hero.pos);
            this.spawnMuzzle(this.config.vfx.muzzleCone, this.config.hero.pos, 'MuzzleCone');
            this.spawnMuzzle(this.config.vfx.muzzleBurst, this.config.hero.pos, 'MuzzleBurst');
            this.spawnFanBullets(this.config.vfx.fanBullets, this.config.hero.pos);
            for (let i = 0; i < this.config.vfx.hitSparkClusters.length; i++) {
                this.spawnHitSparks(this.config.vfx.hitSparkClusters[i], i);
            }
            this.spawnLightningChain(this.config.vfx.lightningChain);
            // force every spawned descendant to UI_2D so the camera sees them
            forceLayerRecursive(this.worldLayer, Layers.Enum.UI_2D);
            forceLayerRecursive(this.fxLayer, Layers.Enum.UI_2D);
            const hudLayer = this.worldLayer.parent?.getChildByName('HUD');
            if (hudLayer) forceLayerRecursive(hudLayer, Layers.Enum.UI_2D);
            console.log('[ActorSpawner] start() done, all layers forced UI_2D');
        } catch (e) {
            console.error('[ActorSpawner] start() FAILED', e);
        }
    }

    private async loadAllFrames(): Promise<void> {
        const paths: Array<[string, (sf: SpriteFrame) => void]> = [
            // M2-X+ painterly baseline: hero v2 from ZombieArtist (overhead oblique view, painterly tier)
            ['art/v03/hero/survivor-idle-v2/spriteFrame', (sf) => (this.heroFrames.idle = sf)],
            ['art/v03/hero/survivor-shoot-v2/spriteFrame', (sf) => (this.heroFrames.shoot = sf)],
            ['art/v03/hero/survivor-walk-v2/spriteFrame', (sf) => (this.heroFrames.walk = sf)],
            ['art/v03/hero/survivor-walk2/spriteFrame', (sf) => (this.heroFrames.walk2 = sf)],
        ];

        const referencedPropKeys = new Set<PropKey>();
        for (const p of this.config.props) referencedPropKeys.add(p.key);
        for (const key of referencedPropKeys) {
            const path = ActorSpawner.PROP_PATHS[key];
            if (!path) throw new Error(`[ActorSpawner] no sprite path for prop key ${key}`);
            paths.push([`${path}/spriteFrame`, (sf) => this.propFrames.set(key, sf)]);
        }

        // Only load zombie packs / frames the config actually references — avoids
        // dragging clint sprites into builds that haven't enabled the silhouette gate yet.
        const referencedZombieKeys = new Set<string>();
        for (const z of this.config.zombies) {
            const bodyType: ZombieBodyType = z.bodyType ?? 'riley';
            referencedZombieKeys.add(`${bodyType}:${z.frame}`);
        }
        for (const key of referencedZombieKeys) {
            const [bodyType, frame] = key.split(':') as [ZombieBodyType, ZombieConfig['frame']];
            const path = ZOMBIE_PACK_PATHS[bodyType]?.[frame];
            if (!path) throw new Error(`[ActorSpawner] no sprite path for zombie ${key}`);
            paths.push([`${path}/spriteFrame`, (sf) => this.zombieFrames.set(key, sf)]);
        }
        await Promise.all(
            paths.map(
                ([p, assign]) =>
                    new Promise<void>((resolve) => {
                        resources.load(p, SpriteFrame, (err, sf) => {
                            if (err) {
                                // Tolerate missing optional frames (e.g. brick #6 attack
                                // before delivery). spawnZombies falls back to idle.
                                console.warn('[ActorSpawner] load skip:', p);
                                resolve();
                                return;
                            }
                            (sf as any).packable = false;
                            assign(sf);
                            resolve();
                        });
                    }),
            ),
        );
    }

    private spawnProps(props: PropConfig[]) {
        for (const p of props) {
            this.spawnContactShadow(p.pos, p.shadow[0], p.shadow[1], p.contentSize[1]);
            const node = new Node(p.name);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.propFrames.get(p.key) ?? null;
            if (p.tint) sprite.color = new Color(p.tint[0], p.tint[1], p.tint[2], p.tint[3]);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(p.contentSize[0], p.contentSize[1]);
            node.setPosition(new Vec3(p.pos[0], p.pos[1], 0));
            node.angle = p.angleDeg;
            this.worldLayer.addChild(node);
            const r = p.collideRadius ?? 0;
            if (r > 0) this.propBlocks.push({ x: p.pos[0], y: p.pos[1], r });
        }
    }

    private spawnHero(hero: HeroConfig) {
        this.spawnContactShadow(hero.pos, hero.shadow[0], hero.shadow[1], hero.contentSize[1]);
        if (hero.collideRadius && hero.collideRadius > 0) this.heroCollideR = hero.collideRadius;
        const node = new Node('Hero');
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = (hero.frame === 'shoot' ? this.heroFrames.shoot : this.heroFrames.idle) ?? this.heroFrames.idle;
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(hero.contentSize[0], hero.contentSize[1]);
        node.setPosition(new Vec3(hero.pos[0], hero.pos[1], 0));
        node.angle = hero.angleDeg;
        this.worldLayer.addChild(node);
        this.heroNode = node;
        this.heroSprite = sprite;
        this.heroHp = this.HERO_MAX_HP;

        // Hero HP indicator above head (green bar, slightly larger than zombie's)
        const hpBg = new Node('HeroHPBg');
        hpBg.layer = Layers.Enum.UI_2D;
        const hpBgSp = hpBg.addComponent(Sprite);
        hpBgSp.spriteFrame = this.makeRadialAlpha(8, [255, 255, 255, 255], [255, 255, 255, 255]);
        hpBgSp.color = new Color(20, 20, 20, 220);
        const hpBgTr = hpBg.addComponent(UITransform);
        hpBgTr.setContentSize(64, 6);
        hpBg.setPosition(0, hero.contentSize[1] * 0.55, 0);
        node.addChild(hpBg);

        const hpFill = new Node('HeroHPFill');
        hpFill.layer = Layers.Enum.UI_2D;
        const hpFillSp = hpFill.addComponent(Sprite);
        hpFillSp.spriteFrame = this.makeRadialAlpha(8, [255, 255, 255, 255], [255, 255, 255, 255]);
        hpFillSp.color = new Color(80, 220, 100, 255);
        const hpFillTr = hpFill.addComponent(UITransform);
        hpFillTr.setContentSize(64, 6);
        hpFill.setPosition(0, hero.contentSize[1] * 0.55, 0);
        node.addChild(hpFill);
        this.heroHpFill = hpFill;
    }

    private spawnZombies(zombies: ZombieConfig[], heroPos: Vec2) {
        for (const z of zombies) {
            const angleDeg = z.rotateTowardHero
                ? (Math.atan2(heroPos[1] - z.pos[1], heroPos[0] - z.pos[0]) * 180) / Math.PI
                : 0;

            this.spawnContactShadow(z.pos, Math.floor(z.shadow[0] * z.scale), Math.floor(z.shadow[1] * z.scale), Math.floor(z.baseSize * z.scale));

            const node = new Node(z.name);
            node.layer = Layers.Enum.UI_2D;
            const sprite = node.addComponent(Sprite);
            const bodyType: ZombieBodyType = z.bodyType ?? 'riley';
            // Use requested frame if available, else fall back to idle
            sprite.spriteFrame =
                this.zombieFrames.get(`${bodyType}:${z.frame}`)
                ?? this.zombieFrames.get(`${bodyType}:idle`)
                ?? null;
            const baseColor = new Color(z.tint[0], z.tint[1], z.tint[2], z.tint[3]);
            sprite.color = baseColor;
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            const baseSize = Math.floor(z.baseSize * z.scale);
            tr.setContentSize(baseSize, baseSize);
            node.setPosition(new Vec3(z.pos[0], z.pos[1], 0));
            // 3/4 view sprites must not rotate (would go upside-down). Heading handled by flipX in update.
            node.angle = 0;
            void angleDeg;
            this.worldLayer.addChild(node);
            // HP bar above zombie
            const hpBarBg = this.makeHpBar(baseSize, false);
            const hpBarFill = this.makeHpBar(baseSize, true);
            const yOff = baseSize * 0.55;
            hpBarBg.setPosition(0, yOff, 0);
            hpBarFill.setPosition(0, yOff, 0);
            node.addChild(hpBarBg);
            node.addChild(hpBarFill);
            // register entity for gameplay update
            const speedByType: Record<ZombieBodyType, number> = {
                riley: 60, clint: 60, runner: 90, brute: 40, crawler: 55,
            };
            const hpByType: Record<ZombieBodyType, number> = {
                riley: 80, clint: 80, runner: 60, brute: 160, crawler: 80,
            };
            this.zombies.push({
                node,
                sprite,
                hp: hpByType[bodyType],
                maxHp: hpByType[bodyType],
                speed: speedByType[bodyType],
                bodyType,
                scale: z.scale,
                baseSize: z.baseSize,
                baseColor,
                hitFlashTimer: 0,
                deathTimer: -1,
                hpBarFill,
                hpBarBg,
                currentFrame: z.frame,
                facingLeft: false,
                bobPhase: Math.random() * Math.PI * 2,
                attackPhase: 0,
            });
        }
    }

    private makeHpBar(zombieSize: number, isFill: boolean): Node {
        const node = new Node(isFill ? 'HPBarFill' : 'HPBarBg');
        node.layer = Layers.Enum.UI_2D;
        const sp = node.addComponent(Sprite);
        sp.spriteFrame = this.makeRadialAlpha(8, [255, 255, 255, 255], [255, 255, 255, 255]);
        sp.color = isFill ? new Color(220, 60, 60, 255) : new Color(20, 20, 20, 200);
        const tr = node.addComponent(UITransform);
        const w = Math.max(36, Math.floor(zombieSize * 0.5));
        tr.setContentSize(w, 5);
        return node;
    }

    /**
     * Push (x,y) outside every prop blocker by min-translation. Actors carry an
     * effective collision radius `actorR`. Returns nearest non-overlapping point.
     * Leo 05-11: 桶/车/沙袋应该挡路, 不能穿过. 多个 prop 重叠时迭代两次足够稳定.
     */
    private resolveBlockers(x: number, y: number, actorR: number): { x: number; y: number } {
        if (this.propBlocks.length === 0) return { x, y };
        for (let iter = 0; iter < 2; iter++) {
            let moved = false;
            for (const b of this.propBlocks) {
                const dx = x - b.x;
                const dy = y - b.y;
                const min = b.r + actorR;
                const d2 = dx * dx + dy * dy;
                if (d2 >= min * min) continue;
                const d = Math.max(0.001, Math.sqrt(d2));
                const push = (min - d) / d;
                x += dx * push;
                y += dy * push;
                moved = true;
            }
            if (!moved) break;
        }
        return { x, y };
    }

    private spawnContactShadow(pos: Vec2, w: number, h: number, spriteH = 0) {
        if (w <= 0 || h <= 0) return;
        const node = new Node('ContactShadow');
        node.layer = Layers.Enum.UI_2D;
        const sprite = node.addComponent(Sprite);
        // Darker shadow (alpha 235) + wide fade so it actually anchors the actor.
        // Leo 05-11: actor 不能"飘"在地图上 → 阴影要明显 + 在脚底.
        sprite.spriteFrame = this.makeRadialAlpha(128, [0, 0, 0, 235], [0, 0, 0, 0]);
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(w, h);
        // Offset shadow to feet (bottom of sprite), not actor center.
        const yOffset = spriteH > 0 ? -spriteH * 0.4 : -6;
        node.setPosition(new Vec3(pos[0], pos[1] + yOffset, -1));
        this.worldLayer.addChild(node);
    }

    private spawnMuzzle(cfg: MuzzleConfig, heroPos: Vec2, nodeName: string) {
        const node = new Node(nodeName);
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.makeRadialAlpha(cfg.srcSize, cfg.inner, cfg.outer);
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(cfg.contentSize[0], cfg.contentSize[1]);
        const [x, y] = resolveAnchorPos(cfg.anchor, cfg.distance, cfg.angleDeg, heroPos);
        node.setPosition(new Vec3(x, y, 0));
        if (cfg.rotateDeg !== undefined) node.angle = cfg.rotateDeg;
        this.fxLayer.addChild(node);
    }

    private spawnFanBullets(cfg: FanBulletsConfig, heroPos: Vec2) {
        const startRad = (cfg.baseDeg * Math.PI) / 180;
        const startX = heroPos[0] + Math.cos(startRad) * cfg.startDistance;
        const startY = heroPos[1] + Math.sin(startRad) * cfg.startDistance;
        for (let i = 0; i < cfg.spread.length; i++) {
            const ang = cfg.baseDeg + cfg.spread[i];
            const rad = (ang * Math.PI) / 180;
            const len = cfg.lengthBase + (i % 2 === 0 ? cfg.lengthAltAdd : 0);
            const cx = startX + Math.cos(rad) * (len / 2);
            const cy = startY + Math.sin(rad) * (len / 2);

            const node = new Node(`Bullet_${i}`);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(128, cfg.inner, cfg.outer);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(len, cfg.contentH);
            node.setPosition(new Vec3(cx, cy, 0));
            node.angle = ang;
            this.fxLayer.addChild(node);
        }
    }

    private spawnHitSparks(cfg: HitSparksConfig, clusterIdx: number) {
        const [tx, ty] = cfg.target;
        for (let i = 0; i < cfg.offsets.length; i++) {
            const [ox, oy, sz] = cfg.offsets[i];
            const node = new Node(`Spark_${clusterIdx}_${i}`);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(64, cfg.inner, cfg.outer);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(sz * 2, sz * 2);
            node.setPosition(new Vec3(tx + ox, ty + oy, 0));
            this.fxLayer.addChild(node);
        }
    }

    private spawnLightningChain(cfg: LightningChainConfig) {
        for (let i = 0; i < cfg.nodes.length - 1; i++) {
            this.drawLightningSegment(cfg.nodes[i], cfg.nodes[i + 1], cfg, i);
        }
        for (let i = 0; i < cfg.nodes.length; i++) {
            const [hx, hy] = cfg.nodes[i];
            const hub = new Node(`LightningHub_${i}`);
            const sprite = hub.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(64, cfg.hubInner, cfg.hubOuter);
            const tr = hub.getComponent(UITransform) ?? hub.addComponent(UITransform);
            tr.setContentSize(cfg.hubSize, cfg.hubSize);
            hub.setPosition(new Vec3(hx, hy, 0));
            this.fxLayer.addChild(hub);
        }
    }

    private drawLightningSegment(from: Vec2, to: Vec2, cfg: LightningChainConfig, segIdx: number) {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const len = Math.hypot(dx, dy);
        const nx = -dy / len;
        const ny = dx / len;
        let prev: Vec2 = [from[0], from[1]];
        for (let s = 1; s <= cfg.segments; s++) {
            const t = s / cfg.segments;
            const baseX = from[0] + dx * t;
            const baseY = from[1] + dy * t;
            const jitter = s === cfg.segments ? 0 : Math.sin(s * 13 + segIdx * 3) * cfg.jitterAmp;
            const px = baseX + nx * jitter;
            const py = baseY + ny * jitter;

            const segLen = Math.hypot(px - prev[0], py - prev[1]);
            const segAng = (Math.atan2(py - prev[1], px - prev[0]) * 180) / Math.PI;
            const cx = (px + prev[0]) / 2;
            const cy = (py + prev[1]) / 2;

            const bolt = new Node(`Bolt_${segIdx}_${s}`);
            const sprite = bolt.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(64, cfg.boltInner, cfg.boltOuter);
            const tr = bolt.getComponent(UITransform) ?? bolt.addComponent(UITransform);
            tr.setContentSize(segLen, cfg.boltContentH);
            bolt.setPosition(new Vec3(cx, cy, 0));
            bolt.angle = segAng;
            this.fxLayer.addChild(bolt);

            prev = [px, py];
        }
    }

    // =========================================================================
    // Gameplay loop (M3-Gameplay phase 1: minimal playable survivor.io style)
    // =========================================================================

    onLoad() {
        // touch + keyboard input setup
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number) {
        if (!this.heroNode || !this.config) return;
        if (this.netClient && this.netClient.isConnected()) {
            // Network mode: server is authoritative. We only send our input;
            // hero/zombie positions arrive via onSnapshot.
            const dx = this.joystickDir.x + this.keyDir.x;
            const dy = this.joystickDir.y + this.keyDir.y;
            const m = Math.hypot(dx, dy);
            const nx = m > 1 ? dx / m : dx;
            const ny = m > 1 ? dy / m : dy;
            this.netClient.sendInput(nx, ny);
            // Death-fade animation still ticks for visuals; movement does not.
            this.tickDeathFadesOnly(dt);
            return;
        }
        // Local sim path
        this.updateHero(dt);
        this.updateZombies(dt);
        this.updateAutoFire(dt);
        this.updateBullets(dt);
        this.updateSpawn(dt);
        this.updateHeroDamage(dt);
        this.updateShake(dt);
        this.updateMinimap();
    }

    private updateHeroDamage(dt: number) {
        if (!this.heroNode) return;
        // Update HP bar each frame so heal/regen would also reflect immediately
        if (this.heroHpFill) {
            const ratio = Math.max(0, this.heroHp / this.HERO_MAX_HP);
            this.heroHpFill.setScale(ratio, 1, 1);
        }
        if (this.heroHp <= 0) {
            // Death + respawn: count down, then heal back at center
            this.heroDeathTimer += dt;
            if (this.heroSprite) {
                const fadeAlpha = Math.max(60, 255 - Math.floor(this.heroDeathTimer * 80));
                this.heroSprite.color = new Color(150, 150, 150, fadeAlpha);
            }
            if (this.heroDeathTimer >= this.RESPAWN_DELAY) {
                this.heroHp = this.HERO_MAX_HP;
                this.heroDeathTimer = 0;
                this.heroIFrameTimer = this.HERO_IFRAME * 2;
                this.heroNode.setPosition(0, 0, 0);
                if (this.heroSprite) this.heroSprite.color = new Color(255, 255, 255, 255);
                console.log('[Hero] respawn at center');
            }
            return;
        }
        if (this.heroIFrameTimer > 0) {
            this.heroIFrameTimer -= dt;
            // blink: alternate visibility every 80ms during iframe
            if (this.heroSprite) {
                const blink = Math.floor(this.heroIFrameTimer * 12) % 2 === 0;
                this.heroSprite.color = blink
                    ? new Color(255, 255, 255, 255)
                    : new Color(255, 100, 100, 200);
            }
            return;
        }
        // restore color when iframe expires
        if (this.heroSprite) this.heroSprite.color = new Color(255, 255, 255, 255);
        // contact-damage check
        const hp = this.heroNode.position;
        const HIT_R = 32;
        for (const z of this.zombies) {
            if (z.deathTimer >= 0 || z.hp <= 0) continue;
            const dx = z.node.position.x - hp.x;
            const dy = z.node.position.y - hp.y;
            if (dx * dx + dy * dy < HIT_R * HIT_R) {
                this.heroHp = Math.max(0, this.heroHp - this.HERO_TOUCH_DAMAGE);
                this.heroIFrameTimer = this.HERO_IFRAME;
                this.shakeAmp = 12;
                console.log('[Hero] hit, HP:', this.heroHp);
                if (this.heroHp <= 0) console.log('[Hero] DOWN');
                break;
            }
        }
    }

    private updateShake(dt: number) {
        if (this.shakeAmp <= 0.1) {
            this.shakeAmp = 0;
            // reset world layer position
            if (this.worldLayer) this.worldLayer.setPosition(0, 0, 0);
            return;
        }
        const ox = (Math.random() - 0.5) * 2 * this.shakeAmp;
        const oy = (Math.random() - 0.5) * 2 * this.shakeAmp;
        if (this.worldLayer) this.worldLayer.setPosition(ox, oy, 0);
        this.shakeAmp *= Math.exp(-dt * 6); // decay ~6/sec
    }

    // ----- network-mode helpers -----

    /** Enable network mode. Call from BootstrapMain when server URL is configured. */
    public enableNetwork(serverUrl: string, playerId: string, playerName?: string): Promise<void> {
        const client = new NetClient(serverUrl, playerId, playerName);
        client.setHandlers({
            onConnect: () => console.log('[ActorSpawner] net connected'),
            onDisconnect: (c, r) => console.log('[ActorSpawner] net disconnected', c, r),
            onSnapshot: (snap) => this.applySnapshot(snap),
            onError: (e) => console.warn('[ActorSpawner] net err', e),
        });
        this.netClient = client;
        this.serverPlayerId = playerId;
        return client.connect();
    }

    /** Apply server snapshot: sync hero pos + zombie pool. */
    private applySnapshot(snap: GameStateSnapshot) {
        if (!this.heroNode || !this.serverPlayerId) return;
        // Hero pos from local player snapshot
        const me = snap.players.find((p) => p.id === this.serverPlayerId);
        if (me) {
            this.heroNode.setPosition(me.x, me.y, 0);
        }
        // Reconcile enemies: add new, update existing, remove gone
        const seen = new Set<string>();
        for (const e of snap.enemies) {
            seen.add(e.id);
            let z = this.serverEnemies.get(e.id);
            if (!z) {
                z = this.createServerZombie(e);
                this.serverEnemies.set(e.id, z);
                this.zombies.push(z);
            }
            z.node.setPosition(e.x, e.y, 0);
            z.hp = e.hp;
            z.maxHp = e.maxHp;
            if (z.hpBarFill) {
                z.hpBarFill.setScale(Math.max(0, Math.min(1, e.hp / e.maxHp)), 1, 1);
            }
        }
        // Remove zombies the server no longer reports
        for (const [id, z] of this.serverEnemies) {
            if (!seen.has(id) && z.deathTimer < 0) {
                z.deathTimer = 0;
                if (z.hpBarFill) z.hpBarFill.active = false;
                if (z.hpBarBg) z.hpBarBg.active = false;
                this.serverEnemies.delete(id);
            }
        }
        // Reconcile projectiles: simple yellow dots
        const seenProj = new Set<string>();
        for (const p of snap.projectiles) {
            seenProj.add(p.id);
            let node = this.serverProjectiles.get(p.id);
            if (!node) {
                node = this.createProjectileVisual(p);
                this.serverProjectiles.set(p.id, node);
            }
            node.setPosition(p.x, p.y, 0);
        }
        for (const [id, node] of this.serverProjectiles) {
            if (!seenProj.has(id)) {
                node.destroy();
                this.serverProjectiles.delete(id);
            }
        }
    }

    private createProjectileVisual(_p: ProjectileSnapshot): Node {
        if (!this.bulletFrame) {
            this.bulletFrame = this.makeRadialAlpha(16, [255, 230, 110, 255], [255, 180, 60, 0]);
        }
        const node = new Node('NetBullet');
        node.layer = Layers.Enum.UI_2D;
        const sp = node.addComponent(Sprite);
        sp.spriteFrame = this.bulletFrame;
        const tr = node.addComponent(UITransform);
        tr.setContentSize(16, 16);
        this.fxLayer.addChild(node);
        return node;
    }

    private createServerZombie(e: EnemySnapshot): ZombieEntity {
        // Map server enemy.type to client bodyType (best-effort).
        const t = (e.type || '').toLowerCase();
        const bodyType: ZombieBodyType =
            t.includes('brute') || t.includes('boss') ? 'brute'
            : t.includes('crawler') || t.includes('crawl') ? 'crawler'
            : 'runner';
        const node = new Node(`NetZ:${e.id}`);
        node.layer = Layers.Enum.UI_2D;
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.zombieFrames.get(`${bodyType}:idle`) ?? null;
        const baseColor = new Color(255, 255, 255, 255);
        sprite.color = baseColor;
        const tr = node.addComponent(UITransform);
        const baseSize = 130;
        tr.setContentSize(baseSize, baseSize);
        node.setPosition(e.x, e.y, 0);
        this.worldLayer.addChild(node);
        const hpBarBg = this.makeHpBar(baseSize, false);
        const hpBarFill = this.makeHpBar(baseSize, true);
        const yOff = baseSize * 0.55;
        hpBarBg.setPosition(0, yOff, 0);
        hpBarFill.setPosition(0, yOff, 0);
        node.addChild(hpBarBg);
        node.addChild(hpBarFill);
        return {
            node, sprite, hp: e.hp, maxHp: e.maxHp,
            speed: 0, bodyType, scale: 1, baseSize: 130,
            baseColor, hitFlashTimer: 0, deathTimer: -1,
            hpBarFill, hpBarBg,
        };
    }

    /** Wire dynamic minimap: containerNode is the minimap circle Node from HUD.
     *  Dots are appended into this container; positions update each frame. */
    public attachDynamicMinimap(containerNode: Node, mapDiameterPx: number) {
        this.minimapContainer = containerNode;
        this.minimapRadius = mapDiameterPx * 0.5 - 3;
        // Hero dot (cyan)
        const dot = new Node('MinimapHeroDot');
        dot.layer = Layers.Enum.UI_2D;
        const sp = dot.addComponent(Sprite);
        sp.spriteFrame = this.makeRadialAlpha(16, [120, 220, 255, 255], [120, 220, 255, 0]);
        sp.color = new Color(120, 220, 255, 255);
        const tr = dot.addComponent(UITransform);
        tr.setContentSize(7, 7);
        containerNode.addChild(dot);
        this.minimapHeroDot = dot;
    }

    private updateMinimap() {
        if (!this.minimapContainer || !this.heroNode) return;
        const halfW = this.HERO_SCREEN_HALF_W, halfH = this.HERO_SCREEN_HALF_H;
        const r = this.minimapRadius;
        // Hero dot: always center (camera follows hero in vampire-survivors style)
        if (this.minimapHeroDot) this.minimapHeroDot.setPosition(0, 0, 0);
        // Enemy dots: relative-to-hero positions, clipped to circle radius
        const heroPos = this.heroNode.position;
        let dotIdx = 0;
        for (const z of this.zombies) {
            if (z.deathTimer >= 0 || z.hp <= 0) continue;
            const dx = z.node.position.x - heroPos.x;
            const dy = z.node.position.y - heroPos.y;
            const mx = (dx / halfW) * r;
            const my = (dy / halfH) * r;
            // clamp to circle
            const len = Math.hypot(mx, my);
            const cx = len > r ? (mx / len) * r : mx;
            const cy = len > r ? (my / len) * r : my;
            let dot = this.minimapEnemyDots[dotIdx];
            if (!dot) {
                dot = new Node('MinimapEnemy');
                dot.layer = Layers.Enum.UI_2D;
                const sp = dot.addComponent(Sprite);
                sp.spriteFrame = this.makeRadialAlpha(16, [255, 80, 80, 255], [255, 80, 80, 0]);
                sp.color = new Color(255, 80, 80, 255);
                const tr = dot.addComponent(UITransform);
                tr.setContentSize(5, 5);
                this.minimapContainer.addChild(dot);
                this.minimapEnemyDots.push(dot);
            }
            dot.active = true;
            dot.setPosition(cx, cy, 0);
            dotIdx++;
        }
        // hide unused pool dots
        for (let i = dotIdx; i < this.minimapEnemyDots.length; i++) {
            this.minimapEnemyDots[i].active = false;
        }
    }

    private tickDeathFadesOnly(dt: number) {
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const z = this.zombies[i];
            if (z.deathTimer < 0) continue;
            z.deathTimer += dt;
            const t = Math.min(1, z.deathTimer / 0.35);
            const s = 1 - t;
            z.node.setScale(s, s, 1);
            z.sprite.color = new Color(z.baseColor.r, z.baseColor.g, z.baseColor.b, Math.floor(255 * s));
            if (t >= 1) {
                z.node.destroy();
                this.zombies.splice(i, 1);
            }
        }
    }

    // ----- input -----

    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: this.keyDir.y = 1; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: this.keyDir.y = -1; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: this.keyDir.x = -1; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: this.keyDir.x = 1; break;
        }
    }
    private onKeyUp(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: if (this.keyDir.y > 0) this.keyDir.y = 0; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: if (this.keyDir.y < 0) this.keyDir.y = 0; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: if (this.keyDir.x < 0) this.keyDir.x = 0; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: if (this.keyDir.x > 0) this.keyDir.x = 0; break;
        }
    }

    private onTouchStart(e: EventTouch) {
        if (this.touchId !== null) return; // already tracking a touch
        const t = e.getUILocation();
        this.touchId = e.touch ? e.touch.getID() : 0;
        this.touchAnchor = new CcVec2(t.x, t.y);
        this.joystickDir.set(0, 0);
    }

    private onTouchMove(e: EventTouch) {
        if (this.touchId === null || !this.touchAnchor) return;
        if (e.touch && e.touch.getID() !== this.touchId) return;
        const t = e.getUILocation();
        const dx = t.x - this.touchAnchor.x;
        const dy = t.y - this.touchAnchor.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) { this.joystickDir.set(0, 0); return; }
        const mag = Math.min(1, len / this.JOYSTICK_RADIUS);
        this.joystickDir.set((dx / len) * mag, (dy / len) * mag);
    }

    private onTouchEnd(_e: EventTouch) {
        this.touchId = null;
        this.touchAnchor = null;
        this.joystickDir.set(0, 0);
    }

    // ----- per-frame updates -----

    private updateHero(dt: number) {
        if (!this.heroNode) return;
        if (this.heroShootFlash > 0) this.heroShootFlash -= dt;
        let dx = this.joystickDir.x + this.keyDir.x;
        let dy = this.joystickDir.y + this.keyDir.y;
        const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
        const moving = m >= 0.05;
        if (moving) {
            const p = this.heroNode.position;
            let nx = p.x + dx * this.HERO_SPEED * dt;
            let ny = p.y + dy * this.HERO_SPEED * dt;
            nx = Math.max(-this.HERO_SCREEN_HALF_W + 30, Math.min(this.HERO_SCREEN_HALF_W - 30, nx));
            ny = Math.max(-this.HERO_SCREEN_HALF_H + 60, Math.min(this.HERO_SCREEN_HALF_H - 60, ny));
            const resolved = this.resolveBlockers(nx, ny, this.heroCollideR);
            this.heroNode.setPosition(resolved.x, resolved.y, 0);
            // 3/4 view: never rotate sprite (would flip upside down). Face left/right via scale.x.
            if (Math.abs(dx) > 0.1) this.heroFacingLeft = dx < 0;
            this.heroBobPhase += dt * 9;
        }
        // Apply facing (flipX) + fake step cycle (squash-stretch + sub-pixel offset)
        if (this.heroNode) {
            const sx = this.heroFacingLeft ? -1 : 1;
            if (moving) {
                // step cycle: scale.y oscillates ±6%, alternating x-shift for "weight shift" feel
                const step = Math.sin(this.heroBobPhase);
                const sy = 1 + step * 0.06;
                const sxFinal = sx * (1 - Math.abs(step) * 0.03);
                this.heroNode.setScale(sxFinal, sy, 1);
                // tiny vertical hop so foot doesn't seem frozen
                const p = this.heroNode.position;
                const hop = Math.max(0, Math.abs(step)) * 2;
                this.heroNode.setPosition(p.x, p.y + (this.heroLastHop ? -this.heroLastHop : 0) + hop, 0);
                this.heroLastHop = hop;
            } else {
                this.heroNode.setScale(sx, 1, 1);
                if (this.heroLastHop) {
                    const p = this.heroNode.position;
                    this.heroNode.setPosition(p.x, p.y - this.heroLastHop, 0);
                    this.heroLastHop = 0;
                }
            }
            this.heroNode.angle = 0;
        }
        if (this.heroSprite) {
            // Walk cycle: alternate walk1 (walk-v2.png) and walk2 (= idle as second pose)
            // every 0.25s so the sprite visibly cycles two distinct frames while moving.
            // When ZombieArtist delivers a real walk2 PNG, swap heroFrames.walk2 in.
            let next: SpriteFrame | null;
            if (this.heroShootFlash > 0) {
                next = this.heroFrames.shoot ?? this.heroFrames.idle;
            } else if (moving) {
                // 3-frame walk cycle: idle -> walk1 -> walk2 -> idle ...
                const phase = Math.floor(this.heroBobPhase / (Math.PI * 0.66)) % 3;
                next = phase === 0
                    ? this.heroFrames.idle
                    : phase === 1
                        ? (this.heroFrames.walk ?? this.heroFrames.idle)
                        : (this.heroFrames.walk2 ?? this.heroFrames.walk ?? this.heroFrames.idle);
            } else {
                next = this.heroFrames.idle;
            }
            if (next && this.heroSprite.spriteFrame !== next) this.heroSprite.spriteFrame = next;
        }
    }

    private updateZombies(dt: number) {
        if (!this.heroNode) return;
        const hp = this.heroNode.position;
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const z = this.zombies[i];
            // Death fade animation: scale to 0 + opacity 0 over 0.35s
            if (z.deathTimer >= 0) {
                z.deathTimer += dt;
                const t = Math.min(1, z.deathTimer / 0.35);
                const s = 1 - t;
                z.node.setScale(s, s, 1);
                z.sprite.color = new Color(z.baseColor.r, z.baseColor.g, z.baseColor.b, Math.floor(255 * s));
                if (t >= 1) {
                    z.node.destroy();
                    this.zombies.splice(i, 1);
                }
                continue;
            }
            if (z.hp <= 0) {
                // start dying
                z.deathTimer = 0;
                this.kills++;
                if (z.hpBarFill) z.hpBarFill.active = false;
                if (z.hpBarBg) z.hpBarBg.active = false;
                continue;
            }
            // hit flash decay (white tint)
            if (z.hitFlashTimer > 0) {
                z.hitFlashTimer -= dt;
                if (z.hitFlashTimer <= 0) {
                    z.sprite.color = z.baseColor;
                } else {
                    const k = Math.min(1, z.hitFlashTimer / 0.12);
                    const r = Math.floor(z.baseColor.r * (1 - k) + 255 * k);
                    const g = Math.floor(z.baseColor.g * (1 - k) + 255 * k);
                    const b = Math.floor(z.baseColor.b * (1 - k) + 255 * k);
                    z.sprite.color = new Color(r, g, b, z.baseColor.a);
                }
            }
            // chase hero
            const zp = z.node.position;
            const dx = hp.x - zp.x, dy = hp.y - zp.y;
            const len = Math.hypot(dx, dy);
            // Frame switch: close to hero -> attack pose, else move/idle
            const inAttackRange = len < 60;
            const wantFrame: 'idle' | 'move' | 'attack' = inAttackRange ? 'attack' : 'move';
            if (wantFrame !== z.currentFrame) {
                const nextSf = this.zombieFrames.get(`${z.bodyType}:${wantFrame}`)
                    ?? this.zombieFrames.get(`${z.bodyType}:idle`);
                if (nextSf) z.sprite.spriteFrame = nextSf;
                z.currentFrame = wantFrame;
            }
            // 3/4 view: no rotation. Face hero via flipX.
            if (Math.abs(dx) > 0.1) z.facingLeft = dx < 0;
            const zbase = z.scale ?? 1;
            if (inAttackRange) {
                // Attack lunge cycle: forward push + back, scale.y squash on impact
                z.attackPhase = (z.attackPhase + dt * 2.5) % 1; // 0.4s per swing
                const lungeStrength = Math.sin(z.attackPhase * Math.PI * 2); // -1..1
                const nx = dx / Math.max(len, 1), ny = dy / Math.max(len, 1);
                const lungePx = lungeStrength * 8; // ±8px lunge toward hero
                z.node.setPosition(zp.x + nx * lungePx * 0.4, zp.y + ny * lungePx * 0.4, 0);
                const squash = 1 - Math.max(0, lungeStrength) * 0.15;
                z.node.setScale(zbase * (z.facingLeft ? -1 : 1) * (1 + Math.max(0, lungeStrength) * 0.12),
                                zbase * squash, 1);
            } else if (len >= 1) {
                const nx = dx / len, ny = dy / len;
                const zr = Math.max(10, (z.baseSize ?? 70) * zbase * 0.22);
                const resolved = this.resolveBlockers(zp.x + nx * z.speed * dt, zp.y + ny * z.speed * dt, zr);
                z.node.setPosition(resolved.x, resolved.y, 0);
                z.bobPhase += dt * 7;
                z.attackPhase = 0;
                const zstep = Math.sin(z.bobPhase);
                z.node.setScale(zbase * (z.facingLeft ? -1 : 1) * (1 - Math.abs(zstep) * 0.03),
                                zbase * (1 + zstep * 0.06), 1);
            }
            z.node.angle = 0;
            // HP bar fill scale by hp ratio
            if (z.hpBarFill) {
                const ratio = Math.max(0, Math.min(1, z.hp / z.maxHp));
                z.hpBarFill.setScale(ratio, 1, 1);
            }
        }
    }

    private updateAutoFire(dt: number) {
        if (!this.heroNode) return;
        this.heroFireTimer += dt;
        if (this.heroFireTimer < this.FIRE_INTERVAL) return;
        const hp = this.heroNode.position;
        let best: ZombieEntity | null = null;
        let bestD = Infinity;
        for (const z of this.zombies) {
            if (z.hp <= 0) continue;
            const dx = z.node.position.x - hp.x, dy = z.node.position.y - hp.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = z; }
        }
        if (!best) return;
        const dx = best.node.position.x - hp.x, dy = best.node.position.y - hp.y;
        const len = Math.hypot(dx, dy) || 1;
        const baseAng = Math.atan2(dy, dx);
        // Fan of 5 bullets spanning ~24deg, matching candidate_pics ...03 hero fire pattern.
        const spreadDeg = [-12, -6, 0, 6, 12];
        for (const d of spreadDeg) {
            const a = baseAng + (d * Math.PI / 180);
            this.spawnBullet(hp.x, hp.y, Math.cos(a), Math.sin(a));
        }
        this.heroFireTimer = 0;
        this.heroShootFlash = 0.12;
    }

    private spawnBullet(fx: number, fy: number, dirX: number, dirY: number) {
        if (!this.bulletFrame) {
            this.bulletFrame = this.makeRadialAlpha(16, [255, 230, 110, 255], [255, 180, 60, 0]);
        }
        const node = new Node('Bullet');
        node.layer = Layers.Enum.UI_2D;
        const sp = node.addComponent(Sprite);
        sp.spriteFrame = this.bulletFrame;
        const tr = node.addComponent(UITransform);
        tr.setContentSize(18, 18);
        node.setPosition(fx, fy, 0);
        this.fxLayer.addChild(node);
        this.bullets.push({ node, vx: dirX * this.BULLET_SPEED, vy: dirY * this.BULLET_SPEED, ttl: this.BULLET_TTL });
    }

    private updateBullets(dt: number) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            const p = b.node.position;
            const nx = p.x + b.vx * dt, ny = p.y + b.vy * dt;
            b.node.setPosition(nx, ny, 0);
            b.ttl -= dt;
            if (b.ttl <= 0) { b.node.destroy(); this.bullets.splice(i, 1); continue; }
            // collision
            for (const z of this.zombies) {
                if (z.hp <= 0 || z.deathTimer >= 0) continue;
                const zx = z.node.position.x, zy = z.node.position.y;
                const dx = zx - nx, dy = zy - ny;
                if (dx * dx + dy * dy < this.ZOMBIE_HIT_RADIUS * this.ZOMBIE_HIT_RADIUS) {
                    z.hp -= this.BULLET_DAMAGE;
                    z.hitFlashTimer = 0.12;
                    b.node.destroy();
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }
    }

    private updateSpawn(dt: number) {
        this.spawnTimer += dt;
        if (this.spawnTimer < this.SPAWN_INTERVAL) return;
        if (this.zombies.length >= 24) { this.spawnTimer = 0; return; } // soft cap
        // pick a random zombie config from current scene config as template
        const tpl = this.config.zombies[Math.floor(Math.random() * this.config.zombies.length)];
        // spawn at random screen edge
        const edge = Math.floor(Math.random() * 4);
        let sx = 0, sy = 0;
        const W = this.HERO_SCREEN_HALF_W + 50, H = this.HERO_SCREEN_HALF_H + 50;
        if (edge === 0) { sx = -W + Math.random() * (2 * W); sy = -H; }
        else if (edge === 1) { sx = -W + Math.random() * (2 * W); sy = H; }
        else if (edge === 2) { sx = -W; sy = -H + Math.random() * (2 * H); }
        else { sx = W; sy = -H + Math.random() * (2 * H); }

        const newCfg: ZombieConfig = {
            ...tpl,
            name: 'wave_' + Date.now(),
            pos: [sx, sy] as Vec2,
        };
        // re-use spawnZombies path for one zombie (creates node + registers entity)
        this.spawnZombies([newCfg], this.config.hero.pos);
        this.spawnTimer = 0;
    }
}
