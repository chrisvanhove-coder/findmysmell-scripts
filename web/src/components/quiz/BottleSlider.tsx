'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import sliders from '@/data/bottle-sliders.json';
import styles from './bottle-slider.module.css';

/**
 * Флакон, в котором уровень жидкости поднимают пальцем. Q_SWEET и Q_WILD.
 * Перенесено из q-sweet.footer.html и q-wild.footer.html.
 *
 * Заказчица про этот экран: «тут бутылки парфюмерные со сладостью и
 * rawness, пальцем мы поднимаем уровень, который тонам нужен».
 *
 * ПОЧЕМУ ЭТИ ДВА ВОПРОСА ВАЖНЕЕ ОСТАЛЬНЫХ. Они задают оси sweet и raw,
 * по которым потом подбирается флакон (lib/matching.ts). То есть ответ
 * здесь прямо меняет, какой парфюм человек получит, — в отличие от
 * вопросов, которые влияют только на архетип.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: холст 160×340, путь флакона теми же кривыми,
 * жидкость от y=295 вверх на 195px, четыре уровня 0 / 0.33 / 0.66 / 1,
 * доводка 0.12, чувствительность тяги 1.6, волна amp 3+frac*5 и
 * freq 0.044, шиммер белой линией 0.3.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. КЛАВИАТУРЫ НЕ БЫЛО ВОВСЕ. Ползунок, который нельзя тронуть ничем,
 *    кроме мыши и пальца. Здесь это role="slider": стрелки меняют
 *    уровень, Home и End ставят края, Enter подтверждает, и читалка
 *    называет выбранный уровень словами.
 * 2. Слушатели тяги висели на document и жили всё время. Здесь они
 *    на самом флаконе и снимаются при уходе со страницы.
 * 3. Кадровый цикл в проде крутился вечно — волна и подсказка
 *    анимировались всегда. Здесь цикл останавливается, когда всё
 *    успокоилось и подсказка уже скрыта.
 * 4. Холст рисовался 160×340 и растягивался до 180px шириной, то есть
 *    на любом экране с dpr>1 флакон был мылом. Здесь холст в размере
 *    устройства.
 * 5. Своё зерно на каждой странице не нужно: оно теперь общее.
 */

interface Level {
  code: string;
  label: string;
  fill: number;
  color: string;
}

interface Config {
  question: string[];
  paper: string;
  ink: string;
  hint: string;
  confirm: string;
  levels: Level[];
}

/* Геометрия флакона — как в проде. */
const W = 160;
const H = 340;
const BOTTOM = 295;        // дно жидкости
const SPAN = 195;          // насколько поднимается уровень
const SNAP = 0.12;
const DRAG_GAIN = 1.6;
const WAVE_STEP = 0.04;

