/**
 * Сверка словарей локалей с самим квизом.
 *
 * Запуск:  cd web && npm run check:locale
 *
 * ЗАЧЕМ. Переводы появились позже кода и будут отставать от него
 * дальше: добавили вопрос — и он молча выходит по-английски на
 * французской и русской странице, потому что t() честно отдаёт запасной
 * вариант и ничего не ломает. Это правильное поведение в проде и очень плохое при
 * разработке: пропуск не виден, пока на него не наткнётся человек.
 * Здесь он виден сразу.
 *
 * Проверяется четыре вещи.
 *
 * 1. У каждого вопроса есть французский заголовок, а у каждого варианта —
 *    французская подпись. Скрытые варианты не в счёт: их не показывают.
 * 2. Уточнение под вариантом (hint) переведено там, где оно есть в
 *    английском: половина французской строки — хуже английской целиком.
 * 3. В словаре нет ключей на коды, которых в квизе больше нет. Такой
 *    ключ — не безобидный мусор: при следующей правке его прочтут как
 *    «перевод уже есть».
 * 4. Надписи механик (слова барабана, уровни ползунков, короткие подписи
 *    шаров и живых экранов) переведены все до одной: они рисуются не из
 *    quiz.en.json, а из своих данных, и первой проверкой не ловятся.
 */
import fr from '../src/data/copy.fr.json';
import ru from '../src/data/copy.ru.json';
import archEn from '../src/data/archetypes.en.json';
import archFr from '../src/data/archetypes.fr.json';
import archRu from '../src/data/archetypes.ru.json';
import homeEn from '../src/data/home.en.json';
import homeFr from '../src/data/home.fr.json';
import homeRu from '../src/data/home.ru.json';
import punchEn from '../src/data/punch-lines.en.json';
import punchFr from '../src/data/punch-lines.fr.json';
import punchRu from '../src/data/punch-lines.ru.json';
import tagsEn from '../src/data/tag-lines.en.json';
import tagsFr from '../src/data/tag-lines.fr.json';
import tagsRu from '../src/data/tag-lines.ru.json';
import perfumes from '../src/data/perfumes.json';
import descFr from '../src/data/perfume-descriptions.fr.json';
import descRu from '../src/data/perfume-descriptions.ru.json';
import { QUESTIONS } from '../src/lib/quiz';
import quizEn from '../src/data/quiz.en.json';
import { QUESTION_COPY } from '../src/data/question-titles';
import drum from '../src/data/emotion-drum.json';
import blobs from '../src/data/childhood-blobs.json';
import sliders from '../src/data/bottle-sliders.json';
import living from '../src/data/living-screens.json';
import gender from '../src/data/gender-videos.json';
import prompts from '../src/data/question-open-prompts.json';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

type Dict = Record<string, string>;

/** Словари, которые обязаны покрывать квиз целиком. Английский — источник. */
const DICTS: Array<[string, Dict]> = [
  ['французский', fr as unknown as Dict],
  ['русский', ru as unknown as Dict],
];

/* Ниже всё проверяется для каждого словаря по очереди: DICT и has
   переключаются в цикле в конце файла. Ключи, начинающиеся с _, —
   это примечания, а не строки. */
let DICT: Dict = DICTS[0][1];
let LANG = DICTS[0][0];
let KEYS = Object.keys(DICT).filter((k) => !k.startsWith('_'));
const has = (key: string) => typeof DICT[key] === 'string' && DICT[key].trim() !== '';

const RAW = quizEn as Record<string, { answers?: { code: string; hint?: string }[] }>;
const IDS = Object.keys(RAW).filter((id) => !id.startsWith('_'));

