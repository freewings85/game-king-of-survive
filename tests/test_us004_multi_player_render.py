"""US-004: Multi Player Render."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_multi_player_render():
    """Check that multi player render markers exist in demo."""
    src = _read_demo()
    assert re.search(r'multiPlayerRender|renderPlayers|playerEntities|drawAllPlayers|allPlayers', src, re.DOTALL | re.IGNORECASE), \
        "Multi player render markers not found in demo/survivor.html."
