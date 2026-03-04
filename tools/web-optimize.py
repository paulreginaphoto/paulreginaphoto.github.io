import sys
import subprocess
from pathlib import Path

# ==========================================================
# GESTION AUTOMATIQUE DES DÉPENDANCES (HIGH CLASS)
# ==========================================================
def install_dependencies():
    try:
        import rich
    except ImportError:
        print(" [!] Dépendances manquantes. Installation de 'rich' en cours...")
        try:
            # Installe sans polluer la console avec les logs pip (--quiet)
            subprocess.check_call([sys.executable, "-m", "pip", "install", "rich", "--quiet"])
            print(" [OK] Dépendances installées.")
        except Exception as e:
            print(f" [E] Erreur lors de l'installation : {e}")
            sys.exit(1)

# On lance le check avant tout le reste
install_dependencies()

# Maintenant on peut importer rich en toute sécurité
from rich.console import Console
from rich.progress import track
from rich.table import Table

# =============================
# CONFIGURATION
# =============================
BASE_DIR = Path(__file__).resolve().parent
# Chemin relatif vers /raw et /photos à la racine du git
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
# FONCTIONS DE CALCUL
# =============================
def get_size_mb(path: Path) -> float:
    return path.stat().st_size / (1024 * 1024)

def compress_image(input_path: Path, output_path: Path):
    quality = START_QUALITY
    original_size = get_size_mb(input_path)
    current_size = original_size

    while quality >= MIN_QUALITY:
        # q:v 1 à 31 (MJPEG). Plus le chiffre est petit, meilleure est la qualité.
        # Mapping approximatif de ta variable quality vers l'échelle ffmpeg
        ffmpeg_q = int((100 - quality) / 2)
        if ffmpeg_q < 1: ffmpeg_q = 1

        cmd = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-map_metadata", "-1",
            "-c:v", "mjpeg",
            "-q:v", str(ffmpeg_q),
            "-pix_fmt", "yuvj444p",
            str(output_path)
        ]
        
        result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if result.returncode != 0 or not output_path.exists():
            return original_size, None, quality, "error"

        current_size = get_size_mb(output_path)
        if current_size <= MAX_SIZE_MB:
            return original_size, current_size, quality, "ok"
        
        quality -= 2

    return original_size, current_size, quality, "warn"

# =============================
# LOGIQUE PRINCIPALE
# =============================
def main():
    if not INPUT_FOLDER.exists():
        console.print(f"[bold red]❌ Dossier source introuvable :[/bold red] {INPUT_FOLDER}")
        return

    files = [f for f in INPUT_FOLDER.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS]
    
    if not files:
        console.print(f"[bold yellow]ℹ Aucune image trouvée dans :[/bold yellow] {INPUT_FOLDER}")
        return

    console.print(f"\n[bold cyan]🚀 Optimisation Web[/bold cyan] | [white]{len(files)} images[/white]")
    console.print(f"[dim]Source : {INPUT_FOLDER}[/dim]")
    console.print(f"[dim]Sortie : {OUTPUT_FOLDER}[/dim]\n")

    table = Table(show_lines=False, box=None)
    table.add_column("Fichier", style="bold white")
    table.add_column("Avant", justify="right", style="dim")
    table.add_column("Après", justify="right", style="green")
    table.add_column("Gain", justify="right", style="bold cyan")
    table.add_column("Qualité", justify="center")
    table.add_column("Statut", justify="center")

    total_before = 0
    total_after = 0

    for file in track(files, description="[cyan]Traitement...[/cyan]"):
        output_file = OUTPUT_FOLDER / (file.stem + ".jpg")
        size_before, size_after, quality, status = compress_image(file, output_file)

        total_before += size_before
        if size_after:
            total_after += size_after
            gain = size_before - size_after
            pct = (gain / size_before) * 100
            
            if status == "ok":
                status_icon = "[green]✔[/green]"
            else:
                status_icon = "[yellow]⚠ >1.5MB[/yellow]"

            table.add_row(
                file.name,
                f"{size_before:.2f}MB",
                f"{size_after:.2f}MB",
                f"-{pct:.0f}%",
                str(quality),
                status_icon
            )
        else:
            table.add_row(file.name, f"{size_before:.2f}MB", "-", "-", str(quality), "[red]❌ Error[/red]")

    console.print(table)

    if total_after > 0:
        total_gain = total_before - total_after
        pct_total = (total_gain / total_before) * 100
        console.print("\n" + "━" * 50)
        console.print(f"[bold green]BILAN FINAL[/bold green]")
        console.print(f"Total avant : {total_before:.2f} MB")
        console.print(f"Total après : {total_after:.2f} MB")
        console.print(f"Gain net    : [bold cyan]{total_gain:.2f} MB (-{pct_total:.1f}%)[/bold cyan]")
        console.print("━" * 50 + "\n")

if __name__ == "__main__":
    main()
