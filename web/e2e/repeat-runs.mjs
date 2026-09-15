// Проверяет ответ на вопрос заказчика: «а если один человек пройдёт тест
// десять раз, у меня же не будет выборки».
//
// Проходит квиз ДВАЖДЫ в одном и том же браузере, с разными ответами, и
// требует, чтобы база отличила первое прохождение от второго: один и тот же
// browser_key, run_index 1 и 2. Выборка для исследования — run_index = 1.
import { chromium } from 'playwright';
import { Client } from 'pg';

const DB = process.env.DATABASE_URL;
if (!DB) {
  console.error('нужен DATABASE_URL');
  process.exit(1);
}

const db = new Client({ connectionString: DB });
await db.connect();

// Чистим только то, что создаст этот тест, по метке в открытом ответе.
const MARK = `repeat-test-${Date.now()}`;
await db.query("delete from submissions where open_answer like 'repeat-test-%'");

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
// Один контекст на оба прохода — значит один localStorage, как у живого человека.
const context = await browser.newContext();
const page = await context.newPage();

/** Один полный проход. `pick` выбирает, какой вариант нажимать. */
async function run(pick) {
  await page.goto('http://localhost:3000/en/quiz/q-gender', { waitUntil: 'networkidle' });
  for (let i = 0; i < 30; i++) {
    if (page.url().includes('/result/')) break;
    if (await page.locator('#country-search').count()) {
      await page.locator('#country-search').fill('Japan');
      await page.locator('[role="option"] button').first().click();
    } else if (await page.locator('textarea').count()) {
      await page.locator('textarea').fill(MARK);
      await page.getByRole('button', { name: 'Agree & continue', exact: true }).click();
    } else {
      const options = page.locator('ul li button');
      const n = await options.count();
      if (!n) break;
      await options.nth(pick(n)).click();
    }
    await page.waitForTimeout(120);
  }
  await page.waitForURL(/\/result\//, { timeout: 10000 });
  // Прохождение уезжает из эффекта на странице результата.
  await page.waitForTimeout(1200);
  return page.url();
}

const first = await run(() => 0);          // всегда первый вариант
console.log('проход 1 →', first.split('/result/')[1]);

const second = await run((n) => n - 1);    // всегда последний вариант
console.log('проход 2 →', second.split('/result/')[1]);

// Ключ браузера должен был пережить второй проход в том же контексте.
const stored = await page.evaluate(() => ({
  key: localStorage.getItem('fms_browser'),
  runs: localStorage.getItem('fms_runs'),
}));

await browser.close();

const { rows } = await db.query(
  `select browser_key, run_index, winner
     from submissions
    where open_answer = $1
    order by run_index`,
  [MARK],
);

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

console.log('\nчто в базе\n');
for (const r of rows) {
  console.log(`  run_index ${r.run_index}  ${r.winner.padEnd(10)}  key ${String(r.browser_key).slice(0, 8)}…`);
}
console.log();

check('записано два прохождения', rows.length === 2, `записано ${rows.length}`);
check('ключ браузера один и тот же',
  rows.length === 2 && rows[0].browser_key && rows[0].browser_key === rows[1].browser_key);
check('номера прохождений 1 и 2',
  rows.map((r) => r.run_index).join(',') === '1,2', rows.map((r) => r.run_index).join(','));
check('разные ответы дали разные архетипы',
  rows.length === 2 && rows[0].winner !== rows[1].winner,
  rows.map((r) => r.winner).join(' / '));
check('счётчик в браузере равен 2', stored.runs === '2', String(stored.runs));
check('ключ в localStorage со временем создания',
  Boolean(stored.key && JSON.parse(stored.key).since));

// И главное: выборка для исследования — только первые прохождения.
const { rows: sample } = await db.query(
  "select count(*)::int as n from submissions where open_answer = $1 and run_index = 1",
  [MARK],
);
check('выборка run_index = 1 содержит одно прохождение из двух', sample[0].n === 1, `n=${sample[0].n}`);

await db.query("delete from submissions where open_answer like 'repeat-test-%'");
await db.end();

console.log(failed ? `\n${failed} проверок упало\n` : '\nПовторные прохождения различаются.\n');
process.exit(failed ? 1 : 0);
