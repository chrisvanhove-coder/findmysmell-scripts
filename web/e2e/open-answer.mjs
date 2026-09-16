// Окошко «Other» в настоящем браузере.
//
// ЧТО ЗДЕСЬ ГЛАВНОЕ. Ответ, написанный своими словами внутри вопроса,
// заказчица назвала самой ценной информацией во всём квизе. На живом
// сайте девять таких вопросов писали свой текст в `quiz_open` — то есть
// в то же место, что и финальный открытый вопрос, и одно затирало
// другое. Поэтому первая и главная проверка тут: текст одного вопроса не
// трогает ни текст другого вопроса, ни финальный ответ.
//
// Второе: у каждого из девяти вопросов СВОЙ текст в окошке. Три из
// девяти я сначала угадал неверно, и правильные взяты из прод-кода — так
// что здесь они сверяются с данными, а данные с прод-страницами
// сверяет npm run check:open.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:open
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { walkQuiz } from './lib/walk-quiz.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const PROMPTS = JSON.parse(await readFile('src/data/question-open-prompts.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Код варианта «Other» у вопроса. */
const openCode = (id) => QUIZ[id].answers.find((a) => a.open).code;

const SLUG = (id) => id.toLowerCase().replace(/_/g, '-');

async function open(questionId, { viewport = { width: 1200, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/en/quiz/${SLUG(questionId)}`, { waitUntil: 'networkidle' });
  await page.locator('ul li button').first().waitFor({ timeout: 8000 });
  return { context, page, errors };
}

const stored = (page) => page.evaluate(() => ({
  answers: JSON.parse(localStorage.getItem('quiz_answers') || '{}'),
  opens: JSON.parse(localStorage.getItem('quiz_open_by_question') || '{}'),
  finalOpen: localStorage.getItem('quiz_open'),
}));

/* ─── 1. у каждого вопроса свой текст в окошке ─────────────────────────── */

console.log('\nУ каждого вопроса свой вопрос в окошке');
{
  // Три самых показательных: именно их я угадал неверно. У celebrate
  // прошедшее время, у calm-now вопрос совсем другой, у focus нет слова
  // «пахнет» вовсе.
  for (const id of ['Q_CALM', 'Q_FOCUS', 'Q_CELEBRATE', 'Q_CALM_NOW']) {
    const { context, page, errors } = await open(id);
    await page.locator(`#answer-${openCode(id)}`).click();
    const panel = page.locator('[data-open-answer] [role="dialog"]');
    await panel.waitFor({ timeout: 5000 });
    const text = (await panel.locator('p').first().textContent())?.trim();
    check(`${id}: «${PROMPTS.prompts[id]}»`, text === PROMPTS.prompts[id], `показано «${text}»`);
    check(`${id}: ошибок в консоли нет`, errors.length === 0, errors.join(' | '));
    await context.close();
  }

  // И все девять текстов разные: если бы окошко брало один общий текст,
  // смысл варианта «Other» пропал бы.
  const all = Object.values(PROMPTS.prompts);
  check('все девять текстов различны',
    new Set(all).size === 9 && all.length === 9, `${new Set(all).size} из ${all.length}`);
}

/* ─── 2. главное: тексты не затирают друг друга ────────────────────────── */

console.log('\nТекст одного вопроса не затирает другой (та самая ошибка прода)');
{
  const { context, page } = await open('Q_CELEBRATE');
  // Кладём финальный открытый ответ заранее — именно его прод и терял.
  await page.evaluate(() => {
    localStorage.setItem('quiz_open', 'финальный ответ, его нельзя терять');
    sessionStorage.setItem('quiz_open', 'финальный ответ, его нельзя терять');
  });

  await page.locator(`#answer-${openCode('Q_CELEBRATE')}`).click();
  await page.locator('#open-answer-input').fill('mandarins and cold stairwell');
  await page.locator('#open-answer-submit').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-celebrate'), { timeout: 8000 });

  let s = await stored(page);
  check('текст лёг под свой вопрос',
    s.opens.Q_CELEBRATE === 'mandarins and cold stairwell', JSON.stringify(s.opens));
  check('ответ на вопрос — «Other»',
    s.answers.Q_CELEBRATE === openCode('Q_CELEBRATE'), String(s.answers.Q_CELEBRATE));
  check('финальный открытый ответ НЕ затёрт',
    s.finalOpen === 'финальный ответ, его нельзя терять', String(s.finalOpen));

  // Второй такой вопрос на этом же проходе — Q_CALM_NOW идёт следом.
  await page.goto(`${BASE}/en/quiz/q-calm-now`, { waitUntil: 'networkidle' });
  await page.locator(`#answer-${openCode('Q_CALM_NOW')}`).click();
  await page.locator('#open-answer-input').fill('wet pine needles');
  await page.locator('#open-answer-submit').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-calm-now'), { timeout: 8000 });

  s = await stored(page);
  check('второй текст лёг рядом, а не поверх',
    s.opens.Q_CELEBRATE === 'mandarins and cold stairwell'
    && s.opens.Q_CALM_NOW === 'wet pine needles', JSON.stringify(s.opens));
  check('финальный ответ всё ещё на месте',
    s.finalOpen === 'финальный ответ, его нельзя терять', String(s.finalOpen));
  await context.close();
}

/* ─── 3. пустой текст не сохраняется ──────────────────────────────────── */

console.log('\nПустое окошко ничего не сохраняет');
{
  const { context, page } = await open('Q_CALM');
  await page.locator(`#answer-${openCode('Q_CALM')}`).click();
  await page.locator('[data-open-answer] [role="dialog"]').waitFor({ timeout: 5000 });

  check('кнопка отправки выключена, пока не написано ни слова',
    await page.locator('#open-answer-submit').isDisabled());
  await page.locator('#open-answer-input').press('Enter');
  await page.waitForTimeout(300);
  check('Enter на пустом поле не уводит с вопроса',
    page.url().endsWith('/q-calm'), page.url());
  let s = await stored(page);
  check('ответ не сохранён', s.answers.Q_CALM === undefined, String(s.answers.Q_CALM));

  // Пробелы — это тоже пусто.
  await page.locator('#open-answer-input').fill('    ');
  check('из пробелов отправить нельзя',
    await page.locator('#open-answer-submit').isDisabled());

  // Escape закрывает — в проде выхода из окошка не было вовсе.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Escape закрывает окошко',
    (await page.locator('[data-open-answer]').count()) === 0);
  check('и человек остался на вопросе', page.url().endsWith('/q-calm'), page.url());
  s = await stored(page);
  check('после Escape ответ по-прежнему не сохранён', s.answers.Q_CALM === undefined);

  // И кнопкой выхода — для тех, у кого нет клавиатуры.
  await page.locator(`#answer-${openCode('Q_CALM')}`).click();
  await page.locator('[data-open-answer] [role="dialog"]').waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Pick from the list instead' }).click();
  await page.waitForTimeout(200);
  check('кнопка выхода тоже закрывает',
    (await page.locator('[data-open-answer]').count()) === 0);

  // И после этого можно спокойно выбрать обычный вариант.
  const plain = QUIZ.Q_CALM.answers[0].code;
  await page.locator(`#answer-${plain}`).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-calm'), { timeout: 8000 });
  s = await stored(page);
  check('обычный вариант выбирается как обычно', s.answers.Q_CALM === plain,
    String(s.answers.Q_CALM));
  await context.close();
}

