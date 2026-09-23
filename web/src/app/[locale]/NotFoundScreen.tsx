'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import StartQuizLink from '@/components/StartQuizLink';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n';
import { t } from '@/lib/copy';
import styles from './not-found.module.css';

/** Английский оригинал; французский приходит поверх (см. lib/copy.ts). */
const COPY = {
  heading: 'This page has no smell.',
  body: 'The link is broken, or the page moved when the site did.',
  home: 'Go to the start',
  quiz: 'Take the quiz',
} as const;

export default function NotFoundScreen() {
  /* Язык — из адреса, по которому человек сюда попал. Если его там нет
     (адрес вроде /чепуха), остаёмся на английском. */
  const first = usePathname()?.split('/')[1] ?? '';
  const locale: Locale = isLocale(first) ? first : DEFAULT_LOCALE;

  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t(locale, 'ui.notFoundHeading', COPY.heading)}</h1>
      <p className={styles.body}>{t(locale, 'ui.notFoundBody', COPY.body)}</p>
      <nav className={styles.actions}>
        <Link className={styles.primary} href={`/${locale}`}>
          {t(locale, 'ui.notFoundHome', COPY.home)}
        </Link>
        <StartQuizLink className={styles.secondary} href={`/${locale}/quiz/q-gender`}>
          {t(locale, 'ui.notFoundQuiz', COPY.quiz)}
        </StartQuizLink>
      </nav>
    </main>
  );
}
