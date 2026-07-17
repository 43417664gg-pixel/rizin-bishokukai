// デモモード用シードデータ。
// RIZIN LANDMARK 15 は公式発表の実カード（2026-07-18 広島グリーンアリーナ）。
// 【サンプル】大会はランキング・答え合わせ表示の動作確認用の架空データ。
// Supabase接続後はこのファイルは使われない。
window.DEMO_SEED = {
  members: [
    { id: "m_gaku", name: "ガク", color: "#e60012" },
    { id: "m_ren",  name: "レン", color: "#1e6fd9" },
    { id: "m_dai",  name: "ダイ", color: "#c9a227" },
    { id: "m_sho",  name: "ショウ", color: "#2ba84a" },
  ],

  fighters: [
    // LANDMARK 15 メインカード
    { id: "f_shiba",      name: "芝宏二郎" },
    { id: "f_harushin",   name: "遥心" },
    { id: "f_hinotori",   name: "火の鳥" },
    { id: "f_leejaehoon", name: "イ・ジェフン" },
    { id: "f_sasaki",     name: "佐々木信治" },
    { id: "f_riceyota",   name: "林RICE陽太" },
    { id: "f_suzuki",     name: "鈴木博昭" },
    { id: "f_miyagawa",   name: "宮川日向" },
    { id: "f_shoji",      name: "昇侍" },
    { id: "f_umeno",      name: "梅野源治" },
    { id: "f_parksiu",    name: "パク・シウ" },
    { id: "f_suda",       name: "須田萌里" },
    { id: "f_oshima",     name: "大島沙緒里" },
    { id: "f_leeyeji",    name: "イ・イェジ" },
    { id: "f_case",       name: "ジョニー・ケース" },
    { id: "f_tenya",      name: "天弥" },
    { id: "f_hiroya",     name: "ヒロヤ" },
    { id: "f_arsen",      name: "山本アーセン" },
    { id: "f_ota",        name: "太田忍" },
    { id: "f_tilenov",    name: "イリスベク・ティレノフ" },
    { id: "f_dautbek",    name: "カルシャガ・ダウトベック" },
    { id: "f_hagiwara",   name: "萩原京平" },
    { id: "f_sabatello",  name: "ダニー・サバテロ", nickname: "RIZIN世界バンタム級王者" },
    { id: "f_kashimura",  name: "鹿志村仁之介" },
    // LANDMARK 15 オープニング
    { id: "f_tanaka",     name: "田中仁" },
    { id: "f_kentaro",    name: "健太朗" },
    { id: "f_shivaev",    name: "シヴァエフ" },
    { id: "f_benjamin",   name: "ベンジャミン" },
    { id: "f_kanda",      name: "神田T800周一" },
    { id: "f_nagano",     name: "長野将大" },
    { id: "f_hime",       name: "HIME" },
    { id: "f_hirata",     name: "平田彩音" },
    // サンプル大会用（架空）
    { id: "f_demo_a", name: "デモ選手A" },
    { id: "f_demo_b", name: "デモ選手B" },
    { id: "f_demo_c", name: "デモ選手C" },
    { id: "f_demo_d", name: "デモ選手D" },
    { id: "f_demo_e", name: "デモ選手E" },
    { id: "f_demo_f", name: "デモ選手F" },
  ],

  events: [
    {
      id: "ev_lm15",
      name: "RIZIN LANDMARK 15 in HIROSHIMA",
      event_date: "2026-07-18",
      open_at: "2026-07-17T15:00:00+09:00",  // 前日計量終了後に開放
      lock_at: "2026-07-18T00:00:00+09:00",  // 前日の夜24:00締切
      poster_url: "assets/lm15/poster.jpg",
      official_url: "https://jp.rizinff.com/_ct/17841138",
      status: "upcoming",
    },
    {
      id: "ev_demo",
      name: "【サンプル】答え合わせ・集計のデモ大会",
      event_date: "2026-06-01",
      open_at: "2026-05-31T15:00:00+09:00",
      lock_at: "2026-06-01T00:00:00+09:00",
      poster_url: "",
      official_url: "",
      status: "finished",
    },
  ],

  fights: [
    // ===== LANDMARK 15（結果は未定） =====
    { id: "lm15_12", event_id: "ev_lm15", order_no: 12, segment: "main", title_label: "バンタム級タイトルマッチ", weight_class: "61.0kg", fighter1_id: "f_sabatello", fighter2_id: "f_kashimura", image_url: "assets/lm15/fight_12.jpg" },
    { id: "lm15_11", event_id: "ev_lm15", order_no: 11, segment: "main", weight_class: "66.0kg", fighter1_id: "f_dautbek", fighter2_id: "f_hagiwara", image_url: "assets/lm15/fight_11.jpg" },
    { id: "lm15_10", event_id: "ev_lm15", order_no: 10, segment: "main", weight_class: "61.0kg", fighter1_id: "f_ota", fighter2_id: "f_tilenov", image_url: "assets/lm15/fight_10.jpg" },
    { id: "lm15_09", event_id: "ev_lm15", order_no: 9, segment: "main", weight_class: "57.0kg", fighter1_id: "f_hiroya", fighter2_id: "f_arsen", image_url: "assets/lm15/fight_09.jpg" },
    { id: "lm15_08", event_id: "ev_lm15", order_no: 8, segment: "main", weight_class: "71.0kg", fighter1_id: "f_case", fighter2_id: "f_tenya", image_url: "assets/lm15/fight_08.jpg" },
    { id: "lm15_07", event_id: "ev_lm15", order_no: 7, segment: "main", weight_class: "49.0kg", fighter1_id: "f_oshima", fighter2_id: "f_leeyeji", image_url: "assets/lm15/fight_07.jpg" },
    { id: "lm15_06", event_id: "ev_lm15", order_no: 6, segment: "main", weight_class: "49.0kg", fighter1_id: "f_parksiu", fighter2_id: "f_suda", image_url: "assets/lm15/fight_06.jpg" },
    { id: "lm15_05", event_id: "ev_lm15", order_no: 5, segment: "main", weight_class: "64.0kg", fighter1_id: "f_shoji", fighter2_id: "f_umeno", image_url: "assets/lm15/fight_05.jpg" },
    { id: "lm15_04", event_id: "ev_lm15", order_no: 4, segment: "main", weight_class: "66.0kg", fighter1_id: "f_suzuki", fighter2_id: "f_miyagawa", image_url: "assets/lm15/fight_04.jpg" },
    { id: "lm15_03", event_id: "ev_lm15", order_no: 3, segment: "main", weight_class: "77.0kg", fighter1_id: "f_sasaki", fighter2_id: "f_riceyota", image_url: "assets/lm15/fight_03.jpg" },
    { id: "lm15_02", event_id: "ev_lm15", order_no: 2, segment: "main", weight_class: "57.0kg", fighter1_id: "f_hinotori", fighter2_id: "f_leejaehoon", image_url: "assets/lm15/fight_02.jpg" },
    { id: "lm15_01", event_id: "ev_lm15", order_no: 1, segment: "main", weight_class: "54.5kg", fighter1_id: "f_shiba", fighter2_id: "f_harushin", image_url: "assets/lm15/fight_01.jpg" },
    { id: "lm15_op4", event_id: "ev_lm15", order_no: 4, segment: "opening", weight_class: "49.0kg", fighter1_id: "f_hime", fighter2_id: "f_hirata", image_url: "assets/lm15/op_04.jpg" },
    { id: "lm15_op3", event_id: "ev_lm15", order_no: 3, segment: "opening", weight_class: "61.0kg", fighter1_id: "f_kanda", fighter2_id: "f_nagano", image_url: "assets/lm15/op_03.jpg" },
    { id: "lm15_op2", event_id: "ev_lm15", order_no: 2, segment: "opening", weight_class: "71.0kg", fighter1_id: "f_shivaev", fighter2_id: "f_benjamin", image_url: "assets/lm15/op_02.jpg" },
    { id: "lm15_op1", event_id: "ev_lm15", order_no: 1, segment: "opening", weight_class: "57.0kg", fighter1_id: "f_tanaka", fighter2_id: "f_kentaro", image_url: "assets/lm15/op_01.jpg" },

    // ===== サンプル大会（結果入り） =====
    { id: "demo_1", event_id: "ev_demo", order_no: 1, segment: "main", weight_class: "66.0kg", fighter1_id: "f_demo_a", fighter2_id: "f_demo_b",
      winner_id: "f_demo_a", result_method: "KO", result_round: 1, result_technique: "right_hook" },
    { id: "demo_2", event_id: "ev_demo", order_no: 2, segment: "main", weight_class: "61.0kg", fighter1_id: "f_demo_c", fighter2_id: "f_demo_d",
      winner_id: "f_demo_c", result_method: "SUB", result_round: 2, result_technique: "rnc" },
    { id: "demo_3", event_id: "ev_demo", order_no: 3, segment: "main", weight_class: "57.0kg", fighter1_id: "f_demo_e", fighter2_id: "f_demo_f",
      winner_id: "f_demo_e", result_method: "DEC" },
  ],

  predictions: [
    // サンプル大会の予想（ランキングのデモ用）
    { id: "p1", member_id: "m_gaku", fight_id: "demo_1", winner_id: "f_demo_a", method: "KO", round: 1, technique: "right_hook" }, // 5pt ピタリ賞
    { id: "p2", member_id: "m_gaku", fight_id: "demo_2", winner_id: "f_demo_c", method: "SUB", round: 1 },                         // 2pt
    { id: "p3", member_id: "m_gaku", fight_id: "demo_3", winner_id: "f_demo_f" },                                                  // 外れ
    { id: "p4", member_id: "m_ren",  fight_id: "demo_1", winner_id: "f_demo_b", method: "KO" },                                    // 外れ
    { id: "p5", member_id: "m_ren",  fight_id: "demo_2", winner_id: "f_demo_c", method: "DEC" },                                   // 1pt
    { id: "p6", member_id: "m_ren",  fight_id: "demo_3", winner_id: "f_demo_e", method: "DEC" },                                   // 2pt
    { id: "p7", member_id: "m_dai",  fight_id: "demo_1", winner_id: "f_demo_a" },                                                  // 1pt
    { id: "p8", member_id: "m_dai",  fight_id: "demo_3", winner_id: "f_demo_e", method: "KO" },                                    // 1pt
    { id: "p9", member_id: "m_sho",  fight_id: "demo_1", winner_id: "f_demo_b" },
    { id: "p10", member_id: "m_sho", fight_id: "demo_2", winner_id: "f_demo_d" },
    { id: "p11", member_id: "m_sho", fight_id: "demo_3", winner_id: "f_demo_f" },
  ],
};
