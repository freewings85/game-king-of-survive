"""
Retention Analyst AI Player — plays multiple rounds in Chromium,
evaluates the "one more try" factor and viral potential.

Produces a structured report with actionable feedback.
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


def play_round(page, box, round_num):
    """Play one complete round, return stats."""
    cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2

    # Click start from menu
    game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
    if game_state == 'menu':
        page.click('canvas', position={'x': box['width'] / 2, 'y': box['height'] / 2 + 37})
        page.wait_for_timeout(300)

    # Handle character select — pick random character each round
    game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')
    if game_state == 'charSelect':
        char_y = random.choice([150 + 50, 270 + 50, 390 + 50])  # H/4 + i*120 + 50
        page.click('canvas', position={'x': box['width'] / 2, 'y': char_y})
        page.wait_for_timeout(300)

    start = time.time()
    skills_picked = 0
    angle = random.random() * math.pi * 2
    screenshots = []

    while time.time() - start < 60:  # Max 60 seconds per round
        elapsed = time.time() - start
        game_state = page.evaluate('() => window._survivorState ? window._survivorState() : null')

        if game_state == 'gameOver':
            # Capture death screen
            path = os.path.join(FEEDBACK_DIR, f'ra_death_r{round_num}.png')
            page.screenshot(path=path)
            screenshots.append(path)

            # Get final stats from the HUD text
            stats = page.evaluate('''() => {
                var s = window._survivorState ? window._survivorState() : null;
                return {
                    state: s,
                    gold: typeof gold !== 'undefined' ? gold : 0
                };
            }''')

            # Click retry
            page.click('canvas', position={'x': box['width'] / 2, 'y': box['height'] - 85})
            page.wait_for_timeout(500)
            break

        if game_state == 'charSelect':
            char_y = random.choice([150 + 50, 270 + 50, 390 + 50])
            page.click('canvas', position={'x': box['width'] / 2, 'y': char_y})
            page.wait_for_timeout(300)
            continue

        if game_state == 'levelUp':
            skill_y = random.choice([202, 282, 362])
            page.click('canvas', position={'x': box['width'] / 2, 'y': skill_y})
            skills_picked += 1
            page.wait_for_timeout(200)
            continue

        # Smart movement — query enemy positions and flee from clusters
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
                mx = int(cx + flee_x * 200)
                my = int(cy + flee_y * 150)
            else:
                angle += 0.06 + round_num * 0.02
                mx = int(cx + math.cos(angle) * 120)
                my = int(cy + math.sin(angle * 0.8) * 100)
        else:
            angle += 0.06 + round_num * 0.02
            mx = int(cx + math.cos(angle) * 120)
            my = int(cy + math.sin(angle * 0.8) * 100)
        mx = max(120, min(680, mx))
        my = max(100, min(500, my))
        page.mouse.move(mx, my)

        # Screenshot at 10s mark for "first impression" analysis
        if round_num == 0 and abs(elapsed - 10) < 0.3 and not screenshots:
            path = os.path.join(FEEDBACK_DIR, 'ra_first_impression.png')
            page.screenshot(path=path)
            screenshots.append(path)

        page.wait_for_timeout(150)

    return {
        'round': round_num,
        'duration': round(time.time() - start, 1),
        'skills_picked': skills_picked,
        'screenshots': screenshots
    }


def analyze_retention(rounds_data):
    """Analyze retention signals from multiple rounds."""
    analysis = {
        'rounds_played': len(rounds_data),
        'avg_duration': 0,
        'duration_trend': 'stable',
        'skill_variety': 0,
        'issues': [],
        'strengths': [],
        'viral_score': 0,
    }

    durations = [r['duration'] for r in rounds_data]
    analysis['avg_duration'] = round(sum(durations) / len(durations), 1)

    # Duration trend: are later rounds longer (learning curve) or shorter (bored)?
    if len(durations) >= 3:
        first_half = sum(durations[:len(durations)//2]) / (len(durations)//2)
        second_half = sum(durations[len(durations)//2:]) / (len(durations) - len(durations)//2)
        if second_half > first_half * 1.2:
            analysis['duration_trend'] = 'improving'
            analysis['strengths'].append('玩家越玩越好——学习曲线正向')
        elif second_half < first_half * 0.7:
            analysis['duration_trend'] = 'declining'
            analysis['issues'].append({'priority': 'HIGH', 'issue': '后续局数存活时间下降——可能缺乏新鲜感', 'fix': '增加随机事件和解锁内容'})

    # Skills per round
    total_skills = sum(r['skills_picked'] for r in rounds_data)
    analysis['skill_variety'] = round(total_skills / len(rounds_data), 1)

    # Viral score calculation (0-100)
    score = 50  # baseline
    if analysis['avg_duration'] > 20: score += 10  # Games last enough to invest
    if analysis['avg_duration'] > 40: score += 10
    if analysis['duration_trend'] == 'improving': score += 15
    if analysis['skill_variety'] > 3: score += 10  # Enough skill picks = progression
    if analysis['avg_duration'] < 10:
        score -= 20
        analysis['issues'].append({'priority': 'HIGH', 'issue': '平均存活时间过短(<10s)——新手体验差', 'fix': '降低前2波难度或增加新手保护'})

    # Check for content variety signal
    if total_skills < len(rounds_data) * 2:
        analysis['issues'].append({'priority': 'MEDIUM', 'issue': '每局技能选择次数少——升级节奏可能太慢', 'fix': '降低前几级升级所需经验'})

    analysis['viral_score'] = min(100, max(0, score))

    # Default strengths
    if not analysis['issues']:
        analysis['strengths'].append('多轮测试无明显问题——基础体验稳定')
    if analysis['avg_duration'] > 30:
        analysis['strengths'].append(f'平均存活{analysis["avg_duration"]}s——游戏有足够深度')

    return analysis


def main():
    from playwright.sync_api import sync_playwright
    os.makedirs(FEEDBACK_DIR, exist_ok=True)

    print("Retention Analyst starting...")
    js_errors = []
    rounds_data = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 800, 'height': 600})
        page.on('pageerror', lambda err: js_errors.append(str(err)))
        page.goto(f'file://{DEMO_PATH}')
        page.wait_for_timeout(500)

        box = page.query_selector('canvas').bounding_box()

        # Play 5 rounds
        for i in range(5):
            print(f"  Round {i+1}/5...")
            result = play_round(page, box, i)
            rounds_data.append(result)
            print(f"    Duration: {result['duration']}s, Skills: {result['skills_picked']}")

            # Wait a moment between rounds (simulates "deciding to play again")
            page.wait_for_timeout(500)

        browser.close()

    # Analyze
    analysis = analyze_retention(rounds_data)
    analysis['rounds'] = rounds_data
    analysis['js_errors'] = js_errors[:5]

    # Write report
    output_path = os.path.join(FEEDBACK_DIR, 'retention_report.json')
    with open(output_path, 'w') as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)

    print(f"\nRetention Report: {output_path}")
    print(f"Viral Score: {analysis['viral_score']}/100")
    print(f"Avg Duration: {analysis['avg_duration']}s")
    print(f"Duration Trend: {analysis['duration_trend']}")
    print(f"Strengths: {analysis['strengths']}")
    if analysis['issues']:
        print("Issues:")
        for iss in analysis['issues']:
            print(f"  [{iss['priority']}] {iss['issue']}")
            print(f"    Fix: {iss['fix']}")

    sys.exit(1 if any(i['priority'] == 'HIGH' for i in analysis['issues']) else 0)


if __name__ == '__main__':
    main()
