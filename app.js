'use strict';
/* 화면 조립 — 상태(기간·카드별 기간·테마·페이지) + 메뉴 + 이벤트. 페이지 내용은 home.js · pages.js · creatives.js. */
(() => {
const D = window.MARTISAN_DATA, LIVE = !!D.LIVE;
const U = window.UI, R = window.RANGE;
const { esc, icon } = U;

const PAGES = [
  { id: 'home', name: '개요', secs: [['inbox', '최적화 제안'], ['score', '변경 전후 성과'], ['log', '변경 내역'], ['rules', '자동 규칙'], ['why', '성과 진단']] },
  { id: 'overview', name: '매출 현황', secs: [['today', '일간'], ['week', '주간 추이'], ['month', '월간 추이']] },
  { id: 'channels', name: '매체별 성과', secs: [['share', '매체 비교']], channelSecs: true },
  { id: 'roas', name: '매체별 ROAS', secs: [['compare', 'ROAS 비교'], ['trend', 'ROAS 추이'], ['lights', '효율 진단']] },
  { id: 'creatives', name: '소재 성과', secs: [['rank', '소재 랭킹'], ['axes', '소재 요소 분석'], ['map', '소재 기획 제안']] },
];
const RENDER = {
  home: (cx) => window.PAGE_HOME.pageHome(cx), overview: (cx) => window.PAGES_MAIN.pageOverview(cx), channels: (cx) => window.PAGES_MAIN.pageChannels(cx),
  roas: (cx) => window.PAGES_MAIN.pageRoas(cx), creatives: (cx) => window.PAGE_CREATIVES.pageCreatives(cx),
};
const THEME_KEY = 'martisan-theme';
const store = { get: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* 저장 불가 환경: 이번 화면에서만 적용 */ } } };
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

/* ---------- 상태 ---------- */
const initialFor = (key) => {
  const ind = D.DATA[key], bounds = { from: ind.firstDate, to: ind.lastDate };
  const P = R.presets(bounds.to);
  const range = R.spanDays(P.month) >= 3 ? P.month : P.d7;
  return { industry: key, bounds, range: R.clamp(range, bounds), cardRanges: {}, chipOpen: null, approved: false, approveArm: false, approveError: '', histIdx: null };
};
let state = {
  ...initialFor(LIVE ? 'live' : 'commerce'), page: 'home', themeOpen: false, approving: false,
  theme: store.get(THEME_KEY) || (LIVE ? D.DATA.live.theme : 'cream') || 'cream',
  today: LIVE ? kstToday() : D.END_DATE, ruleArm: null, ruleBusy: false, ruleMsg: {}, adChannel: null, inboxAll: false, logAll: false, whyOpen: false, tableOpen: false, adSort: 'rev', adAll: false, axis: 'background', trendUnit: 'week',
};

/* 카드 기본 기간 종류 → 실제 기간 */
const KIND = {
  global: (g) => g,
  day: (g) => ({ from: g.to, to: g.to }),
  month: (g) => ({ from: R.monthStart(g.to), to: R.monthEnd(g.to) }),
  months12: (g) => ({ from: R.addMonths(R.monthStart(g.to), -11), to: g.to }),
  weeks8: (g) => ({ from: R.addDays(g.to, -((R.dow(g.to) + 6) % 7) - 49), to: g.to }),  // 월요일 시작 8주
  weeks4: (g) => ({ from: R.addDays(g.to, -27), to: g.to }),
};
const CARD_KIND = { today: 'day', goal: 'month', mgoal: 'month', month: 'months12', trend: 'weeks8', lights: 'weeks4' };
const rangeFor = (id, kind = CARD_KIND[id] || 'global') => {
  const ov = state.cardRanges[id];
  let r;
  if (!ov) r = KIND[kind](state.range);
  else if (kind === 'month') r = { from: R.monthStart(ov.from), to: R.monthEnd(ov.from) };
  else if (kind === 'day') r = { from: ov.from, to: ov.from };
  else r = ov;
  return R.clamp(r, state.bounds);
};
const SINGLE = { today: true, goal: true, mgoal: true };  // 날짜 하나만 고르는 칩

