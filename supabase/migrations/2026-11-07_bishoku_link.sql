-- ============================================================
-- ★緊急（2026-11-07・RIZIN.55前日）★ 美食会の3人は「LINEの固定リンク」から開けば必ず予想できる
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
-- 運用（Gaku確定・2026-11-07）：美食会の3人はLINEでやりとりし、Gakuが毎回同じリンクを引用して
--       「お願いします」と投稿する。3人はそのリンクから入り、自分の名前で予想する。
--
-- 対策：そのリンクに「美食会の鍵」を1つ埋め込む（index.html#bishoku=<鍵>）。
--       リンクから開いたブラウザを group_devices に登録し、登録済みのブラウザは
--       美食会3人の名前で予想を書ける。ブラウザがデータを消しても、同じリンクから開けば自動で戻る。
--       鍵の無いURLで開いた第三者は、3人の名前で書けない（一般公開に耐える）。
--       鍵の値はこのファイルに書かない（公開リポジトリ）。別ファイルで投入する。
--
-- 併せて塞ぐ穴（同日の監査で発見）：
--   A) is_real_admin() が「匿名でないログイン者なら誰でも」＝メール登録が開いているので、
--      誰でもアカウントを作って管理者になれた → 管理者のUIDに固定する
--   B) 9月以降に取り込んだ外部予想者14人が is_curated=false のまま
--      ＝「持ち主のいない名前は誰でも名乗れる」に掛かり、第三者がその名義で予想を書き換えられた
--   C) 同じ穴で、丸山探偵事務所（持ち主が空）も最初に選んだ人のものになっていた
--      → 「持ち主のいない名前を名乗る」ポリシー自体を廃止（美食会はリンクの鍵で書ける）
-- ============================================================

-- 1) 美食会の鍵で登録されたブラウザ
create table if not exists group_devices (
  uid        uuid primary key,
  created_at timestamptz not null default now()
);
alter table group_devices enable row level security;
drop policy if exists "read own group device" on group_devices;
create policy "read own group device" on group_devices for select using (uid = auth.uid());
-- 書き込みのポリシーは作らない＝直接は誰も書けない。下の join_bishoku だけが書く

-- 2) 鍵。ポリシー無し＝ブラウザからは誰も読めない
create table if not exists app_secrets (
  name text primary key,
  code text not null
);
alter table app_secrets enable row level security;

-- 3) 鍵の入ったリンクで開いたブラウザを、美食会のブラウザとして登録する
create or replace function public.join_bishoku(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_code is null then return false; end if;
  if not exists (select 1 from app_secrets where name = 'bishoku' and code = lower(trim(p_code))) then
    perform pg_sleep(1);   -- 総当たりを遅くする
    return false;
  end if;
  insert into group_devices (uid) values (auth.uid()) on conflict do nothing;
  return true;
end $$;
revoke all on function public.join_bishoku(text) from public;
revoke all on function public.join_bishoku(text) from anon;
grant execute on function public.join_bishoku(text) to authenticated;

-- 4) 「この名前で書いてよいか」の判定を1か所に
--    ゲスト（自分で作った名前）＝作ったブラウザ／美食会3人＝鍵で登録したブラウザ
--    ※3人の一覧は site/js/app.js の BISHOKU と揃える
create or replace function public.owns_member(p_member text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.id = p_member and m.owner_uid = auth.uid())
      or (p_member in ('m_hame', 'm_nuki', 'm_maruyama')
          and exists (select 1 from group_devices g where g.uid = auth.uid()))
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

-- 8) 穴C：持ち主のいない名前を名乗るポリシーを廃止
drop policy if exists "claim unowned member" on members;

-- 確認用
--   select id, name, owner_uid, is_curated from members where coalesce(is_curated,false) = false;
--     → m_hame / m_nuki / m_maruyama の3人だけになっていればよい
--   select name from app_secrets;   → bishoku が1行（値は出さない）
--   select count(*) from group_devices;   → リンクから開いたブラウザの数
