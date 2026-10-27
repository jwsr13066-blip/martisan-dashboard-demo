'use strict';
/* 화면 조립 — 메뉴마다 "한 줄 결론 → 큰 그림 → 숫자" 순서. 판정 문장은 고정 템플릿(해석 엔진 §5). */

const { DATA, sumRange, END_DATE } = window.MARTISAN_DATA;
const { lineChart, barsH, barsV, scatter, spark, fmtShort, fmtPct, escT: esc } = window.CH;

const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const wonS = (n) => `${fmtShort(n)} 원`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const deltaPct = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 100) : 0);
const arrow = (d) => (d >= 0 ? '▲' : '▼');
const deltaPill = (d, goodWhenUp = true) => `<span class="pill ${(d >= 0) === goodWhenUp ? 'good' : 'crit'}">${arrow(d)} ${Math.abs(d)}%</span>`;
const cnt = (n) => Math.round(n);
const roasOf = (a) => (a.cost ? Math.round((a.rev / a.cost) * 100) : 0);
const roasStatus = (r, ind) => (r >= ind.target ? 'good' : r >= ind.bep ? 'warn' : 'crit');
const statusWord = { good: '목표 달성', warn: '본전권', crit: '손익분기 미달' };
const MD = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const PERIOD_LABEL = { 1: '오늘', 7: '최근 7일', 30: '최근 30일' };

const APPROVALS = {
  commerce: { count: 12, summary: '인상 5 · 인하 6 · 끄기 1', effect: '승인 시 예상: 주 광고비 −9% · 매출 유지', items: [
    ['down', '−10%', '실버925 각인 반지', 'ROAS 180%, 목표 300% 미달 2주 연속', '입찰 10% 하향 (예상 절감 주 1.2만 원)'],
    ['up', '+15%', '유기동물 후원 팔찌', 'ROAS 480%, 목표의 1.6배', '입찰 15% 상향, 상한 CPC 210원 (예상 추가 매출 주 4만 원)'],
    ['off', 'OFF', '타이니 은 팔찌', '클릭 24 · 전환 0, 4주 누적 비용 3.1만 원 > 객단가', 'OFF 제안 (승인 전엔 유지)']],
    did: { summary: '지난주 조정 30건 (자동 22 · 승인 후 8)', score: [['광고비', '−32%', true, '적용 전후 7일'], ['매출', '−1%', false, '유지'], ['ROAS', '166→247%', true, '목표 300%']],
      list: ['시간 가중치 봇 2일 발동 (ROAS 500%↑ 시 +20%, 자정 원복)', '제외키워드 14개 등록 (무전환 검색어 차단)', 'PC 지면 가중치 절반 제안 → 승인 후 적용'] } },
  local: { count: 8, summary: '플레이스 입찰 5 · 시간대 예산 2 · 끄기 1', effect: '승인 시 예상: 주 광고비 −6% · 예약 +3팀', items: [
    ['down', '−10%', '성수 맛집', '예약당 4,900원, 목표 3,500원 초과 2주 연속', '입찰 10% 하향 (예상 절감 주 8천 원)'],
    ['up', '+15%', '성수 데이트 식당', '예약당 2,100원, 목표의 60%', '입찰 15% 상향 (예상 추가 예약 주 3팀)'],
    ['up', '+20%', '금·토 18~20시', '시간대 예약 전환 평균의 2.1배', '시간대 예산 +20% (자정 원복)']],
    did: { summary: '지난주 조정 18건 (자동 13 · 승인 후 5)', score: [['광고비', '−21%', true, '적용 전후 7일'], ['예약', '+4%', true, '31팀'], ['예약당 광고비', '3,230→2,970', true, '목표 3,500']],
      list: ['평일 점심 시간대 가중치 3일 발동', '제외키워드 9개 등록 ("레시피", "배달" 등)', '플레이스 대표 사진 교체 제안 → 승인 후 반영'] } },
  lead: { count: 11, summary: '입찰 7 · 소재 리프레시 2 · 끄기 2', effect: '승인 시 예상: 주 광고비 −7% · 상담 +3건', items: [
    ['fresh', '리프레시', '메타 소재 "견적 비교 B"', '빈도 3.4 · CTR −31% · CPC +22% 동시 충족 (소재 피로)', '끄지 않고 연출 다른 2편으로 교체 (활성 소재 수 유지)'],
    ['down', '−10%', '아파트 리모델링 견적', '상담당 24,000원, 목표 15,000원 초과 2주 연속', '입찰 10% 하향 (예상 절감 주 2.3만 원)'],
    ['up', '+15%', '30평 인테리어 견적', '상담당 9,800원, 목표의 65%', '입찰 15% 상향 (예상 추가 상담 주 3건)']],
    did: { summary: '지난주 조정 24건 (자동 17 · 승인 후 7)', score: [['광고비', '−14%', true, '적용 전후 7일'], ['상담', '+9%', true, '23건'], ['상담당 광고비', '17,400→14,800', true, '목표 15,000']],
      list: ['메타 소재 1편 리프레시 (피로 3조건 충족)', '제외키워드 11개 등록 ("셀프", "DIY" 등)', '구글 검색 예산 +20% 스텝 1회 (한계 효율 확인 후)'] } },
};

