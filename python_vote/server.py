import os
import sys
import subprocess
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allow requests from the Vite dev server (3000/3001) and same-origin
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})

BASE_DIR = Path(__file__).resolve().parent

# Track child processes so we don't spawn duplicates
_processes: dict[str, subprocess.Popen] = {}


def _start_script(key: str, script_name: str):
    """Start a Python script in a background process if not already running."""
    existing = _processes.get(key)
    if existing and existing.poll() is None:
        return False, f"{key} script already running"

    script_path = BASE_DIR / script_name
    if not script_path.exists():
        return False, f"Script not found: {script_path}"

    try:
        proc = subprocess.Popen([sys.executable, str(script_path)], cwd=str(BASE_DIR))
        _processes[key] = proc
        return True, f"Started {script_name}"
    except Exception as exc:  # pragma: no cover - best-effort logging
        return False, f"Failed to start {script_name}: {exc}"


@app.post("/start-visual")
def start_visual():
    ok, msg = _start_script("visual", "main.py")
    status = 200 if ok else 400
    return jsonify({"ok": ok, "message": msg}), status


@app.post("/start-audio")
def start_audio():
    ok, msg = _start_script("audio", "audiovote.py")
    status = 200 if ok else 400
    return jsonify({"ok": ok, "message": msg}), status


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("PYVOTE_PORT", "5000"))
    app.run(host="127.0.0.1", port=port)