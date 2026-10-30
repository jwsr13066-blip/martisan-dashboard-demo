'use strict';
(() => {
/* 기간 모델 + 집계 — 화면 어디서든 {from, to}(YYYY-MM-DD)로 숫자를 다시 계산한다.
   비교 기준 = 직전 동일 기간 (10/1~10/26 → 9/5~9/30). 판정 규칙은 새로 만들지 않고 기존 기준(목표·손익분기 ROAS)만 쓴다. */

const DAY = 864e5;
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => iso(new Date(toDate(s).getTime() + n * DAY));
const spanDays = (r) => Math.round((toDate(r.to) - toDate(r.from)) / DAY) + 1;
const prevOf = (r) => ({ from: addDays(r.from, -spanDays(r)), to: addDays(r.from, -1) });
const inRange = (date, r) => date >= r.from && date <= r.to;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const dow = (s) => toDate(s).getUTCDay();
const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
const mdw = (s) => `${md(s)} (${DOW[dow(s)]})`;
const fmtRange = (r) => (r.from === r.to ? mdw(r.from) : `${md(r.from)} ~ ${md(r.to)}`);
/* 비교 기간이 기준 연도를 벗어나면 연도를 붙인다 (1/1부터 고르면 직전 기간은 작년) */
const fmtRangeY = (r, year) => (r.from.slice(0, 4) === year && r.to.slice(0, 4) === year ? fmtRange(r) : `${r.from.slice(0, 4)}.${md(r.from)} ~ ${r.to.slice(0, 4)}.${md(r.to)}`);
const monthStart = (s) => `${s.slice(0, 8)}01`;
const monthEnd = (s) => addDays(`${addMonths(monthStart(s), 1).slice(0, 8)}01`, -1);
function addMonths(s, n) {
  const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
}
const clamp = (r, b) => {
  const from = r.from < b.from ? b.from : r.from > b.to ? b.to : r.from;
  const to = r.to > b.to ? b.to : r.to < from ? from : r.to;
  return { from, to };
};
const dateList = (r) => Array.from({ length: spanDays(r) }, (_, i) => addDays(r.from, i));

/* 단축키: 어제 = 데이터 마지막 날 */
const presets = (last) => ({
  yesterday: { label: '기준일', from: last, to: last },  // 데이터 마지막 날 (수집 전엔 그저께일 수 있어 '어제'라 부르지 않는다)
  d7: { label: '7일', from: addDays(last, -6), to: last },
  d28: { label: '28일', from: addDays(last, -27), to: last },
  month: { label: '이번 달', from: monthStart(last), to: last },
  lastMonth: { label: '지난 달', from: addMonths(monthStart(last), -1), to: addDays(monthStart(last), -1) },
  d90: { label: '90일', from: addDays(last, -89), to: last },
});

/* ---------- 매출·광고비 ---------- */
const ZERO = { cost: 0, clicks: 0, conv: 0, rev: 0 };
const add = (a, x) => ({ cost: a.cost + (x.cost || 0), clicks: a.clicks + (x.clicks || 0), conv: a.conv + (x.conv || 0), rev: a.rev + (x.rev ?? x.adRev ?? 0) });
const withRatios = (a) => ({ ...a, roas: a.cost ? Math.round((a.rev / a.cost) * 100) : 0, cpa: a.conv ? a.cost / a.conv : 0 });
const sumRows = (rows, r) => withRatios(rows.filter((x) => inRange(x.date, r)).reduce(add, ZERO));

const totals = (ind, r) => {
  const rows = ind.days.filter((x) => inRange(x.date, r));
  const base = withRatios(rows.reduce(add, ZERO));
  const hasTotal = rows.length > 0 && rows.every((x) => x.total != null);
  return { ...base, days: rows.length, total: hasTotal ? rows.reduce((a, x) => a + x.total, 0) : null };
};

/* 일별 시리즈 — 빈 날은 0으로 채움 (수집 누락 표시용 gap 플래그) */
const daily = (rows, r) => {
  const by = Object.fromEntries(rows.map((x) => [x.date, x]));
  return dateList(r).map((date) => {
    const x = by[date];
    return x ? { date, cost: x.cost || 0, clicks: x.clicks || 0, conv: x.conv || 0, rev: x.rev ?? x.adRev ?? 0, total: x.total ?? null } : { date, ...ZERO, total: null, gap: true };
  });
};
/* 주 단위 묶음 (월요일 시작) */
const weekly = (series) => series.reduce((acc, x) => {
  const k = addDays(x.date, -((dow(x.date) + 6) % 7));
  const cur = acc.length && acc[acc.length - 1].date === k ? acc.pop() : { date: k, start: x.date, ...ZERO };
  return [...acc, { ...add(cur, x), date: k, start: cur.start }];  // start = 그 주에서 실제로 포함된 첫 날 (첫 주가 잘린 경우 표시용)
}, []);
const monthly = (rows, fromMonth, toMonth) => {
  const out = [];
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) {
    const r = { from: m, to: monthEnd(m) };
    out.push({ month: m.slice(0, 7), ...sumRows(rows, r) });
  }
  return out;
};

const channelAgg = (ind, r) => {
  const pr = prevOf(r);
  return ind.channels.map((ch) => ({ ...ch, ...sumRows(ind.byChannel[ch.id] || [], r), prev: sumRows(ind.byChannel[ch.id] || [], pr) }));
};
const deltaPct = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 100) : null);

