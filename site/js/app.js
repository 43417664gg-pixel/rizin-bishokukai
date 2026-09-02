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
    rows.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.pitari - a.pitari || b.decided - a.decided);
    return rows;
  };

  // ---------- 称号ラダー（的中率でティアが上がる。MMA/pick'em業界の定石） ----------
  // 結果が出た予想が一定数（MIN）溜まって初めて称号がつく。それまではルーキー。
  window.TIERS = [
    { min: 0.80, name: "絶対王者", icon: "👑", color: "#c9a84a" },
    { min: 0.70, name: "チャンピオン", icon: "🏆", color: "#e6be55" },
    { min: 0.62, name: "コンテンダー", icon: "🥊", color: "#d98a3e" },
    { min: 0.55, name: "ランカー", icon: "🔥", color: "#c9683f" },
    { min: 0.00, name: "ルーキー", icon: "🐣", color: "#8a8a92" },
  ];
  window.TIER_MIN_DECIDED = 5;
  window.tierOf = function (row) {
    if (!row || row.rate == null || (row.decided || 0) < window.TIER_MIN_DECIDED)
      return { name: "ルーキー", icon: "🐣", color: "#8a8a92", pending: true };
    return window.TIERS.find(t => row.rate >= t.min) || window.TIERS[window.TIERS.length - 1];
  };

  // ---------- 共通ヘッダー ----------
  window.renderHeader = async function (active) {
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
        <a class="brand" href="index.html">RIZIN<span>美食会予想</span></a>
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

  window.requireMember = function () {
    if (!getMemberId()) { location.href = "index.html"; return false; }
    return true;
  };
})();
