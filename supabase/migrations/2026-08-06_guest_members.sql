-- ゲスト登録：一般ユーザーが名前だけで自分のメンバーを作れるようにする。
-- 予想テーブルと同じ「匿名でも投稿可」の方針（仲間内・noindex前提）。Supabase SQL Editor で1回実行。
alter table members enable row level security;
drop policy if exists "public read members"    on members;
drop policy if exists "anyone create members"  on members;
drop policy if exists "anyone update members"  on members;
create policy "public read members"   on members for select using (true);
create policy "anyone create members" on members for insert with check (true);
create policy "anyone update members" on members for update using (true);
-- ※現状「誰でも作成/改名できる」ゆるい設定。将来アカウント連携時に
--   「自分のゲストメンバーだけ改名/削除できる」へ締める（auth.uid()紐付け）。
