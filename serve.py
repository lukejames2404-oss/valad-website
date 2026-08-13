#!/usr/bin/env python3
# Static server for the Valad site.
# Uses an explicit directory= because `python3 -m http.server` calls os.getcwd()
# at import time, which macOS blocks for Desktop-hosted folders.
import functools
import http.server
import os
import socketserver

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", 4173))

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("127.0.0.1", PORT), handler) as httpd:
    print(f"Valad site → http://127.0.0.1:{PORT}/Valad%20Homepage%20v2.dc.html")
    httpd.serve_forever()
