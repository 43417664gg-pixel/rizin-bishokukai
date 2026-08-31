# 保留中の予想（Supabase復旧後に投入する）

**なぜ保留か**：2026-08-31、Supabaseプロジェクト `rdlhhnbwjomlejszmkbv` のホスト名がDNSごと消え、
本番DBへ書き込めない。復旧後にここの内容を upsert すること。

## Gaku提供（2026-08-31・著名人の予想）

| 予想者 | 試合 | 勝者 | 決まり手 | R |
|---|---|---|---|---|
| JOY | cho5_06 ダウトベック vs 平本蓮 | 平本蓮 | 判定 | — |
| 鬼ごえトマホーク良ちゃん | cho5_06 ダウトベック vs 平本蓮 | 平本蓮 | — | — |
| ハリウッドザコシショウ | cho5_07 朝倉未来 vs 青木真也 | 青木真也 | — | — |
| チュートリアル福田 | cho5_07 朝倉未来 vs 青木真也 | 朝倉未来 | パウンドアウト | 2R |
| 前田日明 | cho5_07 朝倉未来 vs 青木真也 | 朝倉未来 | — | — |
| 鬼ごえトマホーク良ちゃん | cho5_08 シェイドゥラエフ vs マッキー | ラジャブアリ・シェイドゥラエフ | バックチョーク | 2R |
| JOY | cho5_08 シェイドゥラエフ vs マッキー | ラジャブアリ・シェイドゥラエフ | 判定 | — |

### 投入時の対応表（機械照合済み）

| member_id | 表示名 | 状態 |
|---|---|---|
| `m_yt_joy` | JOY | 新規 |
| `m_yt_onigoe_ryo` | 鬼ごえトマホーク良ちゃん | 新規 |
| `m_yt_zakoshisyou` | ハリウッドザコシショウ | 新規 |
| `m_yt_tutorial_fukuda` | チュートリアル福田 | 新規 |
| `m_yt_336fd122` | 前田日明 | **既存**（本人チャンネル nWhCRPfBtqk から取り込み済み） |

```js
// JOY
{ member_id:"m_yt_joy", fight_id:"cho5_06", winner_id:"f_hiramoto",   method:"DEC" }
{ member_id:"m_yt_joy", fight_id:"cho5_08", winner_id:"f_shaydullaev", method:"DEC" }
// 鬼ごえトマホーク良ちゃん
{ member_id:"m_yt_onigoe_ryo", fight_id:"cho5_06", winner_id:"f_hiramoto" }
{ member_id:"m_yt_onigoe_ryo", fight_id:"cho5_08", winner_id:"f_shaydullaev", method:"SUB", round:2, technique:"rnc" }
// ハリウッドザコシショウ
{ member_id:"m_yt_zakoshisyou", fight_id:"cho5_07", winner_id:"f_aoki" }
// チュートリアル福田
{ member_id:"m_yt_tutorial_fukuda", fight_id:"cho5_07", winner_id:"f_mikuru", method:"KO", round:2, technique:"gnp" }
// 前田日明（既存メンバー・既に同じ内容が入っているので再投入は不要）
{ member_id:"m_yt_336fd122", fight_id:"cho5_07", winner_id:"f_mikuru" }
```

**決まり手の割当根拠**
- 「バックチョーク」→ `rnc`（リアネイキドチョーク）。techniques.js に「バックチョーク」の項目は無く、背後からの裸絞めが対応する
- 「パウンドアウト」→ `gnp`（パウンド＝削り切り）

**照合結果**：前田日明の朝倉未来は、本人チャンネルから取り込み済みの予想と**一致**。裏が取れた形。

### 要確認（Gaku）
**出典**。台帳のルールで第三者の予想には出典（媒体名・URL・日付）が要る。
RIZIN公式「超RIZIN.5 超緊急追加カード発表&国民超予想SP」
（https://www.youtube.com/live/Zgo-nVipTEo ・2026-08-17）でよいか、別番組かを教えてほしい。
確定したら `influencer_sources.md` に台帳行を足して本番へ入れる。
