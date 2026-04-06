/**
 * Canvas 游戏自动测试助手 v2
 * ================================
 * 
 * 前提：游戏 survivor.html 需暴露 window._gameAPI（已在代码末尾添加）。
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 注入方式（在 Playwright MCP browser_evaluate 中执行一次）     │
 * │   () => { ... 此文件全部内容 ... }                           │
 * │                                                              │
 * │ 注入后的使用（每次操作只需一行 browser_evaluate）：            │
 * │   () => _g.state()                  // 查询游戏状态           │
 * │   () => _g.click(400, 355)          // 点击坐标               │
 * │   () => _g.solo()                   // 点单排模式              │
 * │   () => _g.quickStart('mage')       // 一键法师开局            │
 * │   () => _g.quickStart('scout',1,[2,4,6,8,9])  // 斥候+暗影+自选技能 │
 * │   () => _g.autoUpgrade()            // 自动花技能点            │
 * │   () => _g.playAgain()              // 结算页再来一局          │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * 自动游戏循环示例（browser_run_code）：
 *   async (page) => {
 *     await page.evaluate(() => _g.quickStart('mage'));
 *     for (let i = 0; i < 40; i++) {
 *       await page.waitForTimeout(3000);
 *       const s = JSON.parse(await page.evaluate(() => _g.state()));
 *       if (s.state === 'gameOver') return 'game ended: ' + JSON.stringify(s);
 *       if (s.skillPoints > 0) await page.evaluate(() => _g.autoUpgrade());
 *     }
 *   }
 */
