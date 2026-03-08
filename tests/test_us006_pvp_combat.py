"""US-006: pvp_combat."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_pvp_combat():
    """Feature pvp_combat should exist."""
    src = _read_demo()
    assert re.search(r'pvpCombat|pvpDamage|playerVsPlayer|pvpHit', src, re.DOTALL | re.IGNORECASE), \
        "Feature pvp_combat should be implemented."
