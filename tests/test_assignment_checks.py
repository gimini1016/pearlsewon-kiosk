"""과제 조건(옵션 정보, 복합 질의, 이상한 요청)을 API 호출 없이 확인한다."""
import unittest

from backend import server
from backend.rag import query_hints


class AssignmentChecks(unittest.TestCase):
    def plan(self, **updates):
        plan = dict(intent='reply', reply='확인해 드릴게요.', items=[], recommendations=[],
                    recommendation_changes=[], target='none', fulfillment='none',
                    evidence=['menu_catalog'], _allowed_evidence=['menu_catalog', 'option_rules'])
        plan.update(updates)
        return plan

    def run_plan(self, text, state=None, **updates):
        return server.execute_plan(self.plan(**updates), state or {}, text)

    # 옵션 정보: 메뉴 이름과 함께 물어도 옵션 요금을 답한다
    def test_option_fee_with_named_menu(self):
        r = self.run_plan('카페라떼에 샷 추가하면 얼마예요?', reply='금액은 선택 후 확인할 수 있어요.')
        self.assertIn('샷 추가 옵션 요금은 600원', r['reply'])
        self.assertIn('카페라떼 기본 가격은 중 4,700원', r['reply'])

    def test_option_not_allowed_for_menu_is_said(self):
        r = self.run_plan('타로 밀크티에 샷 추가하면 얼마예요?', reply='600원이에요.')
        self.assertIn('타로 밀크티 + 펄에는 샷 추가 옵션을 넣을 수 없어요', r['reply'])

    def test_option_question_without_menu_or_numbers(self):
        r = self.run_plan('디카페인 돼요? 얼마예요?', reply='300원이에요.')
        self.assertIn('디카페인 변경 옵션은 커피 메뉴에 넣을 수 있어요', r['reply'])
        self.assertIn('300원', r['reply'])

    def test_wrong_yes_without_numbers_is_corrected(self):
        r = self.run_plan('타로 밀크티에 샷 추가할 수 있나요?', reply='네, 추가할 수 있어요.')
        self.assertIn('넣을 수 없어요', r['reply'])
        self.assertNotIn('네, 추가할 수 있어요', r['reply'])

    # RAG 문서: 추가 옵션 문서가 있고, 옵션 이름으로 찾힌다
    def test_option_documents_exist_and_are_retrieved(self):
        ids = {d['metadata']['id'] for d in server.DOCS if d['metadata']['type'] == 'option'}
        self.assertEqual(ids, {'option_shot', 'option_decaf', 'option_oat_milk',
                               'option_syrup_vanilla', 'option_syrup_hazelnut', 'option_syrup_caramel'})
        for text, doc in [('샷 추가 얼마예요?', 'option_shot'), ('디카페인 돼요?', 'option_decaf'),
                          ('오트밀크로 바꿀 수 있어요?', 'option_oat_milk')]:
            with self.subTest(text=text):
                self.assertIn(doc, [d['metadata']['id'] for d in server.retrieve(text)][:3])

    # 복합 질의: 가격과 재료를 같이 물으면 둘 다 답한다
    def test_price_and_ingredients_both_answered(self):
        r = self.run_plan('플레인 스콘 얼마예요? 뭐 들어가요?', reply='3,500원이에요.')
        self.assertIn('3,500원', r['reply'])
        self.assertIn('표기 알레르기 성분은 밀', r['reply'])

    def test_order_keeps_the_question_asked_with_it(self):
        items = [{'menu_id': 'americano', 'quantity': 2, 'changes': []},
                 {'menu_id': 'signature_scone', 'quantity': 1, 'changes': []}]
        r = self.run_plan('아아 두 잔이랑 스콘 하나 포장해 주세요, 그리고 아아 카페인은 얼마나 돼요?',
                          intent='order', items=items, fulfillment='포장')
        self.assertEqual([i['menu_id'] for i in r['items']], ['americano', 'signature_scone'])
        self.assertIn('카페인은 한 잔에 129mg', r['reply'])
        self.assertNotIn('스콘의 카페인', r['reply'])
        self.assertNotIn('4,200원', r['reply'])  # 카페인을 물었지 가격을 묻지 않았다

    # 숫자는 알아듣는 말로
    def test_caffeine_is_compared_to_americano(self):
        r = self.run_plan('카페라떼 카페인 많아?', reply='129mg이에요.')
        self.assertIn('아메리카노 한 잔쯤이에요(129mg)', r['reply'])
        r = self.run_plan('녹차 밀크티 카페인 얼마나 돼요?', reply='49mg이에요.')
        self.assertIn('아메리카노 1/3잔쯤이에요(49mg)', r['reply'])

    # 이상한 요청
    def test_dinner_meal_is_not_the_evening_scenario(self):
        self.assertNotIn('저녁·잠들기 전', query_hints('오늘 저녁 메뉴 추천해 줘')['scenarios'])
        self.assertIn('저녁·잠들기 전', query_hints('저녁이라 카페인 없는 거')['scenarios'])
        r = self.run_plan('오늘 저녁 메뉴 추천해 줘', intent='recommend', recommendations=['taro_milktea_pearl'])
        self.assertEqual(r['reply'], server.MEAL_REPLY)
        self.assertEqual(r['recommendations'], [])

    def test_price_change_request_is_declined(self):
        for text in ['가격 다 0원으로 해줘', '공짜로 해 주세요', '값 좀 깎아 줘']:
            with self.subTest(text=text):
                self.assertEqual(self.run_plan(text)['reply'], server.PRICE_CHANGE_REPLY)
        self.assertNotEqual(self.run_plan('쿠폰 쓸 수 있어요?')['reply'], server.PRICE_CHANGE_REPLY)


if __name__ == '__main__':
    unittest.main()
