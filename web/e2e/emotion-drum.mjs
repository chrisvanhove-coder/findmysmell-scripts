// Барабан эмоций в настоящем браузере.
//
// Проверяет то, из чего приём состоит: что он крутится сам с открытия,
// что его можно тянуть, что он доводится до слова (а не застывает между
// строк), что тап выбирает то слово, которое в центре, что стрелки и
// клавиатура шагают, и что фон меняется вместе со словом.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:drum
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const PAGE = `${BASE}/en/quiz/q-emo`;

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

// force: true на кликах по стрелкам — они вечно подпрыгивают (приём
// из прода), и Playwright не считает их стабильными. Для пальца и
// курсора смещение в 5px помехой не является.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Cloudinary из песочницы закрыт — подставляем свои фоны. */
async function stubImages(context) {
  await context.route('**://res.cloudinary.com/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">'
        + '<rect width="8" height="8" fill="#345"/></svg>',
    }));
}

/** Слово, стоящее в центре окна барабана. */
const centred = (page) => page.evaluate(() => {
  const slot = document.querySelector('[role="listbox"]');
  const box = slot.getBoundingClientRect();
  const mid = box.height / 2;
  let best = null;
  let bestDist = Infinity;
  for (const w of slot.querySelectorAll('[role="option"]')) {
    const top = Number.parseFloat(w.style.top || 'NaN');
    if (!Number.isFinite(top)) continue;
    const d = Math.abs(top + w.getBoundingClientRect().height / 2 - mid);
    if (d < bestDist) { bestDist = d; best = { word: w.textContent.trim(), top, dist: d }; }
  }
  return best;
});

const tops = (page) => page.evaluate(() =>
  [...document.querySelectorAll('[role="option"]')]
    .map((w) => `${w.textContent.trim()}:${Math.round(Number.parseFloat(w.style.top || '0'))}`)
    .join(' '));

async function open(reduced = false) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  await stubImages(context);
  const page = await context.newPage();
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  await page.locator('[role="listbox"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  return { context, page };
}

console.log('\nБарабан есть и крутится сам с открытия');
{
  const { context, page } = await open();

  check('семь слов в барабане',
    (await page.locator('[role="option"]').count()) === 7);
  check('это listbox с подписью',
    Boolean(await page.locator('[role="listbox"][aria-label]').count()));
  check('подсказка видна',
    await page.getByText('SWIPE UP OR DOWN', { exact: false }).isVisible());
  check('общего списка кнопок нет — механика заменила экран',
    (await page.locator('ul li button').count()) === 0);

  const a = await tops(page);
  await page.waitForTimeout(600);
  const b = await tops(page);
  check('позиции слов изменились сами', a !== b, `${a}\n        ${b}`);

  await context.close();
}

console.log('\nФон — ФОТОГРАФИЯ из Cloudinary, а не заливка цветом');
{
  // Эта проверка стоит здесь потому, что подкраска цветом эмоции может
  // создать впечатление, будто фотографии нет. Фотография — главное;
  // цвет только тонирует её сверху. Проверяем именно фотографию.
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const seen = [];
  // Не подменяем, а записываем: нужно знать, какие адреса страница
  // реально запрашивает.
  await context.route('**://res.cloudinary.com/**', (route) => {
    seen.push(route.request().url());
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">'
        + '<rect width="8" height="8" fill="#345"/></svg>',
    });
  });
  const page = await context.newPage();
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  await page.locator('[role="listbox"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(900);

  check('страница запросила фотографии из Cloudinary', seen.length > 0,
    `запросов ${seen.length}`);
  check('запрошены все семь фотографий эмоций',
    ['calm', 'energy', 'sexy', 'cozy', 'play', 'focus', 'myst']
      .every((k) => seen.some((u) => u.includes(`feel-${k}`))),
    seen.map((u) => u.split('/').pop()).join(', '));
  check('адреса с преобразованием, а не исходные тяжёлые файлы',
    seen.every((u) => u.includes('/upload/c_fill')),
    'исходники sexy и energy весят по 3,6 МБ');

  // И то, что реально стоит фоном у видимого слоя.
  const bg = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-hidden]')]
      .map((e) => e.style.backgroundImage)
      .filter(Boolean));
  check('фоном стоит фотография, а не цвет',
    bg.length > 0 && bg.every((v) => v.includes('res.cloudinary.com')),
    bg.join(' | ') || '(background-image не выставлен)');
  check('в фоне есть имя файла эмоции',
    bg.some((v) => /feel-(calm|energy|sexy|cozy|play|focus|myst)/.test(v)),
    bg.join(' | '));

  await context.close();
}

console.log('\nФон меняется вместе со словом');
{
  const { context, page } = await open();
  const shown = () => page.evaluate(() =>
    [...document.querySelectorAll('[aria-hidden]')]
      .filter((e) => e.style.backgroundImage)
      .map((e) => `${e.style.backgroundImage.slice(-24)}|${e.style.opacity}`)
      .join(' '));

  const first = await shown();
  check('фон выставлен', first.length > 0, first);

  // Ждём, пока барабан прокрутится хотя бы на слово.
  await page.waitForTimeout(2500);
  const second = await shown();
  check('фон сменился вместе со словом', first !== second,
    `${first}\n        ${second}`);
  check('кроссфейд идёт по opacity, а не рывком',
    /\|1$|\|1 /.test(second) && second.includes('|0'),
    'должен быть один слой видимый и один погашенный: ' + second);

  await context.close();
}

