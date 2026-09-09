-- ★緊急（2026-09-09・大会前日）★
-- 症状：仲間が予想を登録できない
--       new row violates row-level security policy for table "predictions" (42501)
--
-- 原因：2026-08-31_public_launch_rls.sql は本番に適用済みだったが、
--       適用されたのは「claim unowned member」ポリシーを追記する**前**の版だった。
--       そのため owner_uid が空の既存メンバー（仲間3人）を誰も自分のものにできず、
--       auth.uid() と紐づかない＝predictions への INSERT が全て拒否される状態だった。
--       （確認：members への UPDATE が 0 行で返る＝USING句で弾かれている）
--
-- これを流すと、仲間3人は次にサイトを開いた時点で自動的に紐づき、予想を登録できるようになる。
-- 運営枠（is_curated = true ＝ m_yt_* のインフルエンサー名義）は対象外なので乗っ取られない。

drop policy if exists "claim unowned member" on members;
create policy "claim unowned member" on members for update
  using (owner_uid is null and coalesce(is_curated,false) = false)
  with check (owner_uid = auth.uid() and coalesce(is_curated,false) = false);

-- 確認用：流したあとにサイトを開き直すと owner_uid が入る
--   select id, name, owner_uid, is_curated from members where id in ('m_hame','m_nuki','m_maruyama');
