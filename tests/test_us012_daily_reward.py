"""US-012: daily_reward."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_daily_reward():
    """Feature daily_reward should exist."""
    src = _read_demo()
    assert re.search(r'dailyReward|dailyLogin|loginStreak|每日签到|signInReward', src, re.DOTALL | re.IGNORECASE), \
        "Feature daily_reward should be implemented."
