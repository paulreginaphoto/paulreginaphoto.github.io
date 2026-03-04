import os
import sys
import subprocess
import logging
from PIL import Image

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def install_dependencies():
    try:
        import PIL
    except ImportError:
        logging.info("Installation de Pillow...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])

install_dependencies()

class InstaSplitter:
    def __init__(self):
        # On force le dossier de travail sur le dossier du script
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        os.chdir(self.base_path)
        
        self.target_ratio = (4, 5)
        self.output_size = (1080, 1350)
        self.valid_exts = ('.jpg', '.jpeg', '.png', '.webp')
        self.min_file_size = 500 * 1024 # Abaissé à 500 Ko pour être sûr
        self.output_dir = os.path.join(self.base_path, "exports_insta")

    def find_best_image(self):
        files = [f for f in os.listdir('.') if f.lower().endswith(self.valid_exts)]
        
        # DEBUG: On affiche ce que le script voit
        logging.info(f"Fichiers analysés dans {self.base_path} : {len(files)}")
        
        candidates = []
        for f in files:
            size = os.path.getsize(f)
            if size > self.min_file_size and "PART" not in f and "LEFT" not in f:
                candidates.append((f, os.path.getmtime(f)))

        if not candidates:
            return None
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    def run(self):
        filename = self.find_best_image()
        if not filename:
            logging.warning("Aucune photo > 500ko trouvée. Vérifiez que l'image est bien dans le même dossier que le script.")
            return

        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

        try:
            with Image.open(filename) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                
                logging.info(f"Traitement de : {filename}")

                combined_ratio = (self.target_ratio[0] * 2) / self.target_ratio[1]
                w, h = img.size
                
                # Smart Crop
                if (w / h) > combined_ratio:
                    new_w = h * combined_ratio
                    offset = (w - new_w) / 2
                    img = img.crop((offset, 0, offset + new_w, h))
                else:
                    new_h = w / combined_ratio
                    offset = (h - new_h) / 2
                    img = img.crop((0, offset, w, offset + new_h))

                img = img.resize((self.output_size[0] * 2, self.output_size[1]), Image.Resampling.LANCZOS)
                
                base = os.path.splitext(filename)[0]
                path_l = os.path.join(self.output_dir, f"{base}_LEFT.jpg")
                path_r = os.path.join(self.output_dir, f"{base}_RIGHT.jpg")

                img.crop((0, 0, self.output_size[0], self.output_size[1])).save(path_l, "JPEG", quality=98, subsampling=0)
                img.crop((self.output_size[0], 0, self.output_size[0]*2, self.output_size[1])).save(path_r, "JPEG", quality=98, subsampling=0)

                logging.info(f"Succès ! Images sauvegardées dans /exports_insta")
                
                # Ouvrir le dossier automatiquement (Windows)
                os.startfile(self.output_dir)

        except Exception as e:
            logging.error(f"Erreur : {e}")

if __name__ == "__main__":
    InstaSplitter().run()