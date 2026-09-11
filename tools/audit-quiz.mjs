// Сверяет ответы, реально доступные на страницах, с таблицей весов.
import { readFileSync } from 'node:fs';
const quiz = JSON.parse(readFileSync('web/src/data/quiz.en.json', 'utf8'));
const W = JSON.parse(readFileSync('web/src/data/answer-weights.json', 'utf8'));

const onPage = new Map();      // код -> сколько кнопок его ставят
const clickable = new Set();   // код доступен пользователю
for (const [qid, q] of Object.entries(quiz)) {
  if (qid.startsWith('_')) continue;
  for (const a of q.answers ?? []) {
    onPage.set(a.code, (onPage.get(a.code) ?? 0) + 1);
    if (!a.hidden) clickable.add(a.code);
  }
}
const inWeights = new Set(Object.keys(W));

const unreachable = [...inWeights].filter((c) => !clickable.has(c)).sort();
const noWeight = [...onPage.keys()].filter((c) => !inWeights.has(c)).sort();
const duplicated = [...onPage.entries()].filter(([, n]) => n > 1).map(([c]) => c);
const hidden = [];
for (const [qid, q] of Object.entries(quiz)) {
  if (qid.startsWith('_')) continue;
  for (const a of q.answers ?? []) if (a.hidden) hidden.push(`${a.code} — "${a.label}"`);
}

console.log(`вопросов: ${Object.keys(quiz).filter((k) => !k.startsWith('_')).length}`);
console.log(`ответов на страницах: ${[...onPage.keys()].length} | в таблице весов: ${inWeights.size}`);

console.log(`\nНЕДОСТИЖИМЫ (вес есть, кнопки нет или скрыта) — ${unreachable.length}:`);
for (const c of unreachable) console.log('  ' + c);

console.log(`\nБЕЗ ВЕСА (кнопка есть, веса нет) — ${noWeight.length}:`);
for (const c of noWeight) console.log('  ' + c);

console.log(`\nДУБЛИ КОДА (одна кнопка перекрывает другую) — ${duplicated.length}:`);
for (const c of duplicated) console.log('  ' + c);

console.log(`\nСКРЫТЫЕ КНОПКИ — ${hidden.length}:`);
for (const h of hidden) console.log('  ' + h);
