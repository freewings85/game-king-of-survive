"""
Profile-based Player Simulator — simulates 8 players with different
gender/age demographics, each with distinct play styles.

Runs solo (8x1) and team (4v4) modes, collecting per-profile feedback.
"""
import os
import sys
import json
import time
import math
import random

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DEMO_PATH = os.path.join(PROJECT_ROOT, 'demo', 'survivor.html')
FEEDBACK_DIR = os.path.join(PROJECT_ROOT, 'feedback')

# 8 player profiles covering gender × age demographics
PROFILES = [
    {'id': 0, 'name': '小明',   'gender': 'M', 'age': 10,  'group': '少年',     'style': 'curious',     'aggression': 0.3, 'dodge_skill': 0.4, 'patience': 0.5, 'skill_pref': 'random'},
    {'id': 1, 'name': '小红',   'gender': 'F', 'age': 12,  'group': '少年',     'style': 'cautious',    'aggression': 0.2, 'dodge_skill': 0.5, 'patience': 0.6, 'skill_pref': 'defensive'},
    {'id': 2, 'name': '张伟',   'gender': 'M', 'age': 16,  'group': '青少年',   'style': 'aggressive',  'aggression': 0.9, 'dodge_skill': 0.7, 'patience': 0.3, 'skill_pref': 'damage'},
    {'id': 3, 'name': '李婷',   'gender': 'F', 'age': 17,  'group': '青少年',   'style': 'strategic',   'aggression': 0.6, 'dodge_skill': 0.8, 'patience': 0.7, 'skill_pref': 'balanced'},
    {'id': 4, 'name': '王磊',   'gender': 'M', 'age': 25,  'group': '青年',     'style': 'competitive', 'aggression': 0.8, 'dodge_skill': 0.9, 'patience': 0.5, 'skill_pref': 'damage'},
    {'id': 5, 'name': '刘芳',   'gender': 'F', 'age': 28,  'group': '青年',     'style': 'balanced',    'aggression': 0.5, 'dodge_skill': 0.7, 'patience': 0.8, 'skill_pref': 'balanced'},
    {'id': 6, 'name': '陈强',   'gender': 'M', 'age': 42,  'group': '中年',     'style': 'methodical',  'aggression': 0.4, 'dodge_skill': 0.5, 'patience': 0.9, 'skill_pref': 'defensive'},
    {'id': 7, 'name': '赵丽',   'gender': 'F', 'age': 38,  'group': '中年',     'style': 'explorer',    'aggression': 0.3, 'dodge_skill': 0.6, 'patience': 0.7, 'skill_pref': 'random'},
]


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
    move_changes = 0
    last_move_time = 0
    damage_taken = 0
    initial_hp = None

    aggression = profile['aggression']
    dodge_skill = profile['dodge_skill']
    patience = profile['patience']

    # Profile-based reaction time (ms): kids slower, teens fast, adults medium
    reaction_ms = int(250 - dodge_skill * 100)  # 150-250ms
    # Movement radius: aggressive players move more, cautious less
    move_radius = 80 + aggression * 140  # 80-220px

    while time.time() - start < duration:
        elapsed = time.time() - start
        game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')

        if game_state == 'gameOver':
            break

        if game_state in ('menu', 'charSelect', 'mapSelect'):
            page.wait_for_timeout(200)
            continue

        if game_state == 'levelUp':
            # Skill selection based on preference
            pref = profile['skill_pref']
            if pref == 'damage':
                skill_y = 202   # First option (usually offensive)
            elif pref == 'defensive':
                skill_y = 362   # Last option (usually defensive)
            elif pref == 'balanced':
                skill_y = 282   # Middle option
            else:
                skill_y = random.choice([202, 282, 362])
            page.click('canvas', position={'x': bw / 2, 'y': skill_y})
            skills_picked += 1
            page.wait_for_timeout(200)
            continue

        # Query game state for smart movement
        query = page.evaluate('() => window._survivorQuery ? window._survivorQuery() : null')

        if initial_hp is None and query:
            initial_hp = query.get('hp', 200)

        if query:
            current_hp = query.get('hp', 0)
            if initial_hp and current_hp < initial_hp:
                damage_taken = initial_hp - current_hp

        # Profile-based movement strategy
        if query and query.get('enemies'):
            enemies = query['enemies']

            if aggression > 0.7:
                # Aggressive: move TOWARD weaker enemies, flee from clusters
                weak_enemies = [e for e in enemies if e['d'] < 300]
                if len(weak_enemies) <= 2 and weak_enemies:
                    # Chase isolated enemies
                    target = min(weak_enemies, key=lambda e: e['d'])
                    dx = target['x'] - query['px']
                    dy = target['y'] - query['py']
                    mag = math.sqrt(dx * dx + dy * dy) or 1
                    target_x = cx + (dx / mag) * move_radius * 0.5
                    target_y = cy + (dy / mag) * move_radius * 0.4
                else:
                    # Too many enemies, flee
                    flee_x, flee_y, total_w = 0.0, 0.0, 0.0
                    for en in enemies:
                        w = max(0.1, 1.0 - en['d'] / 400.0) ** 2
                        flee_x += (query['px'] - en['x']) * w
                        flee_y += (query['py'] - en['y']) * w
                        total_w += w
                    if total_w > 0:
                        flee_x /= total_w
                        flee_y /= total_w
                        mag = math.sqrt(flee_x ** 2 + flee_y ** 2) or 1
                        target_x = cx + (flee_x / mag) * move_radius
                        target_y = cy + (flee_y / mag) * move_radius * 0.7
                    else:
                        angle += 0.08
                        target_x = cx + math.cos(angle) * move_radius * 0.6
                        target_y = cy + math.sin(angle * 0.7) * move_radius * 0.5

            elif aggression < 0.4:
                # Cautious: always flee, keep maximum distance
                flee_x, flee_y, total_w = 0.0, 0.0, 0.0
                for en in enemies:
                    w = max(0.1, 1.0 - en['d'] / 500.0) ** 2
                    flee_x += (query['px'] - en['x']) * w
                    flee_y += (query['py'] - en['y']) * w
                    total_w += w
                if total_w > 0:
                    flee_x /= total_w
                    flee_y /= total_w
                    mag = math.sqrt(flee_x ** 2 + flee_y ** 2) or 1
                    # Cautious players flee harder
                    target_x = cx + (flee_x / mag) * move_radius * 1.2
                    target_y = cy + (flee_y / mag) * move_radius * 0.9
                else:
                    angle += 0.05
                    target_x = cx + math.cos(angle) * move_radius * 0.4
                    target_y = cy + math.sin(angle * 0.8) * move_radius * 0.3

            else:
                # Balanced: standard flee with moderate intensity
                flee_x, flee_y, total_w = 0.0, 0.0, 0.0
                for en in enemies:
                    w = max(0.1, 1.0 - en['d'] / 400.0) ** 2
                    flee_x += (query['px'] - en['x']) * w
                    flee_y += (query['py'] - en['y']) * w
                    total_w += w
                if total_w > 0:
                    flee_x /= total_w
                    flee_y /= total_w
                    mag = math.sqrt(flee_x ** 2 + flee_y ** 2) or 1
                    target_x = cx + (flee_x / mag) * move_radius
                    target_y = cy + (flee_y / mag) * move_radius * 0.7
                else:
                    angle += 0.06
                    target_x = cx + math.cos(angle) * move_radius * 0.5
                    target_y = cy + math.sin(angle * 0.7) * move_radius * 0.4
        else:
            # No enemies: wander based on patience
            wander_speed = 0.03 + (1 - patience) * 0.07  # Impatient = faster wander
            angle += wander_speed
            target_x = cx + math.cos(angle) * move_radius * 0.5
            target_y = cy + math.sin(angle * 0.8) * move_radius * 0.4

        mx = max(120, min(680, int(target_x)))
        my = max(100, min(500, int(target_y)))
        page.mouse.move(mx, my)
        move_changes += 1

        page.wait_for_timeout(reaction_ms)

    survival_time = round(time.time() - start, 1)
    return {
        'profile': profile['name'],
        'gender': profile['gender'],
        'age': profile['age'],
        'group': profile['group'],
        'style': profile['style'],
        'survival_time': survival_time,
        'skills_picked': skills_picked,
        'damage_taken': round(damage_taken, 1),
        'died': game_state == 'gameOver' if 'game_state' in dir() else False,
    }


