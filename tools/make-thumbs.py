import sys
import json
import subprocess
from pathlib import Path

# ==========================================================
# INSTALL AUTO DES DEPENDANCES
# ==========================================================
def ensure_dependencies():
    try:
        import rich  # noqa: F401
    except ImportError:
        print("[!] Dépendance manquante : installation de 'rich'...")
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "rich", "--quiet"]
            )
            print("[OK] 'rich' installé.")
        except Exception as e:
            print(f"[ERREUR] Impossible d'installer 'rich' : {e}")
            sys.exit(1)


ensure_dependencies()

from rich.console import Console
from rich.table import Table
from rich.progress import track
from rich.prompt import Confirm

# ==========================================================
# CONFIG
# ==========================================================
console = Console()

TOOLS_DIR = Path(__file__).resolve().parent
ROOT_DIR = TOOLS_DIR.parent

PHOTOS_DIR = (ROOT_DIR / "photos").resolve()
THUMBS_DIR = (ROOT_DIR / "thumbs").resolve()
DATA_DIR = (ROOT_DIR / "_data").resolve()
THUMBS_JSON = (DATA_DIR / "thumbs.json").resolve()

GIT_PUSH_BAT = (TOOLS_DIR / "git-push.bat").resolve()

THUMB_WIDTH = 600
THUMB_QUALITY = 70
THUMB_COMPRESSION_LEVEL = 6

