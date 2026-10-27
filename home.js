'use strict';
/* 첫 화면 "AI 결재함" — 오늘 AI가 한 일 + 결재할 일. 결재함·자동 행동 타임라인·전후 성적표·판정 근거.
   실데이터 모드는 ind.ops(배달부 data.json), 데모 모드는 아래 샘플 ops 를 쓴다. 공용 헬퍼(won·card…)는 app.js 전역을 런타임에 참조. */

const DEMO_OPS = {
  commerce: {
    history: [{ date: '2026-10-05', applied_at: '2026-10-06', count: 22, counts: { up: 14, down: 8, off: 0 }, before: { cost: 177219, rev: 851400, roas: 480 }, after: { cost: 164618, rev: 571200, roas: 347 } },
      { date: '2026-10-12', applied_at: '2026-10-13', count: 20, counts: { up: 9, down: 11, off: 0 }, before: { cost: 164618, rev: 571200, roas: 347 }, after: { cost: 181849, rev: 1169400, roas: 643 } }],
    rules: { last_run: '2026-10-17T13:02', region: '서울', rules: [
      { id: 'perf_boost', name: '성과 부스트', icon: '⚖️', mode: 'auto', enabled: true, desc: '어제 구매완료 ROAS 500%↑ + 지출 3천↑ → 가중치 +20%, 자정 원복', last_fired: '2026-10-17', fired_14d: 6, measuring: 6, effect: { fired_days: 6, other_days: 8, fired_roas: 612, other_roas: 398 } },
      { id: 'rain_mobile', name: '비 오는 날 모바일', icon: '☔', mode: 'auto', enabled: true, desc: '서울 강수확률 70%↑ → 모바일 가중치 +10%, 자정 원복', last_fired: '2026-10-12', fired_14d: 2, measuring: 2, effect: null },
      { id: 'weekend_pc', name: '주말 PC 억제', icon: '🖥️', mode: 'propose', enabled: true, desc: '토·일 PC 가중치 −30% 제안', last_fired: '2026-10-12', fired_14d: 4, measuring: 4, effect: null },
      { id: 'anomaly', name: '이상 감지', icon: '🚨', mode: 'alert', enabled: true, desc: '지출 7일 평균 1.7배·CPC 1.5배·노출 0·수집 누락 → 카톡 즉시', last_fired: '2026-10-07', fired_14d: 1, measuring: 1, effect: null },
      { id: 'temp_extreme', name: '한파·폭염 메시지', icon: '🌡️', mode: 'alert', enabled: true, desc: '−5℃ 이하·33℃ 이상 → 시즌 소재 제안', last_fired: null, fired_14d: 0, measuring: 0, effect: null } ] },
    timeline: [['2026-10-17', 'rule', '규칙 엔진: ⚖️ 성과 부스트 · 🖥️ 주말 PC 억제(제안)', '실버925 상품 PC 100→120·MO 120→144 · 자정 원복 완료'], ['2026-10-16', 'weight', '시간 가중치 봇 +20% 발동 · 1개 그룹', '유기동물 후원 (자정 원복)'],
      ['2026-10-15', 'pc', 'PC 지면 주간 점검 · ROAS 236%', '손익분기 이하 1주차 — 관찰'], ['2026-10-13', 'apply', '입찰 조정 20건 적용 (승인 후)', '인상 9 · 인하 11'], ['2026-10-12', 'propose', '주간 입찰 제안 20건 생성', '카톡 승인 버튼 발송'],
      ['2026-10-10', 'weight', '시간 가중치 봇 +20% 발동 · 1개 그룹', '실버925 상품 (자정 원복)'], ['2026-10-07', 'gap', '수집 누락', '네이버 API 응답 지연 — 판정 제외']],
  },
  local: {
    history: [{ date: '2026-10-12', applied_at: '2026-10-13', count: 18, counts: { up: 7, down: 10, off: 1 }, before: { cost: 118000, rev: 1240000, roas: 1051 }, after: { cost: 93000, rev: 1290000, roas: 1387 } }],
    timeline: [['2026-10-17', 'weight', '점심 시간대 가중치 발동', '11~13시 플레이스 입찰 +20% (14시 원복)'], ['2026-10-13', 'apply', '입찰 조정 18건 적용 (승인 후)', '인상 7 · 인하 10 · 끄기 1'], ['2026-10-12', 'propose', '주간 입찰 제안 18건 생성', '카톡 승인 버튼 발송']],
  },
  lead: {
    history: [{ date: '2026-10-12', applied_at: '2026-10-13', count: 24, counts: { up: 8, down: 14, off: 2 }, before: { cost: 395000, rev: 1450000, roas: 367 }, after: { cost: 340000, rev: 1820000, roas: 535 } }],
    timeline: [['2026-10-16', 'apply', '메타 소재 1편 리프레시', '피로 3조건 충족 → 연출 다른 2편 교체'], ['2026-10-13', 'apply', '입찰 조정 24건 적용 (승인 후)', '인상 8 · 인하 14 · 끄기 2'], ['2026-10-12', 'propose', '주간 입찰 제안 24건 생성', '카톡 승인 버튼 발송']],
  },
};

