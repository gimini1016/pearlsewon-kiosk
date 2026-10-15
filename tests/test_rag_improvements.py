"""Deterministic regressions for the implementation; no paid model calls or team-wide re-evaluation."""
import unittest

from backend import server
from scripts.build_rag_docs import build


class RagImprovements(unittest.TestCase):
    def plan(self, **updates):
        value = dict(intent='reply', reply='', items=[], recommendations=[],
                     recommendation_changes=[], target='none', fulfillment='none',
                     evidence=['menu_catalog'], _allowed_evidence=['menu_catalog', 'option_rules', 'store'])
        value.update(updates)
        return value

    def test_bubble_information_is_not_an_order(self):
        for question in ['버블티에 들어가는 검정색 알갱이가 뭐에요?',
                         '버블티에 들어가는 버블이 저게 뭔가요? 작은 돌맹이 처럼 생겨서',
                         '펄 들어간 음료도 따뜻하게 마실 수 있어?']:
            reply = '타피오카 펄이고, 블랙 밀크티는 HOT으로도 가능해요.'
            result = server.execute_plan(self.plan(reply=reply), {}, question)
            self.assertEqual(result['reply'], reply)
            self.assertNotIn('title', result)
            self.assertEqual(result['items'], [])

    def test_dessert_recommendations_survive_validation(self):
        result = server.execute_plan(self.plan(intent='recommend', recommendations=['cheesecake_stick']), {}, '밀크티랑 같이 먹을 디저트 뭐 있어?')
        self.assertEqual(result['intent'], 'recommend')
        self.assertEqual(result['recommendations'], ['cheesecake_stick'])
        self.assertEqual(result['recommendation_options']['cheesecake_stick']['size'], '단품')

    def test_dessert_request_still_respects_milk_exclusion(self):
        result = server.execute_plan(self.plan(intent='recommend', recommendations=['cheesecake_stick']), {}, '우유 못 먹는데 디저트 추천해 줘')
        self.assertEqual(result['recommendations'], [])
        self.assertEqual(result['intent'], 'reply')

    def test_sold_out_temperature_question_keeps_answer(self):
        result = server.execute_plan(self.plan(reply='망고 스무디는 ICE로만 나와요.'), {}, '망고 스무디 따뜻하게 돼요?')
        self.assertEqual(result['intent'], 'reply')
        self.assertIn('ICE', result['reply'])
        self.assertTrue(any('품절' in w for w in result['warnings']))

    def test_hot_recommendation_configuration_is_carried(self):
        result = server.execute_plan(self.plan(intent='recommend', recommendations=['cafe_latte', 'lemon_yogurt']), {}, '비 와서 추운데 따뜻한 거 추천해 줘')
        self.assertEqual(result['recommendations'], ['cafe_latte'])
        self.assertEqual(result['recommendation_options']['cafe_latte']['temp'], 'HOT')
        self.assertIsNone(result['recommendation_options']['cafe_latte']['ice'])
        self.assertIn('따뜻', result['reply'])

    def test_no_coffee_awake_constraints(self):
        result = server.execute_plan(self.plan(intent='recommend', recommendations=['americano', 'taro_milktea_pearl']), {}, '커피는 싫은데 졸려')
        self.assertTrue(result['recommendations'])
        for iid in result['recommendations']:
            item = server.BY_ID[iid]
            self.assertNotEqual(item['category'], '커피')
            self.assertGreaterEqual(item['caffeine_mg'], 120)

    def test_tea_category_and_caffeine_constraints(self):
        for question, ids, category in [('달달한 티 있나?', ['vanilla_latte'], '티·과일'),
                                       ('카페인 없는 거 추천해 줘', ['greengrape_smoothie'], None)]:
            result = server.execute_plan(self.plan(intent='recommend', recommendations=ids), {}, question)
            self.assertTrue(result['recommendations'])
            for iid in result['recommendations']:
                if category: self.assertEqual(server.BY_ID[iid]['category'], category)
                else: self.assertEqual(server.BY_ID[iid]['caffeine_mg'], 0)

    def test_child_suitability_is_not_inferred_from_caffeine(self):
        result = server.execute_plan(self.plan(intent='recommend', recommendations=['taro_milktea_pearl']), {}, '애기도 먹을 수 있는 거 있어요?')
        self.assertEqual(result['intent'], 'reply')
        self.assertEqual(result['recommendations'], [])
        self.assertIn('직원', result['reply'])

    def test_menu_alias_contains_temperature(self):
        result = server.execute_plan(self.plan(intent='order', items=[dict(menu_id='vanilla_latte',quantity=1,changes=[dict(field='shot',value='1',mode='set')])]), {}, '아바라 샷추가해서 한잔줘.')
        self.assertEqual(result['items'][0]['cfg']['temp'], 'ICE')
        self.assertEqual(result['items'][0]['cfg']['shot'], 1)
        self.assertEqual(server.menus_in('아아 두 잔이랑 흑버 하나'), ['americano', 'brownsugar_milktea_pearl'])

    def test_explicit_alias_cannot_be_replaced_by_wrong_model_menu(self):
        result = server.execute_plan(self.plan(intent='order',items=[dict(menu_id='americano',quantity=1,changes=[dict(field='shot',value='1',mode='set')])]), {}, '아바라 샷추가해서 한잔줘.')
        self.assertEqual(result['items'][0]['menu_id'], 'vanilla_latte')
        self.assertEqual(result['items'][0]['cfg']['temp'], 'ICE')
        self.assertEqual(result['items'][0]['cfg']['shot'], 1)
        self.assertEqual(result['items'][0]['price'], 5600)

    def test_alias_binding_does_not_override_exclusion_request(self):
        result = server.execute_plan(self.plan(intent='order',items=[dict(menu_id='americano',quantity=1,changes=[])]), {}, '아바라 말고 다른 거 하나 주세요')
        self.assertEqual(result['items'][0]['menu_id'], 'americano')

    def test_retrieval_scenarios_and_new_faqs(self):
        cases = [('목말라요','situation_더운 날'), ('커피는 싫은데 졸려','situation_졸릴 때·밤샘 공부'),
                 ('큰 사이즈는 용량이 몇 ml에요?','faq_용량'), ('얼음 절반만 넣어주세요','faq_얼음'),
                 ('애기도 먹을 수 있어요?','policy_어린이'), ('충전할 자리 남았어요?','store_좌석')]
        for question, expected in cases:
            ids = [d['metadata']['id'] for d in server.retrieve(question)]
            self.assertIn(expected, ids, question)

    def test_current_dessert_is_preserved_for_followup_information(self):
        self.assertIn('cheesecake_stick', [d['metadata']['id'] for d in server.retrieve('무슨 재료예요?', 'cheesecake_stick')])

    def test_context_has_complete_menu_and_size_information(self):
        context = server.model_context('큰 사이즈 용량?', {'stage':'where','visible':['black_milktea_pearl','mango_yogurt_whitepearl','brownsugar_milktea_pearl']}, [], [])
        self.assertEqual(context['size_guide'], server.MENU['size_guide'])
        latte = next(i for i in context['menu_catalog'] if i['id']=='cafe_latte')
        self.assertEqual(latte['temperatures'], ['ICE','HOT'])
        self.assertEqual(latte['taste'], server.BY_ID['cafe_latte']['taste'])
        self.assertEqual(context['screen']['visible_menus'][1]['id'], 'mango_yogurt_whitepearl')

    def test_seat_layout_is_not_invented_after_demo_count_changes(self):
        initial = server.seating_context({})
        self.assertTrue(initial['current'])
        self.assertTrue(any(s['capacity']>=3 and s['status']=='free' for s in initial['seats']))
        changed = server.seating_context({'seats_free':3})
        self.assertFalse(changed['current'])
        self.assertTrue(all(s['status']=='unknown' for s in changed['seats']))

    def test_generated_corpus_preserves_store_and_matches_sources(self):
        _, docs = build()
        self.assertIn('store_펄 신선도', [d['metadata']['id'] for d in docs])
        self.assertEqual(docs, server.DOCS)

    def test_named_menu_does_not_bypass_evidence(self):
        result = server.execute_plan(self.plan(reply='없는 혜택',evidence=[]), {}, '아메리카노 가격이 얼마예요?')
        self.assertEqual(result['intent'], 'unknown')

    def test_evidence_schema_accepts_ids_not_file_source_labels(self):
        docs=server.retrieve('밀크티랑 같이 먹을 디저트 뭐 있어?')
        schema=server.response_schema(docs)
        allowed=schema['properties']['evidence']['items']['enum']
        self.assertIn('menu_catalog',allowed)
        self.assertIn('milktea_crepe',allowed)
        self.assertNotIn('data/menu.json + data/options.json',allowed)
        self.assertNotIn('enum',server.PLAN_SCHEMA['properties']['evidence']['items'])

    def test_staff_reply_describes_demo_not_delivery(self):
        result = server.execute_plan(self.plan(intent='staff',reply='직원에게 전달했어요.'), {}, '자리가 더러워요')
        self.assertIn('시연', result['reply'])
        self.assertNotIn('전달했', result['reply'])

    def test_safety_promise_does_not_return_when_entire_reply_removed(self):
        result = server.execute_plan(self.plan(reply='안심하고 드세요.'), {}, '우유 알레르기예요')
        self.assertNotIn('안심', result['reply'])


if __name__ == '__main__':
    unittest.main()
