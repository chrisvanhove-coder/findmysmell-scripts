// Карточки поколений (Q_GENERATION) в настоящем браузере.
//
// Главное здесь три вещи: текстура закрывает карточку ЦЕЛИКОМ (на этом
// я уже споткнулся — createImageData не знает про масштаб холста, и шум
// ложился в левую четверть), выбранная карточка уходит в ответ ТЕМ ЖЕ
// кодом, и пятый вариант «Other» вообще выбираем — на живом сайте его
// выбрать было нельзя.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:generation
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/generation-cards.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));
const ANSWERS = QUIZ.Q_GENERATION.answers;
const CARDS = DATA.cards;

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

async function open({ reduced = false, viewport = { width: 1200, height: 900 }, dpr = 2 } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dpr,
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/en/quiz/q-generation`, { waitUntil: 'networkidle' });
  await page.locator('[data-generation-cards]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(1400);
  return { context, page, errors };
}

const saved = (page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_GENERATION);
const opacities = (page) => page.$$eval('button[data-answer]',
  (els) => els.map((e) => Number(getComputedStyle(e).opacity)));

console.log('\nЭкран на месте');
{
  const { context, page, errors } = await open();
  check('кнопок пять — четыре карточки и «Other»',
    (await page.locator('button[data-answer]').count()) === 5,
    String(await page.locator('button[data-answer]').count()));
  check('вопрос показан',
    await page.getByText(DATA.question.slice(0, 22), { exact: false }).isVisible());
  const bg = await page.locator('[data-generation-cards]').evaluate((el) =>
    getComputedStyle(el).backgroundColor);
  check('своё поле, а не прозрачный экран', bg === 'rgb(61, 61, 32)', bg);
  check('ошибок в консоли нет', errors.length === 0, errors.join(' | '));
  await context.close();
}

console.log('\nТекстура закрывает карточку целиком');
{
  /* НА ЭТОМ Я УЖЕ СПОТКНУЛСЯ. createImageData и putImageData масштаб
     холста не учитывают, и при setTransform(2) шум ложился ровно в
     левую верхнюю четверть карточки, а годы рисовались по центру. */
  const { context, page } = await open();
  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('canvas[data-texture]')].map((c) => {
      const ctx = c.getContext('2d');
      const at = (x, y) => {
        const d = ctx.getImageData(x, y, 1, 1).data;
        return { a: d[3], r: d[0], g: d[1], b: d[2] };
      };
      const corners = [
        at(2, 2), at(c.width - 3, 2), at(2, c.height - 3), at(c.width - 3, c.height - 3),
        at(Math.round(c.width * 0.88), Math.round(c.height * 0.85)),
      ];
      return { style: c.dataset.texture, w: c.width, h: c.height, corners };
    }));

  check('текстур четыре', cards.length === 4, String(cards.length));
  for (const c of cards) {
    check(`${c.style}: закрашены все четыре угла и дальний край`,
      c.corners.every((p) => p.a > 20),
      c.corners.map((p) => p.a).join(' '));
  }

  // Холст должен быть в пикселях устройства, а не 400×160 как в проде.
  const size = await page.evaluate(() => {
    const c = document.querySelector('canvas[data-texture]');
    const r = c.getBoundingClientRect();
    return { backing: [c.width, c.height], css: [Math.round(r.width), Math.round(r.height)] };
  });
  check('холст в размере устройства, а не 400×160',
    size.backing[0] === size.css[0] * 2 && size.backing[1] === size.css[1] * 2,
    `холст ${size.backing.join('×')} при css ${size.css.join('×')}`);

  // И каждая текстура своего характера, а не четыре одинаковых шума.
  const avg = await page.evaluate(() =>
    [...document.querySelectorAll('canvas[data-texture]')].map((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let r = 0; let g = 0; let b = 0; let n = 0;
      for (let i = 0; i < d.length; i += 4000) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n += 1; }
      return { style: c.dataset.texture, rgb: [r / n, g / n, b / n] };
    }));
  const by = Object.fromEntries(avg.map((x) => [x.style, x.rgb]));
  check('цифровой шум синеватый', by.digital[2] > by.digital[0] + 15,
    by.digital.map(Math.round).join(', '));
  check('плёнка тёплая', by.film[0] > by.film[2] + 20, by.film.map(Math.round).join(', '));
  check('VHS зелёная', by.vhs[1] > by.vhs[0] + 15 && by.vhs[1] > by.vhs[2] + 15,
    by.vhs.map(Math.round).join(', '));
  check('чёрно-белая — серая',
    Math.abs(by.bw[0] - by.bw[1]) < 6 && Math.abs(by.bw[1] - by.bw[2]) < 6,
    by.bw.map(Math.round).join(', '));
  await context.close();
}

console.log('\nТекстура живёт');
{
  const { context, page } = await open();
  const sum = () => page.evaluate(() => {
    const c = document.querySelector('canvas[data-texture]');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4000) s += d[i] + d[i + 1] + d[i + 2];
    return s;
  });
  const a = await sum();
  await page.waitForTimeout(900);
  const b = await sum();
  check('кадр сменился', a !== b, `${a} → ${b}`);
  await context.close();
}

console.log('\nНаведение приглушает остальные до 0.5');
{
  const { context, page } = await open();
  await page.locator(`button[data-answer="${CARDS[0].code}"]`).hover();
  await page.waitForTimeout(500);
  const o = await opacities(page);
  check('та, на которую смотрят, осталась яркой', o[0] > 0.9, o.join(' '));
  check('остальные приглушены',
    o.slice(1).every((x) => Math.abs(x - DATA.dim) < 0.02), o.join(' '));
  await context.close();
}

console.log('\nКлавиатура: в проде эти карточки нельзя было выбрать вовсе');
{
  const { context, page } = await open();
  const first = page.locator(`button[data-answer="${CARDS[0].code}"]`);
  await first.focus();
  check('на карточку можно встать фокусом',
    await first.evaluate((el) => el === document.activeElement));

  const reached = new Set();
  for (let i = 0; i < 10; i += 1) {
    const code = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-answer'));
    if (code) reached.add(code);
    await page.keyboard.press('Tab');
  }
  check('Tab обходит все пять вариантов', reached.size === 5, [...reached].join(' '));

  // Читалка обязана знать, что это за карточка: годы-то на холсте.
  for (const a of ANSWERS) {
    const name = await page.locator(`button[data-answer="${a.code}"]`).evaluate((el) =>
      (el.textContent || '').trim());
    const expected = a.code === DATA.otherCode ? DATA.otherText : a.label;
    check(`${a.code}: название словами — «${expected}»`, name === expected, `«${name}»`);
  }

  await page.locator(`button[data-answer="${CARDS[2].code}"]`).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith('/q-generation'), { timeout: 8000 });
  check(`Enter выбрал ${CARDS[2].code}`, (await saved(page)) === CARDS[2].code,
    String(await saved(page)));
  await context.close();
}

console.log('\nВыбранная карточка уходит в ответ ТЕМ ЖЕ');
{
  for (const a of ANSWERS) {
    const { context, page } = await open();
    await page.locator(`button[data-answer="${a.code}"]`).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/q-generation'), { timeout: 8000 });
    check(`${a.code}`, (await saved(page)) === a.code, `в базу ушло ${await saved(page)}`);
    await context.close();
  }
}

console.log('\nВторая карточка после выбора уже не перебивает первую');
{
  const { context, page } = await open();
  await page.locator(`button[data-answer="${CARDS[0].code}"]`).click();
  check('остальные выключены',
    await page.locator(`button[data-answer="${CARDS[3].code}"]`).isDisabled());
  await page.waitForURL((u) => !u.pathname.endsWith('/q-generation'), { timeout: 8000 });
  check('сохранена та, по которой нажали', (await saved(page)) === CARDS[0].code,
    String(await saved(page)));
  await context.close();
}

console.log('\nprefers-reduced-motion: текстура стоит, выбрать можно');
{
  const { context, page } = await open({ reduced: true });
  const sum = () => page.evaluate(() => {
    const c = document.querySelector('canvas[data-texture]');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4000) s += d[i] + d[i + 1] + d[i + 2];
    return s;
  });
  const a = await sum();
  check('текстура всё равно нарисована', a > 0, String(a));
  await page.waitForTimeout(1100);
  check('и не мигает', (await sum()) === a);

  await page.locator(`button[data-answer="${CARDS[1].code}"]`).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-generation'), { timeout: 8000 });
  check('ответ сохраняется и без анимации', (await saved(page)) === CARDS[1].code,
    String(await saved(page)));
  await context.close();
}

console.log('\nНа телефоне одна колонка и без перелива');
{
  const { context, page } = await open({ viewport: { width: 360, height: 780 } });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);

  const boxes = [];
  for (const c of CARDS) {
    boxes.push(await page.locator(`button[data-answer="${c.code}"]`).boundingBox());
  }
  const lefts = new Set(boxes.map((b) => Math.round(b.x)));
  check('карточки в одну колонку', lefts.size === 1, [...lefts].join(', '));
  check('и текстура на телефоне тоже закрашена целиком',
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-texture]');
      const ctx = c.getContext('2d');
      return ctx.getImageData(c.width - 3, c.height - 3, 1, 1).data[3] > 20;
    }));
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nКарточки поколений работают.\n');
process.exit(failed ? 1 : 0);
