// Проверяет зону Scent DNA в браузере: что на экране стоит ровно то,
// что посчитал движок, что река рисуется, а оси раскрываются.
//
// Движок сам по себе сверен с продом в tools/dna-parity.mjs. Здесь другое:
// что посчитанное доехало до разметки и не разошлось по дороге.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { unlockResult } from './lib/unlock-result.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const dna = JSON.parse(readFileSync('src/data/dna.json', 'utf8'));
const AXES = dna.axes.map((a) => a.key);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
let failures = 0;

function check(name, ok, note = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${note ? '  — ' + note : ''}`);
  if (!ok) failures++;
}

const pct = (v) => Math.max(4, Math.min(96, ((v - 1) / 3) * 100));
const near = (a, b) => Math.abs(a - b) < 0.01;

async function dots(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-dot]')].map((d) => parseFloat(d.style.left)),
  );
}

// ── 1. Без ответов — страницы нет вовсе ──
// Раньше здесь проверялись дефолты архетипа: страница открывалась любому,
// и диаграмма показывала средние значения. Теперь результат закрыт
// (src/components/ResultGate.tsx), и состояние «страница без ответов»
// недостижимо — проверять в нём нечего. Проверяем само закрытие.
console.log('\nБез пройденного квиза');
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/en/result/ceo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('уводит на вопросы', page.url().includes('/quiz/'), page.url());
  check('диаграммы нет', (await dots(page)).length === 0);
  await page.close();
}

// ── 2. С ответами — значения пересчитаны под человека ──
// Набор подобран так, чтобы каждая ось ушла со своего дефолта.
const ANSWERS = {
  Q_SWEET: 'Q_SWEET__ENJOY_SW',
  Q_WILD: 'Q_WILD__LOVE_WILD',
  Q_RADIUS: 'Q_RADIUS__CLOSE',
  Q_ATMOS: 'Q_ATMOS__WINTER',
  Q_EMO: 'Q_EMO__PLAY',
  Q_CALM_NOW: 'Q_CALM_NOW__CLEAN',
};

console.log('\nС ответами');
{
  const page = await browser.newPage();
  /* Полный набор плюс те же шесть ответов: без полного страница закрыта,
     а шесть уводят каждую ось со своего дефолта, как и раньше. Считаем
     ожидаемое по ТОМУ ЖЕ набору, что ушёл в браузер, — иначе остальные
     ответы, попавшие в карты dna.json, разошлись бы с проверкой. */
  const seeded = await unlockResult(page, ANSWERS);
  await page.goto(`${BASE}/en/result/ceo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400); // клиентский пересчёт после монтирования

  // Считаем ожидаемое здесь же, по выгруженным данным — независимо от кода сайта.
  const codes = Object.values(seeded);
  const pickFrom = (map, base) => {
    let v = base;
    for (const c of codes) if (c in map) v = map[c];
    return v;
  };
  const sum = (map) => codes.reduce((acc, c) => acc + (map[c] ?? 0), 0);
  const norm = (raw, [min, max]) =>
    1 + ((Math.max(min, Math.min(max, raw)) - min) / (max - min)) * 3;

  const want = {
    sweetness: pickFrom(dna.maps.sweet, dna.base.sweetness),
    rawEdge: pickFrom(dna.maps.rawEdge, dna.base.rawEdge),
    projection: pickFrom(dna.maps.projection, dna.base.projection),
    warmth: norm(sum(dna.signals.warmth), dna.ranges.warmth),
    depth: norm(sum(dna.signals.depth), dna.ranges.depth),
  };

  const shown = await dots(page);
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i];
    check(
      `ось ${axis}`,
      near(shown[i], pct(want[axis])),
      `на экране ${shown[i].toFixed(2)}%, движок даёт ${pct(want[axis]).toFixed(2)}% (значение ${want[axis].toFixed(2)})`,
    );
  }

  check(
    'значения отличаются от дефолтов архетипа',
    AXES.some((k) => !near(want[k], dna.defaults.CEO[k])),
  );

  // ── 3. Река нарисована ──
  /* ХОЛСТОВ НА СТРАНИЦЕ ДВА, и до сих пор проверка брала не тот.
     `document.querySelector('canvas')` возвращает ПЕРВЫЙ в разметке — а
     это зерно (grain), плёночная текстура во весь экран. Оно всегда
     размером с окно и закрашено целиком, поэтому «канвас растянут» и
     «река нарисована» проходили всегда и ни о чём не говорили, а «река
     перерисована под раскрытую ось» падала: зерно от раскрытия оси
     действительно не меняется.
     Река — второй холст, внутри самой диаграммы. Берём его по классу. */
  const RIVER = '[class*="diagram"] canvas';

  const river = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) return null;
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
    return { w: c.width, h: c.height, painted };
  }, RIVER);
  check('канвас растянут под диаграмму', !!river && river.w > 300, river ? `${river.w}×${river.h}` : 'канваса нет');
  check('река нарисована', !!river && river.painted > 1000, river ? `${river.painted} пикселей` : '');

  // ── 4. Раскрытие оси ──
  const bar = page.locator('[data-bar]').first();
  check('ось свёрнута до нажатия', (await bar.getAttribute('aria-expanded')) === 'false');
  await bar.click();
  await page.waitForTimeout(400);
  check('ось раскрылась', (await bar.getAttribute('aria-expanded')) === 'true');

  // Подсказка гаснет за 0.5s — ждём конца перехода, а не середины.
  const readHint = () =>
    page.evaluate(() => {
      const p = [...document.querySelectorAll('p')].find((e) =>
        e.textContent?.includes('tap any axis'),
      );
      return p ? Number(getComputedStyle(p).opacity) : null;
    });
  await page.waitForFunction(
    () => {
      const p = [...document.querySelectorAll('p')].find((e) =>
        e.textContent?.includes('tap any axis'),
      );
      return p !== undefined && Number(getComputedStyle(p).opacity) === 0;
    },
    null,
    { timeout: 3000 },
  ).catch(() => {});
  const hint = await readHint();
  check('подсказка ушла после нажатия', hint === 0, `прозрачность ${hint}`);

  // Река должна перерисоваться под сдвинутые строки, а не остаться на месте.
  const after = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
    return { h: c.height, painted };
  }, RIVER);
  check('река перерисована под раскрытую ось', after.h > river.h, `${river.h} → ${after.h}`);

  // Повторное нажатие сворачивает.
  await bar.click();
  await page.waitForTimeout(400);
  check('повторное нажатие свернуло', (await bar.getAttribute('aria-expanded')) === 'false');

  await page.close();
}

await browser.close();

console.log(failures ? `\nПровалено проверок: ${failures}` : '\nВсе проверки пройдены.');
if (failures) process.exitCode = 1;
