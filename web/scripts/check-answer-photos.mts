/**
 * Сверка фотографий под варианты ответа (Q_YOURSELF) с продом.
 *
 * Запуск:  cd web && npm run check:photos
 *
 * Здесь три вещи.
 *
 * 1. Те же снимки, что на живом сайте, и привязаны к тем же кодам:
 *    перепутанная привязка означала бы, что человеку показывают лес, а
 *    выбирается город.
 * 2. Все коды существуют в quiz.en.json, и ни один снимок не висит на
 *    несуществующем варианте.
 * 3. Ссылки идут через трансформацию Cloudinary. Это главное: в проде
 *    все пять PNG грузились в исходном размере — около 14.5 МБ на один
 *    экран, и ровно это заказчица видела как «картинки долго грузят».
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
const prod = readFileSync('../webflow/live-pages/q-yourself.footer.html', 'utf8');
const screen = readFileSync('src/app/[locale]/quiz/[question]/QuizScreen.tsx', 'utf8');
const backdrop = readFileSync('src/components/quiz/AnswerBackdrop.tsx', 'utf8');

const maps: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(data).filter(([k]) => k !== '_'),
) as Record<string, Record<string, string>>;

console.log('\nТе же варианты, что в проде');
{
  // В проде карта кодов → ссылок лежала в imageMap.
  const prodCodes = [...prod.matchAll(/'(Q_\w+)':\s*'([^']+)'/g)].map(([, code, url]) => ({
    code,
    file: url.split('_').pop(),   // 69b17fa8..._feel-nature.png → feel-nature.png
  }));
  check('в проде была карта на пять вариантов', prodCodes.length === 5,
    String(prodCodes.length));

  const mine = maps.Q_YOURSELF ?? {};
  check('и у нас те же пять кодов',
    prodCodes.every((p) => p.code in mine)
    && Object.keys(mine).length === prodCodes.length,
    `${Object.keys(mine).join(', ')}\n        против ${prodCodes.map((p) => p.code).join(', ')}`);

  // Имя файла в Cloudinary — то же, что в website-files, только с
  // добавленным Cloudinary суффиксом: feel-nature.png → feel-nature_ibkg6q.png
  for (const p of prodCodes) {
    const stem = p.file?.replace(/\.png$/, '');
    const ours = mine[p.code] ?? '';
    check(`${p.code} — тот же снимок (${stem})`,
      new RegExp(`/${stem}_[a-z0-9]+\\.`).test(ours),
      `${ours}\n        ожидался файл ${stem}`);
  }
}

console.log('\nКоды существуют в квизе');
{
  for (const [questionId, map] of Object.entries(maps)) {
    const codes = (quiz[questionId]?.answers ?? []).map((a: { code: string }) => a.code);
    check(`вопрос ${questionId} есть в квизе`, codes.length > 0);
    for (const code of Object.keys(map)) {
      check(`${code} — существующий вариант`, codes.includes(code),
        `в квизе: ${codes.join(', ')}`);
    }
    // Вариант без снимка — это нормально и так же было в проде; важно
    // лишь, чтобы такой вариант был один и известный.
    const without = codes.filter((c: string) => !(c in map));
    check(`без снимка остался только «It changes»`,
      without.length === 1 && without[0] === 'Q_YOURSELF__MIXED',
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
    'иначе вернётся PNG на 2.8–3.0 МБ');
}

console.log('\nИсправления против прода на месте');
{
  check('снимки не греются все сразу',
    /requestIdleCallback/.test(backdrop),
    'прод грел все пять при открытии вопроса — около 14.5 МБ');
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
