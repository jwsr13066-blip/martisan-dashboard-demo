'use strict';
(() => {
/* 매출 현황 · 매체별 성과 · 매체별 ROAS — 모든 카드가 상단 기간(또는 카드별 기간 칩)으로 다시 계산된다. */
const U = window.UI, R = window.RANGE, { lineChart, barsV, gauge, donut, fmtPct } = window.CH;
const { esc, won, wonS, cnt, pct, icon, delta, card, rangeChip, legend } = U;

const tileHtml = (label, value, badges, ic, tone) => `<div class="tile"><div style="display:flex;align-items:center;gap:8px"><span class="ico sm tone-${tone}">${icon(ic, 16)}</span><span class="mu">${esc(label)}</span></div>
  <span class="big num">${value}</span><div style="display:flex;gap:6px;flex-wrap:wrap">${badges}</div></div>`;
const chartSeries = (rows, r) => {
  const d = R.daily(rows, r);
  return R.spanDays(r) > 62 ? { unit: '주', pts: R.weekly(d), label: (x) => `${R.md(x.start)}~` } : { unit: '일', pts: d, label: (x) => `${R.md(x.date)} ${R.DOW[R.dow(x.date)]}` };
};

/* ===================== 매출 현황 ===================== */
const dayCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('today', 'day'), day = r.to;
  const t = R.totals(ind, { from: day, to: day }), y = R.totals(ind, { from: R.addDays(day, -1), to: R.addDays(day, -1) });
  const w = R.totals(ind, { from: R.addDays(day, -7), to: R.addDays(day, -1) });
  const avg = (k) => (w.days ? w[k] / w.days : 0);
  const d1 = (now, prev, goodUp) => delta(now, prev, goodUp, '전날');
  const d7 = (now, prev, goodUp) => delta(now, prev, goodUp, '7일 평균');
  const total = t.total != null ? `<div class="sm">${esc(ind.totalLabel)} ${won(t.total)} · 광고 기여 ${pct(t.rev, t.total)}%</div>` : '';
  return card({ id: 'today', title: '일간', sub: `${R.mdw(day)} 하루`, tools: rangeChip('today', r, st, { single: true }),
    body: `<div class="tiles">${tileHtml(U.sumLabel(ind), won(t.rev), d1(t.rev, y.rev, true) + d7(t.rev, avg('rev'), true), 'won', 'good')}
      ${tileHtml('ROAS', `${cnt(t.roas)}%`, U.sumBadge(ind) || `<span class="badge tone-${U.roasState(t.roas, ind)}">목표 ${ind.target}%</span>`, 'roas', 'info')}
      ${tileHtml('광고비', won(t.cost), d1(t.cost, y.cost, false), 'cost', 'warn')}
      ${tileHtml(ind.convLabel, `${cnt(t.conv)}${esc(ind.convUnit)}`, `<span class="badge tone-mute">${esc(ind.convLabel)}당 광고비 ${t.conv ? won(t.cost / t.conv) : '—'}</span>`, 'cart', 'mute')}</div>${total}` });
};

const weekCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('week');
  const { unit, pts, label } = chartSeries(ind.days, r);
  const hasTotal = pts.some((x) => x.total != null);
  const series = [...(hasTotal ? [{ name: ind.totalLabel, color: 'var(--c2)', values: pts.map((x) => x.total || 0), area: false }] : []),
    { name: U.sumLabel(ind), color: 'var(--good)', values: pts.map((x) => x.rev) }, { name: '광고비', color: 'var(--warn)', values: pts.map((x) => x.cost), area: false }];
  const best = pts.reduce((a, x) => (x.rev > a.rev ? x : a), pts[0] || { rev: 0, date: r.to });
  return card({ id: 'week', title: '주간 추이', sub: `${R.fmtRange(r)} · ${unit} 단위 · 최고 ${unit === '일' ? R.mdw(best.date) : `${R.md(best.date)}주`} ${wonS(best.rev)}`, tools: rangeChip('week', r, st),
    body: lineChart({ series, xLabels: pts.map(label), width: 1080, height: 320, pointLabels: hasTotal ? 1 : 0 }) + legend(series.map((s) => [s.color, s.name])) });
};

