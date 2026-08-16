-- 生写真の出典表記（RIZIN以外の団体から取った写真に付ける。例：© ONE Championship）。
-- ★このSQLを Supabase SQL Editor で実行してから同期すること。
alter table fighters add column if not exists action_photo_credit text;

-- 元王者（歴代のRIZIN王座。現役王者=belt と区別して銀バッジで出す）
alter table fighters add column if not exists former_belt text;
