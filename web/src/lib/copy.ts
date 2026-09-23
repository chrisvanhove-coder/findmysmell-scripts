import frRaw from '@/data/copy.fr.json';
import ruRaw from '@/data/copy.ru.json';
import { type Locale } from './i18n';

/**
 * Перевод строк интерфейса — слоем поверх английского.
 *
 * ЗАЧЕМ ИМЕННО ТАК. Английский текст квиза лежит не в одном месте, а
 * там, где его читает экран: подписи вариантов — в quiz.en.json,
 * заголовки вопросов — в question-titles.ts, надписи механик (слова
 * барабана, уровни ползунка, короткие подписи шаров) — в данных самих
 * механик, перенесённых дословно из подвалов Webflow. Так сделано
 * нарочно: эти файлы сверяются с живым сайтом, и сводить их в один
 * словарь значило бы потерять эту сверку.
 *
 * Поэтому перевод не заменяет источник, а накрывает его: английская
 * строка остаётся на месте вызова и видна в коде, французская приходит
 * по ключу. Нет ключа — показывается английский, а не пустая строка и
 * не падение страницы. Это важно: французский появился позже кода и
 * будет догонять его ещё не раз.
 *
 * Наборы ключей у словарей одинаковые — это не соглашение на словах,
 * это проверяет `npm run check:locale`.
 */

const DICT: Partial<Record<Locale, Record<string, string>>> = {
  fr: frRaw as unknown as Record<string, string>,
  ru: ruRaw as unknown as Record<string, string>,
};

/** Строка по ключу. Второй аргумент — английский оригинал и запасной вариант. */
export function t(locale: Locale, key: string, en: string): string {
  return DICT[locale]?.[key] ?? en;
}

/**
 * Строка, разбитая на строки разметки. У части экранов вопрос задан
 * массивом строк — перенос там не украшение, а вёрстка (childhood-blobs,
 * bottle-sliders, барабан эмоций). В словаре это одна строка с \n.
 */
export function tLines(locale: Locale, key: string, en: readonly string[]): string[] {
  const value = DICT[locale]?.[key];
  return value === undefined ? [...en] : value.split('\n');
}

/** Подпись варианта ответа. */
export function answerLabel(locale: Locale, code: string, en: string): string {
  return t(locale, `a.${code}`, en);
}

/** Уточнение под подписью варианта — есть не у всех. */
export function answerHint(
  locale: Locale,
  code: string,
  en: string | undefined,
): string | undefined {
  return DICT[locale]?.[`a.${code}.hint`] ?? en;
}

/**
 * Короткая подпись варианта на экране с механикой. У шаров детства,
 * ползунков и барабана подпись своя, короче полной: она должна влезать
 * в шар, в строку ползунка и в слово барабана.
 *
 * Если короткой нет, берём полную подпись того же варианта и только
 * потом английскую. Так сделано потому, что короткая нужна не всем
 * экранам: на «живом» экране Q_STAYWELL подписи совпадают с полными, и
 * заводить им второй, дословно такой же ключ — значит держать два места,
 * которые обязаны совпадать. Французская полная подпись здесь всегда
 * лучше английской короткой.
 */
export function shortLabel(locale: Locale, code: string, en: string): string {
  return DICT[locale]?.[`short.${code}`] ?? DICT[locale]?.[`a.${code}`] ?? en;
}

/** Подстановка чисел: «Question {n} of {total}» → «Question 6 sur 17». */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    (name in values ? String(values[name]) : whole));
}
