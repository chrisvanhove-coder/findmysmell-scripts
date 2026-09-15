'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './flashlight.module.css';

/**
 * Фонарик по текстуре. Перенесено с прода (.fms-personality-texture в
 * page-result-head.css.html + initTextureReveal в result48.js).
 *
 * КАК ЭТО РАБОТАЕТ. Поверх блока лежит слой с фотографией штукатурки,
 * замаскированный четырьмя радиальными градиентами. Три из них
 * ЗАПАЗДЫВАЮТ за курсором — каждый на кадр позади предыдущего, — и
 * получается не пятно, а след, будто ведёшь рукой по стене.
 *
 * ДВА ОТЛИЧИЯ ОТ ПРОДА, ОБА ОСОЗНАННЫЕ.
 *
 * 1. Прод писал шесть CSS-переменных на КАЖДОЕ событие mousemove —
 *    это по восемь записей в стиль на движение мыши, то есть работа
 *    в обход кадровой синхронизации. Здесь координаты складываются в
 *    ref, а в DOM уезжают один раз за кадр через requestAnimationFrame.
 *    Картинка та же, работы в разы меньше.
 *
 * 2. Прод сдвигал след каждый третий mousemove — то есть скорость следа
 *    зависела от частоты событий мыши, а не от времени. На мыши с
 *    частотой 1000 Hz след получался другой, чем на тачпаде. Здесь сдвиг
 *    происходит каждый третий КАДР, и приём ведёт себя одинаково.
 *
 * Уважает prefers-reduced-motion: там слой просто не двигается (маски
 * остаются за экраном, и текстуры не видно).
 */

const TRAIL = 4;                 // основной круг плюс три запаздывающих
const OFFSCREEN = -300;          // куда уводить маски, когда курсора нет
const FRAMES_PER_STEP = 3;       // через сколько кадров сдвигать след

type Point = { x: number; y: number };

export default function Flashlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const section = useRef<HTMLDivElement | null>(null);
  const texture = useRef<HTMLDivElement | null>(null);

  // Живое положение курсора и след. В ref, а не в состоянии: перерисовка
  // React здесь не нужна — меняются только CSS-переменные.
  const cursor = useRef<Point>({ x: OFFSCREEN, y: OFFSCREEN });
  const trail = useRef<Point[]>(
    Array.from({ length: TRAIL }, () => ({ x: OFFSCREEN, y: OFFSCREEN })),
  );
  const frame = useRef(0);
  const raf = useRef<number | null>(null);
  const active = useRef(false);

  // Цикл кадров живёт внутри эффекта, а не в useCallback: он рекурсивный
  // (кадр планирует следующий), и вынесенный наружу он потребовал бы
  // ссылки на себя до объявления.
  useEffect(() => {
    const el = section.current;
    if (!el) return;

    // Тем, кто просил меньше движения, фонарик не нужен: слой остаётся
    // невидимым, текст от этого не страдает.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const write = () => {
      const layer = texture.current;
      if (!layer) return;
      const t = trail.current;
      layer.style.setProperty('--mx', `${cursor.current.x}px`);
      layer.style.setProperty('--my', `${cursor.current.y}px`);
      for (let i = 1; i < TRAIL; i += 1) {
        layer.style.setProperty(`--mx${i}`, `${t[i].x}px`);
        layer.style.setProperty(`--my${i}`, `${t[i].y}px`);
      }
    };

    const stop = () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      active.current = false;
    };

    const tick = () => {
      frame.current += 1;
      if (frame.current % FRAMES_PER_STEP === 0) {
        const t = trail.current;
        for (let i = TRAIL - 1; i > 0; i -= 1) t[i] = t[i - 1];
        t[0] = { ...cursor.current };
      }
      write();
      raf.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (active.current) return;
      active.current = true;
      raf.current = requestAnimationFrame(tick);
    };

    const leave = () => {
      stop();
      cursor.current = { x: OFFSCREEN, y: OFFSCREEN };
      trail.current = Array.from({ length: TRAIL }, () => ({ x: OFFSCREEN, y: OFFSCREEN }));
      write();
    };

    const move = (x: number, y: number) => {
      const rect = el.getBoundingClientRect();
      cursor.current = { x: x - rect.left, y: y - rect.top };
      start();
    };

    const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    };

    // pointermove покрывает и мышь, и перо; touchmove нужен отдельно,
    // потому что на касании Safari не всегда шлёт pointermove.
    el.addEventListener('pointermove', onPointer);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('touchmove', onTouch, { passive: true });
    el.addEventListener('touchend', leave);

    return () => {
      el.removeEventListener('pointermove', onPointer);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('touchend', leave);
      stop();
    };
  }, []);

  return (
    <div ref={section} className={className ? `${styles.wrap} ${className}` : styles.wrap}>
      {/* aria-hidden: слой чисто декоративный, читалке про него знать нечего.
          data-flashlight — устойчивая зацепка для e2e: по классу из CSS
          Modules цепляться нельзя, имя генерируется сборкой. */}
      <div ref={texture} className={styles.texture} data-flashlight="texture" aria-hidden />
      <div className={styles.content} data-flashlight="content">{children}</div>
    </div>
  );
}
