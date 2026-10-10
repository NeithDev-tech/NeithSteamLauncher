#!/usr/bin/env python3
from __future__ import annotations

import argparse
import concurrent.futures
import contextlib
import json
import mimetypes
import os
import posixpath
import socket
import sys
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BUILD = "NEITH_WEB_V34_R122"
ROOT = Path(__file__).resolve().parent

# Windows-friendly MIME additions.
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")


def _safe_path(url_path: str) -> Path | None:
    path = urllib.parse.unquote(url_path.split("?", 1)[0].split("#", 1)[0])
    path = posixpath.normpath(path)
    parts = [p for p in path.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        return None
    candidate = ROOT.joinpath(*parts)
    try:
        resolved = candidate.resolve()
        resolved.relative_to(ROOT)
    except Exception:
        return None
    if resolved.is_dir():
        resolved = resolved / "index.html"
    return resolved


def _cache_control(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in {".html", ".htm"}:
        return "no-cache, max-age=0, must-revalidate"
    if ext in {".css", ".js", ".mjs", ".json", ".webmanifest"}:
        return "public, max-age=300"
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".wav", ".mp3"}:
        return "public, max-age=3600"
    return "public, max-age=60"


class NeithHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "NeithLocal/V34-R122"
    sys_version = ""

    def log_message(self, fmt, *args):
        # All request logging is emitted by _finish_log with timings.
        return

    def setup(self):
        super().setup()
        try:
            self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except OSError:
            pass
        self.connection.settimeout(10)

    def _send_headers(self, status: int, content_type: str, length: int, cache: str, extra: dict[str, str] | None = None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Neith-Build", BUILD)
        self.send_header("X-Neith-Local-Test", "1")
        self.send_header("X-Neith-Server", "python-threading-http11")
        self.send_header("Connection", "keep-alive")
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()

    def _write_bytes(self, status: int, body: bytes, content_type: str, cache: str, head_only: bool = False, extra: dict[str, str] | None = None):
        self._send_headers(status, content_type, len(body), cache, extra)
        if not head_only and body:
            try:
                self.wfile.write(body)
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, socket.timeout):
                pass

    def _finish_log(self, status: int, target: str, started: float, label: str):
        elapsed = (time.perf_counter() - started) * 1000.0
        print(f"[{status}] {self.command} {target} -> {label} ({elapsed:.1f} ms)", flush=True)

    def _handle(self, head_only: bool):
        started = time.perf_counter()
        target = urllib.parse.urlsplit(self.path).path or "/"

        if target == "/__neith_health":
            body = json.dumps({"ok": True, "build": BUILD, "server": "python-threading-http11"}, separators=(",", ":")).encode("utf-8")
            self._write_bytes(200, body, "application/json; charset=utf-8", "no-store", head_only)
            self._finish_log(200, target, started, "health")
            return

        if target.rstrip("/") == "/descargar":
            self._write_bytes(
                302,
                b"",
                "text/plain; charset=utf-8",
                "no-store",
                head_only,
                {"Location": "https://github.com/NeithDev-tech/NeithSteamLauncher/releases/latest/download/NeithSetup.exe"},
            )
            self._finish_log(302, target, started, "descarga oficial")
            return

        resolved = _safe_path(target)
        if resolved and resolved.is_file():
            try:
                body = resolved.read_bytes()
            except OSError:
                body = b""
                self._write_bytes(500, body, "text/plain; charset=utf-8", "no-store", head_only)
                self._finish_log(500, target, started, "error lectura")
                return
            ctype = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
            if ctype.startswith("text/") or resolved.suffix.lower() in {".js", ".css", ".json", ".webmanifest", ".svg"}:
                ctype += "; charset=utf-8"
            self._write_bytes(200, body, ctype, _cache_control(resolved), head_only)
            self._finish_log(200, target, started, str(resolved.relative_to(ROOT)))
            return

        not_found = ROOT / "404.html"
        body = not_found.read_bytes() if not_found.is_file() else b"404 - No encontrado"
        ctype = "text/html; charset=utf-8" if not_found.is_file() else "text/plain; charset=utf-8"
        self._write_bytes(404, body, ctype, "no-store", head_only)
        self._finish_log(404, target, started, "no encontrado")

    def do_GET(self):
        self._handle(False)

    def do_HEAD(self):
        self._handle(True)


def _fetch(url: str) -> tuple[str, int, float]:
    started = time.perf_counter()
    req = urllib.request.Request(url, method="GET", headers={"Connection": "keep-alive", "User-Agent": "NeithV34R122SelfTest/1.0"})
    with contextlib.closing(urllib.request.urlopen(req, timeout=5)) as response:
        response.read()
        return url, response.status, (time.perf_counter() - started) * 1000.0


def self_test(port: int) -> None:
    paths = [
        "/",
        "/css/style.css",
        "/js/main.js",
        "/js/auth.js",
        "/logros/",
        "/cuentas/",
        "/admin/",
        "/js/admin.js",
        "/site.webmanifest",
        "/__neith_health",
    ]
    print(f"Ejecutando autoprueba concurrente ({len(paths)} recursos)...", flush=True)
    started = time.perf_counter()
    base = f"http://127.0.0.1:{port}"
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(paths)) as pool:
        futures = [pool.submit(_fetch, base + p) for p in paths]
        results = [f.result(timeout=7) for f in futures]
    failures = [r for r in results if r[1] != 200]
    if failures:
        raise RuntimeError(f"Autoprueba fallida: {failures}")
    elapsed = (time.perf_counter() - started) * 1000.0
    slowest = max(r[2] for r in results)
    print(f"AUTOPRUEBA OK: {len(results)}/{len(paths)} recursos en paralelo ({elapsed:.0f} ms; mas lento {slowest:.0f} ms).", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Servidor local concurrente Neith V34 R122")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    marker = ROOT / "NEITH_BUILD.txt"
    if not marker.is_file():
        print("ERROR: falta NEITH_BUILD.txt", file=sys.stderr)
        return 2
    marker_text = marker.read_text(encoding="utf-8-sig", errors="replace").strip()
    if marker_text.strip().upper() != BUILD:
        print(f"ERROR: esta carpeta no esta marcada como {BUILD}.", file=sys.stderr)
        print(f"Contenido de NEITH_BUILD.txt: {marker_text}", file=sys.stderr)
        return 2

    try:
        server = NeithHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as exc:
        print(f"ERROR: no se pudo abrir el puerto {args.port}: {exc}", file=sys.stderr)
        return 3

    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.1}, daemon=True)
    thread.start()
    try:
        self_test(args.port)
        print("", flush=True)
        print("Esta ventana debe permanecer abierta mientras pruebas la web.", flush=True)
        print("Para detener el servidor: CTRL+C", flush=True)
        print("", flush=True)
        if not args.no_browser:
            webbrowser.open(f"http://127.0.0.1:{args.port}/", new=1)
        while thread.is_alive():
            thread.join(timeout=0.5)
    except KeyboardInterrupt:
        print("\nDeteniendo servidor Neith...", flush=True)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        return 4
    finally:
        server.shutdown()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
