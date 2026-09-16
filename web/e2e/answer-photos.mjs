// Фотографии под варианты ответа (Q_YOURSELF) в настоящем браузере.
//
// ВАЖНО ПРО ЭТУ ПРОВЕРКУ. Из песочницы res.cloudinary.com закрыт
// (ERR_TUNNEL_CONNECTION_FAILED), поэтому сами пиксели снимка здесь
// увидеть нельзя. Проверяется то, что от этого не зависит и что как раз
// и ломается молча: какой адрес браузер запрашивает, ужат ли он
// трансформацией, тот ли снимок привязан к варианту, и вся механика
// наведения, фокуса и двух касаний.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:photos
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const DATA = JSON.parse(await readFile('src/data/answer-photos.json', 'utf8'));
const MAP = DATA.Q_YOURSELF;
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));
const ANSWERS = QUIZ.Q_YOURSELF.answers;

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Ссылка на снимок в том слое, который сейчас виден. */
const visiblePhoto = (page) => page.evaluate(() => {
  const root = document.querySelector('[data-answer-backdrop]');
  if (!root) return { root: false };
  const layers = [...root.querySelectorAll('[data-layer]')].map((l) => ({
    opacity: Number(getComputedStyle(l).opacity),
    image: getComputedStyle(l).backgroundImage,
  }));
  const veil = root.querySelector('div:last-child');
  const on = layers.find((l) => l.opacity > 0.5);
  return {
    root: true,
    veil: Number(getComputedStyle(veil).opacity),
    url: on ? (on.image.match(/url\("([^"]+)"\)/)?.[1] ?? null) : null,
    layers: layers.length,
  };
});

const label = (code) => ANSWERS.find((a) => a.code === code).label;
const opacities = (page) => page.$$eval('ul li button', (els) =>
  els.map((e) => Number(getComputedStyle(e).opacity)));

async function open({ mobile = false } = {}) {
  const context = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const asked = [];
  page.on('request', (r) => {
    if (r.url().includes('res.cloudinary.com')) asked.push(r.url());
  });
  await page.goto(`${BASE}/en/quiz/q-yourself`, { waitUntil: 'networkidle' });
  await page.locator('ul li button').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(500);
  return { context, page, asked };
}

console.log('\nЭкран на месте');
{
  const { context, page } = await open();
  check('все шесть вариантов показаны',
    (await page.locator('ul li button').count()) === ANSWERS.length,
    String(await page.locator('ul li button').count()));

  const before = await visiblePhoto(page);
  check('слой фона есть', before.root && before.layers === 2, JSON.stringify(before));
  check('до наведения фотографии нет', before.url === null, String(before.url));
  check('и вуали нет — обычный экран вопроса', before.veil === 0, String(before.veil));
  check('все варианты одинаково яркие',
    (await opacities(page)).every((o) => o === 1), (await opacities(page)).join(', '));
  await context.close();
}

console.log('\nНаведение показывает снимок ИМЕННО этого места');
{
  const { context, page } = await open();
  for (const [code, source] of Object.entries(MAP)) {
    await page.getByRole('button', { name: label(code), exact: true }).hover();
    await page.waitForTimeout(900);
    const now = await visiblePhoto(page);
    const file = source.split('/').pop();
    check(`${label(code).slice(0, 28)}… → ${file}`,
      !!now.url && now.url.endsWith(file), String(now.url));
    // Главное про вес: адрес обязан быть с трансформацией.
    check(`${file}: адрес ужат трансформацией`,
      !!now.url && now.url.includes('/c_fill,g_auto,h_900,w_1600/f_auto/q_auto/'),
      String(now.url));
    check(`${file}: вуаль под текстом включена`, now.veil > 0.9, String(now.veil));
  }
  await context.close();
}

console.log('\nОстальные варианты приглушаются, как в проде');
{
  const { context, page } = await open();
  await page.getByRole('button', { name: label('Q_YOURSELF__NATURE'), exact: true }).hover();
  await page.waitForTimeout(600);
  const o = await opacities(page);
  check('тот, на который смотрят, остался ярким', o[0] === 1, o.join(', '));
  check('остальные приглушены до 0.4',
    o.slice(1).every((x) => Math.abs(x - 0.4) < 0.01), o.join(', '));

  // Приглушённая кнопка обязана остаться нажимаемой: приглушение —
  // это про вид, а не про доступность.
  check('приглушённые всё равно нажимаются',
    await page.getByRole('button', { name: label('Q_YOURSELF__INDOOR'), exact: true }).isEnabled());
  await context.close();
}

console.log('\nВариант без снимка гасит фон, а не показывает чужой');
{
  const { context, page } = await open();
  await page.getByRole('button', { name: label('Q_YOURSELF__NATURE'), exact: true }).hover();
  await page.waitForTimeout(800);
  check('сначала снимок есть', (await visiblePhoto(page)).url !== null);

  await page.getByRole('button', { name: label('Q_YOURSELF__MIXED'), exact: true }).hover();
  await page.waitForTimeout(1100);
  const now = await visiblePhoto(page);
  check('на «It changes» вуаль погасла', now.veil < 0.1, String(now.veil));
  await context.close();
}

console.log('\nКлавиатура: фокус тоже показывает снимок — в проде не показывал');
{
  const { context, page } = await open();
  await page.getByRole('button', { name: label('Q_YOURSELF__NEARWATER'), exact: true }).focus();
  await page.waitForTimeout(900);
  const now = await visiblePhoto(page);
  check('по фокусу виден снимок воды',
    !!now.url && now.url.endsWith(MAP.Q_YOURSELF__NEARWATER.split('/').pop()),
    String(now.url));

  // И Enter выбирает без всяких двух нажатий: наведение здесь есть.
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => !u.pathname.endsWith('/q-yourself'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_YOURSELF);
  check('Enter выбрал этот же вариант', saved === 'Q_YOURSELF__NEARWATER', String(saved));
  await context.close();
}

console.log('\nМышью выбор с первого клика');
{
  for (const code of ['Q_YOURSELF__CITYURBAN', 'Q_YOURSELF__MIXED']) {
    const { context, page } = await open();
    await page.getByRole('button', { name: label(code), exact: true }).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/q-yourself'), { timeout: 6000 });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_YOURSELF);
    check(`клик по «${label(code).slice(0, 24)}…» → ${code}`, saved === code, String(saved));
    await context.close();
  }
}

console.log('\nНа телефоне: первое касание показывает, второе выбирает');
{
  const { context, page } = await open({ mobile: true });
  check('устройство без наведения',
    await page.evaluate(() => matchMedia('(hover: none)').matches));

  const btn = page.getByRole('button', { name: label('Q_YOURSELF__NATURE'), exact: true });
  await btn.tap();
  await page.waitForTimeout(800);
  check('после первого касания остались на вопросе',
    page.url().endsWith('/q-yourself'), page.url());
  check('снимок показан', (await visiblePhoto(page)).url !== null);
  check('подписано, что надо нажать ещё раз',
    (await page.getByText('Tap again to choose').count()) === 1);
  check('ответ ещё НЕ сохранён',
    (await page.evaluate(() =>
      JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_YOURSELF)) === undefined);

  await btn.tap();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-yourself'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_YOURSELF);
  check('второе касание выбрало', saved === 'Q_YOURSELF__NATURE', String(saved));
  await context.close();
}

console.log('\nНа телефоне касание другого варианта не выбирает прежний');
{
  const { context, page } = await open({ mobile: true });
  await page.getByRole('button', { name: label('Q_YOURSELF__NATURE'), exact: true }).tap();
  await page.waitForTimeout(600);
  const other = page.getByRole('button', { name: label('Q_YOURSELF__INDOOR'), exact: true });
  await other.tap();
  await page.waitForTimeout(700);
  check('перешли на другой снимок, а не выбрали первый',
    page.url().endsWith('/q-yourself'), page.url());
  const now = await visiblePhoto(page);
  check('показан снимок второго варианта',
    !!now.url && now.url.endsWith(MAP.Q_YOURSELF__INDOOR.split('/').pop()), String(now.url));

  await other.tap();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-yourself'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_YOURSELF);
  check('выбрался второй, а не первый', saved === 'Q_YOURSELF__INDOOR', String(saved));
  await context.close();
}

console.log('\nНа телефоне «It changes» — с первого касания: показывать нечего');
{
  const { context, page } = await open({ mobile: true });
  await page.getByRole('button', { name: label('Q_YOURSELF__MIXED'), exact: true }).tap();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-yourself'), { timeout: 6000 });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('quiz_answers') || '{}').Q_YOURSELF);
  check('одно касание и ответ сохранён', saved === 'Q_YOURSELF__MIXED', String(saved));
  await context.close();
}

console.log('\nВес: ни одного исходного PNG не запрашивается');
{
  const { context, page, asked } = await open();
  await page.getByRole('button', { name: label('Q_YOURSELF__NATURE'), exact: true }).hover();
  // Ждём дольше: остальные снимки греются, когда браузер освободится.
  await page.waitForTimeout(4000);

  check('снимки вообще запрашиваются', asked.length > 0, String(asked.length));
  const raw = asked.filter((u) => !u.includes('/c_fill,'));
  check('исходников среди запросов нет', raw.length === 0,
    raw.join('\n        ') || '—');
  // Прод грел все пять при открытии вопроса; здесь они тоже прогреваются,
  // но ужатыми — и только когда браузер свободен.
  const files = new Set(asked.map((u) => u.split('/').pop()));
  check('прогрелись все пять, и все ужатые', files.size === 5,
    [...files].join(', '));
  await context.close();
}

/* ─── Ещё три экрана на том же приёме ─────────────────────────────────── */

console.log('\nQ_ATMOS, Q_CELEBRATE и Q_CALM_NOW — тот же приём, свои снимки');
for (const id of ['Q_ATMOS', 'Q_CELEBRATE', 'Q_CALM_NOW']) {
  const slug = id.toLowerCase().replace(/_/g, '-');
  const map = DATA[id];
  const answers = QUIZ[id].answers;

  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const asked = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('res.cloudinary.com')) asked.push(r.url());
  });
  await page.goto(`${BASE}/en/quiz/${slug}`, { waitUntil: 'networkidle' });
  await page.locator('ul li button').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);

  check(`${id}: все ${answers.length} вариантов показаны`,
    (await page.locator('ul li button').count()) === answers.length,
    String(await page.locator('ul li button').count()));

  /* По одному снимку на вопрос достаточно: приём один и тот же, а
     полную привязку всех 25 пар сверяет check:photos по прод-коду. */
  const [code, source] = Object.entries(map)[0];
  const name = answers.find((a) => a.code === code).label;
  await page.locator(`#answer-${code}`).hover();
  await page.waitForTimeout(900);
  const now = await visiblePhoto(page);
  const file = source.split('/').pop();
  check(`${id}: «${name.slice(0, 26)}…» → ${file}`,
    !!now.url && now.url.endsWith(file), String(now.url));
  check(`${id}: адрес ужат трансформацией`,
    !!now.url && now.url.includes('/c_fill,g_auto,h_900,w_1600/f_auto/q_auto/'),
    String(now.url));
  check(`${id}: вуаль под текстом включена`, now.veil > 0.9, String(now.veil));

  const o = await opacities(page);
  const at = answers.findIndex((a) => a.code === code);
  check(`${id}: остальные приглушены до 0.4`,
    o[at] === 1 && o.filter((_, i) => i !== at).every((x) => Math.abs(x - 0.4) < 0.01),
    o.join(', '));

  // Вариант без снимка гасит фон, а не оставляет чужой кадр.
  const blank = answers.find((a) => !(a.code in map));
  await page.locator(`#answer-${blank.code}`).hover();
  await page.waitForTimeout(1100);
  check(`${id}: на «${blank.label.slice(0, 22)}…» фон погас`,
    (await visiblePhoto(page)).veil < 0.1);

  // Вес. Прод грел все снимки страницы сразу в исходном размере:
  // 30.7 МБ на q-calm-now. Здесь — только ужатые.
  await page.waitForTimeout(3500);
  const raw = asked.filter((u) => !u.includes('/c_fill,'));
  check(`${id}: исходников не запрашивает`, raw.length === 0, raw.slice(0, 2).join(' '));
  check(`${id}: прогрелись все ${Object.keys(map).length}`,
    new Set(asked.map((u) => u.split('/').pop())).size === Object.keys(map).length,
    String(new Set(asked.map((u) => u.split('/').pop())).size));
  check(`${id}: ошибок в консоли нет`, errors.length === 0, errors.join(' | '));
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nФотографии под варианты работают.\n');
process.exit(failed ? 1 : 0);
