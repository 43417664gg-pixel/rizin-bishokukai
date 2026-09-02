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

-- 4) 既存の仲間3人（m_hame / m_nuki / m_maruyama）は owner_uid が無いので、
--    このまま流すと本人が編集できなくなる。移行手順は2つのどちらか：
--      A. 3人に一度サイトで「引き継ぎ」操作をしてもらい owner_uid を紐付ける（要app実装）
--      B. 当面この3人だけ is_curated=false のまま旧ポリシーを残す
--    ※Gakuの判断待ち。決まるまでこのSQLは流さないこと。
