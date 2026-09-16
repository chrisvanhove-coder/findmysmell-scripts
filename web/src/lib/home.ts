import en from '@/data/home.en.json';
import { type Locale } from './i18n';

/**
 * Текст главной страницы. Перенесён с ЖИВОГО сайта один в один — из
 * `webflow/live-pages/home.footer.html`.
 *
 * ПОЧЕМУ ЭТО ВАЖНО ОТДЕЛЬНО. До этого здесь лежала прошлая версия
 * главной: три колонки и текст «The fragrance industry spends billions
 * telling you what to buy». Заказчица её заменила, а у меня она
 * осталась — и первое, что она сказала, открыв новую версию, было
 * «the start page is not what my page is now in real time».
 * Источник правды для этой страницы — живой сайт, а не прошлые снимки.
 *
 * Французского и русского пока нет: браться за локали договорились
 * позже (HANDOFF 9.1). До тех пор все локали видят английский — как и
 * страница результата.
 */

/** Кусок абзаца: accent — то, что набрано золотым. */
export interface CopyPart {
  text: string;
  accent?: boolean;
}

/** Шаг «How it works». */
export interface HomeStep {
  num: string;
  label: string;
  desc: string;
}

export interface HomeCopy {
  hero: {
    image: string;
    /** Строки заголовка: так они разбиты на живом сайте. */
    headline: string[];
    copy: CopyPart[];
  };
  begin: string;
  howLabel: string;
  steps: HomeStep[];
  metaTitle: string;
  /** {N} подставляется из TOTAL_STEPS. */
  metaDescription: string;
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
 * Число словом, с заглавной: «Seventeen».
 *
 * ЗАЧЕМ. На живом сайте в шагах написано «Seventeen questions», и это
 * надо сохранить — но вписывать число руками нельзя: на том же сайте оно
 * в трёх местах разное (12 в шагах, 7 в метаописании, 17 на самом деле).
 * Поэтому в данных стоит {N}, а здесь оно превращается в то же слово из
 * TOTAL_STEPS. Если вопросов станет другое число, текст поправится сам.
 *
 * Список короткий намеренно: это не библиотека числительных, а ровно тот
 * диапазон, в котором может оказаться длина квиза. За его пределами
 * честнее показать цифру, чем угадать слово.
 */
const WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
  'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five',
];

export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}
