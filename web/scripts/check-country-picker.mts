/**
 * Сверка поиска по странам (Q_REGION_NOW, Q_REGION_CHILD) с продом.
 *
 * Запуск:  cd web && npm run check:country
 *
 * Здесь четыре вещи.
 *
 * 1. Список стран — тот же и в том же порядке. Это не мелочь: в списке
 *    прода есть свои особенности (Гонконг стоит между Германией и Ганой,
 *    а не по алфавиту), и «поправить» их нельзя — данные уже собраны с
 *    этим списком.
 * 2. Цвета двух палитр и числа виджета взяты из эмбедов дословно.
 * 3. В воронку название страны не уходит: это введённое значение, а не
 *    код варианта, и на этом стоит освобождение CNIL.
 * 4. Клавиатура работает — в проде её не было вовсе.
 */
import { readFileSync } from 'node:fs';
import { MECHANICS } from '../src/components/quiz/mechanics';
import { COUNTRIES } from '../src/data/countries';
import { isCountryQuestion } from '../src/data/countries';
import { QUESTION_COPY } from '../src/data/question-titles';
import data from '../src/data/country-picker.json';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const PALETTES = data.palettes as Record<string, Record<string, string>>;
const G = data.geometry;
const css = readFileSync('src/components/quiz/country-picker.module.css', 'utf8');
const src = readFileSync('src/components/quiz/CountryPicker.tsx', 'utf8');
const screen = readFileSync('src/app/[locale]/quiz/[question]/QuizScreen.tsx', 'utf8');

const PAGES: Record<string, string> = {
  Q_REGION_NOW: 'q-region-now',
  Q_REGION_CHILD: 'q-region-child',
};

console.log('\nДва вопроса, один виджет');
{
  for (const id of Object.keys(PAGES)) {
    check(`${id}: механика подключена`, MECHANICS[id] !== undefined);
    check(`${id}: своя палитра есть`, PALETTES[id] !== undefined);
    check(`${id}: вопрос на месте — «${QUESTION_COPY[id]?.title}»`,
      typeof QUESTION_COPY[id]?.title === 'string');
    check(`${id}: квиз считает его вопросом про страну`, isCountryQuestion(id));
  }
  check('и это одна и та же механика на оба',
    MECHANICS.Q_REGION_NOW === MECHANICS.Q_REGION_CHILD);
  const extra = Object.keys(PALETTES).filter((id) => PAGES[id] === undefined);
  check('лишних палитр нет', extra.length === 0, extra.join(', '));
}

