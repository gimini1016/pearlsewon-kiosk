from pathlib import Path
import json, re

ROOT = Path(__file__).parent
DATA = ROOT / 'data'
html = (ROOT / 'templates/prototype-base.html').read_text()
menu, options, lexicon, store = [json.loads((DATA / n).read_text()) for n in ['menu.json', 'options.json', 'lexicon.json', 'store.json']]
docs = [json.loads(x) for x in (DATA / 'rag_docs.jsonl').read_text().splitlines() if x.strip()]
def doc_map(kind):
    return {d['metadata']['id'].removeprefix(kind + '_'): d['page_content'].split('\n', 1)[-1] for d in docs if d['metadata']['type'] == kind}
menu['options'] = options
menu['lexicon'] = lexicon['words']
menu['situ'] = {d['metadata']['id']: next((s.removeprefix('어울리는 상황: ') for s in d['page_content'].splitlines() if s.startswith('어울리는 상황: ')), '') for d in docs if d['metadata']['type'] == 'menu'}
menu['faq'] = doc_map('faq')
menu['policy'] = doc_map('policy')
menu['seats'] = store['seats_free']
menu['wait'] = store['wait_minutes']
menu['store'] = store
menu['docs'] = docs
for item in menu['items']:
    item['sold_out'] = item['sold_out'] or item['id'] in {s['id'] for s in store['sold_out']}
script = html.split('<script>', 1)[1].split('</script>', 1)[0]
script = re.sub(r'const D = .*?;\s*const \$ =', lambda _: 'const D = ' + json.dumps(menu, ensure_ascii=False) + ';\nconst $ =', script, count=1, flags=re.S)
start = script.index('/* 발표 메모:')
end = script.index('function say(', start)
script = script[:start] + "function rag() {}\nfunction count() {}\nfunction decide() { S.dec++; }\n" + script[end:]
script = script.replace('function hear(text) {', 'function legacyHear(text) {', 1)
for name in ['taste','picks','full']:
    script = script.replace('function '+name+'() {', 'function legacy'+name.title()+'() {', 1)
script = script.replace(' transform="rotate(-90 16 ${c})"', '').replace(' transform="rotate(90 304 ${c})"', '')
script = script[:script.index("$('#f').addEventListener")]
# Keep data, menu rules and helpers; replace customer-facing screens and actions below.
enhancements = (ROOT / 'enhancements.js').read_text().replace('function hear(text){', 'function rulesHear(text){', 1)
# Reset is wrapped by the API client after the base screen helpers initialize.
enhancements = enhancements.replace('function reset(){', 'function rulesReset(){', 1)
enhancements = enhancements.replace('reset();\nwindow.pearlsewon=', 'rulesReset();\nwindow.pearlsewon=', 1)
script += '\n' + enhancements
script += '\n' + (ROOT / 'ai-client.js').read_text().replace('const baseReset = reset;', 'const baseReset = rulesReset;')
style = html.split('<style>', 1)[1].split('</style>', 1)[0] + '\n' + (ROOT / 'enhancements.css').read_text()
body = '''<main class="wrap"><div class="lab"><section class="k" aria-label="펄세권 주문 키오스크">
<header class="bar"><div class="brand"><span class="brand-icon">●</span><div><b>펄세권</b><small id="sn">취향대로, 한 잔</small></div></div><button class="mini theme-toggle" id="theme" type="button" aria-label="다크 모드로 전환">☾</button></header>
<div class="say" aria-live="polite"><p class="m" id="m"></p><div id="notes"></div></div>
<div class="body" id="body"></div>
<details class="conversation" id="conversation"><summary>나눈 대화 <span id="messageCount">0</span><span class="conversation-hint">펼쳐 보기</span></summary><div id="messages" role="log" aria-label="대화 기록"></div></details>
<nav class="help" aria-label="주문 도움"><button class="mini" type="button" id="back">← 뒤로</button><button class="mini" type="button" id="staff">직원 부르기</button><button class="mini" type="button" id="reset">처음으로</button></nav>
<form class="foot" id="f"><label class="sr" for="in">주문 또는 질문 입력</label><input id="in" autocomplete="off" placeholder="덜 달게, 치즈폼 추가해 주세요"><button type="submit">보내기</button></form>
</section></div></main><dialog id="dialog"><div id="dialogContent"></div><button class="go" id="closeDialog" type="button">닫기</button></dialog>'''
result = '<!doctype html>\n<html lang="ko" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="맛을 고르고 추천 조합을 다듬는 펄세권 버블티 주문 시연"><title>펄세권 · 취향대로 한 잔</title>'
result += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap"><style>' + style + '</style></head><body>' + body + '<script>' + script + '</script></body></html>'
(ROOT / 'dist/index.html').write_text(result)
(ROOT / 'dist/prototype.html').write_text(result)
(ROOT / 'app-check.js').write_text(script)
print('프로토타입 생성 완료:', len(menu['items']), '개 메뉴,', len(menu['toppings']), '개 토핑,', len(options['extras']), '개 추가 옵션')
