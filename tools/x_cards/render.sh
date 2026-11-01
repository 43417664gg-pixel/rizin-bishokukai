#!/bin/bash
# X投稿用画像を headless Chrome で書き出す。先に build_data.py で data.js を作っておく。
# 使い方: bash render.sh <出力ディレクトリ> <fight_id...>   （"rank" を渡すとランキング画像）
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; shift
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"
for id in "$@"; do
  if [ "$id" = "rank" ]; then Q="mode=rank"; SIZE="1200,675"; else Q="f=$id"; SIZE="1200,855"; fi
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --window-size=$SIZE --virtual-time-budget=6000 \
    --screenshot="$OUT/$id.png" "file://$DIR/card.html?$Q" >/dev/null 2>&1
  echo "$OUT/$id.png"
done
