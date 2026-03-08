"""
Full-Journey Profile Simulator — simulates 8 players with different
gender/age demographics through the COMPLETE game lifecycle:

  1. 注册账号 (POST /api/players)
  2. 每日签到领奖 (POST /api/players/{id}/claim-daily-reward)
  3. 购买/装备皮肤 (PUT /api/players/{id}/equip-skin)
  4. 创建/加入房间 (POST /api/rooms, /api/rooms/{id}/join)
  5. 准备 + 开始游戏 (POST /api/rooms/{id}/ready, /start)
  6. 实际游戏对局 (Playwright 控制)
  7. 结算积分 + 段位 (POST /api/scores/calculate)
  8. 玩家反馈意见 (基于体验数据生成)

Each player profile has distinct play styles based on demographics.
"""
import os
import sys
import json
import time
import math
import random
import subprocess
import signal
import urllib.request
import urllib.error

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEMO_PATH = os.path.join(PROJECT_ROOT, 'demo', 'survivor.html')
FEEDBACK_DIR = os.path.join(PROJECT_ROOT, 'feedback')
SERVER_JAR = os.path.join(PROJECT_ROOT, 'server', 'target', 'king-of-survive-server-1.0.0-SNAPSHOT.jar')
API_BASE = 'http://localhost:8080'

# 8 player profiles covering gender × age demographics
PROFILES = [
    {'id': 0, 'name': '小明', 'gender': 'M', 'age': 10, 'group': '少年',   'style': 'curious',     'aggression': 0.3, 'dodge_skill': 0.4, 'patience': 0.5, 'skill_pref': 'random'},
    {'id': 1, 'name': '小红', 'gender': 'F', 'age': 12, 'group': '少年',   'style': 'cautious',    'aggression': 0.2, 'dodge_skill': 0.5, 'patience': 0.6, 'skill_pref': 'defensive'},
    {'id': 2, 'name': '张伟', 'gender': 'M', 'age': 16, 'group': '青少年', 'style': 'aggressive',  'aggression': 0.9, 'dodge_skill': 0.7, 'patience': 0.3, 'skill_pref': 'damage'},
    {'id': 3, 'name': '李婷', 'gender': 'F', 'age': 17, 'group': '青少年', 'style': 'strategic',   'aggression': 0.6, 'dodge_skill': 0.8, 'patience': 0.7, 'skill_pref': 'balanced'},
    {'id': 4, 'name': '王磊', 'gender': 'M', 'age': 25, 'group': '青年',   'style': 'competitive', 'aggression': 0.8, 'dodge_skill': 0.9, 'patience': 0.5, 'skill_pref': 'damage'},
    {'id': 5, 'name': '刘芳', 'gender': 'F', 'age': 28, 'group': '青年',   'style': 'balanced',    'aggression': 0.5, 'dodge_skill': 0.7, 'patience': 0.8, 'skill_pref': 'balanced'},
    {'id': 6, 'name': '陈强', 'gender': 'M', 'age': 42, 'group': '中年',   'style': 'methodical',  'aggression': 0.4, 'dodge_skill': 0.5, 'patience': 0.9, 'skill_pref': 'defensive'},
    {'id': 7, 'name': '赵丽', 'gender': 'F', 'age': 38, 'group': '中年',   'style': 'explorer',    'aggression': 0.3, 'dodge_skill': 0.6, 'patience': 0.7, 'skill_pref': 'random'},
]

AVAILABLE_SKINS = ['flame_red', 'ice_blue', 'forest_green', 'royal_gold', 'shadow_purple']


# ─── Server API helpers ─────────────────────────────────────────────

def api_post(path, data=None):
    """POST JSON to server API, return parsed response."""
    url = API_BASE + path
    body = json.dumps(data).encode() if data else b'{}'
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, Exception) as e:
        return {'_error': str(e)}


def api_put(path, data=None):
    """PUT JSON to server API."""
    url = API_BASE + path
    body = json.dumps(data).encode() if data else b'{}'
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='PUT')
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, Exception) as e:
        return {'_error': str(e)}


def api_get(path):
    """GET from server API."""
    url = API_BASE + path
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, Exception) as e:
        return {'_error': str(e)}


