'use strict';
(() => {
/* 공용 화면 조각 — 문자열 HTML 을 돌려준다. 페이지 파일(home·pages·creatives.js)과 app.js 가 window.UI 로 쓴다. */
const { escT: esc, fmtShort, spark } = window.CH;
const R = window.RANGE;

const won = (n) => `${Math.round(n || 0).toLocaleString('ko-KR')}원`;
const wonS = (n) => `${fmtShort(n || 0)}원`;
const cnt = (n) => Math.round(n || 0).toLocaleString('ko-KR');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const ICON = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  overview: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l4-6 4 3 4-7"/>',
  channels: '<path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 3v9h9"/>',
  roas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  creatives: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',
  won: '<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  cost: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  cart: '<path d="M6 6h15l-2 9H8L6 3H3"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const icon = (k, size = 20) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k] || ''}</svg>`;

const THEMES = [
  { id: 'cream', name: '크림 그린', sw: ['#f6f2ea', '#ffffff', '#3f7d5a'] },
  { id: 'navy', name: '네이비 블루', sw: ['#ffffff', '#13203f', '#2b5fd9'] },
  { id: 'coral', name: '선셋 코랄', sw: ['#fbe0d2', '#a8432b', '#b84c32'] },
  { id: 'lavender', name: '라벤더 퍼플', sw: ['#e9e2fc', '#ffffff', '#5b3fd1'] },
  { id: 'dark', name: '다크 차콜', sw: ['#141518', '#1b1c20', '#5fbf8a'] },
];

/* 증감 배지: 직전 동일 기간 대비. goodUp=false 면 감소가 좋음(광고비·CPA) */
const delta = (now, prev, goodUp = true, label = '직전 기간') => {
  const d = R.deltaPct(now, prev);
  if (d == null) return `<span class="badge tone-mute">${esc(label)} 데이터 없음</span>`;
  const good = (d >= 0) === goodUp;
  return `<span class="badge ${d === 0 ? 'tone-mute' : good ? 'tone-good' : 'tone-warn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}% ${esc(label)}</span>`;
};
const roasState = (roas, ind) => (roas >= ind.target ? 'good' : roas >= ind.bep ? 'warn' : 'crit');
const STATE_WORD = { good: '목표 달성', warn: '목표 미달', crit: '손익분기 미달' };
const roasBadge = (roas, ind) => `<span class="badge tone-${roasState(roas, ind)}">ROAS ${cnt(roas)}% · ${STATE_WORD[roasState(roas, ind)]}</span>`;

/* 카드별 기간 칩 + 열린 경우 팝오버 */
const rangeChip = (id, rng, st, opts = {}) => {
  const over = !!st.cardRanges[id];
  const label = opts.label ? opts.label(rng) : R.fmtRange(rng);
  const open = st.chipOpen === id;
  const pop = open ? `<div class="pop" role="dialog" aria-label="이 카드 기간">
      <div class="sm">이 카드만 기간 변경</div>
      <div class="row"><input class="inp" type="date" data-cf="${id}" value="${rng.from}" min="${st.bounds.from}" max="${st.bounds.to}" aria-label="시작일">
        ${opts.single ? '' : `<span class="mu">~</span><input class="inp" type="date" data-ct="${id}" value="${rng.to}" min="${st.bounds.from}" max="${st.bounds.to}" aria-label="종료일">`}</div>
      ${opts.single ? '' : `<div class="row">${['yesterday', 'd7', 'd28', 'month', 'lastMonth', 'd90'].map((k) => `<button type="button" class="chip" data-cp="${id}" data-preset="${k}"${R.presets(st.bounds.to)[k].from < st.bounds.from ? ' disabled' : ''}>${R.presets(st.bounds.to)[k].label}</button>`).join('')}</div>`}
      <div class="row"><button type="button" class="link" data-creset="${id}">상단 기간 따르기</button><button type="button" class="chip" data-cclose="1" style="margin-left:auto">닫기</button></div>
    </div>` : '';
  return `<span class="chip-wrap"><button type="button" class="chip ${over ? 'on' : ''}" data-chip="${id}" aria-expanded="${open}">${icon('cal', 13)}${esc(label)} ▾</button>${pop}</span>`;
};

const card = ({ id, span = 12, title, sub = '', tools = '', body = '', cls = '' }) =>
  `<section class="card s${span} ${cls}" id="sec-${id}"><div class="card-h"><h3>${title}${sub ? ` <small>${sub}</small>` : ''}</h3>${tools ? `<div class="card-tools">${tools}</div>` : ''}</div>${body}</section>`;

