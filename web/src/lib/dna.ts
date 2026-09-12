import type { Answers } from './scoring';
import type { ArchetypeKey } from './archetype-colors';
import data from '@/data/dna.json';

/**
 * Scent DNA — пять осей, которые показываются в первой зоне результата.
 *
 * Это отдельный движок, не тот, что подбирает флакон. Пересечение только
 * внешнее: три первые оси считаются по тем же вопросам, но по другой шкале
 * (здесь 1..4, в подборе 0..3), а две последние — warmth и depth — вообще
 * выводятся из посторонних ответов про атмосферу, эмоцию и праздник.
 *
 * Данные (карты сигналов, подписи осей, дефолты) сняты с продового
 * result48.js скриптом tools/extract-dna.mjs, а не перепечатаны руками.
 * Сверка порта с оригиналом — tools/dna-parity.mjs.
 */

export const AXES = data.axes as readonly DnaAxis[];

export interface DnaAxis {
  key: DnaAxisKey;
  lo: string;
  loDesc: string;
  hi: string;
  hiDesc: string;
}

export type DnaAxisKey = 'sweetness' | 'rawEdge' | 'projection' | 'warmth' | 'depth';

export type DnaValues = Record<DnaAxisKey, number>;

const MAPS = data.maps as Record<'sweet' | 'rawEdge' | 'projection', Record<string, number>>;
const SIGNALS = data.signals as Record<'warmth' | 'depth', Record<string, number>>;
const RANGES = data.ranges as Record<'warmth' | 'depth', [number, number]>;
const DEFAULTS = data.defaults as Record<string, DnaValues>;
const SKIN_STEP = data.skin.step as Record<string, number>;
const SKIN_CLAMP = data.skin.clamp as { min: number; max: number };

/** Сжимает сумму сигналов в 1..4. Границы у каждой оси свои. */
function normalize(raw: number, [min, max]: [number, number]): number {
  const clamped = Math.max(min, Math.min(max, raw));
  return 1 + ((clamped - min) / (max - min)) * 3;
}

/** Значения по умолчанию — когда квиз не пройден и считать не из чего. */
export function defaultsFor(archetype: ArchetypeKey): DnaValues {
  return DEFAULTS[archetype] ?? DEFAULTS.CEO;
}

/**
 * Считает пять осей по ответам. Если ответов нет вовсе — отдаёт дефолты
 * архетипа, как и прод: пустая диаграмма выглядела бы поломкой.
 */
export function dnaFrom(answers: Answers, archetype: ArchetypeKey): DnaValues {
  const codes = Object.values(answers);
  if (!codes.length) return defaultsFor(archetype);

  // Стартовая середина: если человек не отвечал на вопрос про сладость,
  // ось остаётся посередине, а не падает в ноль.
  let sweetness = data.base.sweetness;
  let rawEdge = data.base.rawEdge;
  let projection = data.base.projection;

  for (const code of codes) {
    if (code in MAPS.sweet) sweetness = MAPS.sweet[code];
    if (code in MAPS.rawEdge) rawEdge = MAPS.rawEdge[code];
    if (code in MAPS.projection) projection = MAPS.projection[code];
  }

  // «На моей коже пахнет слаще/резче» — поправка поверх выбранного значения.
  for (const code of codes) {
    const step = SKIN_STEP[code];
    if (step === undefined) continue;
    sweetness =
      step < 0
        ? Math.max(SKIN_CLAMP.min, sweetness + step)
        : Math.min(SKIN_CLAMP.max, sweetness + step);
  }

  let warmthRaw = 0;
  let depthRaw = 0;
  for (const code of codes) {
    warmthRaw += SIGNALS.warmth[code] ?? 0;
    depthRaw += SIGNALS.depth[code] ?? 0;
  }

  return {
    sweetness,
    rawEdge,
    projection,
    warmth: normalize(warmthRaw, RANGES.warmth),
    depth: normalize(depthRaw, RANGES.depth),
  };
}

/**
 * Положение точки на дорожке, в процентах. Края поджаты, чтобы точка
 * не свисала с дорожки — ровно как в проде.
 */
export function dnaPercent(value: number): number {
  return Math.max(4, Math.min(96, ((value - 1) / 3) * 100));
}