def start_server():
    """Start Spring Boot server in background, return process."""
    java_home = '/usr/lib/jvm/java-8-openjdk-amd64'
    if not os.path.exists(SERVER_JAR):
        print(f"  [WARN] Server JAR not found: {SERVER_JAR}, skipping server tests")
        return None
    env = os.environ.copy()
    env['JAVA_HOME'] = java_home
    proc = subprocess.Popen(
        [f'{java_home}/bin/java', '-jar', SERVER_JAR],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        env=env, preexec_fn=os.setsid
    )
    # Wait for server ready
    for _ in range(30):
        try:
            urllib.request.urlopen(f'{API_BASE}/api/rooms', timeout=2)
            return proc
        except Exception:
            time.sleep(1)
    print("  [WARN] Server failed to start within 30s")
    proc.kill()
    return None


def stop_server(proc):
    """Stop the server process."""
    if proc:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        proc.wait(timeout=5)


# ─── Phase 1: Registration + Daily Reward + Skin ────────────────────

def phase_register_and_setup(profile):
    """Register player, claim daily reward, try to equip skin."""
    steps = {}

    # 1. Register
    player = api_post('/api/players', {'nickname': profile['name']})
    if '_error' in player:
        return {'_error': f"Registration failed: {player['_error']}", 'steps': steps}
    player_id = player['id']
    steps['register'] = {
        'success': True,
        'player_id': player_id,
        'initial_rank': player.get('rank', '?'),
        'initial_gold': player.get('gold', 0),
    }

    # 2. Claim daily reward
    reward = api_post(f'/api/players/{player_id}/claim-daily-reward')
    if '_error' not in reward:
        steps['daily_reward'] = {
            'success': True,
            'day': reward.get('day'),
            'reward_type': reward.get('rewardType'),
            'reward_value': reward.get('rewardValue'),
            'description': reward.get('description'),
        }
    else:
        steps['daily_reward'] = {'success': False, 'error': reward['_error']}

    # 3. Try to equip skin (younger players want flashy skins)
    desired_skin = random.choice(AVAILABLE_SKINS) if profile['age'] < 20 else 'default'
    skin_result = api_put(f'/api/players/{player_id}/equip-skin', {'skinId': desired_skin})
    if '_error' not in skin_result:
        equipped = skin_result.get('equippedSkinId', '?')
        steps['skin'] = {
            'success': True,
            'wanted': desired_skin,
            'equipped': equipped,
            'owns_wanted': desired_skin in skin_result.get('ownedSkins', []),
        }
    else:
        steps['skin'] = {'success': False, 'wanted': desired_skin, 'error': str(skin_result.get('_error', ''))}

    # Check player state after setup
    player_state = api_get(f'/api/players/{player_id}')
    if '_error' not in player_state:
        steps['player_after_setup'] = {
            'gold': player_state.get('gold', 0),
            'level': player_state.get('level', 1),
            'rank': player_state.get('rank', '?'),
            'skin_fragments': player_state.get('skinFragments', 0),
            'owned_skins': list(player_state.get('ownedSkins', [])),
        }

    return {'player_id': player_id, 'steps': steps}


# ─── Phase 2: Room Creation + Join + Start ──────────────────────────

def phase_create_room_and_start(player_ids, mode):
    """Create room, all players join, ready up, start game."""
    steps = {}

    # Host creates room
    host_id = player_ids[0]
    room = api_post('/api/rooms', {'hostId': host_id, 'mode': mode})
    if '_error' in room:
        return {'_error': f"Room creation failed: {room['_error']}", 'steps': steps}
    room_id = room['id']
    steps['create_room'] = {'success': True, 'room_id': room_id, 'mode': mode}

    # Other players join
    join_results = []
    for pid in player_ids[1:]:
        result = api_post(f'/api/rooms/{room_id}/join', {'playerId': pid})
        join_results.append('_error' not in result)
    steps['join_room'] = {
        'success': all(join_results),
        'joined': sum(join_results),
        'total': len(player_ids) - 1,
    }

    # Select map (host picks based on mode)
    map_id = 'grassland_1' if mode == 'solo' else 'arena_1'
    api_put(f'/api/rooms/{room_id}/map', {'mapId': map_id})
    steps['select_map'] = {'map_id': map_id}

    # All ready
    for pid in player_ids:
        api_post(f'/api/rooms/{room_id}/ready', {'playerId': pid, 'ready': True})
    steps['all_ready'] = True

    # Start game
    start_result = api_post(f'/api/rooms/{room_id}/start')
    if '_error' not in start_result:
        steps['start_game'] = {
            'success': True,
            'state': start_result.get('state', '?'),
            'player_count': len(start_result.get('players', [])),
        }
    else:
        steps['start_game'] = {'success': False, 'error': start_result['_error']}

    return {'room_id': room_id, 'steps': steps}


