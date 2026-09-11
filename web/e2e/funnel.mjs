// Проверяет воронку целиком: пройденный квиз должен приводить к флакону,
// подобранному под ответы, а не к запасному варианту по флагу isMain.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync('src/data/perfumes.json', 'utf8'))
  .filter((p) => !p.isDraft && !p.isArchived);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();

// ── 1. Пустое состояние, когда квиз не пройден ──
await page.goto('http://localhost:3000/en/result', { waitUntil: 'networkidle' });
await page.waitForSelector('h1', { timeout: 5000 });
console.log('без ответов /en/result →', JSON.stringify((await page.locator('h1').textContent())?.trim()));
console.log('  тело страницы уцелело (есть ссылка на квиз):', await page.locator('a[href*="/quiz/"]').count() > 0);

// ── 2. Полный проход ──
await page.goto('http://localhost:3000/en/quiz/q-gender', { waitUntil: 'networkidle' });
for (let i = 0; i < 30; i++) {
  if (page.url().includes('/result/')) break;
  const url = page.url();
  if (await page.locator('#country-search').count()) {
    await page.locator('#country-search').fill('Japan');
    await page.locator('[role="option"] button').first().click();
  } else if (await page.locator('textarea').count()) {
    await page.locator('textarea').fill('wet stone after rain');
    await page.getByRole('button', { name: 'Agree & continue', exact: true }).click();
  } else {
    const o = page.locator('ul li button');
    await o.nth(i % (await o.count())).click();
  }
  await page.waitForFunction((p) => location.href !== p, url, { timeout: 5000 });
}

const archetype = page.url().split('/').pop();
await page.waitForTimeout(300); // клиентское уточнение подбора
const shown = (await page.locator('h2').first().textContent())?.trim();
const alts = await page.locator('[class*="altName"]').allTextContents();

// ── 3. Что должен был выдать движок ──
const answers = JSON.parse(await page.evaluate(() => localStorage.getItem('quiz_answers')));
const SW = { Q_SWEET__NO_SWEET: 0, Q_SWEET__LITTLE_SW: 1, Q_SWEET__MODER_SW: 2, Q_SWEET__ENJOY_SW: 3 };
const RW = { Q_WILD__NO_WILD: 0, Q_WILD__LITTLE_WILD: 1, Q_WILD__SOME_WILD: 2, Q_WILD__LOVE_WILD: 3 };
const PR = { Q_RADIUS__CLOSE: 0, Q_RADIUS__SOFT: 1, Q_RADIUS__NOTICEABLE: 2, Q_RADIUS__BOLD: 3 };
let s, r, p, skin;
for (const c of Object.values(answers)) {
  if (c in SW) s = SW[c]; if (c in RW) r = RW[c]; if (c in PR) p = PR[c];
  if (typeof c === 'string' && c.startsWith('Q_SKIN_BEHAVIOR__')) skin = c;
}
if (skin === 'Q_SKIN_BEHAVIOR__SWEETER') s = Math.max(0, s - 1);
if (skin === 'Q_SKIN_BEHAVIOR__SHARPER') s = Math.min(3, s + 1);

const pool = catalog.filter((x) => x.archetype === archetype.toUpperCase() && x.sweet !== null);
const d = (x) => Math.abs(x.sweet - s) + Math.abs(x.raw - r) + Math.abs(x.projection - p);
const minD = Math.min(...pool.map(d));
const tied = pool.filter((x) => d(x) === minD);
const fallbackMain = catalog.find((x) => x.archetype === archetype.toUpperCase() && x.isMain);

console.log(`\nархетип: ${archetype}   оси: s${s} r${r} p${p}`);
console.log('показан флакон:', shown);
console.log('на минимальном расстоянии:', tied.length, '—', tied.map((x) => x.name).join(', '));
console.log('запасной вариант (isMain):', fallbackMain?.name);
console.log('');
console.log('подобран, а не запасной:', tied.some((x) => x.name === shown) ? '✓' : '✗');
console.log('альтернатив показано:', alts.length);

await browser.close();