const PAGES = [
  { id: 'home', name: 'AI 결재함', secs: [['inbox', '결재함'], ['score', '전후 성적표'], ['log', '자동 행동 타임라인'], ['rules', '자동 규칙'], ['why', '판정 근거']] },
  { id: 'overview', name: '전체 매출', secs: [['today', '당일 매출'], ['week', '일주일 추이'], ['month', '월별 매출']] },
  { id: 'channels', name: '채널별 매출', secs: [['share', '채널 비교']], channelSecs: true },
  { id: 'roas', name: '채널별 ROAS', secs: [['compare', 'ROAS 비교'], ['trend', '8주 추이'], ['lights', '신호등']] },
  { id: 'creatives', name: '우수 소재', secs: [['rank', '소재 순위'], ['map', '소재 분포'], ['fatigue', '피로 경보']], liveSecs: [['rank', '소재 카드'], ['axes', '속성별 성과'], ['map', '다음 소재 제안']] },
];

/* ---------- 집계 ---------- */
const channelAgg = (ind, n) => ind.channels.map((ch) => ({ ...ch, ...sumRange(ind.byChannel[ch.id], n), prev: sumRange(ind.byChannel[ch.id], n, n) }))
  .map((c) => ({ ...c, roas: roasOf(c), cpa: c.conv ? c.cost / c.conv : 0 }));
const weeklyRoas = (ind, ch, weeks = 8) => Array.from({ length: weeks }, (_, i) => roasOf(sumRange(ind.byChannel[ch.id], 7, 7 * (weeks - 1 - i))));
const monthly = (ind) => {
  const byM = ind.days.reduce((acc, d) => {
    const k = d.date.slice(0, 7);
    const cur = acc[k] || { k, total: 0, adRev: 0, cost: 0 };
    return { ...acc, [k]: { ...cur, total: cur.total + d.total, adRev: cur.adRev + d.adRev, cost: cur.cost + d.cost } };
  }, {});
  return Object.values(byM).sort((a, b) => (a.k < b.k ? -1 : 1)).slice(-12);
};
const streak = (series, pred) => series.slice().reverse().findIndex((v) => !pred(v)) === -1 ? series.length : series.slice().reverse().findIndex((v) => !pred(v));

/* ---------- 공통 조각 ---------- */
const insight = (eyebrow, html, act) => `<section class="insight"><div class="eyebrow">${esc(eyebrow)}</div><p>${html}</p>${act ? `<div class="act">${act}</div>` : ''}</section>`;
const card = (id, span, eyebrow, title, desc, body) => `<section class="card s${span}" id="sec-${id}"><div class="card-h"><div class="eyebrow">${esc(eyebrow)}</div><h3>${title}</h3>${desc ? `<div class="d">${desc}</div>` : ''}</div>${body}</section>`;
const legend = (items) => `<div class="legend">${items.map(([c, l, kind]) => `<span>${kind === 'line' ? '<i></i>' : kind === 'band' ? '<u></u>' : `<s style="background:${c}"></s>`}${esc(l)}</span>`).join('')}</div>`;
const judge = (ch, ind) => {
  const r = ch.roas, T = ind.target;
  if (r >= 1.5 * T) return { s: 'good', act: `입찰 +15% 상향 제안 (상한 CPC 내)`, note: `목표의 ${(r / T).toFixed(1)}배` };
  if (r >= T) return { s: 'good', act: '유지 · 증액 후보 (한계 ROAS 확인 후)', note: '목표 달성' };
  if (r >= ind.bep) return { s: 'warn', act: '유지 (본전권) · 소재·키워드 점검', note: `목표 ${T}% 미달, 손익분기 ${ind.bep}% 이상` };
  if (r >= T / 3) return { s: 'crit', act: '입찰 −10% 하향 제안', note: `손익분기 ${ind.bep}% 미달` };
  return { s: 'crit', act: '입찰 −20% · 2주 연속이면 OFF 제안', note: '목표의 1/3 미만' };
};

