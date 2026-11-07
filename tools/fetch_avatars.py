#!/usr/bin/env python3
"""外部予想者（m_yt_*）のYouTubeチャンネルのロゴを取ってくる。

  python3 tools/fetch_avatars.py            # 未取得の人だけ
  python3 tools/fetch_avatars.py --force    # 全員取り直す（ロゴを変えた人がいる時）

出典台帳（site/data/sources.json）の動画 → oEmbed でチャンネルURL → チャンネルページの og:image（＝ロゴ）。
YouTube API もキーも使わない。結果は site/assets/predictors/<member_id>.jpg と site/data/avatars.json。

★チャンネルの持ち主＝予想者 のときだけ載せる★
ゲスト出演（RIZIN公式番組の平本蓮、中村拓己チャンネルの大沢ケンジ等）にチャンネルのロゴを付けると、
別人のロゴがその人の顔になる。台帳に動画が無い人（番組のパネリスト等）も取らない＝頭文字のまま。
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "site/data/sources.json")
OUT_DIR = os.path.join(ROOT, "site/assets/predictors")
MANIFEST = os.path.join(ROOT, "site/data/avatars.json")
UA = {"User-Agent": "Mozilla/5.0", "Accept-Language": "ja"}

# ゲスト出演で取り込んだ人＝動画のチャンネルが本人のものではない
GUESTS = {"m_yt_hiramotoren", "m_yt_osawa_kenji"}
# 1人が複数チャンネルを持つときは本チャンネルを使う（切り抜き・サブは避ける）
SUB_CHANNEL = re.compile(r"切り抜き|日常")
SIZE = 176


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()


def live_members():
    """本番に居る m_yt_* だけ。台帳には削除・統合済みの古いIDも残っている"""
    cfg = open(os.path.join(ROOT, "site/js/config.js"), encoding="utf-8").read()
    url = re.search(r'SUPABASE_URL: "([^"]+)"', cfg).group(1)
    key = re.search(r'SUPABASE_ANON_KEY: "([^"]+)"', cfg).group(1)
    req = urllib.request.Request(url + "/rest/v1/members?select=id&id=like.m_yt_*",
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    return {m["id"] for m in json.load(urllib.request.urlopen(req, timeout=30))}


def main():
    force = "--force" in sys.argv
    src = json.load(open(SRC, encoding="utf-8"))
    manifest = json.load(open(MANIFEST, encoding="utf-8")) if os.path.exists(MANIFEST) else {}
    os.makedirs(OUT_DIR, exist_ok=True)
    live = live_members()
    for mid in [m for m in manifest if m not in live]:   # 本番から消えた人のロゴは片付ける
        path = os.path.join(ROOT, "site", manifest.pop(mid))
        if os.path.exists(path):
            os.remove(path)

    for mid, events in sorted(src.items()):
        if mid not in live or mid in GUESTS or (mid in manifest and not force):
            continue
        vids = [v for lst in events.values() for v in lst]
        main_ch = [v for v in vids if not SUB_CHANNEL.search(v["channel"])] or vids
        video = max(main_ch, key=lambda v: v["date"])["url"]
        try:
            o = json.loads(get("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(video)))
            page = get(o["author_url"]).decode("utf-8", "ignore")
            m = re.search(r'<meta property="og:image" content="([^"]+)"', page)
            if not m:
                print(f"!! {mid}: ロゴが見つからない（{o['author_url']}）")
                continue
            img = Image.open(io.BytesIO(get(m.group(1)))).convert("RGB")
            img.thumbnail((SIZE, SIZE))
            path = f"assets/predictors/{mid}.jpg"
            img.save(os.path.join(ROOT, "site", path), quality=88)
            manifest[mid] = path
            print(f"OK {mid}  {o['author_name']}")
        except Exception as e:
            print(f"!! {mid}: {e}")
        time.sleep(0.5)

    json.dump(dict(sorted(manifest.items())), open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n=> {len(manifest)}人分 → site/data/avatars.json")


if __name__ == "__main__":
    main()
