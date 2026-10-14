"""Combine frontend sources and supplied data into a standalone kiosk page."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
FRONTEND = ROOT / 'frontend'


def build():
    menu, options, lexicon, store = [
        json.loads((DATA / name).read_text(encoding='utf-8'))
        for name in ['menu.json', 'options.json', 'lexicon.json', 'store.json']
    ]
    docs = [json.loads(line) for line in (DATA / 'rag_docs.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()]

    def doc_map(kind):
        return {doc['metadata']['id'].removeprefix(kind + '_'): doc['page_content'].split('\n', 1)[-1]
                for doc in docs if doc['metadata']['type'] == kind}

    menu.update(options=options, lexicon=lexicon['words'], store=store, docs=docs,
                seats=store['seats_free'], wait=store['wait_minutes'],
                faq=doc_map('faq'), policy=doc_map('policy'))
    menu['situ'] = {
        doc['metadata']['id']: next((line.removeprefix('어울리는 상황: ') for line in doc['page_content'].splitlines()
                                    if line.startswith('어울리는 상황: ')), '')
        for doc in docs if doc['metadata']['type'] == 'menu'
    }
    sold_out = {item['id'] for item in store['sold_out']}
    for item in menu['items']:
        item['sold_out'] = item['sold_out'] or item['id'] in sold_out

    script = 'const D = ' + json.dumps(menu, ensure_ascii=False) + ';\n'
    script += '\n'.join((FRONTEND / name).read_text(encoding='utf-8')
                        for name in ['base.js', 'screens.js', 'ai-client.js'])
    styles = '\n'.join((FRONTEND / name).read_text(encoding='utf-8') for name in ['base.css', 'styles.css'])
    html = (FRONTEND / 'index.html').read_text(encoding='utf-8')
    html = html.replace('/* INJECT_STYLES */', styles).replace('/* INJECT_SCRIPT */', script)
    (ROOT / 'dist').mkdir(exist_ok=True)
    (ROOT / 'artifacts').mkdir(exist_ok=True)
    (ROOT / 'dist/index.html').write_text(html, encoding='utf-8')
    (ROOT / 'artifacts/app.js').write_text(script, encoding='utf-8')
    print('프로토타입 생성 완료:', len(menu['items']), '개 메뉴,', len(menu['toppings']), '개 토핑,', len(options['extras']), '개 추가 옵션')


if __name__ == '__main__':
    build()