/* ─── 4. вернулись назад ──────────────────────────────────────────────── */

console.log('\nЕсли человек вернулся на вопрос');
{
  const { context, page } = await open('Q_CALM');
  await page.locator(`#answer-${openCode('Q_CALM')}`).click();
  await page.locator('#open-answer-input').fill('cold linen');
  await page.locator('#open-answer-submit').click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-calm'), { timeout: 8000 });

  await page.goto(`${BASE}/en/quiz/q-calm`, { waitUntil: 'networkidle' });
  await page.locator(`#answer-${openCode('Q_CALM')}`).click();
  check('написанное раньше стоит в поле',
    (await page.locator('#open-answer-input').inputValue()) === 'cold linen');

  // Передумал и выбрал вариант из списка — прежние слова к этому вопросу
  // больше не относятся и остаться в базе не должны.
  await page.keyboard.press('Escape');
  const plain = QUIZ.Q_CALM.answers[1].code;
  await page.locator(`#answer-${plain}`).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/q-calm'), { timeout: 8000 });
  const s = await stored(page);
  check('обычный вариант стирает прежний текст',
    s.opens.Q_CALM === undefined, JSON.stringify(s.opens));
  check('и сам ответ обновился', s.answers.Q_CALM === plain, String(s.answers.Q_CALM));
  await context.close();
}

