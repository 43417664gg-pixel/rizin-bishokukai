-- ============================================================
-- 2026-11-10 名前のかぶり・なりすましを DB でも弾く
-- Gaku「名前登録して…名前のかぶりは使用されてますみたいな感じにして」
--
-- 画面（index.html の nameKey / guestNameProblem）でも同じことを確かめているが、
-- 画面の確認は API を直接叩けば素通りできる。最後の砦はここ。
--
-- 「同じ名前」の判定＝見た目が同じなら同じ：
--   全角半角（NFKC）・大文字小文字・空白・中黒（・）の違いは無視する。
--   例：「青木 真也」「青木・真也」「ﾊﾒ太郎」は、既存の「青木真也」「ハメ太郎」と同じ名前。
--
-- 11/10 実測：members 40件で、この鍵での衝突は0件・予約語を含む名前も0件
-- （＝このSQLは既存データを壊さずに通る）。
-- ============================================================

-- 画面の nameKey() と同じ鍵を作る関数（索引に使うので immutable）
create or replace function public.member_name_key(n text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(regexp_replace(normalize(coalesce(n, ''), NFKC), '[[:space:]・]', '', 'g'))
$$;

-- 同じ鍵の名前は2つ作れない（同じ瞬間に同じ名前で押された場合も、片方は 23505 で弾かれる）
create unique index if not exists members_name_key_uniq
  on public.members (public.member_name_key(name));

-- サイトや運営を名乗る名前は、一般の登録では使えない（掲載中の予想者＝is_curated は対象外）
alter table public.members drop constraint if exists members_name_reserved;
alter table public.members add constraint members_name_reserved
  check (coalesce(is_curated, false) or normalize(name, NFKC) !~ '(予想番付|運営|管理人|公式)');

-- 確認（流したあとに実行・どちらも1行返れば成功）
-- select indexname from pg_indexes where indexname = 'members_name_key_uniq';
-- select conname from pg_constraint where conname = 'members_name_reserved';
