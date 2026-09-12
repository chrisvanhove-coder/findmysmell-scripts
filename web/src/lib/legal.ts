import privacyEn from '@/data/privacy.en.json';
import privacyFr from '@/data/privacy.fr.json';
import noticeEn from '@/data/legal-notice.en.json';
import noticeFr from '@/data/legal-notice.fr.json';
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

// Русского перевода пока нет — отдаём английский, как и везде.
const PRIVACY: Record<Locale, LegalDocument> = {
  en: privacyEn as LegalDocument,
  fr: privacyFr as LegalDocument,
  ru: privacyEn as LegalDocument,
};

// Mentions légales — французский документ по происхождению: этого требует
// французский закон, и оригинал считается французским. Английская версия —
// перевод для удобства.
const LEGAL_NOTICE: Record<Locale, LegalDocument> = {
  en: noticeEn as LegalDocument,
  fr: noticeFr as LegalDocument,
  ru: noticeEn as LegalDocument,
};

export function getPrivacyPolicy(locale: Locale): LegalDocument {
  return PRIVACY[locale];
}

export function getLegalNotice(locale: Locale): LegalDocument {
  return LEGAL_NOTICE[locale];
}