const TYPE_LABEL = { weight: '가중치 봇', apply: '적용', propose: '제안', pc: '지면 점검', gap: '수집 누락', rule: '규칙 엔진' };
const DIR_LABEL = { up: '인상', down: '인하', off: '끄기', hold: '유지', fresh: '리프레시' };

const opsOf = (ind, approvalsDemo) => {
  if (ind.ops) return ind.ops;
  const a = approvalsDemo[ind.id];
  return {
    approvals: { status: 'pending', date: '2026-10-19', expires: '2026-10-26', count: a.count, counts: null, summary: a.summary, effect: a.effect,
      items: a.items.map(([dir, dt, name, why, act]) => ({ dir, dirText: dt, name, reason: why, act })) },
    history: DEMO_OPS[ind.id].history,
    timeline: DEMO_OPS[ind.id].timeline.map(([date, type, title, detail]) => ({ date, type, title, detail })),
    pending: [], rules: DEMO_OPS[ind.id].rules || null,
  };
};

const changePct = (it) => (it.bid ? Math.round(((it.new - it.bid) / it.bid) * 100) : 0);
const rankItems = (items) => items.slice().sort((a, b) => (a.dir === 'off' ? -1 : b.dir === 'off' ? 1 : Math.abs(changePct(b)) - Math.abs(changePct(a))));

const approvalItem = (it) => {
  const dt = it.dirText || (it.dir === 'off' ? 'OFF' : `${changePct(it) > 0 ? '+' : ''}${changePct(it)}%`);
  const why = it.reason || '';
  const act = it.act || (it.dir === 'off' ? 'OFF 제안 (승인 전엔 유지)' : `입찰 ${it.bid?.toLocaleString('ko-KR')}원 → ${it.new?.toLocaleString('ko-KR')}원`);
  return `<li><span class="dir ${it.dir}">${esc(dt)}</span><div><div class="act">${esc(it.name)}${it.group ? ` <span class="chn">${esc(it.group)}</span>` : ''}</div><div class="why">${esc(why)}${why ? ' → ' : ''}${esc(act)}</div></div></li>`;
};

