/**
 * Проверка того, что нужно ровно в день переключения домена:
 * редиректы со старых адресов, теги ссылки-превью, robots, sitemap, 404.
 *
 * Запуск:  cd web && npm run check:seo
 *
 * Главное здесь — ПЕРВЫЙ блок. Список старых адресов берётся из самих
 * прод-страниц (`webflow/live-pages/*.footer.html` — по одному файлу на
 * страницу живого сайта), и для каждого проверяется, что в таблице
 * редиректов есть правило. Если завтра в Webflow появится новая
 * страница, а редирект для неё не напишут — проверка упадёт, а не
 * промолчит.
 *
 * Сами редиректы в браузере (что отдаётся 308 и куда именно) проверяет
 * npm run e2e:seo.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LOCALES } from '../src/lib/i18n';
import { ARCHETYPE_KEYS } from '../src/lib/archetype-colors';
import { FIRST_QUESTION, toSlug } from '../src/lib/quiz';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

/* Конфиг Next — это модуль, поэтому берём правила из него самого, а не
   разбираем файл глазами: так проверка видит ровно то, что применится. */
const configUrl = pathToFileURL(`${process.cwd()}/next.config.ts`).href;
const { default: config } = await import(configUrl) as {
  default: { redirects?: () => Promise<Array<{
    source: string; destination: string; permanent: boolean;
  }>> };
};
const rules = (await config.redirects?.()) ?? [];

/**
 * Переводит правило Next в регулярное выражение.
 *
 * Порядок замен важен: сначала параметр СО своим выражением
 * (`/:question(q-[a-z0-9-]+)` → `/(q-[a-z0-9-]+)`), и только потом
 * остальные виды. Если сначала экранировать спецсимволы, как я сделал
 * в первой версии, то класс `[a-z0-9-]` разваливается и правило не
 * ловит ничего — проверка тогда объявила живые правила мёртвыми.
 */
function toRegExp(source: string): RegExp {
  const body = source
    .replace(/\/:[a-zA-Z]+\(([^)]+)\)/g, '/($1)')
    .replace(/\/:[a-zA-Z]+\*/g, '(?:/.*)?')
    .replace(/\/:[a-zA-Z]+/g, '/[^/]+');
  /* Точки здесь не экранируются намеренно: ни в одном правиле их нет, а
     экранирование ПОСЛЕ подстановки ломало вставленное `(?:/.*)?` —
     `/perfumes/coven` перестал попадать под своё же правило. */
  return new RegExp(`^${body}$`);
}

const covered = (path: string) => rules.some((r) => toRegExp(r.source).test(path));

console.log('\nКаждый старый адрес живого сайта куда-то ведёт');
{
  /* По файлу подвала на страницу: `q-calm.footer.html` → `/q-calm`.
     Это те же адреса, что стоят в `publishedPath` страниц Webflow. */
  const pages = readdirSync('../webflow/live-pages')
    .filter((f) => f.endsWith('.footer.html'))
    .map((f) => f.replace('.footer.html', ''))
    .filter((slug) => slug !== 'home');

  /* Их 23: по одному подвалу на страницу вопроса. У q-open подвал лежит
     отдельно (`webflow/page-q-open-footer.html`), поэтому его адрес
     добавлен в список ниже руками. */
  check(`страниц живого сайта в репозитории: ${pages.length}`, pages.length >= 23);

  /* Английский набор адресов — плоский, французский и русский с
     префиксом. Все три были опубликованы (см. publishedPath). */
  const all = [
    ...pages.map((s) => `/${s}`),
    ...pages.flatMap((s) => ['fr', 'ru'].map((l) => `/${l}/${s}`)),
    '/home', '/fr/home', '/ru/home',
    '/result', '/privacy-policy', '/legal-notice',
    '/old-home', '/quiz-ru', '/perfumes', '/perfumes/coven',
    '/ru/q-gender-ru',
    '/q-open', '/fr/q-open', '/ru/q-open',
  ];

  const orphans = all.filter((p) => {
    // Адреса, которые в новом сайте существуют сами по себе, редиректа
    // не требуют: `/fr/result`, `/fr/privacy-policy` и подобные.
    const isNativeRoute = /^\/(en|fr|ru)\/(result|privacy-policy|legal-notice)$/.test(p);
    return !isNativeRoute && !covered(p);
  });
  check('ни одного старого адреса без правила', orphans.length === 0,
    orphans.slice(0, 8).join(', '));

  // И наоборот: правило, которое ничего не ловит, — мёртвый код.
  const dead = rules.filter((r) => !all.some((p) => toRegExp(r.source).test(p)));
  check('мёртвых правил нет', dead.length === 0,
    dead.map((r) => r.source).join(', '));
}

