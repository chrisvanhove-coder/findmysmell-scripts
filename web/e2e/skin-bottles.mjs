// Q_SKIN_BEHAVIOR в настоящем браузере.
//
// ВАЖНО ПРО ЭТУ ПРОВЕРКУ. Из песочницы res.cloudinary.com закрыт
// (ERR_TUNNEL_CONNECTION_FAILED), поэтому сами клипы здесь не играют и
// проверять «идёт ли видео» нечем. Проверяется то, что от этого не
// зависит и что как раз ломается молча: КАКИЕ адреса браузер просит
// (ужаты ли они и не просит ли он все пять сразу), кто из флаконов
// показан в каждый момент, перебор и его остановка, клавиатура, выбор.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:skin
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/skin-bottles.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));
const ANSWERS = QUIZ.Q_SKIN_BEHAVIOR.answers;
const P = DATA.prodStyles;

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

async function open({
  viewport = { width: 1400, height: 900 }, touch = false, reduced = false,
} = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  const clips = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/video/upload/') && u.endsWith('.mp4')) clips.push(u);
  });
  await page.goto(`${BASE}/en/quiz/q-skin-behavior`, { waitUntil: 'networkidle' });
  await page.locator('[data-skin-bottles]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  return { context, page, errors, clips };
}

/** Прозрачность каждого квадратика с флаконом. */
const shown = (page) => page.$$eval('[data-bottle]',
  (els) => els.map((e) => Number(getComputedStyle(e).opacity)));
/** Индекс показанного флакона (или -1). */
const shownIndex = async (page) => (await shown(page)).findIndex((o) => o > 0.9);

const saved = (page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_SKIN_BEHAVIOR);

/* ─── 1. экран в размерах прода ────────────────────────────────────────── */

