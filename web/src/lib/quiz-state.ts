import { QUESTIONS, EMOTION_BRANCHES, FIRST_QUESTION, nextQuestion } from './quiz';
import { COUNTRIES, isCountryQuestion } from '@/data/countries';
import type { Answers } from './scoring';

export function validAnswer(id: string, value: string): boolean {
  if (isCountryQuestion(id)) return COUNTRIES.includes(value);
  return QUESTIONS[id]?.answers?.some((a) => a.code === value) ?? false;
}

/** Only the selected emotional branch contributes to a run. */
export function currentAnswers(answers: Answers): Answers {
  const branch = nextQuestion('Q_EMO', typeof answers.Q_EMO === 'string' ? answers.Q_EMO : '');
  return Object.fromEntries(Object.entries(answers).filter(([id, value]) =>
    typeof value === 'string' && validAnswer(id, value) &&
    (!(EMOTION_BRANCHES as readonly string[]).includes(id) || id === branch),
  ));
}

export function missingQuestions(answers: Answers): string[] {
  const missing: string[] = [];
  let id = FIRST_QUESTION.id;
  while (id !== 'RESULT' && id !== 'Q_OPEN') {
    if (!validAnswer(id, answers[id] ?? '')) missing.push(id);
    id = nextQuestion(id, answers[id] ?? '');
  }
  return missing;
}

export function selectedOpen(id: string, answers: Answers): boolean {
  return QUESTIONS[id]?.answers?.some((a) => a.code === answers[id] && a.open) ?? false;
}
