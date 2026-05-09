(function() {
  var theme = window.KOS_ZOMBIE_THEME || {};
  var palette = theme.colors || {};

  function hash01(seed, salt) {
    var n = ((seed ^ (salt * 374761393)) * 668265263) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;
    return (n & 0xffff) / 0xffff;
  }

  function rectNoise(ctx, x, y, sz, seed, color, count, minW, maxW, minH, maxH, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    for (var i = 0; i < count; i++) {
      var rx = x + Math.floor(hash01(seed, i + 11) * (sz - maxW));
      var ry = y + Math.floor(hash01(seed, i + 29) * (sz - maxH));
      var rw = minW + Math.floor(hash01(seed, i + 47) * (maxW - minW + 1));
      var rh = minH + Math.floor(hash01(seed, i + 61) * (maxH - minH + 1));
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.restore();
  }

  function crack(ctx, x, y, sz, seed, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    var x0 = x + hash01(seed, 101) * sz;
    var y0 = y + hash01(seed, 103) * sz;
    ctx.moveTo(x0, y0);
    for (var i = 0; i < 3; i++) {
      x0 += (hash01(seed, 110 + i) - 0.5) * sz * 0.42;
      y0 += (hash01(seed, 120 + i) - 0.5) * sz * 0.42;
      ctx.lineTo(Math.max(x, Math.min(x + sz, x0)), Math.max(y, Math.min(y + sz, y0)));
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawMapTile(ctx, x, y, sz, biomeId, seed) {
    var h = seed >>> 0;
    var c = {
      dust: palette.groundDust || '#6b6248',
      concrete: palette.groundConcrete || '#46504a',
      road: palette.roadAsphalt || '#2f3432',
      rust: palette.rust || '#9a5830',
      danger: palette.danger || '#e6533f'
    };

    if (biomeId === 4) {
      ctx.fillStyle = c.road;
      ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = 'rgba(220,216,190,0.38)';
      if ((h & 1) === 0) ctx.fillRect(x + sz * 0.47, y + sz * 0.18, Math.max(2, sz * 0.055), sz * 0.34);
      crack(ctx, x, y, sz, h, 'rgba(8,12,10,0.75)', 0.9);
      rectNoise(ctx, x, y, sz, h, '#111614', 1, 12, 20, 5, 10, 0.38);
      return true;
    }

    if (biomeId === 2) {
      ctx.fillStyle = '#687069';
      ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = 'rgba(28,32,30,0.42)';
      ctx.fillRect(x + sz * 0.49, y, 2, sz);
      ctx.fillRect(x, y + sz * 0.49, sz, 2);
      crack(ctx, x, y, sz, h, 'rgba(20,20,18,0.78)', 1);
      rectNoise(ctx, x, y, sz, h, '#3f3328', 2, 8, 18, 3, 7, 0.26);
      return true;
    }

    if (biomeId === 3) {
      ctx.fillStyle = '#314845';
      ctx.fillRect(x, y, sz, sz);
      ctx.fillStyle = 'rgba(58,88,80,0.5)';
      ctx.fillRect(x, y + sz * 0.08, sz, sz * 0.15);
      ctx.strokeStyle = 'rgba(150,210,190,0.24)';
      ctx.lineWidth = 1;
      for (var r = 0; r < 3; r++) {
        var yy = y + sz * (0.25 + r * 0.22) + hash01(h, r) * 5;
        ctx.beginPath();
        ctx.moveTo(x + 6, yy);
        ctx.lineTo(x + sz - 8, yy + (hash01(h, r + 9) - 0.5) * 5);
        ctx.stroke();
      }
      return true;
    }

    if (biomeId === 5) {
      ctx.fillStyle = '#44372a';
      ctx.fillRect(x, y, sz, sz);
      rectNoise(ctx, x, y, sz, h, '#2b261d', 3, 16, 30, 8, 16, 0.42);
      rectNoise(ctx, x, y, sz, h, c.rust, 1, 8, 18, 3, 7, 0.22);
      return true;
    }

    if (biomeId === 6) {
      ctx.fillStyle = '#4b504b';
      ctx.fillRect(x, y, sz, sz);
      rectNoise(ctx, x, y, sz, h, '#2e3430', 7, 2, 5, 2, 4, 0.42);
      rectNoise(ctx, x, y, sz, h, '#687067', 4, 2, 4, 2, 3, 0.32);
      return true;
    }

    if (biomeId === 1) {
      ctx.fillStyle = '#655842';
      ctx.fillRect(x, y, sz, sz);
      rectNoise(ctx, x, y, sz, h, '#77654a', 3, 14, 28, 4, 9, 0.42);
      rectNoise(ctx, x, y, sz, h, '#3d3326', 2, 4, 8, 3, 5, 0.48);
      return true;
    }

    ctx.fillStyle = c.dust;
    ctx.fillRect(x, y, sz, sz);
    rectNoise(ctx, x, y, sz, h, '#7d704f', 4, 5, 13, 1, 3, 0.35);
    rectNoise(ctx, x, y, sz, h, '#4e4432', 1, 12, 20, 5, 9, 0.26);
    return true;
  }

  window.KOS_RENDER = window.KOS_RENDER || {};
  window.KOS_RENDER.drawMapTile = drawMapTile;
})();
