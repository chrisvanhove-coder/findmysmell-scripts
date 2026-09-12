// Общий запуск легаси-скриптов Webflow в vm с заглушкой DOM.
// Вынесено из extract-data.mjs, потому что тем же способом теперь
// извлекается и движок Scent DNA (tools/extract-dna.mjs).
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Заглушка, которая молча проглатывает любые обращения к DOM.
export function stub() {
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

/**
 * Исполняет легаси-скрипт и отдаёт его window и контекст.
 *
 * `storage` — то, что увидит скрипт в sessionStorage/localStorage.
 * Движок DNA читает оттуда `quiz_answers`, так что через этот параметр
 * его можно опрашивать как чёрный ящик, не переписывая сам скрипт.
 */
export function run(file, storage = {}) {
  const code = readFileSync(join(root, file), 'utf8');
  const store = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem() {}, removeItem() {},
  };
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
    sessionStorage: store,
    localStorage: store,
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
