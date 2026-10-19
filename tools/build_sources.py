#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""出典台帳（influencer_sources.md）→ site/data/sources.json。

なぜ必要か（2026-10-19）：予想カードに「出典明記」と書いておきながら、
出典URLは台帳にしか無く、サイトのどこにも出ていなかった。
スクショがXで一人歩きしても「誰の・どの動画の予想か」を辿れるよう、カードに焼き込む。

取込件数0件の行・注記行は載せない。member_id × event_id ごとに投稿日の新しい順。
使い方:  python3 tools/build_sources.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ROW = re.compile(r"\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(ev_[a-z0-9_]+)\s*\|\s*(\d+)件\s*\|\s*"
                 r"(https://www\.youtube\.com/\S+?)\s*\|\s*(m_[A-Za-z0-9_]+)\s*\|")

def main():
    out = {}
    for line in open(os.path.join(ROOT, "influencer_sources.md"), encoding="utf-8"):
        # 注記行の末尾に表の行が貼り付いている箇所がある（> ※除外…| 2026-08-07 | 青木…）ので search
        m = ROW.search(line)
        if not m:
            continue
        date, ch, ev, n, url, mid = m.groups()
        if int(n) == 0:
            continue
        lst = out.setdefault(mid, {}).setdefault(ev, [])
        if not any(x["url"] == url for x in lst):
            lst.append({"date": date, "channel": ch, "url": url, "n": int(n)})
    for evs in out.values():
        for lst in evs.values():
            lst.sort(key=lambda x: x["date"], reverse=True)
    path = os.path.join(ROOT, "site", "data", "sources.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{path}: {len(out)}人 / {sum(len(v) for e in out.values() for v in e.values())}本")

if __name__ == "__main__":
    main()
