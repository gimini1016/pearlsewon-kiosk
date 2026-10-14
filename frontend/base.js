// Shared menu helpers, local ordering rules, and flavour map.
const $ = s => document.querySelector(s);
const won = n => n.toLocaleString('ko-KR') + '원';
const items = D.items, byId = Object.fromEntries(items.map(i => [i.id, i]));
const O = D.options, DEF = O.menu_defaults;
const drinks = items.filter(i => i.category !== '디저트');
const CATS = ['달달', '상큼', '진한', '부드러운'];
const CAT = { '달달': ['--sweet', '흑당처럼 진하게 단'], '상큼': ['--tangy', '과일처럼 새콤한'], '진한': ['--rich', '커피·차처럼 진한'], '부드러운': ['--mild', '우유처럼 순한'] };
const catOf = i => ((DEF[i.id] && DEF[i.id].taste_categories) || [])[0];
const color = c => `var(${CAT[c][0]})`;
const milk = i => i.allergens.includes('우유');
const caf = i => i.caffeine_mg || 0;
const rule = id => O.rules.find(x => x.id === id).msg;

function rag() {}
function count() {}
function decide() { S.dec++; }
function say(m, notes) { $('#m').innerHTML = m; $('#notes').innerHTML = (notes || []).map(n => `<p class="n">${n}</p>`).join(''); }
const B = $('#body');
const btn = (cls, html, fn, attrs) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html; b.onclick = () => { fn(); }; if (attrs) Object.assign(b, attrs); return b; };
const box = (cls, html) => { const d = document.createElement('div'); if (cls) d.className = cls; if (html) d.innerHTML = html; return d; };

const SITU = {
  '운동 직전': { re: /운동|헬스|러닝/, pick: i => caf(i) >= 60 && !milk(i) },
  '졸릴 때·밤샘 공부': { re: /졸|밤샘|공부|피곤|잠 ?깨/, pick: i => caf(i) >= 120 },
  '저녁·잠들기 전': { re: /저녁|자기 전|잠들|카페인 ?없/, pick: i => caf(i) === 0 },
  '기분이 꿀꿀할 때': { re: /꿀꿀|우울|기분|스트레스/, pick: i => i.taste['단맛'] >= 4 },
  '더운 날': { re: /덥|더운|더워/, pick: i => i.temperatures.includes('ICE') && (i.taste['신맛'] >= 2 || i.category === '스무디·요거트') },
  '추운 날': { re: /춥|추운|추워/, pick: i => i.temperatures.includes('HOT') },
  '식후': { re: /식후|밥 ?먹|점심 ?먹|느끼/, pick: i => i.taste['단맛'] <= 2 && !milk(i) },
  '당을 줄이는 중': { re: /다이어트|당 ?줄|살 ?빼|칼로리/, pick: i => i.taste['단맛'] <= 1 },
  '우유를 피해야 할 때': { re: /우유 ?알레르기|우유 ?못|유당|우유 ?빼/, pick: i => !milk(i) },
  '처음 왔을 때': { re: /처음|뭐가 맛있/, pick: i => ['베스트', '시그니처', '사장 추천'].includes(i.badge) },
};
const TASTE_RE = { '달달': /달달|달콤|단 ?거/, '상큼': /상큼|새콤|과일/, '진한': /진한|진하게|쌉쌀|씁쓸/, '부드러운': /부드러|고소/ };
const LESS_RE = /안 ?달|덜 ?달|안 ?단|덜 ?단|달지 ?않|단 ?거 ?싫|단 ?게 ?싫/;

let S;
function reset() {
  S = { stage: 'where', where: null, cat: null, situ: null, less: false, pool: [], page: 0, rerolls: 0, item: null, cfg: null, cart: [], dec: 0 };
  count(); show();
}

