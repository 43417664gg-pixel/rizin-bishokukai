#!/usr/bin/env python3
"""X投稿画像（card.html）が読む data.js を作る。
- picks : 指定大会のインフルエンサー予想（運営枠 is_curated の member のみ。仲間内の予想は出さない）
- rank  : 遡り採点（site/data/career/*.json）の通算的中率
使い方: python3 build_data.py <fight_idの接頭辞（例 r55_）>
"""
import glob, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "..", "site")
prefix = sys.argv[1] if len(sys.argv) > 1 else "r55_"

cfg = open(os.path.join(SITE, "js", "config.js"), encoding="utf-8").read()
URL = re.search(r"https://[a-z0-9]+\.supabase\.co", cfg).group(0)
KEY = re.search(r"sb_publishable_[A-Za-z0-9_-]+", cfg).group(0)   # 公開キー（RLSで読み取りのみ）

def rest(path):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    return json.load(urllib.request.urlopen(req, timeout=30))

members = {m["id"]: m for m in rest("members?select=id,name,is_curated")}
preds = rest(f"predictions?select=member_id,fight_id,winner_id,method&fight_id=like.{prefix}*")

rates = {}
for f in glob.glob(os.path.join(SITE, "data", "career", "*.json")):
    d = json.load(open(f, encoding="utf-8"))
    ps = [p for p in d["picks"] if p.get("hit") is not None]
    if ps:
        rates[d["member_id"]] = {"id": d["member_id"], "name": d["name"], "n": len(ps),
                                 "rate": round(100 * sum(p["hit"] for p in ps) / len(ps), 1)}

picks = {}
for p in preds:
    m = members.get(p["member_id"])
    if not m or not m.get("is_curated"):
        continue
    r = rates.get(p["member_id"], {})
    picks.setdefault(p["fight_id"], []).append({
        "id": p["member_id"], "who": m["name"], "pick": p["winner_id"], "method": p.get("method"),
        "rate": r.get("rate"), "n": r.get("n")})

rank = sorted(rates.values(), key=lambda x: (-x["rate"], -x["n"]))
with open(os.path.join(HERE, "data.js"), "w", encoding="utf-8") as fp:
    fp.write("window.XDATA=" + json.dumps({"picks": picks, "rank": rank}, ensure_ascii=False) + ";\n")
print(f"picks: {sum(len(v) for v in picks.values())}件／{len(picks)}試合　rank: {len(rank)}人")
missing = {x["id"] for v in picks.values() for x in v} | {r["id"] for r in rank}
missing = [i for i in missing if not os.path.exists(os.path.join(HERE, "logos", i + ".jpg"))]
if missing:
    print("※ロゴ未取得:", ", ".join(missing))
