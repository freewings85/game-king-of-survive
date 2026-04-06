/**
 * Network Client for Server-Authoritative Mode
 *
 * Key design: INCREMENTAL state updates.
 * - Players/enemies/projectiles are matched by ID and updated in-place
 * - Remote entities use time-based interpolation between two snapshots
 * - Local player uses client-side prediction + server reconciliation
 * - No objects are deleted/recreated each frame — only property updates
 */
var NetworkClient = (function() {
    var ws = null;
    var connected = false;
    var matchId = null;
    var localPlayerId = null;

    // Snapshot double-buffer for interpolation
    var latestSnapshot = null;
    var previousSnapshot = null;
    var snapshotArriveTime = 0;    // performance.now() when latest arrived
    var prevSnapshotArriveTime = 0;
    var SNAPSHOT_INTERVAL = 1000 / 30; // expected 33ms between snapshots

    // Input tracking
    var inputSeq = 0;
    var inputHistory = [];
    var INPUT_SEND_RATE = 1.0 / 30;

    // Pending events from server
    var pendingEvents = [];

    // Callbacks
    var onConnected = null;
    var onSnapshot = null;
    var onDisconnect = null;

    // Pending level-ups from server (array to handle multiple level-ups per tick)
    var pendingLevelUps = [];

    // Entity lookup caches (avoid re-scanning arrays each frame)
    var enemyById = {};       // serverId -> entity ref in gameState.entities
    var projectileById = {};  // serverId -> entity ref

    function connect(serverUrl, roomId, playerId, callbacks) {
        localPlayerId = playerId;
        matchId = roomId;
        onConnected = callbacks.onConnected || null;
        onSnapshot = callbacks.onSnapshot || null;
        onDisconnect = callbacks.onDisconnect || null;

        var wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws/game';
        ws = new WebSocket(wsUrl);

        ws.onopen = function() {
            ws.send(JSON.stringify({
                type: 'register',
                playerId: playerId,
                roomId: roomId
            }));
        };

        ws.onmessage = function(event) {
            var data;
            try { data = JSON.parse(event.data); } catch(e) { return; }

            if (data.type === 'registered') {
                connected = true;
                if (onConnected) onConnected(data);
                return;
            }

            // Game state snapshot
            if (data.tick !== undefined && data.players !== undefined) {
                previousSnapshot = latestSnapshot;
                prevSnapshotArriveTime = snapshotArriveTime;
                latestSnapshot = data;
                snapshotArriveTime = performance.now();

                // Collect events
                if (data.events) {
                    for (var i = 0; i < data.events.length; i++) {
                        pendingEvents.push(data.events[i]);
                        // Detect level-up for local player
                        var evt = data.events[i];
                        if (evt.type === 'level_up' && evt.data && evt.data.playerId === localPlayerId) {
                            pendingLevelUps.push({
                                playerId: evt.data.playerId,
                                newLevel: evt.data.newLevel,
                                skillChoices: evt.data.skillChoices
                            });
                        }
                    }
                }

                if (onSnapshot) onSnapshot(data);
            }
        };

        ws.onclose = function() {
            connected = false;
            if (onDisconnect) onDisconnect();
        };

        ws.onerror = function() { connected = false; };
    }

    function disconnect() {
        if (ws) { ws.close(); ws = null; }
        connected = false;
        latestSnapshot = null;
        previousSnapshot = null;
        inputHistory = [];
        pendingEvents = [];
        pendingLevelUps = [];
        enemyById = {};
        projectileById = {};
    }

    var _pendingDodge = false;
    function sendInput(moveX, moveY, targetX, targetY, useUltimate) {
        if (!ws || !connected) return;
        inputSeq++;
        var input = {
            type: 'input', seq: inputSeq,
            moveX: moveX, moveY: moveY,
            targetX: targetX, targetY: targetY,
            useUltimate: !!useUltimate,
            dodge: _pendingDodge,
            timestamp: Date.now()
        };
        _pendingDodge = false;
        ws.send(JSON.stringify(input));
        inputHistory.push({ seq: inputSeq, input: input, time: performance.now() });
        if (inputHistory.length > 60) inputHistory = inputHistory.slice(-60);
    }

    function sendSkillChoice(skillId) {
        if (!ws || !connected) return;
        ws.send(JSON.stringify({ type: 'skill_choice', skillId: skillId }));
    }

    function sendBuildSelection(skills, attributes) {
        if (!ws || !connected) return;
        var msg = { type: 'build_selection', skills: skills };
        if (attributes) msg.attributes = attributes;
        ws.send(JSON.stringify(msg));
    }

    // --- Interpolation helper ---
    // Returns 0..1 representing how far we are between prev and latest snapshot
    function getInterpolationT() {
        if (!previousSnapshot || !latestSnapshot) return 1;
        var elapsed = performance.now() - snapshotArriveTime;
        // We render one snapshot behind (interpolation delay = one snapshot interval)
        // so t = elapsed / interval, clamped to [0, 1]
        var interval = snapshotArriveTime - prevSnapshotArriveTime;
        if (interval <= 0) interval = SNAPSHOT_INTERVAL;
        var t = elapsed / interval;
        return t < 0 ? 0 : (t > 1 ? 1 : t);
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    /**
     * Incremental snapshot application.
     *
     * Instead of destroying and recreating entities each frame, we:
     * 1. Update scalar game state (wave, gameTime, storm)
     * 2. Update players IN-PLACE by index (stable order from server)
     * 3. Update enemies IN-PLACE by server ID (add new, mark removed as dead)
     * 4. Update projectiles similarly
     * 5. Interpolate all remote entity positions between prev/latest snapshots
     */
    function applySnapshot(gameState) {
        if (!latestSnapshot) return;
        var snap = latestSnapshot;
        var prev = previousSnapshot;
        var t = getInterpolationT();

        // --- Scalar state ---
        gameState.wave = snap.wave || 1;
        gameState.gameTime = snap.gameTime || 0;

        // Storm
        if (snap.stormActive) {
            gameState.stormZone = {
                active: true,
                centerX: snap.stormCenterX,
                centerY: snap.stormCenterY,
                radius: snap.stormRadius
            };
        }

        // --- Players (incremental, by index) ---
        if (snap.players) {
            // Grow allPlayers if needed (never shrink — dead players stay in array)
            while (gameState.allPlayers.length < snap.players.length) {
                gameState.allPlayers.push({
                    id: 0, name: '', x: 0, y: 0, hp: 0, maxHp: 100,
                    radius: 14, alive: false, kills: 0, level: 1,
                    factionId: 0, isBot: true, isLocal: false, skinId: 'default'
                });
            }

            for (var i = 0; i < snap.players.length; i++) {
                var sp = snap.players[i];
                var ap = gameState.allPlayers[i];

                // Update properties in-place (no new object)
                ap.id = i;
                ap.serverId = sp.id;
                ap.name = sp.nickname || sp.id;
                ap.hp = sp.hp;
                ap.maxHp = sp.maxHp;
                ap.level = sp.level;
                ap.kills = sp.kills;
                ap.alive = sp.alive;
                ap.factionId = sp.factionId;
                ap.isBot = sp.isBot;
                ap.isLocal = (sp.id === localPlayerId);
                ap.shieldActive = sp.shieldActive;
                ap.characterType = sp.characterType || 'warrior';
                ap.skinId = sp.skinId || 'default';
                ap.facingAngle = sp.facingAngle || 0;

                if (sp.id === localPlayerId) {
                    // Local player: server position is authority (prediction applied separately)
                    ap.x = sp.x;
                    ap.y = sp.y;
                    gameState.player.x = sp.x;
                    gameState.player.y = sp.y;
                    gameState.player.hp = sp.hp;
                    gameState.player.maxHp = sp.maxHp;
                    gameState.player.shieldActive = sp.shieldActive;
                    gameState.player.kills = sp.kills;
                    gameState.player.speed = sp.speed || gameState.player.speed;
                    gameState.player.alive = sp.alive;
                    gameState.playerLevel = sp.level;
                    gameState.playerXP = sp.xp || 0;
                    gameState.xpToNextLevel = sp.xpToNextLevel || 0;
                    gameState.player.critChance = sp.furyActive ? 0.3 : 0;

                    // Skill effect fields
                    gameState.player._chainCount = sp.chainCount || 0;
                    gameState.player.slowAura = sp.slowAura || 0;
                    gameState.player._fireDmg = sp.fireTrailDmg || 0;

                    // Skills
                    if (sp.skills) {
                        gameState.ownedSkills = [];
                        gameState.skillLevels = {};
                        for (var si = 0; si < sp.skills.length; si++) {
                            var parts = sp.skills[si].split(':');
                            var sId = parts[0];
                            var sLv = parseInt(parts[1]) || 1;
                            if (gameState.ownedSkills.indexOf(sId) < 0) {
                                gameState.ownedSkills.push(sId);
                            }
                            gameState.skillLevels[sId] = sLv;
                        }
                    }
                } else {
                    // Remote player: interpolate position
                    var prevP = findPlayerInSnapshot(prev, sp.id);
                    if (prevP) {
                        ap.x = lerp(prevP.x, sp.x, t);
                        ap.y = lerp(prevP.y, sp.y, t);
                    } else {
                        ap.x = sp.x;
                        ap.y = sp.y;
                    }
                }
            }
        }

        // --- Enemies (incremental, by server ID) ---
        if (snap.enemies) {
            var prevEnemyMap = buildEnemyMap(prev);
            var snapEnemyIds = {};

            for (var ei = 0; ei < snap.enemies.length; ei++) {
                var se = snap.enemies[ei];
                snapEnemyIds[se.id] = true;

                var existing = enemyById[se.id];
                if (existing && !existing._removed) {
                    // UPDATE in-place
                    existing.hp = se.hp;
                    existing.maxHp = se.maxHp;
                    existing.enemyType = se.type;
                    existing.affix = se.affix;
                    existing.isBoss = se.type === 'boss';
                    existing.isMiniBoss = se.type === 'miniBoss';
                    existing.hostile = se.hostile !== false;
                    existing._spawnFade = se.spawnFade != null ? se.spawnFade : existing._spawnFade;
                    if (se.radius) existing.radius = se.radius;

                    // Interpolate position
                    var pe = prevEnemyMap[se.id];
                    if (pe) {
                        existing.x = lerp(pe.x, se.x, t);
                        existing.y = lerp(pe.y, se.y, t);
                    } else {
                        existing.x = se.x;
                        existing.y = se.y;
                    }
                } else {
                    // NEW enemy — add to entities array
                    // Use server-provided radius (varies by type: boss=26, tank=18, etc.)
                    var enemyRadius = se.radius || 10;
                    var newEnemy = {
                        type: 'enemy',
                        _serverId: se.id,
                        x: se.x, y: se.y,
                        hp: se.hp, maxHp: se.maxHp,
                        radius: enemyRadius, dead: false,
                        enemyType: se.type, affix: se.affix,
                        hostile: se.hostile !== false,
                        _spawnFade: se.spawnFade || 0,
                        speed: 75, damage: 12, _hitFlash: 0,
                        isBoss: se.type === 'boss',
                        isMiniBoss: se.type === 'miniBoss',
                        _removed: false
                    };
                    gameState.entities.push(newEnemy);
                    enemyById[se.id] = newEnemy;
                }
            }

            // Mark removed enemies (present in cache but not in snapshot)
            for (var eid in enemyById) {
                if (!snapEnemyIds[eid] && enemyById[eid] && !enemyById[eid]._removed) {
                    enemyById[eid].dead = true;
                    enemyById[eid]._removed = true;
                }
            }

            // Periodic cleanup: remove dead entities from array (every 5 snapshots)
            if (snap.tick % 5 === 0) {
                var cleanEntities = [];
                for (var ci = 0; ci < gameState.entities.length; ci++) {
                    var ce = gameState.entities[ci];
                    if (ce.type === 'enemy' && ce._removed) {
                        delete enemyById[ce._serverId];
                    } else {
                        cleanEntities.push(ce);
                    }
                }
                gameState.entities = cleanEntities;
            }
        }

        // --- Projectiles (incremental, by server ID) ---
        if (snap.projectiles) {
            var snapProjIds = {};

            for (var pi = 0; pi < snap.projectiles.length; pi++) {
                var sp2 = snap.projectiles[pi];
                snapProjIds[sp2.id] = true;

                var existingP = projectileById[sp2.id];
                if (existingP && !existingP._removed) {
                    // UPDATE in-place (projectiles move fast, just snap position)
                    existingP.x = sp2.x;
                    existingP.y = sp2.y;
                    existingP.vx = sp2.vx || existingP.vx;
                    existingP.vy = sp2.vy || existingP.vy;
                } else {
                    var newProj = {
                        type: 'projectile',
                        _serverId: sp2.id,
                        x: sp2.x, y: sp2.y,
                        vx: sp2.vx || 0, vy: sp2.vy || 0,
                        ownerId: sp2.ownerId,
                        color: sp2.color || '#ff0',
                        visual: sp2.visual || 'bullet',
                        radius: 3, _removed: false
                    };
                    gameState.entities.push(newProj);
                    projectileById[sp2.id] = newProj;
                }
            }

            // Mark removed projectiles
            for (var pid in projectileById) {
                if (!snapProjIds[pid] && projectileById[pid] && !projectileById[pid]._removed) {
                    projectileById[pid]._removed = true;
                    projectileById[pid].dead = true;
                }
            }

            // Cleanup dead projectiles
            if (snap.tick % 3 === 0) {
                var cleanProj = [];
                for (var cpi = 0; cpi < gameState.entities.length; cpi++) {
                    var cpe = gameState.entities[cpi];
                    if (cpe.type === 'projectile' && cpe._removed) {
                        delete projectileById[cpe._serverId];
                    } else {
                        cleanProj.push(cpe);
                    }
                }
                gameState.entities = cleanProj;
            }
        }
    }

    // --- Helpers ---

    function findPlayerInSnapshot(snapshot, playerId) {
        if (!snapshot || !snapshot.players) return null;
        for (var i = 0; i < snapshot.players.length; i++) {
            if (snapshot.players[i].id === playerId) return snapshot.players[i];
        }
        return null;
    }

    function buildEnemyMap(snapshot) {
        var map = {};
        if (snapshot && snapshot.enemies) {
            for (var i = 0; i < snapshot.enemies.length; i++) {
                map[snapshot.enemies[i].id] = snapshot.enemies[i];
            }
        }
        return map;
    }

    function predictLocalMovement(player, moveX, moveY, speed, dt, worldW, worldH) {
        if (!connected) return;
        var len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > 0.01) {
            player.x += (moveX / len) * speed * dt;
            player.y += (moveY / len) * speed * dt;
            player.x = Math.max(0, Math.min(worldW, player.x));
            player.y = Math.max(0, Math.min(worldH, player.y));
        }
    }

    function reconcile() {
        if (!latestSnapshot) return;
        var ackedSeq = 0;
        if (latestSnapshot.lastAckedInputs && latestSnapshot.lastAckedInputs[localPlayerId]) {
            ackedSeq = latestSnapshot.lastAckedInputs[localPlayerId];
        }
        var unacked = [];
        for (var i = 0; i < inputHistory.length; i++) {
            if (inputHistory[i].seq > ackedSeq) unacked.push(inputHistory[i]);
        }
        inputHistory = unacked;
    }

    function drainEvents() {
        var events = pendingEvents.slice();
        pendingEvents = [];
        return events;
    }

    function getPendingLevelUps() { return pendingLevelUps; }
    function clearPendingLevelUps() { pendingLevelUps = []; }

    // Public API
    return {
        connect: connect,
        disconnect: disconnect,
        sendInput: sendInput,
        sendSkillChoice: sendSkillChoice,
        sendBuildSelection: sendBuildSelection,
        triggerDodge: function() { _pendingDodge = true; },
        applySnapshot: applySnapshot,
        predictLocalMovement: predictLocalMovement,
        reconcile: reconcile,
        drainEvents: drainEvents,
        getPendingLevelUps: getPendingLevelUps,
        clearPendingLevelUps: clearPendingLevelUps,

        isConnected: function() { return connected; },
        getLatestSnapshot: function() { return latestSnapshot; },
        getInputSendRate: function() { return INPUT_SEND_RATE; },
        getLocalPlayerId: function() { return localPlayerId; }
    };
})();
