/**
 * Survivor AI 模拟核心 — Node.js 环境，不依赖 Canvas
 * 8 种 AI 策略模拟游戏并输出统计数据
 */

var path = require('path');
var engine = require(path.join(__dirname, '..', 'game', 'js', 'survivor_engine.js'));
var skillsMod = require(path.join(__dirname, '..', 'game', 'js', 'skills.js'));

var SKILL_IDS = skillsMod.SKILL_POOL.map(function(s) { return s.id; });
var OFFENSE_SKILLS = ['attack_up', 'attack_speed', 'pierce', 'scatter', 'chain_lightning', 'fire_trail', 'explosive', 'crit'];
var DEFENSE_SKILLS = ['hp_regen', 'shield', 'max_hp', 'lifesteal'];
var UTILITY_SKILLS = ['move_speed', 'frost_aura', 'xp_magnet'];

var CLASS_MAPPING = {
  aggressive: 'warrior',
  defensive: 'scout',
  balanced: 'warrior',
  greedy: 'scout',
  casual_teen: 'scout',
  strategic_adult: 'mage',
  impatient_newbie: 'warrior',
  completionist: 'mage'
};

var STRATEGIES = {
  aggressive: {
    moveStyle: 'toward',
    skillPreference: ['attack_speed', 'crit', 'attack_up', 'scatter', 'pierce', 'explosive', 'fire_trail', 'chain_lightning', 'lifesteal', 'max_hp'],
    desc: '硬核男性玩家：朝敌人冲，attack_speed+crit→狂战士进化'
  },
  defensive: {
    moveStyle: 'away',
    skillPreference: ['hp_regen', 'lifesteal', 'shield', 'max_hp', 'frost_aura', 'move_speed', 'xp_magnet', 'attack_up'],
    desc: '谨慎女性玩家：远离敌人，优先防御类技能（hp_regen+lifesteal→吸血领主进化）'
  },
  balanced: {
    moveStyle: 'kite',
    skillPreference: ['shield', 'max_hp', 'attack_up', 'hp_regen', 'scatter', 'move_speed', 'crit', 'frost_aura', 'pierce', 'xp_magnet', 'attack_speed', 'lifesteal', 'chain_lightning', 'fire_trail', 'explosive'],
    desc: '均衡型中年玩家：shield+max_hp→钢铁堡垒进化'
  },
  greedy: {
    moveStyle: 'collect',
    skillPreference: ['move_speed', 'xp_magnet', 'attack_up', 'scatter', 'explosive', 'attack_speed', 'pierce', 'crit'],
    desc: '效率型玩家：move_speed+xp_magnet→疾风猎手进化'
  },
  casual_teen: {
    moveStyle: 'random',
    skillPreference: null, // random pick
    desc: '休闲青少年：操作随机，容易放弃'
  },
  strategic_adult: {
    moveStyle: 'kite',
    skillPreference: ['scatter', 'pierce', 'attack_speed', 'frost_aura', 'crit', 'chain_lightning', 'fire_trail', 'explosive'],
    desc: '策略型成人：根据 build 选互补技能'
  },
  impatient_newbie: {
    moveStyle: 'straight',
    skillPreference: ['fire_trail', 'explosive', 'attack_up', 'scatter', 'crit', 'pierce', 'chain_lightning', 'hp_regen', 'max_hp', 'lifesteal'],
    desc: '急躁新手：喜欢大范围爆炸技能，fire_trail+explosive→末日审判进化'
  },
  completionist: {
    moveStyle: 'kite',
    skillPreference: ['scatter', 'pierce', 'attack_speed', 'crit', 'hp_regen', 'shield', 'chain_lightning', 'fire_trail', 'frost_aura', 'lifesteal', 'xp_magnet', 'explosive', 'max_hp', 'move_speed', 'attack_up'],
    isCompletionist: true,
    desc: '收集控：scatter+pierce先到2级触发bullet_hell，再收集其余'
  }
};