# ─── Phase 3: Actual Gameplay (Playwright) ──────────────────────────

def navigate_menu(page, box, mode='solo'):
    """Navigate menu → charSelect → mapSelect → playing."""
    bw, bh = box['width'], box['height']
    for _ in range(20):
        state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
        if state == 'menu':
            break
        page.wait_for_timeout(200)

    if mode == 'solo':
        page.click('canvas', position={'x': bw / 2 - 48, 'y': bh / 2 + 55})
    else:
        page.click('canvas', position={'x': bw / 2 + 48, 'y': bh / 2 + 55})
    page.wait_for_timeout(400)

    state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
    if state == 'charSelect':
        page.click('canvas', position={'x': bw / 2, 'y': 200})
        page.wait_for_timeout(400)

    state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
    if state == 'mapSelect':
        page.click('canvas', position={'x': bw / 2, 'y': 94})
        page.wait_for_timeout(200)
        page.click('canvas', position={'x': bw / 2, 'y': bh - 40})
        page.wait_for_timeout(500)


def play_as_profile(page, box, profile, duration=50):
    """Play one game session with behavior shaped by the player profile."""
    bw, bh = box['width'], box['height']
    cx, cy = bw / 2, bh / 2
    start = time.time()
    angle = random.random() * math.pi * 2
    skills_picked = 0
    damage_taken = 0
    initial_hp = None
    final_kills = 0
    final_wave = 0
    final_level = 1
    game_state = 'playing'

    aggression = profile['aggression']
    dodge_skill = profile['dodge_skill']
    patience = profile['patience']
    reaction_ms = int(250 - dodge_skill * 100)
    move_radius = 80 + aggression * 140

    while time.time() - start < duration:
        game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')

        if game_state == 'gameOver':
            break

        if game_state in ('menu', 'charSelect', 'mapSelect'):
            page.wait_for_timeout(200)
            continue

        if game_state == 'levelUp':
            pref = profile['skill_pref']
            if pref == 'damage':
                skill_y = 202
            elif pref == 'defensive':
                skill_y = 362
            elif pref == 'balanced':
                skill_y = 282
            else:
                skill_y = random.choice([202, 282, 362])
            page.click('canvas', position={'x': bw / 2, 'y': skill_y})
            skills_picked += 1
            page.wait_for_timeout(200)
            continue

        query = page.evaluate('() => window._survivorQuery ? window._survivorQuery() : null')

        if initial_hp is None and query:
            initial_hp = query.get('hp', 200)
        if query:
            current_hp = query.get('hp', 0)
            if initial_hp and current_hp < initial_hp:
                damage_taken = initial_hp - current_hp
            final_kills = query.get('kills', 0)
            final_wave = query.get('wave', 0)

        # Movement based on profile aggression
        if query and query.get('enemies'):
            enemies = query['enemies']
            if aggression > 0.7:
                weak = [e for e in enemies if e['d'] < 300]
                if len(weak) <= 2 and weak:
                    t = min(weak, key=lambda e: e['d'])
                    dx, dy = t['x'] - query['px'], t['y'] - query['py']
                    mag = math.sqrt(dx*dx + dy*dy) or 1
                    target_x = cx + (dx/mag) * move_radius * 0.5
                    target_y = cy + (dy/mag) * move_radius * 0.4
                else:
                    target_x, target_y = _flee(query, enemies, cx, cy, move_radius)
            elif aggression < 0.4:
                target_x, target_y = _flee(query, enemies, cx, cy, move_radius * 1.2)
            else:
                target_x, target_y = _flee(query, enemies, cx, cy, move_radius)
        else:
            wander_speed = 0.03 + (1 - patience) * 0.07
            angle += wander_speed
            target_x = cx + math.cos(angle) * move_radius * 0.5
            target_y = cy + math.sin(angle * 0.8) * move_radius * 0.4

        mx = max(120, min(680, int(target_x)))
        my = max(100, min(500, int(target_y)))
        page.mouse.move(mx, my)
        page.wait_for_timeout(reaction_ms)

    survival_time = round(time.time() - start, 1)
    return {
        'survival_time': survival_time,
        'skills_picked': skills_picked,
        'damage_taken': round(damage_taken, 1),
        'kills': final_kills,
        'wave': final_wave,
        'died': game_state == 'gameOver',
    }


