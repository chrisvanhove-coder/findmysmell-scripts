import type { ReactNode } from 'react';

/**
 * Своя обёртка с html/body: корневой layout их не рисует (их даёт
 * [locale]/layout), а админка живёт вне локалей. Ни шапки, ни подвала,
 * ни шрифтов с CDN — это инструмент, а не страница сайта.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#f4f2ea' }}>{children}</body>
    </html>
  );
}
