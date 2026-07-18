// 共通UI・スコア計算。
(function () {
  const MEMBER_KEY = "rizin_portal_member";

  // ---------- メンバーセッション ----------
  window.getMemberId = () => localStorage.getItem(MEMBER_KEY);
  window.setMemberId = (id) => localStorage.setItem(MEMBER_KEY, id);
  window.clearMemberId = () => localStorage.removeItem(MEMBER_KEY);

  // ---------- スコアリング（ルールの正本） ----------
  // 三段梯子：的中（勝者）→ ピタリ（決まり手＋ラウンドまで一致・判定は決まり手のみ）
  // → あらます（ピタリ＋フィニッシュ技まで完全一致）。勝者を外したら全て不成立。
  // ドロー・無効試合は集計から除外。
  window.scoreFight = function (pred, fight) {
    if (!fight.winner_id || !fight.result_method) return null; // 結果未確定
    if (fight.result_method === "DRAW" || fight.result_method === "NC") {
      return { counted: false, winnerHit: false, methodHit: false, roundHit: false, techHit: false, pitari: false, aramasu: false };
    }
    const winnerHit = pred.winner_id === fight.winner_id;
    let methodHit = false, roundHit = false, techHit = false, pitari = false, aramasu = false;
    if (winnerHit) {
      methodHit = !!(pred.method && pred.method === fight.result_method);
      roundHit = !!(pred.round && fight.result_round && Number(pred.round) === Number(fight.result_round)
          && fight.result_method !== "DEC");
      techHit = !!(pred.technique && pred.technique === fight.result_technique);
      pitari = methodHit && (fight.result_method === "DEC" || roundHit);
      aramasu = pitari && techHit;
    }
    return { counted: true, winnerHit, methodHit, roundHit, techHit, pitari, aramasu };
  };

  // メンバー×確定試合からランキング行を作る
  window.computeLeaderboard = function (members, fights, predictions) {
    const fightById = Object.fromEntries(fights.map(f => [f.id, f]));
    const rows = members.map(m => {
      const row = { member: m, answered: 0, decided: 0, hits: 0, pitari: 0, aramasu: 0 };
      for (const p of predictions.filter(p => p.member_id === m.id)) {
        row.answered += 1;
        const f = fightById[p.fight_id];
        if (!f) continue;
        const s = window.scoreFight(p, f);
        if (!s || !s.counted) continue;
        row.decided += 1;
        if (s.winnerHit) row.hits += 1;
        if (s.pitari) row.pitari += 1;
        if (s.aramasu) row.aramasu += 1;
      }
      row.rate = row.decided ? row.hits / row.decided : null;
      return row;
    });
    rows.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.aramasu - a.aramasu || b.pitari - a.pitari || b.decided - a.decided);
    return rows;
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
  window.fighterMap = (fighters) => Object.fromEntries(fighters.map(f => [f.id, f]));

  // 未選択ならプレイヤー選択（index）へ戻す
  window.requireMember = function () {
    if (!getMemberId()) { location.href = "index.html"; return false; }
    return true;
  };
})();
