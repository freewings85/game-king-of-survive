// ---------------------------------------------------------------------------
// NetClient — WebSocket bridge to Java server (com.kingofsurvive)
//
// Protocol mirrors server/src/main/java/com/kingofsurvive/engine/net/*
// Endpoint: ws://<host>/ws/game
//
// Outgoing messages:
//   { type: "register",    playerId, name, room?, mode? }
//   { type: "input",       playerId, seq, moveX, moveY, skillId?, targetX?, targetY?, timestamp, useUltimate?, dodge? }
//   { type: "skill_choice", playerId, skillChoice }
//
// Incoming: GameStateSnapshot
//   { tick, gameTime, wave, state, stormRadius, stormCenterX, stormCenterY, stormActive,
//     players: [{id, x, y, hp, maxHp, ...}],
//     enemies: [{id, type, x, y, hp, maxHp, ...}],
//     projectiles: [{id, x, y, vx, vy, ...}],
//     events: [...], lastAckedInputs: { playerId: seq } }
// ---------------------------------------------------------------------------

export interface PlayerSnapshot {
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    [key: string]: any;
}

export interface EnemySnapshot {
    id: string;
    type?: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    [key: string]: any;
}

export interface ProjectileSnapshot {
    id: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    [key: string]: any;
}

export interface GameStateSnapshot {
    tick: number;
    gameTime: number;
    wave: number;
    state: string;
    stormRadius?: number;
    stormCenterX?: number;
    stormCenterY?: number;
    stormActive?: boolean;
    players: PlayerSnapshot[];
    enemies: EnemySnapshot[];
    projectiles: ProjectileSnapshot[];
    events?: any[];
    lastAckedInputs?: Record<string, number>;
}

export type NetEventHandler = {
    onConnect?: () => void;
    onDisconnect?: (code: number, reason: string) => void;
    onSnapshot?: (snap: GameStateSnapshot) => void;
    onError?: (err: any) => void;
};

export class NetClient {
    private ws: WebSocket | null = null;
    private url: string;
    private playerId: string;
    private playerName: string;
    private inputSeq = 0;
    private connected = false;
    private handlers: NetEventHandler = {};

    constructor(url: string, playerId: string, playerName = 'Survivor') {
        this.url = url;
        this.playerId = playerId;
        this.playerName = playerName;
    }

    setHandlers(h: NetEventHandler) {
        this.handlers = h;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
            } catch (e) {
                reject(e);
                return;
            }
            this.ws.onopen = () => {
                this.connected = true;
                console.log('[NetClient] connected', this.url);
                this.sendRaw({ type: 'register', playerId: this.playerId, name: this.playerName });
                this.handlers.onConnect?.();
                resolve();
            };
            this.ws.onclose = (e) => {
                this.connected = false;
                console.log('[NetClient] disconnected', e.code, e.reason);
                this.handlers.onDisconnect?.(e.code, e.reason);
            };
            this.ws.onerror = (e) => {
                console.warn('[NetClient] error', e);
                this.handlers.onError?.(e);
                if (!this.connected) reject(e);
            };
            this.ws.onmessage = (m) => {
                try {
                    const data = JSON.parse(m.data as string);
                    // Server may push snapshots OR control messages.
                    // Snapshot has `tick` field; control messages may not.
                    if (data && typeof data.tick === 'number' && Array.isArray(data.players)) {
                        this.handlers.onSnapshot?.(data as GameStateSnapshot);
                    } else {
                        // future: control message routing
                    }
                } catch (e) {
                    console.warn('[NetClient] bad msg', e);
                }
            };
        });
    }

    isConnected(): boolean {
        return this.connected;
    }

    sendInput(moveX: number, moveY: number, opts?: {
        skillId?: string; targetX?: number; targetY?: number;
        useUltimate?: boolean; dodge?: boolean;
    }) {
        if (!this.connected) return;
        this.inputSeq++;
        this.sendRaw({
            type: 'input',
            playerId: this.playerId,
            seq: this.inputSeq,
            moveX, moveY,
            skillId: opts?.skillId,
            targetX: opts?.targetX,
            targetY: opts?.targetY,
            useUltimate: !!opts?.useUltimate,
            dodge: !!opts?.dodge,
            timestamp: Date.now(),
        });
    }

    sendSkillChoice(choice: string) {
        if (!this.connected) return;
        this.sendRaw({ type: 'skill_choice', playerId: this.playerId, skillChoice: choice });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    private sendRaw(payload: any) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        try {
            this.ws.send(JSON.stringify(payload));
        } catch (e) {
            console.warn('[NetClient] send fail', e);
        }
    }
}
