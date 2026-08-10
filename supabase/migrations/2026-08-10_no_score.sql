-- 体重超過など「試合はやるが予想対象外（採点しない）」フラグ。
-- cancelled（試合が消滅）とは別概念：試合は行われ、勝者も出るが、的中率には含めない。
-- ★このSQLを Supabase SQL Editor で実行してから admin の⚡同期を押すこと。
--   同期は「DBに無い列を黙って落として続行」するため、列が無いまま同期すると
--   該当項目だけ反映されず、エラーも出ない（＝バッジが出ない）。add column if not exists は冪等。
alter table fights add column if not exists no_score boolean not null default false;
alter table fights add column if not exists no_score_note text;
