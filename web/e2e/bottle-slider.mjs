// Флаконы-ползунки Q_SWEET и Q_WILD в настоящем браузере.
//
// Эти два вопроса задают оси sweet и raw, по которым подбирается флакон.
// Поэтому главное здесь не вид, а то, что уровень, который человек
// выставил, попадает в ответ ТЕМ ЖЕ, а не соседним: ошибка на один
// уровень меняет подобранный парфюм.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:bottle
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Уровни из тех же данных, что использует компонент. */
const DATA = JSON.parse(
  await (await import('node:fs/promises')).readFile('src/data/bottle-sliders.json', 'utf8'),
);

async function open(slug, { reduced = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 900 },
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/en/quiz/${slug}`, { waitUntil: 'networkidle' });
  await page.locator('[role="slider"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(500);
  return { context, page };
}

const level = (page) => page.locator('[role="slider"]').evaluate((el) => ({
  now: Number(el.getAttribute('aria-valuenow')),
  text: el.getAttribute('aria-valuetext'),
  min: Number(el.getAttribute('aria-valuemin')),
  max: Number(el.getAttribute('aria-valuemax')),
}));

/**
 * Где кромка жидкости: идём вниз по середине флакона и ищем первую
 * строку, заметно темнее стекла. Считать непрозрачные точки нельзя —
 * стекло залито по всей бутылке, и счёт не меняется вовсе.
 */
const surface = (page) => page.evaluate(() => {
  const c = document.querySelector('[role="slider"] canvas');
  const ctx = c.getContext('2d');
  const x = Math.round(c.width / 2);
  const col = ctx.getImageData(x, 0, 1, c.height).data;
  const lum = (i) => 0.2126 * col[i] + 0.7152 * col[i + 1] + 0.0722 * col[i + 2];
  // Стекло светлое и почти прозрачное; жидкость плотная и тёмная.
  for (let y = 0; y < c.height; y += 1) {
    const i = y * 4;
    if (col[i + 3] > 150 && lum(i) < 190) return y / c.height;
  }
  return 1;   // жидкости нет вовсе
});

for (const [slug, id] of [['q-sweet', 'Q_SWEET'], ['q-wild', 'Q_WILD']]) {
  const cfg = DATA[id];
  console.log(`\n=== ${id} ===`);

  console.log('\nЭкран на месте');
  {
    const { context, page } = await open(slug);
    check('флакон есть и это ползунок',
      (await page.locator('[role="slider"]').count()) === 1);
    check('общего списка кнопок нет — механика заменила экран',
      (await page.locator('ul li button').count()) === 0);
    check('вопрос показан',
      await page.getByText(cfg.question[0], { exact: false }).isVisible());
    check('подсказка показана до первой тяги',
      await page.getByText(cfg.hint, { exact: false }).isVisible());

    const l = await level(page);
    check('уровней четыре', l.min === 1 && l.max === cfg.levels.length,
      `${l.min}..${l.max}`);
    check('начинаем с первого', l.now === 1, String(l.now));

    // Кнопка есть, но до выбора недоступна: подтверждать нечего.
    const btn = page.getByRole('button', { name: cfg.confirm });
    check('кнопка подтверждения пока недоступна', await btn.isDisabled());

    const bg = await page.locator('[data-bottle-slider]').evaluate((el) =>
      getComputedStyle(el).backgroundColor);
    check('свой фон экрана', bg !== 'rgba(0, 0, 0, 0)', bg);

    await context.close();
  }

  console.log('\nКлавиатура ставит уровень — в проде её не было вовсе');
  {
    const { context, page } = await open(slug);
    const slider = page.locator('[role="slider"]');
    await slider.focus();

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(250);
    let l = await level(page);
    check('ArrowUp поднял на один', l.now === 2, `${l.now}: ${l.text}`);
    check('подпись назвала уровень словами', l.text === cfg.levels[1].label, String(l.text));

    await page.keyboard.press('End');
    await page.waitForTimeout(250);
    l = await level(page);
    check('End поставил максимум', l.now === cfg.levels.length, String(l.now));
    check('подпись максимума верная',
      l.text === cfg.levels[cfg.levels.length - 1].label, String(l.text));

    await page.keyboard.press('Home');
    await page.waitForTimeout(250);
    l = await level(page);
    check('Home поставил минимум', l.now === 1, String(l.now));

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    check('за минимум не уходит', (await level(page)).now === 1);

    await context.close();
  }

  console.log('\nУровень жидкости растёт вместе с выбором');
  {
    const { context, page } = await open(slug);
    await page.locator('[role="slider"]').focus();

    await page.keyboard.press('Home');
    await page.waitForTimeout(900);
    const atZero = await surface(page);

    await page.keyboard.press('End');
    await page.waitForTimeout(1100);
    const atFull = await surface(page);

    // Чем выше уровень, тем ВЫШЕ кромка, то есть меньше доля сверху.
    check('на максимуме кромка жидкости выше',
      atFull < atZero - 0.15,
      `кромка сверху: ${atZero.toFixed(2)} → ${atFull.toFixed(2)} (доля высоты)`);

    await context.close();
  }

  console.log('\nВыбранный уровень уходит в ответ ТЕМ ЖЕ');
  {
    // Проверяем каждый из четырёх уровней: ошибка на один меняет
    // подобранный парфюм, поэтому мало убедиться в одном.
    for (let i = 0; i < cfg.levels.length; i += 1) {
      const { context, page } = await open(slug);
      const slider = page.locator('[role="slider"]');
      await slider.focus();
      await page.keyboard.press('Home');
      for (let k = 0; k < i; k += 1) await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(400);

      const shown = (await level(page)).text;
      await page.getByRole('button', { name: cfg.confirm }).click();
      await page.waitForURL((u) => !u.pathname.endsWith(`/${slug}`), { timeout: 6000 });

      const saved = await page.evaluate((qid) =>
        JSON.parse(localStorage.getItem('quiz_answers') || '{}')[qid], id);
      check(`уровень ${i + 1} «${cfg.levels[i].label}» → ${cfg.levels[i].code}`,
        saved === cfg.levels[i].code && shown === cfg.levels[i].label,
        `в базу ушло ${saved}, на экране было «${shown}»`);

      await context.close();
    }
  }

  console.log('\nТяга пальцем и доводка до уровня');
  {
    const { context, page } = await open(slug);
    const box = await page.locator('[role="slider"]').boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Тянем вверх примерно на треть высоты флакона.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let k = 1; k <= 10; k += 1) {
      await page.mouse.move(cx, cy - k * (box.height / 30));
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForTimeout(900);

    const l = await level(page);
    check('после тяги уровень выше первого', l.now > 1, `${l.now}: ${l.text}`);
    check('уровень — один из четырёх, а не между',
      cfg.levels.some((x) => x.label === l.text), String(l.text));
    check('кнопка подтверждения стала доступна',
      await page.getByRole('button', { name: cfg.confirm }).isEnabled());

    await context.close();
  }
}

console.log('\nprefers-reduced-motion: волна не идёт, но ползунок работает');
{
  const { context, page } = await open('q-sweet', { reduced: true });
  await page.locator('[role="slider"]').focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(900);

  const a = await surface(page);
  await page.waitForTimeout(600);
  const b = await surface(page);
  check('кромка стоит и не дрожит', Math.abs(a - b) < 0.01,
    `${a.toFixed(3)} → ${b.toFixed(3)}`);
  check('уровень всё равно выставился',
    (await level(page)).now === DATA.Q_SWEET.levels.length);

  await context.close();
}

console.log('\nНа телефоне не уезжает в бок');
{
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/en/quiz/q-wild`, { waitUntil: 'networkidle' });
  await page.locator('[role="slider"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);

  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);
  check('флакон виден целиком',
    await page.locator('[role="slider"]').isVisible());
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nФлаконы работают.\n');
process.exit(failed ? 1 : 0);
