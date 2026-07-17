// データ層。Supabase設定が空ならデモモード（localStorage保存）で動く。
// ページ側は window.DB の非同期メソッドだけを使う——モードの差はここに閉じ込める。
(function () {
  const cfg = window.PORTAL_CONFIG || {};
  const IS_DEMO = !cfg.SUPABASE_URL;
  const LS_KEY = "rizin_portal_demo_v1";

  // ---------- デモモード ----------
  // シード更新時はSEED_Vを上げる。マスタ（選手・試合・大会）はシードの新値を反映しつつ、
  // ユーザーが入れた予想・結果・追加データは保持する
  const SEED_V = 3;
  // v3: 本番移行——サンプル大会・デモ選手・仮メンバーを完全に取り除く
  const PURGED = new Set([
    "ev_demo", "demo_1", "demo_2", "demo_3",
    "f_demo_a", "f_demo_b", "f_demo_c", "f_demo_d", "f_demo_e", "f_demo_f",
    "m_gaku", "m_ren", "m_dai", "m_sho",
  ]);
  function migrate(saved) {
    for (const k of ["members", "fighters", "events", "fights", "predictions"]) {
      saved[k] = (saved[k] || []).filter(x => !PURGED.has(x.id));
    }
    const seed = JSON.parse(JSON.stringify(window.DEMO_SEED));
    const byId = (arr) => Object.fromEntries((arr || []).map(x => [x.id, x]));
    const savedF = byId(saved.fighters), savedFt = byId(saved.fights), savedE = byId(saved.events);
    // 選手・試合：シードを土台に、保存側の編集・結果を上書きで残す
    const fighters = seed.fighters.map(f => ({ ...f, ...savedF[f.id] }));
    for (const f of saved.fighters || []) if (!fighters.some(x => x.id === f.id)) fighters.push(f);
    const fights = seed.fights.map(f => ({ ...f, ...savedFt[f.id], image_url: f.image_url }));
    for (const f of saved.fights || []) if (!fights.some(x => x.id === f.id)) fights.push(f);
    // 大会：時刻設定はシード優先、発表済みステータスだけ保持
    const events = seed.events.map(e => ({
      ...e, status: savedE[e.id]?.status === "finished" ? "finished" : e.status,
    }));
    for (const e of saved.events || []) if (!events.some(x => x.id === e.id)) events.push(e);
    // メンバー：保存側優先（admin追加を残す）＋シードの新顔を補完
    const members = (saved.members || []).slice();
    for (const m of seed.members) if (!members.some(x => x.id === m.id)) members.push(m);
    // 予想：消えたメンバー・試合を参照するものは落とす
    const memberIds = new Set(members.map(m => m.id));
    const fightIds = new Set(fights.map(f => f.id));
    const predictions = (saved.predictions || []).filter(p => memberIds.has(p.member_id) && fightIds.has(p.fight_id));
    return { _v: SEED_V, members, fighters, events, fights, predictions };
  }
  function demoLoad() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        let db = JSON.parse(raw);
        if (db._v !== SEED_V) { db = migrate(db); localStorage.setItem(LS_KEY, JSON.stringify(db)); }
        return db;
      } catch (e) { /* 壊れていたらシードから再生成 */ }
    }
    const db = { _v: SEED_V, ...JSON.parse(JSON.stringify(window.DEMO_SEED)) };
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    return db;
  }
  function demoSave(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
  const uid = () => "x_" + Math.random().toString(36).slice(2, 10);

  const demoDB = {
    isDemo: true,
    async listMembers() { return demoLoad().members; },
    async listFighters() { return demoLoad().fighters; },
    async listEvents() {
      return demoLoad().events.sort((a, b) => (b.event_date || "").localeCompare(a.event_date || ""));
    },
    async getEvent(id) { return demoLoad().events.find(e => e.id === id) || null; },
    async listFights(eventId) {
      const db = demoLoad();
      const fs = eventId ? db.fights.filter(f => f.event_id === eventId) : db.fights;
      return fs.slice();
    },
    async listPredictions(filter = {}) {
      let ps = demoLoad().predictions;
      if (filter.fightIds) ps = ps.filter(p => filter.fightIds.includes(p.fight_id));
      if (filter.memberId) ps = ps.filter(p => p.member_id === filter.memberId);
      return ps.slice();
    },
    async upsertPrediction(pred) {
      const db = demoLoad();
      // デモでも受付時間は守る（計量前は開いていない・前日24:00で締切）
      const fight = db.fights.find(f => f.id === pred.fight_id);
      const ev = fight && db.events.find(e => e.id === fight.event_id);
      if (!ev) throw new Error("大会が見つかりません");
      if (ev.open_at && new Date(ev.open_at) > new Date()) throw new Error("予想は計量終了後に開始されます");
      if (new Date(ev.lock_at) <= new Date()) throw new Error("予想の締切を過ぎています");
      const i = db.predictions.findIndex(p => p.member_id === pred.member_id && p.fight_id === pred.fight_id);
      if (i >= 0) db.predictions[i] = { ...db.predictions[i], ...pred, updated_at: new Date().toISOString() };
      else db.predictions.push({ id: uid(), updated_at: new Date().toISOString(), ...pred });
      demoSave(db);
    },
    async deletePrediction(memberId, fightId) {
      const db = demoLoad();
      db.predictions = db.predictions.filter(p => !(p.member_id === memberId && p.fight_id === fightId));
      demoSave(db);
    },
    // ----- admin -----
    async isAdmin() { return true; }, // デモでは誰でも管理可
    async adminLogin() { return { ok: true }; },
    async adminLogout() {},
    async saveResult(fightId, result) {
      const db = demoLoad();
      const f = db.fights.find(x => x.id === fightId);
      if (!f) throw new Error("試合が見つかりません");
      Object.assign(f, result);
      demoSave(db);
    },
    async upsertEvent(ev) {
      const db = demoLoad();
      if (ev.id) { Object.assign(db.events.find(e => e.id === ev.id), ev); }
      else { ev.id = uid(); db.events.push(ev); }
      demoSave(db); return ev.id;
    },
    async updateEvent(id, fields) {
      const db = demoLoad();
      Object.assign(db.events.find(e => e.id === id), fields);
      demoSave(db);
    },
    async upsertFighter(f) {
      const db = demoLoad();
      if (f.id) { Object.assign(db.fighters.find(x => x.id === f.id), f); }
      else { f.id = uid(); db.fighters.push(f); }
      demoSave(db); return f.id;
    },
    async upsertFight(f) {
      const db = demoLoad();
      if (f.id) { Object.assign(db.fights.find(x => x.id === f.id), f); }
      else { f.id = uid(); db.fights.push(f); }
      demoSave(db); return f.id;
    },
    async upsertMember(m) {
      const db = demoLoad();
      if (m.id) { Object.assign(db.members.find(x => x.id === m.id), m); }
      else { m.id = uid(); db.members.push(m); }
      demoSave(db); return m.id;
    },
    async resetDemo() { localStorage.removeItem(LS_KEY); },
  };

  // ---------- Supabaseモード ----------
  function makeSupaDB() {
    const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
    return {
      isDemo: false,
      client,
      async listMembers() { return q(client.from("members").select("*").order("name")); },
      async listFighters() { return q(client.from("fighters").select("*").order("name")); },
      async listEvents() { return q(client.from("events").select("*").order("event_date", { ascending: false })); },
      async getEvent(id) { return q(client.from("events").select("*").eq("id", id).single()); },
      async listFights(eventId) {
        let query = client.from("fights").select("*");
        if (eventId) query = query.eq("event_id", eventId);
        return q(query);
      },
      async listPredictions(filter = {}) {
        let query = client.from("predictions").select("*");
        if (filter.fightIds) query = query.in("fight_id", filter.fightIds);
        if (filter.memberId) query = query.eq("member_id", filter.memberId);
        return q(query);
      },
      async upsertPrediction(pred) {
        return q(client.from("predictions").upsert(
          { ...pred, updated_at: new Date().toISOString() },
          { onConflict: "member_id,fight_id" }
        ));
      },
      async deletePrediction(memberId, fightId) {
        return q(client.from("predictions").delete().eq("member_id", memberId).eq("fight_id", fightId));
      },
      async isAdmin() { const { data } = await client.auth.getSession(); return !!data.session; },
      async adminLogin(email, password) {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error; return { ok: true };
      },
      async adminLogout() { await client.auth.signOut(); },
      async saveResult(fightId, result) { return q(client.from("fights").update(result).eq("id", fightId)); },
      async upsertEvent(ev) { const d = await q(client.from("events").upsert(ev).select()); return d[0].id; },
      async updateEvent(id, fields) { return q(client.from("events").update(fields).eq("id", id)); },
      async upsertFighter(f) { const d = await q(client.from("fighters").upsert(f).select()); return d[0].id; },
      async upsertFight(f) { const d = await q(client.from("fights").upsert(f).select()); return d[0].id; },
      async upsertMember(m) { const d = await q(client.from("members").upsert(m).select()); return d[0].id; },
      async resetDemo() {},
    };
  }

  window.DB = IS_DEMO ? demoDB : makeSupaDB();
  window.IS_DEMO = IS_DEMO;
})();
