"""Query normalization and catalog constraints shared by retrieval and execution."""
import re
from decimal import Decimal


def compact(text):
    return re.sub(r'\s+', '', text or '')


SCENARIOS = [
    (r'목말|갈증|입이?말라|물마시고', '더운 날', '갈증 시원한 상큼한 음료'),
    (r'추워|추운|춥|따뜻|뜨거|몸.*녹', '추운 날', '따뜻한 음료 HOT'),
    (r'졸|밤샘|밤새|밤샐|잠깨|정신차', '졸릴 때·밤샘 공부', '졸릴 때 카페인'),
    (r'저녁(?!메뉴|밥|식사|뭐먹)|잠들|자기전|잠못|잠안올', '저녁·잠들기 전', '카페인 없는 음료'),
    (r'우유.*(못|빼|없이|없는|알레르|알러)|유당', '우유를 피해야 할 때', '우유 없는 음료 오트밀크 폼'),
    (r'운동|헬스|러닝', '운동 직전', '운동 직전 가벼운 음료'),
]


NEGATED = re.compile(
    r'^(?:한|하게|운|게|은|는|거|것|건|걸|음료|메뉴|쪽|맛|종류|이|가|을|를|도|들어간|들어있는)*'
    r'(?:말고|말구|싫|빼|제외|없이|없는|못|안마|안먹|안들|안든|안넣|원하지않|지않|하지않)')


def preferences(text, pattern):
    """Keep the polarity of each local phrase instead of counting keywords alone."""
    return [(m.start(), not bool(NEGATED.match(text[m.end():])))
            for m in re.finditer(pattern, text, re.I)]


def amount_won(value):
    parts = re.findall(r'(\d+(?:\.\d+)?)(만|천|백)?', value.replace(',', ''))
    return int(sum(Decimal(n) * {'만': 10000, '천': 1000, '백': 100, '': 1}[unit] for n, unit in parts))


def price_bounds(text):
    """Parse explicit per-drink bounds; never relax them during fallback ranking."""
    # Every repeated group starts with a unit, avoiding nested digit backtracking.
    amount = r'\d[\d,]*(?:\.\d+)?(?:[만천백](?:\d[\d,]*(?:\.\d+)?)?)*원'
    lower, upper = None, None
    for m in re.finditer(amount, text):
        value = amount_won(m.group())
        after, before = text[m.end():], text[max(0, m.start()-3):m.start()]
        if re.match(r'(?:이|은|을)?(?:이하|이내|까지|안쪽|넘지|넘으면안|안넘|넘기지)', after) or before.endswith(('최대', '예산')):
            upper = min(upper, value) if upper is not None else value
        elif after.startswith('미만'):
            upper = min(upper, value-1) if upper is not None else value-1
        elif after.startswith(('이상', '부터')) or before.endswith('최소'):
            lower = max(lower, value) if lower is not None else value
        elif after.startswith('초과'):
            lower = max(lower, value+1) if lower is not None else value+1
    return lower, upper


def query_hints(text):
    t = compact(text)
    scenes = [name for pattern, name, _ in SCENARIOS if re.search(pattern, t)]
    no_coffee = any(not positive for _, positive in preferences(t, r'커피'))
    caffeine_free = preferences(t, r'카페인(?:이|은|을)?(?:없는|없이|없|제로|0(?:mg)?|안들어간|안든|빼|피하|못)')
    no_caffeine = bool(caffeine_free and caffeine_free[-1][1])
    if '저녁·잠들기 전' in scenes and '졸릴 때·밤샘 공부' not in scenes:
        no_caffeine = not caffeine_free or caffeine_free[-1][1]
    category = None
    if re.search(r'먹을디저트|디저트.*(?:추천|뭐|있|골라)|간식.*(?:추천|뭐|있)', t):
        category = '디저트'
    elif re.search(r'(?:달달한|달콤한|상큼한|진한)?(?:티|차)(?:종류|중|추천|있|뭐)|(?:티|차)로', t) and '밀크티' not in t:
        category = '티·과일'
    temperatures = [(pos, 'HOT' if positive else 'ICE') for pos, positive in preferences(t, r'따뜻|뜨거|HOT')]
    temperatures += [(pos, 'ICE' if positive else 'HOT') for pos, positive in preferences(t, r'시원|차가|차갑|아이스|ICE')]
    temp = max(temperatures)[1] if temperatures else 'HOT' if '추운 날' in scenes else 'ICE' if re.search(r'목말|갈증', t) else None
    if temp == 'ICE' and '추운 날' in scenes:
        scenes.remove('추운 날')
    sweet_phrases = preferences(t, r'달달|달콤')
    less_sweet = bool(re.search(r'안달|덜달|안단|덜단|달지않|단거싫|단게싫|단건싫', t)) or any(not positive for _, positive in sweet_phrases)
    no_milk = '우유를 피해야 할 때' in scenes or any(not positive for _, positive in preferences(t, r'우유'))
    if no_milk and '우유를 피해야 할 때' not in scenes:
        scenes.append('우유를 피해야 할 때')
    min_price, max_price = price_bounds(t)
    sizes = [m.group(1) for m in re.finditer(r'(소|중|대)(?:사이즈|컵)', t)]
    size = sizes[-1] if sizes else '대' if re.search(r'큰(?:걸로|거|사이즈|컵)', t) else None
    ice = '적게' if re.search(r'얼음(?:을|은)?(?:적게|조금|절반|반만)', t) else '많이' if '얼음많이' in t else None
    return dict(scenarios=scenes, exclude_coffee=no_coffee, caffeine_free=no_caffeine,
                awake='졸릴 때·밤샘 공부' in scenes and not no_caffeine,
                no_milk=no_milk, category=category, temp=temp, ice=ice,
                less_sweet=less_sweet, sweet=any(positive for _, positive in sweet_phrases) and not less_sweet,
                min_price=min_price, max_price=max_price, size=size,
                thirsty=bool(re.search(r'목말|갈증|입이?말라', t)),
                child=bool(re.search(r'아기|애기|영유아|유아|어린이|아이(?:가|도|는|에게|먹|마실)', t)))


