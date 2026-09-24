/**
 * Собирает названия стран на французском и русском.
 *
 * Запуск:  cd web && npm run countries:build
 *
 * ЗАЧЕМ ГЕНЕРАТОР, А НЕ РУЧНОЙ СПИСОК. Стран 195, и на двух языках это
 * 390 строк. Набранные руками, они содержали бы опечатки, которых никто
 * никогда не найдёт: человек ищет свою страну в поле, не находит и
 * уходит. Здесь имена берутся из ICU, той же базы, откуда их берут
 * браузер и операционная система, — это надёжнее меня.
 *
 * ЧТО ОСТАЁТСЯ РУЧНЫМ. Наш список — это НАЗВАНИЯ, а не коды: так он
 * перенесён из Webflow, и так же ответ лежит в базе. Поэтому названия
 * сопоставляются с кодами ISO по английскому имени из того же ICU, и
 * четырнадцать штук не совпадают: у нас «Czech Republic», в ICU
 * «Czechia»; у нас «Turkey», в ICU «Türkiye». Их коды проставлены
 * вручную в CODES — это единственное место, где возможна опечатка, и
 * оно короткое.
 *
 * АНГЛИЙСКИЕ НАЗВАНИЯ НЕ ТРОГАЕМ. Под ними лежат уже собранные ответы,
 * и переименование «Czech Republic» в «Czechia» осиротило бы их.
 */
import { writeFileSync } from 'node:fs';
import { COUNTRIES } from '../src/data/countries.ts';

/** Коды для тех, чьё имя у нас не совпадает с английским именем ICU. */
const CODES: Record<string, string> = {
  'Antigua and Barbuda': 'AG',
  'Bosnia and Herzegovina': 'BA',
  'Cabo Verde': 'CV',
  Congo: 'CG',
  'Czech Republic': 'CZ',
  'Hong Kong (SAR China)': 'HK',
  Myanmar: 'MM',
  Palestine: 'PS',
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Sao Tome and Principe': 'ST',
  'Trinidad and Tobago': 'TT',
  Turkey: 'TR',
};

/**
 * Правки поверх ICU. Их должно быть мало и каждая — с причиной: список
 * ищут набором с клавиатуры, и важнее то, как страну НАЗЫВАЮТ, а не то,
 * как она называется в справочнике.
 */
const OVERRIDES: Record<string, Record<string, string>> = {
  ru: {
    // ICU даёт «Соединенные Штаты» — без ё и не тем словом, которым их
    // ищут. В поле набирают «США».
    'United States': 'США',
    // «Конго - Браззавиль», с дефисом в пробелах: у нас в списке просто
    // «Congo», второго Конго нет, и уточнять не от чего.
    Congo: 'Конго',
  },
  fr: {},
};

const english = new Intl.DisplayNames(['en'], { type: 'region' });
const byEnglishName = new Map<string, string>();
for (let a = 65; a <= 90; a += 1) {
  for (let b = 65; b <= 90; b += 1) {
    const code = String.fromCharCode(a, b);
    let name: string | undefined;
    try { name = english.of(code); } catch { continue; }
    if (!name || name === code) continue;
    if (!byEnglishName.has(name)) byEnglishName.set(name, code);
  }
}

const NOTE = (lang: string) =>
  `Названия стран на ${lang}. Ключ — АНГЛИЙСКОЕ название из countries.ts: `
  + 'оно и лежит в базе как ответ, и менять его нельзя — под ним уже собраны '
  + 'прохождения. Здесь только то, что человек видит на экране.\n\n'
  + 'Файл СОБРАН, а не написан: npm run countries:build берёт имена из ICU. '
  + 'Править руками бессмысленно — следующий запуск перезапишет. Если имя '
  + 'не нравится, менять в scripts/build-country-names.mts.';

let failed = 0;
for (const [locale, human] of [['fr', 'французском'], ['ru', 'русском']] as const) {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const out: Record<string, string> = { _: NOTE(human) };
  for (const country of COUNTRIES) {
    const code = CODES[country] ?? byEnglishName.get(country);
    if (!code) {
      console.log(`  FAIL  нет кода ISO: ${country}`);
      failed += 1;
      continue;
    }
    const name = names.of(code);
    if (!name || name === code) {
      console.log(`  FAIL  ICU не знает ${code} на ${locale}: ${country}`);
      failed += 1;
      continue;
    }
    out[country] = OVERRIDES[locale][country] ?? name;
  }
  const path = `src/data/country-names.${locale}.json`;
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${path} — ${Object.keys(out).length - 1} из ${COUNTRIES.length}`);
}

process.exit(failed ? 1 : 0);
