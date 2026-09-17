// Облако запаха на Q_RADIUS в настоящем браузере.
//
// Главное здесь: шарик прилетает к ТОМУ варианту, на который смотрят, и
// в размере ИМЕННО этого варианта — в этом весь смысл экрана, ответ
// показан размером. Плюс пузыри: что они нарисованы, что холст в
// пикселях устройства (в проде был не в них) и что кадры не крутятся,
// когда вкладку не видно.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:cloud
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/scent-cloud.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));
const SIZES = DATA.ball.sizes;
const ANSWERS = QUIZ.Q_RADIUS.answers;

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

async function open({
  viewport = { width: 1400, height: 900 }, touch = false, reduced = false, dpr = 2,
} = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/en/quiz/q-radius`, { waitUntil: 'networkidle' });
  await page.locator('[data-scent-cloud]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  return { context, page, errors };
}

const ballBox = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-ball]');
  const r = el.getBoundingClientRect();
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    cx: Math.round(r.x + r.width / 2),
    cy: Math.round(r.y + r.height / 2),
    opacity: Number(getComputedStyle(el).opacity),
  };
});

/** Сумма байтов холста: меняется, пока пузыри плывут. */
const canvasSum = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas[data-bubbles]');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 997) s += d[i] + d[i + 3];
  return s;
});

const saved = (page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_RADIUS);

/* ─── 1. пузыри ────────────────────────────────────────────────────────── */

console.log('\nПузыри нарисованы и плывут');
{
  const { context, page, errors } = await open();
  const cv = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-bubbles]');
    const r = c.getBoundingClientRect();
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 400) if (d[i] > 0) painted += 1;
    return {
      backing: [c.width, c.height],
      css: [Math.round(r.width), Math.round(r.height)],
      painted,
    };
  });
  check('на холсте есть что-то нарисованное', cv.painted > 50, String(cv.painted));
  check('холст в пикселях устройства, а не в CSS',
    cv.backing[0] === cv.css[0] * 2 && cv.backing[1] === cv.css[1] * 2,
    `холст ${cv.backing.join('×')} при css ${cv.css.join('×')}`);

  const a = await canvasSum(page);
  await page.waitForTimeout(700);
  check('кадр сменился — пузыри плывут', a !== (await canvasSum(page)), String(a));

  check('холст сквозной для нажатий',
    (await page.locator('canvas[data-bubbles]').evaluate((el) =>
      getComputedStyle(el).pointerEvents)) === 'none');
  check('ошибок в консоли нет', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ─── 2. шарик ─────────────────────────────────────────────────────────── */

console.log('\nШарик летит к варианту и растёт по его «радиусу»');
{
  const { context, page } = await open();
  const before = await ballBox(page);
  check('до наведения шарика не видно', before.opacity === 0, String(before.opacity));

  for (const a of ANSWERS) {
    await page.locator(`#answer-${a.code}`).hover();
    // Перелёт 0.5 с плюс рост 0.4 с — ждём с запасом.
    await page.waitForTimeout(DATA.ball.moveMs + 300);
    const ball = await ballBox(page);
    const btn = await page.locator(`#answer-${a.code}`).boundingBox();

    check(`${a.code}: шарик ${SIZES[a.code]}px`,
      Math.abs(ball.w - SIZES[a.code]) <= 1 && Math.abs(ball.h - SIZES[a.code]) <= 1,
      `${ball.w}×${ball.h}`);
    check(`${a.code}: прилетел в середину этого варианта`,
      Math.abs(ball.cx - (btn.x + btn.width / 2)) <= 2
      && Math.abs(ball.cy - (btn.y + btn.height / 2)) <= 2,
      `шарик (${ball.cx},${ball.cy}) против кнопки (${
        Math.round(btn.x + btn.width / 2)},${Math.round(btn.y + btn.height / 2)})`);
    check(`${a.code}: и виден`, ball.opacity > 0.9, String(ball.opacity));
  }

  // Размер растёт от «у кожи» к «заметно вокруг» — это и есть ответ.
  await page.locator(`#answer-${ANSWERS[0].code}`).hover();
  await page.waitForTimeout(DATA.ball.moveMs + 300);
  const small = (await ballBox(page)).w;
  await page.locator(`#answer-${ANSWERS[ANSWERS.length - 1].code}`).hover();
  await page.waitForTimeout(DATA.ball.moveMs + 300);
  const big = (await ballBox(page)).w;
  check('у последнего варианта шарик заметно больше', big > small * 3,
    `${small}px → ${big}px`);

  await page.locator('h1').hover();
  await page.waitForTimeout(DATA.ball.fadeMs + 400);
  check('ушли мышью — шарик погас', (await ballBox(page)).opacity === 0);
  await context.close();
}

