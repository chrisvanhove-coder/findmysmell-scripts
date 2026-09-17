'use client';

import StartQuizLink from '@/components/StartQuizLink';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { missingQuestions } from '@/lib/quiz-state';
import { toSlug } from '@/lib/quiz';
import { loadResearchConsent } from '@/lib/answers-store';
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
      // Страница предгенерирована, а ответы есть только в браузере — иначе
      // как после монтирования их не прочитать. Читать в инициализаторе
      // useState нельзя: на сервере storage нет, будет рассинхрон гидратации.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmpty(true);
      return;
    }
    const missing = missingQuestions(answers);
    if (missing.length || loadResearchConsent() === null) {
      router.replace(`/${locale}/quiz/${toSlug(missing[0] ?? 'Q_OPEN')}`);
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
      <StartQuizLink className={styles.cta} href={`/${locale}/quiz/q-gender`}>
        Start the quiz
      </StartQuizLink>
    </main>
  );
}
