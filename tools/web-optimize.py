import sys
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

RAW_DIR = (ROOT_DIR / "raw").resolve()
PHOTOS_DIR = (ROOT_DIR / "photos").resolve()
THUMBS_SCRIPT = (TOOLS_DIR / "make-thumbs.py").resolve()

INPUT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".gif", ".webp"}

WEBP_QUALITY = 82
WEBP_COMPRESSION_LEVEL = 6

PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

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


def get_size_mb(path: Path) -> float:
    if not path.exists():
        return 0.0
    return path.stat().st_size / (1024 * 1024)


def find_source_images(base_dir: Path):
    if not base_dir.exists():
        return []

    files = []
    for path in base_dir.rglob("*"):
        if path.is_file() and path.suffix.lower() in INPUT_EXTENSIONS:
            files.append(path)

    files.sort(key=lambda p: str(p).lower())
    return files


def output_path_for(source_path: Path) -> Path:
    relative = source_path.relative_to(RAW_DIR)
    target = PHOTOS_DIR / relative
    return target.with_suffix(".webp")


def convert_to_webp(source_path: Path, target_path: Path):
    target_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", str(source_path),
        "-map_metadata", "-1",
        "-frames:v", "1",
        "-vf", "format=rgb24",
        "-c:v", "libwebp",
        "-quality", str(WEBP_QUALITY),
        "-compression_level", str(WEBP_COMPRESSION_LEVEL),
        "-preset", "picture",
        str(target_path),
    ]

    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0 or not target_path.exists():
        return False, (result.stderr or "").strip()

    return True, ""


# ==========================================================
# MAIN
# ==========================================================
def main():
    console.print()
    console.print("[bold cyan]Optimisation Web des photos[/bold cyan]")
    console.print(f"[dim]Source : {RAW_DIR}[/dim]")
    console.print(f"[dim]Sortie : {PHOTOS_DIR}[/dim]")
    console.print()

    if not ffmpeg_exists():
        console.print("[bold red]Erreur : FFmpeg n'est pas installé ou non accessible dans le PATH.[/bold red]")
        sys.exit(1)

    if not RAW_DIR.exists():
        console.print(f"[bold red]Erreur : dossier introuvable -> {RAW_DIR}[/bold red]")
        sys.exit(1)

    files = find_source_images(RAW_DIR)

    if not files:
        console.print("[yellow]Aucune image trouvée dans /raw[/yellow]")
        return

    table = Table(show_header=True, header_style="bold white")
    table.add_column("Fichier", style="white")
    table.add_column("Avant", justify="right", style="dim")
    table.add_column("Après", justify="right", style="green")
    table.add_column("Gain", justify="right", style="cyan")
    table.add_column("Statut", justify="center")

    total_before = 0.0
    total_after = 0.0
    success_count = 0
    error_count = 0

    for source in track(files, description="[cyan]Conversion en WebP...[/cyan]"):
        target = output_path_for(source)

        before = get_size_mb(source)
        total_before += before

        ok, error = convert_to_webp(source, target)

        if ok:
            after = get_size_mb(target)
            total_after += after
            success_count += 1

            gain_mb = before - after
            gain_pct = (gain_mb / before * 100) if before > 0 else 0

            table.add_row(
                str(source.relative_to(RAW_DIR)),
                f"{before:.2f} MB",
                f"{after:.2f} MB",
                f"-{gain_pct:.0f}%",
                "[green]OK[/green]"
            )
        else:
            error_count += 1
            table.add_row(
                str(source.relative_to(RAW_DIR)),
                f"{before:.2f} MB",
                "-",
                "-",
                "[red]ERREUR[/red]"
            )
            if target.exists():
                try:
                    target.unlink()
                except Exception:
                    pass

    console.print()
    console.print(table)
    console.print()

    total_gain = total_before - total_after
    total_gain_pct = (total_gain / total_before * 100) if total_before > 0 else 0

    console.print("[bold]Bilan[/bold]")
    console.print(f"Images traitées : [bold]{len(files)}[/bold]")
    console.print(f"Succès         : [green]{success_count}[/green]")
    console.print(f"Erreurs        : [red]{error_count}[/red]")
    console.print(f"Taille avant   : {total_before:.2f} MB")
    console.print(f"Taille après   : {total_after:.2f} MB")
    console.print(f"Gain total     : [cyan]{total_gain:.2f} MB (-{total_gain_pct:.1f}%)[/cyan]")
    console.print()

    if THUMBS_SCRIPT.exists():
        launch_thumbs = Confirm.ask("Lancer maintenant le script de miniatures (make-thumbs.py) ?", default=True)
        if launch_thumbs:
            console.print("[cyan]Lancement de make-thumbs.py...[/cyan]")
            subprocess.run([sys.executable, str(THUMBS_SCRIPT)])
    else:
        console.print(f"[yellow]Script introuvable : {THUMBS_SCRIPT}[/yellow]")


if __name__ == "__main__":
    main()