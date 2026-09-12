'use client';

import type { Answers } from './scoring';
import { FIRST_QUESTION } from './quiz';

/**
 * Ответы живут в браузере до самого результата — как и раньше.
 * Ключи оставлены прежними, чтобы старая страница результата продолжала
 * работать, пока трафик не переключён целиком.
 */
const KEY = 'quiz_answers';
const OPEN_KEY = 'quiz_open';

function read(storage: Storage | undefined, key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

function write(key: string, value: string) {
  for (const s of [globalThis.sessionStorage, globalThis.localStorage]) {
    try { s?.setItem(key, value); } catch { /* приватный режим — переживём */ }
  }
}

export function loadAnswers(): Answers {
  const raw =
    read(globalThis.sessionStorage, KEY) ?? read(globalThis.localStorage, KEY) ?? '{}';
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Answers) : {};
  } catch {
    return {};
  }
}

export function saveAnswer(questionId: string, code: string): Answers {
  // Ответ на первый вопрос означает новое прохождение: старый флаг отправки
  // и старый токен сбрасываются, иначе второй проход в том же браузере
  // отсеялся бы на сервере как повтор.
  if (questionId === FIRST_QUESTION.id) beginRun();

  const answers = { ...loadAnswers(), [questionId]: code };
  write(KEY, JSON.stringify(answers));
  return answers;
}

export function loadOpenText(): string {
  return read(globalThis.sessionStorage, OPEN_KEY) ?? read(globalThis.localStorage, OPEN_KEY) ?? '';
}

export function saveOpenText(value: string) {
  write(OPEN_KEY, value);
}

export function clearAnswers() {
  for (const s of [globalThis.sessionStorage, globalThis.localStorage]) {
    try {
      s?.removeItem(KEY);
      s?.removeItem(OPEN_KEY);
      // Иначе следующее прохождение уехало бы под старым токеном
      // и база отсекла бы его как повтор.
      s?.removeItem(TOKEN_KEY);
      s?.removeItem(SENT_KEY);
    } catch { /* пусто */ }
  }
}

const CONSENT_KEY = 'consent_aggregate';

/**
 * Согласие на использование анонимных ответов в исследовании.
 * Ключ тот же, что читала старая отправка результата.
 */
export function saveResearchConsent(agreed: boolean) {
  write(CONSENT_KEY, agreed ? 'true' : 'false');
}

export function loadResearchConsent(): boolean | null {
  const v =
    read(globalThis.localStorage, CONSENT_KEY) ?? read(globalThis.sessionStorage, CONSENT_KEY);
  return v === null ? null : v === 'true';
}

/* ------------------------- отправка прохождения ------------------------- */

// quiz_sent — тот же ключ и то же значение, что в проде: пока обе версии
// живы, они не должны отправить одно прохождение дважды.
const SENT_KEY = 'quiz_sent';
const TOKEN_KEY = 'quiz_token';

/** Начало нового прохождения: новый токен, снятый флаг отправки. */
export function beginRun() {
  for (const s of [globalThis.sessionStorage, globalThis.localStorage]) {
    try { s?.removeItem(SENT_KEY); } catch { /* пусто */ }
  }
  write(TOKEN_KEY, newToken());
}

function newToken(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    // Старые браузеры и http-контексты, где crypto недоступен.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Токен текущего прохождения — ключ идемпотентности для базы.
 * Если его почему-то нет (человек начал квиз до появления этого кода),
 * заводим на месте.
 */
export function runToken(): string {
  const existing =
    read(globalThis.sessionStorage, TOKEN_KEY) ?? read(globalThis.localStorage, TOKEN_KEY);
  if (existing) return existing;
  const token = newToken();
  write(TOKEN_KEY, token);
  return token;
}

export function wasSent(): boolean {
  return (
    read(globalThis.sessionStorage, SENT_KEY) === '1' ||
    read(globalThis.localStorage, SENT_KEY) === '1'
  );
}

export function markSent() {
  write(SENT_KEY, '1');
}
