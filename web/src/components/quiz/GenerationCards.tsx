'use client';

import { useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '@/lib/quiz';
import data from '@/data/generation-cards.json';
import styles from './generation-cards.module.css';
import type { MechanicProps } from './mechanics';

/**
 * Q_GENERATION — «к какому поколению вы себя относите». Перенесено из
 * q-generation.footer.html.
 *
 * Приём: четыре карточки, и каждая — живая текстура того носителя, на
 * котором это поколение выросло. Цифровой шум с голубым свечением для
 * Gen Z, киноплёнка с перфорацией и тёплым зерном для миллениалов,
 * зелёные строчки VHS для Gen X, чёрно-белое зерно с царапинами для
 * бумеров. Годы написаны прямо на текстуре. Наведение приглушает
 * остальные до 0.5.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: поле #3d3d20, смена кадра каждые 150 мс,
 * приглушение 0.5, пауза 600 мс после выбора, те же цвета свечения и
 * те же параметры каждой текстуры.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. ПЯТЫЙ ВАРИАНТ «OTHER» РАЗОБРАН ДО КОНЦА. В quiz.en.json он был, а
 *    карточки под него на живом сайте нет — существовал только как
 *    скрытая кнопка Webflow, то есть выбрать его было нельзя вообще.
 *    Я сначала добавил его отдельной строкой, заказчица решила иначе:
 *    «there are no other people different age from the categories I
 *    already listed». Код выведен из оборота в retired-answers.ts, и
 *    теперь на экране ровно столько вариантов, сколько в квизе.
 *    Проверено: в старой таблице (89 прохождений) этого кода нет ни в
 *    одной строке.
 * 2. Карточки были div'ами с обработчиком click: ни клавиатуры, ни
 *    читалки. А годы нарисованы НА ХОЛСТЕ, то есть для читалки карточка
 *    была пустой. Здесь это кнопки, и у каждой есть название словами.
 * 3. ЦЕНА ПЕРЕРИСОВКИ. Прод каждые 150 мс заново считал четыре текстуры
 *    400×160 попиксельно — это около 1 млн записей в пиксель каждые
 *    150 мс, навсегда, и так на самом слабом телефоне тоже. Здесь кадры
 *    считаются один раз при открытии (по восемь на карточку) и дальше
 *    просто сменяются. Шум на глаз тот же: это случайные точки, и
 *    отличить восемь заготовленных кадров от бесконечно новых нельзя.
 * 4. setInterval не снимался никогда и работал в спрятанной вкладке.
 * 5. Холст был 400×160 и растягивался под ширину карточки: на широком
 *    экране текстура растянута, на телефоне сплющена, а на дисплее с
 *    dpr>1 всё это ещё и мыло. Теперь кадры считаются под настоящий
 *    размер карточки.
 * 6. prefers-reduced-motion: текстура рисуется один раз и стоит.
 */

interface Card {
  code: string;
  years: string;
  style: 'digital' | 'film' | 'vhs' | 'bw';
  ink: string;
}

const CARDS = data.cards as Card[];
const ANSWERS = QUESTIONS.Q_GENERATION.answers;
/** Название словами — для читалки: годы нарисованы на холсте. */
const nameOf = (code: string) =>
  ANSWERS.find((a) => a.code === code)?.label ?? code;

/** Кадров на карточку. Восемь случайных достаточно, чтобы шум не зацикливался на глаз. */
const FRAMES = 8;
/** Смена кадра — как в проде. */
const FRAME_MS = 150;
/** Пауза после выбора — как в проде. */
const PAUSE_AFTER_PICK_MS = 600;

/**
 * Рисует один кадр текстуры.
 *
 * w и h здесь — ПИКСЕЛИ УСТРОЙСТВА, а не CSS-пиксели, и никакого
 * setTransform на холсте нет. Так сделано потому, что createImageData и
 * putImageData масштаб холста НЕ УЧИТЫВАЮТ: с setTransform(2) шум
 * ImageData размером в CSS-пиксели ложился ровно в левую верхнюю
 * четверть карточки, а годы при этом рисовались по центру — и текстура
 * не совпадала с текстом. Поэтому вся геометрия здесь домножена на
 * scale вручную.
 *
 * family приходит снаружи: холст не понимает CSS-переменных, и
 * `var(--fms-mono)` в ctx.font молча даёт шрифт по умолчанию.
 */
function paint(
  ctx: CanvasRenderingContext2D,
  card: Card,
  w: number,
  h: number,
  family: string,
  scale: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const fontSize = Math.max(14, Math.round(Math.min((h / scale) * 0.18, 28))) * scale;

  if (card.style === 'digital') {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() > 0.5 ? 180 + Math.floor(Math.random() * 75) : 10;
      d[i] = v * 0.3;
      d[i + 1] = v * 0.6;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  } else if (card.style === 'film') {
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, 0, w, h);
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const grain = Math.random() * 40;
      d[i] = Math.min(255, 120 + grain);
      d[i + 1] = Math.min(255, 60 + grain * 0.5);
      d[i + 2] = Math.min(255, 10 + grain * 0.1);
      d[i + 3] = 200;
    }
    ctx.putImageData(img, 0, 0);
    // Перфорация по краям — как у настоящей плёнки. Числа прода
    // (12×8, отступ 4, шаг 22) — в CSS-пикселях, поэтому × scale.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const holeH = 12 * scale;
    const holeW = 8 * scale;
    const margin = 4 * scale;
    for (let y = 10 * scale; y < h - 10 * scale; y += 22 * scale) {
      ctx.beginPath();
      ctx.roundRect(margin, y, holeW, holeH, 2 * scale);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(w - margin - holeW, y, holeW, holeH, 2 * scale);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = scale;
    ctx.beginPath(); ctx.moveTo(18 * scale, 0); ctx.lineTo(18 * scale, h); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - 18 * scale, 0);
    ctx.lineTo(w - 18 * scale, h);
    ctx.stroke();
  } else if (card.style === 'vhs') {
    ctx.fillStyle = '#001800';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2 * scale) {
      ctx.fillStyle = `rgba(0, ${100 + Math.random() * 80}, 0, ${0.2 + Math.random() * 0.3})`;
      ctx.fillRect(0, y, w, scale);
    }
    // Четыре сорванные строки — помеха на ленте.
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(0, Math.floor(Math.random() * h),
        w + (Math.random() * 20 - 10) * scale, scale);
    }
  } else {
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 30 + Math.random() * 50;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // Царапины на старой плёнке.
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, Math.floor(Math.random() * h), w, scale);
    }
  }

  ctx.font = `bold ${fontSize}px ${family}`;
  ctx.fillStyle = card.ink;
  ctx.shadowColor = card.style === 'film' ? '#ff8800'
    : (card.style === 'vhs' ? '#00ff00' : card.ink);
  ctx.shadowBlur = (card.style === 'film' ? 6 : (card.style === 'bw' ? 4 : 12)) * scale;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.years, w / 2, h / 2);
  ctx.shadowBlur = 0;
}

