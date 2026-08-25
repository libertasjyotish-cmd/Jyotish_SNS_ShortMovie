"""Cloud Run entrypoint for the video renderer."""

import os

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


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


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

    try:
        result = render(
            RenderRequest(
                task_id=payload["task_id"],
                language=payload["language"],
                background_url=payload["background_url"],
                hook=payload["hook"],
                body=payload["body"],
                cta=payload["cta"],
                note=payload.get("note"),
                max_body_segments=int(payload.get("max_body_segments", 3)),
                tempo=float(payload.get("tempo", 1.05)),
                output_path=payload.get("output_path"),
            )
        )
    except Exception as error:  # surfaced to the caller so cron can record the failure
        app.logger.exception("Render failed")
        return jsonify({"error": str(error)}), 500

    return jsonify({"url": result.url, "duration": result.duration, "segments": result.segments})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