/* ─── 5. это настоящий диалог ─────────────────────────────────────────── */

console.log('\nОкошко — настоящий диалог, а не div поверх экрана');
{
  const { context, page } = await open('Q_SEXY');
  await page.locator(`#answer-${openCode('Q_SEXY')}`).click();
  const panel = page.locator('[data-open-answer] [role="dialog"]');
  await panel.waitFor({ timeout: 5000 });

  check('aria-modal объявлен', (await panel.getAttribute('aria-modal')) === 'true');
  const labelled = await panel.getAttribute('aria-labelledby');
  check('диалог подписан своим вопросом',
    !!labelled && (await page.locator(`#${labelled}`).textContent())
      ?.trim() === PROMPTS.prompts.Q_SEXY);
  check('фокус сразу в поле',
    await page.locator('#open-answer-input').evaluate((el) => el === document.activeElement));

  // Tab не должен уводить фокус из окна: под ним живой список вариантов.
  const inside = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    inside.push(await page.evaluate(() =>
      !!document.activeElement?.closest('[data-open-answer]')));
  }
  check('Tab не выпускает фокус из окошка', inside.every(Boolean),
    inside.map((x) => (x ? '·' : 'вышел')).join(' '));

  check('затемнение накрывает весь экран',
    await page.locator('[data-open-answer]').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
    }));

  // Нажатие по затемнению закрывает, по панели — нет.
  await panel.click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(150);
  check('нажатие по самой панели окошко не закрывает',
    (await page.locator('[data-open-answer]').count()) === 1);
  await page.locator('[data-open-answer]').click({ position: { x: 4, y: 4 } });
  await page.waitForTimeout(200);
  check('нажатие по затемнению закрывает',
    (await page.locator('[data-open-answer]').count()) === 0);
  await context.close();
}

/* ─── 6. на телефоне ──────────────────────────────────────────────────── */

console.log('\nНа телефоне');
{
  const { context, page } = await open('Q_MYST', { viewport: { width: 360, height: 780 } });
  await page.locator(`#answer-${openCode('Q_MYST')}`).click();
  await page.locator('[data-open-answer] [role="dialog"]').waitFor({ timeout: 5000 });
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('перелива по горизонтали нет', over === 0, `${over}px`);
  const box = await page.locator('[data-open-answer] [role="dialog"]').boundingBox();
  check('панель уместилась в экран', box.x >= 0 && box.x + box.width <= 360,
    `${Math.round(box.x)}…${Math.round(box.x + box.width)}`);
  check('поле не мельче 16px — иначе iOS зумит страницу',
    await page.locator('#open-answer-input').evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).fontSize) >= 16));
  await context.close();
}

/* ─── 7. тексты доезжают до отправки ──────────────────────────────────── */

console.log('\nПолный проход: тексты уходят в базу отдельными полями');
{
  const context = await browser.newContext();
  const page = await context.newPage();
  const sent = [];
  await page.route('**/api/submissions', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ stored: true }),
    });
  });

  // Последний вариант — это всегда «Other» там, где он есть: проверено
  // по данным квиза. Так проход соберёт максимум таких ответов.
  await walkQuiz(page, { base: BASE, openText: 'final words', pick: (n) => n - 1 });
  await page.waitForTimeout(900);

  check('прохождение отправлено', sent.length === 1, `запросов: ${sent.length}`);
  const body = sent[0] ?? {};
  const opens = body.questionOpens ?? {};
  const ids = Object.keys(opens);
  check('тексты «Other» ушли отдельным полем', ids.length >= 3,
    `${ids.length}: ${ids.join(', ')}`);
  check('каждый под своим вопросом',
    ids.every((id) => PROMPTS.prompts[id] !== undefined), ids.join(', '));
  check('и все они непустые', ids.every((id) => opens[id].trim().length > 0));
  check('финальный открытый ответ ушёл сам по себе',
    body.openAnswer === 'final words', String(body.openAnswer));
  check('в ответах у этих вопросов стоит код «Other»',
    ids.every((id) => body.answers?.[id] === openCode(id)),
    ids.map((id) => `${id}=${body.answers?.[id]}`).join(' '));
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nОкошко «Other» работает.\n');
process.exit(failed ? 1 : 0);
