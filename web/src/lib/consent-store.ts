'use client';

/**
 * Подписка на состояние, которое живёт в localStorage, а не в React.
 *
 * Через useSyncExternalStore, а не через useState в эффекте, по трём
 * причинам: так React не жалуется на каскадные перерисовки, так состояние
 * подхватывается из ДРУГОЙ ВКЛАДКИ (отказался в одной — тег не грузится
 * и в другой), и так есть отдельный серверный снимок, поэтому разметка
 * на сервере и при гидрации совпадает.
 *
 * Снимки отдаются СТРОКАМИ. Объект каждый раз был бы новым по ссылке,
 * и useSyncExternalStore крутился бы вечно.
 */
import { CONSENT_KEY } from './consent';
import { hasBrowserKey, runCount } from './answers-store';

const listeners = new Set<() => void>();

/** Позвать после своей же записи в хранилище: событие storage на неё не приходит. */
export function notifyConsentChanged() {
  for (const cb of [...listeners]) cb();
}

export function subscribeConsent(cb: () => void): () => void {
  listeners.add(cb);
  globalThis.addEventListener?.('storage', cb);
  return () => {
    listeners.delete(cb);
    globalThis.removeEventListener?.('storage', cb);
  };
}

export function consentSnapshot(): string | null {
  try {
    return globalThis.localStorage?.getItem(CONSENT_KEY) ?? null;
  } catch {
    return null;   // приватный режим
  }
}

/** На сервере хранилища нет — и быть не должно: там мы ничего не знаем. */
export const consentServerSnapshot = (): string | null => null;

/** Состояние ключа браузера одной строкой: «есть|сколько прохождений». */
export function browserSnapshot(): string {
  return `${hasBrowserKey() ? '1' : '0'}|${runCount()}`;
}

export const browserServerSnapshot = (): string => '0|0';

export function parseBrowserSnapshot(s: string): { present: boolean; runs: number } {
  const [present, runs] = s.split('|');
  return { present: present === '1', runs: Number.parseInt(runs ?? '0', 10) || 0 };
}

/* Отдельная подписка «мы уже в браузере». Нужна, чтобы баннер не мигал
   на первом кадре тем, кто уже выбрал: до гидрации мы про выбор не знаем. */
const noop = () => () => {};
export const mountedSubscribe = noop;
export const mountedSnapshot = () => true;
export const mountedServerSnapshot = () => false;