/* ---------- 페이지: 전체 매출 (전체 매출 미연동이면 광고 기여 매출 기준) ---------- */
const pageOverview = (ind) => {
  const hasTotal = ind.days[ind.days.length - 1].total != null;
  const d = ind.days.map((x) => ({ ...x, total: x.total ?? x.adRev }));
  const last = d.length - 1, today = d[last], yest = d[last - 1];
  const wk = d.slice(-7), pwk = d.slice(-14, -7);
  const sumK = (rows, k) => rows.reduce((a, x) => a + x[k], 0);
  const wkT = sumK(wk, 'total'), pwkT = sumK(pwk, 'total'), wkAd = sumK(wk, 'adRev'), wkCost = sumK(wk, 'cost');
  const avg7 = wkT / 7, best = wk.reduce((a, x) => (x.total > a.total ? x : a), wk[0]);
  const months = monthly({ ...ind, days: d });
  const mGrowth = months.length > 2 ? deltaPct(months[months.length - 2].total, months[0].total) : 0;
  const mShare = Math.round(months.reduce((a, m) => a + pct(m.adRev, m.total), 0) / months.length);
  const totalName = hasTotal ? ind.revLabel : `광고 기여 ${ind.revLabel}`;
  const dT = deltaPct(today.total, yest.total), dW = deltaPct(wkT, pwkT);
  const ins = insight(`${ind.brand} · ${hasTotal ? ind.totalLabel : totalName}`,
    `오늘 ${esc(totalName)} <b>${wonS(today.total)}</b>, 어제보다 ${arrow(dT)}${Math.abs(dT)}%. 이번 주는 <b>${wonS(wkT)}</b>로 지난주 대비 ${arrow(dW)}${Math.abs(dW)}%${hasTotal ? `, 그중 광고가 <b>${pct(wkAd, wkT)}%</b>를 만들었습니다.` : `, 광고비 ${wonS(wkCost)}로 ROAS <b>${pct(wkAd, wkCost)}%</b>입니다.`}`,
    hasTotal ? `광고비 ${wonS(wkCost)} → 광고 기여 ${esc(ind.revLabel)} ${wonS(wkAd)} · 전체 기준 MER ${(wkT / wkCost).toFixed(1)}배`
      : `스토어 전체 매출은 커머스 API 연동 후 표시됩니다. 지금 숫자는 광고를 거쳐 발생한 ${esc(ind.revLabel)} (${esc(ind.convLabel)}완료 기준)`);
  const todayCard = card('today', 4, `당일 · ${MD(today.date)} (${DOW[today.day]})`, `오늘 ${esc(totalName)}`, '',
    `<div class="hero num">${fmtShort(today.total)}<small>원</small></div>
     <div class="row">${deltaPill(dT)}<span class="pill mute">7일 평균 대비 ${arrow(deltaPct(today.total, avg7))}${Math.abs(deltaPct(today.total, avg7))}%</span></div>
     <div class="kv num">${hasTotal ? `<div><div class="k">광고 기여</div><div class="v">${fmtShort(today.adRev)}</div><div class="t">${pct(today.adRev, today.total)}%</div></div>` : `<div><div class="k">ROAS</div><div class="v">${pct(today.adRev, today.cost)}%</div><div class="t">목표 ${ind.target}%</div></div>`}
     <div><div class="k">오늘 광고비</div><div class="v">${fmtShort(today.cost)}</div><div class="t">${hasTotal ? `MER ${(today.total / today.cost).toFixed(1)}배` : `${esc(ind.convLabel)}당 ${today.conv ? won(today.cost / today.conv) : '—'}`}</div></div>
     <div><div class="k">${esc(ind.convLabel)}</div><div class="v">${cnt(today.conv)}${esc(ind.convUnit)}</div><div class="t">광고 전환</div></div></div>`);
  const weekSeries = hasTotal
    ? [{ name: `전체 ${ind.revLabel}`, color: 'var(--c1)', values: wk.map((x) => x.total) }, { name: `광고 기여 ${ind.revLabel}`, color: 'var(--c3)', values: wk.map((x) => x.adRev) }]
    : [{ name: totalName, color: 'var(--c1)', values: wk.map((x) => x.adRev) }, { name: '광고비', color: 'var(--c2)', values: wk.map((x) => x.cost) }];
  const weekCard = card('week', 8, '일주일 추이', `이번 주 최고는 <b>${MD(best.date)} (${DOW[best.day]})</b> ${wonS(best.total)}`,
    hasTotal ? `전체 ${esc(ind.revLabel)}과 광고 기여분을 같은 축에서 비교` : `${esc(totalName)}과 광고비를 같은 축(원)에서 비교`,
    lineChart({ series: weekSeries, xLabels: wk.map((x) => `${MD(x.date)} ${DOW[x.day]}`), height: 230 }) + legend(weekSeries.map((sr) => [sr.color, sr.name])));
  const monthCard = card('month', 12, '월별 · 최근 12개월', hasTotal ? `1년 전보다 <b>${arrow(mGrowth)}${Math.abs(mGrowth)}%</b> 성장, 광고 기여도는 평균 <b>${mShare}%</b>` : `월별 ${esc(totalName)}`,
    hasTotal ? '진한 막대가 광고 기여분, 연한 막대가 나머지. 이번 달은 진행 중(*)' : '이번 달은 진행 중(*)',
    barsV({ groups: months.map((m, i) => ({ label: `${Number(m.k.slice(5))}월${i === months.length - 1 ? '*' : ''}`,
      parts: hasTotal ? [{ value: m.adRev, color: 'var(--c1)' }, { value: m.total - m.adRev, color: 'var(--c1-soft)' }] : [{ value: m.adRev, color: 'var(--c1)' }],
      tip: `${m.k} · ${totalName} ${wonS(hasTotal ? m.total : m.adRev)}${hasTotal ? ` · 광고 기여 ${wonS(m.adRev)} (${pct(m.adRev, m.total)}%)` : ''} · 광고비 ${wonS(m.cost)} · ROAS ${pct(m.adRev, m.cost)}%` })), height: 260 })
    + legend(hasTotal ? [['var(--c1)', `광고 기여 ${ind.revLabel}`], ['var(--c1-soft)', '나머지']] : [['var(--c1)', totalName]]));
  const pendingCard = hasTotal ? '' : `<section class="card s12 pending"><div class="card-h"><div class="eyebrow">연동 대기</div><h3>스토어 전체 매출 · 객단가 · 광고 기여도</h3><div class="d">커머스 API 판매자 계정 발급 후 이 자리에 전체 매출 대비 광고 기여도가 들어옵니다.</div></div></section>`;
  return ins + `<div class="grid">${todayCard}${weekCard}${monthCard}${pendingCard}</div>`;
};

