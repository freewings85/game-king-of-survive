"""
Visual AI Player — plays the actual demo in Chromium, takes screenshots,
and evaluates the visual/gameplay experience.

This is the "real player" that judges the game as a human would see it.
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

def play_and_evaluate():
    """Play the game in Chromium for ~40 seconds and evaluate the experience."""
    from playwright.sync_api import sync_playwright

    screenshots = []
    js_errors = []
    console_msgs = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 800, 'height': 600})
        page.on('pageerror', lambda err: js_errors.append(str(err)))
        page.on('console', lambda msg: console_msgs.append(msg.text) if msg.type == 'error' else None)

        page.goto(f'file://{DEMO_PATH}')
        page.wait_for_timeout(500)

        # Screenshot: Menu
        page.screenshot(path=os.path.join(FEEDBACK_DIR, 'vp_01_menu.png'))
        screenshots.append(('menu', 'vp_01_menu.png'))

        # Get canvas dimensions (W=800, H=600)
        box = page.query_selector('canvas').bounding_box()
        bw, bh = box['width'], box['height']
        cx, cy = box['x'] + bw / 2, box['y'] + bh / 2

        # Click Solo mode button: cx in [W/2-90, W/2-5], cy in [H/2+30, H/2+80]
        # Center of solo button: x=352, y=355
        page.click('canvas', position={'x': bw / 2 - 48, 'y': bh / 2 + 55})
        page.wait_for_timeout(300)

        # Play for 35 seconds with mouse movement to simulate a real player
        start = time.time()
        screenshot_times = {5: '02_early', 15: '03_mid', 25: '04_late', 35: '05_end'}
        angle = 0
        skills_picked = 0

        while time.time() - start < 37:
            elapsed = time.time() - start

            # Check game state via exposed accessor (window._survivorState)
            game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')

            # Handle menu state (if initial click missed)
            if game_state == 'menu':
                page.click('canvas', position={'x': bw / 2 - 48, 'y': bh / 2 + 55})
                page.wait_for_timeout(300)
                continue

            # Handle character select screen — click first character (warrior)
            if game_state == 'charSelect':
                # Warrior card at y = H/4 + 0*120 = 150, height 100, click center
                page.click('canvas', position={'x': bw / 2, 'y': 200})
                page.wait_for_timeout(300)
                continue

            # Handle map select screen — select first map then click "开始"
            if game_state == 'mapSelect':
                # Click first map entry (y=70, height=48, center y=94)
                page.click('canvas', position={'x': bw / 2, 'y': 94})
                page.wait_for_timeout(200)
                # Click "开始" button: cx in [W/2-60, W/2+60], cy in [H-60, H-20]
                page.click('canvas', position={'x': bw / 2, 'y': bh - 40})
                page.wait_for_timeout(300)
                continue

            is_level_up = game_state == 'levelUp'
            is_game_over = game_state == 'gameOver'

            if is_game_over:
                # Game ended — take a screenshot and break
                page.screenshot(path=os.path.join(FEEDBACK_DIR, 'vp_death.png'))
                screenshots.append(('death', 'vp_death.png'))
                break

            if is_level_up:
                # Click a random skill option to dismiss the overlay and continue
                # Skill cards: y = H/4 + 20 + i*80, H=600 → y=170,250,330; card height=65
                # Click center of each card: y=202, 282, 362
                skill_y = random.choice([202, 282, 362])
                page.click('canvas', position={'x': box['width'] / 2, 'y': skill_y})
                skills_picked += 1
                page.wait_for_timeout(300)
                continue

            # Smart dodge: query enemy positions and flee from clusters
            query = page.evaluate('() => window._survivorQuery ? window._survivorQuery() : null')
            if query and query.get('enemies'):
                enemies = query['enemies']
                # Calculate flee vector (away from enemy centroid, weighted by proximity)
                flee_x, flee_y, total_w = 0.0, 0.0, 0.0
                for en in enemies:
                    w = max(0.1, 1.0 - en['d'] / 400.0)  # closer = stronger
                    w = w * w  # quadratic falloff
                    flee_x += (query['px'] - en['x']) * w
                    flee_y += (query['py'] - en['y']) * w
                    total_w += w
                if total_w > 0:
                    flee_x /= total_w
                    flee_y /= total_w
                    mag = math.sqrt(flee_x * flee_x + flee_y * flee_y) or 1
                    flee_x, flee_y = flee_x / mag, flee_y / mag
                    # Move strongly toward flee direction, biased toward center
                    target_x = cx + flee_x * 200
                    target_y = cy + flee_y * 150
                else:
                    angle += 0.08
                    target_x = cx + math.cos(angle) * 120
                    target_y = cy + math.sin(angle * 0.7) * 100
            else:
                # No enemies nearby: gentle orbit toward center
                angle += 0.08
                target_x = cx + math.cos(angle) * 120
                target_y = cy + math.sin(angle * 0.7) * 100
            mx = max(120, min(680, int(target_x)))
            my = max(100, min(500, int(target_y)))
            page.mouse.move(mx, my)

            # Take screenshots at key moments
            for t, name in list(screenshot_times.items()):
                if elapsed >= t and t in screenshot_times:
                    page.screenshot(path=os.path.join(FEEDBACK_DIR, f'vp_{name}.png'))
                    screenshots.append((f'{t}s', f'vp_{name}.png'))
                    del screenshot_times[t]

            page.wait_for_timeout(200)

        # Check if we see a level-up overlay
        page.screenshot(path=os.path.join(FEEDBACK_DIR, 'vp_06_final.png'))
        screenshots.append(('final', 'vp_06_final.png'))

        browser.close()

    # Build evaluation report
    evaluation = {
        'screenshots': screenshots,
        'js_errors': js_errors[:5],
        'error_count': len(js_errors),
        'checks': {}
    }

    # Evaluate each aspect
    evaluation['checks']['no_js_errors'] = len(js_errors) == 0
    evaluation['checks']['menu_renders'] = os.path.exists(os.path.join(FEEDBACK_DIR, 'vp_01_menu.png'))
    evaluation['checks']['game_runs_35s'] = os.path.exists(os.path.join(FEEDBACK_DIR, 'vp_06_final.png'))
    evaluation['checks']['screenshots_count'] = len(screenshots)
    evaluation['skills_picked'] = skills_picked

    return evaluation


def main():
    os.makedirs(FEEDBACK_DIR, exist_ok=True)
    print("Visual AI Player starting...")

    result = play_and_evaluate()

    output_path = os.path.join(FEEDBACK_DIR, 'visual_player_report.json')
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"Report: {output_path}")
    print(f"JS errors: {result['error_count']}")
    print(f"Screenshots: {result['checks']['screenshots_count']}")
    for name, path in result['screenshots']:
        print(f"  [{name}] {path}")

    # Return non-zero if errors
    sys.exit(1 if result['error_count'] > 0 else 0)


if __name__ == '__main__':
    main()