/* ─── 3. клавиатура ───────────────────────────────────────────────────── */

console.log('\nКлавиатура: в проде шарика по фокусу не было вовсе');
{
  const { context, page } = await open();
  await page.locator(`#answer-${ANSWERS[2].code}`).focus();
  await page.waitForTimeout(DATA.ball.moveMs + 300);
  const ball = await ballBox(page);
  check('по фокусу шарик показан в размере этого варианта',
    Math.abs(ball.w - SIZES[ANSWERS[2].code]) <= 1 && ball.opacity > 0.9,
    `${ball.w}px, opacity ${ball.opacity}`);

  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith('/q-radius'), { timeout: 8000 });
  check(`Enter выбрал ${ANSWERS[2].code}`, (await saved(page)) === ANSWERS[2].code,
    String(await saved(page)));
  await context.close();
}

/* ─── 4. выбор ─────────────────────────────────────────────────────────── */

console.log('\nВыбор уходит тем же кодом');
{
  for (const a of ANSWERS) {
    const { context, page } = await open();
    await page.locator(`#answer-${a.code}`).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/q-radius'), { timeout: 8000 });
    check(`${a.code}`, (await saved(page)) === a.code, `в базу ушло ${await saved(page)}`);
    await context.close();
  }
}

/* ─── 5. телефон ───────────────────────────────────────────────────────── */

console.log('\nНа телефоне: шарик не шире экрана, тап выбирает');
{
  const { context, page } = await open({
    viewport: { width: 390, height: 844 }, touch: true,
  });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);

  const widest = ANSWERS[ANSWERS.length - 1].code;
  /* Размер смотрим по фокусу, а не по касанию: тап тут же уводит на
     следующий экран, и шарика на странице уже нет. Показывает его в
     обоих случаях один и тот же код. */
  await page.locator(`#answer-${widest}`).focus();
  await page.waitForTimeout(DATA.ball.moveMs + 300);
  const ball = await ballBox(page);
  /* В проде на телефоне шарик оставался 320px: media-запрос уменьшал
     его до 120px, но JS ставил размер инлайном, а инлайн сильнее. */
  check('шарик ужат под экран, а не 320px как в проде',
    ball.w <= 390 * 0.9 + 1, `${ball.w}px при ширине экрана 390`);
  check('и всё-таки виден', ball.opacity > 0.9, String(ball.opacity));

  await page.locator(`#answer-${widest}`).tap();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-radius'), { timeout: 8000 });
  check('один тап выбрал вариант', (await saved(page)) === widest,
    String(await saved(page)));
  await context.close();
}

/* ─── 6. приведённое движение и спрятанная вкладка ─────────────────────── */

console.log('\nprefers-reduced-motion: пузыри стоят, шарик работает');
{
  const { context, page } = await open({ reduced: true });
  const a = await canvasSum(page);
  check('пузыри всё равно нарисованы', a > 0, String(a));
  await page.waitForTimeout(900);
  check('и не плывут', (await canvasSum(page)) === a);

  await page.locator(`#answer-${ANSWERS[1].code}`).hover();
  await page.waitForTimeout(400);
  const ball = await ballBox(page);
  check('шарик всё равно показан в нужном размере',
    Math.abs(ball.w - SIZES[ANSWERS[1].code]) <= 1 && ball.opacity > 0.9,
    `${ball.w}px`);

  await page.locator(`#answer-${ANSWERS[1].code}`).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-radius'), { timeout: 8000 });
  check('выбор работает и без анимации', (await saved(page)) === ANSWERS[1].code,
    String(await saved(page)));
  await context.close();
}

console.log('\nВ спрятанной вкладке кадры не крутятся');
{
  const { context, page } = await open();
  /* Прод крутил requestAnimationFrame вечно. Браузер сам замедляет
     скрытую вкладку, поэтому проверяем не «стоит», а что цикл снят
     нашим кодом: после возврата картинка снова оживает. */
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const a = await canvasSum(page);
  await page.waitForTimeout(700);
  check('пока «не видно» — картинка не меняется', (await canvasSum(page)) === a, String(a));

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(700);
  check('вернулись — пузыри снова плывут', (await canvasSum(page)) !== a);
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nОблако запаха работает.\n');
process.exit(failed ? 1 : 0);
