"""US-010: rank_system."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_rank_system():
    """Feature rank_system should exist."""
    src = _read_demo()
    assert re.search(r'rankSystem|playerRank|段位|rankTier|rankPoints', src, re.DOTALL | re.IGNORECASE), \
        "Feature rank_system should be implemented."