function pickSkill(strategy, owned) {
  var ownedIds = owned.map(function(o) { return typeof o === 'string' ? o : o.id; });

  // Count levels per skill
  var lvlCounts = {};
  for (var j = 0; j < owned.length; j++) {
    var sid = typeof owned[j] === 'string' ? owned[j] : owned[j].id;
    lvlCounts[sid] = (lvlCounts[sid] || 0) + 1;
  }

  // Completionist: prefer unskilled
  if (strategy.isCompletionist) {
    for (var i = 0; i < SKILL_IDS.length; i++) {
      if (ownedIds.indexOf(SKILL_IDS[i]) === -1) return SKILL_IDS[i];
    }
  }

  // Random pick for casual_teen
  if (!strategy.skillPreference) {
    return SKILL_IDS[Math.floor(Math.random() * SKILL_IDS.length)];
  }

  var pref = strategy.skillPreference;

  // Evolution-focused: level top 2 skills to 2 first, then diversify
  var evoPairSize = strategy.evoPairSize || 2;
  var topPair = pref.slice(0, evoPairSize);
  for (var i = 0; i < topPair.length; i++) {
    if ((lvlCounts[topPair[i]] || 0) < 2) return topPair[i];
  }

  // Then pick remaining unpicked skills from preference list
  for (var i = evoPairSize; i < pref.length; i++) {
    if (ownedIds.indexOf(pref[i]) === -1) return pref[i];
  }

  // Level up existing skills in preference order
  for (var i = 0; i < pref.length; i++) {
    if ((lvlCounts[pref[i]] || 0) < 5) return pref[i];
  }
  return SKILL_IDS[Math.floor(Math.random() * SKILL_IDS.length)];
}

function movePlayer(player, entities, moveStyle, mapW, mapH) {
  var enemies = [];
  for (var i = 0; i < entities.length; i++) {
    if (entities[i].type === 'enemy' && entities[i].active && entities[i].hp > 0) {
      enemies.push(entities[i]);
    }
  }
  if (enemies.length === 0) return;

  var nearest = enemies[0], nd = Infinity;
  var sumX = 0, sumY = 0;
  for (var i = 0; i < enemies.length; i++) {
    var dx = enemies[i].x - player.x, dy = enemies[i].y - player.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < nd) { nd = d; nearest = enemies[i]; }
    sumX += enemies[i].x; sumY += enemies[i].y;
  }
  var avgX = sumX / enemies.length, avgY = sumY / enemies.length;

  switch (moveStyle) {
    case 'toward':
      // Approach enemies but maintain ~60px combat distance (not suicidal)
      var tdx = nearest.x - player.x, tdy = nearest.y - player.y;
      var tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist > 60) {
        player.targetX = nearest.x;
        player.targetY = nearest.y;
      } else if (tdist < 30) {
        // Too close, back off slightly
        player.targetX = player.x - (tdx / tdist) * 40;
        player.targetY = player.y - (tdy / tdist) * 40;
      }
      break;
    case 'away':
      var awayX = player.x - (avgX - player.x);
      var awayY = player.y - (avgY - player.y);
      player.targetX = Math.max(20, Math.min(mapW - 20, awayX));
      player.targetY = Math.max(20, Math.min(mapH - 20, awayY));
      break;
    case 'kite':
      if (nd < 80) {
        player.targetX = Math.max(20, Math.min(mapW - 20, player.x - (nearest.x - player.x)));
        player.targetY = Math.max(20, Math.min(mapH - 20, player.y - (nearest.y - player.y)));
      } else {
        player.targetX = mapW / 2 + (Math.random() - 0.5) * 200;
        player.targetY = mapH / 2 + (Math.random() - 0.5) * 200;
      }
      break;
    case 'collect':
      var gems = [];
      for (var i = 0; i < entities.length; i++) {
        if (entities[i].type === 'xp_gem' && entities[i].active) gems.push(entities[i]);
      }
      if (gems.length > 0) {
        var ng = gems[0], ngd = Infinity;
        for (var i = 0; i < gems.length; i++) {
          var d = Math.sqrt(Math.pow(gems[i].x - player.x, 2) + Math.pow(gems[i].y - player.y, 2));
          if (d < ngd) { ngd = d; ng = gems[i]; }
        }
        player.targetX = ng.x;
        player.targetY = ng.y;
      } else if (enemies.length > 0) {
        // When no gems, kite toward enemies to generate kills
        player.targetX = nearest.x;
        player.targetY = nearest.y;
      }
      break;
    case 'random':
      if (Math.random() < 0.1) {
        player.targetX = Math.random() * mapW;
        player.targetY = Math.random() * mapH;
      }
      break;
    case 'straight':
      if (!player._straightDir || Math.random() < 0.05) {
        player._straightDir = Math.random() * Math.PI * 2;
      }
      player.targetX = player.x + Math.cos(player._straightDir) * 100;
      player.targetY = player.y + Math.sin(player._straightDir) * 100;
      break;
  }
}

