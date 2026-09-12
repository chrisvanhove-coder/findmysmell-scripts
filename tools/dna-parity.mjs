// Сверяет портированный движок Scent DNA с продовым.
//
// Запуск:  cd web && npx tsx ../tools/dna-parity.mjs
//
// tsx нужен, потому что скрипт импортирует не копию логики, а сам
// web/src/lib/dna.ts — тот самый модуль, который поедет в прод. Это
// сильнее, чем сверка с переписанным рядом алгоритмом: расхождение между
// проверяемым и работающим кодом здесь невозможно по построению.
//
// Прод исполняется в vm и опрашивается через sessionStorage, как в браузере.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, run } from './legacy-vm.mjs';
import { dnaFrom } from '../web/src/lib/dna.ts';

const ARCH = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];
const AXES = ['sweetness', 'rawEdge', 'projection', 'warmth', 'depth'];

const weights = JSON.parse(readFileSync(join(root, 'web/src/data/answer-weights.json'), 'utf8'));
const quiz = JSON.parse(readFileSync(join(root, 'web/src/data/quiz.en.json'), 'utf8'));

// Вопрос -> его варианты ответа. Нужно, чтобы генерировать правдоподобные
// прохождения: один ответ на вопрос, а не случайный набор кодов.
const byQuestion = new Map();
for (const q of Object.values(quiz)) {
  const codes = (q.answers ?? []).map((a) => a.code).filter((c) => c in weights);
  if (codes.length) byQuestion.set(q.id ?? codes[0], codes);
}
if (!byQuestion.size) {
  // Запасной разбор: коды устроены как Q_ВОПРОС__ОТВЕТ.
  for (const code of Object.keys(weights)) {
    const q = code.split('__')[0];
    if (!byQuestion.has(q)) byQuestion.set(q, []);
    byQuestion.get(q).push(code);
  }
}

// Детерминированный генератор — прогон воспроизводится.
let seed = 20260912;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const questions = [...byQuestion.keys()];

function randomAnswers() {
  const answers = {};
  // Часть вопросов пропускаем: в реальном прохождении ветвление не даёт
  // ответить на все, и движок обязан это переживать.
  for (const q of questions) {
    if (rnd() < 0.25) continue;
    answers[q] = pick(byQuestion.get(q));
  }
  return answers;
}

// Прод грузится один раз на набор ответов: движок читает хранилище
// в момент вызова, а хранилище задаётся при создании контекста.
function prodDna(answers, archetype) {
  const { win } = run('result48.js', { quiz_answers: JSON.stringify(answers) });
  return win.FMS_DNA.calculate(archetype);
}

const CASES = Number(process.argv[2] ?? 400);
const seen = Object.fromEntries(AXES.map((a) => [a, new Set()]));
let checked = 0;
let mismatches = 0;
const examples = [];

// 1. Дефолты: квиз не пройден
for (const a of ARCH) {
  const prod = prodDna({}, a);
  const ours = dnaFrom({}, a);
  checked++;
  for (const axis of AXES) {
    if (Math.abs(prod[axis] - ours[axis]) > 1e-9) {
      mismatches++;
      examples.push(`дефолт ${a}.${axis}: прод ${prod[axis]} ≠ наш ${ours[axis]}`);
      break;
    }
  }
}

// 2. Случайные прохождения
for (let i = 0; i < CASES; i++) {
  const answers = randomAnswers();
  const archetype = pick(ARCH);
  const prod = prodDna(answers, archetype);
  const ours = dnaFrom(answers, archetype);
  checked++;
  for (const axis of AXES) seen[axis].add(Number(prod[axis].toFixed(6)));
  for (const axis of AXES) {
    if (Math.abs(prod[axis] - ours[axis]) > 1e-9) {
      mismatches++;
      if (examples.length < 5) {
        examples.push(
          `${archetype}.${axis}: прод ${prod[axis]} ≠ наш ${ours[axis]}\n    ответы: ${JSON.stringify(answers)}`,
        );
      }
      break;
    }
  }
}

// 3. Поправка «на коже» — отдельно, она легко теряется при переносе
for (const skin of ['Q_SKIN_BEHAVIOR__SWEETER', 'Q_SKIN_BEHAVIOR__SHARPER']) {
  for (const sweet of Object.keys(weights).filter((c) => c.startsWith('Q_SWEET__'))) {
    const answers = { Q_SWEET: sweet, Q_SKIN_BEHAVIOR: skin };
    const prod = prodDna(answers, 'CEO');
    const ours = dnaFrom(answers, 'CEO');
    checked++;
    if (Math.abs(prod.sweetness - ours.sweetness) > 1e-9) {
      mismatches++;
      examples.push(`${sweet} + ${skin}: прод ${prod.sweetness} ≠ наш ${ours.sweetness}`);
    }
  }
}

console.log(`Scent DNA: сверено прохождений ${checked}, расхождений ${mismatches}`);

// Само число прогонов ничего не доказывает, если все они дали одно и то же.
// Поэтому отдельно показываем, насколько широко разошлись значения осей.
for (const axis of AXES) {
  const vals = seen[axis];
  console.log(
    `  ${axis}: различных значений ${vals.size}, от ${Math.min(...vals).toFixed(2)} до ${Math.max(...vals).toFixed(2)}`,
  );
}
for (const e of examples) console.log('  ✗ ' + e);
if (mismatches) process.exitCode = 1;
else console.log('Движок совпадает с продовым по всем пяти осям.');
