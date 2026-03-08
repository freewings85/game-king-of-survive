"""US-001: Room System."""
import os
import re

DEMO = os.path.join(os.path.dirname(__file__), '..', 'demo', 'survivor.html')


def _read_demo():
    with open(DEMO) as f:
        return f.read()


def test_room_system():
    """Check that room system markers exist in demo."""
    src = _read_demo()
    assert re.search(r'roomSystem|createRoom|joinRoom|roomList|gameRoom', src, re.DOTALL | re.IGNORECASE), \
        "Room system markers not found in demo/survivor.html."
