/**
 * Собирает markdown для вычитки описаний каталога из черновика перевода.
 *
 * Запуск:  cd web && npm run perfumes:review
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ШАГ. Вычитка 108 позиций идёт кругами: заказчица
 * присылает правки, они ложатся в `perfumes-translation-draft.json`, и
 * из него заново собирается то, что ей читать. Собирать руками значит
 * рано или поздно разойтись с черновиком и обсуждать текст, которого в
 * нём нет.
 *
 * Черновик НИКУДА НЕ ПОДКЛЮЧЁН: сайт по-прежнему читает английские
 * описания из `perfumes.json`. Подключение — отдельный шаг, после того
 * как все круги закончатся.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import perfumes from '../src/data/perfumes.json' with { type: 'json' };

interface Item {
  name: string;
  archetype: string;
  en: string;
  fr: string;
  ru: string;
  enWas?: string;
  edited?: string[];
}

const DRAFT = JSON.parse(
  readFileSync('../perfumes-translation-draft.json', 'utf8'),
) as { _round: string; items: Record<string, Item> };

const ORDER = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];
const TITLE: Record<string, string> = { OUTOFTIME: 'OUT OF TIME' };

type Perfume = { id: string; name: string; archetype: string; isDraft?: boolean; isArchived?: boolean };
const all = perfumes as unknown as Perfume[];
const live = all.filter((p) => !p.isDraft && !p.isArchived);
const skipped = all.filter((p) => p.isDraft || p.isArchived).map((p) => p.name).sort();

const out: string[] = [];
const w = (s = '') => out.push(s);

w('# Описания флаконов — французский и русский, на вычитку');
w();
w('**Это черновик. На сайт ничего не применено.**');
w();
w(`Здесь все **${live.length}** описаний каталога — те самые, что человек читает на`);
w('странице результата под флаконом и в письме.');
w();
w(`Состояние: ${DRAFT._round}.`);
w();
w(`Пять позиций пропущены — они помечены черновиком или архивом и на сайте не`);
w(`показываются (${skipped.join(', ')}).`);
w();
w('## Как читать');
w();
w('Сгруппировано по архетипам, внутри — в порядке каталога. Под каждым флаконом');
w('**EN** — то, что сейчас на сайте, **FR** и **RU** — что предлагаю.');
w();
w('**✎ рядом с названием** — строка, которую ты уже правила: там стоит твой вариант.');
w();
w('Отвечать построчно не нужно: напиши только те, где формулировка всё ещё не та.');
w();

for (const arch of ORDER) {
  const items = live.filter((p) => p.archetype === arch);
  w('---');
  w();
  w(`## ${TITLE[arch] ?? arch} — ${items.length} флаконов`);
  w();
  for (const p of items) {
    const it = DRAFT.items[p.id];
    if (!it) throw new Error(`нет перевода: ${p.name} (${p.id})`);
    w(`### ${it.name}${it.edited ? '  ✎' : ''}`);
    w();
    if (it.enWas) {
      w(`**EN** ${it.en}`);
      w();
      w(`> было: ${it.enWas}`);
    } else {
      w(`**EN** ${it.en}`);
    }
    w();
    w(`**FR** ${it.fr}`);
    w();
    w(`**RU** ${it.ru}`);
    w();
  }
}

writeFileSync('../PERFUMES-TRANSLATION-REVIEW.md', out.join('\n') + '\n');
console.log(`Собрано: ${live.length} позиций, правок ${
  Object.values(DRAFT.items).filter((i) => i.edited).length}`);
