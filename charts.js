'use strict';
(() => {
/* 순수 SVG 차트 모듈 — 문자열 반환. 마크는 얇게, 데이터 끝 4px 라운드, 호버는 data-tip 속성으로 app.js의 공용 툴팁이 처리. */

const escT = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const niceMax = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
};
const ticks = (max, n = 4) => Array.from({ length: n + 1 }, (_, i) => (max * i) / n);

const fmtShort = (n) => {
  const a = Math.abs(n);
  if (a >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}억`;
  if (a >= 1e4) return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만`;
  return Math.round(n).toLocaleString('ko-KR');
};
const fmtPct = (n) => `${Math.round(n)}%`;

const W = 720;

const gridLines = (maxY, y, L, R, yFmt) => ticks(maxY).map((t) =>
  `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${yFmt(t)}</text>`).join('');

/* 선 그래프: series [{name,color,values[]}], xLabels[], band {lo,hi}, refs [{value,label}] */
const lineChart = ({ series, xLabels, height = 240, yFmt = fmtShort, band, refs = [], area = true }) => {
  const H = height, L = 60, R = 16, T = 18, B = 28;
  const n = xLabels.length;
  const rawMax = Math.max(...series.flatMap((s) => s.values), ...refs.map((r) => r.value), band ? band.hi : 0);
  const maxY = niceMax(rawMax * 1.08);
  const x = (i) => L + (n > 1 ? (i * (W - L - R)) / (n - 1) : (W - L - R) / 2);
  const y = (v) => T + (H - T - B) * (1 - v / maxY);
  const labelEvery = Math.ceil(n / 12);
  const xl = xLabels.map((l, i) => (i % labelEvery ? '' : `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${escT(l)}</text>`)).join('');
  const bandEl = band ? `<rect class="band" x="${L}" y="${y(band.hi)}" width="${W - L - R}" height="${y(band.lo) - y(band.hi)}"/>
    <text class="ax band-l" x="${L + 6}" y="${y(band.hi) + 13}">${escT(band.label || '')}</text>` : '';
  const refEls = refs.map((r) => `<line class="ref" x1="${L}" x2="${W - R}" y1="${y(r.value)}" y2="${y(r.value)}"/>
    <text class="ax ref-l" x="${W - R}" y="${y(r.value) - 5}" text-anchor="end">${escT(r.label)}</text>`).join('');
  const paths = series.map((s) => {
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
    const ar = area && s.area !== false ? `<path class="area" d="M${pts.join(' L')} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" style="fill:${s.color}"/>` : '';
    const line = `<path class="line" d="M${pts.join(' L')}" style="stroke:${s.color}"/>`;
    const end = `<circle class="dot" cx="${x(n - 1)}" cy="${y(s.values[n - 1])}" r="4.5" style="fill:${s.color}"/>`;
    return ar + line + end;
  }).join('');
  const w = (W - L - R) / Math.max(n - 1, 1);
  const hits = xLabels.map((l, i) => {
    const tip = series.map((s) => `${s.name} ${yFmt(s.values[i])}`).join(' · ');
    return `<rect class="hit" x="${x(i) - w / 2}" y="${T}" width="${w}" height="${H - T - B}" data-tip="${escT(l)} · ${escT(tip)}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img">${bandEl}${gridLines(maxY, y, L, R, yFmt)}${refEls}${paths}${xl}${hits}</svg>`;
};

/* 가로 막대: rows [{label,value,color,text,tip}], refs [{value,label,pos:'top'|'bottom'}] */
const barsH = ({ rows, valueFmt = fmtShort, refs = [], labelW = 120 }) => {
  const L = labelW, R = 96, rowH = 38, T = refs.some((r) => r.pos === 'top') ? 22 : 8;
  const H = T + rows.length * rowH + (refs.length ? 22 : 8);
  const maxV = niceMax(Math.max(...rows.map((r) => r.value), ...refs.map((r) => r.value)) * 1.05);
  const x = (v) => L + (v / maxV) * (W - L - R);
  const bars = rows.map((r, i) => {
    const y = T + i * rowH + 8, w = Math.max(6, x(r.value) - L), h = 22;
    const path = `M${L},${y} h${w - 4} a4,4 0 0 1 4,4 v${h - 8} a4,4 0 0 1 -4,4 H${L} z`;
    return `<g class="row" data-tip="${escT(r.tip || '')}"><text class="lb" x="${L - 10}" y="${y + 15}" text-anchor="end">${escT(r.label)}</text>
      <path d="${path}" style="fill:${r.color}"/><text class="val" x="${L + w + 8}" y="${y + 15}">${escT(r.text ?? valueFmt(r.value))}</text>
      <rect class="hit" x="0" y="${y - 8}" width="${W}" height="${rowH}"/></g>`;
  }).join('');
  const refEls = refs.map((r) => {
    const top = r.pos === 'top';
    return `<line class="ref" x1="${x(r.value)}" x2="${x(r.value)}" y1="${T}" y2="${H - 20}"/>
      <text class="ax" x="${x(r.value)}" y="${top ? 14 : H - 6}" text-anchor="middle">${escT(r.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img">${refEls}${bars}</svg>`;
};

/* 누적 세로 막대: groups [{label, parts:[{value,color}], tip}] */
const barsV = ({ groups, yFmt = fmtShort, height = 240 }) => {
  const H = height, L = 60, R = 16, T = 18, B = 28, n = groups.length;
  const maxV = niceMax(Math.max(...groups.map((g) => g.parts.reduce((a, p) => a + p.value, 0))) * 1.08);
  const slot = (W - L - R) / n, bw = Math.min(24, slot * 0.6);
  const y = (v) => T + (H - T - B) * (1 - v / maxV);
  const cols = groups.map((g, i) => {
    const cx = L + slot * i + slot / 2;
    const parts = g.parts.reduce((acc, p, j) => {
      const y0 = y(acc.sum + p.value), y1 = y(acc.sum);
      const last = j === g.parts.length - 1;
      const h = Math.max(0, y1 - y0 - (last ? 0 : 2));
      const d = last && h > 4
        ? `M${cx - bw / 2},${y0 + 4} a4,4 0 0 1 4,-4 h${bw - 8} a4,4 0 0 1 4,4 v${h - 4} h${-bw} z`
        : `M${cx - bw / 2},${y0} h${bw} v${h} h${-bw} z`;
      return { sum: acc.sum + p.value, svg: acc.svg + `<path d="${d}" style="fill:${p.color}"/>` };
    }, { sum: 0, svg: '' }).svg;
    return `<g data-tip="${escT(g.tip)}">${parts}<text class="ax" x="${cx}" y="${H - 8}" text-anchor="middle">${escT(g.label)}</text>
      <rect class="hit" x="${cx - slot / 2}" y="${T}" width="${slot}" height="${H - T - B}"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img">${gridLines(maxV, y, L, R, yFmt)}${cols}</svg>`;
};

/* 산점도: points [{x,y,r,color,label,tip}], refs 가로선, notes [{px,py,text}] (0~1 비율 위치) */
const scatter = ({ points, xFmt = fmtShort, yFmt = fmtPct, refs = [], notes = [], height = 300 }) => {
  const H = height, L = 60, R = 24, T = 18, B = 34;
  const maxX = niceMax(Math.max(...points.map((p) => p.x)) * 1.15);
  const maxY = niceMax(Math.max(...points.map((p) => p.y), ...refs.map((r) => r.value)) * 1.15);
  const maxR = Math.max(...points.map((p) => p.r));
  const x = (v) => L + (v / maxX) * (W - L - R);
  const y = (v) => T + (H - T - B) * (1 - v / maxY);
  const rad = (v) => 6 + Math.sqrt(v / maxR) * 16;
  const xt = ticks(maxX).map((t) => `<text class="ax" x="${x(t)}" y="${H - 10}" text-anchor="middle">${xFmt(t)}</text>`).join('');
  const refEls = refs.map((r) => `<line class="ref" x1="${L}" x2="${W - R}" y1="${y(r.value)}" y2="${y(r.value)}"/>
    <text class="ax ref-l" x="${W - R}" y="${y(r.value) - 5}" text-anchor="end">${escT(r.label)}</text>`).join('');
  const noteEls = notes.map((nt) => `<text class="note" x="${L + nt.px * (W - L - R)}" y="${T + (1 - nt.py) * (H - T - B)}" text-anchor="${nt.anchor || 'end'}">${escT(nt.text)}</text>`).join('');
  const dots = points.map((p) => `<g data-tip="${escT(p.tip)}"><circle class="pt" cx="${x(p.x)}" cy="${y(p.y)}" r="${rad(p.r)}" style="fill:${p.color}"/>
    ${p.label ? `<text class="pl" x="${x(p.x) + rad(p.r) + 5}" y="${y(p.y) + 4}">${escT(p.label)}</text>` : ''}</g>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="ch" role="img">${gridLines(maxY, y, L, R, yFmt)}${refEls}${noteEls}${dots}${xt}
    <text class="ax" x="${W - R}" y="${H - 24}" text-anchor="end">광고비 →</text></svg>`;
};

/* 스파크라인 */
const spark = (values, color, w = 120, h = 32) => {
  const max = Math.max(...values) || 1, min = Math.min(...values);
  const n = values.length;
  const pts = values.map((v, i) => `${(i * (w - 4)) / (n - 1) + 2},${h - 3 - ((v - min) / (max - min || 1)) * (h - 8)}`);
  return `<svg viewBox="0 0 ${w} ${h}" class="spark"><path class="area" d="M${pts.join(' L')} L${w - 2},${h - 2} L2,${h - 2} Z" style="fill:${color}"/>
    <path class="line" d="M${pts.join(' L')}" style="stroke:${color}"/><circle cx="${pts[n - 1].split(',')[0]}" cy="${pts[n - 1].split(',')[1]}" r="3" style="fill:${color}"/></svg>`;
};

window.CH = { lineChart, barsH, barsV, scatter, spark, fmtShort, fmtPct, escT };
})();