function bottlePath(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(62, 0);
  c.lineTo(98, 0);
  c.lineTo(98, 48);
  c.bezierCurveTo(98, 68, 126, 80, 134, 100);
  c.lineTo(138, 260);
  c.quadraticCurveTo(138, 290, 108, 295);
  c.lineTo(52, 295);
  c.quadraticCurveTo(22, 290, 22, 260);
  c.lineTo(26, 100);
  c.bezierCurveTo(34, 80, 62, 68, 62, 48);
  c.closePath();
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function nearestIndex(levels: Level[], frac: number): number {
  let best = 0;
  let bestD = Infinity;
  levels.forEach((l, i) => {
    const d = Math.abs(l.fill - frac);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export default function BottleSlider({
  questionId,
  onChoose,
}: {
  questionId: string;
  onChoose: (code: string) => void;
}) {
  const cfg = (sliders as unknown as Record<string, Config>)[questionId];
  const levels = cfg.levels;

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const bottle = useRef<HTMLDivElement | null>(null);

  // Состояние анимации в ref: в кадре меняется только картинка на холсте.
  const fill = useRef(0);
  const target = useRef(0);
  const wave = useRef(0);
  const arrow = useRef(0);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartFill = useRef(0);
  const hintDone = useRef(false);
  const shownIdx = useRef(0);

  // В React уходит только то, что видно словами.
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [locked, setLocked] = useState(false);

  /* Рисование. Всё как в проде, плюс плотность устройства. */
  const draw = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;

    const frac = fill.current;
    const near = levels[nearestIndex(levels, frac)];
    const ink = cfg.ink;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    const dpr = el.width / W;
    ctx.scale(dpr, dpr);

    ctx.save();
    bottlePath(ctx);
    ctx.clip();

    // Стекло.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(0, 0, W, H);

    // Жидкость с волной.
    if (frac > 0.005) {
      const top = BOTTOM - frac * SPAN;
      const amp = 3 + frac * 5;
      const freq = 0.044;
      const t = wave.current;
      const lineAt = (x: number) =>
        top + Math.sin(x * freq + t) * amp + Math.sin(x * freq * 1.8 + t * 1.4) * amp * 0.35;

      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = lineAt(x);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, top, 0, H);
      grad.addColorStop(0, `${near.color}bb`);
      grad.addColorStop(1, `${near.color}ff`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Блик по кромке.
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = lineAt(x);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Блик на стекле.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(30, 100, 12, 180);
    ctx.restore();

    // Контур, воротник, крышка.
    bottlePath(ctx);
    ctx.strokeStyle = `rgba(${ink}, 0.28)`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(62, 52);
    ctx.lineTo(98, 52);
    ctx.strokeStyle = `rgba(${ink}, 0.15)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(56, 2, 48, 14, [3, 3, 0, 0]);
    else ctx.rect(56, 2, 48, 14);
    ctx.fillStyle = `rgba(${ink}, 0.18)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${ink}, 0.3)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Насечки уровней.
    for (const l of levels) {
      const y = BOTTOM - l.fill * SPAN;
      ctx.beginPath();
      ctx.moveTo(138, y);
      ctx.lineTo(146, y);
      ctx.strokeStyle = `rgba(${ink}, 0.18)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Подсказка: две галочки на пунктирной дорожке, «тяни вдоль».
    if (!hintDone.current) {
      const pulse = (Math.sin(arrow.current * 1.8) + 1) / 2;
      const spread = 14 + pulse * 10;
      const cx = 80;
      const cy = 190;
      ctx.save();
      ctx.globalAlpha = 0.6 + pulse * 0.3;
      ctx.strokeStyle = `rgba(${ink}, 0.85)`;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(cx, cy - spread + 12);
      ctx.lineTo(cx, cy + spread - 12);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.lineWidth = 2.5;
      for (const dir of [-1, 1]) {
        const y = cy + dir * spread;
        ctx.beginPath();
        ctx.moveTo(cx - 9, y + dir * 9);
        ctx.lineTo(cx, y);
        ctx.lineTo(cx + 9, y + dir * 9);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [cfg.ink, levels]);

  /* Кадровый цикл живёт внутри эффекта: он рекурсивный (кадр планирует
     следующий), и вынесенный наружу потребовал бы ссылки на себя до
     объявления. Запуск отдаётся наружу через ref — его зовут обработчики
     тяги и клавиатуры, когда жидкости снова нужно двигаться. */
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    let frame: number | null = null;

    const tick = () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!dragging.current) {
        fill.current += (target.current - fill.current) * SNAP;
        if (Math.abs(target.current - fill.current) < 0.001) fill.current = target.current;
      }
      if (!reduced) {
        wave.current += WAVE_STEP;
        if (!hintDone.current) arrow.current += WAVE_STEP;
      }

      const idx = nearestIndex(levels, fill.current);
      if (idx !== shownIdx.current) {
        shownIdx.current = idx;
        setIndex(idx);
      }

      draw();

      /* Крутить кадры незачем, если жидкость на месте, подсказка скрыта
         и движение выключено. В проде цикл не останавливался никогда:
         волна и подсказка анимировались всё время, что страница открыта. */
      const settled = !dragging.current
        && Math.abs(target.current - fill.current) < 0.001
        && hintDone.current
        && reduced;
      if (settled) { frame = null; return; }
      frame = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    kickRef.current = kick;
    kick();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      kickRef.current = () => {};
    };
  }, [draw, levels]);

  const kick = useCallback(() => { kickRef.current(); }, []);

  /* Размер холста под плотность устройства. */
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  const setLevel = useCallback((idx: number) => {
    const i = Math.max(0, Math.min(levels.length - 1, idx));
    hintDone.current = true;
    target.current = levels[i].fill;
    setTouched(true);
    setIndex(i);
    shownIdx.current = i;
    kick();
  }, [levels, kick]);

  /* Тяга. Слушатели на самом флаконе, а не на document. */
  useEffect(() => {
    const el = bottle.current;
    if (!el) return;

    const begin = (y: number) => {
      if (locked) return;
      dragging.current = true;
      hintDone.current = true;
      dragStartY.current = y;
      dragStartFill.current = fill.current;
      setTouched(true);
      kick();
    };

    const move = (y: number) => {
      if (!dragging.current) return;
      const height = el.getBoundingClientRect().height || 1;
      fill.current = clamp01(
        dragStartFill.current + ((dragStartY.current - y) / height) * DRAG_GAIN,
      );
    };

    const end = () => {
      if (!dragging.current) return;
      dragging.current = false;
      // Доводим до ближайшего уровня: промежуточных значений нет,
      // ответов всего четыре.
      const idx = nearestIndex(levels, fill.current);
      target.current = levels[idx].fill;
      setIndex(idx);
      shownIdx.current = idx;
      kick();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      begin(e.clientY);
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      move(e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      end();
    };
    const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      move(e.touches[0].clientY);
      e.preventDefault();     // иначе тянется страница, а не уровень
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', end);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', end);
    };
  }, [levels, kick, locked]);

  const confirm = useCallback(() => {
    if (locked) return;
    setLocked(true);
    onChoose(levels[index].code);
  }, [index, levels, locked, onChoose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (locked) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setLevel(index + 1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setLevel(index - 1); }
    else if (e.key === 'Home') { e.preventDefault(); setLevel(0); }
    else if (e.key === 'End') { e.preventDefault(); setLevel(levels.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (touched) confirm();
    }
  };

  return (
    <div
      className={styles.stage}
      style={{
        ['--paper' as string]: cfg.paper,
        ['--ink' as string]: cfg.ink,
      }}
      data-bottle-slider={questionId}
    >
      <p className={styles.question}>
        {cfg.question.map((line, i) => (
          <span key={i} className={styles.questionLine}>{line}</span>
        ))}
      </p>

      <div
        ref={bottle}
        className={styles.bottle}
        role="slider"
        tabIndex={0}
        aria-label={cfg.question.join(' ')}
        aria-valuemin={1}
        aria-valuemax={levels.length}
        aria-valuenow={index + 1}
        aria-valuetext={levels[index].label}
        onKeyDown={onKeyDown}
      >
        <canvas ref={canvas} className={styles.canvas} />
      </div>

      {/* Подпись читается вслух при смене уровня. */}
      <p className={styles.level} aria-live="polite">
        {touched ? levels[index].label : cfg.hint}
      </p>

      <button
        type="button"
        className={touched ? `${styles.confirm} ${styles.confirmOn}` : styles.confirm}
        onClick={confirm}
        // disabled и так говорит правду. aria-hidden здесь был бы ошибкой:
        // он убирает кнопку из дерева доступности, оставляя её
        // фокусируемой, и читалка про неё не знает, хотя она есть.
        disabled={!touched || locked}
      >
        {cfg.confirm}
      </button>
    </div>
  );
}
