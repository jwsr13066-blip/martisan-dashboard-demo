'use strict';
/* 실데이터 어댑터 — 배달부가 만든 dashboard/data.json(window.MARTISAN_LIVE)을 샘플(data.js)과 같은 모양으로 바꾼다.
   화면 코드는 샘플/실데이터 구분 없이 같은 모양만 본다. 판정 규칙은 여기서 새로 만들지 않는다. */
(() => {
  const live = window.MARTISAN_LIVE;
  if (!live || !Array.isArray(live.days) || !live.days.length) return;

  const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
  const channels = live.channels.map((c, i) => ({ id: c.id, name: c.name, color: COLORS[i % COLORS.length], lastDate: c.last_date || null }));
  const byChannel = Object.fromEntries(channels.map((c) => [c.id, live.days.filter((d) => d.channel === c.id)
    .map((d) => ({ date: d.date, cost: d.cost, clicks: d.clk, conv: d.conv, rev: d.rev }))]));
  const dates = [...new Set(live.days.map((d) => d.date))].sort();
  const days = dates.map((date) => {
    const rows = live.days.filter((d) => d.date === date);
    const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    return { date, cost: sum('cost'), clicks: sum('clk'), conv: sum('conv'), adRev: sum('rev'), total: null };
  });
  const ch0 = channels[0].id;
  const cr = live.creatives;
  const creatives = cr && cr.ads && cr.ads.length
    ? { ...cr, ads: cr.ads.map((a) => ({ ...a, channelId: ch0 })) }
    : null;

  const cl = live.client;
  const industry = {
    id: 'live', brand: cl.name, type: cl.basis, live: true,
    revLabel: cl.rev_label, convLabel: cl.conv_label, convUnit: cl.conv_unit, margin: cl.margin, bep: cl.bep, target: cl.target,
    monthlyGoal: cl.monthly_goal || null, totalLabel: cl.total_label || '스토어 전체 매출', theme: cl.theme || 'cream',
    channels, byChannel, days, creatives, groupChannel: ch0,
    groups: (live.groups && live.groups.groups) || [], groupDaily: (live.groups && live.groups.daily) || {},
    firstDate: dates[0], lastDate: live.source_last_date || dates[dates.length - 1],
    ops: { approvals: live.approvals, history: live.history, timeline: live.timeline, rules: live.rules || null, weather: live.weather || null,
      pending: live.pending_sources || [], generatedAt: live.generated_at },
  };
  window.MARTISAN_DATA = { ...window.MARTISAN_DATA, DATA: { live: industry }, LIVE: true, END_DATE: industry.lastDate };
})();
