import { resolve, type Answers, type Scores } from './scoring';
import { isLocale, type Locale } from './i18n';
import { ARCHETYPE_KEYS, type ArchetypeKey } from './archetype-colors';
import { QUESTIONS } from './quiz';
import { validAnswer, currentAnswers, selectedOpen } from './quiz-state';

/**
 * Вопросы, у которых есть вариант «Other» с текстовым вводом.
 *
 * Берётся из данных квиза (`open: true`), а не списком руками: появится
 * десятый такой вопрос — он попадёт сюда сам, и наоборот, к выдуманному
 * коду вопроса текст записать не выйдет.
 */
const QUESTIONS_WITH_OPEN = new Set(
  Object.values(QUESTIONS)
    .filter((q) => q.answers.some((a) => a.open))
    .map((q) => q.id),
);

/**
 * Приём прохождения квиза. Заменяет отправку в Google Apps Script,
 * которая была зашита в webflow/page-result-footer.html.
 *
 * Отличие от прода одно, и оно намеренное: баллы и победитель НЕ принимаются
 * от клиента, а считаются здесь заново из ответов. В проде клиент присылал
 * winner и scores готовыми, то есть их можно было прислать любыми. Пересчёт
 * стал возможен только после того, как из подсчёта убрали Math.random: на
 * одних и тех же ответах resolve() теперь даёт то же самое на сервере, что
 * и в браузере.
 *
 * Согласие на исследование работает как в проде: прохождение пишется всегда,
 * ответы сохраняются всегда, а отказ фиксируется флагом consent_research =
 * false. Результат человек видит независимо от ответа на этот вопрос.
 */

/** Максимумы — чтобы в базу не уехал мусор произвольного размера. */
const LIMITS = {
  answers: 40,
  answerKey: 64,
  answerValue: 128,
  openAnswer: 2000,
  /**
   * Тексты «Other» внутри вопросов. Девять таких вопросов, десятый —
   * запас на случай, если появится ещё один; больше — уже не квиз.
   */
  questionOpens: 12,
  questionOpenText: 2000,
  clientToken: 64,
  browserKey: 64,
  /** Больше — либо накрутка, либо ошибка счётчика. Обрезаем, а не верим. */
  runIndex: 10_000,
} as const;

export interface SubmissionInput {
  locale: string;
  answers: Answers;
  openAnswer: string;
  /**
   * Тексты «Other» по вопросам: код вопроса → написанное. Отдельно от
   * openAnswer намеренно: в проде и то и другое писалось в одно поле, и
   * одно затирало другое.
   */
  questionOpens: Record<string, string>;
  consentResearch: boolean;
  clientToken: string;
  revision: number;
  browserKey: string | null;
  runIndex: number | null;
}

/**
 * Готовая к вставке строка submissions.
 *
 * Тексты «Other» по вопросам здесь НЕ лежат намеренно: это другая
 * таблица, и лишнее поле в этом объекте уехало бы в insert как
 * несуществующая колонка. Они берутся из `input.questionOpens`
 * и пишутся отдельной вставкой — см. buildQuestionOpenRows.
 */
export interface SubmissionRecord {
  locale: Locale;
  winner: ArchetypeKey;
  secondary: ArchetypeKey | null;
  scores: Scores;
  answers: Answers;
  openAnswer: string | null;
  consentResearch: boolean;
  clientToken: string;
  revision: number;
  browserKey: string | null;
  runIndex: number | null;
}

export type Parsed =
  | { ok: true; input: SubmissionInput }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Разбор и проверка тела запроса. Клиенту не доверяем ничему, кроме ответов. */
