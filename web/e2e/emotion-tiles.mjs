// Семь экранов ветки эмоции в настоящем браузере.
//
// Что здесь важно. Эти семь экранов — один компонент, поэтому проверять
// надо и то, что он подставляет КАЖДОМУ вопросу его собственные снимки и
// его собственный вопрос (иначе на экране «спокойствие» окажутся кадры
// «страсти»), и то, что выбранный вариант уходит в ответ тем же кодом.
//
// И вес: в проде на каждом из этих экранов грелись все шесть-семь PNG по
// 1.2–1.8 МБ. Здесь проверяется, что браузер просит ИМЕННО
// трансформированные ссылки и ничего с website-files.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:emotion
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/emotion-tiles.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));
const PROMPTS = JSON.parse(await readFile('src/data/question-open-prompts.json', 'utf8'));
const BRANCH = Object.keys(DATA.photos);

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const slug = (id) => id.toLowerCase().replace(/_/g, '-');

/* Экран ветки, которую не выбрали, уводит на Q_EMO: человек проходит ровно
   одну из семи. Поэтому перед прямой ссылкой на экран ветки эмоция должна
   быть уже выбрана — иначе до плиток дело не дойдёт. Ставим только если её
   ещё нет, чтобы не стирать накопленные ответы. */
const seedEmotion = (context, id) => context.addInitScript((emo) => {
  try {
    const raw = sessionStorage.getItem('quiz_answers')
      ?? localStorage.getItem('quiz_answers') ?? '{}';
    const answers = JSON.parse(raw);
    if (answers.Q_EMO) return;
    answers.Q_EMO = emo;
    sessionStorage.setItem('quiz_answers', JSON.stringify(answers));
    localStorage.setItem('quiz_answers', JSON.stringify(answers));
  } catch { /* приватный режим — переживём */ }
}, `Q_EMO__${id.slice(2)}`);

async function open(id, { viewport = { width: 1400, height: 900 }, touch = false } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  await seedEmotion(context, id);
  const page = await context.newPage();
  const errors = [];
  const images = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.resourceType() === 'image') images.push(r.url());
  });
  await page.goto(`${BASE}/en/quiz/${slug(id)}`, { waitUntil: 'networkidle' });
  await page.locator(`[data-emotion-tiles="${id}"]`).waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  return { context, page, errors, images };
}

const saved = (page, id) => page.evaluate(
  (q) => JSON.parse(localStorage.getItem('quiz_answers') || '{}')[q], id,
);

/* ─── 1. каждому экрану — его вопрос и его снимки ──────────────────────── */