/* ---------- 페이지: 채널별 매출 ---------- */
const pageChannels = (ind, st) => {
  const n = st.period, rows = channelAgg(ind, n).sort((a, b) => b.rev - a.rev);
  const totRev = rows.reduce((a, r) => a + r.rev, 0), totCost = rows.reduce((a, r) => a + r.cost, 0);
  const bestRoas = rows.slice().sort((a, b) => b.roas - a.roas)[0];
  const ins = insight(`채널별 ${ind.revLabel} · ${PERIOD_LABEL[n]}`,
    `<b>${esc(rows[0].name)}</b>이(가) ${esc(ind.revLabel)}의 <b>${pct(rows[0].rev, totRev)}%</b>를 만들었습니다. 효율 1위는 <b>${esc(bestRoas.name)}</b> (ROAS ${bestRoas.roas}%).`,
    `${rows.length}개 채널 합계 · 광고비 ${wonS(totCost)} → 광고 기여 ${esc(ind.revLabel)} ${wonS(totRev)}. 채널별 전환은 창이 달라 합산하지 않고 각자 판정합니다.`);
  const shareCard = card('share', 12, '채널 비교', `${esc(ind.revLabel)} 비중 · ${PERIOD_LABEL[n]}`, '',
    barsH({ rows: rows.map((r) => ({ label: r.name, value: r.rev, color: r.color, text: `${fmtShort(r.rev)} · ${pct(r.rev, totRev)}%`, tip: `${r.name} · ${ind.revLabel} ${won(r.rev)} · 광고비 ${won(r.cost)} · ROAS ${r.roas}%` })) }));
  const cards = rows.map((r) => {
    const s = roasStatus(r.roas, ind), dv = deltaPct(r.rev, r.prev.rev);
    return `<button type="button" class="chcard ${st.openCh === r.id ? 'open' : ''}" id="ch-${r.id}" data-ch="${r.id}">
      <div class="nm"><span class="sw" style="background:${r.color}"></span>${esc(r.name)}<span class="pill ${s}" style="margin-left:auto">ROAS ${r.roas}%</span></div>
      <div class="big num">${fmtShort(r.rev)}<small>원 · ${deltaPill(dv)}</small></div>
      <div class="sub num"><span>광고비 ${fmtShort(r.cost)}</span><span>${esc(ind.convLabel)} ${cnt(r.conv)}${esc(ind.convUnit)}</span><span>${esc(ind.convLabel)}당 ${fmtShort(r.cpa)}원</span></div>
      <div class="foot">${spark(ind.byChannel[r.id].slice(-14).map((x) => x.rev), r.color)}<span class="sub">14일 추이</span></div></button>`;
  }).join('');
  const open = rows.find((r) => r.id === st.openCh);
  const drill = open ? card('drill', 12, `${open.name} 자세히`, `${esc(open.name)} 소재·그룹별 ${esc(ind.revLabel)} (최근 30일)`, '카드를 다시 누르면 닫힙니다',
    `<div class="tbl-wrap"><table class="tbl num"><thead><tr><th>소재 / 그룹</th><th>광고비</th><th>${esc(ind.revLabel)}</th><th>ROAS</th><th>CTR</th><th>판정</th></tr></thead><tbody>
    ${ind.creatives.filter((c) => c.channel.id === open.id).sort((a, b) => b.rev - a.rev).map((c) => `<tr><td>${esc(c.name)}</td><td>${c.cost == null ? '—' : won(c.cost)}</td><td>${won(c.rev)}</td><td>${c.roas == null ? '—' : `${Math.round(c.roas * 100)}%`}</td><td>${c.ctr == null ? '—' : `${c.ctr}%`}</td><td>${c.roas == null ? `<span class="pill mute">${esc(ind.convLabel)} ${c.conv}${esc(ind.convUnit)}</span>` : `<span class="pill ${roasStatus(c.roas * 100, ind)}">${statusWord[roasStatus(c.roas * 100, ind)]}</span>`}</td></tr>`).join('')}
    </tbody></table></div>`) : '';
  return ins + `<div class="grid">${shareCard}<section class="card s12" id="sec-cards"><div class="card-h"><div class="eyebrow">채널 카드 · 누르면 소재별로 펼쳐집니다</div><h3>채널마다 한 장</h3></div><div class="chcards">${cards}</div></section>${drill}</div>`;
};

