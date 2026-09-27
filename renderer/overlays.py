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

"""The top eighth of a Short is covered by the player's own controls, so nothing the
viewer needs to read starts above it."""
PERIOD_CENTER_Y = 470
HOOK_CENTER_Y = 760
BODY_CENTER_Y = 1160
CTA_CENTER_Y = 1500

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


def _draw_text(draw: ImageDraw.ImageDraw, xy, text: str, font, fill, language: str) -> None:
    draw.text(xy, text, font=font, fill=fill, direction="rtl" if language in RTL_LANGUAGES else None)


def _fit_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    language: str,
    role: str,
    size: int,
    max_width: float,
    max_lines: int,
) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    """Shrinks the font until the text fits in `max_lines`, so long translations stay inside."""
    while size > 20:
        font = _font(language, role, size)
        lines = wrap_lines(lambda t: draw.textlength(t, font=font), text, language, max_width)
        if len(lines) <= max_lines:
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
) -> int:
    draw = ImageDraw.Draw(img)
    line_height = int(font.size * line_gap)
    total = line_height * len(lines)
    y = center_y - total // 2
    for line in lines:
        x = (WIDTH - draw.textlength(line, font=font)) / 2
        if shadow:
            _draw_text(draw, (x + 3, y + 4), line, font, (0, 0, 0, 170), language)
        _draw_text(draw, (x, y), line, font, fill, language)
        y += line_height
    return total


def scrim(path: str) -> tuple[str, int, int]:
    """Darkens the top and bottom so text keeps contrast over any footage."""
    img = _blank()
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        t = y / HEIGHT
        alpha = int(150 * max(0.0, 1 - t / 0.45) + 165 * max(0.0, (t - 0.55) / 0.45) + 40)
        draw.line([(0, y), (WIDTH, y)], fill=(6, 4, 12, min(alpha, 210)))
    img.save(path)
    return path, 0, 0


def period(path: str, text: str, language: str) -> tuple[str, int, int]:
    """
    Names the sign the reading is for, with the week it covers underneath, so a viewer
    scrolling past knows whose reading it is and an older post still dates itself.

    The first line is the sign and is set large: in a feed of thumbnails it is the only
    word that makes someone stop, so it has to be readable at thumbnail size. The dates
    stay on their own line instead of wrapping wherever they run out of room.
    """
    img = _blank()
    draw = ImageDraw.Draw(img)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    sign, dates = lines[0], lines[1:]

    sign_font, sign_lines = _fit_font(draw, sign, language, "display", 124, WIDTH * 0.84, 1)
    sign_height = sign_font.size * 1.24
    date_font = None
    date_height = 0.0
    if dates:
        date_font, _ = _fit_font(
            draw, max(dates, key=len), language, "button", 46, WIDTH * 0.78, 1
        )
        date_height = date_font.size * 1.3 * len(dates)

    widths = [draw.textlength(sign_lines[0], font=sign_font)]
    if date_font:
        widths += [draw.textlength(line, font=date_font) for line in dates]
    half_height = (sign_height + date_height) / 2 + 30
    width = min(WIDTH * 0.92, max(widths) + 110)
    draw.rounded_rectangle(
        [
            (WIDTH - width) / 2,
            PERIOD_CENTER_Y - half_height,
            (WIDTH + width) / 2,
            PERIOD_CENTER_Y + half_height,
        ],
        radius=min(54, half_height),
        fill=PANEL,
    )

    top = PERIOD_CENTER_Y - (sign_height + date_height) / 2
    _draw_text(
        draw,
        ((WIDTH - widths[0]) / 2, top - sign_font.size * 0.18),
        sign_lines[0],
        sign_font,
        GOLD,
        language,
    )
    if date_font:
        line_height = date_font.size * 1.3
        for index, line in enumerate(dates):
            _draw_text(
                draw,
                (
                    (WIDTH - widths[index + 1]) / 2,
                    top + sign_height + line_height * index - date_font.size * 0.1,
                ),
                line,
                date_font,
                CREAM,
                language,
            )
    return _save_cropped(img, path)


def hook(path: str, text: str, language: str) -> tuple[str, int, int]:
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(draw, text, language, "display", 66, WIDTH * 0.86, 2)
    total = _draw_block(img, lines, font, HOOK_CENTER_Y, language, GOLD, 1.35, True)
    underline_y = HOOK_CENTER_Y + total // 2 + 44
    draw.rounded_rectangle(
        [WIDTH / 2 - 150, underline_y, WIDTH / 2 + 150, underline_y + 8], radius=4, fill=GOLD
    )
    return _save_cropped(img, path)


def body(path: str, text: str, language: str) -> tuple[str, int, int]:
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(draw, text, language, "body", 54, WIDTH * 0.80, 5)
    line_height = int(font.size * 1.62)
    total = line_height * len(lines)
    padding = 60
    draw.rounded_rectangle(
        [
            WIDTH * 0.09,
            BODY_CENTER_Y - total / 2 - padding,
            WIDTH * 0.91,
            BODY_CENTER_Y + total / 2 + padding,
        ],
        radius=44,
        fill=PANEL,
    )
    _draw_block(img, lines, font, BODY_CENTER_Y, language, CREAM, 1.62, False)
    return _save_cropped(img, path)


def cta(path: str, text: str, note: str | None, language: str) -> tuple[str, int, int]:
    img = _blank()
    draw = ImageDraw.Draw(img)
    font, lines = _fit_font(draw, text, language, "button", 52, WIDTH * 0.72, 1)
    width = min(WIDTH * 0.86, draw.textlength(lines[0], font=font) + 150)
    draw.rounded_rectangle(
        [(WIDTH - width) / 2, CTA_CENTER_Y - 62, (WIDTH + width) / 2, CTA_CENTER_Y + 62],
        radius=62,
        fill=GOLD,
    )
    text_width = draw.textlength(lines[0], font=font)
    _draw_text(
        draw,
        ((WIDTH - text_width) / 2, CTA_CENTER_Y - font.size * 0.72),
        lines[0],
        font,
        INK,
        language,
    )
    if note:
        note_font, note_lines = _fit_font(draw, note, language, "body", 38, WIDTH * 0.8, 2)
        _draw_block(img, note_lines, note_font, CTA_CENTER_Y + 118, language, CREAM, 1.3, True)
    return _save_cropped(img, path)