def _flee(query, enemies, cx, cy, radius):
    """Calculate flee vector away from enemies."""
    flee_x, flee_y, total_w = 0.0, 0.0, 0.0
    for en in enemies:
        w = max(0.1, 1.0 - en['d'] / 400.0) ** 2
        flee_x += (query['px'] - en['x']) * w
        flee_y += (query['py'] - en['y']) * w
        total_w += w
    if total_w > 0:
        flee_x /= total_w
        flee_y /= total_w
        mag = math.sqrt(flee_x**2 + flee_y**2) or 1
        return cx + (flee_x/mag) * radius, cy + (flee_y/mag) * radius * 0.7
    return cx, cy


def run_gameplay(profile, mode, duration=50):
    """Run actual gameplay in Playwright."""
    from playwright.sync_api import sync_playwright
    js_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 800, 'height': 600})
        page.on('pageerror', lambda err: js_errors.append(str(err)))
        page.goto(f'file://{DEMO_PATH}')
        page.wait_for_timeout(500)

        box = page.query_selector('canvas').bounding_box()
        navigate_menu(page, box, mode)
        page.wait_for_timeout(500)

        state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
        if state != 'playing':
            browser.close()
            return {'error': f'Stuck in {state}'}

        result = play_as_profile(page, box, profile, duration)
        result['js_errors'] = js_errors[:3]

        ss_path = os.path.join(FEEDBACK_DIR, f'profile_{profile["id"]}_{mode}.png')
        page.screenshot(path=ss_path)
        result['screenshot'] = ss_path
        browser.close()

    return result


# ─── Phase 4: Score Settlement ──────────────────────────────────────

def phase_settle_scores(room_id, player_ids):
    """Calculate scores and get rank updates."""
    scores = api_post('/api/scores/calculate', {'roomId': room_id})
    if isinstance(scores, list):
        return {'success': True, 'scores': scores}
    return {'success': False, 'error': str(scores)}


# ─── Phase 5: Player Feedback Generation ────────────────────────────

