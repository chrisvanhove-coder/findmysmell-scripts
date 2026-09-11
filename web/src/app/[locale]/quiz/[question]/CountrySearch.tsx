'use client';

import { useMemo, useRef, useState } from 'react';
import { COUNTRIES } from '@/data/countries';
import styles from './quiz.module.css';

/**
 * Поиск по странам вместо списка материков. Перенесено с эмбедов Webflow
 * на q-region-now и q-region-child: сохраняется название страны,
 * а не код ответа. Кнопки материков остались скрытыми в Webflow.
 */
export default function CountrySearch({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (country: string) => void;
}) {
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  function pick(country: string) {
    setQuery(country);
    setOpen(false);
    onPick(country);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && matches[active]) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div
      className={styles.search}
      ref={boxRef}
      onBlur={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input
        id="country-search"
        className={styles.searchInput}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="country-list"
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search your country…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className={styles.searchList} id="country-list" role="listbox">
          {matches.length === 0 && <li className={styles.searchEmpty}>No results</li>}
          {matches.map((c, i) => (
            <li key={c} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={styles.searchItem}
                data-active={i === active || undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c)}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
