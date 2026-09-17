/**
 * Сверка Q_SKIN_BEHAVIOR с продом.
 *
 * Запуск:  cd web && npm run check:skin
 *
 * Три вещи.
 *
 * 1. Клип привязан к тому же варианту, что на живом сайте: иначе рядом
 *    с «становится слаще» будет играть флакон «становится горче».
 * 2. Числа плитки, флакона и перебора — те, что стоят в проде. Часть
 *    прочитана из стилей страницы Webflow через API, часть — из <style>
 *    в её подвале; и то и другое лежит в данных, а здесь сверяется с CSS.
 * 3. Клипы идут через трансформацию. Это главное: в проде пять видео
 *    640×640 по 1.5–1.7 МБ грузились и играли одновременно ради
 *    квадратика 56 пикселей.
 */
import { readFileSync } from 'node:fs';
import { MECHANICS } from '../src/components/quiz/mechanics';
import { QUESTIONS } from '../src/lib/quiz';
import { VIDEO_PRESETS, cldVideo, cldPoster } from '../src/lib/cloudinary';
import data from '../src/data/skin-bottles.json';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const BOTTLES = data.bottles as Record<string, string>;
const P = data.prodStyles;
const prod = readFileSync('../webflow/live-pages/q-skin-behavior.footer.html', 'utf8');
const css = readFileSync('src/components/quiz/skin-bottles.module.css', 'utf8');
const src = readFileSync('src/components/quiz/SkinBottles.tsx', 'utf8');

console.log('\nМеханика на месте, варианты те же');
{
  check('у Q_SKIN_BEHAVIOR своя механика', MECHANICS.Q_SKIN_BEHAVIOR !== undefined);
  const codes = QUESTIONS.Q_SKIN_BEHAVIOR.answers.map((a) => a.code);
  check('в квизе пять вариантов', codes.length === 5, codes.join(', '));
  check('у каждого свой клип', codes.every((c) => BOTTLES[c] !== undefined),
    codes.filter((c) => !BOTTLES[c]).join(', ') || 'все на месте');
  const extra = Object.keys(BOTTLES).filter((c) => !codes.includes(c));
  check('лишних клипов нет', extra.length === 0, extra.join(', '));
}

console.log('\nКлип привязан к тому же варианту, что в проде');
{
  /* В проде привязка лежит массивом bottles: { key, video }. Ссылки
     сверяем целиком — эти клипы и в проде отдавались из Cloudinary,
     так что расходиться тут нечему, кроме самой привязки. */
  const prodPairs = [...prod.matchAll(
    /key:\s*'(Q_SKIN_BEHAVIOR__\w+)',\s*\n?\s*video:\s*'([^']+)'/g,
  )].map((m) => ({ code: m[1], url: m[2] }));

  check('в проде пять пар', prodPairs.length === 5, String(prodPairs.length));
  for (const p of prodPairs) {
    const file = p.url.split('/').pop();
    const ours = BOTTLES[p.code] ?? '';
    check(`${p.code} → ${file}`, ours.endsWith(file ?? '—'),
      `${ours}\n        в проде ${p.url}`);
  }
  check('все пять клипов разные',
    new Set(Object.values(BOTTLES)).size === 5, String(new Set(Object.values(BOTTLES)).size));
}

console.log('\nКлипы идут через трансформацию, а не в исходном весе');
{
  check('пресет для флакона задан', VIDEO_PRESETS.bottleBadge !== undefined,
    VIDEO_PRESETS.bottleBadge);
  check('пресет только уменьшает (c_limit), а не растягивает',
    VIDEO_PRESETS.bottleBadge.startsWith('c_limit,'), VIDEO_PRESETS.bottleBadge);
  for (const [code, url] of Object.entries(BOTTLES)) {
    const out = cldVideo(url, 'bottleBadge');
    check(`${code}: ссылка ужата`, out.includes(`/upload/${VIDEO_PRESETS.bottleBadge}/`), out);
    check(`${code}: исходник напрямую не отдаётся`, out !== url, url);
    check(`${code}: первый кадр берётся картинкой`,
      cldPoster(url, 160).includes('/so_0/'), cldPoster(url, 160));
  }
  check('компонент отдаёт клип через пресет',
    src.includes("cldVideo(clip, 'bottleBadge')"),
    'иначе на экран приедет 7.9 МБ, как в проде');
  check('и клип подставляется только показанному флакону',
    src.includes('loaded.includes(i) ? cldVideo'),
    'иначе браузер потянет все пять сразу');
}

