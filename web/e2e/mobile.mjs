/**
 * Проход всего сайта на телефоне: 390×844, как iPhone 14/15.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ПРОВЕРКА. Все остальные браузерные проверки ходят по
 * десктопному окну, а приходят люди с телефона. Ошибки телефона другие:
 * страница уезжает вбок, кнопка меньше пальца, вопрос не помещается на
 * экран вместе с ответами, шапка накрывает содержимое.
 *
 * ЧТО МЕРЯЕТ НА КАЖДОМ ЭКРАНЕ:
 *   1. Горизонтальную прокрутку — её на телефоне быть не должно вообще.
 *   2. Что именно вылезает за правый край, если вылезает.
 *   3. Кнопки и ссылки мельче 44×44 — это порог, ниже которого палец
 *      промахивается (рекомендация Apple HIG и WCAG 2.5.8).
 *   4. Помещаются ли вопрос и первый ответ в первый экран без прокрутки.
 *   5. Не накрыты ли кликабельные элементы шапкой или подвалом.
 *
 * Снимки кладёт в каталог из SHOTS (по умолчанию /tmp/mob).
 *
 * Запуск: BASE_URL=... CHROME_PATH=... npm run e2e:mobile
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { walkQuiz } from './lib/walk-quiz.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const SHOTS = process.env.SHOTS ?? '/tmp/mob';
const W = 390;
const H = 844;
const TAP = 44;

/* Картинки Cloudinary из песочницы недоступны, а без фоновых фотографий
   раскладка врёт. Подставляем заглушку того же размера. */
const STUB = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">'
  + '<rect width="600" height="800" fill="#6b6257"/></svg>',
).toString('base64');

const problems = [];
function note(screen, kind, detail) {
  problems.push({ screen, kind, detail });
}

/** Всё, что меряется в браузере, одним заходом. */
async function measure(page) {
  return page.evaluate((tap) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const name = (el) => {
      const id = el.id ? `#${el.id}` : '';
      const cls = typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const data = el.dataset && Object.keys(el.dataset)[0]
        ? `[data-${Object.keys(el.dataset)[0]}]` : '';
      return `${el.tagName.toLowerCase()}${id}${cls}${data}`.slice(0, 70);
    };
    const visible = (el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    // 1. Горизонтальная прокрутка страницы.
    const overflowPx = document.documentElement.scrollWidth - vw;

    // 2. Кто вылезает вбок. Считаем только тех, у кого ни один предок
    //    не прячет перелив: иначе в список попадает всё декоративное.
    const clipped = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'hidden' || o === 'clip' || o === 'auto' || o === 'scroll') return true;
      }
      return false;
    };
    const sticking = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el) || clipped(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        sticking.push({ el: name(el), left: Math.round(r.left), right: Math.round(r.right) });
      }
    }

    /* 3. Мелкие цели для пальца.
       Меряем НЕ коробку элемента, а то, что реально ловит палец. Надпись
       может быть в 16px высотой, а вокруг неё невидимый слой ::after,
       который доводит цель до нужной — по размеру элемента этого не
       видно, поэтому спрашиваем саму страницу: что окажется под пальцем
       в точках по краям квадрата 44×44 вокруг середины элемента. Если
       там тот же элемент — цель достаточная, как бы ни была мала буква. */
    const hits = (el, r, size) => {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const h = size / 2 - 2;
      const points = [[cx, cy - h], [cx, cy + h], [cx - h, cy], [cx + h, cy]];
      return points.every(([x, y]) => {
        if (x < 0 || y < 0 || x > vw || y > vh) return false;
        const hit = document.elementFromPoint(x, y);
        return hit === el || el.contains(hit);
      });
    };
    const small = [];
    for (const el of document.querySelectorAll('button, a, input, [role="button"], [role="option"]')) {
      if (!visible(el) || el.disabled) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;   // вне экрана — не мерить
      /* Элемент, наполовину ушедший за край экрана, меряется неверно:
         пробная точка снизу оказывается за пределами окна и считается
         промахом, хотя человек просто прокрутит. Такие пропускаем —
         их целость видна на другом экране. */
      if (r.top < tap / 2 || r.bottom > vh - tap / 2) continue;
      /* То же с открытым окном: карточка для шеринга честно накрывает
         страницу, и всё под ней «не ловится» по делу. */
      if (document.querySelector('[role="dialog"]') && !document.querySelector('[role="dialog"]').contains(el)) continue;
      /* Барабан эмоций: выбирается только слово в окне, соседние сверху и
         снизу нарочно срезаны — мерить их как цель бессмысленно. */
      const drum = el.closest('[role="listbox"]');
      if (drum && drum.getAttribute('aria-activedescendant') !== el.id) continue;
      if (hits(el, r, tap)) continue;             // палец попадает — годится
      small.push({
        el: name(el),
        size: `${Math.round(r.width)}×${Math.round(r.height)}`,
        // Сколько ловит на самом деле: ищем наибольший квадрат, который
        // целиком принадлежит элементу.
        реально: [44, 40, 36, 32, 28, 24].find((s) => hits(el, r, s)) ?? '<24',
      });
    }

    // 4. Помещается ли вопрос с первым ответом в экран.
    const q = document.querySelector('h1, h2, [class*="question"]');
    const answer = document.querySelector('button[data-answer], ul li button, [role="slider"], [role="listbox"], textarea, input');
    const fold = {
      question: q ? Math.round(q.getBoundingClientRect().bottom) : null,
      firstAnswer: answer ? Math.round(answer.getBoundingClientRect().top) : null,
      answerBottom: answer ? Math.round(answer.getBoundingClientRect().bottom) : null,
      viewport: vh,
      pageHeight: document.documentElement.scrollHeight,
    };

    // 5. Что лежит под шапкой или подвалом.
    const covered = [];
    const bars = [...document.querySelectorAll('header, footer')].filter(visible);
    for (const el of document.querySelectorAll('button, a, [role="button"], [role="option"], input, textarea')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      for (const bar of bars) {
        if (bar.contains(el)) continue;
        const b = bar.getBoundingClientRect();
        const overlapY = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
        const overlapX = Math.min(r.right, b.right) - Math.max(r.left, b.left);
        if (overlapY > 4 && overlapX > 4) {
          covered.push({ el: name(el), by: bar.tagName.toLowerCase() });
        }
      }
    }

    return { overflowPx, sticking: sticking.slice(0, 6), small, fold, covered };
  }, TAP);
}

