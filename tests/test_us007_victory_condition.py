"""US-007: victory_condition."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_victory_condition():
    """Feature victory_condition should exist."""
    src = _read_demo()
    assert re.search(r'victoryCondition|checkVictory|allEnemiesEliminated|VICTORY', src, re.DOTALL | re.IGNORECASE), \
        "Feature victory_condition should be implemented."
