"""Draws the text layers as transparent PNGs that ffmpeg composites on the video.

Doing the typography in Pillow keeps the layout in code: no editor template and
no per-language template variants.
"""

import os

from PIL import Image, ImageDraw, ImageFont

from text import RTL_LANGUAGES, wrap_lines

WIDTH, HEIGHT = 1080, 1920
FONT_DIR = os.environ.get("FONT_DIR", "/opt/fonts")

GOLD = (240, 205, 130, 255)
INK = (18, 13, 6, 255)
CREAM = (253, 246, 231, 255)
PANEL = (10, 7, 18, 150)
SLATE = (28, 44, 70, 255)
LIGHT_PANEL = (253, 248, 236, 205)
OUTLINE = (70, 38, 18, 235)
"""The plate under the sign and the week: opaque enough that the artwork never shows through it."""
PERIOD_PANEL = (12, 16, 38, 212)
"""Hairline around the period plate; `None` draws it without a border."""
PERIOD_PANEL_BORDER: tuple[int, int, int, int] | None = (240, 205, 130, 150)
PANEL_BORDER_WIDTH = 2
"""Outline widths that keep text readable on bright footage without veiling the background."""
HOOK_OUTLINE = 7
NOTE_OUTLINE = 4

DARK = "dark"
LIGHT = "light"


class Palette:
    """Colours of one theme: `dark` suits footage, `light` suits pale illustrated art."""

    def __init__(self, theme: str) -> None:
        light = theme == LIGHT
        self.heading = SLATE if light else CREAM
        self.text = SLATE if light else CREAM
        self.panel = LIGHT_PANEL if light else PANEL
        self.panel_text = SLATE if light else GOLD
        self.shadow = not light
        self.scrim_color = (255, 252, 244) if light else (6, 4, 12)
        """Alpha of the veil at the top, at the bottom and across the middle."""
        self.scrim_alpha = (80, 95, 0) if light else (0, 0, 0)


PERIOD_CENTER_Y = 270
HOOK_CENTER_Y = 555
BODY_CENTER_Y = 1035
CTA_CENTER_Y = 1500
NOTE_CENTER_Y = 1750
"""Lines a CTA banner may wrap to; the caller splits longer text into parts instead."""
CTA_MAX_LINES = 3

"""
Each block owns a band of the frame and its type shrinks until it fits, so a long translation
never grows into the block below it. The bands leave a gap between neighbours.
"""
PERIOD_MAX_HEIGHT = 156
HOOK_MAX_HEIGHT = 310
"""Space the underline needs under the hook text."""
HOOK_UNDERLINE_GAP = 40
BODY_MAX_HEIGHT = 410
BODY_PADDING = 60
CTA_MAX_HEIGHT = 292
NOTE_MAX_HEIGHT = 100

FONTS: dict[str, dict[str, tuple[str, str | None]]] = {
    "ja": {
        "display": ("MPLUS1p-Black.ttf", None),
        "body": ("MPLUS1p-Medium.ttf", None),
        "button": ("MPLUS1p-Bold.ttf", None),
    },
    "ar": {
        "display": ("NotoNaskhArabic.ttf", "Bold"),
        "body": ("NotoNaskhArabic.ttf", "Regular"),
        "button": ("NotoNaskhArabic.ttf", "Bold"),
    },
    "default": {
        "display": ("Montserrat.ttf", "ExtraBold"),
        "body": ("Montserrat.ttf", "Medium"),
        "button": ("Montserrat.ttf", "Bold"),
    },
}


def _font(language: str, role: str, size: int) -> ImageFont.FreeTypeFont:
    filename, variation = FONTS.get(language, FONTS["default"])[role]
    font = ImageFont.truetype(os.path.join(FONT_DIR, filename), size)
    if variation:
        font.set_variation_by_name(variation)
    return font


def _blank() -> Image.Image:
    return Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))


