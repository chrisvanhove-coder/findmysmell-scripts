'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Locale } from '@/lib/i18n';
import {
  type Question, nextQuestion, stepOf, toSlug, TOTAL_STEPS,
} from '@/lib/quiz';
import {
  loadAnswers, saveAnswer, loadOpenText, saveOpenText, saveResearchConsent, runToken,
} from '@/lib/answers-store';
import { reportFunnel } from '@/lib/funnel';
import { isCountryQuestion } from '@/data/countries';
import CountrySearch from './CountrySearch';
import { MECHANICS } from '@/components/quiz/mechanics';
import AnswerBackdrop, { photosFor } from '@/components/quiz/AnswerBackdrop';
import { resolve } from '@/lib/scoring';
import styles from './quiz.module.css';

/**
 * Есть ли у устройства наведение. От этого зависит, как показывать
 * фотографии под вариантами: мышью — по наведению, пальцем — первым
 * касанием, а выбор уже вторым.
 *
 * useSyncExternalStore, а не useState в useEffect: экран предгенерирован,
 * и первый снимок обязан совпасть с серверным, иначе гидратация ругается.
 */
const hoverSubscribe = (cb: () => void) => {
  const mq = window.matchMedia('(hover: none)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const noHoverNow = () => window.matchMedia('(hover: none)').matches;
/* На сервере считаем, что наведение есть: так разметка совпадает с
   настольным случаем, а телефон уточнит это сразу после гидратации. */
const noHoverOnServer = () => false;

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

  /* Фотографии под варианты — пока только на Q_YOURSELF. Если их у
     вопроса нет, всё ниже не работает и экран остаётся обычным. */
  const photos = photosFor(question.id);
  const noHover = useSyncExternalStore(hoverSubscribe, noHoverNow, noHoverOnServer);
  // На какой вариант смотрят: наведение мышью, фокус с клавиатуры или
  // первое касание пальцем.
  const [looking, setLooking] = useState<string | null>(null);
  /* Отдельно от looking: какой вариант человек действительно тронул
     пальцем. Нужно потому, что при касании браузер сначала даёт кнопке
     фокус и лишь потом click — а фокус тоже показывает снимок. Считать
     первым касанием сам факт «на этот вариант смотрят» нельзя: тогда
     на телефоне первый же тап сразу выбирал, и фотографию никто не
     видел. Проверено эмуляцией касаний. */
  const [tapped, setTapped] = useState<string | null>(null);
  /* Гашение с задержкой 200 мс — как в проде. Без неё при переходе
     мышью с одного варианта на соседний фон успевал мигнуть в ноль. */
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function lookAt(code: string) {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setLooking(code);
  }
  function stopLooking() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setLooking(null), 200);
  }
  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  // Показываем ранее выбранный ответ, если человек вернулся назад.
  // Экран предгенерирован, ответы лежат в storage — прочитать их можно
  // только после монтирования, инициализатор useState сломал бы гидратацию.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Шаг показан. Пара 'view'/'answer' на каждый вопрос и даёт воронку:
  // разница между ними — это те, кто дошёл до вопроса и не ответил.
  useEffect(() => {
    reportFunnel(locale, runToken(), { step: question.id, event: 'view' });
  }, [question.id, locale]);

  function go(next: string) {
    if (next !== 'RESULT') {
      router.push(`/${locale}/quiz/${toSlug(next)}`);
      return;
    }
    const { winner } = resolve(loadAnswers());
    router.push(`/${locale}/result/${winner.toLowerCase()}`);
  }

  function choose(code: string) {
    /* Вопрос с фотографиями на устройстве без наведения: первое касание
       показывает снимок места, второе выбирает. Так это и было в проде —
       иначе фотографию на телефоне не увидел бы никто. Вариант без
       снимка («It changes») выбирается с первого касания: показывать
       там нечего, и лишний тап был бы просто препятствием. */
    if (photos && noHover && photos[code] && tapped !== code) {
      setTapped(code);
      setLooking(code);
      return;
    }
    setChosen(code);
    saveAnswer(question.id, code);
    reportFunnel(locale, runToken(), { step: question.id, event: 'answer', answerCode: code });
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
    // Без answerCode: текст открытого ответа личный, он живёт только
    // в submissions под своим согласием и в статистику не попадает.
    reportFunnel(locale, runToken(), { step: question.id, event: 'answer' });
    go(nextQuestion(question.id, ''));
  }

  const step = stepOf(question.id);
  const pct = Math.round((step / TOTAL_STEPS) * 100);

  /* У вопроса может быть своя механика — барабан, шары, ползунок. Тогда
     она занимает экран целиком вместо списка кнопок, а сохранение,
     воронка и переход остаются здесь (см. components/quiz/mechanics.ts). */
  // Берём из модульной таблицы напрямую: ссылка на компонент стабильна
  // между перерисовками, а вызов функции здесь линтер справедливо
  // принял бы за создание компонента на каждом рендере.
  const Mechanic = MECHANICS[question.id];
  if (Mechanic) {
    return (
      <main className={styles.screen}>
        {/* Своя плашка и свой слой: механика закреплена на весь экран, и
            обычная кнопка «назад» оказывалась под ней — не нажималась. */}
        <button
          type="button"
          className={`${styles.back} ${styles.backOverMechanic}`}
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <Mechanic onChoose={choose} />
        <div className={styles.progress}>
          <span className={styles.count}>{pct}%</span>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      {/* Фотография места за текстом — пока только на Q_YOURSELF. */}
      {photos && <AnswerBackdrop map={photos} active={looking} />}

      <button type="button" className={styles.back} onClick={() => router.back()}>
        ← Back
      </button>

      <div className={styles.inner}>
        {/* На закрывающем экране счётчика нет — как в проде: прогресс
            доходит до 100% на предыдущем вопросе, а здесь уже не номер. */}
        {step > 0 && (
          <span className={styles.eyebrow}>
            Question {step} of {TOTAL_STEPS}
          </span>
        )}
        <h1 className={styles.question}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {isCountryQuestion(question.id) ? (
          <CountrySearch
            value={chosen}
            onPick={(country) => {
              setChosen(country);
              saveAnswer(question.id, country);
              // Страну в статистику не пишем: это введённое значение, а не
              // код варианта. Достаточно знать, что на шаге ответили.
              reportFunnel(locale, runToken(), { step: question.id, event: 'answer' });
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
              placeholder="A smell you remember, one you wish you could find again, a place it takes you back to."
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
          <>
            <ul className={styles.options}>
              {question.answers.map((a) => (
                <li key={a.code}>
                  <button
                    type="button"
                    id={`answer-${a.code}`}
                    className={
                      // Приглушаем остальные, пока смотрят на один: так
                      // было в проде и так читается тот, что выбирают.
                      looking && looking !== a.code
                        ? `${styles.option} ${styles.dimmed}`
                        : styles.option
                    }
                    aria-pressed={chosen === a.code}
                    onClick={() => choose(a.code)}
                    {...(photos
                      ? {
                        onMouseEnter: () => lookAt(a.code),
                        onMouseLeave: stopLooking,
                        // Фокус тоже показывает снимок: в проде человек,
                        // идущий табом, не видел фотографий вовсе.
                        onFocus: () => lookAt(a.code),
                        onBlur: stopLooking,
                      }
                      : {})}
                  >
                    {a.label}
                    {a.hint && <span className={styles.hint}>{a.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>

            {/* Подсказка про второе касание. В проде первый тап словно
                ничего не делал, и об этом нигде не было сказано. */}
            {photos && noHover && tapped && photos[tapped] && (
              <p className={styles.tapAgain}>Tap again to choose</p>
            )}
          </>
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

