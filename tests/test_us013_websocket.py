"""US-013: websocket."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_websocket():
    """Feature websocket should exist."""
    src = _read_demo()
    assert re.search(r'wsConnect|WebSocket|socketSend|wsProtocol|gameSocket', src, re.DOTALL | re.IGNORECASE), \
        "Feature websocket should be implemented."
