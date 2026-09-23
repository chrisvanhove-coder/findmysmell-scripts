'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cldVideo, cldPoster } from '@/lib/cloudinary';
import { useReducedMotion } from '@/lib/reduced-motion';
import { QUESTIONS } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import data from '@/data/skin-bottles.json';
import styles from './skin-bottles.module.css';
import type { MechanicProps } from './mechanics';
import { t, answerLabel } from '@/lib/copy';

/**
 * Q_SKIN_BEHAVIOR — как духи ведут себя на коже. Перенесено из
 * q-skin-behavior.footer.html.
 *
 * ПРИЁМ. Пять вариантов широкими чёрными плитками, и у правого края
 * плитки живёт квадратик 56px с клипом флакона — своим на каждый
 * вариант. Клип показан только у одного варианта: сразу после открытия
 * у первого, потом (через 1.8 с) экран сам начинает перебирать их по
 * кругу каждые 2.2 с, пока человек не тронет экран. Наведение
 * показывает флакон своего варианта.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ (прочитаны из самой страницы Webflow через API
 * и из <style> в подвале): вопрос Highcruiser 55px белым, margin 10%/5%,
 * 40px на medium, 30px/35px на tiny; сетка в один столбец, разрыв 20px
 * (16px на tiny), отступ снизу 60px; плитка 50% ширины по центру,
 * чёрная, радиус 20px, Montserrat 30px белым, line-height 70px (45px на
 * small, 15px кегль на tiny), текст слева, отступ слева 20px и справа
 * 220px (100 / 80 / 35 на брейкпоинтах) — это место под флакон;
 * квадратик 56px (44 / 36), справа 12px (8), радиус 10px, скрытый
 * scale(0.7) и opacity 0, переход 300 мс, клип с mix-blend-mode: screen
 * на чёрном и object-fit: contain.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. ВЕС. Пять клипов 640×640 по 1.45–1.69 МБ, все с preload="auto" —
 *    около 7.9 МБ на экран, где флакон показан квадратиком 56 пикселей.
 *    Здесь клип идёт через трансформацию: замер explicit API на
 *    disappears_bottle — 1 635 951 → 27 899 байт (в 59 раз меньше).
 *    Плюс браузер тянет клип только того флакона, который уже
 *    показывали.
 * 2. ПЯТЬ КЛИПОВ ИГРАЛИ ВСЕГДА И ОДНОВРЕМЕННО. autoplay + loop стояли
 *    на всех пяти, а невидимые были лишь прозрачными — то есть
 *    браузер вечно декодировал пять видео вместо одного. Здесь играет
 *    только видимый.
 * 3. Варианты были ссылками `<a>` с обработчиком: клавиатурой не
 *    выбрать. Здесь кнопки, и фокус показывает флакон так же, как
 *    наведение.
 * 4. Перебор флаконов не останавливался никогда — `setInterval` жил до
 *    ухода со страницы, даже когда человек уже выбирал вариант. Здесь
 *    он снимается и по первому касанию, и при уходе с экрана.
 * 5. `prefers-reduced-motion`: перебора нет вовсе, клипы не играют, на
 *    месте флакона стоит первый кадр картинкой. Пять зацикленных видео —
 *    это именно то, от чего эта настройка защищает.
 * 6. Своё зерно на странице убрано: оно теперь общее.
 */

const BOTTLES = data.bottles as Record<string, string>;
const P = data.prodStyles;

/** Есть ли у вопроса флаконы. */
export function bottlesFor(questionId: string): Record<string, string> | undefined {
  return questionId === 'Q_SKIN_BEHAVIOR' ? BOTTLES : undefined;
}

