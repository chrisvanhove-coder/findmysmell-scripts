// Сравнивает старый движок подсчёта (как он работает в проде) с портированным.
// Цель — доказать, что смысловая часть не изменилась.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const html = readFileSync('webflow/page-q-open-footer.html', 'utf8');
const W = runInContext('(' + html.match(/window\.ANSWER_WEIGHTS\s*=\s*(\{[\s\S]*?\n\});/)[1] + ')', createContext({}));
const NEW = JSON.parse(readFileSync('web/src/data/answer-weights.json', 'utf8'));

// 1. Таблица весов идентична?
const kOld = Object.keys(W).sort(), kNew = Object.keys(NEW).sort();
let identical = kOld.length === kNew.length && kOld.every((k, i) => k === kNew[i]);
for (const k of kOld) if (JSON.stringify(W[k]) !== JSON.stringify(NEW[k])) identical = false;
console.log('Таблица весов совпадает побайтово:', identical, `(${kOld.length} вариантов)`);

// 2. Старый алгоритм, скопированный из прода дословно
const ARCH = ['CEO','HUG','OFFGRID','JAPAN','SUMMER','OUTOFTIME','THERAPIST'];
function oldEngine(answers) {
  const scores = {}; ARCH.forEach(a => scores[a] = 0);
  Object.values(answers).forEach(code => {
    const w = W[code]; if (!w) return;
    ARCH.forEach(a => scores[a] += Number(w[a] || 0));
  });
  let maxScore = -Infinity;
  ARCH.forEach(a => { if (scores[a] > maxScore) maxScore = scores[a]; });
  const tied = ARCH.filter(a => scores[a] === maxScore);
  return { scores, tied, maxScore };
}

// 3. Новый — та же логика, порядок ARCHETYPE_KEYS из archetype-colors.ts
const NEW_ORDER = ['CEO','JAPAN','HUG','OFFGRID','OUTOFTIME','SUMMER','THERAPIST'];
const TIE = 3;
function newEngine(answers) {
  const scores = {}; NEW_ORDER.forEach(a => scores[a] = 0);
  for (const code of Object.values(answers)) {
    const w = NEW[code]; if (!w) continue;
    for (const a of NEW_ORDER) scores[a] += Number(w[a] ?? 0);
  }
  let winner = NEW_ORDER[0];
  for (const a of NEW_ORDER) if (scores[a] > scores[winner]) winner = a;
  let secondary = null;
  for (const a of NEW_ORDER) {
    if (a === winner) continue;
    if (Math.abs(scores[a] - scores[winner]) > TIE) continue;
    if (!secondary || scores[a] > scores[secondary]) secondary = a;
  }
  return { scores, winner, secondary };
}

// 4. Прогон по случайным прохождениям квиза
const byQuestion = {};
for (const code of Object.keys(W)) (byQuestion[code.split('__')[0]] ??= []).push(code);
const questions = Object.keys(byQuestion);
const EMO = ['Q_CALM','Q_ENERGY','Q_COZY','Q_MYST','Q_SEXY','Q_FOCUS','Q_PLAY'];

let n = 0, scoreMismatch = 0, winnerDiff = 0, tieCases = 0;
for (let i = 0; i < 200000; i++) {
  const answers = {};
  const branch = EMO[Math.floor(Math.random() * EMO.length)];
  for (const q of questions) {
    if (EMO.includes(q) && q !== branch) continue; // ветвление по эмоции
    const opts = byQuestion[q];
    answers[q] = opts[Math.floor(Math.random() * opts.length)];
  }
  const o = oldEngine(answers), nw = newEngine(answers);
  n++;
  for (const a of ARCH) if (o.scores[a] !== nw.scores[a]) scoreMismatch++;
  if (o.tied.length > 1) { tieCases++; if (!o.tied.includes(nw.winner)) winnerDiff++; }
  else if (o.tied[0] !== nw.winner) winnerDiff++;
}
console.log(`\nПрогонов: ${n.toLocaleString('ru')}`);
console.log('Расхождений в баллах:        ', scoreMismatch);
console.log('Победитель вне множества старого:', winnerDiff);
console.log(`Ничьих (где старый бросал кубик): ${tieCases} (${(tieCases/n*100).toFixed(1)}%)`);
