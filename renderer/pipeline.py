"""Turns a script into a finished vertical video.

Each sentence is synthesized on its own, so its caption is shown for exactly as
long as it is spoken and the layout never has to guess the timing.
"""

import os
import tempfile
import urllib.request
from dataclasses import dataclass

import overlays
import storage
import video
from text import split_body_into_segments
from tts import Narrator

MAX_BODY_SEGMENTS = 3
"""Lead-in before the narration, so the opening word is never clipped."""
LEAD_SECONDS = 1.5
"""Silence between spoken segments."""
GAP_SECONDS = 0.3
"""Silent tail after the narration ends."""
TAIL_SECONDS = 1.6
"""Slightly faster than the synthesized rate; keeps the delivery from dragging."""
TEMPO = 1.05
FADE_SECONDS = 0.35


@dataclass
class RenderRequest:
    task_id: str
    language: str
    background_url: str
    hook: str
    body: str
    cta: str
    note: str | None = None
    max_body_segments: int = MAX_BODY_SEGMENTS
    tempo: float = TEMPO
    output_path: str | None = None


@dataclass
class RenderResult:
    url: str
    duration: float
    segments: list[str]


def _download(url: str, path: str) -> str:
    with urllib.request.urlopen(url) as response, open(path, "wb") as file:
        file.write(response.read())
    return path


def render(request: RenderRequest) -> RenderResult:
    segments = split_body_into_segments(request.body, request.max_body_segments)
    spoken = [("hook", request.hook), *[(f"body{i}", text) for i, text in enumerate(segments)]]
    spoken.append(("cta", request.cta))

    with tempfile.TemporaryDirectory() as work:
        narrator = Narrator()
        clips: list[tuple[str, str, float]] = []
        for name, text in spoken:
            path = narrator.synthesize(text, request.language, os.path.join(work, f"{name}.mp3"))
            clips.append((name, path, video.probe_duration(path) / request.tempo))

        starts: dict[str, float] = {}
        cursor = LEAD_SECONDS
        for name, _, duration in clips:
            starts[name] = cursor
            cursor += duration + GAP_SECONDS
        total = round(cursor - GAP_SECONDS + TAIL_SECONDS, 2)

        background = _download(request.background_url, os.path.join(work, "background.mp4"))
        layers: list[tuple[str, float, float]] = [
            (overlays.scrim(os.path.join(work, "scrim.png")), 0.0, total),
            (
                overlays.hook(os.path.join(work, "hook.png"), request.hook, request.language),
                starts["hook"] - 0.5,
                total,
            ),
        ]
        for index, text in enumerate(segments):
            name = f"body{index}"
            duration = next(clip[2] for clip in clips if clip[0] == name)
            layers.append(
                (
                    overlays.body(os.path.join(work, f"{name}.png"), text, request.language),
                    starts[name] - FADE_SECONDS,
                    starts[name] + duration + FADE_SECONDS,
                )
            )
        layers.append(
            (
                overlays.cta(
                    os.path.join(work, "cta.png"), request.cta, request.note, request.language
                ),
                starts["cta"] - 0.4,
                total,
            )
        )

        output = video.build(
            background=background,
            overlays=layers,
            audio=[(path, starts[name]) for name, path, _ in clips],
            tempo=request.tempo,
            total=total,
            output=os.path.join(work, "out.mp4"),
        )
        destination = request.output_path or f"renders/{request.task_id}.mp4"
        url = storage.upload(output, destination)

    return RenderResult(url=url, duration=total, segments=segments)
