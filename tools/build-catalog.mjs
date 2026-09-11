// Собирает каталог парфюма из выгрузок Webflow CMS в один JSON.
// На вход — файлы ответов list_collection_items (страницы могут перекрываться,
// дубли снимаются по id).
import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) { console.error('укажите файлы выгрузки'); process.exit(1); }

// id опции -> имя архетипа, из схемы коллекции
const ARCHETYPE_BY_OPTION = {
  a09ce5cc2c077b05a435db0be6c41945: 'CEO',
  '87abed8927318c195bfcdd7b70dfa8c5': 'HUG',
  '1bf8f8906d198e63fe3d02edb37f6946': 'SUMMER',
  '4d038d1d725021282a1b6a42df9894e9': 'THERAPIST',
  '207cf76d34e3672226942c9a00ea7b44': 'JAPAN',
  d92108a2d207d6b44ea20dd1687fc8f7: 'OFFGRID',
  ab4aea2eed808f0754f733930a2dfe76: 'OUTOFTIME',
};

const byId = new Map();
let total = null;
for (const f of files) {
  const r = JSON.parse(readFileSync(f, 'utf8')).result;
  total = r.pagination.total;
  for (const it of r.items) byId.set(it.id, it);
}

console.log(`прочитано файлов: ${files.length}`);
console.log(`уникальных позиций: ${byId.size} из ${total} по счётчику Webflow`);
if (byId.size !== total) console.log('⚠ покрытие неполное — нужен ещё срез');

const items = [...byId.values()].map((it, order) => {
  const f = it.fieldData;
  return {
    id: it.id,
    // Позиция в выдаче Webflow. При равном расстоянии старый движок
    // опирался на порядок коллекции, поэтому его нужно сохранить.
    order,
    name: f.name,
    // В Webflow поле slug переименовано в "Brand" и хранит марку.
    house: f.slug ?? '',
    archetype: ARCHETYPE_BY_OPTION[f.archetype] ?? null,
    description: f.description?.trim() ?? '',
    imageUrl: f.image?.url ?? '',
    shopUrl: f['link-to-perfume'] ?? '',
    isMain: f['main-perfume'] === true,
    sweet: f.sweetness ?? null,
    raw: f.rawness ?? null,
    projection: f.projection ?? null,
    isDraft: it.isDraft === true,
    isArchived: it.isArchived === true,
  };
});

items.sort((a, b) =>
  (a.archetype ?? '').localeCompare(b.archetype ?? '') ||
  Number(b.isMain) - Number(a.isMain) ||
  a.name.localeCompare(b.name));

writeFileSync('web/src/data/perfumes.json', JSON.stringify(items, null, 2) + '\n');
console.log('✓ web/src/data/perfumes.json');

// ── сводка качества данных ──
const live = items.filter((p) => !p.isDraft && !p.isArchived);
const complete = (p) => p.sweet !== null && p.raw !== null && p.projection !== null;
console.log(`\nопубликовано: ${live.length} | черновиков: ${items.length - live.length}`);
console.log(`с полными осями S/R/P: ${live.filter(complete).length}`);
console.log(`без осей (подбор по ним не сработает): ${live.filter((p) => !complete(p)).length}`);
console.log(`без архетипа: ${live.filter((p) => !p.archetype).length}`);

console.log('\nпо архетипам (всего / с осями / главных):');
for (const a of ['CEO','JAPAN','HUG','OFFGRID','OUTOFTIME','SUMMER','THERAPIST']) {
  const g = live.filter((p) => p.archetype === a);
  console.log(`  ${a.padEnd(10)} ${String(g.length).padStart(3)} / ${String(g.filter(complete).length).padStart(3)} / ${g.filter((p) => p.isMain).length}`);
}
