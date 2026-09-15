/**
 * Разбор и проверка события воронки. Живёт отдельно от роута, чтобы
 * прогоняться тестом без сервера — так же, как parseSubmission.
 *
 * Роут открыт наружу, поэтому здесь не «валидация для порядка», а граница:
 * длины ограничены, набор значений закрыт, всё лишнее из тела отбрасывается.
 */

export const FUNNEL_LIMITS = {
  runToken: 64,
  step: 40,
  answerCode: 60,
  locale: 8,
} as const;

export type FunnelRow = {
  runToken: string;
  step: string;
  event: 'view' | 'answer';
  answerCode: string | null;
  locale: string;
};

type Parsed = { ok: true; value: FunnelRow } | { ok: false; error: string };

const EVENTS = new Set(['view', 'answer']);

/** Шаг — либо код вопроса (Q_ENV_CHILD), либо один из служебных. */
const STEP = /^(Q_[A-Z0-9_]+|RESULT|EMAIL_SENT)$/;

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

export function parseFunnelEvent(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'body must be an object' };
  }
  const b = body as Record<string, unknown>;

  const runToken = str(b.runToken, FUNNEL_LIMITS.runToken);
  if (!runToken) return { ok: false, error: 'runToken is required' };

  const step = str(b.step, FUNNEL_LIMITS.step);
  if (!step || !STEP.test(step)) return { ok: false, error: 'step is invalid' };

  const event = typeof b.event === 'string' ? b.event : '';
  if (!EVENTS.has(event)) return { ok: false, error: 'event must be view or answer' };

  const locale = str(b.locale, FUNNEL_LIMITS.locale);
  if (!locale) return { ok: false, error: 'locale is required' };

  // Код ответа необязателен: у 'view' его нет, у открытого вопроса тоже.
  // Сам текст открытого ответа сюда не попадает намеренно — он личный
  // и уже лежит в submissions под своим согласием.
  const answerCode =
    b.answerCode === undefined || b.answerCode === null
      ? null
      : str(b.answerCode, FUNNEL_LIMITS.answerCode);
  if (b.answerCode !== undefined && b.answerCode !== null && answerCode === null) {
    return { ok: false, error: 'answerCode is invalid' };
  }

  return { ok: true, value: { runToken, step, event: event as 'view' | 'answer', answerCode, locale } };
}
