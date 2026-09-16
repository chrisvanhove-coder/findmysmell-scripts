'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cld } from '@/lib/cloudinary';
import { QUESTIONS } from '@/lib/quiz';
import { QUESTION_COPY } from '@/data/question-titles';
import data from '@/data/emotion-tiles.json';
import styles from './emotion-tiles.module.css';
import type { MechanicProps } from './mechanics';

/**
 * Семь экранов ветки эмоции — ОДНА механика: Q_CALM, Q_COZY, Q_ENERGY,
 * Q_FOCUS, Q_MYST, Q_PLAY, Q_SEXY. Перенесено из семи подвалов
 * q-calm/q-cozy/q-energy/q-focus/q-myst/q-play/q-sexy.
 *
 * Куда попадает человек: на Q_EMO он выбирает в барабане чувство, и
 * барабан уводит его на «свой» экран — «а чем для тебя пахнет
 * спокойствие?». Экраны различаются только вопросом, вариантами и
 * снимками, поэтому в проде это семь копий одного и того же кода, а
 * здесь один компонент и данные.
 *
 * ПРИЁМ. Вариантов шесть-семь, каждый — широкая плитка со скруглением
 * 15px, и снимок лежит у неё фоном (cover, center). Наведение растит
 * плитку до 1.04 и приглушает остальные до 0.4 за 200 мс. На телефоне
 * наводить нечем: первое касание показывает плитку крупнее, второе
 * выбирает, а касание мимо плиток всё сбрасывает.
 *
 * ЧИСЛА И РАЗМЕТКА ПРОДА СОХРАНЕНЫ (взяты из самой страницы Webflow
 * через API, а не на глаз): вопрос Highcruiser 55px белым, margin 8%/2%,
 * на medium 50px, на small 40px, на tiny 30px с margin-top 15%; сетка в
 * один столбец с разрывом 20px (17px на tiny) и отступом снизу 60px;
 * плитка шириной 50% по центру, padding 20px 0, радиус 15px, фон
 * #2a343a, line-height 30px, текст Montserrat 600 30px, на tiny 15px с
 * боковыми отступами 10px; на телефоне (≤768px) плитка на всю ширину и
 * не ниже 44px — это правило из custom code сайта. Приглушение 0.4,
 * рост 1.04, переход 200 мс.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. ВЕС. Прод грел все снимки страницы сразу — `new Image()` на
 *    каждый, 42 PNG по 1.2–1.8 МБ на семь экранов, около 8 МБ на
 *    каждом. Здесь они идут через Cloudinary в размере плитки: замер
 *    explicit API на calm-tea — 1 328 670 → 24 174 байта (в 55 раз
 *    меньше), то есть весь экран стал легче одного прежнего снимка.
 * 2. Плитки были ссылками `<a>` без адреса с обработчиком click:
 *    клавиатурой их было не выбрать, а читалка называла их ссылками.
 *    Здесь это кнопки.
 * 3. Наведение работало только мышью, поэтому человек, идущий табом,
 *    не видел ни снимка крупнее, ни приглушения остальных. Здесь фокус
 *    делает то же, что наведение.
 * 4. Второе касание на телефоне в проде нигде не было подписано —
 *    первый тап словно ничего не делал. Здесь под плитками появляется
 *    строка «Tap again to choose».
 * 5. `prefers-reduced-motion`: плитка не растёт и не приглушает
 *    остальных, выбор при этом работает как обычно.
 * 6. Своё зерно на каждой из семи страниц убрано: оно теперь общее.
 */

const PHOTOS = data.photos as Record<string, Record<string, string>>;

/** Есть ли у вопроса плитки со снимками. */
export function tilesFor(questionId: string): Record<string, string> | undefined {
  return PHOTOS[questionId];
}

const hoverSubscribe = (cb: () => void) => {
  const mq = window.matchMedia('(hover: none)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const noHoverNow = () => window.matchMedia('(hover: none)').matches;
const noHoverOnServer = () => false;

export default function EmotionTiles({ questionId, onChoose }: MechanicProps) {
  const question = QUESTIONS[questionId];
  const photos = PHOTOS[questionId] ?? {};
  const title = QUESTION_COPY[questionId]?.title ?? '';

  const noHover = useSyncExternalStore(hoverSubscribe, noHoverNow, noHoverOnServer);
  const [still, setStill] = useState(false);
  /** На какую плитку смотрят: мышь, фокус или первое касание. */
  const [looking, setLooking] = useState<string | null>(null);
  /** Какую плитку тронули пальцем — второе касание по ней выбирает. */
  const [tapped, setTapped] = useState<string | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStill(mq.matches);
    const onChange = () => setStill(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* Касание мимо плиток сбрасывает выделение — как в проде. Слушатель
     на своём корне, а не на document: в проде он висел на document
     и оставался там после уходa со страницы. */
  useEffect(() => {
    if (!noHover) return;
    const el = root.current;
    if (!el) return;
    const onTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-answer]')) return;
      setLooking(null);
      setTapped(null);
    };
    el.addEventListener('touchstart', onTouch, { passive: true });
    return () => el.removeEventListener('touchstart', onTouch);
  }, [noHover]);

  function press(code: string) {
    /* Телефон: первое касание по плитке со снимком показывает её
       крупнее, второе выбирает. У плиток без снимка («Other», «I don't
       need a smell for that») показывать нечего — они выбираются с
       первого касания, лишний тап был бы просто препятствием. */
    if (noHover && photos[code] && tapped !== code) {
      setTapped(code);
      setLooking(code);
      return;
    }
    onChoose(code);
  }

  return (
    <div
      ref={root}
      className={styles.stage}
      data-emotion-tiles={questionId}
    >
      <h1 className={styles.question}>{title}</h1>

      <ul className={styles.tiles}>
        {question.answers.map((a) => {
          const photo = photos[a.code];
          return (
            <li key={a.code} className={styles.row}>
              <button
                type="button"
                className={[
                  styles.tile,
                  photo ? styles.withPhoto : '',
                  !still && looking && looking !== a.code ? styles.dimmed : '',
                  !still && looking === a.code ? styles.lifted : '',
                ].filter(Boolean).join(' ')}
                style={photo ? {
                  backgroundImage: `url('${cld(photo, 'emotionTile')}')`,
                } : undefined}
                data-answer={a.code}
                id={`answer-${a.code}`}
                onMouseEnter={() => { if (!noHover) setLooking(a.code); }}
                onMouseLeave={() => { if (!noHover) setLooking(null); }}
                onFocus={() => { if (!noHover) setLooking(a.code); }}
                onBlur={() => { if (!noHover) setLooking(null); }}
                onClick={() => press(a.code)}
              >
                {/* Подпись поверх снимка: на светлых кадрах белый текст
                    без этой подложки не читается. В проде подложки не
                    было, и часть подписей тонула в фотографии. */}
                <span className={styles.label}>{a.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {noHover && tapped && photos[tapped] && (
        <p className={styles.tapAgain}>Tap again to choose</p>
      )}
    </div>
  );
}
