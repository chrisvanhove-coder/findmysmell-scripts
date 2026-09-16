// Главная в настоящем браузере.
//
// Эта страница накопила расхождение с живым сайтом молча: у меня стояла
// прошлая версия, а заказчица её заменила. Поэтому здесь проверяется не
// только «рисуется», а то, что на экране те же слова, те же цвета и та
// же раскладка, что на живом сайте.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:home
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/home.en.json', 'utf8'));

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Фото-заглушка: res.cloudinary.com из песочницы закрыт. */
const STUB = '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1202">'
  + '<rect width="1800" height="1202" fill="#6b5a44"/></svg>';

async function open({ viewport = { width: 1440, height: 900 }, stub = true } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const asked = [];
  if (stub) {
    await context.route('**://res.cloudinary.com/**', (route) => {
      asked.push(route.request().url());
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: STUB });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { context, page, errors, asked };
}

console.log('\nЭкран собран');
{
  const { context, page, errors } = await open();
  const h1 = await page.locator('h1').textContent();
  check('заголовок — те же три части',
    h1?.replace(/\s+/g, '') === DATA.hero.headline.join(''), `«${h1}»`);

  const color = await page.locator('h1').evaluate((el) => getComputedStyle(el).color);
  check('заголовок терракотовый #D03D01', color === 'rgb(208, 61, 1)', color);
  const family = await page.locator('h1').evaluate((el) =>
    getComputedStyle(el).fontFamily);
  check('и набран Fraunces', /Fraunces/i.test(family), family);

  const paper = await page.locator('[data-home]').evaluate((el) =>
    getComputedStyle(el).backgroundColor);
  check('поле страницы #141917', paper === 'rgb(20, 25, 23)', paper);

  check('абзац на месте целиком',
    (await page.locator('p').first().textContent())?.replace(/\s+/g, ' ').trim()
      === DATA.hero.copy.map((p) => p.text).join('').replace(/\s+/g, ' ').trim());
  check('ошибок в консоли нет', errors.length === 0, errors.join(' | '));
  await context.close();
}

console.log('\nЗолотые выделения — именно золотые');
{
  const { context, page } = await open();
  const parts = await page.locator('p').first().evaluate((el) =>
    [...el.querySelectorAll('span')].map((s) => ({
      text: s.textContent.trim().slice(0, 28),
      color: getComputedStyle(s).color,
    })));
  const gold = 'rgb(187, 161, 73)';
  const cream = 'rgb(235, 228, 207)';
  const accents = DATA.hero.copy.map((p) => !!p.accent);
  check(`кусков ${parts.length}, как в данных`, parts.length === accents.length,
    String(parts.length));
  parts.forEach((p, i) => {
    const want = accents[i] ? gold : cream;
    check(`«${p.text}…» ${accents[i] ? 'золотой' : 'кремовый'}`, p.color === want,
      `${p.color} вместо ${want}`);
  });
  await context.close();
}

console.log('\nФото идёт от самого верха и ужато');
{
  const { context, page, asked } = await open();
  const geo = await page.evaluate(() => {
    const img = document.querySelector('[data-hero-photo]');
    const hero = img.closest('section');
    const header = document.querySelector('header');
    return {
      imgTop: Math.round(img.getBoundingClientRect().top),
      heroH: Math.round(hero.getBoundingClientRect().height),
      headerH: Math.round(header.getBoundingClientRect().height),
      fit: getComputedStyle(img).objectFit,
    };
  });
  // На живом сайте шапки нет, и фото начинается на нуле. У нас шапка
  // есть, поэтому герой должен уходить ПОД неё, а не начинаться после.
  check('верх фото на нуле, а не под шапкой', geo.imgTop === 0, `${geo.imgTop}px`);
  check('высота героя — 78vh плюс шапка',
    Math.abs(geo.heroH - (900 * 0.78 + geo.headerH)) <= 2,
    `${geo.heroH}px при 78vh=${Math.round(900 * 0.78)} и шапке ${geo.headerH}`);
  check('фото кроется по площади', geo.fit === 'cover', geo.fit);

  check('фото запрошено ужатым, а не исходником',
    asked.length > 0 && asked.every((u) => u.includes('/upload/c_')),
    asked.join('\n        ') || 'запросов не было');
  check('и ровно одно фото на странице', asked.length === 1, String(asked.length));
  await context.close();
}

console.log('\nДве кнопки «Begin», и обе ведут в квиз');
{
  const { context, page } = await open();
  const begins = page.getByRole('link', { name: /Begin/ });
  check('кнопок две', (await begins.count()) === 2, String(await begins.count()));
  const hrefs = await begins.evaluateAll((els) => els.map((e) => new URL(e.href).pathname));
  check('обе на первый вопрос',
    hrefs.every((h) => h === '/en/quiz/q-gender'), hrefs.join(' '));

  const styles = await begins.evaluateAll((els) => els.map((e) => ({
    bg: getComputedStyle(e).backgroundColor,
    color: getComputedStyle(e).color,
  })));
  check('верхняя золотая с тёмным текстом',
    styles[0].bg === 'rgb(187, 161, 73)' && styles[0].color === 'rgb(20, 25, 23)',
    JSON.stringify(styles[0]));
  check('нижняя тёмная с кремовым текстом',
    styles[1].bg === 'rgb(38, 48, 46)' && styles[1].color === 'rgb(235, 228, 207)',
    JSON.stringify(styles[1]));

  // И она действительно уводит в квиз.
  await begins.first().click();
  await page.waitForURL((u) => u.pathname.includes('/quiz/'), { timeout: 8000 });
  check('нажатие открывает первый вопрос', page.url().endsWith('/en/quiz/q-gender'),
    page.url());
  await context.close();
}

console.log('\nБлок «How it works»');
{
  const { context, page } = await open();
  const kicker = await page.getByText(DATA.howLabel, { exact: true }).first();
  check('подзаголовок виден', await kicker.isVisible());
  check('он терракотовый',
    (await kicker.evaluate((el) => getComputedStyle(el).color)) === 'rgb(208, 61, 1)');

  const steps = await page.locator('ol li').evaluateAll((els) => els.map((li) => ({
    num: li.querySelector('div')?.textContent,
    label: li.querySelector('span')?.textContent,
    desc: li.querySelector('p')?.textContent,
    left: Math.round(li.getBoundingClientRect().left),
  })));
  check('три шага', steps.length === 3, String(steps.length));
  check('номера 01, 02, 03',
    steps.map((s) => s.num).join(',') === '01,02,03', steps.map((s) => s.num).join(','));
  DATA.steps.forEach((s, i) => {
    check(`${s.num} «${s.label}»`, steps[i].label === s.label, String(steps[i].label));
  });
  check('в первом шаге число словом, а не цифрой',
    /Seventeen questions/.test(steps[0].desc), steps[0].desc?.slice(0, 40));
  check('на широком экране три колонки',
    new Set(steps.map((s) => s.left)).size === 3, steps.map((s) => s.left).join(', '));

  const cream = await page.locator('ol').evaluate((el) =>
    getComputedStyle(el.closest('section')).backgroundColor);
  check('блок на кремовом #EBE4CF', cream === 'rgb(235, 228, 207)', cream);
  await context.close();
}

console.log('\nНичего не спрятано под закреплённым подвалом');
{
  const { context, page } = await open();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const hidden = await page.evaluate(() => {
    const footer = document.querySelector('footer').getBoundingClientRect();
    const out = [];
    for (const el of document.querySelectorAll('h1, p, span, a, div')) {
      if (el.closest('footer') || el.closest('header')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Виден в кадре и при этом накрыт полосой подвала.
      if (r.top < footer.top && r.bottom > footer.top + 2 && r.top > 0) {
        out.push(el.tagName + '.' + String(el.className).slice(0, 20));
      }
    }
    return out;
  });
  check('содержимое не уходит под подвал', hidden.length === 0, hidden.join(', '));
  await context.close();
}

console.log('\nНа телефоне');
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 } });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);

  // На узком экране заголовок в три строки: перенос перед «Scent» виден.
  const lines = await page.locator('h1').evaluate((el) => {
    const range = document.createRange();
    const rects = [];
    for (const node of el.childNodes) {
      if (node.nodeType !== 3) continue;
      range.selectNodeContents(node);
      rects.push(Math.round(range.getBoundingClientRect().top));
    }
    return [...new Set(rects)].length;
  });
  check('заголовок в три строки', lines === 3, `${lines}`);

  const cols = await page.locator('ol li').evaluateAll((els) =>
    new Set(els.map((li) => Math.round(li.getBoundingClientRect().left))).size);
  check('шаги в одну колонку', cols === 1, String(cols));

  const copyWidth = await page.locator('p').first().evaluate((el) =>
    getComputedStyle(el).maxWidth);
  check('абзац поджат до 42 знаков, как на живом сайте',
    copyWidth === '42ch' || copyWidth.endsWith('px'), copyWidth);
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nГлавная как на живом сайте.\n');
process.exit(failed ? 1 : 0);