const inboxCard = (ops, st, ind) => {
  const a = ops.approvals;
  const counts = a.counts || { up: 0, down: 0, off: 0 };
  const summary = a.summary || `인상 ${counts.up} · 인하 ${counts.down} · 끄기 ${counts.off}`;
  const items = rankItems(a.items || []);
  const shown = st.showAll ? items : items.slice(0, 5);
  const pending = a.status === 'pending' && a.count > 0;
  const expired = a.expires && a.expires < (ind.live ? new Date().toISOString().slice(0, 10) : '2026-10-17');
  const statusLine = !a.count ? '지금 결재할 제안이 없습니다. 다음 주간 제안은 월요일 09:17에 올라옵니다.'
    : a.status !== 'pending' ? `이 제안은 ${esc(a.status === 'applied' ? '이미 적용' : '처리')}됐습니다.`
      : expired ? '승인 유효기간이 지났습니다. 다음 제안을 기다리거나 수동으로 요청하세요.' : `승인 유효 ${esc(a.expires || '')}까지 · 누르면 전체 ${a.count}건이 바로 적용됩니다`;
  const action = st.approved
    ? `<div class="receipt"><b>✅ 승인 접수</b><span>${a.count}건이 실행 대기열에 들어갔습니다. 적용 결과와 7일 뒤 전후 성적표는 카카오톡으로 갑니다.</span></div>${ind.live ? '' : '<div class="row"><button type="button" class="btn ghost" id="undo">데모 되돌리기</button></div>'}`
    : pending && !expired ? `<div class="row"><button type="button" class="btn" id="approve">✅ ${a.count}건 승인하기</button><span class="d">${a.effect ? esc(a.effect) : '안전장치: 주간 변경 20% 캡 · OFF는 제안만'}</span></div>${st.approveError ? `<div class="row"><span class="pill crit">${esc(st.approveError)}</span></div>` : ''}` : '';
  return card('inbox', 7, '결재함 · 돈 임팩트 순', pending ? `승인 대기 <b>${a.count}건</b> · ${esc(summary)}` : '결재 대기 없음', statusLine,
    `<ul class="proposals">${shown.map(approvalItem).join('')}</ul>${items.length > 5 ? `<button type="button" class="link" id="show-all">${st.showAll ? '접기' : `나머지 ${items.length - 5}건 더 보기`}</button>` : ''}${action}`);
};

const scoreCard = (ops, ind) => {
  const h = (ops.history || []).slice(-1)[0];
  if (!h) return card('score', 5, '전후 성적표', '아직 적용 이력이 없습니다', '', '<div class="d">첫 승인 뒤 7일이 지나면 여기에 전후 비교가 생깁니다.</div>');
  const d = (k) => deltaPct(h.after[k], h.before[k]);
  const tile = (k, label, goodWhenUp) => `<div><div class="k">${label}</div><div class="v ${(d(k) >= 0) === goodWhenUp ? 'ok' : ''} num">${arrow(d(k))}${Math.abs(d(k))}%</div><div class="t num">${fmtShort(h.before[k])} → ${fmtShort(h.after[k])}</div></div>`;
  const partial = h.after.days != null && h.after.days < 7 ? ` · 적용 후 ${h.after.days}일치` : '';
  return card('score', 5, `전후 성적표 · ${h.applied_at.slice(5).replace('-', '/')} 적용분`, `ROAS <b>${h.before.roas}% → ${h.after.roas}%</b>`, `적용 ${h.count}건 (인상 ${h.counts.up} · 인하 ${h.counts.down} · 끄기 ${h.counts.off}) · 적용 전 7일 vs 후 7일${partial}`,
    `<div class="score">${tile('cost', '광고비', false)}${tile('rev', ind.revLabel, true)}<div><div class="k">ROAS</div><div class="v ${h.after.roas >= h.before.roas ? 'ok' : ''} num long">${h.before.roas}→${h.after.roas}%</div><div class="t">목표 ${ind.target}%</div></div></div>
     ${(ops.history || []).length > 1 ? `<div class="d">이전 회차: ${(ops.history || []).slice(0, -1).map((x) => `${x.applied_at.slice(5).replace('-', '/')} ROAS ${x.before.roas}→${x.after.roas}%`).join(' · ')}</div>` : ''}`);
};

