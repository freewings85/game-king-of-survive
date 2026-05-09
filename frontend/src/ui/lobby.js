(function() {
  'use strict';

  var classes = [
    { id: 'guardian', gameClass: 'warrior', name: '重装守卫', role: '护盾 / 近战压线', mark: 'G', color: '#e95b45', skins: ['#1c2526', '#53605d', '#7d4f58'] },
    { id: 'tech', gameClass: 'mage', name: '灵能工程', role: '连锁 / 控场爆发', mark: 'T', color: '#4ec9ff', skins: ['#193743', '#2f6068', '#7b315d'] },
    { id: 'ranger', gameClass: 'scout', name: '废土游侠', role: '步枪 / 机动收割', mark: 'R', color: '#78d66a', skins: ['#314027', '#5a5534', '#283746'] }
  ];

  var skills = [
    { id: 'scatter', title: '扇形弹幕', desc: '清小怪和压走位', color: '#f4c95a' },
    { id: 'explosive', title: '燃爆榴弹', desc: '破尸群密集点', color: '#ff8b3d' },
    { id: 'chain_lightning', title: '连锁电弧', desc: '锁定精英并弹射', color: '#4ec9ff' }
  ];

  var active = 1;
  var phoneCanvas = null;

  function qs(id) { return document.getElementById(id); }

  function renderClasses() {
    var root = qs('lobby-class-grid');
    var v03 = window.KOS_RENDER && window.KOS_RENDER.v03;
    if (!root || !v03) return;
    root.innerHTML = '';
    classes.forEach(function(cls, index) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'lobby-class-card' + (index === active ? ' active' : '');
      card.style.setProperty('--class-color', cls.color);
      card.innerHTML =
        '<div class="lobby-class-mark">' + cls.mark + '</div>' +
        '<div class="lobby-class-name">' + cls.name + '</div>' +
        '<div class="lobby-class-role">' + cls.role + '</div>' +
        '<div class="lobby-skin-row">' + cls.skins.map(function(c) { return '<span style="background:' + c + '"></span>'; }).join('') + '</div>' +
        '<canvas class="lobby-class-figure" width="100" height="126"></canvas>';
      card.addEventListener('click', function() {
        active = index;
        renderClasses();
        drawPhone();
      });
      root.appendChild(card);
      v03.drawSurvivor(card.querySelector('canvas').getContext('2d'), 52, 92, 34, cls.color, cls.id);
    });
  }

  function renderSkills() {
    var root = qs('lobby-skill-grid');
    var v03 = window.KOS_RENDER && window.KOS_RENDER.v03;
    if (!root || !v03) return;
    root.innerHTML = '';
    skills.forEach(function(skill, index) {
      var card = document.createElement('div');
      card.className = 'lobby-skill-card';
      card.style.setProperty('--skill-color', skill.color);
      card.innerHTML =
        '<canvas width="160" height="110"></canvas>' +
        '<div class="lobby-skill-title">' + skill.title + '</div>' +
        '<div class="lobby-skill-desc">' + skill.desc + '</div>' +
        '<div class="lobby-pips"><span></span><span></span><span></span><span></span><span></span></div>';
      root.appendChild(card);
      v03.drawSkillArt(card.querySelector('canvas').getContext('2d'), skill, index);
    });
  }

  function drawPhone() {
    var v03 = window.KOS_RENDER && window.KOS_RENDER.v03;
    if (!phoneCanvas || !v03) return;
    v03.drawPhoneScene(phoneCanvas.getContext('2d'), phoneCanvas.width, phoneCanvas.height, classes[active], Date.now() / 1000);
  }

  function getActiveClass() {
    return classes[active] || classes[0];
  }

  function applyToGame(api) {
    var cls = getActiveClass();
    if (api && cls && cls.gameClass) api.selectedClass = cls.gameClass;
    return cls;
  }

  function loop() {
    drawPhone();
    window.requestAnimationFrame(loop);
  }

  function init() {
    phoneCanvas = qs('lobby-phone-preview');
    renderClasses();
    renderSkills();
    loop();
  }

  window.KOS_LOBBY = {
    getActiveClass: getActiveClass,
    applyToGame: applyToGame
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
