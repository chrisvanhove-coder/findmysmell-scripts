import quizEn from '@/data/quiz.en.json';

/**
 * Порядок и ветвление квиза. Перенесено из QUESTION_ORDER и обработчика
 * кликов в site-custom-code Webflow без изменений в логике.
 */

export interface Answer {
  code: string;
  label: string;
  hint?: string;
  /** Скрыт в Webflow — не показываем, но код сохраняем для сверки. */
  hidden?: boolean;
  /** Открывает поле для своего варианта. */
  open?: boolean;
}

export interface Question {
  id: string;
  /** Адрес: Q_ENV_CHILD -> q-env-child */
  slug: string;
  answers: Answer[];
  /** Хаб эмоций: ответ уводит в свою ветку. */
  branch?: boolean;
  /** Уточнение внутри ветки эмоции; после него всегда Q_ENV_CHILD. */
  emotionDetail?: boolean;
  /** Ось подбора, если вопрос её задаёт. */
  axis?: 'sweet' | 'raw' | 'projection';
  /** Свободный текст вместо вариантов. */
  openText?: boolean;
}

/** Ветки эмоций. Пользователь проходит ровно одну из семи. */
export const EMOTION_BRANCHES = [
  'Q_CALM', 'Q_ENERGY', 'Q_COZY', 'Q_MYST', 'Q_SEXY', 'Q_FOCUS', 'Q_PLAY',
] as const;

/** Линейный путь. Ветки эмоций сюда не входят — они вставляются после Q_EMO. */
const MAIN_PATH = [
  'Q_GENDER', 'Q_REGION_NOW', 'Q_GENERATION',
  'Q_DAYTDAY', 'Q_STAYWELL',
  'Q_ATMOS', 'Q_YOURSELF',
  'Q_EMO',
  'Q_ENV_CHILD', 'Q_REGION_CHILD', 'Q_CELEBRATE', 'Q_CALM_NOW',
  'Q_SWEET', 'Q_WILD', 'Q_SKIN_BEHAVIOR', 'Q_RADIUS',
  'Q_OPEN',
] as const;

export const toSlug = (id: string) => id.toLowerCase().replace(/_/g, '-');

const RAW = quizEn as Record<string, { answers?: Answer[] } & Partial<Question>>;

export const QUESTIONS: Record<string, Question> = Object.fromEntries(
  Object.entries(RAW)
    .filter(([id]) => !id.startsWith('_'))
    .map(([id, q]) => [id, {
      id,
      slug: toSlug(id),
      answers: (q.answers ?? []).filter((a) => !a.hidden),
      branch: q.branch,
      emotionDetail: q.emotionDetail,
      axis: q.axis,
      openText: q.openText,
    }]),
);

export function questionBySlug(slug: string): Question | null {
  return Object.values(QUESTIONS).find((q) => q.slug === slug) ?? null;
}

/** Первый вопрос квиза. */
export const FIRST_QUESTION = QUESTIONS[MAIN_PATH[0]];

/**
 * Следующий шаг после ответа. Возвращает id вопроса или 'RESULT'.
 * Q_EMO уводит в ветку выбранной эмоции, а любая ветка возвращает
 * в Q_ENV_CHILD — ровно как в старом коде.
 */
export function nextQuestion(currentId: string, answerCode: string): string {
  if (currentId === 'Q_EMO') {
    const branch = 'Q_' + answerCode.replace('Q_EMO__', '');
    if ((EMOTION_BRANCHES as readonly string[]).includes(branch)) return branch;
  }
  if ((EMOTION_BRANCHES as readonly string[]).includes(currentId)) return 'Q_ENV_CHILD';

  const i = MAIN_PATH.indexOf(currentId as (typeof MAIN_PATH)[number]);
  if (i === -1 || i === MAIN_PATH.length - 1) return 'RESULT';
  return MAIN_PATH[i + 1];
}

/** Сколько шагов проходит пользователь: линейный путь плюс одна ветка эмоции. */
export const TOTAL_STEPS = MAIN_PATH.length + 1;

/** Номер текущего шага, 1-based. Ветки эмоций считаются одним шагом. */
export function stepOf(questionId: string): number {
  if ((EMOTION_BRANCHES as readonly string[]).includes(questionId)) {
    return MAIN_PATH.indexOf('Q_EMO') + 2;
  }
  const i = MAIN_PATH.indexOf(questionId as (typeof MAIN_PATH)[number]);
  if (i === -1) return 1;
  // после Q_EMO все шаги сдвинуты на один из-за ветки
  return i + 1 + (i > MAIN_PATH.indexOf('Q_EMO') ? 1 : 0);
}
