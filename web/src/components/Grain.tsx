'use client';

import { useEffect, useRef } from 'react';
import styles from './grain.module.css';

/**
 * Живое зерно поверх всей страницы. Перенесено из #grain + grainLoop,
 * которые в проде лежали копиями на семи страницах (q-calm-now,
 * q-env-child, q-generation, q-region-now, q-sweet, q-wild и результат).
 * Здесь это один компонент в общей раскладке — зерно одинаковое везде.
 *
 * ПОЧЕМУ НЕ КАК В ПРОДЕ. Там каждые 80 мс заново создавался ImageData
 * НА ВЕСЬ ЭКРАН и заполнялся случайными байтами в цикле по пикселям.
 * На экране 2560×1440 это 14,7 МБ случайных чисел двенадцать раз в
 * секунду — заметный расход процессора и батареи ради шума, который
 * виден на 7% прозрачности.
 *
 * Здесь генерируется маленький квадрат шума (TILE×TILE), из него делается
 * паттерн, и он заливается по всему экрану одним fillRect. Работы примерно
 * в двести раз меньше. Чтобы не читалась сетка, начало паттерна каждый раз
 * сдвигается на случайную величину — на 7% overlay отличить тайловый шум
 * от уникального нельзя, а вот регулярность глаз бы поймал.
 *
 * prefers-reduced-motion: зерно остаётся, но перестаёт «кипеть» —
 * рисуется один раз. Это не анимация ради смысла, а текстура.
 */

const TILE = 128;          // сторона квадрата шума
const PERIOD_MS = 80;      // как в проде: ~12 кадров шума в секунду

export default function Grain() {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;

    // Отдельный маленький холст под сам шум.
    const tile = document.createElement('canvas');
    tile.width = TILE;
    tile.height = TILE;
    const tileCtx = tile.getContext('2d');
    if (!tileCtx) return;
    const noise = tileCtx.createImageData(TILE, TILE);

    const fillNoise = () => {
      const d = noise.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      tileCtx.putImageData(noise, 0, 0);
    };

    let width = 0;
    let height = 0;

    const resize = () => {
      // Без devicePixelRatio намеренно: зерно и должно быть пиксельным,
      // а на ретине это вчетверо больше работы ни за что.
      width = window.innerWidth;
      height = window.innerHeight;
      el.width = width;
      el.height = height;
    };

    const paint = () => {
      fillNoise();
      const pattern = ctx.createPattern(tile, 'repeat');
      if (!pattern) return;
      ctx.save();
      // Случайный сдвиг начала паттерна — иначе видна сетка 128×128.
      ctx.translate(-Math.random() * TILE, -Math.random() * TILE);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width + TILE, height + TILE);
      ctx.restore();
    };

    resize();
    paint();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf: number | null = null;
    let last = 0;

    const loop = (ts: number) => {
      if (ts - last > PERIOD_MS) {
        paint();
        last = ts;
      }
      raf = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    };

    const start = () => {
      if (raf === null && !reduced.matches) raf = requestAnimationFrame(loop);
    };

    // Во вкладке, которую не смотрят, шум крутить незачем.
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onResize = () => { resize(); paint(); };

    start();
    reduced.addEventListener('change', () => { stop(); start(); paint(); });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvas} className={styles.grain} data-grain aria-hidden />;
}
