import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { parseSubmission, buildRecord } from '@/lib/submission';

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
    const inserted = await db
      .insert(schema.submissions)
      .values(record)
      // Повторная отправка того же прохождения (перезагрузка страницы,
      // потерянный флаг quiz_sent) не создаёт второй строки.
      .onConflictDoNothing({ target: schema.submissions.clientToken })
      .returning({ id: schema.submissions.id });

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