console.log('\nЧисла совпадают с продом');
{
  const has = (needle: string, why: string) => check(`${needle} (${why})`, css.includes(needle));

  has(`width: ${P.tileWidthPct}%`, 'плитка занимает половину ширины');
  has(`border-radius: ${P.tileRadiusPx}px`, 'скругление плитки');
  has(`line-height: ${P.tileLineHeightPx}px`, 'высота строки плитки');
  has(`line-height: ${P.tileLineHeightSmallPx}px`, 'высота строки на телефоне');
  has(`font-size: ${P.tileFontPx}px`, 'кегль варианта');
  has(`font-size: ${P.tileFontTinyPx}px`, 'кегль на узком экране');
  has(`padding: 0 ${P.tilePadRightPx}px 0 ${P.tilePadLeftPx}px`, 'место под флакон справа');
  has(`padding-right: ${P.tilePadRightMediumPx}px`, 'то же на medium');
  has(`padding-right: ${P.tilePadRightSmallPx}px`, 'то же на small');
  has(`padding-right: ${P.tilePadRightTinyPx}px`, 'то же на tiny');
  has(`font-size: ${P.questionFontPx}px`, 'кегль вопроса');
  has(`font-size: ${P.questionFontMediumPx}px`, 'кегль вопроса на medium');
  has(`gap: ${P.gapPx}px`, 'разрыв сетки');
  has(`gap: ${P.gapTinyPx}px`, 'разрыв на узком экране');
  has(`width: ${P.bottlePx}px`, 'квадратик флакона');
  has(`width: ${P.bottleSmallPx}px`, 'флакон на small');
  has(`width: ${P.bottleTinyPx}px`, 'флакон на tiny');
  has(`right: ${P.bottleRightPx}px`, 'отступ флакона справа');
  has(`right: ${P.bottleRightSmallPx}px`, 'то же на small');
  has(`border-radius: ${P.bottleRadiusPx}px`, 'скругление флакона');
  has(`scale(${P.bottleHiddenScale})`, 'скрытый флакон меньше');
  has('mix-blend-mode: screen', 'клип снят на чёрном');
  has('object-fit: contain', 'флакон не обрезается');
  has(`background-color: ${P.tileBg}`, 'плитка чёрная');

  check(`перебор начинается через ${P.walkStartMs} мс`,
    src.includes('P.walkStartMs'), 'число должно браться из данных');
  check(`и идёт каждые ${P.walkEveryMs} мс`, src.includes('P.walkEveryMs'));
  check('числа перебора в данных те же, что в проде',
    prod.includes(String(P.walkEveryMs)) && prod.includes(String(P.walkStartMs)),
    `${P.walkStartMs} / ${P.walkEveryMs}`);
}

console.log('\nИсправления против прода на месте');
{
  check('варианты — кнопки, а не ссылки без адреса',
    src.includes('type="button"') && !src.includes('<a '));
  check('фокус показывает флакон', src.includes('onFocus'));
  check('играет только видимый клип',
    src.includes('if (i === shown) v.play()') && src.includes('else v.pause()'),
    'в проде все пять играли всегда, даже невидимые');
  check('перебор останавливается по первому действию человека',
    src.includes('touched') && src.includes('if (still || touched) return'));
  check('и снимается при уходе с экрана',
    src.includes('clearInterval(every)') && src.includes('clearTimeout(start)'));
  check('prefers-reduced-motion: вместо видео кадр картинкой',
    src.includes('useReducedMotion') && src.includes('cldPoster'));
  /* Именно useReducedMotion, а не состояние в эффекте: через эффект
     ответ приходит на кадр позже, и за этот кадр браузер успевает
     начать качать клип. Поймано e2e:skin. */
  check('и ответ про движение известен уже в первой отрисовке',
    !/matchMedia\('\(prefers-reduced-motion/.test(src),
    'через useState в useEffect один кадр живёт как будто движение разрешено');
  check('при reduced-motion перебора нет вовсе',
    /if \(still \|\| touched\) return/.test(src));
  check('прокрутка на телефоне не считается касанием варианта',
    src.includes('moved <= 10'), 'в проде тоже был порог 10px');
  check('своего зерна на экране нет: оно общее', !src.includes('createImageData'));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nQ_SKIN_BEHAVIOR сходится с продом.\n');
process.exit(failed ? 1 : 0);
