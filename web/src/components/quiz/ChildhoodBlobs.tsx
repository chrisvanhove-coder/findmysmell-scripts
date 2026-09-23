'use client';

import { useEffect, useRef, useState } from 'react';
import data from '@/data/childhood-blobs.json';
import styles from './childhood-blobs.module.css';
import type { MechanicProps } from './mechanics';
import { tLines, shortLabel } from '@/lib/copy';

/**
 * Шары детства на Q_ENV_CHILD. Перенесено из q-env-child.footer.html.
 *
 * Заказчица про этот экран: «Где ты вырос — там шары эти большие тоже
 * анимированы и двигаются по экрану».
 *
 * Приём: по шалфейному полю медленно плывут четыре крупных терракотовых
 * шара, слегка меняя форму. Вопрос стоит в центре, четыре ответа — по
 * четырём углам вокруг него. На телефоне углы разворачиваются в столбик,
 * а шары продолжают плыть за текстом.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: те же четыре шара с теми же долями экрана,
 * радиусами и фазами, тот же цвет #c4503a на фоне #b8bfaa, та же
 * амплитуда дрожания формы 0.015 и наклона 0.25.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. СКОРОСТЬ ЗАВИСЕЛА ОТ ЧАСТОТЫ ЭКРАНА. Смещения прибавлялись на
 *    кадр (`b.x += 0.00007`), поэтому на экране 120 Гц шары ехали ровно
 *    вдвое быстрее, чем на 60 Гц, а при просадке кадров замедлялись.
 *    Здесь шаг считается от прошедшего времени, и картинка одинаковая
 *    на любом экране.
 * 2. Холст рисовался в CSS-пикселях: на любом экране с dpr>1 края
 *    больших плашек шли лестницей. Здесь холст в размере устройства.
 * 3. Ответы были div'ами с обработчиком click — по вопросу нельзя было
 *    пройти ни с клавиатуры, ни читалкой, и это единственный экран в
 *    квизе, где ответ вообще нельзя было выбрать без мыши. Здесь это
 *    настоящие кнопки в списке.
 * 4. Своё зерно на каждой странице не нужно: оно теперь общее
 *    (components/Grain.tsx), и прод рисовал его самым дорогим способом.
 * 5. prefers-reduced-motion в проде не учитывался вовсе: здесь шары
 *    просто стоят там, где начали.
 * 6. Кадровый цикл крутился и в спрятанной вкладке; слушатель resize
 *    не снимался.
 */

interface Blob {
  /** Доли ширины и высоты окна. */
  x: number;
  y: number;
  /** Радиус в долях меньшей стороны окна. */
  r: number;
  /** Доли экрана В СЕКУНДУ (в проде было на кадр — см. данные). */
  vx: number;
  vy: number;
  phase: number;
}

interface Answer {
  code: string;
  label: string;
  corner: 'tl' | 'tr' | 'bl' | 'br';
}

const BLOBS = data.blobs as Blob[];
const ANSWERS = data.answers as Answer[];

/** Дрожание формы и наклон — как в проде. */
const WOBBLE_AMP = 0.015;
const WOBBLE_RATE = 0.35;
const TILT_AMP = 0.25;
const TILT_RATE = 0.18;
/** В проде время шло шагом 0.01 на кадр, то есть 0.6 в секунду. */
const TIME_RATE = 0.6;
/** Пауза после выбора: галочку видно до перехода. Как в барабане эмоций. */
const PAUSE_AFTER_PICK_MS = 500;

export default function ChildhoodBlobs({ locale, onChoose }: MechanicProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const el = canvas.current;
    const context = el?.getContext('2d');
    if (!el || !context) return;
    // Отдельные имена, а не el/context: внутри функций ниже нужен тип
    // без null, и сужение объявлением надёжнее, чем сужение проверкой.
    const cv: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Свои копии: данные из json переиспользуются при повторном входе
    // на вопрос, и двигать их на месте нельзя.
    const blobs = BLOBS.map((b) => ({ ...b }));

    let w = 0;
    let h = 0;
    let frame = 0;
    let t = 0;
    let last = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still) draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = data.blob;
      const base = Math.min(w, h);
      for (const b of blobs) {
        const rad = b.r * base;
        const wobble = 1 + Math.sin(t * WOBBLE_RATE + b.phase) * WOBBLE_AMP;
        ctx.beginPath();
        ctx.ellipse(
          b.x * w,
          b.y * h,
          rad * wobble,
          rad / wobble,
          Math.sin(t * TILT_RATE + b.phase) * TILT_AMP,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    function step(ts: number) {
      // Первый кадр задаёт отсчёт; после возврата из спрятанной вкладки
      // разрыв может быть в минуты, поэтому шаг ограничен сверху.
      const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
      last = ts;
      t += dt * TIME_RATE;

      const base = Math.min(w, h);
      for (const b of blobs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Шар заворачивается, только когда ушёл за край целиком, и
        // возвращается с другой стороны тоже целиком за кадром. В проде
        // порог считался в долях осей, а радиус — в долях меньшей
        // стороны, и на широком экране шар прыгал заметно внутри поля.
        const mx = (b.r * base) / w;
        const my = (b.r * base) / h;
        if (b.x < -mx * 2) b.x = 1 + mx * 2;
        if (b.x > 1 + mx * 2) b.x = -mx * 2;
        if (b.y < -my * 2) b.y = 1 + my * 2;
        if (b.y > 1 + my * 2) b.y = -my * 2;
      }

      draw();
      frame = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);

    // В спрятанной вкладке браузер и сам не даёт кадров, но отсчёт
    // времени надо сбросить, иначе первый кадр после возврата придёт
    // с огромным dt.
    function onVisibility() {
      last = 0;
      if (still) return;
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(step);
    }
    document.addEventListener('visibilitychange', onVisibility);

    if (!still) frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!picked) return;
    const id = setTimeout(() => onChoose(picked), PAUSE_AFTER_PICK_MS);
    return () => clearTimeout(id);
  }, [picked, onChoose]);

  return (
    <div className={styles.stage} style={{ background: data.paper }} data-childhood-blobs="">
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" data-blobs="" />

      <div className={styles.cluster}>
        <h1 className={styles.question}>
          {tLines(locale, 'screen.Q_ENV_CHILD.question', data.question).map((line) => (
            <span key={line} className={styles.line}>
              {line}
            </span>
          ))}
        </h1>

        {ANSWERS.map((a) => (
          <button
            key={a.code}
            type="button"
            className={`${styles.ans} ${styles[a.corner]} ${picked === a.code ? styles.picked : ''}`}
            data-answer={a.code}
            // После выбора уже идёт переход: второй клик по другому углу
            // отправил бы человека не туда, куда он нажал первым.
            disabled={picked !== null}
            onClick={() => setPicked(a.code)}
          >
            {picked === a.code
              ? `✓ ${shortLabel(locale, a.code, a.label)}`
              : shortLabel(locale, a.code, a.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
