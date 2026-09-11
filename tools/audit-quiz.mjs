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

// Намеренно не считаем дырами: скрытые кнопки (убраны из квиза решением
// редактора), коды материков (вопрос отвечается поиском по странам)
// и Q_OPEN__OPEN (там свободный текст, кнопки нет по замыслу).
const retiredSrc = readFileSync('web/src/data/retired-answers.ts', 'utf8');
const RETIRED = new Set([...retiredSrc.matchAll(/^\s\s(Q_[A-Z_]+):/gm)].map((m) => m[1]));
const BY_DESIGN = (c) =>
  c.startsWith('Q_REGION_NOW__') || c.startsWith('Q_REGION_CHILD__') ||
  c === 'Q_OPEN__OPEN' || RETIRED.has(c);
const unreachable = [...inWeights].filter((c) => !clickable.has(c) && !BY_DESIGN(c)).sort();
const noWeight = [...onPage.keys()].filter((c) => !inWeights.has(c)).sort();
const duplicated = [...onPage.entries()].filter(([, n]) => n > 1).map(([c]) => c);
const hidden = [];
for (const [qid, q] of Object.entries(quiz)) {
  if (qid.startsWith('_')) continue;
  for (const a of q.answers ?? []) if (a.hidden) hidden.push(`${a.code} — "${a.label}"`);
}

console.log(`вопросов: ${Object.keys(quiz).filter((k) => !k.startsWith('_')).length}`);
console.log(`ответов на страницах: ${[...onPage.keys()].length} | в таблице весов: ${inWeights.size}`);

console.log(`\nНЕДОСТИЖИМЫ, не по замыслу (вес есть, кнопки нет) — ${unreachable.length}:`);
for (const c of unreachable) console.log('  ' + c);

console.log(`\nБЕЗ ВЕСА (кнопка есть, веса нет) — ${noWeight.length}:`);
for (const c of noWeight) console.log('  ' + c);

console.log(`\nДУБЛИ КОДА (одна кнопка перекрывает другую) — ${duplicated.length}:`);
for (const c of duplicated) console.log('  ' + c);

console.log(`\nВЫВЕДЕНЫ ИЗ КВИЗА НАМЕРЕННО — ${RETIRED.size}:`);
for (const c of [...RETIRED].sort()) {
  const reason = retiredSrc.match(new RegExp(c + ":\\s*'([^']+)'"))?.[1] ?? '';
  console.log(`  ${c.padEnd(24)} ${reason}`);
}
