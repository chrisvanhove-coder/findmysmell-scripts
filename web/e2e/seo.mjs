// Переключение домена: редиректы, теги ссылки-превью, robots, sitemap, 404.
//
// Проверяется то, что увидит браузер и поисковик, а не то, что написано
// в конфиге: какой код отдаётся по старому адресу и куда он ведёт,
// какие теги реально оказались в <head>, отдаётся ли 404 кодом 404.
// Конфиг и списки адресов сверяет npm run check:seo.
//
// Запуск: npm run dev (в другом окне), затем npm run e2e:seo
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const context = await browser.newContext();
const page = await context.newPage();

/** Идёт по адресу БЕЗ перехода: нужен сам ответ, а не страница. */
async function head(path) {
  const res = await page.request.get(`${BASE}${path}`, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers().location ?? null };
}

/* ─── 1. старые адреса ведут на новые ──────────────────────────────────── */

console.log('\nСтарые адреса живого сайта ведут на новые');
{
  const pairs = [
    ['/q-gender', '/en/quiz/q-gender'],
    ['/q-calm', '/en/quiz/q-calm'],
    ['/q-calm-now', '/en/quiz/q-calm-now'],
    ['/q-skin-behavior', '/en/quiz/q-skin-behavior'],
    ['/q-open', '/en/quiz/q-open'],
    ['/fr/q-emo', '/fr/quiz/q-emo'],
    ['/ru/q-sweet', '/ru/quiz/q-sweet'],
    // Частный случай: у этой страницы в адресе был суффикс языка.
    ['/ru/q-gender-ru', '/ru/quiz/q-gender'],
    ['/result', '/en/result'],
    ['/privacy-policy', '/en/privacy-policy'],
    ['/legal-notice', '/en/legal-notice'],
    ['/home', '/en'],
    ['/fr/home', '/fr'],
    ['/ru/home', '/ru'],
    ['/old-home', '/en'],
    ['/quiz-ru', '/en'],
    ['/perfumes', '/en'],
    ['/perfumes/coven', '/en'],
  ];

  for (const [from, to] of pairs) {
    const r = await head(from);
    const where = (r.location ?? '').replace(BASE, '');
    check(`${from} → ${to}`, r.status === 308 && where === to,
      `код ${r.status}, ведёт на ${where || '—'}`);
  }
}

console.log('\nНовые адреса отдаются сами, без лишнего перехода');
{
  for (const path of ['/en', '/en/quiz/q-gender', '/en/result/ceo', '/fr/privacy-policy']) {
    const r = await head(path);
    check(`${path} — 200`, r.status === 200, `код ${r.status}`);
  }
  // Корень уводит в локаль по умолчанию — так было и до этой работы.
  const root = await head('/');
  check('/ ведёт на /en', root.status === 307 || root.status === 308,
    `код ${root.status}, ведёт на ${(root.location ?? '').replace(BASE, '')}`);
}

/* ─── 2. теги ссылки-превью ────────────────────────────────────────────── */

console.log('\nСсылка разворачивается карточкой');
async function tags(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  return page.evaluate(() => {
    const out = {};
    for (const m of document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')) {
      out[m.getAttribute('property') ?? m.getAttribute('name')] = m.getAttribute('content');
    }
    const icon = document.querySelector('link[rel="icon"]');
    return { meta: out, icon: icon?.getAttribute('href') ?? null };
  });
}

{
  const home = await tags('/en');
  const need = ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url',
    'og:locale', 'og:image', 'og:image:width', 'og:image:height',
    'twitter:card', 'twitter:site', 'twitter:title', 'twitter:image'];
  const missing = need.filter((k) => !home.meta[k]);
  check('на главной все теги на месте', missing.length === 0, missing.join(', '));
  check('карточка большая', home.meta['twitter:card'] === 'summary_large_image',
    home.meta['twitter:card']);
  check('картинка 1200×630, как в проде',
    home.meta['og:image:width'] === '1200' && home.meta['og:image:height'] === '630');
  check('картинка идёт через трансформацию Cloudinary',
    (home.meta['og:image'] ?? '').includes('/c_fill,g_auto,h_630,w_1200/'),
    home.meta['og:image']);
  check('адрес в og:url абсолютный',
    (home.meta['og:url'] ?? '').startsWith('http'), home.meta['og:url']);
  check('иконка вкладки есть', !!home.icon, String(home.icon));

  const result = await tags('/en/result/ceo');
  /* Заголовок карточки результата — панчлайн: «Панчлайн главным, имя
     архетипа не надо». И «politely unreachable» она просила стереть со
     всех архетипов — в превью ссылки его быть не должно. */
  check('в превью результата стоит панчлайн',
    (result.meta['og:title'] ?? '').startsWith('You replied to that email'),
    result.meta['og:title']);
  check('и нет текста, который просили убрать',
    !(result.meta['og:title'] ?? '').includes('politely unreachable'),
    result.meta['og:title']);
  check('описание результата — его дескриптор',
    (result.meta['og:description'] ?? '').includes('left the party'),
    result.meta['og:description']);

  const quiz = await tags('/en/quiz/q-gender');
  check('у экранов квиза теги тоже есть (из layout)',
    !!quiz.meta['og:site_name'] && !!quiz.meta['og:image']);
}

