(() => {
  // Count every laid-out run of text by character volume. Reveal-on-scroll
  // blocks sit at opacity:0 until scrolled to, so opacity is NOT filtered —
  // only display:none / visibility:hidden, which never become visible.
  const laidOut = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      n = n.parentElement;
    }
    return true;
  };
  const bulk = {}, nodes = {};
  let legal = 0;
  document.querySelectorAll('p,h1,h2,h3,h4,li,span,div,a').forEach(e => {
    const t = (e.textContent || '').trim();
    if (!t) return;
    if ([...e.children].some(c => (c.textContent || '').trim())) return;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || !laidOut(e)) return;
    const k = Math.round(parseFloat(getComputedStyle(e).fontSize));
    // the 2,270-char legal disclaimer is an outlier with no valad.io counterpart
    if (t.length > 800) { legal += t.length; return; }
    bulk[k] = (bulk[k] || 0) + t.length;
    nodes[k] = (nodes[k] || 0) + 1;
  });
  const tot = Object.values(bulk).reduce((a, b) => a + b, 0) || 1;
  const band = [14, 15, 16].reduce((a, k) => a + (bulk[k] || 0), 0);
  const rows = Object.keys(bulk).map(Number).sort((a, b) => a - b).map(k =>
    `${String(k).padStart(3)}px ${String(bulk[k]).padStart(5)}ch ${(bulk[k] / tot * 100).toFixed(1).padStart(5)}%  n=${nodes[k]}`);
  return rows.join('\n') +
    `\n-- body band 14-16px: ${(band / tot * 100).toFixed(1)}%   total ${tot}ch` +
    (legal ? `  (excl. ${legal}ch legal block)` : '');
})()
