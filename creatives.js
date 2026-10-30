'use strict';
(() => {
/* 소재 성과 — 소재 랭킹 · 소재 요소 분석 · 소재 기획 제안. 집계·제안은 range.js(creative_stats.py 와 같은 규칙)가 고른 기간으로 다시 계산. */
const U = window.UI, R = window.RANGE;
const { esc, wonS, cnt, icon, card, rangeChip } = U;

const SORTS = { rev: ['매출순', (a, b) => b.rev - a.rev], roas: ['ROAS순', (a, b) => (b.cost ? b.roas : -1) - (a.cost ? a.roas : -1) || b.rev - a.rev], conv: ['구매순', (a, b) => b.conv - a.conv || b.rev - a.rev] };
/* 매체 선택 — 쇼핑검색(소재)·애드부스트(상품). 상단 세그먼트로 고르고, 세 카드가 그 매체 묶음으로 계산된다 */
const chanOf = (cx) => { const { ind, st } = cx, by = U.creativeSets(ind), list = ind.channels.filter((c) => by[c.id]); return list.find((c) => c.id === st.adChannel) || list[0] || null; };
const indC = (cx) => { const ch = chanOf(cx); return ch ? { ...cx.ind, creatives: U.creativeSets(cx.ind)[ch.id] } : cx.ind; };
const NOUN = (cx) => { const ch = chanOf(cx); return (ch && ch.noun) || '소재'; };
const chanSeg = (cx) => {
  const { ind } = cx, by = U.creativeSets(ind), list = ind.channels.filter((c) => by[c.id]), cur = chanOf(cx);
  if (list.length < 2) return '';
  const dot = (c) => `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c.color};margin-right:6px"></span>`;
  const set = cur ? by[cur.id] : null;
  const note = set && set.note ? set.note : cur && cur.source === 'csv' ? `상품 단위 보고서(CSV)라 상품별로 봅니다 · 쇼핑검색에 같은 상품이 있으면 이미지·AI 라벨을 같이 씁니다${set ? ` · 매칭 ${set.matched || 0}/${set.ads.length}개` : ''}` : '소재별 클릭·광고비·구매완료 (네이버 검색광고 API)';
  return `<div class="datebar"><span class="mu">매체</span><div class="seg" role="group" aria-label="매체">${list.map((c) => `<button type="button" data-adch="${esc(c.id)}" aria-pressed="${!!cur && cur.id === c.id}">${dot(c)}${esc(c.name)}</button>`).join('')}</div><span class="cmp">${esc(note)}</span></div>`;
};

const AXIS_TABS = ['background', 'shot', 'tone', 'composition', 'motif', 'message', 'category', 'target', 'material', 'price_band'];

const basisNote = (an) => {
  const b = an.basis;
  if (b.none) return '';
  if (b.fixed) return '<div class="note">소재별 일별 클릭·광고비 수집 전이라 최근 28일 합계로 보여줍니다 (매일 09:35 수집 시작 후 기간 선택 가능).</div>';
  if (b.empty) return `<div class="empty">소재 데이터는 ${R.fmtRange(b.coverage)}만 있습니다. 기간을 그 안으로 골라 주세요.</div>`;
  const miss = b.missing && b.missing.length ? ` 소재 데이터 수집 실패 ${b.missing.length}일(${b.missing.slice(0, 3).map(R.md).join(', ')}${b.missing.length > 3 ? ' …' : ''})은 빠져 있습니다.` : '';
  if (b.partial) return `<div class="note">소재 데이터가 있는 ${R.fmtRange(b.eff)} 범위로 계산했습니다.${miss}</div>`;
  return miss ? `<div class="note">${miss.trim()}</div>` : '';
};

const rankCard = (cx) => {
  const { st } = cx, ind = indC(cx), r = cx.rng('rank'), an = R.creativeAnalysis(ind, r), noun = NOUN(cx);
  const sort = SORTS[st.adSort] ? st.adSort : 'rev';
  const rows = an.rows.slice().sort(SORTS[sort][1]);
  const seg = `<div class="seg" role="group" aria-label="정렬">${Object.entries(SORTS).map(([k, [lb]]) => `<button type="button" data-sort="${k}" aria-pressed="${k === sort}">${lb}</button>`).join('')}</div>`;
  if (!rows.length) return card({ id: 'rank', title: `${noun} 랭킹`, tools: rangeChip('rank', r, st), body: `${basisNote(an)}<div class="empty">이 기간에 광고비나 매출이 잡힌 ${noun}이 없습니다.</div>` });
  const top = rows.slice(0, 3).map((a, i) => `<div class="top">${U.thumb(a, 170, i + 1)}<div class="nm" style="font-weight:500">${esc(a.name)}</div>
    <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span class="big num" style="font-size:24px">${wonS(a.rev)}</span><span class="badge tone-${a.cost ? U.roasState(a.roas, ind) : 'mute'}">ROAS ${a.cost ? `${cnt(a.roas)}%` : '—'}</span></div>
    <div class="sm num">${esc(ind.convLabel)} ${cnt(a.conv)} · ${esc(ind.convLabel)}당 ${a.conv ? `${cnt(a.cost / a.conv)}원` : '—'} · 클릭 ${cnt(a.clicks)} · 광고비 ${wonS(a.cost)}</div>${U.judgeBadge(a.judge)}${U.labelChips(a.labels, 4)}</div>`).join('');
  const restAll = rows.slice(3), rest = st.adAll ? restAll : restAll.slice(0, 6);
  const gallery = rest.length ? `<div class="gallery">${rest.map((a, i) => `<div class="mini" data-tip="${esc(a.name)} · 광고비 ${wonS(a.cost)} · 클릭 ${cnt(a.clicks)}">${U.thumb(a, 90)}<span class="nm" style="font-weight:500">${i + 4} · ${esc(a.name)}</span><span class="sm num">${wonS(a.rev)} · ROAS ${a.cost ? `${cnt(a.roas)}%` : '—'}</span>${U.judgeBadge(a.judge)}</div>`).join('')}</div>` : '';
  const more = restAll.length > 6 ? `<button type="button" class="link" data-toggle="adAll">${st.adAll ? '접기' : `전체 ${rows.length}개 보기`}</button>` : '';
  return card({ id: 'rank', title: `${noun} 랭킹`, sub: `${R.fmtRange(r)} · 광고비·매출이 잡힌 ${noun} ${rows.length}개`, tools: `${seg}${rangeChip('rank', r, st)}`,
    body: `${basisNote(an)}<div class="tops">${top}</div>${gallery}${more}` });
};

const axesCards = (cx) => {
  const { st } = cx, ind = indC(cx), r = cx.rng('axes'), an = R.creativeAnalysis(ind, r), noun = NOUN(cx);
  if (!an.axes) {
    return card({ id: 'axes', title: '소재 요소 분석', tools: rangeChip('axes', r, st), body: '<div class="empty">소재 AI 라벨(배경·연출·색감·모티브…)이 연결되면 요소별 ROAS를 보여줍니다.</div>' });
  }
  const tabs = AXIS_TABS.filter((ax) => an.axes[ax] && an.axes[ax].values.some((v) => !R.GENERIC.has(v.value)));
  const axis = tabs.includes(st.axis) ? st.axis : tabs[0];
  const vals = (an.axes[axis] ? an.axes[axis].values : []).filter((v) => !R.GENERIC.has(v.value) || v.rev > 0).slice(0, 8);
  const mx = Math.max(...vals.map((v) => v.roas), 1);
  const seg = `<div class="seg" role="group" aria-label="요소" style="align-self:flex-start">${tabs.map((ax) => `<button type="button" data-axis="${ax}" aria-pressed="${ax === axis}">${R.AXES[ax]}</button>`).join('')}</div>`;
  const bars = U.hbars(vals.map((v) => ({ label: v.value, n: v.n, w: (v.roas / mx) * 100,
    cls: v.hold ? 'mute' : v.mult >= R.GUARD.GOOD_MULT ? 'good' : v.mult <= 0.7 ? 'crit' : 'info',
    text: v.hold ? '보류' : `${v.mult}배`, tip: `${v.value} · 소재 ${v.n}개 · ROAS ${cnt(v.roas)}% · 광고비 ${wonS(v.cost)} · 매출 ${wonS(v.rev)} · 클릭 ${cnt(v.clk)}` })));
  const strong = an.sugg.strong;
  const weak = Object.entries(an.axes).flatMap(([ax, a]) => a.values.filter((v) => !v.hold && v.mult != null && v.mult <= 0.7 && !R.GENERIC.has(v.value)).map((v) => ({ ...v, axis: R.AXES[ax] }))).sort((a, b) => a.mult - b.mult)[0];
  const side = strong.length ? `<div style="font-size:12px;opacity:.85">이 기간 기여도 1위 요소</div><div style="font-size:26px;font-weight:700">${esc(strong[0].value)}</div>
    <div style="font-size:15px">${esc(strong[0].axis)} · 평균 ROAS의 <b>${strong[0].mult}배</b></div>
    <div style="font-size:13px;opacity:.85">${strong[1] ? `2위 · ${esc(strong[1].axis)} ${esc(strong[1].value)} ${strong[1].mult}배` : ''}${weak ? `<br>가장 약한 요소 · ${esc(weak.axis)} ${esc(weak.value)} ${weak.mult}배` : ''}</div>`
    : '<div style="font-size:15px">평균 대비 1.3배 이상으로 두드러지는 요소가 아직 없습니다.</div>';
  return card({ id: 'axes', span: 8, title: '소재 요소 분석', sub: '평균 ROAS 대비 배수', tools: rangeChip('axes', r, st),
    body: `${basisNote(an)}${seg}${bars}<div class="note">초록 = 평균의 ${R.GUARD.GOOD_MULT}배 이상 · 빨강 = 0.7배 이하 · 회색 = 표본 부족(${noun} ${R.GUARD.MIN_ADS}개·클릭 ${R.GUARD.MIN_CLK} 미만, 판단 보류) · 괄호 = ${noun} 수</div>` })
    + `<section class="card s4 inv">${side}<div class="sm" style="margin-top:auto">${noun} ${an.total.ads}개 · 광고비 ${wonS(an.total.cost)} · 평균 ROAS ${cnt(an.avg)}% · 이미지 라벨 ${ind.creatives ? ind.creatives.labeled_images : 0}개</div></section>`;
};

const suggCard = (cx) => {
  const { st } = cx, ind = indC(cx), r = cx.rng('map'), an = R.creativeAnalysis(ind, r);
  if (!an.sugg) return card({ id: 'map', title: '소재 기획 제안', tools: rangeChip('map', r, st), body: '<div class="empty">소재 AI 라벨이 연결되면 확장·테스트·OFF 후보를 제안합니다.</div>' });
  const col = (ic, tone, title, hint, items) => `<div><div style="display:flex;align-items:center;gap:10px"><span class="ico tone-${tone}">${icon(ic, 18)}</span><div><b>${title} ${items.length}개</b><div class="sm">${hint}</div></div></div>
    ${items.length ? `<ul>${items.map((t) => `<li>${esc(t.text)}</li>`).join('')}</ul>` : '<div class="sm">해당 없음</div>'}</div>`;
  const s = an.sugg;
  const subMap = an.noun === '상품' ? '제안만, 실행은 안 함 · 상품 등록·제외는 광고센터에서 직접' : an.lever === 'budget' ? '제안만, 실행은 안 함 · 제작 브리프는 클로드 세션에서, OFF는 광고관리자에서 직접' : '제안만, 실행은 안 함 · 제작 브리프는 클로드 세션에서, OFF는 최적화 제안 승인 흐름으로';
  return card({ id: 'map', title: `${NOUN(cx)} 기획 제안`, sub: subMap, tools: rangeChip('map', r, st),
    body: `<div class="sugg">${col('plus', 'good', '확장', `성과가 좋은데 ${NOUN(cx)}가 적은 조합`, s.expand)}${col('bulb', 'info', '테스트', '강한 요소끼리 아직 안 합쳐본 조합', s.test)}${col('trash', 'crit', an.noun === '상품' ? '제외 후보' : 'OFF 후보', '클릭은 받는데 구매 0', s.off)}</div>` });
};

const pageCreatives = (cx) => `${U.dateBar(cx.st, ['d7', 'd28', 'month', 'lastMonth'])}${chanSeg(cx)}<div class="grid">${rankCard(cx)}${axesCards(cx)}${suggCard(cx)}</div>`;

window.PAGE_CREATIVES = { pageCreatives };
})();
