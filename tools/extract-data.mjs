// Извлекает данные из legacy-скриптов Webflow в структурированный JSON.
// Сам запуск в vm с заглушкой DOM живёт в tools/legacy-vm.mjs — им же
// пользуется tools/extract-dna.mjs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { join } from 'node:path';
import { root, run } from './legacy-vm.mjs';
import { rewriteImages, reportLeftovers } from './image-map.mjs';

const out = join(root, 'web/src/data');
mkdirSync(out, { recursive: true });

let leftovers = 0;

function save(name, value, note) {
  if (!value) { console.log(`  ✗ ${name} — не найдено`); return; }
  const n = Array.isArray(value) ? value.length : Object.keys(value).length;
  // Картинки в источнике всё ещё с CDN Webflow — подменяем на Cloudinary.
  const data = rewriteImages(value);
  leftovers += reportLeftovers(name, data);
  writeFileSync(join(out, name + '.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ ${name}.json — ${n} ${note}`);
}

console.log('EN (result48.js):');
const en = run('result48.js');
save('archetypes.en', en.win.FMS_FULL_ARCH, 'архетипов');

console.log('FR (result-fr6.js):');
const fr = run('result-fr6.js');
save('archetypes.fr', fr.win.FMS_FULL_ARCH || fr.ctx.ARCHETYPES, 'архетипов');

console.log('Share-карточки и панчлайны (result-shared15.js):');
const sh = run('result-shared15.js');
save('share-cards.en', sh.ctx.FMS_ARCHETYPES, 'карточек');
save('punch-lines.en', sh.ctx.FMS_PUNCH_LINES, 'наборов');

console.log('Share-карточки FR (result-shared-fr.js):');
const shfr = run('result-shared-fr.js');
save('share-cards.fr', shfr.ctx.FMS_ARCHETYPES, 'карточек');

// ANSWER_WEIGHTS лежит внутри <script> в выгрузке Webflow
console.log('Веса ответов (webflow/page-q-open-footer.html):');
const html = readFileSync(join(root, 'webflow/page-q-open-footer.html'), 'utf8');
const m = html.match(/window\.ANSWER_WEIGHTS\s*=\s*(\{[\s\S]*?\n\});/);
if (m) {
  const weights = runInContext('(' + m[1] + ')', createContext({}));
  save('answer-weights', weights, 'вариантов ответа');
} else {
  console.log('  ✗ ANSWER_WEIGHTS — не найдено');
}

if (leftovers) {
  console.log(`\nНЕ ПЕРЕНЕСЕНО КАРТИНОК: ${leftovers}. Загрузить их в Cloudinary`);
  console.log('и дописать пары в tools/image-map.json, иначе сайт зависит от Webflow.');
  process.exitCode = 1;
}
