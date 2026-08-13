-- 選手名鑑のトップ画像に使う「試合の生写真」。試合中/試合後の熱量があり顔が見えるカットを
-- 人が1枚ずつ見て選定したもの（機械では顔の判定ができないため）。
-- ★このSQLを Supabase SQL Editor で実行してから同期すること（列が無いと黙って落ちる）。
alter table fighters add column if not exists action_photo text;
