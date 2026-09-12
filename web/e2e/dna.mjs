// Проверяет зону Scent DNA в браузере: что на экране стоит ровно то,
// что посчитал движок, что река рисуется, а оси раскрываются.
//
// Движок сам по себе сверен с продом в tools/dna-parity.mjs. Здесь другое:
// что посчитанное доехало до разметки и не разошлось по дороге.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

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

// ── 1. Без ответов — дефолты архетипа, а не пустая диаграмма ──
console.log('\nБез пройденного квиза');
{
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/en/result/ceo', { waitUntil: 'networkidle' });
  const shown = await dots(page);
  const want = AXES.map((k) => pct(dna.defaults.CEO[k]));
  check('пять осей на месте', shown.length === 5, `${shown.length}`);
  check(
    'точки стоят по дефолтам CEO',
    shown.every((v, i) => near(v, want[i])),
    shown.map((v) => v.toFixed(1)).join(' / '),
  );
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
  await page.addInitScript(
    (a) => sessionStorage.setItem('quiz_answers', JSON.stringify(a)),
    ANSWERS,
  );
  await page.goto('http://localhost:3000/en/result/ceo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400); // клиентский пересчёт после монтирования

  // Считаем ожидаемое здесь же, по выгруженным данным — независимо от кода сайта.
  const codes = Object.values(ANSWERS);
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
  const river = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
    return { w: c.width, h: c.height, painted };
  });
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
  const after = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
    return { h: c.height, painted };
  });
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
