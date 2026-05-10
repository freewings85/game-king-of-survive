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

const { ccclass } = _decorator;

interface ZombieSpec {
    name: string;
    pos: Vec3;
    scale: number;
    tint: Color;
    rotationDeg: number;
    frame: 'idle' | 'move' | 'attack';
}

interface PropSpec {
    name: string;
    key: 'wreckTank' | 'barrelRust' | 'sandbag';
    pos: Vec3;
    angleDeg: number;
    width: number;
    height: number;
    shadowW: number;
    shadowH: number;
}

/**
 * M1x: Riley hero/zombie + Kenney CC0 props (wreck tank / rust barrel / sandbag) +
 * 战斗 VFX (大 muzzle burst + fan bullets + 命中 spark + 闪电链). Pickup 已删除.
 */
@ccclass('ActorSpawner')
export class ActorSpawner extends Component {
    public worldLayer!: Node;
    public fxLayer!: Node;
    public makeRadialAlpha!: (size: number, inner: [number, number, number, number], outer: [number, number, number, number]) => SpriteFrame;

    private heroFrames: Record<string, SpriteFrame | null> = {
        idle: null,
        shoot: null,
    };
    private zombieFrames: Record<ZombieSpec['frame'], SpriteFrame | null> = {
        idle: null,
        move: null,
        attack: null,
    };
    private propFrames: Record<PropSpec['key'], SpriteFrame | null> = {
        wreckTank: null,
        barrelRust: null,
        sandbag: null,
    };