function simulateGame(strategyName) {
  var strategy = STRATEGIES[strategyName];
  var loop = new engine.GameLoop();
  // Use character class for this strategy
  var className = CLASS_MAPPING[strategyName] || 'warrior';
  var classData = (engine.CHARACTER_CLASSES || {})[className] || {};
  var playerOpts = { x: 400, y: 300 };
  if (classData.hp) playerOpts.hp = classData.hp;
  if (classData.maxHp) playerOpts.maxHp = classData.maxHp;
  if (classData.attackDamage) playerOpts.attackDamage = classData.attackDamage;
  if (classData.speed) playerOpts.speed = classData.speed;
  var player = new engine.Player(playerOpts);
  var spawner = new engine.WaveSpawner();

  loop.entities = [player];
  loop.mapWidth = 800;
  loop.mapHeight = 600;

  var xpSys = new skillsMod.XPSystem();
  var ownedSkills = [];
  var skillPickCounts = {};
  var levelTracker = 1;
  var time = 0;
  var dt = 0.1;
  var lastWave = 0;
  var waveTimer = 99;
  var enemyTypesSeen = {};
  var MAX_TIME = 600; // Cap at 10 minutes
  var evoTriggered = [];
  var powerupsCollected = 0;
  var waveEventsEncountered = 0;

  // Fun-factor tracking
  var fun = {
    first_level_up_time: -1,
    kills_first_30s: 0,
    near_death_count: 0,     // HP dropped below 30%
    _was_near_death: false,
    idle_seconds: 0,         // seconds with 0 kills in window
    _last_kill_count: 0,
    _idle_timer: 0,
    max_enemies_on_screen: 0,
    kill_timeline: [],       // kills per 10s bucket
    _bucket_kills: 0,
    _bucket_timer: 0,
    hp_low_point: 1.0,      // lowest HP ratio reached
    power_spikes: 0,        // sudden DPS jumps after level-up
    _last_dps: 0,
    longest_no_kill_streak: 0, // longest gap between kills
    _time_since_last_kill: 0,
    first_evo_time: -1
  };

  // Apply class passives
  if (classData.thornsDamage) player.thornsDamage = classData.thornsDamage;
  if (classData.passive && classData.passive.dodgeChance) player.dodgeChance = classData.passive.dodgeChance;
  if (classData.passive && classData.passive.rangeBonus) player.attackRange = (player.attackRange || 300) * (1 + classData.passive.rangeBonus);

  // Aggressive melee buff: closer engagement = higher DPS
  if (strategy.moveStyle === 'toward') {
    player.attackDamage = Math.round(player.attackDamage * 1.4);
    player.attackCooldown *= 0.7;
  }

  // Greedy collector buff: wider XP magnet from the start
  if (strategy.moveStyle === 'collect') {
    player.xpMagnetRange = 250;
  }

  while ((player.hp > 0 || player.revivesLeft > 0) && player.active && time < MAX_TIME) {
    // Auto-revive if dead with revives remaining
    if (player.hp <= 0 && player.revivesLeft > 0) {
      player.revive();
    }
    if (player.hp <= 0) break;
    time += dt;

    // Spawn waves — dynamic interval (matches engine)
    waveTimer += dt;
    var waveInterval = lastWave < 4 ? 15 : lastWave < 8 ? 12 : 10;
    if (waveTimer >= waveInterval) {
      waveTimer = 0;
      lastWave++;
      var newEnemies = spawner.spawnWave(lastWave, loop.mapWidth, loop.mapHeight);
      for (var i = 0; i < newEnemies.length; i++) {
        loop.entities.push(newEnemies[i]);
        enemyTypesSeen[newEnemies[i].enemyType || 'normal'] = true;
      }
      // Wave events: 20% chance per wave after wave 3
      if (lastWave >= 3 && Math.random() < 0.2) {
        waveEventsEncountered++;
        // Apply supply_drop event as example
        if (Math.random() < 0.5) player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.3));
      }
    }

    // Trickle spawn: if few enemies near player, fill the gap
    var nearEnemies = 0;
    var enemiesOnScreen = 0;
    for (var fi = 0; fi < loop.entities.length; fi++) {
      if (loop.entities[fi].type === 'enemy' && loop.entities[fi].active && loop.entities[fi].hp > 0) {
        enemiesOnScreen++;
        var ddx = loop.entities[fi].x - player.x, ddy = loop.entities[fi].y - player.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < 350) nearEnemies++;
      }
    }
    if (nearEnemies < 2 && waveTimer > 2 && lastWave > 0) {
      for (var tc = 0; tc < 4; tc++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 150 + Math.random() * 100;
        var tx = Math.max(10, Math.min(loop.mapWidth - 10, player.x + Math.cos(angle) * dist));
        var ty = Math.max(10, Math.min(loop.mapHeight - 10, player.y + Math.sin(angle) * dist));
        var tmpl = engine.ENEMY_TYPES['fast'];
        var te = new engine.Entity({
          x: tx, y: ty, hp: tmpl.hp, radius: tmpl.radius,
          type: 'enemy', damage: tmpl.damage, xpValue: tmpl.xpValue, speed: tmpl.speed
        });
        te.maxHp = te.hp;
        te.enemyType = 'fast';
        loop.entities.push(te);
      }
    }
    if (enemiesOnScreen > fun.max_enemies_on_screen) fun.max_enemies_on_screen = enemiesOnScreen;

    // AI movement
    movePlayer(player, loop.entities, strategy.moveStyle, loop.mapWidth, loop.mapHeight);

    var killsBefore = player.kills || 0;
    loop.tick(dt);
    var killsAfter = player.kills || 0;
    var killsThisTick = killsAfter - killsBefore;

    // Fun-factor: kill timeline (10s buckets)
    fun._bucket_kills += killsThisTick;
    fun._bucket_timer += dt;
    if (fun._bucket_timer >= 10) {
      fun.kill_timeline.push(fun._bucket_kills);
      fun._bucket_kills = 0;
      fun._bucket_timer = 0;
    }

    // Fun-factor: kills in first 30s
    if (time <= 30) fun.kills_first_30s += killsThisTick;

    // Fun-factor: near-death tracking
    var hpRatio = player.hp / Math.max(player.maxHp, 1);
    if (hpRatio < fun.hp_low_point) fun.hp_low_point = hpRatio;
    if (hpRatio < 0.3 && !fun._was_near_death) {
      fun.near_death_count++;
      fun._was_near_death = true;
    } else if (hpRatio >= 0.5) {
      fun._was_near_death = false;
    }

    // Fun-factor: idle/no-kill tracking
    if (killsThisTick > 0) {
      if (fun._time_since_last_kill > fun.longest_no_kill_streak) {
        fun.longest_no_kill_streak = fun._time_since_last_kill;
      }
      fun._time_since_last_kill = 0;
    } else {
      fun._time_since_last_kill += dt;
    }
    if (killsAfter === fun._last_kill_count) {
      fun._idle_timer += dt;
      if (fun._idle_timer >= 5) { fun.idle_seconds += dt; }
    } else {
      fun._idle_timer = 0;
      fun._last_kill_count = killsAfter;
    }

    // Cap entity count to prevent O(n²) blowup
    if (loop.entities.length > 200) {
      // Remove oldest xp_gems first
      var kept = [];
      var gemCount = 0;
      for (var i = 0; i < loop.entities.length; i++) {
        if (loop.entities[i].type === 'xp_gem') {
          gemCount++;
          if (gemCount > 30) continue; // drop old gems
        }
        kept.push(loop.entities[i]);
      }
      loop.entities = kept;
    }

    // XP collection and level up
    if (player.xp > 0) {
      xpSys.addXP(player.xp);
      player.xp = 0;
      while (xpSys.level > levelTracker) {
        if (fun.first_level_up_time < 0) fun.first_level_up_time = time;
        var dpsBefore = (player.attackDamage || 10) / Math.max(player.attackCooldown || 0.8, 0.1);
        var hpBefore = player.maxHp || 100;
        var spdBefore = player.speed || 200;
        var chosen = pickSkill(strategy, ownedSkills);
        ownedSkills.push(chosen);
        skillPickCounts[chosen] = (skillPickCounts[chosen] || 0) + 1;
        skillsMod.applySkill(player, chosen, skillPickCounts[chosen]);
        var dpsAfter = (player.attackDamage || 10) / Math.max(player.attackCooldown || 0.1, 0.1);
        // Power spike = any significant stat change (DPS, HP, speed, new capability)
        var isPowerSpike = dpsAfter > dpsBefore * 1.25 ||
          (player.maxHp || 100) > hpBefore * 1.15 ||
          (player.speed || 200) > spdBefore * 1.08 ||
          chosen === 'shield' || chosen === 'pierce' || chosen === 'chain_lightning';
        if (isPowerSpike) fun.power_spikes++;
        levelTracker++;
        // Check for skill evolutions
        if (skillsMod.checkEvolutions) {
          var evos = skillsMod.checkEvolutions(skillPickCounts);
          for (var e = 0; e < evos.length; e++) {
            if (evoTriggered.indexOf(evos[e].id) === -1) {
              evoTriggered.push(evos[e].id);
              if (fun.first_evo_time < 0) fun.first_evo_time = time;
            }
          }
        }
      }
    }

    // Safety: re-add player if removed
    if (loop.entities.indexOf(player) === -1 && player.hp > 0) {
      loop.entities.unshift(player);
    }
  }

  // Count powerups from boss waves survived
  for (var bw = 5; bw <= lastWave; bw += 5) {
    if (Math.random() < 0.5) powerupsCollected++;
  }

  // Finalize kill timeline
  if (fun._bucket_kills > 0 || fun._bucket_timer > 0) {
    fun.kill_timeline.push(fun._bucket_kills);
  }

  return {
    survival_time: Math.round(time * 10) / 10,
    kills: player.kills || 0,
    level: xpSys.level,
    wave: lastWave,
    skill_pick_rates: skillPickCounts,
    enemy_types: Object.keys(enemyTypesSeen),
    class_used: className,
    evolutions_triggered: evoTriggered,
    powerups_collected: powerupsCollected,
    max_streak: player.maxKillStreak || 0,
    wave_events: waveEventsEncountered,
    fun_metrics: {
      first_level_up_time: Math.round(fun.first_level_up_time * 10) / 10,
      kills_first_30s: fun.kills_first_30s,
      near_death_count: fun.near_death_count,
      hp_low_point: Math.round(fun.hp_low_point * 100) / 100,
      idle_seconds: Math.round(fun.idle_seconds),
      max_enemies_on_screen: fun.max_enemies_on_screen,
      kill_timeline: fun.kill_timeline,
      power_spikes: fun.power_spikes,
      longest_no_kill_streak: Math.round(fun.longest_no_kill_streak * 10) / 10,
      first_evo_time: fun.first_evo_time > 0 ? Math.round(fun.first_evo_time * 10) / 10 : -1
    }
  };
}

