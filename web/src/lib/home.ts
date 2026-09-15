import en from '@/data/home.en.json';
import { type Locale } from './i18n';

/**
 * Текст главной страницы. Перенесён с продовой страницы Webflow.
 *
 * Французского и русского пока нет: французский текст главной в Webflow
 * существует, но браться за локали договорились позже (раздел 9.1).
 * До тех пор все локали видят английский — как и на странице результата.
 */

export interface PitchLine {
  text: string;
  accent?: boolean;
  gap?: boolean;
}

/** Шаг «How it works». {N} в desc подставляется из TOTAL_STEPS. */
export interface HomeStep {
  num: string;
  label: string;
  desc: string;
}

export interface HomeCopy {
  title: string[];
  tagline: string;
  pitch: PitchLine[];
  howLabel: string;
  howBody: string;
  howBodyAccent: string;
  howNote: string;
  howNoteAccent: string;
  begin: string;
  consent: string;
  consentLink: string;
  scrollHint: string;
  steps: HomeStep[];
  images: {
    hero: string;
    heroMobile: string;
    side: { src: string; alt: string }[];
  };
}

const BY_LOCALE: Record<Locale, HomeCopy> = {
  en: en as HomeCopy,
  fr: en as HomeCopy,
  ru: en as HomeCopy,
};

export function getHomeCopy(locale: Locale): HomeCopy {
  return BY_LOCALE[locale];
}

/**
 * Разбивает строку по выделенному куску. В проде выделение было тегом <em>
 * внутри текста; хранить в данных разметку не хочется, поэтому храним
 * отдельно сам фрагмент, а делим здесь.
 */
export function splitAccent(text: string, accent: string): [string, string, string] {
  const at = text.indexOf(accent);
  if (at < 0) return [text, '', ''];
  return [text.slice(0, at), accent, text.slice(at + accent.length)];
}
