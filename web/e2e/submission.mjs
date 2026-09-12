// Проверяет отправку прохождения из браузера — тот единственный стык,
// который не покрывает scripts/check-submissions.mts: что RecordSubmission
// действительно срабатывает, ровно один раз и с правильным телом.
//
// База здесь не нужна: запросы перехватываются и отвечаются заглушкой,
// проверяется поведение клиента, а не запись. Запись проверяет
//   cd web && npm run check:submissions
//
// Запуск: собрать приложение, поднять сервер, затем
//   CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node e2e/submission.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

let failures = 0;
function check(label, condition, detail = '') {
  console.log(`  ${condition ? '✓' : '✗'} ${label}${detail ? `  — ${detail}` : ''}`);
  if (!condition) failures += 1;
}

/** Новый контекст = чистое хранилище. Возвращает страницу и список отправок. */
async function fresh() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const sent = [];
  // Перехватываем до навигации, чтобы не пропустить запрос.
  await page.route('**/api/submissions', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stored: true }),
    });
  });
  return { context, page, sent };
}

/** Проходит квиз до страницы результата. */
async function runQuiz(page, { agree = true } = {}) {
  await page.goto(`${BASE}/en/quiz/q-gender`, { waitUntil: 'networkidle' });
  for (let i = 0; i < 30; i++) {
    const url = page.url();
    if (url.includes('/result/')) break;
    if (await page.locator('#country-search').count()) {
      await page.locator('#country-search').fill('Fra');
      await page.locator('[role="option"] button').first().click();
    } else if (await page.locator('textarea').count()) {
      await page.locator('textarea').fill('smells like my grandmother kitchen');
      const label = agree ? 'Agree & continue' : 'Disagree & continue';
      await page.getByRole('button', { name: label, exact: true }).click();
    } else {
      const options = page.locator('ul li button');
      await options.nth(i % (await options.count())).click();
    }
    await page.waitForFunction((prev) => location.href !== prev, url, { timeout: 5000 });
  }
  await page.waitForTimeout(600); // даём отправке уйти
}

/* --------------- 1. прохождение с согласием отправляется --------------- */

console.log('\nПрохождение с согласием');
{
  const { context, page, sent } = await fresh();
  await runQuiz(page, { agree: true });

  check('отправлено ровно один раз', sent.length === 1, `запросов: ${sent.length}`);
  const body = sent[0] ?? {};
  check('согласие передано как true', body.consentResearch === true);
  check('локаль передана', body.locale === 'en');
  check('ответы переданы', Object.keys(body.answers ?? {}).length === 17,
    `ключей: ${Object.keys(body.answers ?? {}).length}`);
  check('открытый текст передан',
    body.openAnswer === 'smells like my grandmother kitchen');
  check('токен передан', typeof body.clientToken === 'string' && body.clientToken.length > 0);
  check('квиз действительно завершён (есть Q_RADIUS)', 'Q_RADIUS' in (body.answers ?? {}));
  // Победитель и баллы клиент не присылает вовсе — сервер считает их сам.
  check('winner клиентом не присылается', body.winner === undefined);
  check('scores клиентом не присылаются', body.scores === undefined);

  // Перезагрузка страницы результата не должна отправить второй раз.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('перезагрузка не отправила повторно', sent.length === 1, `запросов: ${sent.length}`);

  await context.close();
}

/* ------------------ 2. отказ тоже отправляется, но с false ------------------ */

console.log('\nПрохождение с отказом от исследования');
{
  const { context, page, sent } = await fresh();
  await runQuiz(page, { agree: false });

  // Отправить нужно: решение «не писать» принимает сервер, а не браузер —
  // иначе клиент мог бы решать это за него.
  check('отправлено один раз', sent.length === 1, `запросов: ${sent.length}`);
  check('согласие передано как false', sent[0]?.consentResearch === false);
  check('открытый текст всё равно передан',
    sent[0]?.openAnswer === 'smells like my grandmother kitchen');

  await context.close();
}

/* --------------- 3. переход по ссылке на чужой результат --------------- */

console.log('\nЗаход на результат по ссылке, без прохождения');
{
  const { context, page, sent } = await fresh();
  await page.goto(`${BASE}/en/result/ceo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  check('ничего не отправлено', sent.length === 0, `запросов: ${sent.length}`);
  await context.close();
}

/* ------------------ 4. второе прохождение — новый токен ------------------ */

console.log('\nВторое прохождение в том же браузере');
{
  const { context, page, sent } = await fresh();
  await runQuiz(page, { agree: true });
  const firstToken = sent[0]?.clientToken;

  await runQuiz(page, { agree: true });
  check('отправлено второй раз', sent.length === 2, `запросов: ${sent.length}`);
  check('токен у второго прохождения другой',
    sent[1]?.clientToken !== undefined && sent[1].clientToken !== firstToken,
    `${firstToken} → ${sent[1]?.clientToken}`);

  await context.close();
}

await browser.close();

console.log(
  failures === 0 ? '\nВсе проверки пройдены.\n' : `\nПРОВАЛЕНО проверок: ${failures}\n`,
);
process.exit(failures === 0 ? 0 : 1);
