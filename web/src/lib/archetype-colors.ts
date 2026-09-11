// СГЕНЕРИРОВАНО tools/build-tokens.mjs — не править руками.
// Источник: webflow/page-result-head.css.html (прод на 2026-09-11).

export const INK = '#1a1a1a';

export const ARCHETYPE_KEYS = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'] as const;
export type ArchetypeKey = (typeof ARCHETYPE_KEYS)[number];

export interface ArchetypePalette {
  /** Фон героя и блока шеринга. */
  brand: string;
  /** Светлый фон текста и альтернатив. */
  paper: string;
  /** Тёмная сцена главного парфюма. */
  stage: string;
  /** Цвет текста на сцене. */
  stageInk: string;
  /** Цвет текста в блоке шеринга. */
  shareInk: string;
}

export const ARCHETYPE_PALETTES: Record<ArchetypeKey, ArchetypePalette> = {
  CEO: {
    brand: '#a43f35',
    paper: '#e6e5dd',
    stage: '#1a1a1a',
    stageInk: '#e6e5dd',
    shareInk: '#fff'
  },
  JAPAN: {
    brand: '#607f90',
    paper: '#cac88f',
    stage: '#1a1a1a',
    stageInk: '#cac88f',
    shareInk: '#fff'
  },
  HUG: {
    brand: '#7e3d30',
    paper: '#fdf0e8',
    stage: '#1a1a1a',
    stageInk: '#f0c8a8',
    shareInk: '#fdf0e8'
  },
  OFFGRID: {
    brand: '#3c5d45',
    paper: '#e8f0e0',
    stage: '#1a1a1a',
    stageInk: '#e8f0e0',
    shareInk: '#e8f0e0'
  },
  OUTOFTIME: {
    brand: '#303437',
    paper: '#f5eefa',
    stage: '#604c65',
    stageInk: '#f5eefa',
    shareInk: '#f5eefa'
  },
  SUMMER: {
    brand: '#c8a04a',
    paper: '#f6f6e9',
    stage: '#1a1a1a',
    stageInk: '#f1e09b',
    shareInk: '#fff'
  },
  THERAPIST: {
    brand: '#074d82',
    paper: '#f0f0e0',
    stage: '#8f9a54',
    stageInk: '#f0f0e0',
    shareInk: '#f0f0e0'
  }
};
