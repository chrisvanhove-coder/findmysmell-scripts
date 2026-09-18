/**
 * Запись разобранной таблицы в базу. Отдельно от разбора, потому что
 * разбор чистый, а это единственное место, которое трогает базу, — и его
 * используют и скрипт в терминале, и страница /admin/import.
 */
import { sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { ParsedRun } from './sheet-import';

export interface WriteResult {
  runsInserted: number;
  runsAlreadyThere: number;
  emailsInserted: number;
  emailsSeen: number;
  /** Адреса без явного согласия на email: они в подписчики не переносятся. */
  emailsWithoutConsent: number;
  totalHistoric: number;
  totalRuns: number;
}

export async function writeRuns(
  runs: ParsedRun[],
  { withEmails }: { withEmails: boolean },
): Promise<WriteResult> {
  const db = getDb();
  let runsInserted = 0;

  for (let i = 0; i < runs.length; i += 500) {
    const batch = runs.slice(i, i + 500);
    const res = await db
      .insert(schema.submissions)
      .values(batch.map((r) => ({
        clientToken: r.clientToken,
        locale: r.locale,
        winner: r.winner,
        secondary: r.secondary,
        scores: r.scores,
        answers: r.answers,
        openAnswer: r.openAnswer,
        consentResearch: r.consentResearch,
        createdAt: r.createdAt,
        // Ключа браузера у исторических прохождений нет и быть не может:
        // тогда его не существовало. Значит и в выборку run_index = 1 они
        // не попадают — это честнее, чем выдать им номер 1.
        browserKey: null,
        runIndex: null,
      })))
      .onConflictDoNothing({ target: schema.submissions.clientToken })
      .returning({ id: schema.submissions.id });
    runsInserted += res.length;
  }

  const withEmail = runs.filter((r) => r.email);
  let emailsInserted = 0;

  if (withEmails) {
    for (const r of withEmail) {
      if (!r.email || !r.consentEmail) continue;
      const res = await db
        .insert(schema.subscribers)
        .values({
          email: r.email,
          locale: r.locale,
          archetype: r.winner,
          consentEmail: r.consentEmail,
          // Дата согласия ИЗ ТАБЛИЦЫ, а не момент переноса: подменить её
          // значило бы продлить себе срок хранения на полгода.
          consentAt: r.createdAt,
          /* Импорт не отправляет письма; без подтверждения доставки дату не
             выдумываем. Но письмо этим людям когда-то отправил старый сайт,
             а метки об этом теперь нет — будущая рассылка НЕ должна считать
             `sent_at is null` за «ещё не писали». Подробнее — у колонки
             sent_at в src/db/schema.ts. */
          sentAt: null,
          createdAt: r.createdAt,
        })
        .onConflictDoNothing({ target: schema.subscribers.email })
        .returning({ id: schema.subscribers.id });
      emailsInserted += res.length;
    }
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.submissions);
  const [{ historic }] = await db
    .select({ historic: sql<number>`count(*)::int` })
    .from(schema.submissions)
    .where(sql`${schema.submissions.clientToken} like 'sheet:%'`);

  return {
    runsInserted,
    runsAlreadyThere: runs.length - runsInserted,
    emailsInserted,
    emailsSeen: withEmail.length,
    // Считается всегда, даже когда перенос адресов выключен: иначе разрыв
    // между «адресов в таблице» и «перенесено» выглядел бы сбоем.
    emailsWithoutConsent: withEmail.filter((r) => !r.consentEmail).length,
    totalHistoric: historic,
    totalRuns: total,
  };
}
