#!/usr/bin/env python3
"""Create narration audio and slideshow videos. Runs inside the media tool image.

For every artifact in content.json:
  * a<ID>_audio.mp3  Vietnamese synthetic narration of name and description;
  * a<ID>_video.mp4  the artifact's photos with slow zoom and that narration.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = HERE.parents[1] / "demo-content" / "media"
VOICE = "vi_VN-vais1000-medium"
VOICE_DIR = "/voices"
WIDTH, HEIGHT, FPS = 1280, 720, 25


def run(command: list[str], **kwargs) -> None:
    subprocess.run(command, check=True, **kwargs)


def narrate(text: str, wav: Path) -> float:
    run([sys.executable, "-m", "piper", "-m", VOICE, "--data-dir", VOICE_DIR,
         "--sentence-silence", "0.35", "-f", str(wav)],
        input=text.encode("utf-8"), stdout=subprocess.DEVNULL)
    with wave.open(str(wav), "rb") as handle:
        return handle.getnframes() / handle.getframerate()


def segment(image: Path, seconds: float, zoom_in: bool, target: Path) -> None:
    """One still photo, fitted over a blurred copy of itself, slowly zooming."""
    frames = max(1, round(seconds * FPS))
    big_w, big_h = WIDTH * 2, HEIGHT * 2
    step = 0.08 / frames
    zoom = f"1+{step:.8f}*on" if zoom_in else f"1.08-{step:.8f}*on"
    graph = (
        f"[0:v]split=2[a][b];"
        f"[a]scale={big_w}:{big_h}:force_original_aspect_ratio=increase,"
        f"crop={big_w}:{big_h},boxblur=40:2,eq=brightness=-0.15[bg];"
        f"[b]scale={big_w}:{big_h}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2,"
        f"zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS},"
        f"fade=t=in:st=0:d=0.5,fade=t=out:st={max(0.0, seconds - 0.5):.3f}:d=0.5,"
        # JPEG sources are full range; phones expect limited-range video.
        f"scale=out_range=tv,format=yuv420p[v]"
    )
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(image),
         "-filter_complex", graph, "-map", "[v]", "-frames:v", str(frames),
         "-c:v", "libx264", "-preset", "medium", "-crf", "27", "-profile:v", "main",
         "-color_range", "tv",
         str(target)])


def build(artifact: dict, state: dict) -> None:
    prefix = f"a{artifact['artifactId']:02d}"
    images = sorted(MEDIA.glob(f"{prefix}_image*.jpg"))[: len(artifact["images"])]
    if len(images) != len(artifact["images"]):
        raise SystemExit(f"Missing images for {prefix}; run fetch_media.py first")

    text = f"{artifact['name']}. {artifact['description']}"
    audio = MEDIA / f"{prefix}_audio.mp3"
    video = MEDIA / f"{prefix}_video.mp4"
    signature = hashlib.sha256(
        text.encode("utf-8")
        + Path(__file__).read_bytes()  # re-render when the recipe changes
        + b"".join(image.read_bytes() for image in images)
    ).hexdigest()
    if audio.exists() and video.exists() and state.get(prefix) == signature:
        return

    with tempfile.TemporaryDirectory() as temp:
        work = Path(temp)
        wav = work / "narration.wav"
        duration = narrate(text, wav) + 0.8
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
             "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1",
             "-c:a", "libmp3lame", "-b:a", "96k", str(audio)])

        # Show at least four shots so that a single photo still moves.
        shots = max(len(images), 4)
        listing = []
        for index in range(shots):
            part = work / f"part{index}.mp4"
            segment(images[index % len(images)], duration / shots, index % 2 == 0, part)
            listing.append(f"file '{part}'")
        (work / "parts.txt").write_text("\n".join(listing), encoding="utf-8")
        run(["ffmpeg", "-y", "-loglevel", "error",
             "-f", "concat", "-safe", "0", "-i", str(work / "parts.txt"),
             "-i", str(audio), "-map", "0:v", "-map", "1:a",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "96k",
             "-movflags", "+faststart", "-shortest", str(video)])

    state[prefix] = signature
    print(f"{prefix}  {duration:5.1f}s  audio {audio.stat().st_size // 1024} KB  "
          f"video {video.stat().st_size // 1024} KB", flush=True)


def main() -> None:
    content = json.loads((HERE / "content.json").read_text(encoding="utf-8"))
    state_path = MEDIA / "build-state.json"
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
    for artifact in content["artifacts"]:
        build(artifact, state)
        state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    total = sum(path.stat().st_size for path in MEDIA.iterdir())
    print(f"media folder: {total / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
