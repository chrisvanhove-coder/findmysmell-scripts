'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import {
  type Question, nextQuestion, stepOf, toSlug, TOTAL_STEPS,
} from '@/lib/quiz';
import {
  loadAnswers, saveAnswer, loadOpenText, saveOpenText, saveResearchConsent,
} from '@/lib/answers-store';
import { isCountryQuestion } from '@/data/countries';
import CountrySearch from './CountrySearch';
import { resolve } from '@/lib/scoring';
import styles from './quiz.module.css';

/**
 * Экран одного вопроса. Переходы клиентские, без перезагрузки страницы:
 * раньше каждый из 24 вопросов был отдельной страницей Webflow и на каждый
 * ответ браузер грузил документ заново.
 */
export default function QuizScreen({
  locale,
  question,
  title,
  subtitle,
}: {
  locale: Locale;
  question: Question;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(null);
  const [openText, setOpenText] = useState('');

  // Показываем ранее выбранный ответ, если человек вернулся назад.
  useEffect(() => {
    setChosen(loadAnswers()[question.id] ?? null);
    if (question.openText) setOpenText(loadOpenText());
  }, [question.id, question.openText]);

  // Следующий экран заранее подгружаем, чтобы переход был мгновенным.
  useEffect(() => {
    // У вопросов с поиском по странам вариантов в данных нет — следующий шаг
    // у них всегда один, поэтому подгружаем его напрямую.
    const codes = question.answers.length
      ? question.answers.slice(0, 8).map((a) => a.code)
      : [''];
    for (const code of codes) {
      const next = nextQuestion(question.id, code);
      if (next === 'RESULT') continue;
      router.prefetch(`/${locale}/quiz/${toSlug(next)}`);
    }
  }, [question, locale, router]);

  function go(next: string) {
    if (next !== 'RESULT') {
      router.push(`/${locale}/quiz/${toSlug(next)}`);
      return;
    }
    const { winner } = resolve(loadAnswers());
    router.push(`/${locale}/result/${winner.toLowerCase()}`);
  }

  function choose(code: string) {
    setChosen(code);
    saveAnswer(question.id, code);
    go(nextQuestion(question.id, code));
  }

  /**
   * Открытый вопрос закрывает квиз. Две кнопки — это не «отправить» и
   * «пропустить», а согласие на использование анонимных ответов
   * в исследовании. Ответ человека сохраняется в обоих случаях.
   */
  function finish(consent: boolean) {
    saveOpenText(openText.trim());
    saveResearchConsent(consent);
    go(nextQuestion(question.id, ''));
  }

  const step = stepOf(question.id);
  const pct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <main className={styles.screen}>
      <button type="button" className={styles.back} onClick={() => router.back()}>
        ← Back
      </button>

      <div className={styles.inner}>
        <span className={styles.eyebrow}>
          Question {step} of {TOTAL_STEPS}
        </span>
        <h1 className={styles.question}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {isCountryQuestion(question.id) ? (
          <CountrySearch
            value={chosen}
            onPick={(country) => {
              setChosen(country);
              saveAnswer(question.id, country);
              go(nextQuestion(question.id, country));
            }}
          />
        ) : question.openText ? (
          <>
            <textarea
              id="quiz-open-answer"
              className={styles.textarea}
              value={openText}
              onChange={(e) => {
                setOpenText(e.target.value);
                saveOpenText(e.target.value);
              }}
              placeholder="Anything you want to add — a memory, a smell, a place."
            />
            <div className={styles.consent}>
              <p className={styles.consentText}>
                You just finished the quiz — none of it asked for your name or email.
                Can we include your anonymous answers in fragrance research?
                No email or identifying info, ever.
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => finish(true)}>
                  Agree &amp; continue
                </button>
                <button type="button" className={styles.secondary} onClick={() => finish(false)}>
                  Disagree &amp; continue
                </button>
              </div>
            </div>
          </>
        ) : (
          <ul className={styles.options}>
            {question.answers.map((a) => (
              <li key={a.code}>
                <button
                  type="button"
                  id={`answer-${a.code}`}
                  className={styles.option}
                  aria-pressed={chosen === a.code}
                  onClick={() => choose(a.code)}
                >
                  {a.label}
                  {a.hint && <span className={styles.hint}>{a.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.progress}>
        <span className={styles.count}>{pct}%</span>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </main>
  );
}

