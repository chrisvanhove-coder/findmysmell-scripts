'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import {
  loadAnswers, loadOpenText, loadQuestionOpens, loadResearchConsent,
  runToken, revision, wasSent, markSent, browserKey, submissionRunIndex,
} from '@/lib/answers-store';
import { missingQuestions } from '@/lib/quiz-state';
import { reportFunnel } from '@/lib/funnel';

// Coalesce StrictMode requests. The database also enforces token + revision ordering.
const pending = new Map<string, Promise<void>>();

export default function RecordSubmission({ locale }: { locale: Locale }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
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
    reportFunnel(locale, token, { step: 'RESULT', event: 'view' });
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
          if (!response.ok) throw new Error('save failed');
          const body = await response.json();
          if (!body.stored && !body.duplicate) throw new Error('save not acknowledged');
          markSent(token, version);
        })().finally(() => pending.delete(id));
        pending.set(id, request);
      }
      try {
        await request;
        if (!cancelled) setFailed(false);
      } catch {
        if (cancelled) return;
        setFailed(true);
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
  return <p role="status">
    {locale === 'fr' ? 'Vos réponses ne sont pas encore enregistrées. ' : 'Your answers have not been saved yet. '}
    <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>
      {locale === 'fr' ? 'Réessayer' : 'Try again'}
    </button>
  </p>;
}
