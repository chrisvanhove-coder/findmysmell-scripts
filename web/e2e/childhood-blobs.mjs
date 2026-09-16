// Шары детства (Q_ENV_CHILD) в настоящем браузере.
//
// Главное здесь два свойства, которых в проде не было: ответ можно
// выбрать с клавиатуры, и шары едут с одинаковой скоростью независимо
// от частоты экрана. Плюс то же, что и везде: нажатый вариант уходит в
// ответ ТЕМ ЖЕ, а не соседним.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:blobs
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/childhood-blobs.json', 'utf8'));

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

async function open({ reduced = false, viewport = { width: 1200, height: 900 } } = {}) {
  const context = await browser.newContext({
    viewport,
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/en/quiz/q-env-child`, { waitUntil: 'networkidle' });
  await page.locator('[data-childhood-blobs]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  return { context, page };
}

/**
 * Где центры шаров. Считаем по самому холсту: берём точки цвета шара и
 * находим их центр масс по каждой связной полосе — для проверки движения
 * достаточно общего центра масс всех терракотовых точек.
 */
const mass = (page) => page.evaluate(() => {
  const c = document.querySelector('[data-blobs]');
  const ctx = c.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let n = 0; let sx = 0; let sy = 0;
  // Шаг 4 точки: полный обход холста ретины — это мегапиксели.
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 128 && data[i] > 150 && data[i + 1] < 120 && data[i + 2] < 100) {
        n += 1; sx += x; sy += y;
      }
    }
  }
  return n ? { n, x: sx / n / width, y: sy / n / height } : { n: 0, x: 0, y: 0 };
});

console.log('\nЭкран на месте');
{
  const { context, page } = await open();
  check('механика заменила общий экран — списка кнопок нет',
    (await page.locator('ul li button').count()) === 0);
  check('шары рисуются', (await mass(page)).n > 500, JSON.stringify(await mass(page)));
  check('вопрос показан',
    await page.getByText(DATA.question[0], { exact: false }).isVisible());

  for (const a of DATA.answers) {
    check(`вариант «${a.label}» виден и нажимаем`,
      await page.getByRole('button', { name: a.label, exact: true }).isEnabled());
  }

  const bg = await page.locator('[data-childhood-blobs]').evaluate((el) =>
    getComputedStyle(el).backgroundColor);
  check('поле шалфейное, а не прозрачное', bg === 'rgb(184, 191, 170)', bg);
  await context.close();
}

console.log('\nШары действительно едут');
{
  const { context, page } = await open();
  const a = await mass(page);
  await page.waitForTimeout(2500);
  const b = await mass(page);
  const moved = Math.hypot(b.x - a.x, b.y - a.y);
  // За 2.5 с самый быстрый шар проходит ~1% ширины; центр масс всех
  // четырёх сдвигается меньше, поэтому порог низкий, но заметно
  // больше нуля.
  check('за две с половиной секунды картинка сдвинулась',
    moved > 0.0008,
    `центр масс ${a.x.toFixed(4)},${a.y.toFixed(4)} → ${b.x.toFixed(4)},${b.y.toFixed(4)}`);
  await context.close();
}

console.log('\nСкорость не зависит от частоты экрана');
{
  // В проде смещение прибавлялось на кадр, поэтому путь был
  // пропорционален числу кадров: на 120 Гц вдвое дальше, при просадке
  // ближе. Проверяем так: режем частоту кадров вчетверо и смотрим, что
  // за то же время шары прошли тот же путь. Если бы шаг считался на
  // кадр, путь упал бы вчетверо.
  async function shiftAtEveryNthFrame(k) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript((every) => {
      if (every === 1) return;
      const raf = window.requestAnimationFrame.bind(window);
      // Один вызов обработчика на every настоящих кадров. Именно так, а
      // не «вызвать обработчик несколько раз за кадр»: тот вариант
      // размножает вложенные заявки и растёт лавиной.
      window.requestAnimationFrame = (cb) => {
        let seen = 0;
        const tick = (ts) => {
          seen += 1;
          if (seen >= every) cb(ts);
          else raf(tick);
        };
        return raf(tick);
      };
    }, k);
    await page.goto(`${BASE}/en/quiz/q-env-child`, { waitUntil: 'networkidle' });
    await page.locator('[data-childhood-blobs]').waitFor({ timeout: 8000 });
    await page.waitForTimeout(600);
    const a = await mass(page);
    await page.waitForTimeout(2500);
    const b = await mass(page);
    await context.close();
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  const full = await shiftAtEveryNthFrame(1);
  const quarter = await shiftAtEveryNthFrame(4);
  check('кадров вчетверо меньше — путь тот же',
    full > 0.0008 && Math.abs(quarter - full) < full * 0.35,
    `путь ${full.toFixed(5)} при полной частоте и ${quarter.toFixed(5)} при четверти`);
}

console.log('\nКлавиатура выбирает ответ — в проде её не было вовсе');
{
  const { context, page } = await open();
  const first = page.getByRole('button', { name: DATA.answers[0].label, exact: true });
  await first.focus();
  check('на вариант можно встать фокусом',
    await first.evaluate((el) => el === document.activeElement));

  // Tab должен обойти все четыре варианта, а не запереться на первом.
  const reached = new Set();
  for (let i = 0; i < 8; i += 1) {
    const label = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (DATA.answers.some((a) => a.label === label)) reached.add(label);
    await page.keyboard.press('Tab');
  }
  check('Tab обходит все четыре варианта', reached.size === 4,
    [...reached].join(' | '));
  await context.close();
}

console.log('\nНажатый вариант уходит в ответ ТЕМ ЖЕ');
{
  for (const a of DATA.answers) {
    const { context, page } = await open();
    await page.getByRole('button', { name: a.label, exact: true }).click();
    // Галочка показывается до перехода — человек видит, что попал.
    await page.getByRole('button', { name: `✓ ${a.label}` }).waitFor({ timeout: 2000 });
    await page.waitForURL((u) => !u.pathname.endsWith('/q-env-child'), { timeout: 6000 });

    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_ENV_CHILD);
    check(`«${a.label}» → ${a.code}`, saved === a.code, `в базу ушло ${saved}`);
    await context.close();
  }
}

console.log('\nВторой вариант после выбора уже не перебивает первый');
{
  const { context, page } = await open();
  await page.getByRole('button', { name: DATA.answers[0].label, exact: true }).click();
  const other = page.getByRole('button', { name: DATA.answers[3].label, exact: true });
  check('остальные варианты выключены', await other.isDisabled());
  await page.waitForURL((u) => !u.pathname.endsWith('/q-env-child'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_ENV_CHILD);
  check('сохранён тот, по которому нажали', saved === DATA.answers[0].code, String(saved));
  await context.close();
}

console.log('\nКлавишей Enter вариант тоже выбирается');
{
  const { context, page } = await open();
  await page.getByRole('button', { name: DATA.answers[2].label, exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith('/q-env-child'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_ENV_CHILD);
  check(`Enter на «${DATA.answers[2].label}» → ${DATA.answers[2].code}`,
    saved === DATA.answers[2].code, String(saved));
  await context.close();
}

console.log('\nprefers-reduced-motion: шары стоят, ответить по-прежнему можно');
{
  const { context, page } = await open({ reduced: true });
  const a = await mass(page);
  check('шары всё равно нарисованы', a.n > 500, String(a.n));
  await page.waitForTimeout(2000);
  const b = await mass(page);
  check('и не двигаются', Math.hypot(b.x - a.x, b.y - a.y) < 1e-6,
    `${a.x.toFixed(6)},${a.y.toFixed(6)} → ${b.x.toFixed(6)},${b.y.toFixed(6)}`);

  await page.getByRole('button', { name: DATA.answers[1].label, exact: true }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-env-child'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_ENV_CHILD);
  check('ответ сохраняется и без анимации', saved === DATA.answers[1].code, String(saved));
  await context.close();
}

console.log('\nНа телефоне столбиком и без перелива');
{
  const { context, page } = await open({ viewport: { width: 360, height: 780 } });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);

  // Столбиком — значит все четыре на разной высоте и одной ширины.
  const boxes = [];
  for (const a of DATA.answers) {
    boxes.push(await page.getByRole('button', { name: a.label, exact: true }).boundingBox());
  }
  const tops = boxes.map((b) => Math.round(b.y));
  check('варианты идут друг под другом',
    new Set(tops).size === 4 && tops.every((t, i) => i === 0 || t > tops[i - 1]),
    tops.join(', '));
  check('во всю ширину',
    boxes.every((b) => b.width > 250), boxes.map((b) => Math.round(b.width)).join(', '));
  check('шары видны и на телефоне', (await mass(page)).n > 200);
  await context.close();
}

// Проверка живёт здесь, а не в отдельном файле, потому что сломалось это
// ровно из-за механик: каждая закреплена на весь экран, и кнопка «назад»
// уходила под неё — была видна не всегда и не нажималась ни на одном из
// экранов с механикой. Перебираем их все, чтобы следующая механика не
// повторила это молча.
console.log('\nКнопка «назад» нажимается на каждом экране с механикой');
{
  const MECHANIC_SLUGS = ['q-env-child', 'q-sweet', 'q-wild', 'q-emo'];
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  for (const slug of MECHANIC_SLUGS) {
    const page = await context.newPage();
    await page.goto(`${BASE}/en/quiz/${slug}`, { waitUntil: 'networkidle' });
    const back = page.getByRole('button', { name: /Back/ });
    await back.waitFor({ timeout: 8000 });
    await page.waitForTimeout(700);

    // Видимости мало: важно, что именно кнопка лежит сверху в своей точке.
    const covered = await back.evaluate((btn) => {
      const r = btn.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top === btn ? null : (top?.className || top?.tagName || '?');
    });
    check(`${slug}: кнопку не накрывает механика`, covered === null, String(covered));

    const from = page.url();
    await back.click({ timeout: 3000 });
    await page.waitForTimeout(800);
    check(`${slug}: нажатие уводит назад`, page.url() !== from, page.url());
    await page.close();
  }
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nШары работают.\n');
process.exit(failed ? 1 : 0);