function auditDict() {
  console.log('\nЗаголовки вопросов');
  {
    const missing = IDS.filter((id) => !has(`q.${id}.title`));
    check(`у каждого вопроса есть ${LANG} заголовок`,
      missing.length === 0, missing.join(', '));

    const subs = IDS.filter((id) => QUESTION_COPY[id]?.subtitle !== undefined);
    const missingSubs = subs.filter((id) => !has(`q.${id}.subtitle`));
    check('и уточнение под ним, где оно есть в английском',
      missingSubs.length === 0, missingSubs.join(', '));
  }

  console.log('\nПодписи вариантов');
  {
    const codes = IDS.flatMap((id) => QUESTIONS[id].answers.map((a) => a.code));
    const missing = codes.filter((code) => !has(`a.${code}`));
    check('переведены все показываемые варианты',
      missing.length === 0, missing.join(', '));

    const withHint = IDS.flatMap((id) =>
      (RAW[id].answers ?? []).filter((a) => a.hint).map((a) => a.code));
    const missingHints = withHint.filter((code) => !has(`a.${code}.hint`));
    check('и уточнения под ними',
      missingHints.length === 0, missingHints.join(', '));
  }

  console.log('\nВ словаре нет мёртвых ключей');
  {
    const live = new Set([
      ...IDS,
      ...IDS.flatMap((id) => (RAW[id].answers ?? []).map((a) => a.code)),
    ]);
    /* Ключи вида a.CODE / a.CODE.hint / q.ID.title / short.CODE / sub.CODE
       обязаны указывать на существующий код. Всё остальное — ui.*, dna.*,
       result.*, open.*, country.*, screen.* — к кодам квиза не привязано. */
    const dead = KEYS
      .filter((k) => /^(a|q|short|sub)\./.test(k))
      .filter((k) => {
        const id = k.split('.')[1];
        return !live.has(id);
      });
    check('каждый ключ указывает на существующий вопрос или вариант',
      dead.length === 0, dead.join(', '));
  }

  console.log('\nНадписи механик');
  {
    const screens: [string, string][] = [
      ['screen.Q_GENDER.question', gender.question],
      ['screen.Q_GENDER.hint', gender.hint],
      ['screen.Q_EMO.hint', drum.hint],
      ['screen.Q_EMO.prefix', drum.prefix.join('\n')],
      ['screen.Q_ENV_CHILD.question', blobs.question.join('\n')],
      ['screen.Q_DAYTDAY.question', living.Q_DAYTDAY.question],
      ['screen.Q_STAYWELL.question', living.Q_STAYWELL.question],
      ['screen.Q_SWEET.question', sliders.Q_SWEET.question.join('\n')],
      ['screen.Q_WILD.question', sliders.Q_WILD.question.join('\n')],
    ];
    const missingScreens = screens.filter(([k]) => !has(k)).map(([k]) => k);
    check('вопросы и подсказки экранов с механикой переведены',
      missingScreens.length === 0, missingScreens.join(', '));

    /* Короткие подписи: слово барабана, надпись на шаре, уровень ползунка
       и строка живого экрана — всё из тех же данных, что рисует экран.
       Годится и полная подпись варианта: shortLabel падает на неё, если
       короткой нет (см. lib/copy.ts), и на экране всё равно французский. */
    const shortCodes = [
      ...drum.items.map((i) => i.code),
      ...blobs.answers.map((a) => a.code),
      ...sliders.Q_SWEET.levels.map((l) => l.code),
      ...sliders.Q_WILD.levels.map((l) => l.code),
      ...Object.keys(living.Q_DAYTDAY.options),
      ...Object.keys(living.Q_STAYWELL.options),
    ];
    const missingShort = shortCodes
      .filter((code) => !has(`short.${code}`) && !has(`a.${code}`));
    check('короткие подписи переведены все',
      missingShort.length === 0, missingShort.join(', '));

    const subs = gender.options.map((o) => o.code);
    const missingSubs = subs.filter((code) => !has(`sub.${code}`));
    check('подзаголовки первого вопроса переведены',
      missingSubs.length === 0, missingSubs.join(', '));

    const openIds = Object.keys(prompts.prompts);
    const missingOpen = openIds.filter((id) => !has(`open.${id}`));
    check('вопросы окошка «Other» переведены',
      missingOpen.length === 0, missingOpen.join(', '));
  }
}

/* Один и тот же разбор для каждого словаря. Раньше файл проверял только
   французский; русский появился позже, и второй такой же файл разошёлся
   бы с первым при первой же правке. */
for (const [lang, dict] of DICTS) {
  LANG = lang;
  DICT = dict;
  KEYS = Object.keys(DICT).filter((k) => !k.startsWith('_'));
  console.log(`\n=== ${lang.toUpperCase()} ===`);
  auditDict();
}

/**
 * Содержательные файлы — архетипы, главная, карточка. Их t() не
 * накрывает: там не строки интерфейса, а тексты, и локаль выбирает файл
 * целиком. Значит и запасного варианта на уровне отдельного поля нет:
 * недостающее поле не подменится английским, а приедет как undefined.
 * Поэтому здесь сверяется ФОРМА — те же ключи, та же глубина.
 */
type Json = unknown;
function shape(value: Json, path = ''): Set<string> {
  const out = new Set<string>();
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      out.add(`${path}[${i}]`);
      for (const k of shape(v, `${path}[${i}]`)) out.add(k);
    });
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, Json>)) {
      if (k.startsWith('_')) continue;
      out.add(`${path}.${k}`);
      for (const kk of shape(v, `${path}.${k}`)) out.add(kk);
    }
  }
  return out;
}

