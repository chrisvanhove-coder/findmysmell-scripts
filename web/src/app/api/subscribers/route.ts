import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { parseSubscriber } from '@/lib/submission';
import { sendResultEmail } from '@/lib/email';
import { match } from '@/lib/matching';

/**
 * Подписка на письмо с результатом. Форма перенесена со страницы результата
 * (блок fms-z5-email в result48.js), где адрес уезжал в тот же Apps Script.
 *
 * Почта лежит отдельно от прохождений: submissions обезличены, subscribers —
 * персональные данные. Связывать их не нужно и не стоит.
 *
 * Порядок здесь важен: сначала сохранить адрес, потом отправлять. Если
 * отправка сорвётся, адрес и согласие уже в базе — письмо можно будет
 * дослать, а вот потерянное согласие не восстановить.
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

  const { email, locale, archetype, perfumeId } = parsed.input;

  try {
    const db = getDb();
    // Повторная подписка тем же адресом обновляет архетип, локаль и флакон,
    // а не падает на уникальном индексе. Согласие переподтверждается.
    await db
      .insert(schema.subscribers)
      .values(parsed.input)
      .onConflictDoUpdate({
        target: schema.subscribers.email,
        set: {
          locale: sql`excluded.locale`,
          archetype: sql`excluded.archetype`,
          perfumeId: sql`excluded.perfume_id`,
          consentAt: sql`now()`,
        },
      });

    // Без архетипа письму нечего рассказывать — только сохраняем адрес.
    if (!archetype) {
      return NextResponse.json({ subscribed: true, sent: false });
    }

    // Флакон присылает браузер; если не прислал или id неизвестен, берём
    // запасной вариант архетипа — письмо всё равно должно быть цельным.
    const picked = match(archetype, null);
    const chosen =
      perfumeId && picked
        ? (findById(picked, perfumeId) ?? picked)
        : picked;

    const origin = siteOrigin(request);
    const outcome = await sendResultEmail({
      email,
      locale,
      archetype,
      match: chosen,
      origin,
    });

    if (outcome === 'sent') {
      await db
        .update(schema.subscribers)
        .set({ sentAt: sql`now()` })
        .where(sql`${schema.subscribers.email} = ${email}`);
    }

    // `sent` говорит форме правду: пока ключа Brevo нет, письма не уходят,
    // и обещать «проверьте почту» нельзя.
    return NextResponse.json({ subscribed: true, sent: outcome === 'sent' });
  } catch (error) {
    console.error('subscriber insert failed', error);
    return NextResponse.json({ error: 'storage unavailable' }, { status: 503 });
  }
}

/** Ищет присланный флакон среди главного и альтернатив. */
function findById(
  picked: ReturnType<typeof match>,
  id: string,
): ReturnType<typeof match> {
  if (!picked) return null;
  if (picked.main.id === id) return picked;
  const alt = picked.alternatives.find((p) => p.id === id);
  if (!alt) return null;
  // Подобранный человеку флакон становится главным в письме.
  return {
    main: alt,
    alternatives: [picked.main, ...picked.alternatives.filter((p) => p.id !== id)].slice(0, 3),
  };
}

/** Адрес сайта для ссылок в письме — из заголовков запроса, не захардкожен. */
function siteOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : 'https://findmysmell.com';
}
