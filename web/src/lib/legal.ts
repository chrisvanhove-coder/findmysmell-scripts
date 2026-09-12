import en from '@/data/privacy.en.json';
import fr from '@/data/privacy.fr.json';
import { type Locale } from './i18n';

/**
 * Юридические тексты. Политика приватности перенесена со страниц
 * /privacy-policy и /fr/privacy-policy в Webflow.
 *
 * Часть про устройство системы переписана под новый сайт: прод описывал
 * Webflow-архитектуру (FingerprintJS, Google Sheets, Google Analytics),
 * которой здесь нет. Все расхождения перечислены в разделе 9.5 HANDOFF.md —
 * это не редакторская правка, а приведение текста в соответствие с тем,
 * что код действительно делает.
 */

export interface LegalBlock {
  /** Абзац. */
  p?: string;
  /** Подзаголовок внутри раздела. */
  sub?: string;
  /** Перечисление. */
  list?: string[];
}

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  sections: LegalSection[];
}

// Русского перевода политики пока нет — отдаём английский, как и везде.
const PRIVACY: Record<Locale, LegalDocument> = {
  en: en as LegalDocument,
  fr: fr as LegalDocument,
  ru: en as LegalDocument,
};

export function getPrivacyPolicy(locale: Locale): LegalDocument {
  return PRIVACY[locale];
}
