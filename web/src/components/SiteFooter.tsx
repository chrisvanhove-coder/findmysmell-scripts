import Link from 'next/link';
import { type Locale } from '@/lib/i18n';
import styles from './site-chrome.module.css';

/**
 * Подвал. Перенесён из `#legal-bar` в site-custom-code Webflow: тот же
 * набор ссылок, тот же разделитель, тот же порядок.
 *
 * Во Франции ссылки на политику приватности и mentions légales должны
 * быть доступны с любой страницы — поэтому подвал в общей раскладке,
 * а не только на результате.
 */

/**
 * Подписи в двух длинах. На телефоне полные названия не помещаются
 * в одну строку и подвал уезжает на две, накрывая текст страницы —
 * это же решение было в проде (.legal-full / .legal-short).
 */
interface FooterCopy {
  privacy: [full: string, short: string];
  legal: [full: string, short: string];
  contact: string;
}

const COPY: Record<Locale, FooterCopy> = {
  en: {
    privacy: ['Privacy Policy', 'Privacy'],
    legal: ['Legal Notice', 'Legal'],
    contact: 'Contact',
  },
  fr: {
    privacy: ['Confidentialité', 'Vie privée'],
    legal: ['Mentions légales', 'Mentions'],
    contact: 'Contact',
  },
  ru: {
    privacy: ['Privacy Policy', 'Privacy'],
    legal: ['Legal Notice', 'Legal'],
    contact: 'Contact',
  },
};

function Label({ text }: { text: [string, string] }) {
  return (
    <>
      <span className={styles.full}>{text[0]}</span>
      <span className={styles.short}>{text[1]}</span>
    </>
  );
}

const INSTAGRAM = 'https://www.instagram.com/findmysmell';
const EMAIL = 'contact@findmysmell.com';

export default function SiteFooter({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const dot = <span className={styles.dot}>·</span>;

  return (
    <footer className={styles.footer}>
      <Link href={`/${locale}/privacy-policy`}>
        <Label text={copy.privacy} />
      </Link>
      {dot}
      <Link href={`/${locale}/legal-notice`}>
        <Label text={copy.legal} />
      </Link>
      {dot}
      <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
        Instagram
      </a>
      {dot}
      <a href={`mailto:${EMAIL}`}>{copy.contact}</a>
      {/* Копирайт и его разделитель уходят вместе на самых узких экранах. */}
      <span className={`${styles.dot} ${styles.lastDot}`}>·</span>
      <span className={styles.copyright}>© 2026 Find My Smell</span>
    </footer>
  );
}
