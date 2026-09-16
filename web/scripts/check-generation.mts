/**
 * Сверка карточек поколений (Q_GENERATION) с продом.
 *
 * Запуск:  cd web && npm run check:generation
 *
 * Главное здесь — не текстуры, а два факта.
 *
 * 1. Годы привязаны к тем же кодам, что на живом сайте: перепутанная
 *    привязка означала бы, что человек выбирает «1965 – 1980», а
 *    записывается бумер.
 * 2. Пятый вариант («Other») на месте. На живом сайте карточки под него
 *    не сделали, а кнопка Webflow была скрыта — то есть выбрать его
 *    было нельзя вообще, и человек, не желающий называть возраст, не мог
 *    пройти этот вопрос никак.
 */
import { readFileSync } from 'node:fs';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const data = JSON.parse(readFileSync('src/data/generation-cards.json', 'utf8'));
const quiz = JSON.parse(readFileSync('src/data/quiz.en.json', 'utf8'));
const prod = readFileSync('../webflow/live-pages/q-generation.footer.html', 'utf8');
const src = readFileSync('src/components/quiz/GenerationCards.tsx', 'utf8');
const css = readFileSync('src/components/quiz/generation-cards.module.css', 'utf8');

interface Card { code: string; years: string; style: string; ink: string }
const CARDS = data.cards as Card[];

console.log('\nГоды и стили привязаны к тем же кодам');
{
  const prodCards = [...prod.matchAll(
    /key:\s*'(Q_GENERATION__\w+)',\s*years:\s*'([^']+)',\s*style:\s*'(\w+)'/g,
  )].map((m) => ({ code: m[1], years: m[2], style: m[3] }));

  check('в проде четыре карточки', prodCards.length === 4, String(prodCards.length));
  check('и у нас четыре', CARDS.length === 4, String(CARDS.length));
  check('порядок тот же',
    JSON.stringify(CARDS.map((c) => c.code)) === JSON.stringify(prodCards.map((c) => c.code)),
    `${CARDS.map((c) => c.code).join(', ')}\n        против ${prodCards.map((c) => c.code).join(', ')}`);

  for (const c of CARDS) {
    const p = prodCards.find((x) => x.code === c.code);
    check(`${c.code}: годы «${c.years}» и стиль «${c.style}»`,
      !!p && p.years === c.years && p.style === c.style,
      p ? `в проде «${p.years}» / «${p.style}»` : 'в проде такого кода нет');
  }
}

console.log('\nЦвета как в проде');
{
  check('поле #3d3d20', prod.includes(data.paper), data.paper);
  check('цвет поля стоит и в css по умолчанию', css.includes(data.paper));
  for (const c of CARDS) {
    check(`${c.style}: цвет надписи ${c.ink}`,
      prod.toLowerCase().includes(c.ink.toLowerCase()), c.ink);
  }
  check('приглушение остальных 0.5',
    data.dim === 0.5 && /opacity:\s*0\.5/.test(prod), String(data.dim));
  const q = prod.match(/questionEl\.textContent = '([^']+)'/);
  check('тот же текст вопроса', q?.[1] === data.question,
    `${data.question}\n        против ${q?.[1]}`);
}

console.log('\nПятый вариант, которого на сайте выбрать было нельзя');
{
  const quizCodes = quiz.Q_GENERATION.answers.map((a: { code: string }) => a.code);
  check('в квизе пять вариантов', quizCodes.length === 5, String(quizCodes.length));
  check('пятый — это Q_GENERATION__PREF_NOT',
    data.otherCode === 'Q_GENERATION__PREF_NOT' && quizCodes.includes(data.otherCode),
    data.otherCode);
  check('в проде карточки под него действительно не было',
    !new RegExp(`key:\\s*'${data.otherCode}'`).test(prod),
    'если появилась — надо переносить её, а не мою строку');
  check('у нас он есть отдельной кнопкой',
    new RegExp(`data-answer=\\{data\\.otherCode\\}`).test(src));
  check('и без текстуры — придумывать «носитель» для «Other» нечестно',
    !/otherCode[\s\S]{0,400}<canvas/.test(src));

  // Все пять кодов квиза должны быть достижимы с экрана.
  const reachable = [...CARDS.map((c) => c.code), data.otherCode];
  check('все пять кодов квиза выбираемы',
    quizCodes.every((c: string) => reachable.includes(c))
    && reachable.length === quizCodes.length,
    `на экране ${reachable.join(', ')}`);
}

console.log('\nИсправления против прода на месте');
{
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  check('карточки — настоящие кнопки',
    /<button\b[\s\S]*?type="button"/.test(src),
    'в проде это были div с обработчиком click');
  check('у каждой есть название словами',
    /nameOf\(card\.code\)/.test(src),
    'годы нарисованы на холсте, то есть читалке карточка была пуста');
  check('название спрятано визуально, но не от читалки',
    /clip-path: inset\(50%\)/.test(css));

  check('кадры считаются один раз, а не каждые 150 мс',
    /FRAMES = 8/.test(code) && /frames\.push\(off\)/.test(code),
    'прод пересчитывал четыре текстуры 400×160 попиксельно навсегда');
  check('смена кадра по-прежнему 150 мс', /FRAME_MS = 150/.test(code));
  check('кадр не повторяется дважды подряд',
    /if \(next === b\.shown\)/.test(code));

  check('таймер снимается', /clearInterval\(timer\)/.test(code));
  check('в спрятанной вкладке не тикает',
    /visibilitychange/.test(code) && /document\.hidden/.test(code),
    'в проде setInterval работал всегда');
  check('слушатели снимаются',
    /removeEventListener\('resize'/.test(code)
    && /removeEventListener\('visibilitychange'/.test(code));

  check('холст в размере устройства',
    /devicePixelRatio/.test(code) && /rect\.width \* dpr/.test(code),
    'в проде было жёстко 400×160 и растягивалось под карточку');
  // Самая коварная из найденных: putImageData не знает про масштаб.
  check('текстура рисуется в пикселях устройства, без setTransform',
    /paint\(oc, card, w, h, family, dpr\)/.test(code)
    && !/oc\.setTransform/.test(code),
    'createImageData игнорирует масштаб: шум ложился в левую четверть карточки');
  check('геометрия плёнки домножена на масштаб',
    /12 \* scale/.test(code) && /ctx\.lineWidth = scale/.test(code));
  check('шрифт холста берётся настоящий, а не через var()',
    /getPropertyValue\('--fms-mono'\)/.test(code),
    'холст не понимает CSS-переменных и молча даёт шрифт по умолчанию');
  check('учтён prefers-reduced-motion',
    /prefers-reduced-motion: reduce/.test(code) && /still \? 1 : FRAMES/.test(code));
  check('своего зерна на экране нет — оно общее',
    !/mix-blend-mode/.test(css),
    'прод рисовал полноэкранный шум каждые 80 мс');
}

console.log('\nМеханика подключена к вопросу');
{
  const reg = readFileSync('src/components/quiz/mechanics.ts', 'utf8');
  check('Q_GENERATION в реестре',
    /Q_GENERATION: dynamic\(\(\) => import\('\.\/GenerationCards'\), \{ ssr: false \}\)/.test(reg));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
