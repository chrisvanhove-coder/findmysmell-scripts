import type { Perfume } from '@/lib/matching';
import styles from './scales.module.css';

/**
 * Шкалы трёх осей под флаконом. Порт `buildScales` + `srpToPercent`
 * из result48.js — подписи, порядок строк и формула позиции дословные.
 *
 * Смысл блока: показать человеку, почему подобрали именно этот флакон.
 * Оси те же, на которых работает подбор (см. 5.2), так что шкалы —
 * это видимая часть движка, а не украшение.
 */

const ROWS = [
  { left: 'Fresh', right: 'Sweet', axis: 'sweet' },
  { left: 'Gentle', right: 'Wild', axis: 'raw' },
  { left: 'Skin only', right: 'Fills the room', axis: 'projection' },
] as const;

// Прод подставлял именно эти значения, когда ось у позиции не заполнена:
// sweet → 1, raw → 0, projection → 1. Повторяем, чтобы картинка совпадала.
const FALLBACK: Record<(typeof ROWS)[number]['axis'], number> = {
  sweet: 1,
  raw: 0,
  projection: 1,
};

/** Оси 0..3 → позиция точки в процентах. Как srpToPercent в проде. */
function toPercent(value: number): number {
  return Math.round((value / 3) * 100);
}

export default function Scales({
  perfume,
  compact = false,
}: {
  perfume: Perfume;
  /** Вариант для карточек альтернатив: подписи и точка мельче. */
  compact?: boolean;
}) {
  return (
    <div className={`${styles.scales} ${compact ? styles.compact : ''}`}>
      {ROWS.map(({ left, right, axis }) => {
        const raw = perfume[axis];
        const value = raw === null ? FALLBACK[axis] : raw;
        return (
          <div key={axis} className={styles.row}>
            <span className={styles.label}>{left}</span>
            <div className={styles.track}>
              <span className={styles.dot} style={{ left: `${toPercent(value)}%` }} />
            </div>
            <span className={`${styles.label} ${styles.right}`}>{right}</span>
          </div>
        );
      })}
    </div>
  );
}
