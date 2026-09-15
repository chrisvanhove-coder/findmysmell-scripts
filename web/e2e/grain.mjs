// Зерно в настоящем браузере.
//
// Проверяет три вещи, каждая из которых ломается незаметно:
//   1. Зерно есть, оно шумное (а не серая заливка) и не перехватывает клики.
//   2. Оно КИПИТ — то есть перерисовывается, а не висит одним кадром.
//   3. При prefers-reduced-motion не кипит, но остаётся: это текстура.
// И четвёртое: что оно не мутнит ссылки подвала, обязательные во Франции.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:grain
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Отпечаток картинки зерна: сумма и разброс яркости в выборке пикселей. */
const sample = (page) => page.evaluate(() => {
  const c = document.querySelector('[data-grain]');
  const d = c.getContext('2d').getImageData(0, 0, Math.min(c.width, 200), 40).data;
  let sum = 0;
  let min = 255;
  let max = 0;
  const vals = [];
  for (let i = 0; i < d.length; i += 4) {
    sum += d[i];
    min = Math.min(min, d[i]);
    max = Math.max(max, d[i]);
    vals.push(d[i]);
  }
  return { sum, min, max, n: vals.length, head: vals.slice(0, 24).join(',') };
});

console.log('\nЗерно есть и оно шумное');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout
    ? await page.waitForTimeout(400) : null;

  const el = page.locator('[data-grain]');
  check('слой зерна есть', await el.count() === 1);

  const style = await el.evaluate((n) => {
    const c = getComputedStyle(n);
    return {
      opacity: c.opacity,
      blend: c.mixBlendMode,
      events: c.pointerEvents,
      position: c.position,
      z: c.zIndex,
      rendering: c.imageRendering,
    };
  });
  check('прозрачность 0.07, как в проде', style.opacity === '0.07', style.opacity);
  check('режим наложения overlay', style.blend === 'overlay', style.blend);
  check('клики не перехватывает', style.events === 'none', style.events);
  check('закреплено на весь экран', style.position === 'fixed', style.position);
  check('шум остаётся пиксельным', style.rendering === 'pixelated', style.rendering);

  const size = await el.evaluate((n) => ({ w: n.width, h: n.height }));
  check('холст размером во вьюпорт', size.w === 1200 && size.h === 800, JSON.stringify(size));

  const s = await sample(page);
  check('это шум, а не заливка одним цветом', s.max - s.min > 150,
    `яркость от ${s.min} до ${s.max}`);
  check('шум примерно посередине по яркости',
    s.sum / s.n > 90 && s.sum / s.n < 165, `средняя ${(s.sum / s.n).toFixed(0)}`);

  await context.close();
}

console.log('\nЗерно кипит, а не висит одним кадром');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const a = await sample(page);
  await page.waitForTimeout(400);      // больше пяти периодов по 80 мс
  const b = await sample(page);
  check('кадр сменился', a.head !== b.head, `${a.head}\n        ${b.head}`);

  await context.close();
}

console.log('\nprefers-reduced-motion: зерно остаётся, но не кипит');
{
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const a = await sample(page);
  check('зерно всё равно нарисовано', a.max - a.min > 150,
    `яркость от ${a.min} до ${a.max}`);

  await page.waitForTimeout(500);
  const b = await sample(page);
  check('кадр НЕ сменился', a.head === b.head, `${a.head}\n        ${b.head}`);

  await context.close();
}

console.log('\nЗерно не мутнит подвал');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });

  const layers = await page.evaluate(() => {
    const grain = getComputedStyle(document.querySelector('[data-grain]')).zIndex;
    const footer = getComputedStyle(document.querySelector('footer')).zIndex;
    return { grain: Number(grain), footer: Number(footer) };
  });
  check('подвал выше зерна', layers.footer > layers.grain, JSON.stringify(layers));

  // Обязательные во Франции ссылки должны кликаться сквозь зерно.
  const privacy = page.getByRole('link', { name: 'Privacy Policy' }).first();
  await privacy.click();
  await page.waitForURL(/privacy-policy/, { timeout: 5000 });
  check('ссылка на политику кликается сквозь зерно',
    page.url().includes('privacy-policy'), page.url());
  check('на политике зерно тоже есть',
    (await page.locator('[data-grain]').count()) === 1);

  await context.close();
}

console.log('\nВо скрытой вкладке зерно не крутится');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  // Уводим вкладку в фон: открываем вторую и делаем её активной.
  const other = await context.newPage();
  await other.goto('about:blank');
  await other.bringToFront();
  await page.waitForTimeout(300);

  const a = await sample(page);
  await page.waitForTimeout(500);
  const b = await sample(page);
  check('в фоне кадр не сменился', a.head === b.head, 'шум крутится во фоновой вкладке');

  await page.bringToFront();
  await page.waitForTimeout(400);
  const c = await sample(page);
  check('после возврата снова кипит', c.head !== b.head);

  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nЗерно работает.\n');
process.exit(failed ? 1 : 0);
