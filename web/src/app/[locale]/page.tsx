import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { getHomeCopy, splitAccent } from '@/lib/home';
import { FIRST_QUESTION, toSlug } from '@/lib/quiz';
import styles from './home.module.css';
import { cld } from '@/lib/cloudinary';

/**
 * Главная. Перенесена с продовой страницы Webflow, где вся вёрстка и текст
 * лежали в одном HTML-эмбеде.
 *
 * Это не только вход на сайт: сюда попадает каждый, кто пришёл по
 * шеринговой карточке — на ней напечатан домен, и это единственный путь
 * назад с картинки. Поэтому единственное действие здесь — начать тест,
 * а не смотреть чужие результаты. До этой правки на месте главной стоял
 * технический каркас со ссылками на все семь результатов: ровно то, чего
 * пришедший по карточке видеть не должен.
 *
 * Раскладка прода: на широком экране три колонки в одном экране без
 * прокрутки, на телефоне три экрана подряд.
 */

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getHomeCopy(locale);
  return {
    title: 'Find My Smell — Perfume Personality Quiz',
    description: copy.tagline,
  };
}

/** Условная длина слова в знаках: пробел считается за половину. */
function width(word: string): number {
  return [...word].reduce((n, ch) => n + (ch === ' ' ? 0.5 : 1), 0);
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const copy = getHomeCopy(locale);
  const quizHref = `/${locale}/quiz/${toSlug(FIRST_QUESTION.id)}`;

  const [bodyBefore, bodyAccent, bodyAfter] = splitAccent(copy.howBody, copy.howBodyAccent);
  const [noteBefore, noteAccent, noteAfter] = splitAccent(copy.howNote, copy.howNoteAccent);

  const pitch = copy.pitch.map((line, i) => (
    <span
      key={i}
      className={[styles.pitchLine, line.accent ? styles.gold : '', line.gap ? styles.gap : '']
        .filter(Boolean)
        .join(' ')}
    >
      {line.text}
    </span>
  ));

  const how = (
    <>
      <span className={styles.howLabel}>{copy.howLabel}</span>
      <p className={styles.howBody}>
        {bodyBefore}
        <em className={styles.em}>{bodyAccent}</em>
        {bodyAfter}
      </p>
      <p className={styles.howNote}>
        {noteBefore}
        <em className={styles.emQuiet}>{noteAccent}</em>
        {noteAfter}
      </p>
    </>
  );

  const begin = (
    <>
      <Link className={styles.begin} href={quizHref}>
        {copy.begin}
      </Link>
      <p className={styles.consent}>
        {copy.consent}{' '}
        <Link href={`/${locale}/privacy-policy`}>{copy.consentLink}</Link>
      </p>
    </>
  );

  return (
    <main className={styles.page}>
      {/* ── широкий экран: три колонки ── */}
      <div className={styles.desktop}>
        <div className={styles.left}>
          <h1 className={styles.title}>
            {copy.title.map((word) => (
              <span key={word} className={styles.titleWord}>
                {word}
              </span>
            ))}
          </h1>
          <p className={styles.tagline}>{copy.tagline}</p>
          <div className={styles.sidePhotos}>
            {copy.images.side.map((photo) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={photo.src}
                className={styles.sidePhoto}
                src={cld(photo.src, 'homeSide')}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>

        <div className={styles.mid}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.midImg} src={cld(copy.images.hero, 'homeFull')} alt="" />
          <div className={styles.midShade} />
          <div className={styles.midCopy}>{pitch}</div>
        </div>

        <div className={styles.right}>
          {how}
          <div className={styles.rightFoot}>{begin}</div>
        </div>
      </div>

      {/* ── телефон: три экрана подряд ── */}
      <div className={styles.mobile}>
        <section className={styles.mTitleScreen}>
          <h1 className={styles.mTitle}>
            {copy.title.map((word, i) => (
              <span
                key={word}
                className={`${styles.mWord} ${i === copy.title.length - 1 ? styles.mWordFade : ''}`}
                // Кегль каждого слова считается от его длины, чтобы строка
                // шла во всю ширину. В проде для этого стояла выключка по
                // ширине, но она растягивает только пробелы: «UNIVERSAL»
                // пробелов не имеет и просто вылезало за край экрана.
                // Пробел уже узкого символа, поэтому считается за половину.
                style={{ '--chars': width(word) } as React.CSSProperties}
              >
                {word}
              </span>
            ))}
          </h1>
          <p className={styles.mTagline}>{copy.tagline}</p>
          <div className={styles.hint} aria-hidden="true">
            <span>{copy.scrollHint}</span>
            <span className={styles.arrow} />
          </div>
        </section>

        <section className={styles.mPitch}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.midImg} src={cld(copy.images.heroMobile, 'homeFullMobile')} alt="" />
          <div className={styles.midShade} />
          <div className={styles.mPitchCopy}>{pitch}</div>
        </section>

        <section className={styles.mHow}>
          {how}
          {begin}
        </section>
      </div>
    </main>
  );
}
