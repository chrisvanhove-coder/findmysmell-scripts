/**
 * Сверка семи экранов ветки эмоции с продом.
 *
 * Запуск:  cd web && npm run check:emotion
 *
 * Главное здесь три вещи.
 *
 * 1. СНИМОК ПРИВЯЗАН К ТОМУ ЖЕ ОТВЕТУ, что на живом сайте. Перепутанная
 *    привязка не сломает ничего видимого — человек просто увидит чай
 *    там, где обещали камин, и заказчица узнает об этом от людей.
 *    Поэтому 42 пары «код → файл» сверяются с imageMap в семи подвалах.
 * 2. РАЗМЕТКА СОВПАДАЕТ С WEBFLOW. Числа плитки и вопроса прочитаны из
 *    самих стилей страницы через API и лежат в данных; здесь CSS
 *    сверяется с ними, чтобы правка «на глаз» не разошлась молча.
 * 3. МЕХАНИКА СТОИТ НА ВСЕХ СЕМИ ЭКРАНАХ и ни на одном лишнем.
 */
import { readFileSync } from 'node:fs';
import { MECHANICS } from '../src/components/quiz/mechanics';
import { QUESTIONS, EMOTION_BRANCHES } from '../src/lib/quiz';
import { QUESTION_COPY } from '../src/data/question-titles';
import { PRESETS } from '../src/lib/cloudinary';
import data from '../src/data/emotion-tiles.json';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const PHOTOS = data.photos as Record<string, Record<string, string>>;
const P = data.prodStyles;
const css = readFileSync('src/components/quiz/emotion-tiles.module.css', 'utf8');
const src = readFileSync('src/components/quiz/EmotionTiles.tsx', 'utf8');

const slug = (id: string) => id.toLowerCase().replace(/_/g, '-').slice(2);

console.log('\nСемь экранов ветки, и все семь со своей механикой');
{
  const branch = [...EMOTION_BRANCHES];
  check('в квизе семь экранов ветки', branch.length === 7, branch.join(', '));
  check('у каждого своя запись в реестре механик',
    branch.every((id) => MECHANICS[id] !== undefined),
    branch.filter((id) => !MECHANICS[id]).join(', ') || 'все на месте');
  check('и это одна и та же механика на всех семи',
    new Set(branch.map((id) => MECHANICS[id])).size === 1);
  check('у каждого есть снимки', branch.every((id) => PHOTOS[id] !== undefined),
    branch.filter((id) => !PHOTOS[id]).join(', ') || 'все на месте');
  const extra = Object.keys(PHOTOS).filter((id) => !branch.includes(id));
  check('лишних экранов в данных нет', extra.length === 0, extra.join(', '));
}

console.log('\nСнимок привязан к тому же ответу, что в проде');
{
  let pairs = 0;
  for (const id of EMOTION_BRANCHES) {
    const prod = readFileSync(`../webflow/live-pages/q-${slug(id)}.footer.html`, 'utf8');
    /* В проде привязка лежит объектом imageMap: код → ссылка на
       website-files. Имя файла в конце ссылки («calm-tea.png») — то же,
       что у снимка в Cloudinary, по нему и сверяем. */
    const prodMap = new Map(
      [...prod.matchAll(
        /'(Q_[A-Z_]+)':\s*'https:\/\/cdn\.prod\.website-files\.com\/[^_]+_([a-z0-9-]+)\.png'/g,
      )].map((m) => [m[1], m[2]]),
    );
    check(`${id}: в проде ${prodMap.size} снимков`, prodMap.size > 0);

    const ours = PHOTOS[id] ?? {};
    check(`${id}: столько же у нас`, Object.keys(ours).length === prodMap.size,
      `${Object.keys(ours).length} против ${prodMap.size}`);

    for (const [code, stem] of prodMap) {
      const url = ours[code];
      // public_id в Cloudinary — то же имя плюс суффикс загрузки.
      const ok = typeof url === 'string'
        && new RegExp(`/${stem}_[a-z0-9]+\\.(png|jpg)$`).test(url);
      check(`${code} → ${stem}`, ok, url ?? 'снимка нет');
      pairs += 1;
    }

    /* И наоборот: у нас не должно быть снимка там, где в проде его не
       было. У «Other» и у «I don't need a smell for that» плитка
       остаётся цветной, и это не недоделка. */
    const extra = Object.keys(ours).filter((c) => !prodMap.has(c));
    check(`${id}: придуманных снимков нет`, extra.length === 0, extra.join(', '));

    const withOpen = QUESTIONS[id].answers.filter((a) => a.open).map((a) => a.code);
    check(`${id}: у «Other» снимка нет`, withOpen.every((c) => ours[c] === undefined),
      withOpen.filter((c) => ours[c]).join(', '));
  }
  check('всего сверено 42 пары', pairs === 42, String(pairs));
}

