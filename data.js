'use strict';
(() => {
/* 샘플 데이터 생성기 (세일즈 데모용) — 비율은 에오비츠 실측(CTR 1.4%·CPC 185원·CVR 1.6%·객단가 3.6만·ROAS 300%대)에서 따옴.
   같은 시드 → 항상 같은 숫자. 브랜드·규모는 가상. 실데이터(live.js)와 똑같은 모양으로 만든다:
   days · byChannel · creatives{ads, daily} · groups · ops{approvals, history, timeline, rules, weather}. */

const END_DATE = new Date(Date.UTC(2026, 9, 17)); // 2026-10-17 (데모 기준일)
const DAYS = 400;
const AD_DAYS = 90;

/* 시드 고정 난수 — 상태(a)를 호출 사이에 유지해야 매번 다른 값이 나온다 */
const mulberry32 = (seed) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const iso = (d) => d.toISOString().slice(0, 10);
const dateAt = (offset) => new Date(END_DATE.getTime() - offset * 864e5);
const ago = (n) => iso(dateAt(n));

const CHANNELS = {
  naver_sa: { id: 'naver_sa', name: '네이버 파워링크', color: 'var(--c1)' },
  shopping: { id: 'shopping', name: '네이버 쇼핑검색', color: 'var(--c2)' },
  meta: { id: 'meta', name: '메타', color: 'var(--c3)' },
  google: { id: 'google', name: '구글', color: 'var(--c4)' },
  adboost: { id: 'adboost', name: '애드부스트', color: 'var(--c5)' },
  place: { id: 'place', name: '네이버 플레이스', color: 'var(--c2)' },
};

/* L(카테고리, 모티브[], 메시지[], 타깃, 소재, 가격대, 연출, 배경, 색감, 구성) */
const L = (category, motif, message, target, material, price_band, shot, background, tone, composition) =>
  ({ category, motif, message, target, material, price_band, shot, background, tone, composition });
const M = '중가(2~4.5만)', H = '고가(4.5만~)', Lo = '저가(~2만)';

/* 채널 cost: 일 평균 광고비, cpc, cvr, aov(전환 1건 매출), trend: 연간 성장 / ads: [이름, 채널, 채널 내 비중, ROAS 배수, 그룹, 라벨] */
const INDUSTRIES = {
  commerce: {
    id: 'commerce', brand: '루미에 쥬얼리', type: '스마트스토어 커머스', seed: 11,
    revLabel: '매출', convLabel: '구매', convUnit: '건', margin: 40, adShare: 0.29, totalLabel: '스토어 전체 매출', monthlyGoal: 9000000,
    channels: [
      { ...CHANNELS.shopping, cost: 10600, cpc: 210, cvr: 0.022, aov: 31000, trend: 1.25 },
      { ...CHANNELS.naver_sa, cost: 9700, cpc: 185, cvr: 0.016, aov: 33000, trend: 1.08 },
      { ...CHANNELS.meta, cost: 7000, cpc: 320, cvr: 0.012, aov: 34000, trend: 0.95 },
      { ...CHANNELS.google, cost: 4200, cpc: 260, cvr: 0.020, aov: 32000, trend: 1.10 },
      { ...CHANNELS.adboost, cost: 4300, cpc: 150, cvr: 0.018, aov: 30000, trend: 1.15 },
    ],
    groupChannel: 'shopping',
    ads: [
      ['십자가 레이어드 실버925 남자 반지', 'shopping', 0.10, 1.0, '반지', L('반지', ['십자가', '레이어드'], ['없음'], '남자', '실버925', M, '착용샷', '흰배경', '실버', '단독')],
      ['포에버링 실버925 반지', 'shopping', 0.04, 3.4, '반지', L('반지', ['포에버링'], ['없음'], '무관', '실버925', H, '착용샷', '연출배경', '실버', '단독')],
      ['십자가 앙크 실버925 반지', 'shopping', 0.05, 2.2, '반지', L('반지', ['십자가'], ['없음'], '무관', '실버925', M, '단품', '흰배경', '실버', '단독')],
      ['페이퍼 체인 실버925 팔찌', 'shopping', 0.08, 1.4, '팔찌', L('팔찌', ['페이퍼체인'], ['없음'], '무관', '실버925', H, '착용샷', '연출배경', '실버', '단독')],
      ['스퀘어 민자 링 남녀공용 써지컬 반지', 'shopping', 0.03, 4.0, '반지', L('반지', ['사각', '민자'], ['남녀공용'], '공용', '써지컬스틸', Lo, '착용샷', '흰배경', '실버', '세트')],
      ['유기견 후원 하트 커플 써지컬 목걸이', 'shopping', 0.07, 0, '목걸이', L('목걸이', ['하트'], ['후원', '커플'], '커플', '써지컬스틸', Lo, '단품', '흰배경', '실버', '세트')],
      ['데이지 이단체인 팔찌', 'shopping', 0.09, 1.3, '팔찌', L('팔찌', ['데이지'], ['없음'], '여자', '실버925', M, '착용샷', '연출배경', '실버', '단독')],
      ['미니 하트 목걸이', 'shopping', 0.08, 0.9, '목걸이', L('목걸이', ['하트'], ['없음'], '여자', '실버925', M, '단품', '흰배경', '실버', '단독')],
      ['타이니 은 팔찌', 'shopping', 0.06, 0.4, '팔찌', L('팔찌', ['기타'], ['없음'], '여자', '실버925', Lo, '단품', '흰배경', '실버', '단독')],
      ['볼체인 각인 팔찌', 'shopping', 0.07, 1.0, '팔찌', L('팔찌', ['볼체인'], ['각인'], '무관', '써지컬스틸', Lo, '단품', '흰배경', '실버', '단독')],
      ['골드 하트 써지컬 귀걸이', 'shopping', 0.05, 0.7, '귀걸이', L('귀걸이', ['하트'], ['없음'], '여자', '써지컬스틸', Lo, '단품', '연출배경', '골드', '세트')],
      ['유기동물 후원 팔찌', 'naver_sa', 0.30, 1.5, '팔찌', L('팔찌', ['기타'], ['후원'], '무관', '써지컬스틸', Lo, '착용샷', '연출배경', '실버', '단독')],
      ['실버925 각인 반지', 'naver_sa', 0.25, 0.6, '반지', L('반지', ['기타'], ['각인'], '무관', '실버925', M, '단품', '흰배경', '실버', '단독')],
      ['커플 체인 팔찌', 'naver_sa', 0.20, 0.9, '팔찌', L('팔찌', ['체인'], ['커플'], '커플', '써지컬스틸', Lo, '착용샷', '흰배경', '골드', '세트')],
      ['실버925 레이어드 팔찌', 'naver_sa', 0.25, 1.2, '팔찌', L('팔찌', ['레이어드'], ['없음'], '여자', '실버925', M, '착용샷', '연출배경', '실버', '단독')],
      ['후원 스토리 영상 A', 'meta', 0.40, 1.3, '메타', null],
      ['언박싱 릴스 B', 'meta', 0.35, 0.55, '메타', null],
      ['착용샷 카루셀 C', 'meta', 0.25, 1.05, '메타', null],
    ],
  },
  local: {
    id: 'local', brand: '온기 식당', type: '성수동 레스토랑', seed: 23,
    revLabel: '예약 매출', convLabel: '예약', convUnit: '팀', margin: 55, adShare: 0.22, totalLabel: 'POS 전체 매출', monthlyGoal: null,
    channels: [
      { ...CHANNELS.place, cost: 9000, cpc: 320, cvr: 0.030, aov: 60000, trend: 1.2 },
      { ...CHANNELS.naver_sa, cost: 7000, cpc: 380, cvr: 0.020, aov: 60000, trend: 1.05 },
      { ...CHANNELS.meta, cost: 5500, cpc: 450, cvr: 0.018, aov: 60000, trend: 1.1 },
      { ...CHANNELS.google, cost: 3000, cpc: 400, cvr: 0.015, aov: 60000, trend: 1.0 },
    ],
    ads: [
      ['대표 사진 · 한상차림', 'place', 0.55, 1.2, '플레이스', null], ['예약 쿠폰 소식', 'place', 0.45, 0.9, '플레이스', null],
      ['성수 데이트 식당', 'naver_sa', 0.40, 1.5, '검색', null], ['성수 맛집', 'naver_sa', 0.35, 0.6, '검색', null], ['성수 단체 예약', 'naver_sa', 0.25, 1.1, '검색', null],
      ['시그니처 플레이팅 릴스', 'meta', 0.50, 1.25, '메타', null], ['주말 브런치 카루셀', 'meta', 0.50, 0.7, '메타', null], ['지역 검색 광고', 'google', 1.0, 1.0, '구글', null],
    ],
  },
  lead: {
    id: 'lead', brand: '한결 인테리어', type: '시공 B2B 리드', seed: 37,
    revLabel: '계약액', convLabel: '상담', convUnit: '건', margin: 25, adShare: 1.0, totalLabel: '계약액 (상담→계약 10%)', monthlyGoal: null,
    channels: [
      { ...CHANNELS.naver_sa, cost: 48000, cpc: 3200, cvr: 0.055, aov: 320000, trend: 1.1 },
      { ...CHANNELS.meta, cost: 36000, cpc: 2600, cvr: 0.035, aov: 280000, trend: 0.9 },
      { ...CHANNELS.google, cost: 24000, cpc: 3800, cvr: 0.060, aov: 340000, trend: 1.2 },
    ],
    ads: [
      ['30평 인테리어 견적', 'naver_sa', 0.40, 1.5, '검색', null], ['아파트 리모델링 견적', 'naver_sa', 0.35, 0.6, '검색', null], ['구축 올수리', 'naver_sa', 0.25, 1.1, '검색', null],
      ['시공 전후 비교 영상 A', 'meta', 0.45, 1.3, '메타', null], ['견적 비교 B', 'meta', 0.35, 0.5, '메타', null], ['고객 후기 카루셀 C', 'meta', 0.20, 1.0, '메타', null],
      ['인테리어 업체 검색', 'google', 0.65, 1.2, '구글', null], ['브랜드 검색', 'google', 0.35, 1.8, '구글', null],
    ],
  },
};

const WEEKDAY = [0.82, 1.06, 1.08, 1.05, 1.02, 1.12, 0.85]; // 일~토 (커머스 평일 강세)

const genChannelDays = (ch, rand) => Array.from({ length: DAYS }, (_, i) => {
  const offset = DAYS - 1 - i;
  const d = dateAt(offset);
  const growth = Math.pow(ch.trend, (DAYS - offset) / 365);
  const cost = Math.round(ch.cost * WEEKDAY[d.getUTCDay()] * growth * (0.75 + rand() * 0.5));
  const clicks = Math.round(cost / (ch.cpc * (0.9 + rand() * 0.2)));
  const conv = Math.round(clicks * ch.cvr * (0.7 + rand() * 0.6) * 100) / 100;
  const rev = Math.round(conv * ch.aov * (0.85 + rand() * 0.3));
  return { date: iso(d), cost, clicks, conv, rev };
});

/* 소재 일별 — 채널 일별을 비중대로 나누고, 구매는 정수 건수로 (실제처럼 띄엄띄엄) */
const genCreatives = (ind, byChannel, rand) => {
  const ads = ind.ads.map(([name, channelId, , , group, labels], i) => ({ id: `${ind.id}-${i}`, name, group, channelId, image: '', labels }));
  const daily = {};
  for (let k = AD_DAYS - 1; k >= 0; k -= 1) {
    const date = ago(k), idx = DAYS - 1 - k;
    const rows = ind.ads.map(([, chId, share, mult], i) => {
      const ch = ind.channels.find((c) => c.id === chId), day = byChannel[chId][idx];
      const cost = Math.round(day.cost * share * (0.7 + rand() * 0.6));
      const clk = Math.round(day.clicks * share * (0.7 + rand() * 0.6));
      const expConv = day.cost ? (cost * (day.rev / day.cost) * mult) / ch.aov : 0;
      const conv = Math.floor(expConv + rand());
      return [i, clk, cost, conv, Math.round(conv * ch.aov * (0.85 + rand() * 0.3))];
    }).filter((r) => r[1] || r[2] || r[3]);
    if (rows.length) daily[date] = rows;
  }
  return { coverage: { from: ago(AD_DAYS - 1), to: ago(0) }, ads, daily, totals28: null, window28: null, labeled_images: ads.filter((a) => a.labels).length };
};

/* 그룹 = 그룹 채널 소재들의 구매·매출 합 */
const genGroups = (ind, creatives) => {
  if (!ind.groupChannel) return { groups: [], groupDaily: {} };
  const names = [...new Set(creatives.ads.filter((a) => a.channelId === ind.groupChannel).map((a) => a.group))];
  const groups = names.map((n, i) => ({ id: `g${i}`, name: n }));
  const groupDaily = Object.fromEntries(Object.entries(creatives.daily).map(([date, rows]) => {
    const acc = {};
    rows.forEach(([i, , , conv, rev]) => {
      const a = creatives.ads[i];
      if (a.channelId !== ind.groupChannel) return;
      const gi = names.indexOf(a.group);
      acc[gi] = [gi, (acc[gi] ? acc[gi][1] : 0) + conv, (acc[gi] ? acc[gi][2] : 0) + rev];
    });
    return [date, Object.values(acc)];
  }));
  return { groups, groupDaily };
};

/* ---------- 운영 데이터 (최적화 제안·변경 이력·규칙) ---------- */
const APPROVALS = {
  commerce: { count: 12, summary: '입찰 인상 5 · 인하 6 · OFF 1', effect: '승인 시 예상: 주 광고비 −9% · 매출 유지', items: [
    ['off', 'OFF', '타이니 은 팔찌', '클릭 24 · 구매 0, 4주 누적 비용 3.1만 원 > 객단가', 'OFF 제안 (승인 전엔 유지)'],
    ['up', '+15%', '유기동물 후원 팔찌', 'ROAS 480%, 목표의 1.6배', '입찰 15% 상향, 상한 CPC 210원'],
    ['down', '−10%', '실버925 각인 반지', 'ROAS 180%, 목표 300% 미달 2주 연속', '입찰 10% 하향 (예상 절감 주 1.2만 원)'],
    ['up', '+10%', '포에버링 실버925 반지', 'ROAS 1,120%, 클릭 점유 낮음', '입찰 10% 상향'],
    ['down', '−10%', '미니 하트 목걸이', 'ROAS 210%, 손익분기 250% 미달', '입찰 10% 하향'],
    ['down', '−8%', '골드 하트 써지컬 귀걸이', 'ROAS 190%', '입찰 8% 하향']] },
  local: { count: 8, summary: '플레이스 입찰 5 · 시간대 예산 2 · OFF 1', effect: '승인 시 예상: 주 광고비 −6% · 예약 +3팀', items: [
    ['down', '−10%', '성수 맛집', '예약당 4,900원, 목표 3,500원 초과 2주 연속', '입찰 10% 하향'],
    ['up', '+15%', '성수 데이트 식당', '예약당 2,100원, 목표의 60%', '입찰 15% 상향'],
    ['up', '+20%', '금·토 18~20시', '시간대 예약 전환 평균의 2.1배', '시간대 예산 +20% (자정 원복)']] },
  lead: { count: 11, summary: '입찰 7 · 소재 리프레시 2 · OFF 2', effect: '승인 시 예상: 주 광고비 −7% · 상담 +3건', items: [
    ['fresh', '리프레시', '메타 소재 "견적 비교 B"', '빈도 3.4 · CTR −31% · CPC +22% 동시 충족 (소재 피로도)', '연출 다른 2편으로 교체 (활성 소재 수 유지)'],
    ['down', '−10%', '아파트 리모델링 견적', '상담당 24,000원, 목표 15,000원 초과 2주 연속', '입찰 10% 하향'],
    ['up', '+15%', '30평 인테리어 견적', '상담당 9,800원, 목표의 65%', '입찰 15% 상향']] },
};
const hist = (applied, count, counts, b, a) => ({ date: applied, applied_at: applied, count, counts,
  before: { days: 7, cost: b[0], rev: b[1], conv: b[2], roas: Math.round((b[1] / b[0]) * 100) }, after: { days: 7, cost: a[0], rev: a[1], conv: a[2], roas: Math.round((a[1] / a[0]) * 100) } });
const HISTORY = {
  commerce: [hist(ago(32), 30, { up: 14, down: 13, off: 1 }, [199106, 329600, 15], [144155, 272400, 12]), hist(ago(11), 22, { up: 14, down: 8, off: 0 }, [177219, 851400, 26], [164618, 871200, 27]), hist(ago(4), 20, { up: 9, down: 11, off: 0 }, [181849, 869400, 25], [152300, 902100, 27])],
  local: [hist(ago(4), 18, { up: 7, down: 10, off: 1 }, [118000, 1240000, 21], [93000, 1290000, 22])],
  lead: [hist(ago(4), 24, { up: 8, down: 14, off: 2 }, [395000, 1450000, 5], [340000, 1820000, 6])],
};
const TIMELINE = {
  commerce: [[0, 'rule', '규칙 엔진: 성과 부스트 · 주말 PC 억제(제안)', '실버925 상품 PC 100→120·MO 120→144 · 자정 원복 완료'], [1, 'weight', '시간대 입찰 가중치 +20% 조정 · 1개 그룹', '유기동물 후원 (자정 원복)'],
    [2, 'pc', 'PC 지면 주간 점검 · ROAS 236%', '손익분기 미달 1주차 — 관찰'], [4, 'apply', '입찰 조정 20건 적용 (승인 후)', '7일 뒤 변경 전후 성과에서 효과 확인'], [5, 'propose', '주간 입찰 제안 20건 생성', '카톡 승인 버튼 발송'],
    [7, 'weight', '시간대 입찰 가중치 +20% 조정 · 1개 그룹', '실버925 상품 (자정 원복)'], [10, 'gap', '수집 누락', '네이버 API 응답 지연 — 판정 제외'], [11, 'apply', '입찰 조정 22건 적용 (승인 후)', ''],
    [12, 'propose', '주간 입찰 제안 22건 생성', ''], [15, 'rule', '규칙 엔진: 비 오는 날 모바일', '모바일 +10% · 자정 원복 완료'], [32, 'apply', '입찰 조정 30건 적용 (승인 후)', '']],
  local: [[0, 'weight', '점심 시간대 가중치 조정', '11~13시 플레이스 입찰 +20% (14시 원복)'], [4, 'apply', '입찰 조정 18건 적용 (승인 후)', ''], [5, 'propose', '주간 입찰 제안 18건 생성', '카톡 승인 버튼 발송']],
  lead: [[1, 'apply', '메타 소재 1편 리프레시', '피로도 3조건 충족 → 연출 다른 2편 교체'], [4, 'apply', '입찰 조정 24건 적용 (승인 후)', ''], [5, 'propose', '주간 입찰 제안 24건 생성', '카톡 승인 버튼 발송']],
};
const daysAgo = (list) => list.map(ago);
const RULES = { region: '서울', last_run: `${ago(0)}T13:02`, evaluated_dates: daysAgo(Array.from({ length: 30 }, (_, i) => i)), rules: [
  { id: 'perf_boost', name: '성과 부스트', mode: 'auto', enabled: true, desc: '어제 구매완료 ROAS 500%↑ + 지출 3천 원↑ → 가중치 +20%, 자정 원복', fired_dates: daysAgo([0, 1, 3, 6, 7, 9, 13, 16, 20, 24, 27]) },
  { id: 'rain_mobile', name: '비 오는 날 모바일', mode: 'auto', enabled: true, desc: '서울 강수확률 70%↑ → 모바일 가중치 +10%, 자정 원복', fired_dates: daysAgo([5, 15, 22]) },
  { id: 'weekend_pc', name: '주말 PC 억제', mode: 'propose', enabled: true, desc: '토·일 PC 가중치 −30% 제안', fired_dates: daysAgo([0, 1, 7, 8, 14, 15]) },
  { id: 'anomaly', name: '이상 감지', mode: 'alert', enabled: true, desc: '지출 7일 평균 1.7배·CPC 1.5배·노출 0·수집 누락 → 카톡 즉시', fired_dates: daysAgo([10]) },
  { id: 'temp_extreme', name: '한파·폭염', mode: 'alert', enabled: true, desc: '−5℃ 이하·33℃ 이상 → 시즌 소재 제안', fired_dates: [] }] };

const opsFor = (id) => {
  const a = APPROVALS[id];
  return {
    approvals: { status: 'pending', date: ago(5), expires: iso(new Date(END_DATE.getTime() + 2 * 864e5)), count: a.count, counts: null, summary: a.summary, effect: a.effect,
      items: a.items.map(([dir, dirText, name, reason, act]) => ({ dir, dirText, name, reason, act })) },
    history: HISTORY[id],
    timeline: TIMELINE[id].map(([n, type, title, detail]) => ({ date: ago(n), type, title, detail })),
    rules: id === 'commerce' ? RULES : null,
    weather: { location: { name: '서울' }, today: { rain_prob: 20, tmin: 9, tmax: 19 }, tomorrow: { rain_prob: 70, tmin: 8, tmax: 15 } },
    pending: [], generatedAt: `${ago(0)}T09:40:00+09:00`,
  };
};

const buildIndustry = (key) => {
  const ind = INDUSTRIES[key];
  const rand = mulberry32(ind.seed);
  const byChannel = Object.fromEntries(ind.channels.map((ch) => [ch.id, genChannelDays(ch, rand)]));
  const days = Array.from({ length: DAYS }, (_, i) => {
    const rows = ind.channels.map((ch) => byChannel[ch.id][i]);
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
    const adRev = sum('rev');
    const total = Math.round((adRev / ind.adShare) * (0.9 + rand() * 0.2));
    return { date: rows[0].date, cost: sum('cost'), clicks: sum('clicks'), conv: sum('conv'), adRev, total: Math.max(total, adRev) };
  });
  const creatives = genCreatives(ind, byChannel, rand);
  const bep = Math.round((100 / ind.margin) * 100);
  return { ...ind, live: false, byChannel, days, bep, target: Math.round((bep * 1.2) / 10) * 10, creatives, ...genGroups(ind, creatives),
    firstDate: days[0].date, lastDate: days[days.length - 1].date, ops: opsFor(key) };
};

const DATA = Object.fromEntries(Object.keys(INDUSTRIES).map((k) => [k, buildIndustry(k)]));
window.MARTISAN_DATA = { DATA, END_DATE: iso(END_DATE), LIVE: false };
})();
