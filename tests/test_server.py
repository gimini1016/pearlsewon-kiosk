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


if __name__=='__main__':unittest.main()