console.log('\nСсылки ведут в Cloudinary и не повторяются');
{
  const all = Object.values(PHOTOS).flatMap((m) => Object.values(m));
  check('все 42 — Cloudinary',
    all.every((u) => u.startsWith('https://res.cloudinary.com/')), String(all.length));
  check('и все разные', new Set(all).size === all.length,
    `${new Set(all).size} различных из ${all.length}`);
  check('в коде снимок идёт через трансформацию, а не исходником',
    src.includes("cld(photo, 'emotionTile')"),
    'иначе на экран приедет 8 МБ, как в проде');
  check('пресет плитки задан', PRESETS.emotionTile !== undefined, PRESETS.emotionTile);
  check('пресет режет по размеру плитки, а не растягивает',
    PRESETS.emotionTile.startsWith('c_fill,'), PRESETS.emotionTile);
}

console.log('\nВопрос на экране — тот же, что в окошке «Other»');
{
  /* На живом сайте заголовок экрана и вопрос в окошке «Other» — один и
     тот же текст (с большой буквы в заголовке). Второй источник тут не
     нужен: заголовки уже лежат в question-titles. */
  for (const id of EMOTION_BRANCHES) {
    const title = QUESTION_COPY[id]?.title;
    check(`${id}: «${title}»`, typeof title === 'string' && title.length > 0);
  }
  check('механика берёт заголовок из общего места, а не из своих данных',
    src.includes('QUESTION_COPY[questionId]'));
  check('и варианты берёт из квиза, а не дублирует их',
    src.includes('QUESTIONS[questionId]'));
}

console.log('\nРазметка совпадает с Webflow');
{
  const has = (needle: string, why: string) => check(`${needle} (${why})`, css.includes(needle));

  has(`width: ${P.tileWidthPct}%`, 'плитка занимает половину ширины');
  has(`padding: ${P.tilePadPx}px 0`, 'отступы плитки');
  has(`border-radius: ${P.tileRadiusPx}px`, 'скругление');
  has(`background-color: ${P.tileBg}`, 'цвет плитки без снимка');
  has(`line-height: ${P.tileLineHeightPx}px`, 'интерлиньяж');
  has(`font-size: ${P.labelFontPx}px`, 'кегль подписи');
  has(`font-weight: ${P.labelWeight}`, 'насыщенность Montserrat');
  has(`gap: ${P.gapPx}px`, 'разрыв сетки');
  has(`gap: ${P.gapTinyPx}px`, 'разрыв на узком экране');
  has(`font-size: ${P.questionFontPx}px`, 'кегль вопроса');
  has(`font-size: ${P.questionFontMediumPx}px`, 'кегль вопроса на medium');
  has(`font-size: ${P.questionFontSmallPx}px`, 'кегль вопроса на small');
  has(`min-height: ${P.mobileMinHeightPx}px`, 'палец: минимальная высота плитки');
  has(`${P.padBottomPx}px`, 'отступ снизу');
  has('background-size: cover', 'снимок закрывает плитку');
  has(`scale(${data.scale})`, 'рост наведённой плитки');
  has(`opacity: ${data.dim}`, 'приглушение остальных');
  has(`${data.transitionMs}ms ease`, 'длительность перехода');

  check('фон экрана — тёмный: вопрос в проде белый',
    /background:\s*#1[0-9a-f]{5}/.test(css),
    'светлый фон сделал бы белый вопрос невидимым');
  check('и в CSS сказано, что этот цвет единственный не из прода',
    css.includes('ЕДИНСТВЕННОЕ ЧИСЛО НЕ ИЗ ПРОДА'),
    'иначе следующий разработчик примет его за перенесённый');
}

console.log('\nИсправления против прода на месте');
{
  check('плитки — кнопки, а не ссылки без адреса',
    src.includes('type="button"') && !src.includes('<a '));
  check('фокус делает то же, что наведение', src.includes('onFocus'));
  check('на телефоне второе касание подписано',
    src.includes('Tap again to choose'));
  check('слушатель касания мимо плиток живёт на своём корне, а не на document',
    !src.includes('document.addEventListener'));
  check('prefers-reduced-motion учтён',
    src.includes('prefers-reduced-motion') && css.includes('prefers-reduced-motion'));
  check('своего зерна на экране нет: оно общее',
    !src.includes('createImageData'));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nВетка эмоции сходится с продом.\n');
process.exit(failed ? 1 : 0);