def generate_feedback(profile, gameplay_result, server_steps):
    """Generate player feedback based on demographics and experience."""
    feedback = {
        'player': profile['name'],
        'gender': profile['gender'],
        'age': profile['age'],
        'group': profile['group'],
        'positive': [],
        'negative': [],
        'suggestions': [],
        'would_play_again': True,
        'rating': 0,
    }

    surv = gameplay_result.get('survival_time', 0)
    skills = gameplay_result.get('skills_picked', 0)
    died = gameplay_result.get('died', False)
    kills = gameplay_result.get('kills', 0)

    # Base rating
    rating = 3.0

    # Survival satisfaction (varies by age)
    if profile['age'] <= 12:
        # Kids want to survive and have fun
        if surv > 30:
            feedback['positive'].append('玩了很久没死，很开心！')
            rating += 0.5
        elif surv < 10:
            feedback['negative'].append('刚开始就死了，太难了')
            feedback['suggestions'].append('新手保护时间太短了，希望能多活一会')
            rating -= 1.0
            feedback['would_play_again'] = False
        if skills > 5:
            feedback['positive'].append('升级选技能好好玩！')
            rating += 0.3
    elif profile['age'] <= 17:
        # Teens want action and kills
        if kills > 5:
            feedback['positive'].append('打怪很爽，连招感很强！')
            rating += 0.5
        if died and surv < 15:
            feedback['negative'].append('死得太快了，还没反应过来')
            feedback['suggestions'].append('开局敌人太多，建议减少第一波怪的数量')
            rating -= 0.5
        if skills < 3:
            feedback['negative'].append('升级太慢了，等级没起来就死了')
            feedback['suggestions'].append('前期经验值给多一点，让玩家能快速体验更多技能')
            rating -= 0.3
    elif profile['age'] <= 30:
        # Young adults want competitive balance
        if surv > 40:
            feedback['positive'].append('游戏有深度，策略性强')
            rating += 0.5
        if died:
            if surv > 20:
                feedback['positive'].append('死得心服口服，想再来一局')
            else:
                feedback['negative'].append('被集火了，有点不公平')
                feedback['suggestions'].append('增加开局无敌时间或分散出生点')
                rating -= 0.3
        if kills > 3:
            feedback['positive'].append('击杀反馈明显，连杀播报有成就感')
            rating += 0.3
    else:
        # Older adults want relaxed enjoyable experience
        if surv > 30:
            feedback['positive'].append('节奏还可以，不太紧张')
            rating += 0.5
        if died and surv < 15:
            feedback['negative'].append('操作要求太高了，跟不上')
            feedback['suggestions'].append('增加自动闪避或降低操作难度的选项')
            rating -= 0.5
        if skills > 3:
            feedback['positive'].append('技能选择有趣味性')
            rating += 0.2

    # Gender-specific feedback
    if profile['gender'] == 'F':
        feedback['suggestions'].append('希望有更多可爱的皮肤可以收集')
        if surv > 30:
            feedback['positive'].append('画面和特效很好看')
    else:
        if kills > 5:
            feedback['suggestions'].append('加个击杀排行榜，想和朋友比')

    # Server experience feedback
    reg = server_steps.get('register', {})
    if reg.get('success'):
        feedback['positive'].append('注册很顺畅')
    daily = server_steps.get('daily_reward', {})
    if daily.get('success'):
        feedback['positive'].append(f'签到奖励不错: {daily.get("description", "")}')
    skin = server_steps.get('skin', {})
    if skin.get('success') and not skin.get('owns_wanted'):
        feedback['negative'].append(f'想要的皮肤({skin.get("wanted")})还没解锁')
        feedback['suggestions'].append('皮肤获取途径希望更多一些，比如完成成就送碎片')

    # Overall rating
    feedback['rating'] = round(min(5.0, max(1.0, rating)), 1)
    feedback['would_play_again'] = rating >= 2.5

    return feedback


# ─── Analysis ───────────────────────────────────────────────────────

