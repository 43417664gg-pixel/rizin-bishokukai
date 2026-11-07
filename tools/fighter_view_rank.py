#!/usr/bin/env python3
"""選手名鑑の閲覧ランキング（裏の集計・表には出さない）。Gaku 11/8「選手名鑑閲覧ランキングは裏でとっておきたい」

  python3 tools/fighter_view_rank.py [--days 7] [--top 30]

読むのは service_role（Projects/RIZIN/portal/.env.local の SUPABASE_SERVICE_KEY・本人が設置・チャットに貼らない）。
表は supabase/migrations/2026-11-08_fighter_views.sql。選手名は site/js/demo-data.js から引く。
"""
import argparse, collections, datetime, json, os, re, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPABASE_URL = "https://rdlhhnbwjomlejszmkbv.supabase.co"


def load_key():
    path = f"{REPO}/.env.local"
    if not os.path.exists(path):
        sys.exit(f"[停止] {path} が無い（service_role キーは本人の手で置く）。")
    for line in open(path, encoding="utf-8"):
        if line.strip().startswith("SUPABASE_SERVICE_KEY"):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("[停止] .env.local に SUPABASE_SERVICE_KEY が無い。")


def names():
    src = open(f"{REPO}/site/js/demo-data.js", encoding="utf-8").read()
    return dict(re.findall(r'id:\s*"(f_[^"]+)",\s*\n\s*name:\s*"([^"]+)"', src))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=0, help="直近N日だけ（0＝全期間）")
    ap.add_argument("--top", type=int, default=30)
    a = ap.parse_args()
    key = load_key()
    url = f"{SUPABASE_URL}/rest/v1/fighter_views?select=fighter_id,src,created_at&limit=100000"
    if a.days:
        since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=a.days)).isoformat()
        url += f"&created_at=gte.{since}"
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    try:
        rows = json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"[停止] {e.code}：表が無いなら supabase/migrations/2026-11-08_fighter_views.sql を SQL Editor で実行（Gakuの手）")
    nm, cnt, src = names(), collections.Counter(r["fighter_id"] for r in rows), collections.Counter(r["src"] or "-" for r in rows)
    print(f"閲覧 {len(rows)}件（{'直近' + str(a.days) + '日' if a.days else '全期間'}）／来た場所：" + "・".join(f"{k} {v}" for k, v in src.most_common()))
    for i, (fid, n) in enumerate(cnt.most_common(a.top), 1):
        print(f"{i:>3}. {nm.get(fid, fid)}  {n}")


if __name__ == "__main__":
    main()
