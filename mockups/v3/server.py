#!/usr/bin/env python3
"""Pip & the Storywood — v3 shared server.

Serves the mockups/ tree as static files AND proxies LLM calls so the
TensorMux API key never touches browser JS.

  cd mockups && python3 v3/server.py            # serves http://localhost:8001
  TENSORMUX_API_KEY=... python3 v3/server.py    # or put it in v3/.env

Endpoints:
  GET  /api/health      -> {"ok":true}
  GET  /api/sysguard    -> {"mem_avail_gb":..,"mem_total_gb":..,"gpu_free_gb":..,"ok":..}
                           Agents MUST check this before heavy work (see SPEC).
  GET  /api/stats       -> last 50 LLM call latencies (for speed measuring)
  POST /api/chat        -> OpenAI-format chat completion via TensorMux
                           body: {model, messages, max_tokens, reasoning_effort?}
                           ?mode=local -> forwards to local ollama instead
"""
import json, os, time, subprocess, urllib.request, urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

V3 = Path(__file__).resolve().parent
ROOT = V3.parent                      # mockups/
PORT = int(os.environ.get("V3_PORT", "8001"))

def load_env():
    env_file = V3 / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

load_env()
API_KEY = os.environ.get("TENSORMUX_API_KEY", "")
TM_BASE = "https://api.tensormux.com/v1/chat/completions"
LOCAL_BASE = os.environ.get("LOCAL_BASE", "http://localhost:11434")
LOCAL_MODEL = os.environ.get("LOCAL_MODEL", "qwen2.5:3b")
STATS = []

def sysguard():
    mem_avail = mem_total = 0
    try:
        for line in Path("/proc/meminfo").read_text().splitlines():
            if line.startswith("MemTotal"):
                mem_total = int(line.split()[1]) / 1048576
            elif line.startswith("MemAvailable"):
                mem_avail = int(line.split()[1]) / 1048576
    except Exception:
        pass
    gpu = {"name": None, "total_gb": None, "free_gb": None}
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=4).stdout.strip()
        name, total, used = [p.strip() for p in out.splitlines()[0].split(",")]
        gpu = {"name": name, "total_gb": round(int(total)/1024, 2),
               "free_gb": round((int(total)-int(used))/1024, 2)}
    except Exception:
        pass
    return {"mem_avail_gb": round(mem_avail, 2), "mem_total_gb": round(mem_total, 2),
            "gpu": gpu, "ok": True}

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type,authorization")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *a):
        pass  # quiet

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204); self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/health"):
            return self._json(200, {"ok": True, "has_key": bool(API_KEY),
                                    "local_model": LOCAL_MODEL})
        if self.path.startswith("/api/sysguard"):
            return self._json(200, sysguard())
        if self.path.startswith("/api/stats"):
            return self._json(200, {"calls": STATS[-50:]})
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith("/api/chat"):
            return self._json(404, {"error": "unknown endpoint"})
        mode = "local" if "mode=local" in self.path else "remote"
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception as e:
            return self._json(400, {"error": f"bad json: {e}"})

        if mode == "local":
            url = f"{LOCAL_BASE}/v1/chat/completions"
            payload.setdefault("model", LOCAL_MODEL)
            headers = {"Content-Type": "application/json"}
        else:
            url = TM_BASE
            payload.setdefault("model", os.environ.get("TENSORMUX_MODEL", "glm-4-7-flash"))
            payload.setdefault("reasoning_effort", "none")   # latency lever
            if not API_KEY:
                return self._json(503, {"error": "no TENSORMUX_API_KEY configured"})
            headers = {"Content-Type": "application/json",
                       "Authorization": f"Bearer {API_KEY}"}

        t0 = time.time()
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                         headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=45) as r:
                data = json.loads(r.read())
            ms = int((time.time() - t0) * 1000)
            STATS.append({"mode": mode, "ms": ms, "t": int(t0),
                          "model": payload.get("model")})
            return self._json(200, {"ms": ms, "mode": mode, "data": data})
        except urllib.error.HTTPError as e:
            return self._json(e.code, {"error": f"upstream {e.code}",
                                       "detail": e.read()[:400].decode("utf-8", "replace")})
        except Exception as e:
            return self._json(502, {"error": f"{mode} unreachable: {e}"})

if __name__ == "__main__":
    print(f"v3 server -> http://localhost:{PORT}  (static root: {ROOT})")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
