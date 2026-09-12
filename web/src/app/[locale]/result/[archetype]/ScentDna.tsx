'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArchetypeKey } from '@/lib/archetype-colors';
import { loadAnswers } from '@/lib/answers-store';
import { AXES, defaultsFor, dnaFrom, dnaPercent, type DnaValues } from '@/lib/dna';
import styles from './scent-dna.module.css';

/**
 * Первая зона результата: пять осей «ДНК аромата» и река между точками.
 * Порт зоны z1 из result48.js вместе с движком (см. lib/dna.ts).
 *
 * Три первые оси те же, что у шкал под флаконом, но шкала другая (1..4
 * против 0..3), а warmth и depth выводятся из посторонних ответов — про
 * атмосферу, эмоцию и праздник. Поэтому это отдельный расчёт, а не
 * переиспользование подбора.
 *
 * Сервер рисует дефолты архетипа: страница предгенерирована и должна
 * что-то показывать сразу, в том числе в превью ссылки. Ответы живут
 * только в браузере, поэтому уточнение — после монтирования, как
 * в ResultMatch.
 */

const TITLE = 'your scent dna';
const HINT = 'tap any axis to learn more';

// Слои реки: от широкого и почти прозрачного к узкому и заметному.
// Значения перенесены из drawRiver в result48.js.
const LAYERS = [
  { width: 70, alpha: 0.03 },
  { width: 56, alpha: 0.04 },
  { width: 42, alpha: 0.06 },
  { width: 30, alpha: 0.09 },
  { width: 20, alpha: 0.13 },
  { width: 12, alpha: 0.17 },
  { width: 5, alpha: 0.22 },
];

export default function ScentDna({
  archetype,
  quote,
}: {
  archetype: ArchetypeKey;
  quote: string;
}) {
  const [values, setValues] = useState<DnaValues>(() => defaultsFor(archetype));
  const [open, setOpen] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  const diagramRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const answers = loadAnswers();
    if (!Object.keys(answers).length) return;
    // Тот же случай, что в ResultMatch: страница предгенерирована,
    // ответы есть только в браузере — уточняем после монтирования.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(dnaFrom(answers, archetype));
  }, [archetype]);

  /** Рисует реку между точками осей по их реальному положению в разметке. */
  const drawRiver = useCallback(() => {
    const canvas = canvasRef.current;
    const diagram = diagramRef.current;
    if (!canvas || !diagram) return;

    const w = diagram.offsetWidth;
    const h = diagram.offsetHeight;
    if (!w || !h) return;

    // Рисуем в двойном разрешении, иначе линия мылится на ретине.
    const dpr = 2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const parentRect = diagram.getBoundingClientRect();
    const dots: { x: number; y: number }[] = [];
    for (const track of diagram.querySelectorAll<HTMLElement>('[data-track]')) {
      const dot = track.querySelector<HTMLElement>('[data-dot]');
      const bar = track.closest<HTMLElement>('[data-bar]');
      if (!dot || !bar) continue;
      const pct = parseFloat(dot.style.left) / 100;
      const trackRect = track.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      dots.push({
        x: trackRect.left - parentRect.left + trackRect.width * pct,
        y: barRect.top - parentRect.top + barRect.height / 2,
      });
    }
    if (dots.length < 2) return;

    for (const layer of LAYERS) {
      ctx.beginPath();
      ctx.moveTo(dots[0].x, dots[0].y);
      for (let i = 0; i < dots.length - 1; i++) {
        // Управляющие точки на середине по вертикали — так изгиб выходит
        // плавным, а не угловатым.
        const cpY = dots[i].y + (dots[i + 1].y - dots[i].y) * 0.5;
        ctx.bezierCurveTo(dots[i].x, cpY, dots[i + 1].x, cpY, dots[i + 1].x, dots[i + 1].y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${layer.alpha})`;
      ctx.lineWidth = layer.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }, []);

  // Перерисовываем при изменении значений, размера и раскрытия строки.
  // Раскрытие анимировано, поэтому конец анимации ловим через transitionend,
  // а не гадаем с задержками, как это делал прод.
  useEffect(() => {
    drawRiver();
    const diagram = diagramRef.current;
    if (!diagram) return;

    const observer = new ResizeObserver(() => drawRiver());
    observer.observe(diagram);

    const onEnd = () => drawRiver();
    diagram.addEventListener('transitionend', onEnd);

    return () => {
      observer.disconnect();
      diagram.removeEventListener('transitionend', onEnd);
    };
  }, [drawRiver, values, open]);

  const toggle = (i: number) => {
    setOpen((prev) => (prev === i ? null : i));
    setTouched(true);
  };

  return (
    <section className={styles.zone}>
      <h2 className={styles.title}>{TITLE}</h2>
      <p className={styles.quote}>{quote}</p>

      <div className={styles.diagram} ref={diagramRef}>
        <canvas className={styles.river} ref={canvasRef} aria-hidden="true" />

        {AXES.map((axis, i) => {
          const pct = dnaPercent(values[axis.key]);
          const isOpen = open === i;
          return (
            <div key={axis.key} className={styles.row}>
              <button
                type="button"
                className={styles.bar}
                data-bar=""
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-label={`${axis.lo} — ${axis.hi}`}
              >
                <span className={`${styles.label} ${isOpen ? styles.labelActive : ''}`}>
                  {axis.lo}
                </span>
                <span className={styles.track} data-track="">
                  {/* Метки четвертей: показывают, что шкала не бесконечная. */}
                  <span className={styles.ghost} style={{ left: '25%' }} />
                  <span className={styles.ghost} style={{ left: '50%' }} />
                  <span className={styles.ghost} style={{ left: '75%' }} />
                  <span className={styles.halo} style={{ left: `${pct}%` }} />
                  <span className={styles.dot} data-dot="" style={{ left: `${pct}%` }} />
                </span>
                <span
                  className={`${styles.label} ${styles.right} ${isOpen ? styles.labelActive : ''}`}
                >
                  {axis.hi}
                </span>
              </button>

              <div className={`${styles.expand} ${isOpen ? styles.expandOpen : ''}`}>
                <div className={styles.explain}>
                  <div className={styles.side}>
                    <div className={styles.word}>{axis.lo}</div>
                    <div className={styles.desc}>{axis.loDesc}</div>
                  </div>
                  <div className={styles.divider} />
                  <div className={styles.side}>
                    <div className={styles.word}>{axis.hi}</div>
                    <div className={styles.desc}>{axis.hiDesc}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className={`${styles.hint} ${touched ? styles.hintGone : ''}`}>{HINT}</p>
    </section>
  );
}
