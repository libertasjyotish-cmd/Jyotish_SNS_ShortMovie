"""Sentence splitting and line wrapping for on-screen text.

Mirrors `src/lib/text.ts` so the renderer breaks a body script the same way the
Next.js side does.
"""

import re

SENTENCE_END = re.compile(r"(?<=[。．.!?！？])\s*")
COMMAS = "、,"
CJK_LANGUAGES = {"ja"}
RTL_LANGUAGES = {"ar"}

JA_READINGS = [
    ("牡羊座", "おひつじ座"),
    ("牡牛座", "おうし座"),
    ("双子座", "ふたご座"),
    ("蟹座", "かに座"),
    ("獅子座", "しし座"),
    ("乙女座", "おとめ座"),
    ("天秤座", "てんびん座"),
    ("蠍座", "さそり座"),
    ("射手座", "いて座"),
    ("山羊座", "やぎ座"),
    ("水瓶座", "みずがめ座"),
    ("魚座", "うお座"),
    ("月星座", "つきせいざ"),
]


def apply_reading_hints(text: str, language: str) -> str:
    """Kana spellings for words the Japanese voice mispronounces."""
    if language != "ja":
        return text
    for word, reading in JA_READINGS:
        text = text.replace(word, reading)
    return text


def split_sentences(text: str) -> list[str]:
    return [part.strip() for part in SENTENCE_END.split(text) if part.strip()]


def _split_at_comma(sentence: str) -> tuple[str, str] | None:
    positions = [i for i, ch in enumerate(sentence) if ch in COMMAS]
    if not positions:
        return None
    middle = len(sentence) / 2
    cut = min(positions, key=lambda pos: abs(pos - middle))
    head, tail = sentence[: cut + 1].strip(), sentence[cut + 1 :].strip()
    return (head, tail) if head and tail else None


def split_body_into_segments(text: str, maximum: int) -> list[str]:
    """At most `maximum` chunks, each shown on screen on its own."""
    segments = split_sentences(text)
    if not segments:
        return []

    while len(segments) < maximum:
        average = sum(len(segment) for segment in segments) / len(segments)
        index = next(
            (i for i, segment in enumerate(segments) if len(segment) > average * 1.5),
            None,
        )
        split = _split_at_comma(segments[index]) if index is not None else None
        if split is None or index is None:
            break
        segments[index : index + 1] = list(split)

    while len(segments) > maximum:
        shortest = min(
            range(len(segments) - 1),
            key=lambda i: len(segments[i]) + len(segments[i + 1]),
        )
        segments[shortest : shortest + 2] = [segments[shortest] + segments[shortest + 1]]

    return segments


def wrap_lines(measure, text: str, language: str, max_width: float) -> list[str]:
    """Wraps text to `max_width`, per character for CJK and per word otherwise."""
    lines: list[str] = []
    for paragraph in text.split("\n"):
        lines.extend(
            _wrap_characters(measure, paragraph, max_width)
            if language in CJK_LANGUAGES
            else _wrap_words(measure, paragraph, max_width)
        )
    return _rebalance(lines, language)


def _wrap_characters(measure, paragraph: str, max_width: float) -> list[str]:
    lines: list[str] = []
    line = ""
    for char in paragraph:
        if line and measure(line + char) > max_width:
            lines.append(line)
            line = char.lstrip("、。")
        else:
            line += char
    if line:
        lines.append(line)
    return lines


def _wrap_words(measure, paragraph: str, max_width: float) -> list[str]:
    lines: list[str] = []
    line = ""
    for word in paragraph.split():
        candidate = f"{line} {word}".strip()
        if line and measure(candidate) > max_width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def _rebalance(lines: list[str], language: str) -> list[str]:
    """Avoids a dangling one or two character line at the end of a block."""
    if language not in CJK_LANGUAGES:
        return lines
    for i in range(len(lines) - 1):
        if len(lines[i + 1]) <= 2 and len(lines[i]) > 3:
            lines[i + 1] = lines[i][-2:] + lines[i + 1]
            lines[i] = lines[i][:-2]
    return lines
