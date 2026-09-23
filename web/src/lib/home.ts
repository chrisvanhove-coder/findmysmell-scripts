import en from '@/data/home.en.json';
import fr from '@/data/home.fr.json';
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
 * Французский переведён с английского: французской главной в Webflow
 * нет — страница /fr/home там английская копия. Русского пока нет, ru
 * показывает английский, как и getArchetype в lib/content.ts.
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
  fr: fr as HomeCopy,
  ru: en as HomeCopy,
};

export function getHomeCopy(locale: Locale): HomeCopy {
  return BY_LOCALE[locale];
}

/**
 * Фото-герой главной. Оно же — картинка в ссылке-превью (og:image) на
 * всём сайте: в проде в og:image стоит этот же файл. Держим одной
 * ссылкой, чтобы заменить картинку можно было в одном месте.
 */
export const HOME_HERO: string = (en as HomeCopy).hero.image;

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
 *
 * По-французски то же самое и по той же причине: «Dix-sept questions»
 * вместо «17 questions». Русского словаря нет — ru берёт английские
 * слова вместе с английским текстом главной.
 */
const WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
  'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five',
];

const WORDS_FR = [
  'Zéro', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit',
  'Neuf', 'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze',
  'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf', 'Vingt',
  'Vingt et une', 'Vingt-deux', 'Vingt-trois', 'Vingt-quatre', 'Vingt-cinq',
];

export function numberWord(n: number, locale: Locale = 'en'): string {
  const words = locale === 'fr' ? WORDS_FR : WORDS;
  return words[n] ?? String(n);
}
