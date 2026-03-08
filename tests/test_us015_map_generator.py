"""US-015: map_generator."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_map_generator():
    """Feature map_generator should exist."""
    src = _read_demo()
    assert re.search(r'mapGenerator|generateMap|mapBoundary|mapPolygon|mapConfig', src, re.DOTALL | re.IGNORECASE), \
        "Feature map_generator should be implemented."
