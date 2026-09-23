/**
 * Сверка главной с ЖИВЫМ сайтом.
 *
 * Запуск:  cd web && npm run check:home
 *
 * ЗАЧЕМ ЭТА ПРОВЕРКА ПОЯВИЛАСЬ. Первое, что заказчица сказала, открыв
 * новую версию: «the start page is not what my page is now in real time.
 * Everything had to be exactly like my website live now». И она была
 * права: у меня стояла ПРОШЛАЯ главная — три колонки и текст «The
 * fragrance industry spends billions telling you what to buy», — а она
 * её с тех пор заменила. Расхождение накопилось молча, потому что
 * сверять главную было нечем.
 *
 * Теперь есть чем: каждая строка текста и каждый цвет сверяются с
 * `webflow/live-pages/home.footer.html` и `home.head.html`.
 */
import { readFileSync } from 'node:fs';
import { TOTAL_STEPS } from '../src/lib/quiz.ts';
import { numberWord } from '../src/lib/home.ts';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const data = JSON.parse(readFileSync('src/data/home.en.json', 'utf8'));
const prod = readFileSync('../webflow/live-pages/home.footer.html', 'utf8');
const prodHead = readFileSync('../webflow/live-pages/home.head.html', 'utf8');
const page = readFileSync('src/app/[locale]/page.tsx', 'utf8');
const css = readFileSync('src/app/[locale]/home.module.css', 'utf8');

/** Текст без разметки и с одиночными пробелами. */
const plain = (html: string) =>
  html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

console.log('\nЗаголовок героя — те же слова и те же переносы');
{
  const h1 = prod.match(/<h1 class="hero-headline">([\s\S]*?)<\/h1>/)?.[1] ?? '';
  // На живом сайте: ThereIsNo<br>Universal<br class="br-mobile">Scent
  const lines = h1.split(/<br[^>]*>/).map((s) => s.trim()).filter(Boolean);
  check('в проде три части заголовка', lines.length === 3, lines.join(' | '));
  check('те же три части у нас',
    JSON.stringify(data.hero.headline) === JSON.stringify(lines),
    `${data.hero.headline.join(' | ')}\n        против ${lines.join(' | ')}`);

  // Второй перенос — только на телефоне: так на живом сайте.
  check('второй перенос помечен как мобильный',
    /<br class="br-mobile">/.test(prod) && /styles\.brMobile/.test(page)
    && /\.brMobile \{ display: none; \}/.test(css)
    && /\.brMobile \{ display: block; \}/.test(css));
}

console.log('\nАбзац под заголовком — дословно, и золотое золотым');
{
  const p = prod.match(/<p class="hero-copy">([\s\S]*?)<\/p>/)?.[1] ?? '';
  check('абзац в проде найден', p.length > 100, `${p.length} знаков`);

  // Склеиваем наши части обратно и сверяем с текстом прода.
  const mine = (data.hero.copy as Array<{ text: string }>).map((x) => x.text).join('');
  check('текст абзаца совпадает посимвольно',
    plain(p) === mine.replace(/\s+/g, ' ').trim(),
    `наш:  ${mine.slice(0, 90)}…\n        прод: ${plain(p).slice(0, 90)}…`);

  // Куски в span.hero-copy-emphasis — это золотые.
  const prodAccents = [...p.matchAll(/<span class="hero-copy-emphasis">([\s\S]*?)<\/span>/g)]
    .map((m) => plain(m[1]));
  const mineAccents = (data.hero.copy as Array<{ text: string; accent?: boolean }>)
    .filter((x) => x.accent).map((x) => x.text.trim());
  check(`золотых кусков ${prodAccents.length}, и те же`,
    JSON.stringify(mineAccents) === JSON.stringify(prodAccents),
    `наши: ${mineAccents.join(' / ')}\n        прод: ${prodAccents.join(' / ')}`);
}

console.log('\nБлок «How it works» — те же три шага');
{
  const kicker = prod.match(/class="kicker s3-kicker">([^<]+)</)?.[1];
  check('подзаголовок тот же', data.howLabel === kicker,
    `${data.howLabel} против ${kicker}`);

  const nums = [...prod.matchAll(/class="s3-step-num">([^<]+)</g)].map((m) => m[1]);
  const labels = [...prod.matchAll(/class="s3-step-label">([^<]+)</g)].map((m) => m[1]);
  const descs = [...prod.matchAll(/class="s3-step-desc">([\s\S]*?)<\/p>/g)].map((m) => plain(m[1]));

  check('в проде три шага', nums.length === 3 && labels.length === 3 && descs.length === 3,
    `${nums.length}/${labels.length}/${descs.length}`);

  data.steps.forEach((s: { num: string; label: string; desc: string }, i: number) => {
    check(`шаг ${s.num}: номер и название`,
      s.num === nums[i] && s.label === labels[i],
      `${s.num} «${s.label}» против ${nums[i]} «${labels[i]}»`);
    // В данных стоит {N}; на экране оно станет тем же словом, что в проде.
    const shown = s.desc.replace('{N}', numberWord(TOTAL_STEPS));
    check(`шаг ${s.num}: текст дословно`, shown === descs[i],
      `наш:  ${shown}\n        прод: ${descs[i]}`);
  });

  check('число вопросов не вписано руками, а подставляется',
    data.steps.some((s: { desc: string }) => s.desc.includes('{N}'))
    && /numberWord\(TOTAL_STEPS(,\s*locale)?\)/.test(page),
    'на живом сайте это число в трёх местах было разным');
}

