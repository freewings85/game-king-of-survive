"""US-002: Map Select."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_map_select():
    """Check that map select markers exist in demo."""
    src = _read_demo()
    assert re.search(r'mapSelect|mapChoice|selectMap|mapLevel|mapPreview', src, re.DOTALL | re.IGNORECASE), \
        "Map select markers not found in demo/survivor.html."
