// 「美食会予想まとめ」＝美食会3人の予想と応援を、全カードの公式VSバナーの上に丸アイコンで1枚に描く。
// LINE画像（tools/line_summary/summary.html → render.sh）と大会ページ（ALL PICKSの上・Gaku指示11/7）で同じ描き方を使う。
// 幅1080pxの1枚として組む。ページでは Shadow DOM に入れて縮小表示する（サイトのCSSと class 名がぶつからないように）。
//   render(D, o) … D = { members, preds, supports, zones, built_at }（zones＝build_data.py が測ったバナーの明るさ・色）
//                  o = { ev, fights（中止を除き番号の大きい順）, fname(id), img(url), layout, demo }
(function () {
const CSS = `
  .sheet { --gold:#c9a84a; --ink:#f4f4f6; --mute:#9a9aa2; --bg:#0b0b0e; --line:#26262e;
           box-sizing:border-box; width:1080px; padding:40px 24px 30px; background:var(--bg); color:var(--ink);
           font-family:"Noto Sans JP",sans-serif; line-height:normal; letter-spacing:normal; text-align:left; }
  :where(.sheet *) { box-sizing:border-box; margin:0; padding:0; }   /* 詳細度0＝下の各ルールが必ず勝つ（元は * ） */
  /* ── 最上部 ── */
  .hd { border-left:10px solid #e60012; padding-left:18px; }
  .hd .ttl { font-size:70px; font-weight:900; line-height:1.1; letter-spacing:.02em; }
  .hd .ttl b { color:var(--gold); }
  .hd .sub { margin-top:6px; font-size:27px; font-weight:700; color:var(--mute); }
  .hd .sub em { font-style:normal; color:var(--ink); }
  .who { display:flex; gap:24px; flex-wrap:wrap; margin:20px 0 8px; }
  .who .m { display:flex; align-items:center; gap:10px; font-size:25px; font-weight:900; }
  .who .m .ic { --ic:52px; border-width:3px; }
  .who .m small { font-size:21px; color:var(--mute); font-weight:700; }
  .legend { font-size:20px; color:var(--mute); font-weight:700; margin-bottom:26px; }
  .legend b { color:var(--ink); }

  /* ── 試合カード（列数ごとにアイコンと文字の大きさを決める。写真ほどは縮めない） ── */
  .grid { display:grid; gap:18px 16px; margin-bottom:22px; }
  /* minmax(0,1fr)＝長い試合名でも列が押し広げられない（1fr だと右端がはみ出した） */
  .c1 { grid-template-columns:minmax(0,1fr);    --ic:108px; --ci:68px; --u:1; }
  .c2 { grid-template-columns:repeat(2,minmax(0,1fr)); --ic:68px; --ci:50px; --u:.64; }
  .c3 { grid-template-columns:repeat(3,minmax(0,1fr)); --ic:52px; --ci:42px; --u:.5; }
  .fc { min-width:0; }
  .lab { display:flex; align-items:center; gap:calc(12px * var(--u)); margin-bottom:calc(8px * var(--u));
         font-size:calc(28px * var(--u)); font-weight:900; white-space:nowrap; overflow:hidden; }
  .lab .no { color:var(--gold); flex:none; }
  .lab .tt { overflow:hidden; text-overflow:ellipsis; }
  .lab .bd { margin-left:auto; flex:none; font-size:calc(22px * var(--u)); padding:calc(3px * var(--u)) calc(12px * var(--u));
             border-radius:999px; border:2px solid; }
  .lab .bd.split { color:#ffcf66; border-color:#6b5420; }
  .lab .bd.same  { color:#7fe0a0; border-color:#25553a; }
  .ph { position:relative; margin-bottom:calc(var(--ic) / 2 + 34px * var(--u)); }
  .ph .banner { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; border-radius:calc(8px * var(--u)); }
  /* 下端の影＝丸が乗る帯を絵から一段下げる。濃さ（--scrim）は大会ごとのバナーのうるささで決まる。顔のある上半分には掛けない */
  .ph .scrim { position:absolute; left:0; right:0; bottom:0; height:38%; border-radius:0 0 calc(8px * var(--u)) calc(8px * var(--u));
               background:linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,var(--scrim, .45))); }

  /* 勝敗予想＝バナーの下端にまたがる大きい丸（その選手の側） */
  .side { position:absolute; top:calc(100% - var(--ic) / 2); display:flex; gap:calc(12px * var(--u)); }
  .side.l { left:calc(16px * var(--u)); }
  .side.r { right:calc(16px * var(--u)); flex-direction:row-reverse; }
  .pk { display:flex; flex-direction:column; align-items:center; }
  /* 白い縁の外にもう1本黒い縁＝シール。どの大会の絵の上でも輪郭が切れる */
  .ic { width:var(--ic); height:var(--ic); border-radius:50%; display:flex; align-items:center; justify-content:center; flex:none;
        font-size:calc(var(--ic) * .48); font-weight:900; color:#fff; border:calc(5px * var(--u) + 1px) solid #fff;
        box-shadow:0 0 0 calc(3px * var(--u) + 1px) #08080a, 0 3px 12px rgba(0,0,0,.75); text-shadow:0 1px 3px rgba(0,0,0,.5); }
  .ic.lt, .ci.lt { color:#141414; text-shadow:none; }   /* 金など明るい塗り＝白い字が沈むので黒字 */
  /* 背景がその人の色に近い／明るい場所だけ、黒い後光を足す（build_data.py が大会ごとにバナーを測る） */
  .ic.pop, .ci.pop { box-shadow:0 0 0 calc(3px * var(--u) + 2px) #08080a, 0 0 calc(20px * var(--u) + 6px) calc(8px * var(--u) + 3px) rgba(0,0,0,.8); }
  .pk .mt { margin-top:calc(3px * var(--u)); font-size:calc(23px * var(--u)); font-weight:900; color:var(--gold); white-space:nowrap; }

  /* 応援＝上の隅の小さい丸。点線の縁＋📣で勝敗の丸と見分ける */
  .cheer { position:absolute; top:calc(12px * var(--u)); display:flex; gap:calc(14px * var(--u)); }
  .cheer.l { left:calc(12px * var(--u)); }
  .cheer.r { right:calc(20px * var(--u)); flex-direction:row-reverse; }
  .ci { position:relative; width:var(--ci); height:var(--ci); border-radius:50%; display:flex; align-items:center; justify-content:center;
        font-size:calc(var(--ci) * .46); font-weight:900; color:#fff; border:calc(4px * var(--u) + 1px) dashed #fff;
        box-shadow:0 0 0 calc(2px * var(--u) + 1px) #08080a, 0 2px 10px rgba(0,0,0,.7); }
  /* 金地に📣だと沈んで読めなかった＝白地の「📣応援」札を丸の下端に掛ける */
  .ci .mg { position:absolute; left:50%; bottom:calc(-14px * var(--u) - 4px); transform:translateX(-50%); white-space:nowrap;
            background:#fff; color:#111; border-radius:999px; padding:calc(2px * var(--u) + 1px) calc(9px * var(--u) + 2px);
            font-size:calc(19px * var(--u) + 3px); font-weight:900; line-height:1.2; box-shadow:0 1px 5px rgba(0,0,0,.7); }

  /* まだ予想していない人＝帯の真ん中に薄く */
  .yet { position:absolute; top:calc(100% + 8px * var(--u)); left:50%; transform:translateX(-50%); display:flex; align-items:center;
         gap:calc(6px * var(--u)); font-size:calc(20px * var(--u)); font-weight:700; color:var(--mute); white-space:nowrap; }
  .yet .ic { --ic:calc(42px * var(--u) + 4px); border-width:2px; opacity:.45; box-shadow:none; }

  .ft { display:flex; justify-content:space-between; font-size:20px; color:var(--mute); font-weight:700; }
  .ft b { color:var(--ink); } .ft b span { color:var(--gold); }
`;
const LAYOUTS = { wide3: [[1, 1], [99, 3]], tier: [[1, 1], [6, 2], [99, 3]], wide2: [[1, 1], [99, 2]] };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const METHOD = { KO:"KO", SUB:"一本", DEC:"判定" };
const WD = "日月火水木金土";

function render(D, o) {
const { ev, fights, fname } = o;
const rows = LAYOUTS[o.layout] || LAYOUTS.wide3;
const DEMO = !!o.demo;
if (DEMO) {   // 勝敗・決まり手・応援・未予想が一通り出るように散らす
  const P = [["KO", 1], ["DEC", null], ["SUB", 2]];
  D.preds = []; D.supports = [];
  fights.forEach((f, i) => D.members.forEach((m, j) => {
    if ((i + j) % 4 === 3) return;
    D.preds.push({ member_id: m.id, fight_id: f.id, winner_id: (i * 2 + j) % 3 ? f.fighter1_id : f.fighter2_id, method: P[j][0], round: P[j][1] });
    if ((i + j) % 3 === 0) D.supports.push({ member_id: m.id, fight_id: f.id, fighter_id: j % 2 ? f.fighter1_id : f.fighter2_id });
  }));
}
const ini = m => esc(String(m.name).trim().slice(0, 1));
// 塗りが明るい（金など）なら黒字。相対輝度 > .4
const light = c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b > .4; };
// 沈む＝その場所の画素の12%以上がその人の色に近い（ΔE<30）か、場所が明るい（L≥62）
const sinks = (f, zone, m) => { const z = D.zones?.[f.id]?.[zone]; return !!z && (z.L >= 62 || (z.sim[m.id] || 0) >= .12); };
const icon = (m, f, zone) => `<span class="ic${light(m.color) ? " lt" : ""}${f && sinks(f, zone, m) ? " pop" : ""}" style="background:${esc(m.color)}">${ini(m)}</span>`;
// 絵の彩度が高い大会ほど下端の影を濃く（.3〜.65）
const scrimOf = f => { const c = D.zones?.[f.id]?.chroma; return c == null ? .45 : Math.min(.65, Math.max(.3, .3 + (c - 15) / 60)).toFixed(2); };
const predOf = (m, f) => D.preds.find(p => p.member_id === m.id && p.fight_id === f.id);
const supOf = (m, f) => D.supports.find(s => s.member_id === m.id && s.fight_id === f.id);

function fightCard(f) {
  const picks = D.members.map(m => ({ m, p: predOf(m, f) })).filter(x => x.p);
  const side = fid => picks.filter(x => x.p.winner_id === fid).map(({ m, p }) => {
    const mt = p.method ? METHOD[p.method] + (p.method !== "DEC" && p.round ? ` ${p.round}R` : "") : "";
    return `<div class="pk">${icon(m, f, fid === f.fighter1_id ? "bl" : "br")}${mt ? `<div class="mt">${mt}</div>` : ""}</div>`;
  }).join("");
  const cheer = fid => D.members.filter(m => supOf(m, f)?.fighter_id === fid)
    .map(m => { const z = fid === f.fighter1_id ? "tl" : "tr";
      return `<span class="ci${light(m.color) ? " lt" : ""}${sinks(f, z, m) ? " pop" : ""}" style="background:${esc(m.color)}">${ini(m)}<span class="mg">📣応援</span></span>`; }).join("");
  const yet = D.members.filter(m => !predOf(m, f));
  const winners = new Set(picks.map(x => x.p.winner_id));
  const badge = picks.length < 2 ? "" : winners.size === 1 ? `<span class="bd same">一致</span>` : `<span class="bd split">割れた</span>`;
  const title = f.title_label || `${fname(f.fighter1_id)} vs ${fname(f.fighter2_id)}`;
  return `<div class="fc">
    <div class="lab"><span class="no">第${f.order_no}試合</span><span class="tt">${esc(title)}</span>${badge}</div>
    <div class="ph">
      <img class="banner" src="${esc(o.img(f.image_url))}"><div class="scrim" style="--scrim:${scrimOf(f)}"></div>
      <div class="cheer l">${cheer(f.fighter1_id)}</div><div class="cheer r">${cheer(f.fighter2_id)}</div>
      <div class="side l">${side(f.fighter1_id)}</div><div class="side r">${side(f.fighter2_id)}</div>
      ${yet.length ? `<div class="yet">まだ ${yet.map(icon).join("")}</div>` : ""}
    </div>
  </div>`;
}

let rest = fights.slice(), grids = "";
for (const [n, cols] of rows) {
  const chunk = rest.splice(0, n);
  if (chunk.length) grids += `<div class="grid c${cols}">${chunk.map(fightCard).join("")}</div>`;
}

const d = new Date(ev.event_date + "T00:00:00+09:00");
const lock = ev.lock_at ? new Date(ev.lock_at) : null;
const counts = D.members.map(m => `<span class="m">${icon(m)}${esc(m.name)}<small>${D.preds.filter(p => p.member_id === m.id).length}/${fights.length}</small></span>`).join("");
return `
  <div class="hd">
    <div class="ttl">美食会<b>予想まとめ</b>${DEMO ? `<span style="font-size:30px;color:#ff5a67;margin-left:16px">見本（ダミー）</span>` : ""}</div>
    <div class="sub"><em>${esc(ev.name)}</em>　${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}（${WD[d.getDay()]}）${lock ? `　締切 ${lock.getMonth() + 1}/${lock.getDate()} ${lock.getHours()}:${String(lock.getMinutes()).padStart(2, "0")}` : ""}</div>
  </div>
  <div class="who">${counts}</div>
  <div class="legend"><b>下の丸</b>＝その選手が勝つと予想　<b>上の「📣応援」の丸</b>＝その選手を応援（勝敗とは別）</div>
  ${grids}
  <div class="ft"><span>${esc(D.built_at)}時点</span><b>予想<span>番付</span>　43417664gg-pixel.github.io/rizin-bishokukai</b></div>`;
}

window.BishokuSummary = { CSS, render };
})();
