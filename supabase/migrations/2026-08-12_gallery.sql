-- 試合の生写真ギャラリー（入場/ROUND中/勝利の雄叫び）。RIZIN公式の試合結果記事から機械抽出。
-- ★このSQLを Supabase SQL Editor で実行してから同期すること（列が無いと黙って落ちる）。
alter table fights add column if not exists gallery jsonb;