const monthCards = (cx) => {
  const { ind, st } = cx, r = cx.rng('month', 'months12');
  const ms = R.monthly(ind.days.map((x) => ({ ...x, rev: x.adRev })), R.monthStart(r.from), R.monthStart(r.to));
  const totals = R.monthly(ind.days.filter((x) => x.total != null).map((x) => ({ date: x.date, rev: x.total })), R.monthStart(r.from), R.monthStart(r.to));
  const hasTotal = totals.some((m) => m.rev > 0);
  const cur = R.monthStart(st.bounds.to).slice(0, 7);
  const bars = barsV({ height: 250, valueLabels: true, groups: ms.map((m, i) => ({ label: `${Number(m.month.slice(5))}월${m.month === cur ? '*' : ''}`,
    parts: hasTotal ? [{ value: m.rev, color: 'var(--good)' }, { value: Math.max(0, totals[i].rev - m.rev), color: 'var(--good-soft)' }] : [{ value: m.rev, color: m.month === cur ? 'var(--good)' : 'var(--c1)' }],
    tip: `${m.month} · ${esc(U.sumLabel(ind))} ${won(m.rev)} · 광고비 ${won(m.cost)} · ROAS ${cnt(m.roas)}%` })) });
  const g = cx.rng('mgoal', 'month'), gt = R.totals(ind, g), goal = ind.monthlyGoal;
  const left = Math.max(0, R.spanDays({ from: g.to, to: R.monthEnd(g.from) }) - 1);
  return card({ id: 'month', span: 8, title: '월간 추이', sub: '* 진행 중인 달 · 막대에 마우스를 올리면 광고비·ROAS', tools: rangeChip('month', r, st, { label: (x) => `${x.from.slice(0, 7)} ~ ${x.to.slice(0, 7)}` }),
    body: bars + legend(hasTotal ? [['var(--good)', `광고 기여 ${esc(ind.revLabel)}`], ['var(--good-soft)', `${esc(ind.totalLabel)} 나머지`]] : [['var(--c1)', U.sumLabel(ind)]]) })
    + card({ id: 'mgoal', span: 4, title: (goal ? '월 목표 달성률' : '월 목표 ROAS 달성률') + (U.multi(ind) ? ' (매체 보고 합계)' : ''), tools: rangeChip('mgoal', g, st, { single: true, label: (x) => `${Number(x.from.slice(5, 7))}월` }),
      body: `<div style="display:flex;justify-content:center">${gauge(goal ? pct(gt.rev, goal) : pct(gt.roas, ind.target), '월 목표', goal ? `${wonS(gt.rev)} / ${wonS(goal)}` : `ROAS ${cnt(gt.roas)}% / ${ind.target}%`)}</div>
        <div class="tiles" style="grid-template-columns:1fr 1fr"><div class="tile"><span class="sm">남은 날</span><b>${left}일</b></div><div class="tile"><span class="sm">${goal ? '하루 필요 매출' : '이번 달 ' + esc(U.sumLabel(ind))}</span><b class="num">${goal ? (left ? wonS(Math.max(0, (goal - gt.rev) / left)) : '마감') : wonS(gt.rev)}</b></div></div>
        ${goal ? '' : '<div class="note">월 매출 목표를 설정 카드(economics.monthly_revenue_goal)에 넣으면 매출 기준으로 바뀝니다.</div>'}` });
};

/* 매체 비중 도넛 + 오른쪽 범례 (매체별 % · 금액) */
const shareDonut = (rows, ind) => {
  const tot = rows.reduce((a, c) => a + c.rev, 0);
  const tip = (c) => `${c.name} ${won(c.rev)} · ${pct(c.rev, tot)}%`;
  const leg = rows.map((c) => `<div class="dn-row" data-tip="${esc(tip(c))}"><span class="sw" style="background:${c.color}"></span><b>${esc(c.name)}</b>
    <span class="pc num">${pct(c.rev, tot)}%</span><span class="sm num">${won(c.rev)}</span></div>`).join('');
  return `<div class="donut-wrap">${donut({ rows: rows.map((c) => ({ value: c.rev, color: c.color, tip: tip(c) })), label: `총 ${ind.revLabel}`, value: `${wonS(tot)}` })}<div class="dn-leg">${leg}</div></div>`;
};
const shareCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('share'), rows = R.channelAgg(ind, r).sort((a, b) => b.rev - a.rev);
  return card({ id: 'share', title: '매체 비중', sub: `${esc(ind.revLabel)} 기준`, tools: `${rangeChip('share', r, st)}<button type="button" class="link" data-page="channels">매체별 성과 →</button>`,
    body: shareDonut(rows, ind) + (rows.length < 2 ? '<div class="note">매체가 더 연동되면 원형이 나뉩니다.</div>' : '') });
};

const tableCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('table');
  const rows = R.daily(ind.days, r).slice().reverse();
  const head = `<button type="button" class="btn2" style="min-height:34px" data-toggle="tableOpen" aria-expanded="${!!st.tableOpen}">${st.tableOpen ? '접기 ▴' : '펼치기 ▾'}</button>`;
  const tbl = st.tableOpen ? `<div class="tbl-wrap"><table class="tbl num" id="day-table"><thead><tr><th>날짜</th><th>광고비</th><th>클릭</th><th>${esc(ind.convLabel)}</th><th>${esc(U.sumLabel(ind))}</th><th>ROAS</th></tr></thead><tbody>
    ${rows.map((x) => `<tr><td>${R.mdw(x.date)}${x.gap ? ' <span class="badge tone-crit">누락</span>' : ''}</td><td>${cnt(x.cost)}</td><td>${cnt(x.clicks)}</td><td>${cnt(x.conv)}</td><td>${cnt(x.rev)}</td><td>${x.cost ? cnt((x.rev / x.cost) * 100) : 0}%</td></tr>`).join('')}</tbody></table></div>
    <div><button type="button" class="link" data-copy="day-table">표 복사 (엑셀 붙여넣기용)</button> <span class="sm" id="copy-msg"></span></div>` : '';
  return card({ id: 'table', title: '일별 상세 표', sub: `${R.fmtRange(r)} · ${rows.length}일`, tools: `${rangeChip('table', r, st)}${head}`, body: tbl });
};

const pendingSlim = (ind) => (ind.ops.pending || []).map((p) => `<section class="card s12 dash" style="flex-direction:row;justify-content:space-between;align-items:center;flex-wrap:wrap">
  <div><b>${esc(p.name)}</b><div class="sm">${esc(p.reason)}</div></div><span class="badge tone-mute">연동 대기</span></section>`).join('');

const pageOverview = (cx) => `${U.dateBar(cx.st)}<div class="grid">${dayCard(cx)}${weekCard(cx)}${monthCards(cx)}${shareCard(cx)}${tableCard(cx)}${pendingSlim(cx.ind)}</div>`;

/* ===================== 매체별 성과 ===================== */
const compareCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('cmp'), rows = R.channelAgg(ind, r).sort((a, b) => b.rev - a.rev);
  const mx = (k) => Math.max(...rows.map((c) => c[k]), 1);
  const tr = rows.map((c) => `<tr><td><span style="display:inline-flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${c.color}"></span><b>${esc(c.name)}</b></span></td>
    <td class="num">${won(c.rev)}<div class="mini" style="width:${(c.rev / mx('rev')) * 100}%;background:${c.color}"></div></td>
    <td class="num">${won(c.cost)}<div class="mini" style="width:${(c.cost / mx('cost')) * 100}%;background:var(--warn)"></div></td>
    <td>${U.chBadge(c, r, ind)}</td><td class="num">${cnt(c.conv)}${esc(ind.convUnit)}</td>
    <td class="num">${c.conv ? won(c.cpa) : '—'} ${c.prev.conv && c.conv ? delta(c.cpa, c.prev.cpa, false, '') : ''}</td></tr>`).join('');
  return card({ id: 'share', title: '매체 비교', sub: '매출 비중 · 효율 · 전환당 비용 (매체별 전환은 합산하지 않고 각자 진단)', tools: rangeChip('cmp', r, st),
    body: `${shareDonut(rows, ind)}<div class="tbl-wrap"><table class="cmp-tbl"><thead><tr><th>매체</th><th>${esc(ind.revLabel)}</th><th>광고비</th><th>ROAS</th><th>${esc(ind.convLabel)}</th><th>${esc(ind.convLabel)}당 광고비</th></tr></thead><tbody>${tr}</tbody></table></div>` });
};

