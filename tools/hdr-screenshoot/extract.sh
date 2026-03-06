#!/usr/bin/env bash

clear

echo "========================================"
echo " VIDEO FRAME EXTRACTOR (HDR -> VLC-LIKE)"
echo "========================================"
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Scanning video files..."
echo

shopt -s nullglob
VIDEOS=( *.mp4 *.mov *.mkv *.avi *.m4v )
shopt -u nullglob

COUNT=${#VIDEOS[@]}

if [ "$COUNT" -eq 0 ]; then
    echo "No video files found."
    read -p "Press enter..."
    exit 1
fi

if [ "$COUNT" -eq 1 ]; then
    VIDEO="${VIDEOS[0]}"
else
    echo "Select video:"
    select VIDEO in "${VIDEOS[@]}"; do
        [ -n "$VIDEO" ] && break
    done
fi

echo
echo "Selected:"
echo "$VIDEO"
echo

read -p "Second to extract frames from: " SECOND

OUTDIR="frames_${SECOND}s"
mkdir -p "$OUTDIR"

if ffmpeg -hide_banner -filters 2>/dev/null | grep -q 'libplacebo'; then
    # Better match for HDR playback renderers than the classic zscale+tonemap chain.
    # Important: output to sRGB/full-range, not BT.709 video range, because PNG viewers
    # like Windows Photos expect an image-style transfer curve.
    VF="libplacebo=colorspace=bt709:color_primaries=bt709:color_trc=iec61966-2-1:range=pc:tonemapping=auto:gamut_mode=perceptual:peak_detect=1:contrast_recovery=0.2:dithering=blue,format=rgb48be"
    PIPELINE="libplacebo HDR -> sRGB"
else
    # Fallback for ffmpeg builds without libplacebo.
    VF="zscale=transfer=linear:npl=1000,tonemap=mobius:param=0.30:desat=2.0,zscale=transfer=iec61966-2-1:primaries=bt709:range=pc,format=rgb48be"
    PIPELINE="zscale/tonemap HDR -> sRGB"
fi

echo
echo "Extracting frames with: $PIPELINE"
echo

ffmpeg \
    -hide_banner \
    -ss "$SECOND" \
    -i "$VIDEO" \
    -t 1 \
    -vf "$VF" \
    -pix_fmt rgb48le \
    "$OUTDIR/frame_%04d.png"

echo
COUNT=$(find "$OUTDIR" -maxdepth 1 -type f | wc -l)

echo "Frames exported: $COUNT"
echo "Output folder: $OUTDIR"
echo
read -p "Press enter to close..."
