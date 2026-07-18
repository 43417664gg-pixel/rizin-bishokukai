# RIZIN美食会予想 — 仲間内勝敗予想ポータル

仲間内でRIZINの勝敗を予想し合い、**的中率・ピタリ・あらます**の三段梯子で競うポータル。

## ルール（三段梯子）
勝者を当てて**的中**（的中率の本体）。決まり手＋ラウンドまで一致で**ピタリ**（判定決着は決まり手のみ）。フィニッシュ技まで完全一致で**あらます**。勝者を外したら全部不成立。未回答はノーカウント。

## 構成
- `site/` — 静的サイト本体（GitHub Pages想定）
  - `index.html` プレイヤー選択＋大会一覧
  - `event.html` 予想画面（締切後は答え合わせに変身）
  - `ranking.html` 的中率ランキング
  - `fighter.html` 選手STATS（ポータル内蓄積）
  - `admin.html` 管理：大会/選手/カード登録・結果入力（結果の一次ソース＝JMOC公式リザルト）
  - `js/config.js` Supabase接続設定。**空だとデモモード**（ブラウザ内保存）
- `supabase/schema.sql` — DBスキーマ＋RLS（締切後の予想はDBが拒否）

## 締切モード
- 通常：`open_at`（計量後開放）→`lock_at`（前日24:00締切）→締切後に全員公開→結果発表
- **締切なし**：大会に `no_deadline: true` を設定すると、いつでも予想＆編集OK・みんなの予想も常時公開（オープンブック）。現在のLANDMARK 15はこのモード

## 本番化の手順（← いまここ。友達とデータ共有するには必須）
> ⚠️ Supabase未接続の「デモモード」では予想が**各ブラウザのローカル保存**になり、他人とデータが共有されない。友達みんなで使うにはSupabase接続が必須。
1. Supabase無料プロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行（no_deadline列・RLS込み）
3. Authentication > Users で管理用ユーザー（メール＋パスワード）を1つ作成
4. Project Settings > API の URL と anon key を `site/js/config.js` に記入 →「デモ」バッジが消え本番モードに
5. admin.html にログイン → 大会に締切なしフラグ等を設定、メンバー3人は登録済み
6. `gh repo create` でGitHub P/Pages公開 → 仲間にURL共有（noindex・限定運用）

## 画像
選手VSバナー・ポスターはRIZIN公式（rizin.jp）から取得。仲間内限定利用。
