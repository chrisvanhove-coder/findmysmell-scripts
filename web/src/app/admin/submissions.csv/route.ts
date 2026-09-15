import { submissionsCsv } from '@/lib/admin-data';

// Пароль спрашивает middleware для всего /admin, включая этот адрес.
export const dynamic = 'force-dynamic';

const PERIODS = [7, 30, 90, 365, 3650];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get('days'));
  const days = PERIODS.includes(raw) ? raw : 30;
  const firstOnly = url.searchParams.get('first') === '1';

  let csv: string;
  try {
    csv = await submissionsCsv(days, firstOnly);
  } catch (error) {
    console.error('admin csv failed', error);
    return new Response('База не ответила.\n', { status: 503 });
  }

  const name = `findmysmell-${firstOnly ? 'first-runs' : 'all-runs'}-${days}d-${
    new Date().toISOString().slice(0, 10)
  }.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
