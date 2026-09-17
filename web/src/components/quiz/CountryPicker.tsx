'use client';

import { useMemo, useRef, useState } from 'react';
import { COUNTRIES } from '@/data/countries';
import { QUESTION_COPY } from '@/data/question-titles';
import data from '@/data/country-picker.json';
import styles from './country-picker.module.css';
import type { MechanicProps } from './mechanics';

/**
 * Поиск по странам: Q_REGION_NOW («где живёшь сейчас») и
 * Q_REGION_CHILD («где вырос»). Перенесено из эмбедов в подвалах
 * q-region-now.footer.html и q-region-child.footer.html.
 *
 * ПРИЁМ. Экран — один блок по центру шириной до 480px: вопрос
 * HIGHCRUISER капсом и поле поиска. Пока пусто — в списке все 190 стран,
 * набрал буквы — остаются подходящие. Выбор страны и есть ответ: в базу
 * уходит НАЗВАНИЕ, а не код варианта, потому что кнопки материков в
 * Webflow были скрыты и вопрос отвечал именно поиском.
 *
 * ДВА ВОПРОСА — ОДИН ВИДЖЕТ. В проде это два эмбеда, отличающихся
 * только цветами и текстом вопроса: у «где живёшь» вопрос золотой
 * (#f1e09b) и список на терракоте (#6b2a18), у «где вырос» вопрос белый
 * и список на тёмной оливе (#3d3d20). Здесь это один компонент и две
 * палитры в данных.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: блок по центру с отступом 24px (20 на узком
 * экране), ширина до 480px, вопрос clamp(22px, 4vw, 36px) капсом с
 * межбуквенным 0.04em и отступом снизу 24px, поле padding 16/20 (14/16),
 * кегль 16px (15), радиус 3px, список на 6px ниже поля, не выше 220px,
 * пункт padding 12/20 (11/16), кегль 15px (14), «No results» курсивом.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. КЛАВИАТУРЫ НЕ БЫЛО ВОВСЕ. Пункты списка были div'ами, а выбор
 *    слушался на mousedown — то есть ни стрелками, ни Enter выбрать
 *    страну было нельзя, и читалка не знала, что это список. Здесь это
 *    combobox с listbox: стрелки, Enter, Escape.
 * 2. СПИСОК РИСОВАЛСЯ ЦЕЛИКОМ ЧЕРЕЗ innerHTML на каждое нажатие
 *    клавиши — 190 узлов заново на букву, и название страны попадало в
 *    разметку строкой.
 * 3. Прод сам писал ответ в хранилище и делал location.href. Здесь
 *    сохранение, воронка и переход остаются на QuizScreen, как у всех
 *    механик; в статистику при этом уходит только факт ответа, без
 *    названия страны.
 * 4. Своё зерно на странице убрано: оно теперь общее.
 */

const PALETTES = data.palettes as Record<string, Record<string, string>>;
const G = data.geometry;

/** Обслуживает ли этот компонент такой вопрос. */
export function isCountryPicker(questionId: string): boolean {
  return PALETTES[questionId] !== undefined;
}

export default function CountryPicker({ questionId, onChoose }: MechanicProps) {
  const title = QUESTION_COPY[questionId]?.title ?? '';
  const palette = PALETTES[questionId] ?? {};

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  function pick(country: string) {
    setQuery(country);
    setOpen(false);
    onChoose(country);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  /* Цвета палитры — переменными: разметка и числа у двух вопросов одни,
     различаются только цвета, и держать из-за них два набора классов
     не за что. */
  const vars = {
    '--cp-question': palette.question,
    '--cp-input-bg': palette.inputBg,
    '--cp-input-border': palette.inputBorder,
    '--cp-input-focus': palette.inputFocus,
    '--cp-list-bg': palette.listBg,
    '--cp-list-border': palette.listBorder,
    '--cp-item': palette.item,
    '--cp-item-hover-bg': palette.itemHoverBg,
    '--cp-item-hover': palette.itemHover,
    '--cp-scroll-thumb': palette.scrollThumb,
  } as React.CSSProperties;

  return (
    <div className={styles.stage} style={vars} data-country-picker={questionId}>
      <div
        className={styles.wrap}
        ref={box}
        onBlur={(e) => {
          if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
      >
        <h1 className={styles.question}>{title}</h1>

        <div className={styles.field}>
          <input
            id="country-search"
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="country-list"
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={data.placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />

          {open && (
            <ul className={styles.list} id="country-list" role="listbox">
              {matches.length === 0 && <li className={styles.empty}>{data.empty}</li>}
              {matches.map((c, i) => (
                <li key={c} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    className={styles.item}
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
      </div>
    </div>
  );
}

/** Сколько стран в списке — для проверок. */
export const COUNTRY_COUNT = COUNTRIES.length;
export { G as COUNTRY_GEOMETRY };