function generateFeedback(results) {
  var suggestions = [];
  var strats = results.strategies || {};
  var names = Object.keys(strats);

  // === FUN FACTOR SCORES ===
  var scores = { early_engagement: 0, tension: 0, power_fantasy: 0, pacing: 0, build_diversity: 0 };

  // 1. EARLY ENGAGEMENT (0-100): How quickly does the game hook the player?
  var avgFirstLevelUp = 0, avgKillsFirst30 = 0;
  names.forEach(function(n) {
    var fm = strats[n].fun_metrics || {};
    avgFirstLevelUp += (fm.avg_first_level_up || 60);
    avgKillsFirst30 += (fm.avg_kills_first_30s || 0);
  });
  avgFirstLevelUp /= names.length;
  avgKillsFirst30 /= names.length;
  // First level-up within 20s = 100, >60s = 0
  scores.early_engagement = Math.round(
    Math.max(0, Math.min(100, (60 - avgFirstLevelUp) / 40 * 60)) +
    Math.max(0, Math.min(40, avgKillsFirst30 / 10 * 40))
  );
  if (avgFirstLevelUp > 30) {
    suggestions.push({
      category: 'early_engagement',
      priority: 'HIGH',
      issue: '首次升级太慢(平均' + Math.round(avgFirstLevelUp) + 's)，玩家会在30秒内流失',
      fix: '降低1-3级XP需求，或增加初始波次敌人数量',
      metric: 'first_level_up_time',
      current: Math.round(avgFirstLevelUp),
      target: 20
    });
  }
  if (avgKillsFirst30 < 5) {
    suggestions.push({
      category: 'early_engagement',
      priority: 'HIGH',
      issue: '前30秒击杀太少(平均' + Math.round(avgKillsFirst30) + ')，开局无聊',
      fix: '增加Wave 1敌人数量到15+，提高初始攻击速度',
      metric: 'kills_first_30s',
      current: Math.round(avgKillsFirst30),
      target: 8
    });
  }

  // 2. TENSION (0-100): Does the player ever feel in danger?
  var avgNearDeath = 0, avgHpLow = 0;
  names.forEach(function(n) {
    var fm = strats[n].fun_metrics || {};
    avgNearDeath += (fm.avg_near_death || 0);
    avgHpLow += (fm.avg_hp_low_point || 1);
  });
  avgNearDeath /= names.length;
  avgHpLow /= names.length;
  // 2-5 near-death moments per game = optimal
  scores.tension = Math.round(Math.min(100, avgNearDeath / 3 * 70 + (1 - avgHpLow) * 30));
  if (avgNearDeath < 1) {
    suggestions.push({
      category: 'tension',
      priority: 'MEDIUM',
      issue: '游戏太安全(平均' + Math.round(avgNearDeath * 10) / 10 + '次濒死)，缺乏紧张感',
      fix: '提高敌人伤害或减少初始HP，让玩家感受到压力',
      metric: 'near_death_count',
      current: Math.round(avgNearDeath * 10) / 10,
      target: 3
    });
  }

  // 3. POWER FANTASY (0-100): Does the player feel like they're getting stronger?
  var avgStreak = 0, avgPowerSpikes = 0;
  names.forEach(function(n) {
    avgStreak += (strats[n].max_streak || 0);
    var fm = strats[n].fun_metrics || {};
    avgPowerSpikes += (fm.avg_power_spikes || 0);
  });
  avgStreak /= names.length;
  avgPowerSpikes /= names.length;
  scores.power_fantasy = Math.round(Math.min(100, avgStreak / 50 * 50 + avgPowerSpikes / 3 * 50));
  if (avgPowerSpikes < 2) {
    suggestions.push({
      category: 'power_fantasy',
      priority: 'MEDIUM',
      issue: '技能升级感不够明显(平均' + Math.round(avgPowerSpikes * 10) / 10 + '次DPS跳跃)',
      fix: '增大攻击力/攻速技能的加成幅度(如+15%→+25%)',
      metric: 'power_spikes',
      current: Math.round(avgPowerSpikes * 10) / 10,
      target: 4
    });
  }

  // 4. PACING (0-100): Is the gameplay rhythm good? (not too many idle moments)
  var avgIdle = 0, worstNoKill = 0;
  names.forEach(function(n) {
    var fm = strats[n].fun_metrics || {};
    avgIdle += (fm.avg_idle_seconds || 0);
    if ((fm.worst_no_kill_streak || 0) > worstNoKill) worstNoKill = fm.worst_no_kill_streak;
  });
  avgIdle /= names.length;
  scores.pacing = Math.round(Math.max(0, 100 - avgIdle * 2 - worstNoKill * 3));
  if (worstNoKill > 10) {
    suggestions.push({
      category: 'pacing',
      priority: 'HIGH',
      issue: '存在' + Math.round(worstNoKill) + '秒无击杀空窗期，节奏中断',
      fix: '缩短波次间隔，或在空窗期加速下一波生成',
      metric: 'longest_no_kill_streak',
      current: Math.round(worstNoKill),
      target: 8
    });
  }
  if (avgIdle > 30) {
    suggestions.push({
      category: 'pacing',
      priority: 'MEDIUM',
      issue: '平均' + Math.round(avgIdle) + '秒闲置时间，说明战斗密度不够',
      fix: '增加每波敌人数量，减少波次间隔',
      metric: 'idle_seconds',
      current: Math.round(avgIdle),
      target: 15
    });
  }

  // 5. BUILD DIVERSITY (0-100): Do different strategies feel different?
  var builds = {};
  names.forEach(function(n) {
    var skills = Object.keys(strats[n].skill_pick_rates || {});
    builds[n] = skills.sort().join(',');
  });
  var uniqueBuilds = {};
  names.forEach(function(n) { uniqueBuilds[builds[n]] = true; });
  var uniqueCount = Object.keys(uniqueBuilds).length;
  // Evolution diversity
  var evoCount = 0;
  var allEvos = {};
  names.forEach(function(n) {
    var evos = strats[n].evolutions_triggered || [];
    if (evos.length > 0) evoCount++;
    evos.forEach(function(e) { allEvos[e] = true; });
  });
  var uniqueEvos = Object.keys(allEvos).length;
  scores.build_diversity = Math.round(Math.min(100, uniqueCount / names.length * 50 + uniqueEvos / 7 * 50));

  // Overall fun score (weighted)
  scores.overall = Math.round(
    scores.early_engagement * 0.30 +
    scores.tension * 0.20 +
    scores.power_fantasy * 0.20 +
    scores.pacing * 0.15 +
    scores.build_diversity * 0.15
  );

  // Sort suggestions by priority
  suggestions.sort(function(a, b) {
    var pri = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (pri[a.priority] || 2) - (pri[b.priority] || 2);
  });

  // Ensure at least 2 suggestions
  if (suggestions.length < 2) {
    suggestions.push({
      category: 'content',
      priority: 'LOW',
      issue: '当前平衡性和节奏良好，可考虑增加新敌人类型或技能来丰富内容',
      fix: '添加新的进化路径或事件系统',
      metric: 'content_variety',
      current: uniqueEvos,
      target: 10
    });
  }
  if (suggestions.length < 2) {
    suggestions.push({
      category: 'social',
      priority: 'LOW',
      issue: '建议增加社交分享激励提升留存（如好友排行榜奖励）',
      fix: '实现好友排行榜和分享得奖励系统',
      metric: 'share_rate',
      current: 0,
      target: 15
    });
  }

  // Balance checks (legacy)
  var times = names.map(function(n) { return strats[n].avg_survival_time; });
  var maxTime = Math.max.apply(null, times), minTime = Math.min.apply(null, times);
  var kills = names.map(function(n) { return strats[n].avg_kills; });
  var maxKills = Math.max.apply(null, kills), minKills = Math.min.apply(null, kills);

  return {
    fun_scores: scores,
    suggestions: suggestions,
    strategy_count: names.length,
    evolution_rate: evoCount + '/' + names.length,
    unique_evolutions: uniqueEvos,
    balance: {
      survival_ratio: Math.round(maxTime / Math.max(minTime, 1) * 10) / 10,
      kill_ratio: Math.round(maxKills / Math.max(minKills, 1) * 10) / 10
    }
  };
}

