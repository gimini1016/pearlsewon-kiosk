"""Complete, source-rendered answers and non-mutating conditional order quotes."""
import copy
import unittest
from backend import server
from tests.answer_checks import completeness_checks


class AnswerCompleteness(unittest.TestCase):
    def plan(self, **updates):
        p = dict(intent='reply', reply='', items=[], recommendations=[], recommendation_changes=[],
                 target='none', fulfillment='none', evidence=['menu_catalog'], _allowed_evidence=['menu_catalog','option_rules'])
        p.update(updates)
        return p

    def state(self, shot=1):
        cfg = server.defaults(server.BY_ID['vanilla_latte'])
        cfg['shot'] = shot
        return dict(stage='cup', where='포장', item_id='vanilla_latte', cfg=cfg)

    def test_comparison_and_prices_both_survive_numeric_validation(self):
        result = server.execute_plan(self.plan(reply='카푸치노가 더 진해요. 아메리카노는 100원, 카푸치노는 200원이고 둘 다 129mg이에요.'), {}, '아메리카노랑 카푸치노 중 뭐가 더 진해요? 그리고 가격은?')
        for value in ['아메리카노', '카푸치노', '더 진해요', '4,200원', '4,700원', '5,800원']:
            self.assertIn(value, result['reply'])
        self.assertIn('아메리카노 쪽이 더 진해요', result['reply'])
        self.assertNotIn('mg', result['reply'])
        self.assertNotIn('100원', result['reply'])

    def test_comparison_is_supplied_even_when_model_omits_it(self):
        result = server.execute_plan(self.plan(reply='가격은 4,200원이에요.'), {}, '아메리카노랑 카푸치노 중 뭐가 더 진해요? 그리고 가격은?')
        self.assertIn('아메리카노 쪽이 더 진해요', result['reply'])

    def test_sweetness_comparison_uses_menu_values(self):
        result = server.execute_plan(self.plan(reply='비슷해요.'), {}, '아메리카노랑 바닐라 라떼 중 뭐가 더 달아요? 가격도 알려 주세요.')
        self.assertIn('바닐라 라떼 쪽이 더 달아요', result['reply'])
        self.assertIn('5,000원', result['reply'])

    def test_equal_strength_is_not_reported_as_a_winner(self):
        result = server.execute_plan(self.plan(reply='카푸치노가 더 진해요.'), {}, '카페라떼랑 바닐라 라떼 중 진함은 뭐가 더 높아요?')
        self.assertIn('같아요', result['reply'])
        self.assertNotIn('카푸치노', result['reply'])

    def test_price_question_does_not_add_unrequested_caffeine(self):
        result = server.execute_plan(self.plan(reply='아메리카노는 4,200원이고 카페인은 129mg이에요.'), {}, '아메리카노 얼마예요?')
        self.assertIn('4,200원', result['reply'])
        self.assertNotIn('mg', result['reply'])

    def test_basic_and_modified_caffeine_are_not_confused(self):
        for phrase in ['샷 하나 추가', '샷 한 번 더', '샷 1회 추가', '샷 두 개 추가', '샷 추가']:
            with self.subTest(phrase=phrase):
                result = server.execute_plan(self.plan(reply='아메리카노는 129mg이에요.'), {}, f'아메리카노에 {phrase}하면 카페인이 정확히 몇 mg이에요?')
                self.assertIn('자료에 없어요', result['reply'])
                self.assertNotIn('129mg', result['reply'])

    def test_no_numeric_model_answer_still_gets_unknown_caffeine_scope(self):
        result = server.execute_plan(self.plan(reply='기본 메뉴와 같아요.'), {}, '아메리카노 샷 하나 추가하면 카페인이 얼마나 돼요?')
        self.assertIn('자료에 없어요', result['reply'])

    def test_smoothie_caffeine_is_not_decaf_due_to_compacting_words(self):
        self.assertEqual(server.explicit_extra_changes('망고 스무디 카페인 있어요?', {}), [])

    def test_milk_foam_exclusion_reason_survives_recommendation_rewrite(self):
        result = server.execute_plan(self.plan(intent='recommend',reply='치즈폼에는 우유가 있어요. 아메리카노를 추천해요.', recommendations=['americano']), {}, '우유 못 먹어요. 우유 없는 음료에 치즈폼 넣어 주세요.')
        self.assertEqual(result['recommendations'], ['americano'])
        self.assertTrue(any('치즈폼에는 우유' in w for w in result['warnings']))
        self.assertNotIn('치즈폼', result['recommendation_options']['americano']['tops'])

    def test_milk_foam_rejection_without_a_card_also_explains_why(self):
        result = server.execute_plan(self.plan(reply='어려워요.'), {}, '우유 못 먹는데 치즈폼 넣어도 돼요?')
        self.assertTrue(any('치즈폼에는 우유' in w for w in result['warnings']))

    def test_explicitly_removed_foam_is_not_claimed_as_newly_blocked(self):
        self.assertEqual(server.milk_conflict_notes('우유 못 먹어요. 치즈폼 빼 주세요.', server.query_hints('우유 못 먹어요. 치즈폼 빼 주세요.')), [])

    def test_quote_keeps_selected_shot_and_does_not_mutate_state(self):
        state = self.state()
        before = copy.deepcopy(state)
        quote = server.current_order_quote('대 사이즈로 바꿔 주세요. 6500원 이하일 때만', state)
        self.assertEqual(quote['current_price'], 5600)
        self.assertEqual(quote['proposed_price'], 6700)
        self.assertEqual(quote['proposed_options']['shot'], 1)
        self.assertFalse(quote['budget_satisfied'])
        self.assertEqual(state, before)

    def test_budget_rejection_works_even_when_model_forgot_existing_shot(self):
        state = self.state()
        result = server.execute_plan(self.plan(reply='추가 옵션이 없어서 6100원이에요.'), state, '지금 고른 음료를 대 사이즈로 바꿔 주세요. 추가 옵션까지 한 잔 6500원 이하일 때만요.')
        self.assertEqual(result['intent'], 'reply')
        self.assertEqual(result['items'], [])
        self.assertIn('6,700원', result['reply'])
        self.assertIn('6,500원', result['reply'])
        self.assertIn('현재 선택을 유지', result['reply'])
        self.assertEqual(state['cfg']['size'], '중')

    def test_budget_boundary_permits_change_without_losing_shot(self):
        state = self.state()
        result = server.execute_plan(self.plan(reply='추가 옵션은 없어요.'), state, '대 사이즈로 바꿔 주세요. 6700원 이하일 때만요.')
        self.assertEqual(result['intent'], 'modify')
        self.assertEqual(result['items'][0]['price'], 6700)
        self.assertEqual(result['items'][0]['cfg']['shot'], 1)
        self.assertEqual(state['cfg']['size'], '중')

    def test_quote_preserves_existing_topping_cost(self):
        item = server.BY_ID['passionfruit_hibiscus']
        state = dict(item_id=item['id'], cfg=server.defaults(item))
        state['cfg']['tops'] = ['치즈폼']
        quote = server.current_order_quote('대 사이즈로 바꿔 주세요', state)
        self.assertEqual(quote['proposed_price'], 7100)

    def test_price_inquiry_quotes_but_does_not_apply_change(self):
        result = server.execute_plan(self.plan(reply='100원이에요.'), self.state(), '지금 고른 바닐라 라떼를 대 사이즈로 바꾸면 얼마예요?')
        self.assertIn('6,700원', result['reply'])
        self.assertEqual(result['items'], [])

    def test_new_menu_question_does_not_quote_unrelated_current_drink(self):
        result = server.execute_plan(self.plan(reply='100원이에요.'), self.state(), '아메리카노 가격은 얼마예요?')
        self.assertIn('4,200원', result['reply'])
        self.assertNotIn('5,600원', result['reply'])

    def test_model_context_includes_authoritative_current_and_proposed_quotes(self):
        context = server.model_context('대 사이즈로 바꿔 주세요. 6500원 이하일 때만', self.state(), [], [])
        quote = context['screen']['current_order_quote']
        self.assertEqual(quote['current_price'], 5600)
        self.assertEqual(quote['proposed_price'], 6700)
        self.assertFalse(quote['budget_satisfied'])

    def test_paid_order_guard_still_wins_over_conditional_change(self):
        state = {**self.state(), 'paid': True}
        result = server.execute_plan(self.plan(), state, '대 사이즈로 바꿔 주세요. 7000원 이하로요.')
        self.assertEqual(result['items'], [])
        self.assertIn('결제', result['reply'])

    def test_quotes_cover_other_explicit_paid_options(self):
        state = self.state(shot=0)
        for text, price in [('오트밀크로 변경하면 얼마예요?', '5,600원'),
                            ('바닐라 시럽 추가하면 얼마예요?', '5,500원')]:
            with self.subTest(text=text):
                result = server.execute_plan(self.plan(reply='100원이에요.'), state, text)
                self.assertIn(price, result['reply'])
                self.assertEqual(result['items'], [])

    def test_invalid_extra_is_not_quoted_as_successful(self):
        state = self.state(shot=2)
        result = server.execute_plan(self.plan(reply='100원이에요.'), state, '샷 하나 더 추가하면 얼마예요?')
        self.assertIn('적용할 수 없어요', result['reply'])
        self.assertEqual(result['items'], [])

    def test_strict_grader_does_not_accept_generic_milk_or_budget_words(self):
        generic = dict(reply='우유가 표기되지 않은 메뉴예요. 금액은 선택하면 확인할 수 있어요.', items=[], warnings=[])
        self.assertFalse(completeness_checks('milk_foam_conflict', generic)['foam_milk_reason_explicit'])
        self.assertFalse(completeness_checks('followup_budget', generic)['actual_price_explained'])

    def test_strict_grader_rejects_reversed_comparison(self):
        wrong = dict(reply='아메리카노보다 카푸치노가 더 진해요. 4200원 4700원 5800원')
        self.assertFalse(completeness_checks('comparison_price', wrong)['correct_comparison'])


if __name__ == '__main__':
    unittest.main()
