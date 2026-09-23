// Фонарик в настоящем браузере.
//
// Проверяет то, из чего приём состоит: что до движения текстуры не видно,
// что она проявляется под курсором, что три круга ЗАПАЗДЫВАЮТ (иначе это
// просто пятно, а не след), что уход курсора всё гасит, и что при
// prefers-reduced-motion фонарик не включается.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:flashlight
import { chromium } from 'playwright';
import { unlockResult } from './lib/unlock-result.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const URL = `${BASE}/en/result/hug`;

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Значения всех восьми переменных маски, числами. */
async function vars(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-flashlight="texture"]');
    const s = el.style;
    const num = (n) => Number.parseFloat(s.getPropertyValue(n) || 'NaN');
    return {
      mx: num('--mx'), my: num('--my'),
      mx1: num('--mx1'), my1: num('--my1'),
      mx2: num('--mx2'), my2: num('--my2'),
      mx3: num('--mx3'), my3: num('--my3'),
    };
  });
}

console.log('\nДо движения курсора текстуры не видно');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await page.goto(URL, { waitUntil: 'networkidle' });

  const layer = page.locator('[data-flashlight="texture"]').first();
  check('слой текстуры есть в разметке', await layer.count() === 1);

  const style = await layer.evaluate((el) => {
    const c = getComputedStyle(el);
    return { opacity: c.opacity, blend: c.mixBlendMode, events: c.pointerEvents };
  });
  check('прозрачность 0.35, как в проде', style.opacity === '0.35', style.opacity);
  check('режим наложения multiply', style.blend === 'multiply', style.blend);
  check('слой не перехватывает клики', style.events === 'none', style.events);

  // Переменные не выставлены — значит работают значения по умолчанию
  // (-300px), и маски за экраном.
  const v = await vars(page);
  check('маски ещё не расставлены', Number.isNaN(v.mx) && Number.isNaN(v.mx3),
    JSON.stringify(v));

  await context.close();
}

console.log('\nТекстура идёт за курсором, а след запаздывает');
let moved;
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // boundingBox даёт координаты относительно ОКНА, а mouse.move ходит
  // по окну же — значит блок надо сначала показать, иначе движения
  // мыши уходят за пределы вьюпорта и событий нет вовсе.
  const layer = page.locator('[data-flashlight="texture"]').first();
  await layer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await layer.boundingBox();
  const y = box.y + box.height / 2;

  // Ведём курсор слева направо внутри блока, давая кадрам пройти.
  for (let i = 0; i <= 20; i += 1) {
    await page.mouse.move(box.x + 60 + i * 14, y);
    await page.waitForTimeout(40);
  }
  moved = await vars(page);

  check('основной круг встал под курсором', Number.isFinite(moved.mx), JSON.stringify(moved));
  check('все четыре круга расставлены',
    [moved.mx, moved.mx1, moved.mx2, moved.mx3].every(Number.isFinite),
    JSON.stringify(moved));

  // Мышь шла вправо, значит запаздывающие круги обязаны быть ЛЕВЕЕ.
  check('круг 1 отстаёт от курсора', moved.mx1 < moved.mx, `${moved.mx1} vs ${moved.mx}`);
  check('круг 2 отстаёт от круга 1', moved.mx2 < moved.mx1, `${moved.mx2} vs ${moved.mx1}`);
  check('круг 3 отстаёт от круга 2', moved.mx3 < moved.mx2, `${moved.mx3} vs ${moved.mx2}`);
  check('след идёт по той же линии, что курсор',
    Math.abs(moved.my1 - moved.my) < 6 && Math.abs(moved.my3 - moved.my) < 6,
    JSON.stringify(moved));

  await context.close();
}

console.log('\nУход курсора гасит фонарик');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // boundingBox даёт координаты относительно ОКНА, а mouse.move ходит
  // по окну же — значит блок надо сначала показать, иначе движения
  // мыши уходят за пределы вьюпорта и событий нет вовсе.
  const layer = page.locator('[data-flashlight="texture"]').first();
  await layer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await layer.boundingBox();
  for (let i = 0; i <= 10; i += 1) {
    await page.mouse.move(box.x + 60 + i * 14, box.y + box.height / 2);
    await page.waitForTimeout(40);
  }
  // Уводим курсор выше блока.
  await page.mouse.move(box.x + 200, box.y - 60);
  await page.waitForTimeout(250);

  const v = await vars(page);
  check('все круги ушли за экран',
    [v.mx, v.my, v.mx1, v.mx2, v.mx3].every((n) => n === -300), JSON.stringify(v));

  // И цикл кадров должен остановиться, а не крутиться вечно.
  const before = await page.evaluate(() => performance.now());
  await page.waitForTimeout(400);
  const still = await vars(page);
  check('после ухода ничего не меняется',
    JSON.stringify(still) === JSON.stringify(v), `${before}`);

  await context.close();
}

console.log('\nprefers-reduced-motion выключает приём');
{
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // boundingBox даёт координаты относительно ОКНА, а mouse.move ходит
  // по окну же — значит блок надо сначала показать, иначе движения
  // мыши уходят за пределы вьюпорта и событий нет вовсе.
  const layer = page.locator('[data-flashlight="texture"]').first();
  await layer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await layer.boundingBox();
  for (let i = 0; i <= 10; i += 1) {
    await page.mouse.move(box.x + 60 + i * 14, box.y + box.height / 2);
    await page.waitForTimeout(40);
  }

  const v = await vars(page);
  check('круги так и не расставлены', Number.isNaN(v.mx), JSON.stringify(v));
  // Текст при этом обязан остаться на месте и читаться.
  check('текст блока на месте',
    (await page.locator('[data-flashlight="content"] p').count()) > 0);

  await context.close();
}

console.log('\nТекст лежит поверх текстуры, а не под ней');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await page.goto(URL, { waitUntil: 'networkidle' });

  const layers = await page.evaluate(() => {
    const tex = document.querySelector('[data-flashlight="texture"]');
    const content = tex.nextElementSibling;
    return {
      texture: getComputedStyle(tex).zIndex,
      content: getComputedStyle(content).zIndex,
      vignette: getComputedStyle(tex.parentElement, '::after').zIndex,
    };
  });
  check('текстура ниже виньетки', Number(layers.texture) < Number(layers.vignette),
    JSON.stringify(layers));
  check('текст выше виньетки', Number(layers.content) > Number(layers.vignette),
    JSON.stringify(layers));

  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nФонарик работает.\n');
process.exit(failed ? 1 : 0);
