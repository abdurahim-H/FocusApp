#!/usr/bin/env python3
"""Simple HTTP server with no-cache headers for development"""
import http.server
import sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'Starting no-cache dev server on port {port}...')
print(f'Open http://localhost:{port}')
http.server.HTTPServer(('', port), NoCacheHandler).serve_forever()