console.log('\nЭкран в размерах прода');
{
  const { context, page, errors } = await open();
  check('пять вариантов', (await page.locator('button[data-answer]').count()) === 5,
    String(await page.locator('button[data-answer]').count()));
  check('вопрос показан',
    (await page.locator('h1').first().textContent())?.includes('behave on your skin'));

  const tile = await page.locator('button[data-answer]').first().boundingBox();
  check('плитка занимает половину ширины',
    Math.abs(tile.width - 1400 * (P.tileWidthPct / 100)) <= 2,
    `${Math.round(tile.width)}px при 700`);
  check(`высота = line-height ${P.tileLineHeightPx}px`,
    Math.abs(tile.height - P.tileLineHeightPx) <= 2, `${Math.round(tile.height)}px`);
  check('и стоит по центру', Math.abs(tile.x - (1400 - tile.width) / 2) <= 2,
    `x=${Math.round(tile.x)}`);

  const badge = await page.locator('[data-bottle]').first().boundingBox();
  check(`флакон ${P.bottlePx}×${P.bottlePx}`,
    Math.abs(badge.width - P.bottlePx) <= 1 && Math.abs(badge.height - P.bottlePx) <= 1,
    `${Math.round(badge.width)}×${Math.round(badge.height)}`);
  check(`и стоит в ${P.bottleRightPx}px от правого края плитки`,
    Math.abs((tile.x + tile.width) - (badge.x + badge.width) - P.bottleRightPx) <= 1,
    String(Math.round((tile.x + tile.width) - (badge.x + badge.width))));
  check('по центру по вертикали',
    Math.abs((badge.y + badge.height / 2) - (tile.y + tile.height / 2)) <= 1);

  const blend = await page.locator('[data-bottle] video, [data-bottle] img').first()
    .evaluate((el) => getComputedStyle(el).mixBlendMode);
  check('клип наложен screen — он снят на чёрном', blend === 'screen', blend);
  check('ошибок в консоли нет', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ─── 2. перебор флаконов ──────────────────────────────────────────────── */

console.log('\nЭкран сам перебирает флаконы, пока его не тронули');
{
  const { context, page } = await open();
  check('сразу показан первый флакон', (await shownIndex(page)) === 0,
    (await shown(page)).join(' '));
  check('и только он один',
    (await shown(page)).filter((o) => o > 0.5).length === 1, (await shown(page)).join(' '));

  // Пауза 1.8 с, потом шаг каждые 2.2 с. Ждём до середины второго шага.
  await page.waitForTimeout(P.walkStartMs + P.walkEveryMs + 500);
  const second = await shownIndex(page);
  check('через паузу перебор пошёл', second === 1, `показан ${second}`);

  await page.waitForTimeout(P.walkEveryMs);
  const third = await shownIndex(page);
  check('и идёт дальше', third === 2, `показан ${third}`);
  await context.close();
}

console.log('\nПеребор останавливается, когда человек тронул экран');
{
  const { context, page } = await open();
  await page.locator('button[data-answer]').nth(3).hover();
  await page.waitForTimeout(500);
  check('наведение показывает флакон своего варианта',
    (await shownIndex(page)) === 3, (await shown(page)).join(' '));

  // Если бы перебор продолжался, за это время он сменил бы флакон.
  await page.waitForTimeout(P.walkStartMs + P.walkEveryMs + 400);
  check('после наведения перебор больше не мешает',
    (await shownIndex(page)) === 3, (await shown(page)).join(' '));
  await context.close();
}

/* ─── 3. вес ───────────────────────────────────────────────────────────── */

console.log('\nВес: не пять клипов сразу и не в исходном размере');
{
  const { context, page, clips } = await open();
  await page.waitForTimeout(500);
  check('сразу запрошен ровно один клип', clips.length === 1,
    `${clips.length}: ${clips.map((u) => u.split('/').pop()).join(', ')}`);
  check('и он ужат трансформацией',
    clips.every((u) => u.includes('/c_limit,w_160/vc_auto/q_auto/')),
    clips.join('\n        '));

  // Пока перебор идёт, клипы подтягиваются по одному, а не все сразу.
  await page.waitForTimeout(P.walkStartMs + P.walkEveryMs * 2 + 400);
  check('после двух шагов перебора запрошено не больше трёх', clips.length <= 3,
    String(clips.length));
  check('исходников не запрашивает',
    clips.every((u) => !/\/upload\/v\d+\//.test(u)), clips.join('\n        '));

  const posters = await page.$$eval('[data-bottle] video',
    (els) => els.map((e) => e.getAttribute('poster')));
  check('у каждого флакона есть первый кадр картинкой',
    posters.length === 5 && posters.every((p) => p && p.includes('/so_0/')),
    posters.join('\n        '));
  await context.close();
}

/* ─── 4. клавиатура и выбор ────────────────────────────────────────────── */

console.log('\nКлавиатура: в проде эти варианты нельзя было выбрать вовсе');
{
  const { context, page } = await open();
  const second = page.locator(`#answer-${ANSWERS[1].code}`);
  await second.focus();
  await page.waitForTimeout(400);
  check('фокус показывает флакон этого варианта', (await shownIndex(page)) === 1,
    (await shown(page)).join(' '));

  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith('/q-skin-behavior'), { timeout: 8000 });
  check(`Enter выбрал ${ANSWERS[1].code}`, (await saved(page)) === ANSWERS[1].code,
    String(await saved(page)));
  await context.close();
}

console.log('\nВыбранный вариант уходит в ответ тем же кодом');
{
  for (const a of ANSWERS) {
    const { context, page } = await open();
    await page.locator(`#answer-${a.code}`).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/q-skin-behavior'), { timeout: 8000 });
    check(`${a.code}`, (await saved(page)) === a.code, `в базу ушло ${await saved(page)}`);
    await context.close();
  }
}

/* ─── 5. телефон ───────────────────────────────────────────────────────── */

console.log('\nНа телефоне: один тап выбирает, как в проде');
{
  const { context, page } = await open({
    viewport: { width: 390, height: 844 }, touch: true,
  });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);

  const tile = await page.locator('button[data-answer]').first().boundingBox();
  check('плитка на всю ширину', tile.width > 340, `${Math.round(tile.width)}px`);
  const badge = await page.locator('[data-bottle]').first().boundingBox();
  check(`флакон ${P.bottleTinyPx}px на узком экране`,
    Math.abs(badge.width - P.bottleTinyPx) <= 1, `${Math.round(badge.width)}px`);

  await page.locator(`#answer-${ANSWERS[2].code}`).tap();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-skin-behavior'), { timeout: 8000 });
  check('одно касание — и ответ сохранён', (await saved(page)) === ANSWERS[2].code,
    String(await saved(page)));
  await context.close();
}

/* ─── 6. приведённое движение ──────────────────────────────────────────── */

console.log('\nprefers-reduced-motion: ни перебора, ни видео');
{
  const { context, page, clips } = await open({ reduced: true });
  check('видео на экране нет вовсе',
    (await page.locator('[data-bottle] video').count()) === 0);
  check('вместо него кадр картинкой',
    (await page.locator('[data-bottle] img').count()) === 5,
    String(await page.locator('[data-bottle] img').count()));
  check('клипы не запрашиваются', clips.length === 0,
    clips.join('\n        '));
  check('первый флакон всё равно показан', (await shownIndex(page)) === 0,
    (await shown(page)).join(' '));

  await page.waitForTimeout(P.walkStartMs + P.walkEveryMs + 400);
  check('и перебор не запускается', (await shownIndex(page)) === 0,
    (await shown(page)).join(' '));

  await page.locator(`#answer-${ANSWERS[4].code}`).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-skin-behavior'), { timeout: 8000 });
  check('выбор работает и без анимации', (await saved(page)) === ANSWERS[4].code,
    String(await saved(page)));
  await context.close();
}

/* ─── 7. кнопка «назад» ────────────────────────────────────────────────── */

console.log('\nКнопка «назад» не под механикой');
{
  const { context, page } = await open();
  const top = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => (x.textContent || '').includes('Back'));
    if (!b) return 'кнопки нет';
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el === b || b.contains(el) ? 'сверху' : (el?.className || 'что-то другое');
  });
  check('«назад» нажимается', top === 'сверху', String(top));
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nQ_SKIN_BEHAVIOR работает.\n');
process.exit(failed ? 1 : 0);
