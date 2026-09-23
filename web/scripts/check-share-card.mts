/**
 * Проверка раскладки шеринговой карточки.
 *
 * Запуск:  cd web && npm run check:share
 *
 * Карточка рисуется на canvas абсолютными координатами, поэтому текст,
 * который не влез, никуда не переносится — он просто наезжает на бутылку
 * или уходит за край. Проверить это глазами на семи архетипах каждый раз
 * никто не будет, поэтому арифметика проверяется здесь.
 */
import { existsSync, readFileSync } from 'node:fs';
import {
  LAYOUT, parsePunch, punchFits, punchHeight,
  contrast, punchColor, MIN_PUNCH_CONTRAST,
} from '../src/lib/share-card.ts';
import punchLines from '../src/data/punch-lines.en.json' with { type: 'json' };
import tagLines from '../src/data/tag-lines.en.json' with { type: 'json' };
import shareCards from '../src/data/share-cards.en.json' with { type: 'json' };
import punchLinesFr from '../src/data/punch-lines.fr.json' with { type: 'json' };
import shareCardsFr from '../src/data/share-cards.fr.json' with { type: 'json' };
import perfumes from '../src/data/perfumes.json' with { type: 'json' };
import { splitPerfume } from '../src/lib/perfume-name.ts';

type CardArch = { bg: string; text: string; accent: string };

const KEYS = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

console.log('\nФормат');
check('1080×1350 — это 4:5, вертикаль инстаграма',
  LAYOUT.W === 1080 && LAYOUT.H === 1350 && LAYOUT.H / LAYOUT.W === 1.25);

console.log('\nПанчлайн влезает в свою полосу у всех семи');
{
  const available = LAYOUT.bottleZoneTop - LAYOUT.punchStartY;
  console.log(`  (полоса ${available}px: от ${LAYOUT.punchStartY} до бутылки на ${LAYOUT.bottleZoneTop})\n`);
  let tallest = 0;
  for (const key of KEYS) {
    const punch = parsePunch((punchLines as Record<string, unknown>)[key]);
    const h = punchHeight(punch);
    tallest = Math.max(tallest, h);
    check(`${key.padEnd(10)} ${String(h).padStart(3)}px в ${punch.length} строк`,
      punchFits(punch), `не влезает: ${h}px > ${available}px`);
  }
  check('запас у самого высокого больше 20px', available - tallest > 20,
    `запас ${available - tallest}px`);
}

console.log('\nПорядок сверху вниз без наездов');
{
  const steps: Array<[string, number]> = [
    ['@tag', LAYOUT.tagY],
    ['линия под @tag', LAYOUT.tagRuleY],
    ['панчлайн', LAYOUT.punchStartY],
    ['бутылка', LAYOUT.bottleZoneTop],
    ['название парфюма', LAYOUT.perfumeNameY],
    ['дом парфюма', LAYOUT.perfumeBrandY],
    ['подвал', LAYOUT.footerY],
  ];
  for (let i = 1; i < steps.length; i += 1) {
    check(`${steps[i][0]} ниже, чем ${steps[i - 1][0]}`, steps[i][1] > steps[i - 1][1],
      `${steps[i][1]} vs ${steps[i - 1][1]}`);
  }
  check('бутылка не наезжает на название парфюма',
    LAYOUT.bottleZoneTop + LAYOUT.bottleH < LAYOUT.perfumeNameY,
    `${LAYOUT.bottleZoneTop + LAYOUT.bottleH} vs ${LAYOUT.perfumeNameY}`);
  check('подвал не уходит за край', LAYOUT.footerY + LAYOUT.footerFontSize < LAYOUT.H);
  check('@tag не наезжает на свою линию',
    LAYOUT.tagY < LAYOUT.tagRuleY && LAYOUT.tagRuleY - LAYOUT.tagY < LAYOUT.tagFontSize + 20);
  // Пустоты быть не должно: с карточки ушёл headline, и если ничего не
  // подвинуть, нижняя треть останется голой.
  const gap = LAYOUT.footerY - LAYOUT.perfumeBrandY;
  check('под домом парфюма нет провала больше 200px', gap <= 200, `провал ${gap}px`);
}

console.log('\nДанные на месте у всех семи');
for (const key of KEYS) {
  const tag = (tagLines as Record<string, string>)[key];
  const card = (shareCards as Record<string, { bg: string; text: string; accent: string }>)[key];
  check(`${key}: строка @tag начинается с «@tag»`,
    typeof tag === 'string' && tag.startsWith('@tag'), String(tag));
  check(`${key}: цвета фона и текста заданы`,
    Boolean(card?.bg && card?.text && card?.accent));
  check(`${key}: фон и текст не одного цвета`,
    card?.bg?.toLowerCase() !== card?.text?.toLowerCase(),
    `${card?.bg} / ${card?.text}`);
}

