// Проверяет воронку целиком: пройденный квиз должен приводить к флакону,
// подобранному под ответы, а не к запасному варианту по флагу isMain.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { walkQuiz } from './lib/walk-quiz.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const catalog = JSON.parse(readFileSync('src/data/perfumes.json', 'utf8'))
  .filter((p) => !p.isDraft && !p.isArchived);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();

// ── 1. Пустое состояние, когда квиз не пройден ──
await page.goto(`${BASE}/en/result`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1', { timeout: 5000 });
console.log('без ответов /en/result →', JSON.stringify((await page.locator('h1').textContent())?.trim()));
console.log('  тело страницы уцелело (есть ссылка на квиз):', await page.locator('a[href*="/quiz/"]').count() > 0);

// ── 2. Полный проход ──
/* Проход живёт в e2e/lib/walk-quiz.mjs: скопированный сюда, он знал
   только про `ul li button` и падал на первом экране с механикой. */
await walkQuiz(page, { base: BASE, openText: 'wet stone after rain' });

const archetype = page.url().split('/').pop();
await page.waitForTimeout(300); // клиентское уточнение подбора
// Ищем именно название флакона, а не «первый h2 на странице»: заголовков
// на странице теперь несколько (зона Scent DNA тоже озаглавлена).
const shown = (await page.locator('[class*="matchName"]').first().textContent())?.trim();
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
