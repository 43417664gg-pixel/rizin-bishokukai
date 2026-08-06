-- 応援（予想とは別。誰がどの選手を応援するか）。予想と逆でもOK。
-- Supabase SQL Editor で1回実行する（冪等）。
create table if not exists supports (
  id          text primary key default gen_random_uuid()::text,
  member_id   text not null references members(id)  on delete cascade,
  fight_id    text not null references fights(id)   on delete cascade,
  fighter_id  text not null references fighters(id),
  updated_at  timestamptz not null default now(),
  unique (member_id, fight_id)
);

alter table supports enable row level security;

-- 予想テーブルと同じ方針：読み取りは誰でも／投稿・変更・取消は匿名でも可（仲間内・noindex前提）
drop policy if exists "public read supports"   on supports;
drop policy if exists "anyone write supports"  on supports;
drop policy if exists "anyone update supports" on supports;
drop policy if exists "anyone delete supports" on supports;
create policy "public read supports"   on supports for select using (true);
create policy "anyone write supports"  on supports for insert with check (true);
create policy "anyone update supports" on supports for update using (true);
create policy "anyone delete supports" on supports for delete using (true);
