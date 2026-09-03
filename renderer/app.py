"""Cloud Run entrypoint for the video renderer."""

import json
import os
import threading
import urllib.error
import urllib.request

from flask import Flask, jsonify, request

from pipeline import RenderRequest, render

app = Flask(__name__)

LANGUAGES = {"ja", "en", "es", "pt", "id", "ar"}
REQUIRED = ("task_id", "language", "background_url", "hook", "body", "cta")


def _authorized() -> bool:
    """Cloud Run IAM owns the Authorization header, so the shared secret rides on its own."""
    secret = os.environ.get("CRON_SECRET")
    if not secret:
        return False
    provided = request.headers.get("X-Cron-Secret") or request.headers.get("Authorization", "")
    return provided.removeprefix("Bearer ") == secret


def _optional_float(value: float | str | None) -> float | None:
    return None if value is None else float(value)


def _optional_int(value: int | str | None) -> int | None:
    return None if value is None else int(value)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


def _notify(callback_url: str, payload: dict) -> None:
    """Reports the outcome to the caller, which cannot stay connected for a whole render."""
    body = json.dumps(payload).encode()
    notification = urllib.request.Request(
        callback_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": os.environ.get("CRON_SECRET", ""),
        },
    )
    try:
        with urllib.request.urlopen(notification, timeout=30):
            pass
    except (urllib.error.URLError, TimeoutError):
        app.logger.exception("Callback to %s failed", callback_url)


def _render_and_notify(build: RenderRequest, callback_url: str, meta: dict) -> None:
    try:
        result = render(build)
    except Exception as error:  # noqa: BLE001 - the failure has to reach the caller
        app.logger.exception("Render failed")
        _notify(callback_url, {**meta, "error": str(error)})
        return
    _notify(callback_url, {**meta, "url": result.url, "duration": result.duration})


@app.post("/render")
def render_video():
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    missing = [field for field in REQUIRED if not payload.get(field)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    if payload["language"] not in LANGUAGES:
        return jsonify({"error": f"Unsupported language \"{payload['language']}\""}), 400

    build = RenderRequest(
        task_id=payload["task_id"],
        language=payload["language"],
        background_url=payload["background_url"],
        hook=payload["hook"],
        body=payload["body"],
        cta=payload["cta"],
        note=payload.get("note"),
        max_body_segments=_optional_int(payload.get("max_body_segments")),
        tempo=float(payload.get("tempo", 1.05)),
        output_path=payload.get("output_path"),
        target_min=_optional_float(payload.get("target_min")),
        target_max=_optional_float(payload.get("target_max")),
    )

    # A 65s render outlives any HTTP client, so the caller hands over a callback and
    # hangs up; only the ad-hoc tooling still waits for the finished file inline.
    callback_url = payload.get("callback_url")
    if callback_url:
        meta = {
            "task_id": payload["task_id"],
            "queue_task_id": payload.get("queue_task_id", payload["task_id"]),
            "pattern": payload.get("pattern"),
        }
        # Not a daemon: the interpreter waits for the render instead of dropping it.
        threading.Thread(target=_render_and_notify, args=(build, callback_url, meta)).start()
        return jsonify({"status": "accepted", "task_id": payload["task_id"]}), 202

    try:
        result = render(build)
    except Exception as error:  # surfaced to the caller so cron can record the failure
        app.logger.exception("Render failed")
        return jsonify({"error": str(error)}), 500

    return jsonify({"url": result.url, "duration": result.duration, "segments": result.segments})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
