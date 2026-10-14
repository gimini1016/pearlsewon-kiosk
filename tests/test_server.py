import unittest
from unittest.mock import patch
from backend import server


class OrderRules(unittest.TestCase):
    def config(self, iid):
        return server.defaults(server.BY_ID[iid])

    def test_base_and_included_prices(self):
        i=server.BY_ID['black_milktea_pearl'];c=self.config(i['id'])
        self.assertEqual(server.price(i,c),5500)
        warnings=server.apply_changes(i,c,[dict(field='size',value='대',mode='set'),dict(field='topping',value='치즈폼',mode='add')])
        self.assertEqual(warnings,[]);self.assertEqual(server.price(i,c),7700)
        server.apply_changes(i,c,[dict(field='topping',value='펄',mode='remove')])
        self.assertEqual(server.price(i,c),7700)

    def test_unavailable_size_and_fixed_sugar(self):
        i=server.BY_ID['brownsugar_milktea_pearl'];c=self.config(i['id'])
        warnings=server.apply_changes(i,c,[dict(field='size',value='소',mode='set'),dict(field='sugar',value='30',mode='set')])
        self.assertEqual(c['size'],'중');self.assertIsNone(c['sugar']);self.assertEqual(len(warnings),2)

    def test_smoothie_temperature_and_ice(self):
        i=server.BY_ID['lemon_yogurt'];c=self.config(i['id'])
        warnings=server.apply_changes(i,c,[dict(field='temp',value='HOT',mode='set'),dict(field='ice',value='적게',mode='set')])
        self.assertEqual(c['temp'],'ICE');self.assertIsNone(c['ice']);self.assertEqual(len(warnings),2)

    def test_max_toppings(self):
        i=server.BY_ID['black_milktea_pearl'];c=self.config(i['id'])
        warnings=server.apply_changes(i,c,[dict(field='topping',value=t,mode='add') for t in ['화이트펄','알로에','치즈폼']])
        self.assertEqual(len(c['tops']),3);self.assertTrue(warnings)

    def test_rebuild_untrusted_price_fields(self):
        i=server.BY_ID['black_milktea_pearl'];c=self.config(i['id']);c['incl']=['펄','치즈폼'];c['tops']+=['치즈폼'];c['price']=1
        cfg=server.normalize_config(i,c,'포장')
        self.assertEqual(cfg['incl'],['펄']);self.assertEqual(server.price(i,cfg),6400)

    def test_extra_scope(self):
        i=server.BY_ID['earlgrey_tea'];c=self.config(i['id'])
        warnings=server.apply_changes(i,c,[dict(field='shot',value='2',mode='set'),dict(field='oat',value='true',mode='set')])
        self.assertFalse(c['oat']);self.assertEqual(c['shot'],0);self.assertTrue(warnings)

    def test_modify_keeps_selected_menu(self):
        state={'item_id':'black_milktea_pearl','cfg':self.config('black_milktea_pearl')}
        plan={'intent':'modify','reply':'바꿨어요','items':[{'menu_id':'taro_milktea_pearl','quantity':1,'changes':[]}]}
        result=server.execute_plan(plan,state)
        self.assertEqual(result['items'],[]);self.assertEqual(result['intent'],'reply')

    def test_sold_out_and_hallucinated_recommendation(self):
        result=server.execute_plan({'intent':'recommend','reply':'추천','recommendations':['mango_smoothie','invented','taro_milktea_pearl']},{})
        self.assertEqual(result['recommendations'],['taro_milktea_pearl'])

    def test_paid_order_cannot_change(self):
        result=server.execute_plan({'intent':'order','reply':'주문'},{'paid':True})
        self.assertEqual(result['intent'],'reply');self.assertEqual(result['items'],[])

    def test_retrieval_current_menu(self):
        docs=server.retrieve('치즈폼이 뭐예요?','black_milktea_pearl')
        self.assertIn('black_milktea_pearl',[d['metadata']['id'] for d in docs])
        self.assertTrue(any(d['metadata']['type'] in ['topping','faq'] for d in docs))

    def test_provider_errors_never_return_body(self):
        import urllib.error
        error=urllib.error.HTTPError('https://api.openai.com',401,'secret',{},None)
        with patch.object(server,'settings',return_value={'key':'test-not-secret','model':'gpt-4.1-mini'}),patch.object(server.urllib.request,'urlopen',side_effect=error):
            with self.assertRaises(server.APIProblem) as caught:server.ask_model('안녕',{},[])
        self.assertEqual(caught.exception.code,'invalid_key');self.assertNotIn('secret',str(caught.exception))

    def plan(self, **kw):
        base = {'intent':'reply','reply':'','items':[],'recommendations':[],'target':'none','fulfillment':'none'}
        base.update(kw); return base

    def test_sold_out_dropped_silently_by_model_is_reported(self):
        # 모델이 품절 메뉴를 아예 빼고 보내도 손님 말에 있었으면 알린다
        r=server.execute_plan(self.plan(intent='order',items=[{'menu_id':'brownsugar_milktea_pearl','quantity':1,'changes':[]}]),{},'흑당 밀크티 + 펄이랑 망고 스무디 하나씩 주세요')
        self.assertEqual([i['menu_id'] for i in r['items']],['brownsugar_milktea_pearl'])
        self.assertIn('망고 스무디는 지금 품절이라 담지 않았어요.',r['warnings'])

    def test_sold_out_only_gives_handoff_phrase_and_alternatives(self):
        for intent,text in [('reply','망고 스무디 주세요'),('order','망고 스무디 주세요'),('reply','망고 스무디 있어요?')]:
            r=server.execute_plan(self.plan(intent=intent,reply='모델이 지은 말',items=[{'menu_id':'mango_smoothie','quantity':1,'changes':[]}] if intent=='order' else []),{},text)
            self.assertEqual(r['intent'],'sold_out',text)
            self.assertEqual(r['reply'],'죄송해요, 망고 스무디가 지금 품절이에요. 대신 이건 어떠세요?')
            self.assertTrue(r['recommendations']) ;self.assertNotIn('mango_smoothie',r['recommendations'])

    def test_info_question_about_sold_out_keeps_answer(self):
        r=server.execute_plan(self.plan(reply='망고 스무디에는 카페인이 없어요.'),{},'망고 스무디 카페인 있어요?')
        self.assertEqual(r['intent'],'reply');self.assertEqual(r['reply'],'망고 스무디에는 카페인이 없어요.')
        self.assertIn('망고 스무디는 지금 품절이에요.',r['warnings']);self.assertTrue(r['suggestions'])

    def test_reply_that_recommends_menus_shows_them(self):
        r=server.execute_plan(self.plan(reply='밤샘엔 아메리카노나 얼그레이티가 좋아요.'),{},'오늘 밤샐 거예요')
        self.assertEqual(r['suggestions'],['americano','earlgrey_tea'])

    def test_reply_about_named_menu_does_not_pop_cards(self):
        r=server.execute_plan(self.plan(reply='타로 밀크티 + 펄은 카페인이 없어요.'),{},'타로 밀크티에 카페인 있어요?')
        self.assertEqual(r['suggestions'],[])

    def test_recommend_reply_must_match_cards(self):
        r=server.execute_plan(self.plan(intent='recommend',reply='아메리카노와 카페라떼를 추천해요.',recommendations=['taro_milktea_pearl']),{},'추천해 줘')
        self.assertEqual(r['recommendations'],['taro_milktea_pearl']);self.assertNotIn('아메리카노',r['reply'])

    def test_unknown_says_so_and_returns_to_order(self):
        r=server.execute_plan(self.plan(intent='unknown',reply='날씨 앱을 보세요'),{},'오늘 날씨 어때요?')
        self.assertEqual(r['reply'],'그건 제가 대답하기 어려워요. 이어서 주문을 도와드릴게요.')
    def test_generic_bubble_tea_asks_back_with_cards(self):
        r=server.execute_plan(self.plan(intent='recommend',reply='블랙 밀크티 추천해요',recommendations=['black_milktea_pearl']),{},'버블티 주세요')
        self.assertEqual(r['intent'],'reply');self.assertIn('어떤 버블티',r['reply'])
        self.assertEqual(r['suggestions'][0],'black_milktea_pearl');self.assertTrue(all(i in server.BUBBLE_MENUS for i in r['suggestions']))
        r=server.execute_plan(self.plan(intent='navigate',target='taste'),{},'버블티 주세요')
        self.assertEqual(r['title'],'어떤 버블티로 드릴까요?')
        r=server.execute_plan(self.plan(intent='order',items=[{'menu_id':'brownsugar_milktea_pearl','quantity':1,'changes':[]}]),{},'흑당 버블티 주세요')
        self.assertNotEqual(r.get('title'),'어떤 버블티로 드릴까요?')
    def test_pearl_minutes_follow_screen_clock(self):
        self.assertEqual(server.pearl_now({'pearl_minutes_ago':0}),0)
        self.assertEqual(server.pearl_now({'pearl_minutes_ago':45}),server.STORE['pearl_minutes_ago'])

    def test_josa(self):
        self.assertEqual(server.josa('흑당 밀크티 + 펄','은','는'),'흑당 밀크티 + 펄은');self.assertEqual(server.josa('망고 스무디','이','가'),'망고 스무디가')

    def test_menus_in_prefers_longest_name(self):
        self.assertEqual(server.menus_in('망고 요구르트랑 아아'),['mango_yogurt_whitepearl','americano'])

    def test_reply_without_evidence_becomes_unknown(self):
        r=server.execute_plan(self.plan(reply='날씨는 맑아요',evidence=[],_allowed_evidence=['faq_펄','menu_catalog']),{},'오늘 날씨 어때요?')
        self.assertEqual(r['intent'],'unknown')
        r=server.execute_plan(self.plan(reply='펄은 타피오카예요',evidence=['faq_펄'],_allowed_evidence=['faq_펄','menu_catalog']),{},'펄이 뭐예요?')
        self.assertEqual(r['intent'],'reply')

    def test_hot_americano_alias(self):
        r=server.execute_plan(self.plan(intent='order',items=[{'menu_id':'americano','quantity':1,'changes':[{'field':'size','value':'대','mode':'set'}]}]),{},'뜨아 큰 걸로')
        self.assertEqual((r['items'][0]['cfg']['temp'],r['items'][0]['cfg']['size']),('HOT','대'))

    def test_not_on_menu_suggestion_card(self):
        r=server.execute_plan(self.plan(reply="청포도 에이드는 메뉴에 없어요. 대신 '청포도 스무디'를 추천해요.",evidence=['menu_catalog'],_allowed_evidence=['menu_catalog']),{},'청포도 에이드 있어요?')
        self.assertEqual(r['suggestions'],['greengrape_smoothie'])


    def test_generic_words_in_reply_do_not_pop_cards(self):
        r=server.execute_plan(self.plan(reply="펄은 버블티의 '버블'이에요.",evidence=['faq_펄'],_allowed_evidence=['faq_펄']),{},'펄이 뭐예요?')
        self.assertEqual(r['suggestions'],[])

    def test_off_topic_even_with_store_evidence(self):
        r=server.execute_plan(self.plan(reply='대기는 2분이에요.',evidence=['store'],_allowed_evidence=['store']),{},'오늘 날씨 어때요?')
        self.assertEqual(r['intent'],'unknown')

    def test_over_promise_sentence_removed(self):
        r=server.execute_plan(self.plan(reply='타로 밀크티에는 카페인이 없어요. 안심하고 드셔도 돼요.',evidence=['menu_catalog'],_allowed_evidence=['menu_catalog']),{},'타로 밀크티에 카페인 있어요?')
        self.assertEqual(r['reply'],'타로 밀크티에는 카페인이 없어요.')
    def test_allergy_reassurance_removed(self):
        r=server.execute_plan(self.plan(reply='대신 청포도 스무디를 권해 드려요. 우유가 없어 알레르기 걱정도 적습니다.',evidence=['menu_catalog'],_allowed_evidence=['menu_catalog']),{},'청포도 에이드 있어요?')
        self.assertEqual(r['reply'],'대신 청포도 스무디를 권해 드려요.')
    def test_less_sweet_recommend_keeps_only_low_sugar(self):
        r=server.execute_plan(self.plan(intent='recommend',reply='골라 봤어요.',recommendations=['brownsugar_milktea_pearl','americano','cafe_latte']),{},'덜 단 거 추천해 줘')
        self.assertEqual(r['recommendations'],['americano','cafe_latte'])
        r=server.execute_plan(self.plan(intent='recommend',reply='골라 봤어요.',recommendations=['greengrape_smoothie']),{},'안 달게 마시고 싶어요')
        self.assertTrue(r['recommendations']);self.assertTrue(all(server.BY_ID[i]['taste']['단맛']<=2 for i in r['recommendations']))
    def test_seats_follow_screen_state(self):
        self.assertEqual(server.seats_now({'seats_free':3}),3)
        self.assertEqual(server.seats_now({'seats_free':999}),server.STORE['seats_free'])
        self.assertEqual(server.seats_now({'seats_free':'2'}),server.STORE['seats_free'])
        self.assertEqual(server.seats_now({}),server.STORE['seats_free'])
    def test_caffeine_comparison_is_not_a_menu_suggestion(self):
        r=server.execute_plan(self.plan(reply='카페라떼는 아메리카노 한 잔쯤이에요(128mg).',evidence=['menu_catalog'],_allowed_evidence=['menu_catalog']),{},'카페라떼 카페인 얼마나 돼요?')
        self.assertEqual(r['suggestions'],[])
        self.assertEqual(server.caf_words(server.BY_ID['green_milktea']),'아메리카노 1/3잔쯤(49mg)')
        self.assertEqual(server.caf_words(server.BY_ID['taro_milktea_pearl']),'카페인 없어요')
    def test_named_menu_with_nowhere_to_go_becomes_order(self):
        r=server.execute_plan(self.plan(intent='navigate',target='none',reply='어느 화면으로 이동할까요?'),{},'블밀 버블티 주세요')
        self.assertEqual(r['intent'],'order');self.assertEqual(r['items'][0]['menu_id'],'black_milktea_pearl')

if __name__=='__main__':unittest.main()