console.log('\nУ каждого из семи экранов свой вопрос и свои снимки');
for (const id of BRANCH) {
  const { context, page, errors, images } = await open(id);
  const answers = QUIZ[id].answers;

  check(`${id}: плиток столько же, сколько вариантов`,
    (await page.locator('button[data-answer]').count()) === answers.length,
    `${await page.locator('button[data-answer]').count()} при ${answers.length}`);

  check(`${id}: вопрос «${PROMPTS.prompts[id]}»`,
    (await page.locator('h1').first().textContent())?.trim() === PROMPTS.prompts[id]);

  // Снимки на плитках — ровно те, что привязаны к этому вопросу.
  const backgrounds = await page.$$eval('button[data-answer]', (els) => els.map((e) => ({
    code: e.dataset.answer,
    bg: getComputedStyle(e).backgroundImage,
  })));
  const mine = DATA.photos[id];
  let wrong = [];
  for (const { code, bg } of backgrounds) {
    const want = mine[code];
    if (want) {
      const stem = want.split('/').pop().replace(/\.\w+$/, '');
      if (!bg.includes(stem)) wrong.push(`${code}: ждали ${stem}`);
    } else if (bg !== 'none') {
      wrong.push(`${code}: снимка быть не должно`);
    }
  }
  check(`${id}: каждый снимок на своей плитке`, wrong.length === 0, wrong.join('; '));

  // И ни одного снимка из чужого вопроса.
  const others = BRANCH.filter((x) => x !== id)
    .flatMap((x) => Object.values(DATA.photos[x]))
    .map((u) => u.split('/').pop().replace(/\.\w+$/, ''));
  const strangers = images.filter((u) => others.some((s) => u.includes(s)));
  check(`${id}: чужих снимков не грузит`, strangers.length === 0,
    strangers.slice(0, 2).join(' '));

  check(`${id}: ничего не тянет с webflow`,
    images.every((u) => !u.includes('website-files.com')),
    images.filter((u) => u.includes('website-files.com')).slice(0, 2).join(' '));

  const heavy = images.filter((u) => u.includes('res.cloudinary.com')
    && !u.includes('/upload/c_'));
  check(`${id}: все снимки через трансформацию`, heavy.length === 0,
    heavy.slice(0, 2).join(' '));

  check(`${id}: ошибок в консоли нет`, errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ─── 2. числа прода на экране ─────────────────────────────────────────── */

console.log('\nПлитка и вопрос в размерах прода');
{
  const { context, page } = await open('Q_CALM');
  const box = await page.locator('button[data-answer]').first().boundingBox();
  check('плитка занимает половину ширины экрана',
    Math.abs(box.width - 1400 * (DATA.prodStyles.tileWidthPct / 100)) <= 2,
    `${Math.round(box.width)}px при 700`);
  check('высота = 20 + 30 + 20',
    Math.abs(box.height - 70) <= 2, `${Math.round(box.height)}px`);
  check('и стоит по центру', Math.abs(box.x - (1400 - box.width) / 2) <= 2,
    `x=${Math.round(box.x)}`);

  const h1 = await page.locator('h1').first().evaluate((el) => ({
    size: getComputedStyle(el).fontSize,
    color: getComputedStyle(el).color,
    align: getComputedStyle(el).textAlign,
  }));
  check(`вопрос ${DATA.prodStyles.questionFontPx}px`,
    h1.size === `${DATA.prodStyles.questionFontPx}px`, h1.size);
  check('белый и по центру',
    h1.color === 'rgb(255, 255, 255)' && h1.align === 'center', JSON.stringify(h1));

  const gap = await page.locator('[data-emotion-tiles] ul').evaluate((el) =>
    getComputedStyle(el).rowGap);
  check(`разрыв сетки ${DATA.prodStyles.gapPx}px`,
    gap === `${DATA.prodStyles.gapPx}px`, gap);
  await context.close();
}

/* ─── 3. наведение ─────────────────────────────────────────────────────── */

console.log('\nНаведение растит одну и приглушает остальные');
{
  const { context, page } = await open('Q_COZY');
  const tiles = page.locator('button[data-answer]');
  await tiles.nth(2).hover();
  await page.waitForTimeout(DATA.transitionMs + 150);

  const state = await page.$$eval('button[data-answer]', (els) => els.map((e) => ({
    o: Number(getComputedStyle(e).opacity),
    t: getComputedStyle(e).transform,
    z: getComputedStyle(e).zIndex,
  })));
  check(`наведённая яркая и крупнее (${DATA.scale})`,
    state[2].o > 0.95 && state[2].t.includes(`matrix(${DATA.scale}`), JSON.stringify(state[2]));
  check(`остальные приглушены до ${DATA.dim}`,
    state.filter((_, i) => i !== 2).every((s) => Math.abs(s.o - DATA.dim) < 0.02),
    state.map((s) => s.o).join(' '));
  check('наведённая выходит вперёд остальных',
    Number(state[2].z) > Number(state[0].z), `${state[2].z} против ${state[0].z}`);

  // Ушли мышью — всё вернулось.
  await page.locator('h1').first().hover();
  await page.waitForTimeout(DATA.transitionMs + 150);
  const after = await page.$$eval('button[data-answer]',
    (els) => els.map((e) => Number(getComputedStyle(e).opacity)));
  check('после ухода мыши всё снова яркое', after.every((o) => o > 0.95), after.join(' '));
  await context.close();
}

/* ─── 4. клавиатура ───────────────────────────────────────────────────── */

console.log('\nКлавиатура: в проде эти плитки нельзя было выбрать вовсе');
{
  const { context, page } = await open('Q_ENERGY');
  const first = page.locator('button[data-answer]').first();
  await first.focus();
  check('на плитку можно встать фокусом',
    await first.evaluate((el) => el === document.activeElement));
  await page.waitForTimeout(DATA.transitionMs + 150);
  const o = await page.$$eval('button[data-answer]',
    (els) => els.map((e) => Number(getComputedStyle(e).opacity)));
  check('фокус приглушает остальные, как наведение',
    o[0] > 0.95 && o.slice(1).every((x) => Math.abs(x - DATA.dim) < 0.02), o.join(' '));

  const code = QUIZ.Q_ENERGY.answers[1].code;
  await page.locator(`button[data-answer="${code}"]`).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith('/q-energy'), { timeout: 8000 });
  check(`Enter выбрал ${code}`, (await saved(page, 'Q_ENERGY')) === code,
    String(await saved(page, 'Q_ENERGY')));
  await context.close();
}

/* ─── 5. выбор уходит тем же кодом ─────────────────────────────────────── */

console.log('\nВыбранная плитка уходит в ответ тем же кодом');
{
  for (const id of ['Q_MYST', 'Q_SEXY']) {
    for (const a of QUIZ[id].answers.filter((x) => !x.open)) {
      const { context, page } = await open(id);
      await page.locator(`button[data-answer="${a.code}"]`).click();
      await page.waitForURL((u) => !u.pathname.endsWith(`/${slug(id)}`), { timeout: 8000 });
      check(`${a.code}`, (await saved(page, id)) === a.code,
        `в базу ушло ${await saved(page, id)}`);
      await context.close();
    }
  }
}

/* ─── 6. «Other» открывает окошко, а не выбирается молча ───────────────── */

console.log('\n«Other» открывает окошко со своим вопросом');
{
  const { context, page } = await open('Q_FOCUS');
  const other = QUIZ.Q_FOCUS.answers.find((a) => a.open).code;
  const tile = page.locator(`button[data-answer="${other}"]`);
  check('у «Other» снимка нет',
    (await tile.evaluate((el) => getComputedStyle(el).backgroundImage)) === 'none');
  await tile.click();
  await page.locator('[data-open-answer] [role="dialog"]').waitFor({ timeout: 5000 });
  check('окошко открылось поверх плиток',
    (await page.locator('[data-open-answer] p').first().textContent())?.trim()
      === PROMPTS.prompts.Q_FOCUS);
  check('и ответ пока не сохранён', (await saved(page, 'Q_FOCUS')) === undefined);

  await page.locator('#open-answer-input').fill('rain on the window');
  await page.locator('#open-answer-submit').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-focus'), { timeout: 8000 });
  check('после текста ответ «Other» сохранён',
    (await saved(page, 'Q_FOCUS')) === other, String(await saved(page, 'Q_FOCUS')));
  const text = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_open_by_question') || '{}').Q_FOCUS);
  check('и текст лёг под свой вопрос', text === 'rain on the window', String(text));
  await context.close();
}

/* ─── 7. телефон: два касания ─────────────────────────────────────────── */

console.log('\nНа телефоне: первое касание показывает, второе выбирает');
{
  const { context, page } = await open('Q_PLAY', {
    viewport: { width: 390, height: 844 }, touch: true,
  });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);

  const box = await page.locator('button[data-answer]').first().boundingBox();
  check('плитка на всю ширину', box.width > 340, `${Math.round(box.width)}px`);
  check(`и не ниже ${DATA.prodStyles.mobileMinHeightPx}px`,
    box.height >= DATA.prodStyles.mobileMinHeightPx, `${Math.round(box.height)}px`);

  const code = QUIZ.Q_PLAY.answers[0].code;
  await page.locator(`button[data-answer="${code}"]`).tap();
  await page.waitForTimeout(350);
  check('первое касание НЕ выбрало', (await saved(page, 'Q_PLAY')) === undefined,
    String(await saved(page, 'Q_PLAY')));
  check('и про второе касание сказано словами',
    await page.getByText('Tap again to choose').isVisible());

  await page.locator(`button[data-answer="${code}"]`).tap();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-play'), { timeout: 8000 });
  check('второе касание выбрало', (await saved(page, 'Q_PLAY')) === code,
    String(await saved(page, 'Q_PLAY')));
  await context.close();
}

