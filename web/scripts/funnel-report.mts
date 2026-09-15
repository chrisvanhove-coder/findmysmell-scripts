/**
 * Отчёт по воронке. Своя аналитика не приходит с дашбордами — вот они.
 *
 * Три вопроса, на которые он отвечает:
 *   1. Где люди уходят. Пара view/answer на каждом шаге: разница — это те,
 *      кто вопрос увидел и не ответил.
 *   2. Что выбирают. Распределение ответов внутри каждого вопроса.
 *   3. Сколько доходит до конца и сколько просит письмо.
 *
 * Запуск: npm run funnel:report            (последние 30 дней)
 *         npm run funnel:report -- 7        (последние 7 дней)
 *         npm run funnel:report -- 30 fr    (только французская локаль)
 */
import { and, gte, sql, eq } from 'drizzle-orm';
import { getDb, schema } from '../src/db/index.ts';
import { QUESTIONS, EMOTION_BRANCHES } from '../src/lib/quiz.ts';

const days = Number(process.argv[2]) || 30;
const locale = process.argv[3];

const since = new Date();
since.setUTCDate(since.getUTCDate() - days);

const db = getDb();
const f = schema.funnelEvents;
const where = locale
  ? and(gte(f.createdAt, since), eq(f.locale, locale))
  : gte(f.createdAt, since);

const rows = await db
  .select({
    step: f.step,
    event: f.event,
    answerCode: f.answerCode,
    n: sql<number>`count(*)::int`,
    runs: sql<number>`count(distinct ${f.runToken})::int`,
  })
  .from(f)
  .where(where)
  .groupBy(f.step, f.event, f.answerCode);

if (rows.length === 0) {
  console.log(`\nЗа последние ${days} дней событий нет${locale ? ` (локаль ${locale})` : ''}.\n`);
  process.exit(0);
}

const views = new Map<string, number>();
const answers = new Map<string, number>();
const byAnswer = new Map<string, Map<string, number>>();

for (const r of rows) {
  const target = r.event === 'view' ? views : answers;
  target.set(r.step, (target.get(r.step) ?? 0) + r.runs);
  if (r.event === 'answer' && r.answerCode) {
    const m = byAnswer.get(r.step) ?? new Map();
    m.set(r.answerCode, (m.get(r.answerCode) ?? 0) + r.runs);
    byAnswer.set(r.step, m);
  }
}

/** Порядок шагов: основной путь, ветки эмоции сразу после Q_EMO. */
const ORDER: string[] = [];
for (const id of Object.keys(QUESTIONS)) {
  if ((EMOTION_BRANCHES as readonly string[]).includes(id)) continue;
  ORDER.push(id);
  if (id === 'Q_EMO') ORDER.push(...EMOTION_BRANCHES);
}
ORDER.push('RESULT', 'EMAIL_SENT');

const seen = [...views.keys(), ...answers.keys()];
const steps = ORDER.filter((s) => seen.includes(s));

const head = views.get(steps[0]) ?? 0;
const pct = (n: number) => (head ? `${((n / head) * 100).toFixed(1)}%` : '—');

console.log(`\nВоронка за ${days} дн.${locale ? `, локаль ${locale}` : ''} — по прохождениям, не по событиям\n`);
console.log(`${'шаг'.padEnd(17)} ${'дошли'.padStart(7)} ${'ответили'.padStart(9)} ${'ушли тут'.padStart(9)} ${'от начала'.padStart(10)}`);
console.log('-'.repeat(58));

for (const s of steps) {
  const v = views.get(s) ?? 0;
  const a = answers.get(s) ?? 0;
  const lost = Math.max(0, v - a);
  const isBranch = (EMOTION_BRANCHES as readonly string[]).includes(s);
  const label = (isBranch ? `  └ ${s}` : s).padEnd(17);
  const lostCol = s === 'RESULT' || s === 'EMAIL_SENT' ? '—' : String(lost);
  console.log(`${label} ${String(v).padStart(7)} ${String(a).padStart(9)} ${lostCol.padStart(9)} ${pct(v).padStart(10)}`);
}

const result = views.get('RESULT') ?? 0;
const emails = answers.get('EMAIL_SENT') ?? 0;
console.log('-'.repeat(58));
console.log(`начали: ${head}   дошли до результата: ${result} (${pct(result)})   попросили письмо: ${emails}${result ? ` (${((emails / result) * 100).toFixed(1)}% от дошедших)` : ''}`);

console.log('\n\nЧто выбирают\n');
for (const s of steps) {
  const m = byAnswer.get(s);
  if (!m || m.size === 0) continue;
  const total = [...m.values()].reduce((x, y) => x + y, 0);
  console.log(`${s}  (${total})`);
  for (const [code, n] of [...m].sort((a, b) => b[1] - a[1])) {
    const share = ((n / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.max(1, Math.round((n / total) * 28)));
    console.log(`   ${code.replace(s + '__', '').padEnd(16)} ${String(n).padStart(5)} ${share.padStart(5)}%  ${bar}`);
  }
  console.log();
}

// Архетипы берём из прохождений: в воронке победителя нет намеренно —
// он вычисляется из ответов и живёт в submissions под своим согласием.
try {
  const arch = await db
    .select({ winner: schema.submissions.winner, n: sql<number>`count(*)::int` })
    .from(schema.submissions)
    .where(gte(schema.submissions.createdAt, since))
    .groupBy(schema.submissions.winner);
  if (arch.length) {
    const total = arch.reduce((s, a) => s + a.n, 0);
    console.log(`Архетипы за ${days} дн. (из прохождений, ${total})\n`);
    for (const a of arch.sort((x, y) => y.n - x.n)) {
      const share = ((a.n / total) * 100).toFixed(1);
      console.log(`   ${a.winner.padEnd(12)} ${String(a.n).padStart(5)} ${share.padStart(5)}%  ${'█'.repeat(Math.max(1, Math.round((a.n / total) * 28)))}`);
    }
    console.log();
  }
} catch {
  // Прохождений может не быть — воронка от этого не перестаёт работать.
}

process.exit(0);
