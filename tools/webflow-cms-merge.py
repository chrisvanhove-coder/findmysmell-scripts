#!/usr/bin/env python3
"""Собирает выгрузку коллекции Perfumes из сохранённых ответов Webflow MCP.

Ответы приходят страницами и не влезают в контекст, поэтому сохраняются на
диск — где как JSON-массив блоков, где просто текстом. Здесь и то и другое
разбирается одинаково, страницы склеиваются, дубли по (id, cmsLocaleId)
убираются: окна запросов перекрываются намеренно, чтобы ни одна позиция
не потерялась между страницами.
"""
import json, os, re, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'webflow', 'cms-perfumes.json')
EXPECTED = 226

def objects(path):
    """Все JSON-объекты верхнего уровня из сохранённого ответа."""
    raw = open(path, encoding='utf-8').read()
    try:
        blocks = json.loads(raw)
        if isinstance(blocks, list) and blocks and isinstance(blocks[0], dict) and 'text' in blocks[0]:
            return [json.loads(b['text']) for b in blocks]
    except json.JSONDecodeError:
        pass
    out, dec, i = [], json.JSONDecoder(), 0
    while i < len(raw):
        if raw[i] != '{':
            i += 1
            continue
        obj, end = dec.raw_decode(raw, i)
        out.append(obj)
        i = end
    return out

def main(paths):
    items, schema = {}, None
    for path in paths:
        for o in objects(path):
            if o.get('action') == 'get_collection_details':
                schema = o['result']
            elif o.get('action') == 'list_collection_items':
                for it in o['result']['items']:
                    items[(it['id'], it['cmsLocaleId'])] = it
    rows = sorted(items.values(), key=lambda i: (i['fieldData'].get('slug') or '', i['cmsLocaleId']))
    doc = {
        '_source': 'Webflow CMS, коллекция Perfumes 69a98cf59fdd29cc5791200a, '
                   'сайт 69773aa3fded0e0107b28cbd. Выгружено 2026-09-24, как есть.',
        '_locales': {'69a98cf53a8601ad66e703e8': 'en (primary)',
                     '69e0e9ba711b9d5d89b4b2c6': 'fr-FR'},
        'collection': schema,
        'items': rows,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write('\n')
    per_locale = {}
    for it in rows:
        per_locale[it['cmsLocaleId']] = per_locale.get(it['cmsLocaleId'], 0) + 1
    print(f'позиций всего: {len(rows)} (ожидалось {EXPECTED})')
    print('по локалям:', per_locale)
    print('уникальных id:', len({i["id"] for i in rows}))
    if len(rows) != EXPECTED:
        sys.exit(f'НЕ СОШЛОСЬ: {len(rows)} вместо {EXPECTED}')

if __name__ == '__main__':
    main(sys.argv[1:])
