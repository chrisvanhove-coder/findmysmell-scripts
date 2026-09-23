/**
 * Записывает e2e/lib/complete-run.json — полный набор ответов одного
 * прохождения, которым браузерные проверки открывают страницу результата.
 *
 * ЗАЧЕМ ФАЙЛ, А НЕ ПРОХОД КВИЗА. Результат закрыт пропуском
 * (src/components/ResultGate.tsx): без полного набора ответов страница не
 * отрисуется. Проверкам вроде «как выглядит фонарик» проходить ради этого
 * восемнадцать экранов — лишние минуты на каждый запуск. Набор один и тот
 * же, так что он лежит файлом.
 *
 * ЗА РАССИНХРОНОМ СЛЕДИТ check:revisions: если в квизе появится новый
 * вопрос, файл станет неполным, проверка упадёт и позовёт сюда.
 *
 * Перегенерировать: npm run fixture:run
 */
import { writeFileSync } from 'node:fs';
import { QUESTIONS } from '../src/lib/quiz.ts';
import { completeAnswers } from './lib/quiz-fixture.ts';

/* По набору на КАЖДУЮ ветку эмоции. Вопрос Q_EMO разводит квиз на семь
   разных хвостов, и набор, полный для «спокойствия», для «игры» уже
   дырявый: гейт результата такого человека развернёт. Проверке, которой
   нужна своя эмоция, нужен и свой набор. */
/* Список эмоций берём из самого квиза, а не из EMOTION_BRANCHES: там
   лежат идентификаторы вопросов-хвостов (Q_CALM), а ветку выбирает код
   ответа (Q_EMO__CALM). Появится восьмая эмоция — набор появится сам. */
const runs: Record<string, unknown> = {};
for (const emotion of QUESTIONS.Q_EMO.answers.map((a) => a.code.replace('Q_EMO__', ''))) {
  runs[emotion] = completeAnswers(emotion);
}

writeFileSync('e2e/lib/complete-run.json', JSON.stringify(runs, null, 2) + '\n');
console.log(`e2e/lib/complete-run.json — ветки: ${Object.keys(runs).join(', ')}`);
