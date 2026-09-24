import fr from '@/data/country-names.fr.json';
import ru from '@/data/country-names.ru.json';
import { type Locale } from './i18n';

/**
 * Название страны на языке страницы.
 *
 * ГЛАВНОЕ ЗДЕСЬ — ЧТО МЕНЯЕТСЯ ТОЛЬКО ПОДПИСЬ. Ответ на вопросы про
 * страну хранится НАЗВАНИЕМ, а не кодом: так он перенесён из Webflow,
 * так лежит в базе и так его проверяет `missingQuestions`
 * (см. lib/quiz-state.ts). Если начать сохранять то, что человек видит,
 * в одной колонке окажутся «Russia», «Russie» и «Россия» — три разные
 * страны с точки зрения любого подсчёта, и все прохождения, собранные
 * до этого дня, перестанут с ними сходиться.
 *
 * Поэтому наружу уходит английское название, а перевод живёт только на
 * экране: в списке и в поиске.
 */

const BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  fr: fr as unknown as Record<string, string>,
  ru: ru as unknown as Record<string, string>,
};

/** Как страна называется на этом языке. Нет перевода — английское имя. */
export function countryLabel(locale: Locale, country: string): string {
  return BY_LOCALE[locale]?.[country] ?? country;
}

/**
 * Подходит ли страна под набранное.
 *
 * Ищем и по переведённому названию, и по английскому. Второе не
 * вежливость к англоговорящим: раскладка клавиатуры не всегда та,
 * человек на русской странице вполне может набрать «Ital» — и должен
 * найти Италию, а не пустой список.
 */
export function countryMatches(locale: Locale, country: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return countryLabel(locale, country).toLowerCase().includes(q)
    || country.toLowerCase().includes(q);
}