/* ---------- 페이지: 채널별 ROAS ---------- */
const pageRoas = (ind, st) => {
  const n = st.period, rows = channelAgg(ind, n).sort((a, b) => b.roas - a.roas);
  const ok = rows.filter((r) => r.roas >= ind.target).length, worst = rows[rows.length - 1];
  const wj = judge(worst, ind);
  const ins = insight(`채널별 ROAS · ${PERIOD_LABEL[n]} · 구매완료 기준`,
    `${rows.length}개 채널 중 <b>${ok}개</b>가 목표 ROAS ${ind.target}% 이상. ${worst.roas < ind.bep ? `<b>${esc(worst.name)}</b> ${worst.roas}%는 손익분기(${ind.bep}%) 아래 → ${esc(wj.act)}` : `가장 낮은 <b>${esc(worst.name)}</b>도 ${worst.roas}%로 손익분기(${ind.bep}%) 위입니다.`}`,
    `손익분기 ROAS = 100 ÷ 마진율 ${ind.margin}% × 100 = ${ind.bep}% · 목표 = 손익분기 × 1.2 = ${ind.target}%`);
  const compare = card('compare', 6, 'ROAS 비교', `목표선 위 <b>${ok}개</b>, 손익분기 아래 <b>${rows.filter((r) => r.roas < ind.bep).length}개</b>`, '점선 왼쪽은 적자, 두 점선 사이는 본전권',
    barsH({ rows: rows.map((r) => ({ label: r.name, value: r.roas, color: r.color, text: `${r.roas}% · ${statusWord[roasStatus(r.roas, ind)]}`, tip: `${r.name} · ROAS ${r.roas}% · 광고비 ${won(r.cost)} → ${ind.revLabel} ${won(r.rev)}` })),
      refs: [{ value: ind.bep, label: `손익분기 ${ind.bep}%`, pos: 'bottom' }, { value: ind.target, label: `목표 ${ind.target}%`, pos: 'top' }] }));
  const weeks = 8, labels = Array.from({ length: weeks }, (_, i) => `${weeks - i}주 전`.replace('1주 전', '이번 주'));
  const trend = card('trend', 6, '8주 추이', '목표 아래로 내려간 채널이 어디서 꺾였는지', '초록 띠 = 손익분기~목표 사이(본전권), 점선 = 목표',
    lineChart({ series: rows.map((r) => ({ name: r.name, color: r.color, values: weeklyRoas(ind, r, weeks), area: false })), xLabels: labels, height: 250, yFmt: fmtPct,
      band: { lo: ind.bep, hi: ind.target, label: '본전권' }, refs: [{ value: ind.target, label: `목표 ${ind.target}%` }] })
    + legend([...rows.map((r) => [r.color, r.name]), ['', '목표', 'line'], ['', '본전권', 'band']]));
  const lightsList = rows.map((r) => {
    const j = judge(r, ind), ws = weeklyRoas(ind, r, 4);
    const below = streak(ws, (v) => v < ind.target), above = streak(ws, (v) => v >= ind.target);
    const run = j.s === 'good' ? `${above}주 연속 달성` : `${below}주 연속 미달`;
    return `<li><span class="dot ${j.s}"></span><div><div class="t">${esc(r.name)} · ROAS ${r.roas}%, 목표 ${ind.target}% ${j.s === 'good' ? '달성' : '미달'} ${run} → ${esc(j.act)}</div><div class="d">${esc(j.note)} · 광고비 ${wonS(r.cost)} · ${esc(ind.convLabel)} ${cnt(r.conv)}${esc(ind.convUnit)}</div></div><span class="pill ${j.s === 'good' && r.roas < 1.5 * ind.target ? 'mute' : 'accent'}">${j.s === 'good' && r.roas < 1.5 * ind.target ? '자동 유지' : '승인 대기'}</span></li>`;
  }).join('');
  const lights = card('lights', 12, '신호등 · 판정은 반드시 행동으로', '채널별 판정과 다음 행동', '같은 데이터는 항상 같은 판정 (고정 규칙 엔진)', `<ul class="lights">${lightsList}</ul>`);
  return ins + `<div class="grid">${compare}${trend}${lights}</div>`;
};

/* ---------- 페이지: 우수 소재 ---------- */
const AXIS_ORDER = ['motif', 'message', 'category', 'target', 'material', 'price_band', 'shot', 'background', 'tone', 'composition'];
const GENERIC = new Set(['기타', '없음', '무관', '미상', '미라벨', '불명']);
const chipsOf = (lab) => {
  const items = [['카테고리', lab.category], ...(lab.motif || []).map((m) => ['모티브', m]), ...(lab.message || []).map((m) => ['메시지', m]),
    ['타깃', lab.target], ['소재', lab.material], ['가격대', lab.price_band], ['연출', lab.shot], ['배경', lab.background], ['색감', lab.tone]];
  return items.filter(([, v]) => v && !GENERIC.has(v)).map(([k, v]) => `<span class="lchip" title="${esc(k)}">${esc(v)}</span>`).join('');
};

