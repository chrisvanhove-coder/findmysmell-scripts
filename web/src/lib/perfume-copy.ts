import fr from '@/data/perfume-descriptions.fr.json';
import ru from '@/data/perfume-descriptions.ru.json';
import { type Locale } from './i18n';

/**
 * Описание флакона на языке страницы.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ КАТАЛОГА. Описание — единственное поле позиции,
 * которое переводится: имя и дом это имена собственные, ссылка и
 * картинка общие, а sweet/raw/projection — числа, по которым идёт
 * подбор. Держать копию каталога на каждый язык значит держать три
 * места, где эти числа обязаны совпадать; разойдутся — молча поменяется
 * результат подбора. Поэтому перевод лежит рядом, ключом по id позиции,
 * а сам каталог остаётся один.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ lib/matching.ts. Там счёт и выбор флакона, и языка
 * им знать незачем. Перевод подставляется на границе — там, где текст
 * уходит на экран или в письмо.
 *
 * Нет перевода — отдаётся английский: страница не должна ломаться
 * из-за пропущенной строки. Чтобы пропуск не остался незамеченным,
 * полноту проверяет `npm run check:locale`.
 */

const BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  fr: fr as unknown as Record<string, string>,
  ru: ru as unknown as Record<string, string>,
};

/** Позиция каталога в том виде, в каком она нужна для подписи. */
interface Described {
  id: string;
  description: string;
}

export function perfumeDescription(locale: Locale, perfume: Described): string {
  return BY_LOCALE[locale]?.[perfume.id] ?? perfume.description;
}
