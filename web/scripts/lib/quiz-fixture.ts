import { FIRST_QUESTION, QUESTIONS, nextQuestion } from '../../src/lib/quiz';
import { isCountryQuestion } from '../../src/data/countries';
import type { Answers } from '../../src/lib/scoring';

export function completeAnswers(emotion = 'CALM'): Answers {
  const answers: Answers = {};
  let id = FIRST_QUESTION.id;
  while (id !== 'Q_OPEN' && id !== 'RESULT') {
    answers[id] = id === 'Q_EMO' ? `Q_EMO__${emotion}`
      : isCountryQuestion(id) ? 'France' : QUESTIONS[id].answers[0].code;
    id = nextQuestion(id, answers[id]);
  }
  return answers;
}
