-- ★このSQLを Supabase SQL Editor で実行してから admin の⚡同期を押すこと。
--   同期処理は「DBに無い列を黙って落として続行」するため、
--   列が無いまま同期しても該当項目だけ反映されず、エラーも出ない。
-- add column if not exists は冪等なので、birth_date を既に足していても安全。

-- 年齢表示のため（表示時に計算。数値では持たない）
alter table fighters add column if not exists birth_date date;

-- 試合の中止・延期（この大会では実施されない試合。予想は残し、採点からは除外）
alter table fights add column if not exists cancelled boolean not null default false;
alter table fights add column if not exists cancel_note text;
