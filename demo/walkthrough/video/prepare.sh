#!/usr/bin/env bash
# Voiceover + speed-fitted clips for build.py. Run from demo/walkthrough/video.
set -euo pipefail
HF=../node_modules/.bin/hyperframes
mkdir -p audio assets
# Voiceover: Kokoro af_heart, one line per scene, normalised to -16 LUFS.
while IFS='|' read -r id txt; do
  [ -f "audio/vo$id.wav" ] && continue
  echo "$txt" > "audio/l$id.txt"
  $HF tts "audio/l$id.txt" -v af_heart -s 1.05 -o "audio/raw$id.wav" < /dev/null
  ffmpeg -nostdin -loglevel error -y -i "audio/raw$id.wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100" -ac 2 "audio/vo$id.wav"
  rm "audio/raw$id.wav" "audio/l$id.txt"
done < audio/vo-lines.txt
[ -f audio/music.wav ] || python3 ../music/make_music.py audio/music.wav 190
# Clips: speed each recording so it fits its voiceover. fit <clip> <speed> <name> [start] [length]
fit() { ffmpeg -loglevel error -y -ss "${4:-0}" ${5:+-t $5} -i "clips/$1.mp4" -vf "setpts=PTS/$2,fps=30" -an -c:v libx264 -crf 16 -pix_fmt yuv420p "assets/$3.mp4"; }
fit s02_landing 1.1 landing
fit s03_guide 1.6 guide
fit s04_league 1.2 league
fit s05_etf 1.5 etf
fit s06_back 2.0 back
fit s07_create 1.55 create
fit s08_champion 1.0 champion 0 6.2
fit s08b_champion_etf 1.0 champion_etf
fit s09_agents 1.0 agents
fit s10_me 1.5 me
fit s10b_results 1.5 results
fit s10c_leaderboard 1.5 leaderboard
