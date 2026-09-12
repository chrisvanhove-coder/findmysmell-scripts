import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { parseSubmission, buildRecord, shouldPersist } from '@/lib/submission';

/**
 * Приём прохождения квиза. Заменяет fetch в Google Apps Script
 * из webflow/page-result-footer.html.
 *
 * Логика разбора и политика согласия живут в src/lib/submission.ts —
 * здесь только HTTP и запись. Так их можно прогнать тестом без сервера,
 * см. tools/submission-check.mjs.
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

  // Отказ от исследования: подтверждаем приём, но ничего не пишем.
  // Клиенту при этом отвечаем как при успехе — ему незачем повторять попытку.
  if (!shouldPersist(parsed.input)) {
    return NextResponse.json({ stored: false, reason: 'no research consent' });
  }

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