const pageCreativesAI = (ind) => {
  const ai = ind.creativesAI, st = state, tot = ai.total;
  const strong = ai.suggestions.strong || [];
  const headline = strong.length
    ? `${esc(strong[0].axis)} <b>'${esc(strong[0].value)}'</b>가 평균 ROAS의 <b>${strong[0].mult}배</b>${strong[1] ? `, ${esc(strong[1].axis)} '${esc(strong[1].value)}'가 ${strong[1].mult}배` : ''}.`
    : '평균 이상으로 두드러지는 속성이 아직 없습니다.';
  const weak = AXIS_ORDER.flatMap((ax) => (ai.axes[ax]?.values || []).filter((v) => !v.hold && v.mult != null && v.mult <= ai.guard.good_mult / 2 && !GENERIC.has(v.value)).map((v) => ({ ...v, axis: ai.axes[ax].label }))).sort((a, b) => a.mult - b.mult)[0];
  const ins = insight(`우수 소재 AI · 최근 ${ai.window?.days || 28}일 · 활성 소재 ${tot.ads}개 · 구매완료 기준`,
    headline + (weak ? ` 반대로 ${esc(weak.axis)} '${esc(weak.value)}'는 ${weak.mult}배로 약합니다.` : ''),
    `평균 ROAS ${tot.roas}% (광고비 ${wonS(tot.cost)} → ${esc(ind.revLabel)} ${wonS(tot.rev)}) · 표본 가드: 소재 ${ai.guard.min_ads}개·클릭 ${ai.guard.min_clk} 미만은 판단 보류 · 이미지 라벨 ${tot.labeled_images}/${tot.ads}${tot.labeled_images ? '' : ' (API 키 등록 후 자동)'}`);
  const axis = ai.axes[st.axis] ? st.axis : 'motif';
  const tabs = AXIS_ORDER.filter((ax) => ai.axes[ax] && ai.axes[ax].values.length).map((ax) => `<button type="button" data-axis="${ax}" aria-pressed="${ax === axis}">${esc(ai.axes[ax].label)}</button>`).join('');
  const vals = ai.axes[axis].values.filter((v) => !GENERIC.has(v.value) || v.rev > 0).slice(0, 10);
  const axisCard = card('axes', 5, '속성별 성과 · 평균선 대비', `${esc(ai.axes[axis].label)}별 ROAS`, '회색 막대는 표본 부족(판단 보류). 점선이 전체 평균',
    `<div class="chips axis-tabs">${tabs}</div>` + barsH({ rows: vals.map((v) => ({ label: `${v.value} (${v.n})`, value: v.roas, color: v.hold ? 'var(--mute)' : (v.mult >= ai.guard.good_mult ? 'var(--good)' : v.mult <= 0.7 ? 'var(--crit)' : 'var(--c1)'),
      text: v.hold ? `${v.roas}% · 보류` : `${v.roas}% · ${v.mult}배`, tip: `${v.value} · 소재 ${v.n}개 · 광고비 ${won(v.cost)} · ${ind.revLabel} ${won(v.rev)} (${v.share}%) · 클릭 ${v.clk} · ${ind.convLabel} ${v.conv}` })),
      valueFmt: (n) => `${Math.round(n)}%`, refs: [{ value: tot.roas, label: `평균 ${tot.roas}%`, pos: 'bottom' }], labelW: 150 }));
  const adCards = ai.ads.slice(0, 12).map((a) => {
    const s = roasStatus(a.roas, ind);
    const thumb = a.image ? `<img class="thumb-img" src="${esc(a.image)}" alt="" loading="lazy">` : `<span class="thumb" style="background:var(--c4)">${esc(a.name.slice(0, 2))}</span>`;
    return `<div class="adcard" data-tip="${esc(a.name)} · 광고비 ${won(a.cost)} · 클릭 ${a.clk} · ${ind.convLabel} ${a.conv}">${thumb}<div class="adbody"><div class="nm">${esc(a.name)}</div><div class="lchips">${chipsOf(a.labels)}</div>
      <div class="row num"><b>${fmtShort(a.rev)}원</b><span class="pill ${s}">ROAS ${a.roas}%</span><span class="sub">${ind.convLabel} ${a.conv}${esc(ind.convUnit)} · ${a.cpa ? `${esc(ind.convLabel)}당 ${fmtShort(a.cpa)}원` : '구매 0'}</span></div></div></div>`;
  }).join('');
  const rank = card('rank', 7, `소재 카드 · ${esc(ind.revLabel)} 상위 12`, '썸네일 + AI 라벨 + 성과', '라벨은 상품명·카테고리·가격은 규칙으로, 연출·배경·색감은 이미지에서 클로드가 읽습니다', `<div class="adgrid">${adCards}</div>`);
  const sg = ai.suggestions;
  const col = (title, eyebrow, items, cls) => `<div class="sugg ${cls}"><div class="eyebrow">${esc(eyebrow)}</div><h4>${esc(title)}</h4>${items.length ? `<ul>${items.map((t) => `<li>${esc(t.text)}</li>`).join('')}</ul>` : '<div class="d">해당 없음</div>'}</div>`;
  const suggest = card('map', 12, '다음 소재 제안 · 고정 규칙', `늘릴 조합 ${sg.expand.length} · 시도할 조합 ${sg.try.length} · 정리 후보 ${sg.cleanup.length}`, '제안은 실행되지 않습니다. 브리프 제작(상품명·이미지 방향)은 클로드 세션에서, 정리는 입찰 매니저 승인 흐름으로',
    `<div class="suggs">${col('늘릴 조합', '강한데 소재가 적음', sg.expand, 'good')}${col('시도할 조합', '강한 속성끼리 아직 안 합쳐봄', sg.try, 'accent')}${col('정리 후보', '클릭은 받는데 구매 0', sg.cleanup, 'crit')}</div>`);
  return ins + `<div class="grid">${rank}${axisCard}${suggest}</div>`;
};

