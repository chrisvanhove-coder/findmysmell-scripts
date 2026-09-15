'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cld } from '@/lib/cloudinary';
import drum from '@/data/emotion-drum.json';
import styles from './emotion-drum.module.css';

/**
 * Барабан эмоций на Q_EMO. Перенесено из q-emo.footer.html.
 *
 * Приём: слова эмоций висят колонкой в окне высотой в одно слово, колонка
 * сама медленно крутится с момента открытия, её можно тянуть пальцем или
 * мышью, крутить колесом, шагать стрелками. Тап по окну выбирает то слово,
 * что стоит в центре. Фон страницы — фотография выбранной эмоции.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: слот 80px, автоскорость 0.4px/кадр, рывок при
 * загрузке 1100 мс амплитудой 22px, трение 0.9, доводка к ближайшему 0.12,
 * возврат к автовращению через 3 с простоя, пауза 800 мс после выбора.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. КРОССФЕЙД ФОНА В ПРОДЕ НЕ РАБОТАЛ. Там стоял
 *    `transition: background-image 0.6s ease`, а background-image не
 *    анимируется — фотографии сменялись рывком. Здесь два слоя, и
 *    переход идёт по opacity.
 * 2. Нет прослушки mousemove/mouseup на document навсегда: в проде они
 *    вешались один раз и жили всё время, даже когда барабан не нужен.
 * 3. Клавиатура: в проде барабан нельзя было тронуть с клавиатуры вовсе.
 *    Здесь это listbox — стрелки шагают, Enter и пробел выбирают.
 * 4. prefers-reduced-motion: барабан не крутится сам и не дёргается, но
 *    остаётся полностью управляемым.
 */

interface Item {
  code: string;
  word: string;
  img: string;
}

const ITEMS = drum.items as Item[];
const N = ITEMS.length;

const SLOT = 80;                 // высота одного слова, px
const TOTAL = N * SLOT;
const AUTO_SPEED = 0.4;          // px за кадр
const NUDGE_MS = 1100;
const NUDGE_PX = 22;
const FRICTION = 0.9;
const SNAP = 0.12;
const IDLE_BEFORE_AUTO_MS = 3000;
const PAUSE_AFTER_PICK_MS = 800;
const MIN_FONT = 16;