async function inspect(page, screen, { question = false } = {}) {
  await page.waitForTimeout(500);
  /* Снимаем ВИДИМУЮ область, а не всю страницу: шапка и подвал закреплены
     (position: fixed), и на полностраничном снимке Playwright рисует их
     посреди картинки — выходит небылица, которой человек никогда не
     увидит. Длинные страницы снимаем в несколько приёмов. */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/${screen}.png` });
  const m = await measure(page);

  if (m.overflowPx > 1) note(screen, 'страница уезжает вбок', `${m.overflowPx}px сверх ширины экрана`);
  for (const s of m.sticking) note(screen, 'торчит за край', `${s.el}  left=${s.left} right=${s.right}`);
  for (const s of m.small) note(screen, 'цель мельче пальца', `${s.el}  коробка ${s.size}, ловит ${s.реально}px`);
  for (const c of m.covered) note(screen, 'накрыт', `${c.el} закрыт элементом <${c.by}>`);
  /* Только на экранах вопроса: на странице результата «первым ответом»
     оказывается поле для почты далеко внизу, и мерить по нему сгиб
     бессмысленно. */
  if (question && m.fold.answerBottom && m.fold.answerBottom > m.fold.viewport) {
    note(screen, 'ответ ниже сгиба', `низ первого ответа ${m.fold.answerBottom} при экране ${m.fold.viewport}`);
  }
  console.log(`  ${screen.padEnd(22)} вбок:${m.overflowPx}px  мелких:${m.small.length}  торчит:${m.sticking.length}  накрыто:${m.covered.length}  высота:${m.fold.pageHeight}`);
  return m;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**://res.cloudinary.com/**', (r) =>
  r.fulfill({ status: 200, contentType: 'image/svg+xml', body: Buffer.from(STUB, 'base64') }));

console.log(`\nТелефон ${W}×${H}\n`);

await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
await inspect(page, '00-home');

let n = 0;
const visited = await walkQuiz(page, {
  base: BASE,
  touch: true,
  agree: true,
  openText: 'reminds me of my grandmother kitchen in early autumn',
  onStep: async (slug, p) => {
    n += 1;
    await inspect(p, `${String(n).padStart(2, '0')}-${slug}`, { question: true });
  },
});

await page.waitForTimeout(1500);
await inspect(page, '90-result');
// Карточка шеринга всплывает внизу — проверяем и её.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
await inspect(page, '91-result-bottom');

console.log(`\nЭкранов пройдено: ${visited.length + 1}`);
if (errors.length) console.log(`Ошибки страницы: ${errors.join(' | ')}`);

console.log('\n─── Находки ───');
if (problems.length === 0) console.log('ничего не найдено');
const byKind = new Map();
for (const p of problems) {
  const k = `${p.kind}`;
  if (!byKind.has(k)) byKind.set(k, []);
  byKind.get(k).push(p);
}
for (const [kind, list] of byKind) {
  console.log(`\n${kind.toUpperCase()} — ${list.length}`);
  for (const p of list) console.log(`   ${p.screen.padEnd(22)} ${p.detail}`);
}
writeFileSync(`${SHOTS}/report.json`, JSON.stringify(problems, null, 2));
await browser.close();
