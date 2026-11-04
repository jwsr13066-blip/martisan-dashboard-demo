'use strict';
(() => {
/* 월간 리뷰 — 매월 1일 배달부가 만든 지난달 리뷰(숫자는 코드, 글은 AI 초안)를 보여준다.
   리뷰 묶음: window.MARTISAN_REVIEWS (시트 스크립트가 주입 — 고객에겐 확정본만, 소유자에겐 초안 포함) · 샘플은 data.js 의 REVIEWS.
   소유자(MARTISAN_ROLE=owner)만: 문장 수정 · 제안 빼기 · 확정(두 번 누르기) · 계획 승인(두 번 누르기) · 초안 다시 만들기. */
const U = window.UI;
const { esc, cnt, icon } = U;
const pctS = (v) => (v == null ? '—' : `${cnt(v)}%`);
const man = (n) => (Math.abs(n || 0) >= 10000 ? `${((n || 0) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만` : cnt(n));
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const chg = (a, b) => (a != null && b ? Math.round((a / b - 1) * 1000) / 10 : null);
const arrow = (v, goodUp = true, unit = '%') => (v == null ? '<span class="fl">—</span>' : `<span class="${v === 0 ? 'fl' : (v > 0) === goodUp ? 'up' : 'dn'}">${v > 0 ? '▲' : '▼'} ${Math.abs(v)}${unit}</span>`);
const ROUTE_OWNER = { bid: '주간 입찰 제안에 반영', rule: '자동 규칙 설정', manual: '광고센터에서 직접 (API 미제공)', data: '자료 반영', watch: '자동 측정' };
/* 고객(보기 전용) 화면에는 내부 운영 용어(결재함·API) 대신 고객이 이해하는 말로 */
const ROUTE_VIEW = { bid: '입찰 조정으로 적용', rule: '자동 규칙으로 적용', manual: '광고센터에서 적용', data: '데이터 반영', watch: '성과 측정' };
const routeOf = (r) => ((owner() ? ROUTE_OWNER : ROUTE_VIEW)[r] || r);

const list = () => {
  const all = (window.MARTISAN_REVIEWS || (window.MARTISAN_DATA && window.MARTISAN_DATA.REVIEWS) || []).slice().sort((a, b) => (a.month < b.month ? 1 : -1));
  return owner() ? all : all.filter((r) => r.status === 'confirmed');
};
const owner = () => (window.MARTISAN_DATA && window.MARTISAN_DATA.LIVE ? window.MARTISAN_ROLE === 'owner' : true);
const current = (st) => { const L = list(); return L.find((r) => r.month === st.reviewMonth) || L[0] || null; };
const editing = (st, rv) => owner() && rv.status === 'draft';
const text = (st, rv, slot) => (st.reviewEdits[slot] != null ? st.reviewEdits[slot] : (rv.texts || {})[slot] || '');

/* ---------- 글 칸 (소유자 초안: 수정 가능) ---------- */
const aiText = (st, rv, slots) => {
  const body = slots.map((s) => text(st, rv, s)).filter(Boolean);
  if (!body.length && !editing(st, rv)) return '';
  const tag = rv.writer && rv.writer !== 'template' ? 'AI 초안' : '자동 문장';
  if (editing(st, rv) && st.reviewEdit === slots.join(',')) {
    return `<div class="ai-text"><div class="ai-h"><span class="pill ai">${tag}</span><span class="sm">고친 문장은 확정할 때 함께 저장됩니다</span></div>
      ${slots.map((s) => `<textarea class="inp rv-ta" data-rv-text="${s}" rows="3" aria-label="문장 수정">${esc(text(st, rv, s))}</textarea>`).join('')}
      <div><button type="button" class="chip" data-rv-edit="">수정 닫기</button></div></div>`;
  }
  const edited = slots.some((s) => st.reviewEdits[s] != null || (rv.edited || []).includes(s));
  return `<div class="ai-text"><div class="ai-h"><span class="pill ${edited ? '' : 'ai'}">${edited ? '수정됨' : tag}</span>${editing(st, rv) ? `<button type="button" class="chip" data-rv-edit="${slots.join(',')}">문장 수정</button>` : ''}</div>
    ${body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
};
const lead = (st, rv, slot, subSlot) => {
  const l = text(st, rv, slot), s = text(st, rv, subSlot);
  const ed = editing(st, rv) ? ` <button type="button" class="chip" data-rv-edit="${slot},${subSlot}">수정</button>` : '';
  if (editing(st, rv) && st.reviewEdit === `${slot},${subSlot}`) return aiText(st, rv, [slot, subSlot]);
  return `${l ? `<p class="lead">${esc(l)}${ed}</p>` : ''}${s ? `<p class="sub"><b>아쉬운 점</b>${esc(s)}</p>` : ''}`;
};

/* ---------- 조각 ---------- */
const met = (label, value, foot) => `<div class="met"><span class="l">${esc(label)}</span><span class="v num">${value}</span><span class="sm">${foot}</span></div>`;
const weekSvg = (weeks, bep) => {
  const vals = weeks.map((w) => w.roas || 0), top = Math.max(bep, ...vals) * 1.15, h = 110, y0 = 120, x = (i) => 30 + i * 55;
  const y = (v) => y0 - (v / top) * h;
  return `<svg viewBox="0 0 300 150" role="img" aria-label="주차별 ROAS ${weeks.map((w) => `${w.label} ${pctS(w.roas)}`).join(', ')}">
    <line x1="20" y1="${y0}" x2="290" y2="${y0}" stroke="var(--line)"/><line x1="20" y1="${y(bep)}" x2="290" y2="${y(bep)}" stroke="var(--mute)" stroke-dasharray="4 4"/>
    ${weeks.map((w, i) => `<rect x="${x(i)}" y="${y(w.roas || 0)}" width="36" height="${Math.max(1, y0 - y(w.roas || 0))}" rx="5" fill="${(w.roas || 0) >= bep ? 'var(--acc)' : 'var(--warn)'}"/>
      <text x="${x(i) + 18}" y="${y(w.roas || 0) - 6}" font-size="11" font-weight="700" text-anchor="middle" fill="var(--text)" stroke="var(--card)" stroke-width="3" paint-order="stroke">${pctS(w.roas)}</text>
      <text x="${x(i) + 18}" y="136" font-size="10" text-anchor="middle" fill="var(--mute)">${esc(w.label)}</text>`).join('')}</svg>`;
};
const table = (head, rows) => `<div class="rv-tbl"><table><thead><tr>${head.map((h, i) => `<th${i ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const kpiRow = (b) => {
  const k = b.kpi, p = b.prev, part = b.prev_partial ? `전월 ${p.days}일치` : null;
  return `<div class="mets">${met('매출', `${man(k.rev)}원`, part || arrow(chg(k.rev, p.rev)))}${met('광고비', `${man(k.cost)}원`, part || arrow(chg(k.cost, p.cost), false))}
    ${met('ROAS', pctS(k.roas), p.roas != null ? `전월 ${pctS(p.roas)}` : '—')}${met('구매', `${cnt(k.conv)}건`, part || arrow(chg(k.conv, p.conv)))}</div>`;
};
const decomp = (b) => {
  const k = b.kpi, p = b.prev;
  const box = (v, l, d, goodUp = true) => `<span class="box"><b class="num">${v}</b><span class="sm">${l} ${arrow(d, goodUp)}</span></span>`;
  return `<div class="decomp"><span>광고비</span>${box(`${cnt(k.cpc)}원`, 'CPC', chg(k.cpc, p.cpc), false)}<span class="op">×</span>${box(cnt(k.clk), '클릭', chg(k.clk, p.clk))}
    <span class="op">→ 매출</span>${box(`${k.cvr}%`, '전환율', k.cvr != null && p.cvr != null ? Math.round((k.cvr - p.cvr) * 100) / 100 : null)}<span class="op">×</span>${box(`${cnt(k.aov)}원`, '객단가', chg(k.aov, p.aov))}</div>`;
};
const groupBars = (b, bep) => {
  const g = b.groups || [];
  if (!g.length) return '';
  const max = g[0][1] || 1;
  return `<div class="sm">그룹별 ROAS · 막대 길이 = 광고비, 색 = 손익분기 ${bep}% 기준</div><div class="hbars">${g.map(([n, c, r, pr]) =>
    `<span>${esc(n)}</span><div class="hbar ${r != null && r < bep ? 'crit' : ''}" style="width:${Math.max(2, (c / max) * 100)}%"></div><b class="num">${pctS(r)}${pr != null ? ` <span class="sm">${r >= pr ? '▲' : '▼'}</span>` : ''}</b>`).join('')}</div>`;
};

/* ---------- 매체 블록 ---------- */
const idle = (b) => `<div class="card s12 dash"><div class="card-h"><h3>${esc(b.name)}</h3><span class="badge tone-mute">${b.state === 'none' ? '이번 달 집행 없음' : '데이터 미반영'}</span></div>
  <div class="sm">${b.state === 'none' ? '광고비가 0원이라 성과를 평가하지 않습니다.' : '이 달의 수집된 데이터가 없습니다.'}</div></div>`;

const saBlock = (st, rv, b, main) => {
  const c = rv.client, a = b.ads || {}, auto = [b.bids && b.bids.length ? `입찰 조정 ${b.bids.length}회 ${b.bids.reduce((s, x) => s + (x[1] || 0), 0)}건(${b.bids.map((x) => md(x[0])).join('·')}, 승인 후 적용)` : '', b.weights ? `시간대 입찰 가중치 ${b.weights}회(자정 원복)` : ''].filter(Boolean).join(' · ');
  return `<section class="card s12"><div class="card-h"><h3>① 성과 브리핑 <small>${esc(b.name)}</small></h3>${U.roasBadge(b.kpi.roas || 0, c)}</div>
    ${main ? lead(st, rv, 'sa_lead', 'sa_sub') : ''}${kpiRow(b)}${b.kpi.clk ? decomp(b) : ''}
    <div class="grid"><div class="s7" style="display:flex;flex-direction:column;gap:10px;min-width:0">${groupBars(b, c.bep)}</div>
      <div class="s5" style="min-width:0"><div class="sm">주차별 ROAS · 점선 = 손익분기 ${c.bep}%</div>${weekSvg(b.weeks || [], c.bep)}</div></div>
    ${main ? aiText(st, rv, ['sa_body1', 'sa_body2']) : ''}
    ${a.top ? `<div class="grid"><div class="s6" style="min-width:0">${table(['상위 소재 <span class="sm">구매 있음·광고비 5천 원 이상</span>', '광고비', '구매', 'ROAS'], a.top.map((t) => [esc(t[0]), cnt(t[1]), cnt(t[2]), `<span class="up">${pctS(t[3])}</span>`]))}</div>
      <div class="s6" style="min-width:0">${table(['구매 없는 소재 <span class="sm">광고비 1만 원 이상</span>', '광고비', '클릭'], (a.bottom || []).map((t) => [esc(t[0]), cnt(t[1]), cnt(t[2])]))}</div></div>` : ''}
    <div class="sm">${a.zero ? `광고비가 쓰였지만 구매가 없는 소재 ${cnt(a.zero.n)}개 · ${man(a.zero.cost)}원 = 광고비의 ${Math.round(a.zero.share * 100)}%` : ''}${auto ? `<br><b>자동화 이력</b> · ${esc(auto)}` : ''}</div></section>`;
};

const negCard = (st, rv, b) => {
  const n = b.neg;
  if (!n) return '';
  if (!n.available) return `<section class="card s12 dash"><div class="card-h"><h3>제외검색어 점검</h3><span class="badge tone-mute">검색어 보고서 없음</span></div><div class="sm">이 달 검색어 보고서를 받지 못했습니다. 다음 실행에서 다시 받습니다.</div></section>`;
  const ex = n.exclude || [], over = n.over || [], tz = n.top_zero || [];
  const badge = ex.length ? `<span class="badge tone-warn">제외 추천 ${ex.length}개</span>` : '<span class="badge tone-good">이번 달 해당 없음</span>';
  return `<section class="card s12"><div class="card-h"><h3>제외검색어 점검 <small>기준: 광고비의 ${Math.round(n.share * 100)}% 이상 쓰고 구매 0건</small></h3>${badge}</div>
    <div class="mets">${met('제외 기준선', `${cnt(n.line)}원`, `${esc(b.name)} 광고비 × ${Math.round(n.share * 100)}%`)}${met('기준 넘은 검색어', `${ex.length + over.length}개`, over.length ? `${esc(over.map((o) => o.keyword).join(', '))} · 구매 있어 제외 아님` : '—')}
      ${met('구매 0건 중 최대', tz[0] ? `${(tz[0].share * 100).toFixed(1)}%` : '—', tz[0] ? `${esc(tz[0].keyword)} ${cnt(tz[0].cost)}원` : '')}${met('이 달 검색어 수', `${cnt(n.count)}개`, `보고서 범위 = 광고비의 ${Math.round((n.coverage || 0) * 100)}%`)}</div>
    <div class="grid"><div class="s7" style="min-width:0">${table([ex.length ? '제외 추천' : '구매 0건 검색어 · 비용 큰 순', '클릭', '비용', '광고비 비중'], (ex.length ? ex : tz).map((t) => [esc(t.keyword), cnt(t.clk), cnt(t.cost), `${(t.share * 100).toFixed(1)}%`]))}</div>
      <div class="s5" style="display:flex;flex-direction:column;gap:8px;min-width:0">${over.slice(0, 2).map((o) => met(`${o.keyword} · 광고비의 ${(o.share * 100).toFixed(1)}%`, `ROAS ${pctS(o.roas)}`, `비용 ${cnt(o.cost)}원 · 클릭 ${cnt(o.clk)} · 구매 ${o.p}건(${cnt(o.pamt)}원)`)).join('')}</div></div>
    ${aiText(st, rv, ['neg_body'])}<div class="sm">검색어 보고서는 검색 유입분만 담습니다. 기준에 걸리면 그 검색어가 쓰인 그룹에 제외 등록을 결재함으로 올립니다.</div></section>`;
};

const daBlock = (st, rv, b, main) => {
  const c = rv.client, it = b.items || {}, lv = b.level;
  const lvTbl = lv ? table(['', '하루 광고비', '구매', 'ROAS'], [
    [`변경 전 · ${md(lv.before.from)}~${md(lv.before.to)} (${lv.before.days}일)`, `${cnt(lv.before.daily_cost)}원`, `${cnt(lv.before.conv)}건`, pctS(lv.before.roas)],
    [`변경 후 · ${md(lv.after.from)}~${md(lv.after.to)} (${lv.after.days}일)`, `${cnt(lv.after.daily_cost)}원 <span class="${lv.up ? 'dn' : 'up'}">${arrow(chg(lv.after.daily_cost, lv.before.daily_cost), false)}</span>`, `${cnt(lv.after.conv)}건`, pctS(lv.after.roas)]]) : '';
  const z = it.zero || {};
  const share = it.items ? `<div class="share" role="img" aria-label="구매 ${b.noun} 광고비 ${100 - Math.round((z.share || 0) * 100)}%"><i style="width:${100 - Math.round((z.share || 0) * 100)}%;background:var(--acc)"></i><i style="width:${Math.round((z.share || 0) * 100)}%;background:var(--crit)"></i></div>
    ${U.legend([['var(--acc)', `구매 ${b.noun} ${it.with_conv}개 · 광고비 ${100 - Math.round((z.share || 0) * 100)}%`], ['var(--crit)', `무전환 ${b.noun} ${it.items - it.with_conv}개 · 광고비 ${Math.round((z.share || 0) * 100)}%`]])}` : '';
  const rows = [...(it.top || []).map((t) => [esc(t[0]), cnt(t[1]), cnt(t[2]), `<span class="up">${pctS(t[3])}</span>`, U.judgeBadge(t[4])]),
    ...(it.delayed || []).map((t) => [esc(t[0]), '0', cnt(t[1]), '—', U.judgeBadge(t[3] || '제외 중 · 지연 구매')]),
    ...(it.excluded_spend || []).map((t) => [esc(t[0]), cnt(t[1]), '0', '<span class="dn">0%</span>', U.judgeBadge(t[3])])];
  return `<section class="card s12"><div class="card-h"><h3>① 성과 브리핑 <small>${esc(b.name)}${b.covered_to ? ` · ${md(b.covered_to)}까지 반영` : ''}</small></h3>${b.prev.roas != null && b.kpi.roas != null ? `<span class="badge tone-${b.kpi.roas >= b.prev.roas ? 'good' : 'mute'}">전월 대비 ROAS ${b.kpi.roas >= b.prev.roas ? '▲' : '▼'}${Math.abs(b.kpi.roas - b.prev.roas)}%p</span>` : ''}</div>
    ${main ? lead(st, rv, 'da_lead', 'da_sub') : ''}${kpiRow(b)}
    <div class="grid">${lv ? `<div class="s6" style="min-width:0"><div class="sm">일 광고비 변화 감지 ${md(lv.date)} 전후 (하루 평균)</div>${lvTbl}</div>` : ''}<div class="s${lv ? 6 : 12}" style="min-width:0"><div class="sm">광고비가 쓰인 ${b.noun} ${cnt(it.items)}개 중 구매가 나온 ${b.noun}</div>${share}</div></div>
    ${main ? aiText(st, rv, ['da_body1', 'da_body2']) : ''}
    ${rows.length ? table([`상위 ${b.noun}`, '광고비', '구매', 'ROAS', '판정'], rows) : ''}</section>`;
};

const planCard = (st, rv, title, items, id) => {
  if (!items.length) return '';
  const rm = new Set([...(rv.removed || []), ...st.reviewRemoved]);
  const can = editing(st, rv);
  const vis = can ? items : items.filter((x) => !rm.has(x.id));
  return `<section class="card s6" id="${id}"><div class="card-h"><h3>${title}</h3><span class="pill ai">자동 제안</span></div><div class="plan">${vis.map((x) => `<div class="pi${rm.has(x.id) ? ' off' : ''}">
    <span class="ico sm tone-${x.approval ? 'warn' : 'info'}">${icon(x.approval ? 'check' : 'bulb', 16)}</span>
    <div class="grow"><span class="t">${esc(x.title)}</span><span class="why">${esc(x.why)}</span><span class="sm">실행: ${esc(routeOf(x.route))}</span></div>
    <div class="side-tags">${x.approval ? `<span class="pill">${owner() ? '결재 필요' : '승인 후 적용'}</span>` : ''}${can ? `<button type="button" class="chip" data-rv-remove="${x.id}">${rm.has(x.id) ? '되살리기' : '제안 빼기'}</button>` : ''}</div></div>`).join('')}</div></section>`;
};

const part = (st, rv, p) => {
  const LABEL = { SA: ['검색광고 · SA', '키워드를 찾는 손님', 't-sa'], DA: ['디스플레이 · DA', '피드에서 만나는 손님', 't-da'] }[p.type];
  const act = p.blocks.filter((b) => b.state === 'ok');
  const main = act.slice().sort((a, b) => b.kpi.cost - a.kpi.cost)[0];
  const pills = [...p.blocks.map((b) => `<span class="pill">${esc(b.name)}${b.state === 'none' ? ' (집행 없음)' : b.state === 'pending' ? ' (미반영)' : ''}</span>`), ...(p.upcoming || []).map((n) => `<span class="pill">${esc(n)} (연결 전)</span>`)].join('');
  const blocks = p.blocks.map((b) => (b.state !== 'ok' ? idle(b) : p.type === 'SA' ? saBlock(st, rv, b, b === main) + negCard(st, rv, b) : daBlock(st, rv, b, b === main))).join('');
  if (!p.blocks.length) return '';
  return `<div class="part" id="sec-rv-${p.type}"><span class="tag ${LABEL[2]}">${LABEL[0]}</span><h2>${LABEL[1]}</h2><div class="rv-ch">${pills}</div></div>
    <div class="grid">${blocks}${planCard(st, rv, '② 보완·효율화 계획', rv.plan[p.type] || [], `rv-plan-${p.type}`)}${planCard(st, rv, '③ 광고 아이디어 제안', rv.ideas[p.type] || [], `rv-idea-${p.type}`)}</div>`;
};

const mixCard = (st, rv) => {
  const m = rv.mix || [];
  if (!m.length) return '';
  const C = ['var(--c2)', 'var(--c3)', 'var(--c1)', 'var(--c4)', 'var(--c5)'];
  const bar = (i) => `<div class="share">${m.map((r, j) => `<i style="width:${r[i]}%;background:${C[j % 5]}"></i>`).join('')}</div>`;
  return `<section class="card s7"><div class="card-h"><h3>매체별 광고비 비중 <small>이 달 실제 vs 다음 달 제안</small></h3></div>
    <div class="shr"><span>광고비</span>${bar(1)}<span>매출</span>${bar(2)}<span><b>다음 달 제안</b></span>${bar(3)}</div>${U.legend(m.map((r, j) => [C[j % 5], r[0]]))}${aiText(st, rv, ['mix_body'])}</section>`;
};
const rulesCard = (rv) => {
  const r = rv.rules || [];
  if (!r.length) return '';
  const MODE = { auto: '자동', propose: '제안', alert: '알림' };
  return `<section class="card s5"><div class="card-h"><h3>자동 규칙 점검</h3><span class="badge tone-info">4주 측정</span></div>
    ${table(['규칙', '상태', '이 달 발동'], r.map((x) => [esc(x.name), x.enabled ? MODE[x.mode] || x.mode : '<span class="sm">꺼짐</span>', `${x.fired}일`]))}
    <div class="sm">발동일과 비발동일의 ROAS 비교는 규칙마다 4주치가 쌓이면 표시합니다.</div></section>`;
};

const nextPart = (st, rv) => {
  const n = rv.next, g = n.goals, nm = Number(rv.next_month.slice(5, 7));
  const appr = [...(rv.plan.SA || []), ...(rv.plan.DA || [])].filter((x) => x.approval && !new Set([...(rv.removed || []), ...st.reviewRemoved]).has(x.id));
  const sched = `<div class="weeks">${n.schedule.map((w) => `<div class="wk"><b>${esc(w.label)}</b>${w.events.map((e) => `<span class="ev">${esc(e)}</span>`).join('')}<ul>${w.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>`;
  return `<div class="part" id="sec-rv-next"><span class="tag t-n">${nm}월 제안</span><h2>다음 달 이렇게 운영합니다</h2></div>
    <div class="grid"><section class="card s4"><div class="card-h"><h3>목표</h3></div><div class="mets" style="grid-template-columns:1fr 1fr">${met('ROAS', `${g.roas}%+`, `이 달 ${pctS(rv.header.roas)}`)}${met('매출', g.monthly_goal ? `${man(g.monthly_goal)}원` : `+${g.rev_growth}%`, g.monthly_goal ? '월 매출 목표' : '이 달 대비 · 목표 금액 미설정')}</div></section>
      <section class="card s8"><div class="card-h"><h3>매체별 예산안</h3></div>${table(['매체', '이 달 비중', '제안 비중'], (rv.mix || []).map((r) => [esc(r[0]), `${r[1]}%`, `${r[3]}%`]))}</section>
      <section class="card s12"><div class="card-h"><h3>주차별 실행 일정</h3></div>${sched}</section>
      ${approveCard(st, rv, appr)}</div>`;
};
const approveCard = (st, rv, appr) => {
  if (!appr.length) return '';
  const done = rv.plan_status === 'approved';
  let btn = '';
  if (owner() && rv.status === 'confirmed' && !done) btn = st.reviewBusy === 'plan' ? '<button type="button" class="btn" disabled>요청 중…</button>' : `<button type="button" class="btn ${st.reviewArm === 'plan' ? 'arm' : ''}" data-rv-act="plan">${st.reviewArm === 'plan' ? `정말 진행할까요? ${appr.length}건 · 한 번 더 누르기` : '이 계획으로 진행'}</button>`;
  const nm = Number(rv.next_month.slice(5, 7));
  const head = owner() ? '이 계획으로 진행' : `${nm}월 실행 항목`;
  const sub = !owner() ? `${done ? '승인 완료 · ' : ''}아래 ${appr.length}개 항목은 MARTISAN이 승인 절차를 거쳐 계정에 적용합니다.`
    : `${done ? `승인됨 · ${appr.length}건이 결재함(개요 › 최적화 제안)으로 넘어갔습니다` : `승인하면 실계정 변경이 필요한 ${appr.length}건만 결재함으로 넘어갑니다. 실제 적용은 결재함의 실행 경로대로 진행합니다.`}${rv.status === 'draft' ? ' · 리뷰 확정 후 누를 수 있습니다' : ''}`;
  return `<section class="card s12 approve"><div class="grow"><h3 style="margin:0;font-size:16px">${head}</h3>
    <div class="sm">${sub}</div>
    <ul>${appr.map((x) => `<li>${esc(x.title)} <span class="sm">· ${esc(routeOf(x.route))}</span></li>`).join('')}</ul></div>${btn}${st.reviewMsg.plan ? `<div class="sm">${esc(st.reviewMsg.plan)}</div>` : ''}</section>`;
};

const evidence = (rv) => {
  const blocks = rv.parts.flatMap((p) => p.blocks).filter((b) => b.state === 'ok');
  const wk = blocks.map((b) => `<div><h4>${esc(b.name)} 주차별</h4>${table(['주차', '광고비', '구매', '매출', 'ROAS'], (b.weeks || []).map((w) => [esc(w.label), cnt(w.cost), cnt(w.conv), cnt(w.rev), pctS(w.roas)]))}</div>`).join('');
  const gr = blocks.filter((b) => b.groups).map((b) => `<div><h4>${esc(b.name)} 그룹별 · 전월 → 이 달 ROAS</h4>${table(['그룹', '광고비', '전월', '이 달'], b.groups.map((g) => [esc(g[0]), cnt(g[1]), pctS(g[3]), pctS(g[2])]))}</div>`).join('');
  const bd = blocks.filter((b) => b.bids && b.bids.length).map((b) => `<div><h4>입찰 조정 효과 · 적용 전후 7일</h4>${table(['적용일', '건수', '전', '후'], b.bids.map((x) => [md(x[0]), cnt(x[1]), pctS(x[2]), `${pctS(x[3])}${x[4] != null && x[4] < 7 ? ` <span class="sm">${x[4]}일 측정 중</span>` : ''}`]))}</div>`).join('');
  return `<details class="card s12 rv-ev"><summary>근거 자료 펼치기 · 주차 · 그룹 · 입찰 조정</summary><div class="ev-grid">${wk}${gr}${bd}</div>
    <p class="sm">구매완료 기준(장바구니 제외) · 매체 보고 합계는 매체마다 전환 집계 방식이 달라 단순 합산 값입니다 · 숫자는 코드가 집계하고 문장은 그 숫자로 작성합니다</p></details>`;
};

/* ---------- 머리 ---------- */
const statusBar = (st, rv) => {
  if (!owner()) return '';
  if (rv.status === 'confirmed') return `<div class="status ok" role="status"><div class="steps"><span>초안 생성</span><span>검토</span><span class="on">확정 · 고객 공개</span></div><div class="grow">${md(rv.confirmed_at.slice(0, 10))} 확정 · 고객 화면에 공개 중입니다.${rv.plan_status === 'approved' ? ' 다음 달 계획도 승인됐습니다.' : ''}</div></div>`;
  const nEd = Object.keys(st.reviewEdits).length, nRm = st.reviewRemoved.length;
  const busy = st.reviewBusy;
  const conf = busy === 'confirm' ? '<button type="button" class="btn" disabled>확정 요청 중…</button>' : `<button type="button" class="btn ${st.reviewArm === 'confirm' ? 'arm' : ''}" data-rv-act="confirm">${st.reviewArm === 'confirm' ? '고객에게 공개할까요? 한 번 더 누르기' : '확정하고 고객에게 공개'}</button>`;
  const reb = busy === 'rebuild' ? '<button type="button" class="btn2" disabled>다시 만드는 중…</button>' : `<button type="button" class="btn2 ${st.reviewArm === 'rebuild' ? 'arm2' : ''}" data-rv-act="rebuild">${st.reviewArm === 'rebuild' ? '수정한 문장은 사라집니다 · 한 번 더' : '최신 숫자로 초안 다시 만들기'}</button>`;
  return `<div class="status" role="status"><div class="steps"><span>초안 생성</span><span class="on">검토 중</span><span>확정 · 고객 공개</span></div>
    <div class="grow"><b>검토 중</b> · 사장님만 보이는 상태입니다. 문장을 고치거나 제안을 뺀 뒤 확정하면 고객 화면에 공개됩니다.${nEd || nRm ? ` <b>수정 ${nEd}칸 · 제안 빼기 ${nRm}개</b>` : ''}${st.reviewMsg.confirm ? `<br>${esc(st.reviewMsg.confirm)}` : ''}</div>${reb}${conf}</div>`;
};
const hero = (st, rv) => {
  const h = rv.header;
  return `<section class="card s12 rv-hero"><div class="eyebrow">${Number(rv.month.slice(5, 7))}월 한 줄 결론</div>
    ${editing(st, rv) && st.reviewEdit === 'hero,hero_sub' ? aiText(st, rv, ['hero', 'hero_sub']) : `<h2>${esc(text(st, rv, 'hero'))}${editing(st, rv) ? ' <button type="button" class="chip" data-rv-edit="hero,hero_sub">수정</button>' : ''}</h2>${text(st, rv, 'hero_sub') ? `<p class="sub"><b>아쉬운 점</b>${esc(text(st, rv, 'hero_sub'))}</p>` : ''}`}
    <div class="k3"><div class="k"><span class="l">매출 (${rv.parts.flatMap((p) => p.blocks).length > 1 ? '매체 보고 합계' : '구매완료'})</span><span class="v num">${man(h.rev)}원</span><span class="d">${arrow(h.rev_change)} 전월 대비</span></div>
      <div class="k"><span class="l">광고비</span><span class="v num">${man(h.cost)}원</span><span class="d">${h.cost_change == null ? '—' : `${h.cost_change > 0 ? '▲' : '▼'} ${Math.abs(h.cost_change)}%`} 전월 대비</span></div>
      <div class="k"><span class="l">ROAS · 목표 ${rv.client.target}% · 손익분기 ${rv.client.bep}%</span><span class="v num">${pctS(h.roas)}</span><span class="d">${h.roas >= rv.client.target ? `<span class="up">목표 달성</span>` : ''} · 전월 ${pctS(h.roas_prev)}</span></div></div>
    <div class="note">구매 ${cnt(h.conv)}건 (${h.conv_change == null ? '—' : `${h.conv_change > 0 ? '▲' : '▼'} ${Math.abs(h.conv_change)}%`})${(h.notes || []).length ? ` · ${esc(h.notes.join(' · '))}` : ''}</div></section>`;
};

const pageReview = (cx) => {
  const { st } = cx, L = list(), rv = current(st);
  if (!rv) {
    const live = window.MARTISAN_DATA && window.MARTISAN_DATA.LIVE;
    return `<div class="grid" id="sec-rv-top"><section class="card s12"><div class="empty">${live && !window.MARTISAN_REVIEWS ? '월간 리뷰를 불러오지 못했습니다. 시트 스크립트에 월간 리뷰 코드가 반영됐는지 확인해 주세요.' : '아직 공개된 월간 리뷰가 없습니다. 매월 1일 아침 지난달 리뷰가 만들어집니다.'}</div></section></div>`;
  }
  const sel = `<label class="sm" for="rv-month">리뷰 달</label><select id="rv-month" class="inp" data-review-month="1">${L.map((r) => `<option value="${r.month}"${r.month === rv.month ? ' selected' : ''}>${r.month}${r.status === 'draft' ? ' · 검토 중' : ''}</option>`).join('')}</select>`;
  return `<div class="rv"><div class="rv-tools"><span>${esc(rv.month.slice(0, 4))}년 ${Number(rv.month.slice(5, 7))}월 · 비교 기준 ${Number(rv.prev_month.slice(5, 7))}월 · ${md(rv.generated_at.slice(0, 10))} ${rv.generated_at.slice(11, 16)} 집계</span>
    <span class="rv-sel">${sel}<button type="button" class="btn2" data-print="1">${icon('cal', 14)} 고객용 PDF 저장</button></span></div>
    ${statusBar(st, rv)}<div class="grid" id="sec-rv-top">${hero(st, rv)}</div>
    ${rv.parts.map((p) => part(st, rv, p)).join('')}
    <div class="part" id="sec-rv-mix"><span class="tag t-x">매체 간 효율화</span><h2>어디에 돈을 더 쓸까</h2></div><div class="grid">${mixCard(st, rv)}${rulesCard(rv)}</div>
    ${nextPart(st, rv)}<div class="grid">${evidence(rv)}</div></div>`;
};

window.PAGE_REVIEW = { pageReview, current, owner, list };
})();
