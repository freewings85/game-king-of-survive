"""US-003: Faction System."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_faction_system():
    """Check that faction system markers exist in demo."""
    src = _read_demo()
    assert re.search(r'factionSystem|teamId|allyCheck|friendlyFire.*false|faction', src, re.DOTALL | re.IGNORECASE), \
        "Faction system markers not found in demo/survivor.html."
