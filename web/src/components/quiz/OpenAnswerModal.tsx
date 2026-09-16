'use client';

import { useEffect, useId, useRef, useState } from 'react';
import prompts from '@/data/question-open-prompts.json';
import styles from './open-answer-modal.module.css';

/**
 * Окошко «Other» — человек пишет свой ответ словами.
 *
 * ОТКУДА. Девять вопросов живого сайта (calm, cozy, energy, focus, play,
 * sexy, myst, celebrate, calm-now) на варианте «Other» открывают именно
 * такое окошко: стеклянная панель поверх затемнённого экрана, вопрос
 * Georgia 20px, поле-пилюля и кнопка «Continue →». Числа и текст взяты
 * из q-calm.footer.html и остальных восьми, а не придуманы.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ КОМПОНЕНТ. В проде этот код скопирован в девяти
 * подвалах страниц — девять почти одинаковых кусков, в каждом свой
 * вопрос и свой переход. Здесь он один, а вопрос приходит из данных.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. ГЛАВНОЕ — КУДА ПИШЕТСЯ ТЕКСТ. Прод писал его в `quiz_open`, то есть
 *    в то же место, что и финальный открытый вопрос: кто написал здесь и
 *    потом ответил в конце, терял первый ответ. Теперь у каждого вопроса
 *    своё поле (см. answers-store.saveQuestionOpen).
 * 2. ОКОШКО МОЖНО ЗАКРЫТЬ. В проде выхода не было вовсе: пустой текст
 *    кнопка молча игнорировала (`if (!text) return;`), Escape не работал,
 *    по фону нажать было нельзя. Человек, нажавший «Other» случайно,
 *    оставался в этом окне и мог только перезагрузить страницу.
 * 3. Это настоящий диалог: role="dialog", aria-modal, фокус уходит в
 *    поле и не уезжает из окна по Tab, а по закрытии возвращается на
 *    кнопку, с которой всё началось.
 * 4. Панель создавалась через innerHTML в DOMContentLoaded на каждой из
 *    девяти страниц — с обработчиками прямо в атрибутах. Здесь разметка
 *    и стили обычные.
 */

const PROMPTS = prompts.prompts as Record<string, string>;

/** Есть ли у этого вопроса текст для окошка. */
export function openPromptFor(questionId: string): string | undefined {
  return PROMPTS[questionId];
}

export default function OpenAnswerModal({
  prompt,
  initial = '',
  onSubmit,
  onCancel,
}: {
  prompt: string;
  /** Уже написанный ранее текст — если человек вернулся на вопрос назад. */
  initial?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const panel = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const titleId = useId();

  /* Фокус в поле — как в проде (там через setTimeout 50 мс). И возврат
     фокуса туда, откуда пришли: без этого после закрытия окна человек с
     клавиатуры оказывался в начале страницы. */
  useEffect(() => {
    const came = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => came?.focus?.();
  }, []);

  const ready = text.trim() !== '';

  function submit() {
    if (!ready) return;
    onSubmit(text.trim());
  }

  /** Tab не должен уводить фокус из окна: это модальный диалог. */
  function keepFocus(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const items = panel.current?.querySelectorAll<HTMLElement>('input, button:not(:disabled)');
    if (!items || items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  }

  return (
    <div
      className={styles.overlay}
      data-open-answer=""
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
        <p id={titleId} className={styles.prompt}>{prompt}</p>

        {/* Поле, а не textarea: в проде это одна строка-пилюля. И заодно
            textarea на экране означает финальный открытый вопрос — путать
            их не стоит. */}
        <input
          ref={input}
          id="open-answer-input"
          className={styles.input}
          type="text"
          value={text}
          maxLength={2000}
          placeholder={prompts.placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />

        <button
          type="button"
          id="open-answer-submit"
          className={styles.submit}
          disabled={!ready}
          onClick={submit}
        >
          {prompts.submit}
        </button>

        {/* Выход. В проде его не было — окно нельзя было закрыть никак. */}
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Pick from the list instead
        </button>
      </div>
    </div>
  );
}
