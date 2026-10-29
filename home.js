'use strict';
(() => {
/* 개요 — 오늘 할 일(최적화 제안 승인) + 기간 성과 + 변경 전후 성과 + 변경 내역 + 알림 + 자동 규칙 + 매출 상위 소재 + 성과 진단.
   cx = { ind, st, rng(카드ID, 기본종류) } — 카드마다 기간 칩으로 따로 바꿀 수 있다. */
const U = window.UI, R = window.RANGE, { gauge } = window.CH;
const { esc, won, wonS, cnt, pct, icon, delta, card, kpi, rangeChip } = U;

const DIR = { up: ['good', '인상'], down: ['warn', '인하'], off: ['crit', 'OFF'], hold: ['mute', '유지'], fresh: ['info', '리프레시'] };
const EV = { apply: ['good', '승인 적용'], weight: ['warn', '입찰 가중치'], rule: ['info', '규칙 엔진'], propose: ['acc', '제안 생성'], pc: ['mute', '지면 점검'], gap: ['crit', '수집 누락'] };
const MODE = { auto: ['good', '자동'], propose: ['info', '제안'], alert: ['warn', '알림'] };

const pendingOf = (ops, today) => {
  const a = ops.approvals || {};
  const expired = a.expires && a.expires < today;
  return { a, live: a.status === 'pending' && a.count > 0 && !expired, expired };
};

const changePct = (it) => (it.bid ? Math.round(((it.new - it.bid) / it.bid) * 100) : 0);
const rankItems = (items) => items.slice().sort((x, y) => (x.dir === 'off' ? -1 : y.dir === 'off' ? 1 : Math.abs(changePct(y)) - Math.abs(changePct(x))));
const itemRow = (it) => {
  const [tone] = DIR[it.dir] || DIR.hold;
  const dt = it.dirText || (it.dir === 'off' ? 'OFF' : `${changePct(it) > 0 ? '+' : ''}${changePct(it)}%`);
  const act = it.act || (it.dir === 'off' ? 'OFF 제안 (승인 전엔 유지)' : `입찰 ${cnt(it.bid)}원 → ${cnt(it.new)}원`);
  return `<div class="li"><span class="badge b dir tone-${tone}">${esc(dt)}</span><div class="grow"><div class="t">${esc(it.name || '')}${it.group ? ` <span class="sm">${esc(it.group)}</span>` : ''}</div>
    <div class="sm">${esc(it.reason || '')}${it.reason ? ' → ' : ''}${esc(act)}</div></div></div>`;
};

const approveBtn = (p, st) => {
  if (st.approved) return '<span class="badge tone-good b">승인 접수 · 적용 결과는 카톡으로 갑니다</span>';
  if (!p.live) return '';
  if (st.approving) return '<button type="button" class="btn" disabled>실행 요청 중…</button>';
  const armed = st.approveArm;
  return `<button type="button" class="btn ${armed ? 'arm' : ''}" data-approve="1">${armed ? `정말 적용할까요? ${p.a.count}건 · 한 번 더 누르기` : `입찰 제안 ${p.a.count}건 승인하기`}</button>`;
};

const hero = (cx, p, alerts) => {
  const { ind, st } = cx, ops = ind.ops;
  const autoYday = (ops.timeline || []).filter((e) => e.date === st.bounds.to && ['rule', 'weight', 'apply'].includes(e.type)).length;
  const todo = p.live ? `승인 대기 <b>${p.a.count}건</b>` : '승인 대기 없음';
  const sub = p.live ? `승인 유효 ${esc(R.mdw(p.a.expires))}까지 · 누르면 바로 적용 · 주간 변경 20% 상한 · OFF는 제안만${p.a.effect ? ` · ${esc(p.a.effect)}` : ''}`
    : p.expired ? '지난 제안의 승인 유효기간이 지났습니다. 다음 제안은 월요일 09:17에 올라옵니다.' : '다음 주간 입찰 제안은 월요일 09:17에 올라옵니다.';
  return `<section class="card hero" id="sec-inbox-top"><div style="display:flex;flex-direction:column;gap:8px">
      <h2>안녕하세요, 사장님</h2>
      <div class="todo">오늘 할 일 · ${todo} · 알림 <b>${alerts.length}건</b> · 최근 자동 실행 <b>${autoYday}건</b></div>
      <div class="sm">${sub}</div>${st.approveError ? `<span class="badge tone-crit">${esc(st.approveError)}</span>` : ''}</div>
    <div class="acts">${approveBtn(p, st)}<button type="button" class="btn2" data-scroll="sec-inbox">제안 목록 보기</button></div></section>`;
};

const kpis = (cx) => {
  const { ind, st } = cx;
  const tile = (id, ic, tone, label, key, fmt, goodUp, color) => {
    const r = cx.rng(id), t = R.totals(ind, r), p = R.totals(ind, R.prevOf(r));
    const val = key === 'roas' ? t.roas : key === 'rev' ? t.rev : t.cost;
    const pv = key === 'roas' ? p.roas : key === 'rev' ? p.rev : p.cost;
    const series = R.daily(ind.days, r).map((x) => (key === 'roas' ? (x.cost ? (x.rev / x.cost) * 100 : 0) : key === 'rev' ? x.rev : x.cost));
    const badge = key === 'roas' ? (U.sumBadge(ind) || `<span class="badge tone-${U.roasState(val, ind)}">목표 ${ind.target}% · ${U.STATE_WORD[U.roasState(val, ind)]}</span>`) : delta(val, pv, goodUp);
    return kpi({ ic, tone, label, value: fmt(val), badge, sparkVals: series, sparkColor: color, tools: rangeChip(id, r, st) });
  };
  const m = cx.rng('goal', 'month'), mt = R.totals(ind, m);
  const goal = ind.monthlyGoal;
  const pctV = goal ? pct(mt.rev, goal) : pct(mt.roas, ind.target);
  const left = Math.max(0, R.spanDays({ from: m.to, to: R.monthEnd(m.from) }) - 1);
  const need = goal && left ? Math.max(0, (goal - mt.rev) / left) : 0;
  const gaugeCard = `<div class="card" style="align-items:center">
    <div class="card-h" style="align-self:stretch"><span class="mu">${goal ? '월 목표 달성률' : '월 목표 ROAS 달성률'}${U.multi(ind) ? ' (매체 보고 합계)' : ''}</span>${rangeChip('goal', m, st, { single: true, label: (r) => `${Number(r.from.slice(5, 7))}월` })}</div>
    ${gauge(pctV, '월 목표 달성률', goal ? `${wonS(mt.rev)} / ${wonS(goal)}` : `ROAS ${cnt(mt.roas)}% / 목표 ${ind.target}%`)}
    <div class="sm" style="text-align:center">${goal ? (left ? `남은 ${left}일 · 하루 ${wonS(need)} 필요` : '이번 달 마감') : '월 매출 목표를 설정 카드에 넣으면 매출 기준으로 바뀝니다'}</div></div>`;
  return `<section class="grid kpis">
    ${tile('k-rev', 'won', 'good', U.sumLabel(ind), 'rev', (v) => won(v), true, 'var(--good)')}
    ${tile('k-roas', 'roas', 'info', 'ROAS', 'roas', (v) => `${cnt(v)}%`, true, 'var(--info)')}
    ${tile('k-cost', 'cost', 'warn', '광고비', 'cost', (v) => won(v), false, 'var(--warn)')}
    ${gaugeCard}</section>`;
};

const inboxCard = (cx, p) => {
  const { st } = cx, a = p.a;
  const items = rankItems(a.items || []);
  const shown = st.inboxAll ? items : items.slice(0, 3);
  const counts = a.counts || {};
  const summary = a.summary || `입찰 인상 ${counts.up || 0} · 인하 ${counts.down || 0} · OFF ${counts.off || 0}`;
  const head = p.live ? `승인 대기 ${a.count}건` : a.status === 'applied' ? `지난 제안 ${a.count}건 · 적용 완료` : '승인 대기 없음';
  const body = items.length ? shown.map(itemRow).join('') : '<div class="empty">지금 승인할 제안이 없습니다. 다음 주간 제안은 월요일 09:17에 올라옵니다.</div>';
  const more = items.length > 3 ? `<button type="button" class="link" data-toggle="inboxAll">${st.inboxAll ? '접기' : `나머지 ${items.length - 3}건 펼치기`}</button>` : '';
  return card({ id: 'inbox', span: 7, title: head, sub: `예상 영향 금액 순 · ${esc(summary)}`, body: `<div>${body}</div><div class="card-h" style="border-top:1px solid var(--line);padding-top:12px">${more || '<span></span>'}${approveBtn(p, st)}</div>` });
};

const scoreCard = (cx) => {
  const { ind, st } = cx, hs = ind.ops.history || [];
  if (!hs.length) return card({ id: 'score', span: 5, title: '변경 전후 성과', body: '<div class="empty">첫 승인 뒤 7일이 지나면 적용 전 7일과 후 7일을 비교합니다.</div>' });
  const full = hs.map((x, k) => [x, k]).filter(([x]) => x.after.days == null || x.after.days >= 7);  // 기본 = 7일이 다 찬 가장 최근 회차
  const i = st.histIdx == null || st.histIdx >= hs.length ? (full.length ? full[full.length - 1][1] : hs.length - 1) : st.histIdx, h = hs[i];
  const scale = h.after.days && h.before.days && h.after.days < h.before.days ? h.before.days / h.after.days : 1;  // 적용 후가 덜 찼으면 하루 평균으로 맞춤
  const sel = `<select class="inp" data-hist="1" aria-label="적용 회차" style="height:30px;font-size:12px">${hs.map((x, k) => `<option value="${k}" ${k === i ? 'selected' : ''}>${R.md(x.applied_at)} 적용분 · ${x.count}건</option>`).join('')}</select>`;
  const pair = (label, k, tone, goodUp) => {
    const b = h.before[k] || 0, a = (h.after[k] || 0) * scale, mx = Math.max(b, a, 1), d = R.deltaPct(a, b);
    label = esc(label);
    return `<span class="sm">${label}</span><div class="pair"><div class="hbar mute" style="width:${(b / mx) * 100}%" data-tip="적용 전 ${label} ${k === 'conv' ? cnt(b) : won(b)}"></div><div class="hbar ${tone}" style="width:${(a / mx) * 100}%" data-tip="적용 후 ${label} ${k === 'conv' ? cnt(a) : won(a)}"></div></div>
      <b class="num">${d == null ? '—' : `${d >= 0 ? '▲' : '▼'}${Math.abs(d)}%`}</b>`;
  };
  const up = h.after.roas >= h.before.roas;
  const partial = h.after.days != null && h.after.days < 7 ? ` · 적용 후 ${h.after.days}일치(7일 기준 환산, 7일 지나면 확정)` : '';
  return card({ id: 'score', span: 5, title: '변경 전후 성과', tools: sel,
    body: `<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="big num">${h.before.roas}% → ${h.after.roas}%</span><span class="badge tone-${up ? 'good' : 'warn'}">ROAS ${up ? '▲' : '▼'}</span></div>
      <div class="sm">적용 전 7일 vs 후 7일${partial} · 입찰 인상 ${h.counts.up || 0} · 인하 ${h.counts.down || 0} · OFF ${h.counts.off || 0}</div>
      <div class="hbars" style="grid-template-columns:56px 1fr 52px">${pair('광고비', 'cost', 'warn', false)}${pair(ind.revLabel, 'rev', 'good', true)}${pair(ind.convLabel, 'conv', 'info', true)}</div>
      <div class="sm">회색 = 적용 전 · 색 = 적용 후</div>` });
};

const logCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('log');
  const evs = (ind.ops.timeline || []).filter((e) => R.inRange(e.date, r));
  const span = R.spanDays(r);
  const strip = span <= 31 ? `<div class="strip" style="grid-template-columns:repeat(${span},minmax(0,1fr))">${R.dateList(r).map((d) => {
    const es = evs.filter((e) => e.date === d), top = es[0];
    return `<div data-tip="${esc(R.mdw(d))}${es.length ? ` · ${esc(es.map((e) => e.title).join(' / '))}` : ' · 변경 없음'}"><div class="d ${top ? esc(top.type) : ''}"></div><span class="sm">${Number(d.slice(8))}</span></div>`;
  }).join('')}</div><div class="legend"><span><s style="background:var(--good)"></s>승인 적용</span><span><s style="background:var(--warn)"></s>입찰 가중치</span><span><s style="background:var(--info)"></s>규칙 엔진</span><span><s style="background:var(--c4)"></s>제안 생성</span><span><s style="background:var(--crit)"></s>수집 누락</span></div>` : '';
  const shown = st.logAll ? evs : evs.slice(0, 5);
  const list = shown.map((e) => { const [tone, lb] = EV[e.type] || ['mute', esc(e.type)]; return `<div class="li"><span class="dot ${tone === 'acc' ? 'info' : tone}"></span><div class="grow"><div>${esc(e.title)}</div><div class="sm">${esc(R.mdw(e.date))}${e.detail ? ` · ${esc(e.detail)}` : ''}</div></div><span class="badge tone-${tone}">${lb}</span></div>`; }).join('');
  const nW = evs.filter((e) => e.type === 'weight').length, nA = evs.filter((e) => e.type === 'apply').length, nR = evs.filter((e) => e.type === 'rule').length;
  return card({ id: 'log', span: 8, title: '변경 내역', sub: `${evs.length}건 · 승인 적용 ${nA} · 입찰 가중치 ${nW} · 규칙 엔진 ${nR}`, tools: rangeChip('log', r, st),
    body: `${strip}<div>${list || '<div class="empty">이 기간에는 변경 내역이 없습니다.</div>'}</div>${evs.length > 5 ? `<button type="button" class="link" data-toggle="logAll">${st.logAll ? '접기' : `전체 ${evs.length}건 보기`}</button>` : ''}` });
};

/* 알림 — 새 판정 없이 이미 있는 숫자·규칙·상태에서만 뽑는다 */
const alertsOf = (cx, p) => {
  const { ind, st } = cx, r = st.range, t = R.totals(ind, r), pv = R.totals(ind, R.prevOf(r)), out = [];
  const dRev = R.deltaPct(t.rev, pv.rev), dCost = R.deltaPct(t.cost, pv.cost);
  if (dRev != null && dRev <= -30) out.push(['crit', '이상', `${esc(U.sumLabel(ind))} 직전 기간 대비 ${dRev}%${U.staleNote(ind) ? ` (${esc(U.staleNote(ind))} — 이후 날짜는 미반영)` : ''}`]);
  if (dCost != null && dCost >= 50) out.push(['warn', '주의', `광고비 직전 기간 대비 +${dCost}%`]);
  const gaps = (ind.ops.timeline || []).filter((e) => e.type === 'gap' && R.inRange(e.date, r)).length;
  if (gaps) out.push(['crit', '누락', `데이터 수집 누락 ${gaps}일 (진단에서 제외)`]);
  const w = ind.ops.weather, rain = (ind.ops.rules?.rules || []).find((x) => x.id === 'rain_mobile' && x.enabled);
  if (w && w.tomorrow && rain && w.tomorrow.rain_prob >= 70) out.push(['warn', '날씨', `내일 ${esc(w.location?.name || '')} 강수확률 ${w.tomorrow.rain_prob}% → 비 오는 날 규칙 발동 예정`]);
  if (p.live) out.push(['info', '승인', `입찰 제안 ${p.a.count}건 승인 대기 (${R.md(p.a.expires)}까지)`]);
  (ind.ops.rules?.rules || []).filter((x) => x.mode === 'propose' && (x.fired_dates || []).includes(st.bounds.to)).forEach((x) => out.push(['info', '제안', `${esc(x.name)} 제안 대기`]));
  (ind.ops.pending || []).forEach((x) => out.push(['mute', '연동', `${esc(x.name)} · ${esc(x.reason)}`]));
  return out;
};
const alertCard = (alerts) => card({ id: 'alerts', span: 4, title: '알림', sub: '상단 기간 기준',
  body: alerts.length ? alerts.map(([tone, lb, txt]) => `<div class="alert"><span class="badge b ${tone === 'mute' ? 'tone-mute' : `solid-${tone}`}">${lb}</span><span>${txt}</span></div>`).join('') : '<div class="empty">지금 확인할 알림이 없습니다.</div>' });

const rulesCard = (cx) => {
  const { ind, st } = cx, cfg = ind.ops.rules;
  if (!cfg || !cfg.rules || !cfg.rules.length) return '';
  const r = cx.rng('rules');
  const evald = (cfg.evaluated_dates || []).filter((d) => R.inRange(d, r));
  const w = ind.ops.weather && ind.ops.weather.today;
  const ruleBox = (x) => {
    const [tone, lb] = MODE[x.mode] || ['mute', esc(x.mode)];
    const fired = (x.fired_dates || []).filter((d) => R.inRange(d, r));
    let eff = `발동 ${fired.length}회`;
    if (x.mode === 'auto') {
      const other = evald.filter((d) => !fired.includes(d));
      if (fired.length >= 3 && other.length >= 3) {
        const src = (ind.byChannel && ind.byChannel[ind.groupChannel]) || ind.days.map((y) => ({ ...y, rev: y.adRev }));  // 규칙이 움직이는 매체 행만
        const roasOn = (ds) => R.withRatios(ds.reduce((a, d) => { const day = src.find((y) => y.date === d); return day ? { ...a, cost: a.cost + day.cost, rev: a.rev + day.rev } : a; }, { cost: 0, clicks: 0, conv: 0, rev: 0 })).roas;
        const fr = roasOn(fired), orr = roasOn(other);
        eff += ` · 발동일 ROAS ${cnt(fr)}% vs 미발동일 ${cnt(orr)}% (${(fr / Math.max(orr, 1)).toFixed(2)}배)`;
      } else eff += ` · 효과 측정 중 (발동 ${fired.length}/3일)`;
    }
    return `<div class="rule"><div class="rule-top"><span class="badge tone-${tone}">${lb}</span><span class="tg ${x.enabled ? '' : 'off'}" role="img" aria-label="${x.enabled ? '켜짐' : '꺼짐'}"><i></i></span></div>
      <b>${esc(x.name)}</b><div class="sm">${esc(x.desc || '')}</div><div class="sm">${eff}</div></div>`;
  };
  return card({ id: 'rules', title: `자동 규칙 ${cfg.rules.length}개`, sub: `조건 → 행동 → 자정 원복${cfg.last_run ? ` · 마지막 평가 ${esc(cfg.last_run.slice(5, 16).replace('T', ' '))}` : ''}`,
    tools: `${w ? `<span class="badge tone-info">${esc(cfg.region || '')} · 강수 ${w.rain_prob}% · ${w.tmin}~${w.tmax}℃</span>` : ''}${rangeChip('rules', r, st)}`,
    body: `<div class="rules">${cfg.rules.map(ruleBox).join('')}</div><div class="note">날씨·요일 규칙은 가설입니다. 발동일과 미발동일 성과를 비교해 유지·폐기를 결정합니다. 모든 조정은 그룹당 ±20~30% 상한, 자정 원복.</div>` });
};

const topCreatives = (cx) => {
  const { ind, st } = cx, r = cx.rng('top3');
  const an = R.creativeAnalysis(ind, r);
  const top = an.rows.slice().sort((a, b) => b.rev - a.rev).slice(0, 3);
  if (!top.length) return '';
  const fixed = an.basis.fixed ? ' · 최근 28일 고정 (일별 소재 데이터 수집 전)' : an.basis.partial ? ` · 소재 데이터 ${R.fmtRange(an.basis.coverage)} 범위만` : '';
  return card({ id: 'top3', title: '매출 상위 소재 TOP 3', sub: fixed, tools: `${rangeChip('top3', r, st)}<button type="button" class="link" data-page="creatives">소재 성과 전체 →</button>`,
    body: `<div class="tops">${top.map((a, i) => `<div style="display:flex;gap:12px;align-items:center;min-width:0">
      <div style="width:76px;flex-shrink:0">${U.thumb(a, 76)}</div><div style="display:flex;flex-direction:column;gap:4px;min-width:0">
      <div class="nm" style="font-weight:500">${i + 1}위 · ${esc(a.name)}</div><div class="sm num">${wonS(a.rev)} · ${esc(ind.convLabel)} ${cnt(a.conv)} · ROAS ${cnt(a.roas)}%</div>${U.labelChips(a.labels, 2)}</div></div>`).join('')}</div>` });
};

const whyCard = (cx) => {
  const { ind, st } = cx, r = cx.rng('why');
  const rows = R.channelAgg(ind, r);
  const body = rows.map((c) => {
    const j = U.judge(c.roas, ind), stale = U.chStale(c, r), small = stale || c.clicks < 10;
    const ws = U.weeklyRoas(ind.byChannel[c.id], r.to, 4);
    return `<div class="li"><span class="dot ${small ? 'mute' : j.s}"></span><div class="grow"><div class="t">${esc(c.name)} · ROAS ${cnt(c.roas)}%${small ? '' : ` → ${esc(j.act)}`}</div>
      <div class="sm">최근 4주 ROAS ${U.roasList(ws)}% · 클릭 ${cnt(c.clicks)} · ${esc(ind.convLabel)} ${cnt(c.conv)}${esc(ind.convUnit)} · 손익분기 ${ind.bep}% = 100 ÷ 마진 ${ind.margin}% · 목표 ${ind.target}%</div></div>
      <span class="badge tone-${small ? 'mute' : j.s}">${stale ? '데이터 미반영 · 판단 보류' : small ? '표본 부족 · 판단 보류' : U.STATE_WORD[j.s]}</span></div>`;
  }).join('');
  const first = rows[0], j0 = first ? U.judge(first.roas, ind) : null;
  return card({ id: 'why', title: '성과 진단', sub: '같은 숫자는 항상 같은 진단 (고정 규칙) · 클릭 10 미만은 보류',
    tools: `${rangeChip('why', r, st)}<button type="button" class="btn2" style="min-height:34px" data-toggle="whyOpen" aria-expanded="${!!st.whyOpen}">${st.whyOpen ? '접기 ▴' : '펼치기 ▾'}</button>`,
    body: st.whyOpen ? `<div>${body}</div>` : first ? `<div class="alert"><span class="dot ${j0.s}" style="margin-top:4px"></span><span>${esc(first.name)} · ROAS ${cnt(first.roas)}% · ${U.STATE_WORD[j0.s]} → ${esc(j0.act)}</span></div>` : '' });
};

const pageHome = (cx) => {
  const { ind, st } = cx;
  const p = pendingOf(ind.ops, st.today);
  const alerts = alertsOf(cx, p);
  return `${U.dateBar(st)}${hero(cx, p, alerts)}${kpis(cx)}
    <div class="grid">${inboxCard(cx, p)}${scoreCard(cx)}${logCard(cx)}${alertCard(alerts)}${rulesCard(cx)}${topCreatives(cx)}${whyCard(cx)}</div>`;
};

window.PAGE_HOME = { pageHome };
})();