/* ---------- 그룹 (구매완료 건수·매출만) ---------- */
const groupAgg = (ind, r) => {
  if (!ind.groups || !ind.groups.length) return [];
  const acc = ind.groups.map((g) => ({ ...g, conv: 0, rev: 0 }));
  Object.entries(ind.groupDaily || {}).forEach(([date, rows]) => {
    if (!inRange(date, r)) return;
    rows.forEach(([i, c, a]) => { acc[i] = { ...acc[i], conv: acc[i].conv + c, rev: acc[i].rev + a }; });
  });
  return acc.filter((g) => g.rev > 0 || g.conv > 0).sort((a, b) => b.rev - a.rev);
};

/* ---------- 소재 ---------- */
const GUARD = { MIN_ADS: 2, MIN_CLK: 30, GOOD_MULT: 1.3 };  // relay/creative_stats.py 주석과 같은 값
const AXES = { category: '카테고리', motif: '모티브', message: '메시지', target: '타깃', material: '소재', price_band: '가격대', shot: '연출', background: '배경', tone: '색감', composition: '구성' };
const GENERIC = new Set(['기타', '없음', '무관', '미상', '미라벨', '불명']);

/* 기간 안 소재별 합계. 일별 소재 데이터가 기간을 못 덮으면 basis 에 표시 */
const creativeRows = (ind, r) => {
  const C = ind.creatives;
  if (!C || !C.ads.length) return { rows: [], basis: { none: true } };
  if (!C.coverage) {
    const rows = C.ads.map((a, i) => withRatios({ ...a, clicks: C.totals28[i][0], cost: C.totals28[i][1], conv: C.totals28[i][2], rev: C.totals28[i][3] }));
    return { rows, basis: { fixed: true, window: C.window28 } };
  }
  const eff = { from: r.from < C.coverage.from ? C.coverage.from : r.from, to: r.to > C.coverage.to ? C.coverage.to : r.to };
  const acc = C.ads.map(() => ({ ...ZERO }));
  if (eff.from <= eff.to) {
    Object.entries(C.daily).forEach(([date, rows]) => {
      if (!inRange(date, eff)) return;
      rows.forEach(([i, clk, cost, conv, rev]) => { acc[i] = add(acc[i], { clicks: clk, cost, conv, rev }); });
    });
  }
  const rows = C.ads.map((a, i) => withRatios({ ...a, ...acc[i] }));
  const missing = (C.missing || []).filter((d) => inRange(d, eff));
  return { rows, basis: { eff, partial: eff.from !== r.from || eff.to !== r.to, empty: eff.from > eff.to, coverage: C.coverage, missing } };
};

const valuesOf = (row, axis) => {
  const v = row.labels ? row.labels[axis] : null;
  return Array.isArray(v) ? v : [v];
};
const r0 = (n) => Math.round(n);
const r2 = (n) => Math.round(n * 100) / 100;

const axesAgg = (rows, avg, totalRev) => Object.fromEntries(Object.entries(AXES).map(([axis, label]) => {
  const buckets = new Map();
  rows.forEach((r) => valuesOf(r, axis).forEach((v) => { if (v != null) buckets.set(v, [...(buckets.get(v) || []), r]); }));
  const vals = [...buckets.entries()].filter(([v]) => v !== '미라벨' && v !== '불명').map(([v, rs]) => {
    const s = rs.reduce(add, ZERO);
    const roas = s.cost ? r0((s.rev / s.cost) * 100) : 0;
    const hold = rs.length < GUARD.MIN_ADS || s.clicks < GUARD.MIN_CLK;
    return { value: v, n: rs.length, cost: s.cost, clk: s.clicks, conv: s.conv, rev: s.rev, roas, share: totalRev ? r0((s.rev / totalRev) * 100) : 0,
      mult: avg && !hold ? r2(roas / avg) : null, hold };
  });
  vals.sort((a, b) => (a.hold - b.hold) || ((b.mult || 0) - (a.mult || 0)) || (b.rev - a.rev));
  return [axis, { label, values: vals }];
}));

const comboOf = (row) => {
  const m = (row.labels.motif || []).filter((x) => x !== '기타');
  const s = (row.labels.message || []).filter((x) => x !== '없음');
  return [m[0] || '기타', s[0] || '없음'];
};
const tagKey = (ax, v) => `${ax}\u0001${v}`;

