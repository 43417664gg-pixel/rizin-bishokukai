#!/bin/bash
# LINE用「美食会予想まとめ」画像を headless Chrome で書き出す。先に build_data.py で data.js を作っておく。
# 使い方: bash render.sh <出力ディレクトリ> [並べ方...]   （並べ方＝wide3 / tier / wide2。省略時は wide3＝採用版）
#         見本は "wide3&demo=1" のようにクエリごと渡す（ファイル名の & と = は _ になる）
# 縦の長さは並べ方で変わるので、1回目に DOM を吐かせて body の data-h を読み、その高さで撮る。
# Chrome は書き出し後の終了処理で非0を返すことがある（Teardown watchdog）。終了コードではなくファイルの更新で成否を見る。
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; shift
[ $# -eq 0 ] && set -- wide3
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"
for layout in "$@"; do
  URL="file://$DIR/summary.html?layout=$layout"
  H=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --window-size=1080,2000 \
        --virtual-time-budget=6000 --dump-dom "$URL" 2>/dev/null | sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
  [ -z "$H" ] && { echo "!! 高さが取れない（$layout）"; exit 1; }
  PNG="$OUT/bishoku_$(echo "$layout" | tr '&=' '__').png"; rm -f "$PNG"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --window-size=1080,$H --virtual-time-budget=6000 \
    --screenshot="$PNG" "$URL" >/dev/null 2>&1 || true
  [ -s "$PNG" ] || { echo "!! 撮れていない（$layout）"; exit 1; }
  # LINEに貼る用にJPEGも作る（PNGだと3MB前後になる）
  sips -s format jpeg -s formatOptions 88 "$PNG" --out "${PNG%.png}.jpg" >/dev/null
  echo "${PNG%.png}.jpg  1080x$H"
done
