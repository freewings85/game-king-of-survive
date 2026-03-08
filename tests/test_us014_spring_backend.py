"""US-014: spring_backend."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_spring_backend():
    """Feature spring_backend should exist."""
    src = _read_demo()
    assert re.search(r'springBackend|localMode|offlineMode|serverUrl|apiEndpoint', src, re.DOTALL | re.IGNORECASE), \
        "Feature spring_backend should be implemented."
