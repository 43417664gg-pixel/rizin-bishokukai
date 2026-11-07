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

fids = ",".join(f["id"] for f in rest(f"fights?select=id&event_id=eq.{ev}"))
who = ",".join(BISHOKU)
members = {m["id"]: m for m in rest(f"members?select=id,name,color&id=in.({who})")}
out = {
    "event": ev,
    "members": [members[m] for m in BISHOKU if m in members],
    "preds": rest(f"predictions?select=member_id,fight_id,winner_id,method,round&member_id=in.({who})&fight_id=in.({fids})"),
    "supports": rest(f"supports?select=member_id,fight_id,fighter_id&member_id=in.({who})&fight_id=in.({fids})"),
    "built_at": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%-m/%-d %H:%M"),
}
open(os.path.join(HERE, "data.js"), "w", encoding="utf-8").write(
    "window.LDATA = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
for m in out["members"]:
    n = sum(1 for p in out["preds"] if p["member_id"] == m["id"])
    s = sum(1 for p in out["supports"] if p["member_id"] == m["id"])
    print(f"{m['name']}: 予想 {n}件／応援 {s}件")
