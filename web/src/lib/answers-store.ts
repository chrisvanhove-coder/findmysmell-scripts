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

/* ────────────────────────────────────────────────────────────────────────
   Повторные прохождения
   ────────────────────────────────────────────────────────────────────────

   Задача заказчика: один человек может пройти тест десять раз, и тогда
   исследовательская выборка перестаёт быть выборкой — в ней десять копий
   одного мнения.

   Решение: случайный ключ браузера, который живёт 13 месяцев, и счётчик
   прохождений. Прохождение уезжает с этими двумя полями, и дальше выборка
   для исследования — это `run_index = 1`, а `run_index > 1` становится
   отдельным и довольно интересным материалом: меняется ли архетип, когда
   человек проходит тест снова.

   Почему 13 месяцев. Это потолок CNIL для идентификаторов измерения
   аудитории. Ключ старше — сбрасывается и заводится новый, то есть дольше
   13 месяцев не живёт никогда.

   Чего этот ключ НЕ делает. Он не про человека, а про браузер. Один человек
   с телефона и с ноутбука — это два ключа. Почистил хранилище, пришёл из
   приватного окна — новый ключ. Это сильный сигнал, но не гарантия, и
   выдавать его за «узнали человека» нельзя.
────────────────────────────────────────────────────────────────────────── */

const BROWSER_KEY = 'fms_browser';
const RUNS_KEY = 'fms_runs';
/** Потолок CNIL для идентификаторов измерения аудитории. */
const KEY_TTL_DAYS = 13 * 30;

type BrowserMark = { key: string; since: string };

function readBrowserMark(): BrowserMark | null {
  // Только localStorage: ключ обязан переживать сессию, иначе он бесполезен.
  const raw = read(globalThis.localStorage, BROWSER_KEY);
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    const m = p as Partial<BrowserMark>;
    if (typeof m.key !== 'string' || typeof m.since !== 'string') return null;
    const ageDays = (Date.now() - Date.parse(m.since)) / 86_400_000;
    // Истёк — считаем, что ключа нет. Новый заведётся сам.
    if (!Number.isFinite(ageDays) || ageDays > KEY_TTL_DAYS) return null;
    return { key: m.key, since: m.since };
  } catch {
    return null;
  }
}

/**
 * Ключ браузера. Заводится при первом обращении, сам себя сбрасывает через
 * 13 месяцев. Возвращает null, если хранилище недоступно (приватный режим) —
 * тогда прохождение просто уедет без ключа, а не сломается.
 */
export function browserKey(): string | null {
  const existing = readBrowserMark();
  if (existing) return existing.key;

  const mark: BrowserMark = { key: newToken(), since: new Date().toISOString() };
  try {
    globalThis.localStorage?.setItem(BROWSER_KEY, JSON.stringify(mark));
  } catch {
    return null;
  }
  // Сброс счётчика вместе с ключом: иначе после истечения ключа номер
  // прохождения продолжился бы от старого и врал.
  try { globalThis.localStorage?.setItem(RUNS_KEY, '0'); } catch { /* ничего */ }
  return mark.key;
}

/**
 * Номер прохождения для этого браузера, 1-based. Увеличивается один раз
 * за прохождение — вызывать при отправке, а не при показе результата,
 * иначе перезагрузка страницы накрутит номер.
 */
export function bumpRunIndex(): number {
  if (!browserKey()) return 1;
  const raw = read(globalThis.localStorage, RUNS_KEY);
  const prev = Number.parseInt(raw ?? '0', 10);
  const next = Number.isFinite(prev) && prev > 0 ? prev + 1 : 1;
  try { globalThis.localStorage?.setItem(RUNS_KEY, String(next)); } catch { /* ничего */ }
  return next;
}

/**
 * Есть ли у этого браузера ключ прямо сейчас. Отличается от browserKey()
 * тем, что НЕ создаёт ключ: панель приватности должна показывать
 * состояние, а не заводить ключ самим фактом того, что её открыли.
 */
export function hasBrowserKey(): boolean {
  return readBrowserMark() !== null;
}

/** Сколько прохождений этот браузер уже отправил. */
export function runCount(): number {
  const raw = read(globalThis.localStorage, RUNS_KEY);
  const n = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * «Забыть этот браузер». Обязательная кнопка, а не удобство: ключ живёт
 * 13 месяцев на устройстве человека, и раз мы опираемся на освобождение
 * CNIL для статистики аудитории, человек должен иметь возможность стереть
 * ключ, не разбираясь в настройках браузера.
 *
 * Стирает только ключ и счётчик. Уже отправленные прохождения останутся
 * в базе — они анонимны и связать их с человеком нечем; об этом сказано
 * в панели прямым текстом, чтобы кнопка не обещала большего, чем делает.
 */
export function forgetBrowser(): void {
  for (const key of [BROWSER_KEY, RUNS_KEY]) {
    try { globalThis.localStorage?.removeItem(key); } catch { /* ничего */ }
  }
}
