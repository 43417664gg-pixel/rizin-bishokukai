-- MMA以外のルール（キックボクシング等）の試合。
-- 予想は任意。**その大会の的中率には含めるが、通算の的中率には含めない**（Gaku確定 2026-08-21）。
-- no_score（体重超過＝どこでも採点しない）とは別概念なので列を分けている。
--
-- ※このDDLは任意。api.js の fillFromSeed が demo-data.js から補うため、
--   列が無くても本番の表示・採点は正しく動く。ストレージを正すための後追い作業。
alter table fights add column if not exists event_only boolean default false;
alter table fights add column if not exists event_only_note text;