THUMBS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================================
# OUTILS
# ==========================================================
def ffmpeg_exists() -> bool:
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def ffprobe_exists() -> bool:
    try:
        result = subprocess.run(
            ["ffprobe", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def get_size_kb(path: Path) -> float:
    if not path.exists():
        return 0.0
    return path.stat().st_size / 1024


def find_webp_files(base_dir: Path):
    if not base_dir.exists():
        return []

    files = [p for p in base_dir.rglob("*.webp") if p.is_file()]
    files.sort(key=lambda p: str(p).lower())
    return files


def thumb_path_for(photo_path: Path) -> Path:
    relative = photo_path.relative_to(PHOTOS_DIR)
    return THUMBS_DIR / relative


def make_thumb(source_path: Path, target_path: Path):
    target_path.parent.mkdir(parents=True, exist_ok=True)

    scale_filter = f"scale='min({THUMB_WIDTH},iw)':-2"

    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", str(source_path),
        "-map_metadata", "-1",
        "-frames:v", "1",
        "-vf", scale_filter,
        "-c:v", "libwebp",
        "-quality", str(THUMB_QUALITY),
        "-compression_level", str(THUMB_COMPRESSION_LEVEL),
        "-preset", "picture",
        str(target_path),
    ]

    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0 or not target_path.exists():
        return False, (result.stderr or "").strip()

    return True, ""


def ffprobe_dimensions(image_path: Path):
    """
    Retourne (w, h) via ffprobe ou (None, None) si impossible.
    """
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0:s=x",
            str(image_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return None, None

        out = (result.stdout or "").strip()
        if "x" not in out:
            return None, None

        w_str, h_str = out.split("x", 1)
        w = int(w_str.strip())
        h = int(h_str.strip())
        if w <= 0 or h <= 0:
            return None, None
        return w, h
    except Exception:
        return None, None


def write_thumbs_json(thumb_files):
    """
    Ecrit /_data/thumbs.json avec les dimensions de chaque thumb.
    Clé = file.path Jekyll (ex: "/thumbs/abc.webp")
    Valeur = {"w": 600, "h": 842}
    """
    data = {}
    for thumb in thumb_files:
        rel = thumb.relative_to(ROOT_DIR).as_posix()  # "thumbs/abc.webp"
        key = "/" + rel                              # "/thumbs/abc.webp"
        w, h = ffprobe_dimensions(thumb)
        if w is None or h is None:
            continue
        data[key] = {"w": w, "h": h}

    # JSON stable (diffs propres git)
    with THUMBS_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

    return len(data)

# ==========================================================
# MAIN
# ==========================================================
def main():
    console.print()
    console.print("[bold cyan]Génération des miniatures[/bold cyan]")
    console.print(f"[dim]Source : {PHOTOS_DIR}[/dim]")
    console.print(f"[dim]Sortie : {THUMBS_DIR}[/dim]")
    console.print(f"[dim]Data   : {THUMBS_JSON}[/dim]")
    console.print()

    if not ffmpeg_exists():
        console.print("[bold red]Erreur : FFmpeg n'est pas installé ou non accessible dans le PATH.[/bold red]")
        sys.exit(1)

    if not ffprobe_exists():
        console.print("[bold red]Erreur : FFprobe n'est pas installé ou non accessible dans le PATH.[/bold red]")
        console.print("[dim]FFprobe est fourni avec FFmpeg (normalement dans le même dossier).[/dim]")
        sys.exit(1)

    if not PHOTOS_DIR.exists():
        console.print(f"[bold red]Erreur : dossier introuvable -> {PHOTOS_DIR}[/bold red]")
        sys.exit(1)

    photo_files = find_webp_files(PHOTOS_DIR)

    if not photo_files:
        console.print("[yellow]Aucune image WebP trouvée dans /photos[/yellow]")
        return

    missing = []
    for photo in photo_files:
        thumb = thumb_path_for(photo)
        if not thumb.exists():
            missing.append((photo, thumb))

    if not missing:
        console.print("[green]Toutes les miniatures existent déjà.[/green]")
    else:
        table = Table(show_header=True, header_style="bold white")
        table.add_column("Fichier", style="white")
        table.add_column("Photo", justify="right", style="dim")
        table.add_column("Miniature", justify="right", style="green")
        table.add_column("Statut", justify="center")

        created = 0
        errors = 0

        for photo, thumb in track(missing, description="[cyan]Création des miniatures...[/cyan]"):
            source_size = get_size_kb(photo)

            ok, error = make_thumb(photo, thumb)

            if ok:
                thumb_size = get_size_kb(thumb)
                created += 1
                table.add_row(
                    str(photo.relative_to(PHOTOS_DIR)),
                    f"{source_size:.0f} KB",
                    f"{thumb_size:.0f} KB",
                    "[green]OK[/green]"
                )
            else:
                errors += 1
                table.add_row(
                    str(photo.relative_to(PHOTOS_DIR)),
                    f"{source_size:.0f} KB",
                    "-",
                    "[red]ERREUR[/red]"
                )
                if thumb.exists():
                    try:
                        thumb.unlink()
                    except Exception:
                        pass

        console.print()
        console.print(table)
        console.print()
        console.print(f"[bold]Miniatures créées :[/bold] [green]{created}[/green]")
        console.print(f"[bold]Erreurs :[/bold] [red]{errors}[/red]")
        console.print()

    # Toujours (re)générer thumbs.json pour inclure nouvelles + existantes
    thumb_files = find_webp_files(THUMBS_DIR)
    written = write_thumbs_json(thumb_files)
    console.print(f"[cyan]/_data/thumbs.json généré.[/cyan] Entrées: [bold]{written}[/bold]")
    console.print("[dim]Important : commit/push aussi le dossier /_data pour que Jekyll le voie.[/dim]")
    console.print()

    if GIT_PUSH_BAT.exists():
        launch_git = Confirm.ask("Lancer maintenant git-push.bat ?", default=False)
        if launch_git:
            console.print("[cyan]Lancement de git-push.bat...[/cyan]")
            if sys.platform.startswith("win"):
                subprocess.run([str(GIT_PUSH_BAT)], shell=True)
            else:
                console.print("[yellow]git-push.bat est prévu pour Windows.[/yellow]")
    else:
        console.print(f"[yellow]Fichier introuvable : {GIT_PUSH_BAT}[/yellow]")


if __name__ == "__main__":
    main()