const pageCreativesLive = (ind) => {
  if (ind.creativesAI) return pageCreativesAI(ind);
  const cs = ind.creatives.slice().sort((a, b) => b.rev - a.rev);
  const tot = cs.reduce((a, c) => a + c.rev, 0), top3 = cs.slice(0, 3).reduce((a, c) => a + c.rev, 0);
  const ins = insight(`우수 소재 · 최근 30일 · ${ind.revLabel} 기준`,
    cs.length ? `상위 3개 소재가 ${esc(ind.revLabel)}의 <b>${pct(top3, tot)}%</b>를 만들었습니다. 1위는 <b>${esc(cs[0].name)}</b> (${esc(cs[0].group)}, ${esc(ind.revLabel)} ${wonS(cs[0].rev)}).` : '최근 30일 전환이 잡힌 소재가 없습니다.',
    '소재별 광고비·ROAS·소재 피로는 네이버 소재 리포트 연동(P2)에서 추가됩니다. 지금은 구매완료 건수·매출 기준 순위입니다.');
  const maxRev = cs[0]?.rev || 1;
  const rank = card('rank', 7, '소재 순위 · 상위 10', '막대 길이가 매출', '',
    `<ol class="rank">${cs.slice(0, 10).map((c, i) => `<li><span class="no">${i + 1}</span><span class="thumb" style="background:${c.channel.color}">${esc(c.name.slice(0, 2))}</span>
      <div><div class="nm">${esc(c.name)}<span class="chn">${esc(c.group)}</span></div><div class="bar"><i style="width:${pct(c.rev, maxRev)}%;background:${c.channel.color}"></i></div></div>
      <div class="rt num"><b>${fmtShort(c.rev)}원</b><span>${esc(ind.convLabel)} ${c.conv}${esc(ind.convUnit)}</span></div></li>`).join('')}</ol>`);
  const gs = ind.groups || [], gTot = gs.reduce((a, g) => a + g.rev, 0);
  const grp = card('map', 5, '그룹별 매출 · 최근 30일', gs.length ? `<b>${esc(gs[0].name)}</b> 그룹이 ${esc(ind.revLabel)}의 ${pct(gs[0].rev, gTot)}%` : '그룹 데이터 없음', '',
    gs.length ? barsH({ rows: gs.map((g) => ({ label: g.name, value: g.rev, color: 'var(--c4)', text: `${fmtShort(g.rev)} · ${g.conv}${ind.convUnit}`, tip: `${g.name} · ${ind.revLabel} ${won(g.rev)} · ${ind.convLabel} ${g.conv}${ind.convUnit}` })) }) : '');
  return ins + `<div class="grid">${rank}${grp}</div>`;
};

const pageCreatives = (ind) => {
  if (ind.live || ind.creativesAI) return pageCreativesLive(ind);
  const cs = ind.creatives.slice().sort((a, b) => b.rev - a.rev);
  const tot = cs.reduce((a, c) => a + c.rev, 0), top3 = cs.slice(0, 3).reduce((a, c) => a + c.rev, 0);
  const tired = cs.filter((c) => c.state === 'fatigue');
  const ins = insight(`우수 소재 · 최근 30일 · ${ind.revLabel} 기준`,
    `상위 3개 소재가 ${esc(ind.revLabel)}의 <b>${pct(top3, tot)}%</b>를 만들었습니다. 1위는 <b>${esc(cs[0].name)}</b> (${esc(cs[0].channel.name)}, ROAS ${Math.round(cs[0].roas * 100)}%). ${tired.length ? `메타 소재 <b>${tired.length}개</b>는 피로 신호 → 리프레시 제안.` : ''}`,
    '소재 피로 = 빈도 상승 + CTR 하락 + CPC 상승 3개 동시 충족. 끄지 않고 연출이 다른 새 편으로 교체해 활성 소재 수를 유지합니다.');
  const maxRev = cs[0].rev;
  const rank = card('rank', 7, '소재 순위 · 상위 10', '막대 길이가 매출, 색이 채널', '',
    `<ol class="rank">${cs.slice(0, 10).map((c, i) => {
      const s = roasStatus(c.roas * 100, ind);
      return `<li data-tip="${esc(c.name)} · 광고비 ${won(c.cost)} · ${ind.revLabel} ${won(c.rev)}"><span class="no">${i + 1}</span><span class="thumb" style="background:${c.channel.color}">${esc(c.name.slice(0, 2))}</span>
        <div><div class="nm">${esc(c.name)}<span class="chn">${esc(c.channel.name)}</span>${c.state === 'fatigue' ? '<span class="pill crit">피로</span>' : ''}</div><div class="bar"><i style="width:${pct(c.rev, maxRev)}%;background:${c.channel.color}"></i></div></div>
        <div class="rt num"><b>${fmtShort(c.rev)}원</b><span class="pill ${s}">ROAS ${Math.round(c.roas * 100)}%</span><span>CTR ${c.ctr}%</span></div></li>`;
    }).join('')}</ol>`);
  const pts = cs.map((c, i) => ({ x: c.cost, y: Math.round(c.roas * 100), r: c.rev, color: c.channel.color, label: i < 3 || c.state === 'fatigue' ? c.name : '', tip: `${c.name} (${c.channel.name}) · 광고비 ${won(c.cost)} · ROAS ${Math.round(c.roas * 100)}% · ${ind.revLabel} ${won(c.rev)}` }));
  const map = card('map', 5, '소재 분포', '오른쪽 위가 늘릴 소재, 오른쪽 아래가 끌 소재', '가로 광고비 · 세로 ROAS · 원 크기 매출',
    scatter({ points: pts, refs: [{ value: ind.target, label: `목표 ${ind.target}%` }, { value: ind.bep, label: `손익분기 ${ind.bep}%` }],
      notes: [{ px: 0.98, py: 0.96, text: '늘릴 소재 ↗' }, { px: 0.98, py: 0.06, text: '끌 소재 ↘' }], height: 320 })
    + legend(ind.channels.map((c) => [c.color, c.name])));
  const fat = card('fatigue', 12, '피로 경보 · 메타', tired.length ? `<b>${tired.length}개</b> 소재가 피로 3조건 충족 → 리프레시 제안` : '피로 소재 없음', '',
    tired.length ? `<ul class="proposals">${tired.map((c) => `<li><span class="dir fresh">리프레시</span><div><div class="act">${esc(c.name)} · ${esc(c.channel.name)}</div><div class="why">빈도↑ · CTR↓ · CPC↑ 동시 충족, ROAS ${Math.round(c.roas * 100)}% → 연출 다른 2편으로 교체 (활성 소재 수 유지)</div></div></li>`).join('')}</ul>` : '<div class="d">활성 소재 전부 정상 범위입니다.</div>');
  return ins + `<div class="grid">${rank}${map}${fat}</div>`;
};

