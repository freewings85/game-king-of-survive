(function() {
  var root = window.KOS_RENDER = window.KOS_RENDER || {};

  function theme() {
    return window.KOS_ZOMBIE_THEME || { scale: {}, colors: {} };
  }

  function col(name, fallback) {
    var t = theme();
    return (t.colors && t.colors[name]) || fallback;
  }

  function ellipse(ctx, x, y, rx, ry, rot, color, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function circle(ctx, x, y, r, color, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function strokeLimb(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function outline(ctx, fn, fill, stroke, width) {
    ctx.save();
    fn();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width || 2;
    ctx.strokeStyle = stroke || '#172018';
    ctx.stroke();
    ctx.restore();
  }

  function drawEyes(ctx, r, x, y, sep, color, glow) {
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    circle(ctx, x - sep, y, r, color);
    circle(ctx, x + sep, y, r, color);
    ctx.restore();
  }

  function drawTornMarks(ctx, r, cfg, bob) {
    ctx.save();
    ctx.globalAlpha = cfg.markAlpha || 0.86;
    ctx.strokeStyle = cfg.markColor || '#231a16';
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, r * 0.02 + bob);
    ctx.lineTo(r * 0.06, r * 0.16 + bob);
    ctx.moveTo(r * 0.16, -r * 0.01 + bob);
    ctx.lineTo(-r * 0.02, r * 0.24 + bob);
    ctx.stroke();
    if (cfg.wound) {
      ctx.fillStyle = cfg.wound;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.ellipse(r * 0.18, r * 0.12 + bob, r * 0.09, r * 0.045, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawZombieBody(ctx, r, cfg, gt) {
    var skin = cfg.skin || col('zombieSkin', '#8da082');
    var dark = cfg.dark || col('zombieDark', '#334036');
    var cloth = cfg.cloth || '#3b3027';
    var eye = cfg.eye || col('zombieEye', '#ff5a3d');
    var bob = Math.sin(gt * (cfg.bobSpeed || 3)) * r * (cfg.bob || 0.035);

    ellipse(ctx, 0, r * 0.56, r * (cfg.shadowW || 0.5), r * 0.11, 0, 'rgba(0,0,0,0.28)');

    strokeLimb(ctx, -r * 0.18, r * 0.2, -r * 0.2 + cfg.legSwing, r * 0.62, r * 0.13, dark);
    strokeLimb(ctx, r * 0.16, r * 0.2, r * 0.14 - cfg.legSwing, r * 0.62, r * 0.13, dark);

    outline(ctx, function() {
      ctx.beginPath();
      ctx.moveTo(-r * cfg.bodyW, -r * 0.05 + bob);
      ctx.lineTo(r * cfg.bodyW, -r * 0.05 + bob);
      ctx.lineTo(r * cfg.bodyW * 0.82, r * cfg.bodyH + bob);
      ctx.lineTo(-r * cfg.bodyW * 0.78, r * cfg.bodyH + bob);
      ctx.closePath();
    }, cloth, '#151a14', 2);
    drawTornMarks(ctx, r, cfg, bob);

    strokeLimb(ctx, -r * cfg.armReach, -r * 0.05 + bob, -r * 0.3, r * 0.03 + bob, r * 0.12, skin);
    strokeLimb(ctx, r * 0.3, r * 0.03 + bob, r * cfg.armReach, -r * 0.05 + bob, r * 0.12, skin);
    circle(ctx, -r * cfg.armReach, -r * 0.05 + bob, r * 0.075, skin);
    circle(ctx, r * cfg.armReach, -r * 0.05 + bob, r * 0.075, skin);

    outline(ctx, function() {
      ctx.beginPath();
      ctx.arc(0, -r * cfg.headY + bob, r * cfg.headR, 0, Math.PI * 2);
    }, skin, '#172018', 2);
    drawEyes(ctx, r * 0.045, 0, -r * (cfg.headY + 0.05) + bob, r * 0.11, eye, cfg.eyeGlow || 0);
    ellipse(ctx, 0, -r * (cfg.headY - 0.13) + bob, r * 0.09, r * 0.055, 0, '#160909');
    if (cfg.headScar) {
      ctx.save();
      ctx.strokeStyle = cfg.headScar;
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.beginPath();
      ctx.moveTo(-r * 0.10, -r * (cfg.headY + 0.20) + bob);
      ctx.lineTo(r * 0.08, -r * (cfg.headY + 0.02) + bob);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawWalker(ctx, r, gt) {
    drawZombieBody(ctx, r, {
      bodyW: 0.3, bodyH: 0.28, headY: 0.32, headR: 0.29,
      armReach: 0.62, legSwing: Math.sin(gt * 2.4) * r * 0.05,
      cloth: '#4a3c2f', bobSpeed: 2.4, bob: 0.03, eyeGlow: 2,
      wound: '#6e1c18', headScar: '#3b211d'
    }, gt);
  }

  function drawRunner(ctx, r, gt) {
    ctx.save();
    ctx.rotate(-0.2);
    ellipse(ctx, -r * 0.18, r * 0.6, r * 0.55, r * 0.09, 0, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = 'rgba(230,83,63,0.2)';
    ctx.fillRect(-r * 0.95, -r * 0.08, r * 0.45, r * 0.045);
    drawZombieBody(ctx, r, {
      bodyW: 0.25, bodyH: 0.24, headY: 0.34, headR: 0.25,
      armReach: 0.74, legSwing: Math.sin(gt * 13) * r * 0.11,
      skin: '#9d8f78', cloth: '#332722', bobSpeed: 12, bob: 0.02,
      eye: '#ff3a26', eyeGlow: 4, wound: '#8a2418', markColor: '#170d0b'
    }, gt);
    ctx.restore();
  }

  function drawBloater(ctx, r, gt) {
    var pulse = Math.sin(gt * 1.7) * r * 0.035;
    var skin = '#66795f';
    ellipse(ctx, 0, r * 0.74, r * 0.86, r * 0.2, 0, 'rgba(0,0,0,0.32)');
    strokeLimb(ctx, -r * 0.35, r * 0.35, -r * 0.45, r * 0.72, r * 0.2, '#344032');
    strokeLimb(ctx, r * 0.35, r * 0.35, r * 0.45, r * 0.72, r * 0.2, '#344032');
    outline(ctx, function() {
      ctx.beginPath();
      ctx.ellipse(0, r * 0.07 + pulse, r * 0.72, r * 0.58 + pulse, 0, 0, Math.PI * 2);
    }, skin, '#172018', 2.5);
    circle(ctx, -r * 0.2, -r * 0.12, r * 0.09, '#b8cc4e');
    circle(ctx, r * 0.32, r * 0.08, r * 0.075, '#b8cc4e');
    circle(ctx, r * 0.05, r * 0.3, r * 0.06, '#d7e778');
    ctx.save();
    ctx.strokeStyle = 'rgba(180,210,88,0.7)';
    ctx.lineWidth = Math.max(1.5, r * 0.035);
    ctx.beginPath();
    ctx.arc(0, r * 0.07 + pulse, r * 0.48, -0.2, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
    strokeLimb(ctx, -r * 0.65, -r * 0.02, -r * 0.96, r * 0.1, r * 0.16, skin);
    strokeLimb(ctx, r * 0.65, -r * 0.02, r * 0.96, r * 0.1, r * 0.16, skin);
    outline(ctx, function() {
      ctx.beginPath();
      ctx.arc(0, -r * 0.55, r * 0.22, 0, Math.PI * 2);
    }, skin, '#172018', 2);
    drawEyes(ctx, r * 0.035, 0, -r * 0.58, r * 0.09, '#ff5a3d', 3);
  }

  function drawSpitter(ctx, r, gt) {
    var acid = 0.65 + Math.sin(gt * 4) * 0.25;
    drawZombieBody(ctx, r, {
      bodyW: 0.22, bodyH: 0.3, headY: 0.42, headR: 0.23,
      armReach: 0.52, legSwing: Math.sin(gt * 3) * r * 0.04,
      skin: '#788f60', cloth: '#283426', bobSpeed: 3, bob: 0.02,
      eye: '#9aff40', eyeGlow: 5, wound: '#6f9d2a', markColor: '#1a2a14'
    }, gt);
    ellipse(ctx, 0, -r * 0.27, r * 0.14, r * 0.09, 0, '#253c10');
    ellipse(ctx, 0, -r * 0.25, r * 0.1, r * 0.055, 0, '#9aff40', acid);
    strokeLimb(ctx, r * 0.08, -r * 0.18, r * 0.02, r * 0.08, r * 0.035, '#9aff40');
  }

  function drawCrawler(ctx, r, gt) {
    var scuttle = Math.sin(gt * 15) * r * 0.08;
    var skin = '#83936f';
    ellipse(ctx, 0, r * 0.44, r * 0.42, r * 0.08, 0, 'rgba(0,0,0,0.24)');
    strokeLimb(ctx, -r * 0.42, r * 0.1 + scuttle, -r * 0.62, r * 0.22, r * 0.11, skin);
    strokeLimb(ctx, r * 0.42, r * 0.1 - scuttle, r * 0.62, r * 0.22, r * 0.11, skin);
    outline(ctx, function() {
      ctx.beginPath();
      ctx.ellipse(0, r * 0.15, r * 0.43, r * 0.21, 0, 0, Math.PI * 2);
    }, skin, '#172018', 2);
    outline(ctx, function() {
      ctx.beginPath();
      ctx.arc(r * 0.12, -r * 0.06, r * 0.19, 0, Math.PI * 2);
    }, skin, '#172018', 2);
    drawEyes(ctx, r * 0.035, r * 0.08, -r * 0.11, r * 0.08, '#ff5a3d', 2);
    ctx.fillStyle = '#5a2118';
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, r * 0.18, r * 0.1, r * 0.035, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawBoss(ctx, r, gt, mini) {
    var scale = mini ? 1.2 : 1.65;
    var rr = r * scale;
    var lurch = Math.sin(gt * 1.2) * rr * 0.03;
    ellipse(ctx, 0, rr * 0.78, rr * 1.03, rr * 0.22, 0, 'rgba(0,0,0,0.42)');
    strokeLimb(ctx, -rr * 0.32, rr * 0.35, -rr * 0.45, rr * 0.82, rr * 0.22, '#232822');
    strokeLimb(ctx, rr * 0.22, rr * 0.35, rr * 0.42, rr * 0.82, rr * 0.22, '#232822');
    outline(ctx, function() {
      ctx.beginPath();
      ctx.ellipse(0, lurch, rr * 0.62, rr * 0.53, 0, 0, Math.PI * 2);
    }, '#52634f', '#111811', 3);
    outline(ctx, function() {
      ctx.beginPath();
      ctx.moveTo(-rr * 0.5, -rr * 0.32 + lurch);
      ctx.lineTo(rr * 0.45, -rr * 0.28 + lurch);
      ctx.lineTo(rr * 0.5, rr * 0.18 + lurch);
      ctx.lineTo(-rr * 0.45, rr * 0.2 + lurch);
      ctx.closePath();
    }, '#4a4a45', '#181818', 2.5);
    circle(ctx, 0, -rr * 0.02 + lurch, rr * 0.13, '#f05a3a');
    circle(ctx, 0, -rr * 0.02 + lurch, rr * 0.07, '#ffd05a', 0.8);
    strokeLimb(ctx, -rr * 0.55, -rr * 0.12 + lurch, -rr * 1.18, rr * 0.22, rr * 0.28, '#455744');
    circle(ctx, -rr * 1.22, rr * 0.25, rr * 0.2, '#354437');
    strokeLimb(ctx, rr * 0.55, -rr * 0.1 + lurch, rr * 0.86, rr * 0.18, rr * 0.16, '#455744');
    outline(ctx, function() {
      ctx.beginPath();
      ctx.arc(0, -rr * 0.52 + lurch, rr * 0.25, 0, Math.PI * 2);
    }, '#7f916b', '#172018', 2.5);
    drawEyes(ctx, rr * 0.05, 0, -rr * 0.58 + lurch, rr * 0.11, '#ff4020', 10);
    ellipse(ctx, 0, -rr * 0.42 + lurch, rr * 0.12, rr * 0.06, 0, '#180808');
  }

  function drawTreasure(ctx, r, gt) {
    ellipse(ctx, 0, r * 0.5, r * 0.42, r * 0.1, 0, 'rgba(0,0,0,0.2)');
    circle(ctx, -r * 0.16, -r * 0.05, r * 0.42, '#b28a35');
    circle(ctx, -r * 0.28, -r * 0.33, r * 0.07, '#ffd65a');
    drawRunner(ctx, r * 0.78, gt);
  }

  function drawDepthZombie(ctx, r, type, gt) {
    var cfg = {
      normal: { w: 0.44, h: 0.92, skin: '#8da082', cloth: '#4a3c2f', lean: 0.05, arm: 0.62, head: 0.24, eye: '#ff5a3d' },
      fast: { w: 0.36, h: 0.82, skin: '#a2927a', cloth: '#332722', lean: -0.18, arm: 0.78, head: 0.21, eye: '#ff3a26', trail: true },
      tank: { w: 0.72, h: 1.02, skin: '#66795f', cloth: '#46513f', lean: 0.02, arm: 0.82, head: 0.22, eye: '#ff5a3d', bulk: true },
      ranged: { w: 0.38, h: 0.94, skin: '#788f60', cloth: '#283426', lean: 0.14, arm: 0.52, head: 0.22, eye: '#9aff40', spit: true },
      swarm: { w: 0.34, h: 0.54, skin: '#83936f', cloth: '#324030', lean: 0.24, arm: 0.56, head: 0.20, eye: '#ff5a3d', crawl: true },
      treasure: { w: 0.38, h: 0.72, skin: '#b28a35', cloth: '#5b4420', lean: -0.12, arm: 0.60, head: 0.20, eye: '#fff1a0' }
    }[type] || null;
    if (type === 'boss' || type === 'miniBoss') {
      var bossScale = type === 'boss' ? 1.75 : 1.32;
      ctx.save();
      ctx.scale(bossScale, bossScale);
      drawDepthZombie(ctx, r, 'tank', gt);
      ctx.fillStyle = 'rgba(255,80,40,0.28)';
      ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 0.68, 0, Math.PI * 2); ctx.fill();
      circle(ctx, 0, -r * 0.16, r * 0.16, '#f05a3a');
      circle(ctx, 0, -r * 0.16, r * 0.08, '#ffd05a', 0.85);
      ctx.restore();
      return;
    }
    if (!cfg) return;

    var bob = Math.sin(gt * (type === 'fast' ? 10 : 3.2)) * r * 0.035;
    var step = Math.sin(gt * (type === 'fast' ? 12 : 4)) * r * 0.08;
    ctx.save();
    ctx.rotate(cfg.lean);
    ellipse(ctx, r * 0.08, r * 0.64, r * (cfg.w + 0.14), r * 0.17, -0.04, 'rgba(0,0,0,0.36)');
    if (cfg.trail) {
      ctx.fillStyle = 'rgba(230,83,63,0.22)';
      ctx.fillRect(-r * 0.92, -r * 0.10, r * 0.44, r * 0.05);
    }

    if (cfg.crawl) {
      strokeLimb(ctx, -r * 0.30, r * 0.12 + step, -r * 0.70, r * 0.32, r * 0.12, cfg.skin);
      strokeLimb(ctx, r * 0.28, r * 0.10 - step, r * 0.64, r * 0.30, r * 0.12, cfg.skin);
      outline(ctx, function() {
        ctx.beginPath();
        ctx.ellipse(0, r * 0.16 + bob, r * 0.42, r * 0.24, 0, 0, Math.PI * 2);
      }, cfg.skin, '#172018', 2);
      outline(ctx, function() {
        ctx.beginPath();
        ctx.arc(r * 0.12, -r * 0.10 + bob, r * cfg.head, 0, Math.PI * 2);
      }, cfg.skin, '#172018', 2);
      drawEyes(ctx, r * 0.04, r * 0.12, -r * 0.15 + bob, r * 0.08, cfg.eye, 3);
      ctx.restore();
      return;
    }

    strokeLimb(ctx, -r * 0.16, r * 0.24, -r * 0.26 + step, r * 0.78, r * 0.15, '#25302b');
    strokeLimb(ctx, r * 0.14, r * 0.24, r * 0.26 - step, r * 0.78, r * 0.15, '#25302b');
    circle(ctx, -r * 0.26 + step, r * 0.82, r * 0.12, '#111514');
    circle(ctx, r * 0.26 - step, r * 0.82, r * 0.12, '#111514');

    var bodyGrad = ctx.createLinearGradient(0, -r * 0.58, 0, r * 0.42);
    bodyGrad.addColorStop(0, cfg.bulk ? '#7d8d68' : cfg.skin);
    bodyGrad.addColorStop(0.48, cfg.cloth);
    bodyGrad.addColorStop(1, '#1f261f');
    outline(ctx, function() {
      ctx.beginPath();
      ctx.moveTo(-r * cfg.w, -r * 0.34 + bob);
      ctx.lineTo(r * cfg.w, -r * 0.30 + bob);
      ctx.lineTo(r * cfg.w * 0.78, r * cfg.h * 0.40 + bob);
      ctx.lineTo(-r * cfg.w * 0.70, r * cfg.h * 0.42 + bob);
      ctx.closePath();
    }, bodyGrad, '#141914', 2.4);
    drawTornMarks(ctx, r, { markColor: '#1b1410', wound: cfg.spit ? '#6f9d2a' : '#6e1c18' }, bob);

    strokeLimb(ctx, -r * cfg.w * 0.85, -r * 0.20 + bob, -r * cfg.arm, r * 0.18 + bob, r * 0.14, cfg.skin);
    strokeLimb(ctx, r * cfg.w * 0.80, -r * 0.18 + bob, r * cfg.arm, r * 0.16 + bob, r * 0.14, cfg.skin);
    circle(ctx, -r * cfg.arm, r * 0.18 + bob, r * 0.085, cfg.skin);
    circle(ctx, r * cfg.arm, r * 0.16 + bob, r * 0.085, cfg.skin);

    outline(ctx, function() {
      ctx.beginPath();
      ctx.arc(0, -r * 0.66 + bob, r * cfg.head, 0, Math.PI * 2);
    }, cfg.skin, '#172018', 2.2);
    drawEyes(ctx, r * 0.045, 0, -r * 0.71 + bob, r * 0.095, cfg.eye, cfg.spit ? 6 : 4);
    ellipse(ctx, 0, -r * 0.56 + bob, r * 0.10, r * 0.055, 0, '#160909');
    if (cfg.spit) {
      ellipse(ctx, 0, -r * 0.51 + bob, r * 0.13, r * 0.07, 0, '#9aff40', 0.7);
    }
    ctx.restore();
  }

  root.drawEnemySprite = function(ctx, x, y, r, type, themeColor, gt, srcEntity) {
    var handled = {
      normal: 1, fast: 1, tank: 1, ranged: 1, swarm: 1,
      boss: 1, miniBoss: 1, treasure: 1
    };
    if (!handled[type]) return false;

    var t = theme();
    var visualScale = (t.scale && t.scale.zombieRadiusMul) || 0.82;
    if (type === 'boss') visualScale = (t.scale && t.scale.bossRadiusMul) || 0.78;
    if (type === 'miniBoss') visualScale = 0.86;

    ctx.save();
    ctx.translate(x, y);
    if (t.visual && t.visual.depthMode) {
      ctx.scale(1.36 * visualScale, 1.36 * visualScale);
      drawDepthZombie(ctx, r, type, gt);
      ctx.restore();
      return true;
    }
    ctx.scale(1.55 * visualScale, 1.55 * visualScale);

    switch (type) {
      case 'normal': drawWalker(ctx, r, gt); break;
      case 'fast': drawRunner(ctx, r, gt); break;
      case 'tank': drawBloater(ctx, r, gt); break;
      case 'ranged': drawSpitter(ctx, r, gt); break;
      case 'swarm': drawCrawler(ctx, r, gt); break;
      case 'miniBoss': drawBoss(ctx, r, gt, true); break;
      case 'boss': drawBoss(ctx, r, gt, false); break;
      case 'treasure': drawTreasure(ctx, r, gt); break;
    }

    ctx.restore();
    return true;
  };
})();
