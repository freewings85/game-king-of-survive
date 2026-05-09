(function() {
  'use strict';

  var classes = [
    { id: 'guardian', name: '重装守卫', role: '护盾 / 近战压线', mark: 'G', color: '#e95b45', skins: ['#1c2526', '#53605d', '#7d4f58'] },
    { id: 'tech', name: '灵能工程', role: '连锁 / 控场爆发', mark: 'T', color: '#4ec9ff', skins: ['#193743', '#2f6068', '#7b315d'] },
    { id: 'ranger', name: '废土游侠', role: '步枪 / 机动收割', mark: 'R', color: '#78d66a', skins: ['#314027', '#5a5534', '#283746'] }
  ];

  var skills = [
    { id: 'scatter', title: '散射弹幕', desc: '扇形弹道清理贴脸尸群', color: '#b46cff' },
    { id: 'explosive', title: '爆破手雷', desc: '命中后产生范围爆炸', color: '#f4c95a' },
    { id: 'chain_lightning', title: '链式电弧', desc: '在多个目标之间跳跃', color: '#4ec9ff' }
  ];

  var active = 1;
  var t0 = performance.now();
  var v03 = window.KOS_RENDER && window.KOS_RENDER.v03;

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
    v03.drawPhoneScene(
      canvas.getContext('2d'),
      canvas.width,
      canvas.height,
      activeClass(),
      (performance.now() - t0) / 1000
    );
    requestAnimationFrame(drawPhone);
  }

  if (!v03) {
    throw new Error('KOS_RENDER.v03 is required');
  }

  renderClasses();
  renderSkills();
  drawCombatShots();
  drawPhone();
})();
