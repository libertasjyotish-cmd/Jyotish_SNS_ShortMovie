"""Asserts the text layers never touch each other, in every language.

Each block is drawn on its own transparent layer, so an overlap is invisible until the finished
video is watched. This renders the longest real script of every language and compares the drawn
pixels, which is what the viewer sees, rather than the constants the layout was meant to use.
"""

import json
import os
import sys

from PIL import Image

import overlays

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "layout-samples.json")
"""Vertical breathing room each pair of neighbouring blocks must keep."""
MIN_GAP = 8
ORDER = ["period", "hook", "body", "cta", "note"]


def _bounds(layer: tuple[str, int, int]) -> tuple[int, int]:
    path, _, top = layer
    with Image.open(path) as img:
        return top, top + img.height


def _draw(work: str, language: str, copy: dict[str, str], theme: str) -> dict[str, tuple[int, int]]:
    return {
        "period": _bounds(overlays.period(f"{work}/period.png", copy["period"], language, theme)),
        "hook": _bounds(overlays.hook(f"{work}/hook.png", copy["hook"], language, theme)),
        "body": _bounds(overlays.body(f"{work}/body.png", copy["body"], language, theme)),
        "cta": _bounds(overlays.cta(f"{work}/cta.png", copy["cta"], language)),
        "note": _bounds(overlays.note(f"{work}/note.png", copy["note"], language, theme)),
    }


def main() -> int:
    samples = json.load(open(FIXTURE, encoding="utf-8"))
    work = os.environ.get("LAYOUT_WORK_DIR", "/tmp/layout-check")
    os.makedirs(work, exist_ok=True)
    failures: list[str] = []
    for language, copy in samples.items():
        for theme in (overlays.DARK, overlays.LIGHT):
            bounds = _draw(work, language, copy, theme)
            brand_bottom = _bounds(overlays.brand(f"{work}/brand.png"))[1]
            highest = min(top for top, _ in bounds.values())
            if brand_bottom + MIN_GAP > highest:
                failures.append(
                    f"{language}/{theme}: brand ends at {brand_bottom} and the first "
                    f"block starts at {highest}"
                )
            for upper, lower in zip(ORDER, ORDER[1:]):
                gap = bounds[lower][0] - bounds[upper][1]
                if gap < MIN_GAP:
                    failures.append(
                        f"{language}/{theme}: {upper} ends at {bounds[upper][1]} and "
                        f"{lower} starts at {bounds[lower][0]} (gap {gap}px)"
                    )
            bottom = bounds[ORDER[-1]][1]
            if bottom > overlays.HEIGHT:
                failures.append(f"{language}/{theme}: note runs {bottom - overlays.HEIGHT}px off screen")
    for failure in failures:
        print(failure)
    print(f"checked {len(samples)} languages x 2 themes, {len(failures)} overlap(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
