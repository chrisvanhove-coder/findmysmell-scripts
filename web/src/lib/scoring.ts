import weights from '@/data/answer-weights.json';
import { ARCHETYPE_KEYS, type ArchetypeKey } from './archetype-colors';

/** Ответы квиза: id вопроса -> код выбранного варианта. */
export type Answers = Record<string, string>;
export type Scores = Record<ArchetypeKey, number>;

const ANSWER_WEIGHTS = weights as Record<string, Record<string, number>>;

/** Насколько близко второй архетип должен подойти к первому, чтобы его показать. */
export const TIE_THRESHOLD = 3;

export interface QuizResult {
  winner: ArchetypeKey;
  secondary: ArchetypeKey | null;
  scores: Scores;
}

export function score(answers: Answers): Scores {
  const scores = Object.fromEntries(ARCHETYPE_KEYS.map((a) => [a, 0])) as Scores;
  for (const code of Object.values(answers)) {
    const w = ANSWER_WEIGHTS[code];
    if (!w) continue;
    for (const a of ARCHETYPE_KEYS) scores[a] += Number(w[a] ?? 0);
  }
  return scores;
}

export function resolve(answers: Answers): QuizResult {
  const scores = score(answers);

  // Старая версия при ничьей выбирала победителя случайно, поэтому одни и те же
  // ответы могли дать разный результат при перезагрузке. Здесь ничья решается
  // порядком ARCHETYPE_KEYS — результат воспроизводим.
  let winner: ArchetypeKey = ARCHETYPE_KEYS[0];
  for (const a of ARCHETYPE_KEYS) if (scores[a] > scores[winner]) winner = a;

  let secondary: ArchetypeKey | null = null;
  for (const a of ARCHETYPE_KEYS) {
    if (a === winner) continue;
    if (Math.abs(scores[a] - scores[winner]) > TIE_THRESHOLD) continue;
    if (!secondary || scores[a] > scores[secondary]) secondary = a;
  }

  return { winner, secondary, scores };
}

/** Все коды ответов, у которых есть вес. Используется в тестах на полноту квиза. */
export function knownAnswerCodes(): string[] {
  return Object.keys(ANSWER_WEIGHTS);
}
