// Оценивает, насколько приоритет по эмоции разрешает ничьи в подборе.
import { readFileSync } from 'node:fs';
const W = JSON.parse(readFileSync('web/src/data/answer-weights.json', 'utf8'));
const cat = JSON.parse(readFileSync('web/src/data/perfumes.json', 'utf8'))
  .filter((p) => !p.isDraft && !p.isArchived && p.sweet !== null);

const ARCH = ['CEO','JAPAN','HUG','OFFGRID','OUTOFTIME','SUMMER','THERAPIST'];
const EMO = ['CALM','ENERGY','COZY','MYST','SEXY','FOCUS','PLAY'];

const mean = (g, k) => g.reduce((t, p) => t + p[k], 0) / g.length;
const prof = Object.fromEntries(ARCH.map((a) => {
  const g = cat.filter((p) => p.archetype === a);
  return [a, { sweet: mean(g, 'sweet'), raw: mean(g, 'raw'), projection: mean(g, 'projection') }];
}));
const all = { sweet: mean(cat, 'sweet'), raw: mean(cat, 'raw'), projection: mean(cat, 'projection') };

/** Смещение эмоции = смесь профилей архетипов по весам её ответа, минус среднее. */
function biasFor(code) {
  const w = W[code];
  if (!w) return null;
  const tot = ARCH.reduce((t, a) => t + w[a], 0);
  if (!tot) return null;
  const mix = { sweet: 0, raw: 0, projection: 0 };
  for (const a of ARCH) for (const k of ['sweet','raw','projection']) mix[k] += prof[a][k] * (w[a] / tot);
  return { sweet: mix.sweet - all.sweet, raw: mix.raw - all.raw, projection: mix.projection - all.projection };
}

const affinity = (p, bias) =>
  bias.sweet * p.sweet + bias.raw * p.raw + bias.projection * p.projection;

let total = 0, ties = 0, resolved = 0;
const perEmotion = {};
for (const e of EMO) {
  const bias = biasFor('Q_EMO__' + e);
  perEmotion[e] = { ties: 0, resolved: 0 };
  for (const a of ARCH) {
    const pool = cat.filter((p) => p.archetype === a);
    for (let s = 0; s <= 3; s++) for (let r = 0; r <= 3; r++) for (let pr = 0; pr <= 3; pr++) {
      const d = (p) => Math.abs(p.sweet - s) + Math.abs(p.raw - r) + Math.abs(p.projection - pr);
      const min = Math.min(...pool.map(d));
      const tied = pool.filter((p) => d(p) === min);
      total++;
      if (tied.length < 2) continue;
      ties++; perEmotion[e].ties++;
      const best = Math.max(...tied.map((p) => affinity(p, bias)));
      const still = tied.filter((p) => Math.abs(affinity(p, bias) - best) < 1e-9);
      if (still.length === 1) { resolved++; perEmotion[e].resolved++; }
    }
  }
}

console.log(`Проверено: ${total} случаев (7 эмоций x 7 архетипов x 64 сочетания осей)`);
console.log(`Ничьих: ${ties}`);
console.log(`Разрешено эмоцией: ${resolved} (${(resolved / ties * 100).toFixed(1)}%)`);
console.log(`Осталось неразрешённых: ${ties - resolved} (${((ties - resolved) / total * 100).toFixed(1)}% от всех случаев)`);
console.log('\nпо эмоциям (ничьих -> разрешено):');
for (const e of EMO) {
  const x = perEmotion[e];
  console.log(`  ${e.padEnd(8)} ${String(x.ties).padStart(4)} -> ${String(x.resolved).padStart(4)}  (${(x.resolved / x.ties * 100).toFixed(0)}%)`);
}
