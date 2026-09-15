/**
 * Исполнение сроков хранения из privacy policy.
 *
 * Политика называет сроки с версии 2.0, но удалять их до сих пор было нечем:
 * ни джоба, ни триггера, ни ручной процедуры. Обещание без исполнения — это
 * не срок хранения, а текст. Этот скрипт и есть исполнение.
 *
 * Сроки взяты из privacy.en.json, раздел 7 «Data Retention», и из позиции
 * CNIL по измерению аудитории. Если меняется политика — меняется и здесь,
 * иначе они разойдутся.
 *
 *   funnel_events  13 месяцев  потолок CNIL для аудиторной статистики
 *   submissions     3 года     «maximum of 3 years from the date of submission»
 *   subscribers    12 месяцев  «stored for a maximum of 12 months»
 *
 * По умолчанию ничего не удаляет — только показывает, что удалит. Удаление
 * включается явным `--apply`, потому что это необратимо.
 *
 *   npm run purge:retention            # посмотреть
 *   npm run purge:retention -- --apply # удалить
 */
import { lt, sql } from 'drizzle-orm';
import { getDb, schema } from '../src/db/index.ts';

const APPLY = process.argv.includes('--apply');

/** Сроки в месяцах. Держать в согласии с privacy.en.json, раздел 7. */
const RETENTION = [
  { name: 'funnel_events', months: 13, table: schema.funnelEvents, column: schema.funnelEvents.createdAt,
    why: 'потолок CNIL для измерения аудитории' },
  { name: 'submissions', months: 36, table: schema.submissions, column: schema.submissions.createdAt,
    why: 'политика, раздел 7: максимум 3 года с даты отправки' },
  { name: 'subscribers', months: 12, table: schema.subscribers, column: schema.subscribers.createdAt,
    why: 'политика, раздел 7: адреса максимум 12 месяцев' },
] as const;

function cutoff(months: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

const db = getDb();
let total = 0;
let failed = 0;

console.log(APPLY ? '\nРЕЖИМ УДАЛЕНИЯ\n' : '\nПросмотр. Ничего не удаляется. Для удаления: -- --apply\n');

for (const r of RETENTION) {
  const before = cutoff(r.months);
  const iso = before.toISOString().slice(0, 10);
  try {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(r.table)
      .where(lt(r.column, before));

    if (!APPLY) {
      console.log(`${r.name.padEnd(14)} ${r.months} мес  старше ${iso}: ${n} строк  — ${r.why}`);
      total += n;
      continue;
    }

    if (n === 0) {
      console.log(`${r.name.padEnd(14)} ${r.months} мес  нечего удалять`);
      continue;
    }
    await db.delete(r.table).where(lt(r.column, before));
    console.log(`${r.name.padEnd(14)} ${r.months} мес  удалено ${n} строк старше ${iso}`);
    total += n;
  } catch (err) {
    failed += 1;
    console.error(`${r.name.padEnd(14)} ОШИБКА:`, err instanceof Error ? err.message : err);
  }
}

console.log(
  failed
    ? `\n${failed} таблиц не обработано, ${total} строк ${APPLY ? 'удалено' : 'под удаление'}\n`
    : `\nитого ${total} строк ${APPLY ? 'удалено' : 'под удаление'}\n`,
);

if (!APPLY && total > 0) {
  console.log('Это не просрочка сама по себе: скрипт надо запускать регулярно,');
  console.log('иначе данные переживают свой срок. Раз в сутки достаточно.\n');
}

process.exit(failed ? 1 : 0);
