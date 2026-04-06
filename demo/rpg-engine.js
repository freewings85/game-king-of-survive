/**
 * RPG Engine - 数据驱动的数值计算引擎
 * King of Survive 核心模块
 *
 * 读取 data/ 目录的 JSON 配置，提供属性计算、伤害计算、怪物生成等功能。
 * 可在浏览器和 Node.js 环境下运行。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js - 同步加载 JSON
    var fs = require('fs');
    var path = require('path');
    var dataDir = path.join(__dirname, '..', 'data');
    var formulas = JSON.parse(fs.readFileSync(path.join(dataDir, 'formulas.json'), 'utf8'));
    var characters = JSON.parse(fs.readFileSync(path.join(dataDir, 'characters.json'), 'utf8'));
    var monsters = JSON.parse(fs.readFileSync(path.join(dataDir, 'monsters.json'), 'utf8'));
    var skillsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'skills.json'), 'utf8'));
    var evolutionData = JSON.parse(fs.readFileSync(path.join(dataDir, 'evolution.json'), 'utf8'));
    module.exports = factory(formulas, characters, monsters, skillsData, evolutionData);
  } else {
    // Browser - data must be loaded before this script via RPGEngine.init()
    root.RPGEngine = factory(null, null, null, null, null);
  }
})(typeof window !== 'undefined' ? window : this, function (formulasData, charactersData, monstersData, skillsRaw, evolutionRaw) {

  // Internal data stores
  var formulas = formulasData;
  var characters = charactersData;
  var monsters = monstersData;
  var skills = skillsRaw ? (skillsRaw.skills || skillsRaw) : null;
  var evolutions = evolutionRaw ? (evolutionRaw.evolutions || evolutionRaw) : null;

  /**
   * Initialize engine with loaded data (browser only).
   */
  function init(data) {
    formulas = data.formulas;
    characters = data.characters;
    monsters = data.monsters;
    skills = data.skills.skills || data.skills;
    evolutions = data.evolution.evolutions || data.evolution;
  }

  /**
   * Calculate derived combat stats from base attributes.
   * @param {Object} attributes - { INT, STR, AGI, STA }
   * @param {Object} classBase - { baseHP, baseATK, baseSpeed }
   * @param {number} level - Current level
   * @returns {Object} All derived stats
   */
  function calculateDerivedStats(attributes, classBase, level) {
    var INT = attributes.INT || 0;
    var STR = attributes.STR || 0;
    var AGI = attributes.AGI || 0;
    var STA = attributes.STA || 0;

    var baseHP = classBase.baseHP || 100;
    var baseATK = classBase.baseATK || 10;
    var baseSpeed = classBase.baseSpeed || 150;

    var maxHP = baseHP + STA * 3;
    var physicalAttack = baseATK * (1 + STR * 0.01);
    var skillPower = baseATK * (1 + INT * 0.008);
    var attackSpeed = 1.0 * (1 + AGI * 0.004);
    var moveSpeed = baseSpeed * (1 + AGI * 0.005);
    var critRate = 0.05 + AGI * 0.001;
    var critDamage = 1.5 + STR * 0.005;
    var armor = STR * 0.5;
    var resistance = Math.min(0.5, STA * 0.004);
    var hpRegen = STA * 0.1;
    var evasion = Math.min(0.3, AGI * 0.0015);

    return {
      maxHP: Math.round(maxHP),
      physicalAttack: Math.round(physicalAttack * 100) / 100,
      skillPower: Math.round(skillPower * 100) / 100,
      attackSpeed: Math.round(attackSpeed * 1000) / 1000,
      moveSpeed: Math.round(moveSpeed * 100) / 100,
      critRate: Math.round(critRate * 10000) / 10000,
      critDamage: Math.round(critDamage * 1000) / 1000,
      armor: Math.round(armor * 100) / 100,
      resistance: Math.round(resistance * 10000) / 10000,
      hpRegen: Math.round(hpRegen * 100) / 100,
      evasion: Math.round(evasion * 10000) / 10000
    };
  }

  /**
   * Calculate final damage.
   * @param {Object} attacker - { physicalAttack, skillPower, critRate, critDamage }
   * @param {Object} defender - { armor, resistance, evasion }
   * @param {Object} skill - Skill data (optional, null for basic attack)
   * @returns {Object} { damage, isCrit, isEvaded }
   */
  function calculateDamage(attacker, defender, skill) {
    var armorConst = (formulas && formulas.damageFormula) ? formulas.damageFormula.armorConstant : 100;
    var rMin = (formulas && formulas.damageFormula) ? formulas.damageFormula.randomMin : 0.9;
    var rMax = (formulas && formulas.damageFormula) ? formulas.damageFormula.randomMax : 1.1;

    // Evasion check
    var evasion = defender.evasion || 0;
    if (Math.random() < evasion) {
      return { damage: 0, isCrit: false, isEvaded: true };
    }

    // Base damage
    var baseDmg;
    if (skill && skill.damageType === 'magic') {
      baseDmg = (attacker.skillPower || attacker.physicalAttack || 10);
    } else {
      baseDmg = (attacker.physicalAttack || 10);
    }

    // Skill scaling
    if (skill && skill.baseDamage) {
      baseDmg += skill.baseDamage;
    }

    // Armor reduction (physical only)
    var defArmor = defender.armor || 0;
    var armorReduction = defArmor / (defArmor + armorConst);

    // Resistance (magic only)
    var res = defender.resistance || 0;
    var resistReduction = (skill && skill.damageType === 'magic') ? res : 0;

    // Crit
    var isCrit = Math.random() < (attacker.critRate || 0);
    var critMult = isCrit ? (attacker.critDamage || 1.5) : 1;

    // Random variance
    var randomMult = rMin + Math.random() * (rMax - rMin);

    var finalDmg = baseDmg * (1 - armorReduction) * (1 - resistReduction) * critMult * randomMult;

    return {
      damage: Math.max(1, Math.round(finalDmg)),
      isCrit: isCrit,
      isEvaded: false
    };
  }

  /**
   * Calculate experience reward with level difference correction.
   * @param {number} monsterLevel - Monster's level
   * @param {number} playerLevel - Player's level
   * @param {number} baseXP - Base XP of the monster
   * @returns {number} Final XP reward
   */
  function calculateExpReward(monsterLevel, playerLevel, baseXP) {
    var diff = monsterLevel - playerLevel;
    var correction;

    if (diff >= 0) {
      // Higher level monster: bonus
      correction = 1 + diff * 0.1;
    } else {
      // Lower level monster: penalty
      correction = Math.max(0.1, 1 + diff * 0.15);
    }

    // Cap at 2x
    correction = Math.min(2.0, correction);

    return Math.max(1, Math.round(baseXP * correction));
  }

  /**
   * Create a monster with stats scaled by level.
   * @param {string} type - Monster type key
   * @param {number} level - Monster level
   * @returns {Object} Monster entity
   */
  function createMonster(type, level) {
    var template = monsters[type];
    if (!template) {
      template = monsters.normal;
    }

    var scaling = template.levelScaling;
    var lvFactor = level - 1; // level 1 = base stats

    var hp = Math.round(template.baseHP * (1 + scaling.hp * lvFactor));
    var atk = Math.round(template.baseATK * (1 + scaling.atk * lvFactor));
    var speed = Math.round(template.baseSpeed * (1 + (scaling.speed || 0) * lvFactor));
    var xp = Math.round(template.baseXP * (1 + (scaling.xp || 0) * lvFactor));

    return {
      hp: hp,
      maxHp: hp,
      damage: atk,
      atk: atk,
      speed: speed,
      radius: template.radius,
      color: template.color,
      xp: xp,
      enemyType: type,
      type: 'enemy',
      level: level
    };
  }

  /**
   * Get character data for all classes.
   * @returns {Object} characters data
   */
  function getCharacterData() {
    return characters;
  }

  /**
   * Get skills data.
   * @returns {Array} skills array
   */
  function getSkillsData() {
    return skills;
  }

  /**
   * Get evolutions data.
   * @returns {Array} evolutions array
   */
  function getEvolutionsData() {
    return evolutions;
  }

  /**
   * Get formulas data.
   * @returns {Object} formulas
   */
  function getFormulasData() {
    return formulas;
  }

  /**
   * Get monsters data.
   * @returns {Object} monsters
   */
  function getMonstersData() {
    return monsters;
  }

  /**
   * Calculate XP needed for next level.
   * @param {number} level - Current level
   * @returns {number} XP needed
   */
  function calculateXPNeeded(level) {
    return Math.floor(15 + level * 12 + Math.pow(level, 1.8) * 3);
  }

  return {
    init: init,
    calculateDerivedStats: calculateDerivedStats,
    calculateDamage: calculateDamage,
    calculateExpReward: calculateExpReward,
    createMonster: createMonster,
    getCharacterData: getCharacterData,
    getSkillsData: getSkillsData,
    getEvolutionsData: getEvolutionsData,
    getFormulasData: getFormulasData,
    getMonstersData: getMonstersData,
    calculateXPNeeded: calculateXPNeeded
  };
});
