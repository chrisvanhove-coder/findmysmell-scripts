'use client';

import type { Answers } from './scoring';
import { currentAnswers, selectedOpen } from './quiz-state';

/**
 * Ответы живут в браузере до самого результата — как и раньше.
 * Ключи оставлены прежними, чтобы старая страница результата продолжала
 * работать, пока трафик не переключён целиком.
 */
const KEY = 'quiz_answers';
const OPEN_KEY = 'quiz_open';
/**
 * Тексты, написанные в ответ на «Other» ВНУТРИ вопроса — по одному на
 * вопрос.
 *
 * ЗАЧЕМ ОТДЕЛЬНОЕ ХРАНИЛИЩЕ. На живом сайте девять вопросов (calm, cozy,
 * energy, focus, play, sexy, myst, celebrate, calm-now) на вариант
 * «Other» открывают окошко и просят написать своё — «What does calm
 * smell like to you?». И все девять пишут этот текст в `quiz_open`, то
 * есть в то же место, что финальный открытый вопрос. Одно затирает
 * другое: человек написал про спокойствие, потом написал воспоминание —
 * осталось одно. Заказчица назвала эти ответы самым важным, что есть в
 * квизе, и выбрала хранить каждый отдельно.
 */
const QUESTION_OPEN_KEY = 'quiz_open_by_question';

function storage(kind: 'sessionStorage' | 'localStorage'): Storage | undefined {
  try { return globalThis[kind]; } catch { return undefined; }
}

function read(storage: Storage | undefined, key: string): string | null {
  try { return storage?.getItem(key) ?? null; } catch { return null; }
}

function write(key: string, value: string) {
  for (const s of [storage('sessionStorage'), storage('localStorage')]) {
    try { s?.setItem(key, value); } catch { /* приватный режим — переживём */ }
  }
}

export function loadAnswers(): Answers {
  const raw =
    read(storage('sessionStorage'), KEY) ?? read(storage('localStorage'), KEY) ?? '{}';
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? currentAnswers(parsed as Answers) : {};
  } catch {
    return {};
  }
}

export function saveAnswer(questionId: string, code: string): Answers {
  const before = loadAnswers();
  const answers = currentAnswers({ ...before, [questionId]: code });
  if (JSON.stringify(before) !== JSON.stringify(answers)) changed();
  write(KEY, JSON.stringify(answers));
  const opens = Object.fromEntries(Object.entries(loadQuestionOpens())
    .filter(([id]) => selectedOpen(id, answers)));
  write(QUESTION_OPEN_KEY, JSON.stringify(opens));
  return answers;
}

export function loadOpenText(): string {
  return read(storage('sessionStorage'), OPEN_KEY) ?? read(storage('localStorage'), OPEN_KEY) ?? '';
}

export function saveOpenText(value: string) {
  if (loadOpenText() !== value) changed();
  write(OPEN_KEY, value);
}

