(function() {
  var theme = window.KOS_ZOMBIE_THEME || {};
  var palette = theme.colors || {};

  function shadow(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha || 0.35) + ')';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 5, w * 0.44, Math.max(7, h * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function strokeRect(ctx, x, y, w, h, color, width) {
    ctx.strokeStyle = color || 'rgba(0,0,0,0.55)';
    ctx.lineWidth = width || 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function boxTop(ctx, x, y, w, h, lift, topColor, sideColor, frontColor) {
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + lift, y + lift * 0.55);
    ctx.lineTo(x + w + lift, y + h + lift * 0.55);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = frontColor || sideColor;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w + lift, y + h + lift * 0.55);
    ctx.lineTo(x + lift, y + h + lift * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = topColor;
    ctx.fillRect(x, y, w, h);
  }

  function drawWreckCar(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.42);
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.58);
    ctx.rotate(-0.17);
    var bodyW = w * 0.86;
    var bodyH = h * 0.32;
    ctx.fillStyle = '#5f2b22';
    ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);
    ctx.fillStyle = palette.rust || '#9a5830';
    ctx.fillRect(-bodyW / 2 + 8, -bodyH / 2 + 3, bodyW - 20, bodyH - 7);
    ctx.fillStyle = '#2a302e';
    ctx.fillRect(-bodyW * 0.26, -bodyH - 5, bodyW * 0.34, bodyH * 0.72);
    ctx.fillStyle = '#4b5755';
    ctx.fillRect(-bodyW * 0.21, -bodyH - 2, bodyW * 0.22, bodyH * 0.42);
    ctx.strokeStyle = '#1b1412';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.42, bodyH * 0.42);
    ctx.lineTo(bodyW * 0.44, -bodyH * 0.5);
    ctx.stroke();
    ctx.fillStyle = '#090a09';
    ctx.beginPath(); ctx.arc(-bodyW * 0.32, bodyH * 0.45, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bodyW * 0.30, bodyH * 0.50, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#303532';
    ctx.fillRect(x + 7, y + h - 13, 9, 4);
    ctx.fillRect(x + w - 20, y + h - 11, 13, 5);
    return true;
  }

  function drawCrate(ctx, x, y, w, h, color) {
    shadow(ctx, x, y, w, h, 0.26);
    var base = color || '#765538';
    boxTop(ctx, x, y, w, h, Math.max(5, Math.min(w, h) * 0.18), base, '#4b301c', '#5d3b22');
    ctx.fillStyle = 'rgba(255,220,150,0.16)';
    ctx.fillRect(x + 4, y + 4, w - 8, Math.max(3, h * 0.16));
    ctx.strokeStyle = '#4a2d18';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + h - 4);
    ctx.moveTo(x + w - 4, y + 4); ctx.lineTo(x + 4, y + h - 4);
    ctx.stroke();
    strokeRect(ctx, x, y, w, h, '#241811', 1.5);
    return true;
  }

  function drawBarricade(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.32);
    var bags = Math.max(5, Math.floor(w / 18));
    for (var row = 0; row < 2; row++) {
      for (var i = 0; i < bags; i++) {
        var bx = x + 5 + i * (w - 10) / bags + (row ? 8 : 0);
        var by = y + h - 10 - row * 12;
        ctx.fillStyle = row ? '#9a7d54' : '#7f6546';
        ctx.beginPath();
        ctx.ellipse(bx + 8, by, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4b3a27';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.strokeStyle = '#3b2417';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 7);
    ctx.lineTo(x + w - 7, y + h - 8);
    ctx.moveTo(x + w - 7, y + 7);
    ctx.lineTo(x + 6, y + h - 8);
    ctx.stroke();
    return true;
  }

  function drawFence(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.22);
    ctx.strokeStyle = '#242927';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h); ctx.lineTo(x + 4, y);
    ctx.moveTo(x + w - 2, y + h); ctx.lineTo(x + w - 4, y);
    ctx.moveTo(x + 4, y + 3); ctx.lineTo(x + w - 4, y + 3);
    ctx.moveTo(x + 4, y + h - 3); ctx.lineTo(x + w - 4, y + h - 3);
    ctx.stroke();
    ctx.strokeStyle = '#8a928d';
    ctx.lineWidth = 1;
    for (var d = -h; d < w + h; d += 9) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
      ctx.stroke();
    }
    return true;
  }

  function drawDebris(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.28);
    var blocks = [
      [0.08, 0.55, 0.28, 0.30, '#81766a'],
      [0.28, 0.38, 0.24, 0.26, '#5f625e'],
      [0.50, 0.50, 0.30, 0.24, '#8a7a62'],
      [0.20, 0.18, 0.24, 0.20, '#70766f']
    ];
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      ctx.fillStyle = b[4];
      ctx.fillRect(x + w * b[0], y + h * b[1], w * b[2], h * b[3]);
      strokeRect(ctx, x + w * b[0], y + h * b[1], w * b[2], h * b[3], '#242421', 1);
    }
    ctx.strokeStyle = '#242927';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.20, y + h * 0.86);
    ctx.quadraticCurveTo(x + w * 0.26, y + h * 0.35, x + w * 0.36, y + h * 0.08);
    ctx.moveTo(x + w * 0.66, y + h * 0.82);
    ctx.lineTo(x + w * 0.55, y + h * 0.18);
    ctx.stroke();
    return true;
  }

  function drawBuilding(ctx, x, y, w, h, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(x + 5, y + 6, w, h);
    boxTop(ctx, x, y, w, h, Math.max(8, Math.min(w, h) * 0.16), color || '#5a454a', '#30282c', '#42363a');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + w * 0.26, y + h * 0.22, w * 0.22, h * 0.18);
    ctx.fillRect(x + w * 0.58, y + h * 0.22, w * 0.18, h * 0.18);
    ctx.strokeStyle = 'rgba(20,16,16,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.55);
    ctx.lineTo(x + w * 0.5, y - 4);
    ctx.lineTo(x + w, y + h * 0.55);
    ctx.stroke();
    strokeRect(ctx, x, y, w, h, '#211b1c', 1.5);
    return true;
  }

  function drawWall(ctx, x, y, w, h, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, y + 3, w, h);
    boxTop(ctx, x, y, w, h, Math.max(4, Math.min(w, h) * 0.16), color || '#656963', '#3d423e', '#505650');
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    var brick = 9;
    for (var yy = y; yy < y + h; yy += brick) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }
    strokeRect(ctx, x, y, w, h, '#242927', 1.5);
    return true;
  }

  function drawBridge(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.20);
    ctx.fillStyle = '#7b5230';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(30,18,10,0.22)';
    var planks = Math.max(4, Math.floor((w > h ? w : h) / 26));
    for (var i = 0; i < planks; i++) {
      if (w >= h) ctx.fillRect(x + i * w / planks, y, 3, h);
      else ctx.fillRect(x, y + i * h / planks, w, 3);
    }
    ctx.strokeStyle = '#3b2417';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    return true;
  }

  function drawMountain(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.34);
    var g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#7a6164');
    g.addColorStop(1, '#3a2b32');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, y + h * 0.88);
    ctx.lineTo(x + w * 0.36, y + h * 0.15);
    ctx.lineTo(x + w * 0.52, y + h * 0.46);
    ctx.lineTo(x + w * 0.68, y + h * 0.10);
    ctx.lineTo(x + w * 0.95, y + h * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.34, y + h * 0.18);
    ctx.lineTo(x + w * 0.43, y + h * 0.40);
    ctx.lineTo(x + w * 0.28, y + h * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2b2025';
    ctx.lineWidth = 2;
    ctx.stroke();
    return true;
  }

  function drawGasStation(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.36);
    ctx.fillStyle = '#3e3330';
    ctx.fillRect(x + w * 0.18, y + h * 0.38, w * 0.62, h * 0.50);
    ctx.fillStyle = palette.rust || '#9a5830';
    ctx.fillRect(x + w * 0.10, y + h * 0.22, w * 0.80, h * 0.18);
    ctx.fillStyle = '#1b1f1d';
    ctx.fillRect(x + w * 0.26, y + h * 0.50, w * 0.18, h * 0.30);
    ctx.fillRect(x + w * 0.56, y + h * 0.50, w * 0.18, h * 0.30);
    ctx.strokeStyle = '#2a1510';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, y + h * 0.28);
    ctx.lineTo(x + w * 0.82, y + h * 0.28);
    ctx.moveTo(x + w * 0.33, y + h * 0.80);
    ctx.lineTo(x + w * 0.26, y + h * 0.96);
    ctx.moveTo(x + w * 0.63, y + h * 0.80);
    ctx.lineTo(x + w * 0.74, y + h * 0.96);
    ctx.stroke();
    return true;
  }

  function drawBarrel(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.24);
    var cx = x + w / 2;
    var top = y + h * 0.18;
    ctx.fillStyle = '#6a2f24';
    ctx.fillRect(x + w * 0.22, top, w * 0.56, h * 0.62);
    ctx.fillStyle = '#9a5830';
    ctx.beginPath(); ctx.ellipse(cx, top, w * 0.28, h * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, top + h * 0.62, w * 0.28, h * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1510';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + w * 0.22, top + h * 0.08, w * 0.56, h * 0.50);
    return true;
  }

  function drawTires(ctx, x, y, w, h) {
    shadow(ctx, x, y, w, h, 0.30);
    var count = 3;
    for (var i = 0; i < count; i++) {
      var cx = x + w * (0.28 + i * 0.22);
      var cy = y + h * (0.58 - (i % 2) * 0.16);
      ctx.fillStyle = '#111514';
      ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.17, h * 0.22, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38403c';
      ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.08, h * 0.10, -0.2, 0, Math.PI * 2); ctx.fill();
    }
    return true;
  }

  function drawBloodMark(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#5e1514';
    ctx.beginPath(); ctx.ellipse(x + w * 0.52, y + h * 0.54, w * 0.34, h * 0.22, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.30, y + h * 0.62, w * 0.12, h * 0.08, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.76, y + h * 0.40, w * 0.10, h * 0.07, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return true;
  }

  function drawWorldProp(ctx, x, y, w, h, kind, data) {
    var k = kind || (data && (data.sprite || data.type || data.kind));
    if (k === 'wreck_car') return drawWreckCar(ctx, x, y, w, h);
    if (k === 'crate') return drawCrate(ctx, x, y, w, h, data && data.color);
    if (k === 'barricade' || k === 'sandbag') return drawBarricade(ctx, x, y, w, h);
    if (k === 'fence') return drawFence(ctx, x, y, w, h);
    if (k === 'debris') return drawDebris(ctx, x, y, w, h);
    if (k === 'building') return drawBuilding(ctx, x, y, w, h, data && data.color);
    if (k === 'wall') return drawWall(ctx, x, y, w, h, data && data.color);
    if (k === 'bridge') return drawBridge(ctx, x, y, w, h);
    if (k === 'mountain') return drawMountain(ctx, x, y, w, h);
    if (k === 'gas_station') return drawGasStation(ctx, x, y, w, h);
    if (k === 'barrel' || k === 'toxic_barrel') return drawBarrel(ctx, x, y, w, h);
    if (k === 'tires') return drawTires(ctx, x, y, w, h);
    if (k === 'blood_mark') return drawBloodMark(ctx, x, y, w, h);
    return false;
  }

  window.KOS_RENDER = window.KOS_RENDER || {};
  window.KOS_RENDER.drawWorldProp = drawWorldProp;
})();
