// 決まり手マスタ。予想と結果入力で同じIDを使うことで照合を確実にする。
window.METHODS = [
  { id: "KO",  label: "KO/TKO" },
  { id: "SUB", label: "一本" },
  { id: "DEC", label: "判定" },
];

window.METHOD_LABEL = { KO: "KO/TKO", SUB: "一本", DEC: "判定", DRAW: "ドロー", NC: "無効試合" };

window.TECHNIQUES = [
  // KO/TKO系
  { id: "right_straight", label: "右ストレート",           method: "KO" },
  { id: "left_straight",  label: "左ストレート",           method: "KO" },
  { id: "right_hook",     label: "右フック",               method: "KO" },
  { id: "left_hook",      label: "左フック",               method: "KO" },
  { id: "upper",          label: "アッパー",               method: "KO" },
  { id: "elbow",          label: "肘",                     method: "KO" },
  { id: "high_kick",      label: "ハイキック",             method: "KO" },
  { id: "body",           label: "ボディ（膝・蹴り含む）", method: "KO" },
  { id: "knee",           label: "膝（顔面）",             method: "KO" },
  { id: "gnp",            label: "グラウンドパウンド",     method: "KO" },
  // 一本系
  { id: "rnc",            label: "リアネイキドチョーク",   method: "SUB" },
  { id: "guillotine",     label: "ギロチンチョーク",       method: "SUB" },
  { id: "triangle",       label: "三角絞め",               method: "SUB" },
  { id: "front_choke",    label: "フロントチョーク",       method: "SUB" },
  { id: "armbar",         label: "腕ひしぎ十字固め",       method: "SUB" },
  { id: "kimura",         label: "キムラ・アームロック",   method: "SUB" },
  { id: "leglock",        label: "ヒールフック・足関節",   method: "SUB" },
];

window.TECH_LABEL = Object.fromEntries(window.TECHNIQUES.map(t => [t.id, t.label]));
window.techsFor = (method) => window.TECHNIQUES.filter(t => t.method === method);
