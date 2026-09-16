/**
 * Сверка «живых» экранов Q_DAYTDAY и Q_STAYWELL с продом.
 *
 * Запуск:  cd web && npm run check:living
 *
 * Сверяются цвета, пятна, линии и числа анимаций с тем, что стоит на
 * живом сайте, и отдельно — что скорости переведены из «на кадр»
 * в «в секунду» ровно множителем 60. Текст вариантов НЕ сверяется с
 * продом намеренно: в проде на этих двух экранах показывался
 * укороченный текст, а я оставил полный из quiz.en.json. Проверяется,
 * что он берётся именно из квиза и ни один код не потерян.
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

const data = JSON.parse(readFileSync('src/data/living-screens.json', 'utf8'));
const quiz = JSON.parse(readFileSync('src/data/quiz.en.json', 'utf8'));
const prodDay = readFileSync('../webflow/live-pages/q-daytday.footer.html', 'utf8');
const prodWell = readFileSync('../webflow/live-pages/q-staywell.footer.html', 'utf8');
const pasta = readFileSync('src/components/quiz/PastaOptions.tsx', 'utf8');
const wave = readFileSync('src/components/quiz/WaveOptions.tsx', 'utf8');
const pastaCss = readFileSync('src/components/quiz/pasta-options.module.css', 'utf8');
const waveCss = readFileSync('src/components/quiz/wave-options.module.css', 'utf8');
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

console.log('\nQ_DAYTDAY: цвета и текст вопроса как в проде');
{
  const cfg = data.Q_DAYTDAY;
  check('поле #c0c0ac', prodDay.includes(cfg.paper), cfg.paper);
  check('вопрос терракотовый', prodDay.includes(cfg.questionInk), cfg.questionInk);
  check('варианты #272727', prodDay.includes(cfg.optionInk), cfg.optionInk);
  check('цвет поля стоит и в css по умолчанию', pastaCss.includes(cfg.paper));

  const q = prodDay.match(/questionEl\.textContent = '([^']+)'/);
  check('тот же текст вопроса', q?.[1] === cfg.question,
    `${cfg.question}\n        против ${q?.[1]}`);
  check('приглушение остальных 0.15',
    cfg.dim === 0.15 && /opacity:\s*0\.15/.test(prodDay), String(cfg.dim));
}

console.log('\nQ_DAYTDAY: пятна те же, скорости — прод × 60');
{
  const prodBlobs = [...prodDay.matchAll(
    /\{\s*x:\s*([-\d.]+),\s*y:\s*([-\d.]+),\s*r:\s*([-\d.]+),\s*vx:\s*([-\d.]+),\s*vy:\s*([-\d.]+),\s*phase:\s*([-\d.]+),\s*color:\s*'rgba\(([^,]+),\s*([^,]+),\s*([^,]+),/g,
  )].map((m) => ({
    x: +m[1], y: +m[2], r: +m[3], vx: +m[4], vy: +m[5], phase: +m[6],
    rgb: `${m[7].trim()}, ${m[8].trim()}, ${m[9].trim()}`,
  }));
  check('в проде пять пятен', prodBlobs.length === 5, String(prodBlobs.length));
  check('и у нас пять', data.Q_DAYTDAY.blobs.length === 5);

  data.Q_DAYTDAY.blobs.forEach((b: Record<string, number | string>, i: number) => {
    const p = prodBlobs[i];
    if (!p) return;
    check(`пятно ${i + 1}: место, размер, фаза и цвет`,
      near(b.x as number, p.x) && near(b.y as number, p.y)
      && near(b.r as number, p.r) && near(b.phase as number, p.phase)
      && b.rgb === p.rgb,
      `${JSON.stringify(b)}\n        против ${JSON.stringify(p)}`);
    check(`пятно ${i + 1}: скорость — ровно прод × 60`,
      Math.abs((b.vx as number) - p.vx * 60) < 1e-9
      && Math.abs((b.vy as number) - p.vy * 60) < 1e-9,
      `${b.vx} / ${b.vy} против ${p.vx * 60} / ${p.vy * 60}`);
  });

  // Остальные числа анимации — прямо в коде компонента.
  for (const [what, re] of [
    ['дрожание формы 0.06', /WOBBLE_AMP = 0\.06/],
    ['наклон 0.4', /TILT_AMP = 0\.4/],
    ['время пятен 0.48 в секунду (0.008 на кадр)', /TIME_RATE = 0\.48/],
    ['затухание 1.08 в секунду (0.018 на кадр)', /FADE_RATE = 1\.08/],
    ['падение 520–740 мс', /520 \+ Math\.random\(\) \* 220/],
    ['разброс по горизонтали ±250', /Math\.random\(\) - 0\.5\) \* 500/],
    ['наклон при падении ±35°', /Math\.random\(\) - 0\.5\) \* 70/],
    ['ускорение пылинок 432 px/с² (0.12 на кадр²)', /GRAVITY = 432/],
  ] as Array<[string, RegExp]>) {
    check(what, re.test(pasta));
  }
}

console.log('\nQ_STAYWELL: цвета, текст и линии как в проде');
{
  const cfg = data.Q_STAYWELL;
  check('поле #953d27', prodWell.includes(cfg.paper), cfg.paper);
  check('вопрос кремовый', prodWell.includes(cfg.questionInk), cfg.questionInk);
  check('варианты #272727', prodWell.includes(cfg.optionInk), cfg.optionInk);
  check('активный песочный #f1e09b', prodWell.includes(cfg.activeInk), cfg.activeInk);
  check('цвет поля стоит и в css по умолчанию', waveCss.includes(cfg.paper));

  const q = prodWell.match(/questionEl\.textContent = '([^']+)'/);
  check('тот же текст вопроса', q?.[1] === cfg.question,
    `${cfg.question}\n        против ${q?.[1]}`);
  check('приглушение остальных 0.2',
    cfg.dim === 0.2 && /opacity:\s*0\.2\s*!important/.test(prodWell), String(cfg.dim));

  check('линий двенадцать',
    cfg.lineCount === 12 && /length:\s*12\s*\}/.test(prodWell), String(cfg.lineCount));
  check('цвет линий тот же',
    prodWell.includes(`rgba(${cfg.lineRgb}`), cfg.lineRgb);

  for (const [what, re] of [
    ['амплитуда 8–28', /amplitude: 8 \+ Math\.random\(\) \* 20/],
    ['частота 0.003–0.007', /freq: 0\.003 \+ Math\.random\(\) \* 0\.004/],
    ['скорость 0.0004–0.001', /speed: 0\.0004 \+ Math\.random\(\) \* 0\.0006/],
    ['прозрачность 0.18–0.40', /opacity: 0\.18 \+ Math\.random\(\) \* 0\.22/],
    ['толщина 0.4–1.2', /thickness: 0\.4 \+ Math\.random\(\) \* 0\.8/],
    ['время линий 5.4 в секунду (0.09 на кадр)', /LINE_RATE = 5\.4/],
    ['дыхание 1.08 в секунду (0.018 на кадр)', /BREATHE_RATE = 1\.08/],
    ['дыхание ±2.5px по вертикали', /BREATHE_Y = 2\.5/],
    ['дыхание ±1.5px по горизонтали', /BREATHE_X = 1\.5/],
    ['фаза 0.55 на строку', /BREATHE_PHASE = 0\.55/],
    ['варианты через 110 мс', /OPTION_GAP_MS = 110/],
    ['первый на 400 мс', /FIRST_OPTION_MS = 400/],
    ['уход по 55 мс на строку', /EXIT_STEP_MS = 55/],
  ] as Array<[string, RegExp]>) {
    check(what, re.test(wave));
  }
}

console.log('\nТекст вариантов — как на живом сайте, код — из квиза');
{
  /* Заказчица: «Я же тебе скрин присылала что у меня сейчас на сайте.
     Возьми там». Поэтому показываем текст прода, а не полные
     формулировки из quiz.en.json. Сверяем посимвольно с прод-кодом:
     разойтись это может молча. Апострофы приводим к одному виду —
     в проде прямой, на сайте типографский. */
  const apos = (t: string) => t.replace(/[\u2019']/g, "'").trim();
  for (const [qid, prod] of [['Q_DAYTDAY', prodDay], ['Q_STAYWELL', prodWell]] as Array<[string, string]>) {
    const prodText: Record<string, string> = {};
    // В проде часть строк в одинарных кавычках, часть в двойных (там,
    // где внутри апостроф). Поэтому две группы, и берём непустую.
    for (const [, code, single, double] of prod.matchAll(
      /key:\s*'(Q_\w+)',\s*text:\s*(?:'([^']*)'|"([^"]*)")/g,
    )) {
      prodText[code] = single ?? double;
    }
    const mine = data[qid].options as Record<string, string>;
    check(`${qid}: текст нашёлся в прод-коде для всех вариантов`,
      Object.keys(prodText).length === Object.keys(mine).length,
      `в проде ${Object.keys(prodText).length}, у нас ${Object.keys(mine).length}`);
    for (const [code, text] of Object.entries(mine)) {
      check(`${qid} / ${code}: «${text}»`,
        apos(prodText[code] ?? '') === apos(text),
        `в проде «${prodText[code]}»`);
    }
  }

  for (const [qid, src] of [['Q_DAYTDAY', pasta], ['Q_STAYWELL', wave]] as Array<[string, string]>) {
    check(`${qid}: коды берутся из QUESTIONS, а не переписаны`,
      new RegExp(`QUESTIONS\\.${qid}\\.answers`).test(src),
      'иначе набор вариантов разойдётся с квизом, и это не заметит никто');
    check(`${qid}: на экране показывается текст сайта`,
      /TEXT\[code\] \?\?/.test(src),
      'с честным откатом на полную формулировку, если текста нет');
    // И все коды прода на месте — ни один вариант не потерян.
    const prod = qid === 'Q_DAYTDAY' ? prodDay : prodWell;
    const prodCodes = [...prod.matchAll(new RegExp(`'(${qid}__\\w+)'`, 'g'))]
      .map((m) => m[1]);
    const quizCodes = quiz[qid].answers.map((a: { code: string }) => a.code);
    check(`${qid}: те же ${prodCodes.length} кодов, что в проде`,
      prodCodes.length > 0 && prodCodes.every((c) => quizCodes.includes(c))
      && prodCodes.length === quizCodes.length,
      `в квизе ${quizCodes.join(', ')}\n        в проде ${prodCodes.join(', ')}`);
  }
}