def analyze_results(all_data):
    """Comprehensive analysis of all simulation data."""
    analysis = {
        'by_gender': {},
        'by_age_group': {},
        'by_mode': {},
        'server_health': {'register': 0, 'daily_reward': 0, 'room': 0, 'game_start': 0},
        'avg_rating': 0,
        'would_play_again_rate': 0,
        'top_suggestions': [],
        'issues': [],
    }

    game_results = [d for d in all_data if 'gameplay' in d and 'error' not in d.get('gameplay', {})]

    # By gender
    for gender in ('M', 'F'):
        subset = [d for d in game_results if d['profile']['gender'] == gender]
        if subset:
            analysis['by_gender']['男性' if gender == 'M' else '女性'] = {
                'avg_survival': round(sum(d['gameplay']['survival_time'] for d in subset) / len(subset), 1),
                'avg_kills': round(sum(d['gameplay'].get('kills', 0) for d in subset) / len(subset), 1),
                'death_rate': round(sum(1 for d in subset if d['gameplay'].get('died')) / len(subset), 2),
                'avg_rating': round(sum(d['feedback']['rating'] for d in subset) / len(subset), 1),
                'count': len(subset),
            }

    # By age group
    for group in ('少年', '青少年', '青年', '中年'):
        subset = [d for d in game_results if d['profile']['group'] == group]
        if subset:
            analysis['by_age_group'][group] = {
                'avg_survival': round(sum(d['gameplay']['survival_time'] for d in subset) / len(subset), 1),
                'avg_kills': round(sum(d['gameplay'].get('kills', 0) for d in subset) / len(subset), 1),
                'death_rate': round(sum(1 for d in subset if d['gameplay'].get('died')) / len(subset), 2),
                'avg_rating': round(sum(d['feedback']['rating'] for d in subset) / len(subset), 1),
                'count': len(subset),
            }

    # By mode
    for mode in ('solo', 'team'):
        subset = [d for d in game_results if d.get('mode') == mode]
        if subset:
            analysis['by_mode'][mode] = {
                'avg_survival': round(sum(d['gameplay']['survival_time'] for d in subset) / len(subset), 1),
                'death_rate': round(sum(1 for d in subset if d['gameplay'].get('died')) / len(subset), 2),
                'count': len(subset),
            }

    # Overall metrics
    all_feedbacks = [d['feedback'] for d in game_results if 'feedback' in d]
    if all_feedbacks:
        analysis['avg_rating'] = round(sum(f['rating'] for f in all_feedbacks) / len(all_feedbacks), 1)
        analysis['would_play_again_rate'] = round(
            sum(1 for f in all_feedbacks if f['would_play_again']) / len(all_feedbacks), 2
        )

    # Aggregate suggestions
    suggestion_count = {}
    for f in all_feedbacks:
        for s in f.get('suggestions', []):
            suggestion_count[s] = suggestion_count.get(s, 0) + 1
    analysis['top_suggestions'] = sorted(suggestion_count.items(), key=lambda x: -x[1])[:5]

    # Issues detection
    for group, data in analysis['by_age_group'].items():
        if data['avg_survival'] < 15:
            analysis['issues'].append({
                'priority': 'HIGH',
                'issue': f'{group}玩家平均存活{data["avg_survival"]}s——体验极差',
                'fix': f'为{group}降低前期难度'
            })
        if data['avg_rating'] < 2.5:
            analysis['issues'].append({
                'priority': 'HIGH',
                'issue': f'{group}玩家评分仅{data["avg_rating"]}/5——不满意',
                'fix': f'针对{group}优化游戏体验'
            })

    return analysis


# ─── Main ───────────────────────────────────────────────────────────

