// 共通UI・スコア計算。
(function () {
  const MEMBER_KEY = "rizin_portal_member";

  // ---------- メンバーセッション ----------
  window.getMemberId = () => localStorage.getItem(MEMBER_KEY);
  window.setMemberId = (id) => localStorage.setItem(MEMBER_KEY, id);
  window.clearMemberId = () => localStorage.removeItem(MEMBER_KEY);

  // ---------- スコアリング（ルールの正本） ----------
  // 勝者的中＝1pt＋的中率カウント。決まり手+1／ラウンド+1／技ピタリ+2。
  // 勝者を外したらボーナスは全て不成立。ドロー・無効試合は集計から除外。
  window.scoreFight = function (pred, fight) {
    if (!fight.winner_id || !fight.result_method) return null; // 結果未確定
    if (fight.result_method === "DRAW" || fight.result_method === "NC") {
      return { counted: false, winnerHit: false, pts: 0, methodHit: false, roundHit: false, techHit: false };
    }
    const winnerHit = pred.winner_id === fight.winner_id;
    let pts = 0, methodHit = false, roundHit = false, techHit = false;
    if (winnerHit) {
      pts = 1;
      if (pred.method && pred.method === fight.result_method) { pts += 1; methodHit = true; }
      if (pred.round && fight.result_round && Number(pred.round) === Number(fight.result_round)
          && fight.result_method !== "DEC") { pts += 1; roundHit = true; }
      if (pred.technique && pred.technique === fight.result_technique) { pts += 2; techHit = true; }
    }
    return { counted: true, winnerHit, pts, methodHit, roundHit, techHit };
  };

  // メンバー×確定試合からランキング行を作る
  window.computeLeaderboard = function (members, fights, predictions) {
    const fightById = Object.fromEntries(fights.map(f => [f.id, f]));
    const rows = members.map(m => {
      const row = { member: m, answered: 0, decided: 0, hits: 0, pts: 0, pitari: 0 };
      for (const p of predictions.filter(p => p.member_id === m.id)) {
        row.answered += 1;
        const f = fightById[p.fight_id];
        if (!f) continue;
        const s = window.scoreFight(p, f);
        if (!s || !s.counted) continue;
        row.decided += 1;
        if (s.winnerHit) row.hits += 1;
        row.pts += s.pts;
        if (s.techHit) row.pitari += 1;
      }
      row.rate = row.decided ? row.hits / row.decided : null;
      return row;
    });
    rows.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.pts - a.pts || b.decided - a.decided);
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
        <a class="brand" href="index.html">RIZIN<span>予想部</span></a>
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
  window.isLocked = (ev) => new Date(ev.lock_at) <= new Date();
  window.lockCountdown = (ev) => {
    const ms = new Date(ev.lock_at) - new Date();
    if (ms <= 0) return "予想締切済み";
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    if (h >= 48) return `締切まであと${Math.floor(h / 24)}日`;
    return `締切まであと${h}時間${m}分`;
  };
  window.fighterMap = (fighters) => Object.fromEntries(fighters.map(f => [f.id, f]));

  // 未選択ならプレイヤー選択（index）へ戻す
  window.requireMember = function () {
    if (!getMemberId()) { location.href = "index.html"; return false; }
    return true;
  };
})();
