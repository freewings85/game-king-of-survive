(function() {
  var rarityFallback = {
    common: { label: '普通', borderColor: '#b8c0ba', nameColor: '#ffffff', tagBgColor: '#4a504c' },
    rare: { label: '稀有', borderColor: '#42d9ff', nameColor: '#9be9ff', tagBgColor: '#173a45' },
    epic: { label: '史诗', borderColor: '#b95cff', nameColor: '#e0b3ff', tagBgColor: '#45205e' },
    evolution: { label: '进化', borderColor: '#f4c95a', nameColor: '#ffe3a0', tagBgColor: '#644416' }
  };

  function wrapText(ctx, text, maxWidth, maxLines) {
    var out = [];
    var line = '';
    var chars = String(text || '').split('');
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = chars[i];
        if (out.length >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (line && out.length < maxLines) out.push(line);
    return out;
  }

  function drawSkillSymbol(ctx, id, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(3, size * 0.05);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (id === 'scatter') {
      for (var i = -2; i <= 2; i++) {
        var a = i * 0.22;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-size * 0.14, 0);
        ctx.lineTo(size * 0.38, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.38, 0);
        ctx.lineTo(size * 0.25, -size * 0.08);
        ctx.lineTo(size * 0.27, size * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (id === 'explosive') {
      ctx.beginPath();
      for (var p = 0; p < 12; p++) {
        var r = p % 2 ? size * 0.22 : size * 0.48;
        var ang = p * Math.PI / 6;
        var px = Math.cos(ang) * r, py = Math.sin(ang) * r;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff7cf';
      ctx.beginPath(); ctx.arc(0, 0, size * 0.13, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'chain_lightning') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.16);
      ctx.lineTo(-size * 0.12, -size * 0.02);
      ctx.lineTo(-size * 0.22, size * 0.16);
      ctx.lineTo(size * 0.34, -size * 0.12);
      ctx.stroke();
      for (var n = 0; n < 3; n++) {
        ctx.beginPath();
        ctx.arc(-size * 0.42 + n * size * 0.38, n === 1 ? size * 0.16 : -size * 0.16, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'xp_magnet') {
      ctx.strokeRect(-size * 0.26, -size * 0.30, size * 0.20, size * 0.58);
      ctx.strokeRect(size * 0.06, -size * 0.30, size * 0.20, size * 0.58);
      ctx.beginPath();
      ctx.arc(0, -size * 0.02, size * 0.40, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      ctx.fillStyle = '#7cff4f';
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(size * 0.26, -size * 0.05, size * 0.12, size * 0.12);
      ctx.restore();
    } else if (id === 'max_hp') {
      ctx.beginPath();
      ctx.moveTo(0, size * 0.33);
      ctx.bezierCurveTo(-size * 0.48, 0, -size * 0.35, -size * 0.40, 0, -size * 0.18);
      ctx.bezierCurveTo(size * 0.35, -size * 0.40, size * 0.48, 0, 0, size * 0.33);
      ctx.fill();
    } else if (id === 'attack_up') {
      ctx.lineWidth = Math.max(4, size * 0.07);
      ctx.beginPath();
      ctx.moveTo(-size * 0.38, size * 0.28);
      ctx.lineTo(size * 0.30, -size * 0.40);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.30, -size * 0.40);
      ctx.lineTo(size * 0.26, -size * 0.10);
      ctx.lineTo(-size * 0.04, -size * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(-size * 0.18, size * 0.36);
      ctx.lineTo(size * 0.40, -size * 0.22);
      ctx.stroke();
    } else if (id === 'pierce') {
      ctx.lineWidth = Math.max(3, size * 0.06);
      for (var pr = 0; pr < 3; pr++) {
        var py = (pr - 1) * size * 0.18;
        ctx.beginPath();
        ctx.moveTo(-size * 0.42, py);
        ctx.lineTo(size * 0.34, py);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(size * 0.44, 0);
      ctx.lineTo(size * 0.18, -size * 0.22);
      ctx.lineTo(size * 0.18, size * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.fillRect(-size * 0.04, -size * 0.38, size * 0.08, size * 0.76);
      ctx.globalAlpha = 1;
    } else if (id === 'crit') {
      ctx.lineWidth = Math.max(3, size * 0.055);
      ctx.beginPath(); ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.48, 0); ctx.lineTo(-size * 0.28, 0);
      ctx.moveTo(size * 0.28, 0); ctx.lineTo(size * 0.48, 0);
      ctx.moveTo(0, -size * 0.48); ctx.lineTo(0, -size * 0.28);
      ctx.moveTo(0, size * 0.28); ctx.lineTo(0, size * 0.48);
      ctx.stroke();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath(); ctx.arc(0, 0, size * 0.07, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'lifesteal') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.44);
      ctx.bezierCurveTo(size * 0.33, -size * 0.12, size * 0.34, size * 0.30, 0, size * 0.42);
      ctx.bezierCurveTo(-size * 0.34, size * 0.30, -size * 0.33, -size * 0.12, 0, -size * 0.44);
      ctx.fill();
      ctx.strokeStyle = '#fff0ff';
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(-size * 0.16, size * 0.02);
      ctx.lineTo(-size * 0.02, size * 0.18);
      ctx.lineTo(size * 0.20, -size * 0.10);
      ctx.stroke();
    } else if (id === 'move_speed' || id === 'attack_speed') {
      for (var s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.moveTo(-size * 0.40, -size * 0.2 + s * size * 0.2);
        ctx.lineTo(size * 0.28, -size * 0.2 + s * size * 0.2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(size * 0.38, 0);
      ctx.lineTo(size * 0.18, -size * 0.18);
      ctx.lineTo(size * 0.18, size * 0.18);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.font = 'bold ' + Math.round(size * 0.70) + 'px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 2);
    }
    ctx.restore();
  }

  function skillAccent(id, rarityColor) {
    var map = {
      attack_speed: '#ff8b3d',
      move_speed: '#42d9ff',
      scatter: '#f4c95a',
      max_hp: '#7cff4f',
      xp_magnet: '#7cff4f',
      attack_up: '#e6533f',
      pierce: '#f4c95a',
      crit: '#ff8b3d',
      lifesteal: '#b95cff',
      explosive: '#ff8b3d',
      chain_lightning: '#42d9ff'
    };
    return map[id] || rarityColor;
  }

  function drawLevelUpCards(ctx, params) {
    var W = params.W, H = params.H;
    var cards = params.cards || [];
    if (!cards.length) return null;
    var rarities = params.rarities || {};
    var skillLevels = params.skillLevels || {};
    var anim = params.anim || { active: false, timer: 1, duration: 1 };
    var progress = anim.active ? Math.min(1, anim.timer / Math.max(0.001, anim.duration)) : 1;
    var ease = 1 - Math.pow(1 - progress, 3);
    var gap = Math.max(16, Math.min(28, W * 0.018));
    var cardW = Math.min(270, Math.max(210, (W - gap * 4) / 3.8));
    var cardH = Math.min(350, Math.max(300, H * 0.22));
    var totalW = cards.length * cardW + (cards.length - 1) * gap;
    var startX = (W - totalW) / 2;
    var cardY = Math.min(H * 0.50, Math.max(H * 0.38, H / 2 - cardH * 0.38));
    var rects = [];

    ctx.save();
    ctx.globalAlpha = ease;
    ctx.fillStyle = '#f4c95a';
    ctx.font = 'bold 28px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP', W / 2, Math.max(74, H * 0.12));
    ctx.font = 'bold 18px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = '#dbe1dc';
    ctx.fillText('选择一项技能强化', W / 2, Math.max(104, H * 0.12 + 30));
    ctx.restore();

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var rDef = rarities[card.rarity] || rarityFallback[card.rarity] || rarityFallback.common;
      var cx = startX + i * (cardW + gap);
      var delay = i * 0.08;
      var local = anim.active ? Math.max(0, Math.min(1, (anim.timer - delay) / Math.max(0.001, anim.duration - delay))) : 1;
      var slide = 1 - Math.pow(1 - local, 3);
      var cy = cardY + (1 - slide) * 36;
      var border = skillAccent(card.id, rDef.borderColor || '#b8c0ba');
      var tagColor = rDef.borderColor || border;
      var iconY = cy + cardH * 0.32;

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(cx + 7, cy + 9, cardW, cardH);
      var bg = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      bg.addColorStop(0, '#18201f');
      bg.addColorStop(0.55, '#101514');
      bg.addColorStop(1, '#090b0c');
      ctx.fillStyle = bg;
      ctx.fillRect(cx, cy, cardW, cardH);
      var glow = ctx.createRadialGradient(cx + cardW / 2, iconY, 10, cx + cardW / 2, iconY, cardW * 0.58);
      glow.addColorStop(0, border + '66');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx, cy + 28, cardW, cardH - 28);
      ctx.fillStyle = rDef.tagBgColor || '#4a504c';
      ctx.fillRect(cx, cy, cardW, 34);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(cx + 2, cy + 2, cardW - 4, 10);
      ctx.strokeStyle = border;
      ctx.lineWidth = card.rarity === 'epic' ? 3.5 : 2.4;
      ctx.strokeRect(cx + 0.5, cy + 0.5, cardW - 1, cardH - 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 5, cy + 5, cardW - 10, cardH - 10);

      ctx.fillStyle = card.rarity === 'common' ? tagColor : '#ffffff';
      ctx.font = 'bold 13px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rDef.label || card.rarity || '技能', cx + cardW / 2, cy + 22);

      ctx.save();
      ctx.shadowColor = border;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + cardW / 2, iconY, cardW * 0.19, 0, Math.PI * 2);
      ctx.stroke();
      drawSkillSymbol(ctx, card.id, cx + cardW / 2, iconY, cardW * 0.34, border);
      ctx.restore();

      ctx.font = 'bold 22px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
      ctx.fillStyle = rDef.nameColor || '#ffffff';
      ctx.fillText(card.name || card.id || '技能', cx + cardW / 2, cy + cardH * 0.58);
      ctx.font = '14px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
      ctx.fillStyle = '#b9c3bd';
      var lines = wrapText(ctx, card.desc || '', cardW - 34, 2);
      for (var li = 0; li < lines.length; li++) ctx.fillText(lines[li], cx + cardW / 2, cy + cardH * 0.66 + li * 20);

      var cur = skillLevels[card.id] || 0;
      var cap = card.stackCap || 1;
      var pipY = cy + cardH - 62;
      var pips = Math.min(5, cap);
      var pipGap = 16;
      var pipStart = cx + cardW / 2 - (pips - 1) * pipGap / 2;
      for (var p = 0; p < pips; p++) {
        ctx.save();
        ctx.translate(pipStart + p * pipGap, pipY);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = p < cur ? border : 'rgba(255,255,255,0.18)';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }

      ctx.fillStyle = border;
      ctx.beginPath();
      ctx.arc(cx + cardW / 2, cy + cardH - 25, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#101313';
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText(String(i + 1), cx + cardW / 2, cy + cardH - 19);
      ctx.restore();
      rects.push({ x: cx, y: cy, w: cardW, h: cardH, idx: i });
    }

    ctx.save();
    ctx.globalAlpha = ease;
    ctx.fillStyle = '#9da8a2';
    ctx.font = '13px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 1 / 2 / 3 或点击卡牌选择', W / 2, cardY + cardH + 34);
    ctx.restore();
    return rects;
  }

  window.KOS_RENDER = window.KOS_RENDER || {};
  window.KOS_RENDER.drawSkillSymbol = drawSkillSymbol;
  window.KOS_RENDER.drawLevelUpCards = drawLevelUpCards;
})();