function sugarAdjustable(i) { const o = O.sugar.overrides[i.id]; return O.sugar.categories.includes(i.category) && !(o && o.levels.length === 0); }
const lessOk = i => sugarAdjustable(i) || i.taste['단맛'] <= 2;
function buildPool() {
  let p = drinks.filter(i => !i.sold_out);
  if (S.situ) p = p.filter(SITU[S.situ].pick);
  if (S.cat) p = p.filter(i => catOf(i) === S.cat);
  if (S.less) p = p.filter(lessOk);
  const rank = i => (['베스트', '시그니처'].includes(i.badge) ? 0 : i.badge ? 1 : 2);
  return p.sort((a, b) => (S.less ? a.taste['단맛'] - b.taste['단맛'] : 0) || rank(a) - rank(b));
}
const firstSitu = i => D.situ[i.id].split(',')[0];
function reason(i) {
  if (S.situ === '운동 직전' || S.situ === '졸릴 때·밤샘 공부') return `카페인 ${caf(i)}mg · ${firstSitu(i)}`;
  if (S.situ === '저녁·잠들기 전') return `카페인 없어요 · ${firstSitu(i)}`;
  if (S.situ === '우유를 피해야 할 때') return `우유가 안 들어가요 · ${firstSitu(i)}`;
  return firstSitu(i);
}
function defaultsFor(i) {
  const d = DEF[i.id] || {};
  return { size: d.size || Object.keys(i.prices)[0], temp: d.temp || null, sugar: d.sugar ?? null, ice: d.ice || null,
    tops: [...(d.toppings || [])], incl: [...(d.toppings || [])], shot: 0, decaf: false, syrup: null, oat: false,
    seal: S.where === '포장' && i.category !== '디저트' ? '실링' : null };
}
const extra = id => O.extras.find(e => e.id === id);
function priceOf(i, c) {
  let p = i.prices[c.size] ?? Object.values(i.prices)[0];
  c.tops.filter(t => !c.incl.includes(t)).forEach(t => p += D.toppings.find(x => x.name === t).price);
  p += c.shot * extra('shot').price; if (c.decaf) p += extra('decaf').price; if (c.syrup) p += extra(c.syrup).price; if (c.oat) p += extra('oat_milk').price;
  return p;
}
/* 컵 표기처럼 기본에서 바뀐 것만 글로 */
function diffText(i, c) {
  if (i.category === '디저트') return '단품';
  const b = defaultsFor(i), a = [];
  if (c.size !== b.size) a.push(c.size + ' 사이즈'); if (c.temp !== b.temp) a.push(c.temp);
  if (c.sugar !== b.sugar && c.sugar !== null) a.push(`당도 ${c.sugar}`); if (c.ice !== b.ice && c.ice) a.push(`얼음 ${c.ice}`);
  b.incl.filter(t => !c.tops.includes(t)).forEach(t => a.push(`${t} 빼고`)); c.tops.filter(t => !b.incl.includes(t)).forEach(t => a.push(`${t} 추가`));
  if (c.shot) a.push(`샷 +${c.shot}`); if (c.decaf) a.push('디카페인'); if (c.syrup) a.push(extra(c.syrup).name.replace(' 추가', '')); if (c.oat) a.push('오트밀크');
  if (c.seal && c.seal !== b.seal) a.push(c.seal);
  return a.length ? a.map(x => `<em>${x}</em>`).join(' · ') : '추천 세트 그대로';
}

