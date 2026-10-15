"""Strict checks for the four real-response failures, reusable by offline/live QA."""
import re


def completeness_checks(key, result):
    reply = result.get('reply', '')
    messages = [reply] + result.get('warnings', [])
    if key == 'comparison_price':
        return {
            'correct_comparison': bool(re.search(r'아메리카노(?:가|는|\s*쪽이)[^.?!]*(?:더|가장)\s*진', reply)),
            'both_menu_prices': all(value in reply.replace(',', '') for value in ['4200', '4700', '5800']),
            'no_unasked_caffeine': '카페인' not in reply,
        }
    if key == 'changed_caffeine_unknown':
        return {'modified_scope_explained': bool(re.search(r'추가|변경', reply)) and bool(re.search(r'자료에 없|확인|알 수 없|정보가 없', reply))}
    if key == 'milk_foam_conflict':
        return {
            'foam_milk_reason_explicit': any(re.search(r'치즈폼.{0,25}우유|우유.{0,25}치즈폼', line) for line in messages),
            'no_milk_foam_order': not any({'치즈폼', '밀크폼'} & set(record['cfg']['tops']) for record in result.get('items', [])),
            'no_milk_foam_cards': not any({'치즈폼', '밀크폼'} & set(cfg['tops']) for cfg in result.get('recommendation_options', {}).values()),
        }
    if key == 'followup_budget':
        return {'actual_price_explained': '6700' in reply.replace(',', ''),
                'budget_explained': '6500' in reply.replace(',', ''),
                'selection_preserved': not result.get('items') and bool(re.search(r'유지|변경하지|바꾸지', reply))}
    return {}
