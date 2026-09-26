/**
 * Сводка по архетипам таблицей: сколько прохождений выпало каждому.
 *
 * Отдельный адрес, а не колонка в выгрузке прохождений: там одна строка —
 * один человек, и сводка в такой файл не помещается. Срезы читаются и
 * сверяются точно так же, как в submissions.csv — расхождение в разборе
 * параметров означало бы, что две выгрузки за один день показывают разное.
 */
import { archetypesCsv, type AdminFilters } from '@/lib/admin-data';
import { LOCALES } from '@/lib/i18n';
import archetypesEn from '@/data/archetypes.en.json';

// Пароль спрашивает middleware для всего /admin, включая этот адрес.
export const dynamic = 'force-dynamic';

const PERIODS = [7, 30, 90, 365, 3650];
const ARCHETYPES = Object.keys(archetypesEn);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get('days'));
  const days = PERIODS.includes(raw) ? raw : 30;

  const rawLocale = url.searchParams.get('locale') ?? '';
  const rawWinner = url.searchParams.get('winner') ?? '';
  const rawConsent = url.searchParams.get('consent');
  const filters: AdminFilters = {
    locale: (LOCALES as readonly string[]).includes(rawLocale) ? rawLocale : undefined,
    winner: ARCHETYPES.includes(rawWinner) ? rawWinner : undefined,
    consent: rawConsent === '1' ? true : rawConsent === '0' ? false : undefined,
  };

  let csv: string;
  try {
    csv = await archetypesCsv(days, filters);
  } catch (error) {
    console.error('admin archetypes csv failed', error);
    return new Response('База не ответила.\n', { status: 503 });
  }

  const slice = [
    filters.locale,
    filters.winner?.toLowerCase(),
    filters.consent === undefined ? null : filters.consent ? 'consented' : 'no-consent',
  ].filter(Boolean).join('-');
  const name = `findmysmell-archetypes-${days}d${slice ? `-${slice}` : ''}-${
    new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
