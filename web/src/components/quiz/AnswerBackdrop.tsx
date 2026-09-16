'use client';

import { useEffect, useRef, useState } from 'react';
import { cld } from '@/lib/cloudinary';
import photos from '@/data/answer-photos.json';
import styles from './answer-backdrop.module.css';

/**
 * Фотография места на весь экран под вариантами ответа. Q_YOURSELF.
 * Перенесено из q-yourself.footer.html.
 *
 * Приём: человек ведёт мышью по вариантам, и за текстом проявляется
 * фотография того места — лес, город, вода, тихая комната, дорога.
 * Остальные варианты в это время приглушаются, чтобы читался тот, на
 * который он смотрит. На телефоне навести нельзя, поэтому там первое
 * касание показывает фотографию, а второе выбирает.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. ЭТО ОДИН ИЗ САМЫХ ТЯЖЁЛЫХ ЭКРАНОВ САЙТА. Прод при открытии вопроса
 *    прогревал все пять снимков в исходном размере: PNG 2048–4269px по
 *    2.8–3.0 МБ, около 14.5 МБ на экран. Здесь те же снимки идут через
 *    трансформацию Cloudinary: замер explicit API на feel-sea —
 *    2 937 385 → 126 930 байт, то есть в 23 раза меньше.
 * 2. Фотографии больше не грузятся все сразу: первой подгружается
 *    только та, на которую навели, остальные — когда браузер
 *    освободится (requestIdleCallback).
 * 3. Фон в проде был один слой, которому меняли background-image: пока
 *    новый снимок не скачался, экран оставался с прежним, а потом
 *    менялся рывком. Здесь два слоя и переход по opacity.
 * 4. Клавиатура: наведение было только мышью, поэтому человек, идущий
 *    по вариантам табом, фотографий не видел вовсе. Здесь фокус
 *    показывает снимок так же, как наведение.
 * 5. Второе касание на телефоне в проде нигде не было подписано: первый
 *    тап словно ничего не делал. Здесь под списком появляется строка
 *    «нажмите ещё раз, чтобы выбрать».
 * 6. prefers-reduced-motion: снимок появляется сразу, без плавности.
 */

export type PhotoMap = Record<string, string>;

const ALL = photos as unknown as Record<string, PhotoMap>;

/** Есть ли у вопроса фотографии под ответы. */
export function photosFor(questionId: string): PhotoMap | undefined {
  return ALL[questionId];
}

/** Ссылка на снимок в размере экрана. */
export function photoUrl(url: string): string {
  return cld(url, 'quizBackdrop');
}

export default function AnswerBackdrop({
  map,
  active,
}: {
  map: PhotoMap;
  /** Код варианта, на который смотрят, или null — тогда фон погашен. */
  active: string | null;
}) {
  const layers = useRef<Array<HTMLDivElement | null>>([]);
  const front = useRef(0);
  const shown = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  /* Остальные снимки — когда браузер освободится. Прод грел все пять
     сразу, и это давало те самые «картинки долго грузят». */
  useEffect(() => {
    const urls = Object.values(map).map(photoUrl);
    const warm = () => {
      for (const u of urls) {
        const img = new Image();
        img.src = u;
      }
      setReady(true);
    };
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (idle) {
      const id = idle(warm, { timeout: 3000 });
      return () => (window as unknown as {
        cancelIdleCallback?: (id: number) => void;
      }).cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 1200);
    return () => clearTimeout(t);
  }, [map]);

  /* Перекладываем слои сами, без перерисовки React: в кадре меняются
     только background-image и opacity двух элементов. */
  useEffect(() => {
    if (active === shown.current) return;
    shown.current = active;

    const back = layers.current[1 - front.current];
    const fore = layers.current[front.current];
    if (!back || !fore) return;

    if (!active || !map[active]) {
      fore.style.opacity = '0';
      back.style.opacity = '0';
      return;
    }

    back.style.backgroundImage = `url('${photoUrl(map[active])}')`;
    back.style.opacity = '1';
    fore.style.opacity = '0';
    front.current = 1 - front.current;
  }, [active, map]);

  return (
    <div
      className={styles.backdrop}
      aria-hidden="true"
      data-answer-backdrop={ready ? 'warm' : ''}
      /* Вуаль гасится вместе с фотографией: на обычном экране вопроса
         её быть не должно, иначе тёмный слой лежит поверх ничего. */
      data-photo={active && map[active] ? '1' : '0'}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          ref={(el) => { layers.current[i] = el; }}
          className={styles.layer}
          data-layer={i}
        />
      ))}
      {/* Тёмная вуаль: снимки светлые, а поверх них лежит текст вопроса
          и вариантов. Без неё контраст падает до нечитаемого. */}
      <div className={styles.veil} />
    </div>
  );
}
