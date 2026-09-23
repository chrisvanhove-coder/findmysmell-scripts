/**
 * Сверка французского словаря с самим квизом.
 *
 * Запуск:  cd web && npm run check:locale
 *
 * ЗАЧЕМ. Французский появился позже кода и будет отставать от него
 * дальше: добавили вопрос — и он молча выходит по-английски на
 * французской странице, потому что t() честно отдаёт запасной вариант и
 * ничего не ломает. Это правильное поведение в проде и очень плохое при
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

const DICT = fr as unknown as Record<string, string>;
/** Ключи, начинающиеся с _, — это примечания, а не строки. */
const KEYS = Object.keys(DICT).filter((k) => !k.startsWith('_'));
const has = (key: string) => typeof DICT[key] === 'string' && DICT[key].trim() !== '';

const RAW = quizEn as Record<string, { answers?: { code: string; hint?: string }[] }>;
const IDS = Object.keys(RAW).filter((id) => !id.startsWith('_'));

console.log('\nЗаголовки вопросов');
{
  const missing = IDS.filter((id) => !has(`q.${id}.title`));
  check('у каждого вопроса есть французский заголовок',
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

console.log(failed
  ? `\n${failed} проверок упало\n`
  : '\nФранцузский словарь покрывает квиз целиком.\n');
process.exit(failed ? 1 : 0);
