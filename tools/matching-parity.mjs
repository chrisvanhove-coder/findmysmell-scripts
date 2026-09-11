// Сравнивает подбор из loadCMSPerfumes (result48.js) с портированным match().
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync('web/src/data/perfumes.json', 'utf8'));
const live = catalog.filter((p) => !p.isDraft && !p.isArchived).sort((a, b) => a.order - b.order);
const ARCH = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];

// ── старый алгоритм, дословно из прода ──
function oldMatch(archetype, prefs) {
  const bottles = live.filter((p) => p.archetype === archetype)
    .map((p) => ({ ...p, proj: p.projection ?? NaN, sweet: p.sweet ?? NaN, raw: p.raw ?? NaN }));
  const srp = bottles.filter((b) => !isNaN(b.sweet) && !isNaN(b.raw) && !isNaN(b.proj));
  if (srp.length > 0 && prefs) {
    srp.forEach((b) => {
      b.distance = Math.abs(b.sweet - prefs.sweet) + Math.abs(b.raw - prefs.raw) + Math.abs(b.proj - prefs.proj);
    });
    srp.sort((a, b) => a.distance - b.distance); // Array.sort стабильна
    return { main: srp[0], alts: srp.slice(1, 4) };
  }
  const main = bottles.find((b) => b.isMain) ?? bottles[0];
  return { main, alts: bottles.filter((b) => b !== main).slice(0, 3) };
}

// ── новый, как в web/src/lib/matching.ts ──
function newMatch(archetype, prefs) {
  const pool = live.filter((p) => p.archetype === archetype);
  const scored = pool.filter((p) => p.sweet !== null && p.raw !== null && p.projection !== null);
  const dist = (p) => Math.abs(p.sweet - prefs.sweet) + Math.abs(p.raw - prefs.raw) + Math.abs(p.projection - prefs.projection);
  if (scored.length && prefs) {
    const ranked = [...scored].sort((a, b) => (dist(a) - dist(b)) || (a.order - b.order));
    return { main: ranked[0], alts: ranked.slice(1, 4) };
  }
  const main = pool.find((p) => p.isMain) ?? pool[0];
  return { main, alts: pool.filter((p) => p !== main).slice(0, 3) };
}

let cases = 0, mainDiff = 0, altDiff = 0, tieCases = 0;
for (const archetype of ARCH) {
  for (let s = 0; s <= 3; s++) for (let r = 0; r <= 3; r++) for (let p = 0; p <= 3; p++) {
    // Старый getUserSRP отдаёт ключ proj, новый — projection. Формы разные,
    // значения те же; каждой функции передаём её собственную форму.
    const oldPrefs = { sweet: s, raw: r, proj: p };
    const prefs = { sweet: s, raw: r, projection: p };
    const o = oldMatch(archetype, oldPrefs), n = newMatch(archetype, prefs);
    cases++;
    if (o.main.id !== n.main.id) mainDiff++;
    if (o.alts.map((x) => x.id).join() !== n.alts.map((x) => x.id).join()) altDiff++;
    // сколько парфюмов делят минимальное расстояние
    const ds = o.main.distance;
    const tied = live.filter((x) => x.archetype === archetype && x.sweet !== null)
      .filter((x) => Math.abs(x.sweet - s) + Math.abs(x.raw - r) + Math.abs(x.projection - p) === ds);
    if (tied.length > 1) tieCases++;
  }
}
console.log(`Комбинаций проверено: ${cases} (7 архетипов x 64 сочетания осей)`);
console.log('Расхождений в главном парфюме:   ', mainDiff);
console.log('Расхождений в альтернативах:     ', altDiff);
console.log(`Случаев, где несколько парфюмов на равном расстоянии: ${tieCases} (${(tieCases / cases * 100).toFixed(0)}%)`);
