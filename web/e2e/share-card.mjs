// Шеринговая карточка в настоящем браузере.
//
// Главное, что здесь проверяется: карточку можно СОХРАНИТЬ. Холст с
// картинкой из другого домена «портится», и toDataURL начинает бросать —
// тогда вся затея не работает, а на экране всё выглядит нормально.
// Второе: на карточке нет внутреннего имени архетипа, а @tag наверху.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:share
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { unlockResult } from './lib/unlock-result.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Cloudinary из песочницы закрыт — подставляем свой флакон. */
const BOTTLE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400">'
  + '<rect width="300" height="400" fill="#d9d2c4"/></svg>',
).toString('base64');

async function open(page, { route = true } = {}) {
  if (route) {
    await page.route('**://res.cloudinary.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'image/svg+xml',
        body: Buffer.from(BOTTLE, 'base64') }));
  }
  await page.goto(`${BASE}/en/result/hug`, { waitUntil: 'networkidle' });
  // Карточка всплывает при прокрутке до конца — прокручиваем.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('dialog', { name: 'Share your scent' }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(900);   // даём дорисоваться
}

console.log('\nКарточка всплывает при прокрутке до конца');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await page.route('**://res.cloudinary.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/svg+xml', body: Buffer.from(BOTTLE, 'base64') }));
  await page.goto(`${BASE}/en/result/hug`, { waitUntil: 'networkidle' });

  const dialog = page.getByRole('dialog', { name: 'Share your scent' });
  check('до прокрутки карточки нет', !(await dialog.isVisible()));

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await dialog.waitFor({ timeout: 8000 });
  check('после прокрутки всплыла', await dialog.isVisible());

  // Закрыли — сама больше не лезет.
  await dialog.getByRole('button', { name: 'Close' }).click();
  check('закрылась', !(await dialog.isVisible()));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  check('второй раз сама не всплывает', !(await dialog.isVisible()));
  check('но есть кнопка вернуть',
    await page.getByRole('button', { name: 'Share', exact: true }).isVisible());

  await context.close();
}

console.log('\nКарточка нарисована и её можно сохранить');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await open(page);

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('[data-share-card] canvas');
    return { w: c.width, h: c.height };
  });
  check('размер холста 1080×1350 (4:5, вертикаль инстаграма)',
    canvasInfo.w === 1080 && canvasInfo.h === 1350, JSON.stringify(canvasInfo));

  // Холст не должен быть пустым: считаем непрозрачные и неодноцветные пиксели.
  const painted = await page.evaluate(() => {
    const c = document.querySelector('[data-share-card] canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 997) {
      seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    }
    return seen.size;
  });
  check('на холсте больше одного цвета', painted > 3, `цветов в выборке: ${painted}`);

  // САМОЕ ВАЖНОЕ: холст не «испорчен» картинкой из другого домена,
  // иначе сохранить карточку нельзя, а на экране всё выглядит нормально.
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector('[data-share-card] canvas');
    try {
      return { ok: true, len: c.toDataURL('image/png').length };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
  check('toDataURL не бросает — холст не испорчен', dataUrl.ok, dataUrl.error);
  check('картинка не пустая по весу', (dataUrl.len ?? 0) > 20_000, `${dataUrl.len} символов`);

  // Кнопка сохранения реально отдаёт файл.
  const download = page.waitForEvent('download', { timeout: 8000 });
  await page.getByRole('button', { name: 'Save image' }).click();
  const file = await download;
  check('скачался png с понятным именем',
    file.suggestedFilename() === 'findmysmell-hug.png', file.suggestedFilename());

  await context.close();
}

console.log('\nНа карточке то, что просила заказчица');
{
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // Результат закрыт без пройденного квиза — выдаём пропуск до первой отрисовки.
  await unlockResult(page);
  await open(page);

  // @tag должен стоять НАВЕРХУ. Конкретные координаты не зашиваем —
  // раскладка ещё будет меняться. Вместо этого сканируем карточку
  // построчно и проверяем ПОРЯДОК: сначала мелкая строка @tag, потом
  // линия во всю ширину, потом крупный панчлайн.
  const scan = await page.evaluate(() => {
    const c = document.querySelector('[data-share-card] canvas');
    const ctx = c.getContext('2d');
    const bg = ctx.getImageData(2, 2, 1, 1).data;
    const all = ctx.getImageData(0, 0, c.width, c.height).data;

    const ink = [];
    for (let y = 0; y < c.height; y += 1) {
      let n = 0;
      for (let x = 0; x < c.width; x += 1) {
        const i = (y * c.width + x) * 4;
        if (Math.abs(all[i] - bg[0]) + Math.abs(all[i + 1] - bg[1])
          + Math.abs(all[i + 2] - bg[2]) > 60) n += 1;
      }
      ink.push(n);
    }

    const firstInk = ink.findIndex((n) => n > 5);
    // Линия — единственная строка, закрашенная почти во всю ширину.
    const ruleY = ink.findIndex((n) => n > c.width * 0.8);
    // Панчлайн: первая полоса с большим количеством краски ПОСЛЕ линии.
    const punchY = ink.findIndex((n, y) => y > ruleY + 4 && n > 200);
    return { firstInk, ruleY, punchY, height: c.height };
  });

  check('первая краска на карточке — в верхней десятой части',
    scan.firstInk > 0 && scan.firstInk < scan.height / 10, JSON.stringify(scan));
  check('под ней линия во всю ширину', scan.ruleY > scan.firstInk, JSON.stringify(scan));
  check('панчлайн НИЖЕ линии, то есть @tag наверху',
    scan.punchY > scan.ruleY, JSON.stringify(scan));
  check('между @tag и панчлайном не больше 120px',
    scan.punchY - scan.firstInk < 120, JSON.stringify(scan));

  await context.close();
}

console.log('\nВнутреннего имени архетипа на карточке нет');
{
  // Это проверяется не по пикселям, а по коду: в проде на карточку
  // печаталось headline вида «YOU ARE A HUG.», и заказчица его сняла.
  // Комментарии выбрасываем: в них слово headline стоит законно — там
  // объяснено, почему его убрали.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const drawSrc = readFileSync('src/lib/share-card.ts', 'utf8');
  const draw = strip(drawSrc);
  check('headline не рисуется', !/headline/.test(draw),
    'в fmsDrawShareCard прода печаталось arch.headline');
  check('в CardArch нет поля headline', !/headline\s*[:?]/.test(draw));
  check('имя архетипа не рисуется', !/archetype/i.test(draw.split('drawFooter')[0] ?? ''));

  const card = strip(readFileSync('src/components/ShareCard.tsx', 'utf8'));
  check('в компонент headline не передаётся', !/headline/.test(card));

  // И сам порядок рисования: @tag раньше панчлайна.
  check('@tag рисуется раньше панчлайна',
    draw.indexOf('drawTagLine(ctx') < draw.indexOf('drawPunch(ctx'),
    'заказчица попросила @tag наверх');
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nКарточка рисуется и сохраняется.\n');
process.exit(failed ? 1 : 0);
