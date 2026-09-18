'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import {
  loadAnswers, loadOpenText, loadQuestionOpens, loadResearchConsent,
  runToken, revision, wasSent, markSent, browserKey, submissionRunIndex,
} from '@/lib/answers-store';
import { missingQuestions } from '@/lib/quiz-state';
import { reportFunnel } from '@/lib/funnel';
import styles from './record.module.css';

/**
 * Отправляет прохождение в базу и показывает правду, если оно не доехало.
 *
 * Отдельным компонентом, а не внутри ResultMatch, потому что это не про
 * подбор флакона: подбор влияет на разметку, а это побочный эффект, который
 * не должен мешать показу результата.
 *
 * Почему на клиенте: ответы живут только в браузере, сервер их не видит.
 * Почему безопасно: победитель и баллы пересчитываются на сервере из ответов,
 * присланным значениям он не верит (см. src/lib/submission.ts).
 */

/* Текст английский по той же причине, что и в SubscribeForm: FR и RU для
   страницы результата ещё не выгружены (HANDOFF, раздел 9.1).
   НУЖНА ВЫЧИТКА ЗАКАЗЧИЦЕЙ: этих двух строк на живом сайте нет — сверить
   их не с чем, они написаны здесь. */
const COPY = {
  failed: 'Your answers have not been saved yet.',
  retry: 'Try again',
} as const;

// Coalesce StrictMode requests. The database also enforces token + revision ordering.
const pending = new Map<string, Promise<void>>();

/** Сервер разобрал тело и отказал: повтор с тем же телом даст тот же ответ. */
class Rejected extends Error {}

export default function RecordSubmission({ locale }: { locale: Locale }) {
  const [failed, setFailed] = useState<'retry' | 'final' | null>(null);
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
        if (!cancelled) setFailed(null);
      } catch (error) {
        if (cancelled) return;
        // Кнопку повтора показываем только там, где повтор может помочь.
        if (error instanceof Rejected) {
          rejected.current = true;
          setFailed('final');
          return;
        }
        setFailed('retry');
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

  if (!failed) return null;
  return (
    <p className={styles.notice} role="status">
      {COPY.failed}
      {failed === 'retry' && (
        <button
          className={styles.retry}
          type="button"
          onClick={() => { setFailed(null); setAttempt((n) => n + 1); }}
        >
          {COPY.retry}
        </button>
      )}
    </p>
  );
}