const channelCard = (cx, ch) => {
  const { ind, st } = cx, id = `ch-${ch.id}`, r = cx.rng(id);
  const c = R.channelAgg(ind, r).find((x) => x.id === ch.id);
  const { pts, label } = chartSeries(ind.byChannel[ch.id], r);
  const flow = lineChart({ series: [{ name: ind.revLabel, color: ch.color, values: pts.map((x) => x.rev) }, { name: '광고비', color: 'var(--warn)', values: pts.map((x) => x.cost), area: false }], xLabels: pts.map(label), width: 1080, height: 280, pointLabels: 0 });
  const groups = ind.groupChannel === ch.id ? R.groupAgg(ind, r) : [];
  const gMax = Math.max(...groups.map((g) => g.rev), 1);
  const grp = groups.length ? `<div class="tile" style="gap:10px"><div class="card-h"><b>그룹별 ${esc(ind.revLabel)}</b><span class="sm">오른쪽 = ${esc(ind.convLabel)}</span></div>
    ${U.hbars(groups.slice(0, 8).map((g) => ({ label: g.name, w: (g.rev / gMax) * 100, text: `${wonS(g.rev)} · ${cnt(g.conv)}${esc(ind.convUnit)}`, color: ch.color })))}</div>` : '';
  const an = R.creativeAnalysis(ind, r);
  const ads = an.rows.filter((a) => a.channelId === ch.id).sort((a, b) => b.rev - a.rev).slice(0, 5);
  const top = ads.length ? `<div class="tile" style="gap:10px"><div class="card-h"><b>이 매체 소재 TOP 5</b><button type="button" class="link" data-page="creatives">소재 성과에서 전체 보기 →</button></div>
    <div class="gallery g5">${ads.map((a, i) => `<div class="mini">${U.thumb(a, 90)}<span class="nm" style="font-weight:500">${i + 1} · ${esc(a.name)}</span><span class="sm num">${wonS(a.rev)} · ${esc(ind.convLabel)} ${cnt(a.conv)} · ROAS ${cnt(a.roas)}%</span></div>`).join('')}</div>
    ${an.basis.fixed ? '<div class="note">소재 일별 데이터 수집 전이라 최근 28일 고정 수치입니다.</div>' : ''}</div>` : '';
  return card({ id, title: `<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:4px;background:${ch.color}"></span>${esc(ch.name)}</span>`, sub: U.chBadge(c, r, ind), tools: rangeChip(id, r, st),
    body: `<div class="tiles">${tileHtml(ind.revLabel, won(c.rev), delta(c.rev, c.prev.rev, true), 'won', 'good')}${tileHtml('광고비', won(c.cost), delta(c.cost, c.prev.cost, false), 'cost', 'warn')}
      ${tileHtml('ROAS', `${cnt(c.roas)}%`, `<span class="badge tone-info">목표 ${ind.target}%</span>`, 'roas', 'info')}${tileHtml(ind.convLabel, `${cnt(c.conv)}${esc(ind.convUnit)}`, `<span class="badge tone-mute">${esc(ind.convLabel)}당 ${c.conv ? won(c.cpa) : '—'}</span>`, 'cart', 'mute')}</div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr)"><div class="tile"><div class="card-h"><b>${esc(ind.revLabel)} 흐름</b>${legend([[ch.color, ind.revLabel], ['var(--warn)', '광고비']])}</div>${flow}</div>${grp}</div>${top}` });
};

const pageChannels = (cx) => {
  const { ind } = cx;
  const next = ind.live ? `<section class="card s12 dash" style="flex-direction:row;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b>다음 매체 자리</b>
    <div class="sm">파워링크 · 카카오 · 쿠팡 — 연동되는 순서대로 매체 카드와 왼쪽 메뉴 탭이 추가됩니다</div></div><span class="badge tone-mute">연동 대기</span></section>` : '';
  return `${U.dateBar(cx.st)}<div class="grid">${compareCard(cx)}${ind.channels.map((ch) => channelCard(cx, ch)).join('')}${next}</div>`;
};

/* ===================== 매체별 ROAS ===================== */
const ZONES = (ind) => [{ lo: 0, hi: ind.bep, cls: 'z1', label: '손익분기 미달' }, { lo: ind.bep, hi: ind.target, cls: 'z2', label: '목표 미달' }, { lo: ind.target, hi: Infinity, cls: 'z3', label: '목표 달성' }];

const bulletCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('compare'), rows = R.channelAgg(ind, r).sort((a, b) => b.roas - a.roas);
  const max = Math.max(ind.target * 1.6, ...rows.map((c) => c.roas * 1.1));
  const p = (v) => `${Math.min(100, (v / max) * 100)}%`;
  const body = rows.map((c) => {
    const dp = c.prev.cost ? c.roas - c.prev.roas : null;
    return `<div class="bullet-row"><div style="display:flex;flex-direction:column;gap:4px"><span style="display:flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${c.color}"></span><b>${esc(c.name)}</b></span>
      <span class="big num">${cnt(c.roas)}%</span>${U.chStale(c, r) ? U.chBadge(c, r, ind) : `<span class="badge tone-${U.roasState(c.roas, ind)}" style="align-self:flex-start">${U.STATE_WORD[U.roasState(c.roas, ind)]}${dp == null ? '' : ` · 직전 기간 ${dp >= 0 ? '▲' : '▼'}${Math.abs(dp)}%p`}</span>`}</div>
      <div style="display:flex;flex-direction:column;gap:6px"><div class="bullet" data-tip="${esc(c.name)} · 광고비 ${won(c.cost)} → ${esc(ind.revLabel)} ${won(c.rev)}"><div class="z1" style="width:${p(ind.bep)}"></div><div class="z2" style="width:calc(${p(ind.target)} - ${p(ind.bep)})"></div><div class="z3" style="flex:1"></div><div class="bar" style="width:${p(c.roas)}"></div></div>
      <div class="scale"><span style="left:${p(ind.bep)}">손익분기 ${ind.bep}%</span><span style="left:${p(ind.target)}">목표 ${ind.target}%</span></div></div></div>`;
  }).join('');
  return card({ id: 'compare', title: 'ROAS 비교', sub: '매체마다 손익분기 미달 · 목표 미달 · 목표 달성 중 어디에 있나', tools: rangeChip('compare', r, st),
    body: `<div>${body}</div>${legend([['var(--crit-soft)', '손익분기 미달'], ['var(--warn-soft)', '목표 미달'], ['var(--good-soft)', '목표 달성']])}` });
};

const trendCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('trend', 'weeks8'), unit = st.trendUnit || 'week';
  const pts = (rows) => (unit === 'week' ? R.weekly(R.daily(rows, r)) : R.daily(rows, r));
  const base = pts(ind.days);
  const series = ind.channels.map((ch) => ({ name: ch.name, color: ch.color, area: false, values: pts(ind.byChannel[ch.id]).map((x) => (x.cost ? Math.round((x.rev / x.cost) * 100) : 0)) }));
  const seg = `<div class="seg" role="group" aria-label="단위"><button type="button" data-unit="day" aria-pressed="${unit === 'day'}">일</button><button type="button" data-unit="week" aria-pressed="${unit === 'week'}">주</button></div>`;
  return card({ id: 'trend', title: 'ROAS 추이', sub: `${R.fmtRange(r)} · ${unit === 'week' ? '주' : '일'} 단위 · 어디서 꺾였나`, tools: `${seg}${rangeChip('trend', r, st)}`,
    body: lineChart({ series, xLabels: base.map((x) => (unit === 'week' ? `${R.md(x.start)}~` : `${R.md(x.date)}`)), height: 250, yFmt: fmtPct, zones: ZONES(ind) })
      + legend(series.map((s) => [s.color, s.name])) });
};

const streak = (vals, pred) => { let n = 0; for (let i = vals.length - 1; i >= 0 && vals[i] != null && pred(vals[i]); i -= 1) n += 1; return n; };
const lightsCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('lights', 'weeks4'), rows = R.channelAgg(ind, r).filter((c) => !U.chStale(c, r));  // 데이터 미반영 매체는 진단 생략
  const cards = rows.map((c) => {
    const j = U.judge(c.roas, ind), ws = U.weeklyRoas(ind.byChannel[c.id], r.to, 4);
    const run = j.s === 'good' ? `${streak(ws, (v) => v >= ind.target)}주 연속 목표 달성` : `${streak(ws, (v) => v < ind.target)}주 연속 목표 미달`;
    const sym = j.s === 'good' ? 'check' : j.s === 'warn' ? 'bulb' : 'trash';
    return `<div class="tile" style="gap:10px"><div style="display:flex;align-items:center;gap:12px"><span class="ico tone-${j.s}" style="border-radius:50%;width:44px;height:44px">${icon(sym, 20)}</span>
      <div><b>${esc(c.name)}</b><div class="sm">ROAS ${cnt(c.roas)}% · ${run}</div></div></div>
      <div class="alert"><span><b>권장 액션</b> · ${esc(j.act)}</span></div>
      <div class="sm num">최근 4주 ROAS ${U.roasList(ws)}% · 광고비 ${wonS(c.cost)} · ${esc(ind.convLabel)} ${cnt(c.conv)}${esc(ind.convUnit)} · ${esc(j.note)}</div>
      <button type="button" class="link" data-page="home" data-sec="sec-inbox" style="align-self:flex-start">최적화 제안 보기 →</button></div>`;
  }).join('');
  return card({ id: 'lights', title: '효율 진단', sub: '진단 → 권장 액션 · 같은 숫자는 항상 같은 진단', tools: rangeChip('lights', r, st),
    body: `<div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${cards}</div>` });
};

const pageRoas = (cx) => `${U.dateBar(cx.st)}<div class="grid">${bulletCard(cx)}${trendCard(cx)}${lightsCard(cx)}</div>
  <div class="note">손익분기 ROAS = 100 ÷ 마진율 ${cx.ind.margin}% = ${cx.ind.bep}% · 목표 = ${cx.ind.target}% · 매출·전환은 구매완료 기준</div>`;

window.PAGES_MAIN = { pageOverview, pageChannels, pageRoas };
})();
