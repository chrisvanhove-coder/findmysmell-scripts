'use client';

import type { Answers } from './scoring';

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
    try { s?.removeItem(KEY); s?.removeItem(OPEN_KEY); } catch { /* пусто */ }
  }
}
