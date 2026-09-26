import {
  submissionsCsv, PERIODS, DEFAULT_DAYS, type AdminFilters,
} from '@/lib/admin-data';
import { LOCALES } from '@/lib/i18n';
import archetypesEn from '@/data/archetypes.en.json';

// Пароль спрашивает middleware для всего /admin, включая этот адрес.
export const dynamic = 'force-dynamic';

const ARCHETYPES = Object.keys(archetypesEn);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get('days'));
  const days = (PERIODS as readonly number[]).includes(raw) ? raw : DEFAULT_DAYS;
  const firstOnly = url.searchParams.get('first') === '1';

  /* Срезы сверяются со списками так же, как на странице: неизвестное
     значение — это отсутствие фильтра, а не повод отдать пустой файл. */
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
    csv = await submissionsCsv(days, firstOnly, filters);
  } catch (error) {
    console.error('admin csv failed', error);
    return new Response('База не ответила.\n', { status: 503 });
  }

  /* Срез попадает в имя файла: две выгрузки за один день с разными
     фильтрами иначе легли бы в загрузки под одним именем, и через неделю
     уже не скажешь, в какой из них что. */
  const slice = [
    filters.locale,
    filters.winner?.toLowerCase(),
    filters.consent === undefined ? null : filters.consent ? 'consented' : 'no-consent',
  ].filter(Boolean).join('-');
  const name = `findmysmell-${firstOnly ? 'first-runs' : 'all-runs'}-${days}d${
    slice ? `-${slice}` : ''
  }-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
