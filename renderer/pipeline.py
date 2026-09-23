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

"""On-screen text per body segment; more than this and `overlays.body` shrinks the font."""
CHARS_PER_SEGMENT = {"ja": 70, "default": 150}
MAX_BODY_SEGMENTS = 6
MIN_BODY_SEGMENTS = 2
"""Lead-in before the narration, so the opening word is never clipped."""
LEAD_SECONDS = 1.0
"""Silence between spoken segments; also the window each body caption swaps in."""
GAP_SECONDS = 0.5
"""Silent tail after the narration ends."""
TAIL_SECONDS = 1.6
"""Slightly faster than the synthesized rate; keeps the delivery from dragging."""
TEMPO = 1.05
"""How far the speaking rate may be pushed up to land inside the target duration."""
TEMPO_BOUNDS = (1.0, 1.3)


@dataclass
class RenderRequest:
    task_id: str
    language: str
    background_url: str
    hook: str
    body: str
    cta: str
    note: str | None = None
    """Dated week a sign reading covers; empty for evergreen themes."""
    period: str | None = None
    max_body_segments: int | None = None
    tempo: float = TEMPO
    output_path: str | None = None
    target_min: float | None = None
    target_max: float | None = None


@dataclass
class RenderResult:
    url: str
    duration: float
    segments: list[str]


def _download(url: str, path: str) -> str:
    with urllib.request.urlopen(url) as response, open(path, "wb") as file:
        file.write(response.read())
    return path


def _synthesize(
    narrator: Narrator, spoken: list[tuple[str, str]], request: RenderRequest, work: str, tempo: float
) -> list[tuple[str, str, float]]:
    clips: list[tuple[str, str, float]] = []
    for name, text in spoken:
        path = narrator.synthesize(
            text, request.language, os.path.join(work, f"{name}.mp3"), tempo
        )
        # The synthesizer pads each clip with silence of its own, which would otherwise
        # stack on top of GAP_SECONDS and make the delivery drag between sentences.
        path = video.trim_silence(path)
        clips.append((name, path, video.probe_duration(path)))
    return clips


def _fitted_tempo(request: RenderRequest, speech: float, gaps: float, tempo: float) -> float | None:
    """Speaking rate that lands the video inside its target, or None when it already does.

    Only ever faster: a short script is stretched by holding the closing frame instead of
    slowing the voice down, which sounds unnatural well before it reaches the target.
    """
    if request.target_min is None or request.target_max is None:
        return None
    overhead = LEAD_SECONDS + TAIL_SECONDS + gaps
    total = speech + overhead
    if total <= request.target_max:
        return None
    wanted = (request.target_min + request.target_max) / 2 - overhead
    if wanted <= 0:
        return None
    fitted = round(tempo * speech / wanted, 3)
    return min(max(fitted, tempo), TEMPO_BOUNDS[1])


def _segment_count(request: RenderRequest) -> int:
    """A 65s body holds three times the text of a 30s one, so the chunk count follows it."""
    if request.max_body_segments is not None:
        return request.max_body_segments
    budget = CHARS_PER_SEGMENT.get(request.language, CHARS_PER_SEGMENT["default"])
    wanted = -(-len(request.body) // budget)
    return min(max(wanted, MIN_BODY_SEGMENTS), MAX_BODY_SEGMENTS)


def render(request: RenderRequest) -> RenderResult:
    segments = split_body_into_segments(request.body, _segment_count(request))
    spoken = [("hook", request.hook), *[(f"body{i}", text) for i, text in enumerate(segments)]]
    spoken.append(("cta", request.cta))

    with tempfile.TemporaryDirectory() as work:
        narrator = Narrator()
        clips = _synthesize(narrator, spoken, request, work, request.tempo)

        gaps = GAP_SECONDS * (len(clips) - 1)
        speech = sum(clip[2] for clip in clips)
        fitted = _fitted_tempo(request, speech, gaps, request.tempo)
        if fitted is not None and fitted != request.tempo:
            clips = _synthesize(narrator, spoken, request, work, fitted)

        starts: dict[str, float] = {}
        cursor = LEAD_SECONDS
        for name, _, duration in clips:
            starts[name] = cursor
            cursor += duration + GAP_SECONDS
        total = round(cursor - GAP_SECONDS + TAIL_SECONDS, 2)
        # A rate change alone cannot always reach the minimum; the CTA simply holds longer.
        if request.target_min is not None and total < request.target_min:
            total = request.target_min

        background = _download(request.background_url, os.path.join(work, "background.mp4"))
        layers: list[tuple[str, int, int, float, float]] = [
            (*overlays.scrim(os.path.join(work, "scrim.png")), 0.0, total),
            (
                *overlays.hook(os.path.join(work, "hook.png"), request.hook, request.language),
                starts["hook"] - 0.5,
                total,
            ),
        ]
        if request.period:
            layers.append(
                (
                    *overlays.period(
                        os.path.join(work, "period.png"), request.period, request.language
                    ),
                    0.0,
                    total,
                )
            )
        for index, text in enumerate(segments):
            name = f"body{index}"
            duration = next(clip[2] for clip in clips if clip[0] == name)
            layers.append(
                (
                    *overlays.body(os.path.join(work, f"{name}.png"), text, request.language),
                    # A caption fades in exactly where the previous one finished fading
                    # out, so two body texts are never legible at once.
                    starts[name] - (GAP_SECONDS - video.FADE_OUT),
                    starts[name] + duration,
                )
            )
        layers.append(
            (
                *overlays.cta(
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
            total=total,
            output=os.path.join(work, "out.mp4"),
        )
        destination = request.output_path or f"renders/{request.task_id}.mp4"
        url = storage.upload(output, destination)

    return RenderResult(url=url, duration=total, segments=segments)