console.log('\nЦвета и числа — из живого сайта');
{
  const vars: Array<[string, string]> = [
    ['charcoal-950', '#141917'],
    ['charcoal', '#26302E'],
    ['terracotta', '#D03D01'],
    ['cream', '#EBE4CF'],
    ['gold', '#BBA149'],
  ];
  for (const [name, hex] of vars) {
    check(`${name} ${hex} как в проде`,
      prodHead.toLowerCase().includes(hex.toLowerCase())
      && css.toLowerCase().includes(hex.toLowerCase()),
      hex);
  }

  const numbers: Array<[string, string]> = [
    ['высота героя 78vh', '78vh'],
    ['и 74vh на телефоне', '74vh'],
    ['отступ контента clamp(28px, 5vw, 72px)', 'clamp(28px, 5vw, 72px)'],
    ['кегль заголовка clamp(40px, 9vw, 150px)', 'clamp(40px, 9vw, 150px)'],
    ['межстрочный заголовка 0.94', 'line-height: 0.94'],
    ['кегль абзаца clamp(18px, 1.8vw, 26px)', 'clamp(18px, 1.8vw, 26px)'],
    ['золотое свечение кнопки', '0 0 40px 5px rgba(208, 61, 1, 0.45)'],
    ['тень тёмной кнопки', '0 6px 28px rgba(208, 61, 1, 0.22)'],
    ['отступы кремового блока', 'clamp(56px, 10vh, 110px) clamp(24px, 7vw, 90px)'],
    ['граница над шагами', '1px solid rgba(39, 39, 39, 0.15)'],
  ];
  for (const [what, value] of numbers) {
    // В проде числа записаны без пробелов после запятых — сравниваем,
    // убрав пробелы с обеих сторон.
    const squash = (t: string) => t.replace(/\s+/g, '');
    check(what, squash(css).includes(squash(value))
      && squash(prodHead).includes(squash(value)), value);
  }

  check('три колонки шагов и одна на узком экране',
    /repeat\(3, minmax\(0, 1fr\)\)/.test(css) && /max-width: 720px/.test(css),
    'в проде ровно так: repeat(3, minmax(0,1fr)) и одна колонка от 720px');
}

console.log('\nФото героя — то же, но не исходником');
{
  const prodSrc = prod.match(/class="hero-bg" src="([^"]+)"/)?.[1] ?? '';
  check('тот же файл, что на живом сайте',
    prodSrc === data.hero.image, `${data.hero.image}\n        против ${prodSrc}`);
  check('на живом сайте оно отдаётся без трансформации',
    !prodSrc.includes('/upload/c_'),
    'то есть исходник 2798×1868 на 2 413 988 байт на первом же экране');
  check('у нас идёт через cld()',
    /cld\(copy\.hero\.image, 'homeHero'\)/.test(page)
    && /cld\(copy\.hero\.image, 'homeHeroMobile'\)/.test(page));

  const presets = readFileSync('src/lib/cloudinary.ts', 'utf8');
  check('пресет героя ужимает до 1800px',
    /homeHero: 'c_limit,w_1800\/f_auto\/q_auto'/.test(presets));
  check('на телефоне — вертикальный кроп',
    /homeHeroMobile: 'c_fill,g_auto,h_1400,w_900\/f_auto\/q_auto'/.test(presets));
  check('у фото есть alt', /alt="[^"]+"/.test(page),
    'в проде alt пустой, но фотография и есть первый экран');
}

console.log('\nКнопки ведут в квиз, а не на старый сайт');
{
  const hrefs = [...prod.matchAll(/class="(?:hero-begin|s3-btn)" href="([^"]+)"/g)]
    .map((m) => m[1]);
  check('в проде две кнопки «Begin»', hrefs.length === 2, hrefs.join(' '));
  check('и обе ведут на первый вопрос',
    hrefs.every((h) => h.endsWith('/q-gender')), hrefs.join(' '));
  check('у нас адрес внутренний и с локалью',
    /const quizHref = `\/\$\{locale\}\/quiz\/\$\{toSlug\(FIRST_QUESTION\.id\)\}`/.test(page),
    'абсолютный адрес прода уводил бы с Railway на старый сайт');
  check('обе кнопки на месте',
    (page.match(/href=\{quizHref\}/g) ?? []).length === 2);
}

console.log('\nМёртвый код прода не перенесён');
{
  // Скрипт в подвале прода ищет узлы fms-s1 и fms-hint, которых в
  // разметке нет, и сразу выходит.
  check('в проде этот скрипт ничего не делает',
    /getElementById\('fms-s1'\)/.test(prod) && !/id="fms-s1"/.test(prod));
  // Комментарий в компоненте законно объясняет, почему скрипта нет, —
  // поэтому ищем не слово, а код.
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('и у нас его нет', !/fms-s1|fms-hint/.test(code));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