function show() {
  B.innerHTML = ''; B.scrollTop = 0; memo();
  ({ where, fork, order, taste, picks, full, cup, cart, pay, done })[S.stage]();
}
function where() {
  say('안녕하세요, 펄세권이에요. 포장이세요, 드시고 가세요?');
  const r = box('row2');
  r.append(btn('big', '<b>포장</b><span>실링으로 드려요</span>', () => { S.where = '포장'; decide(); S.stage = 'fork'; show(); }),
           btn('big', '<b>매장</b><span>빈자리 ' + D.seats + '석</span>', () => { S.where = '매장'; decide(); S.stage = 'fork'; show(); }));
  B.append(r); rag(null);
}
function fork() {
  say('드실 거 정하셨어요, 골라 드릴까요?');
  B.append(btn('big', '<b>정했어요</b><span>메뉴 이름을 한 문장으로 말씀해 주세요. 여러 잔도 돼요</span>', () => { decide(); S.stage = 'order'; show(); }),
           btn('big pri', '<b>골라 주세요</b><span>맛만 고르면 나머지는 추천해 드려요</span>', () => { decide(); S.stage = 'taste'; show(); }));
  rag(null);
}
function order() {
  say('편하게 말씀해 주세요. 말씀 안 하신 옵션은 추천대로 채울게요.');
  B.append(box('lbl', '이렇게 말해 보세요'));
  const c = box('chips');
  ['흑당 밀크티 대 사이즈, 얼음 적게', '아아 두 잔이랑 타로 밀크티 하나', '청포도 에이드 있어요?'].forEach(t => c.append(btn('chip', t, () => hear(t))));
  B.append(c, btn('ghost', '메뉴 전체 볼래요', () => { decide(); S.stage = 'full'; show(); }));
  rag(null); setTimeout(() => $('#in').focus(), 0);
}
function drawMap(focus, mini) {
  const P0 = 34, SPAN = 252, xy = (s, r) => [P0 + s / 5 * SPAN, P0 + SPAN - r / 5 * SPAN], pos = {}, g = {};
  const list = drinks.filter(i => !i.sold_out);
  list.forEach(i => { const k = i.taste['단맛'] + ',' + i.taste['진함']; (g[k] = g[k] || []).push(i); });
  Object.values(g).forEach(l => l.forEach((i, n) => { const [x, y] = xy(i.taste['단맛'], i.taste['진함']); const a = n / l.length * Math.PI * 2, r = l.length > 1 ? 11 : 0; pos[i.id] = [x + Math.cos(a) * r, y + Math.sin(a) * r]; }));
  let s = '';
  for (let k = 0; k <= 5; k++) { const v = P0 + k / 5 * SPAN; s += `<line class="gl" x1="${v}" y1="${P0}" x2="${v}" y2="${P0 + SPAN}"/><line class="gl" x1="${P0}" y1="${v}" x2="${P0 + SPAN}" y2="${v}"/>`; }
  const c = P0 + SPAN / 2;
  s += `<rect class="frame" x="${P0}" y="${P0}" width="${SPAN}" height="${SPAN}"/><line class="ax" x1="${c}" y1="${P0 + 6}" x2="${c}" y2="${P0 + SPAN - 6}"/><line class="ax" x1="${P0 + 6}" y1="${c}" x2="${P0 + SPAN - 6}" y2="${c}"/>`;
  s += `<text class="axl" x="${c}" y="22" text-anchor="middle">진한</text><text class="axl" x="${c}" y="308" text-anchor="middle">가벼운</text><text class="axl" x="16" y="${c}" text-anchor="middle">덜 단</text><text class="axl" x="304" y="${c}" text-anchor="middle">달달</text>`;
  if (S.less) { const lx = P0 + 2 / 5 * SPAN; s += `<rect x="${P0}" y="${P0}" width="${lx - P0}" height="${SPAN}" fill="var(--mark)" opacity=".06"/><line x1="${lx}" y1="${P0}" x2="${lx}" y2="${P0 + SPAN}" stroke="var(--mark)" stroke-dasharray="3 3"/>`; }
  // 이름표 대신: 고른 맛은 반짝이는 펄, 후보는 번호 펄(카드 번호와 같아요)
  list.forEach(i => { const [x, y] = pos[i.id], on = focus.includes(i.id); if (mini && on) return; s += `<circle class="${on ? '' : 'dim'}" cx="${x}" cy="${y}" r="${on ? 7 : 5.5}" fill="${color(catOf(i))}"/>` + (on ? `<circle cx="${x - 2.2}" cy="${y - 2.2}" r="1.8" fill="var(--screen)" opacity=".75"/>` : ''); });
  if (mini) focus.forEach((id, n) => { const [x, y] = pos[id]; s += `<circle cx="${x}" cy="${y}" r="11" fill="${color(catOf(byId[id]))}" stroke="var(--screen)" stroke-width="2"/><text class="no" x="${x}" y="${y + 4}" text-anchor="middle">${n + 1}</text>`; });
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 320 320'); el.setAttribute('class', 'map'); el.setAttribute('role', 'img'); el.setAttribute('aria-label', '가로는 단맛, 세로는 진함인 메뉴 맛 지도');
  el.innerHTML = s;
  // SVG 높이를 브라우저마다 다르게 잡지 않도록 정사각형 상자에 넣어요
  const wrap = box('mapbox'); wrap.append(el); return wrap;
}
function legacyTaste() {
  say('어떤 맛이 당기세요? 하나만 골라 주세요.');
  const focus = drinks.filter(i => !i.sold_out && (!S.less || lessOk(i))).map(i => i.id);
  B.append(drawMap(focus), box('scale', '<span>단맛 0</span><i></i><span>5</span>'));
  const cs = box('cats');
  CATS.forEach(c => cs.append(btn('cat', `<span class="dot" style="background:${color(c)}"></span><span><b>${c}</b><br><small>${CAT[c][1]}</small></span><small>${drinks.filter(i => !i.sold_out && catOf(i) === c).length}</small>`, () => { S.cat = c; S.situ = null; decide(); goPicks(); })));
  B.append(cs);
  const t = box('chips');
  t.append(btn('chip' + (S.less ? ' on' : ''), '덜 달게', () => { S.less = !S.less; show(); }));
  B.append(t, box('lbl', '맛 대신 상황을 말해도 돼요'));
  const sc = box('chips');
  ['운동 직전이에요', '저녁이라 카페인 없이', '기분이 꿀꿀해요', '처음이에요'].forEach(x => sc.append(btn('chip', x, () => hear(x))));
  B.append(sc); rag(null);
}
function goPicks() { S.pool = buildPool(); S.page = 0; S.rerolls = 0; S.stage = 'picks'; show(); }
function legacyPicks() {
  const p = S.pool.slice(S.page * 3, S.page * 3 + 3);
  if (!p.length) { S.stage = 'full'; show(); say('조건에 맞는 메뉴가 없어서 전체 메뉴를 보여 드려요.'); return; }
  const what = S.situ ? `‘${S.situ}’엔` : S.cat ? `${S.cat}${S.less ? ', 덜 단' : ''} 맛 중에` : '덜 단 메뉴 중에';
  say(`${what} 이 ${p.length}개가 잘 맞아요.`);
  B.append(drawMap(p.map(i => i.id), true));
  p.forEach((i, n) => B.append(btn('card', `<span class="r"><b><span class="no" style="background:${color(catOf(i))}">${n + 1}</span>${i.name}${i.badge ? `<span class="tag">${i.badge}</span>` : ''}</b><span class="pr">${won(Object.values(i.prices)[0])}</span></span><span class="why">${reason(i)}</span>`, () => { decide(); choose(i); })));
  const left = 2 - S.rerolls, more = S.pool.length > (S.page + 1) * 3, r = box('row2');
  if (left > 0 && more) r.append(btn('ghost', `다른 추천 (${left}번 남음)`, () => { S.rerolls++; S.page++; decide(); show(); }));
  else r.append(btn('ghost', '베스트로 할게요', () => { decide(); choose(byId['black_milktea_pearl']); }));
  r.append(btn('ghost', '전체 보기', () => { decide(); S.stage = 'full'; show(); }));
  B.append(r);
  rag([...(S.situ ? [`<em>[상황]</em> ${S.situ}`] : []), ...(S.cat ? [`<em>필터</em> 맛 범주 = ${S.cat}`] : []), ...(S.less ? ['<em>필터</em> 당도 조절 가능하거나 단맛 2 이하'] : []), ...p.map(i => `<em>[메뉴]</em> ${i.name} · 어울리는 상황: ${D.situ[i.id]}`)]);
}
function legacyFull() {
  say('전체 메뉴를 맛별로 묶었어요.');
  [...CATS, '디저트'].forEach(c => {
    const list = c === '디저트' ? items.filter(i => i.category === '디저트') : drinks.filter(i => catOf(i) === c);
    const g = box('grp', `<h4><i style="background:${c === '디저트' ? 'var(--line)' : color(c)}"></i>${c}</h4>`), ch = box('chips');
    list.forEach(i => ch.append(btn('chip', i.name + (i.sold_out ? ' (품절)' : ''), () => { decide(); choose(i); }, { disabled: !!i.sold_out })));
    g.append(ch); B.append(g);
  });
  B.append(btn('ghost', '맛으로 골라 주세요', () => { S.stage = 'taste'; show(); }));
  rag(null);
}
function choose(i, cfg, lead, notes) {
  if (i.sold_out) { S.stage = 'taste'; show(); say(`${i.name}는 지금 품절이에요. 맛으로 비슷한 걸 골라 드릴까요?`); memo(5); return; }
  S.item = i; S.cfg = cfg || defaultsFor(i);
  if (!cfg && S.less && DEF[i.id] && DEF[i.id].sugar_less_sweet != null) S.cfg.sugar = DEF[i.id].sugar_less_sweet;
  if (i.category === '디저트') { addLine(i, S.cfg, 1); return; }
  S.stage = 'cup'; show(); if (lead || notes) say(lead || $('#m').innerHTML, notes);
}
function cup() {
  const i = S.item, c = S.cfg, b = defaultsFor(i);
  say(`${i.name}, 이대로 할까요? 바꿀 칸만 누르거나 말로 하세요.`);
  const w = box('cupwrap');
  const cp = box('cup', `<div class="straw"></div><div class="body2"></div><div class="tea" style="background:${color(catOf(i))}"></div>${c.tops.includes('펄') ? '<div class="pl"></div>' : ''}<div class="lid"></div>`);
  cp.setAttribute('aria-hidden', 'true');
  const mk = box('marks'), rows = [], cyc = (a, v) => a[(a.indexOf(v) + 1) % a.length];
  if (Object.keys(i.prices).length > 1) rows.push(['사이즈', c.size, b.size, () => c.size = cyc(Object.keys(i.prices), c.size)]);
  if (i.temperatures.length > 1) rows.push(['온도', c.temp, b.temp, () => { c.temp = cyc(i.temperatures, c.temp); c.ice = c.temp === 'ICE' && b.ice ? (c.ice || '보통') : null; }]);
  if (sugarAdjustable(i)) rows.push(['당도', c.sugar + '%', b.sugar + '%', () => c.sugar = cyc(O.sugar.levels, c.sugar)]);
  if (b.ice) rows.push(['얼음', c.ice || '없음', b.ice, () => { if (c.temp === 'ICE') c.ice = cyc(O.ice.levels, c.ice); }]);
  if (i.category === '커피') rows.push(['샷', c.shot ? `+${c.shot}` : '기본', '기본', () => c.shot = (c.shot + 1) % 3]);
  if (['커피', '밀크티'].includes(i.category) && milk(i)) rows.push(['우유', c.oat ? '오트밀크' : '우유', '우유', () => c.oat = !c.oat]);
  if (c.seal) rows.push(['포장', c.seal, b.seal, () => c.seal = cyc(['실링', '뚜껑'], c.seal)]);
  rows.forEach(([k, v, d, fn]) => { const r = box('mk' + (v !== d ? ' ch' : ''), `<span class="box"></span><span class="kk">${k}</span>`); r.append(btn('', v, () => { fn(); decide(); show(); })); mk.append(r); });
  const topsOk = O.toppings.categories.includes(i.category);
  if (topsOk) mk.append(box('mk' + (c.tops.join() !== b.tops.join() ? ' ch' : ''), `<span class="box"></span><span class="kk">토핑</span><span class="v">${c.tops.join(', ') || '없음'}</span>`));
  w.append(cp, mk); B.append(w);
  if (topsOk) { const t = box('chips'); D.toppings.forEach(x => t.append(btn('chip' + (c.tops.includes(x.name) ? ' on' : ''), x.name + (c.incl.includes(x.name) ? '' : ' +' + x.price), () => { if (c.tops.includes(x.name)) c.tops = c.tops.filter(y => y !== x.name); else if (c.tops.length < O.toppings.max_per_drink) c.tops.push(x.name); else { say('토핑은 한 잔에 3개까지예요.'); return; } decide(); show(); }))); B.append(t); }
  const fx = O.sugar.overrides[i.id];
  if (fx && fx.levels.length === 0) B.append(box('hint', fx.why + '.'));
  if (c.oat && (/폼/.test(i.name) || i.id === 'earlgrey_spanner' || c.tops.some(t => /폼/.test(t)))) B.append(box('hint', rule('oat_foam_milk')));
  B.append(box('total', `<span>합계</span><b>${won(priceOf(i, c))}</b>`), btn('go', '이대로 담기', () => { decide(); addLine(i, c, 1); }));
  rag([`<em>[메뉴]</em> ${i.name} · 추천 세트: ${b.size}${b.temp ? ', ' + b.temp : ''}${b.sugar !== null ? ', 당도 ' + b.sugar : ''}${b.ice ? ', 얼음 ' + b.ice : ''}`]);
}
function addLine(i, c, qty, quiet) {
  S.cart.push({ i, c: JSON.parse(JSON.stringify(c)), qty, price: priceOf(i, c) }); count();
  if (!quiet) { S.stage = 'cart'; show(); say(`${i.name} 담았어요. 더 드릴까요?`); }
}
function cart() {
  const cups = S.cart.reduce((s, l) => s + l.qty, 0), total = S.cart.reduce((s, l) => s + l.price * l.qty, 0);
  say(`지금 ${cups}개, ${won(total)}이에요. 맞으세요?`);
  S.cart.forEach(l => B.append(box('line', `<span class="q">${l.qty}×</span><span><b>${l.i.name}</b><small>${diffText(l.i, l.c)}</small></span><span class="pr">${won(l.price * l.qty)}</span>`)));
  B.append(box('total', `<span>합계</span><b>${won(total)}</b>`));
  const r = box('row2'); r.append(btn('ghost', '더 주문할게요', () => { decide(); S.cat = S.situ = null; S.less = false; S.stage = 'fork'; show(); }), btn('go', '결제할게요', () => { decide(); S.stage = 'pay'; show(); })); B.append(r);
  rag(null);
}
function pay() {
  say('어떻게 결제하실래요?');
  ['카드', 'QR', '쿠폰'].forEach(x => B.append(btn('big', `<b>${x}</b>${x === '쿠폰' ? '<span>' + D.policy['쿠폰'] + '</span>' : ''}`, () => { decide(); S.stage = 'done'; show(); })));
  rag(null);
}
function done() {
  const cups = S.cart.reduce((s, l) => s + l.qty, 0);
  say('주문 완료! 번호가 불리면 받아 가세요.');
  B.append(box('num', String(20 + Math.floor(Math.random() * 20))), box('hint', `${D.wait + cups}분 정도면 나와요.${S.where === '매장' ? ' 빈자리는 ' + D.seats + '석 있어요.' : ''}`), btn('ghost', '처음으로', reset));
  rag([`<em>[매장 정책]</em> 잘못 나온 메뉴 · ${D.policy['잘못 나온 메뉴']}`]);
}

