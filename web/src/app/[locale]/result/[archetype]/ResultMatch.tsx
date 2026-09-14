'use client';

import { useEffect, useState } from 'react';
import type { ArchetypeKey } from '@/lib/archetype-colors';
import { type Match } from '@/lib/matching';
import { pickFromBrowser } from '@/lib/picked-client';
import Scales from './Scales';
import styles from './result.module.css';
import { cld } from '@/lib/cloudinary';

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
    const next = pickFromBrowser(archetype);
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
        <img
          className={styles.bottle}
          src={cld(main.imageUrl, 'bottleMain')}
          alt={main.name}
          decoding="async"
        />
        {/* Название уже содержит бренд там, где он есть («Cedrus by Chloé»).
            Вторая строка под ним показывала поле house, а в нём лежит слаг
            из Webflow — и он не просто некрасивый: у семи позиций он
            называет другой парфюм, чем поле name, у четырёх — чужой дом.
            Показывать его значило дезинформировать. Подробности в 9.7. */}
        <h2 className={styles.matchName}>{main.name}</h2>
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
              <img
                className={styles.altImg}
                src={cld(alt.imageUrl, 'bottleAlt')}
                alt={alt.name}
                loading="lazy"
                decoding="async"
              />
              {/* Флакон слева, всё про него — справа. */}
              <span className={styles.altBody}>
                <span className={styles.altName}>{alt.name}</span>
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
