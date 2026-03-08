"""US-008: final_boss."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_final_boss():
    """Feature final_boss should exist."""
    src = _read_demo()
    assert re.search(r'finalBoss|moshan|魔山|bossTimeScale|finalBossPhase', src, re.DOTALL | re.IGNORECASE), \
        "Feature final_boss should be implemented."