console.log('\nИсправления против прода на месте');
{
  for (const [what, src, re] of [
    ['Q_DAYTDAY: шаг пятен от времени', pasta, /b\.x \+= b\.vx \* dt/],
    ['Q_DAYTDAY: разрыв времени ограничен', pasta, /Math\.min\(\(ts - last\) \/ 1000, 0\.1\)/],
    ['Q_DAYTDAY: холст в размере устройства', pasta, /setTransform\(dpr/],
    ['Q_DAYTDAY: варианты — кнопки', pasta, /<button/],
    ['Q_DAYTDAY: учтён prefers-reduced-motion', pasta, /prefers-reduced-motion: reduce/],
    ['Q_DAYTDAY: слушатели снимаются', pasta, /removeEventListener\('resize'/],
    ['Q_DAYTDAY: пыль складывается по строкам, как на экране', pasta, /function wrap\(/],
    ['Q_STAYWELL: время линий от времени', wave, /lt \+= dt \* LINE_RATE/],
    ['Q_STAYWELL: холст в размере устройства', wave, /setTransform\(dpr/],
    ['Q_STAYWELL: варианты — кнопки', wave, /<button/],
    ['Q_STAYWELL: учтён prefers-reduced-motion', wave, /prefers-reduced-motion: reduce/],
    ['Q_STAYWELL: слушатели снимаются', wave, /removeEventListener\('resize'/],
  ] as Array<[string, string, RegExp]>) {
    check(what, re.test(src));
  }

  // Комментарии убираем: они законно упоминают letterSpacing, объясняя,
  // почему его тут нет.
  const waveCode = wave.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('Q_STAYWELL: letter-spacing каждый кадр больше не меняется',
    !/letterSpacing/.test(waveCode),
    'это заставляло браузер заново раскладывать текст 60 раз в секунду');
  check('Q_STAYWELL: дышит надпись, а не сама кнопка',
    /label\.style\.transform/.test(wave) && !/btn\.style\.transform = `translate\(/.test(wave),
    'иначе цель для щелчка навсегда уезжает из-под пальца');

  const pastaCode = pasta.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('Q_DAYTDAY: своего зерна на экране нет — оно общее',
    !/createImageData|putImageData/.test(pastaCode),
    'прод рисовал полноэкранный шум каждые 80 мс');
  check('Q_DAYTDAY: Math.random не вызывается во время отрисовки',
    !/useRef\(\s*ANSWERS\.map/.test(pastaCode),
    'непредсказуемый результат при любой лишней перерисовке');

  // !important в приглушении — необходимость, а не небрежность: падение
  // ставит opacity инлайном.
  check('Q_DAYTDAY: приглушение перебивает инлайновый opacity',
    /\.dimmed\s*\{[^}]*opacity:\s*0\.15\s*!important/.test(pastaCss),
    'без !important класс не сработал бы после падения строки');
}

console.log('\nМеханики подключены к вопросам');
{
  const reg = readFileSync('src/components/quiz/mechanics.ts', 'utf8');
  check('Q_DAYTDAY в реестре',
    /Q_DAYTDAY: dynamic\(\(\) => import\('\.\/PastaOptions'\), \{ ssr: false \}\)/.test(reg));
  check('Q_STAYWELL в реестре',
    /Q_STAYWELL: dynamic\(\(\) => import\('\.\/WaveOptions'\), \{ ssr: false \}\)/.test(reg));

  // Сквозной проход обязан уметь отвечать на новых экранах, иначе он
  // молча перестанет проверять всё, что после них.
  const flow = readFileSync('e2e/quiz-flow.mjs', 'utf8');
  check('сквозной проход умеет нажимать помеченные кнопки',
    /button\[data-answer\]/.test(flow),
    'иначе e2e падает на первом же экране с механикой');
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