const RENDER = { home: (ind, st) => window.MARTISAN_HOME.pageHome(ind, st, APPROVALS), overview: pageOverview, channels: pageChannels, roas: pageRoas, creatives: pageCreatives };

/* ---------- 조립 ---------- */
const renderNav = (st) => {
  const ind = DATA[st.industry];
  document.getElementById('nav').innerHTML = PAGES.map((p) => {
    const subs = [...((ind.live && p.liveSecs) || p.secs).map(([id, nm]) => `<li><button type="button" data-page="${p.id}" data-sec="sec-${id}">${esc(nm)}</button></li>`),
      ...(p.channelSecs ? ind.channels.map((c) => `<li><button type="button" data-page="${p.id}" data-sec="ch-${c.id}" data-ch="${c.id}"><span class="sw" style="background:${c.color}"></span>${esc(c.name)}</button></li>`) : [])];
    return `<details ${st.page === p.id ? 'open class="cur"' : ''} data-page="${p.id}"><summary><span>${esc(p.name)}</span></summary><ul>${subs.join('')}</ul></details>`;
  }).join('');
  document.getElementById('side-foot').innerHTML = `${esc(ind.brand)} · ${esc(ind.type)}<br>기준일 ${END_DATE.getFullYear()}.${END_DATE.getMonth() + 1}.${END_DATE.getDate()} · 매출·전환은 구매완료 기준<br>마진율 ${ind.margin}% → 손익분기 ROAS ${ind.bep}% · 목표 ${ind.target}%`;
  document.querySelectorAll('#seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ind === st.industry)));
  document.getElementById('seg').hidden = !!ind.live;
  document.querySelector('.badge-sample').textContent = ind.live ? '실데이터' : '샘플 데이터';
};

const renderMain = (st) => {
  const ind = DATA[st.industry], page = PAGES.find((p) => p.id === st.page);
  const periods = ['channels', 'roas'].includes(st.page)
    ? `<div class="chips" role="group" aria-label="기간">${[1, 7, 30].map((n) => `<button type="button" data-period="${n}" aria-pressed="${st.period === n}">${PERIOD_LABEL[n]}</button>`).join('')}</div>` : '';
  document.getElementById('main').innerHTML = `<div class="topbar"><div><h2>${esc(page.name)}</h2><div class="sub">${esc(ind.brand)} · ${esc(ind.type)}${ind.live ? '' : ' · 샘플 데이터'}</div></div>${periods}</div>${RENDER[st.page](ind, st)}`;
};

const LIVE = !!window.MARTISAN_DATA.LIVE;
let state = { industry: LIVE ? 'live' : 'commerce', page: 'home', period: 7, openCh: null, approved: false, showAll: false, approveError: '', axis: 'motif' };
const approve = () => {
  const run = window.google && window.google.script && window.google.script.run;
  if (!LIVE || !run) return setState({ approved: true });
  const btn = document.getElementById('approve');
  if (btn) { btn.disabled = true; btn.textContent = '실행 요청 중…'; }
  return run.withSuccessHandler(() => setState({ approved: true, approveError: '' }))
    .withFailureHandler((e) => setState({ approveError: `실행 요청 실패: ${e && e.message ? e.message : e}` })).approveBids();
};
const setState = (patch, after) => {
  state = { ...state, ...patch };
  renderNav(state); renderMain(state);
  if (after) after();
};
const scrollToSec = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

document.getElementById('seg').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-ind]');
  if (b) setState({ industry: b.dataset.ind, openCh: null, approved: false });
});
document.getElementById('nav').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-page]');
  if (b) { ev.preventDefault(); setState({ page: b.dataset.page, openCh: b.dataset.ch || state.openCh }, () => scrollToSec(b.dataset.sec)); return; }
  const s = ev.target.closest('summary');
  if (s) { const d = s.parentElement; if (!d.open) { ev.preventDefault(); setState({ page: d.dataset.page }, () => window.scrollTo({ top: 0 })); } }
});
document.getElementById('main').addEventListener('click', (ev) => {
  const p = ev.target.closest('button[data-period]');
  if (p) return setState({ period: Number(p.dataset.period) });
  const c = ev.target.closest('.chcard');
  if (c) return setState({ openCh: state.openCh === c.dataset.ch ? null : c.dataset.ch }, () => { if (state.openCh) scrollToSec('sec-drill'); });
  const ax = ev.target.closest('button[data-axis]');
  if (ax) return setState({ axis: ax.dataset.axis });
  if (ev.target.closest('#show-all')) return setState({ showAll: !state.showAll });
  if (ev.target.closest('#approve')) return approve();
  if (ev.target.closest('#undo')) return setState({ approved: false });
  return undefined;
});

/* 공용 툴팁 */
const tip = document.getElementById('tip');
document.addEventListener('mousemove', (ev) => {
  const t = ev.target.closest('[data-tip]');
  if (!t || !t.dataset.tip) { tip.hidden = true; return; }
  tip.textContent = t.dataset.tip; tip.hidden = false;
  const x = Math.min(ev.clientX, window.innerWidth - 340), y = Math.min(ev.clientY, window.innerHeight - 70);
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
});

renderNav(state); renderMain(state);
