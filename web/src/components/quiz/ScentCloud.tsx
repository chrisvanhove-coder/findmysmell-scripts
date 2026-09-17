'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/reduced-motion';
import data from '@/data/scent-cloud.json';
import styles from './scent-cloud.module.css';

/**
 * Облако запаха на Q_RADIUS. Перенесено из q-radius.footer.html.
 *
 * ПРИЁМ. Вопрос последний перед открытым: «пусть запах держится у кожи
 * или расходится вокруг?». По экрану медленно плывут вверх 28
 * полупрозрачных пузырей, а когда человек ведёт по вариантам, к
 * наведённому варианту перелетает светящийся шарик и РАСТЁТ по
 * «радиусу» этого варианта: 80 → 140 → 220 → 320 пикселей. То есть
 * ответ на вопрос показан размером, а не словами.
 *
 * ЭТО УКРАШЕНИЕ, А НЕ МЕХАНИКА. Список вариантов остаётся общим — ровно
 * как в проде, где страница была обычным списком Webflow, а шарик и
 * пузыри дорисовывал скрипт из подвала. Поэтому компонент ничего не
 * знает про выбор: ему говорят, на какой вариант смотрят, а он находит
 * кнопку по id и летит к её середине.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: шарик 12px в основании, показанный — по
 * размеру варианта, перелёт 0.5 с с перебросом
 * cubic-bezier(0.34, 1.56, 0.64, 1), размер 0.4 с, прозрачность 0.3 с,
 * радиальный градиент #f1e09b 0.9 → 0.4 на 40% → 0 на 70%; пузырей 28,
 * радиус 4–18px, прозрачность 0.15–0.7, заливка вполовину от неё, обод
 * 1.2px, блик радиусом 0.18 от пузыря со смещением 0.3 и прозрачностью
 * 0.7 от пузыря.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. СКОРОСТИ БЫЛИ НА КАДР. Пузыри прибавляли смещение каждый кадр, то
 *    есть на экране 120 Гц поднимались вдвое быстрее, чем задумано.
 *    Здесь всё в единицах в секунду (прод × 60).
 * 2. ХОЛСТ БЫЛ НЕ В РАЗМЕРЕ УСТРОЙСТВА: `cvs.width = innerWidth`, то
 *    есть на любом экране с dpr > 1 пузыри были мылом. Здесь холст в
 *    пикселях устройства.
 * 3. КАДРЫ КРУТИЛИСЬ ВЕЧНО, даже когда вкладка спрятана. Здесь цикл
 *    останавливается, пока страницу не видно.
 * 4. `prefers-reduced-motion`: пузыри рисуются один раз и стоят, шарик
 *    появляется без перелёта. Двадцать восемь вечно плывущих кругов —
 *    это именно то, от чего эта настройка защищает.
 * 5. На мобильном в проде шарик показывался на 1 секунду и был ВСЕГДА
 *    320px: класс `.visible` уменьшал его до 120px через media-запрос,
 *    но JS ставил размер инлайном, а инлайн сильнее. То есть уменьшение
 *    на телефоне не работало ни разу. Здесь размер варианта ужимается
 *    под ширину экрана.
 * 6. Шарик и холст жили в `document.body` и оставались там после уходa
 *    со страницы. Здесь они живут внутри экрана вопроса.
 */

const B = data.bubbles;
const BALL = data.ball;
const SIZES = BALL.sizes as Record<string, number>;

/** Есть ли у вопроса облако. Пока такой вопрос один. */
export function cloudFor(questionId: string): boolean {
  return questionId === 'Q_RADIUS';
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
}

export default function ScentCloud({ active }: {
  /** Код варианта, на который смотрят, или null — тогда шарика нет. */
  active: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const ball = useRef<HTMLDivElement | null>(null);
  const still = useReducedMotion();

  /* ── Пузыри ── */
  useEffect(() => {
    const el = canvas.current;
    const context = el?.getContext('2d');
    if (!el || !context) return;
    const cv: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    let w = 0;
    let h = 0;
    let frame = 0;
    let last = 0;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    function make(atBottom = false): Bubble {
      const r = rnd(B.radiusMin, B.radiusMax);
      return {
        x: Math.random() * w,
        y: atBottom ? h + r : Math.random() * h,
        r,
        vx: (Math.random() - 0.5) * B.driftX,
        vy: -rnd(B.riseMin, B.riseMax),
        opacity: rnd(B.opacityMin, B.opacityMax),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: rnd(B.wobbleSpeedMin, B.wobbleSpeedMax),
      };
    }

    let bubbles: Bubble[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bubbles.length === 0) {
        bubbles = Array.from({ length: B.count }, () => make());
      }
      if (still) draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${data.color}, ${b.opacity * B.fillOfOpacity})`;
        ctx.fill();
        // Обод чуть плотнее заливки — так пузырь читается как пузырь.
        ctx.strokeStyle = `rgba(${data.color}, ${b.opacity})`;
        ctx.lineWidth = B.rimWidth;
        ctx.stroke();
        // Блик слева сверху.
        ctx.beginPath();
        ctx.arc(
          b.x - b.r * B.highlightOffsetOfRadius,
          b.y - b.r * B.highlightOffsetOfRadius,
          b.r * B.highlightOfRadius,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity * B.highlightOfOpacity})`;
        ctx.fill();
      }
    }

    function step(ts: number) {
      /* Первый кадр задаёт отсчёт; после возврата из спрятанной вкладки
         разрыв может быть в минуты, поэтому шаг ограничен сверху. */
      const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
      last = ts;

      for (const b of bubbles) {
        b.wobble += b.wobbleSpeed * dt;
        b.x += (b.vx + Math.sin(b.wobble) * B.wobbleAmp) * dt;
        b.y += b.vy * dt;

        // Уплыл за верх — рождается снизу заново, как в проде.
        if (b.y + b.r < 0) Object.assign(b, make(true));
        if (b.x + b.r < 0) b.x = w + b.r;
        if (b.x - b.r > w) b.x = -b.r;
      }

      draw();
      frame = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);

    /* Кадры не крутятся, пока страницу не видно: в проде цикл жил
       вечно и грел процессор в спрятанной вкладке. */
    function run() {
      if (still || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(step);
    }
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
    function onVisibility() {
      stop();
      run();
    }
    document.addEventListener('visibilitychange', onVisibility);
    run();

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [still]);

  /* ── Шарик ── */
  useEffect(() => {
    const el = ball.current;
    if (!el) return;

    if (!active || !SIZES[active]) {
      el.classList.remove(styles.ballOn);
      return;
    }

    const btn = document.getElementById(`answer-${active}`);
    if (!btn) return;
    const r = btn.getBoundingClientRect();

    /* Размер варианта — «радиус» его запаха. Но не шире экрана: в проде
       на телефоне шарик оставался 320px, потому что media-запрос
       перебивался инлайновым размером. */
    const limit = Math.min(window.innerWidth, window.innerHeight) * 0.9;
    const size = Math.min(SIZES[active], limit);

    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + r.height / 2}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.classList.add(styles.ballOn);
  }, [active]);

  return (
    <div className={styles.cloud} aria-hidden="true" data-scent-cloud="">
      <canvas ref={canvas} className={styles.bubbles} data-bubbles="" />
      <div ref={ball} className={styles.ball} data-ball="" />
    </div>
  );
}
