-- ============================================================
-- ★緊急（2026-11-07・RIZIN.55前日）★ 同じ名前を複数の端末・ブラウザで使えるようにする
--
-- 症状：仲間が予想を登録できない（2回目。1回目は2026-09-09）
--       new row violates row-level security policy for table "predictions" (42501)
--       Gakuの実機：LINEのアプリ内ブラウザで「ハメ太郎」として保存 → 拒否
--
-- 原因：「この名前の予想を書けるのは members.owner_uid の端末だけ」という設計。
--       owner_uid は端末のブラウザに保存された匿名IDで、次のどれでも別人扱いになる：
--         ・LINEのアプリ内ブラウザとSafariは保存領域が別（同じiPhoneでも別人）
--         ・iPhoneのSafariは7日サイトを開かないと保存データを消す
--         ・機種変更／PCから開く
--       いったん別の端末に紐づくと、二度と書けない。2026-09-10のお詫びで
--       「端末をまたいでも引き継げる仕組みに作り直します」と約束したまま、未実装だった。
--
-- 対策：名前ごとの「合言葉」を1つ持たせ、合言葉を入れた端末を member_devices に追加登録する。
--       書き込みの判定は「owner_uid が自分」または「member_devices に自分がいる」。
--       合言葉の値はこのファイルに書かない（公開リポジトリ）。別ファイルで投入する。
--
-- 併せて塞ぐ穴（同日の監査で発見）：
--   A) is_real_admin() が「匿名でないログイン者なら誰でも」＝メール登録が開いているので、
--      誰でもアカウントを作って管理者になれた → 管理者のUIDに固定する
--   B) 9月以降に取り込んだ外部予想者14人が is_curated=false のまま
--      ＝「持ち主のいない名前は誰でも名乗れる」に掛かり、第三者がその名義で予想を書き換えられた
-- ============================================================

-- 1) 追加の端末
create table if not exists member_devices (
  member_id  text not null references members(id) on delete cascade,
  uid        uuid not null,
  created_at timestamptz not null default now(),
  primary key (member_id, uid)
);
alter table member_devices enable row level security;
drop policy if exists "read own devices" on member_devices;
create policy "read own devices" on member_devices for select using (uid = auth.uid());
-- 書き込みのポリシーは作らない＝直接は誰も書けない。下の bind_by_code だけが書く

-- 2) 合言葉。ポリシー無し＝ブラウザからは誰も読めない
create table if not exists member_secrets (
  member_id text primary key references members(id) on delete cascade,
  code      text not null unique
);
alter table member_secrets enable row level security;

-- 3) 合言葉を入れた端末を、その名前の端末として登録する。成功したら member_id を返す
create or replace function public.bind_by_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare mid text;
begin
  if auth.uid() is null or p_code is null then return null; end if;
  select member_id into mid from member_secrets where code = lower(trim(p_code));
  if mid is null then
    perform pg_sleep(1);   -- 総当たりを遅くする
    return null;
  end if;
  insert into member_devices (member_id, uid) values (mid, auth.uid()) on conflict do nothing;
  return mid;
end $$;
revoke all on function public.bind_by_code(text) from public;
revoke all on function public.bind_by_code(text) from anon;
grant execute on function public.bind_by_code(text) to authenticated;

-- 4) 「この名前で書いてよいか」の判定を1か所に
create or replace function public.owns_member(p_member text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.id = p_member and m.owner_uid = auth.uid())
      or exists (select 1 from member_devices d where d.member_id = p_member and d.uid = auth.uid())
$$;
grant execute on function public.owns_member(text) to anon, authenticated;

-- 5) predictions：持ち主判定を owns_member に差し替える。受付時間の条件は従来どおり
drop policy if exists "own prediction (insert)" on predictions;
drop policy if exists "own prediction (update)" on predictions;
drop policy if exists "own prediction (delete)" on predictions;

create policy "own prediction (insert)" on predictions for insert
  with check (
    public.owns_member(member_id)
    and exists (select 1 from fights f join events e on e.id = f.event_id
                where f.id = fight_id
                  and (e.no_deadline
                       or ((e.open_at is null or e.open_at <= now())
                           and e.lock_at is not null and e.lock_at > now())))
  );
create policy "own prediction (update)" on predictions for update
  using (public.owns_member(member_id))
  with check (
    public.owns_member(member_id)
    and exists (select 1 from fights f join events e on e.id = f.event_id
                where f.id = fight_id
                  and (e.no_deadline
                       or ((e.open_at is null or e.open_at <= now())
                           and e.lock_at is not null and e.lock_at > now())))
  );
create policy "own prediction (delete)" on predictions for delete
  using (
    public.owns_member(member_id)
    and exists (select 1 from fights f join events e on e.id = f.event_id
                where f.id = fight_id
                  and (e.no_deadline
                       or ((e.open_at is null or e.open_at <= now())
                           and e.lock_at is not null and e.lock_at > now())))
  );

-- 6) 穴A：管理者をGakuのアカウントに固定する（admin.html でログインするUID）
create or replace function public.is_real_admin() returns boolean
language sql stable as $$
  select coalesce(auth.uid() = '2fab5754-ea0c-4c77-9a61-8e17b6893aec'::uuid, false)
$$;

-- 7) 穴B：外部予想者は全員「運営が入れた名前」＝誰も名乗れない
update members set is_curated = true where id like 'm_yt_%' and coalesce(is_curated, false) = false;

-- 確認用
--   select id, name, owner_uid, is_curated from members where coalesce(is_curated,false) = false;
--     → m_hame / m_nuki / m_maruyama の3人だけになっていればよい
--   select member_id from member_secrets order by 1;
--     → 合言葉を投入した名前が並ぶ（値は出さない）
