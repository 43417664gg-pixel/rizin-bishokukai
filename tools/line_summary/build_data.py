#!/usr/bin/env python3
"""LINEで送る「美食会予想まとめ」画像（summary.html）が読む data.js を作る。
美食会の3人（app.js の BISHOKU と同じ並び）の予想と応援だけ。外部予想者は出さない。
使い方: python3 build_data.py <event_id（例 ev_lm17）>
"""
import datetime, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "..", "site")
BISHOKU = ["m_hame", "m_nuki", "m_maruyama"]
ev = sys.argv[1] if len(sys.argv) > 1 else "ev_lm17"

cfg = open(os.path.join(SITE, "js", "config.js"), encoding="utf-8").read()
URL = re.search(r"https://[a-z0-9]+\.supabase\.co", cfg).group(0)
KEY = re.search(r"sb_publishable_[A-Za-z0-9_-]+", cfg).group(0)   # 公開キー（RLSで読み取りのみ）

def rest(path):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    return json.load(urllib.request.urlopen(req, timeout=30))

# 結果はDBから（大会当日は結果をDBへ直接入れ、demo-data.js は後追い＝seedの結果は古い）。答え合わせの描き分けに使う
RES = ["winner_id", "result_method", "result_round", "result_technique", "no_score", "cancelled"]
fights = rest(f"fights?select=id,image_url,{','.join(RES)}&event_id=eq.{ev}")
fids = ",".join(f["id"] for f in fights)
who = ",".join(BISHOKU)
members = {m["id"]: m for m in rest(f"members?select=id,name,color&id=in.({who})")}
# 丸アイコンが乗る場所の背景を測る（大会ごとにバナーの色が違う＝橙・金・紺・空色…）。
# 下の左右＝勝敗の丸、上の左右＝応援の丸。各場所の明るさ（L）と、メンバー色に近い画素の割合（sim）。
# summary.html はこれを見て、沈む組み合わせの丸だけ縁を強くする。PIL が無ければ測らない（縁は標準のまま）
def lab(rgb):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    x, y, z = (r * .4124 + g * .3576 + b * .1805) / .9505, r * .2126 + g * .7152 + b * .0722, (r * .0193 + g * .1192 + b * .9505) / 1.089
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))

def measure(path, colors):
    try:
        from PIL import Image
        im = Image.open(path).convert("RGB").resize((160, 90))
    except Exception:
        return None
    mc = {mid: lab(tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))) for mid, c in colors.items()}
    allpx = [lab(p) for p in im.getdata()]
    # 絵のうるささ＝平均の彩度（a,bの大きさ）。橙・虹色のバナーほど高い。下端の影の濃さに使う
    out = {"chroma": round(sum((p[1] ** 2 + p[2] ** 2) ** .5 for p in allpx) / len(allpx))}
    for name, box in {"bl": (0, 76, 72, 90), "br": (88, 76, 160, 90), "tl": (0, 0, 40, 27), "tr": (120, 0, 160, 27)}.items():
        px = [lab(p) for p in im.crop(box).getdata()]
        out[name] = {"L": round(sum(p[0] for p in px) / len(px)),
                     "sim": {mid: round(sum(1 for p in px if sum((p[i] - m[i]) ** 2 for i in range(3)) ** .5 < 30) / len(px), 2)
                             for mid, m in mc.items()}}
    return out

out = {
    "event": ev,
    "members": [members[m] for m in BISHOKU if m in members],
    "preds": rest(f"predictions?select=member_id,fight_id,winner_id,method,round,technique&member_id=in.({who})&fight_id=in.({fids})"),
    "results": {f["id"]: {k: f.get(k) for k in RES} for f in fights},
    "supports": rest(f"supports?select=member_id,fight_id,fighter_id&member_id=in.({who})&fight_id=in.({fids})"),
    "zones": {f["id"]: measure(os.path.join(SITE, f["image_url"]), {m: members[m]["color"] for m in BISHOKU if m in members})
              for f in fights if f.get("image_url")},
    "built_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%-m/%-d %H:%M"),
}
# 大会ページのまとめ（ALL PICKSの上）も同じ測定値で丸の縁を決める＝サイト側にも置く
zdir = os.path.join(SITE, "data", "zones"); os.makedirs(zdir, exist_ok=True)
open(os.path.join(zdir, f"{ev}.json"), "w", encoding="utf-8").write(json.dumps(out["zones"], ensure_ascii=False))
open(os.path.join(HERE, "data.js"), "w", encoding="utf-8").write(
    "window.LDATA = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
for m in out["members"]:
    n = sum(1 for p in out["preds"] if p["member_id"] == m["id"])
    s = sum(1 for p in out["supports"] if p["member_id"] == m["id"])
    print(f"{m['name']}: 予想 {n}件／応援 {s}件")
done = [f for f in fights if f.get("no_score") or (f.get("winner_id") and f.get("result_method"))]
print(f"結果あり {len(done)}/{len(fights)}試合")
