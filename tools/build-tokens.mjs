// Собирает дизайн-токены архетипов из выгруженного CSS страницы результата.
// Генерирует, а не перепечатывает, чтобы значения гарантированно совпадали с продом.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'webflow/page-result-head.css.html'), 'utf8');

const raw = {};
for (const m of css.matchAll(/\.result-([a-z]+)\s*\{([^}]+)\}/g)) {
  const vars = {};
  for (const v of m[2].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[v[1]] = v[2].trim();
  raw[m[1].toUpperCase()] = vars;
}

// Пять зон старой вёрстки описывались 7 переменными, но три пары всегда
// совпадали: z1-bg === z5-bg, z2-bg === z4-bg, z2-color === z4-color,
// а z2-color вообще одинаков у всех архетипов. Остаётся пять токенов.
const ORDER = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];
const tokens = {};
for (const key of ORDER) {
  const v = raw[key];
  if (!v) throw new Error('нет палитры для ' + key);
  tokens[key] = {
    brand: v['z1-bg'],        // фон героя и блока шеринга
    paper: v['z2-bg'],        // светлый фон текста и альтернатив
    stage: v['z3-bg'],        // тёмная сцена главного парфюма
    stageInk: v['z3-color'],  // текст на сцене
    shareInk: v['z5-color'],  // текст в блоке шеринга
  };
}
const INK = raw.CEO['z2-color']; // общий для всех

writeFileSync(join(root, 'web/src/styles/archetypes.css'),
`/* СГЕНЕРИРОВАНО tools/build-tokens.mjs — не править руками.
   Источник: webflow/page-result-head.css.html (прод на 2026-09-11). */

:root {
  --fms-ink: ${INK};
}

${ORDER.map((k) => {
  const t = tokens[k];
  return `[data-archetype='${k}'] {
  --fms-brand: ${t.brand};
  --fms-paper: ${t.paper};
  --fms-stage: ${t.stage};
  --fms-stage-ink: ${t.stageInk};
  --fms-share-ink: ${t.shareInk};
}`;
}).join('\n\n')}
`);

writeFileSync(join(root, 'web/src/lib/archetype-colors.ts'),
`// СГЕНЕРИРОВАНО tools/build-tokens.mjs — не править руками.
// Источник: webflow/page-result-head.css.html (прод на 2026-09-11).

export const INK = '${INK}';

export const ARCHETYPE_KEYS = [${ORDER.map((k) => `'${k}'`).join(', ')}] as const;
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

export const ARCHETYPE_PALETTES: Record<ArchetypeKey, ArchetypePalette> = ${JSON.stringify(tokens, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:').replace(/"/g, "'")};
`);

console.log('✓ web/src/styles/archetypes.css');
console.log('✓ web/src/lib/archetype-colors.ts');
console.log('  архетипов:', ORDER.length, '| токенов на каждый: 5 | общий ink:', INK);
