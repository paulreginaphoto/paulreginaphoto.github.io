#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import shutil
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image, ImageStat
except ImportError:
    print("ERREUR: Pillow n'est pas installé.")
    print("Installe-le avec : pip install pillow")
    sys.exit(1)


# ============================================================
# CONFIG
# ============================================================

TOOLS_DIR = Path(__file__).resolve().parent
ROOT_DIR = TOOLS_DIR.parent
PHOTOS_DIR = ROOT_DIR / "photos"
BACKUP_DIR = PHOTOS_DIR / "_backup_before_border"
TEMP_DIR = TOOLS_DIR / "_temp_border"

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Bordure type screenshot Instagram
BORDER_RATIO = 0.01      # ~0.85% de la plus petite dimension
BORDER_MIN_PX = 8
BORDER_MAX_PX = 24
BORDER_COLOR = "white"

# Détection de bordure existante
# On regarde une bande sur les 4 côtés.
DETECT_STRIP_RATIO = 0.012
DETECT_STRIP_MIN_PX = 6
DETECT_STRIP_MAX_PX = 28

# Une bordure existante est considérée "blanche" si :
WHITE_MEAN_MIN = 235       # moyenne RGB mini
WHITE_STD_MAX = 18         # variation max = zone assez uniforme

# ============================================================
# UTIL
# ============================================================

def ensure_ffmpeg():
    if shutil.which("ffmpeg") is None:
        print("ERREUR: ffmpeg introuvable dans le PATH.")
        print("Installe ffmpeg ou ajoute-le au PATH Windows.")
        sys.exit(1)

def clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))

def compute_border_px(width: int, height: int) -> int:
    px = round(min(width, height) * BORDER_RATIO)
    return clamp(px, BORDER_MIN_PX, BORDER_MAX_PX)

def compute_detect_strip_px(width: int, height: int) -> int:
    px = round(min(width, height) * DETECT_STRIP_RATIO)
    return clamp(px, DETECT_STRIP_MIN_PX, DETECT_STRIP_MAX_PX)

def is_white_uniform(img: Image.Image) -> bool:
    stat = ImageStat.Stat(img.convert("RGB"))
    means = stat.mean[:3]
    stds = stat.stddev[:3]

    mean_ok = all(m >= WHITE_MEAN_MIN for m in means)
    std_ok = all(s <= WHITE_STD_MAX for s in stds)
    return mean_ok and std_ok

def has_white_border(img_path: Path) -> bool:
    try:
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            w, h = img.size
            if w < 20 or h < 20:
                return False

            s = compute_detect_strip_px(w, h)
            if s * 2 >= w or s * 2 >= h:
                return False

            top = img.crop((0, 0, w, s))
            bottom = img.crop((0, h - s, w, h))
            left = img.crop((0, 0, s, h))
            right = img.crop((w - s, 0, w, h))

            return (
                is_white_uniform(top)
                and is_white_uniform(bottom)
                and is_white_uniform(left)
                and is_white_uniform(right)
            )
    except Exception as e:
        print(f"[WARN] Lecture impossible: {img_path.name} -> {e}")
        return False

def run_ffmpeg_add_border(src: Path, dst: Path, border_px: int):
    dst.parent.mkdir(parents=True, exist_ok=True)

    # On force yuvj / jpeg pour jpg-jpeg, png sinon.
    ext = dst.suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        codec_args = ["-q:v", "2"]
    elif ext == ".png":
        codec_args = ["-compression_level", "2"]
    elif ext == ".webp":
        codec_args = ["-q:v", "95"]
    else:
        codec_args = []

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
        *codec_args,
        str(dst),
    ]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError(f"ffmpeg a échoué sur {src.name}")

def process_image(img_path: Path):
    try:
        with Image.open(img_path) as img:
            w, h = img.size
    except Exception as e:
        print(f"[SKIP] {img_path.name} : lecture impossible ({e})")
        return

    if has_white_border(img_path):
        print(f"[OK] Déjà bordurée : {img_path.name}")
        return

    border_px = compute_border_px(w, h)

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    backup_path = BACKUP_DIR / img_path.name
    temp_path = TEMP_DIR / img_path.name

    print(f"[ADD] {img_path.name} -> bordure {border_px}px")

    shutil.copy2(img_path, backup_path)
    run_ffmpeg_add_border(img_path, temp_path, border_px)
    shutil.move(str(temp_path), str(img_path))

def main():
    ensure_ffmpeg()

    if not PHOTOS_DIR.exists():
        print(f"ERREUR: dossier introuvable : {PHOTOS_DIR}")
        sys.exit(1)

    files = sorted(
        p for p in PHOTOS_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )

    if not files:
        print(f"Aucune image trouvée dans : {PHOTOS_DIR}")
        return

    print("========================================")
    print(" Ajout de bordure blanche type Instagram")
    print("========================================")
    print(f"Dossier : {PHOTOS_DIR}")
    print(f"Fichiers : {len(files)}")
    print("")

    for f in files:
        process_image(f)

    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR, ignore_errors=True)

    print("")
    print("Terminé.")
    print(f"Backup original : {BACKUP_DIR}")

if __name__ == "__main__":
    main()