/* ---------- 메뉴 ---------- */
const renderSide = () => {
  const ind = D.DATA[state.industry];
  const nav = PAGES.map((p) => {
    const on = state.page === p.id;
    const subs = on ? [...p.secs.map(([id, nm]) => `<button type="button" class="ns" data-page="${p.id}" data-sec="sec-${id}">${esc(nm)}</button>`),
      ...(p.channelSecs ? ind.channels.map((c) => `<button type="button" class="ns" data-page="${p.id}" data-sec="sec-ch-${c.id}"><span class="sw" style="background:${c.color}"></span>${esc(c.name)}</button>`) : [])].join('') : '';
    return `<button type="button" class="ni ${on ? 'on' : ''}" data-page="${p.id}" aria-current="${on ? 'page' : 'false'}">${icon(p.id)}${esc(p.name)}<span class="cv">${on ? '▾' : '▸'}</span></button>${subs}`;
  }).join('');
  const seg = LIVE ? '' : `<div class="seg-ind" role="group" aria-label="업종 샘플">${[['commerce', '커머스'], ['local', '로컬 매장'], ['lead', '리드']].map(([k, n]) => `<button type="button" data-ind="${k}" aria-pressed="${state.industry === k}">${n}</button>`).join('')}</div>`;
  document.getElementById('side').innerHTML = `<div class="brand"><span class="logo">M</span><div><b>MARTISAN</b><small>${esc(ind.brand)} · ${LIVE ? '실데이터' : '샘플 데이터'}</small></div></div>
    ${seg}<nav class="nav" aria-label="메뉴">${nav}</nav>
    <div class="side-foot">${esc(ind.brand)} · 매출·전환은 구매완료 기준<br>마진율 ${ind.margin}% → 손익분기 ROAS ${ind.bep}% · 목표 ${ind.target}%</div>`;
};

