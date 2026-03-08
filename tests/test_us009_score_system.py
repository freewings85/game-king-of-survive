"""US-009: score_system."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_score_system():
    """Feature score_system should exist."""
    src = _read_demo()
    assert re.search(r'scoreSystem|calcScore|scoreBreakdown|matchScore|积分结算', src, re.DOTALL | re.IGNORECASE), \
        "Feature score_system should be implemented."