export function parseSubmission(body: unknown): Parsed {
  if (!isPlainObject(body)) return { ok: false, error: 'body must be an object' };

  const { locale, answers, openAnswer, consentResearch, clientToken } = body;
  const b = body;

  if (typeof locale !== 'string' || !isLocale(locale)) {
    return { ok: false, error: 'unknown locale' };
  }

  if (!isPlainObject(answers)) return { ok: false, error: 'answers must be an object' };
  const entries = Object.entries(answers);
  if (entries.length === 0) return { ok: false, error: 'answers are empty' };
  if (entries.length > LIMITS.answers) return { ok: false, error: 'too many answers' };

  const clean: Answers = {};
  for (const [key, value] of entries) {
    if (key.length > LIMITS.answerKey) return { ok: false, error: 'answer key too long' };
    if (typeof value !== 'string') return { ok: false, error: 'answer must be a string' };
    if (value.length > LIMITS.answerValue) return { ok: false, error: 'answer value too long' };
    if (!validAnswer(key, value)) return { ok: false, error: `invalid answer for ${key}` };
    clean[key] = value;
  }

  if (Object.keys(currentAnswers(clean)).length !== entries.length) {
    return { ok: false, error: 'answers contain an inactive branch' };
  }
  const revision = b.revision ?? 0;
  if (!Number.isSafeInteger(revision) || (revision as number) < 0 || (revision as number) > 2147483647) {
    return { ok: false, error: 'invalid revision' };
  }

  if (typeof consentResearch !== 'boolean') {
    return { ok: false, error: 'consentResearch must be a boolean' };
  }

  const open = typeof openAnswer === 'string' ? openAnswer : '';
  if (open.length > LIMITS.openAnswer) return { ok: false, error: 'open answer too long' };

  /* Тексты «Other» по вопросам. Принимаем только те коды вопросов, у
     которых такой вариант вообще есть: иначе в таблицу можно было бы
     записать текст к любому выдуманному вопросу. */
  const rawOpens = b.questionOpens;
  const questionOpens: Record<string, string> = {};
  if (rawOpens !== undefined && rawOpens !== null) {
    if (!isPlainObject(rawOpens)) {
      return { ok: false, error: 'questionOpens must be an object' };
    }
    const openEntries = Object.entries(rawOpens);
    if (openEntries.length > LIMITS.questionOpens) {
      return { ok: false, error: 'too many question opens' };
    }
    for (const [qid, value] of openEntries) {
      if (!QUESTIONS_WITH_OPEN.has(qid)) {
        return { ok: false, error: `question ${qid} has no open option` };
      }
      if (!selectedOpen(qid, clean)) {
        return { ok: false, error: `open option not selected for ${qid}` };
      }
      if (typeof value !== 'string') {
        return { ok: false, error: 'question open must be a string' };
      }
      if (value.length > LIMITS.questionOpenText) {
        return { ok: false, error: 'question open too long' };
      }
      const text = value.trim();
      if (text !== '') questionOpens[qid] = text;
    }
  }

  if (typeof clientToken !== 'string' || clientToken.length === 0) {
    return { ok: false, error: 'clientToken is required' };
  }
  if (clientToken.length > LIMITS.clientToken) {
    return { ok: false, error: 'clientToken too long' };
  }

  // Ключ браузера и номер прохождения необязательны: в приватном режиме
  // хранилище недоступно, и прохождение должно уехать без них, а не упасть.
  const rawKey = b.browserKey;
  const browserKey =
    typeof rawKey === 'string' && rawKey.length > 0 && rawKey.length <= LIMITS.browserKey
      ? rawKey
      : null;

  const rawIndex = b.runIndex;
  const runIndex =
    typeof rawIndex === 'number' &&
    Number.isInteger(rawIndex) &&
    rawIndex >= 1 &&
    rawIndex <= LIMITS.runIndex
      ? rawIndex
      : null;

  return {
    ok: true,
    input: {
      locale,
      answers: clean,
      openAnswer: open,
      questionOpens,
      consentResearch,
      clientToken,
      revision: revision as number,
      browserKey,
      runIndex,
    },
  };
}

/**
 * Строка для вставки. Победитель и баллы считаются здесь, из ответов —
 * присланным клиентом значениям не верим.
 *
 * Ответы и открытый текст сохраняются независимо от согласия на
 * исследование: отказ фиксируется флагом consentResearch, как в проде.
 */
