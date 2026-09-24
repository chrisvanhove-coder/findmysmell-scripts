#!/usr/bin/env python3
"""Раскладывает сохранённый ответ Webflow MCP get_page_freeform_code по файлам.

Ответ MCP приходит слишком большим для контекста и сохраняется на диск как
JSON-массив блоков. Здесь он разбирается ровно один раз: каждая метка вида
"<папка>/<slug>" становится webflow/live-pages-<папка>/<slug>.<head|footer>.html.
Пустые блоки не пишутся — на странице их просто нет.
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'webflow')

def main(paths):
    written, empty = 0, []
    for path in paths:
        for block in json.load(open(path, encoding='utf-8')):
            item = json.loads(block['text'])
            folder, slug = item['label'].split('/', 1)
            outdir = os.path.join(ROOT, f'live-pages-{folder}')
            os.makedirs(outdir, exist_ok=True)
            for part in item['result']:
                content = part.get('content') or ''
                if not content.strip():
                    empty.append(f"{item['label']}.{part['location']}")
                    continue
                name = f"{slug}.{part['location']}.html"
                with open(os.path.join(outdir, name), 'w', encoding='utf-8') as f:
                    f.write(content if content.endswith('\n') else content + '\n')
                written += 1
                print(f"{folder}/{name}  {len(content)}")
    print(f"\nзаписано файлов: {written}")
    if empty:
        print("пусто (не записано): " + ', '.join(empty))

if __name__ == '__main__':
    main(sys.argv[1:])
