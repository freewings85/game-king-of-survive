import {
    _decorator,
    Color,
    Component,
    Node,
    resources,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3,
} from 'cc';
import {
    SceneConfig,
    HeroConfig,
    ZombieConfig,
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

const { ccclass } = _decorator;

@ccclass('ActorSpawner')
export class ActorSpawner extends Component {
    public worldLayer!: Node;
    public fxLayer!: Node;
    public makeRadialAlpha!: (size: number, inner: RGBA, outer: RGBA) => SpriteFrame;
    public config!: SceneConfig;

    private heroFrames: Record<string, SpriteFrame | null> = { idle: null, shoot: null };
    private zombieFrames: Record<ZombieConfig['frame'], SpriteFrame | null> = { idle: null, move: null, attack: null };
    private propFrames: Record<PropKey, SpriteFrame | null> = { wreckTank: null, barrelRust: null, sandbag: null };

    async start() {
        if (!this.config) {
            throw new Error('[ActorSpawner] config not injected — caller must set .config before adding the component');
        }
        await this.loadAllFrames();
        this.spawnProps(this.config.props);
        this.spawnHero(this.config.hero);
        this.spawnZombies(this.config.zombies, this.config.hero.pos);
        this.spawnMuzzle(this.config.vfx.muzzleCone, this.config.hero.pos, 'MuzzleCone');
        this.spawnMuzzle(this.config.vfx.muzzleBurst, this.config.hero.pos, 'MuzzleBurst');
        this.spawnFanBullets(this.config.vfx.fanBullets, this.config.hero.pos);
        this.spawnHitSparks(this.config.vfx.hitSparks);
        this.spawnLightningChain(this.config.vfx.lightningChain);
    }

    private async loadAllFrames(): Promise<void> {
        const paths: Array<[string, (sf: SpriteFrame) => void]> = [
            ['art/v03/hero/survivor-idle/spriteFrame', (sf) => (this.heroFrames.idle = sf)],
            ['art/v03/hero/survivor-shoot/spriteFrame', (sf) => (this.heroFrames.shoot = sf)],
            ['art/v03/zombie/zombie-idle/spriteFrame', (sf) => (this.zombieFrames.idle = sf)],
            ['art/v03/zombie/zombie-move/spriteFrame', (sf) => (this.zombieFrames.move = sf)],
            ['art/v03/zombie/zombie-attack/spriteFrame', (sf) => (this.zombieFrames.attack = sf)],
            ['art/v03/props/wreck-tank/spriteFrame', (sf) => (this.propFrames.wreckTank = sf)],
            ['art/v03/props/barrel-rust/spriteFrame', (sf) => (this.propFrames.barrelRust = sf)],
            ['art/v03/props/sandbag/spriteFrame', (sf) => (this.propFrames.sandbag = sf)],
        ];
        await Promise.all(
            paths.map(
                ([p, assign]) =>
                    new Promise<void>((resolve, reject) => {
                        resources.load(p, SpriteFrame, (err, sf) => {
                            if (err) {
                                console.error('[ActorSpawner] load fail', p, err);
                                reject(err);
                                return;
                            }
                            assign(sf);
                            resolve();
                        });
                    }),
            ),
        );
    }

    private spawnProps(props: PropConfig[]) {
        for (const p of props) {
            this.spawnContactShadow(p.pos, p.shadow[0], p.shadow[1]);
            const node = new Node(p.name);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.propFrames[p.key];
            if (p.tint) sprite.color = new Color(p.tint[0], p.tint[1], p.tint[2], p.tint[3]);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(p.contentSize[0], p.contentSize[1]);
            node.setPosition(new Vec3(p.pos[0], p.pos[1], 0));
            node.angle = p.angleDeg;
            this.worldLayer.addChild(node);
        }
    }

    private spawnHero(hero: HeroConfig) {
        this.spawnContactShadow(hero.pos, hero.shadow[0], hero.shadow[1]);
        const node = new Node('Hero');
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = (hero.frame === 'shoot' ? this.heroFrames.shoot : this.heroFrames.idle) ?? this.heroFrames.idle;
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(hero.contentSize[0], hero.contentSize[1]);
        node.setPosition(new Vec3(hero.pos[0], hero.pos[1], 0));
        node.angle = hero.angleDeg;
        this.worldLayer.addChild(node);
    }

    private spawnZombies(zombies: ZombieConfig[], heroPos: Vec2) {
        for (const z of zombies) {
            const angleDeg = z.rotateTowardHero
                ? (Math.atan2(heroPos[1] - z.pos[1], heroPos[0] - z.pos[0]) * 180) / Math.PI
                : 0;

            this.spawnContactShadow(z.pos, Math.floor(z.shadow[0] * z.scale), Math.floor(z.shadow[1] * z.scale));

            const node = new Node(z.name);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.zombieFrames[z.frame];
            sprite.color = new Color(z.tint[0], z.tint[1], z.tint[2], z.tint[3]);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            const baseSize = Math.floor(z.baseSize * z.scale);
            tr.setContentSize(baseSize, baseSize);
            node.setPosition(new Vec3(z.pos[0], z.pos[1], 0));
            node.angle = angleDeg;
            this.worldLayer.addChild(node);
        }
    }

    private spawnContactShadow(pos: Vec2, w: number, h: number) {
        const node = new Node('ContactShadow');
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.makeRadialAlpha(128, [0, 0, 0, 205], [0, 0, 0, 0]);
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(w, h);
        node.setPosition(new Vec3(pos[0], pos[1] - 6, -1));
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

    private spawnHitSparks(cfg: HitSparksConfig) {
        const [tx, ty] = cfg.target;
        for (let i = 0; i < cfg.offsets.length; i++) {
            const [ox, oy, sz] = cfg.offsets[i];
            const node = new Node(`Spark_${i}`);
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
}
