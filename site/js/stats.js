// 選手の STATS（大会ページの向かい合わせの表・前戦・直近5試合）と、名鑑の本人だけの表。
// 大会ページと名鑑で同じ部品を使う（Gaku 11/8「名鑑も作り直そう。スタッツもそのまま載せられるし」）。
// statsBlock は各ページの FMAP（選手id→選手）を引く。esc・ageText は app.js
// その場で判断できるように：戦績・勝ち方の割合・前戦（WIN／LOSE）。トグルで直近5試合（Gaku依頼11/7）
// 開閉はカードを描き直しても保つ（選手をタップするたびに閉じないように）
const statsOpen = new Set();
// 結果は記号でなく語で（Gaku 11/8「まるばつじゃなくて WIN LOSE にしよ」）
const RMARK = { W: ["WIN", "w"], L: ["LOSE", "l"], D: ["DRAW", "d"], NC: ["NC", "d"] };
const recentOf = (x) => [...(x?.history || [])].sort((a, b) => String(b.d).localeCompare(String(a.d)));
// 日付は WIN／LOSE の下に小さく（11/8）。決着の説明の後ろに付けると説明が1行ぶん伸び、カードがスマホの1画面に収まらなくなる
const resMark = (r, d) => { const [s, c] = RMARK[r] || ["?", "d"]; return `<span class="rm ${c}">${s}${d ? `<small>${esc(d)}</small>` : ""}</span>`; };
const histRow = (r) => `<div class="st-row">${resMark(r.r, r.d)}<span class="st-body"><span class="st-opp">${esc(r.opp)}</span>
  ${r.how ? `<span class="st-how">${esc(r.how)}</span>` : ""}</span></div>`;
// STATS は向かい合わせの表（Gaku 11/8「情報としては抜け漏れなくていいんだけど配置とかレイアウトデザインに余地あり」）：
// 項目名（戦績・KO・一本・判定・年齢）を真ん中に1回だけ置き、左右の数字を同じ段で向かい合わせる＝比べたいものが横に並ぶ。
// 前は左右それぞれに「KO 0 一本 7 判定 16」の凡例と割合入りのバーを持ち、年齢は戦績の横の空きに浮いていた。
// 勝ち方は真ん中から外へ伸びるバー（長さ＝自分の勝ちのうちの割合）。数（何勝）は真ん中寄り、割合はバーの先。
// 色はコーナーの赤・青だけ（11/8「赤青の色もそれぞれ刺して」）：勝ち数とフィニッシュ（KO・一本）のバー。判定は灰
const WAYS = [["KO", "rec_ko", "k"], ["一本", "rec_sub", "s"], ["判定", "rec_dec", "d"]];
const hasWays = (x) => x?.rec_ko != null && !!x?.rec_w;
// 母数は勝ち数（反則勝ち等の「その他」は割合の残りになる）。内訳の合計が勝ち数を超える古いデータでもはみ出さない
const waysBase = (x) => Math.max(x.rec_w, WAYS.reduce((a, [, k]) => a + (x[k] ?? 0), 0));
function tapeWay(x, key, cls) {
  if (!hasWays(x)) return `<span class="tp-none">—</span>`;
  const n = x[key] ?? 0, p = n / waysBase(x);
  return `<b class="tp-c${n ? "" : " zero"}">${n}</b>${n ? `<span class="tp-bar ${cls}"><i style="--p:${p.toFixed(3)}"></i><em>${Math.round(p * 100)}%</em></span>` : ""}`;
}
function tapeRec(x) {
  if (x?.rec_w == null) return `<span class="tp-none">戦績なし</span>`;
  // 分・NC は脇役＝敗の横に小さく（両方あれば縦に2つ）。2行目に置くと、フィニッシュ率の段を足したカードがスマホの1画面に収まらない（11/8）
  const dn = [x.rec_d && `<span><b>${x.rec_d}</b>分</span>`, x.rec_nc && `<span><b>${x.rec_nc}</b>NC</span>`].filter(Boolean).join("");
  return `<span class="tp-wl"><span class="st-n w"><b>${x.rec_w}</b>勝</span><span class="st-n l"><b>${x.rec_l ?? 0}</b>敗</span>${dn ? `<span class="tp-dn">${dn}</span>` : ""}</span>`;
}
// フィニッシュ率＝勝ちのうち KO・一本の割合（Gaku 11/8「フィニッシュレートの方が大事」）。戦績のすぐ下に、勝ち方の内訳の要約として大きめに出す
const tapeFin = (x) => hasWays(x)
  ? `<span class="tp-fin"><b>${Math.round(((x.rec_ko ?? 0) + (x.rec_sub ?? 0)) / waysBase(x) * 100)}</b>%</span>` : `<span class="tp-none">—</span>`;
