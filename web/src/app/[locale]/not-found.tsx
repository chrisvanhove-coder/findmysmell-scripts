import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './not-found.module.css';

/**
 * Страница «не найдено».
 *
 * ЗАЧЕМ. В Webflow своя страница 404 была (`/404`), в порте её не было:
 * на любой опечатке в адресе человек получал стандартный экран Next —
 * чёрный текст на белом, без шапки, подвала и выхода куда-либо. После
 * переключения домена на 404 будут попадать и по старым ссылкам, которых
 * нет в таблице редиректов, так что экран этот увидят.
 *
 * Тут нет ничего умного: цвета и шрифты сайта, честная фраза и две
 * ссылки — на главную и в начало квиза.
 */
export const metadata: Metadata = {
  title: 'Page not found — Find My Smell',
  robots: 'noindex, follow',
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>This page has no smell.</h1>
      <p className={styles.body}>
        The link is broken, or the page moved when the site did.
      </p>
      <nav className={styles.actions}>
        <Link className={styles.primary} href="/en">Go to the start</Link>
        <Link className={styles.secondary} href="/en/quiz/q-gender">Take the quiz</Link>
      </nav>
    </main>
  );
}
