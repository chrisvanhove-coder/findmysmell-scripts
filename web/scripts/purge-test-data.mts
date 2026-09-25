/**
 * Удаление тестовых прохождений.
 *
 * ЗАЧЕМ. Пока сайт обкатывали, база набрала прохождения, которых в
 * статистике быть не должно: свои проходы, проверки после каждой правки,
 * друзья «посмотреть». Они портят ровно то, ради чего база и заведена —
 * распределение архетипов, воронку, долю брошенных. Хранить их незачем:
 * это не чьи-то ответы, это следы отладки.
 *
 * ПО УМОЛЧАНИЮ НЕ УДАЛЯЕТ. Сначала показывает, что нашёл; удаление
 * включается явным `--apply`, потому что оно необратимо, а копия снимается
 * раз в сутки — значит между копиями откатывать нечем.
 *
 *   npm run purge:test                                  # посмотреть
 *   npm run purge:test -- --before 2026-09-26           # посмотреть срез
 *   npm run purge:test -- --before 2026-09-26 --apply   # удалить
 *   npm run purge:test -- --all --apply                 # удалить всё
 *   npm run purge:test -- --all --emails --apply        # и адреса тоже
 *
 * ЧТО УДАЛЯЕТСЯ. Прохождения и вместе с ними каскадом тексты «Other».
 * События воронки за тот же срез — иначе воронка продолжит считать шаги
 * людей, которых в базе уже нет. Адреса подписчиков НЕ трогаются без
 * отдельного `--emails`: адрес это личные данные, и удалять их заодно,
 * мимоходом, неправильно — это должно быть отдельным решением.
 */
import { lt, sql } from 'drizzle-orm';
import { getDb, schema } from '../src/db/index.ts';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ALL = argv.includes('--all');
const EMAILS = argv.includes('--emails');
const beforeArg = argv.includes('--before') ? argv[argv.indexOf('--before') + 1] : null;

if (!ALL && !beforeArg) {
  console.error('Нужен срез: --before ГГГГ-ММ-ДД или --all. Без него ничего не делаю.');
  process.exit(2);
}
const before = ALL ? null : new Date(`${beforeArg}T00:00:00Z`);
if (before && Number.isNaN(before.getTime())) {
  console.error(`Не разобрал дату «${beforeArg}». Нужен вид ГГГГ-ММ-ДД.`);
  process.exit(2);
}

const db = getDb();

const runs = before
  ? await db.select({ n: sql<number>`count(*)::int` }).from(schema.submissions)
      .where(lt(schema.submissions.createdAt, before))
  : await db.select({ n: sql<number>`count(*)::int` }).from(schema.submissions);
const events = before
  ? await db.select({ n: sql<number>`count(*)::int` }).from(schema.funnelEvents)
      .where(lt(schema.funnelEvents.createdAt, before))
  : await db.select({ n: sql<number>`count(*)::int` }).from(schema.funnelEvents);
const emails = before
  ? await db.select({ n: sql<number>`count(*)::int` }).from(schema.subscribers)
      .where(lt(schema.subscribers.createdAt, before))
  : await db.select({ n: sql<number>`count(*)::int` }).from(schema.subscribers);
const opens = await db.select({ n: sql<number>`count(*)::int` })
  .from(schema.questionOpenAnswers);

console.log(`\nСрез: ${before ? `до ${before.toISOString().slice(0, 10)}` : 'всё'}\n`);
console.log(`  прохождений             ${runs[0]?.n ?? 0}`);
console.log(`  событий воронки         ${events[0]?.n ?? 0}`);
console.log(`  текстов «Other» всего   ${opens[0]?.n ?? 0}  — уйдут каскадом`);
console.log(`  адресов подписчиков     ${emails[0]?.n ?? 0}  — ${
  EMAILS ? 'БУДУТ УДАЛЕНЫ' : 'не трогаю, нужен --emails'}`);

if (!APPLY) {
  console.log('\nЭто показ, а не удаление. Добавь --apply, если всё верно.\n');
  process.exit(0);
}

/* Тексты «Other» держат на прохождения внешний ключ с каскадом, так что
   база уберёт их сама. Воронка ни на что не ссылается. */
const delRuns = before
  ? await db.delete(schema.submissions).where(lt(schema.submissions.createdAt, before))
      .returning({ id: schema.submissions.id })
  : await db.delete(schema.submissions).returning({ id: schema.submissions.id });
console.log(`\nудалено прохождений: ${delRuns.length} (с их текстами «Other»)`);

const delEvents = before
  ? await db.delete(schema.funnelEvents).where(lt(schema.funnelEvents.createdAt, before))
      .returning({ id: schema.funnelEvents.id })
  : await db.delete(schema.funnelEvents).returning({ id: schema.funnelEvents.id });
console.log(`удалено событий воронки: ${delEvents.length}`);

if (EMAILS) {
  const delEmails = before
    ? await db.delete(schema.subscribers).where(lt(schema.subscribers.createdAt, before))
        .returning({ id: schema.subscribers.id })
    : await db.delete(schema.subscribers).returning({ id: schema.subscribers.id });
  console.log(`удалено адресов: ${delEmails.length}`);
}

console.log('\nГотово. Вернуть это можно только из ночной копии в бакете.\n');
process.exit(0);
