-- ============================================================
-- 選手名鑑の閲覧ログ（2026-11-08）
-- Gaku 11/8「選手名鑑閲覧ランキングは裏でとっておきたい」
--
-- fighter.html?id=… を開くたびに1行（同じタブで同じ選手を開き直しても1回）。
-- 誰が見たかは持たない＝選手と、どのページから来たか（src）と時刻だけ。
-- サイトからは書くだけ。読むのは service_role（tools/fighter_view_rank.py）だけ＝ランキングは表に出さない。
-- この表が無い間もサイトは止まらない（記録だけが黙って落ちる）。SQL Editor で1回実行すれば、その時から数え始める
-- ============================================================
create table if not exists public.fighter_views (
  id bigint generated always as identity primary key,
  fighter_id text not null check (char_length(fighter_id) <= 64),
  src text check (src is null or char_length(src) <= 32),
  created_at timestamptz not null default now()
);
create index if not exists fighter_views_fighter_idx on public.fighter_views (fighter_id);

alter table public.fighter_views enable row level security;
drop policy if exists "fighter_views_insert" on public.fighter_views;
create policy "fighter_views_insert" on public.fighter_views for insert to anon, authenticated with check (true);
-- select / update / delete の方針は作らない＝サイトからは読めない・書き換えられない・消せない
grant insert on public.fighter_views to anon, authenticated;

-- 集計（SQL Editor でも見られる）：
-- select fighter_id, count(*) as views from public.fighter_views group by 1 order by 2 desc;
