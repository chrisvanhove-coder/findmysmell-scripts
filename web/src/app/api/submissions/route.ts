import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { parseSubmission, buildRecord, buildQuestionOpenRows } from '@/lib/submission';

/**
 * Приём прохождения квиза. Заменяет fetch в Google Apps Script
 * из webflow/page-result-footer.html.
 *
 * Разбор входа и сборка строки живут в src/lib/submission.ts — здесь только
 * HTTP и запись. Так их можно прогнать тестом без сервера,
 * см. scripts/check-submissions.mts.
 */

// Запись в базу — никакого кеша и никакой предгенерации.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = parseSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Отказ от исследования не отменяет запись: прохождение пишется всегда,
  // отказ фиксируется в consent_research. Так было и в проде.
  const record = buildRecord(parsed.input);

  try {
    const db = getDb();
    /* Одна транзакция на обе таблицы: тексты «Other» без своего
       прохождения — мусор, а прохождение без них теряет то, что
       заказчица назвала самым важным в квизе. Либо оба, либо ничего. */
    const inserted = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(schema.submissions)
        .values(record)
        // A newer revision replaces this run. Retries and delayed older requests do not.
        .onConflictDoUpdate({
          target: schema.submissions.clientToken,
          set: {
            locale: record.locale,
            winner: record.winner,
            secondary: record.secondary,
            scores: record.scores,
            answers: record.answers,
            openAnswer: record.openAnswer,
            consentResearch: record.consentResearch,
            // Брошенное прохождение, которое человек потом всё-таки
            // доделал, должно перестать быть брошенным.
            completed: record.completed,
            revision: record.revision,
          },
          setWhere: sql`${schema.submissions.revision} < ${record.revision}`,
        })
        .returning({ id: schema.submissions.id });

      // Повтор: прохождение уже записано, вместе с его текстами.
      if (rows.length === 0) return rows;

      // Remove texts from abandoned branches and replaced Other choices atomically.
      await tx.delete(schema.questionOpenAnswers)
        .where(eq(schema.questionOpenAnswers.submissionId, rows[0].id));
      const opens = buildQuestionOpenRows(rows[0].id, parsed.input.questionOpens);
      if (opens.length > 0) {
        await tx.insert(schema.questionOpenAnswers).values(opens).onConflictDoNothing();
      }
      return rows;
    });

    return NextResponse.json({
      stored: inserted.length > 0,
      winner: record.winner,
      duplicate: inserted.length === 0,
    });
  } catch (error) {
    // Не роняем страницу результата из-за аналитики: человек должен увидеть
    // свой архетип независимо от того, доехала ли запись.
    console.error('submission insert failed', error);
    return NextResponse.json({ error: 'storage unavailable' }, { status: 503 });
  }
}
