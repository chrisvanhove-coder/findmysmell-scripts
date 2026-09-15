// Гейт согласия в настоящем браузере.
//
// Проверяет то, чего проверка логики проверить не может: что запрос
// к googletagmanager.com НЕ УХОДИТ, пока человек не согласился. Прежний
// баннер в проде выглядел рабочим и не грузил ничего вообще; здесь важно
// убедиться, что новый и выглядит рабочим, и работает.
//
// Запуск: NEXT_PUBLIC_GA_ID=G-TESTONLY000 npm run dev   (в другом окне)
//         npm run e2e:consent
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

/** Новый контекст со счётчиком запросов к Google и заглушкой вместо тега. */
async function fresh() {
  const context = await browser.newContext();
  const hits = [];
  // Настоящий gtag.js не грузим: в песочнице нет сети, и от живого тега
  // здесь ничего не нужно — важен сам факт запроса.
  await context.route('**://*.googletagmanager.com/**', (route) => {
    hits.push(route.request().url());
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  const page = await context.newPage();
  return { context, page, hits };
}

const settle = (page) => page.waitForTimeout(700);

console.log('\nБаннер появляется и ничего не грузит до ответа');
let stored;
{
  const { context, page, hits } = await fresh();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await settle(page);

  const banner = page.getByRole('region', { name: 'Analytics' });
  check('баннер показан', await banner.isVisible());
  check('до ответа в Google не ушло ни одного запроса', hits.length === 0,
    hits.join(', '));

  const refuse = page.getByRole('button', { name: 'No thanks' });
  const accept = page.getByRole('button', { name: 'Allow analytics' });
  check('есть и «отказаться», и «разрешить»',
    await refuse.isVisible() && await accept.isVisible());

  // Отказаться должно быть не труднее: одинаковый размер кнопок.
  const a = await refuse.boundingBox();
  const b = await accept.boundingBox();
  check('кнопки одного размера', Math.abs(a.height - b.height) < 2,
    `${a.height} и ${b.height}`);

  // И баннер не должен накрывать обязательные ссылки подвала.
  const privacy = page.getByRole('link', { name: 'Privacy Policy' }).first();
  check('ссылка на политику осталась доступна', await privacy.isVisible());

  await context.close();
}

console.log('\nОтказ работает и запоминается');
{
  const { context, page, hits } = await fresh();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'No thanks' }).click();
  await settle(page);

  check('баннер скрылся',
    !(await page.getByRole('region', { name: 'Analytics' }).isVisible()));
  check('после отказа в Google по-прежнему ничего не ушло', hits.length === 0,
    hits.join(', '));

  stored = await page.evaluate(() => localStorage.getItem('fms_consent'));
  check('отказ записан', JSON.parse(stored ?? '{}').decision === 'denied', String(stored));

  // Перезагрузка не должна спрашивать снова и не должна ничего грузить.
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page);
  check('после перезагрузки баннера нет',
    !(await page.getByRole('region', { name: 'Analytics' }).isVisible()));
  check('после перезагрузки в Google ничего не ушло', hits.length === 0,
    hits.join(', '));

  await context.close();
}

console.log('\nСогласие грузит тег — и только тогда');
{
  const { context, page, hits } = await fresh();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  await settle(page);

  check('после согласия тег запрошен', hits.length > 0, 'запросов нет');
  check('запрошен именно наш id',
    hits.some((u) => u.includes('G-TESTONLY000')), hits.join(', '));

  // Consent Mode: отказ по умолчанию обязан стоять в dataLayer ПЕРВЫМ,
  // иначе тег отправит хит до того, как узнает о выборе.
  const layer = await page.evaluate(() =>
    (window.dataLayer ?? []).map((a) => Array.from(a)));
  const first = layer.find((e) => e[0] === 'consent');
  check('первая запись про согласие — default',
    first && first[1] === 'default', JSON.stringify(first));
  check('в default аналитика запрещена',
    first && first[2]?.analytics_storage === 'denied', JSON.stringify(first?.[2]));
  check('есть update с разрешением',
    layer.some((e) => e[0] === 'consent' && e[1] === 'update'
      && e[2]?.analytics_storage === 'granted'));
  check('реклама остаётся запрещённой',
    first && first[2]?.ad_storage === 'denied' && first[2]?.ad_user_data === 'denied');

  await context.close();
}

console.log('\nВыбор отзывается из панели');
{
  const { context, page, hits } = await fresh();
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  await settle(page);
  const afterAccept = hits.length;

  await page.getByRole('button', { name: 'Cookies & data' }).click();
  const panel = page.getByRole('dialog', { name: 'Cookies & data' });
  check('панель открылась из подвала', await panel.isVisible());
  check('панель говорит, что куки не ставятся',
    await panel.getByText('This site sets no cookies.').isVisible());
  check('панель показывает текущее состояние',
    await panel.getByText('Google Analytics: allowed.').isVisible());

  await panel.getByRole('button', { name: 'Turn it off' }).click();
  // Отзыв перезагружает страницу — тег обязан пропасть.
  await page.waitForLoadState('networkidle');
  await settle(page);

  const record = await page.evaluate(() => localStorage.getItem('fms_consent'));
  check('отзыв записан', JSON.parse(record ?? '{}').decision === 'denied', String(record));
  check('после отзыва тег в разметке отсутствует',
    (await page.locator('#fms-ga').count()) === 0);
  check('после отзыва баннер снова не спрашивает',
    !(await page.getByRole('region', { name: 'Analytics' }).isVisible()));
  check('после перезагрузки новых запросов в Google нет',
    hits.length === afterAccept, `было ${afterAccept}, стало ${hits.length}`);

  await context.close();
}

console.log('\n«Забыть этот браузер» действительно стирает ключ');
{
  const { context, page } = await fresh();
  // Ключ заводится при отправке прохождения, поэтому ставим его прямо.
  await page.goto(`${BASE}/en`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('fms_browser',
      JSON.stringify({ key: 'e2e-key', since: new Date().toISOString() }));
    localStorage.setItem('fms_runs', '3');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await settle(page);

  await page.getByRole('button', { name: 'Cookies & data' }).click();
  const panel = page.getByRole('dialog', { name: 'Cookies & data' });
  check('панель видит ключ и число прохождений',
    await panel.getByText('It has sent 3 runs.').isVisible());

  await panel.getByRole('button', { name: 'Forget this browser' }).click();
  await settle(page);

  const left = await page.evaluate(() => ({
    key: localStorage.getItem('fms_browser'),
    runs: localStorage.getItem('fms_runs'),
  }));
  check('ключ стёрт', left.key === null, String(left.key));
  check('счётчик стёрт', left.runs === null, String(left.runs));
  check('панель подтвердила',
    await panel.getByText('Done — this browser is forgotten.').isVisible());
  check('состояние обновилось без перезагрузки',
    await panel.getByText('Your browser holds no number yet.').isVisible());

  await context.close();
}

console.log('\nФранцузская версия — на французском');
{
  const { context, page } = await fresh();
  await page.goto(`${BASE}/fr`, { waitUntil: 'networkidle' });
  await settle(page);
  check('баннер по-французски',
    await page.getByRole('button', { name: 'Non merci' }).isVisible());
  await page.getByRole('button', { name: 'Cookies et données' }).click();
  check('панель по-французски',
    await page.getByText('Ce site ne dépose aucun cookie.').isVisible());
  await context.close();
}

await browser.close();
console.log(failed ? `\n${failed} проверок упало\n` : '\nГейт согласия работает.\n');
process.exit(failed ? 1 : 0);