/* 말로 하기: LLM 대신 키워드로 흉내 (조원 줄임말 사전 포함) */
const ALIASES = (() => {
  const a = items.map(i => [i.name.replace(/ \+ .*/, '').replace(/\s/g, ''), i.id]);
  const mine = [['흑버', 'brownsugar_milktea_pearl'], ['흑당', 'brownsugar_milktea_pearl'], ['타로', 'taro_milktea_pearl'], ['망고요구르트', 'mango_yogurt_whitepearl'], ['슈페너', 'earlgrey_spanner'], ['슈패너', 'earlgrey_spanner'], ['얼그레이슈패너', 'earlgrey_spanner'], ['아인슈페너', 'NONE'], ['버블티', 'ASK'], ['밀크티', 'ASK']];
  const taken = new Set(mine.map(m => m[0]));
  D.lexicon.forEach(w => { const it = items.find(i => i.name === w.kind), k = w.text.replace(/\s/g, ''); if (it && !taken.has(k)) a.push([k, it.id]); });
  a.push(...mine);
  return a.sort((x, y) => y[0].length - x[0].length);
})();
function findMenus(text) {
  let t = text.replace(/\s/g, ''); const out = [];
  for (const [al, id] of ALIASES) { let k; while ((k = t.indexOf(al)) >= 0) { out.push({ id, pos: k }); t = t.slice(0, k) + '#'.repeat(al.length) + t.slice(k + al.length); } }
  return out.sort((a, b) => a.pos - b.pos);
}
function applyText(i, c, text, msgs) {
  if (/대 ?사이즈|큰 ?거|라지|큰 ?걸/.test(text)) { if (i.prices['대']) c.size = '대'; else msgs.push(`${i.name}: ${rule('size_from_prices')}`); }
  if (/따뜻|핫|HOT|뜨거/i.test(text)) { if (i.temperatures.includes('HOT')) { c.temp = 'HOT'; c.ice = null; } else msgs.push(`${i.name}: ${rule('temp_from_menu')}`); }
  const ice = text.match(/얼음\s*(적게|많이|조금|많|빼)/);
  if (ice) { if (O.ice.not_categories.includes(i.category)) msgs.push(`${i.name}: ${rule('smoothie_no_ice')}`); else if (c.temp !== 'ICE') msgs.push(`${i.name}: ${rule('hot_no_ice')}`); else c.ice = /많/.test(ice[1]) ? '많이' : '적게'; }
  const sg = text.match(/당도\s*(\d+)/) || (LESS_RE.test(text) ? [0, '30'] : null);
  if (sg) { if (sugarAdjustable(i)) c.sugar = Math.max(0, ...O.sugar.levels.filter(l => l <= +sg[1])); else msgs.push(`${i.name}: ${O.sugar.overrides[i.id] ? rule('sugar_fixed') : rule('no_sugar_option')}`); }
  if (/펄\s*(빼|없이)/.test(text) && c.tops.includes('펄')) c.tops = c.tops.filter(t => t !== '펄');
  if (/펄\s*(추가|넣|올려)/.test(text)) { if (!O.toppings.categories.includes(i.category)) msgs.push(`${i.name}: ${rule('topping_scope')}`); else if (!c.tops.includes('펄')) c.tops.push('펄'); }
  if (/샷\s*추가/.test(text)) { if (i.category === '커피') c.shot = 1; else msgs.push(`${i.name}: ${rule('coffee_only')}`); }
  if (/오트/.test(text)) { if (!['커피', '밀크티'].includes(i.category) || !milk(i)) msgs.push(`${i.name}: ${rule('oat_needs_milk')}`); else c.oat = true; }
  if (/뚜껑/.test(text) && c.seal) c.seal = '뚜껑';
}
const SPLIT = /\s*(?:,|그리고|이랑|랑|하고|\s와\s|\s과\s)\s*/;
const TYPE_WORDS = ['에이드', '라떼', '스무디', '요구르트', '프라페', '주스', '쉐이크'];
const OPT_WORDS = /얼음\s*\S*|당도\s*\d*%?|샷\s*추가|오트\S*|디카페인|대\s*사이즈|큰\s*거|따뜻하게|아이스|펄\s*\S*|바닐라|헤이즐넛|카라멜|포장|매장|뚜껑/g;
const FILLER = /주문할게요?|주문할래요?|주문|주세요|줘요?|할게요?|할래요?|변경해서|바꿔서|담아|있어요?|없어요?|있나요?|되나요?|돼요?|가능해요?|\d+\s*(잔|개)|한\s*잔|하나|둘|두\s*잔|셋|세\s*잔|[?.,!~\s]/g;
function qtyOf(p) { const m = p.match(/(\d+)\s*(잔|개)/); if (m) return +m[1]; if (/둘|두\s*잔|두\s*개/.test(p)) return 2; if (/셋|세\s*잔|세\s*개/.test(p)) return 3; return 1; }
function suggest(core) {
  const bg = s => { const a = new Set(); for (let k = 0; k < s.length - 1; k++) a.add(s.slice(k, k + 2)); return a; };
  const A = bg(core); let best = null, sc = 0;
  items.forEach(i => { const Bs = bg(i.name.replace(/[\s+]/g, '')); let c = 0; A.forEach(x => Bs.has(x) && c++); const s = c / Math.max(A.size, 1); if (s > sc) { sc = s; best = i; } });
  return sc >= 0.2 ? best : null;
}
function readOrder(t) {
  const lines = [], unknown = [];
  t.split(SPLIT).filter(p => p.trim()).forEach(p => {
    const f = findMenus(p)[0], typeWord = TYPE_WORDS.find(w => p.includes(w));
    if (f && f.id === 'NONE') return unknown.push({ p: p.trim(), sug: byId['earlgrey_spanner'] });
    if (f && f.id === 'ASK') return unknown.push({ p: p.trim(), ask: true });
    if (f) { const i = byId[f.id]; if (typeWord && !i.name.includes(typeWord)) return unknown.push({ p: p.trim(), sug: i }); return lines.push({ i, q: qtyOf(p), seg: p }); }
    const core = p.replace(OPT_WORDS, '').replace(FILLER, '');
    if (core.length >= 2) unknown.push({ p: p.trim(), sug: suggest(core) });
    else if (lines.length) lines[lines.length - 1].seg += ' ' + p;
  });
  return { lines, unknown };
}
const josa = (w, a, b) => { const c = w.replace(/[^가-힣]/g, '').slice(-1).charCodeAt(0) - 0xac00; return w + (c >= 0 && c % 28 ? a : b); };
const shortName = p => p.replace(/\s*(\d+\s*(잔|개)|한\s*잔|하나|둘|두\s*잔|셋)\s*/g, ' ').replace(/\s*(주문할게요?|주문할래요?|주세요|줘요?|있어요?|없어요?|있나요?|되나요?|돼요?|파나요?|팔아요?)\s*\??$/g, '').replace(/\?/g, '').trim();
const unknownText = u => { const n = shortName(u.p); if (u.ask) return `${josa('‘' + n + '’', '은', '는')} 여러 가지가 있어요.`; if (u.sug) return `${josa('‘' + n + '’', '은', '는')} 메뉴에 없어요. 대신 ${josa(u.sug.name, '이', '가')} 있어요${u.sug.sold_out ? '(지금 품절)' : ''}.`; return `${josa('‘' + n + '’', '은', '는')} 메뉴에서 못 찾았어요.`; };

