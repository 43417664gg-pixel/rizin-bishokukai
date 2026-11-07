// 頭文字は字の実際の形（墨の外形）で真ん中に置き、字ごとの大きさを揃える（Gaku 11/8「位置がズレてる。丸とか中心じゃない」
// 「それぞれの文字で大きさが異なりすぎ」）。CSS は字の箱（行の高さ・送り幅）で揃えるので、和字は下に寄り、カナや英字は小さく見えていた。
// canvas で1字ずつ外形を測り、大きさ（--gs＝1÷外形の長辺）とずれ（--gx/--gy・em）を <i> に渡す。CSS 側は枠に対する外形の比率を持つ
// （style.css の span.mav／bishoku_summary.js の .ic・.ci）。頭文字が画面に入った時点で拾うので、描画側は何もしなくていい。
// 影の中（event.html の予想まとめ）だけは見張りが届かないので、描画側が fitGlyphs(root) を呼ぶ。LINE用のまとめ画像（tools/line_summary）も読む
(() => {
  const GLYPHS = {}, SEL = "span.mav > i, .ic > i, .ci > i";
  const fit = (el, retry = true) => {
    const ch = el.textContent.trim();
    if (!ch) return;
    const cs = getComputedStyle(el), font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
    if (retry && !document.fonts.check(font, ch)) { document.fonts.load(font, ch).then(() => fit(el, false), () => {}); return; }
    const g = GLYPHS[font + ch] ||= (() => {
      const cx = (fit.cx ||= document.createElement("canvas").getContext("2d"));
      cx.font = font;
      const m = cx.measureText(ch), L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight, A = m.actualBoundingBoxAscent, D = m.actualBoundingBoxDescent;
      const base = m.fontBoundingBoxAscent == null ? null : (100 + m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;   // 行の高さ1の箱の上端から基線まで
      return { s: Math.min(1.6, 100 / Math.max(L + R, A + D, 1)), x: (m.width - R + L) / 200, y: base == null ? 0 : (50 - base - (D - A) / 2) / 100 };
    })();
    el.style.cssText = `--gs:${g.s.toFixed(3)};--gx:${g.x.toFixed(3)};--gy:${g.y.toFixed(3)}`;
  };
  window.fitGlyphs = root => root.querySelectorAll(SEL).forEach(el => fit(el));
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) {
    if (n.matches(SEL)) fit(n);
    n.querySelectorAll(SEL).forEach(el => fit(el));
  } }).observe(document.documentElement, { childList: true, subtree: true });
})();
