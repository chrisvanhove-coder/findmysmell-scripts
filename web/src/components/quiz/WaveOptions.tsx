'use client';

import { useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '@/lib/quiz';
import data from '@/data/living-screens.json';
import styles from './wave-options.module.css';
import type { MechanicProps } from './mechanics';

/**
 * Q_STAYWELL — «что делает пространство своим». Перенесено из
 * q-staywell.footer.html.
 *
 * Заказчица про этот экран: «daytoday и staywell backgrounds все
 * шевелятся».
 *
 * Приём: по терракотовому полю идут двенадцать тонких кремовых волн, у
 * каждой своя амплитуда, частота и скорость. Вопрос выезжает слева,
 * варианты появляются по одному, и дальше строки тихо дышат — каждая со
 * своей фазой. Наведение приглушает остальные до 0.2, а тот, на который
 * смотрят, светлеет до песочного. Выбор уводит все строки вправо за
 * экран, и только потом идёт переход.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: поле #953d27, двенадцать линий с теми же
 * границами амплитуды 8–28, частоты 0.003–0.007, прозрачности 0.18–0.40
 * и толщины 0.4–1.2; вопрос выезжает с −60px за 0.6 с, варианты
 * появляются через 110 мс друг за другом начиная с 400 мс, дыхание
 * ±2.5px по вертикали и ±1.5px по горизонтали с фазой 0.55 на строку,
 * уход по 55 мс на строку за 0.55 с.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. Варианты были div'ами с обработчиком click: ни клавиатуры, ни
 *    читалки. Здесь список настоящих кнопок.
 * 2. Скорость волн и дыхания считалась НА КАДР — на экране 120 Гц всё
 *    шло вдвое быстрее. Теперь от времени.
 * 3. ДЫХАНИЕ МЕНЯЛО LETTER-SPACING КАЖДЫЙ КАДР. Это заставляет браузер
 *    заново раскладывать текст семи строк шестьдесят раз в секунду, а
 *    амплитуда там ±0.01em — на кегле 26px это четверть пикселя на
 *    букву, то есть невидимо. Осталось только смещение трансформой,
 *    которое ничего не пересчитывает.
 * 4. Холст линий рисовался в CSS-пикселях: на экранах с dpr>1 тонкие
 *    линии шли лестницей. Теперь холст в размере устройства.
 * 5. prefers-reduced-motion в проде не учитывался вовсе: волны шли,
 *    строки выезжали и дышали. Здесь всё стоит, а экран работает.
 * 6. Кадровый цикл линий крутился и в спрятанной вкладке; слушатель
 *    resize не снимался.
 */

const CFG = data.Q_STAYWELL;
const ANSWERS = QUESTIONS.Q_STAYWELL.answers;

/* Появление, как в проде. */
const QUESTION_IN_MS = 100;
const FIRST_OPTION_MS = 400;
const OPTION_GAP_MS = 110;
/* Дыхание строк. */
const BREATHE_PHASE = 0.55;
const BREATHE_Y = 2.5;
const BREATHE_X = 1.5;
/** В проде дыхание шло шагом 0.018 на кадр, то есть 1.08 в секунду. */
const BREATHE_RATE = 1.08;
/** В проде время линий шло шагом 0.09 на кадр, то есть 5.4 в секунду. */
const LINE_RATE = 5.4;
/* Уход после выбора. */
const EXIT_STEP_MS = 55;
const LEAVE_MS = 800;

interface Line {
  baseY: number;
  amplitude: number;
  freq: number;
  speed: number;
  phase: number;
  opacity: number;
  thickness: number;
}

export default function WaveOptions({ onChoose }: MechanicProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const [looking, setLooking] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [questionIn, setQuestionIn] = useState(false);

  /* Появление вопроса и строк. */
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestionIn(true);
      setShown(ANSWERS.length);
      return;
    }
    const timers: Array<ReturnType<typeof setTimeout>> = [
      setTimeout(() => setQuestionIn(true), QUESTION_IN_MS),
    ];
    ANSWERS.forEach((_, i) => {
      timers.push(setTimeout(() => setShown(i + 1), FIRST_OPTION_MS + i * OPTION_GAP_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  /* Волны на фоне и дыхание строк — один кадровый цикл на оба. */
  useEffect(() => {
    const el = canvas.current;
    const context = el?.getContext('2d');
    if (!el || !context) return;
    const cv: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Волны случайны при каждом открытии — как в проде. */
    const lines: Line[] = Array.from({ length: CFG.lineCount }, (_, i) => ({
      baseY: (i + 0.5) / CFG.lineCount,
      amplitude: 8 + Math.random() * 20,
      freq: 0.003 + Math.random() * 0.004,
      speed: 0.0004 + Math.random() * 0.0006,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.18 + Math.random() * 0.22,
      thickness: 0.4 + Math.random() * 0.8,
    }));
    /* Телефон: дыхания строк в проде не было вовсе — на узком экране
       оно превращалось в дрожь. Оставляю как в проде. */
    const narrow = window.matchMedia('(hover: none)').matches;

    let w = 0;
    let h = 0;
    let frame = 0;
    let lt = 0;
    let bt = 0;
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
      for (const line of lines) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${CFG.lineRgb}, ${line.opacity})`;
        ctx.lineWidth = line.thickness;
        for (let x = 0; x <= w; x += 3) {
          const y = line.baseY * h
            + Math.sin(x * line.freq + lt * line.speed * w + line.phase) * line.amplitude
            + Math.sin(
              x * line.freq * 1.7 + lt * line.speed * 0.6 * w + line.phase * 1.3,
            ) * line.amplitude * 0.4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    /**
     * Дыхание строк.
     *
     * ВАЖНО: двигается НАДПИСЬ ВНУТРИ кнопки, а не сама кнопка. В проде
     * дышала кнопка, и это значит, что цель для щелчка всё время уезжает
     * из-под пальца — навсегда, движение ведь не останавливается.
     * Playwright это и поймал: он отказался нажимать, потому что элемент
     * «не приходит в покой». Глазами разницы нет — надпись смещается на
     * те же ±2.5px, — а нажимать теперь есть во что.
     */
    function breathe() {
      if (narrow) return;
      ANSWERS.forEach((a, i) => {
        const btn = buttons.current[a.code];
        // Строку, которая ещё не появилась или уже уходит, не трогаем:
        // её положением распоряжается своя анимация.
        if (!btn || btn.dataset.exiting === '1' || btn.dataset.shown !== '1') return;
        const label = btn.firstElementChild as HTMLElement | null;
        if (!label) return;
        const ph = i * BREATHE_PHASE;
        const y = Math.sin(bt + ph) * BREATHE_Y;
        const x = Math.sin(bt * 0.6 + ph) * BREATHE_X;
        label.style.transform = `translate(${x}px, ${y}px)`;
      });
    }

    function step(ts: number) {
      const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
      last = ts;
      lt += dt * LINE_RATE;
      bt += dt * BREATHE_RATE;
      draw();
      breathe();
      frame = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);
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

  /* Уход строк вправо и переход. */
  useEffect(() => {
    if (!picked) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave = setTimeout(() => onChoose(picked), still ? 0 : LEAVE_MS);
    if (still) return () => clearTimeout(leave);

    const timers = ANSWERS.map((a, i) => setTimeout(() => {
      const btn = buttons.current[a.code];
      if (!btn) return;
      // Флаг для кадрового цикла: дыхание больше не должно перебивать
      // уход. В проде эти два обработчика боролись за transform.
      btn.dataset.exiting = '1';
      btn.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 1, 1), opacity 0.3s ease';
      btn.style.transform = 'translateX(120vw)';
      btn.style.opacity = '0';
    }, i * EXIT_STEP_MS));
    return () => { clearTimeout(leave); timers.forEach(clearTimeout); };
  }, [picked, onChoose]);

  return (
    <div className={styles.stage} style={{ background: CFG.paper }} data-wave-options="">
      <canvas ref={canvas} className={styles.lines} aria-hidden="true" data-lines="" />

      <div className={styles.inner}>
        <h1
          className={questionIn ? `${styles.question} ${styles.questionIn}` : styles.question}
          style={{ color: CFG.questionInk }}
        >
          {CFG.question}
        </h1>

        <ul className={styles.list}>
          {ANSWERS.map((a, i) => {
            const visible = i < shown;
            const dim = looking !== null && looking !== a.code;
            return (
              <li key={a.code}>
                <button
                  ref={(el) => { buttons.current[a.code] = el; }}
                  type="button"
                  className={styles.option}
                  style={{
                    opacity: picked ? undefined : (visible ? (dim ? CFG.dim : 1) : 0),
                    color: looking === a.code ? CFG.activeInk
                      : (dim ? '#fff' : CFG.optionInk),
                  }}
                  data-answer={a.code}
                  data-shown={visible ? '1' : '0'}
                  disabled={picked !== null || !visible}
                  onMouseEnter={() => setLooking(a.code)}
                  onMouseLeave={() => setLooking(null)}
                  onFocus={() => setLooking(a.code)}
                  onBlur={() => setLooking(null)}
                  onClick={() => { if (!picked) setPicked(a.code); }}
                >
                  <span className={styles.label} data-breathe="">{a.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
