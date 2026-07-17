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

## 本番化の手順
1. Supabase無料プロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行
3. Authentication > Users で管理用ユーザー（メール＋パスワード）を1つ作成
4. Project Settings > API の URL と anon key を `site/js/config.js` に記入
5. admin.html からメンバー・大会・カードを登録

## 画像
選手VSバナー・ポスターはRIZIN公式（rizin.jp）から取得。仲間内限定利用。