const timelineCard = (ops, ind) => {
  const end = ind.live ? new Date() : new Date('2026-10-17T00:00:00+09:00');
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(end); d.setDate(end.getDate() - 13 + i); return d.toISOString().slice(0, 10); });
  const evs = ops.timeline || [];
  const strip = days.map((d) => {
    const es = evs.filter((e) => e.date === d);
    const dots = es.map((e) => `<i class="tl-dot ${e.type}" data-tip="${esc(d.slice(5))} · ${esc(e.title)}"></i>`).join('');
    return `<div class="tl-day ${es.some((e) => e.type === 'gap') ? 'gap' : ''}"><div class="tl-dots">${dots || '<i class="tl-dot none"></i>'}</div><div class="tl-lb num">${Number(d.slice(8))}</div></div>`;
  }).join('');
  const list = evs.slice(0, 8).map((e) => `<li><span class="tl-dot ${e.type}"></span><div><div class="t">${esc(e.date.slice(5).replace('-', '/'))} · ${esc(e.title)}</div><div class="d">${esc(e.detail || '')}</div></div><span class="pill ${e.type === 'gap' ? 'crit' : e.type === 'apply' ? 'good' : e.type === 'rule' ? 'warn' : 'mute'}">${TYPE_LABEL[e.type] || e.type}</span></li>`).join('');
  const nWeight = evs.filter((e) => e.type === 'weight').length, nApply = evs.filter((e) => e.type === 'apply').length;
  return card('log', 12, '자동 행동 타임라인 · 최근 14일', `AI가 <b>${evs.length}번</b> 움직였습니다 · 가중치 봇 ${nWeight}일 · 승인 후 적용 ${nApply}회`, '점을 누르면 그날 무슨 일이 있었는지 보입니다. 자동 행동은 전부 자정 원복·20% 캡 안에서만',
    `<div class="tl">${strip}</div><div class="legend"><span><s style="background:var(--accent)"></s>가중치 봇</span><span><s style="background:var(--good)"></s>승인 후 적용</span><span><s style="background:var(--c1)"></s>제안 생성</span><span><s style="background:var(--c4)"></s>규칙 엔진</span><span><s style="background:var(--mute)"></s>지면 점검</span><span><s style="background:var(--crit)"></s>수집 누락</span></div><ul class="lights tl-list">${list}</ul>`);
};

const MODE_LABEL = { auto: '자동', propose: '제안', alert: '알림' };
const rulesCard = (ops) => {
  const rs = (ops.rules && ops.rules.rules) || [];
  if (!rs.length) return '';
  const rows = rs.map((r) => {
    const e = r.effect;
    const eff = e ? `발동일 ROAS ${e.fired_roas}% vs 비발동일 ${e.other_roas}% <span class="pill ${e.fired_roas >= e.other_roas ? 'good' : 'crit'}">${(e.fired_roas / Math.max(e.other_roas, 1)).toFixed(2)}배</span>`
      : r.mode === 'auto' ? `효과 측정 중 (발동 ${r.measuring}/3일 이상 필요)` : '';
    return `<li><span class="ricon">${esc(r.icon || '')}</span><div><div class="t">${esc(r.name)} <span class="pill ${r.mode === 'auto' ? 'good' : r.mode === 'propose' ? 'accent' : 'mute'}">${MODE_LABEL[r.mode] || r.mode}</span></div>
      <div class="d">${esc(r.desc || '')}</div><div class="d num">최근 발동 ${r.last_fired ? esc(r.last_fired.slice(5).replace('-', '/')) : '없음'} · 14일 ${r.fired_14d}회${eff ? ' · ' + eff : ''}</div></div>
      <span class="pill ${r.enabled ? 'good' : 'mute'}">${r.enabled ? 'ON' : 'OFF'}</span></li>`;
  }).join('');
  const w = ops.weather && ops.weather.today;
  return card('rules', 12, `자동 규칙 · 조건 → 행동 → 자정 원복${ops.rules.region ? ` · 날씨 기준 ${esc(ops.rules.region)}` : ''}`, `규칙 ${rs.length}개 · 마지막 평가 ${ops.rules.last_run ? esc(ops.rules.last_run.slice(5, 16).replace('T', ' ')) : '아직 없음'}${w ? ` · 오늘 강수 ${w.rain_prob}% · ${w.tmin}~${w.tmax}℃` : ''}`,
    '날씨·요일 규칙은 가설입니다. 발동일과 비발동일 성과를 비교해 4주 뒤 유지/폐기를 결정합니다. 모든 조정은 그룹당 ±20~30% 상한 안에서, 자정에 원복',
    `<ul class="lights rules">${rows}</ul>`);
};

