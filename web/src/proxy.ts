import { NextResponse, type NextRequest } from 'next/server';

/**
 * Пароль на /admin.
 *
 * Basic-аутентификация выбрана намеренно, а не форма с сессией: она не ставит
 * ни одной куки и не держит состояния на сервере. Значит админка не тянет за
 * собой ни вопрос согласия, ни хранилище сессий, ни разлогин по таймауту.
 * Пароль спрашивает сам браузер.
 *
 * Если ADMIN_PASSWORD не задан, админки НЕ СУЩЕСТВУЕТ: отдаём 404, а не
 * открытую страницу. Забытая переменная не должна означать «база наружу».
 */
const REALM = 'findmysmell';

/** Сравнение без ранней остановки: длина утекает, содержимое — нет. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      // Ответы админки не должны лежать в кешах по пути.
      'Cache-Control': 'no-store',
    },
  });
}

export default function proxy(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  // Логин не проверяем — он существует только чтобы браузер показал диалог.
  // Но двоеточие обязательно: без него indexOf даёт -1, slice(0) возвращает
  // всю строку, и заголовок «Basic base64(пароль)» без логина проходил бы
  // как верный. Кривой заголовок не должен пускать.
  const colon = decoded.indexOf(':');
  if (colon === -1) return unauthorized();
  if (!sameSecret(decoded.slice(colon + 1), expected)) return unauthorized();

  const next = NextResponse.next();
  next.headers.set('Cache-Control', 'no-store');
  next.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return next;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
