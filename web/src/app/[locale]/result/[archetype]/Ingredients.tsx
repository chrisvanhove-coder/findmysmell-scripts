'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Ingredient } from '@/lib/content';
import { cld } from '@/lib/cloudinary';
import styles from './ingredients.module.css';
import { type Locale } from '@/lib/i18n';
import { t } from '@/lib/copy';

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

export default function Ingredients({
  locale,
  ingredients,
  band,
}: {
  locale: Locale;
  ingredients: Ingredient[];
  /** Большая строка внизу зоны — «your scent» перед флаконом. */
  band: string;
}) {
  const [open, setOpen] = useState<Ingredient | null>(null);

  /* ПОДГОНКА БОЛЬШОЙ СТРОКИ ПОД ШИРИНУ ЭКРАНА.
     Кегль из CSS считается по числу знаков, и одному алфавиту этого
     хватает: «YOUR SCENT» и «VOTRE PARFUM» встают одинаково ровно.
     Кириллица в этом шрифте шире на знак, и «ТВОЙ АРОМАТ» при том же
     счёте вылезало за края на широком экране (замер: 1635px при 1600px
     окна). Считать ширину букв в CSS нечем, поэтому строка меряется
     по-настоящему и ужимается, если не влезла.

     useLayoutEffect, а не useEffect: он отрабатывает ДО отрисовки, и
     человек не видит, как заголовок во всю ширину прыгает в размере.
     Увеличивать нельзя — только ужимать: кегль из CSS это потолок,
     подобранный под прод. */
  const band$ = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const el = band$.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '';
      const room = el.getBoundingClientRect().width;
      const range = document.createRange();
      range.selectNodeContents(el);
      const ink = range.getBoundingClientRect().width;
      // Поля по краям: на живом сайте строка не упирается в край экрана.
      const target = room * 0.95;
      if (ink <= target) return;
      const size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${size * (target / ink)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [band]);

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
      <span className={styles.label}>{t(locale, 'result.ingredientsLabel', LABEL)}</span>
      <p className={styles.intro}>{t(locale, 'result.ingredientsIntro', INTRO)}</p>

      <div className={styles.list}>
        {ingredients.map((ing) => (
          <article key={ing.name} className={styles.item}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.img}
              src={cld(ing.img, 'ingredientThumb')}
              alt={ing.name}
              loading="lazy"
              decoding="async"
            />
            <div className={styles.body}>
              <span className={styles.name}>{ing.name}</span>
              <p className={styles.desc}>{ing.desc}</p>
              {ing.detail && (
                <button
                  type="button"
                  className={styles.readMore}
                  onClick={() => setOpen(ing)}
                >
                  {t(locale, 'result.readMore', READ_MORE)}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Заголовок следующей зоны, как в проде: он стоит внизу светлой зоны
          и нижней половиной уходит под тёмную сцену с флаконом.

          ДЛИНА СТРОКИ ОТДАЁТСЯ В CSS. Кегль в проде подобран под одну
          конкретную строку — «YOUR SCENT», десять знаков, — и записан
          как 15.5vw. На французском там «VOTRE PARFUM», двенадцать
          знаков, и строка уезжала за оба края экрана: она не переносится
          (white-space: nowrap), поэтому лишнее просто обрезалось.
          Теперь кегль делится на число знаков: 155/10 даёт прежние
          15.5vw для английского, 155/12 — 12.9vw для французского. */}
      <span
        ref={band$}
        className={styles.band}
        style={{ ['--band-len' as string]: band.length }}
        aria-hidden="true"
      >
        {band}
      </span>

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
              aria-label={t(locale, 'ui.close', 'Close')}
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.modalImg}
              src={cld(open.img, 'ingredientModal')}
              alt={open.name}
              decoding="async"
            />
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