console.log('\nСписок стран — тот же и в том же порядке');
{
  const prod = readFileSync('../webflow/live-pages/q-region-now.footer.html', 'utf8');
  const block = /var COUNTRIES = \[([\s\S]*?)\];/.exec(prod);
  check('список найден в прод-коде', block !== null);
  if (block) {
    const prodList = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    check(`в проде ${prodList.length} стран`, prodList.length > 150, String(prodList.length));
    check('столько же у нас', COUNTRIES.length === prodList.length,
      `${COUNTRIES.length} против ${prodList.length}`);
    check('и порядок тот же',
      COUNTRIES.join('|') === prodList.join('|'),
      COUNTRIES.filter((c, i) => c !== prodList[i]).slice(0, 3).join(', '));
    /* Особенность прод-списка: Гонконг стоит не по алфавиту. Проверяем
       намеренно — чтобы никто не «починил» порядок по алфавиту и не
       разошёлся с уже собранными ответами. */
    const hk = prodList.indexOf('Hong Kong (SAR China)');
    check('Гонконг стоит там же, где в проде (не по алфавиту)',
      COUNTRIES.indexOf('Hong Kong (SAR China)') === hk,
      `у нас ${COUNTRIES.indexOf('Hong Kong (SAR China)')}, в проде ${hk}`);
  }

  // Второй эмбед должен нести тот же список.
  const child = readFileSync('../webflow/live-pages/q-region-child.footer.html', 'utf8');
  const childBlock = /var COUNTRIES = \[([\s\S]*?)\];/.exec(child);
  const childList = childBlock
    ? [...childBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  check('в обоих эмбедах прода список одинаков',
    childList.join('|') === COUNTRIES.join('|'), String(childList.length));
}

console.log('\nЦвета палитр — из эмбедов');
{
  for (const [id, page] of Object.entries(PAGES)) {
    const prod = readFileSync(`../webflow/live-pages/${page}.footer.html`, 'utf8');
    /* Пробелы убираем целиком: в проде цвета записаны без пробелов
       после запятых — rgba(255,255,255,0.08), а в нашем CSS с ними,
       и это одно и то же значение. */
    const tight = prod.replace(/\s+/g, '');
    const p = PALETTES[id];
    const has = (needle: string, why: string) =>
      check(`${id}: ${needle} (${why})`,
        tight.includes(needle.replace(/\s+/g, '')), 'в прод-коде не нашёл');

    has(`color: ${p.question};`, 'цвет вопроса');
    has(`background: ${p.inputBg};`, 'фон поля');
    has(`border: 1px solid ${p.inputBorder};`, 'рамка поля');
    has(`border-color: ${p.inputFocus};`, 'рамка поля в фокусе');
    has(`background: ${p.listBg};`, 'фон списка');
    has(`border: 1px solid ${p.listBorder};`, 'рамка списка');
    has(`color: ${p.item};`, 'цвет пункта');
    has(`background: ${p.itemHoverBg};`, 'подсветка пункта');
    has(`background: ${p.scrollThumb};`, 'ползунок прокрутки');
  }
  check('в CSS цвета приходят переменными, а не двумя наборами классов',
    css.includes('var(--cp-list-bg') && css.includes('var(--cp-question'));
}

console.log('\nЧисла виджета — из эмбедов');
{
  const prod = readFileSync('../webflow/live-pages/q-region-now.footer.html', 'utf8');
  const flat = prod.replace(/\s+/g, ' ');
  const both = (needle: string, why: string) => check(`${needle} (${why})`,
    flat.includes(needle) && css.replace(/\s+/g, ' ').includes(needle),
    'должно быть и в проде, и у нас');

  both(`padding: ${G.outerPadPx}px;`, 'отступ экрана');
  both(`max-width: ${G.maxWidthPx}px;`, 'ширина колонки');
  both('font-size: clamp(22px, 4vw, 36px);', 'кегль вопроса');
  both('letter-spacing: 0.04em;', 'межбуквенное вопроса');
  both('text-transform: uppercase;', 'вопрос капсом');
  both(`padding: ${G.inputPadY}px ${G.inputPadX}px;`, 'отступы поля');
  both(`font-size: ${G.inputFontPx}px;`, 'кегль поля');
  both(`top: calc(100% + ${G.listOffsetPx}px);`, 'список ниже поля');
  both(`max-height: ${G.listMaxHeightPx}px;`, 'высота списка');
  both(`padding: ${G.itemPadY}px ${G.itemPadX}px;`, 'отступы пункта');
  both(`font-size: ${G.itemFontPx}px;`, 'кегль пункта');
  both('font-style: italic;', '«No results» курсивом');
  both(`padding: ${G.outerPadSmallPx}px;`, 'отступ экрана на телефоне');
  both(`padding: ${G.inputPadYSmall}px ${G.inputPadXSmall}px;`, 'поле на телефоне');
  both(`padding: ${G.itemPadYSmall}px ${G.itemPadXSmall}px;`, 'пункт на телефоне');

  check(`подсказка в поле — «${data.placeholder}»`,
    flat.includes(`placeholder="${data.placeholder}"`) && src.includes('data.placeholder'));
  check(`пусто — «${data.empty}»`, flat.includes(`>${data.empty}<`) && src.includes('data.empty'));
}

console.log('\nНазвание страны не уходит в статистику');
{
  check('в воронку код ответа для страны не пишется',
    screen.includes('isCountryQuestion(question.id) ? {} : { answerCode: code }'),
    'страна — введённое значение; на этом стоит освобождение CNIL');
}

console.log('\nИсправления против прода на месте');
{
  check('это combobox с listbox, а не div с mousedown',
    src.includes('role="combobox"') && src.includes('role="listbox"')
    && src.includes('role="option"'));
  check('стрелки и Enter работают',
    src.includes("e.key === 'ArrowDown'") && src.includes("e.key === 'Enter'"));
  check('Escape закрывает список', src.includes("e.key === 'Escape'"));
  check('пункты — кнопки, попадают под фокус', src.includes('type="button"'));
  /* Ищем именно код, а не слово: в комментарии компонента innerHTML
     упомянут как то, что исправлено. */
  check('список не рисуется через innerHTML',
    !/innerHTML\s*=/.test(src) && !src.includes('dangerouslySetInnerHTML'),
    'в проде 190 узлов пересоздавались на каждую букву');
  check('сохранение и переход остаются на QuizScreen',
    src.includes('onChoose(country)') && !src.includes('localStorage'),
    'в проде эмбед сам писал в хранилище и делал location.href');

  /* ГЛАВНОЕ ПРО ЛОКАЛИ. С 24.09.2026 список показывается на языке
     страницы, но НАРУЖУ уходит английское название: под ним лежат уже
     собранные прохождения, и `missingQuestions` сверяет ответ именно с
     COUNTRIES. Начни сохранять то, что человек видит, — и в одной
     колонке окажутся «Russia», «Russie» и «Россия».
     Поэтому здесь проверяется не перевод, а что его НЕ передают в
     onChoose. */
  check('наружу уходит английское название, а не переведённое',
    /onChoose\(country\)/.test(src) && !/onChoose\(countryLabel/.test(src),
    'в базе окажутся три написания одной страны');
  check('на экране название переведено',
    /countryLabel\(locale, c\)/.test(src));
  check('поиск ищет и по переводу, и по английскому',
    /countryMatches\(locale, c, query\)/.test(src),
    'иначе на русской странице «Ital» ничего не находит');
  check('своего зерна на экране нет: оно общее', !src.includes('createImageData'));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nПоиск по странам сходится с продом.\n');
process.exit(failed ? 1 : 0);