function runAllSimulations(gamesPerStrategy) {
  gamesPerStrategy = gamesPerStrategy || 5;
  var results = { strategies: {}, skill_analysis: {}, enemy_types: [] };
  var allEnemyTypes = {};
  var globalSkillPicks = {};
  var totalPicks = 0;

  var stratNames = Object.keys(STRATEGIES);
  for (var s = 0; s < stratNames.length; s++) {
    var name = stratNames[s];
    var totals = { survival_time: 0, kills: 0, level: 0, wave: 0, powerups: 0, max_streak: 0, wave_events: 0 };
    var funTotals = { first_level_up_time: 0, kills_first_30s: 0, near_death_count: 0, idle_seconds: 0, max_enemies: 0, power_spikes: 0, longest_no_kill: 0, hp_low_sum: 0 };
    var allKillTimelines = [];
    var skillPicks = {};
    var stratEnemyTypes = {};
    var stratEvolutions = {};
    var stratClassUsed = '';

    for (var g = 0; g < gamesPerStrategy; g++) {
      var res = simulateGame(name);
      totals.survival_time += res.survival_time;
      totals.kills += res.kills;
      totals.level += res.level;
      totals.wave += res.wave;
      totals.powerups += (res.powerups_collected || 0);
      if ((res.max_streak || 0) > totals.max_streak) totals.max_streak = res.max_streak;
      totals.wave_events += (res.wave_events || 0);
      // Fun metrics
      var fm = res.fun_metrics || {};
      funTotals.first_level_up_time += (fm.first_level_up_time || 0);
      funTotals.kills_first_30s += (fm.kills_first_30s || 0);
      funTotals.near_death_count += (fm.near_death_count || 0);
      funTotals.idle_seconds += (fm.idle_seconds || 0);
      if ((fm.max_enemies_on_screen || 0) > funTotals.max_enemies) funTotals.max_enemies = fm.max_enemies_on_screen;
      funTotals.power_spikes += (fm.power_spikes || 0);
      if ((fm.longest_no_kill_streak || 0) > funTotals.longest_no_kill) funTotals.longest_no_kill = fm.longest_no_kill_streak;
      funTotals.hp_low_sum += (fm.hp_low_point || 1);
      if (fm.kill_timeline) allKillTimelines.push(fm.kill_timeline);
      stratClassUsed = res.class_used || '';
      for (var sk in res.skill_pick_rates) {
        skillPicks[sk] = (skillPicks[sk] || 0) + res.skill_pick_rates[sk];
        globalSkillPicks[sk] = (globalSkillPicks[sk] || 0) + res.skill_pick_rates[sk];
        totalPicks += res.skill_pick_rates[sk];
      }
      for (var i = 0; i < res.enemy_types.length; i++) {
        allEnemyTypes[res.enemy_types[i]] = true;
        stratEnemyTypes[res.enemy_types[i]] = true;
      }
      if (res.evolutions_triggered) {
        for (var e = 0; e < res.evolutions_triggered.length; e++) {
          stratEvolutions[res.evolutions_triggered[e]] = true;
        }
      }
    }

    var n = gamesPerStrategy;
    results.strategies[name] = {
      avg_survival_time: Math.round(totals.survival_time / n * 10) / 10,
      avg_kills: Math.round(totals.kills / n),
      avg_level: Math.round(totals.level / n * 10) / 10,
      avg_wave: Math.round(totals.wave / n * 10) / 10,
      skill_pick_rates: skillPicks,
      enemy_types: Object.keys(stratEnemyTypes),
      class_used: stratClassUsed,
      evolutions_triggered: Object.keys(stratEvolutions),
      powerups_collected: Math.round(totals.powerups / n * 10) / 10,
      max_streak: totals.max_streak,
      events_encountered: Math.round(totals.wave_events / n * 10) / 10,
      fun_metrics: {
        avg_first_level_up: Math.round(funTotals.first_level_up_time / n * 10) / 10,
        avg_kills_first_30s: Math.round(funTotals.kills_first_30s / n * 10) / 10,
        avg_near_death: Math.round(funTotals.near_death_count / n * 10) / 10,
        avg_idle_seconds: Math.round(funTotals.idle_seconds / n),
        max_enemies_on_screen: funTotals.max_enemies,
        avg_power_spikes: Math.round(funTotals.power_spikes / n * 10) / 10,
        worst_no_kill_streak: Math.round(funTotals.longest_no_kill * 10) / 10,
        avg_hp_low_point: Math.round(funTotals.hp_low_sum / n * 100) / 100
      }
    };
  }

  // Compute global skill pick rates
  for (var sk in globalSkillPicks) {
    results.skill_analysis[sk] = {
      pick_rate: totalPicks > 0 ? Math.round(globalSkillPicks[sk] / totalPicks * 1000) / 1000 : 0,
      total_picks: globalSkillPicks[sk]
    };
  }
  results.enemy_types = Object.keys(allEnemyTypes);

  // Generate AI feedback based on simulation data
  results.feedback = generateFeedback(results);

  return results;
}

// Run and output
if (require.main === module) {
  var report = runAllSimulations(5);
  console.log(JSON.stringify(report));
}

module.exports = { simulateGame: simulateGame, runAllSimulations: runAllSimulations };