def run_profile_session(profile, mode, duration=50):
    """Run a complete game session for one profile."""
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
            return {
                'profile': profile['name'],
                'error': f'Failed to enter playing state, stuck in: {state}',
                'mode': mode,
            }

        result = play_as_profile(page, box, profile, duration)
        result['mode'] = mode
        result['js_errors'] = js_errors[:3]

        # Screenshot
        ss_path = os.path.join(FEEDBACK_DIR, f'profile_{profile["id"]}_{mode}.png')
        page.screenshot(path=ss_path)
        result['screenshot'] = ss_path

        browser.close()

    return result


def analyze_results(results):
    """Analyze results by demographics."""
    analysis = {
        'by_gender': {},
        'by_age_group': {},
        'by_mode': {},
        'issues': [],
        'recommendations': [],
    }

    # Group by gender
    for gender in ('M', 'F'):
        subset = [r for r in results if r.get('gender') == gender and 'error' not in r]
        if subset:
            avg_surv = sum(r['survival_time'] for r in subset) / len(subset)
            avg_skills = sum(r['skills_picked'] for r in subset) / len(subset)
            died_count = sum(1 for r in subset if r.get('died'))
            analysis['by_gender'][gender] = {
                'avg_survival': round(avg_surv, 1),
                'avg_skills': round(avg_skills, 1),
                'death_rate': round(died_count / len(subset), 2),
                'count': len(subset),
            }

    # Group by age group
    for group in ('少年', '青少年', '青年', '中年'):
        subset = [r for r in results if r.get('group') == group and 'error' not in r]
        if subset:
            avg_surv = sum(r['survival_time'] for r in subset) / len(subset)
            avg_skills = sum(r['skills_picked'] for r in subset) / len(subset)
            died_count = sum(1 for r in subset if r.get('died'))
            analysis['by_age_group'][group] = {
                'avg_survival': round(avg_surv, 1),
                'avg_skills': round(avg_skills, 1),
                'death_rate': round(died_count / len(subset), 2),
                'count': len(subset),
            }

    # Group by mode
    for mode in ('solo', 'team'):
        subset = [r for r in results if r.get('mode') == mode and 'error' not in r]
        if subset:
            avg_surv = sum(r['survival_time'] for r in subset) / len(subset)
            died_count = sum(1 for r in subset if r.get('died'))
            analysis['by_mode'][mode] = {
                'avg_survival': round(avg_surv, 1),
                'death_rate': round(died_count / len(subset), 2),
                'count': len(subset),
            }

    # Generate issues and recommendations
    for group, data in analysis['by_age_group'].items():
        if data['avg_survival'] < 15:
            analysis['issues'].append({
                'priority': 'HIGH',
                'issue': f'{group}玩家平均存活时间过短({data["avg_survival"]}s)',
                'recommendation': f'为{group}玩家降低前期难度或增加引导'
            })
        if data['death_rate'] > 0.8:
            analysis['issues'].append({
                'priority': 'MEDIUM',
                'issue': f'{group}玩家死亡率过高({data["death_rate"]*100:.0f}%)',
                'recommendation': f'考虑为{group}玩家匹配同龄段对手'
            })

    for gender, data in analysis['by_gender'].items():
        label = '男性' if gender == 'M' else '女性'
        if data['avg_skills'] < 1:
            analysis['recommendations'].append(
                f'{label}玩家技能选择次数少——升级节奏可能太慢'
            )

    # Gender balance check
    if 'M' in analysis['by_gender'] and 'F' in analysis['by_gender']:
        m_surv = analysis['by_gender']['M']['avg_survival']
        f_surv = analysis['by_gender']['F']['avg_survival']
        if abs(m_surv - f_surv) > 15:
            worse = '女性' if f_surv < m_surv else '男性'
            analysis['issues'].append({
                'priority': 'MEDIUM',
                'issue': f'{worse}玩家存活时间显著偏低',
                'recommendation': '检查不同操作风格的游戏平衡性'
            })

    return analysis


