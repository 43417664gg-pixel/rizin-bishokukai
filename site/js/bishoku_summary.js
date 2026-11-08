// 「美食会予想まとめ」＝美食会3人の予想と応援を、全カードの公式VSバナーの上に丸アイコンで1枚に描く。
// LINE画像（tools/line_summary/summary.html → render.sh）と大会ページ（ALL PICKSの上・Gaku指示11/7）で同じ描き方を使う。
// 幅1080pxの1枚として組む。ページでは Shadow DOM に入れて縮小表示する（サイトのCSSと class 名がぶつからないように）。
//   render(D, o) … D = { members, preds, supports, zones, built_at }（zones＝build_data.py が測ったバナーの明るさ・色）
//                  o = { ev, fights（中止を除き番号の大きい順）, fname(id), img(url), layout, demo, results }
// 結果が1試合でも入ると「答え合わせ」の描き方になる（Gaku 11/8「うん」）：上に3人の成績、勝った側に WIN＋決着、負けた側の絵は暗く、
// 当たった丸は金の輪・外れた丸は灰色。採点は app.js の scoreFight／computeLeaderboard（ルールの正本）をそのまま使う＝勝敗だけで数える
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
  .hd.bare { margin-bottom:18px; }   /* 大会ページ：下の文字を外した分、絵との間をあける（オッズのバーを足した分を 30→18 で吸う・下の .odds） */
  .sheet.bare { padding-top:28px; }
  .hd .sub { margin-top:6px; font-size:27px; font-weight:700; color:var(--mute); }
  .hd .sub em { font-style:normal; color:var(--ink); }
  .who { display:flex; gap:24px; flex-wrap:wrap; margin:20px 0 8px; }
  .who .m { display:flex; align-items:center; gap:10px; font-size:25px; font-weight:900; }
  .who .m .ic { --ic:52px; border-width:3px; }
  .who .m small { font-size:21px; color:var(--mute); font-weight:700; }
  .legend { font-size:20px; color:var(--mute); font-weight:700; margin-bottom:26px; }
  .legend .x { color:#ff4a5a; }
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
  /* オッズのバー＝その試合の全員の予想の割合（大会ページの各カードの得票率バーと同じ・赤＝写真の左・青＝右）。大会ページだけ・各カードの一番下
     （Gaku 11/8「オッズのバーも入れられる？うまくサイズは変えずに」「「第12試合 o vs o」小さいしいらないんじゃない？」→「オッズのバーは上部じゃなくて下部」）。
     写真の下に垂れる予想の丸と決まり手の、さらに下。試合名の段を外した分で賄い、まとめ全体の高さは変えない：3列の段は試合名24px→バー19.5px、浮いた分と上の余白（30→18・40→28）でメインのバー42pxを賄う */
  .odds { --cut:calc(10px * var(--u) + 2px); --gap:calc(4px * var(--u) + 1px); display:flex; height:calc(30px * var(--u));
          margin-top:calc(15px * var(--u) - 3px); }
  .odds > i { display:flex; align-items:center; min-width:0; overflow:hidden; white-space:nowrap; font-style:normal;
              font:600 calc(21px * var(--u))/1 var(--num, "Oswald"), sans-serif; letter-spacing:.05em; color:rgba(255,255,255,.92);
              box-shadow:inset 0 1px 0 rgba(255,255,255,.1); }
  .odds > .r { background:linear-gradient(90deg, #2b0609, #7d0d16 55%, #c4111f); padding-left:calc(12px * var(--u));
               clip-path:polygon(0 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%); }
  .odds > .b { background:linear-gradient(270deg, #061328, #123a74 55%, #1f5fbf); padding-right:calc(12px * var(--u)); justify-content:flex-end;
               clip-path:polygon(var(--cut) 0, 100% 0, 100% 100%, 0 100%); }
  .odds > .r + .b { margin-left:calc(var(--gap) - var(--cut)); }
  .odds > .n { flex:1; background:#1a1a20; }   /* まだ誰も予想していない */
  /* 真ん中に薄く「ODDS」（Gaku 11/8「邪魔しないけど、見たら、あ、オッズかと分かる感じ」・各カードの .vb と同じ） */
  .odds { position:relative; }
  .odds::after { content:"ODDS"; position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); pointer-events:none;
                 font:600 calc(15px * var(--u) + 2px)/1 var(--num, "Oswald"), sans-serif; letter-spacing:.32em; margin-left:.16em; color:rgba(255,255,255,.3); }
  .sheet.bare .fc { display:flex; flex-direction:column; }   /* 写真の下の余白（垂れる丸の分）とバーの上の余白を足し算にする（縦に積むだけだと大きい方に呑まれて、バーが決まり手に寄りすぎた） */
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
        font-size:calc(var(--ic) * .6); font-weight:900; color:#fff; border:calc(4px * var(--u) + 1px) solid var(--t, #f4f1ea);
        box-shadow:0 0 0 calc(3px * var(--u) + 1px) #08080a, 0 3px 12px rgba(0,0,0,.75); text-shadow:0 1px 3px rgba(0,0,0,.5); }
  /* 塗りは原色ベタではなく、左上に光・縁に影の球（Gaku 11/7「丸アイコンの色もデザイン寄せて」）。赤・青・金の系統は見分けの目印なので残す */
  .ic, .ci { background:radial-gradient(circle at 32% 26%, color-mix(in srgb, var(--c) 58%, #fff) 0%, var(--c) 46%, color-mix(in srgb, var(--c) 52%, #000) 100%); }
  .ic.sq, .ci.sq { border-radius:12%; }   /* 抜き太郎だけ正方形（Gaku指定11/7） */
  /* ハメ太郎は三角形（Gaku 11/8）。角を丸め辺を少し膨らませた三角（style.css の span.mav.tri と同じ形）。
     三角に切ると縁と黒いシールの輪郭（border／box-shadow）も消えるので、
     縁（寮の金）と塗りは疑似要素の三角2枚を重ね、黒い輪郭は drop-shadow で形に沿わせる */
  .ic.tri, .ci.tri { position:relative; isolation:isolate; border:0; border-radius:0; background:none; box-shadow:none;
        --tri:polygon(37.3% 9.0%, 39.9% 6.5%, 43.0% 4.6%, 46.4% 3.4%, 50.0% 3.0%, 53.6% 3.4%, 57.0% 4.6%, 60.1% 6.5%, 62.7% 9.0%, 68.4% 16.2%, 73.7% 23.6%, 78.8% 31.2%, 83.5% 39.0%, 87.9% 47.0%, 91.9% 55.1%, 95.6% 63.5%, 99.0% 71.9%, 99.9% 75.4%, 100.0% 79.1%, 99.3% 82.6%, 97.9% 85.9%, 95.7% 88.8%, 93.0% 91.2%, 89.8% 92.9%, 86.3% 93.9%, 77.3% 95.3%, 68.2% 96.2%, 59.1% 96.8%, 50.0% 97.0%, 40.9% 96.8%, 31.8% 96.2%, 22.7% 95.3%, 13.7% 93.9%, 10.2% 92.9%, 7.0% 91.2%, 4.3% 88.8%, 2.1% 85.9%, 0.7% 82.6%, 0.0% 79.1%, 0.1% 75.4%, 1.0% 71.9%, 4.4% 63.5%, 8.1% 55.1%, 12.1% 47.0%, 16.5% 39.0%, 21.2% 31.2%, 26.3% 23.6%, 31.6% 16.2%);
        filter:drop-shadow(3px 0 0 #08080a) drop-shadow(-3px 0 0 #08080a) drop-shadow(0 3px 0 #08080a) drop-shadow(0 -3px 0 #08080a) drop-shadow(0 3px 10px rgba(0,0,0,.7)); }
  .ic.tri::before, .ic.tri::after, .ci.tri::before, .ci.tri::after { content:""; position:absolute; z-index:-1; clip-path:var(--tri); }
  .ic.tri::before, .ci.tri::before { inset:0; background:var(--t, #f4f1ea); }
  /* 縁の太さ b を辺で揃える＝内側の三角を重心に向けて縮める（上 1.506b・左右 1.292b・下 1.078b） */
  .ic.tri::after, .ci.tri::after { --b:calc(4px * var(--u) + 1px); inset:calc(var(--b) * 1.506) calc(var(--b) * 1.292) calc(var(--b) * 1.078);
        background:radial-gradient(circle at 44% 62%, color-mix(in srgb, var(--c) 58%, #fff) 0%, var(--c) 46%, color-mix(in srgb, var(--c) 52%, #000) 100%); }
  /* 頭文字は字の実際の形で真ん中に、大きさを揃えて（Gaku 11/8「丸とか中心じゃない」「文字で大きさが異なりすぎ」・style.css の span.mav と同じ比率）。
     --gs/--gx/--gy は app.js の fitGlyph が1字ずつ測って入れる。三角は中心から高さの7%下（重心では「ハの位置が下すぎる」）、丸・四角と同じ大きさに見える50%（「ハだけ小さい？」） */
  .ic > i, .ci > i { --k:calc(var(--ic) * .53); font-style:normal; display:inline-block; line-height:1; font-size:calc(var(--k) * var(--gs, 1.14));
        transform:translate(calc(var(--gx, 0) * 1em), calc(var(--gy, 0) * 1em)); }
  .ci > i { --k:calc(var(--ci) * .53); }
  .ic.sq > i { --k:calc(var(--ic) * .56); }
  .ci.sq > i { --k:calc(var(--ci) * .56); }
  .ic.tri > i { --k:calc(var(--ic) * .5); position:relative; top:calc(var(--ic) * .07); }
  .ci.tri > i { --k:calc(var(--ci) * .5); position:relative; top:calc(var(--ci) * .07); }
  .ic.lt, .ci.lt { color:#1a1408; text-shadow:none; }   /* 金など明るい塗り＝白い字が沈むので黒字 */
  /* 縁の色＝寮の差し色（ハメ＝金・抜き＝銀・丸山＝黄〔11/8 黒から変更〕・Gaku指定11/7）。正本は demo-data.js の members[].trim。
     字は寮の色にしない＝白（明るい塗りだけ黒）。「色は背景であって、中の文字は視認性優先」（Gaku 11/7） */
  /* 背景がその人の色に近い／明るい場所だけ、黒い後光を足す（build_data.py が大会ごとにバナーを測る） */
  .ic.pop, .ci.pop { box-shadow:0 0 0 calc(3px * var(--u) + 2px) #08080a, 0 0 calc(20px * var(--u) + 6px) calc(8px * var(--u) + 3px) rgba(0,0,0,.8); }
  .pk .mt { margin-top:calc(3px * var(--u)); font-size:calc(23px * var(--u)); font-weight:900; color:var(--gold); white-space:nowrap; }

  /* 応援＝上の隅の小さい丸。点線の縁＋📣で勝敗の丸と見分ける */
  .cheer { position:absolute; top:calc(12px * var(--u)); display:flex; gap:calc(14px * var(--u)); }
  .cheer.l { left:calc(12px * var(--u)); }
  .cheer.r { right:calc(20px * var(--u)); flex-direction:row-reverse; }
  .ci { position:relative; width:var(--ci); height:var(--ci); border-radius:50%; display:flex; align-items:center; justify-content:center;
        font-size:calc(var(--ci) * .56); font-weight:900; color:#fff; border:calc(4px * var(--u) + 1px) dashed var(--t, #fff);
        box-shadow:0 0 0 calc(2px * var(--u) + 1px) #08080a, 0 2px 10px rgba(0,0,0,.7); }
  /* 金地に📣だと沈んで読めなかった＝白地の「📣応援」札を丸の下端に掛ける */
  .ci .mg { position:absolute; left:50%; bottom:calc(-14px * var(--u) - 4px); transform:translateX(-50%); white-space:nowrap;
            background:#fff; color:#111; border-radius:999px; padding:calc(2px * var(--u) + 1px) calc(9px * var(--u) + 2px);
            font-size:calc(19px * var(--u) + 3px); font-weight:900; line-height:1.2; box-shadow:0 1px 5px rgba(0,0,0,.7); }

  /* まだ予想していない人＝帯の真ん中に薄く */
  .yet { position:absolute; top:calc(100% + 8px * var(--u)); left:50%; transform:translateX(-50%); display:flex; align-items:center;
         gap:calc(6px * var(--u)); font-size:calc(20px * var(--u)); font-weight:700; color:var(--mute); white-space:nowrap; }
  .yet .ic { --ic:calc(42px * var(--u) + 4px); border-width:2px; opacity:.45; box-shadow:none; }
  .yet .ic.tri { filter:none; }

  /* ── 答え合わせ ── */
  /* 3人の成績＝並びは予想まとめと同じ固定（順位の数字は出さない・王冠は一番だけ。Gaku「丸山先生を置いてけぼりにしたくない」） */
  .score { --u:1; display:flex; gap:16px; margin:22px 0 14px; }
  /* 札の文字はスマホで約1/3に縮む（1080→約350px）＝元の 25/54/30/19px だと名前8px・ピタリ6px相当。丸を小さく・余白を詰めて文字に回す（Gaku 11/8「文字ちっちゃくない？」） */
  .score .sc { position:relative; flex:1; min-width:0; display:flex; align-items:center; gap:12px; padding:14px 14px 12px;
               background:#15151b; border:2px solid var(--line); border-radius:16px; }
  .score .sc.top { border-color:#8a6d22; background:linear-gradient(160deg, #2a2210, #15151b 70%); }
  .score .ic { --ic:60px; }
  .score .tx { min-width:0; }
  .score .nm { font-size:33px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .score .nm .cr { margin-left:6px; }
  .score .num { margin-top:2px; display:flex; align-items:baseline; gap:10px; white-space:nowrap; }
  .score .num b { font:700 70px/1 var(--num, "Oswald"), sans-serif; }
  .score .num b small { font-size:42px; color:var(--mute); margin-left:2px; }
  .score .num em { font:700 42px/1 var(--num, "Oswald"), sans-serif; font-style:normal; color:var(--gold); }
  .score .pt { margin-top:6px; font-size:27px; font-weight:700; color:var(--mute); }
  .score .pt b { color:var(--ink); }
  .hd.bare + .score { margin-top:0; }
  /* 勝った側＝WIN と決着（写真の下端、丸の少し上）。負けた側の半分は暗く・色を抜く */
  .ph .lose { position:absolute; top:0; bottom:0; width:50%; background:rgba(6,6,8,.55); -webkit-backdrop-filter:grayscale(1); backdrop-filter:grayscale(1); }
  .ph .lose.l { left:0; border-radius:calc(8px * var(--u)) 0 0 calc(8px * var(--u)); }
  .ph .lose.r { right:0; border-radius:0 calc(8px * var(--u)) calc(8px * var(--u)) 0; }
  .win { position:absolute; bottom:calc(var(--ic) / 2 + 20px * var(--u) + 4px); display:flex; align-items:center; gap:calc(10px * var(--u));
         padding:calc(6px * var(--u) + 1px) calc(14px * var(--u) + 2px); border-radius:calc(8px * var(--u) + 2px);
         background:#e60012; box-shadow:0 0 0 calc(2px * var(--u) + 1px) #08080a, 0 3px 12px rgba(0,0,0,.6); white-space:nowrap; }
  .win.l { left:calc(16px * var(--u)); } .win.r { right:calc(16px * var(--u)); }
  .win b { font:700 calc(40px * var(--u) + 2px)/1 "Anton", var(--num, "Oswald"), sans-serif; letter-spacing:.04em; color:#fff; }
  .win span { font-size:calc(28px * var(--u) + 2px); font-weight:900; line-height:1; color:#fff; }
  /* 対象外（体重超過・無効試合・ドロー）＝真ん中に札。丸は薄く */
  .ph .void { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(6px * var(--u));
              background:rgba(6,6,8,.55); border-radius:calc(8px * var(--u)); }
  .ph .void b { padding:calc(6px * var(--u) + 1px) calc(18px * var(--u) + 2px); border-radius:999px; background:#2a2a32; border:2px solid #55555f;
                font-size:calc(34px * var(--u) + 2px); font-weight:900; line-height:1.1; color:#e8e8ee; }
  .ph .void span { font-size:calc(24px * var(--u) + 2px); font-weight:700; color:#c8c8d0; text-shadow:0 1px 4px #000; }
  .ph.off .side, .ph.off .yet { opacity:.45; }
  /* 当たり＝黒いシールの外にもう1本、金の輪。外れ＝色を抜いて沈める */
  .pk.hit .ic { box-shadow:0 0 0 calc(3px * var(--u) + 1px) #08080a, 0 0 0 calc(7px * var(--u) + 3px) #ffd34d, 0 0 calc(18px * var(--u) + 6px) calc(6px * var(--u) + 2px) rgba(255,211,77,.5); }
  .pk.hit .ic.tri { box-shadow:none; filter:drop-shadow(3px 0 0 #08080a) drop-shadow(-3px 0 0 #08080a) drop-shadow(0 3px 0 #08080a) drop-shadow(0 -3px 0 #08080a)
        drop-shadow(3px 0 0 #ffd34d) drop-shadow(-3px 0 0 #ffd34d) drop-shadow(0 3px 0 #ffd34d) drop-shadow(0 -3px 0 #ffd34d) drop-shadow(0 0 10px rgba(255,211,77,.6)); }
  /* 外れ＝誰の丸かは分かるまま（色はやや落とすだけ）、右肩に ✕ の札（Gaku 11/8「負けた方の選択したアイコンが全く消えるのはわかりにくい」） */
  .pk { position:relative; }
  .pk.miss .ic { filter:saturate(.55) brightness(.82); }
  .pk.miss .ic.tri { filter:saturate(.55) brightness(.82) drop-shadow(3px 0 0 #08080a) drop-shadow(-3px 0 0 #08080a) drop-shadow(0 3px 0 #08080a) drop-shadow(0 -3px 0 #08080a); }
  .pk .x { position:absolute; top:calc(var(--ic) * -.1); right:calc(var(--ic) * -.14); width:calc(var(--ic) * .44); height:calc(var(--ic) * .44);
           display:flex; align-items:center; justify-content:center; border-radius:50%; background:#16161b; border:calc(2px * var(--u) + 1px) solid #f4f4f6;
           box-shadow:0 1px 6px rgba(0,0,0,.7); font-size:calc(var(--ic) * .3); font-weight:900; line-height:1; color:#ff4a5a; }
  .pk.miss .mt { color:#9a9aa2; }
  /* ピタリ＝KO・一本の決まり手とラウンドまで当てた（判定決着はピタリなし・11/8）。数えるのは勝敗だけ、これは印 */
  .pk .mt.pt { margin-top:calc(6px * var(--u) + 2px); padding:calc(2px * var(--u) + 1px) calc(10px * var(--u) + 2px); border-radius:999px;
               background:#ffd34d; color:#1a1408; }
  .lab .bd.hit { color:#ffd34d; border-color:#6b5420; }
  .lab .bd.off { color:var(--mute); border-color:#3a3a44; }
  .ft { display:flex; justify-content:space-between; font-size:20px; color:var(--mute); font-weight:700; }
  .ft b { color:var(--ink); } .ft b span { color:var(--gold); }
`;
const LAYOUTS = { wide3: [[1, 1], [99, 3]], tier: [[1, 1], [6, 2], [99, 3]], wide2: [[1, 1], [99, 2]] };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const METHOD = { KO:"KO", SUB:"一本", DEC:"判定" };
const WD = "日月火水木金土";

function render(D, o) {
const { ev, fname } = o;
let fights = o.fights;
const rows = LAYOUTS[o.layout] || LAYOUTS.wide3;
const DEMO = !!o.demo;
// 大会ページに埋める時（Gaku指示11/7）：見出しの下の日付・締切・人数・凡例、一番上の試合名、「一致」「割れた」を出さない。LINE画像はそのまま
const BARE = !!o.bare;
if (DEMO) {   // 勝敗・決まり手・応援・未予想が一通り出るように散らす
  const P = [["KO", 1], ["DEC", null], ["SUB", 2]];
  D.preds = []; D.supports = [];
  fights.forEach((f, i) => D.members.forEach((m, j) => {
    if ((i + j) % 4 === 3) return;
    D.preds.push({ member_id: m.id, fight_id: f.id, winner_id: (i * 2 + j) % 3 ? f.fighter1_id : f.fighter2_id, method: P[j][0], round: P[j][1] });
    if ((i + j) % 3 === 0) D.supports.push({ member_id: m.id, fight_id: f.id, fighter_id: j % 2 ? f.fighter1_id : f.fighter2_id });
  }));
}
// 答え合わせの見本（?res=demo）：ダミーの結果。体重超過と無効試合も1つずつ混ぜる
const DEMO_RES = o.results === "demo";
if (DEMO_RES) fights = fights.map((f, i) => {
  if (i === 5) return { ...f, no_score: true, winner_id: null, result_method: null };
  if (i === 8) return { ...f, no_score: false, winner_id: f.fighter1_id, result_method: "NC", result_round: 1 };
  const m = ["KO", "DEC", "SUB", "DEC"][i % 4];
  return { ...f, no_score: false, winner_id: i % 3 === 1 ? f.fighter2_id : f.fighter1_id, result_method: m,
           result_round: m === "DEC" ? null : i % 3 + 1, result_technique: null };
});
// 試合ごとの決着：fin＝結果が入った（採点できる・対象外と決まった）／off＝対象外（体重超過・無効試合・ドロー）
const fin = f => !!(f.no_score || (f.winner_id && f.result_method));
const off = f => !!(f.no_score || f.result_method === "NC" || f.result_method === "DRAW");
const RES = fights.some(fin);
const judge = (p, f) => fin(f) && !off(f) && window.scoreFight ? window.scoreFight(p, f, { scope: "event" }) : null;
const result = f => f.result_method === "DEC" ? "判定" : `${f.result_round ? f.result_round + "R " : ""}${METHOD[f.result_method] || ""}`;
const offText = f => f.no_score ? "体重超過" : f.result_method === "NC" ? "無効試合" : "ドロー";
const ini = m => esc(String(m.name).trim().slice(0, 1));
const seedOf = m => ((window.DEMO_SEED && window.DEMO_SEED.members) || []).find(x => x.id === m.id) || {};
const trimOf = m => seedOf(m).trim || "";
const paint = m => `--c:${esc(m.color)}${trimOf(m) ? `;--t:${esc(trimOf(m))}` : ""}`;
const sq = m => ({ square: " sq", triangle: " tri" })[seedOf(m).shape] || "";
// 頭文字は <i> で包む＝app.js の fitGlyph が字の形を測って真ん中に置く
const face = m => `<i>${ini(m)}</i>`;
// 塗りが明るい（金など）なら黒字。相対輝度 > .4
const light = c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b > .4; };
// 沈む＝その場所の画素の12%以上がその人の色に近い（ΔE<30）か、場所が明るい（L≥62）
const sinks = (f, zone, m) => { const z = D.zones?.[f.id]?.[zone]; return !!z && (z.L >= 62 || (z.sim[m.id] || 0) >= .12); };
const icon = (m, f, zone) => `<span class="ic${sq(m)}${light(m.color) ? " lt" : ""}${f && sinks(f, zone, m) ? " pop" : ""}" style="${paint(m)}">${face(m)}</span>`;
// 絵の彩度が高い大会ほど下端の影を濃く（.3〜.65）
const scrimOf = f => { const c = D.zones?.[f.id]?.chroma; return c == null ? .45 : Math.min(.65, Math.max(.3, .3 + (c - 15) / 60)).toFixed(2); };
const predOf = (m, f) => D.preds.find(p => p.member_id === m.id && p.fight_id === f.id);
const supOf = (m, f) => D.supports.find(s => s.member_id === m.id && s.fight_id === f.id);

// オッズのバー（大会ページだけ・D.odds＝{fight_id:[左の人数, 右の人数]}）。割合の数字は15%以上の側だけ（細い側に字は入らない）
function odds(f) {
  const [a, b] = D.odds[f.id] || [0, 0], n = a + b;
  if (!n) return `<div class="odds"><i class="n"></i></div>`;
  const p1 = Math.round(a / n * 100), p2 = 100 - p1;
  return `<div class="odds">${p1 ? `<i class="r" style="flex:${p1}">${p1 >= 15 ? p1 + "%" : ""}</i>` : ""}${p2 ? `<i class="b" style="flex:${p2}">${p2 >= 15 ? p2 + "%" : ""}</i>` : ""}</div>`;
}
function fightCard(f) {
  const picks = D.members.map(m => ({ m, p: predOf(m, f) })).filter(x => x.p);
  const side = fid => picks.filter(x => x.p.winner_id === fid).map(({ m, p }) => {
    const s = judge(p, f);
    const mt = s?.pitari ? `<div class="mt pt">ピタリ</div>`
      : p.method ? `<div class="mt">${METHOD[p.method] + (p.method !== "DEC" && p.round ? ` ${p.round}R` : "")}</div>` : "";
    return `<div class="pk${s ? s.winnerHit ? " hit" : " miss" : ""}">${icon(m, f, fid === f.fighter1_id ? "bl" : "br")}${s && !s.winnerHit ? `<span class="x">✕</span>` : ""}${mt}</div>`;
  }).join("");
  const cheer = fid => D.members.filter(m => supOf(m, f)?.fighter_id === fid)
    .map(m => { const z = fid === f.fighter1_id ? "tl" : "tr";
      return `<span class="ci${sq(m)}${light(m.color) ? " lt" : ""}${sinks(f, z, m) ? " pop" : ""}" style="${paint(m)}">${face(m)}<span class="mg">📣応援</span></span>`; }).join("");
  const yet = D.members.filter(m => !predOf(m, f));
  const winners = new Set(picks.map(x => x.p.winner_id));
  const scored = picks.map(x => judge(x.p, f)).filter(s => s?.counted), nHit = scored.filter(s => s.winnerHit).length;
  const badge = BARE ? "" : off(f) ? `<span class="bd off">対象外</span>`
    : scored.length ? `<span class="bd ${nHit ? "hit" : "off"}">${nHit === scored.length ? "全員的中" : nHit ? `的中 ${nHit}/${scored.length}` : "全員外れ"}</span>`
    : picks.length < 2 ? "" : winners.size === 1 ? `<span class="bd same">一致</span>` : `<span class="bd split">割れた</span>`;
  const won = fin(f) && !off(f) ? (f.winner_id === f.fighter1_id ? "l" : "r") : "";
  const title = f.title_label || `${fname(f.fighter1_id)} vs ${fname(f.fighter2_id)}`;
  return `<div class="fc">
    ${BARE ? "" : `<div class="lab"><span class="no">第${f.order_no}試合</span><span class="tt">${esc(title)}</span>${badge}</div>`}
    <div class="ph${off(f) ? " off" : ""}">
      <img class="banner" src="${esc(o.img(f.image_url))}"><div class="scrim" style="--scrim:${scrimOf(f)}"></div>
      ${won ? `<div class="lose ${won === "l" ? "r" : "l"}"></div><div class="win ${won}"><b>WIN</b><span>${esc(result(f))}</span></div>` : ""}
      ${off(f) ? `<div class="void"><b>対象外</b><span>${offText(f)}</span></div>` : ""}
      <div class="cheer l">${cheer(f.fighter1_id)}</div><div class="cheer r">${cheer(f.fighter2_id)}</div>
      <div class="side l">${side(f.fighter1_id)}</div><div class="side r">${side(f.fighter2_id)}</div>
      ${yet.length ? `<div class="yet">${fin(f) ? "予想なし" : "まだ"} ${yet.map(m => icon(m)).join("")}</div>` : ""}
    </div>
    ${BARE && D.odds ? odds(f) : ""}
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
// 成績は computeLeaderboard の並び（的中数→的中率）で一番を決め、表示は固定の並びのまま
let score = "";
if (RES && window.computeLeaderboard) {
  const rows = window.computeLeaderboard(D.members, fights, D.preds, { scope: "event" });
  const top = rows[0], by = Object.fromEntries(rows.map(r => [r.member.id, r]));
  const crown = r => top && top.hits > 0 && r.hits === top.hits && r.rate === top.rate;
  score = `<div class="score">${D.members.map(m => { const r = by[m.id];
    return `<div class="sc${crown(r) ? " top" : ""}">${icon(m)}<div class="tx">
      <div class="nm">${esc(m.name)}${crown(r) ? `<span class="cr">👑</span>` : ""}</div>
      <div class="num"><b>${r.hits}<small>/${r.decided}</small></b>${r.rate != null ? `<em>${Math.round(r.rate * 100)}%</em>` : ""}</div>
      <div class="pt">ピタリ <b>${r.pitari}</b></div></div></div>`; }).join("")}</div>`;
}
const nFin = fights.filter(fin).length;
return `
  <div class="hd${BARE ? " bare" : ""}">
    <div class="ttl">美食会<b>${RES ? "答え合わせ" : "予想まとめ"}</b>${DEMO || DEMO_RES ? `<span style="font-size:30px;color:#ff5a67;margin-left:16px">見本（ダミー）</span>` : ""}</div>
    ${BARE ? "" : `<div class="sub"><em>${esc(ev.name)}</em>　${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}（${WD[d.getDay()]}）${lock ? `　締切 ${lock.getMonth() + 1}/${lock.getDate()} ${lock.getHours()}:${String(lock.getMinutes()).padStart(2, "0")}` : ""}${RES ? `　${nFin === fights.length ? "全試合終了" : `決着 ${nFin}/${fights.length}試合`}` : ""}</div>`}
  </div>
  ${score}
  ${BARE ? "" : RES ? `<div class="legend"><b>金の輪</b>＝勝敗的中　<b class="x">✕</b>＝外れ　<b>ピタリ</b>＝KO・一本の決まり手とラウンドまで的中（数えるのは勝敗だけ）　<b>📣</b>＝応援</div>`
    : `<div class="who">${counts}</div>
  <div class="legend"><b>下の丸</b>＝その選手が勝つと予想　<b>上の「📣応援」の丸</b>＝その選手を応援（勝敗とは別）</div>`}
  ${grids}
  <div class="ft"><span>${esc(D.built_at)}時点</span><b>予想<span>番付</span>　43417664gg-pixel.github.io/rizin-bishokukai</b></div>`;
}

window.BishokuSummary = { CSS, render };
})();
