import StartQuizLink from '@/components/StartQuizLink';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './[locale]/not-found.module.css';

/**
 * «Не найдено» для адресов ВНЕ локали: `/чего-то-нет`, старые ссылки,
 * которых нет в таблице редиректов.
 *
 * Свои html и body здесь потому, что корневой layout их не рисует — их
 * даёт layout локали, а сюда мы попадаем как раз минуя его (так же
 * сделана и админка). Из-за этого здесь нет шапки, подвала и шрифтов
 * Google — только цвета сайта. Внутри локали работает свой,
 * «одетый» экран: `[locale]/not-found.tsx`.
 */
export const metadata: Metadata = {
  title: 'Page not found — Find My Smell',
  robots: 'noindex, follow',
};

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main className={styles.page}>
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>This page has no smell.</h1>
          <p className={styles.body}>
            The link is broken, or the page moved when the site did.
          </p>
          <nav className={styles.actions}>
            <Link className={styles.primary} href="/en">Go to the start</Link>
            <StartQuizLink className={styles.secondary} href="/en/quiz/q-gender">Take the quiz</StartQuizLink>
          </nav>
        </main>
      </body>
    </html>
  );
}
