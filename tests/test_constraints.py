"""Adversarial model plans exercise guards without API calls or evaluation grading."""
import unittest

from backend import server
from backend.rag import expanded_query, query_hints
from scripts.build_rag_docs import build


class ConstraintGuards(unittest.TestCase):
    def plan(self, **updates):
        plan = dict(intent='recommend', reply='조건에 맞는 메뉴예요.', items=[],
                    recommendations=['passionfruit_hibiscus'], recommendation_changes=[],
                    target='none', fulfillment='none', evidence=['menu_catalog'],
                    _allowed_evidence=['menu_catalog', 'option_rules', 'size_guide'])
        plan.update(updates)
        return plan

    def run_plan(self, text, state=None, **updates):
        return server.execute_plan(self.plan(**updates), state or {}, text)

    def test_temperature_negations_and_explicit_preference(self):
        for text, temp in [('따뜻한 거 말고 차가운 거 추천해 줘', 'ICE'),
                           ('차가운 거 말고 따뜻한 거 추천해 줘', 'HOT'),
                           ('따뜻한 건 싫어요', 'ICE'),
                           ('차갑지 않은 거 주세요', 'HOT'),
                           ('추운데 아이스 추천해 줘', 'ICE')]:
            with self.subTest(text=text):
                result = self.run_plan(text, recommendation_changes=[dict(field='temp', value='HOT' if temp == 'ICE' else 'ICE', mode='set')])
                self.assertTrue(result['recommendations'])
                self.assertTrue(all(cfg['temp'] == temp for cfg in result['recommendation_options'].values()))

    def test_expansion_does_not_reintroduce_negated_temperature(self):
        self.assertNotIn('HOT', expanded_query('따뜻한 거 말고 차가운 거 추천'))

    def test_negated_sweetness_does_not_recommend_sweet_drinks(self):
        for text in ['달달한 건 싫어요. 음료 추천', '달콤한 음료 말고 추천', '달지 않은 거 추천']:
            with self.subTest(text=text):
                result = self.run_plan(text, recommendations=['brownsugar_milktea_pearl'])
                self.assertTrue(result['recommendations'])
                self.assertTrue(all(server.BY_ID[i]['taste']['단맛'] <= 2 for i in result['recommendations']))

    def test_negated_caffeine_free_is_not_zero_caffeine_constraint(self):
        self.assertFalse(query_hints('카페인 없는 건 싫고 진한 걸로')['caffeine_free'])
        self.assertTrue(query_hints('카페인 없는 걸로 추천해 주세요')['caffeine_free'])

    def test_budget_cannot_be_relaxed_by_empty_candidate_fallback(self):
        for text in ['커피 말고 3,000원 이하 음료 추천', '카페인 없는 거 3000원 이하 추천', '0원 이하 추천']:
            with self.subTest(text=text):
                result = self.run_plan(text, recommendations=[])
                self.assertEqual(result['intent'], 'reply')
                self.assertEqual(result['recommendations'], [])
                self.assertEqual(result['recommendation_options'], {})
                self.assertTrue(result['clear_recommendations'])

    def test_budget_formats_and_strict_boundaries(self):
        for text, lower, upper in [('5천원 미만', None, 4999), ('예산 1만2천원', None, 12000),
                                   ('5000원 초과 6000원 이하', 5001, 6000), ('최대 5,000원', None, 5000),
                                   ('5000원이 넘지 않는 걸로', None, 5000), ('3.5천원 이하', None, 3500)]:
            with self.subTest(text=text):
                h = query_hints(text)
                self.assertEqual((h['min_price'], h['max_price']), (lower, upper))

    def test_long_numeric_input_does_not_backtrack_or_overflow(self):
        self.assertIsNone(query_hints('9' * 1199)['max_price'])
        self.assertGreater(query_hints('9' * 1100 + '원 이하')['max_price'], 10000)

    def test_milk_absence_phrasing_is_a_constraint(self):
        for text in ['우유 안 들어간 음료 추천', '우유 없는 거', '우유 들어간 건 싫어요']:
            with self.subTest(text=text):
                self.assertTrue(query_hints(text)['no_milk'])

    def test_size_price_is_used_before_recommendation(self):
        result = self.run_plan('대 사이즈로 5500원 이하 추천', recommendations=['passionfruit_hibiscus', 'americano'])
        self.assertTrue(result['recommendations'])
        self.assertNotIn('passionfruit_hibiscus', result['recommendations'])
        self.assertTrue(all(c['size'] == '대' for c in result['recommendation_options'].values()))

    def test_final_price_includes_toppings(self):
        result = self.run_plan('5500원 이하 추천', recommendation_changes=[dict(field='topping', value='펄', mode='add')])
        self.assertEqual(result['recommendations'], [])  # 5100 + 600, not base 5100.
        self.assertTrue(any('가격' in w for w in result['warnings']))

    def test_milk_toppings_cannot_bypass_base_menu_filter(self):
        for topping in ['밀크폼', '치즈폼']:
            with self.subTest(topping=topping):
                result = self.run_plan('우유 못 먹는데 음료 추천해 주세요', recommendation_changes=[dict(field='topping', value=topping, mode='add')])
                self.assertEqual(result['intent'], 'reply')
                self.assertEqual(result['recommendations'], [])
                self.assertNotIn('우유가 표기되지 않은 메뉴로 골랐', result['reply'])
                self.assertTrue(any('토핑' in w for w in result['warnings']))

    def test_reply_suggestions_use_same_exclusions(self):
        result = self.run_plan('우유 못 먹는데 음료 추천해 주세요', intent='reply', reply='카페라떼를 추천해요.', recommendations=[])
        self.assertEqual(result['suggestions'], [])
        self.assertNotIn('카페라떼를 추천', result['reply'])

    def test_reply_suggestions_carry_temperature_configuration(self):
        result = self.run_plan('따뜻한 거 말고 차가운 거 추천', intent='reply', reply='얼그레이티를 추천해요.', recommendations=[])
        self.assertEqual(result['suggestions'], ['earlgrey_tea'])
        self.assertEqual(result['recommendation_options']['earlgrey_tea']['temp'], 'ICE')

    def test_reply_suggestions_obey_budget(self):
        result = self.run_plan('3000원 이하 음료 추천', intent='reply', reply='패션후르츠 히비스커스를 추천해요.', recommendations=[])
        self.assertEqual(result['suggestions'], [])
        self.assertNotIn('히비스커스를 추천', result['reply'])

    def test_generic_bubble_cards_do_not_bypass_milk_exclusion(self):
        result = self.run_plan('우유 없이 버블티 주세요', recommendations=[])
        self.assertEqual(result['suggestions'], [])
        self.assertNotIn('어떤 버블티', result['reply'])

    def test_sold_out_alternatives_obey_exclusions(self):
        result = self.run_plan('망고 스무디 말고 우유 없는 거 주세요', intent='order', items=[dict(menu_id='mango_smoothie', quantity=1, changes=[])], recommendations=[])
        for iid in result['recommendations'] + result['suggestions']:
            self.assertNotIn('우유', server.BY_ID[iid]['allergens'])

    def test_order_and_modify_cannot_bypass_milk_topping_guard(self):
        for intent in ['order', 'modify']:
            with self.subTest(intent=intent):
                state = {'item_id': 'passionfruit_hibiscus', 'cfg': server.defaults(server.BY_ID['passionfruit_hibiscus'])}
                result = self.run_plan('우유 못 먹어요. 치즈폼 넣어 주세요', state, intent=intent,
                                       items=[dict(menu_id='passionfruit_hibiscus', quantity=1, changes=[dict(field='topping', value='치즈폼', mode='add')])], recommendations=[])
                self.assertEqual(result['items'], [])
                self.assertEqual(result['intent'], 'reply')

    def test_no_milk_does_not_treat_oat_change_as_safety_guarantee(self):
        result = self.run_plan('우유 빼고 카페라떼 주세요', intent='order', items=[dict(menu_id='cafe_latte', quantity=1, changes=[dict(field='oat', value='true', mode='set')])], recommendations=[])
        self.assertEqual(result['items'], [])

    def test_ordinary_dessert_order_still_works(self):
        result = self.run_plan('플레인 스콘 주세요', intent='order', items=[dict(menu_id='signature_scone', quantity=1, changes=[])], recommendations=[])
        self.assertEqual(result['items'][0]['menu_id'], 'signature_scone')

    def test_order_budget_includes_extras(self):
        result = self.run_plan('아아 샷 추가해서 4500원 이하로 주세요', intent='order', items=[dict(menu_id='americano', quantity=1, changes=[dict(field='shot', value='1', mode='set')])], recommendations=[])
        self.assertEqual(result['items'], [])

    def test_allergy_unknown_is_not_rendered_as_absence(self):
        _, docs = build()
        for doc in docs:
            if doc['metadata']['type'] in ['menu', 'topping']:
                self.assertNotIn('알레르기: 없음', doc['page_content'])
        americano = next(d for d in docs if d['metadata']['id'] == 'americano')
        self.assertIn('표기 정보 없음', americano['page_content'])
        self.assertIn('보장하지 않음', americano['page_content'])

    def test_foam_allergens_are_structured_and_cited(self):
        _, docs = build()
        for topping in ['밀크폼', '치즈폼']:
            self.assertIn('우유', server.TOPPINGS[topping]['allergens'])
            doc = next(d for d in docs if d['metadata']['id'] == 'topping_' + topping)
            self.assertIn('표기 알레르기 성분: 우유', doc['page_content'])

    def test_valid_citation_does_not_approve_wrong_price(self):
        result = self.run_plan('아메리카노 얼마예요?', intent='reply', reply='아메리카노는 100원이에요.', recommendations=[])
        self.assertNotIn('100원', result['reply'])
        self.assertIn('4,200원', result['reply'])
        self.assertIn('4,700원', result['reply'])

    def test_price_is_bound_to_menu_and_size_not_global_number_list(self):
        result = self.run_plan('카페라떼 대 사이즈 얼마예요?', intent='reply', reply='카페라떼 대 사이즈는 4,200원이에요.', recommendations=[])
        self.assertIn('5,800원', result['reply'])
        self.assertNotIn('4,200원', result['reply'])

    def test_current_config_price_includes_paid_options(self):
        item = server.BY_ID['passionfruit_hibiscus']
        cfg = server.defaults(item)
        server.apply_changes(item, cfg, [dict(field='topping', value='펄', mode='add')])
        result = self.run_plan('이거 얼마예요?', {'item_id': item['id'], 'cfg': cfg}, intent='reply', reply='100원이에요.', recommendations=[])
        self.assertIn('5,700원', result['reply'])

    def test_unsupported_option_price_is_not_confirmed(self):
        result = self.run_plan('아바라 샷 추가하면 얼마예요?', intent='reply', reply='바닐라 라떼는 100원이에요.', recommendations=[])
        self.assertNotIn('100원', result['reply'])
        self.assertIn('옵션', result['reply'])

    def test_extra_and_topping_fees_come_from_option_data(self):
        for text, expected in [('샷 추가 얼마예요?', '600원'), ('치즈폼 추가 얼마예요?', '900원'),
                               ('화이트펄 추가 얼마예요?', '700원')]:
            with self.subTest(text=text):
                result = self.run_plan(text, intent='reply', reply='추가 요금은 100원이에요.', recommendations=[])
                self.assertIn(expected, result['reply'])
                self.assertNotIn('100원', result['reply'])

    def test_selected_config_quotes_option_without_applying_it(self):
        state = {'item_id': 'americano', 'cfg': server.defaults(server.BY_ID['americano'])}
        result = self.run_plan('아메리카노 샷 추가하면 얼마예요?', state, intent='reply', reply='100원이에요.', recommendations=[])
        self.assertNotIn('100원', result['reply'])
        self.assertIn('4,800원', result['reply'])
        self.assertEqual(result['items'], [])
        self.assertEqual(state['cfg']['shot'], 0)

    def test_volume_bound_to_temperature_and_size(self):
        result = self.run_plan('아이스 대 사이즈 컵 용량?', intent='reply', reply='대 사이즈는 999ml예요.', recommendations=[])
        self.assertIn('651ml', result['reply'])
        self.assertNotIn('999', result['reply'])
        self.assertNotIn('473ml', result['reply'])

    def test_caffeine_bound_to_menu(self):
        result = self.run_plan('카페라떼 카페인 얼마나 돼요?', intent='reply', reply='카페라떼는 카페인 0mg이에요.', recommendations=[])
        self.assertIn('129mg', result['reply'])
        self.assertNotIn('0mg', result['reply'])

    def test_false_caffeine_absence_without_numbers_is_corrected(self):
        result = self.run_plan('아메리카노 카페인 있어요?', intent='reply', reply='아메리카노는 카페인이 없어요.', recommendations=[])
        self.assertIn('129mg', result['reply'])

    def test_modified_caffeine_is_not_invented(self):
        result = self.run_plan('아메리카노 샷 추가하면 카페인 얼마예요?', intent='reply', reply='아메리카노는 999mg이에요.', recommendations=[])
        self.assertNotIn('999mg', result['reply'])
        self.assertIn('자료에 없어요', result['reply'])

    def test_budget_reason_is_not_mistaken_for_menu_price_claim(self):
        result = self.run_plan('5000원 이하 추천', recommendations=['americano'])
        self.assertEqual(result['intent'], 'recommend')
        self.assertEqual(result['recommendations'], ['americano'])
        self.assertIn('5,000원 이하', result['reply'])


if __name__ == '__main__':
    unittest.main()