const kpi = ({ ic, tone, label, value, badge = '', sparkVals, sparkColor, tools = '' }) => `<div class="card kpi">
  <div class="card-h"><div class="head"><span class="ico tone-${tone}">${icon(ic, 18)}</span><span class="mu">${esc(label)}</span></div>${tools}</div>
  <div class="big num">${value}</div>
  <div class="foot">${badge}${sparkVals && sparkVals.length > 1 ? spark(sparkVals, sparkColor, 100, 30) : ''}</div></div>`;

const legend = (items) => `<div class="legend">${items.map(([c, l]) => `<span><s style="background:${c}"></s>${esc(l)}</span>`).join('')}</div>`;

const hbars = (rows) => `<div class="hbars">${rows.map((r) =>
  `<span>${esc(r.label)}${r.n != null ? ` <span class="sm">(${r.n})</span>` : ''}</span><div class="hbar ${r.cls || ''}" style="width:${Math.max(2, Math.min(100, r.w))}%${r.color ? `;background:${r.color}` : ''}" data-tip="${esc(r.tip || '')}"></div><b class="num">${r.text}</b>`).join('')}</div>`;

const dateBar = (st, presetKeys = ['yesterday', 'd7', 'month', 'lastMonth']) => {
  const P = R.presets(st.bounds.to), rg = st.range, prev = R.prevOf(rg);
  const btns = presetKeys.map((k) => `<button type="button" data-gp="${k}" aria-pressed="${P[k].from === rg.from && P[k].to === rg.to}"${P[k].from < st.bounds.from ? ' disabled title="이 기간은 데이터가 없습니다"' : ''}>${P[k].label}</button>`).join('');
  return `<div class="datebar"><label for="g-from">기간</label>
    <input id="g-from" class="inp" type="date" value="${rg.from}" min="${st.bounds.from}" max="${st.bounds.to}" data-gf="1"><span class="mu">~</span>
    <input class="inp" type="date" value="${rg.to}" min="${st.bounds.from}" max="${st.bounds.to}" data-gt="1" aria-label="종료일">
    <div class="seg" role="group" aria-label="기간 단축키">${btns}</div>
    <span class="cmp">모든 카드에 적용 · 비교: 직전 같은 기간 ${R.fmtRange(prev)}</span></div>`;
};

const thumb = (ad, h, rank) => `<div class="img" style="height:${h}px">${ad.image ? `<img src="${esc(ad.image)}" alt="" loading="lazy">` : esc((ad.name || '').slice(0, 6))}${rank ? `<span class="rk">${rank}위</span>` : ''}</div>`;

const GENERIC = R.GENERIC;
const labelChips = (lab, max = 4) => {
  if (!lab) return '';
  const vals = [lab.background, lab.shot, ...(lab.motif || []), lab.tone, lab.category].filter((v) => v && !GENERIC.has(v));
  return `<div class="labels">${[...new Set(vals)].slice(0, max).map((v) => `<span class="badge">${esc(v)}</span>`).join('')}</div>`;
};

/* 효율 진단 — 같은 숫자는 항상 같은 진단 (고정 규칙). 목표·손익분기 ROAS 는 설정 카드의 마진율에서 */
const judge = (roas, ind) => {
  const T = ind.target;
  if (roas >= 1.5 * T) return { s: 'good', act: '입찰 +15% 상향 제안 (상한 CPC 내)', note: `목표의 ${(roas / T).toFixed(1)}배` };
  if (roas >= T) return { s: 'good', act: '유지 · 증액 후보 (한계 ROAS 확인 후)', note: '목표 달성' };
  if (roas >= ind.bep) return { s: 'warn', act: '유지 · 소재·키워드 점검', note: `목표 ${T}% 미달, 손익분기 ${ind.bep}% 이상` };
  if (roas >= T / 3) return { s: 'crit', act: '입찰 −10% 하향 제안', note: `손익분기 ${ind.bep}% 미달` };
  return { s: 'crit', act: '입찰 −20% · 2주 연속이면 OFF 제안', note: '목표의 1/3 미만' };
};
/* 최근 n주 주간 ROAS (끝 날짜 기준 7일씩) */
const weeklyRoas = (rows, endDate, n = 4) => Array.from({ length: n }, (_, i) => {
  const to = R.addDays(endDate, -7 * (n - 1 - i)), r = { from: R.addDays(to, -6), to };
  return rows.some((x) => R.inRange(x.date, r)) ? R.sumRows(rows, r).roas : null;  // 데이터 없는 주는 null (연속 판정에서 끊김)
});
const roasList = (ws) => ws.map((v) => (v == null ? '—' : Math.round(v).toLocaleString('ko-KR'))).join(' → ');

window.UI = { esc, won, wonS, cnt, pct, icon, THEMES, delta, roasState, roasBadge, STATE_WORD, rangeChip, card, kpi, legend, hbars, dateBar, thumb, labelChips, fmtShort, judge, weeklyRoas, roasList };
})();