const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function EmotionDrum({
  onChoose,
}: {
  /** Вызывается с кодом ответа. Навигацию делает QuizScreen. */
  onChoose: (code: string) => void;
}) {
  const slot = useRef<HTMLDivElement | null>(null);
  const words = useRef<Array<HTMLDivElement | null>>([]);
  const layers = useRef<Array<HTMLDivElement | null>>([]);

  // Состояние анимации живёт в ref: перерисовка React здесь не нужна,
  // в кадре меняются только style.top у семи элементов.
  const offset = useRef(0);
  const velocity = useRef(0);
  const auto = useRef(true);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const touched = useRef(false);
  const startedAt = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownLayer = useRef(0);
  const shownIdx = useRef(-1);
  const locked = useRef(false);

  // В React попадает только то, что видно в разметке: какое слово
  // в центре (для читалки и подписи) и выбранное.
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  const srcs = useMemo(
    () => ITEMS.map((i) => ({
      wide: cld(i.img, 'quizBackdrop'),
      narrow: cld(i.img, 'quizBackdropMobile'),
    })),
    [],
  );

  /* Предзагрузка: фон должен появиться вместе со словом, а не после. */
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 700px)').matches;
    for (const s of srcs) {
      const img = new Image();
      img.src = narrow ? s.narrow : s.wide;
    }
  }, [srcs]);

  /* Подгонка кегля под ширину окна: самое длинное слово MYSTERIOUS
     не должно обрезаться. Меряем через canvas, а не пробными узлами
     в DOM, как в проде. */
  const fit = useCallback(() => {
    const el = slot.current;
    if (!el) return;
    const available = el.clientWidth - 16;
    if (available <= 0) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const longest = ITEMS.reduce((a, b) => (a.word.length >= b.word.length ? a : b)).word;
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue('--fms-sans').trim() || 'sans-serif';

    // Начинаем с кегля, который задан в CSS, и уменьшаем, пока не влезет.
    const start = Number.parseFloat(getComputedStyle(el).getPropertyValue('--drum-font')) || 48;
    let size = start;
    // letter-spacing canvas не учитывает — добавляем вручную, 0.12em.
    const widthAt = (px: number) => {
      ctx.font = `900 ${px}px ${family}`;
      return ctx.measureText(longest).width + longest.length * px * 0.12;
    };
    while (size > MIN_FONT && widthAt(size) > available) size -= 1;
    setFontSize(size);
  }, []);

  useEffect(() => {
    fit();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(fit, 150); };
    window.addEventListener('resize', onResize);
    // Шрифт грузится асинхронно; до него измерение врёт.
    document.fonts?.ready.then(fit).catch(() => {});
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [fit]);

  /* Кадровый цикл. Вся анимация здесь. */
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    auto.current = !reduced;
    startedAt.current = performance.now();
    let raf = 0;

    const paint = () => {
      // Рывок при загрузке: чисто визуальный, реального смещения
      // не меняет, поэтому на выбор не влияет.
      let nudge = 0;
      if (!touched.current && !reduced) {
        const t = (performance.now() - startedAt.current) / NUDGE_MS;
        if (t < 1) nudge = Math.sin(t * Math.PI * 3) * NUDGE_PX * (1 - t);
      }

      for (let i = 0; i < N; i += 1) {
        const el = words.current[i];
        if (!el) continue;
        let y = mod(i * SLOT - offset.current, TOTAL);
        if (y > TOTAL / 2) y -= TOTAL;
        el.style.top = `${y + nudge}px`;
        el.style.opacity = Math.abs(y) < SLOT ? '1' : '0';
      }

      const idx = mod(Math.round(offset.current / SLOT), N);
      if (idx !== shownIdx.current) {
        shownIdx.current = idx;
        setCurrent(idx);
        // Кроссфейд по-настоящему: два слоя, меняем прозрачность.
        const next = shownLayer.current === 0 ? 1 : 0;
        const el = layers.current[next];
        if (el) {
          el.style.backgroundImage = `url('${srcs[idx].wide}')`;
          el.style.opacity = '1';
          const prev = layers.current[shownLayer.current];
          if (prev) prev.style.opacity = '0';
          shownLayer.current = next;
        }
      }
    };

    const tick = () => {
      if (!dragging.current && !locked.current) {
        if (auto.current) {
          offset.current += AUTO_SPEED;
        } else if (Math.abs(velocity.current) > 0.2) {
          offset.current += velocity.current;
          velocity.current *= FRICTION;
        } else {
          velocity.current = 0;
          // Доводка к ближайшему слову, чтобы не застывать между строк.
          const nearest = Math.round(offset.current / SLOT) * SLOT;
          offset.current += (nearest - offset.current) * SNAP;
        }
      }
      offset.current = mod(offset.current, TOTAL);
      paint();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [srcs]);

  const markTouched = useCallback(() => { touched.current = true; }, []);

  const resumeAuto = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { auto.current = true; }, IDLE_BEFORE_AUTO_MS);
  }, []);

  const pick = useCallback(() => {
    if (locked.current) return;
    auto.current = false;
    velocity.current = 0;
    const nearest = Math.round(offset.current / SLOT) * SLOT;
    offset.current = mod(nearest, TOTAL);
    const idx = mod(Math.round(offset.current / SLOT), N);
    // Блокируем барабан: после выбора он не должен уехать под пальцем.
    locked.current = true;
    setPicked(idx);
    setTimeout(() => onChoose(ITEMS[idx].code), PAUSE_AFTER_PICK_MS);
  }, [onChoose]);

  const step = useCallback((dir: number) => {
    if (locked.current) return;
    markTouched();
    auto.current = false;
    velocity.current = 0;
    offset.current = mod(offset.current + dir * SLOT, TOTAL);
    resumeAuto();
  }, [markTouched, resumeAuto]);

  /* Тяга и колесо. Слушатели живут на САМОМ ОКНЕ барабана, а не на
     обёртке с кнопками, и не на document.

     Прод вешал их на обёртку, внутри которой лежат стрелки, и гасил
     всплытие вручную. Без этого нажатие на стрелку одновременно читалось
     как тап по барабану — то есть как выбор ответа, — и человек уезжал
     на следующий вопрос, просто пытаясь пролистнуть. Здесь область тяги
     это ровно то окно, которое видно, и гасить ничего не нужно. */
  useEffect(() => {
    const el = slot.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (locked.current) return;
      e.preventDefault();
      markTouched();
      auto.current = false;
      velocity.current = 0;
      offset.current += e.deltaY * 0.3;
      resumeAuto();
    };

    const begin = (y: number) => {
      if (locked.current) return;
      dragging.current = true;
      auto.current = false;
      velocity.current = 0;
      dragStartY.current = y;
      dragStartOffset.current = offset.current;
      lastY.current = y;
      lastT.current = Date.now();
      markTouched();
    };

    const move = (y: number) => {
      if (!dragging.current) return;
      const now = Date.now();
      velocity.current = (-(y - lastY.current) / Math.max(1, now - lastT.current)) * 16;
      lastY.current = y;
      lastT.current = now;
      offset.current = dragStartOffset.current - (y - dragStartY.current);
    };

    const end = (y: number, slack: number) => {
      if (!dragging.current) return;
      dragging.current = false;
      // Короткое касание — это тап, то есть выбор. Длинное — прокрутка.
      if (Math.abs(y - dragStartY.current) < slack) pick();
      else resumeAuto();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;   // касание ведёт touch-ветка
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
      end(e.clientY, 5);
    };

    const onTouchStart = (e: TouchEvent) => begin(e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      move(e.touches[0].clientY);
      e.preventDefault();      // иначе тянется страница, а не барабан
    };
    const onTouchEnd = (e: TouchEvent) => end(e.changedTouches[0].clientY, 10);

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [markTouched, pick, resumeAuto]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markTouched(); pick(); }
  };

  const chosenWord = picked !== null ? ITEMS[picked].word : null;

  return (
    <div className={styles.stage}>
      {/* Два слоя фона под кроссфейд. */}
      <div ref={(el) => { layers.current[0] = el; }} className={styles.backdrop} aria-hidden />
      <div ref={(el) => { layers.current[1] = el; }} className={styles.backdrop} aria-hidden />
      <div className={styles.veil} aria-hidden />

      <div className={styles.content}>
        <p className={styles.prefix}>
          {drum.prefix.map((line, i) => (
            <span key={i} className={styles.prefixLine}>{line}</span>
          ))}
        </p>

        <div className={styles.drum}>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowUp}`}
            onClick={() => step(-1)}
            aria-label="Previous"
            tabIndex={-1}
          >
            ↑
          </button>

          <div
            ref={slot}
            className={styles.slot}
            style={fontSize ? ({ ['--drum-size' as string]: `${fontSize}px` }) : undefined}
            role="listbox"
            tabIndex={0}
            aria-label="How do you want this perfume to make you feel?"
            aria-activedescendant={`emo-${ITEMS[current].code}`}
            onKeyDown={onKeyDown}
          >
            {ITEMS.map((item, i) => (
              <div
                key={item.code}
                id={`emo-${item.code}`}
                ref={(el) => { words.current[i] = el; }}
                className={styles.word}
                role="option"
                aria-selected={i === current}
              >
                {item.word}
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowDown}`}
            onClick={() => step(1)}
            aria-label="Next"
            tabIndex={-1}
          >
            ↓
          </button>
        </div>

        <p
          className={chosenWord ? `${styles.hint} ${styles.hintPicked}` : styles.hint}
          aria-live="polite"
        >
          {chosenWord ? `✓  ${chosenWord}` : drum.hint}
        </p>
      </div>
    </div>
  );
}
