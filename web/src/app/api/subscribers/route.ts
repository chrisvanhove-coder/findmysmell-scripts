import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { parseSubscriber } from '@/lib/submission';

/**
 * Подписка на письмо с результатом. Форма перенесена со страницы результата
 * (блок fms-z5-email в result48.js), где адрес уезжал в тот же Apps Script.
 *
 * Почта лежит отдельно от прохождений: submissions обезличены, subscribers —
 * персональные данные. Связывать их не нужно и не стоит.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = parseSubscriber(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const db = getDb();
    // Повторная подписка тем же адресом обновляет архетип и локаль,
    // а не падает на уникальном индексе.
    await db
      .insert(schema.subscribers)
      .values(parsed.input)
      .onConflictDoUpdate({
        target: schema.subscribers.email,
        set: {
          locale: sql`excluded.locale`,
          archetype: sql`excluded.archetype`,
        },
      });

    return NextResponse.json({ subscribed: true });
  } catch (error) {
    console.error('subscriber insert failed', error);
    return NextResponse.json({ error: 'storage unavailable' }, { status: 503 });
  }
}
