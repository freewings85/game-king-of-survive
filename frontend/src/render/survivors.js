(function() {
  var root = window.KOS_RENDER = window.KOS_RENDER || {};

  function theme() {
    return window.KOS_ZOMBIE_THEME || { scale: {}, colors: {} };
  }

  function colorForClass(classType, skinId, botColor) {
    var base = {
      warrior: { jacket: '#5a5f5a', accent: '#f0b24a', weapon: '#2c3032', rim: '#f0b24a' },
      mage:    { jacket: '#3d5262', accent: '#64d9ff', weapon: '#26343d', rim: '#64d9ff' },
      scout:   { jacket: '#3f5747', accent: '#7cff74', weapon: '#202b24', rim: '#7cff74' },
      healer:  { jacket: '#52604f', accent: '#8ef2c0', weapon: '#2a3430', rim: '#8ef2c0' },
      assassin:{ jacket: '#3d3a4f', accent: '#bc8cff', weapon: '#252230', rim: '#bc8cff' }
    }[classType] || { jacket: '#4f5652', accent: '#42d9ff', weapon: '#2c3032', rim: '#42d9ff' };

    if (botColor) base.accent = botColor;
    if (skinId && skinId !== 'default') {
      if (/fire|flame|red|inferno/.test(skinId)) {
        base.jacket = '#694237'; base.accent = '#ff8a3d'; base.rim = '#ff8a3d';
      } else if (/ice|frost|blue|ocean/.test(skinId)) {
        base.jacket = '#3c5366'; base.accent = '#78cfff'; base.rim = '#78cfff';
      } else if (/shadow|ninja|purple|void/.test(skinId)) {
        base.jacket = '#39364f'; base.accent = '#b484ff'; base.rim = '#b484ff';
      } else if (/forest|green/.test(skinId)) {
        base.jacket = '#3f5a43'; base.accent = '#8dde72'; base.rim = '#8dde72';
      } else if (/gold|royal|knight/.test(skinId)) {
        base.jacket = '#665437'; base.accent = '#f4c95a'; base.rim = '#f4c95a';
      }
    }
    return base;
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

  function roundedRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
  }

  function fillStroke(ctx, fill, stroke, width) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke || '#101514';
    ctx.lineWidth = width || 2;
    ctx.stroke();
  }

  function limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawWeapon(ctx, r, classType, colors, gt) {
    ctx.save();
    ctx.translate(r * 0.12, -r * 0.02);
    if (classType === 'warrior') {
      ctx.fillStyle = '#2d3335';
      roundedRect(ctx, r * 0.05, -r * 0.1, r * 0.72, r * 0.16, r * 0.04);
      ctx.fill();
      ctx.fillStyle = '#15191a';
      ctx.fillRect(r * 0.58, -r * 0.145, r * 0.22, r * 0.07);
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(r * 0.78, -r * 0.055, r * 0.08, r * 0.035);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2d3335';
      roundedRect(ctx, -r * 0.42, -r * 0.2, r * 0.23, r * 0.46, r * 0.08);
      fillStroke(ctx, '#30383a', '#101514', 1.5);
    } else if (classType === 'mage') {
      ctx.fillStyle = '#29363d';
      roundedRect(ctx, r * 0.08, -r * 0.08, r * 0.58, r * 0.12, r * 0.04);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = colors.accent;
      ctx.shadowBlur = 10;
      circle(ctx, r * 0.74, -r * 0.02, r * 0.12, colors.accent, 0.85);
      ctx.restore();
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r * 0.73, -r * 0.02, r * (0.16 + Math.sin(gt * 4) * 0.015), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (classType === 'scout') {
      ctx.fillStyle = '#23292b';
      roundedRect(ctx, r * 0.02, -r * 0.09, r * 0.68, r * 0.12, r * 0.035);
      ctx.fill();
      ctx.fillStyle = '#111617';
      ctx.fillRect(r * 0.52, -r * 0.135, r * 0.2, r * 0.055);
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.65;
      ctx.fillRect(r * 0.7, -r * 0.035, r * 0.06, r * 0.025);
      ctx.globalAlpha = 1;
    } else if (classType === 'healer') {
      ctx.fillStyle = '#26342e';
      roundedRect(ctx, r * 0.02, -r * 0.08, r * 0.50, r * 0.12, r * 0.035);
      ctx.fill();
      ctx.fillStyle = colors.accent;
      roundedRect(ctx, r * 0.48, -r * 0.18, r * 0.28, r * 0.28, r * 0.05);
      ctx.fill();
      ctx.fillStyle = '#102018';
      ctx.fillRect(r * 0.58, -r * 0.14, r * 0.08, r * 0.2);
      ctx.fillRect(r * 0.52, -r * 0.08, r * 0.2, r * 0.08);
    } else if (classType === 'assassin') {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.10, -r * 0.14);
      ctx.lineTo(r * 0.66, -r * 0.36);
      ctx.moveTo(r * 0.12, r * 0.08);
      ctx.lineTo(r * 0.62, r * 0.34);
      ctx.stroke();
      ctx.fillStyle = '#17171d';
      roundedRect(ctx, -r * 0.42, -r * 0.25, r * 0.16, r * 0.50, r * 0.05);
      ctx.fill();
    } else {
      ctx.fillStyle = '#23292b';
      roundedRect(ctx, r * 0.02, -r * 0.09, r * 0.58, r * 0.12, r * 0.035);
      ctx.fill();
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(r * 0.58, -r * 0.035, r * 0.08, r * 0.025);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  root.drawSurvivorSprite = function(ctx, cx, cy, radius, classType, facingAngle, options) {
    var opts = options || {};
    var t = theme();
    var colors = colorForClass(classType, opts.skinId || 'default', opts.isBot ? opts.color : null);
    var scale = (t.scale && t.scale.playerRadiusMul) || 0.88;
    var r = radius * scale;
    var gt = (opts.gameTime != null ? opts.gameTime : 0);
    var alpha = opts.alpha == null ? 1 : opts.alpha;
    var pulse = Math.sin(gt * 3) * r * 0.025;

    ctx.save();
    ctx.globalAlpha = alpha;
    ellipse(ctx, cx, cy + r * 0.72, r * 0.62, r * 0.16, 0, 'rgba(0,0,0,0.30)');

    if (!opts.isBot) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = colors.rim;
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.12, r * 0.9 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (opts.shield) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = '#8ee8ff';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.04, r * 1.02, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.translate(cx, cy);
    ctx.rotate(facingAngle || 0);

    limb(ctx, -r * 0.22, r * 0.24, -r * 0.18, r * 0.7, r * 0.15, '#202625');
    limb(ctx, r * 0.18, r * 0.24, r * 0.24, r * 0.7, r * 0.15, '#202625');

    ctx.fillStyle = '#2b2018';
    roundedRect(ctx, -r * 0.46, -r * 0.16, r * 0.34, r * 0.5, r * 0.08);
    fillStroke(ctx, '#46382a', '#141414', 1.5);

    ctx.fillStyle = colors.jacket;
    roundedRect(ctx, -r * 0.36, -r * 0.34, r * 0.72, r * 0.72, r * 0.12);
    fillStroke(ctx, colors.jacket, '#101514', 2);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = opts.fury ? 0.95 : 0.75;
    ctx.fillRect(-r * 0.05, -r * 0.28, r * 0.1, r * 0.58);
    ctx.globalAlpha = 1;

    if (classType === 'healer') {
      ctx.fillStyle = '#102018';
      ctx.fillRect(-r * 0.13, -r * 0.15, r * 0.26, r * 0.08);
      ctx.fillRect(-r * 0.04, -r * 0.24, r * 0.08, r * 0.26);
    } else if (classType === 'assassin') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundedRect(ctx, -r * 0.30, -r * 0.44, r * 0.60, r * 0.20, r * 0.08);
      ctx.fill();
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(-r * 0.18, -r * 0.39, r * 0.36, r * 0.04);
      ctx.globalAlpha = 1;
    } else if (classType === 'scout') {
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, -r * 0.23);
      ctx.lineTo(r * 0.22, r * 0.23);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    limb(ctx, -r * 0.28, -r * 0.12, r * 0.1, -r * 0.03, r * 0.14, '#273130');
    limb(ctx, r * 0.28, -r * 0.12, r * 0.42, -r * 0.02, r * 0.14, '#273130');
    drawWeapon(ctx, r, classType, colors, gt);

    ctx.fillStyle = '#2a3233';
    roundedRect(ctx, -r * 0.22, -r * 0.68, r * 0.44, r * 0.34, r * 0.13);
    fillStroke(ctx, '#2a3233', '#101514', 1.8);
    ctx.fillStyle = '#c99a6c';
    ctx.beginPath();
    ctx.arc(0, -r * 0.45, r * 0.21, 0, Math.PI * 2);
    fillStroke(ctx, '#c99a6c', '#101514', 1.4);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(-r * 0.22, -r * 0.56, r * 0.44, r * 0.08);
    ctx.globalAlpha = 1;

    if (opts.isBot) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    return true;
  };
})();