def _save_cropped(img: Image.Image, path: str) -> tuple[str, int, int]:
    """Trims the transparent margin: ffmpeg then decodes a small layer instead of 1080x1920."""
    box = img.getbbox()
    if box is None:
        img.save(path)
        return path, 0, 0
    left, top, right, bottom = box
    img.crop((left, top, right, bottom)).save(path)
    return path, left, top


def _panel(img: Image.Image, box, radius: float, fill, border=None) -> None:
    """Lays the plate the text is read on, with an optional hairline around it."""
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(box, radius=radius, fill=fill)
    if border:
        draw.rounded_rectangle(box, radius=radius, outline=border, width=PANEL_BORDER_WIDTH)


def _draw_text(
    draw: ImageDraw.ImageDraw, xy, text: str, font, fill, language: str, outline: int = 0
) -> None:
    draw.text(
        xy,
        text,
        font=font,
        fill=fill,
        direction="rtl" if language in RTL_LANGUAGES else None,
        stroke_width=outline,
        stroke_fill=OUTLINE if outline else None,
    )


def _fit_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    language: str,
    role: str,
    size: int,
    max_width: float,
    max_lines: int,
    max_height: float | None = None,
    line_gap: float = 1.0,
) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    """
    Shrinks the font until the text fits in `max_lines` and, when given, in `max_height`, so a
    long translation stays inside its own band instead of running into the block below it.
    """
    while size > 20:
        font = _font(language, role, size)
        lines = wrap_lines(lambda t: draw.textlength(t, font=font), text, language, max_width)
        fits_height = max_height is None or int(size * line_gap) * len(lines) <= max_height
        if len(lines) <= max_lines and fits_height:
            return font, lines
        size -= 4
    font = _font(language, role, size)
    return font, wrap_lines(lambda t: draw.textlength(t, font=font), text, language, max_width)


def _draw_block(
    img: Image.Image,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    center_y: int,
    language: str,
    fill,
    line_gap: float,
    shadow: bool,
    outline: int = 0,
) -> int:
    draw = ImageDraw.Draw(img)
    line_height = int(font.size * line_gap)
    total = line_height * len(lines)
    y = center_y - total // 2
    for line in lines:
        x = (WIDTH - draw.textlength(line, font=font)) / 2
        if shadow and not outline:
            _draw_text(draw, (x + 3, y + 4), line, font, (0, 0, 0, 170), language)
        _draw_text(draw, (x, y), line, font, fill, language, outline)
        y += line_height
    return total


def scrim(path: str, theme: str = DARK) -> tuple[str, int, int] | None:
    """Veils the top and bottom for contrast, lifting pale artwork. `None` leaves the art as is."""
    palette = Palette(theme)
    top, bottom, base = palette.scrim_alpha
    if not any(palette.scrim_alpha):
        return None
    img = _blank()
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        t = y / HEIGHT
        alpha = int(top * max(0.0, 1 - t / 0.45) + bottom * max(0.0, (t - 0.55) / 0.45) + base)
        draw.line([(0, y), (WIDTH, y)], fill=(*palette.scrim_color, min(alpha, 210)))
    img.save(path)
    return path, 0, 0