/* ─── 8. кнопка «назад» и приведённое движение ────────────────────────── */

console.log('\nКнопка «назад» нажимается, а reduced-motion уважается');
{
  const { context, page } = await open('Q_CALM');
  const top = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => (x.textContent || '').includes('Back'));
    if (!b) return 'кнопки нет';
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el === b || b.contains(el) ? 'сверху' : (el?.className || 'что-то другое');
  });
  check('«назад» не под механикой', top === 'сверху', String(top));
  await context.close();

  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 900 },
    reducedMotion: 'reduce' });
  await seedEmotion(ctx2, 'Q_CALM');
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/en/quiz/q-calm`, { waitUntil: 'networkidle' });
  await p2.locator('[data-emotion-tiles]').waitFor({ timeout: 10000 });
  await p2.locator('button[data-answer]').nth(1).hover();
  await p2.waitForTimeout(400);
  const o = await p2.$$eval('button[data-answer]',
    (els) => els.map((e) => [Number(getComputedStyle(e).opacity),
      getComputedStyle(e).transform]));
  check('плитка не растёт', o[1][1] === 'none', o[1][1]);
  check('и остальные не гаснут', o.every((x) => x[0] > 0.95), o.map((x) => x[0]).join(' '));

  const code = QUIZ.Q_CALM.answers[3].code;
  await p2.locator(`button[data-answer="${code}"]`).click();
  await p2.waitForURL((u) => !u.pathname.endsWith('/q-calm'), { timeout: 8000 });
  check('выбор работает и без анимации', (await saved(p2, 'Q_CALM')) === code,
    String(await saved(p2, 'Q_CALM')));
  await ctx2.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nВетка эмоции работает.\n');
process.exit(failed ? 1 : 0);
