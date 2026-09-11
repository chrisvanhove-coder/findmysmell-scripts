// Извлекает данные из legacy-скриптов Webflow в структурированный JSON.
// Скрипты писались под браузер, поэтому исполняем их в vm с заглушкой DOM.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'data');
mkdirSync(out, { recursive: true });

// Заглушка, которая молча проглатывает любые обращения к DOM.
function stub() {
  const target = function () { return new Proxy(target, handler); };
  const handler = {
    get(_t, prop) {
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'length') return 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === 'then') return undefined;
      return new Proxy(target, handler);
    },
    set() { return true; },
    apply() { return new Proxy(target, handler); },
    construct() { return new Proxy(target, handler); },
  };
  return new Proxy(target, handler);
}

function run(file) {
  const code = readFileSync(join(root, file), 'utf8');
  const win = {
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    scrollY: 0, pageYOffset: 0,
  };
  const ctx = createContext({
    window: win,
    addEventListener() {}, removeEventListener() {},
    Event: function () {}, CustomEvent: function () {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    document: stub(),
    navigator: stub(),
    location: { pathname: '/', href: 'https://www.findmysmell.com/result' },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: () => 0,
    setInterval: () => 0,
    requestAnimationFrame: () => 0,
    console: { log() {}, warn() {}, error() {} },
    fetch: () => Promise.resolve(stub()),
    Image: function () { return stub(); },
    getComputedStyle: () => stub(),
  });
  ctx.globalThis = ctx;
  try { runInContext(code, ctx, { filename: file }); }
  catch (e) { console.error(`  ! ${file}: ${e.message}`); }
  return { win, ctx };
}

function save(name, value, note) {
  if (!value) { console.log(`  ✗ ${name} — не найдено`); return; }
  const n = Array.isArray(value) ? value.length : Object.keys(value).length;
  writeFileSync(join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n');
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