(function() {
  'use strict';

  var canvas = document.querySelector('canvas');
  if (!canvas) return 'ERROR: no canvas found';

  var _g = {
    _el: canvas,

    // ─── 基础操作 ─────────────────────────────────────

    click: function(x, y) {
      var r = this._el.getBoundingClientRect();
      var opts = { clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true };
      this._el.dispatchEvent(new MouseEvent('mousedown', opts));
      this._el.dispatchEvent(new MouseEvent('mouseup', opts));
      this._el.dispatchEvent(new MouseEvent('click', opts));
      return 'click(' + x + ',' + y + ')';
    },

    dblclick: function(x, y) {
      this.click(x, y);
      var r = this._el.getBoundingClientRect();
      this._el.dispatchEvent(new MouseEvent('dblclick', {
        clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true
      }));
      return 'dblclick(' + x + ',' + y + ')';
    },

    seq: function(coords, interval) {
      interval = interval || 200;
      var self = this, results = [];
      return new Promise(function(resolve) {
        var i = 0;
        (function next() {
          if (i >= coords.length) { resolve(results.join('; ')); return; }
          results.push(self.click(coords[i][0], coords[i][1]));
          i++;
          setTimeout(next, interval);
        })();
      });
    },

    key: function(k) {
      var opts = { key: k, code: 'Key' + k.toUpperCase(), bubbles: true };
      document.dispatchEvent(new KeyboardEvent('keydown', opts));
      document.dispatchEvent(new KeyboardEvent('keyup', opts));
      return 'key(' + k + ')';
    },

    move: function(dx, dy, duration) {
      duration = duration || 1000;
      var self = this, r = this._el.getBoundingClientRect();
      var H = this._el.height, jx = 260, jy = H - 130, dist = 40;
      var s = { clientX: r.left + jx, clientY: r.top + jy, bubbles: true };
      var m = { clientX: r.left + jx + dx * dist, clientY: r.top + jy + dy * dist, bubbles: true };
      this._el.dispatchEvent(new MouseEvent('mousedown', s));
      this._el.dispatchEvent(new MouseEvent('mousemove', m));
      return new Promise(function(resolve) {
        setTimeout(function() {
          self._el.dispatchEvent(new MouseEvent('mouseup', m));
          resolve('move(' + dx + ',' + dy + ',' + duration + ')');
        }, duration);
      });
    },

    wait: function(ms) {
      return new Promise(function(resolve) {
        setTimeout(function() { resolve('waited ' + ms + 'ms'); }, ms);
      });
    },

    // ─── 状态查询（依赖 window._gameAPI）──────────────

    state: function() {
      var a = window._gameAPI;
      if (!a) return JSON.stringify({ error: '_gameAPI not found' });
      var s = {};
      try { s.state = a.state; } catch(e) {}
      try { var p = a.player; if (p) { s.hp = Math.round(p.hp) + '/' + Math.round(p.maxHp); s.lv = p.level; s.kills = p.kills; } } catch(e) {}
      try { s.wave = a.waveNumber; } catch(e) {}
      try { s.gold = a.gold; } catch(e) {}
      try { s.skillPoints = a.pendingSkillPoints; } catch(e) {}
      try { s.selectedClass = a.selectedClass; } catch(e) {}
      try { s.enemies = a.enemies ? a.enemies.length : 0; } catch(e) {}
      try { s.time = Math.round(a.gameTimer || 0); } catch(e) {}
      return JSON.stringify(s);
    },

    info: function() {
      var r = this._el.getBoundingClientRect();
      return JSON.stringify({
        logical: this._el.width + 'x' + this._el.height,
        display: Math.round(r.width) + 'x' + Math.round(r.height),
        offset: Math.round(r.left) + ',' + Math.round(r.top)
      });
    },

    // ─── 菜单快捷操作 ────────────────────────────────
    // 以下坐标基于 W=800, H=600

    solo: function()  { return this.click(353, 355); },
    team: function()  { return this.click(447, 355); },
    daily: function() { return this.click(353, 420); },

    pickClass: function(i) {
      return this.click(400, [130, 210, 290][i] || 130);
    },

    pickMap: function(i) {
      return this.click(400, [125, 170, 212][i] || 125);
    },

    mapStart: function() {
      return this.click(400, 560);
    },

    pickSkill: function(i) {
      var cols = 2, cW = 180, cH = 52, gX = 12, gY = 8;
      var sX = 400 - (cols * cW + (cols - 1) * gX) / 2;
      return this.click(
        sX + (i % cols) * (cW + gX) + cW / 2,
        80 + Math.floor(i / cols) * (cH + gY) + cH / 2
      );
    },

    confirmBuild: function() {
      return this.click(400, 80 + 5 * 60 + 80 + 20);
    },

    // ─── 游戏中操作 ──────────────────────────────────

    upgradeSkill: function(i) {
      return this.click(788, 60 + i * 44 + 22);
    },

    autoUpgrade: function() {
      var a = window._gameAPI;
      var pts = 0;
      try { pts = a.pendingSkillPoints || 0; } catch(e) {}
      if (pts <= 0) return 'no pts';
      var r = [];
      for (var i = 0; i < pts; i++) r.push(this.upgradeSkill(i % 5));
      return r.join('; ');
    },

    // ─── 结算操作 ────────────────────────────────────

    playAgain: function() { return this.click(400, 553); },
    share: function()     { return this.click(400, 500); },

    // ─── 组合流程 ────────────────────────────────────

    quickStart: function(cls, mapIdx, skills) {
      var self = this;
      var ci = typeof cls === 'number' ? cls : cls === 'mage' ? 1 : cls === 'scout' ? 2 : 0;
      skills = skills || [0, 1, 2, 3, 4];
      mapIdx = mapIdx || 0;

      return new Promise(function(resolve) {
        self.solo();
        setTimeout(function() {
          self.pickClass(ci);
          setTimeout(function() {
            if (mapIdx > 0) self.pickMap(mapIdx);
            setTimeout(function() {
              self.mapStart();
              setTimeout(function() {
                var si = 0;
                (function nxt() {
                  if (si >= skills.length) {
                    setTimeout(function() {
                      self.confirmBuild();
                      resolve('quickStart: class=' + ci + ' map=' + mapIdx + ' skills=' + JSON.stringify(skills));
                    }, 300);
                    return;
                  }
                  self.pickSkill(skills[si]);
                  si++;
                  setTimeout(nxt, 200);
                })();
              }, 500);
            }, 300);
          }, 300);
        }, 500);
      });
    }
  };

  window._g = _g;
  return 'Canvas helper v2 ready. canvas=' + canvas.width + 'x' + canvas.height;
})();
