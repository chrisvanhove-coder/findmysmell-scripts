import archetypes from '@/data/archetypes.en.json';

/**
 * Название парфюма и дом — по одному разу каждое.
 *
 * ЗАЧЕМ. В каталоге из Webflow CMS (`perfumes.json`) одно и то же
 * записано двумя способами: у 79 позиций из 113 дом вписан прямо в
 * название — «Sel d'Argent by BDK Parfums», — а у 34 название чистое, и
 * дом лежит отдельно. На карточке из-за этого получалось то имя с домом
 * внутри одной строкой, то имя и дом двумя. Заказчица попросила: имя и
 * бренд по одному разу.
 *
 * ПОЧЕМУ НЕ БЕРЁМ ПОЛЕ `house` ИЗ КАТАЛОГА. Это слаг из Webflow, и он не
 * просто некрасивый: у семи позиций он называет другой парфюм, а у
 * четырёх — чужой дом (HANDOFF 9.7). На карточке, которую публикуют,
 * такая ошибка хуже, чем отсутствие бренда.
 *
 * ОТКУДА ТОГДА ДОМ:
 *   1. Из самого названия, если в нём есть « by » — это строка, которую
 *      показывает живой сайт, то есть она уже выверена глазами.
 *   2. Иначе — из `archetypes.en.json`, где дома проверены вручную.
 *      Покрывает 25 из 34 оставшихся.
 *   3. Если нет ни того, ни другого — бренд не показывается вовсе
 *      (9 позиций). Пустая строка честнее выдуманной.
 *
 * Разделитель ищем ПЕРВЫЙ: « by » внутри названия парфюма не встречается
 * ни разу, а внутри названия дома встретиться может. Проверено по всему
 * каталогу — имён с двумя « by » и с « By » с заглавной нет.
 */

const SEP = ' by ';

/** Имя → дом, выверенные вручную. Ключ в нижнем регистре. */
const VETTED: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [key, arch] of Object.entries(archetypes as Record<string, unknown>)) {
    if (key.startsWith('_')) continue;
    const a = arch as { main?: { name: string; house: string }; alts?: Array<{ name: string; house: string }> };
    for (const p of [a.main, ...(a.alts ?? [])]) {
      if (p?.name && p.house) out[p.name.trim().toLowerCase()] = p.house;
    }
  }
  return out;
})();

export interface PerfumeLabel {
  /** Название без дома. */
  name: string;
  /** Дом. Пустая строка, если выверенного нет — тогда его не показывают. */
  house: string;
}

/**
 * Разбирает название каталога на имя и дом.
 * @param name    как оно записано в каталоге
 * @param known   выверенный дом, если вызывающий его уже знает
 */
export function splitPerfume(name: string, known = ''): PerfumeLabel {
  const raw = (name ?? '').trim();
  if (!raw) return { name: '', house: known.trim() };

  const at = raw.indexOf(SEP);
  if (at > 0) {
    const house = raw.slice(at + SEP.length).trim();
    if (house) return { name: raw.slice(0, at).trim(), house };
  }

  if (known.trim()) return { name: raw, house: known.trim() };
  return { name: raw, house: VETTED[raw.toLowerCase()] ?? '' };
}
