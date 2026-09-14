/**
 * Проверки доставки картинок: что все ссылки в данных ведут в Cloudinary,
 * что трансформация к ним применяется, и что `cld` не ломается на краях —
 * версионных и безверсионных ссылках, SVG, повторном проходе.
 *
 * Запуск: npm run check:images
 */
import { readFileSync } from 'node:fs';
import { cld, PRESETS, type Preset } from '../src/lib/cloudinary.ts';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const V = 'https://res.cloudinary.com/dcefrxxav/image/upload/v1777885417/benzoin_dijcu9.jpg';
const NOV = 'https://res.cloudinary.com/dcefrxxav/image/upload/findmysmell/perfumes/eau-duelle.png';

console.log('\ncld() — форма ссылки');
check('версионная ссылка получает трансформацию перед версией',
  cld(V, 'ingredientThumb') ===
  `https://res.cloudinary.com/dcefrxxav/image/upload/${PRESETS.ingredientThumb}/v1777885417/benzoin_dijcu9.jpg`,
  cld(V, 'ingredientThumb'));
check('безверсионная ссылка получает трансформацию перед public_id',
  cld(NOV, 'bottleMain') ===
  `https://res.cloudinary.com/dcefrxxav/image/upload/${PRESETS.bottleMain}/findmysmell/perfumes/eau-duelle.png`,
  cld(NOV, 'bottleMain'));

console.log('\ncld() — идемпотентность и пропуски');
check('повторный проход ничего не добавляет',
  cld(cld(V, 'bottleMain'), 'bottleMain') === cld(V, 'bottleMain'),
  cld(cld(V, 'bottleMain'), 'bottleMain'));
check('уже трансформированная ссылка не трогается',
  cld('https://res.cloudinary.com/dcefrxxav/image/upload/f_auto/q_auto/v1/x.png', 'bottleMain')
    === 'https://res.cloudinary.com/dcefrxxav/image/upload/f_auto/q_auto/v1/x.png');
check('SVG остаётся как есть',
  cld('https://res.cloudinary.com/dcefrxxav/image/upload/v1/findmysmell/share-cards/hug-eau.svg', 'homeFull')
    .includes('/upload/v1/'));
check('чужой хост остаётся как есть',
  cld('https://cdn.prod.website-files.com/abc/def.png', 'homeFull')
    === 'https://cdn.prod.website-files.com/abc/def.png');
check('пустая строка не падает', cld('', 'homeFull') === '');
check('public_id с подчёркиванием не принимается за трансформацию',
  cld(V, 'bottleMain').includes('benzoin_dijcu9.jpg') && cld(V, 'bottleMain') !== V);

console.log('\nформа пресетов');
for (const [name, tx] of Object.entries(PRESETS)) {
  check(`${name}: f_auto и q_auto отдельными компонентами`,
    tx.includes('/f_auto/q_auto'), tx);
  check(`${name}: ширина или высота всегда с режимом кропа`,
    !/(^|\/)[^/]*[wh]_\d/.test(tx) || /c_(limit|fill|fit|scale|thumb|crop|pad|lfill)/.test(tx), tx);
}

console.log('\nданные: все картинки в Cloudinary');
type WithImg = { img?: string; imageUrl?: string; ingredients?: { img: string }[] };
const archetypes = JSON.parse(readFileSync('src/data/archetypes.en.json', 'utf8')) as
  Record<string, WithImg & { main?: { img: string }; alts?: { img: string }[] }>;
const perfumes = JSON.parse(readFileSync('src/data/perfumes.json', 'utf8')) as
  ({ img?: string; imageUrl?: string }[] | Record<string, { img?: string; imageUrl?: string }>);

const urls: string[] = [];
for (const a of Object.values(archetypes)) {
  if (a.main?.img) urls.push(a.main.img);
  for (const alt of a.alts ?? []) urls.push(alt.img);
  for (const ing of a.ingredients ?? []) urls.push(ing.img);
}
for (const p of Object.values(perfumes)) {
  const u = p.img ?? p.imageUrl;
  if (u) urls.push(u);
}
const webflow = urls.filter((u) => u.includes('website-files.com'));
check(`ни одной ссылки на Webflow CDN (проверено ${urls.length})`, webflow.length === 0,
  webflow.slice(0, 3).join('\n        '));
check('все ссылки — Cloudinary',
  urls.every((u) => u.startsWith('https://res.cloudinary.com/')),
  urls.filter((u) => !u.startsWith('https://res.cloudinary.com/')).slice(0, 3).join('\n        '));
check('ни одна ссылка в данных не несёт трансформацию (их ставит cld)',
  urls.every((u) => cld(u, 'bottleMain') !== u),
  urls.filter((u) => cld(u, 'bottleMain') === u).slice(0, 3).join('\n        '));

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
