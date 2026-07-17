-- RIZIN勝敗予想ポータル スキーマ
-- SupabaseプロジェクトのSQL Editorにそのまま貼り付けて実行する

-- ========== テーブル ==========

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#e60012',
  created_at timestamptz not null default now()
);

create table fighters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  photo_url text,
  rizin_url text,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  lock_at timestamptz not null,          -- 予想締切＝大会開始時刻
  poster_url text,
  official_url text,                     -- rizin.jp の大会ページ（admin参照用）
  status text not null default 'upcoming' check (status in ('upcoming','finished')),
  created_at timestamptz not null default now()
);

create table fights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  order_no int not null,                 -- 試合番号（オープニングは0番台等、表示順に使う）
  segment text not null default 'main' check (segment in ('main','opening')),
  title_label text,                      -- 「バンタム級タイトルマッチ」等
  weight_class text,                     -- 「61.0kg」等
  rounds int not null default 3,
  fighter1_id uuid not null references fighters(id),
  fighter2_id uuid not null references fighters(id),
  image_url text,                        -- RIZIN公式のVSバナー
  -- 結果（JMOC公式リザルトを一次ソースに転記）
  winner_id uuid references fighters(id),
  result_method text check (result_method in ('KO','SUB','DEC','DRAW','NC')),
  result_round int,
  result_technique text,                 -- techniques.js のIDと一致させる
  result_note text,
  created_at timestamptz not null default now()
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  fight_id uuid not null references fights(id) on delete cascade,
  winner_id uuid not null references fighters(id),
  method text check (method in ('KO','SUB','DEC')),
  round int check (round between 1 and 5),
  technique text,
  updated_at timestamptz not null default now(),
  unique (member_id, fight_id)
);

-- ========== RLS ==========
alter table members enable row level security;
alter table fighters enable row level security;
alter table events enable row level security;
alter table fights enable row level security;
alter table predictions enable row level security;

-- 読み取りは誰でも
create policy "public read members"     on members     for select using (true);
create policy "public read fighters"    on fighters    for select using (true);
create policy "public read events"      on events      for select using (true);
create policy "public read fights"      on fights      for select using (true);
create policy "public read predictions" on predictions for select using (true);

-- マスタ・結果の書き込みはログイン済み（＝Gakuの管理アカウント）のみ
create policy "admin write members"  on members  for all to authenticated using (true) with check (true);
create policy "admin write fighters" on fighters for all to authenticated using (true) with check (true);
create policy "admin write events"   on events   for all to authenticated using (true) with check (true);
create policy "admin write fights"   on fights   for all to authenticated using (true) with check (true);

-- 予想は匿名で書けるが、大会のlock_atを過ぎたらDBが拒否（後出し防止）
create policy "predict before lock (insert)" on predictions for insert
  with check (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id and e.lock_at > now())
  );
create policy "predict before lock (update)" on predictions for update
  using (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id and e.lock_at > now())
  )
  with check (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id and e.lock_at > now())
  );
create policy "predict before lock (delete)" on predictions for delete
  using (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id and e.lock_at > now())
  );

-- 管理アカウントは予想も訂正可能
create policy "admin write predictions" on predictions for all to authenticated using (true) with check (true);
