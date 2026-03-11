#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import shutil
import subprocess
import sys
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_VIDEO = SCRIPT_DIR / "video.mp4"
OUTPUT_VIDEO = SCRIPT_DIR / "video_bordered.mp4"

# Bordure blanche fine type Instagram
BORDER_RATIO = 0.0085   # ~0.85% de la plus petite dimension
BORDER_MIN_PX = 6
BORDER_MAX_PX = 24
BORDER_COLOR = "white"

# Encodage vidéo
# crf plus bas = meilleure qualité / plus gros fichier
VIDEO_CODEC = "libx264"
CRF = "14"
PRESET = "slow"
PIX_FMT = "yuv420p"

# Audio
AUDIO_CODEC = "aac"
AUDIO_BITRATE = "192k"


# ============================================================
# UTIL
# ============================================================

def ensure_ffmpeg():
    if shutil.which("ffmpeg") is None:
        print("ERREUR: ffmpeg introuvable dans le PATH.")
        sys.exit(1)

    if shutil.which("ffprobe") is None:
        print("ERREUR: ffprobe introuvable dans le PATH.")
        sys.exit(1)

def clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))

def get_video_size(path: Path) -> tuple[int, int]:
    cmd = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0:s=x",
        str(path),
    ]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError("Impossible de lire la résolution vidéo.")

    raw = result.stdout.strip()
    if "x" not in raw:
        raise RuntimeError(f"Format de résolution invalide: {raw}")

    w_str, h_str = raw.split("x", 1)
    return int(w_str), int(h_str)

def compute_border_px(width: int, height: int) -> int:
    px = round(min(width, height) * BORDER_RATIO)
    return clamp(px, BORDER_MIN_PX, BORDER_MAX_PX)

def add_border_to_video(src: Path, dst: Path):
    width, height = get_video_size(src)
    border_px = compute_border_px(width, height)

    vf = (
        f"pad="
        f"width=iw+{border_px*2}:"
        f"height=ih+{border_px*2}:"
        f"x={border_px}:"
        f"y={border_px}:"
        f"color={BORDER_COLOR}"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(src),
        "-vf", vf,
        "-c:v", VIDEO_CODEC,
        "-crf", CRF,
        "-preset", PRESET,
        "-pix_fmt", PIX_FMT,
        "-c:a", AUDIO_CODEC,
        "-b:a", AUDIO_BITRATE,
        "-movflags", "+faststart",
        str(dst),
    ]

    print(f"[INFO] Résolution source : {width}x{height}")
    print(f"[INFO] Bordure ajoutée : {border_px}px")
    print(f"[INFO] Sortie : {dst.name}")
    print("")

    result = subprocess.run(cmd)
    if result.returncode != 0:
        raise RuntimeError("ffmpeg a échoué.")

def main():
    ensure_ffmpeg()

    if not INPUT_VIDEO.exists():
        print(f"ERREUR: fichier introuvable : {INPUT_VIDEO}")
        sys.exit(1)

    try:
        add_border_to_video(INPUT_VIDEO, OUTPUT_VIDEO)
        print("")
        print("Terminé.")
    except Exception as e:
        print(f"ERREUR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()