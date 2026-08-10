-- ★未実行分の結合SQL（全て冪等・何度流してもOK）。
--   Supabase SQL Editor に丸ごと貼って実行 → その後 admin をリロード → ⚡同期。
--   本番 fights に cancelled 列すら無いことを確認済み（未実行が溜まっている）。

-- 1) 選手：年齢用の生年月日
alter table fighters add column if not exists birth_date date;

-- 2) 試合：中止・延期（試合消滅。予想は残し採点除外）
alter table fights add column if not exists cancelled boolean not null default false;
alter table fights add column if not exists cancel_note text;

-- 3) 試合：体重超過など「試合はやるが予想対象外」
alter table fights add column if not exists no_score boolean not null default false;
alter table fights add column if not exists no_score_note text;

-- 4) 応援テーブル（予想とは別。逆でもOK）
create table if not exists supports (
  id          text primary key default gen_random_uuid()::text,
  member_id   text not null references members(id)  on delete cascade,
  fight_id    text not null references fights(id)   on delete cascade,
  fighter_id  text not null references fighters(id),
  updated_at  timestamptz not null default now(),
  unique (member_id, fight_id)
);
alter table supports enable row level security;
drop policy if exists "public read supports"   on supports;
drop policy if exists "anyone write supports"  on supports;
drop policy if exists "anyone update supports" on supports;
drop policy if exists "anyone delete supports" on supports;
create policy "public read supports"   on supports for select using (true);
create policy "anyone write supports"  on supports for insert with check (true);
create policy "anyone update supports" on supports for update using (true);
create policy "anyone delete supports" on supports for delete using (true);

-- 5) ゲスト登録：名前だけでメンバー作成（匿名可・仲間内/noindex前提）
alter table members enable row level security;
drop policy if exists "public read members"    on members;
drop policy if exists "anyone create members"  on members;
drop policy if exists "anyone update members"  on members;
create policy "public read members"   on members for select using (true);
create policy "anyone create members" on members for insert with check (true);
create policy "anyone update members" on members for update using (true);
