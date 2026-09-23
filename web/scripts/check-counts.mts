/**
 * Одно число вопросов на весь сайт.
 *
 * Запуск:  cd web && npm run check:counts
 *
 * ЗАЧЕМ. На живом сайте число вопросов названо трижды и каждый раз
 * по-разному: «Twelve questions» в шагах на главной, «Answer 7 questions»
 * в метаописании, а вопросов 17. Заказчица подтвердила 17 и попросила
 * писать 17. Проверка следит, чтобы число нигде не было вписано руками:
 * везде подстановка из TOTAL_STEPS.
 */
import { readFileSync } from 'node:fs';
import { TOTAL_STEPS, QUESTIONS, EMOTION_BRANCHES } from '../src/lib/quiz.ts';
import home from '../src/data/home.en.json' with { type: 'json' };

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

console.log('\nСколько вопросов на самом деле');
{
  check('TOTAL_STEPS равен 17', TOTAL_STEPS === 17, String(TOTAL_STEPS));

  // Пересчёт из самих данных, а не из константы: 16 вопросов линейного
  // пути (без закрывающего Q_OPEN) плюс одна ветка эмоции.
  const all = Object.keys(QUESTIONS);
  const branches = all.filter((id) => (EMOTION_BRANCHES as readonly string[]).includes(id));
  const linear = all.filter((id) => !branches.includes(id) && id !== 'Q_OPEN');
  check('в данных 16 линейных вопросов', linear.length === 16, String(linear.length));
  check('и семь ветвей эмоции', branches.length === 7, String(branches.length));
  check('16 + одна ветка = TOTAL_STEPS', linear.length + 1 === TOTAL_STEPS);
  check('всего экранов с вопросами 24', all.length === 24, String(all.length));
}

console.log('\nЧисло нигде не вписано руками');
{
  const files = [
    'src/data/home.en.json',
    'src/app/[locale]/layout.tsx',
    'src/app/[locale]/page.tsx',
  ];
  // Слова-числа из прода и любые «N questions» кроме подстановки.
  const words = /\b(twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|seven|twenty)\s+questions?\b/i;
  const digits = /\b(\d{1,2})\s+questions?\b/i;

  // Комментарии выбрасываем: в них числа прода упомянуты законно — там
  // объяснено, что было не так. Иначе проверка ловит объяснение вместо
  // ошибки.
  const strip = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  for (const f of files) {
    const src = strip(readFileSync(f, 'utf8'));
    const w = src.match(words);
    check(`${f}: нет числа словом`, !w, w ? `найдено «${w[0]}»` : '');
    const d = src.match(digits);
    check(`${f}: нет числа цифрами`, !d, d ? `найдено «${d[0]}»` : '');
  }

  check('в шагах главной стоит подстановка {N}',
    home.steps.some((s) => s.desc.includes('{N}')),
    'иначе число снова разойдётся с TOTAL_STEPS');
  /* Метаописание переехало в generateMetadata и стало двуязычным:
     английская строка лежит там же запасным вариантом, а число в неё
     подставляется через fill({ n: TOTAL_STEPS }). Проверяем оба конца —
     что в тексте стоит место под число и что туда идёт именно
     TOTAL_STEPS, а не вписанная руками цифра. */
  const layout = readFileSync('src/app/[locale]/layout.tsx', 'utf8');
  check('в метаописании стоит подстановка {n}', layout.includes('{n} questions'));
  check('метаописание собирается из TOTAL_STEPS',
    /\{\s*n:\s*TOTAL_STEPS\s*\}/.test(layout));
}

console.log('\nШаги главной на месте');
{
  check('три шага', home.steps.length === 3, String(home.steps.length));
  check('номера 01, 02, 03',
    home.steps.map((s) => s.num).join(',') === '01,02,03',
    home.steps.map((s) => s.num).join(','));
  for (const s of home.steps) {
    check(`${s.num}: есть название и текст`, Boolean(s.label && s.desc.length > 30));
  }
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
