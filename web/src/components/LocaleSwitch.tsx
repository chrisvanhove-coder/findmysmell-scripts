'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isLocale, type Locale } from '@/lib/i18n';
import styles from './site-chrome.module.css';

/**
 * Переключатель языка. Показывает только те языки, которые заказчик
 * считает готовыми: английский и французский. Русский в списке не
 * появляется, пока для него нет текстов, — страницы `/ru` при этом
 * остаются рабочими, просто на них не ведёт ссылка.
 */

const OFFERED: Locale[] = ['en', 'fr'];

/** Меняет только первый сегмент адреса, всё остальное сохраняется. */
function swapLocale(pathname: string, next: Locale): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length && isLocale(parts[0])) parts[0] = next;
  else parts.unshift(next);
  return '/' + parts.join('/');
}

export default function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Клик мимо и Escape закрывают список.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.langBox} ref={box}>
      <button
        type="button"
        className={styles.langTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {locale.toUpperCase()} <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className={styles.langMenu} role="menu">
          {OFFERED.map((code) => (
            <a
              key={code}
              role="menuitem"
              className={`${styles.langItem} ${code === locale ? styles.langCurrent : ''}`}
              href={swapLocale(pathname, code)}
              hrefLang={code}
            >
              {code === 'en' ? 'English' : 'Français'}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
