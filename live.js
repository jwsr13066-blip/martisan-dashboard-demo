'use strict';
/* 실데이터 어댑터 — 배달부가 만든 dashboard/data.json(window.MARTISAN_LIVE)을 화면이 쓰는 모양으로 바꾼다.
   화면 코드는 샘플/실데이터 구분 없이 같은 모양만 본다. 판정 규칙은 여기서 새로 만들지 않는다. */
(() => {
  const live = window.MARTISAN_LIVE;
  if (!live || !Array.isArray(live.days) || !live.days.length) return;

  const COLORS = { naver_shopping: 'var(--c4)', naver_sa: 'var(--c1)', meta: 'var(--c2)', google: 'var(--c3)', adboost: 'var(--c5)' };
  const dow = (iso) => new Date(`${iso}T00:00:00+09:00`).getDay();

  const channels = live.channels.map((c) => ({ id: c.id, name: c.name, color: COLORS[c.id] || 'var(--c1)' }));
  const byChannel = Object.fromEntries(channels.map((c) => [c.id, live.days.filter((d) => d.channel === c.id)
    .map((d) => ({ date: d.date, day: dow(d.date), cost: d.cost, clicks: d.clk, imp: d.imp, conv: d.conv, rev: d.rev }))]));
  const dates = [...new Set(live.days.map((d) => d.date))].sort();
  const days = dates.map((date) => {
    const rows = live.days.filter((d) => d.date === date);
    const cost = rows.reduce((a, r) => a + r.cost, 0), conv = rows.reduce((a, r) => a + r.conv, 0), adRev = rows.reduce((a, r) => a + r.rev, 0);
    return { date, day: dow(date), cost, conv, adRev, total: null };
  });
  const ch0 = channels[0];
  const creatives = (live.entities?.creatives || []).map((c) => ({ id: c.id, name: c.name, group: c.group, channel: ch0, cost: null, rev: c.rev, conv: c.conv, roas: null, ctr: null, state: 'ok' }));

  const cl = live.client;
  const industry = {
    id: 'live', brand: cl.name, type: `${cl.basis} · 기준일 ${live.source_last_date}`, live: true,
    revLabel: cl.rev_label, convLabel: cl.conv_label, convUnit: cl.conv_unit, margin: cl.margin, bep: cl.bep, target: cl.target,
    adShare: null, totalLabel: '스토어 전체 매출', channels, byChannel, days, creatives, groups: live.entities?.groups || [], creativesAI: live.creatives_ai || null,
    ops: { approvals: live.approvals, history: live.history, timeline: live.timeline, pending: live.pending_sources || [], generatedAt: live.generated_at, rules: live.rules || null, weather: live.weather || null },
  };
  window.MARTISAN_DATA = { ...window.MARTISAN_DATA, DATA: { live: industry }, LIVE: true,
    END_DATE: new Date(`${live.source_last_date}T00:00:00+09:00`) };
})();
