(function() {
  'use strict';

  var classDefs = {
    guardian: {
      mark: 'G',
      name: 'Guardian',
      role: 'Shield / lane holder',
      body: 0x3c3430,
      accent: 0xe95b45,
      emissive: 0x5a1109,
      skins: ['#332d2a', '#62645e', '#7d4f58'],
      moveSpeed: 2.45,
      contactDamage: 5
    },
    tech: {
      mark: 'T',
      name: 'Tech Engineer',
      role: 'Chain / burst control',
      body: 0x243436,
      accent: 0x4ec9ff,
      emissive: 0x0d4d66,
      skins: ['#193743', '#2f6068', '#7b315d'],
      moveSpeed: 2.75,
      contactDamage: 8
    },
    ranger: {
      mark: 'R',
      name: 'Ranger',
      role: 'Rifle / mobile cleanup',
      body: 0x2f3b2f,
      accent: 0x78d66a,
      emissive: 0x184a15,
      skins: ['#314027', '#5a5534', '#283746'],
      moveSpeed: 3.1,
      contactDamage: 8
    }
  };

  var skillDefs = {
    arc: { color: 0x4ec9ff, pulse: 4.5, spread: 0.85, damage: 8, targets: 2, range: 6.2 },
    boom: { color: 0xff8b3d, pulse: 2.4, spread: 1.15, damage: 13, targets: 1, range: 5.4 },
    fan: { color: 0xf4c95a, pulse: 6.0, spread: 1.8, damage: 4, targets: 5, range: 5.8 }
  };

  var demoTuning = {
    player: {
      hp: 100,
      rangerFireCooldown: 0.34,
      defaultFireCooldown: 0.42,
      hitCooldown: 0.42
    },
    zombie: {
      fastHp: 42,
      normalHp: 58,
      levelHpGrowth: 6,
      fastSpeed: 0.88,
      normalSpeed: 0.48,
      respawnRadiusX: 7.2,
      respawnRadiusZ: 6.2
    },
    progression: {
      killXp: 10,
      pickupXp: 4,
      levelHealOnKill: 12,
      levelHealOnPickup: 10,
      aliveDropPerKills: 4,
      minAlive: 2
    }
  };

  window.KOS_V03_CONFIG = {
    classDefs: classDefs,
    skillDefs: skillDefs,
    demoTuning: demoTuning
  };
})();
