from pathlib import Path
import sys
import subprocess

def ensure_package(import_name: str, pip_name: str | None = None):
    try:
        return __import__(import_name)
    except ImportError:
        pkg = pip_name or import_name
        print(f"[INFO] Installation de {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])
        return __import__(import_name)

cv2 = ensure_package("cv2", "opencv-python")

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

def sharpness_score(image_path: Path) -> float:
    img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Impossible de lire l'image : {image_path.name}")
    return cv2.Laplacian(img, cv2.CV_64F).var()

def main():
    script_path = Path(__file__).resolve()
    script_dir = script_path.parent

    images = [
        p for p in script_dir.iterdir()
        if p.is_file()
        and p.suffix.lower() in EXTENSIONS
        and p.name != script_path.name
    ]

    if not images:
        print("[ERREUR] Aucune image trouvée dans le dossier du script.")
        sys.exit(1)

    results = []

    for img_path in images:
        try:
            score = sharpness_score(img_path)
            results.append((img_path, score))
            print(f"[OK] {img_path.name} -> {score:.2f}")
        except Exception as e:
            print(f"[IGNORÉ] {img_path.name} -> {e}")

    if not results:
        print("[ERREUR] Aucune image exploitable.")
        sys.exit(1)

    results.sort(key=lambda x: x[1], reverse=True)
    best_image, best_score = results[0]

    print("\n--- Meilleure image ---")
    print(f"{best_image.name} -> {best_score:.2f}")

    deleted_count = 0
    failed_deletions = []

    for img_path, _ in results[1:]:
        try:
            img_path.unlink()
            deleted_count += 1
            print(f"[SUPPRIMÉ] {img_path.name}")
        except Exception as e:
            failed_deletions.append((img_path.name, str(e)))
            print(f"[ECHEC SUPPRESSION] {img_path.name} -> {e}")

    print("\n--- Résumé ---")
    print(f"Image conservée : {best_image.name}")
    print(f"Images supprimées : {deleted_count}")

    if failed_deletions:
        print("\nSuppressions échouées :")
        for name, err in failed_deletions:
            print(f"- {name}: {err}")

if __name__ == "__main__":
    main()