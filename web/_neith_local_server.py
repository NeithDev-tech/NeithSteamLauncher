from __future__ import annotations
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import threading, time, webbrowser, sys

BUILD = "V20"
HOST = "127.0.0.1"
PORT = 8080
ROOT = Path(__file__).resolve().parent

class NeithHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("X-Neith-Build", BUILD)
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("[NEITH LOCAL] " + (fmt % args) + "\n")

    def do_GET(self):
        # Match the clean directory routes used by production hosting.
        # /mi-cuenta and /mi-cuenta/ both resolve to /mi-cuenta/index.html, etc.
        from urllib.parse import urlsplit
        parsed = urlsplit(self.path)
        clean = parsed.path
        route_dirs = {
            "/dashboard", "/mi-cuenta", "/licencia", "/seguridad",
            "/boostpc", "/hourboost", "/logros", "/juegos-gratis",
            "/cuentas", "/docs", "/faq", "/free-premium", "/reset-password"
        }
        if clean.rstrip("/") in route_dirs:
            target = clean.rstrip("/") + "/index.html"
            self.path = target + (("?" + parsed.query) if parsed.query else "")
        return super().do_GET()


def open_when_ready():
    time.sleep(0.55)
    stamp = int(time.time())
    webbrowser.open_new_tab(f"http://localhost:{PORT}/?neithbuild={BUILD}&nocache={stamp}")

if __name__ == "__main__":
    marker = ROOT / "NEITH_BUILD.txt"
    try:
        marker_text = marker.read_text(encoding="utf-8").strip()
    except OSError:
        marker_text = ""
    if not marker_text.startswith(BUILD):
        print(f" ERROR: la carpeta no contiene el marcador esperado {BUILD}.")
        raise SystemExit(3)
    print("=" * 64)
    print(f" NEITH WEB {BUILD} — SERVIDOR LOCAL SIN CACHÉ")
    print("=" * 64)
    print(f" Carpeta servida: {ROOT}")
    print(f" URL: http://localhost:{PORT}/?neithbuild={BUILD}")
    print(" Cada respuesta incluye Cache-Control: no-store")
    print(" Para detenerlo: CTRL+C")
    print()
    handler = partial(NeithHandler, directory=str(ROOT))
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as exc:
        print(f" ERROR: no se pudo abrir el puerto {PORT}: {exc}")
        input(" Pulsa ENTER para cerrar...")
        raise SystemExit(2)
    threading.Thread(target=open_when_ready, daemon=True).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n Servidor detenido.")
    finally:
        httpd.server_close()