export function buildRecord(input: SubmissionInput): SubmissionRecord {
  const { winner, secondary, scores } = resolve(input.answers);

  return {
    locale: input.locale as Locale,
    winner,
    secondary,
    scores,
    answers: input.answers,
    openAnswer: input.openAnswer !== '' ? input.openAnswer : null,
    consentResearch: input.consentResearch,
    clientToken: input.clientToken,
    revision: input.revision,
    // Номер без ключа смысла не имеет: не с чем связать. И наоборот —
    // ключ без номера бесполезен. Поэтому пара, либо ничего.
    browserKey: input.browserKey !== null && input.runIndex !== null ? input.browserKey : null,
    runIndex: input.browserKey !== null && input.runIndex !== null ? input.runIndex : null,
  };
}

/**
 * Строки для question_open_answers под уже вставленное прохождение.
 *
 * Вынесено отдельно, чтобы это можно было прогнать тестом без базы,
 * как и всё остальное в этом файле.
 */
export function buildQuestionOpenRows(
  submissionId: string,
  questionOpens: Record<string, string>,
): Array<{ submissionId: string; questionId: string; text: string }> {
  return Object.entries(questionOpens)
    .filter(([, text]) => text !== '')
    .map(([questionId, text]) => ({ submissionId, questionId, text }));
}

/* ------------------------------- подписка ------------------------------- */

export interface SubscriberInput {
  email: string;
  locale: Locale;
  archetype: ArchetypeKey | null;
  /** id подобранного флакона, если браузер его прислал. */
  perfumeId: string | null;
}

export type ParsedSubscriber =
  | { ok: true; input: SubscriberInput }
  | { ok: false; error: string };

// Проверка та же по смыслу, что в проде (там было `email.includes('@')`),
// но чуть строже: адрес попадает в базу и по нему потом отправляют письмо.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/**
 * Разбор подписки на письмо с результатом.
 *
 * Согласие на письмо (`consent_email` в проде) обязательно: чекбокс в форме
 * отдельный от согласия на исследование, и без него строка не создаётся вовсе.
 * Поэтому сам факт наличия строки в subscribers и есть подтверждение согласия,
 * а createdAt — его время.
 */
export function parseSubscriber(body: unknown): ParsedSubscriber {
  if (!isPlainObject(body)) return { ok: false, error: 'body must be an object' };

  const { email, locale, archetype, consentEmail, perfumeId } = body;

  if (consentEmail !== true) return { ok: false, error: 'email consent is required' };

  if (typeof email !== 'string') return { ok: false, error: 'email must be a string' };
  const normalized = email.trim().toLowerCase();
  if (normalized.length > EMAIL_MAX || !EMAIL.test(normalized)) {
    return { ok: false, error: 'invalid email' };
  }

  if (typeof locale !== 'string' || !isLocale(locale)) {
    return { ok: false, error: 'unknown locale' };
  }

  let key: ArchetypeKey | null = null;
  if (typeof archetype === 'string' && archetype !== '') {
    const found = resolveArchetype(archetype);
    if (!found) return { ok: false, error: 'unknown archetype' };
    key = found;
  }

  // Подобранный флакон. Прохождения обезличены и с адресом не связаны,
  // а подбор считается в браузере — восстановить его на сервере нельзя.
  // Поле необязательное: без него письмо будет только про архетип.
  let perfume: string | null = null;
  if (perfumeId !== undefined && perfumeId !== null && perfumeId !== '') {
    if (typeof perfumeId !== 'string' || perfumeId.length > 64) {
      return { ok: false, error: 'invalid perfumeId' };
    }
    perfume = perfumeId;
  }

  return {
    ok: true,
    input: { email: normalized, locale, archetype: key, perfumeId: perfume },
  };
}

function resolveArchetype(value: string): ArchetypeKey | null {
  const upper = value.toUpperCase();
  return ARCHETYPE_KEYS.find((a) => a === upper) ?? null;
}
