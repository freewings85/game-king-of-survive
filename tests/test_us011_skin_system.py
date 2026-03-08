"""US-011: skin_system."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_skin_system():
    """Feature skin_system should exist."""
    src = _read_demo()
    assert re.search(r'skinSystem|skinCollection|equipSkin|skinFragment|皮肤碎片', src, re.DOTALL | re.IGNORECASE), \
        "Feature skin_system should be implemented."
