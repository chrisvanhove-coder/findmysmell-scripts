import { resolve, type Answers, type Scores } from './scoring';
import { isLocale, type Locale } from './i18n';
import { ARCHETYPE_KEYS, type ArchetypeKey } from './archetype-colors';

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
  clientToken: 64,
} as const;

export interface SubmissionInput {
  locale: string;
  answers: Answers;
  openAnswer: string;
  consentResearch: boolean;
  clientToken: string;
}

/** Готовая к вставке строка submissions. */
export interface SubmissionRecord {
  locale: Locale;
  winner: ArchetypeKey;
  secondary: ArchetypeKey | null;
  scores: Scores;
  answers: Answers;
  openAnswer: string | null;
  consentResearch: boolean;
  clientToken: string;
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
    clean[key] = value;
  }

  // Последний экран квиза — Q_OPEN, и пройти его можно только ответив на
  // Q_RADIUS. Без него прохождение не завершено: скорее всего человек пришёл
  // по ссылке на чужой результат, а не прошёл квиз.
  if (!('Q_RADIUS' in clean)) return { ok: false, error: 'quiz not finished' };

  if (typeof consentResearch !== 'boolean') {
    return { ok: false, error: 'consentResearch must be a boolean' };
  }

  const open = typeof openAnswer === 'string' ? openAnswer : '';
  if (open.length > LIMITS.openAnswer) return { ok: false, error: 'open answer too long' };

  if (typeof clientToken !== 'string' || clientToken.length === 0) {
    return { ok: false, error: 'clientToken is required' };
  }
  if (clientToken.length > LIMITS.clientToken) {
    return { ok: false, error: 'clientToken too long' };
  }

  return {
    ok: true,
    input: {
      locale,
      answers: clean,
      openAnswer: open,
      consentResearch,
      clientToken,
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
  };
}

/* ------------------------------- подписка ------------------------------- */

export interface SubscriberInput {
  email: string;
  locale: Locale;
  archetype: ArchetypeKey | null;
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

  const { email, locale, archetype, consentEmail } = body;

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

  return { ok: true, input: { email: normalized, locale, archetype: key } };
}

function resolveArchetype(value: string): ArchetypeKey | null {
  const upper = value.toUpperCase();
  return ARCHETYPE_KEYS.find((a) => a === upper) ?? null;
}
