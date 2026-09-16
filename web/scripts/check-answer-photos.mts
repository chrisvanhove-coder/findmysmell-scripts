/**
 * Сверка фотографий под варианты ответа с продом.
 *
 * Запуск:  cd web && npm run check:photos
 *
 * Четыре вопроса живут на одном приёме: Q_YOURSELF, Q_ATMOS,
 * Q_CELEBRATE и Q_CALM_NOW. Наведение на вариант проявляет за текстом
 * фотографию на весь экран, остальные варианты приглушаются.
 *
 * Здесь три вещи.
 *
 * 1. Те же снимки, что на живом сайте, и привязаны к тем же кодам:
 *    перепутанная привязка означала бы, что человеку показывают лес, а
 *    выбирается город.
 * 2. Все коды существуют в quiz.en.json, и ни один снимок не висит на
 *    несуществующем варианте; а варианты без снимка — ровно те, у
 *    которых его не было и в проде.
 * 3. Ссылки идут через трансформацию Cloudinary. Это главное: в проде
 *    все снимки грузились в исходном размере — около 14.5 МБ на
 *    q-yourself и 30.7 МБ на q-calm-now, и ровно это заказчица видела
 *    как «картинки долго грузят».
 */
import { readFileSync } from 'node:fs';
import { cld } from '../src/lib/cloudinary.ts';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const data = JSON.parse(readFileSync('src/data/answer-photos.json', 'utf8'));
const quiz = JSON.parse(readFileSync('src/data/quiz.en.json', 'utf8'));
const screen = readFileSync('src/app/[locale]/quiz/[question]/QuizScreen.tsx', 'utf8');
const backdrop = readFileSync('src/components/quiz/AnswerBackdrop.tsx', 'utf8');

const maps: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(data).filter(([k]) => k !== '_'),
) as Record<string, Record<string, string>>;

/**
 * Что сверяем по каждому вопросу: страница прода, сколько снимков в её
 * imageMap, и какие варианты снимка не имеют.
 *
 * Список «без снимка» закрыт намеренно: это не недоделка, а решение
 * живого сайта — показывать при наведении на «It changes» или «No
 * preference» нечего. Но если снимок пропадёт у обычного варианта,
 * проверка должна упасть, а не списать это на тот же список.
 */
const PAGES: Array<{
  id: string;
  page: string;
  photos: number;
  without: string[];
}> = [
  { id: 'Q_YOURSELF', page: 'q-yourself', photos: 5, without: ['Q_YOURSELF__MIXED'] },
  { id: 'Q_ATMOS', page: 'q-atmos', photos: 8, without: ['Q_ATMOS__NO_PREFER'] },
  { id: 'Q_CELEBRATE', page: 'q-celebrate', photos: 8, without: ['Q_CELEBRATE__OTHER'] },
  {
    id: 'Q_CALM_NOW',
    page: 'q-calm-now',
    photos: 9,
    without: ['Q_CALM_NOW__COFFEE_COMF', 'Q_CALM_NOW__OTHER'],
  },
];

/**
 * Два файла в Cloudinary названы не так, как в Webflow: у «celeb-sweet»
 * в проде в имени апостроф (`celeb-sweet%27.png`), а «calmnow-water»
 * загружен как `calmnow-wat`. Список закрыт: третье расхождение
 * проверка поймает.
 */
const ALIAS: Record<string, string> = {
  "celeb-sweet'": 'celeb-sweet',
  'calmnow-water': 'calmnow-wat',
};

console.log('\nТе же снимки и те же коды, что в проде');
for (const p of PAGES) {
  const prod = readFileSync(`../webflow/live-pages/${p.page}.footer.html`, 'utf8');

  // В проде карта кодов → ссылок лежала в imageMap.
  const prodCodes = [...prod.matchAll(
    /'(Q_[A-Z_]+)':\s*'https:\/\/cdn\.prod\.website-files\.com\/[^_]+_([^'/]+)\.(png|jpe?g)'/g,
  )].map((m) => ({ code: m[1], stem: decodeURIComponent(m[2]) }));

  check(`${p.id}: в проде ${p.photos} снимков`, prodCodes.length === p.photos,
    String(prodCodes.length));

  const mine = maps[p.id] ?? {};
  check(`${p.id}: столько же у нас`,
    prodCodes.every((x) => x.code in mine)
    && Object.keys(mine).length === prodCodes.length,
    `${Object.keys(mine).join(', ')}\n        против ${prodCodes.map((x) => x.code).join(', ')}`);

  /* Имя файла в Cloudinary — то же, что в website-files, плюс суффикс
     загрузки: feel-nature.png → feel-nature_ibkg6q.png. */
  for (const x of prodCodes) {
    const stem = ALIAS[x.stem] ?? x.stem;
    const ours = mine[x.code] ?? '';
    check(`${x.code} — тот же снимок (${stem})`,
      new RegExp(`/${stem}_[a-z0-9]+\\.`).test(ours),
      `${ours}\n        ожидался файл ${stem}`);
  }
}

