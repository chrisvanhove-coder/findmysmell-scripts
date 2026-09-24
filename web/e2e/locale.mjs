// Переведённый квиз в настоящем браузере: на экране действительно перевод.
//
// ЗАЧЕМ ИМЕННО В БРАУЗЕРЕ, если есть check:locale. Тот проверяет словарь:
// что для каждого кода строка написана. Здесь проверяется другое и более
// важное — что эта строка ДОХОДИТ ДО ЭКРАНА. Между словарём и экраном
// стоят десять механик, у каждой свой текст и свой источник, и забыть
// пробросить в одну из них локаль ничего не стоит: страница соберётся,
// тесты пройдут, а экран выйдет по-английски. Такой пропуск ловится
// только так — открыть и прочитать.
//
// Правило проверки одно на все экраны и на оба языка: там, где
// переведённая строка отличается от английской, на экране обязана быть
// переведённая И НЕ ДОЛЖНО быть английской. Где они совпадают («Fruits»,
// «Café», «Gen Z»), проверять нечего, и такие строки пропускаются молча.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:locale
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ANY_ANSWER } from './lib/walk-quiz.mjs';
import { unlockResult, COMPLETE_RUNS } from './lib/unlock-result.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const LOCALES = (process.env.LOCALES ?? 'fr,ru').split(',').filter(Boolean);
/* Большую строку «YOUR SCENT» меряем и по-английски: её кегль задан
   в CSS под английскую длину, и ломается она как раз на переводах. */
const BAND_LOCALES = ['en', ...LOCALES];
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
async function openQuestion(locale, id) {
  const branch = Object.keys(COMPLETE_RUNS).find((e) => `Q_${e}` === id);
  if (branch) await unlockResult(page, { Q_EMO: `Q_EMO__${branch}` });
  await page.goto(`${BASE}/${locale}/quiz/${slug(id)}`, { waitUntil: 'networkidle' });
  await page.waitForSelector(ANY_ANSWER, { timeout: 15000 });
  await page.waitForTimeout(400);
  return flat(await page.locator('body').innerText());
}

const IDS = Object.keys(QUIZ).filter((k) => !k.startsWith('_'));

async function audit(locale) {
  const DICT = JSON.parse(await readFile(`src/data/copy.${locale}.json`, 'utf8'));
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  
  console.log('  Заголовок каждого вопроса — на своём языке');
  for (const id of IDS) {
    const translated = DICT[`q.${id}.title`];
    const en = EN_TITLES[id];
    /* У экрана с механикой заголовок свой, короче и заглавными; у барабана
       эмоций на экране вовсе не вопрос, а зачин («POUR CE PARFUM, / JE VEUX
       ME SENTIR...») — сам вопрос там только для читалки, и его проверяем
       отдельно, ниже. */
    const screen = DICT[`screen.${id}.question`] ?? DICT[`screen.${id}.prefix`];
    const text = await openQuestion(locale, id);

    const wanted = screen ?? translated;
    check(`${id}: переведённый заголовок на экране`,
      text.includes(flat(wanted)), `ждали «${wanted}»`);
    if (en && flat(en) !== flat(wanted)) {
      check(`${id}: английского заголовка нет`, !text.includes(flat(en)), `нашли «${en}»`);
    }
  }

  console.log('  Скрытый от глаза текст тоже переведён');
  {
    await openQuestion(locale, 'Q_EMO');
    const label = await page.locator('[role="listbox"]').getAttribute('aria-label');
    check('вопрос барабана для читалки — переведён',
      flat(label) === flat(DICT['q.Q_EMO.title']), `«${label}»`);
  }

  console.log('  Подписи вариантов — на своём языке');
  for (const id of IDS) {
    const answers = (QUIZ[id].answers ?? []).filter((a) => !a.hidden);
    if (answers.length === 0) continue;
    const text = await openQuestion(locale, id);
    const leftEnglish = answers.filter((a) => {
      const want = DICT[`short.${a.code}`] ?? DICT[`a.${a.code}`];
      return want && flat(want) !== flat(a.label) && hasWord(text, a.label);
    });
    check(`${id}: английских подписей не осталось`,
      leftEnglish.length === 0, leftEnglish.map((a) => a.label).join(' | '));
  }

  console.log('  Обвязка экрана');
  {
    const text = await openQuestion(locale, 'Q_ATMOS');
    check('кнопка «назад» переведена',
      text.includes(flat(DICT['ui.back'])) && !text.includes('← back'));
    /* Счётчик: «Question 6 sur 17», «Вопрос 6 из 17». Номер шага здесь не
       важен — важно, что вокруг него стоят переведённые слова. Поэтому из
       шаблона строится выражение, а числа в нём любые. */
    const pattern = new RegExp(
      flat(DICT['ui.counter'])
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\{n\\\}|\\\{total\\\}/g, '\\d+'),
    );
    check('счётчик вопросов переведён', pattern.test(text), `ждали ${pattern}`);
  }

  console.log('  Страница результата');
  {
    // Результат закрыт пропуском: без пройденного квиза страницы нет вовсе.
    await unlockResult(page);
    await page.goto(`${BASE}/${locale}/result/ceo`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const text = flat(await page.locator('body').innerText());

    /* Описание флакона. Оно приходит не из словаря, а из отдельного
       файла по id позиции, и подставляется уже на экране — если локаль
       туда не дошла, страница соберётся и покажет английский. */
    const desc = JSON.parse(
      await readFile(`src/data/perfume-descriptions.${locale}.json`, 'utf8'),
    );
    const shown = Object.entries(desc)
      .filter(([k]) => !k.startsWith('_'))
      .filter(([, v]) => text.includes(flat(v)));
    check('описание флакона переведено', shown.length > 0,
      'на экране нет ни одного переведённого описания из каталога');
    const pairs = [
      ['dna.title', 'your scent dna'],
      ['result.alternatives', 'Also consider'],
      ['result.ingredientsLabel', 'Ingredients worth discovering'],
      ['subscribe.title', 'Want to keep this?'],
    ];
    for (const [key, en] of pairs) {
      check(`${key}: перевод на месте`, text.includes(flat(DICT[key])), `ждали «${DICT[key]}»`);
      check(`${key}: английского нет`, !text.includes(flat(en)), `нашли «${en}»`);
    }
  }
}

