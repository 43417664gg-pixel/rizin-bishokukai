-- ============================================================
-- 一般公開（X告知）の前に必ず実行する。仲間内前提のゆるいRLSを締める。
--
-- いまの穴：
--   predictions … 所有者チェックが無く、member_id を指定すれば誰でも
--                 他人の予想を INSERT/UPDATE/DELETE できる
--   members     … 誰でも作成・改名できる（既存メンバーの改名も可）
--
-- 方針：Supabase の匿名サインイン（signInAnonymously）で端末ごとに auth.uid() を発行し、
--       members に持ち主を持たせ、「自分のメンバーの予想だけ触れる」に締める。
--       取り込み済みのインフルエンサー予想は owner_uid が null ＝ 誰も書き換えられない（読み取り専用）。
-- ★このSQLだけでは完結しない。app側で signInAnonymously を呼ぶ実装が対になる。
-- ============================================================

-- 0) ★最重要★ 管理者ポリシーを匿名から切り離す
-- Supabaseの匿名サインインは role='authenticated' を与える。既存の
--   create policy "admin write ..." on ... for all to authenticated using (true)
-- は「ログインしていれば誰でも書ける」という意味なので、匿名を有効にした瞬間に
-- **全訪問者が管理者になる**（2026-09-02に発見）。本物の管理者だけに絞り直す。
create or replace function public.is_real_admin() returns boolean
language sql stable as $$
  select coalesce(auth.role() = 'authenticated', false)
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

do $$
declare t text;
begin
  foreach t in array array['members','fighters','events','fights','predictions'] loop
    execute format('drop policy if exists "admin write %s" on %I', t, t);
    execute format($f$create policy "admin write %s" on %I for all
                     using (public.is_real_admin()) with check (public.is_real_admin())$f$, t, t);
  end loop;
end $$;

-- 1) 持ち主の列
alter table members add column if not exists owner_uid uuid;
alter table members add column if not exists is_curated boolean default false;

-- 取り込み済み（インフルエンサー・著名人・選手本人）は運営が入れたもの＝書き換え禁止にする
update members set is_curated = true where id like 'm_yt_%';

-- 2) members：作成は自分名義のみ／改名は自分のものだけ／運営枠は触らせない
drop policy if exists "anyone create members" on members;
drop policy if exists "anyone update members" on members;
create policy "create own member" on members for insert
  with check (owner_uid = auth.uid() and coalesce(is_curated,false) = false);
create policy "update own member" on members for update
  using (owner_uid = auth.uid() and coalesce(is_curated,false) = false)
  with check (owner_uid = auth.uid() and coalesce(is_curated,false) = false);

-- 2.5) 引き継ぎ（claim）：持ち主が空のメンバーを、一度だけ自分のものにできる。
-- これが無いと「SQLを流す前に仲間3人がサイトを開いていないと永久に締め出される」
-- という危うい順番依存になる。運営枠(is_curated)は対象外なので、
-- インフルエンサー名義を他人に乗っ取られることはない。
create policy "claim unowned member" on members for update
  using (owner_uid is null and coalesce(is_curated,false) = false)
  with check (owner_uid = auth.uid() and coalesce(is_curated,false) = false);

-- 3) predictions：自分のメンバーの予想だけ。受付時間の条件は従来どおり残す
drop policy if exists "predict in window (insert)" on predictions;
drop policy if exists "predict in window (update)" on predictions;
drop policy if exists "predict in window (delete)" on predictions;

create policy "own prediction (insert)" on predictions for insert
  with check (
    exists (select 1 from members m where m.id = member_id and m.owner_uid = auth.uid())
    and exists (select 1 from fights f join events e on e.id = f.event_id
                where f.id = fight_id
                  and (e.no_deadline
                       or ((e.open_at is null or e.open_at <= now())
                           and e.lock_at is not null and e.lock_at > now())))
  );
create policy "own prediction (update)" on predictions for update
  using (exists (select 1 from members m where m.id = member_id and m.owner_uid = auth.uid()))
  with check (
    exists (select 1 from members m where m.id = member_id and m.owner_uid = auth.uid())
    and exists (select 1 from fights f join events e on e.id = f.event_id
                where f.id = fight_id
                  and (e.no_deadline
                       or ((e.open_at is null or e.open_at <= now())
                           and e.lock_at is not null and e.lock_at > now())))
  );
create policy "own prediction (delete)" on predictions for delete
  using (
    exists (select 1 from members m where m.id = member_id and m.owner_uid = auth.uid())
    and exists (select 1 from fights f join events e on e.id = f.event_id
                where f.id = fight_id
                  and (e.no_deadline
                       or ((e.open_at is null or e.open_at <= now())
                           and e.lock_at is not null and e.lock_at > now())))
  );

-- 4) 既存の仲間3人（m_hame / m_nuki / m_maruyama）について
--    owner_uid は空のまま。上の「claim unowned member」により、
--    **本人が次にサイトを開いた時点で自動的に紐づく**（app側の claimMyMember が実行する）。
--    本人の操作は不要。SQLを先に流しても締め出されない。
--
-- 5) 実行の前提（順番）
--    ① Anonymous sign-ins は**既に有効**（2026-09-02に確認済み・作業不要）
--    ② このSQLを実行する（0)で管理者ポリシーを匿名から切り離し、以降を締める）
--    ③ site/js/config.js の ENABLE_ANON_AUTH を true にして push
--    ④ 仲間3人にサイトを1回開いてもらう（自動で引き継がれる）
--    ⑤ X告知
--
--    ★②より先に③をやってはいけない。匿名が role=authenticated を持つため、
--      既存の admin ポリシーを通って全訪問者が管理者になる。
