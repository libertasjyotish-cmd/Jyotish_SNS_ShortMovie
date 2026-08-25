"""Composites background, text layers and narration into the finished MP4."""

import subprocess

FPS = 30
CRF = "20"


def probe_duration(path: str) -> float:
    output = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]
    )
    return float(output.strip())


def build(
    background: str,
    overlays: list[tuple[str, float, float]],
    audio: list[tuple[str, float]],
    tempo: float,
    total: float,
    output: str,
) -> str:
    """`overlays` are (png, show_at, hide_at) and `audio` are (mp3, start) in seconds."""
    inputs: list[str] = ["-stream_loop", "-1", "-i", background]
    for path, _ in audio:
        inputs += ["-i", path]
    for path, _, _ in overlays:
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{total}", "-i", path]

    chain = [
        f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
        f"setsar=1,fps={FPS},trim=duration={total},setpts=PTS-STARTPTS[v0]"
    ]
    previous = "v0"
    for index, (_, show_at, hide_at) in enumerate(overlays):
        stream = 1 + len(audio) + index
        fade_out = "" if hide_at >= total else f",fade=t=out:st={hide_at:.2f}:d=0.45:alpha=1"
        chain.append(
            f"[{stream}:v]format=rgba,fade=t=in:st={max(show_at, 0):.2f}:d=0.6:alpha=1"
            f"{fade_out}[o{index}]"
        )
        chain.append(f"[{previous}][o{index}]overlay=0:0:format=auto[v{index + 1}]")
        previous = f"v{index + 1}"
    chain.append(f"[{previous}]format=yuv420p[vout]")

    for index, (_, start) in enumerate(audio):
        delay = int(start * 1000)
        chain.append(f"[{index + 1}:a]atempo={tempo},adelay={delay}|{delay}[a{index}]")
    chain.append(
        "".join(f"[a{index}]" for index in range(len(audio)))
        + f"amix=inputs={len(audio)}:normalize=0:duration=longest,"
        f"apad,atrim=duration={total},aresample=48000[aout]"
    )

    subprocess.run(
        [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(chain),
            "-map", "[vout]", "-map", "[aout]",
            "-t", f"{total}",
            "-c:v", "libx264", "-preset", "medium", "-crf", CRF, "-pix_fmt", "yuv420p",
            "-r", str(FPS), "-movflags", "+faststart",
            "-c:a", "aac", "-b:a", "192k",
            output,
        ],
        check=True,
        capture_output=True,
    )
    return output
