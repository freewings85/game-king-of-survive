(function() {
  var theme = window.KOS_ZOMBIE_THEME || {};
  var colors = theme.colors || {};

  function alpha(ctx, value, fn) {
    ctx.save();
    ctx.globalAlpha *= value;
    fn();
    ctx.restore();
  }

  function drawDiamond(ctx, x, y, size, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = fill;
    ctx.fillRect(-size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, size * 0.16);
      ctx.strokeRect(-size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
    }
    ctx.restore();
  }

  function drawXpGem(ctx, gem) {
    var t = gem._t || 0;
    var tier = gem.gemTier || (gem.xp >= 50 ? 'large' : (gem.xp >= 25 ? 'medium' : 'small'));
    var base = tier === 'large' ? 12 : (tier === 'medium' ? 8 : 5);
    var pulse = 1 + Math.sin(t * 2.8) * 0.16;
    var size = base * pulse;
    var glow = tier === 'large' ? '#b95cff' : (tier === 'medium' ? '#42d9ff' : (colors.xpGreen || '#7cff4f'));
    var body = tier === 'large' ? '#e6c4ff' : (tier === 'medium' ? '#9be9ff' : '#b9ff8e');
    var age = t;
    var fade = age > 27 ? Math.max(0, (36 - age) / 9) : 1;

    ctx.save();
    alpha(ctx, 0.26 * fade, function() {
      var rg = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, size * 4.0);
      rg.addColorStop(0, glow);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, size * 4.0, 0, Math.PI * 2);
      ctx.fill();
    });

    alpha(ctx, 0.65 * fade, function() {
      ctx.strokeStyle = glow;
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, size * 1.55, 0, Math.PI * 2);
      ctx.stroke();
    });

    drawDiamond(ctx, gem.x, gem.y, size, body, glow);
    alpha(ctx, 0.9 * fade, function() {
      drawDiamond(ctx, gem.x - size * 0.14, gem.y - size * 0.16, size * 0.36, '#ffffff', null);
    });
    ctx.restore();
    return true;
  }

  function drawBulletTracer(ctx, fx) {
    var a = Math.min(1, Math.max(0, fx.life / Math.max(0.001, fx.maxLife || 0.4)));
    var len = fx.kind === 'chain' ? 54 : 42;
    var core = fx.color || colors.playerGold || '#f4c95a';

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.rotate(fx.angle || 0);
    alpha(ctx, 0.28 * a, function() {
      ctx.fillStyle = '#000';
      ctx.fillRect(-len - 2, -4.5, len + 11, 9);
    });
    alpha(ctx, 0.42 * a, function() {
      var grad = ctx.createLinearGradient(-len, 0, 8, 0);
      grad.addColorStop(0, 'rgba(244,201,90,0)');
      grad.addColorStop(0.45, core);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(-len, -2.5, len + 8, 5);
    });
    ctx.fillStyle = '#fff7cf';
    ctx.globalAlpha = a;
    ctx.fillRect(-2, -3, 12, 6);
    ctx.fillStyle = '#ff9f35';
    ctx.fillRect(-len * 0.42, -1.5, len * 0.42, 3);
    ctx.restore();

    return true;
  }

  function drawAbilityOverlay(ctx, params) {
    var fx = params.fx;
    var W = params.W, H = params.H;
    var player = params.player;
    var cameraX = params.cameraX || 0;
    var cameraY = params.cameraY || 0;
    var r = Math.min(1, fx.t / Math.max(0.001, fx.dur));
    var a = 1 - r;

    ctx.save();
    if (fx.kind === 'mage') {
      alpha(ctx, 0.26 * a, function() {
        ctx.fillStyle = '#42d9ff';
        ctx.fillRect(0, 0, W, H);
      });
      ctx.strokeStyle = '#a9f2ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.88 * a;
      for (var i = 0; i < 7; i++) {
        var y = H * (0.20 + i * 0.095);
        var x0 = W * 0.20 + Math.sin(i * 1.7) * 18;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.bezierCurveTo(W * 0.38, y - 40, W * 0.58, y + 38, W * 0.84, y - 18);
        ctx.stroke();
      }
    } else if (fx.kind === 'healer' && player) {
      var hx = player.x - cameraX, hy = player.y - cameraY;
      var maxR = 120 + r * 250;
      alpha(ctx, 0.22 * a, function() {
        var g = ctx.createRadialGradient(hx, hy, 0, hx, hy, maxR);
        g.addColorStop(0, 'rgba(255,232,150,0.9)');
        g.addColorStop(1, 'rgba(255,232,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hx, hy, maxR, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 0.9 * a;
      ctx.strokeStyle = '#f4c95a';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(hx, hy, maxR, 0, Math.PI * 2); ctx.stroke();
    } else if (player) {
      var wx = player.x - cameraX, wy = player.y - cameraY;
      var wr = (player.radius || 24) + 30 + r * 90;
      ctx.globalAlpha = 0.85 * a;
      ctx.strokeStyle = '#ff8b3d';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.stroke();
      for (var s = 0; s < 8; s++) {
        var ang = s * Math.PI / 4 + r * 1.5;
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(ang) * (wr * 0.45), wy + Math.sin(ang) * (wr * 0.45));
        ctx.lineTo(wx + Math.cos(ang) * wr, wy + Math.sin(ang) * wr);
        ctx.stroke();
      }
    }
    ctx.restore();
    return true;
  }

  window.KOS_RENDER = window.KOS_RENDER || {};
  window.KOS_RENDER.drawXpGem = drawXpGem;
  window.KOS_RENDER.drawBulletTracer = drawBulletTracer;
  window.KOS_RENDER.drawAbilityOverlay = drawAbilityOverlay;
})();
