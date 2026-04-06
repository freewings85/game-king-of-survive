#!/usr/bin/env python3
"""Lightweight dev server that serves static files and mimics the Java API endpoints.
Usage: python3 dev-server.py [port]
"""
import http.server
import json
import os
import sys
import uuid
import time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# In-memory game state for mock endpoints
mock_players = {}
mock_rooms = {}

# Map API paths to data files
API_MAP = {
    '/api/editor/characters': 'characters.json',
    '/api/editor/skills': 'skills.json',
    '/api/editor/monsters': 'monsters.json',
    '/api/editor/evolution': 'evolution.json',
    '/api/editor/skins': 'skins.json',
    '/api/editor/formulas': 'formulas.json',
    '/api/editor/xp_curve': 'xp_curve.json',
    '/api/editor/part_variants': 'part_variants.json',
}

# Map editor API paths
MAP_API_PREFIX = '/api/editor/maps/'
MAPS_DIR = os.path.join(DATA_DIR, 'maps')


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0]

        # Handle data API endpoints
        if path in API_MAP:
            self._serve_json_file(os.path.join(DATA_DIR, API_MAP[path]))
            return

        # Handle map API endpoints: /api/editor/maps/{mapId}
        if path.startswith(MAP_API_PREFIX) and len(path) > len(MAP_API_PREFIX):
            map_id = path[len(MAP_API_PREFIX):]
            map_file = os.path.join(MAPS_DIR, f'{map_id}.json')
            self._serve_json_file(map_file)
            return

        # Handle maps list
        if path == '/api/editor/maps':
            self._serve_maps_list()
            return

        # Mock: GET /api/players/{id}
        if path.startswith('/api/players/'):
            player_id = path[len('/api/players/'):]
            if player_id in mock_players:
                self._send_json(mock_players[player_id])
            else:
                self.send_error(404, 'Player not found')
            return

        # Mock: GET /api/rooms/{id}
        if path.startswith('/api/rooms/') and '/map' not in path and '/ready' not in path and '/start' not in path:
            room_id = path[len('/api/rooms/'):]
            if room_id in mock_rooms:
                self._send_json(mock_rooms[room_id])
            else:
                self.send_error(404, 'Room not found')
            return

        # Serve static files (editor, demo, etc.)
        super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(body)
        except:
            data = {}

        # Mock: POST /api/players — register
        if path == '/api/players':
            player_id = 'player_' + uuid.uuid4().hex[:8]
            nickname = data.get('nickname', 'Player')
            player = {
                'id': player_id,
                'nickname': nickname,
                'gold': 500,
                'level': 1,
                'rank': 'BRONZE',
                'skins': ['default'],
                'equippedSkin': 'default'
            }
            mock_players[player_id] = player
            self._send_json(player)
            return

        # Mock: POST /api/rooms — create room
        if path == '/api/rooms':
            room_id = 'room_' + uuid.uuid4().hex[:8]
            room = {
                'id': room_id,
                'hostId': data.get('hostId', ''),
                'mode': data.get('mode', 'solo'),
                'characterType': data.get('characterType', 'warrior'),
                'mapId': 'green_plains',
                'status': 'waiting',
                'players': [data.get('hostId', '')]
            }
            mock_rooms[room_id] = room
            self._send_json(room)
            return

        # Mock: POST /api/rooms/{id}/ready
        if '/ready' in path and path.startswith('/api/rooms/'):
            room_id = path.split('/')[3]
            if room_id in mock_rooms:
                mock_rooms[room_id]['status'] = 'ready'
                self._send_json({'status': 'ok'})
            else:
                self._send_json({'status': 'ok'})
            return

        # Mock: POST /api/rooms/{id}/start
        if '/start' in path and path.startswith('/api/rooms/'):
            room_id = path.split('/')[3]
            session = {
                'sessionId': 'session_' + uuid.uuid4().hex[:8],
                'roomId': room_id,
                'status': 'running',
                'wsUrl': f'ws://localhost:{PORT}/ws'
            }
            if room_id in mock_rooms:
                mock_rooms[room_id]['status'] = 'running'
            self._send_json(session)
            return

        # Fall through to PUT handler for editor save
        self.do_PUT_impl(path, body)

    def do_PUT(self):
        path = self.path.split('?')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'

        # Mock: PUT /api/rooms/{id}/map
        if '/map' in path and path.startswith('/api/rooms/'):
            try:
                data = json.loads(body)
            except:
                data = {}
            room_id = path.split('/')[3]
            if room_id in mock_rooms:
                mock_rooms[room_id]['mapId'] = data.get('mapId', 'green_plains')
            self._send_json({'status': 'ok'})
            return

    def do_PUT_impl(self, path, body):
        # Handle save API endpoints
        if path in API_MAP:
            filepath = os.path.join(DATA_DIR, API_MAP[path])
            try:
                data = json.loads(body)
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                self._send_json({'status': 'ok'})
            except Exception as e:
                self._send_json({'error': str(e)}, 500)
            return

        # Handle map save
        if path.startswith(MAP_API_PREFIX):
            map_id = path[len(MAP_API_PREFIX):]
            filepath = os.path.join(MAPS_DIR, f'{map_id}.json')
            try:
                data = json.loads(body)
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                self._send_json({'status': 'ok'})
            except Exception as e:
                self._send_json({'error': str(e)}, 500)
            return

        self.send_error(404)

    def _serve_json_file(self, filepath):
        if not os.path.exists(filepath):
            self.send_error(404, f'File not found: {filepath}')
            return
        try:
            with open(filepath, 'r') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        except Exception as e:
            self.send_error(500, str(e))

    def _serve_maps_list(self):
        maps = []
        if os.path.isdir(MAPS_DIR):
            for f in sorted(os.listdir(MAPS_DIR)):
                if f.endswith('.json'):
                    try:
                        with open(os.path.join(MAPS_DIR, f)) as fh:
                            d = json.load(fh)
                        maps.append({'id': d.get('id', f[:-5]), 'name': d.get('name', f[:-5])})
                    except:
                        pass
        self._send_json(maps)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Quieter logging - only show API calls
        msg = format % args
        if '/api/' in msg or 'error' in msg.lower():
            sys.stderr.write(f"[dev-server] {msg}\n")


if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PORT), DevHandler)
    print(f'Dev server running at http://localhost:{PORT}')
    print(f'  Editor:      http://localhost:{PORT}/editor/index.html')
    print(f'  Map Editor:  http://localhost:{PORT}/editor/map-editor.html')
    print(f'  Game:        http://localhost:{PORT}/demo/survivor.html')
    print(f'  Data dir:    {DATA_DIR}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()
