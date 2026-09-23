import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';

/**
 * Пропуск на страницу результата по ссылке из письма.
 *
 * ЗАЧЕМ. Результат закрыт от тех, кто квиз не проходил (см.
 * components/ResultGate.tsx): пропуском служат ответы в браузере. Но
 * письмо человек мог открыть с другого устройства, где ответов нет, —
 * а квиз он прошёл, иначе письма бы не было. Ссылка в письме несёт
 * `?r=` с идентификатором его подписки, и проверяем его здесь.
 *
 * ЧТО ЭТО НЕ РАСКРЫВАЕТ. Ответ — только `ok: true/false`. Адрес,
 * согласие и что бы то ни было ещё наружу не уходят. Ключ — случайный
 * uuid: подобрать его нельзя, а взять неоткуда, кроме самого письма.
 * Архетип спрашивающий и так обязан знать — он в адресе страницы.
 *
 * ПОЧЕМУ ПО ПОДПИСКЕ, А НЕ ПО ПРОХОЖДЕНИЮ. Прохождения обезличены и с
 * адресом не связаны нарочно (см. schema.ts). Письмо отправляет строка
 * subscribers, её id здесь и проверяется — связывать таблицы ради
 * пропуска незачем.
 */

export const dynamic = 'force-dynamic';

/** uuid и ничего кроме: в запрос к базе кривая строка не уйдёт. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pass = params.get('r') ?? '';
  const archetype = (params.get('a') ?? '').toUpperCase();

  if (!UUID.test(pass) || !archetype) return NextResponse.json({ ok: false });

  try {
    const db = getDb();
    const rows = await db
      .select({ archetype: schema.subscribers.archetype })
      .from(schema.subscribers)
      .where(eq(schema.subscribers.id, pass))
      .limit(1);
    return NextResponse.json({ ok: rows.length === 1 && rows[0].archetype === archetype });
  } catch {
    /* База недоступна — пропуск не подтверждён. Отказ, а не «пускаем на
       всякий случай»: иначе падение базы открывало бы результат всем. */
    return NextResponse.json({ ok: false });
  }
}