def main():
    os.makedirs(FEEDBACK_DIR, exist_ok=True)

    print("=" * 60)
    print("Full-Journey Profile Simulator")
    print(f"{len(PROFILES)} players × 2 modes = {len(PROFILES)*2} sessions")
    print("=" * 60)

    # Start server
    print("\n[Phase 0] Starting Spring Boot server...")
    server_proc = start_server()
    server_ok = server_proc is not None
    if server_ok:
        print("  Server ready!")
    else:
        print("  Server unavailable — running gameplay-only mode")

    all_data = []

    for mode in ('solo', 'team'):
        print(f"\n{'='*40}")
        print(f"  Mode: {mode.upper()}")
        print(f"{'='*40}")

        # Phase 1: Register all players
        player_ids = []
        server_steps_by_profile = {}
        if server_ok:
            print("\n[Phase 1] Registration + Daily Reward + Skin")
            for profile in PROFILES:
                setup = phase_register_and_setup(profile)
                if '_error' in setup:
                    print(f"  {profile['name']}: FAILED - {setup['_error']}")
                    player_ids.append(None)
                else:
                    pid = setup['player_id']
                    player_ids.append(pid)
                    server_steps_by_profile[profile['id']] = setup['steps']
                    gold = setup['steps'].get('player_after_setup', {}).get('gold', '?')
                    reward = setup['steps'].get('daily_reward', {}).get('description', 'N/A')
                    print(f"  {profile['name']}: registered, gold={gold}, reward={reward}")

        # Phase 2: Create room and start
        room_id = None
        if server_ok and all(p is not None for p in player_ids):
            print("\n[Phase 2] Room → Join → Ready → Start")
            room_result = phase_create_room_and_start(player_ids, mode)
            if '_error' not in room_result:
                room_id = room_result['room_id']
                steps = room_result['steps']
                joined = steps.get('join_room', {}).get('joined', 0)
                started = steps.get('start_game', {}).get('success', False)
                print(f"  Room {room_id[:8]}..., {joined+1}/8 joined, started={started}")
            else:
                print(f"  Room FAILED: {room_result['_error']}")

        # Phase 3: Actual gameplay for each profile
        print(f"\n[Phase 3] Gameplay ({mode})")
        for profile in PROFILES:
            label = f"{profile['name']}({profile['gender']}/{profile['age']}岁)"
            print(f"  {label} [{profile['style']}]...", end=' ', flush=True)

            gameplay = run_gameplay(profile, mode, duration=50)
            if 'error' in gameplay:
                print(f"ERROR: {gameplay['error']}")
                continue

            status = 'DIED' if gameplay.get('died') else 'SURVIVED'
            kills = gameplay.get('kills', 0)
            print(f"{gameplay['survival_time']}s, kills={kills}, skills={gameplay['skills_picked']}, {status}")

            # Phase 4: Score settlement
            score_data = None
            if server_ok and room_id:
                score_result = phase_settle_scores(room_id, player_ids)
                if score_result.get('success'):
                    score_data = score_result['scores']

            # Phase 5: Generate feedback
            srv_steps = server_steps_by_profile.get(profile['id'], {})
            feedback = generate_feedback(profile, gameplay, srv_steps)

            entry = {
                'profile': {k: v for k, v in profile.items() if k not in ('dodge_skill', 'patience')},
                'mode': mode,
                'server_steps': srv_steps,
                'room_id': room_id,
                'gameplay': gameplay,
                'scores': score_data,
                'feedback': feedback,
            }
            all_data.append(entry)

    # Stop server
    if server_proc:
        stop_server(server_proc)
        print("\nServer stopped.")

    # Analysis
    analysis = analyze_results(all_data)

    report = {
        'test_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'profiles_tested': len(PROFILES),
        'modes_tested': ['solo', 'team'],
        'server_available': server_ok,
        'sessions': all_data,
        'analysis': analysis,
    }

    report_path = os.path.join(FEEDBACK_DIR, 'profile_simulation_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Print summary
    print(f"\n{'=' * 60}")
    print(f"Report: {report_path}")

    print(f"\nOverall Rating: {analysis['avg_rating']}/5.0")
    print(f"Would Play Again: {analysis['would_play_again_rate']*100:.0f}%")

    print("\n--- By Gender ---")
    for label, data in analysis['by_gender'].items():
        print(f"  {label}: survival={data['avg_survival']}s, kills={data['avg_kills']}, "
              f"rating={data['avg_rating']}/5, death={data['death_rate']*100:.0f}%")

    print("\n--- By Age Group ---")
    for group, data in analysis['by_age_group'].items():
        print(f"  {group}: survival={data['avg_survival']}s, kills={data['avg_kills']}, "
              f"rating={data['avg_rating']}/5, death={data['death_rate']*100:.0f}%")

    if analysis['top_suggestions']:
        print("\n--- Top Suggestions ---")
        for sug, count in analysis['top_suggestions']:
            print(f"  [{count}x] {sug}")

    if analysis['issues']:
        print("\n--- Issues ---")
        for iss in analysis['issues']:
            print(f"  [{iss['priority']}] {iss['issue']}")
            print(f"    Fix: {iss['fix']}")

    # Print selected player quotes
    print("\n--- Player Quotes ---")
    for d in all_data[:8]:  # First mode only
        fb = d.get('feedback', {})
        name = fb.get('player', '?')
        rating = fb.get('rating', 0)
        pos = fb.get('positive', [])[:1]
        neg = fb.get('negative', [])[:1]
        again = '会' if fb.get('would_play_again') else '不会'
        quote = pos[0] if pos else (neg[0] if neg else '没什么特别的')
        print(f"  {name}({fb.get('age','')}岁): \"{quote}\" — {rating}/5, {again}再玩")

    has_high = any(i['priority'] == 'HIGH' for i in analysis['issues'])
    sys.exit(1 if has_high else 0)


if __name__ == '__main__':
    main()