def period(path: str, text: str, language: str, theme: str = DARK) -> tuple[str, int, int]:
    """
    Labels the reading above the hook with the sign it is for and the week it covers, so a
    viewer scrolling past knows whose reading it is and an older post still dates itself.

    Newlines in the text are kept as written, so the sign and the dates stay on their own lines
    instead of the date range wrapping wherever it happens to run out of room.
    """
    img = _blank()
    draw = ImageDraw.Draw(img)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    font, _ = _fit_font(
        draw,
        max(lines, key=len),
        language,
        "button",
        62,
        WIDTH * 0.78,
        1,
        PERIOD_MAX_HEIGHT / max(len(lines), 1),
        1.25,
    )
    widths = [draw.textlength(line, font=font) for line in lines]
    line_height = font.size * 1.25
    half_height = line_height * len(lines) / 2 + 22
    width = min(WIDTH * 0.84, max(widths) + 96)
    _panel(
        img,
        [
            (WIDTH - width) / 2,
            PERIOD_CENTER_Y - half_height,
            (WIDTH + width) / 2,
            PERIOD_CENTER_Y + half_height,
        ],
        min(46, half_height),
        PERIOD_PANEL if theme == DARK else Palette(theme).panel,
        PERIOD_PANEL_BORDER if theme == DARK else None,
    )
    top = PERIOD_CENTER_Y - line_height * len(lines) / 2 - font.size * 0.20
    for index, line in enumerate(lines):
        _draw_text(
            draw,
            ((WIDTH - widths[index]) / 2, top + line_height * index),
            line,
            font,
            Palette(theme).panel_text,
            language,
        )
    return _save_cropped(img, path)


def hook(path: str, text: str, language: str, theme: str = DARK) -> tuple[str, int, int]:
    palette = Palette(theme)
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(
        draw, text, language, "display", 82, WIDTH * 0.90, 3, HOOK_MAX_HEIGHT, 1.35
    )
    total = _draw_block(
        img, lines, font, HOOK_CENTER_Y, language, palette.heading, 1.35, palette.shadow, HOOK_OUTLINE if palette.shadow else 0
    )
    underline_y = HOOK_CENTER_Y + total // 2 + HOOK_UNDERLINE_GAP
    draw.rounded_rectangle(
        [WIDTH / 2 - 150, underline_y, WIDTH / 2 + 150, underline_y + 8],
        radius=4,
        fill=SLATE if theme == LIGHT else GOLD,
    )
    return _save_cropped(img, path)


def body(path: str, text: str, language: str, theme: str = DARK) -> tuple[str, int, int]:
    palette = Palette(theme)
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(
        draw, text, language, "body", 58, WIDTH * 0.80, 6, BODY_MAX_HEIGHT, 1.62
    )
    line_height = int(font.size * 1.62)
    total = line_height * len(lines)
    padding = BODY_PADDING
    _panel(
        img,
        [
            WIDTH * 0.09,
            BODY_CENTER_Y - total / 2 - padding,
            WIDTH * 0.91,
            BODY_CENTER_Y + total / 2 + padding,
        ],
        44,
        palette.panel,
    )
    _draw_block(img, lines, font, BODY_CENTER_Y, language, palette.text, 1.62, False)
    return _save_cropped(img, path)


def cta(path: str, text: str, language: str) -> tuple[str, int, int]:
    """One banner; the gold panel grows with the wrapped text so nothing is cut off."""
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(
        draw, text, language, "button", 60, WIDTH * 0.78, CTA_MAX_LINES, CTA_MAX_HEIGHT, 1.3
    )
    line_height = int(font.size * 1.3)
    half_height = line_height * len(lines) / 2 + 34
    width = min(WIDTH * 0.92, max(draw.textlength(line, font=font) for line in lines) + 110)
    draw.rounded_rectangle(
        [
            (WIDTH - width) / 2,
            CTA_CENTER_Y - half_height,
            (WIDTH + width) / 2,
            CTA_CENTER_Y + half_height,
        ],
        radius=min(62, half_height),
        fill=GOLD,
    )
    _draw_block(img, lines, font, CTA_CENTER_Y, language, INK, 1.3, False)
    return _save_cropped(img, path)


def note(path: str, text: str, language: str, theme: str = DARK) -> tuple[str, int, int]:
    palette = Palette(theme)
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(
        draw, text, language, "body", 40, WIDTH * 0.8, 2, NOTE_MAX_HEIGHT, 1.3
    )
    _draw_block(img, lines, font, NOTE_CENTER_Y, language, palette.text, 1.3, palette.shadow, NOTE_OUTLINE if palette.shadow else 0)
    return _save_cropped(img, path)
