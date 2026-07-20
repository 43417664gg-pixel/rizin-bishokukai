-- RIZIN美食会予想 スキーマ（本番適用済み・ID方式はtext）
-- SupabaseプロジェクトのSQL Editorにそのまま貼り付けて実行する

-- ========== テーブル ==========

create table members (
  id text primary key,
  name text not null unique,
  color text not null default '#e60012',
  created_at timestamptz not null default now()
);

create table fighters (
  id text primary key,
  name text not null,
  nickname text,                         -- 異名（リングネーム）
  belt text,                             -- 王座・肩書（元五輪銀 等）
  backbone text,                         -- バックボーン（レスリング・ムエタイ等）
  stance text,                           -- 構え（オーソドックス／サウスポー／スイッチ）
  team text,                             -- 所属
  rec_nc int,                            -- 無効試合数
  origin text,                           -- 出身
  style text,                            -- ファイトスタイル解説
  career text,                           -- 来歴
  memo text,                             -- ひとことメモ（今大会のストーリー等）
  rec_w int, rec_l int, rec_d int,       -- 通算戦績（報道ベース・任意）
  rec_ko int, rec_sub int, rec_dec int,  -- 勝利の内訳（フィニッシュグラフ用・任意）
  history jsonb,                         -- キャリア戦績 [{d,opp,r,how}]（r: W/L/D/NC）
  highlight_url text,                    -- FIGHT写真（名鑑ヒーロー画像）
  highlight_caption text,                -- HIGHLIGHT のキャプション
  photo_casual text,                     -- 普段着写真（任意・FIGHTと切替表示）
  rizin_url text,
  created_at timestamptz not null default now()
);

create table events (
  id text primary key,
  name text not null,
  event_date date,
  no_deadline boolean not null default false, -- 締切なし・オープンブック運用
  open_at timestamptz,                   -- 予想開始＝前日計量終了後（nullなら即開放）
  lock_at timestamptz,                   -- 予想締切＝前日の夜24:00（no_deadline時は未使用）
  poster_url text,
  official_url text,                     -- rizin.jp の大会ページ（admin参照用）
  status text not null default 'upcoming' check (status in ('upcoming','finished')),
  created_at timestamptz not null default now()
);

create table fights (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  order_no int not null,                 -- 試合番号（オープニングは0番台等、表示順に使う）
  segment text not null default 'main' check (segment in ('main','opening')),
  title_label text,                      -- 「バンタム級タイトルマッチ」等
  weight_class text,                     -- 「61.0kg」等
  rounds int not null default 3,
  fighter1_id text not null references fighters(id),
  fighter2_id text not null references fighters(id),
  image_url text,                        -- RIZIN公式のVSバナー
  -- 結果（JMOC公式リザルトを一次ソースに転記）
  winner_id text references fighters(id),
  result_method text check (result_method in ('KO','SUB','DEC','DRAW','NC')),
  result_round int,
  result_technique text,                 -- techniques.js のIDと一致させる
  result_note text,
  created_at timestamptz not null default now()
);

create table predictions (
  id text primary key default gen_random_uuid()::text,
  member_id text not null references members(id) on delete cascade,
  fight_id text not null references fights(id) on delete cascade,
  winner_id text not null references fighters(id),
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

-- 予想は匿名で書けるが、受付時間外（計量前／前日24:00以降）はDBが拒否（後出し防止）
create policy "predict in window (insert)" on predictions for insert
  with check (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id
              and (e.no_deadline
                   or ((e.open_at is null or e.open_at <= now())
                       and e.lock_at is not null and e.lock_at > now())))
  );
create policy "predict in window (update)" on predictions for update
  using (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id
              and (e.no_deadline
                   or ((e.open_at is null or e.open_at <= now())
                       and e.lock_at is not null and e.lock_at > now())))
  )
  with check (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id
              and (e.no_deadline
                   or ((e.open_at is null or e.open_at <= now())
                       and e.lock_at is not null and e.lock_at > now())))
  );
create policy "predict in window (delete)" on predictions for delete
  using (
    exists (select 1 from fights f join events e on e.id = f.event_id
            where f.id = fight_id
              and (e.no_deadline
                   or ((e.open_at is null or e.open_at <= now())
                       and e.lock_at is not null and e.lock_at > now())))
  );

-- 管理アカウントは予想も訂正可能
create policy "admin write predictions" on predictions for all to authenticated using (true) with check (true);