/* 자주 묻는 말 · 매장 정책은 RAG 문서에서 그대로 인용해요 */
const FAQ_RE = [[/실링/, '실링'], [/당도/, '당도'], [/화이트펄|펄/, '펄'], [/폼/, '폼']];
const POL_RE = [[/환불/, '환불'], [/쿠폰/, '쿠폰'], [/적립|스탬프/, '적립'], [/취소/, '주문 취소'], [/잘못 ?나/, '잘못 나온 메뉴']];
const offerCards = list => { B.innerHTML = ''; list.forEach(i => B.append(btn('card', `<span class="r"><b>${i.name}</b><span class="pr">${won(Object.values(i.prices)[0])}</span></span><span class="why">${firstSitu(i)}</span>`, () => { decide(); choose(i); }))); B.append(btn('ghost', '전체 보기', () => { S.stage = 'full'; show(); })); };

function legacyHear(text) {
  const t = text.trim(); if (!t) return;
  decide();
  if (/직원/.test(t)) return staff();
  if (/뭐예요|뭐에요|뭔가요|뭐야|차이|어떻게|되나요|가능/.test(t)) {
    const f = FAQ_RE.find(([re]) => re.test(t)), pl = POL_RE.find(([re]) => re.test(t));
    if (f && !findMenus(t).some(x => byId[x.id])) { say(D.faq[f[1]].replace(/^[^?]*\?\s*/, '')); rag([`<em>[자주 묻는 말]</em> ${f[1]}`]); memo(0); return; }
    if (pl) { say(D.policy[pl[1]]); rag([`<em>[매장 정책]</em> ${pl[1]}`]); memo(5); return; }
  }
  if (/전체|메뉴판|다 ?보여/.test(t)) { S.stage = 'full'; return show(); }
  if (S.stage === 'where') { if (/포장|가져|테이크/.test(t)) { S.where = '포장'; S.stage = 'fork'; return show(); } if (/매장|먹고|여기서/.test(t)) { S.where = '매장'; S.stage = 'fork'; return show(); } }
  if (S.stage === 'cup' && /^(네|응|좋아|그래|ㅇㅇ|이대로)/.test(t)) return addLine(S.item, S.cfg, 1);
  if (S.stage === 'cart' && /결제/.test(t)) { S.stage = 'pay'; return show(); }
  const found = findMenus(t);
  if (S.stage === 'picks' && !found.length && /다른 ?(거|걸|것)|별로|^또/.test(t)) {
    if (S.rerolls < 2 && S.pool.length > (S.page + 1) * 3) { S.rerolls++; S.page++; return show(); }
    S.stage = 'full'; show(); return say('더 추천할 메뉴가 없어서 전체 메뉴를 보여 드려요.');
  }
  if (S.stage === 'fork' && !found.length) { if (/정했|알아요/.test(t)) { S.stage = 'order'; return show(); } if (/골라|추천|모르|글쎄/.test(t)) { S.stage = 'taste'; return show(); } }
  // 컵 화면에서 메뉴 없이 옵션만 말하면, 지금 컵을 고쳐요(비평)
  if (S.stage === 'cup' && !found.length && (new RegExp(OPT_WORDS.source).test(t) || LESS_RE.test(t))) {
    const msgs = [], before = JSON.stringify(S.cfg); applyText(S.item, S.cfg, t, msgs);
    show(); say(JSON.stringify(S.cfg) !== before ? '말씀하신 칸만 바꿨어요. 이대로 할까요?' : '그 칸은 바꿀 수 없어요.', msgs); return;
  }
  const situ = Object.keys(SITU).find(k => SITU[k].re.test(t));
  const less = LESS_RE.test(t);
  const taste = Object.keys(TASTE_RE).find(k => TASTE_RE[k].test(t) && !(less && k === '달달'));
  if (!found.length && (situ || taste || less)) { S.less = less; S.situ = situ || null; S.cat = situ ? null : (taste || null); return goPicks(); }
  const { lines } = readOrder(t);
  const unknown = readOrder(t).unknown.filter(u => lines.length || u.sug || u.ask || /주세요|주문|줘|있어|없어|\?|잔/.test(t));
  if (lines.length || unknown.length) {
    if (S.stage === 'where') S.where = '포장';
    const offer = [...lines.map(l => l.i), ...unknown.map(u => u.sug).filter(Boolean)].filter((i, k, a) => a.indexOf(i) === k && !i.sold_out);
    const asking = /\?|있어|없어|있나|있을까|되나|파나요|팔아/.test(t) && !/주문|주세요|줘|할게|담아/.test(t);
    if (asking) {
      const ans = [...lines.map(l => l.i.sold_out ? `${l.i.name}는 지금 품절이에요.` : `${l.i.name} 있어요.`), ...unknown.map(unknownText)];
      memo(unknown.length ? 5 : 2); offerCards(offer); say(ans.join(' ') + (offer.length ? ' 담아 드릴까요?' : '')); rag(offer.map(i => `<em>[메뉴]</em> ${i.name}`)); return;
    }
    const msgs = [];
    lines.filter(l => l.i.sold_out).forEach(l => msgs.push(`${l.i.name}: ${rule('sold_out')}`));
    const ok = lines.filter(l => !l.i.sold_out);
    unknown.filter(u => !u.ask).forEach(u => msgs.push(unknownText(u)));
    if (!ok.length) {
      memo(5);
      if (unknown.some(u => u.ask)) { offerCards(['black_milktea_pearl', 'taro_milktea_pearl', 'brownsugar_milktea_pearl'].map(id => byId[id])); say('어떤 밀크티로 드릴까요? 처음이면 블랙 밀크티가 무난해요.', msgs); return; }
      const sold = lines.filter(l => l.i.sold_out).map(l => l.i);
      if (sold.length) {
        const s = sold[0], alike = drinks.filter(i => !i.sold_out && catOf(i) === catOf(s)).sort((a, b) => Math.abs(a.taste['단맛'] - s.taste['단맛']) - Math.abs(b.taste['단맛'] - s.taste['단맛'])).slice(0, 3);
        offerCards(alike); say(`${josa(s.name, '은', '는')} 지금 품절이에요. 맛이 비슷한 메뉴예요.`, msgs.filter(x => !/품절/.test(x))); return;
      }
      offerCards(offer); say('찾는 메뉴가 없어요. 비슷한 걸 보여 드릴게요.', msgs); return;
    }
    if (ok.length === 1 && ok[0].q === 1 && !unknown.length) {
      const i = ok[0].i, c = defaultsFor(i); applyText(i, c, ok[0].seg, msgs);
      return choose(i, c, '말씀하신 건 넣고, 나머지는 추천대로 채웠어요. 이대로 할까요?', msgs);
    }
    ok.forEach(l => { const c = defaultsFor(l.i); applyText(l.i, c, l.seg, msgs); addLine(l.i, c, l.q, true); });
    S.stage = 'cart'; show(); say('잔별로 나눠 담았어요. 말씀 안 하신 옵션은 추천대로 넣었어요.', msgs);
    return;
  }
  say('그건 제가 잘 몰라요. 대신 음료는 확실히 골라 드릴게요!'); memo(5);
}
function staff() { say('직원을 불렀어요. 잠시만 기다려 주세요.'); rag([`<em>[매장 정책]</em> 직원 호출 · ${D.policy['직원 호출']}`]); memo(5); }
