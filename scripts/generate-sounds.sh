#!/usr/bin/env bash
# Generate loopable procedural ambient MP3s for built-in mixer channels.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/sounds"
mkdir -p "$OUT_DIR"
DUR=12
SR=44100

gen() {
  local name="$1"
  local filter="$2"
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "anoisesrc=color=${filter}:duration=${DUR}:sample_rate=${SR}:amplitude=0.4" \
    -af "afade=t=in:st=0:d=0.5,afade=t=out:st=$((DUR - 1)):d=1" \
    -codec:a libmp3lame -q:a 4 \
    "${OUT_DIR}/${name}.mp3"
}

# Rain: pink noise, band-limited
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:duration=${DUR}:sample_rate=${SR}:amplitude=0.35" \
  -af "highpass=f=200,lowpass=f=4000,afade=t=in:st=0:d=0.5,afade=t=out:st=$((DUR - 1)):d=1" \
  -codec:a libmp3lame -q:a 4 "${OUT_DIR}/rain.mp3"

# Fire: brown noise crackle
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=brown:duration=${DUR}:sample_rate=${SR}:amplitude=0.5" \
  -af "highpass=f=80,lowpass=f=2500,tremolo=f=3:d=0.4,afade=t=in:st=0:d=0.5,afade=t=out:st=$((DUR - 1)):d=1" \
  -codec:a libmp3lame -q:a 4 "${OUT_DIR}/fire.mp3"

# Coffee shop: low rumble + muffled noise
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:duration=${DUR}:sample_rate=${SR}:amplitude=0.25" \
  -af "lowpass=f=800,highpass=f=100,afade=t=in:st=0:d=0.5,afade=t=out:st=$((DUR - 1)):d=1" \
  -codec:a libmp3lame -q:a 4 "${OUT_DIR}/coffee.mp3"

# Ocean waves: amplitude-modulated noise
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=white:duration=${DUR}:sample_rate=${SR}:amplitude=0.2" \
  -af "lowpass=f=1200,tremolo=f=0.15:d=0.7,afade=t=in:st=0:d=0.5,afade=t=out:st=$((DUR - 1)):d=1" \
  -codec:a libmp3lame -q:a 4 "${OUT_DIR}/waves.mp3"

# Forest: wind + occasional chirp-like tones
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:duration=${DUR}:sample_rate=${SR}:amplitude=0.2" \
  -af "highpass=f=300,lowpass=f=6000,afade=t=in:st=0:d=0.5,afade=t=out:st=$((DUR - 1)):d=1" \
  -codec:a libmp3lame -q:a 4 "${OUT_DIR}/forest.mp3"

# Keyboard typing: sparse clicks on silence
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=white:duration=${DUR}:sample_rate=${SR}:amplitude=0.01" \
  -af "highpass=f=2000,lowpass=f=8000,afade=t=in:st=0:d=0.1,afade=t=out:st=$((DUR - 1)):d=1" \
  -codec:a libmp3lame -q:a 4 "${OUT_DIR}/keyboard.mp3"

echo "Generated ambient loops in ${OUT_DIR}"
