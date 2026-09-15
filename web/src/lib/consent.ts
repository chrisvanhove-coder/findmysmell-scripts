/**
 * Согласие на трекеры.
 *
 * ЧТО ЗДЕСЬ ВАЖНО ПОНИМАТЬ. На сайте сегодня нет ни одного сторонника:
 * ни Google Analytics, ни пикселей, ни партнёрских скриптов, и куки не
 * ставятся вообще. Прежний баннер в Webflow просил согласия на то, чего
 * нет: в его тексте были «cookies to personalize your experience» и
 * «affiliate tracking», а функция загрузки трекеров была закомментирована.
 * Просить согласие на несуществующее хуже, чем не просить: это неверное
 * утверждение внутри юридического уведомления.
 *
 * Поэтому гейт устроен так:
 *
 *   1. Пока NEXT_PUBLIC_GA_ID не задан, СОГЛАШАТЬСЯ НЕ НА ЧТО — баннер
 *      не показывается вообще. Вместо него в подвале ссылка, которая
 *      открывает панель: там сказано, что куки не ставятся, что именно
 *      измеряется, и там же кнопка «забыть этот браузер».
 *   2. Как только ключ задан, баннер появляется сам и трекер НЕ грузится
 *      до явного согласия. Отказ работает и запоминается.
 *   3. Выбор всегда отзываем из той же панели.
 *
 * Своё измерение воронки и ключ браузера через этот гейт НЕ проходят:
 * они опираются на освобождение CNIL для статистики аудитории (первая
 * сторона, не передаётся, 13 месяцев). Спрашивать о них согласия значило
 * бы терять 70% выборки без юридической необходимости. Но ключ браузера —
 * это хранение на устройстве, поэтому кнопка «забыть этот браузер»
 * обязательна и панель есть всегда.
 */

export const CONSENT_KEY = 'fms_consent';

/**
 * Версия вопроса. Если однажды появится второй трекер, версия меняется —
 * и старое согласие перестаёт считаться ответом на новый вопрос.
 */
export const CONSENT_VERSION = 1;

export type Decision = 'granted' | 'denied';

export interface ConsentRecord {
  v: number;
  decision: Decision;
  /** Когда человек выбрал. Нужно, чтобы согласие было доказуемо. */
  at: string;
}

export function isDecision(value: unknown): value is Decision {
  return value === 'granted' || value === 'denied';
}

/**
 * Разбор того, что лежит в localStorage. Ничего не бросает: битая запись
 * означает «человек ещё не выбирал», а не падение страницы.
 */
export function parseConsent(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const r = parsed as Record<string, unknown>;
  if (r.v !== CONSENT_VERSION) return null;      // вопрос изменился — спросим снова
  if (!isDecision(r.decision)) return null;
  if (typeof r.at !== 'string' || !r.at) return null;
  return { v: CONSENT_VERSION, decision: r.decision, at: r.at };
}

export function makeConsent(decision: Decision, now = new Date()): ConsentRecord {
  return { v: CONSENT_VERSION, decision, at: now.toISOString() };
}

/** Что показывать при данном состоянии. Чистая функция — её и проверяем. */
export type Screen =
  | 'nothing'   // спрашивать не о чем: трекеров нет
  | 'banner'    // трекер настроен, человек ещё не выбрал
  | 'quiet';    // выбор сделан либо трекеров нет — только ссылка в подвале

export function screenFor(trackerConfigured: boolean, record: ConsentRecord | null): Screen {
  if (!trackerConfigured) return 'nothing';
  return record ? 'quiet' : 'banner';
}

/**
 * Грузить ли трекер. Отсутствие записи — это НЕ согласие: до явного «да»
 * не грузится ничего. Это и есть разница между рабочим гейтом
 * и украшением.
 */
export function shouldLoadTracker(
  trackerConfigured: boolean,
  record: ConsentRecord | null,
): boolean {
  return trackerConfigured && record?.decision === 'granted';
}
