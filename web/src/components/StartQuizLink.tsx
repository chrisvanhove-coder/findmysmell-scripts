'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ComponentProps, type MouseEvent } from 'react';
import { beginRun, loadAnswers, unfinishedRun } from '@/lib/answers-store';
import { missingQuestions } from '@/lib/quiz-state';
import { toSlug } from '@/lib/quiz';
import ResumeQuizPrompt from './ResumeQuizPrompt';

/**
 * Ссылка BEGIN / Start the quiz.
 *
 * Нажатие начинает ЧИСТОЕ прохождение: сброс перенесён сюда с ответа на
 * первый вопрос, иначе Back на первый вопрос считался новым прохождением и
 * терял всё написанное.
 *
 * Но если прохождение уже начато и не закончено, сначала спрашиваем: эта
 * кнопка лежит на главной, а логотип в шапке ведёт на главную с любого
 * экрана квиза — и молчаливое стирание двенадцати ответов человек получал
 * бы за два нажатия.
 */
export default function StartQuizLink(props: ComponentProps<typeof Link>) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  // Путь нужен, чтобы посчитать, куда возвращать. Не строка — ведём себя
  // как раньше: такой ссылки в проекте сейчас нет, и гадать не за что.
  const href = typeof props.href === 'string' ? props.href : null;

  function click(event: MouseEvent<HTMLAnchorElement>) {
    props.onClick?.(event);
    if (event.defaultPrevented) return;
    // Ctrl/Cmd/Shift-клик открывает ссылку в новой вкладке или окне — это
    // не начало прохождения, и трогать хранилище здесь нельзя.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href && unfinishedRun()) {
      event.preventDefault();
      setAsking(true);
      return;
    }
    beginRun();
  }

  /** Продолжить: ведём на первый неотвеченный вопрос, а не на начало. */
  function resume() {
    const missing = missingQuestions(loadAnswers());
    setAsking(false);
    router.push(href!.replace(/[^/]+$/, toSlug(missing[0] ?? 'Q_OPEN')));
  }

  function restart() {
    beginRun();
    setAsking(false);
    router.push(href!);
  }

  return (
    <>
      <Link {...props} onClick={click} />
      {asking && (
        <ResumeQuizPrompt
          onResume={resume}
          onRestart={restart}
          onCancel={() => setAsking(false)}
        />
      )}
    </>
  );
}
