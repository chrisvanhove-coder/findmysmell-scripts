/**
 * Сверка шаров детства с продом.
 *
 * Запуск:  cd web && npm run check:blobs
 *
 * Проверяется не вид, а перенос: коды ответов должны совпасть с
 * quiz.en.json (иначе ответ уйдёт под несуществующим кодом и вопрос
 * выпадет из подсчёта), а шары, цвета и скорости — с тем, что стоит на
 * живом сайте. Скорости в проде были заданы на КАДР, здесь на СЕКУНДУ,
 * поэтому сверяется отношение ×60, а не само число.
 */
import { readFileSync } from 'node:fs';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const data = JSON.parse(readFileSync('src/data/childhood-blobs.json', 'utf8'));
const quiz = JSON.parse(readFileSync('src/data/quiz.en.json', 'utf8'));
const prod = readFileSync('../webflow/live-pages/q-env-child.footer.html', 'utf8');
const component = readFileSync('src/components/quiz/ChildhoodBlobs.tsx', 'utf8');
const css = readFileSync('src/components/quiz/childhood-blobs.module.css', 'utf8');

console.log('\nОтветы совпадают с квизом');
{
  const codes = quiz.Q_ENV_CHILD.answers.map((a: { code: string }) => a.code);
  const mine = data.answers.map((a: { code: string }) => a.code);
  check('те же четыре кода и в том же порядке',
    JSON.stringify(mine) === JSON.stringify(codes),
    `${mine.join(', ')}\n        против ${codes.join(', ')}`);

  // В проде каждый код был привязан к своему углу. Перепутанные углы
  // означали бы, что человек нажимает «BY THE SEA», а уходит «CITY».
  // data-key в разметке прода → код ответа в keyMap скрипта прода.
  const keyToCode: Record<string, string> = {};
  for (const [, key, code] of prod.matchAll(/(\w+):\s*'(Q_ENV_CHILD__\w+)'/g)) {
    keyToCode[key] = code;
  }
  // угол в разметке прода → data-key.
  const cornerToKey: Record<string, string> = {};
  for (const [, corner, key] of prod.matchAll(/class="ans (\w\w)" data-key="(\w+)"/g)) {
    cornerToKey[corner] = key;
  }
  for (const a of data.answers as Array<{ code: string; corner: string }>) {
    const prodCode = keyToCode[cornerToKey[a.corner]];
    check(`угол ${a.corner} — ${a.code}`, prodCode === a.code,
      `в проде там ${prodCode}`);
  }

  const labels = [...prod.matchAll(/class="ans \w\w"[^>]*>([^<]+)</g)].map((m) => m[1]);
  for (const a of data.answers as Array<{ label: string }>) {
    check(`подпись «${a.label}» как в проде`, labels.includes(a.label),
      `в проде: ${labels.join(' | ')}`);
  }
}

console.log('\nШары те же');
{
  const prodBlobs = [...prod.matchAll(
    /\{\s*x:([-\d.]+),\s*y:([-\d.]+),\s*r:([-\d.]+),\s*vx:([-\d.]+),\s*vy:([-\d.]+),\s*phase:([-\d.]+)/g,
  )].map((m) => ({
    x: +m[1], y: +m[2], r: +m[3], vx: +m[4], vy: +m[5], phase: +m[6],
  }));

  check('шаров четыре', data.blobs.length === 4 && prodBlobs.length === 4,
    `у нас ${data.blobs.length}, в проде ${prodBlobs.length}`);

  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  data.blobs.forEach((b: Record<string, number>, i: number) => {
    const p = prodBlobs[i];
    if (!p) return;
    check(`шар ${i + 1}: место, размер и фаза`,
      near(b.x, p.x) && near(b.y, p.y) && near(b.r, p.r) && near(b.phase, p.phase),
      `${JSON.stringify(b)}\n        против ${JSON.stringify(p)}`);
    // Тот же путь в секунду, что в проде давал 60 кадров.
    check(`шар ${i + 1}: скорость — ровно прод × 60`,
      Math.abs(b.vx - p.vx * 60) < 1e-9 && Math.abs(b.vy - p.vy * 60) < 1e-9,
      `${b.vx} / ${b.vy} против ${p.vx * 60} / ${p.vy * 60}`);
  });
}

console.log('\nЦвета те же');
{
  check('шары терракотовые как в проде',
    prod.includes(data.blob), data.blob);
  check('поле шалфейное как в проде',
    prod.includes(data.paper), data.paper);
  check('цвет поля стоит и в css по умолчанию',
    css.includes(data.paper),
    'без него экран на миг просвечивает общим фоном страницы');

  const q = prod.match(/id="question">([^<]*)<br>([^<]*)</);
  check('вопрос теми же двумя строками',
    !!q && data.question[0] === q[1].trim() && data.question[1] === q[2].trim(),
    `${JSON.stringify(data.question)} против ${JSON.stringify(q?.slice(1))}`);
}

console.log('\nИсправления против прода на месте');
{
  // Самое важное: в проде движение считалось на кадр, и на экране 120 Гц
  // шары ехали вдвое быстрее. Признак — множитель времени в шаге.
  check('шаг считается от времени, а не от кадра',
    /b\.x \+= b\.vx \* dt/.test(component) && /b\.y \+= b\.vy \* dt/.test(component),
    'иначе скорость зависит от частоты экрана');
  check('разрыв времени ограничен сверху',
    /Math\.min\(\(ts - last\) \/ 1000, 0\.1\)/.test(component),
    'после спрятанной вкладки шары иначе прыгают на пол-экрана');
  check('холст в размере устройства',
    /devicePixelRatio/.test(component) && /setTransform\(dpr/.test(component));
  check('ответы — настоящие кнопки с type',
    /<button\b[\s\S]*?type="button"/.test(component),
    'в проде это были div с обработчиком click: ни клавиатуры, ни читалки');
  check('второй клик после выбора не уводит не туда',
    /disabled=\{picked !== null\}/.test(component));
  check('учтён prefers-reduced-motion',
    /prefers-reduced-motion: reduce/.test(component) && /if \(!still\)/.test(component));
  check('слушатели снимаются',
    /removeEventListener\('resize'/.test(component)
    && /removeEventListener\('visibilitychange'/.test(component));
  // Пояснения в комментариях слово «Grain» упоминают законно, поэтому
  // ищем не слово, а сам приём: второй холст и попиксельный шум.
  const code = component.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('своего зерна на экране нет — оно общее',
    !/createImageData|putImageData/.test(code) && (code.match(/<canvas/g) ?? []).length === 1,
    'прод рисовал зерно на каждой странице заново, самым дорогим способом');
  check('данные из json не двигаются на месте',
    /BLOBS\.map\(\(b\) => \(\{ \.\.\.b \}\)\)/.test(component),
    'иначе при повторном входе на вопрос шары начнут не с начала');
}

console.log('\nМеханика подключена к вопросу');
{
  const reg = readFileSync('src/components/quiz/mechanics.ts', 'utf8');
  check('Q_ENV_CHILD в реестре механик',
    /Q_ENV_CHILD: dynamic\(\(\) => import\('\.\/ChildhoodBlobs'\)/.test(reg));
  check('без серверного рендера',
    /import\('\.\/ChildhoodBlobs'\), \{ ssr: false \}/.test(reg),
    'компонент читает размер окна');
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
