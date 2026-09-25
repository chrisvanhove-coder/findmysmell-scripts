/**
 * Удаление тестовых прохождений.
 *
 * ЗАЧЕМ. Пока сайт обкатывали, база набрала прохождения, которых в
 * статистике быть не должно: свои проходы, проверки после каждой правки,
 * друзья «посмотреть». Они портят ровно то, ради чего база и заведена —
 * распределение архетипов, воронку, долю брошенных.
 *
 * ПО УМОЛЧАНИЮ НЕ УДАЛЯЕТ. Сначала показывает, что нашёл; удаление
 * включается явным `--apply`, потому что оно необратимо, а копия снимается
 * раз в сутки — значит между копиями откатывать нечем.
 *
 *   npm run purge:test -- --text test            # найти по тексту
 *   npm run purge:test -- --text test --apply    # и удалить найденное
 *   npm run purge:test -- --before 2026-09-25    # по дате
 *   npm run purge:test -- --all                  # всё
 *   добавить --emails, чтобы под тот же срез попали адреса подписчиков
 *
 * ЧЕСТНО ПРО `--text`. Он находит прохождения, где искомое слово написано
 * либо в финальном открытом ответе, либо в любом «Other» внутри вопросов.
 * Прохождение, в котором человек НИЧЕГО не писал, под него не попадает —
 * а таких среди тестовых обычно большинство: кликаешь варианты и уходишь.
 * Поэтому показ печатает, сколько прохождений осталось нетронутыми: если
 * их сотня, критерий выбран не тот, и это видно сразу.
 *
 * ПОЧЕМУ ВОРОНКА УДАЛЯЕТСЯ ПО ТОКЕНУ. `funnel_events.run_token` и
 * `submissions.client_token` — одно и то же значение: обе записи делает
 * один и тот же runToken() из answers-store. Значит при точечном удалении
 * можно убрать ровно события тех прохождений, которые удалили, а не
 * рубить воронку по дате вместе с чужими шагами.
 */
import { and, eq, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import { getDb, schema } from '../src/db/index.ts';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ALL = argv.includes('--all');
const EMAILS = argv.includes('--emails');
const arg = (name: string) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] ?? null : null);
const beforeArg = arg('--before');
const textArg = arg('--text');

if (!ALL && !beforeArg && !textArg) {
  console.error('Нужен срез: --text СЛОВО, --before ГГГГ-ММ-ДД или --all.');
  process.exit(2);
}
const before = beforeArg ? new Date(`${beforeArg}T00:00:00Z`) : null;
if (before && Number.isNaN(before.getTime())) {
  console.error(`Не разобрал дату «${beforeArg}». Нужен вид ГГГГ-ММ-ДД.`);
  process.exit(2);
}

const db = getDb();
const like = textArg ? `%${textArg}%` : null;

/** Прохождения, попадающие под срез. */
async function matched() {
  if (ALL) {
    return db.select({
      id: schema.submissions.id,
      clientToken: schema.submissions.clientToken,
      createdAt: schema.submissions.createdAt,
      locale: schema.submissions.locale,
      winner: schema.submissions.winner,
    }).from(schema.submissions);
  }
  if (before) {
    return db.select({
      id: schema.submissions.id,
      clientToken: schema.submissions.clientToken,
      createdAt: schema.submissions.createdAt,
      locale: schema.submissions.locale,
      winner: schema.submissions.winner,
    }).from(schema.submissions).where(lt(schema.submissions.createdAt, before));
  }
  /* По тексту: слово могло оказаться и в финальном ответе, и в любом
     «Other». Подзапрос по второй таблице, а не join — join размножил бы
     строки по числу текстов у одного прохождения. */
  const inOpens = db.select({ id: schema.questionOpenAnswers.submissionId })
    .from(schema.questionOpenAnswers)
    .where(ilike(schema.questionOpenAnswers.text, like!));
  return db.select({
    id: schema.submissions.id,
    clientToken: schema.submissions.clientToken,
    createdAt: schema.submissions.createdAt,
    locale: schema.submissions.locale,
    winner: schema.submissions.winner,
  }).from(schema.submissions).where(or(
    ilike(schema.submissions.openAnswer, like!),
    inArray(schema.submissions.id, inOpens),
  ));
}

const rows = await matched();
const total = (await db.select({ n: sql<number>`count(*)::int` })
  .from(schema.submissions))[0]?.n ?? 0;

console.log(`\nСрез: ${ALL ? 'всё' : before ? `до ${beforeArg}` : `текст содержит «${textArg}»`}\n`);
console.log(`  найдено прохождений      ${rows.length} из ${total}`);
console.log(`  останется нетронутыми    ${total - rows.length}`);

if (rows.length > 0) {
  console.log('\n  что именно:');
  for (const r of rows.slice(0, 40)) {
    console.log(`    ${r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}  ${
      r.locale}  ${r.winner}`);
  }
  if (rows.length > 40) console.log(`    … и ещё ${rows.length - 40}`);
}

if (!APPLY) {
  console.log('\nЭто показ, а не удаление. Добавь --apply, если всё верно.\n');
  process.exit(0);
}
if (rows.length === 0) {
  console.log('\nУдалять нечего.\n');
  process.exit(0);
}

const ids = rows.map((r) => r.id);
const tokens = rows.map((r) => r.clientToken);

/* Тексты «Other» держат внешний ключ с каскадом — база уберёт их сама. */
const delRuns = await db.delete(schema.submissions)
  .where(inArray(schema.submissions.id, ids))
  .returning({ id: schema.submissions.id });
console.log(`\nудалено прохождений: ${delRuns.length} (с их текстами «Other»)`);

const delEvents = ALL
  ? await db.delete(schema.funnelEvents).returning({ id: schema.funnelEvents.id })
  : before
    ? await db.delete(schema.funnelEvents)
        .where(lt(schema.funnelEvents.createdAt, before))
        .returning({ id: schema.funnelEvents.id })
    : await db.delete(schema.funnelEvents)
        .where(inArray(schema.funnelEvents.runToken, tokens))
        .returning({ id: schema.funnelEvents.id });
console.log(`удалено событий воронки: ${delEvents.length}`);

if (EMAILS) {
  const delEmails = ALL
    ? await db.delete(schema.subscribers).returning({ id: schema.subscribers.id })
    : before
      ? await db.delete(schema.subscribers)
          .where(lt(schema.subscribers.createdAt, before))
          .returning({ id: schema.subscribers.id })
      : [];
  console.log(`удалено адресов: ${delEmails.length}`);
}

console.log('\nГотово. Вернуть это можно только из ночной копии в бакете.\n');
process.exit(0);
