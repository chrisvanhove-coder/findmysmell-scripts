'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './resume-quiz.module.css';

/**
 * «У вас уже начато прохождение» — вопрос перед тем, как BEGIN сотрёт его.
 *
 * ЗАЧЕМ. Кнопка BEGIN / Start the quiz начинает чистое прохождение и
 * вычищает из браузера ответы, все тексты «Other», финальный текст и
 * решение про исследование. Логотип в шапке стоит на каждом экране квиза и
 * ведёт на главную, где эта кнопка и лежит: человек на двенадцатом вопросе
 * мог зайти на главную, нажать BEGIN и молча потерять всё написанное.
 * Теперь у него спрашивают.
 *
 * ЧЕГО НЕ СПРАШИВАЮТ. Завершённое и уже сохранённое прохождение — терять
 * там нечего, оно в базе; BEGIN стирает его как раньше, без вопроса
 * (см. unfinishedRun в src/lib/answers-store.ts).
 *
 * ТЕКСТ. Английский, как и вся остальная страница: французского и русского
 * пока нет нигде (HANDOFF 9.1). Этого окна на живом сайте не существует,
 * сверить его не с чем — ТЕКСТ НУЖНО ВЫЧИТАТЬ ЗАКАЗЧИЦЕ.
 *
 * ПОЧЕМУ ПОРТАЛ В BODY. Ссылка BEGIN стоит внутри секции главной, у
 * предков которой есть свои преобразования. Отрисованное на месте окно
 * получает от них ограничивающий блок, и `backdrop-filter` перестаёт
 * размывать страницу: панель выходит прозрачной, а сквозь неё читается
 * заголовок. Проверено на сборке — до портала стекло не работало.
 */

const COPY = {
  title: 'You already have a quiz in progress.',
  note: 'Starting over erases the answers you have given so far, including anything you wrote in your own words.',
  resume: 'Continue where I left off',
  restart: 'Start over',
  /* Не надпись, а подпись для скринридера: закрытие — крестик в углу.
     Третьей кнопкой в ряду оно стояло зря: «продолжить» и «начать заново» —
     это выбор, а «закрыть» — не выбор, и в одном столбце с ними читалось
     как третий равноправный вариант. */
  close: 'Close',
} as const;

export default function ResumeQuizPrompt({
  onResume,
  onRestart,
  onCancel,
}: {
  onResume: () => void;
  onRestart: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement | null>(null);
  const first = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  /* Фокус — на «продолжить», и возврат туда, откуда пришли: иначе человек
     с клавиатуры после закрытия оказывается в начале страницы. Так же
     устроено окошко «Other». */
  useEffect(() => {
    const came = document.activeElement as HTMLElement | null;
    first.current?.focus();
    return () => came?.focus?.();
  }, []);

  /** Tab не должен уводить фокус из окна: это модальный диалог. */
  function keepFocus(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const items = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
    if (!items || items.length === 0) return;
    const head = items[0];
    const tail = items[items.length - 1];
    if (!e.shiftKey && document.activeElement === tail) {
      e.preventDefault();
      head.focus();
    } else if (e.shiftKey && document.activeElement === head) {
      e.preventDefault();
      tail.focus();
    }
  }

  return createPortal((
    <div
      className={styles.overlay}
      data-resume-quiz=""
      /* Нажатие по затемнению закрывает окно — но только по самому
         затемнению, а не по панели внутри него. */
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        else keepFocus(e);
      }}
    >
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Первым в разметке, чтобы Tab начинал цикл отсюда; фокус при
            открытии всё равно ставится на «продолжить», ниже. */}
        <button
          type="button"
          className={styles.close}
          onClick={onCancel}
          aria-label={COPY.close}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <p id={titleId} className={styles.title}>{COPY.title}</p>
        <p className={styles.note}>{COPY.note}</p>

        {/* Сохранить работу человека — выбор по умолчанию. */}
        <button ref={first} type="button" className={styles.resume} onClick={onResume}>
          {COPY.resume}
        </button>
        <button type="button" className={styles.restart} onClick={onRestart}>
          {COPY.restart}
        </button>
      </div>
    </div>
  ), document.body);
}
