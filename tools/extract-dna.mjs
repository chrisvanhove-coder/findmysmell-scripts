// Извлекает движок Scent DNA из result48.js.
//
// Карты сигналов (SWEET_MAP, RAW_MAP, PROJ_MAP, WARMTH_SIGNALS,
// DEPTH_SIGNALS) лежат внутри замыкания и наружу не выставлены — забрать
// их «как объект» нельзя. Зато наружу выставлена сама функция расчёта,
// и она читает ответы из sessionStorage. Поэтому движок опрашивается как
// чёрный ящик: подсовываем по одному коду ответа и смотрим, что вернулось.
//
// Так карты получаются не перепечатанные с экрана, а снятые с самого
// прода — и тем же способом потом сверяется наш порт (tools/dna-parity.mjs).
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, run } from './legacy-vm.mjs';

const out = join(root, 'web/src/data');
const KEYS = ['CEO', 'JAPAN', 'HUG', 'OFFGRID', 'OUTOFTIME', 'SUMMER', 'THERAPIST'];

// Границы нормализации зашиты в calculateAxes: normalize(raw, min, max).
const WARMTH_RANGE = [-5, 6];
const DEPTH_RANGE = [-6, 8];

function calc(answers, key = 'CEO') {
  const { win } = run('result48.js', { quiz_answers: JSON.stringify(answers) });
  if (!win.FMS_DNA) throw new Error('window.FMS_DNA не найден в result48.js');
  return win.FMS_DNA.calculate(key);
}

// normalize(raw,min,max) = 1 + (clamp(raw) - min) / (max - min) * 3 — обратимо,
// пока значение не упёрлось в границу. Одиночные сигналы в границы влезают.
function denormalize(value, [min, max]) {
  const raw = min + ((value - 1) / 3) * (max - min);
  const rounded = Math.round(raw);
  if (Math.abs(raw - rounded) > 1e-9) throw new Error(`сигнал не целый: ${raw}`);
  return rounded;
}

// ── Словарь кодов ответов: всё, что вообще может оказаться в quiz_answers ──
const weights = JSON.parse(readFileSync(join(out, 'answer-weights.json'), 'utf8'));
const codes = Object.keys(weights);

// ── Опорные точки: пустые ответы дают дефолты архетипа ──
const defaults = {};
for (const k of KEYS) defaults[k] = calc({}, k);

// Код, которого нет ни в одной карте, показывает стартовые значения.
const neutral = calc({ a: '__NOTHING__' });
const BASE = { sweetness: neutral.sweetness, rawEdge: neutral.rawEdge, projection: neutral.projection };

// ── Снимаем карты по одному коду ──
// Коды «как пахнет на коже» сдвигают сладость поправкой, а не задают её —
// их надо исключить, иначе они попадут в карту сладости как обычные ответы.
const SKIN = ['Q_SKIN_BEHAVIOR__SWEETER', 'Q_SKIN_BEHAVIOR__SHARPER'];
const sweet = {}, rawEdge = {}, projection = {}, warmth = {}, depth = {};

for (const code of codes) {
  const v = calc({ a: code });
  if (v.sweetness !== BASE.sweetness && !SKIN.includes(code)) sweet[code] = v.sweetness;
  if (v.rawEdge !== BASE.rawEdge) rawEdge[code] = v.rawEdge;
  if (v.projection !== BASE.projection) projection[code] = v.projection;

  // Нулевые сигналы в прод-картах записаны явно, но на расчёт не влияют:
  // отличить «ноль» от «нет кода» опросом нельзя, и не нужно — сумма та же.
  const w = denormalize(v.warmth, WARMTH_RANGE);
  const d = denormalize(v.depth, DEPTH_RANGE);
  if (w !== 0) warmth[code] = w;
  if (d !== 0) depth[code] = d;
}

// ── Поправка «как пахнет на коже» ──
// Она применяется поверх уже выбранного значения, поэтому её надо мерить
// в паре: код сладости + код кожи.
const probe = 'Q_SWEET__MODER_SW';
const skin = {};
for (const s of SKIN) {
  const withSkin = calc({ a: probe, b: s });
  skin[s] = Number((withSkin.sweetness - sweet[probe]).toFixed(3));
}
// Границы поправки: с краёв она упирается в них и дальше не идёт.
const skinClamp = {
  min: calc({ a: 'Q_SWEET__NO_SWEET', b: SKIN[0] }).sweetness,
  max: calc({ a: 'Q_SWEET__ENJOY_SW', b: SKIN[1] }).sweetness,
};

// ── Подписи осей: их видно в HTML, который собирает сам движок ──
const { win } = run('result48.js', {});
const html = win.FMS_DNA.buildHTML({}, 'QUOTE', 'CEO');
const AXIS_ORDER = ['sweetness', 'rawEdge', 'projection', 'warmth', 'depth'];
const axes = [...html.matchAll(
  /<div class="fms-dna-explain-word">([^<]*)<\/div><div class="fms-dna-explain-desc">([^<]*)<\/div><\/div><div class="fms-dna-explain-divider"><\/div><div class="fms-dna-explain-side"><div class="fms-dna-explain-word">([^<]*)<\/div><div class="fms-dna-explain-desc">([^<]*)<\/div>/g,
)].map((m, i) => ({
  key: AXIS_ORDER[i],
  lo: m[1], loDesc: m[2],
  hi: m[3], hiDesc: m[4],
}));
if (axes.length !== 5) throw new Error(`осей найдено ${axes.length}, ожидалось 5`);

const data = {
  axes,
  base: BASE,
  ranges: { warmth: WARMTH_RANGE, depth: DEPTH_RANGE },
  maps: { sweet, rawEdge, projection },
  signals: { warmth, depth },
  skin: { step: skin, clamp: skinClamp },
  defaults,
};

writeFileSync(join(out, 'dna.json'), JSON.stringify(data, null, 2) + '\n');

console.log('✓ web/src/data/dna.json');
console.log(`  осей: ${axes.length}`);
console.log(`  sweet/raw/projection: ${Object.keys(sweet).length}/${Object.keys(rawEdge).length}/${Object.keys(projection).length} кодов`);
console.log(`  сигналы тепла: ${Object.keys(warmth).length}, глубины: ${Object.keys(depth).length}`);
console.log(`  поправка кожи: ${JSON.stringify(skin)}, границы ${JSON.stringify(skinClamp)}`);
console.log(`  дефолты архетипов: ${Object.keys(defaults).length}`);
