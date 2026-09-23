import en from '@/data/archetypes.en.json';
import fr from '@/data/archetypes.fr.json';
import ru from '@/data/archetypes.ru.json';
import type { ArchetypeKey } from './archetype-colors';
import { type Locale } from './i18n';

export interface Perfume {
  name: string;
  house: string;
  desc: string;
  img: string;
  link: string;
  sweet?: number;
  raw?: number;
  proj?: number;
}

export interface Ingredient {
  name: string;
  desc: string;
  detail: string;
  img: string;
}

export interface Archetype {
  you: string;
  identity: string;
  descriptor: string;
  desc: string[];
  main: Perfume;
  alts: Perfume[];
  ingredients: Ingredient[];
}

type Catalog = Record<ArchetypeKey, Archetype>;

/* Русский взят из Google-скрипта заказчицы, который рассылал письма со
   старого сайта, — не переведён мной (см. шапку archetypes.ru.json).
   ВНИМАНИЕ: русские тексты происходят из более РАННЕЙ редакции, чем
   английские. У HUG, OUTOFTIME и THERAPIST в английском с тех пор
   прибавилось по абзацу, в русском их нет. Страница это переживает —
   первый абзац уходит в цитату над диаграммой, последний в закрывающий,
   остальные в текст, — но при сверке текстов это надо помнить. */
const BY_LOCALE: Record<Locale, Catalog> = {
  en: en as unknown as Catalog,
  fr: fr as unknown as Catalog,
  ru: ru as unknown as Catalog,
};

export function getArchetype(locale: Locale, key: ArchetypeKey): Archetype {
  return BY_LOCALE[locale][key];
}

export function getCatalog(locale: Locale): Catalog {
  return BY_LOCALE[locale];
}