console.log('\nРедиректы ведут на существующие адреса и переносят вес');
{
  check('все правила постоянные (308), а не временные',
    rules.every((r) => r.permanent === true),
    rules.filter((r) => !r.permanent).map((r) => r.source).join(', '));

  const bad = rules.filter((r) => !/^\/(en|fr|ru)(\/|$)/.test(r.destination)
    && !r.destination.startsWith('/:locale'));
  check('все правила ведут внутрь локали', bad.length === 0,
    bad.map((r) => `${r.source} → ${r.destination}`).join(', '));

  /* Порядок важен: частное правило должно стоять ВЫШЕ общего, иначе
     общее заберёт адрес себе. Так уже случилось с `/ru/q-gender-ru`. */
  const exact = rules.findIndex((r) => r.source === '/ru/q-gender-ru');
  const generic = rules.findIndex((r) => r.source.includes('(q-[a-z0-9-]+)')
    && r.source.includes(':locale'));
  check('частное правило /ru/q-gender-ru стоит выше общего',
    exact !== -1 && generic !== -1 && exact < generic,
    `частное ${exact}, общее ${generic}`);
}

console.log('\nТеги ссылки-превью собраны из одного места');
{
  const site = readFileSync('src/lib/site.ts', 'utf8');
  const home = readFileSync('src/app/[locale]/page.tsx', 'utf8');
  const result = readFileSync('src/app/[locale]/result/[archetype]/page.tsx', 'utf8');
  const layout = readFileSync('src/app/[locale]/layout.tsx', 'utf8');
  const prod = readFileSync('../webflow/live-pages/home.head.html', 'utf8');

  check('есть сборщик previewTags', site.includes('export function previewTags'));
  check('главная собирает теги им', home.includes('...previewTags('));
  check('результат тоже', result.includes('...previewTags('));
  check('у layout есть metadataBase — иначе картинка уйдёт относительной ссылкой',
    layout.includes('metadataBase'));

  /* Значения сверяем с прод-тегами, а не с памятью. */
  const prodHas = (needle: string) => prod.includes(needle);
  check('og:site_name как в проде — Find My Smell',
    prodHas('content="Find My Smell"') && site.includes("SITE_NAME = 'Find My Smell'"));
  check('twitter:site как в проде — @findmysmell',
    prodHas('content="@findmysmell"') && site.includes("TWITTER_SITE = '@findmysmell'"));
  check('og:locale как в проде — en_GB, а не en_US',
    prodHas('content="en_GB"') && site.includes("en: 'en_GB'"));
  check('размер картинки как в проде — 1200×630',
    prodHas('content="1200"') && prodHas('content="630"')
    && site.includes('width: 1200, height: 630'));
  check('карточка большая (summary_large_image), как в проде',
    prodHas('content="summary_large_image"')
    && site.includes("card: 'summary_large_image'"));

  /* Заголовок карточки результата — панчлайн. Её правило про всё, чем
     делятся: «Панчлайн главным, имя архетипа не надо». Плюс «politely
     unreachable» она просила стереть со всех архетипов. */
  check('заголовок результата — панчлайн, а не «You are ...»',
    result.includes('const headline = punchLine || `${a.you} ${a.identity}`'),
    'иначе всплывёт текст, который заказчица просила убрать со всех архетипов');
  check('и во вкладке тоже он («замени панчлайном везде»)',
    result.includes('const title = `${headline} — Find My Smell`'));
  check('в карточке ссылки — без названия сайта, оно в отдельном теге',
    result.includes('title: headline,'));
}

console.log('\nrobots, sitemap и 404 на месте');
{
  const robots = readFileSync('src/app/robots.ts', 'utf8');
  check('robots закрывает админку', robots.includes("'/admin'"));
  check('и API', robots.includes("'/api'"));
  check('и указывает карту сайта', robots.includes('/sitemap.xml'));

  const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');
  const expected = LOCALES.length * (2 + ARCHETYPE_KEYS.length + 2);
  check(`в карте сайта ожидается ${expected} адресов`, expected === 33, String(expected));
  check('карта берёт архетипы и локали из кода, а не списком',
    sitemap.includes('ARCHETYPE_KEYS') && sitemap.includes('LOCALES'));
  check('и первый экран квиза берёт из данных квиза',
    sitemap.includes('FIRST_QUESTION') && toSlug(FIRST_QUESTION.id) === 'q-gender');

  check('своя страница 404 внутри локали есть',
    readFileSync('src/app/[locale]/not-found.tsx', 'utf8').includes('404'));
  const root = readFileSync('src/app/not-found.tsx', 'utf8');
  check('и вне локали — со своими html и body',
    root.includes('<html') && root.includes('<body'),
    'корневой layout их не рисует, иначе страница уедет без разметки');
  check('обе помечены noindex', root.includes('noindex'));
}

console.log('\nПеренос базы теперь видно в логах');
{
  const imp = readFileSync('src/app/admin/import/page.tsx', 'utf8');
  check('строка в лог при переносе есть', imp.includes("console.log(\n      '[import]"));
  check('и в ней только числа, без личных данных',
    !/console\.log\([^)]*openAnswer|console\.log\([^)]*email\b/.test(imp)
    && imp.includes('parsed.runs.length'));
  check('видно, была ли галочка «записать»', imp.includes("apply ? 'да' : 'нет'"));
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nПереключение домена подготовлено.\n');
process.exit(failed ? 1 : 0);