const evidenceCard = (ind, st) => {
  const rows = channelAgg(ind, 7);
  const body = rows.map((r) => {
    const j = judge(r, ind), ws = weeklyRoas(ind, r, 4);
    const small = r.clicks < 10 ? '<span class="pill warn">표본 부족 · 판단 보류</span>' : `<span class="pill ${j.s}">${statusWord[j.s]}</span>`;
    return `<li><span class="dot ${r.clicks < 10 ? 'mute' : j.s}"></span><div><div class="t">${esc(r.name)} · 이번 주 ROAS ${r.roas}% ${r.clicks < 10 ? '' : `→ ${esc(j.act)}`}</div>
      <div class="d">최근 4주 ROAS ${ws.join('% → ')}% · 클릭 ${r.clicks} · ${esc(ind.convLabel)} ${cnt(r.conv)}${esc(ind.convUnit)} · 손익분기 ${ind.bep}% = 100 ÷ 마진 ${ind.margin}% · 목표 ${ind.target}%</div></div>${small}</li>`;
  }).join('');
  return card('why', 12, '판정 근거', '왜 그렇게 판단했나', '같은 숫자는 항상 같은 판정 (고정 규칙 엔진). 주간 클릭 10 미만이면 판정 대신 보류',
    `<ul class="lights">${body}</ul>`);
};

const pageHome = (ind, st, approvalsDemo) => {
  const ops = opsOf(ind, approvalsDemo);
  const a = ops.approvals, h = (ops.history || []).slice(-1)[0];
  const wk = channelAgg(ind, 7);
  const cost = wk.reduce((s, r) => s + r.cost, 0), rev = wk.reduce((s, r) => s + r.rev, 0), conv = wk.reduce((s, r) => s + r.conv, 0);
  const head = a.status === 'pending' && a.count ? `결재 대기 <b>${a.count}건</b>${a.expires ? ` (승인 유효 ${esc(a.expires.slice(5).replace('-', '/'))}까지)` : ''}.` : '지금 결재할 제안이 없습니다.';
  const score = h ? ` 지난 적용분(${esc(h.applied_at.slice(5).replace('-', '/'))}) 성적표: 광고비 ${arrow(deltaPct(h.after.cost, h.before.cost))}${Math.abs(deltaPct(h.after.cost, h.before.cost))}%, ${esc(ind.revLabel)} ${arrow(deltaPct(h.after.rev, h.before.rev))}${Math.abs(deltaPct(h.after.rev, h.before.rev))}%, ROAS <b>${h.before.roas}→${h.after.roas}%</b>.` : '';
  const ins = insight(`${ind.brand} · 오늘 AI가 한 일 + 결재할 일${ind.ops?.generatedAt ? ` · 갱신 ${esc(ind.ops.generatedAt.slice(5, 16).replace('T', ' '))}` : ''}`, head + score,
    `이번 주 광고비 ${wonS(cost)} → ${esc(ind.revLabel)} ${wonS(rev)} (ROAS ${pct(rev, cost)}%) · ${esc(ind.convLabel)} ${cnt(conv)}${esc(ind.convUnit)} · ${esc(ind.convLabel)} 1${esc(ind.convUnit)}당 광고비 ${conv ? won(cost / conv) : '—'}`);
  const pendingCards = (ops.pending || []).map((p) => `<section class="card s12 pending"><div class="card-h"><div class="eyebrow">연동 대기</div><h3>${esc(p.name)}</h3><div class="d">${esc(p.reason)}</div></div></section>`).join('');
  return ins + `<div class="grid">${inboxCard(ops, st, ind)}${scoreCard(ops, ind)}${timelineCard(ops, ind)}${rulesCard(ops)}${evidenceCard(ind, st)}${pendingCards}</div>`;
};

window.MARTISAN_HOME = { pageHome };