def main():
    os.makedirs(FEEDBACK_DIR, exist_ok=True)

    print("=" * 60)
    print("Profile-based Player Simulator")
    print(f"Simulating {len(PROFILES)} players × 2 modes")
    print("=" * 60)

    all_results = []

    for mode in ('solo', 'team'):
        print(f"\n--- Mode: {mode.upper()} ---")
        for profile in PROFILES:
            label = f"{profile['name']}({profile['gender']}/{profile['age']}岁/{profile['group']})"
            print(f"  Playing as {label} [{profile['style']}]...", end=' ', flush=True)
            result = run_profile_session(profile, mode, duration=50)
            all_results.append(result)
            if 'error' in result:
                print(f"ERROR: {result['error']}")
            else:
                status = 'DIED' if result.get('died') else 'SURVIVED'
                print(f"{result['survival_time']}s, {result['skills_picked']} skills, {status}")

    # Analyze
    analysis = analyze_results(all_results)

    report = {
        'test_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'profiles_tested': len(PROFILES),
        'modes_tested': ['solo', 'team'],
        'results': all_results,
        'analysis': analysis,
    }

    report_path = os.path.join(FEEDBACK_DIR, 'profile_simulation_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Print summary
    print(f"\n{'=' * 60}")
    print(f"Report: {report_path}")

    print("\n--- By Gender ---")
    for gender, data in analysis['by_gender'].items():
        label = '男性' if gender == 'M' else '女性'
        print(f"  {label}: avg {data['avg_survival']}s, skills {data['avg_skills']}, death rate {data['death_rate']*100:.0f}%")

    print("\n--- By Age Group ---")
    for group, data in analysis['by_age_group'].items():
        print(f"  {group}: avg {data['avg_survival']}s, skills {data['avg_skills']}, death rate {data['death_rate']*100:.0f}%")

    print("\n--- By Mode ---")
    for mode, data in analysis['by_mode'].items():
        print(f"  {mode}: avg {data['avg_survival']}s, death rate {data['death_rate']*100:.0f}%")

    if analysis['issues']:
        print("\n--- Issues ---")
        for iss in analysis['issues']:
            print(f"  [{iss['priority']}] {iss['issue']}")
            print(f"    → {iss['recommendation']}")

    if analysis['recommendations']:
        print("\n--- Recommendations ---")
        for rec in analysis['recommendations']:
            print(f"  - {rec}")

    # Exit code: 1 if HIGH issues
    has_high = any(i['priority'] == 'HIGH' for i in analysis['issues'])
    sys.exit(1 if has_high else 0)


if __name__ == '__main__':
    main()