const themeMenu = () => {
  const cur = U.THEMES.find((t) => t.id === state.theme) || U.THEMES[0];
  const pop = state.themeOpen ? `<div class="pop" role="dialog" aria-label="색상 테마"><div class="sm">색상 테마 · 이 브라우저에 기억</div><div class="theme-list">${U.THEMES.map((t) =>
    `<button type="button" data-set-theme="${t.id}" aria-pressed="${t.id === state.theme}"><span class="swatches">${t.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>${esc(t.name)}</button>`).join('')}</div></div>` : '';
  return `<span class="chip-wrap"><button type="button" class="chip" data-theme-open="1" aria-expanded="${state.themeOpen}">${icon('palette', 14)}테마 · ${esc(cur.name)}</button>${pop}</span>`;
};

const renderMain = () => {
  const ind = D.DATA[state.industry], page = PAGES.find((p) => p.id === state.page);
  const gen = ind.ops && ind.ops.generatedAt ? ` · 갱신 ${R.md(ind.ops.generatedAt.slice(0, 10))} ${ind.ops.generatedAt.slice(11, 16)}` : '';
  const cx = { ind, st: state, rng: rangeFor };
  document.getElementById('main').innerHTML = `<div class="topbar"><div><h1>${esc(page.name)}</h1><div class="meta">${esc(ind.brand)} · 데이터 기준일 ${R.mdw(state.bounds.to)}${gen}${LIVE ? '' : ' · 샘플 데이터'}</div></div>
    <div class="top-tools">${themeMenu()}</div></div>${RENDER[state.page](cx)}`;
};

const render = (after) => {
  document.documentElement.dataset.theme = state.theme;
  renderSide(); renderMain();
  if (after) after();
};
const setState = (patch, after) => { state = { ...state, ...patch }; render(after); };
const scrollTo = (id) => { const el = id && document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

/* ---------- 승인 (실제 적용 — 한 번 더 눌러야 실행) ----------
   더블클릭 한 번으로 두 단계를 통과하지 않도록 무장 후 0.8초 안의 두 번째 누름은 무시.
   요청 중(approving)에는 화면이 다시 그려져도 버튼이 비활성으로 그려지고 approve() 도 바로 돌아간다. */
let disarmTimer = null, armedAt = 0;
const approve = () => {
  if (state.approving || state.approved) return undefined;
  if (!state.approveArm) {
    clearTimeout(disarmTimer);
    armedAt = Date.now();
    disarmTimer = setTimeout(() => { if (state.approveArm && !state.approving) setState({ approveArm: false }); }, 6000);
    return setState({ approveArm: true });
  }
  if (Date.now() - armedAt < 800) return undefined;
  clearTimeout(disarmTimer);
  const run = window.google && window.google.script && window.google.script.run;
  if (!LIVE || !run) return setState({ approved: true, approveArm: false });
  setState({ approving: true, approveArm: false, approveError: '' });
  return run.withSuccessHandler(() => setState({ approved: true, approving: false }))
    .withFailureHandler((e) => setState({ approving: false, approveError: `실행 요청 실패: ${e && e.message ? e.message : e}` })).approveBids(window.MARTISAN_DASH_KEY || '');
};

/* ---------- 자동 규칙 스위치 (설정 파일 변경 요청 — 한 번 더 눌러야 실행) ----------
   첫 누름 = 확인 문구, 8초 안에 한 번 더 = 시트 스크립트 toggleRule → GitHub rules-toggle 워크플로가 규칙 파일을 고치고 다음 평가(13:00)부터 반영. 샘플 화면에선 그 자리에서만 바뀐다. */
let ruleTimer = null;
const flipRule = (id, enabled) => {
  const key = state.industry, ind = D.DATA[key], rs = ind.ops && ind.ops.rules;
  if (!rs) return;
  D.DATA = { ...D.DATA, [key]: { ...ind, ops: { ...ind.ops, rules: { ...rs, rules: rs.rules.map((r) => (r.id === id ? { ...r, enabled } : r)) } } } };
};
const toggleRule = (id, enabled) => {
  if (state.ruleBusy) return undefined;
  const arm = state.ruleArm;
  if (!arm || arm.id !== id) {
    clearTimeout(ruleTimer);
    ruleTimer = setTimeout(() => { if (state.ruleArm && state.ruleArm.id === id && !state.ruleBusy) setState({ ruleArm: null }); }, 8000);
    return setState({ ruleArm: { id, enabled, at: Date.now() } });
  }
  if (Date.now() - arm.at < 800) return undefined;
  clearTimeout(ruleTimer);
  const done = (m) => setState({ ruleBusy: false, ruleArm: null, ruleMsg: { ...state.ruleMsg, [id]: m } });
  const run = window.google && window.google.script && window.google.script.run;
  if (!LIVE || !run) { flipRule(id, enabled); return done(`${enabled ? '켜짐' : '꺼짐'} · 샘플 화면에서만 바뀜`); }
  setState({ ruleBusy: true, ruleArm: null });
  return run.withSuccessHandler(() => { flipRule(id, enabled); done(`${enabled ? '켜기' : '끄기'} 요청 접수 · 설정 반영 후 다음 평가(13:00)부터`); })
    .withFailureHandler((e) => { const m = e && e.message ? e.message : String(e); done(`실행 요청 실패: ${/not found/i.test(m) ? '시트 스크립트에 새 코드(toggleRule) 반영과 새 버전 배포가 필요합니다' : m}`); })
    .toggleRule(window.MARTISAN_DASH_KEY || '', id, enabled);
};

/* ---------- 표 복사 ---------- */
const copyTable = (id) => {
  const t = document.getElementById(id), msg = document.getElementById('copy-msg');
  if (!t) return;
  const tsv = [...t.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()).join('\t')).join('\n');
  const done = (ok) => { if (msg) msg.textContent = ok ? '복사됨' : '복사가 막혀 있어 표를 드래그해 복사해 주세요'; };
  try { navigator.clipboard.writeText(tsv).then(() => done(true), () => done(false)); } catch (e) { done(false); }
};

/* ---------- 이벤트 ---------- */
const onClick = (ev) => {
  const t = ev.target;
  const insidePop = t.closest('.chip-wrap');
  const base = insidePop ? {} : { chipOpen: null, themeOpen: false };
  const q = (sel) => t.closest(sel);
  let b;
  if ((b = q('[data-ind]'))) return setState({ ...initialFor(b.dataset.ind), page: state.page });
  if ((b = q('[data-page]'))) { ev.preventDefault(); const sec = b.dataset.sec; return setState({ ...base, page: b.dataset.page, ...(b.dataset.adch ? { adChannel: b.dataset.adch } : {}) }, () => (sec ? scrollTo(sec) : window.scrollTo({ top: 0 }))); }
  if ((b = q('[data-adch]'))) return setState({ ...base, adChannel: b.dataset.adch });
  if ((b = q('[data-chip]'))) return setState({ chipOpen: state.chipOpen === b.dataset.chip ? null : b.dataset.chip, themeOpen: false });
  if ((b = q('[data-preset]'))) { const p = R.presets(state.bounds.to)[b.dataset.preset]; return setState({ cardRanges: { ...state.cardRanges, [b.dataset.cp]: { from: p.from, to: p.to } }, chipOpen: null }); }
  if ((b = q('[data-creset]'))) { const { [b.dataset.creset]: _, ...rest } = state.cardRanges; return setState({ cardRanges: rest, chipOpen: null }); }
  if (q('[data-cclose]')) return setState({ chipOpen: null });
  if (q('[data-theme-open]')) return setState({ themeOpen: !state.themeOpen, chipOpen: null });
  if ((b = q('[data-set-theme]'))) { store.set(THEME_KEY, b.dataset.setTheme); return setState({ theme: b.dataset.setTheme, themeOpen: false }); }
  if ((b = q('[data-gp]'))) { const p = R.presets(state.bounds.to)[b.dataset.gp]; return setState({ ...base, range: R.clamp({ from: p.from, to: p.to }, state.bounds), cardRanges: {} }); }
  if (q('[data-approve]')) return ev.detail > 1 ? undefined : approve();
  if ((b = q('[data-rule-toggle]'))) return ev.detail > 1 ? undefined : toggleRule(b.dataset.ruleToggle, b.dataset.ruleOn !== '1');
  if ((b = q('[data-scroll]'))) return scrollTo(b.dataset.scroll);
  if ((b = q('[data-toggle]'))) return setState({ ...base, [b.dataset.toggle]: !state[b.dataset.toggle] });
  if ((b = q('[data-sort]'))) return setState({ ...base, adSort: b.dataset.sort });
  if ((b = q('[data-axis]'))) return setState({ ...base, axis: b.dataset.axis });
  if ((b = q('[data-unit]'))) return setState({ ...base, trendUnit: b.dataset.unit });
  if ((b = q('[data-copy]'))) return copyTable(b.dataset.copy);
  if ((state.chipOpen || state.themeOpen) && !insidePop) return setState(base);
  return undefined;
};
const onChange = (ev) => {
  const t = ev.target, v = t.value;
  if (t.matches('select[data-hist]')) return setState({ histIdx: Number(v) });
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  if (t.dataset.gf) return setState({ range: R.clamp({ from: v, to: v > state.range.to ? v : state.range.to }, state.bounds), cardRanges: {} });
  if (t.dataset.gt) return setState({ range: R.clamp({ from: v < state.range.from ? v : state.range.from, to: v }, state.bounds), cardRanges: {} });
  if (t.dataset.cf) {
    const id = t.dataset.cf, cur = state.cardRanges[id] || rangeFor(id);
    const next = SINGLE[id] ? { from: v, to: v } : { from: v, to: v > cur.to ? v : cur.to };
    return setState({ cardRanges: { ...state.cardRanges, [id]: next }, chipOpen: SINGLE[id] ? null : id });
  }
  if (t.dataset.ct) {
    const id = t.dataset.ct, cur = state.cardRanges[id] || rangeFor(id);
    return setState({ cardRanges: { ...state.cardRanges, [id]: { from: v < cur.from ? v : cur.from, to: v } }, chipOpen: id });
  }
  return undefined;
};

document.addEventListener('click', onClick);
document.addEventListener('change', onChange);
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && (state.chipOpen || state.themeOpen || state.ruleArm)) setState({ chipOpen: null, themeOpen: false, ruleArm: null }); });

/* 공용 툴팁 */
const tip = document.getElementById('tip');
document.addEventListener('mousemove', (ev) => {
  const el = ev.target.closest('[data-tip]');
  if (!el || !el.dataset.tip) { tip.hidden = true; return; }
  tip.textContent = el.dataset.tip; tip.hidden = false;
  const x = Math.min(ev.clientX, window.innerWidth - 340), y = Math.min(ev.clientY, window.innerHeight - 70);
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
});

render();
})();