const suggestions = (rows, agg, avg, lever = 'bid') => {  // lever=budget(애드부스트)는 입찰 대신 상품 등록·제외로 말한다
  const noun = lever === 'budget' ? '상품' : '소재';
  const strong = Object.entries(agg).flatMap(([ax, a]) => a.values.filter((v) => !v.hold && (v.mult || 0) >= GUARD.GOOD_MULT && !GENERIC.has(v.value)).map((v) => [ax, v]))
    .sort((a, b) => (b[1].mult || 0) - (a[1].mult || 0));
  const combos = new Map();
  rows.forEach((r) => { const k = comboOf(r).join('\u0001'); combos.set(k, [...(combos.get(k) || []), r]); });
  const expand = [...combos.entries()].map(([k, rs]) => {
    const [m, s] = k.split('\u0001');
    const t = rs.reduce(add, ZERO), roas = t.cost ? (t.rev / t.cost) * 100 : 0;
    if (GENERIC.has(m) || !(rs.length >= 1 && rs.length <= 2 && t.clicks >= GUARD.MIN_CLK && avg && roas / avg >= GUARD.GOOD_MULT)) return null;
    const combo = `'${m}' 모티브${GENERIC.has(s) ? '' : ` × '${s}' 메시지`}`;
    return { motif: m, message: s, n: rs.length, roas: r0(roas), mult: r2(roas / avg), example: rs[0].name,
      text: `${combo} · ${noun} ${rs.length}개뿐인데 ROAS ${r0(roas).toLocaleString('ko-KR')}% (평균의 ${(roas / avg).toFixed(1)}배) → ${lever === 'budget' ? '같은 조합 상품 추가 등록' : '같은 조합 상품 소재 확장'}` };
  }).filter(Boolean).sort((a, b) => b.mult - a.mult).slice(0, 5);
  const tried = new Set();
  rows.forEach((r) => {
    const tags = [...new Set(Object.keys(AXES).flatMap((ax) => valuesOf(r, ax).map((v) => tagKey(ax, v))))];
    tags.forEach((a1) => tags.forEach((a2) => { if (a1 < a2) tried.add(`${a1}\u0002${a2}`); }));
  });
  const test = [];
  strong.forEach(([ax1, v1], i) => strong.slice(i + 1).forEach(([ax2, v2]) => {
    if (ax1 === ax2 || test.length >= 5) return;
    const key = [tagKey(ax1, v1.value), tagKey(ax2, v2.value)].sort().join('\u0002');
    if (!tried.has(key)) {
      test.push({ a: [AXES[ax1], v1.value, v1.mult], b: [AXES[ax2], v2.value, v2.mult],
        text: `${AXES[ax1]} '${v1.value}'(${v1.mult}배) + ${AXES[ax2]} '${v2.value}'(${v2.mult}배) · 아직 함께 쓴 ${noun} 없음 → 테스트 ${noun} 1개` });
    }
  }));
  const off = rows.filter((r) => r.clicks >= GUARD.MIN_CLK && r.conv === 0).sort((a, b) => b.cost - a.cost).slice(0, 5)
    .map((r) => ({ id: r.id, name: r.name, cost: r.cost, clk: r.clicks,
      text: `${r.name.slice(0, 28)} · 클릭 ${r.clicks}·광고비 ${Math.round(r.cost).toLocaleString('ko-KR')}원에 구매 0 → ${lever === 'budget' ? '광고센터에서 상품 제외 후보' : '입찰 하향 또는 OFF 후보'}` }));
  return { expand, test, off, strong: strong.slice(0, 6).map(([ax, v]) => ({ axis: AXES[ax], value: v.value, mult: v.mult, share: v.share })) };
};

const creativeAnalysis = (ind, r) => {
  const { rows, basis } = creativeRows(ind, r);
  const active = rows.filter((x) => x.cost > 0 || x.rev > 0);
  const t = withRatios(active.reduce(add, ZERO));
  const labeled = active.filter((x) => x.labels);  // 요소 분석·제안은 AI 라벨이 있는 소재만
  const lt = labeled.reduce(add, ZERO);
  const avg = lt.cost ? (lt.rev / lt.cost) * 100 : 0;
  const axes = labeled.length ? axesAgg(labeled, avg, lt.rev) : null;
  const lever = (ind.creatives && ind.creatives.lever) || 'bid';
  return { rows: active, all: rows, basis, lever, total: { ...withRatios(lt), ads: labeled.length }, adTotal: { ...t, ads: active.length }, avg, axes, sugg: axes ? suggestions(labeled, axes, avg, lever) : null };
};

window.RANGE = {
  iso, addDays, spanDays, prevOf, inRange, dow, md, mdw, fmtRange, fmtRangeY, monthStart, monthEnd, addMonths, clamp, dateList, presets, DOW,
  sumRows, totals, daily, weekly, monthly, channelAgg, groupAgg, deltaPct, withRatios,
  GUARD, AXES, GENERIC, creativeRows, axesAgg, suggestions, creativeAnalysis,
};
})();
