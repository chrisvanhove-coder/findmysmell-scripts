'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Ingredient } from '@/lib/content';
import styles from './ingredients.module.css';

/**
 * Ингредиенты с кнопкой «Read more». Порт зоны 2 из result48.js:
 * та же вводная фраза, та же кнопка, то же модальное окно
 * (картинка → название → фраза → подробный текст).
 *
 * Текст `detail` был извлечён вместе с остальным контентом, но до сих
 * пор не показывался нигде — кнопки просто не было.
 *
 * Клиентский компонент, потому что модалка — это состояние. Сама сетка
 * ингредиентов от этого не страдает: она в том же разметочном потоке
 * и рендерится сразу.
 */

// Вводная фраза была захардкожена в result48.js, в выгрузку данных
// не попала — переносим текстом.
const INTRO =
  "These are the building blocks of your scent profile. Next time you're in " +
  'a perfume shop, ask to smell them — you’ll start recognising what ' +
  "you're drawn to.";

const LABEL = 'Ingredients worth discovering';
const READ_MORE = 'Read more';

export default function Ingredients({ ingredients }: { ingredients: Ingredient[] }) {
  const [open, setOpen] = useState<Ingredient | null>(null);

  const close = useCallback(() => setOpen(null), []);

  // Escape закрывает, как в проде. Слушатель живёт только пока модалка открыта.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Прод блокировал прокрутку body, пока открыто окно.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <section className={styles.zone}>
      {/* В проде линейка отделяет блок ингредиентов сверху, до заголовка,
          а не стоит между вводной фразой и списком. */}
      <div className={styles.rule} />
      <span className={styles.label}>{LABEL}</span>
      <p className={styles.intro}>{INTRO}</p>

      <div className={styles.list}>
        {ingredients.map((ing) => (
          <article key={ing.name} className={styles.item}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.img} src={ing.img} alt={ing.name} />
            <div className={styles.body}>
              <span className={styles.name}>{ing.name}</span>
              <p className={styles.desc}>{ing.desc}</p>
              {ing.detail && (
                <button
                  type="button"
                  className={styles.readMore}
                  onClick={() => setOpen(ing)}
                >
                  {READ_MORE}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {open && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={open.name}
          // Клик по затемнению закрывает, по самому окну — нет.
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={styles.box}>
            <button
              type="button"
              className={styles.close}
              onClick={close}
              aria-label="Close"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.modalImg} src={open.img} alt={open.name} />
            <div className={styles.modalBody}>
              <h3 className={styles.modalName}>{open.name}</h3>
              <p className={styles.modalPhrase}>{open.desc}</p>
              <p className={styles.modalDetail}>{open.detail}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
