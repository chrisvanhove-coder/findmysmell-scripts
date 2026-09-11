// Проходит квиз целиком в браузере и проверяет главное:
// переходы между вопросами идут без перезагрузки документа.
// Запуск: собрать приложение, поднять сервер, затем
//   CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();

let documentLoads = 0;
page.on('load', () => documentLoads++);

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://localhost:3000/en/quiz/q-gender', { waitUntil: 'networkidle' });
const loadsAfterFirst = documentLoads;

const visited = [];
for (let i = 0; i < 30; i++) {
  const url = page.url();
  if (url.includes('/result/')) break;
  const heading = (await page.locator('h1').first().textContent())?.trim();
  const slug = url.split('/').pop();
  visited.push(slug);

  const hasSearch = await page.locator('#country-search').count();
  const open = await page.locator('textarea').count();
  if (hasSearch) {
    await page.locator('#country-search').fill('Fra');
    await page.locator('[role="option"] button').first().click();
  } else if (open) {
    await page.locator('textarea').fill('smells like my grandmother kitchen');
    // Две кнопки — согласие на исследование, а не отправка и пропуск.
    await page.getByRole('button', { name: 'Agree & continue', exact: true }).click();
  } else {
    const options = page.locator('ul li button');
    const n = await options.count();
    if (!n) throw new Error(`нет вариантов на ${slug} ("${heading}")`);
    await options.nth(i % n).click();
  }
  await page.waitForFunction((prev) => location.href !== prev, url, { timeout: 5000 });
}

const finalUrl = page.url();
console.log('пройдено вопросов:', visited.length);
console.log('путь:', visited.join(' → '));
console.log('финальный адрес:', finalUrl.replace('http://localhost:3000', ''));
console.log('');
console.log('загрузок документа за весь проход:', documentLoads, `(первая загрузка: ${loadsAfterFirst})`);
console.log('перезагрузок между вопросами:', documentLoads - loadsAfterFirst);
console.log('ошибок в консоли:', errors.length, errors.slice(0, 3).join(' | '));

// ответы сохранились?
const answers = await page.evaluate(() => localStorage.getItem('quiz_answers'));
const parsed = JSON.parse(answers ?? '{}');
console.log('сохранено ответов:', Object.keys(parsed).length);
console.log('открытый ответ:', JSON.stringify(await page.evaluate(() => localStorage.getItem('quiz_open'))));
console.log('согласие на исследование:', await page.evaluate(() => localStorage.getItem('consent_aggregate')));
console.log('страна (где живёт):', JSON.parse(answers ?? '{}').Q_REGION_NOW);
console.log('страна (где вырос):', JSON.parse(answers ?? '{}').Q_REGION_CHILD);

await browser.close();