// 年齢・身長・リーチは表の一番下に小さく1段（Gaku 11/8「優先度としては低いから表示も小さめでいいよ」）。身長・リーチは RIZIN公式の選手ページ（fetch_profiles.py）。
// 真ん中寄り＝身長/リーチ（項目名の隣）、外側＝年齢。2人とも身長・リーチが無い試合は年齢だけの段にする
const cmv = (v) => v != null ? `<b>${v}</b>` : `<b class="na">—</b>`;
function tapeBody(x, hr) {
  const a = ageText(x?.birth_date).match(/^(\d+)歳/)?.[1];   // 数字だけ（生年月日は名鑑で）
  const parts = [hr && `<span class="tp-hr">${cmv(x?.height_cm)}<i>/</i>${cmv(x?.reach_cm)}<small>cm</small></span>`, a && `<span class="tp-age"><b>${a}</b>歳</span>`].filter(Boolean);
  return parts.length ? parts.join("") : `<span class="tp-none">—</span>`;
}
function statsTape(f1, f2) {
  const row = (k, cls, a, b) => `<div class="tp-row ${cls}"><div class="tp-v c1">${a}</div><div class="tp-k">${k}</div><div class="tp-v c2">${b}</div></div>`;
  // 2人とも内訳が無い試合は勝ち方の段ごと出さない（「—」が6つ並ぶだけになる）
  const anyWays = hasWays(f1) || hasWays(f2);
  const ways = anyWays ? WAYS.map(([l, k, c]) => row(l, "way", tapeWay(f1, k, c), tapeWay(f2, k, c))).join("") : "";
  const hr = [f1, f2].some(x => x?.height_cm != null || x?.reach_cm != null);
  return `<div class="st-tape"><div class="st-sep s1"></div>
    <div class="tp-rows">${row("戦績", "rec", tapeRec(f1), tapeRec(f2))}${anyWays ? row("FINISH", "fin", tapeFin(f1), tapeFin(f2)) : ""}${ways}${
      row(hr ? "<span>身長</span><span>リーチ</span>" : "年齢", `body${hr ? " hr" : ""}`, tapeBody(f1, hr), tapeBody(f2, hr))}</div></div>`;
}
// 名前の段＝異名だけ。
// 選手名は出さない（Gaku 11/8「異名だけでいいかも。名前は書かなくていいや。カードに書いてある」＝真上の写真と下の札に名前がある）。
// 年齢は STATS の表の1段へ（「年齢はSTATSの空きスペースに入れよう。そこは異名だけ」→ 11/8 向かい合わせの表にして段を持たせた）。
// 異名を囲む “ ” は外した（Gaku 11/8「異名も“”いらないかも」）。横のコーナー色の棒も外した（Gaku 11/8「異名の横のコーナー色はいらない」）＝左右は列の位置と上の縁の赤青で分かる。
// 異名は列の中央（Gaku 11/8「異名は中央に」）
function statsHead(x, cls) {
  return `<div class="st-side ${cls}">
    <div class="st-head">${x?.nickname ? `<span class="st-nick" title="${esc(x.nickname)}">${esc(x.nickname)}</span>` : ""}</div>
  </div>`;
}
// 前戦は左右の列のまま（相手の名前が長い）。左右の段は subgrid で高さをそろえる
function lastSide(x, cls) {
  const h = recentOf(x);
  return `<div class="st-side ${cls}">
    <div class="st-gap g2"></div>
    ${h[0] ? histRow(h[0]) : `<div class="st-row"><span class="st-how">データなし</span></div>`}
  </div>`;
}
// 直近5試合の開閉。札は「前戦」の帯の右端（下に1段置くと、カードの頭から判断材料までがスマホの1画面に収まらない・Gaku 11/8「まずそこが外せない条件」）。
// 開くと前戦の下に残りの4試合が続く（前戦は出したまま＝同じ試合を2回並べない）
function toggleStats(b, id) {
  const on = b.closest(".stats").classList.toggle("open");
  statsOpen[on ? "add" : "delete"](id);
  b.setAttribute("aria-expanded", on);
}
function statsBlock(f) {
  const f1 = FMAP[f.fighter1_id], f2 = FMAP[f.fighter2_id];
  const n = Math.min(5, Math.max(recentOf(f1).length, recentOf(f2).length));
  const list = (x, cls) => { const rows = recentOf(x).slice(1, 5).map(histRow);
    while (rows.length < n - 1) rows.push("<div></div>");
    return `<div class="st-side ${cls}">${rows.join("")}</div>`; };
  const open = statsOpen.has(f.id);
  // STATS・前戦は最初から開いたまま（11/8 の「スクロールで飛び出して開く」は Gaku 11/8「飛び出て引っ込む仕組みはもう終わり。解除」で廃止）。
  // 2人とも異名が無ければ名前の段は出さない（空の帯になる）
  const nonick = !f1?.nickname && !f2?.nickname;
  return `<div class="stats${nonick ? " nonick" : ""}${open ? " open" : ""}" data-f="${f.id}">
    <div class="st-cols st-names" style="--rows:1">${statsHead(f1, "c1")}${statsHead(f2, "c2")}</div>
    ${statsTape(f1, f2)}
    <div class="st-cols st-main" style="--rows:2">${lastSide(f1, "c1")}${lastSide(f2, "c2")}<div class="st-sep s2">${n > 1
      ? `<button type="button" class="st-tg" aria-expanded="${open}" onclick="toggleStats(this, '${f.id}')">直近5試合</button>` : ""}</div></div>
    ${n > 1 ? `<div class="st-cols st-list" style="--rows:${n - 1}">${list(f1, "c1")}${list(f2, "c2")}</div>` : ""}
  </div>`;
}

