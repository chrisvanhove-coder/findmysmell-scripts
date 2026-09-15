import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { parseFunnelEvent, FUNNEL_LIMITS } from '@/lib/funnel-event';

/**
 * Приём событий воронки. Это не аналитика третьей стороны: строка пишется в
 * тот же Postgres, что и остальное, и наружу не уходит.
 *
 * Роут намеренно ничего не берёт из запроса, кроме тела: ни IP, ни
 * user-agent, ни referrer. Разбор входа — в src/lib/funnel-event.ts, чтобы
 * его можно было прогнать тестом без сервера.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = parseFunnelEvent(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.insert(schema.funnelEvents).values(parsed.value);
  } catch (err) {
    // Статистика не стоит пятисотки в ответ клиенту: человек в этот момент
    // переходит на следующий вопрос. Пишем в лог и отвечаем 204.
    console.error('funnel insert failed', err);
  }

  // 204 без тела: клиенту ответ не нужен, он отправлял через sendBeacon.
  return new NextResponse(null, { status: 204 });
}

export { FUNNEL_LIMITS };