/** Все тексты «Other» этого прохождения: код вопроса → текст. */
export function loadQuestionOpens(): Record<string, string> {
  const raw = read(storage('sessionStorage'), QUESTION_OPEN_KEY)
    ?? read(storage('localStorage'), QUESTION_OPEN_KEY) ?? '{}';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    const answers = loadAnswers();
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v !== '' && selectedOpen(k, answers)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Записать текст «Other» для одного вопроса.
 *
 * Пустая строка стирает запись, а не сохраняет пустоту: человек мог
 * открыть окошко, передумать и выбрать обычный вариант — тогда его
 * прежний текст к этому вопросу больше не относится.
 */
export function saveQuestionOpen(questionId: string, value: string) {
  const all = loadQuestionOpens();
  const text = value.trim();
  if ((all[questionId] ?? '') !== text) changed();
  if (text === '') delete all[questionId];
  else all[questionId] = text;
  write(QUESTION_OPEN_KEY, JSON.stringify(all));
}

export function clearAnswers() {
  for (const s of [storage('sessionStorage'), storage('localStorage')]) {
    try {
      s?.removeItem(KEY);
      s?.removeItem(OPEN_KEY);
      s?.removeItem(QUESTION_OPEN_KEY);
      // Иначе следующее прохождение уехало бы под старым токеном
      // и база отсекла бы его как повтор.
      s?.removeItem(TOKEN_KEY);
      s?.removeItem(SENT_KEY);
      s?.removeItem(CONSENT_KEY);
      s?.removeItem(REVISION_KEY);
      s?.removeItem(RUN_INDEX_KEY);
    } catch { /* пусто */ }
  }
}

const CONSENT_KEY = 'consent_aggregate';

/**
 * Согласие на использование анонимных ответов в исследовании.
 * Ключ тот же, что читала старая отправка результата.
 */
export function saveResearchConsent(agreed: boolean) {
  if (loadResearchConsent() !== agreed) changed();
  write(CONSENT_KEY, agreed ? 'true' : 'false');
}

export function loadResearchConsent(): boolean | null {
  const v =
    read(storage('localStorage'), CONSENT_KEY) ?? read(storage('sessionStorage'), CONSENT_KEY);
  return v === null ? null : v === 'true';
}

/* ------------------------- отправка прохождения ------------------------- */

// quiz_sent — тот же ключ и то же значение, что в проде: пока обе версии
// живы, они не должны отправить одно прохождение дважды.
const SENT_KEY = 'quiz_sent';
const TOKEN_KEY = 'quiz_token';

const REVISION_KEY = 'quiz_revision';
const RUN_INDEX_KEY = 'quiz_run_index';

export function revision(): number {
  const n = Number(read(storage('sessionStorage'), REVISION_KEY)
    ?? read(storage('localStorage'), REVISION_KEY) ?? 0);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function changed() {
  write(REVISION_KEY, String(revision() + 1));
  for (const s of [storage('sessionStorage'), storage('localStorage')]) {
    try { s?.removeItem(SENT_KEY); } catch { /* unavailable */ }
  }
}

/** Explicit Start begins a new run. Back, including to Q_GENDER, does not. */
export function beginRun() {
  clearAnswers();
  write(TOKEN_KEY, newToken());
}

/** Retries and edits keep the run number; only a new run increments it. */
export function submissionRunIndex(): number | null {
  if (!browserKey()) return null;
  const existing = Number(read(storage('sessionStorage'), RUN_INDEX_KEY)
    ?? read(storage('localStorage'), RUN_INDEX_KEY));
  if (existing > 0) return existing;
  const next = bumpRunIndex();
  write(RUN_INDEX_KEY, String(next));
  return next;
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
    read(storage('sessionStorage'), TOKEN_KEY) ?? read(storage('localStorage'), TOKEN_KEY);
  if (existing) return existing;
  const token = newToken();
  write(TOKEN_KEY, token);
  return token;
}

export function wasSent(): boolean {
  return (
    read(storage('sessionStorage'), SENT_KEY) === '1' ||
    read(storage('localStorage'), SENT_KEY) === '1'
  );
}

export function markSent(token = runToken(), sentRevision = revision()) {
  // An older request must not mark a newer edit (or a new run) as saved.
  if (token === runToken() && sentRevision === revision()) write(SENT_KEY, '1');
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
  const raw = read(storage('localStorage'), BROWSER_KEY);
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

  const local = storage('localStorage');
  if (!local) return null;
  const mark: BrowserMark = { key: newToken(), since: new Date().toISOString() };
  try {
    local.setItem(BROWSER_KEY, JSON.stringify(mark));
  } catch {
    return null;
  }
  // Сброс счётчика вместе с ключом: иначе после истечения ключа номер
  // прохождения продолжился бы от старого и врал.
  try { storage('localStorage')?.setItem(RUNS_KEY, '0'); } catch { /* ничего */ }
  return mark.key;
}

/**
 * Номер прохождения для этого браузера, 1-based. Увеличивается один раз
 * за прохождение — вызывать при отправке, а не при показе результата,
 * иначе перезагрузка страницы накрутит номер.
 */
export function bumpRunIndex(): number {
  if (!browserKey()) return 1;
  const raw = read(storage('localStorage'), RUNS_KEY);
  const prev = Number.parseInt(raw ?? '0', 10);
  const next = Number.isFinite(prev) && prev > 0 ? prev + 1 : 1;
  try { storage('localStorage')?.setItem(RUNS_KEY, String(next)); } catch { /* ничего */ }
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
  const raw = read(storage('localStorage'), RUNS_KEY);
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
    try { storage('localStorage')?.removeItem(key); } catch { /* ничего */ }
  }
}
