'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { loadAnswers } from '@/lib/answers-store';
import { resolve } from '@/lib/scoring';
import styles from './empty.module.css';

/**
 * Общий адрес результата. Если квиз пройден — уводит на страницу своего
 * архетипа; если нет — показывает нормальное пустое состояние.
 *
 * Старый код в этом месте затирал document.body.innerHTML заглушкой,
 * что убивало и навигацию, и юридический футер.
 */
export default function ResultRedirect({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const answers = loadAnswers();
    if (!Object.keys(answers).length) {
      setEmpty(true);
      return;
    }
    const { winner } = resolve(answers);
    router.replace(`/${locale}/result/${winner.toLowerCase()}`);
  }, [locale, router]);

  if (!empty) {
    return (
      <main className={styles.screen}>
        <p className={styles.note}>Finding your scent…</p>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Take the quiz first</h1>
      <p className={styles.note}>
        Your result is built from your answers, and we don&apos;t have them yet.
        It takes about three minutes.
      </p>
      <Link className={styles.cta} href={`/${locale}/quiz/q-gender`}>
        Start the quiz
      </Link>
    </main>
  );
}
