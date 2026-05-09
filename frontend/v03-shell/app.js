(function() {
  'use strict';

  var runtimeConfig = window.KOS_V03_CONFIG || { classDefs: {}, skillDefs: {} };
  var classOrder = ['guardian', 'tech', 'ranger'];
  var skillOrder = ['arc', 'boom', 'fan'];
  var skillText = {
    arc: { title: 'Chain Arc', desc: 'Jumps through targets and slows the horde line' },
    boom: { title: 'Blast Core', desc: 'Creates a heavy impact point to open a gap' },
    fan: { title: 'Fan Volley', desc: 'Clears close-range zombies with a wide spread' }
  };

  function toHex(value) {
    if (typeof value === 'number') return '#' + value.toString(16).padStart(6, '0');
    return value || '#4ec9ff';
  }

  var classes = classOrder.map(function(id) {
    var def = runtimeConfig.classDefs[id];
    return {
      id: id,
      name: def.name,
      role: def.role,
      mark: def.mark,
      color: toHex(def.accent),
      skins: def.skins
    };
  });

  var skills = skillOrder.map(function(id) {
    var def = runtimeConfig.skillDefs[id];
    return {
      id: id,
      title: skillText[id].title,
      desc: skillText[id].desc,
      color: toHex(def.color),
      damage: def.damage,
      targets: def.targets,
      range: def.range
    };
  });

  var active = 1;
  var t0 = performance.now();
  var v03 = window.KOS_RENDER && window.KOS_RENDER.v03;
  var contractMap = window.KOS_MAP_CONTRACT && window.KOS_MAP_CONTRACT.standardizeMap(
    window.KOS_MAP_CONTRACT.createMap(26, 22)
  );

  function qs(id) { return document.getElementById(id); }

  function activeClass() { return classes[active] || classes[0]; }

  function renderClasses() {
    var root = qs('classGrid');
    root.innerHTML = '';
    classes.forEach(function(cls, index) {
      var btn = document.createElement('button');
      btn.className = 'classCard' + (index === active ? ' active' : '');
      btn.innerHTML =
        '<div class="classIcon">' + cls.mark + '</div>' +
        '<div class="className">' + cls.name + '</div>' +
        '<div class="classRole">' + cls.role + '</div>' +
        '<div class="skinRow">' + cls.skins.map(function(c) { return '<span class="skinSwatch" style="background:' + c + '"></span>'; }).join('') + '</div>' +
        '<canvas class="classFigure" width="120" height="150"></canvas>';
      btn.addEventListener('click', function() {
        active = index;
        renderClasses();
        drawCombatShots();
        updateState();
      });
      root.appendChild(btn);
      v03.drawSurvivor(btn.querySelector('canvas').getContext('2d'), 62, 112, 42, cls.color, cls.id);
    });
  }

  function renderSkills() {
    var root = qs('skillCards');
    root.innerHTML = '';
    skills.forEach(function(skill, index) {
      var card = document.createElement('article');
      card.className = 'skillCard';
      card.style.setProperty('--skill', skill.color);
      card.innerHTML =
        '<div class="skillArt"><canvas width="160" height="110"></canvas></div>' +
        '<div class="skillTitle">' + skill.title + '</div>' +
        '<div class="skillDesc">' + skill.desc + '</div>' +
        '<div class="skillMeta">DMG ' + skill.damage + ' · TARGETS ' + skill.targets + ' · RANGE ' + skill.range + '</div>' +
        '<div class="pips"><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>';
      root.appendChild(card);
      v03.drawSkillArt(card.querySelector('canvas').getContext('2d'), skill, index);
    });
  }

  function drawCombatShot(id, mode) {
    var canvas = qs(id);
    v03.drawCombatShot(canvas.getContext('2d'), canvas.width, canvas.height, mode, activeClass());
  }

  function drawCombatShots() {
    drawCombatShot('shotScatter', 'scatter');
    drawCombatShot('shotPierce', 'pierce');
    drawCombatShot('shotBlast', 'blast');
    drawCombatShot('shotChain', 'chain');
  }

  function drawPhone() {
    var canvas = qs('phoneCanvas');
    var meta = v03.drawMapPreview(
      canvas.getContext('2d'),
      canvas.width,
      canvas.height,
      contractMap,
      activeClass(),
      (performance.now() - t0) / 1000
    );
    window.__V03_SHELL_STATE.previewTileCount = meta.tileCount;
    window.__V03_SHELL_STATE.previewPropCount = meta.propCount;
    window.__V03_SHELL_STATE.previewZombieEntries = meta.zombieEntries;
    window.__V03_SHELL_STATE.previewRewardPoints = meta.rewardPoints;
    requestAnimationFrame(drawPhone);
  }

  function updateState() {
    window.__V03_SHELL_STATE = {
      usesSharedConfig: !!window.KOS_V03_CONFIG,
      usesMapContract: !!window.KOS_MAP_CONTRACT,
      classIds: classes.map(function(cls) { return cls.id; }),
      skillIds: skills.map(function(skill) { return skill.id; }),
      activeClass: activeClass().id,
      skinCount: classes.reduce(function(total, cls) { return total + cls.skins.length; }, 0),
      previewTileCount: 0,
      previewPropCount: 0,
      previewZombieEntries: 0,
      previewRewardPoints: 0
    };
  }

  if (!v03) {
    throw new Error('KOS_RENDER.v03 is required');
  }

  renderClasses();
  renderSkills();
  drawCombatShots();
  updateState();
  drawPhone();
})();