/* ─── 3. robots и sitemap ──────────────────────────────────────────────── */

console.log('\nrobots.txt и sitemap.xml');
{
  const robots = await page.request.get(`${BASE}/robots.txt`);
  const text = await robots.text();
  check('robots.txt отдаётся', robots.status() === 200, String(robots.status()));
  check('админка закрыта от робота', text.includes('Disallow: /admin'));
  check('API закрыт', text.includes('Disallow: /api'));
  check('карта сайта указана', /Sitemap: https?:\/\/.+\/sitemap\.xml/.test(text), text);

  const sitemap = await page.request.get(`${BASE}/sitemap.xml`);
  const xml = await sitemap.text();
  check('sitemap.xml отдаётся', sitemap.status() === 200, String(sitemap.status()));
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check('в карте 33 адреса', urls.length === 33, String(urls.length));
  check('главная в карте есть', urls.some((u) => u.endsWith('/en')));
  check('первый экран квиза есть', urls.some((u) => u.endsWith('/en/quiz/q-gender')));
  check('все семь результатов есть',
    ['ceo', 'hug', 'offgrid', 'japan', 'summer', 'outoftime', 'therapist']
      .every((k) => urls.some((u) => u.endsWith(`/en/result/${k}`))),
    urls.filter((u) => u.includes('/result/')).length + ' штук');
  check('середины квиза в карте НЕТ — это шаги, а не страницы входа',
    !urls.some((u) => u.includes('/quiz/q-calm')), urls.filter((u) => u.includes('/quiz/')).join(' '));
  check('все адреса абсолютные', urls.every((u) => u.startsWith('http')));

  // Адреса из карты должны существовать: карта с 404 внутри хуже, чем без карты.
  for (const u of [urls[0], urls[1], urls.find((x) => x.includes('/result/'))]) {
    const r = await page.request.get(u.replace(/^https?:\/\/[^/]+/, BASE));
    check(`из карты открывается: ${u.replace(/^https?:\/\/[^/]+/, '')}`, r.status() === 200,
      String(r.status()));
  }
}

/* ─── 4. страница «не найдено» ─────────────────────────────────────────── */

console.log('\nСвоя страница 404');
{
  const outside = await page.request.get(`${BASE}/nothing-here`);
  check('вне локали отдаётся код 404, а не 200', outside.status() === 404,
    String(outside.status()));
  const outsideHtml = await outside.text();
  check('и это наша страница, а не стандартная от Next',
    outsideHtml.includes('This page has no smell'));
  check('с разметкой html/body', /<html/i.test(outsideHtml) && /<body/i.test(outsideHtml));
  check('и закрыта от индексации', /noindex/i.test(outsideHtml));

  const inside = await page.request.get(`${BASE}/en/quiz/q-nonexistent`);
  check('внутри локали тоже 404', inside.status() === 404, String(inside.status()));
  const insideHtml = await inside.text();
  check('внутри локали страница «одетая» — с шапкой и подвалом',
    insideHtml.includes('This page has no smell')
    && insideHtml.includes('footer'));

  // Ссылки с этой страницы должны работать: иначе это тупик.
  await page.goto(`${BASE}/nothing-here`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Take the quiz' }).click();
  await page.waitForURL((u) => u.pathname.endsWith('/quiz/q-gender'), { timeout: 10000 });
  check('кнопка «Take the quiz» уводит в начало квиза',
    page.url().endsWith('/en/quiz/q-gender'), page.url());
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nПереключение домена: всё на месте.\n');
process.exit(failed ? 1 : 0);
