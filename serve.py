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

class Handler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler sends Last-Modified and nothing else — no
    Cache-Control, no ETag. With no freshness directive a browser falls back to
    heuristic caching and will happily serve a stale stylesheet for minutes
    without revalidating, so an edit looks like it did nothing. Production
    caching is vercel.json's job; here we always want what is on disk."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


handler = functools.partial(Handler, directory=DIRECTORY)
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("127.0.0.1", PORT), handler) as httpd:
    print(f"Valad site → http://127.0.0.1:{PORT}/")
    httpd.serve_forever()
