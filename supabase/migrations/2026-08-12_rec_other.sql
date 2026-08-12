-- 勝利内訳の「その他」（反則勝ち・ドクターストップ等。KOでも一本でも判定でもない決着）。
-- これが無いと、その他勝ちのある選手（青木真也・ケラモフ）で内訳が勝数に届かず円グラフが出ない。
-- ★このSQLを Supabase SQL Editor で実行してから同期すること（列が無いと黙って落ちる）。
alter table fighters add column if not exists rec_other integer;
