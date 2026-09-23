'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { loadAnswers } from '@/lib/answers-store';
import { missingQuestions } from '@/lib/quiz-state';
import { FIRST_QUESTION, toSlug } from '@/lib/quiz';
import type { Locale } from '@/lib/i18n';

/**
 * Результат — только тому, кто прошёл квиз.
 *
 * ЗАЧЕМ. Адреса страниц результата угадываются с одного раза:
 * `/en/result/ceo`. Любой человек мог открыть готовый разбор архетипа, не
 * ответив ни на один вопрос, — и квиз, который весь смысл берёт из того,
 * что его прошли, обесценивался в один клик. Заказчица попросила закрыть.
 *
 * ПОЧЕМУ НЕ НА СЕРВЕРЕ. Серверная проверка требует, чтобы браузер что-то
 * предъявил, то есть куку. Политика приватности обещает дословно: «This
 * website sets no cookies». Обещание дороже, поэтому проверка здесь.
 *
 * НО В HTML РЕЗУЛЬТАТ ВСЁ РАВНО НЕ ПОПАДАЁТ. Клиентские компоненты
 * отрисовываются и на сервере, и на первом проходе `verdict` равен
 * `checking` — значит `children` не рендерятся вовсе. В статическом HTML
 * страницы нет ни описания архетипа, ни ингредиентов, ни флакона: их
 * подставляет гидратация, уже после проверки. То есть ни «посмотреть
 * исходник», ни curl результата не покажут.
 *
 * ЧТО СЧИТАЕТСЯ ПРОПУСКОМ. Полный набор ответов в хранилище браузера. Не
 * «совпал архетип»: человек, прошедший квиз, имеет право заглянуть и в
 * соседний разбор, а вот ссылка, отправленная другу, у друга всё равно не
 * откроется — у него ответов нет. Ответы живут и в localStorage, поэтому
 * свой результат открывается и после закрытия вкладки.
 *
 * ССЫЛКА ИЗ ПИСЬМА — ОТДЕЛЬНЫЙ СЛУЧАЙ. Человек квиз прошёл, но письмо мог
 * открыть с телефона, где в браузере пусто. Поэтому письмо носит с собой
 * `?r=` — идентификатор его собственной подписки, и его проверяет сервер
 * (src/app/api/result-access). Без письма этот ключ взять негде: это
 * случайный uuid.
 */

type Verdict = 'checking' | 'allowed' | 'sent-away';

export default function ResultGate({
  locale,
  archetype,
  children,
}: {
  locale: Locale;
  archetype: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<Verdict>('checking');

  useEffect(() => {
    let cancelled = false;

    const missing = missingQuestions(loadAnswers());
    if (missing.length === 0) {
      /* Тот же случай, что в ResultMatch: ответы есть только в браузере, и
         прочитать их можно не раньше монтирования. Синхронный setState
         здесь и нужен — иначе разметка сервера и первый проход клиента
         разойдутся, и гидратация сломается. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVerdict('allowed');
      return;
    }

    /** Отправляем туда, где человек остановился, — не на пустое начало. */
    function sendAway() {
      if (cancelled) return;
      setVerdict('sent-away');
      router.replace(`/${locale}/quiz/${toSlug(missing[0] ?? FIRST_QUESTION.id)}`);
    }

    const pass = new URLSearchParams(window.location.search).get('r');
    if (!pass) {
      sendAway();
      return;
    }

    fetch(`/api/result-access?r=${encodeURIComponent(pass)}&a=${encodeURIComponent(archetype)}`)
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.ok) setVerdict('allowed');
        else sendAway();
      })
      .catch(sendAway);

    return () => { cancelled = true; };
  }, [locale, archetype, router]);

  if (verdict !== 'allowed') return null;
  return <>{children}</>;
}
