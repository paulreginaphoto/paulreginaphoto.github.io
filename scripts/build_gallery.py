from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "assets" / "photos"
OUTPUT_FILE = ROOT / "assets" / "data" / "gallery.json"
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}


def title_from_name(name: str) -> str:
    stem = Path(name).stem.replace("_", " ").replace("-", " ").strip()
    return " ".join(word.capitalize() for word in stem.split()) or "Photo"


def album_from_path(path: Path) -> str:
    relative_parent = path.relative_to(PHOTOS_DIR).parent
    if str(relative_parent) == ".":
        return "Portfolio"
    return " ".join(part.replace("_", " ").replace("-", " ").title() for part in relative_parent.parts)


def main() -> None:
    items = []
    for file_path in sorted(PHOTOS_DIR.rglob("*")):
        if not file_path.is_file() or file_path.suffix.lower() not in VALID_EXTENSIONS:
            continue
        rel = file_path.relative_to(ROOT).as_posix()
        items.append(
            {
                "src": rel,
                "name": file_path.name,
                "title": title_from_name(file_path.name),
                "album": album_from_path(file_path),
            }
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
