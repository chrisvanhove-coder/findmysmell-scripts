/**
 * Измерение воронки — клиентская сторона.
 *
 * Правила, из которых это устроено именно так:
 *
 * 1. Не ломать квиз. Любая ошибка отправки глотается молча. Человек проходит
 *    тест; статистика — наше дело, не его проблема.
 * 2. Не задерживать переход. Отправка идёт через sendBeacon, который браузер
 *    доставляет уже после того, как страница сменилась. Если sendBeacon
 *    недоступен, падаем на fetch с keepalive.
 * 3. Ничего не писать на устройство ради измерения. Ключ строки — runToken,
 *    который уже есть у прохождения как ключ идемпотентности.
 */

const ENDPOINT = '/api/funnel';

export type FunnelEvent = {
  step: string;
  event: 'view' | 'answer';
  answerCode?: string;
};

/** Отправляет событие и никогда не бросает. */
export function reportFunnel(locale: string, runToken: string, e: FunnelEvent): void {
  if (typeof window === 'undefined') return;

  const body = JSON.stringify({ locale, runToken, ...e });

  try {
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon) {
      // Blob с типом: без него часть браузеров отправляет text/plain,
      // и роут не распознаёт JSON.
      const sent = beacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }
  } catch {
    // Переходим к fetch.
  }

  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Молчим: статистика не стоит сломанного перехода.
  }
}
