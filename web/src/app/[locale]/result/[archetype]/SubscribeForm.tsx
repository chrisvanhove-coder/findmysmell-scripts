'use client';

import { useState } from 'react';
import type { ArchetypeKey } from '@/lib/archetype-colors';
import type { Locale } from '@/lib/i18n';
import styles from './subscribe.module.css';

/**
 * «Хочешь сохранить результат?» — форма подписки со страницы результата.
 * Перенесена из блока fms-z5-email в result48.js: те же тексты, та же
 * проверка, тот же отдельный чекбокс согласия на письмо.
 *
 * Согласие на письмо — не то же самое, что согласие на исследование
 * (consent_aggregate). Человек может отказаться от исследования и всё равно
 * попросить прислать свой результат, и наоборот.
 */

// Тексты оставлены английскими: FR и RU для страницы результата ещё не
// выгружены (см. HANDOFF, раздел 9.1). Как появятся — сюда же, по локали.
const COPY = {
  title: 'Want to keep this?',
  sub: 'Your full archetype. The ingredients that chose you. One email, nothing else.',
  placeholder: 'your@email.com',
  send: 'Send my result',
  sending: 'Sending…',
  sent: 'Sent ✓',
  consent: 'I agree to receive my quiz result by email. One email only, no marketing.',
  privacy: 'Privacy policy',
  invalidEmail: 'Please enter a valid email address.',
  needConsent: 'Please check the consent box to continue.',
  success: 'Done! Check your inbox in a few minutes.',
  failure: 'Something went wrong. Please try again.',
} as const;

type State = 'idle' | 'sending' | 'done';

export default function SubscribeForm({
  locale,
  archetype,
}: {
  locale: Locale;
  archetype: ArchetypeKey;
}) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state !== 'idle') return;

    const value = email.trim();
    // Те же две проверки и в том же порядке, что в проде.
    if (!value.includes('@')) {
      setMessage({ text: COPY.invalidEmail, ok: false });
      return;
    }
    if (!consent) {
      setMessage({ text: COPY.needConsent, ok: false });
      return;
    }

    setState('sending');
    setMessage(null);

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, locale, archetype, consentEmail: true }),
      });
      if (!response.ok) throw new Error('request failed');
      setState('done');
      setMessage({ text: COPY.success, ok: true });
    } catch {
      setState('idle');
      setMessage({ text: COPY.failure, ok: false });
    }
  }

  return (
    <section className={styles.block}>
      <h2 className={styles.title}>{COPY.title}</h2>
      <p className={styles.sub}>{COPY.sub}</p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.row}>
          <input
            className={styles.input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={COPY.placeholder}
            aria-label={COPY.placeholder}
            value={email}
            disabled={state === 'done'}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className={styles.send} type="submit" disabled={state !== 'idle'}>
            {state === 'sending' ? COPY.sending : state === 'done' ? COPY.sent : COPY.send}
          </button>
        </div>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={consent}
            disabled={state === 'done'}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            {COPY.consent}{' '}
            <a href={`/${locale}/privacy-policy`} target="_blank" rel="noopener noreferrer">
              {COPY.privacy}
            </a>
            .
          </span>
        </label>

        {message && (
          <p
            className={`${styles.message} ${message.ok ? styles.ok : styles.error}`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}
