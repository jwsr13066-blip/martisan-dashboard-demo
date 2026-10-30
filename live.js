'use strict';
/* 실데이터 어댑터 — 배달부가 만든 dashboard/data.json(window.MARTISAN_LIVE)을 샘플(data.js)과 같은 모양으로 바꾼다.
   화면 코드는 샘플/실데이터 구분 없이 같은 모양만 본다. 판정 규칙은 여기서 새로 만들지 않는다. */
(() => {
  const live = window.MARTISAN_LIVE;
  if (!live || !Array.isArray(live.days) || !live.days.length) return;

  const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
  /* 매체 공통 모양 — lever(bid|budget)·source(api|csv)·noun(소재|상품)·hint 는 빌더(dashboard_build.py · channel_sources.py)가 매체마다 싣는다 */
  const channels = live.channels.map((c, i) => ({ id: c.id, name: c.name, color: COLORS[i % COLORS.length], firstDate: c.first_date || null, lastDate: c.last_date || null, lever: c.lever || 'bid', source: c.source || 'api', noun: c.noun || (c.lever === 'budget' ? '상품' : '소재'), hint: c.hint || '' }));
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

  /* 애드부스트 상품별(소재 성과 화면) — 쇼핑검색 소재와 같은 모양, 매체별로 따로 */
  const ca = live.creatives_adv;
  const advCh = ca && (channels.find((c) => c.id === ca.channel) || channels.find((c) => c.source === 'csv'));
  const srcById = Object.fromEntries(((creatives && creatives.ads) || []).map((a) => [a.id, a]));  // 같은 상품의 쇼핑검색 소재 → 이미지·AI 라벨 재사용
  const withSrc = (a) => { const s = a.src ? srcById[a.src] : null; return { ...a, channelId: advCh.id, image: s ? s.image : '', price: s ? s.price : null, labels: s ? s.labels : null }; };
  const creativesAdv = advCh && ca && ca.ads && ca.ads.length
    ? { ...ca, ads: ca.ads.map(withSrc), labeled_images: ca.ads.filter((a) => { const s = a.src ? srcById[a.src] : null; return s && s.labels && s.labels.shot && s.labels.shot !== '미라벨'; }).length }
    : null;
  /* API 매체(메타·구글)의 소재 묶음 — 빌더가 creatives_by[매체ID] 로 싣는다 (AI 라벨 없음) */
  const byApi = Object.fromEntries(Object.entries(live.creatives_by || {}).filter(([id, c]) => c && c.ads && c.ads.length && channels.some((ch) => ch.id === id))
    .map(([id, c]) => [id, { ...c, ads: c.ads.map((a) => ({ ...a, channelId: id, labels: null })) }]));
  const creativesBy = { ...(creatives ? { [ch0]: creatives } : {}), ...(creativesAdv ? { [advCh.id]: creativesAdv } : {}), ...byApi };

  const cl = live.client;
  const industry = {
    id: 'live', brand: cl.name, type: cl.basis, live: true,
    revLabel: cl.rev_label, convLabel: cl.conv_label, convUnit: cl.conv_unit, margin: cl.margin, bep: cl.bep, target: cl.target,
    monthlyGoal: cl.monthly_goal || null, totalLabel: cl.total_label || '스토어 전체 매출', theme: cl.theme || 'cream',
    channels, byChannel, days, creatives, creativesBy, groupChannel: ch0, nextChannels: live.next_channels || [],
    groups: (live.groups && live.groups.groups) || [], groupDaily: (live.groups && live.groups.daily) || {},
    firstDate: dates[0], lastDate: live.source_last_date || dates[dates.length - 1],
    ops: { approvals: live.approvals, history: live.history, timeline: live.timeline, rules: live.rules || null, weather: live.weather || null,
      pending: live.pending_sources || [], generatedAt: live.generated_at },
  };
  window.MARTISAN_DATA = { ...window.MARTISAN_DATA, DATA: { live: industry }, LIVE: true, END_DATE: industry.lastDate };
})();
