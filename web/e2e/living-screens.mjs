// «Живые» экраны Q_DAYTDAY и Q_STAYWELL в настоящем браузере.
//
// Главное здесь: фон действительно шевелится, по вариантам можно пройти
// с клавиатуры (в проде нельзя было вовсе), выбранный вариант уходит в
// ответ ТЕМ ЖЕ кодом, и — отдельно для Q_STAYWELL — цель для щелчка
// стоит на месте, хотя надпись дышит.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:living
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/living-screens.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

const SCREENS = [
  {
    id: 'Q_DAYTDAY', slug: 'q-daytday',
    stage: '[data-pasta-options]', bg: '[data-blobs]',
    paperRgb: 'rgb(192, 192, 172)',
    // Пока варианты падают, нажимать нечего — ждём дольше.
    settle: 2600,
  },
  {
    id: 'Q_STAYWELL', slug: 'q-staywell',
    stage: '[data-wave-options]', bg: '[data-lines]',
    paperRgb: 'rgb(149, 61, 39)',
    settle: 2200,
  },
];

async function open(s, { reduced = false, viewport = { width: 1200, height: 900 } } = {}) {
  const context = await browser.newContext({
    viewport,
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/en/quiz/${s.slug}`, { waitUntil: 'networkidle' });
  await page.locator(s.stage).waitFor({ timeout: 8000 });
  await page.waitForTimeout(s.settle);
  return { context, page, errors };
}

/** Сумма пикселей холста фона: меняется — значит фон живой. */
const bgSum = (page, sel) => page.evaluate((s) => {
  const c = document.querySelector(s);
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0;
  // Шаг большой намеренно: полный обход холста ретины — это мегапиксели.
  for (let i = 0; i < d.length; i += 4000) sum += d[i] + d[i + 1] + d[i + 2] + d[i + 3];
  return sum;
}, sel);

const opacities = (page) => page.$$eval('button[data-answer]',
  (els) => els.map((e) => Number(getComputedStyle(e).opacity)));

for (const s of SCREENS) {
  const cfg = DATA[s.id];
  const answers = QUIZ[s.id].answers;
  console.log(`\n=== ${s.id} ===`);

  console.log('\nЭкран на месте');
  {
    const { context, page, errors } = await open(s);
    check('механика заменила общий экран',
      (await page.locator('ul li button[data-answer]').count()) === answers.length,
      String(await page.locator('ul li button[data-answer]').count()));
    check('вопрос показан',
      await page.getByText(cfg.question.slice(0, 24), { exact: false }).isVisible());
    const bg = await page.locator(s.stage).evaluate((el) =>
      getComputedStyle(el).backgroundColor);
    check('своё поле, а не прозрачный экран', bg === s.paperRgb, bg);

    /* Текст на экране — тот, что на живом сайте («возьми там»), а НЕ
       полная формулировка из quiz.en.json: она лежала в скрытых кнопках
       Webflow. Код при этом из квиза. Разойтись это может молча, поэтому
       сверяем каждую строку. */
    for (const a of answers) {
      const expected = cfg.options[a.code];
      const shown = (await page.locator(`button[data-answer="${a.code}"]`).textContent())?.trim();
      check(`${a.code}: на экране «${expected}»`, shown === expected,
        `показано «${shown}»`);
    }
    // На Q_DAYTDAY текст сайта заметно короче квизового — это и есть
    // то, что заказчица просила взять с сайта. На Q_STAYWELL они
    // совпадают, там укорачивать было нечего.
    const shorter = answers.filter((a) => cfg.options[a.code].length < a.label.length).length;
    check(`строк, укороченных против квиза: ${shorter} из ${answers.length}`,
      s.id === 'Q_DAYTDAY' ? shorter === answers.length : shorter === 0,
      'если это изменилось — значит текст правили, и надо сверить с сайтом');

    check('все варианты видны после появления',
      (await opacities(page)).every((o) => o > 0.9), (await opacities(page)).join(' '));
    check('ошибок в консоли нет', errors.length === 0, errors.join(' | '));
    await context.close();
  }

  console.log('\nФон шевелится');
  {
    const { context, page } = await open(s);
    const a = await bgSum(page, s.bg);
    await page.waitForTimeout(1500);
    const b = await bgSum(page, s.bg);
    check('картинка фона изменилась', a !== b && a > 0, `${a} → ${b}`);
    await context.close();
  }

  console.log('\nНаведение приглушает остальные, как в проде');
  {
    const { context, page } = await open(s);
    await page.locator(`button[data-answer="${answers[0].code}"]`).hover();
    await page.waitForTimeout(600);
    const o = await opacities(page);
    check('тот, на который смотрят, остался ярким', o[0] > 0.9, o.join(' '));
    check(`остальные приглушены до ${cfg.dim}`,
      o.slice(1).every((x) => Math.abs(x - cfg.dim) < 0.02), o.join(' '));
    check('приглушённый всё равно нажимается',
      await page.locator(`button[data-answer="${answers[1].code}"]`).isEnabled());
    await context.close();
  }

  console.log('\nКлавиатура: в проде эти экраны нельзя было пройти вовсе');
  {
    const { context, page } = await open(s);
    const first = page.locator(`button[data-answer="${answers[0].code}"]`);
    await first.focus();
    check('на вариант можно встать фокусом',
      await first.evaluate((el) => el === document.activeElement));

    const reached = new Set();
    for (let i = 0; i < answers.length * 2; i += 1) {
      const code = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-answer'));
      if (code) reached.add(code);
      await page.keyboard.press('Tab');
    }
    check(`Tab обходит все ${answers.length} вариантов`, reached.size === answers.length,
      [...reached].join(' '));

    // Фокус тоже приглушает остальные — иначе идущий табом не видит,
    // где он.
    await page.locator(`button[data-answer="${answers[1].code}"]`).focus();
    await page.waitForTimeout(500);
    const o = await opacities(page);
    check('фокус приглушает остальные', o[0] < 0.9 && o[1] > 0.9, o.join(' '));
    await context.close();
  }

  console.log('\nВыбранный вариант уходит в ответ ТЕМ ЖЕ');
  {
    for (const a of answers) {
      const { context, page } = await open(s);
      await page.locator(`button[data-answer="${a.code}"]`).click();
      await page.waitForURL((u) => !u.pathname.endsWith(`/${s.slug}`), { timeout: 10000 });
      const saved = await page.evaluate((qid) =>
        JSON.parse(localStorage.getItem('quiz_answers') || '{}')[qid], s.id);
      check(`${a.code}`, saved === a.code, `в базу ушло ${saved}`);
      await context.close();
    }
  }

  console.log('\nВторой вариант после выбора уже не перебивает первый');
  {
    const { context, page } = await open(s);
    await page.locator(`button[data-answer="${answers[0].code}"]`).click();
    const other = page.locator(`button[data-answer="${answers[2].code}"]`);
    check('остальные выключены', await other.isDisabled());
    await page.waitForURL((u) => !u.pathname.endsWith(`/${s.slug}`), { timeout: 10000 });
    const saved = await page.evaluate((qid) =>
      JSON.parse(localStorage.getItem('quiz_answers') || '{}')[qid], s.id);
    check('сохранён тот, по которому нажали', saved === answers[0].code, String(saved));
    await context.close();
  }

  console.log('\nprefers-reduced-motion: фон стоит, ответить можно');
  {
    const { context, page } = await open(s, { reduced: true });
    const a = await bgSum(page, s.bg);
    check('фон всё равно нарисован', a > 0, String(a));
    await page.waitForTimeout(1400);
    check('и не двигается', (await bgSum(page, s.bg)) === a);
    check('варианты сразу видны, а не ждут анимации',
      (await opacities(page)).every((o) => o > 0.9), (await opacities(page)).join(' '));

    await page.locator(`button[data-answer="${answers[1].code}"]`).click();
    await page.waitForURL((u) => !u.pathname.endsWith(`/${s.slug}`), { timeout: 8000 });
    const saved = await page.evaluate((qid) =>
      JSON.parse(localStorage.getItem('quiz_answers') || '{}')[qid], s.id);
    check('ответ сохраняется и без анимации', saved === answers[1].code, String(saved));
    await context.close();
  }

  console.log('\nНа телефоне не уезжает в бок');
  {
    const { context, page } = await open(s, { viewport: { width: 360, height: 780 } });
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('перелива по горизонтали нет', over === 0, `${over}px`);
    check('все варианты на экране есть',
      (await page.locator('button[data-answer]').count()) === answers.length);
    await context.close();
  }
}

console.log('\nQ_STAYWELL: надпись дышит, а цель для щелчка стоит');
{
  /* ЗАЧЕМ ЭТА ПРОВЕРКА. В проде дышала сама кнопка — то есть цель для
     щелчка всё время уезжала из-под пальца, и движение не кончалось
     никогда. Playwright это и поймал: он отказался нажимать, потому что
     элемент «не приходит в покой». Здесь двигается надпись внутри. */
  const s = SCREENS[1];
  const { context, page } = await open(s);
  const r = await page.evaluate(async () => {
    const btn = document.querySelector('button[data-answer]');
    const a = btn.getBoundingClientRect();
    await new Promise((res) => setTimeout(res, 800));
    const b = btn.getBoundingClientRect();
    const label = btn.querySelector('[data-breathe]');
    return {
      moved: Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      labelTransform: label ? getComputedStyle(label).transform : 'нет надписи',
    };
  });
  check('кнопка не сдвинулась ни на пиксель', r.moved === 0, `${r.moved}px`);
  check('а надпись внутри смещена', /matrix\(/.test(r.labelTransform), r.labelTransform);

  // И щелчок проходит без force — то есть Playwright дождался покоя.
  await page.locator('button[data-answer]').first().click({ timeout: 5000 });
  await page.waitForURL((u) => !u.pathname.endsWith('/q-staywell'), { timeout: 10000 });
  check('щелчок проходит без принуждения', true);
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nЖивые экраны работают.\n');
process.exit(failed ? 1 : 0);