console.log('\nКонтраст: карточку смотрят в ленте, мельком');
{
  for (const key of KEYS) {
    const c = (shareCards as Record<string, CardArch>)[key];

    // Панчлайн — главная надпись, и цвет для него выбирает punchColor:
    // держит цвет палитры, пока он читается, иначе берёт акцент. У
    // THERAPIST в проде было 2.6:1, то есть надпись не читалась вовсе.
    const punchInk = punchColor(c);
    const main = contrast(punchInk, c.bg);
    check(`${key.padEnd(10)} панчлайн к фону ${main.toFixed(1)}:1`,
      main >= MIN_PUNCH_CONTRAST,
      `ни text (${contrast(c.text, c.bg).toFixed(1)}:1), ни accent `
      + `(${contrast(c.accent, c.bg).toFixed(1)}:1) не читаются на ${c.bg}`);

    if (punchInk !== c.text) {
      console.log(`        └ цвет палитры (${c.text}) давал `
        + `${contrast(c.text, c.bg).toFixed(1)}:1, взят акцент ${punchInk}`);
    }

    // Акцентом набран дом парфюма — мелким кеглем.
    const alt = contrast(c.accent, c.bg);
    check(`${key.padEnd(10)} дом парфюма к фону ${alt.toFixed(1)}:1`, alt >= 3,
      'этим цветом набран мелкий текст — ниже 3:1 он пропадает');
  }
}

console.log('\nБитые данные не роняют рисование');
{
  check('не массив → пусто', parsePunch(null).length === 0);
  check('строка вместо массива → пусто', parsePunch('nope').length === 0);
  check('строка без кегля отбрасывается', parsePunch([['текст']]).length === 0);
  check('кегль строкой отбрасывается', parsePunch([['текст', '40']]).length === 0);
  check('нулевой кегль отбрасывается', parsePunch([['текст', 0]]).length === 0);
  check('пустой текст отбрасывается', parsePunch([['', 40]]).length === 0);
  check('целая строка проходит', parsePunch([['текст', 40]]).length === 1);
  check('лишние элементы в строке не мешают',
    parsePunch([['текст', 40, 'мусор']]).length === 1);
}

console.log('\nФранцузская карточка: те же семь архетипов и та же полоса');
{
  const available = LAYOUT.bottleZoneTop - LAYOUT.punchStartY;
  for (const key of KEYS) {
    const punch = parsePunch((punchLinesFr as Record<string, unknown>)[key]);
    const h = punchHeight(punch);
    check(`${key.padEnd(10)} ${String(h).padStart(3)}px в ${punch.length} строк`,
      punch.length > 0 && punchFits(punch),
      punch.length === 0 ? 'нет строк' : `не влезает: ${h}px > ${available}px`);
  }
  /* Текст французской карточки взят с живого сайта дословно. Сверяем с
     источником — `share-cards.fr.json`, который собран из
     result-shared-fr.js: панчлайн это его headline, разбитый по строкам. */
  for (const key of KEYS) {
    const fromCard = String((shareCardsFr as Record<string, { headline: string }>)[key].headline)
      .split('\n').map((l) => l.trim()).filter(Boolean);
    const fromPunch = parsePunch((punchLinesFr as Record<string, unknown>)[key]).map(([t]) => t);
    check(`${key.padEnd(10)} совпадает с headline живого сайта`,
      fromCard.join('|') === fromPunch.join('|'),
      `карточка: ${fromCard.join('|')}\n        панчлайн: ${fromPunch.join('|')}`);
  }
  /* Строки @tag по-французски переведены с английского по просьбе
     заказчицы (на живом сайте их не было). Здесь сверяется не текст —
     его не с чем сверять, — а что набор полный и подключён: пустая
     строка на карточке не ошибка для движка, она просто не рисуется,
     и пропажа одного архетипа прошла бы молча. */
  const hasFrTags = existsSync('src/data/tag-lines.fr.json');
  check('французские строки @tag есть', hasFrTags,
    'если их снова нет — сюда вернётся прежнее поведение с пустой строкой');
  if (hasFrTags) {
    check('и подключены в page.tsx',
      readFileSync('src/app/[locale]/result/[archetype]/page.tsx', 'utf8')
        .includes('tag-lines.fr.json'),
      'файл есть, но карточка его не читает');
    const frTags = JSON.parse(readFileSync('src/data/tag-lines.fr.json', 'utf8'));
    const missing = KEYS.filter((k) => !String(frTags[k] ?? '').trim());
    check('и написаны для всех семи архетипов',
      missing.length === 0, missing.join(', '));
    check('и все начинаются с @', KEYS.every((k) => String(frTags[k]).startsWith('@')));
  }
}

console.log('\nИмя парфюма и дом — по одному разу');
{
  const items = perfumes as Array<{ name: string; house: string }>;
  let withHouse = 0;
  let bad = 0;
  for (const item of items) {
    const { name, house } = splitPerfume(item.name);
    // Дом не должен остаться внутри имени: иначе на карточке он
    // напечатается и в строке имени, и в строке бренда.
    if (name.includes(' by ')) { bad += 1; console.log(`  FAIL  дом остался в имени: ${name}`); }
    // И не должен продублироваться между строками.
    if (house && name.toLowerCase().includes(house.toLowerCase())) {
      bad += 1;
      console.log(`  FAIL  дом напечатается дважды: «${name}» + «${house}»`);
    }
    if (house) withHouse += 1;
  }
  check(`${items.length} позиций каталога разобраны без повторов`, bad === 0);
  check(`бренд известен у ${withHouse} из ${items.length}`, withHouse >= items.length - 12,
    'если известных стало заметно меньше — сломался разбор, а не данные');
  // Слаг из каталога на карточку не попадает ни при каких условиях.
  const slugs = items.filter((i) => splitPerfume(i.name).house === i.house && i.house.includes('-'));
  check('слаг из каталога на карточку не попадает', slugs.length === 0,
    slugs.slice(0, 3).map((i) => i.house).join(', '));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
