// Извлекает данные винил-плеера из result48.js: цвет наклейки и трек
// для каждого архетипа.
//
// Оба объявления лежат внутри IIFE и наружу не выставлены, поэтому
// берутся разбором исходника — тем же способом, что ANSWER_WEIGHTS
// в extract-data.mjs. Цвета наклеек НЕ совпадают с брендовыми
// (у OUTOFTIME #604c65 против #303437), так что переиспользовать
// палитру архетипов нельзя — это отдельный набор.
import { readFileSync, writeFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { join } from 'node:path';
import { root } from './legacy-vm.mjs';

const src = readFileSync(join(root, 'result48.js'), 'utf8');

function grab(name) {
  const m = src.match(new RegExp('var\\s+' + name + '\\s*=\\s*(\\{[\\s\\S]*?\\n\\});'));
  if (!m) throw new Error(`${name} не найден в result48.js`);
  return runInContext('(' + m[1] + ')', createContext({}));
}

const colors = grab('VINYL_COLORS');
const tracks = grab('MUSIC_URLS');

const keys = Object.keys(colors);
const data = Object.fromEntries(
  keys.map((k) => [k, { color: colors[k], track: tracks[k] ?? null }]),
);

const missing = keys.filter((k) => !tracks[k]);
writeFileSync(join(root, 'web/src/data/vinyl.json'), JSON.stringify(data, null, 2) + '\n');

console.log('✓ web/src/data/vinyl.json');
console.log(`  архетипов: ${keys.length}`);
console.log(`  без трека: ${missing.length}${missing.length ? ' — ' + missing.join(', ') : ''}`);
const hosts = [...new Set(Object.values(tracks).map((u) => new URL(u).host))];
console.log(`  треки лежат на: ${hosts.join(', ')}`);
