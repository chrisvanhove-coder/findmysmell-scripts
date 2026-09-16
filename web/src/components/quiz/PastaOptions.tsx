'use client';

import { useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '@/lib/quiz';
import data from '@/data/living-screens.json';
import styles from './pasta-options.module.css';
import type { MechanicProps } from './mechanics';

/**
 * Q_DAYTDAY — «идеальный день». Перенесено из q-daytday.footer.html.
 *
 * Заказчица про этот экран: «daytoday и staywell backgrounds все
 * шевелятся».
 *
 * Приём: по шалфейному полю медленно плывут пять мягких чернильных
 * пятен — терракотовых и оливковых. Варианты падают сверху, как
 * брошенная горсть: каждый со своим наклоном, своим сдвигом и своей
 * задержкой, и в конце слегка отпрыгивает. Наведение приглушает
 * остальные до 0.15. Выбранный вариант рассыпается в пыль, пятна гаснут,
 * и только потом идёт переход.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: поле #c0c0ac, пять пятен с теми же долями
 * экрана, радиусами и фазами, дрожание формы 0.06, наклон 0.4,
 * приглушение 0.15, падение 520–740 мс, отскок 220 мс, рассыпание
 * 55 кадров ≈ 900 мс, затухание пятен 0.018 за кадр.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. Варианты были div'ами с обработчиком click: ни клавиатуры, ни
 *    читалки. Здесь список настоящих кнопок.
 * 2. Скорости пятен и затухание считались НА КАДР, поэтому на экране
 *    120 Гц всё шло вдвое быстрее. Теперь от времени.
 * 3. Рассыпание в проде тоже жило в кадрах (55 штук), а переход шёл по
 *    setTimeout(900) независимо от него: на медленном устройстве
 *    страница уходила раньше, чем пыль улеглась. Теперь и то и другое
 *    от одного времени.
 * 4. Своё зерно на странице (полноэкранный createImageData каждые 80 мс)
 *    убрано: зерно теперь общее, и считается оно на порядок дешевле.
 * 5. prefers-reduced-motion в проде не учитывался: варианты падали,
 *    пятна плыли, текст рассыпался. Здесь всё это выключено, а экран
 *    остаётся полностью рабочим.
 * 6. Холст рисовался в CSS-пикселях — мягкие градиенты шли полосами
 *    на экранах с dpr>1.
 */

interface Blob {
  x: number;
  y: number;
  r: number;
  /** Доли экрана в СЕКУНДУ (в проде было на кадр). */
  vx: number;
  vy: number;
  phase: number;
  /** «139, 58, 34» — цвет пятна без альфы. */
  rgb: string;
}

const CFG = data.Q_DAYTDAY;
const BLOBS = CFG.blobs as Blob[];
const ANSWERS = QUESTIONS.Q_DAYTDAY.answers;
const TEXT = CFG.options as Record<string, string>;

/**
 * Что показать на экране. Берём текст с живого сайта, а не полную
 * формулировку из quiz.en.json: заказчица прислала скриншоты и сказала
 * «возьми там». Код ответа при этом остаётся из квиза — показываем
 * короткое, записываем то же самое. Если для кода текста нет, честно
 * показываем полный: молча потерять вариант нельзя.
 */
const label = (code: string) =>
  TEXT[code] ?? ANSWERS.find((a) => a.code === code)?.label ?? code;

/* Пятна: дрожание формы и наклон — как в проде. */
const WOBBLE_AMP = 0.06;
const WOBBLE_RATE = 0.3;
const TILT_AMP = 0.4;
const TILT_RATE = 0.15;
/** В проде время шло шагом 0.008 на кадр, то есть 0.48 в секунду. */
const TIME_RATE = 0.48;
/** Затухание пятен после выбора: 0.018 за кадр ≈ 1.08 за секунду. */
const FADE_RATE = 1.08;

/** Рассыпание: 55 кадров прода ≈ 0.92 с. */
const DUST_MS = 920;
/** Через столько после выбора идём дальше — как в проде. */
const LEAVE_MS = 900;
/* Прод добавлял пылинке 0.12 px/кадр за кадр. В секундах это
   0.12 × 60 × 60 = 432 px/с². */
const GRAVITY = 432;

export default function PastaOptions({ onChoose }: MechanicProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const dust = useRef<HTMLCanvasElement | null>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const [looking, setLooking] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  /* Пятна гасятся из кадрового цикла, поэтому выбор ему нужен в ref. */
  const pickedRef = useRef<string | null>(null);

  /* Варианты падают сверху. Случайные сдвиги и задержки — как в проде.
     ЗАЧЕМ ВСЁ ЭТО ВНУТРИ ЭФФЕКТА. Math.random во время отрисовки — это
     непредсказуемый результат при любой лишней перерисовке, и линтер
     справедливо это запрещает. Начальное положение (за верхним краем и
     прозрачное) стоит в CSS, а свой наклон и сдвиг каждая строка
     получает здесь, до начала падения. */
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      for (const a of ANSWERS) {
        const el = buttons.current[a.code];
        if (el) { el.style.transform = 'none'; el.style.opacity = '1'; }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanded(true);
      return;
    }

    const fall = ANSWERS.map(() => ({
      x: (Math.random() - 0.5) * 500,
      rot: (Math.random() - 0.5) * 70,
      delay: Math.random() * 350 + Math.random() * 150,
      duration: 520 + Math.random() * 220,
    }));
    ANSWERS.forEach((a, i) => {
      const el = buttons.current[a.code];
      if (el) {
        el.style.transform = `translateX(${fall[i].x}px) rotate(${fall[i].rot}deg)`
          + ' translateY(-600px)';
      }
    });

    const timers = ANSWERS.map((a, i) => {
      const cfg = fall[i];
      return setTimeout(() => {
        const el = buttons.current[a.code];
        if (!el) return;
        el.style.transition = `transform ${cfg.duration}ms cubic-bezier(0.22, 1, 0.36, 1),`
          + ' opacity 0.3s ease';
        el.style.transform = `translateX(${cfg.x * 0.12}px) rotate(${cfg.rot * 0.12}deg)`
          + ' translateY(12px)';
        el.style.opacity = '1';
        // Отскок: два шага, как в проде.
        setTimeout(() => {
          el.style.transition = 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)';
          el.style.transform = 'translateY(-5px)';
          setTimeout(() => {
            el.style.transition = 'transform 0.15s ease';
            el.style.transform = 'none';
          }, 220);
        }, cfg.duration);
      }, cfg.delay);
    });
    // Пока варианты летят, нажимать нечего — они ещё не на месте.
    const done = setTimeout(() => setLanded(true),
      Math.max(...fall.map((c) => c.delay + c.duration + 380)));
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  /* Чернильные пятна. */
  useEffect(() => {
    const el = canvas.current;
    const context = el?.getContext('2d');
    if (!el || !context) return;
    const cv: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const blobs = BLOBS.map((b) => ({ ...b }));

    let w = 0;
    let h = 0;
    let frame = 0;
    let t = 0;
    let last = 0;
    let alpha = 1;

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
      const base = Math.min(w, h);
      for (const b of blobs) {
        const cx = b.x * w;
        const cy = b.y * h;
        const rad = b.r * base;
        const wobble = 1 + Math.sin(t * WOBBLE_RATE + b.phase) * WOBBLE_AMP;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * wobble);
        grad.addColorStop(0, `rgba(${b.rgb}, ${0.55 * alpha})`);
        grad.addColorStop(0.5, `rgba(${b.rgb}, ${0.25 * alpha})`);
        grad.addColorStop(1, `rgba(${b.rgb}, 0)`);
        ctx.beginPath();
        ctx.ellipse(
          cx, cy,
          rad * wobble,
          rad / wobble,
          Math.sin(t * TILT_RATE + b.phase) * TILT_AMP,
          0, Math.PI * 2,
        );
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    function step(ts: number) {
      const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
      last = ts;
      t += dt * TIME_RATE;

      if (pickedRef.current) {
        alpha = Math.max(0, alpha - FADE_RATE * dt);
      } else {
        const base = Math.min(w, h);
        for (const b of blobs) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          const mx = (b.r * base) / w;
          const my = (b.r * base) / h;
          if (b.x < -mx) b.x = 1 + mx;
          if (b.x > 1 + mx) b.x = -mx;
          if (b.y < -my) b.y = 1 + my;
          if (b.y > 1 + my) b.y = -my;
        }
      }

      draw();
      if (alpha > 0) frame = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener('resize', resize);
    function onVisibility() {
      last = 0;
      if (still) return;
      cancelAnimationFrame(frame);
      if (!document.hidden && alpha > 0) frame = requestAnimationFrame(step);
    }
    document.addEventListener('visibilitychange', onVisibility);
    if (!still) frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /* Рассыпание выбранного варианта в пыль и переход. */
  useEffect(() => {
    if (!picked) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave = setTimeout(() => onChoose(picked), still ? 0 : LEAVE_MS);
    if (still) return () => clearTimeout(leave);

    const cv = dust.current;
    const btn = buttons.current[picked];
    const ctx = cv?.getContext('2d');
    if (!cv || !btn || !ctx) return () => clearTimeout(leave);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Берём буквы с экрана так, как они там стоят. В проде текст
       перерисовывался одной строкой по центру рамки — если вариант
       переносился на две строки, пыль складывалась не из того, что
       человек видел. Здесь каждая строка рисуется на своём месте. */
    const rect = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    const fontSize = Number.parseFloat(cs.fontSize);
    const PAD = 40;
    const off = document.createElement('canvas');
    off.width = Math.ceil(rect.width + PAD * 2);
    off.height = Math.ceil(rect.height + PAD * 2);
    const oc = off.getContext('2d');
    if (!oc) return () => clearTimeout(leave);
    oc.font = `${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
    oc.fillStyle = CFG.optionInk;
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    const lineH = Number.parseFloat(cs.lineHeight) || fontSize * 1.2;
    const lines = wrap(oc, btn.textContent ?? '', rect.width);
    const top = PAD + (rect.height - lines.length * lineH) / 2 + lineH / 2;
    lines.forEach((line, i) => oc.fillText(line, off.width / 2, top + i * lineH));

    const img = oc.getImageData(0, 0, off.width, off.height);
    const STEP = Math.max(2, Math.floor(fontSize / 8));
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; spin: number; rot: number;
    }> = [];
    for (let y = 0; y < off.height; y += STEP) {
      for (let x = 0; x < off.width; x += STEP) {
        if (img.data[(y * off.width + x) * 4 + 3] <= 80) continue;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        particles.push({
          x: rect.left - PAD + x,
          y: rect.top - PAD + y,
          // Скорости прода были на кадр — переводим в пиксели в секунду.
          vx: Math.cos(angle) * speed * 60,
          vy: (Math.sin(angle) * speed - 1.2) * 60,
          size: STEP * (0.8 + Math.random() * 1.2),
          spin: (Math.random() - 0.5) * 0.3 * 60,
          rot: Math.random() * Math.PI * 2,
        });
      }
    }

    let raf = 0;
    let started = 0;
    let prev = 0;
    const tick = (ts: number) => {
      if (!started) { started = ts; prev = ts; }
      const dt = Math.min((ts - prev) / 1000, 0.05);
      prev = ts;
      const progress = (ts - started) / DUST_MS;

      ctx.clearRect(0, 0, w, h);
      const a = Math.max(0, 1 - progress * 1.4);
      if (a > 0) {
        ctx.fillStyle = CFG.optionInk;
        for (const p of particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += GRAVITY * dt;
          p.vx *= Math.pow(0.97, dt * 60);
          p.rot += p.spin * dt;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }
      if (progress < 1) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);

    return () => { clearTimeout(leave); cancelAnimationFrame(raf); };
  }, [picked, onChoose]);

  function pick(code: string) {
    // Страховка: до `landed` кнопки и так недоступны (см. disabled),
    // но программный вызов мимо кнопки не должен уводить с экрана,
    // пока строки ещё летят.
    if (picked || !landed) return;
    pickedRef.current = code;
    setPicked(code);
  }

  return (
    <div
      className={styles.stage}
      style={{ background: CFG.paper }}
      data-pasta-options=""
    >
      <canvas ref={canvas} className={styles.blobs} aria-hidden="true" data-blobs="" />

      <div className={styles.inner}>
        <h1 className={styles.question} style={{ color: CFG.questionInk }}>
          {CFG.question}
        </h1>

        <ul className={styles.list}>
          {ANSWERS.map((a) => (
            <li key={a.code}>
              <button
                ref={(el) => { buttons.current[a.code] = el; }}
                type="button"
                className={[
                  styles.option,
                  picked ? styles.gone : '',
                  !picked && looking && looking !== a.code ? styles.dimmed : '',
                ].filter(Boolean).join(' ')}
                style={{ color: CFG.optionInk }}
                data-answer={a.code}
                /* Пока варианты падают, кнопка ДОЛЖНА быть недоступна, а
                   не просто игнорировать нажатие. Иначе она выглядит
                   нажимаемой, палец по ней попадает — и ничего не
                   происходит. Поймано сквозным тестом: он щёлкнул по
                   доступной кнопке и завис, ожидая перехода. */
                disabled={picked !== null || !landed}
                onMouseEnter={() => setLooking(a.code)}
                onMouseLeave={() => setLooking(null)}
                onFocus={() => setLooking(a.code)}
                onBlur={() => setLooking(null)}
                onClick={() => pick(a.code)}
              >
                {label(a.code)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <canvas ref={dust} className={styles.dust} aria-hidden="true" data-dust="" />
    </div>
  );
}

/** Разбивка строки по ширине — чтобы пыль совпала с тем, что на экране. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
