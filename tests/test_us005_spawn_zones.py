"""US-005: Spawn Zones."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_spawn_zones():
    """Check that spawn zone markers exist in demo."""
    src = _read_demo()
    assert re.search(r'spawnZone|spawn.*zone|spawnPoint.*area|zoneSpawnRate', src, re.DOTALL | re.IGNORECASE), \
        "Spawn zone markers not found in demo/survivor.html."