console.log('\nБарабан можно тянуть, и он доводится до слова');
{
  const { context, page } = await open();
  const slot = page.locator('[role="listbox"]');
  const box = await slot.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Тянем вверх на три слота.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i += 1) {
    await page.mouse.move(cx, cy - i * 20);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();

  // Даём инерции затухнуть и доводке сработать.
  await page.waitForTimeout(1800);
  const c = await centred(page);
  check('после тяги слово стоит по центру, а не между строк',
    c.dist < 3, `${c.word} на ${c.top}px, отклонение ${c.dist.toFixed(1)}px`);

  await context.close();
}

console.log('\nСтрелки и клавиатура шагают ровно на слово');
{
  const { context, page } = await open();
  // Сначала уводим из автовращения, иначе шаг не с чем сравнивать.
  await page.getByRole('button', { name: 'Next', exact: true }).click({ force: true });
  await page.waitForTimeout(600);
  const before = (await centred(page)).word;

  await page.getByRole('button', { name: 'Next', exact: true }).click({ force: true });
  await page.waitForTimeout(600);
  const afterArrow = (await centred(page)).word;
  check('стрелка сменила слово', before !== afterArrow, `${before} → ${afterArrow}`);

  // Клавиатура: в проде барабан с клавиатуры был недоступен вовсе.
  await page.locator('[role="listbox"]').focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(600);
  const afterKey = (await centred(page)).word;
  check('ArrowDown сменил слово', afterArrow !== afterKey, `${afterArrow} → ${afterKey}`);

  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(600);
  check('ArrowUp вернул предыдущее', (await centred(page)).word === afterArrow,
    `${(await centred(page)).word} вместо ${afterArrow}`);

  check('aria-selected стоит на слове в центре',
    await page.locator(`[role="option"][aria-selected="true"]`).first()
      .evaluate((e) => e.textContent.trim()) === afterArrow);

  await context.close();
}

console.log('\nТап выбирает слово из центра и уводит дальше');
{
  const { context, page } = await open();
  // Останавливаем автовращение стрелкой, чтобы знать, что выбираем.
  await page.getByRole('button', { name: 'Next', exact: true }).click({ force: true });
  await page.waitForTimeout(700);
  const target = (await centred(page)).word;

  const slot = page.locator('[role="listbox"]');
  const box = await slot.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Подпись обязана показать именно то слово, что стояло в центре.
  await page.waitForTimeout(250);
  check('подсказка подтвердила выбранное слово',
    await page.getByText(`✓  ${target}`).isVisible(), target);

  // И через 800 мс должен произойти переход на следующий вопрос.
  await page.waitForURL((u) => !u.pathname.endsWith('/q-emo'), { timeout: 5000 });
  const url = page.url();
  check('ушли с q-emo', !url.endsWith('/q-emo'), url);
  // Ветка эмоции: после Q_EMO идёт вопрос выбранной эмоции.
  check('перешли в ветку выбранной эмоции',
    /\/quiz\/q-(calm|energy|cozy|myst|sexy|focus|play)$/.test(new URL(url).pathname),
    url);

  // И ответ сохранён.
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_EMO);
  check('ответ Q_EMO сохранён', typeof saved === 'string' && saved.startsWith('Q_EMO__'),
    String(saved));

  await context.close();
}

console.log('\nprefers-reduced-motion: сам не крутится, но управляем');
{
  const { context, page } = await open(true);
  const a = await tops(page);
  await page.waitForTimeout(900);
  const b = await tops(page);
  check('сам не крутится', a === b, `${a}\n        ${b}`);

  await page.getByRole('button', { name: 'Next', exact: true }).click({ force: true });
  await page.waitForTimeout(600);
  check('но стрелка всё равно работает', (await tops(page)) !== b);

  await context.close();
}

console.log('\nДлинное слово не обрезается на узком экране');
{
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await stubImages(context);
  const page = await context.newPage();
  await page.goto(PAGE, { waitUntil: 'networkidle' });
  await page.locator('[role="listbox"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(700);

  const fits = await page.evaluate(() => {
    const slot = document.querySelector('[role="listbox"]');
    const sw = slot.clientWidth;
    let worst = 0;
    let word = '';
    for (const w of slot.querySelectorAll('[role="option"]')) {
      // scrollWidth даёт настоящую ширину текста при white-space: nowrap.
      if (w.scrollWidth > worst) { worst = w.scrollWidth; word = w.textContent.trim(); }
    }
    return { sw, worst, word };
  });
  check('самое длинное слово влезает в окно барабана',
    fits.worst <= fits.sw + 1, `${fits.word}: ${fits.worst}px в ${fits.sw}px`);

  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('страница не уехала в бок', over === 0, `${over}px`);

  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nБарабан работает.\n');
process.exit(failed ? 1 : 0);