// 異名は切らない・途中で折らない（Gaku指摘11/7「異名切れてる」）。入りきらない時は字を小さくして1行に収める。
// 10pxでも入らない長い異名だけ折り返す（.wrap）。左右の異名は字の大きさを揃える（「異名の上下位置がズレてるとカッコ悪い」Gaku指摘11/7）
function fitNicks() {
  const px = (el) => parseFloat(getComputedStyle(el).fontSize);
  // はみ出しは文字の実寸（小数）で測る。scrollWidth は整数に丸まり、1px未満のはみ出しで「…」が出ても気づけなかった（11/8）
  const over = (el) => { const r = document.createRange(); r.selectNodeContents(el);
    return r.getBoundingClientRect().width > el.getBoundingClientRect().width + .05 || el.scrollWidth > el.clientWidth + 1; };
  const shrink = (el, min) => {
    el.style.fontSize = "";
    let fs = px(el);
    while (over(el) && fs > min) { fs -= 0.5; el.style.fontSize = fs + "px"; }
    return !over(el);
  };
  document.querySelectorAll(".st-names").forEach(row => {
    const nicks = [...row.querySelectorAll(".st-nick")];
    nicks.forEach(k => { k.classList.remove("wrap"); if (!shrink(k, 10)) k.classList.add("wrap"); });
    const min = Math.min(...nicks.map(px));
    nicks.forEach(k => { if (px(k) > min) k.style.fontSize = min + "px"; });
  });
}

// ---------- 名鑑の本人だけの表 ----------
// 大会ページの向かい合わせの表の片側（同じ順・同じ数字の大きさ）。項目名は左の帯に置き、数字とバーは右へ伸びる。
// 名鑑にはコーナーが無いので、勝ち数・バーに赤青を使わない：KO・一本＝白、判定＝灰（Gaku 11/8 確定。前戦の WIN＝白／LOSE＝灰と揃う）。
// 年齢は生年月日まで（大会ページは数字だけで「生年月日は名鑑で」としている）
function soloTape(x) {
  const row = (k, cls, v) => `<div class="tp-row ${cls}"><div class="tp-k">${k}</div><div class="tp-v solo">${v}</div></div>`;
  const ways = hasWays(x) ? WAYS.map(([l, k, c]) => row(l, "way", tapeWay(x, k, c))).join("") : "";
  const age = ageText(x?.birth_date), a = age.match(/^(\d+)歳/)?.[1], born = age.match(/（(.+)）/)?.[1];
  const hr = x?.height_cm != null || x?.reach_cm != null;
  return `<div class="st-solo"><div class="tp-rows">${row("戦績", "rec", tapeRec(x))}${
    hasWays(x) ? row("FINISH", "fin", tapeFin(x)) : ""}${ways}${
    a ? row("年齢", "body", `<span class="tp-age"><b>${a}</b>歳</span>${born ? `<span class="tp-born">${esc(born)}</span>` : ""}`) : ""}${
    hr ? row("<span>身長</span><span>リーチ</span>", "body hr", `<span class="tp-hr">${cmv(x.height_cm)}<i>/</i>${cmv(x.reach_cm)}<small>cm</small></span>`) : ""}</div></div>`;
}
// 名鑑の全戦績の1行＝大会ページの前戦と同じ形（WIN／LOSE＋日付・相手・決着）。相手が名鑑にいれば押せる
function recordRow(r, byName) {
  const opp = byName?.[r.opp];
  return `<div class="st-row">${resMark(r.r, r.d)}<span class="st-body">${opp
    ? `<a class="st-opp lk" href="fighter.html?id=${opp.id}">${esc(r.opp)}<i>›</i></a>` : `<span class="st-opp">${esc(r.opp)}</span>`}
    ${r.how ? `<span class="st-how">${esc(r.how)}</span>` : ""}</span></div>`;
}
