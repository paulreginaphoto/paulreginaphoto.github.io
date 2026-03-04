import os
import subprocess
import sys
import json

# Se placer dans le dossier du script
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Cherche le premier fichier MP4
mp4_files = [f for f in os.listdir(script_dir) if f.lower().endswith(".mp4")]

if not mp4_files:
    print("Aucun fichier MP4 trouvé dans le dossier.")
    input("Appuie sur Entrée pour quitter...")
    sys.exit()

input_file = mp4_files[0]
output_file = os.path.splitext(input_file)[0] + "_totally_fixed.mp4"

print(f"\n=== Fichier détecté : {input_file} ===\n")

# --- Détecter automatiquement HDR / 10-bit ---
def detect_pix_fmt(file_path):
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=pix_fmt,color_primaries,color_transfer,color_space",
        "-of", "json",
        file_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout)
    stream = info.get("streams", [])[0]

    pix_fmt = stream.get("pix_fmt", "yuv420p")
    color_transfer = stream.get("color_transfer", "unknown")

    # HDR ou 10-bit détecté
    if "p10" in pix_fmt or color_transfer in ["smpte2084","arib-std-b67"]:
        print("HDR ou 10-bit détecté -> on conserve 10-bit")
        return "yuv420p10le"
    else:
        print("SDR 8-bit détecté -> on reste en 8-bit")
        return "yuv420p"

pix_fmt = detect_pix_fmt(input_file)

# --- Choisir automatiquement le profil x264 correct ---
if pix_fmt == "yuv420p":
    profile = "high"
elif pix_fmt == "yuv420p10le":
    profile = "high10"
else:
    profile = "high"

print(f"Utilisation du profil x264 : {profile}\n")

# 1️⃣ Analyse très précise
print("=== Analyse précise ===")
subprocess.run([
    "ffmpeg", "-y",
    "-threads", "0",
    "-i", input_file,
    "-vf", "vidstabdetect=shakiness=3:accuracy=15:result=transforms.trf",
    "-f", "null", "NUL"
], check=True)

# 2️⃣ Stabilisation "caméra totalement figée"
print("\n=== Stabilisation totale (cadre verrouillé) ===")
subprocess.run([
    "ffmpeg", "-y",
    "-threads", "0",
    "-i", input_file,
    "-vf", (
        "vidstabtransform=input=transforms.trf:"
        "smoothing=150:"        # très fort lissage
        "zoom=5:"               # léger zoom pour compenser les bords
        "optzoom=1:"            # zoom automatique intelligent
        "interpol=bicubic"
    ),
    "-c:v", "libx264",
    "-preset", "veryslow",
    "-crf", "14",
    "-pix_fmt", pix_fmt,
    "-profile:v", profile,
    "-level", "5.2",
    "-x264-params", "aq-mode=3:aq-strength=1.0:deblock=0,0",
    "-movflags", "+faststart",
    "-c:a", "copy",
    output_file
], check=True)

# Supprime le fichier temporaire
if os.path.exists("transforms.trf"):
    os.remove("transforms.trf")

print(f"\n=== Vidéo totalement figée : {output_file} ===")
input("Appuie sur Entrée pour quitter...")