export default function GenerationCards({ onChoose }: MechanicProps) {
  const canvases = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [looking, setLooking] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue('--fms-mono').trim() || 'monospace';

    /* Кадры считаются один раз под настоящий размер карточки. Прод
       считал их заново каждые 150 мс — навсегда и на любом устройстве. */
    const built: Array<{
      cv: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      frames: HTMLCanvasElement[];
      shown: number;
    }> = [];

    function build() {
      built.length = 0;
      for (const card of CARDS) {
        const cv = canvases.current[card.code];
        const ctx = cv?.getContext('2d');
        if (!cv || !ctx) continue;
        const rect = cv.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        cv.width = w;
        cv.height = h;

        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < (still ? 1 : FRAMES); i += 1) {
          const off = document.createElement('canvas');
          off.width = w;
          off.height = h;
          const oc = off.getContext('2d');
          if (!oc) continue;
          paint(oc, card, w, h, family, dpr);
          frames.push(off);
        }
        if (!frames.length) continue;
        ctx.drawImage(frames[0], 0, 0);
        built.push({ cv, ctx, frames, shown: 0 });
      }
    }

    build();
    if (still) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer) return;
      timer = setInterval(() => {
        for (const b of built) {
          // Любой кадр, кроме показанного: иначе на восьми кадрах
          // становится заметен повтор.
          let next = Math.floor(Math.random() * b.frames.length);
          if (next === b.shown) next = (next + 1) % b.frames.length;
          b.shown = next;
          b.ctx.drawImage(b.frames[next], 0, 0);
        }
      }, FRAME_MS);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    start();

    // В проде setInterval не снимался никогда и тикал в спрятанной
    // вкладке.
    function onVisibility() { if (document.hidden) stop(); else start(); }
    document.addEventListener('visibilitychange', onVisibility);

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      // Пересчитываем кадры под новый размер, но не на каждый пиксель
      // перетаскивания окна.
      resizeTimer = setTimeout(() => { stop(); build(); start(); }, 200);
    }
    window.addEventListener('resize', onResize);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!picked) return;
    const id = setTimeout(() => onChoose(picked), PAUSE_AFTER_PICK_MS);
    return () => clearTimeout(id);
  }, [picked, onChoose]);

  const dimOf = (code: string) =>
    looking !== null && looking !== code ? styles.dimmed : '';

  return (
    <div
      className={styles.stage}
      style={{ background: data.paper }}
      data-generation-cards=""
    >
      <div className={styles.inner}>
        <h1 className={styles.question} style={{ color: data.questionInk }}>
          {data.question}
        </h1>

        <ul className={styles.grid}>
          {CARDS.map((card) => (
            <li key={card.code}>
              <button
                type="button"
                className={[
                  styles.card,
                  dimOf(card.code),
                  picked === card.code ? styles.picked : '',
                ].filter(Boolean).join(' ')}
                data-answer={card.code}
                data-style={card.style}
                disabled={picked !== null}
                onMouseEnter={() => setLooking(card.code)}
                onMouseLeave={() => setLooking(null)}
                onFocus={() => setLooking(card.code)}
                onBlur={() => setLooking(null)}
                onClick={() => { if (!picked) setPicked(card.code); }}
              >
                <canvas
                  ref={(el) => { canvases.current[card.code] = el; }}
                  className={styles.texture}
                  aria-hidden="true"
                  data-texture={card.style}
                />
                {/* Годы нарисованы на холсте, то есть читалке не видны
                    вовсе. Название словами — здесь. */}
                <span className={styles.name}>{nameOf(card.code)}</span>
              </button>
            </li>
          ))}
        </ul>

      </div>
    </div>
  );
}
