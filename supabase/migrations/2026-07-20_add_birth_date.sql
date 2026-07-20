-- 年齢表示のため fighters に生年月日を追加する。
-- 年齢そのものを数値で持たない：誕生日を跨いだ瞬間に嘘になるため、表示時に計算する。
--
-- ★このSQLを Supabase SQL Editor で実行してから admin の⚡同期を押すこと。
--   同期処理は「DBに無い列を黙って落として続行」するため、
--   列が無いまま同期しても birth_date だけが反映されず、エラーも出ない。
alter table fighters add column if not exists birth_date date;
