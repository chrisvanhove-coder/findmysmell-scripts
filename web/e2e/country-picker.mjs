// Поиск по странам (Q_REGION_NOW, Q_REGION_CHILD) в настоящем браузере.
//
// Главное здесь: каждый из двух вопросов показан в СВОЕЙ палитре (в
// проде это два эмбеда, и перепутать их легко, раз компонент один),
// поиск действительно фильтрует 190 стран, выбор сохраняет НАЗВАНИЕ, и
// всё это работает с клавиатуры — чего в проде не было вовсе.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:country
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/country-picker.json', 'utf8'));
const G = DATA.geometry;
const IDS = Object.keys(DATA.palettes);

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const slug = (id) => id.toLowerCase().replace(/_/g, '-');

/** rgba/hex из данных → то, что вернёт getComputedStyle. */
function toRgb(value) {
  if (value.startsWith('#')) {
    const h = value.length === 4
      ? value.slice(1).split('').map((c) => c + c).join('')
      : value.slice(1);
    const n = Number.parseInt(h, 16);
    return `rgb(${Math.floor(n / 65536)}, ${Math.floor(n / 256) % 256}, ${n % 256})`;
  }
  return value.replace(/\s+/g, ' ');
}

async function open(id, { viewport = { width: 1200, height: 900 }, touch = false } = {}) {
  const context = await browser.newContext({
    viewport,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/en/quiz/${slug(id)}`, { waitUntil: 'networkidle' });
  await page.locator('#country-search').waitFor({ timeout: 10000 });
  return { context, page, errors };
}

const saved = (page, id) => page.evaluate(
  (q) => JSON.parse(localStorage.getItem('quiz_answers') || '{}')[q], id,
);

/* ─── 1. у каждого вопроса своя палитра ────────────────────────────────── */

console.log('\nУ каждого вопроса своя палитра — как в двух эмбедах прода');
for (const id of IDS) {
  const { context, page, errors } = await open(id);
  const p = DATA.palettes[id];

  const look = await page.evaluate(() => {
    const stage = document.querySelector('[data-country-picker]');
    const h1 = document.querySelector('[data-country-picker] h1');
    const input = document.getElementById('country-search');
    return {
      question: getComputedStyle(h1).color,
      questionCase: getComputedStyle(h1).textTransform,
      inputBg: getComputedStyle(input).backgroundColor,
      stageBg: getComputedStyle(stage).backgroundColor,
    };
  });
  check(`${id}: цвет вопроса ${p.question}`, look.question === toRgb(p.question),
    `${look.question} вместо ${toRgb(p.question)}`);
  check(`${id}: вопрос капсом`, look.questionCase === 'uppercase', look.questionCase);
  check(`${id}: фон поля ${p.inputBg}`,
    look.inputBg.replace(/\s+/g, ' ') === toRgb(p.inputBg), look.inputBg);
  check(`${id}: экран на цвете списка ${p.listBg}`, look.stageBg === toRgb(p.listBg),
    look.stageBg);

  // Список открывается по фокусу и стоит на своём цвете.
  await page.locator('#country-search').focus();
  await page.waitForTimeout(150);
  const list = await page.locator('#country-list').evaluate((el) => ({
    bg: getComputedStyle(el).backgroundColor,
    maxH: getComputedStyle(el).maxHeight,
  }));
  check(`${id}: фон списка ${p.listBg}`, list.bg === toRgb(p.listBg), list.bg);
  check(`${id}: список не выше ${G.listMaxHeightPx}px`,
    list.maxH === `${G.listMaxHeightPx}px`, list.maxH);
  check(`${id}: ошибок в консоли нет`, errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ─── 2. геометрия ─────────────────────────────────────────────────────── */

console.log('\nБлок по центру в размерах прода');
{
  const { context, page } = await open(IDS[0]);
  const wrap = await page.locator('[data-country-picker] > div').boundingBox();
  check(`колонка шириной ${G.maxWidthPx}px`, Math.abs(wrap.width - G.maxWidthPx) <= 1,
    `${Math.round(wrap.width)}px`);
  check('и стоит по центру экрана',
    Math.abs(wrap.x - (1200 - wrap.width) / 2) <= 1, `x=${Math.round(wrap.x)}`);

  const pad = await page.locator('#country-search').evaluate((el) => getComputedStyle(el).padding);
  check(`поле с отступами ${G.inputPadY}px ${G.inputPadX}px`,
    pad === `${G.inputPadY}px ${G.inputPadX}px`, pad);
  await context.close();
}

/* ─── 3. поиск ─────────────────────────────────────────────────────────── */

console.log('\nПоиск фильтрует список');
{
  const { context, page } = await open(IDS[0]);
  await page.locator('#country-search').focus();
  await page.waitForTimeout(150);
  const all = await page.locator('[role="option"]').count();
  check('пока пусто — показаны все страны', all > 150, String(all));

  await page.locator('#country-search').fill('fran');
  await page.waitForTimeout(150);
  const few = await page.locator('[role="option"]').count();
  check('«fran» оставляет одну', few === 1, String(few));
  check('и это Франция',
    (await page.locator('[role="option"] button').first().textContent()) === 'France');

  // Поиск не зависит от регистра — в проде тоже.
  await page.locator('#country-search').fill('JAPAN');
  await page.waitForTimeout(150);
  check('регистр не важен',
    (await page.locator('[role="option"] button').first().textContent()) === 'Japan');

  await page.locator('#country-search').fill('Atlantis');
  await page.waitForTimeout(150);
  check(`ничего не нашлось — «${DATA.empty}»`,
    (await page.getByText(DATA.empty, { exact: true }).count()) === 1);
  check('и ни одного варианта в списке',
    (await page.locator('[role="option"]').count()) === 0);
  await context.close();
}

/* ─── 4. выбор ─────────────────────────────────────────────────────────── */

console.log('\nВыбор сохраняет название страны');
for (const id of IDS) {
  const { context, page } = await open(id);
  await page.locator('#country-search').fill('Jap');
  await page.waitForTimeout(150);
  await page.locator('[role="option"] button').first().click();
  await page.waitForURL((u) => !u.pathname.endsWith(slug(id)), { timeout: 8000 });
  check(`${id}: в базу ушло «Japan»`, (await saved(page, id)) === 'Japan',
    String(await saved(page, id)));
  await context.close();
}

/* ─── 5. клавиатура ───────────────────────────────────────────────────── */

console.log('\nКлавиатура: в проде страну нельзя было выбрать с клавиатуры вовсе');
{
  const id = IDS[0];
  const { context, page } = await open(id);
  await page.locator('#country-search').focus();
  await page.keyboard.type('ital');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith(slug(id)), { timeout: 8000 });
  check('Enter выбрал первую подходящую', (await saved(page, id)) === 'Italy',
    String(await saved(page, id)));
  await context.close();
}

{
  const id = IDS[0];
  const { context, page } = await open(id);
  await page.locator('#country-search').focus();
  await page.keyboard.type('ge');
  await page.waitForTimeout(150);
  const names = await page.locator('[role="option"] button').allTextContents();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  const marked = await page.locator('[role="option"][aria-selected="true"] button')
    .textContent();
  check('стрелка вниз переводит выделение на второй вариант',
    marked === names[1], `${marked} при списке ${names.slice(0, 3).join(', ')}`);

  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith(slug(id)), { timeout: 8000 });
  check('Enter выбрал именно выделенный', (await saved(page, id)) === names[1],
    String(await saved(page, id)));
  await context.close();
}

{
  const { context, page } = await open(IDS[0]);
  await page.locator('#country-search').focus();
  await page.waitForTimeout(150);
  check('список открыт', (await page.locator('#country-list').count()) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Escape закрывает список', (await page.locator('#country-list').count()) === 0);
  check('и с вопроса не уводит', page.url().endsWith(slug(IDS[0])), page.url());
  await context.close();
}

/* ─── 6. телефон ───────────────────────────────────────────────────────── */

console.log('\nНа телефоне');
for (const id of IDS) {
  const { context, page } = await open(id, {
    viewport: { width: 390, height: 844 }, touch: true,
  });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${id}: перелива по горизонтали нет`, over === 0, `${over}px`);

  const size = await page.locator('#country-search').evaluate((el) => ({
    font: getComputedStyle(el).fontSize,
    pad: getComputedStyle(el).padding,
  }));
  check(`${id}: поле ${G.inputFontSmallPx}px и отступы ${
    G.inputPadYSmall}px ${G.inputPadXSmall}px`,
  size.font === `${G.inputFontSmallPx}px`
    && size.pad === `${G.inputPadYSmall}px ${G.inputPadXSmall}px`,
  JSON.stringify(size));

  await page.locator('#country-search').tap();
  await page.locator('#country-search').fill('Braz');
  await page.waitForTimeout(200);
  await page.locator('[role="option"] button').first().tap();
  await page.waitForURL((u) => !u.pathname.endsWith(slug(id)), { timeout: 8000 });
  check(`${id}: касание выбрало страну`, (await saved(page, id)) === 'Brazil',
    String(await saved(page, id)));
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nПоиск по странам работает.\n');
process.exit(failed ? 1 : 0);
