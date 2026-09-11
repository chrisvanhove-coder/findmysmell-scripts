import en from '@/data/archetypes.en.json';
import fr from '@/data/archetypes.fr.json';
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

// Русского контента пока нет — временно отдаём английский, чтобы страницы
// не падали. Заменить, как только появится перевод.
const BY_LOCALE: Record<Locale, Catalog> = {
  en: en as unknown as Catalog,
  fr: fr as unknown as Catalog,
  ru: en as unknown as Catalog,
};

export function getArchetype(locale: Locale, key: ArchetypeKey): Archetype {
  return BY_LOCALE[locale][key];
}

export function getCatalog(locale: Locale): Catalog {
  return BY_LOCALE[locale];
}
