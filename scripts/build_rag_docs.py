"""menu.json + options.json → rag_docs.jsonl (LangChain Document 한 줄에 하나).

RAG가 맡는 일: 설명 · 어울리는 상황 · 추천 이유. 가격 계산 · 옵션 규칙 · 품절은 코드가 JSON으로 판정해요.
실행: python3 scripts/build_rag_docs.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parents[1] / 'data'

# 메뉴마다 '어울리는 상황'. 손님이 메뉴 이름 대신 상황·기분으로 말해도 검색에 걸리게 하는 핵심 문구예요.
SITUATIONS = {
    "americano": "운동 직전, 졸릴 때, 밤샘 공부, 깔끔하게 정신 차리고 싶을 때",
    "cafe_latte": "부드럽게 커피 마시고 싶을 때, 아침, 쓴맛이 부담될 때",
    "vanilla_latte": "피곤해서 단 게 당길 때, 커피가 아직 어색할 때",
    "cappuccino": "진한 커피에 폭신한 거품이 좋을 때, 오후",
    "cafe_mocha": "초콜릿과 커피가 둘 다 당길 때, 기분이 꿀꿀할 때",
    "earlgrey_spanner": "특별한 걸 마셔 보고 싶을 때, 달콤짭짤한 크림이 좋을 때",
    "black_milktea_pearl": "버블티가 처음일 때, 실패 없는 기본 맛을 원할 때",
    "taro_milktea_pearl": "카페인 없이 달달하고 고소하게, 밤에 마실 때",
    "brownsugar_milktea_pearl": "단 게 확 당길 때, 기분이 꿀꿀할 때, 대표 메뉴를 원할 때",
    "green_milktea": "은은하고 부드럽게, 녹차를 좋아할 때",
    "choco_milktea_cheesefoam": "디저트 대신 한 잔, 단짠이 당길 때, 카페인을 줄이고 싶을 때",
    "lowsugar_black_milktea": "덜 달게 밀크티를 마시고 싶을 때, 당을 줄이는 중일 때",
    "earlgrey_tea": "식후에 깔끔하게, 향 좋은 차가 마시고 싶을 때",
    "oolong_coconut_milkfoam": "씹는 맛이 좋을 때, 고소한 거품이 좋을 때",
    "grapefruit_jasmine": "상큼하게 기분 전환할 때, 식후, 덜 단 과일차를 원할 때",
    "passionfruit_hibiscus": "카페인 없이 상큼하게, 더운 날, 저녁",
    "lemon_yogurt": "아주 새콤한 게 당길 때, 입맛이 없을 때, 카페인 없이",
    "mango_yogurt_whitepearl": "달달하고 상큼하게, 카페인 없이, 인기 메뉴를 원할 때",
    "strawberry_cookie_smoothie": "디저트처럼 든든하게, 달달한 걸 크게 한 잔",
    "mango_smoothie": "더운 날 달달하고 시원하게, 카페인 없이",
    "greengrape_smoothie": "더운 날 시원하고 달콤하게",
    "signature_scone": "커피나 차와 함께 가볍게",
    "chocochip_cookie": "아메리카노와 함께, 달달한 간식",
    "salted_cheese_bar": "단짠 간식이 당길 때, 밀크티와 함께",
    "cheesecake_stick": "상큼한 차와 함께 가벼운 디저트",
    "milktea_crepe": "밀크티를 좋아할 때, 디저트로 든든하게",
}

FAQ = [
    ("실링", "실링이 뭐예요? 포장할 때 컵 위를 비닐 필름으로 밀봉하는 거예요. 들고 가도 잘 흘리지 않아요. 원하면 뚜껑으로도 받을 수 있어요."),
    ("당도", "당도 퍼센트는 시럽 양이에요. 기본은 70%이고, 0%는 시럽 없이, 30%는 덜 달게예요. 밀크티 · 티·과일 · 스무디·요거트만 조절돼요."),
    ("펄", "펄과 화이트펄은 뭐가 달라요? 펄은 타피오카로 만든 검은 알갱이로 쫀득쫀득해요. 화이트펄은 해초로 만든 하얀 알갱이로 덜 쫀득하고 꼬들꼬들해요."),
    ("폼", "밀크폼과 치즈폼은 음료 위에 올리는 달콤짭짤한 거품이에요. 치즈폼이 더 짭짤하고 진해요. 둘 다 우유가 들어 있어요."),
    ("처음", "버블티가 처음이라면 블랙 밀크티 + 펄(베스트)이 무난해요. 달달한 걸 좋아하면 흑당 밀크티 + 펄(시그니처)을 추천해요."),
]


# 상황 지식: 매장이 정한 추천 근거. 메뉴 목록은 menu.json에서 조건으로 뽑아서 데이터가 바뀌어도 틀리지 않아요.
# (상황, 안내 글, 메뉴 고르는 조건). 건강 관련 문장은 일반 안내 수준으로만 써요.
def _caf(i): return i.get("caffeine_mg") or 0
def _drink(i): return i["category"] != "디저트"
def _milk(i): return "우유" in i["allergens"]

SITUATION_KB = [
    ("운동 직전", "운동 전에는 카페인이 든 가벼운 음료가 잘 맞아요. 우유나 크림이 든 음료는 운동 직전엔 속이 더부룩할 수 있어요.",
     lambda i: _drink(i) and _caf(i) >= 60 and not _milk(i)),
    ("졸릴 때·밤샘 공부", "정신이 번쩍 들고 싶을 땐 카페인이 많은 메뉴가 좋아요. 사람마다 카페인에 예민한 정도가 달라요.",
     lambda i: _drink(i) and _caf(i) >= 120),
    ("저녁·잠들기 전", "저녁에는 카페인 없는 메뉴를 추천해요.",
     lambda i: _drink(i) and _caf(i) == 0),
    ("기분이 꿀꿀할 때", "기분 전환엔 달달한 메뉴가 인기가 많아요.",
     lambda i: _drink(i) and i["taste"]["단맛"] >= 4),
    ("더운 날", "더운 날엔 시원하고 상큼한 메뉴가 잘 나가요.",
     lambda i: _drink(i) and "ICE" in i["temperatures"] and (i["taste"]["신맛"] >= 2 or i["category"] == "스무디·요거트")),
    ("추운 날", "추운 날엔 따뜻하게 마실 수 있는 메뉴를 추천해요.",
     lambda i: _drink(i) and "HOT" in i["temperatures"]),
    ("식후", "식후엔 너무 달지 않고 깔끔한 차나 커피가 잘 맞아요.",
     lambda i: _drink(i) and i["taste"]["단맛"] <= 2 and not _milk(i)),
    ("당을 줄이는 중", "덜 달게 드시려면 단맛이 낮은 메뉴를 고르거나, 당도를 30% 이하로 낮출 수 있어요. 흑당 밀크티는 당도 조절이 안 돼요.",
     lambda i: _drink(i) and i["taste"]["단맛"] <= 1),
    ("우유를 피해야 할 때", "우유가 표기되지 않은 메뉴예요. 불포함이나 섭취 안전을 보장하지 않아요. 밀크폼·치즈폼에는 우유가 표기돼 있어요. 교차 접촉 여부는 직원에게 확인해요.",
     lambda i: _drink(i) and not _milk(i)),
    ("처음 왔을 때", "처음이라면 많이 찾는 베스트·시그니처 메뉴가 무난해요.",
     lambda i: i.get("badge") in ("베스트", "시그니처", "사장 추천")),
]

# 매장 정책: 펄세권이 가상으로 정한 정책이에요(팀 결정). 키오스크가 지어내면 안 되는 내용이라 문서로 둬요.
POLICY = [
    ("잘못 나온 메뉴", "메뉴가 잘못 나왔으면 주문 번호를 알려 주세요. 바로 다시 만들어 드려요. 키오스크에서 ‘직원 불러 주세요’라고 해도 돼요."),
    ("주문 취소", "음료를 만들기 전이면 키오스크에서 바로 취소돼요. 만들기 시작한 뒤에는 직원에게 말씀해 주세요."),
    ("환불", "결제한 수단으로 그대로 환불돼요. 카드 취소는 카드사에 따라 3~5영업일 걸릴 수 있어요."),
    ("쿠폰", "쿠폰은 한 번 주문에 한 장만 쓸 수 있고, 다른 할인과 함께 쓸 수 없어요."),
    ("적립", "음료 한 잔에 스탬프 하나가 쌓여요. 10개를 모으면 음료 한 잔(중 사이즈)을 드려요. 디저트는 적립되지 않아요."),
    ("포장", "포장은 실링 또는 뚜껑으로 드려요. 2잔 이상이면 캐리어에 담아 드려요."),
    ("매장 이용", "매장에서 드시면 다회용 컵으로 드려요. 콘센트 자리는 창가 1인석과 2인 테이블에 있어요."),
    ("직원 호출", "키오스크로 해결이 어려우면 ‘직원 불러 주세요’라고 말씀해 주세요. 직원이 바로 와요."),
]


def won(n):
    return f"{n:,}원"


def menu_doc(i, d):
    t = i["taste"]
    lines = [f"[메뉴] {i['name']} ({i['category']})" + (f" · {i['badge']}" if i.get("badge") else "")]
    if d.get("taste_categories"):
        lines.append(f"맛: {' · '.join(d['taste_categories'])} (단맛 {t['단맛']}, 신맛 {t['신맛']}, 짠맛 {t['짠맛']}, 진함 {t['진함']})")
    lines.append(f"설명: {i['description']}")
    if i['temperatures']:
        lines.append('제공 가능한 온도: ' + ' / '.join(i['temperatures']))
    lines.append(f"어울리는 상황: {SITUATIONS[i['id']]}")
    if i["category"] != "디저트":
        s = [d["size"], d["temp"]]
        if "sugar" in d:
            s.append(f"당도 {d['sugar']}%")
        if "ice" in d:
            s.append(f"얼음 {d['ice']}")
        if "toppings" in d:
            s.append(f"{'·'.join(d['toppings'])} 기본 포함")
        lines.append(f"추천 세트: {' · '.join(s)}")
        if "sugar_less_sweet" in d:
            lines.append(f"안 달게: 당도 {d['sugar_less_sweet']}%로 낮춰요")
    lines.append("가격: " + " / ".join(f"{k} {won(v)}" for k, v in i["prices"].items()))
    caf = i.get("caffeine_mg")
    extra = [] if caf is None else [f"카페인 {caf}mg" if caf else "카페인 없음"]
    extra.append("표기 알레르기 성분: " + (", ".join(i["allergens"]) or "표기 정보 없음 (불포함·섭취 안전을 보장하지 않음)"))
    lines.append(" · ".join(extra))
    meta = {"id": i["id"], "type": "menu", "category": i["category"],
            "taste_categories": d.get("taste_categories", []),
            "caffeine_mg": caf, "allergens": i["allergens"],
            "temperatures": i['temperatures'], "source": "data/menu.json + data/options.json"}
    return {"page_content": "\n".join(lines), "metadata": meta}


def topping_doc(tp):
    allergens = ', '.join(tp.get('allergens', [])) or '표기 정보 없음 (불포함·섭취 안전을 보장하지 않음)'
    return {"page_content": f"[토핑] {tp['name']} · {tp['texture']} · {won(tp['price'])}\n설명: {tp['description']}\n표기 알레르기 성분: {allergens}",
            "metadata": {"id": f"topping_{tp['name']}", "type": "topping", "source": "data/menu.json",
                         "queries": ['검정색 알갱이가 뭐예요', '돌처럼 생긴 버블은 무슨 재료예요'] if tp['name'] == '펄' else []}}


def build():
    menu = json.loads((HERE / "menu.json").read_text())
    opts = json.loads((HERE / "options.json").read_text())
    docs = [menu_doc(i, opts["menu_defaults"][i["id"]]) for i in menu["items"]]
    docs += [topping_doc(tp) for tp in menu["toppings"]]
    docs += [{"page_content": f"[자주 묻는 말] {text}", "metadata": {"id": f"faq_{k}", "type": "faq"}} for k, text in FAQ]
    for k, text, pick in SITUATION_KB:
        names = [i["name"] for i in menu["items"] if pick(i) and not i["sold_out"]]
        assert names, f"상황 '{k}'에 맞는 메뉴가 없어요"
        docs.append({"page_content": f"[상황] {k}\n{text}\n어울리는 메뉴: {', '.join(names)}",
                     "metadata": {"id": f"situation_{k}", "type": "situation"}})
    docs += [{"page_content": f"[매장 정책] {k}\n{text}", "metadata": {"id": f"policy_{k}", "type": "policy", "source": "가상 정책(팀 결정)"}}
             for k, text in POLICY]
    # Keep all knowledge in source records so regeneration cannot drop manual additions.
    docs.append({"page_content": "[매장] 펄 신선도 (펄 언제 삶았어요?)\n펄은 30분마다 새로 삶아요. 지금 펄을 삶은 지 몇 분 됐는지는 매장 상태에 나와요.",
                 "metadata": {"id": "store_펄 신선도", "type": "store", "source": "가상 정책(팀 결정)"}})
    docs.append({"page_content": '[자주 묻는 말] 컵 용량과 사이즈\n' + '\n'.join(f'{size}: {guide}' for size, guide in menu['size_guide'].items()),
                 "metadata": {"id": "faq_용량", "type": "faq", "source": "data/menu.json:size_guide",
                              "queries": ['큰 사이즈 용량 몇 ml', '컵 몇 밀리', '중 대 사이즈 차이']}})
    docs.append({"page_content": '[자주 묻는 말] 얼음 양 조절\nICE 음료 중 스무디·요거트를 제외하면 얼음은 ' + ', '.join(opts['ice']['levels']) + ' 중에 골라요. ' + opts['ice']['why_not'] + '. HOT 음료에는 얼음이 들어가지 않아요. 적게 옵션의 정확한 비율은 정해져 있지 않으므로 절반이라고 보장하지 않아요.',
                 "metadata": {"id": "faq_얼음", "type": "faq", "source": "data/options.json:ice",
                              "queries": ['얼음 절반만', '아이스 음료 얼음 적게', '얼음 양 바꿀 수 있어요']}})
    docs.append({"page_content": '[매장] 좌석 조건\n좌석별 인원수·콘센트·창가 정보는 매장 상태의 seating을 확인해요. 전체 빈자리 수를 콘센트 자리 수나 함께 앉을 수 있는 자리 수로 안내하지 않아요. 좌석별 현재 상태가 확인되지 않으면 직원 확인을 안내해요.',
                 "metadata": {"id": "store_좌석", "type": "store", "source": "data/store.json:seats",
                              "queries": ['3명이 함께 앉을 자리', '충전기 콘센트 자리', '4인석 빈자리']}})
    knowledge = json.loads((HERE / 'knowledge.json').read_text())
    for entry in knowledge['documents']:
        docs.append({'page_content': f"[{entry['type']}] {entry['content']}",
                     'metadata': {k: entry[k] for k in ['id', 'type', 'source', 'queries']}})
    for doc in docs:
        if doc['metadata']['id'] == 'policy_직원 호출':
            doc['page_content'] = '[매장 정책] 직원 호출\n직원 확인이 필요하면 직원 호출 화면을 열 수 있어요. 현재 호출은 시연 기능이며 실제 알림은 전송되지 않아요.'
    ids = [d['metadata']['id'] for d in docs]
    assert len(ids) == len(set(ids)), '중복된 문서 id가 있어요'
    return menu, docs


if __name__ == "__main__":
    menu, docs = build()
    assert set(SITUATIONS) == {i["id"] for i in menu["items"]}, "상황 문구가 빠진 메뉴가 있어요"
    out = HERE / "rag_docs.jsonl"
    out.write_text("".join(json.dumps(d, ensure_ascii=False) + "\n" for d in docs))
    print(f"{len(docs)}개 문서 → {out.name}")
