'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import {
  loadAnswers, loadOpenText, loadQuestionOpens, loadResearchConsent,
  runToken, revision, wasSent, markSent, browserKey, submissionRunIndex,
} from '@/lib/answers-store';
import { missingQuestions } from '@/lib/quiz-state';
import { watchForAbandon } from '@/lib/abandoned';
import { reportFunnel } from '@/lib/funnel';

/**
 * Отправляет прохождение в базу — молча, чем бы дело ни кончилось.
 *
 * Отдельным компонентом, а не внутри ResultMatch, потому что это не про
 * подбор флакона: подбор влияет на разметку, а это побочный эффект, который
 * не должен мешать показу результата.
 *
 * Почему на клиенте: ответы живут только в браузере, сервер их не видит.
 * Почему безопасно: победитель и баллы пересчитываются на сервере из ответов,
 * присланным значениям он не верит (см. src/lib/submission.ts).
 *
 * ПОЧЕМУ ЧЕЛОВЕКУ НИЧЕГО НЕ ПОКАЗЫВАЕМ. Здесь стояла полоса «Your answers
 * have not been saved yet» с кнопкой повтора. Заказчица её сняла, и по делу:
 * сюда доходит только тот, кто ответил на всё, запись в нашу базу — наша
 * забота, а не его, и тревожная строка на странице результата отнимает у
 * человека то, ради чего он проходил квиз. Хуже того, она загоралась ещё до
 * того, как отработают автоматические повторы: при первой же неудаче человек
 * две секунды видел «не сохранено», хотя следующая попытка проходила.
 *
 * ЧЕМ ЗАМЕНЕНА. Не тишиной, а второй попыткой доставки. Повторы остались
 * (5xx и обрыв связи — дважды), а сверху добавлена та же отправка на уходе
 * со страницы, что и у брошенных прохождений: если ни одна попытка не
 * прошла, `wasSent()` остаётся false, и sendBeacon добивает запись, когда
 * человек закрывает вкладку. Набор ответов здесь полный, так что сервер
 * посчитает `completed = true` — это будет нормальное завершённое
 * прохождение, а не брошенное.
 *
 * В сумме данных сохраняется БОЛЬШЕ, чем с кнопкой: кнопку надо было
 * заметить и нажать, а маячок уходит сам.
 */

// Coalesce StrictMode requests. The database also enforces token + revision ordering.
const pending = new Map<string, Promise<void>>();

/** Сервер разобрал тело и отказал: повтор с тем же телом даст тот же ответ. */
class Rejected extends Error {}

export default function RecordSubmission({ locale }: { locale: Locale }) {
  const [attempt, setAttempt] = useState(0);
  // Отказ по существу не лечится повтором, в том числе по событию `online`.
  const rejected = useRef(false);

  /* Шаг RESULT в воронке. ОТДЕЛЬНЫМ эффектом от записи прохождения: сюда
     доходят и те, кто не дал согласия на исследование, и те, чья запись уже
     отправлена, и их тоже надо считать — иначе «дошёл до результата»
     окажется меньше правды. Лишнего события не боимся: в админке шаги
     считаются через count(distinct run_token). */
  useEffect(() => {
    if (!('Q_RADIUS' in loadAnswers())) return;
    reportFunnel(locale, runToken(), { step: 'RESULT', event: 'view' });
  }, [locale]);

  useEffect(() => {
    if (rejected.current) return;
    const consent = loadResearchConsent();
    const answers = loadAnswers();
    if (consent === null || missingQuestions(answers).length || wasSent()) return;
    const token = runToken();
    const version = revision();
    const id = `${token}:${version}`;
    const payload = {
      locale, answers, openAnswer: loadOpenText(), questionOpens: loadQuestionOpens(),
      consentResearch: consent, clientToken: token, revision: version,
      browserKey: browserKey(), runIndex: submissionRunIndex(),
    };
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function send() {
      let request = pending.get(id);
      if (!request) {
        request = (async () => {
          const response = await fetch('/api/submissions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), keepalive: true,
            signal: AbortSignal.timeout(15000),
          });
          // 4xx — тело отвергнуто разбором, и повтор ничего не изменит.
          // 5xx и обрыв связи временные: их повторяем.
          if (response.status >= 400 && response.status < 500) throw new Rejected('rejected');
          if (!response.ok) throw new Error('save failed');
          const body = await response.json();
          if (!body.stored && !body.duplicate) throw new Error('save not acknowledged');
          markSent(token, version);
        })().finally(() => pending.delete(id));
        pending.set(id, request);
      }
      try {
        await request;
      } catch (error) {
        if (cancelled) return;
        // Повторяем только там, где повтор может помочь.
        if (error instanceof Rejected) {
          rejected.current = true;
          return;
        }
        if (attempt < 2) timer = setTimeout(() => setAttempt((n) => n + 1), 2000 * (attempt + 1));
      }
    }
    void send();
    const online = () => setAttempt((n) => n + 1);
    window.addEventListener('online', online);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('online', online);
    };
  }, [locale, attempt]);

  /* Страховка: если ни одна попытка выше не прошла, `wasSent()` остался
     false — и та же отправка, что спасает брошенные прохождения, добьёт
     запись, когда человек уйдёт со страницы. Сама проверяет, что слать
     есть что и что оно ещё не сохранено (см. lib/abandoned.ts). */
  useEffect(() => watchForAbandon(locale), [locale]);

  // Ничего не рисует: см. заголовок файла.
  return null;
}
