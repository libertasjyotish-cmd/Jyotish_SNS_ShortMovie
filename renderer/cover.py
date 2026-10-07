"""Builds the still a video is listed with, in the look of the video's own sign plate.

Left alone, Instagram lists a Reel under an arbitrary frame and Facebook under its first one, so
the sign is usually missing from the surfaces a viewer browses. The plate sits in the middle of
the canvas because a listing crops a cover to its centre: Instagram to the middle 9:16 in the
Reels tab and the middle square in the feed grid.

The same drawing serves the 16:9 still YouTube lists a Short with, so every platform shows one
cover.
"""

from PIL import Image, ImageDraw

import overlays
from overlays import DARK, Palette, _draw_text, _fit_font

VERTICAL = (overlays.WIDTH, overlays.HEIGHT)
WIDE = (1280, 720)
VEIL_STRENGTH = 0.3
PLATE_RADIUS = 0.036
PLATE_PADDING = 0.027
SIGN_SIZE = 0.071
SIGN_LINES = 3
CAPTION_SIZE = 0.041
RULE_WIDTH = 0.125
RULE_HEIGHT = 0.004
RULE_GAP = 0.031


def _scale(size: tuple[int, int]) -> float:
    """Type size reference, so the plate reads the same on a tall cover and a wide one."""
    return sum(size) / 2


def _background(frame_path: str, size: tuple[int, int], theme: str) -> Image.Image:
    """Fills the canvas with the frame, cropped from its centre, and veils it evenly.

    The veil is flat rather than a blur so the artwork still reads as the artwork of the video,
    which is what the plate is drawn over in the video itself.
    """
    width, height = size
    frame = Image.open(frame_path).convert("RGB")
    scale = max(width / frame.width, height / frame.height)
    scaled = frame.resize((round(frame.width * scale), round(frame.height * scale)))
    left = (scaled.width - width) // 2
    top = (scaled.height - height) // 2
    cropped = scaled.crop((left, top, left + width, top + height))
    veil = Image.new("RGB", (width, height), Palette(theme).scrim_color)
    return Image.blend(cropped, veil, VEIL_STRENGTH).convert("RGBA")


def build(
    path: str,
    frame_path: str,
    sign: str,
    period: str,
    language: str,
    theme: str = DARK,
    note: str = "",
    size: tuple[int, int] = VERTICAL,
) -> str:
    """
    `note` names the zodiac the sign belongs to, so the cover says the reading is for a sidereal
    moon sign rather than the western sun sign a viewer searching their sign expects.
    """
    width, height = size
    scale = _scale(size)
    palette = Palette(theme)
    img = _background(frame_path, size, theme)
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    # A headline that names the subject rather than a sign is a sentence, so it wraps instead of
    # shrinking to one unreadable line.
    sign_font, sign_lines = _fit_font(
        draw, sign, language, "button", round(scale * SIGN_SIZE), width * 0.78, SIGN_LINES
    )
    captions = [line for line in (note, period) if line]
    caption_font, _ = _fit_font(
        draw,
        max(captions, key=len) if captions else sign,
        language,
        "body",
        round(scale * CAPTION_SIZE),
        width * 0.78,
        1,
    )

    rows = [
        *((line, sign_font) for line in sign_lines),
        *((caption, caption_font) for caption in captions),
    ]
    heights = [round(font.size * 1.3) for _, font in rows]
    plate_width = min(
        width * 0.90,
        max(draw.textlength(text, font=font) for text, font in rows) + width * 0.10,
    )
    half_height = sum(heights) / 2 + scale * PLATE_PADDING
    center_y = height / 2

    draw.rounded_rectangle(
        [
            (width - plate_width) / 2,
            center_y - half_height,
            (width + plate_width) / 2,
            center_y + half_height,
        ],
        radius=round(scale * PLATE_RADIUS),
        fill=palette.panel,
    )

    y = center_y - sum(heights) / 2
    for index, (text, font) in enumerate(rows):
        _draw_text(
            draw,
            ((width - draw.textlength(text, font=font)) / 2, y - font.size * 0.18),
            text,
            font,
            palette.panel_text,
            language,
        )
        y += heights[index]

    rule_width = width * RULE_WIDTH
    rule_height = round(scale * RULE_HEIGHT)
    rule_y = center_y + half_height + scale * RULE_GAP
    draw.rounded_rectangle(
        [
            (width - rule_width) / 2,
            rule_y,
            (width + rule_width) / 2,
            rule_y + rule_height,
        ],
        radius=rule_height // 2,
        fill=palette.heading,
    )

    Image.alpha_composite(img, layer).convert("RGB").save(path, "JPEG", quality=92)
    return path
