// Французский квиз в настоящем браузере: на экране действительно французский.
//
// ЗАЧЕМ ИМЕННО В БРАУЗЕРЕ, если есть check:locale. Тот проверяет словарь:
// что для каждого кода строка написана. Здесь проверяется другое и более
// важное — что эта строка ДОХОДИТ ДО ЭКРАНА. Между словарём и экраном
// стоят десять механик, у каждой свой текст и свой источник, и забыть
// пробросить в одну из них локаль ничего не стоит: страница соберётся,
// тесты пройдут, а экран выйдет по-английски. Такой пропуск ловится
// только так — открыть и прочитать.
//
// Правило проверки одно на все экраны: там, где французская строка
// отличается от английской, на экране обязана быть французская И НЕ
// ДОЛЖНО быть английской. Где они совпадают («Fruits», «Café», «Gen Z»),
// проверять нечего, и такие строки пропускаются молча.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:locale
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ANY_ANSWER } from './lib/walk-quiz.mjs';
import { unlockResult, COMPLETE_RUNS } from './lib/unlock-result.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const FR = JSON.parse(await readFile('src/data/copy.fr.json', 'utf8'));
const QUIZ = JSON.parse(await readFile('src/data/quiz.en.json', 'utf8'));
const TITLES = await readFile('src/data/question-titles.ts', 'utf8');

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

/** Сравнение «как видит человек»: регистр и переносы значения не имеют. */
const flat = (s) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Есть ли на экране ИМЕННО это слово, а не кусок другого.
 *
 * Простое includes здесь врёт: французское «CALME» содержит английское
 * «calm», и проверка «английского не осталось» падала на переведённом
 * барабане. Поэтому края совпадения должны быть не буквами.
 */
const hasWord = (text, needle) => {
  const n = flat(needle);
  if (!n) return false;
  let from = 0;
  for (;;) {
    const i = text.indexOf(n, from);
    if (i === -1) return false;
    const before = text[i - 1] ?? ' ';
    const after = text[i + n.length] ?? ' ';
    const letter = /[\p{L}\p{N}]/u;
    if (!letter.test(before) && !letter.test(after)) return true;
    from = i + 1;
  }
};
const slug = (id) => id.toLowerCase().replace(/_/g, '-');

/** Английские заголовки — прямо из question-titles.ts, без сборки. */
const EN_TITLES = {};
for (const m of TITLES.matchAll(/(Q_[A-Z_]+):\s*\{\s*title:\s*(['"`])([\s\S]*?)\2/g)) {
  EN_TITLES[m[1]] = m[3];
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const STUB = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>';
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Cloudinary из песочницы закрыт: клипы и снимки к тексту отношения не имеют.
await context.route('**://res.cloudinary.com/**', (route) =>
  route.fulfill({ status: 200, contentType: 'image/svg+xml', body: STUB }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

/**
 * Открыть экран вопроса и дождаться, пока на нём можно ответить.
 *
 * Экраны ветки эмоции сами разворачивают на Q_EMO, если эмоция ещё не
 * выбрана, — поэтому перед ними кладём в браузер полное прохождение
 * нужной ветки. Без этого проверка читала бы барабан вместо ветки.
 */
async function openQuestion(id) {
  const branch = Object.keys(COMPLETE_RUNS).find((e) => `Q_${e}` === id);
  if (branch) await unlockResult(page, { Q_EMO: `Q_EMO__${branch}` });
  await page.goto(`${BASE}/fr/quiz/${slug(id)}`, { waitUntil: 'networkidle' });
  await page.waitForSelector(ANY_ANSWER, { timeout: 15000 });
  await page.waitForTimeout(400);
  return flat(await page.locator('body').innerText());
}

const IDS = Object.keys(QUIZ).filter((k) => !k.startsWith('_'));

console.log('\nЗаголовок каждого вопроса — по-французски');
for (const id of IDS) {
  const fr = FR[`q.${id}.title`];
  const en = EN_TITLES[id];
  /* У экрана с механикой заголовок свой, короче и заглавными; у барабана
     эмоций на экране вовсе не вопрос, а зачин «POUR CE PARFUM, / JE VEUX
     ME SENTIR...» — сам вопрос там только для читалки, и его проверяем
     отдельно, ниже. */
  const screen = FR[`screen.${id}.question`] ?? FR[`screen.${id}.prefix`];
  const text = await openQuestion(id);

  const wanted = screen ?? fr;
  check(`${id}: французский заголовок на экране`,
    text.includes(flat(wanted)), `ждали «${wanted}»`);
  if (en && flat(en) !== flat(wanted)) {
    check(`${id}: английского заголовка нет`, !text.includes(flat(en)), `нашли «${en}»`);
  }
}

console.log('\nСкрытый от глаза текст тоже переведён');
{
  await openQuestion('Q_EMO');
  const label = await page.locator('[role="listbox"]').getAttribute('aria-label');
  check('вопрос барабана для читалки — по-французски',
    flat(label) === flat(FR['q.Q_EMO.title']), `«${label}»`);
}

console.log('\nПодписи вариантов — по-французски');
for (const id of IDS) {
  const answers = (QUIZ[id].answers ?? []).filter((a) => !a.hidden);
  if (answers.length === 0) continue;
  const text = await openQuestion(id);
  const leftEnglish = answers.filter((a) => {
    const fr = FR[`short.${a.code}`] ?? FR[`a.${a.code}`];
    return fr && flat(fr) !== flat(a.label) && hasWord(text, a.label);
  });
  check(`${id}: английских подписей не осталось`,
    leftEnglish.length === 0, leftEnglish.map((a) => a.label).join(' | '));
}

console.log('\nОбвязка экрана');
{
  const text = await openQuestion('Q_ATMOS');
  check('кнопка «назад» по-французски',
    text.includes(flat(FR['ui.back'])) && !text.includes('← back'));
  check('счётчик вопросов по-французски', /question \d+ sur \d+/.test(text), text.slice(0, 120));
}

console.log('\nСтраница результата');
{
  // Результат закрыт пропуском: без пройденного квиза страницы нет вовсе.
  await unlockResult(page);
  await page.goto(`${BASE}/fr/result/ceo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const text = flat(await page.locator('body').innerText());
  const pairs = [
    ['dna.title', 'your scent dna'],
    ['result.alternatives', 'Also consider'],
    ['result.ingredientsLabel', 'Ingredients worth discovering'],
    ['subscribe.title', 'Want to keep this?'],
  ];
  for (const [key, en] of pairs) {
    check(`${key}: французский на месте`, text.includes(flat(FR[key])), `ждали «${FR[key]}»`);
    check(`${key}: английского нет`, !text.includes(flat(en)), `нашли «${en}»`);
  }
}

check('ошибок в консоли нет', errors.length === 0, errors.join('\n        '));

await context.close();
await browser.close();
console.log(failed
  ? `\n${failed} проверок упало\n`
  : '\nФранцузские страницы выходят по-французски.\n');
process.exit(failed ? 1 : 0);
