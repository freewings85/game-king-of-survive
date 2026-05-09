(function() {
  'use strict';

  function drawGround(ctx, w, h, time) {
    ctx.fillStyle = '#2b302c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    for (var x = -80; x < w + 80; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x + ((time || 0) % 1) * 8, 0);
      ctx.lineTo(x - h * 0.55, h);
      ctx.stroke();
    }
    for (var y = 18; y < h; y += 38) {
      ctx.fillStyle = y % 76 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.10)';
      ctx.fillRect(0, y, w, 2);
    }
    drawWreck(ctx, 42, h - 70, 92, 42, '#7a432b', -0.12);
    drawWreck(ctx, w - 150, 28, 96, 50, '#333a3a', 0.08);
    drawCrate(ctx, w * 0.58, h * 0.64);
    drawTires(ctx, w * 0.77, h * 0.75);
  }

  function drawWreck(ctx, x, y, w, h, color, rot) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot || 0);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fillRect(-w / 2 + 8, h / 2 - 3, w, 14);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#202526';
    ctx.fillRect(-w * 0.22, -h * 0.38, w * 0.38, h * 0.38);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, h * 0.34);
    ctx.lineTo(w * 0.42, -h * 0.30);
    ctx.stroke();
    ctx.restore();
  }

  function drawCrate(ctx, x, y) {
    ctx.fillStyle = '#8b6235';
    ctx.fillRect(x, y, 34, 34);
    ctx.strokeStyle = '#22170c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 34, 34);
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + 30, y + 30);
    ctx.moveTo(x + 30, y + 4);
    ctx.lineTo(x + 4, y + 30);
    ctx.stroke();
  }

  function drawTires(ctx, x, y) {
    ctx.fillStyle = '#0d1110';
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 18, y + (i % 2) * 7, 17, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSurvivor(ctx, x, y, s, color, kind) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.72, s * 0.65, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0b0d0d';
    ctx.lineWidth = Math.max(3, s * 0.09);
    ctx.fillStyle = '#202827';
    ctx.fillRect(x - s * 0.28, y - s * 0.28, s * 0.56, s * 0.75);
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.24, y - s * 0.20, s * 0.48, s * 0.22);
    ctx.fillStyle = '#d0a05f';
    ctx.beginPath();
    ctx.arc(x + s * 0.30, y - s * 0.36, s * 0.20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#1a1f1d';
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.46, y - s * 0.06);
    ctx.lineTo(x + s * 0.55, y - s * 0.22);
    ctx.stroke();
    ctx.strokeStyle = '#303836';
    ctx.lineWidth = s * 0.10;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, y - s * 0.02);
    ctx.lineTo(x + s * 0.88, y - s * 0.16);
    ctx.stroke();
    if (kind === 'guardian') {
      ctx.fillStyle = '#293332';
      ctx.fillRect(x - s * 0.72, y - s * 0.46, s * 0.24, s * 0.80);
      ctx.strokeRect(x - s * 0.72, y - s * 0.46, s * 0.24, s * 0.80);
    }
    if (kind === 'tech') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x - s * 0.46, y - s * 0.12, s * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawZombie(ctx, x, y, s, tint) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.48, s * 0.42, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tint || '#8a9462';
    ctx.fillRect(x - s * 0.20, y - s * 0.12, s * 0.40, s * 0.52);
    ctx.beginPath();
    ctx.arc(x, y - s * 0.28, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#141816';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.35, y + s * 0.02);
    ctx.lineTo(x - s * 0.62, y + s * 0.20);
    ctx.moveTo(x + s * 0.32, y + s * 0.02);
    ctx.lineTo(x + s * 0.58, y + s * 0.17);
    ctx.stroke();
    ctx.fillStyle = '#e55b4d';
    ctx.beginPath();
    ctx.arc(x - s * 0.08, y - s * 0.30, s * 0.035, 0, Math.PI * 2);
    ctx.arc(x + s * 0.10, y - s * 0.30, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGem(ctx, x, y, s) {
    ctx.save();
    ctx.fillStyle = '#7cff4f';
    ctx.shadowColor = '#7cff4f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.75, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.75, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBullet(ctx, x1, y1, x2, y2, color, width) {
    var g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.35, color);
    g.addColorStop(1, '#fff5c0');
    ctx.strokeStyle = g;
    ctx.lineWidth = width || 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawSkillArt(ctx, skill, index) {
    ctx.clearRect(0, 0, 160, 110);
    ctx.fillStyle = '#121514';
    ctx.fillRect(0, 0, 160, 110);
    if (window.KOS_RENDER && window.KOS_RENDER.drawSkillSymbol) {
      window.KOS_RENDER.drawSkillSymbol(ctx, skill.id, 80, 54, 44, skill.color);
    }
    if (index === 0 || skill.id === 'scatter') {
      for (var i = -2; i <= 2; i++) drawBullet(ctx, 42, 72, 118, 42 + i * 12, '#ffd36a');
    } else if (index === 1 || skill.id === 'explosive') {
      ctx.fillStyle = 'rgba(255,130,30,0.28)';
      ctx.beginPath(); ctx.arc(80, 58, 42, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#62e6ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(36, 62); ctx.lineTo(66, 40); ctx.lineTo(92, 70); ctx.lineTo(126, 42);
      ctx.stroke();
    }
  }

  function drawCombatShot(ctx, w, h, mode, cls) {
    cls = cls || { color: '#4ec9ff', id: 'tech' };
    drawGround(ctx, w, h, 0);
    drawSurvivor(ctx, 78, 126, 28, cls.color, cls.id);
    var targets = [[260,70],[318,102],[282,145],[355,156],[220,116]];
    targets.forEach(function(p, i) { drawZombie(ctx, p[0], p[1], i === 3 ? 28 : 23, i === 3 ? '#6f7b4d' : '#92986e'); });
    drawGem(ctx, 205, 166, 7);
    if (mode === 'scatter') {
      for (var i = -2; i <= 2; i++) drawBullet(ctx, 104, 110, 240 + Math.abs(i) * 18, 116 + i * 22, '#ffd36a');
    } else if (mode === 'pierce') {
      drawBullet(ctx, 104, 110, 368, 112, '#ffcf53');
      ctx.fillStyle = 'rgba(255,207,83,0.18)';
      ctx.fillRect(178, 104, 160, 16);
    } else if (mode === 'blast') {
      drawBullet(ctx, 104, 110, 270, 122, '#ffcf53');
      ctx.fillStyle = 'rgba(255,120,28,0.38)';
      ctx.beginPath(); ctx.arc(282, 122, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath(); ctx.arc(282, 122, 14, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#62e6ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(104, 110); ctx.lineTo(220, 116); ctx.lineTo(260, 70); ctx.lineTo(318, 102); ctx.lineTo(355, 156);
      ctx.stroke();
    }
  }

  function drawPhoneScene(ctx, w, h, cls, time) {
    cls = cls || { color: '#4ec9ff', id: 'tech', mark: 'T' };
    var t = time || 0;
    drawGround(ctx, w, h, t);
    var sx = 316 + Math.sin(t * 1.2) * 16;
    var sy = 265 + Math.cos(t * 1.1) * 8;
    var z = [[465,140,30],[548,188,26],[610,116,31],[675,250,28],[498,318,24],[720,345,33],[235,342,25],[800,165,29]];
    z.forEach(function(p, i) {
      drawZombie(ctx, p[0] + Math.sin(t + i) * 5, p[1] + Math.cos(t * 0.8 + i) * 4, p[2], i === 2 ? '#6f7b4d' : '#92986e');
    });
    for (var i = -2; i <= 2; i++) drawBullet(ctx, sx + 28, sy - 12, 465 + Math.abs(i) * 28, 208 + i * 24, '#ffd36a');
    drawSurvivor(ctx, sx, sy, 40, cls.color, cls.id);
    [410,174,530,240,585,78,690,300,376,352].forEach(function(v, i, arr) {
      if (i % 2 === 0) drawGem(ctx, arr[i], arr[i + 1], 9);
    });
    drawPhoneHud(ctx, w, h, cls, t);
  }

  function drawMapPreview(ctx, w, h, map, cls, time) {
    cls = cls || { color: '#4ec9ff', id: 'tech', mark: 'T' };
    var t = time || 0;
    if (!map) {
      drawPhoneScene(ctx, w, h, cls, t);
      return { tileCount: 0, propCount: 0, zombieEntries: 0, rewardPoints: 0 };
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#111514';
    ctx.fillRect(0, 0, w, h);

    var tileSize = map.tileSize || 64;
    var scale = Math.min(w / map.width, h / map.height) * 1.22;
    var ox = (w - map.width * scale) / 2;
    var oy = (h - map.height * scale) / 2 + h * 0.03;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    for (var y = 0; y < map.rows; y++) {
      for (var x = 0; x < map.cols; x++) {
        var id = map.tiles[y * map.cols + x] | 0;
        if (window.KOS_RENDER && window.KOS_RENDER.drawMapTile) {
          window.KOS_RENDER.drawMapTile(ctx, x * tileSize, y * tileSize, tileSize, id, ((x * 73856093) ^ (y * 19349663)) >>> 0);
        }
      }
    }

    var props = (map.structures || []).slice().sort(function(a, b) {
      return (a.y + a.h) - (b.y + b.h);
    });
    props.forEach(function(prop) {
      if (window.KOS_RENDER && window.KOS_RENDER.drawWorldProp) {
        window.KOS_RENDER.drawWorldProp(ctx, prop.x, prop.y, prop.w, prop.h, prop.kind, prop);
      }
    });

    var center = map.stormCenter || { x: map.width / 2, y: map.height / 2 };
    ctx.strokeStyle = 'rgba(185,92,255,0.65)';
    ctx.lineWidth = 5 / scale;
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.min(map.width, map.height) * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    var spawn = (map.spawnPoints && map.spawnPoints[0]) || { x: map.width * 0.48, y: map.height * 0.56 };
    drawSurvivor(ctx, spawn.x, spawn.y, 46 / scale, cls.color, cls.id);
    (map.zombieEntries || []).slice(0, 8).forEach(function(entry, i) {
      var zx = entry.x + Math.sin(t + i) * 18;
      var zy = entry.y + Math.cos(t * 0.8 + i) * 14;
      drawZombie(ctx, zx, zy, (i % 3 === 0 ? 38 : 30) / scale, i % 3 === 0 ? '#6f7b4d' : '#92986e');
      drawBullet(ctx, spawn.x + 30 / scale, spawn.y - 12 / scale, zx, zy, '#ffd36a', 5 / scale);
    });
    (map.rewardPoints || []).slice(0, 8).forEach(function(point) {
      drawGem(ctx, point.x, point.y, 10 / scale);
    });
    ctx.restore();

    drawPhoneHud(ctx, w, h, cls, t);
    return {
      tileCount: (map.tiles || []).length,
      propCount: (map.structures || []).length,
      zombieEntries: (map.zombieEntries || []).length,
      rewardPoints: (map.rewardPoints || []).length
    };
  }

  function drawPhoneHud(ctx, w, h, cls, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(7,9,9,0.62)';
    ctx.fillRect(0, 0, w, 62);
    ctx.fillStyle = cls.color;
    ctx.beginPath(); ctx.arc(54, 32, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(cls.mark || 'T', 54, 38);
    ctx.fillStyle = '#1b0605';
    ctx.fillRect(92, 18, 170, 12);
    ctx.fillStyle = '#e95b45';
    ctx.fillRect(92, 18, 158, 12);
    ctx.fillStyle = '#07131a';
    ctx.fillRect(92, 38, 120, 8);
    ctx.fillStyle = '#4ec9ff';
    ctx.fillRect(92, 38, 82, 8);
    ctx.fillStyle = '#f4c95a';
    ctx.font = 'bold 18px "Noto Sans SC", Arial';
    ctx.fillText('6', 52, 66);
    ctx.strokeStyle = '#f4c95a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(52, 58, 21, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.translate(w - 105, 88);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.38)';
    ctx.stroke();
    ctx.fillStyle = '#78d66a';
    for (var i = 0; i < 7; i++) ctx.fillRect(-40 + (i * 23) % 82, -44 + (i * 31) % 85, 5, 5);
    ctx.fillStyle = cls.color;
    ctx.beginPath(); ctx.arc(Math.sin(t) * 24, Math.cos(t * 0.8) * 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  window.KOS_RENDER = window.KOS_RENDER || {};
  window.KOS_RENDER.v03 = {
    drawGround: drawGround,
    drawWreck: drawWreck,
    drawCrate: drawCrate,
    drawTires: drawTires,
    drawSurvivor: drawSurvivor,
    drawZombie: drawZombie,
    drawGem: drawGem,
    drawBullet: drawBullet,
    drawSkillArt: drawSkillArt,
    drawCombatShot: drawCombatShot,
    drawPhoneScene: drawPhoneScene,
    drawMapPreview: drawMapPreview,
    drawPhoneHud: drawPhoneHud
  };
})();
