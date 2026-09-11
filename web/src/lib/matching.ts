import catalog from '@/data/perfumes.json';
import type { ArchetypeKey } from './archetype-colors';
import type { Answers } from './scoring';

/**
 * Подбор парфюма по трём осям. Перенесён из getUserSRP + loadCMSPerfumes
 * (result48.js) без изменений в логике.
 */

export interface Perfume {
  id: string;
  order: number;
  name: string;
  house: string;
  archetype: ArchetypeKey | null;
  description: string;
  imageUrl: string;
  shopUrl: string;
  isMain: boolean;
  sweet: number | null;
  raw: number | null;
  projection: number | null;
  isDraft: boolean;
  isArchived: boolean;
}

/** Предпочтения пользователя по трём осям, 0..3. */
export interface Preferences {
  sweet: number;
  raw: number;
  projection: number;
}

const SWEET: Record<string, number> = {
  Q_SWEET__NO_SWEET: 0,
  Q_SWEET__LITTLE_SW: 1,
  Q_SWEET__MODER_SW: 2,
  Q_SWEET__ENJOY_SW: 3,
};

const RAW: Record<string, number> = {
  Q_WILD__NO_WILD: 0,
  Q_WILD__LITTLE_WILD: 1,
  Q_WILD__SOME_WILD: 2,
  Q_WILD__LOVE_WILD: 3,
};

const PROJECTION: Record<string, number> = {
  Q_RADIUS__CLOSE: 0,
  Q_RADIUS__SOFT: 1,
  Q_RADIUS__NOTICEABLE: 2,
  Q_RADIUS__BOLD: 3,
};

const PERFUMES = (catalog as Perfume[]).filter((p) => !p.isDraft && !p.isArchived);

function hasAxes(p: Perfume): boolean {
  return p.sweet !== null && p.raw !== null && p.projection !== null;
}

/**
 * Читает три оси из ответов квиза. Кожа корректирует только сладость:
 * SWEETER делает парфюм сладче, поэтому целевая сладость снижается на 1,
 * SHARPER — наоборот. Возвращает null, если хотя бы одна ось не отвечена.
 */
export function preferencesFrom(answers: Answers): Preferences | null {
  let sweet: number | undefined;
  let raw: number | undefined;
  let projection: number | undefined;
  let skin: string | undefined;

  for (const code of Object.values(answers)) {
    if (code in SWEET) sweet = SWEET[code];
    if (code in RAW) raw = RAW[code];
    if (code in PROJECTION) projection = PROJECTION[code];
    if (code.startsWith('Q_SKIN_BEHAVIOR__')) skin = code;
  }

  if (sweet === undefined || raw === undefined || projection === undefined) return null;

  if (skin === 'Q_SKIN_BEHAVIOR__SWEETER') sweet = Math.max(0, sweet - 1);
  else if (skin === 'Q_SKIN_BEHAVIOR__SHARPER') sweet = Math.min(3, sweet + 1);

  return { sweet, raw, projection };
}

/** Манхэттенское расстояние между парфюмом и предпочтениями. */
export function distance(p: Perfume, prefs: Preferences): number {
  return (
    Math.abs((p.sweet ?? 0) - prefs.sweet) +
    Math.abs((p.raw ?? 0) - prefs.raw) +
    Math.abs((p.projection ?? 0) - prefs.projection)
  );
}

export interface Match {
  main: Perfume;
  alternatives: Perfume[];
}

/**
 * Главный парфюм — ближайший по трём осям, альтернативы — следующие три.
 * Если осей у коллекции нет или пользователь не дошёл до этих вопросов,
 * работает запасная ветка по флагу isMain — как в старом коде.
 */
export function match(archetype: ArchetypeKey, prefs: Preferences | null): Match | null {
  const pool = PERFUMES.filter((p) => p.archetype === archetype);
  if (!pool.length) return null;

  const scored = pool.filter(hasAxes);

  if (scored.length && prefs) {
    const ranked = [...scored].sort((a, b) => {
      const d = distance(a, prefs) - distance(b, prefs);
      // При равном расстоянии — порядок коллекции, как в старом движке.
      return d !== 0 ? d : a.order - b.order;
    });
    return { main: ranked[0], alternatives: ranked.slice(1, 4) };
  }

  const main = pool.find((p) => p.isMain) ?? pool[0];
  return { main, alternatives: pool.filter((p) => p !== main).slice(0, 3) };
}

export function catalogFor(archetype: ArchetypeKey): Perfume[] {
  return PERFUMES.filter((p) => p.archetype === archetype);
}
