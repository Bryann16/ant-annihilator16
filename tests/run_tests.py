"""Run the Ant Annihilator browser tests in headless Chromium.

    pip install -r tests/requirements.txt
    python -m playwright install chromium
    python tests/run_tests.py

Serves the repo on a temporary port, opens tests/index.html and prints each result.
Exits with status 1 if any test fails.
"""
import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
TIMEOUT_MS = 240_000
# software WebGL so the game renders on machines without a GPU (like CI runners)
CHROMIUM_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_port}/tests/index.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=CHROMIUM_ARGS)
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            console = []
            page.on("console", lambda m: console.append(f"[{m.type}] {m.text}"))
            page.on("pageerror", lambda e: console.append(f"[pageerror] {e}"))
            page.goto(url)
            try:
                page.wait_for_function("window.__testResults && window.__testResults.done", timeout=TIMEOUT_MS)
            except Exception:
                results = page.evaluate("window.__testResults") or {"results": []}
                status = page.inner_text("#summary")
                browser.close()
                print("\n".join(console[-30:]))
                raise SystemExit(f"Tests did not finish in {TIMEOUT_MS // 1000}s. Last status: {status!r}. "
                                 f"Finished so far: {[r['name'] for r in results['results']]}")
            results = page.evaluate("window.__testResults")
            browser.close()
    finally:
        server.shutdown()
    return results


def main():
    results = run()
    for r in results["results"]:
        print(("PASS  " if r["ok"] else "FAIL  ") + r["name"])
        if r["error"]:
            print("      " + r["error"].replace("\n", "\n      "))
    print(f"\n{results['passed']} passed, {results['failed']} failed")
    return 1 if results["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
