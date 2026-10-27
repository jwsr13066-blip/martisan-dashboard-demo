'use strict';
(() => {
/* 샘플 데이터 생성기 — 비율은 에오비츠 실측(CTR 1.4%·CPC 185원·CVR 1.6%·객단가 3.6만·ROAS 300%대)에서 따옴.
   같은 시드 → 항상 같은 숫자. 브랜드·규모는 가상. */

const END_DATE = new Date(2026, 9, 17); // 2026-10-17 (데모 기준일)
const DAYS = 400;

const mulberry32 = (seed) => () => {
  let a = seed | 0;
  return (() => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  })();
};

const CHANNELS = {
  naver_sa: { id: 'naver_sa', name: '네이버 SA', color: 'var(--c1)', hex: '#2a78d6' },
  meta:     { id: 'meta',     name: '메타',      color: 'var(--c2)', hex: '#eb6834' },
  google:   { id: 'google',   name: '구글',      color: 'var(--c3)', hex: '#1baf7a' },
  shopping: { id: 'shopping', name: '쇼핑검색',  color: 'var(--c4)', hex: '#eda100' },
  adboost:  { id: 'adboost',  name: '애드부스트', color: 'var(--c5)', hex: '#e87ba4' },
  place:    { id: 'place',    name: '플레이스',  color: 'var(--c4)', hex: '#eda100' },
};

/* cost: 일 평균 광고비, cpc, cvr, aov(전환 1건 매출), trend: 연간 성장(1.0 = 없음) */
const INDUSTRIES = {
  commerce: {
    id: 'commerce', brand: '루미에 쥬얼리', type: '스마트스토어 커머스', seed: 11,
    revLabel: '매출', convLabel: '구매', convUnit: '건', margin: 40, adShare: 0.29, totalLabel: '스토어 전체 매출',
    channels: [
      { ...CHANNELS.naver_sa, cost: 9700, cpc: 185, cvr: 0.016, aov: 33000, trend: 1.08 },
      { ...CHANNELS.shopping, cost: 10600, cpc: 210, cvr: 0.022, aov: 31000, trend: 1.25 },
      { ...CHANNELS.meta,     cost: 7000, cpc: 320, cvr: 0.012, aov: 34000, trend: 0.95 },
      { ...CHANNELS.google,   cost: 4200, cpc: 260, cvr: 0.020, aov: 32000, trend: 1.10 },
      { ...CHANNELS.adboost,  cost: 4300, cpc: 150, cvr: 0.018, aov: 30000, trend: 1.15 },
    ],
    creatives: {
      naver_sa: [['실버925 레이어드 팔찌', .28, 1.25, 1.9], ['유기동물 후원 팔찌', .22, 1.55, 2.4], ['실버925 각인 반지', .26, .62, 1.1], ['커플 체인 팔찌', .24, .95, 1.4]],
      shopping: [['데이지 이단체인 팔찌', .35, 1.3, 2.1], ['미니 하트 목걸이', .30, 1.1, 1.8], ['타이니 은 팔찌', .20, .45, .9], ['볼체인 각인 팔찌', .15, 1.0, 1.5]],
      meta:     [['후원 스토리 영상 A', .40, 1.3, 1.6, 'ok'], ['언박싱 릴스 B', .35, .55, .8, 'fatigue'], ['착용샷 카루셀 C', .25, 1.05, 1.2, 'ok']],
      google:   [['쇼핑 광고 (전체)', .70, 1.1, 1.3], ['브랜드 검색', .30, 1.6, 4.2]],
      adboost:  [['상품 광고 묶음', 1.0, 1.0, 1.7]],
    },
  },
  local: {
    id: 'local', brand: '온기 식당', type: '성수동 레스토랑', seed: 23,
    revLabel: '예약 매출', convLabel: '예약', convUnit: '팀', margin: 55, adShare: 0.22, totalLabel: 'POS 전체 매출',
    channels: [
      { ...CHANNELS.place,    cost: 9000, cpc: 320, cvr: 0.030, aov: 60000, trend: 1.2 },
      { ...CHANNELS.naver_sa, cost: 7000, cpc: 380, cvr: 0.020, aov: 60000, trend: 1.05 },
      { ...CHANNELS.meta,     cost: 5500, cpc: 450, cvr: 0.018, aov: 60000, trend: 1.1 },
      { ...CHANNELS.google,   cost: 3000, cpc: 400, cvr: 0.015, aov: 60000, trend: 1.0 },
    ],
    creatives: {
      place:    [['대표 사진 · 한상차림', .55, 1.2, 3.1], ['예약 쿠폰 소식', .45, .9, 2.2]],
      naver_sa: [['성수 데이트 식당', .40, 1.5, 2.6], ['성수 맛집', .35, .6, 1.4], ['성수 단체 예약', .25, 1.1, 1.8]],
      meta:     [['시그니처 플레이팅 릴스', .50, 1.25, 1.5, 'ok'], ['주말 브런치 카루셀', .50, .7, .9, 'fatigue']],
      google:   [['지역 검색 광고', 1.0, 1.0, 1.6]],
    },
  },
  lead: {
    id: 'lead', brand: '한결 인테리어', type: '시공 B2B 리드', seed: 37,
    revLabel: '계약액', convLabel: '상담', convUnit: '건', margin: 25, adShare: 1.0, totalLabel: '계약액 (상담→계약 10%)',
    channels: [
      { ...CHANNELS.naver_sa, cost: 48000, cpc: 3200, cvr: 0.055, aov: 320000, trend: 1.1 },
      { ...CHANNELS.meta,     cost: 36000, cpc: 2600, cvr: 0.035, aov: 280000, trend: 0.9 },
      { ...CHANNELS.google,   cost: 24000, cpc: 3800, cvr: 0.060, aov: 340000, trend: 1.2 },
    ],
    creatives: {
      naver_sa: [['30평 인테리어 견적', .40, 1.5, 3.2], ['아파트 리모델링 견적', .35, .6, 2.1], ['구축 올수리', .25, 1.1, 2.6]],
      meta:     [['시공 전후 비교 영상 A', .45, 1.3, 1.4, 'ok'], ['견적 비교 B', .35, .5, .7, 'fatigue'], ['고객 후기 카루셀 C', .20, 1.0, 1.1, 'ok']],
      google:   [['인테리어 업체 검색', .65, 1.2, 2.4], ['브랜드 검색', .35, 1.8, 5.5]],
    },
  },
};

const WEEKDAY = [0.82, 1.06, 1.08, 1.05, 1.02, 1.12, 0.85]; // 일~토 (커머스 평일 강세)

const dateAt = (offset) => new Date(END_DATE.getFullYear(), END_DATE.getMonth(), END_DATE.getDate() - offset);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const genChannelDays = (ch, rand) => Array.from({ length: DAYS }, (_, i) => {
  const offset = DAYS - 1 - i;
  const d = dateAt(offset);
  const growth = Math.pow(ch.trend, (DAYS - offset) / 365);
  const cost = Math.round(ch.cost * WEEKDAY[d.getDay()] * growth * (0.75 + rand() * 0.5));
  const clicks = Math.round(cost / (ch.cpc * (0.9 + rand() * 0.2)));
  const conv = Math.round(clicks * ch.cvr * (0.7 + rand() * 0.6) * 100) / 100;
  const rev = Math.round(conv * ch.aov * (0.85 + rand() * 0.3));
  return { date: ymd(d), day: d.getDay(), cost, clicks, conv, rev };
});

const genCreatives = (ind, byChannel) => Object.entries(ind.creatives).flatMap(([chId, list]) => {
  const ch = ind.channels.find((c) => c.id === chId);
  const agg = sumRange(byChannel[chId], 30);
  const chRoas = agg.cost ? agg.rev / agg.cost : 0;
  return list.map(([name, share, roasMult, ctr, state], i) => {
    const cost = Math.round(agg.cost * share);
    const rev = Math.round(cost * chRoas * roasMult);
    return { id: `${chId}-${i}`, name, channel: ch, cost, rev, roas: cost ? rev / cost : 0, ctr, state: state || 'ok' };
  });
});

const sumRange = (days, n, offset = 0) => {
  const slice = days.slice(days.length - n - offset, days.length - offset);
  return slice.reduce((a, d) => ({ cost: a.cost + d.cost, clicks: a.clicks + d.clicks, conv: a.conv + d.conv, rev: a.rev + d.rev }),
    { cost: 0, clicks: 0, conv: 0, rev: 0 });
};

const buildIndustry = (key) => {
  const ind = INDUSTRIES[key];
  const rand = mulberry32(ind.seed);
  const byChannel = Object.fromEntries(ind.channels.map((ch) => [ch.id, genChannelDays(ch, rand)]));
  const days = Array.from({ length: DAYS }, (_, i) => {
    const rows = ind.channels.map((ch) => byChannel[ch.id][i]);
    const cost = rows.reduce((a, r) => a + r.cost, 0);
    const conv = rows.reduce((a, r) => a + r.conv, 0);
    const adRev = rows.reduce((a, r) => a + r.rev, 0);
    const total = Math.round(adRev / ind.adShare * (0.9 + rand() * 0.2));
    return { date: rows[0].date, day: rows[0].day, cost, conv, adRev, total: Math.max(total, adRev) };
  });
  const bep = Math.round(100 / ind.margin * 100);
  const target = Math.round(bep * 1.2 / 10) * 10;
  return { ...ind, byChannel, days, bep, target, creatives: genCreatives(ind, byChannel) };
};

const DEMO_CREATIVES_AI = {
  window: { days: 28 }, guard: { min_ads: 2, min_clk: 30, good_mult: 1.3 },
  total: { ads: 42, cost: 720000, rev: 3340000, conv: 75, clk: 3880, roas: 464, labeled_images: 42 },
  axes: {
    category: { label: '카테고리', values: [{ value: '팔찌', n: 12, cost: 180000, clk: 1000, conv: 24, rev: 1085000, roas: 603, share: 32, mult: 1.3, hold: false }, { value: '반지', n: 22, cost: 400000, clk: 2200, conv: 40, rev: 1964000, roas: 491, share: 59, mult: 1.06, hold: false }, { value: '목걸이', n: 8, cost: 140000, clk: 680, conv: 3, rev: 127000, roas: 91, share: 4, mult: 0.2, hold: false }] },
    motif: { label: '모티브', values: [{ value: '민자', n: 3, cost: 12000, clk: 90, conv: 6, rev: 389000, roas: 3242, share: 12, mult: 7.0, hold: false }, { value: '십자가', n: 9, cost: 160000, clk: 720, conv: 16, rev: 755000, roas: 472, share: 23, mult: 1.02, hold: false }, { value: '하트', n: 5, cost: 60000, clk: 300, conv: 3, rev: 150000, roas: 250, share: 4, mult: 0.54, hold: false }, { value: '데이지', n: 1, cost: 8000, clk: 20, conv: 0, rev: 0, roas: 0, share: 0, mult: null, hold: true }] },
    message: { label: '메시지', values: [{ value: '남녀공용', n: 8, cost: 90000, clk: 500, conv: 20, rev: 971000, roas: 1079, share: 29, mult: 2.33, hold: false }, { value: '후원', n: 14, cost: 220000, clk: 1300, conv: 20, rev: 882000, roas: 401, share: 26, mult: 0.87, hold: false }, { value: '커플', n: 6, cost: 80000, clk: 400, conv: 2, rev: 104000, roas: 130, share: 3, mult: 0.28, hold: false }] },
    target: { label: '타깃', values: [{ value: '공용', n: 8, cost: 90000, clk: 500, conv: 20, rev: 971000, roas: 1079, share: 29, mult: 2.33, hold: false }, { value: '남자', n: 9, cost: 150000, clk: 700, conv: 12, rev: 601000, roas: 401, share: 18, mult: 0.87, hold: false }] },
    material: { label: '소재', values: [{ value: '실버925', n: 15, cost: 300000, clk: 1500, conv: 40, rev: 1677000, roas: 559, share: 50, mult: 1.21, hold: false }, { value: '써지컬스틸', n: 27, cost: 420000, clk: 2380, conv: 35, rev: 1335000, roas: 318, share: 40, mult: 0.69, hold: false }] },
    price_band: { label: '가격대', values: [{ value: '고가(4.5만~)', n: 6, cost: 110000, clk: 500, conv: 12, rev: 836000, roas: 760, share: 25, mult: 1.64, hold: false }, { value: '저가(~2만)', n: 30, cost: 500000, clk: 2900, conv: 50, rev: 1765000, roas: 353, share: 53, mult: 0.76, hold: false }] },
    shot: { label: '연출', values: [{ value: '착용샷', n: 14, cost: 260000, clk: 1400, conv: 38, rev: 1870000, roas: 719, share: 56, mult: 1.55, hold: false }, { value: '단품', n: 28, cost: 460000, clk: 2480, conv: 37, rev: 1470000, roas: 320, share: 44, mult: 0.69, hold: false }] },
    background: { label: '배경', values: [{ value: '흰배경', n: 30, cost: 480000, clk: 2600, conv: 45, rev: 1900000, roas: 396, share: 57, mult: 0.85, hold: false }, { value: '연출배경', n: 12, cost: 240000, clk: 1280, conv: 30, rev: 1440000, roas: 600, share: 43, mult: 1.29, hold: false }] },
    tone: { label: '색감', values: [{ value: '실버', n: 36, cost: 640000, clk: 3400, conv: 68, rev: 3000000, roas: 469, share: 90, mult: 1.01, hold: false }, { value: '골드', n: 6, cost: 80000, clk: 480, conv: 7, rev: 340000, roas: 425, share: 10, mult: 0.92, hold: false }] },
  },
  ads: [
    { id: 'd1', name: '십자가 레이어드 실버925 남자 반지', image: '', cost: 116767, clk: 442, conv: 9, rev: 453000, roas: 388, cpa: 12974, labels: { category: '반지', motif: ['십자가', '레이어드'], message: ['없음'], target: '남자', material: '실버925', price_band: '중가(2~4.5만)', shot: '착용샷', background: '흰배경', tone: '실버' } },
    { id: 'd2', name: '포에버링 실버925 반지', image: '', cost: 10553, clk: 56, conv: 2, rev: 350500, roas: 3321, cpa: 5277, labels: { category: '반지', motif: ['포에버링'], message: ['없음'], target: '무관', material: '실버925', price_band: '고가(4.5만~)', shot: '착용샷', background: '연출배경', tone: '실버' } },
    { id: 'd3', name: '십자가 앙크 실버925 반지', image: '', cost: 12416, clk: 47, conv: 1, rev: 347700, roas: 2800, cpa: 12416, labels: { category: '반지', motif: ['십자가'], message: ['없음'], target: '무관', material: '실버925', price_band: '중가(2~4.5만)', shot: '단품', background: '흰배경', tone: '실버' } },
    { id: 'd4', name: '페이퍼 체인 실버925 팔찌', image: '', cost: 28458, clk: 161, conv: 1, rev: 250500, roas: 880, cpa: 28458, labels: { category: '팔찌', motif: ['페이퍼체인'], message: ['없음'], target: '무관', material: '실버925', price_band: '고가(4.5만~)', shot: '착용샷', background: '연출배경', tone: '실버' } },
    { id: 'd5', name: '스퀘어 민자 링 남녀공용 써지컬 반지', image: '', cost: 3286, clk: 21, conv: 3, rev: 161200, roas: 4906, cpa: 1095, labels: { category: '반지', motif: ['사각', '민자'], message: ['남녀공용'], target: '공용', material: '써지컬스틸', price_band: '저가(~2만)', shot: '착용샷', background: '흰배경', tone: '실버' } },
    { id: 'd6', name: '유기견 후원 하트 커플 써지컬 목걸이', image: '', cost: 20333, clk: 101, conv: 0, rev: 0, roas: 0, cpa: null, labels: { category: '목걸이', motif: ['하트'], message: ['후원', '커플'], target: '커플', material: '써지컬스틸', price_band: '저가(~2만)', shot: '단품', background: '흰배경', tone: '실버' } },
  ],
  suggestions: {
    strong: [{ axis: '모티브', value: '민자', mult: 7.0, share: 12 }, { axis: '메시지', value: '남녀공용', mult: 2.33, share: 29 }, { axis: '가격대', value: '고가(4.5만~)', mult: 1.64, share: 25 }, { axis: '연출', value: '착용샷', mult: 1.55, share: 56 }],
    expand: [{ text: "'포에버링' 모티브: 소재 2개뿐인데 ROAS 2,481% (평균 5.4배) → 같은 조합 상품을 늘릴 것" }, { text: "'페이퍼체인' 모티브: 소재 1개뿐인데 ROAS 880% (평균 1.9배) → 같은 조합 상품을 늘릴 것" }],
    try: [{ text: "모티브 '민자'(7.0배) + 가격대 '고가(4.5만~)'(1.64배) — 아직 둘을 함께 쓴 소재가 없음 → 시험 소재 1개 제안" }, { text: "메시지 '남녀공용'(2.33배) + 연출 '착용샷'(1.55배) — 아직 둘을 함께 쓴 소재가 없음 → 시험 소재 1개 제안" }],
    cleanup: [{ text: '유기견 후원 하트 커플 써지컬 목걸이: 28일 클릭 101·광고비 20,333원에 구매 0 → 입찰 하향/OFF 후보 (입찰 매니저 제안에 반영)' }],
  },
};

const DATA = Object.fromEntries(Object.keys(INDUSTRIES).map((k) => [k, k === 'commerce' ? { ...buildIndustry(k), creativesAI: DEMO_CREATIVES_AI } : buildIndustry(k)]));

window.MARTISAN_DATA = { DATA, sumRange, END_DATE };
})();
