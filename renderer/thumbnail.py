"""Builds the still a video is listed with in YouTube search, channel pages and playlists.

The Shorts feed shows the first frame, but every listing surface shows the thumbnail with a
truncated title, so the sign name has to be readable from the image alone.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import overlays
from text import RTL_LANGUAGES, wrap_lines

WIDTH, HEIGHT = 1280, 720
TITLE_CENTER_Y = 290
BAR_WIDTH = 240
BAR_HEIGHT = 10


def _background(frame_path: str) -> Image.Image:
    """Fills the 16:9 frame with the vertical footage: the centre band, blurred and darkened."""
    frame = Image.open(frame_path).convert("RGB")
    band_height = int(frame.width * HEIGHT / WIDTH)
    top = max(0, (frame.height - band_height) // 2)
    band = frame.crop((0, top, frame.width, top + band_height)).resize((WIDTH, HEIGHT))
    band = band.filter(ImageFilter.GaussianBlur(6))
    return Image.blend(band, Image.new("RGB", (WIDTH, HEIGHT), (6, 4, 12)), 0.45)


def _fit(
    draw: ImageDraw.ImageDraw, text: str, language: str, role: str, size: int, max_lines: int
) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    while size > 28:
        font = overlays._font(language, role, size)
        lines = wrap_lines(lambda t: draw.textlength(t, font=font), text, language, WIDTH * 0.86)
        if len(lines) <= max_lines:
            return font, lines
        size -= 6
    font = overlays._font(language, role, size)
    return font, wrap_lines(lambda t: draw.textlength(t, font=font), text, language, WIDTH * 0.86)


def _draw_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    top: float,
    language: str,
    fill,
    line_gap: float,
) -> float:
    """Draws the lines centred on the 16:9 canvas and returns the y below the block."""
    direction = "rtl" if language in RTL_LANGUAGES else None
    line_height = font.size * line_gap
    y = top
    for line in lines:
        x = (WIDTH - draw.textlength(line, font=font)) / 2
        draw.text((x + 4, y + 5), line, font=font, fill=(0, 0, 0), direction=direction)
        draw.text((x, y), line, font=font, fill=fill, direction=direction)
        y += line_height
    return y


def build(path: str, frame_path: str, title: str, subtitle: str, language: str) -> str:
    img = _background(frame_path)
    draw = ImageDraw.Draw(img)

    title_font, title_lines = _fit(draw, title, language, "display", 170, 2)
    block = title_font.size * 1.15 * len(title_lines)
    bottom = _draw_lines(
        draw,
        title_lines,
        title_font,
        TITLE_CENTER_Y - block / 2,
        language,
        overlays.GOLD[:3],
        1.15,
    )

    bar_y = bottom + 30
    draw.rounded_rectangle(
        [WIDTH / 2 - BAR_WIDTH / 2, bar_y, WIDTH / 2 + BAR_WIDTH / 2, bar_y + BAR_HEIGHT],
        radius=BAR_HEIGHT // 2,
        fill=overlays.GOLD[:3],
    )

    subtitle_font, subtitle_lines = _fit(draw, subtitle, language, "button", 78, 2)
    _draw_lines(
        draw, subtitle_lines, subtitle_font, bar_y + 70, language, overlays.CREAM[:3], 1.25
    )

    img.save(path, "JPEG", quality=88)
    return path
