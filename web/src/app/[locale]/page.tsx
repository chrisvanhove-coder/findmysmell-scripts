import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n';
import { ARCHETYPE_KEYS } from '@/lib/archetype-colors';

// Временная страница-указатель, пока не перенесены главная и квиз.
// Даёт быстрый доступ ко всем семи результатам для работы над дизайном.
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <main style={{ padding: '48px 24px', maxWidth: 720, margin: '0 auto', color: '#e8e8e8' }}>
      <h1 style={{ fontFamily: 'var(--fms-display)', letterSpacing: '0.04em' }}>
        Find My Smell
      </h1>
      <p style={{ fontFamily: 'var(--fms-mono)', fontSize: 13, opacity: 0.6 }}>
        Каркас переноса. Локаль: {locale}. Предпросмотр результатов:
      </p>
      <ul style={{ fontFamily: 'var(--fms-mono)', fontSize: 14, lineHeight: 2 }}>
        {ARCHETYPE_KEYS.map((key) => (
          <li key={key}>
            <Link href={`/${locale}/result/${key.toLowerCase()}`} style={{ color: '#c8a882' }}>
              {key}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