console.log('\n=== СОДЕРЖАТЕЛЬНЫЕ ФАЙЛЫ ===');
{
  /* У архетипов число абзацев desc НАМЕРЕННО может различаться: русские
     тексты пришли из более ранней редакции, чем английские, и абзацев
     там местами меньше. Страница это переживает. Поэтому у архетипов
     сверяются ключи верхнего уровня и длины alts/ingredients, а не
     каждый индекс desc. */
  const KEYS_ARCH = Object.keys(archEn).filter((k) => !k.startsWith('_'));
  type Arch = Record<string, { desc: unknown[]; alts: unknown[]; ingredients: unknown[] }>;
  for (const [lang, cat] of [['французский', archFr], ['русский', archRu]] as Array<[string, unknown]>) {
    const c = cat as Arch;
    const missing = KEYS_ARCH.filter((k) => !c[k]);
    check(`архетипы: ${lang} — все семь на месте`, missing.length === 0, missing.join(', '));
    const e = archEn as unknown as Arch;
    const badAlts = KEYS_ARCH.filter((k) => c[k]?.alts?.length !== e[k].alts.length);
    check(`архетипы: ${lang} — столько же альтернатив`, badAlts.length === 0, badAlts.join(', '));
    const badIngr = KEYS_ARCH.filter((k) => c[k]?.ingredients?.length !== e[k].ingredients.length);
    check(`архетипы: ${lang} — столько же ингредиентов`, badIngr.length === 0, badIngr.join(', '));
    const emptyDesc = KEYS_ARCH.filter((k) => !(c[k]?.desc?.length > 0));
    check(`архетипы: ${lang} — текст не пустой`, emptyDesc.length === 0, emptyDesc.join(', '));
  }

  for (const [lang, copy] of [['французская', homeFr], ['русская', homeRu]] as Array<[string, unknown]>) {
    const a = shape(homeEn);
    const b = shape(copy);
    const lost = [...a].filter((k) => !b.has(k));
    check(`главная: ${lang} — те же поля`, lost.length === 0, lost.slice(0, 6).join(', '));
  }

  /* Заголовок главной разбирается на три строки (first/second/third);
     четвёртая пропала бы молча, на второй третья вышла бы пустой. */
  for (const [lang, copy] of [['английская', homeEn], ['французская', homeFr], ['русская', homeRu]] as Array<[string, { hero: { headline: string[] } }]>) {
    check(`главная: ${lang} — заголовок в три строки`,
      copy.hero.headline.length === 3, String(copy.hero.headline.length));
  }

  const KEYS_CARD = Object.keys(tagsEn).filter((k) => !k.startsWith('_'));
  for (const [lang, punch, tags] of [
    ['французская', punchFr, tagsFr], ['русская', punchRu, tagsRu],
  ] as Array<[string, Record<string, unknown[]>, Record<string, string>]>) {
    const noPunch = KEYS_CARD.filter((k) => !(punch[k]?.length > 0));
    check(`карточка: ${lang} — панчлайн у всех семи`, noPunch.length === 0, noPunch.join(', '));
    const noTag = KEYS_CARD.filter((k) => !String(tags[k] ?? '').trim());
    check(`карточка: ${lang} — строка @tag у всех семи`, noTag.length === 0, noTag.join(', '));
  }
  /* Описания флаконов. Это тот текст, который человек читает под
     флаконом и в письме, и его в каталоге 108 живых позиций. Пропуск
     здесь ничего не ломает — перевода нет, показывается английский, —
     поэтому заметить его можно только проверкой. */
  type Cat = { id: string; name: string; isDraft?: boolean; isArchived?: boolean };
  const live = (perfumes as unknown as Cat[]).filter((p) => !p.isDraft && !p.isArchived);
  const liveIds = new Set(live.map((p) => p.id));
  for (const [lang, desc] of [
    ['французские', descFr], ['русские', descRu],
  ] as Array<[string, Record<string, string>]>) {
    const missing = live.filter((p) => !String(desc[p.id] ?? '').trim());
    check(`описания флаконов: ${lang} есть у всех ${live.length}`,
      missing.length === 0, missing.map((p) => p.name).join(', '));
    /* Ключ на позицию, которой в каталоге больше нет, — не безобидный
       мусор: при следующей правке его прочтут как «перевод уже есть». */
    const dead = Object.keys(desc).filter((k) => !k.startsWith('_') && !liveIds.has(k));
    check(`описания флаконов: ${lang} без мёртвых ключей`,
      dead.length === 0, dead.join(', '));
  }

  const enPunchLines = Object.fromEntries(
    KEYS_CARD.map((k) => [k, (punchEn as Record<string, unknown[]>)[k].length]),
  );
  const oddRu = KEYS_CARD.filter((k) => (punchRu as Record<string, unknown[]>)[k].length !== enPunchLines[k]);
  check('карточка: у русского панчлайна столько же строк, сколько у английского',
    oddRu.length === 0, oddRu.join(', '));
}

console.log(failed
  ? `\n${failed} проверок упало\n`
  : '\nВсе словари покрывают квиз целиком.\n');
process.exit(failed ? 1 : 0);