console.log('\nКоды существуют в квизе, а без снимка — только известные варианты');
{
  const known = new Set(PAGES.map((p) => p.id));
  const extra = Object.keys(maps).filter((id) => !known.has(id));
  check('лишних вопросов в данных нет', extra.length === 0, extra.join(', '));

  for (const p of PAGES) {
    const map = maps[p.id] ?? {};
    const codes = (quiz[p.id]?.answers ?? []).map((a: { code: string }) => a.code);
    check(`${p.id}: вопрос есть в квизе`, codes.length > 0);
    for (const code of Object.keys(map)) {
      check(`${code} — существующий вариант`, codes.includes(code),
        `в квизе: ${codes.join(', ')}`);
    }
    const without = codes.filter((c: string) => !(c in map));
    check(`${p.id}: без снимка только ${p.without.join(', ')}`,
      without.length === p.without.length && p.without.every((c) => without.includes(c)),
      without.join(', ') || 'снимки есть у всех');
  }
}

console.log('\nСнимки идут через трансформацию, а не в исходном весе');
{
  for (const [questionId, map] of Object.entries(maps)) {
    for (const [code, url] of Object.entries(map)) {
      const delivered = cld(url, 'quizBackdrop');
      check(`${questionId} / ${code}: ссылка ужата`,
        delivered.includes('/upload/c_fill,g_auto,h_900,w_1600/f_auto/q_auto/'),
        delivered);
      check(`${questionId} / ${code}: исходник не отдаётся напрямую`,
        delivered !== url, url);
    }
  }
  check('компонент отдаёт снимок через cld, а не как есть',
    /cld\(url, 'quizBackdrop'\)/.test(backdrop),
    'иначе вернётся PNG на 2.8–4.2 МБ');
  const all = Object.values(maps).flatMap((m) => Object.values(m));
  check('все ссылки ведут в Cloudinary, а не на website-files',
    all.every((u) => u.startsWith('https://res.cloudinary.com/')), String(all.length));
  check('и все разные', new Set(all).size === all.length,
    `${new Set(all).size} различных из ${all.length}`);
}

console.log('\nИсправления против прода на месте');
{
  check('снимки не греются все сразу',
    /requestIdleCallback/.test(backdrop),
    'прод грел все при открытии вопроса — до 30.7 МБ на q-calm-now');
  check('два слоя и переход по opacity',
    /\[0, 1\]\.map/.test(backdrop) && /opacity/.test(backdrop),
    'в проде плавность стояла на background-image, который не анимируется');
  check('фокус показывает снимок, как и наведение',
    /onFocus: \(\) => lookAt\(a\.code\)/.test(screen),
    'в проде идущий табом не видел фотографий вовсе');
  check('второе касание подписано',
    /Tap again to choose/.test(screen),
    'в проде первый тап словно ничего не делал');
  check('касание отличается от наведения отдельным состоянием',
    /const \[tapped, setTapped\]/.test(screen) && /tapped !== code/.test(screen),
    'браузер при касании сначала даёт фокус, и без этого первый тап сразу выбирал');
  check('гашение с задержкой, как в проде',
    /setTimeout\(\(\) => setLooking\(null\), 200\)/.test(screen),
    'иначе фон мигает при переходе на соседний вариант');
  check('таймер гашения снимается при уходе с экрана',
    /clearTimeout\(leaveTimer\.current\)/.test(screen));
  check('остальные варианты приглушаются',
    /styles\.dimmed/.test(screen));
  check('вариант без снимка выбирается с первого касания',
    /photos\[code\] && tapped !== code/.test(screen),
    'лишний тап там был бы просто препятствием');
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
