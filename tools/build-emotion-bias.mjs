// Выводит приоритет по эмоции из уже существующих данных и генерирует таблицу.
// Ничего не задаётся вручную: профиль эмоции — это смесь средних профилей
// архетипов по весам её ответа, а смещение — отклонение от среднего каталога.
import { readFileSync, writeFileSync } from 'node:fs';

const W = JSON.parse(readFileSync('web/src/data/answer-weights.json', 'utf8'));
const cat = JSON.parse(readFileSync('web/src/data/perfumes.json', 'utf8'))
  .filter((p) => !p.isDraft && !p.isArchived && p.sweet !== null);

const ARCH = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];
const AXES = ['sweet', 'raw', 'projection'];

const mean = (g, k) => g.reduce((t, p) => t + p[k], 0) / g.length;
const prof = Object.fromEntries(ARCH.map((a) => {
  const g = cat.filter((p) => p.archetype === a);
  return [a, Object.fromEntries(AXES.map((k) => [k, mean(g, k)]))];
}));
const all = Object.fromEntries(AXES.map((k) => [k, mean(cat, k)]));

const round = (n) => Number(n.toFixed(4));

function bias(code) {
  const w = W[code];
  if (!w) return null;
  const tot = ARCH.reduce((t, a) => t + w[a], 0);
  if (!tot) return null;
  const out = {};
  for (const k of AXES) {
    let v = 0;
    for (const a of ARCH) v += prof[a][k] * (w[a] / tot);
    out[k] = round(v - all[k]);
  }
  return out;
}

// Берём Q_EMO и все уточняющие ответы веток эмоций.
const EMO = ['CALM', 'ENERGY', 'COZY', 'MYST', 'SEXY', 'FOCUS', 'PLAY'];
const codes = Object.keys(W).filter(
  (c) => c.startsWith('Q_EMO__') || EMO.some((e) => c.startsWith(`Q_${e}__`)),
);

const table = {};
for (const c of codes) {
  const b = bias(c);
  if (b) table[c] = b;
}

writeFileSync('web/src/lib/emotion-bias.ts',
`// СГЕНЕРИРОВАНО tools/build-emotion-bias.mjs — не править руками.
//
// Приоритет при ничьей в подборе парфюма. Когда несколько парфюмов
// оказываются на одинаковом расстоянии от предпочтений пользователя,
// выбирается тот, чьи оси ближе к эмоции, которую человек искал.
//
// Значения не назначены вручную: профиль эмоции — это средний профиль
// архетипов, взвешенный по весам её ответа из answer-weights.json,
// а смещение — отклонение этого профиля от среднего по каталогу.
// Положительное значение означает "при прочих равных бери выше по этой оси".

export interface AxisBias {
  sweet: number;
  raw: number;
  projection: number;
}

export const EMOTION_BIAS: Record<string, AxisBias> = ${JSON.stringify(table, null, 2)};
`);

console.log('✓ web/src/lib/emotion-bias.ts');
console.log('  кодов ответов с приоритетом:', Object.keys(table).length);
console.log('\n  основные эмоции (sweet / raw / projection):');
for (const e of EMO) {
  const b = table['Q_EMO__' + e];
  const f = (n) => (n >= 0 ? '+' : '') + n.toFixed(3);
  console.log(`    ${e.padEnd(8)} ${f(b.sweet)}  ${f(b.raw)}  ${f(b.projection)}`);
}