    async start() {
        await this.loadAllFrames();
        this.spawnProps();
        this.spawnHero();
        this.spawnZombies();
        this.spawnMuzzleCone();
        this.spawnMuzzleBurst();
        this.spawnFanBullets();
        this.spawnHitSparks(new Vec3(152, -120, 0));
        this.spawnLightningChain([
            new Vec3(152, -120, 0),
            new Vec3(220, 80, 0),
            new Vec3(190, 310, 0),
        ]);
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

    private spawnProps() {
        // CC0 Kenney top-down-tanks: 锈废战车残骸 + 锈桶 + 沙袋, 当 cover/landmark
        const props: PropSpec[] = [
            { name: 'WreckTank', key: 'wreckTank', pos: new Vec3(-200, -110, 0), angleDeg: 65, width: 130, height: 110, shadowW: 150, shadowH: 50 },
            { name: 'Sandbag',   key: 'sandbag',   pos: new Vec3(110, -310, 0),  angleDeg: 10, width: 70,  height: 38,  shadowW: 80,  shadowH: 22 },
            { name: 'Barrel',    key: 'barrelRust', pos: new Vec3(20, -200, 0),  angleDeg: 0,  width: 36,  height: 36,  shadowW: 42,  shadowH: 14 },
        ];
        for (const p of props) {
            this.spawnContactShadow(p.pos, p.shadowW, p.shadowH);
            const node = new Node(p.name);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.propFrames[p.key];
            // wreck tank tinted dusty rust to read "abandoned wreck", barrel/sandbag keep original
            if (p.key === 'wreckTank') sprite.color = new Color(155, 130, 105, 255);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(p.width, p.height);
            node.setPosition(p.pos);
            node.angle = p.angleDeg;
            this.worldLayer.addChild(node);
        }
    }

    private spawnHero() {
        const heroPos = new Vec3(-90, -260, 0);
        this.spawnContactShadow(heroPos, 110, 36);

        const hero = new Node('Hero');
        const sprite = hero.addComponent(Sprite);
        sprite.spriteFrame = this.heroFrames.shoot ?? this.heroFrames.idle;
        const tr = hero.getComponent(UITransform) ?? hero.addComponent(UITransform);
        tr.setContentSize(160, 105);
        hero.setPosition(heroPos);
        hero.angle = 30;
        this.worldLayer.addChild(hero);
    }

    private spawnZombies() {
        const heroPos = new Vec3(-90, -260, 0);
        const specs: ZombieSpec[] = [
            { name: 'lead',  pos: new Vec3(152, -120, 0), scale: 1.15, tint: new Color(225, 160, 145, 255), rotationDeg: 0, frame: 'attack' },
            { name: 'sneak', pos: new Vec3(50, -160, 0),  scale: 1.10, tint: new Color(215, 180, 160, 255), rotationDeg: 0, frame: 'move' },
            { name: 'flank', pos: new Vec3(220, 80, 0),   scale: 1.00, tint: new Color(200, 195, 170, 255), rotationDeg: 0, frame: 'move' },
            { name: 'back',  pos: new Vec3(-160, 150, 0), scale: 0.95, tint: new Color(190, 200, 185, 255), rotationDeg: 0, frame: 'idle' },
            { name: 'far',   pos: new Vec3(190, 310, 0),  scale: 0.78, tint: new Color(170, 180, 175, 255), rotationDeg: 0, frame: 'move' },
        ];

        for (const spec of specs) {
            const dx = heroPos.x - spec.pos.x;
            const dy = heroPos.y - spec.pos.y;
            const angleRad = Math.atan2(dy, dx);
            spec.rotationDeg = (angleRad * 180) / Math.PI;

            this.spawnContactShadow(spec.pos, 80 * spec.scale, 26 * spec.scale);

            const node = new Node(spec.name);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.zombieFrames[spec.frame];
            sprite.color = spec.tint;
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            const baseSize = 130 * spec.scale;
            tr.setContentSize(baseSize, baseSize);
            node.setPosition(spec.pos);
            node.angle = spec.rotationDeg;
            this.worldLayer.addChild(node);
        }
    }

    private spawnContactShadow(pos: Vec3, w: number, h: number) {
        const node = new Node('ContactShadow');
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.makeRadialAlpha(128, [0, 0, 0, 205], [0, 0, 0, 0]);
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(w, h);
        node.setPosition(new Vec3(pos.x, pos.y - 6, pos.z - 1));
        this.worldLayer.addChild(node);
    }

    private spawnMuzzleCone() {
        // M1c 暖光锥体 (180×80) 不变, 仍当焦点
        const node = new Node('MuzzleCone');
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.makeRadialAlpha(256, [255, 230, 140, 130], [255, 180, 60, 0]);
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(180, 80);
        const heroPos = new Vec3(-90, -260, 0);
        const rad = (30 * Math.PI) / 180;
        node.setPosition(new Vec3(heroPos.x + Math.cos(rad) * 90, heroPos.y + Math.sin(rad) * 90, 0));
        node.angle = 30;
        this.fxLayer.addChild(node);
    }

    private spawnMuzzleBurst() {
        // M1x: 大 burst, 枪口炽白核心, 短促爆光. 与锥体叠加 → 开火瞬间感
        const node = new Node('MuzzleBurst');
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.makeRadialAlpha(256, [255, 250, 220, 250], [255, 200, 90, 0]);
        const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        tr.setContentSize(110, 110);
        const heroPos = new Vec3(-90, -260, 0);
        const rad = (30 * Math.PI) / 180;
        node.setPosition(new Vec3(heroPos.x + Math.cos(rad) * 60, heroPos.y + Math.sin(rad) * 60, 0));
        this.fxLayer.addChild(node);
    }

    private spawnFanBullets() {
        // 5 颗子弹拖尾, 30°±15° 扇形, 长尾短头, 拟动量
        const heroPos = new Vec3(-90, -260, 0);
        const baseDeg = 30;
        const spread = [-14, -7, 0, 7, 14];
        const startRad = (baseDeg * Math.PI) / 180;
        const startX = heroPos.x + Math.cos(startRad) * 80;
        const startY = heroPos.y + Math.sin(startRad) * 80;
        for (let i = 0; i < spread.length; i++) {
            const ang = baseDeg + spread[i];
            const rad = (ang * Math.PI) / 180;
            const len = 130 + (i % 2 === 0 ? 30 : 0);
            const cx = startX + Math.cos(rad) * (len / 2);
            const cy = startY + Math.sin(rad) * (len / 2);

            const node = new Node(`Bullet_${i}`);
            const sprite = node.addComponent(Sprite);
            // 拖尾: inner 亮黄白, outer 透明 (radial 拉成长条)
            sprite.spriteFrame = this.makeRadialAlpha(128, [255, 240, 180, 230], [255, 200, 80, 0]);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(len, 8);
            node.setPosition(new Vec3(cx, cy, 0));
            node.angle = ang;
            this.fxLayer.addChild(node);
        }
    }

    private spawnHitSparks(target: Vec3) {
        // lead zombie 命中: 5-7 个小 spark cluster, 白黄发散
        const offsets: Array<[number, number, number]> = [
            [-12, 8, 14],
            [10, 14, 12],
            [18, -6, 10],
            [-6, -14, 11],
            [4, 22, 9],
            [22, 4, 8],
            [-18, -2, 7],
        ];
        for (let i = 0; i < offsets.length; i++) {
            const [ox, oy, sz] = offsets[i];
            const node = new Node(`Spark_${i}`);
            const sprite = node.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(64, [255, 250, 220, 240], [255, 180, 60, 0]);
            const tr = node.getComponent(UITransform) ?? node.addComponent(UITransform);
            tr.setContentSize(sz * 2, sz * 2);
            node.setPosition(new Vec3(target.x + ox, target.y + oy, 0));
            this.fxLayer.addChild(node);
        }
    }

    private spawnLightningChain(nodes: Vec3[]) {
        // 闪电链: nodes 之间画 zigzag 短段, 每段 ~6 顶点, 白蓝混色
        for (let i = 0; i < nodes.length - 1; i++) {
            this.drawLightningSegment(nodes[i], nodes[i + 1], 6, i);
        }
        // 节点 hub 亮点
        for (let i = 0; i < nodes.length; i++) {
            const hub = new Node(`LightningHub_${i}`);
            const sprite = hub.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(64, [220, 240, 255, 230], [120, 180, 255, 0]);
            const tr = hub.getComponent(UITransform) ?? hub.addComponent(UITransform);
            tr.setContentSize(28, 28);
            hub.setPosition(nodes[i]);
            this.fxLayer.addChild(hub);
        }
    }

    private drawLightningSegment(from: Vec3, to: Vec3, segments: number, segIdx: number) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len; // perpendicular for jitter
        const ny = dx / len;
        let prev = new Vec3(from.x, from.y, 0);
        for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const baseX = from.x + dx * t;
            const baseY = from.y + dy * t;
            // jitter perp ~12px (last point lands cleanly on target)
            const jitter = s === segments ? 0 : (Math.sin(s * 13 + segIdx * 3) * 14);
            const px = baseX + nx * jitter;
            const py = baseY + ny * jitter;

            const segLen = Math.hypot(px - prev.x, py - prev.y);
            const segAng = (Math.atan2(py - prev.y, px - prev.x) * 180) / Math.PI;
            const cx = (px + prev.x) / 2;
            const cy = (py + prev.y) / 2;

            const bolt = new Node(`Bolt_${segIdx}_${s}`);
            const sprite = bolt.addComponent(Sprite);
            sprite.spriteFrame = this.makeRadialAlpha(64, [240, 250, 255, 235], [120, 180, 255, 0]);
            const tr = bolt.getComponent(UITransform) ?? bolt.addComponent(UITransform);
            tr.setContentSize(segLen, 6);
            bolt.setPosition(new Vec3(cx, cy, 0));
            bolt.angle = segAng;
            this.fxLayer.addChild(bolt);

            prev = new Vec3(px, py, 0);
        }
    }
}
