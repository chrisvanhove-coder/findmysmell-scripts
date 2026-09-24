#!/usr/bin/env python3
"""Раскладывает сохранённый ответ Webflow MCP get_page_content по файлам.

Один файл на страницу: webflow/page-text/<папка>/<slug>.json. Внутри — узлы
как есть, вместе с HTML: из них видно и сам текст, и к какому варианту ответа
он привязан (data-answer-key). Если узлов у страницы больше, чем вернула
страница ответа, это печатается отдельной строкой — значит нужен второй
запрос со смещением, и молча терять хвост нельзя.
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'webflow', 'page-text')

def main(paths):
    written, truncated = 0, []
    for path in paths:
        for block in json.load(open(path, encoding='utf-8')):
            item = json.loads(block['text'])
            folder, slug = item['label'].split('/', 1)
            r = item['result']
            pg = r.get('pagination', {})
            if pg.get('total', 0) > pg.get('limit', 0) + pg.get('offset', 0):
                truncated.append(f"{item['label']} ({pg})")
            outdir = os.path.join(ROOT, folder)
            os.makedirs(outdir, exist_ok=True)
            with open(os.path.join(outdir, f'{slug}.json'), 'w', encoding='utf-8') as f:
                json.dump(r, f, ensure_ascii=False, indent=2)
                f.write('\n')
            written += 1
            texts = sum(1 for n in r['nodes'] if n['type'] == 'text')
            print(f"{folder}/{slug}.json  узлов {len(r['nodes'])}, из них текстовых {texts}")
    print(f"\nстраниц записано: {written}")
    if truncated:
        print('ХВОСТ НЕ ВЫГРУЖЕН: ' + '; '.join(truncated))
        sys.exit(1)

if __name__ == '__main__':
    main(sys.argv[1:])