const hoverSubscribe = (cb: () => void) => {
  const mq = window.matchMedia('(hover: none)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const noHoverNow = () => window.matchMedia('(hover: none)').matches;
const noHoverOnServer = () => false;

export default function SkinBottles({ questionId, locale, onChoose }: MechanicProps) {
  const answers = QUESTIONS[questionId].answers;
  const title = t(locale, `q.${questionId}.title`, QUESTION_COPY[questionId]?.title ?? '');

  const noHover = useSyncExternalStore(hoverSubscribe, noHoverNow, noHoverOnServer);
  /* Ответ нужен УЖЕ в первой отрисовке: иначе за один кадр до него
     браузер успевает начать качать клип, который просили не играть. */
  const still = useReducedMotion();
  /** Индекс варианта, чей флакон показан. */
  const [shown, setShown] = useState(0);
  /** Какие клипы уже разрешено грузить: сначала только первый. */
  const [loaded, setLoaded] = useState<number[]>([0]);
  /** Человек тронул экран — перебор больше не нужен. */
  const [touched, setTouched] = useState(false);
  const videos = useRef<Array<HTMLVideoElement | null>>([]);

  /* Перебор флаконов: пауза 1.8 с, потом каждые 2.2 с — как в проде.
     Снимается и по первому действию человека, и при уходе с экрана. */
  useEffect(() => {
    if (still || touched) return;
    let every: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      every = setInterval(() => {
        setShown((i) => {
          const next = (i + 1) % answers.length;
          setLoaded((cur) => (cur.includes(next) ? cur : [...cur, next]));
          return next;
        });
      }, P.walkEveryMs);
    }, P.walkStartMs);
    return () => {
      clearTimeout(start);
      if (every) clearInterval(every);
    };
  }, [still, touched, answers.length]);

  /* Играет только видимый клип. В проде играли все пять всегда. */
  useEffect(() => {
    if (still) return;
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === shown) v.play().catch(() => {});
      else v.pause();
    });
  }, [shown, still, loaded]);

  function look(i: number) {
    setTouched(true);
    setShown(i);
    setLoaded((cur) => (cur.includes(i) ? cur : [...cur, i]));
  }

  /* Касание: показать флакон этого варианта и не мешать выбору — на
     телефоне человек выбирает первым же тапом, как и в проде. Прод
     отличал касание от прокрутки по смещению больше 10px, и это стоит
     сохранить: иначе флаконы мигают, пока человек листает список. */
  const touchY = useRef(0);

  return (
    <div className={styles.stage} data-skin-bottles="">
      <h1 className={styles.question}>{title}</h1>

      <ul className={styles.tiles}>
        {answers.map((a, i) => {
          const clip = BOTTLES[a.code];
          const on = shown === i;
          return (
            <li key={a.code} className={styles.row}>
              <button
                type="button"
                className={styles.tile}
                data-answer={a.code}
                id={`answer-${a.code}`}
                onMouseEnter={() => { if (!noHover) look(i); }}
                onFocus={() => { if (!noHover) look(i); }}
                onTouchStart={(e) => {
                  setTouched(true);
                  touchY.current = e.touches[0]?.clientY ?? 0;
                }}
                onTouchEnd={(e) => {
                  const moved = Math.abs((e.changedTouches[0]?.clientY ?? 0) - touchY.current);
                  if (moved <= 10) look(i);
                }}
                onClick={() => onChoose(a.code)}
              >
                {answerLabel(locale, a.code, a.label)}
                {clip && (
                  <span
                    className={on ? `${styles.bottle} ${styles.bottleOn}` : styles.bottle}
                    aria-hidden="true"
                    data-bottle={a.code}
                  >
                    {still ? (
                      /* eslint-disable-next-line @next/next/no-img-element --
                         кадр уже приходит из Cloudinary в нужном размере
                         (so_0/c_limit/f_jpg/q_auto). */
                      <img src={cldPoster(clip, 160)} alt="" data-bottle-still={a.code} />
                    ) : (
                      <video
                        ref={(el) => { videos.current[i] = el; }}
                        /* Клип подставляется только когда этот флакон уже
                           показывали: иначе браузер начнёт тянуть все пять
                           сразу, как в проде. */
                        src={loaded.includes(i) ? cldVideo(clip, 'bottleBadge') : undefined}
                        poster={cldPoster(clip, 160)}
                        muted
                        loop
                        playsInline
                        preload={i === 0 ? 'auto' : 'none'}
                        data-bottle-video={a.code}
                      />
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