def expanded_query(text):
    t = compact(text)
    hints = query_hints(text)
    extra = [words for _, name, words in SCENARIOS if name in hints['scenarios']]
    if re.search(r'검(?:정|은)|알갱|돌멩|돌맹|버블이', t):
        extra.append('펄 타피오카 검은 알갱이 재료')
    if re.search(r'용량|몇ml|몇밀리|큰사이즈|작은사이즈', t, re.I):
        extra.append('컵 용량 사이즈 ml')
    if '얼음' in t:
        extra.append('얼음 양 조절 스무디 예외')
    if hints['child']:
        extra.append('아기 어린이 적합성 확인')
    return text + ' ' + ' '.join(extra)


def eligible(item, hints):
    category = hints['category']
    if item['category'] == '디저트' and category != '디저트':
        return False
    if category and item['category'] != category:
        return False
    if hints['exclude_coffee'] and item['category'] == '커피':
        return False
    caffeine = item.get('caffeine_mg')
    if hints['caffeine_free'] and caffeine != 0:
        return False
    if hints['awake'] and (caffeine is None or caffeine < 120):
        return False
    if hints['no_milk'] and any('우유' in a for a in item['allergens']):
        return False
    if item['category'] != '디저트' and hints['temp'] and hints['temp'] not in item['temperatures']:
        return False
    if hints['less_sweet'] and item['taste']['단맛'] > 2:
        return False
    if hints['sweet'] and not hints['less_sweet'] and item['taste']['단맛'] < 3:
        return False
    size = hints.get('size') or ('중' if '중' in item['prices'] else next(iter(item['prices'])))
    if size not in item['prices']:
        return False
    if not within_budget(item['prices'][size], hints):
        return False
    return True


def within_budget(value, hints):
    return ((hints.get('min_price') is None or value >= hints['min_price']) and
            (hints.get('max_price') is None or value <= hints['max_price']))


def has_constraints(hints):
    return (any(hints[k] for k in ['category','exclude_coffee','caffeine_free','awake','no_milk','temp','less_sweet','sweet','thirsty','size'])
            or hints['min_price'] is not None or hints['max_price'] is not None)


def constrained_recommendations(ids, text, catalog, sold_out):
    hints = query_hints(text)
    by_id = {i['id']: i for i in catalog}
    valid = [iid for iid in dict.fromkeys(ids) if iid in by_id and iid not in sold_out and eligible(by_id[iid], hints)]
    constrained = has_constraints(hints)
    if valid and not hints['thirsty']:
        return valid[:3]
    if constrained:
        pool = [i for i in catalog if i['id'] not in sold_out and eligible(i, hints)]
        def rank(i):
            # A thirst request prefers lighter, tangy drinks; this is a preference, not a health claim.
            thirst = (('우유' in i['allergens']), -i['taste']['신맛']) if hints['thirsty'] else (0, 0)
            return (*thirst, 0 if i['id'] in valid else 1, 0 if i.get('badge') else 1, i['taste']['단맛'] if hints['less_sweet'] else 0)
        return [i['id'] for i in sorted(pool, key=rank)[:3]]
    return valid[:3]


def recommendation_reason(text):
    h = query_hints(text)
    reasons = []
    if h['category'] == '디저트': reasons.append('함께 먹을 디저트로')
    elif h['category']: reasons.append('티·과일 메뉴 중에서')
    if h['exclude_coffee']: reasons.append('커피를 빼고')
    if h['caffeine_free']: reasons.append('자료상 카페인 0mg인 메뉴로')
    elif h['awake']: reasons.append('카페인이 있는 메뉴로')
    if h['no_milk']: reasons.append('우유가 표기되지 않은 메뉴로')
    if h['temp'] == 'HOT': reasons.append('따뜻하게 마실 수 있는 메뉴로')
    elif h['temp'] == 'ICE': reasons.append('차갑게 마실 수 있는 메뉴로')
    elif h['thirsty']: reasons.append('시원하고 상큼한 메뉴 위주로')
    if h['less_sweet']: reasons.append('단맛이 낮은 메뉴로')
    if h['max_price'] is not None: reasons.append(f"한 잔 {h['max_price']:,}원 이하로")
    if h['min_price'] is not None: reasons.append(f"한 잔 {h['min_price']:,}원 이상으로")
    return ' '.join(reasons) + ' 골랐어요.' if reasons else '말씀하신 조건으로 골랐어요.'
