from pathlib import Path
import subprocess
from rich.console import Console
from rich.progress import track
from rich.table import Table

# =============================
BASE_DIR = Path(__file__).resolve().parent
INPUT_FOLDER = (BASE_DIR / "../raw").resolve()
OUTPUT_FOLDER = (BASE_DIR / "../photos").resolve()
MAX_SIZE_MB = 1.5
START_QUALITY = 95
MIN_QUALITY = 85

# Formats d'entrée
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".gif")

console = Console()
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

# =============================
def get_size_mb(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)

def compress_image(input_path: Path, output_path: Path):
    quality = START_QUALITY
    original_size = get_size_mb(input_path)

    while quality >= MIN_QUALITY:
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(input_path),
            "-map_metadata", "-1",
            "-c:v", "mjpeg",
            "-q:v", str(int((100 - quality) / 2)),
            "-pix_fmt", "yuvj444p",
            str(output_path)
        ]
        result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode != 0 or not output_path.exists():
            return original_size, None, quality, "error"

        size = get_size_mb(output_path)
        if size <= MAX_SIZE_MB:
            return original_size, size, quality, "ok"
        quality -= 2

    return original_size, size, quality, "warn"

# =============================
# Lister tous les fichiers images
files = [f for f in INPUT_FOLDER.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS]
if not files:
    console.print(f"[bold red]Aucune image trouvée dans {INPUT_FOLDER}[/bold red]")
    exit()

console.print(f"[bold cyan]Compression de {len(files)} images depuis[/bold cyan] {INPUT_FOLDER}")
console.print(f"[bold cyan]Sortie dans[/bold cyan] {OUTPUT_FOLDER}\n")

table = Table(title="Résultat Compression", show_lines=True)
table.add_column("Fichier", style="bold", max_width=40)
table.add_column("Taille avant", justify="right")
table.add_column("Taille après", justify="right")
table.add_column("Gain", justify="right")
table.add_column("Qualité finale", justify="center")
table.add_column("Note", justify="center")

total_before = 0
total_after = 0

for file in track(files, description="Traitement des images..."):
    # Force l'extension de sortie en .jpg
    output_file = OUTPUT_FOLDER / (file.stem + ".jpg")
    size_before, size_after, quality, status = compress_image(file, output_file)

    total_before += size_before
    total_after += size_after if size_after else 0

    if status == "ok":
        gain = size_before - size_after
        pct = gain / size_before * 100
        table.add_row(
            file.name,
            f"{size_before:.2f} MB",
            f"{size_after:.2f} MB",
            f"{gain:.2f} MB ({pct:.0f}%)",
            str(quality),
            "[green]✔[/green]"
        )
    elif status == "warn":
        gain = size_before - size_after
        pct = gain / size_before * 100
        table.add_row(
            file.name,
            f"{size_before:.2f} MB",
            f"{size_after:.2f} MB",
            f"{gain:.2f} MB ({pct:.0f}%)",
            str(quality),
            "[yellow]⚠ >1.5MB[/yellow]"
        )
    else:
        table.add_row(
            file.name,
            f"{size_before:.2f} MB",
            "-",
            "-",
            str(quality),
            "[red]❌ Erreur[/red]"
        )

console.print("\n")
console.print(table)

# =============================
if total_after > 0:
    total_gain = total_before - total_after
    pct_gain = total_gain / total_before * 100
    console.print(f"\n[bold green]✅ Compression terminée[/bold green]")
    console.print(f"[bold]Images traitées:[/bold] {len(files)}")
    console.print(f"[bold]Taille totale avant:[/bold] {total_before:.2f} MB")
    console.print(f"[bold]Taille totale après:[/bold] {total_after:.2f} MB")
    console.print(f"[bold]Gain total:[/bold] {total_gain:.2f} MB ({pct_gain:.0f}%)")