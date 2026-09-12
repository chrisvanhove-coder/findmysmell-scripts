// Подмена ссылок на картинки при выгрузке данных.
//
// Картинки флаконов перенесены из CDN Webflow в Cloudinary (см. раздел 6
// в HANDOFF.md). Источники выгрузки — легаси-скрипты и CMS — по-прежнему
// отдают старые адреса, поэтому подмена делается здесь, на записи.
//
// Без этого шага любой повторный `node tools/extract-data.mjs` молча
// возвращал бы сайт на CDN Webflow.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './legacy-vm.mjs';

const MAP = JSON.parse(readFileSync(join(root, 'tools/image-map.json'), 'utf8'));
const OLD_HOST = 'cdn.prod.website-files.com';

/** Заменяет все известные адреса Webflow на адреса Cloudinary. */
export function rewriteImages(value) {
  const json = JSON.stringify(value);
  const next = json.replace(
    /https:\/\/cdn\.prod\.website-files\.com\/[^"'\s\\]+/g,
    (url) => MAP[url] ?? url,
  );
  return JSON.parse(next);
}

/**
 * Сообщает об оставшихся адресах Webflow. Их быть не должно: если после
 * подмены что-то осталось, значит в источнике появилась новая картинка,
 * которую ещё не перенесли, — и об этом надо узнать сразу, а не на глаз.
 */
export function reportLeftovers(name, value) {
  const left = [...new Set(
    (JSON.stringify(value).match(
      /https:\/\/cdn\.prod\.website-files\.com\/[^"'\s\\]+/g,
    ) ?? []),
  )];
  if (left.length) {
    console.log(`  ! ${name}: ${left.length} картинок ещё на ${OLD_HOST} — перенести в Cloudinary:`);
    for (const u of left) console.log(`      ${u}`);
  }
  return left.length;
}
