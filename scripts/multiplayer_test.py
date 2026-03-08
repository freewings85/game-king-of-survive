"""
8-Player Multiplayer Test — runs both solo (8x1) and team (4v4) modes,
queries game state periodically, detects issues, and writes a report.
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


def navigate_menu(page: object, box: dict, mode: str = 'solo') -> None:
    """Navigate: menu → charSelect → mapSelect → playing."""
    bw, bh = box['width'], box['height']

    # Wait for menu state
    for _ in range(20):
        state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
        if state == 'menu':
            break
        page.wait_for_timeout(200)

    # Click solo or team button
    if mode == 'solo':
        # Solo button: x = W/2-48, y = H/2+55
        page.click('canvas', position={'x': bw / 2 - 48, 'y': bh / 2 + 55})
    else:
        # Team button: x = W/2+48, y = H/2+55
        page.click('canvas', position={'x': bw / 2 + 48, 'y': bh / 2 + 55})
    page.wait_for_timeout(400)

    # charSelect → click warrior
    state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
    if state == 'charSelect':
        page.click('canvas', position={'x': bw / 2, 'y': 200})
        page.wait_for_timeout(400)

    # mapSelect → click first map → click start
    state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
    if state == 'mapSelect':
        page.click('canvas', position={'x': bw / 2, 'y': 94})
        page.wait_for_timeout(200)
        page.click('canvas', position={'x': bw / 2, 'y': bh - 40})
        page.wait_for_timeout(500)


def query_full_state(page: object) -> dict | None:
    """Query comprehensive game state from the browser via _survivorQuery."""
    return page.evaluate('''() => {
        if (!window._survivorQuery) return null;
        var q = window._survivorQuery();
        if (!q) return null;
        return {
            state: window._survivorState ? window._survivorState() : null,
            px: q.px || 0, py: q.py || 0,
            hp: q.hp || 0, maxHp: q.maxHp || 0,
            wave: q.wave || 0, kills: q.kills || 0,
            enemyCount: q.enemies ? q.enemies.length : 0,
            totalEnemies: q.totalEnemies || 0,
            players: q.players || [],
            gameMode: q.gameMode || 'solo',
            victoryTriggered: q.victoryTriggered || false,
            gameTime: q.gameTime || 0,
            spawnZoneCount: q.spawnZoneCount || 0
        };
    }''')


def run_game_test(mode: str, duration: int = 60) -> dict:
    """Run a full game test in the specified mode for the given duration."""
    from playwright.sync_api import sync_playwright

    issues: list[dict] = []
    snapshots: list[dict] = []
    js_errors: list[str] = []
    screenshots: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 800, 'height': 600})
        page.on('pageerror', lambda err: js_errors.append(str(err)))

        page.goto(f'file://{DEMO_PATH}')
        page.wait_for_timeout(500)

        box = page.query_selector('canvas').bounding_box()
        bw, bh = box['width'], box['height']

        # Navigate menu
        navigate_menu(page, box, mode)
        page.wait_for_timeout(500)

        # Verify we're in playing state
        state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
        if state != 'playing':
            issues.append({
                'severity': 'CRITICAL',
                'category': 'menu',
                'issue': f'Failed to enter playing state from menu, stuck in: {state}'
            })
            browser.close()
            return {'mode': mode, 'issues': issues, 'snapshots': [], 'js_errors': js_errors}

        # Initial state check
        initial = query_full_state(page)
        if initial and initial.get('players'):
            player_count = len(initial['players'])
            if player_count != 8:
                issues.append({
                    'severity': 'HIGH',
                    'category': 'multiplayer',
                    'issue': f'Expected 8 players, got {player_count}'
                })

            # Check factions
            factions = set(pl['factionId'] for pl in initial['players'])
            if mode == 'team':
                if len(factions) != 2:
                    issues.append({
                        'severity': 'HIGH',
                        'category': 'faction',
                        'issue': f'Team mode should have 2 factions, got {len(factions)}: {sorted(factions)}'
                    })
            else:
                if len(factions) != 8:
                    issues.append({
                        'severity': 'MEDIUM',
                        'category': 'faction',
                        'issue': f'Solo mode should have 8 unique factions, got {len(factions)}'
                    })

        # Game loop — play and observe
        start = time.time()
        angle = 0
        snapshot_interval = 5
        last_snapshot = 0
        victory_seen = False
        max_enemies_seen = 0
        player_damage_detected = False
        pvp_kill_detected = False
        bot_movement_detected = False
        last_bot_positions: dict[int, tuple[float, float]] = {}

        while time.time() - start < duration:
            elapsed = time.time() - start
            game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')

            # Handle level up
            if game_state == 'levelUp':
                skill_y = random.choice([202, 282, 362])
                page.click('canvas', position={'x': bw / 2, 'y': skill_y})
                page.wait_for_timeout(200)
                continue

            if game_state == 'gameOver':
                issues.append({
                    'severity': 'INFO',
                    'category': 'gameplay',
                    'issue': f'Player died at {elapsed:.0f}s'
                })
                ss_path = os.path.join(FEEDBACK_DIR, f'mp_{mode}_death.png')
                page.screenshot(path=ss_path)
                screenshots.append(ss_path)
                break

            if game_state == 'paused':
                page.wait_for_timeout(200)
                continue

            # Smart movement
            query = page.evaluate('() => window._survivorQuery ? window._survivorQuery() : null')
            if query and query.get('enemies'):
                enemies = query['enemies']
                flee_x, flee_y, total_w = 0.0, 0.0, 0.0
                for en in enemies:
                    w = max(0.1, 1.0 - en['d'] / 400.0)
                    w = w * w
                    flee_x += (query['px'] - en['x']) * w
                    flee_y += (query['py'] - en['y']) * w
                    total_w += w
                if total_w > 0:
                    flee_x /= total_w
                    flee_y /= total_w
                    mag = math.sqrt(flee_x * flee_x + flee_y * flee_y) or 1
                    flee_x, flee_y = flee_x / mag, flee_y / mag
                    target_x = bw / 2 + flee_x * 200
                    target_y = bh / 2 + flee_y * 150
                else:
                    angle += 0.08
                    target_x = bw / 2 + math.cos(angle) * 120
                    target_y = bh / 2 + math.sin(angle * 0.7) * 100
            else:
                angle += 0.08
                target_x = bw / 2 + math.cos(angle) * 120
                target_y = bh / 2 + math.sin(angle * 0.7) * 100

            mx = max(120, min(680, int(target_x)))
            my = max(100, min(500, int(target_y)))
            page.mouse.move(mx, my)

            # Periodic state snapshot
            if elapsed - last_snapshot >= snapshot_interval:
                last_snapshot = elapsed
                full_state = query_full_state(page)
                if full_state:
                    snap = {
                        'time': round(elapsed, 1),
                        'state': full_state.get('state'),
                        'wave': full_state.get('wave', 0),
                        'kills': full_state.get('kills', 0),
                        'hp': full_state.get('hp', 0),
                        'enemyCount': full_state.get('enemyCount', 0),
                        'totalEnemies': full_state.get('totalEnemies', 0),
                    }

                    players = full_state.get('players', [])
                    alive_count = sum(1 for pl in players if not pl.get('eliminated'))
                    snap['alivePlayers'] = alive_count
                    snap['eliminatedPlayers'] = len(players) - alive_count

                    # Track max enemies
                    total_e = full_state.get('totalEnemies', 0)
                    if total_e > max_enemies_seen:
                        max_enemies_seen = total_e

                    # Detect player damage (HP < maxHp)
                    for pl in players:
                        if pl['hp'] < pl['maxHp'] and pl['hp'] > 0:
                            player_damage_detected = True

                    # Detect PvP kills
                    for pl in players:
                        if pl.get('eliminated') and pl['id'] != 0:
                            pvp_kill_detected = True

                    # Detect bot movement
                    for pl in players:
                        if pl['id'] == 0:
                            continue
                        pos = (pl['x'], pl['y'])
                        if pl['id'] in last_bot_positions:
                            old_pos = last_bot_positions[pl['id']]
                            if abs(pos[0] - old_pos[0]) > 5 or abs(pos[1] - old_pos[1]) > 5:
                                bot_movement_detected = True
                        last_bot_positions[pl['id']] = pos

                    # Check victory
                    if full_state.get('victoryTriggered'):
                        victory_seen = True
                        snap['victory'] = True

                    snapshots.append(snap)

                # Screenshots at 10s, 30s, 50s
                if int(elapsed) in (10, 30, 50):
                    ss_path = os.path.join(FEEDBACK_DIR, f'mp_{mode}_{int(elapsed)}s.png')
                    page.screenshot(path=ss_path)
                    screenshots.append(ss_path)

            page.wait_for_timeout(200)

        # Final snapshot
        final_state = query_full_state(page)
        if final_state:
            ss_path = os.path.join(FEEDBACK_DIR, f'mp_{mode}_final.png')
            page.screenshot(path=ss_path)
            screenshots.append(ss_path)

        browser.close()

    # Post-game analysis
    if not bot_movement_detected:
        issues.append({
            'severity': 'HIGH',
            'category': 'bot_ai',
            'issue': 'Bot players did not move during the game'
        })

    if not player_damage_detected:
        issues.append({
            'severity': 'MEDIUM',
            'category': 'combat',
            'issue': 'No player damage detected — PvP or PvE combat may not be working'
        })

    if max_enemies_seen == 0:
        issues.append({
            'severity': 'HIGH',
            'category': 'spawning',
            'issue': 'No enemies spawned during the game'
        })
    elif max_enemies_seen > 100:
        issues.append({
            'severity': 'MEDIUM',
            'category': 'balance',
            'issue': f'Too many enemies on screen: {max_enemies_seen}'
        })

    if js_errors:
        for err in js_errors[:5]:
            issues.append({
                'severity': 'CRITICAL',
                'category': 'js_error',
                'issue': err
            })

    return {
        'mode': mode,
        'duration': duration,
        'issues': issues,
        'snapshots': snapshots,
        'js_errors': js_errors[:10],
        'screenshots': screenshots,
        'summary': {
            'total_issues': len(issues),
            'critical': sum(1 for i in issues if i['severity'] == 'CRITICAL'),
            'high': sum(1 for i in issues if i['severity'] == 'HIGH'),
            'medium': sum(1 for i in issues if i['severity'] == 'MEDIUM'),
            'bot_movement': bot_movement_detected,
            'pvp_kill_detected': pvp_kill_detected,
            'max_enemies': max_enemies_seen,
            'victory_seen': victory_seen,
        }
    }


def main() -> None:
    os.makedirs(FEEDBACK_DIR, exist_ok=True)

    print("=" * 60)
    print("8-Player Multiplayer Test")
    print("=" * 60)

    results = []

    # Test solo mode (8x1)
    print("\n--- Testing SOLO mode (8x1) for 60s ---")
    solo_result = run_game_test('solo', duration=60)
    results.append(solo_result)
    print(f"  Issues: {solo_result['summary']['total_issues']}")
    print(f"  Critical: {solo_result['summary']['critical']}, High: {solo_result['summary']['high']}")
    print(f"  Bot movement: {solo_result['summary']['bot_movement']}")
    print(f"  PvP kill: {solo_result['summary']['pvp_kill_detected']}")
    print(f"  Max enemies: {solo_result['summary']['max_enemies']}")

    # Test team mode (4v4)
    print("\n--- Testing TEAM mode (4v4) for 60s ---")
    team_result = run_game_test('team', duration=60)
    results.append(team_result)
    print(f"  Issues: {team_result['summary']['total_issues']}")
    print(f"  Critical: {team_result['summary']['critical']}, High: {team_result['summary']['high']}")
    print(f"  Bot movement: {team_result['summary']['bot_movement']}")
    print(f"  PvP kill: {team_result['summary']['pvp_kill_detected']}")
    print(f"  Max enemies: {team_result['summary']['max_enemies']}")

    # Combined report
    all_issues = []
    for r in results:
        for issue in r['issues']:
            issue['mode'] = r['mode']
            all_issues.append(issue)

    report = {
        'test_time': time.strftime('%Y-%m-%d %H:%M:%S'),
        'modes_tested': ['solo', 'team'],
        'results': results,
        'all_issues': all_issues,
        'total_issues': len(all_issues),
    }

    report_path = os.path.join(FEEDBACK_DIR, 'multiplayer_test_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"Report: {report_path}")
    print(f"Total issues found: {len(all_issues)}")
    print("\nAll issues:")
    for i, issue in enumerate(all_issues):
        print(f"  [{issue['severity']}] ({issue['mode']}) {issue['category']}: {issue['issue']}")

    # Exit with error if critical issues
    critical = sum(1 for i in all_issues if i['severity'] == 'CRITICAL')
    sys.exit(1 if critical > 0 else 0)


if __name__ == '__main__':
    main()
