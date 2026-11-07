// 共通UI・スコア計算。
(function () {
  const MEMBER_KEY = "rizin_portal_member";

  // ---------- 公開・シェア ----------
  // スクショが拡散しても辿り着けるよう、カード内に必ずURLを出す（2026-08-31の監査で
  // 「全ページにURLが無く、流入経路がゼロ」だったのを潰すための共通定数）。
  window.SITE_URL = "43417664gg-pixel.github.io/rizin-bishokukai";
  window.SITE_URL_FULL = "https://43417664gg-pixel.github.io/rizin-bishokukai/";

  // Xへの投稿はWeb Intent（無料・API不要）。画像は添付できないのでスクショ前提。
  window.shareOnX = function (text, url) {
    const u = "https://twitter.com/intent/tweet?text=" +
      encodeURIComponent(text) + "&url=" + encodeURIComponent(url || window.SITE_URL_FULL);
    window.open(u, "_blank", "noopener");
  };
  window.shareButton = function (text, url, label) {
    return `<button class="x-share" onclick='shareOnX(${JSON.stringify(text)},${JSON.stringify(url || "")})'>
      <span class="x-logo">𝕏</span> ${label || "ポストする"}</button>`;
  };

  // ---------- メンバーセッション ----------
  window.getMemberId = () => localStorage.getItem(MEMBER_KEY);
  window.setMemberId = (id) => localStorage.setItem(MEMBER_KEY, id);
  window.clearMemberId = () => localStorage.removeItem(MEMBER_KEY);

  // ---------- スコアリング（ルールの正本・2段に簡素化 2026-08-05） ----------
  // 二段梯子：的中（勝者）→ ピタリ（勝者＋決まり手まで一致）。勝者を外したら不成立。
  // 決まり手＝「判定」or 具体的な決定打（右フック／リアネイキドチョーク等）を1つ。
  //   ・判定決着 → 予想が「判定」でピタリ
  //   ・KO/一本決着 → 予想の決定打(technique)が結果の決定打と一致でピタリ
  // ラウンド・あらます（旧3段目）は廃止。ドロー・無効試合は集計から除外。
  window.kimarite = function (method, technique) {
    // 採点用の「決まり手」キー。判定は"DEC"、それ以外は具体的な決定打(technique)。
    if (method === "DEC") return "DEC";
    return technique || null;  // KO/一本で技を指定していなければ決まり手なし＝的中止まり
  };
  // scope: "event"＝その大会の的中率／"career"＝通算。event_only の試合は event でだけ数える。
  window.scoreFight = function (pred, fight, opts) {
    const scope = (opts && opts.scope) || "event";
    if (fight.cancelled) {  // 中止・延期は集計対象外（勝者を外しても不成立にならない）
      return { counted: false, winnerHit: false, pitari: false };
    }
    if (fight.no_score) {  // 体重超過など＝試合はやるが予想対象外（採点しない）
      return { counted: false, winnerHit: false, pitari: false };
    }
    // キックルール等＝MMAではないので通算の的中率は汚さない。大会内の勝敗率にだけ入れる（Gaku確定）。
    if (fight.event_only && scope === "career") {
      return { counted: false, winnerHit: false, pitari: false };
    }
    if (!fight.winner_id || !fight.result_method) return null; // 結果未確定
    if (fight.result_method === "DRAW" || fight.result_method === "NC") {
      return { counted: false, winnerHit: false, pitari: false };
    }
    const winnerHit = pred.winner_id === fight.winner_id;
    let pitari = false;
    if (winnerHit) {
      const pk = window.kimarite(pred.method, pred.technique);
      const rk = window.kimarite(fight.result_method, fight.result_technique);
      const kimOk = !!(pk && rk && pk === rk);       // 決まり手（判定 or 決定打）一致
      // ラウンド：判定はラウンド無し＝免除。KO/一本は予想ラウンドと一致が必要。
      const roundOk = fight.result_method === "DEC" ? true
        : !!(pred.round && fight.result_round && Number(pred.round) === Number(fight.result_round));
      pitari = kimOk && roundOk;                       // ピタリ＝決まり手＋ラウンド
    }
    return { counted: true, winnerHit, pitari };
  };

  // メンバー×確定試合からランキング行を作る
  window.computeLeaderboard = function (members, fights, predictions, opts) {
    const scope = (opts && opts.scope) || "event";
    const fightById = Object.fromEntries(fights.map(f => [f.id, f]));
    const rows = members.map(m => {
      const row = { member: m, answered: 0, decided: 0, hits: 0, pitari: 0 };
      for (const p of predictions.filter(p => p.member_id === m.id)) {
        const f = fightById[p.fight_id];
        if (!f || f.cancelled || f.no_score) continue;  // 中止・体重超過（予想対象外）はカウントしない
        if (f.event_only && scope === "career") continue;  // キック等は通算に入れない
        row.answered += 1;
        const s = window.scoreFight(p, f, { scope });
        if (!s || !s.counted) continue;
        row.decided += 1;
        if (s.winnerHit) row.hits += 1;
        if (s.pitari) row.pitari += 1;
      }
      row.rate = row.decided ? row.hits / row.decided : null;
      return row;
    });
    // 勝敗だけで並べる（Gaku確定・2026-11-07「ピタリを外そう。勝敗だけでランキングを並べたい」）。
    // 旧ポイント制（的中1点＋ピタリ+2点・2026-09-11）は廃止。ピタリは別タブで見る。
    // 的中率ではなく的中数を主にするのは、「2試合で2的中＝100%」が「8試合で6的中」より
    // 上に来る小標本バイアスを避けるため（ポイント制を入れた理由はそのまま引き継ぐ）。
    rows.sort((a, b) =>
      b.hits - a.hits ||
      (b.rate ?? -1) - (a.rate ?? -1) ||
      String(a.member.name).localeCompare(String(b.member.name), "ja"));
    return rows;
  };
  // 的中率を「参考値」として小さく扱う基準。確定した予想がこれ未満なら母数が薄い。
  window.RATE_MIN = 4;
  // 通算ランキングにランクインする最低確定数（Gaku確定・2026-09-11）。
  // 1大会だけ少数当てた人が通算上位に居座るのを防ぐ。単一大会の表示では適用しない。
  window.CAREER_MIN = 8;
  // 美食会の3人は母数に関わらず通算でもランクインさせる（Gaku指示・2026-11-07「丸山先生も入れてあげて」）。
  // 基準は外部の予想者が少数的中で居座るのを防ぐためのもので、仲間をはじくためのものではない。
  // 美食会の3人。予想を書ける条件（LINEの固定リンクで開いたブラウザ）も同じ3人＝SQLの owns_member() と揃える
  window.BISHOKU = ["m_hame", "m_nuki", "m_maruyama"];
  window.ALWAYS_RANKED = window.BISHOKU;
  window.isRanked = function (row, scope) {
    if (row.answered > 0 && row.member && window.ALWAYS_RANKED.includes(row.member.id)) return true;
    return scope !== "career" || row.decided >= window.CAREER_MIN;
  };

  // ---------- 共通ヘッダー ----------
  window.renderHeader = async function (active) {
    // 名前を選び直したら（index.html はページ遷移せずに再描画する）その名前で確かめ直す
    const claimKey = getMemberId() || "";
    if (window._claimedFor !== claimKey) { window._claimedFor = claimKey; window.CLAIM_PROMISE = window.claimMyMember(); }
    setTimeout(() => window.showNoticeIfAny && window.showNoticeIfAny(), 400);
    const el = document.getElementById("app-header");
    if (!el) return;
    let memberName = "";
    const mid = getMemberId();
    if (mid) {
      const members = await DB.listMembers();
      const m = members.find(x => x.id === mid);
      if (m) memberName = m.name; else clearMemberId();
    }
    const link = (href, label, key) =>
      `<a href="${href}" class="nav-link${active === key ? " active" : ""}">${label}</a>`;
    el.innerHTML = `
      <div class="header-inner">
        <a class="brand" href="index.html">予想<span>番付</span></a>
        <nav>
          ${link("index.html", "大会", "home")}
          ${link("ranking.html", "ランキング", "ranking")}
          ${link("fighter.html", "選手", "fighter")}
        </nav>
        <div class="header-right">
          ${window.IS_DEMO ? '<span class="demo-badge">デモ</span>' : ""}
          ${memberName
            ? `<button class="member-chip" onclick="clearMemberId();location.href='index.html'" title="プレイヤー切替">${esc(memberName)}</button>`
            : ""}
        </div>
      </div>`;
  };

  // ---------- 小道具 ----------
  window.esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.qp = (k) => new URLSearchParams(location.search).get(k);
  // 選手名は「・」の所でだけ折り返す（「ラジャブアリ・シェ｜イドゥラエフ」と語の途中で割れた・Gaku指摘11/7）。
  // .fnm が仮名・漢字の途中での改行を止め、<wbr> が「・」の後ろにだけ改行の候補を置く。1語が欄より長い時だけ最後の手段で割る
  // 「・」の無い名前（松尾クリスチャンアキラ）は漢字とカタカナの境目を候補にする＝姓と名の間で折れる
  window.fnm = (s) => `<span class="fnm">${esc(s).split("・").join("・<wbr>")
    .replace(/([\u4E00-\u9FFF々])(?=[\u30A1-\u30FA])|([\u30A1-\u30FA])(?=[\u4E00-\u9FFF々])/g, "$1$2<wbr>")}</span>`;

  // 外部予想者のチャンネルロゴ（tools/fetch_avatars.py が data/avatars.json と assets/predictors/ を作る）。
  // ロゴの無い人（美食会・ゲスト出演）は色付きの丸に頭文字。各ページは描画前に AVATARS_READY を待つ
  window.AVATARS = {};
  window.AVATARS_READY = fetch("data/avatars.json", { cache: "no-cache" })
    .then(r => r.ok ? r.json() : {}).then(a => { window.AVATARS = a; }).catch(() => {});
  window.avatarHTML = (m, cls = "ava") => {
    const src = m && window.AVATARS[m.id];
    if (src) return `<img class="${cls} ava-img" src="${esc(src)}" alt="" loading="lazy">`;
    const ini = String(m?.name || "?").trim().slice(0, 1);
    return `<span class="${cls}" style="background:${esc(m?.color || "#555")}">${esc(ini)}</span>`;
  };
  window.fmtDate = (d) => {
    if (!d) return "";
    const dt = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
    return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}（${"日月火水木金土"[dt.getDay()]}）`;
  };
  window.fmtRate = (r) => r === null || r === undefined ? "—" : `${Math.round(r * 100)}%`;

  // 契約体重（kg表記）→ RIZIN階級名。カードの weight_class は "61.0kg" のような数値で入る。
  const WEIGHT_CLASSES = [
    { kg: 49, name: "女子スーパーアトム級" },
    { kg: 52, name: "女子フライ級" },
    { kg: 57, name: "フライ級" },
    { kg: 61, name: "バンタム級" },
    { kg: 66, name: "フェザー級" },
    { kg: 71, name: "ライト級" },
    { kg: 77, name: "ウェルター級" },
    { kg: 84, name: "ミドル級" },
    { kg: 93, name: "ライトヘビー級" },
    { kg: 120, name: "ヘビー級" },
  ];
  // 表示順は軽い順ではなく「男子 → 女子 → 契約体重」（Gaku方針・2026-07-20）
  window.WEIGHT_ORDER = [
    "フライ級", "バンタム級", "フェザー級", "ライト級",
    "ウェルター級", "ミドル級", "ライトヘビー級", "ヘビー級",
    "女子スーパーアトム級", "女子フライ級",
    "契約体重", "階級未設定",
  ];
  window.weightClassName = (wc) => {
    if (!wc) return "階級未設定";
    const kg = parseFloat(String(wc));
    if (isNaN(kg)) return "階級未設定";
    const hit = WEIGHT_CLASSES.find(w => w.kg === kg);
    // 規定階級に一致しない数値＝キャッチウェイト（契約体重）
    return hit ? hit.name : "契約体重";
  };
  // RIZINの現王者だけを頂点に置く。五輪メダルや他団体の過去王座は対象外。
  window.isChampion = (f) => !!f.belt && /RIZIN/.test(f.belt) && /王者|王座/.test(f.belt);
  // 王者はこのポータルの大会に出ていないことがあり、試合から階級を引けない。
  // その場合は belt の「RIZINフェザー級王者」から階級名を取る（列を増やさずに済む）。
  window.weightFromBelt = (f) => {
    const m = /RIZIN\s*(女子)?\s*([ぁ-んァ-ヶ一-龠ー]+?級)/.exec(f.belt || "");
    if (!m) return "";
    const name = (m[1] || "") + m[2];
    return WEIGHT_ORDER.includes(name) ? name : "";
  };

  // 年齢は生年月日から毎回計算する。数値を直書きすると誕生日を跨いだ瞬間に嘘になるため。
  window.ageText = (birth) => {
    if (!birth) return "";
    const b = new Date(birth + (birth.length === 10 ? "T00:00:00" : ""));
    if (isNaN(b)) return "";
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const beforeBirthday =
      now.getMonth() < b.getMonth() ||
      (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
    if (beforeBirthday) age--;
    return `${age}歳（${b.getFullYear()}.${b.getMonth() + 1}.${b.getDate()}）`;
  };

  // 大会の状態：before_open（計量前）→ open（受付中）→ locked（締切・結果待ち）→ finished（結果発表済み）
  // no_deadline=true の大会は締切なし。常に受付中（オープンブック：みんなの予想も常時公開）
  window.eventPhase = (ev) => {
    if (ev.status === "finished") return "finished";
    if (ev.no_deadline) return "open";
    const now = new Date();
    if (new Date(ev.lock_at) <= now) return "locked";
    if (ev.open_at && new Date(ev.open_at) > now) return "before_open";
    return "open";
  };
  window.isLocked = (ev) => eventPhase(ev) === "locked" || eventPhase(ev) === "finished";
  // オープンブック＝受付中でも全員の予想を公開する（締切なし大会）
  window.isOpenBook = (ev) => !!ev.no_deadline && ev.status !== "finished";
  window.PHASE_LABEL = {
    before_open: "計量終了後に予想開始",
    open: "予想受付中",
    locked: "締切済み・試合待ち",
    finished: "結果発表",
  };

  // 大会当日までの日数（当日は0）
  window.daysToEvent = (ev) => {
    if (!ev.event_date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(ev.event_date + "T00:00:00");
    return Math.round((d - today) / 86400000);
  };

  // カウントダウンタイマー。elに「1日と 05:12:44」形式で毎秒描画する
  window.startCountdown = function (el, targetIso, onExpire) {
    function tick() {
      const ms = new Date(targetIso) - new Date();
      if (ms <= 0) {
        el.textContent = "00:00:00";
        clearInterval(el._cd);
        if (onExpire) onExpire();
        return;
      }
      const d = Math.floor(ms / 86400000);
      const h = String(Math.floor((ms % 86400000) / 3600000)).padStart(2, "0");
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
      el.textContent = (d > 0 ? `${d}日と ` : "") + `${h}:${m}:${s}`;
    }
    clearInterval(el._cd);
    tick();
    el._cd = setInterval(tick, 1000);
  };
  // 出身地(origin)→国旗絵文字。部分一致で引く。ダゲスタン等はロシア国旗。
  const FLAGS = [
    ["日本", "🇯🇵"], ["韓国", "🇰🇷"], ["中国", "🇨🇳"], ["ブラジル", "🇧🇷"],
    ["キルギス", "🇰🇬"], ["カザフ", "🇰🇿"], ["ウズベキ", "🇺🇿"], ["アゼルバイジャン", "🇦🇿"],
    ["ダゲスタン", "🇷🇺"], ["ロシア", "🇷🇺"], ["アメリカ", "🇺🇸"], ["タジキスタン", "🇹🇯"],
    ["チェコ", "🇨🇿"], ["アンゴラ", "🇦🇴"], ["ジョージア", "🇬🇪"], ["アルメニア", "🇦🇲"],
    ["モンゴル", "🇲🇳"], ["タイ", "🇹🇭"], ["フィリピン", "🇵🇭"], ["オーストラリア", "🇦🇺"],
    ["イギリス", "🇬🇧"], ["フランス", "🇫🇷"], ["カナダ", "🇨🇦"], ["ニュージーランド", "🇳🇿"],
  ];
  window.flagOf = (origin) => {
    if (!origin) return "";
    for (const [k, f] of FLAGS) if (origin.includes(k)) return f;
    return "";
  };

  window.fighterMap = (fighters) => Object.fromEntries(fighters.map(f => [f.id, f]));

  // 未選択ならプレイヤー選択（index）へ戻す
  // ページの読み込みが例外で止まると #main が空のままになり、利用者には「真っ黒な画面」
  // としか見えない（2026-08-31のSupabase消失で実際に起きた）。落ちたことを必ず画面に出す。
  function showFatal(err) {
    const main = document.getElementById("main");
    if (!main || main.innerHTML.trim()) return;   // 既に描けているなら触らない
    const msg = String((err && (err.message || err.reason?.message || err.reason)) || err || "不明なエラー");
    main.innerHTML =
      '<div style="margin:24px auto;max-width:640px;background:#1a1016;border:1px solid #7a1520;' +
      'border-radius:12px;padding:18px 20px;color:#ffd9dd;line-height:1.7">' +
      '<div style="font-weight:800;font-size:15px;margin-bottom:6px">⚠️ ページを表示できませんでした</div>' +
      '<div style="font-size:13px;color:#e8c9cd">読み込み中にエラーが起きました。時間をおいて再読み込みしてください。</div>' +
      '<div style="margin-top:10px;font-size:11px;color:#a98b90;word-break:break-all">' + esc(msg) + '</div>' +
      '</div>';
  }
  window.addEventListener("unhandledrejection", (e) => { console.error("[fatal]", e.reason); showFatal(e); });
  window.addEventListener("error", (e) => { console.error("[fatal]", e.error || e.message); showFatal(e.error || e.message); });

  // ---------- 予想を書けるブラウザか（2026-11-07 作り直し） ----------
  // 美食会の3人：LINEに貼った固定リンク（index.html#bishoku=鍵）で開いたブラウザなら書ける。
  //   LINE内ブラウザとSafariが別扱い・iPhoneの7日消去・機種変更があっても、同じリンクから開けば戻る。
  // ゲスト（自分で名前を作った人）：作ったブラウザで書ける（members.owner_uid）。
  // 書けない時は黙って失敗させず、開いた瞬間に赤い帯で知らせる。
  const keyMatch = /[#&]bishoku=([A-Za-z0-9]+)/.exec(location.hash);
  if (keyMatch) history.replaceState(null, "", location.pathname + location.search);   // 鍵をURLバーに残さない
  window.JOIN_PROMISE = (async () => {
    if (!keyMatch || !window.DB || typeof DB.joinBishoku !== "function") return null;
    try { return await DB.joinBishoku(keyMatch[1].toLowerCase()); }
    catch (e) { console.warn("[auth] join_bishoku 失敗:", e); return "error"; }
  })();

  window.claimMyMember = async function () {
    try {
      const joined = await window.JOIN_PROMISE;
      const mid = getMemberId();
      if (!mid || !window.DB || typeof DB.isBishokuDevice !== "function") return;
      const uid = await window.AUTH_READY;
      if (!uid) return;
      const me = (await DB.listMembers()).find(m => m.id === mid);
      if (!me || me.is_curated) return;
      if (window.BISHOKU.includes(mid)) {
        if (joined === true || await DB.isBishokuDevice().catch(() => false)) return;
        if (me.owner_uid === uid) return;   // 以前からこのブラウザに紐づいている
        window.MEMBER_LOCKED = me.name;
        installLockedBanner(me.name, joined === false ? "リンクの鍵が古いようです。LINEの最新のリンクから開いてください" : "");
        return;
      }
      if (me.owner_uid && me.owner_uid !== uid) {
        window.MEMBER_LOCKED = me.name;
        installLockedBanner(me.name, "");
      }
    } catch (e) { /* 表示を止めない */ }
  };
  function installLockedBanner(name, extra) {
    const isFriend = window.BISHOKU.includes(getMemberId());
    const put = () => {
      if (document.getElementById("locked-banner")) return;
      const d = document.createElement("div");
      d.id = "locked-banner";
      d.style.cssText = "position:sticky;top:0;z-index:9999;background:#7a1520;color:#ffd9dd;" +
        "padding:10px 14px;font-size:13px;line-height:1.6;border-bottom:2px solid #c9a84a;text-align:center";
      d.innerHTML = "⚠️ <b>このブラウザからは「" + esc(name) + "」の予想を保存できません。</b><br>" +
        (isFriend
          ? "<b>美食会のLINEに貼ってあるリンク</b>から開き直してください（そのまま予想できます）。"
          : "この名前を作った端末・ブラウザから開いてください。") +
        (extra ? '<div style="margin-top:4px;font-weight:800;color:#ffe08a">' + esc(extra) + "</div>" : "");
      document.body.prepend(d);
    };
    if (document.body) put(); else document.addEventListener("DOMContentLoaded", put);
  }
  // 保存失敗の英語エラー（RLS等）を、利用者に分かる日本語にする
  window.saveErrorText = function (e) {
    const s = String((e && (e.code + " " + e.message)) || e || "");
    if (/42501|row-level security/i.test(s)) {
      if (window.MEMBER_LOCKED)
        return window.BISHOKU.includes(getMemberId())
          ? "保存できませんでした：美食会のLINEのリンクから開き直してください"
          : "保存できませんでした：この名前を作った端末・ブラウザから開いてください";
      return "保存できませんでした（締切後か、名前の紐づけが済んでいません）。再読み込みしてもう一度試してください";
    }
    return (e && e.message) || "保存できなかった";
  };

  // ---------- お詫びのお知らせ（2026-09-10・超RIZIN.5） ----------
  // システム不具合で予想の登録・変更ができない時間帯が生じたため、
  // 該当メンバーに一度だけお詫びを表示する。✕で閉じられ、閉じたら二度と出ない。
  const NOTICE_ID = "cho5_apology_2026_09_10";
  const NOTICE_TARGETS = ["m_maruyama", "m_hame", "m_nuki"];   // 美食会メンバー3人
  const NOTICE = {
    title: "予想の登録・変更ができず、申し訳ありませんでした",
    body: "超RIZIN.5の予想受付期間中、こちらのシステム不具合により" +
          "<b>予想の登録や変更ができない状態</b>が発生しました。" +
          "原因はすべてサイト側の設定ミスで、みなさんの操作には何の問題もありません。" +
          "楽しみにしていただいていたのに、参加の機会を損なってしまい心からお詫びいたします。<br><br>" +
          "これまでに入力いただいた予想は、すべてそのまま残っています。" +
          "端末をまたいでも引き継げる仕組みに作り直しますので、" +
          "次の大会からは確実に入れる状態にしてお迎えします。"
  };
  // 2026-11-07 掲出終了：新しいブラウザ（LINE内など）では毎回出て、保存できない時の赤い帯を覆い隠していた
  const NOTICE_UNTIL = Date.parse("2026-10-01T00:00:00+09:00");
  window.showNoticeIfAny = function () {
    try {
      if (Date.now() > NOTICE_UNTIL) return;
      const mid = getMemberId();
      if (!mid || NOTICE_TARGETS.indexOf(mid) < 0) return;
      const key = NOTICE_ID + ":" + mid;
      if (localStorage.getItem(key)) return;          // 「今後表示しない」を選んだ人には出さない
      if (document.getElementById("apology-modal")) return;
      const w = document.createElement("div");
      w.id = "apology-modal";
      w.innerHTML =
        '<div class="ap-back"></div>' +
        '<div class="ap-box" role="dialog" aria-modal="true">' +
          '<button class="ap-x" aria-label="閉じる">✕</button>' +
          '<div class="ap-ttl">' + NOTICE.title + '</div>' +
          '<div class="ap-body">' + NOTICE.body + '</div>' +
          '<label class="ap-never"><input type="checkbox" id="ap-never-cb">今後このお知らせを表示しない</label>' +
          '<button class="ap-ok">閉じる</button>' +
        '</div>';
      document.body.appendChild(w);
      const close = () => {
        try {
          const cb = document.getElementById("ap-never-cb");
          if (cb && cb.checked) localStorage.setItem(key, "1");   // 選んだ時だけ二度と出さない
        } catch (e) {}
        w.remove();
      };
      w.querySelector(".ap-x").onclick = close;
      w.querySelector(".ap-ok").onclick = close;
      w.querySelector(".ap-back").onclick = close;
    } catch (e) { /* お知らせで画面を壊さない */ }
  };

  window.requireMember = function () {
    if (!getMemberId()) { location.href = "index.html"; return false; }
    return true;
  };
})();
