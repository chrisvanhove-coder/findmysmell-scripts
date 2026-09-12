import Link from 'next/link';
import { type Locale } from '@/lib/i18n';
import LocaleSwitch from './LocaleSwitch';
import styles from './site-chrome.module.css';

/**
 * Шапка сайта: имя слева, переключатель языка справа.
 *
 * Имя ведёт на главную соответствующей локали — оттуда начинается квиз.
 */
export default function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className={styles.header}>
      <Link className={styles.logo} href={`/${locale}`}>
        Find My Smell
      </Link>
      <LocaleSwitch locale={locale} />
    </header>
  );
}