/**
 * Заголовок «YOUR SCENT» во всю ширину экрана: он не переносится, и всё,
 * что не влезло, просто обрезается краем окна. По-французски там «VOTRE
 * PARFUM», по-русски «ТВОЙ АРОМАТ» — обе длиннее английской, и обе
 * уезжали за край, пока кегль был записан одним числом.
 *
 * Меряем на тех же ширинах, на которых подбирался прод.
 */
async function auditBand() {
  console.log('\n=== БОЛЬШАЯ СТРОКА НАД ФЛАКОНОМ ===');
  for (const width of [390, 430, 768, 1280, 1600]) {
    for (const locale of BAND_LOCALES) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      await ctx.route('**://res.cloudinary.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/svg+xml', body: STUB }));
      const p = await ctx.newPage();
      await unlockResult(p);
      await p.goto(`${BASE}/${locale}/result/ceo`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(400);
      const m = await p.locator('[class*="band"]').first().evaluate((n) => {
        const range = document.createRange();
        range.selectNodeContents(n);
        return {
          text: n.textContent,
          ink: range.getBoundingClientRect().width,
          room: n.getBoundingClientRect().width,
        };
      });
      const slack = Math.round(m.room - m.ink);
      check(`${String(width).padStart(4)} ${locale}: «${m.text}» не выходит за края`,
        slack >= 0, `вылезает на ${-slack}px`);
      await ctx.close();
    }
  }
}

/* Переключатель языка: язык, который заказчица открыла людям, должен
   в нём быть. Страницы `/ru` работали и раньше — на них просто не вела
   ссылка, и заметить это можно было только глазами. */
async function auditSwitch() {
  console.log('\n=== ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА ===');
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.locator('[aria-haspopup="menu"]').click();
  const items = await page.locator('[role="menuitem"]').allTextContents();
  for (const [locale, name] of [['en', 'English'], ['fr', 'Français'], ['ru', 'Русский']]) {
    check(`${locale} есть в списке (${name})`, items.some((t) => t.trim() === name),
      `в списке: ${items.map((t) => t.trim()).join(', ')}`);
  }
}

for (const locale of LOCALES) await audit(locale);
await auditSwitch();
await auditBand();

check('ошибок в консоли нет', errors.length === 0, errors.join('\n        '));

await context.close();
await browser.close();
console.log(failed
  ? `\n${failed} проверок упало\n`
  : '\nПереведённые страницы выходят на своём языке.\n');
process.exit(failed ? 1 : 0);
