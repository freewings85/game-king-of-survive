// ─── Login/Register System ─────────────────────────────────────
var _serverUrl = (location.protocol === 'file:') ? 'http://localhost:8080' : '';
var _currentPlayer = null; // { id, nickname, gold, level, rank, ... }

function _apiRequest(method, path, data, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open(method, _serverUrl + path);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      cb(null, JSON.parse(xhr.responseText));
    } else {
      cb(xhr.status + ': ' + xhr.responseText, null);
    }
  };
  xhr.onerror = function() { cb('网络错误，无法连接服务器', null); };
  xhr.timeout = 5000;
  xhr.ontimeout = function() { cb('连接超时', null); };
  xhr.send(data ? JSON.stringify(data) : null);
}

function _showMsg(msg, isError) {
  var el = document.getElementById('login-msg');
  el.textContent = msg;
  el.style.color = isError ? '#ff6b6b' : '#4a9';
}

function _enterGame(playerData) {
  _currentPlayer = playerData;
  // Save to localStorage for quick re-login
  try { localStorage.setItem('survivor_player_id', playerData.id); } catch(e) {}
  // Hide login, show player bar
  document.getElementById('login-overlay').classList.add('hidden');
  var bar = document.getElementById('player-bar');
  bar.style.display = playerData.offlineGuest ? 'none' : 'block';
  document.getElementById('bar-name').textContent = playerData.nickname;
  document.getElementById('bar-gold').textContent = (playerData.gold || 0) + ' 金币';
  document.getElementById('bar-rank').textContent = playerData.rank || '青铜';
  document.getElementById('bar-level').textContent = 'Lv.' + (playerData.level || 1);
  // Set gold in game
  if (typeof window._setPlayerGold === 'function') window._setPlayerGold(playerData.gold || 0);
  if (window.KOS_LOBBY && typeof window.KOS_LOBBY.applyToGame === 'function') {
    window.KOS_LOBBY.applyToGame(window._gameAPI);
  }
  if (playerData.offlineGuest) return;
  // Claim daily reward automatically
  _apiRequest('POST', '/api/players/' + playerData.id + '/claim-daily-reward', null, function(err, reward) {
    if (!err && reward && reward.description) {
      document.getElementById('bar-gold').textContent = '签到: ' + reward.description;
      setTimeout(function() {
        // Refresh player data to get updated gold
        _apiRequest('GET', '/api/players/' + playerData.id, null, function(e2, p2) {
          if (!e2 && p2) {
            _currentPlayer = p2;
            document.getElementById('bar-gold').textContent = (p2.gold || 0) + ' 金币';
            if (typeof window._setPlayerGold === 'function') window._setPlayerGold(p2.gold || 0);
          }
        });
      }, 2000);
    }
  });
}

function doGuestPlay() {
  var nickname = document.getElementById('nickname-input').value.trim() || 'Player 1';
  _showMsg('离线模式已准备', false);
  _enterGame({
    id: 'offline_' + Date.now(),
    nickname: nickname,
    gold: 0,
    level: 1,
    rank: '离线',
    offlineGuest: true
  });
}

function doRegister() {
  var nickname = document.getElementById('nickname-input').value.trim();
  if (!nickname) { _showMsg('请输入昵称', true); return; }
  if (nickname.length < 2) { _showMsg('昵称至少2个字符', true); return; }
  _showMsg('注册中...', false);
  _apiRequest('POST', '/api/players', { nickname: nickname }, function(err, data) {
    if (err) { _showMsg('注册失败: ' + err, true); return; }
    _showMsg('注册成功！', false);
    _enterGame(data);
  });
}

function doLogin() {
  var nickname = document.getElementById('nickname-input').value.trim();
  if (!nickname) {
    // Try auto-login from localStorage
    var savedId = null;
    try { savedId = localStorage.getItem('survivor_player_id'); } catch(e) {}
    if (savedId) {
      _showMsg('登录中...', false);
      _apiRequest('GET', '/api/players/' + savedId, null, function(err, data) {
        if (err) { _showMsg('账号不存在，请重新注册', true); return; }
        _showMsg('欢迎回来！', false);
        _enterGame(data);
      });
      return;
    }
    _showMsg('请输入昵称或先注册', true);
    return;
  }
  // Register as login (server uses in-memory, so always register)
  _showMsg('登录中...', false);
  _apiRequest('POST', '/api/players', { nickname: nickname }, function(err, data) {
    if (err) { _showMsg('登录失败: ' + err, true); return; }
    _enterGame(data);
  });
}

// Auto-login on load if saved
(function() {
  // file:// protocol: game requires server connection, show warning
  if (location.protocol === 'file:') {
    document.getElementById('login-msg').textContent = '请通过服务器访问游戏 (http://localhost:8080)';
    document.getElementById('login-msg').style.color = '#ff6b6b';
    return;
  }
  var savedId = null;
  try { savedId = localStorage.getItem('survivor_player_id'); } catch(e) {}
  if (savedId) {
    _apiRequest('GET', '/api/players/' + savedId, null, function(err, data) {
      if (!err && data) {
        document.getElementById('nickname-input').value = data.nickname;
      }
    });
  }
  // Enter key to register
  document.getElementById('nickname-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doRegister();
  });
})();
