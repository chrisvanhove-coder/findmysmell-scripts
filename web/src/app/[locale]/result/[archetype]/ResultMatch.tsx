'use client';

import { useEffect, useState } from 'react';
import type { ArchetypeKey } from '@/lib/archetype-colors';
import { loadAnswers } from '@/lib/answers-store';
import { match, preferencesFrom, emotionBiasFrom, type Match } from '@/lib/matching';
import Scales from './Scales';
import styles from './result.module.css';

/**
 * Подбирает флакон под ответы человека поверх серверной разметки.
 *
 * Сервер рендерит запасной вариант по флагу isMain — он статический,
 * годится для шеринга и превью ссылки. Ответы живут только в браузере,
 * поэтому уточнение происходит здесь, после загрузки.
 *
 * Оси можно подменить через адрес (?s=0&r=1&p=2&emo=cozy), чтобы смотреть
 * подбор без прохождения квиза. Разбор параметров тоже на клиенте —
 * иначе страница перестала бы собираться заранее.
 */
export default function ResultMatch({
  archetype,
  fallback,
  labels,
}: {
  archetype: ArchetypeKey;
  fallback: Match;
  labels: {
    main: string;
    alternatives: string;
    alternativesSub: string;
    discover: string;
  };
}) {
  const [picked, setPicked] = useState<Match>(fallback);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const axis = (k: string) => {
      const n = Number(sp.get(k));
      return sp.has(k) && Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
    };
    const s = axis('s'), r = axis('r'), p = axis('p');
    const emo = sp.get('emo');

    const answers = loadAnswers();
    const prefs =
      s !== null && r !== null && p !== null
        ? { sweet: s, raw: r, projection: p }
        : preferencesFrom(answers);
    const bias = emo
      ? emotionBiasFrom({ Q_EMO: `Q_EMO__${emo.toUpperCase()}` })
      : emotionBiasFrom(answers);

    if (!prefs) return; // квиз не пройден — оставляем запасной вариант
    const next = match(archetype, prefs, bias);
    // Тот же случай, что в QuizScreen: страница предгенерирована, ответы
    // только в браузере. Серверная разметка показывает запасной флакон,
    // здесь он уточняется после монтирования — это и есть смысл компонента.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setPicked(next);
  }, [archetype]);

  const { main, alternatives } = picked;

  return (
    <>
      <section className={styles.match}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.bottle} src={main.imageUrl} alt={main.name} />
        <h2 className={styles.matchName}>{main.name}</h2>
        <span className={styles.house}>{main.house}</span>
        <p className={styles.matchDesc}>{main.description}</p>
        <Scales perfume={main} />
        <a className={styles.cta} href={main.shopUrl} target="_blank" rel="noopener noreferrer">
          {labels.discover}
        </a>
      </section>

      <section className={styles.alts}>
        <span className={styles.label}>{labels.alternatives}</span>
        <span className={styles.subLabel}>{labels.alternativesSub}</span>
        <div className={styles.altGrid}>
          {alternatives.map((alt) => (
            <a
              key={alt.id}
              className={styles.alt}
              href={alt.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.altImg} src={alt.imageUrl} alt={alt.name} />
              {/* Флакон слева, всё про него — справа. */}
              <span className={styles.altBody}>
                <span className={styles.altName}>{alt.name}</span>
                <span className={styles.altHouse}>{alt.house}</span>
                <span className={styles.altDesc}>{alt.description}</span>
                <Scales perfume={alt} compact />
              </span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
