import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { getHomeCopy, numberWord } from '@/lib/home';
import { TOTAL_STEPS, FIRST_QUESTION, toSlug } from '@/lib/quiz';
import { cld } from '@/lib/cloudinary';
import { previewTags } from '@/lib/site';
import styles from './home.module.css';

/**
 * Главная. ПЕРЕНЕСЕНА С ЖИВОГО САЙТА ОДИН В ОДИН.
 *
 * Заказчица, открыв предыдущую версию: «the start page is not what my
 * page is now in real time. Everything had to be exactly like my website
 * live now». Она права: у меня стояла прошлая главная (три колонки,
 * «The fragrance industry spends billions...»), а она её с тех пор
 * заменила. Источник правды здесь — `webflow/live-pages/home.footer.html`
 * (разметка и текст) и `home.head.html` (цвета и кегли).
 *
 * Раскладка живого сайта: фото-герой на 78vh, текст прижат к низу;
 * терракотовый заголовок Fraunces 900, длинный абзац капслоком с
 * золотыми выделениями, золотая кнопка. Ниже — кремовый блок
 * «How it works»: три шага в строку и тёмная кнопка.
 *
 * ЧТО СДЕЛАНО ИНАЧЕ, И ПОЧЕМУ.
 *
 * 1. Фото отдаётся ужатым. На живом сайте это исходник 2798×1868 на
 *    2 413 988 байт — 2.4 МБ на первом же экране, до всего остального.
 *    Замер explicit API: 505 237 байт на широком экране и 266 923 на
 *    телефоне вертикальным кропом. Приём не меняется, ждать меньше.
 * 2. Кнопки — ссылки на внутренний адрес квиза, а не абсолютный
 *    `https://www.findmysmell.com/q-gender`: иначе с Railway-адреса
 *    кнопка уводила бы на старый сайт, и переезд нельзя было бы
 *    проверить.
 * 3. У фото есть alt. В проде `alt=""`, но это не декорация: фотография
 *    и есть первый экран.
 * 4. Мёртвый скрипт прода не переносил: он ищет узлы `fms-s1` и
 *    `fms-hint`, которых в разметке нет, и сразу выходит.
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
  // Число вопросов подставляется из TOTAL_STEPS: на живом сайте оно
  // в трёх местах было разным, и разойтись здесь нечем.
  const description = copy.metaDescription.replace('{N}', String(TOTAL_STEPS));
  return {
    title: copy.metaTitle,
    description,
    alternates: { canonical: `/${locale}` },
    /* Заголовок и описание карточки — те же, что у страницы. В проде в
       og:description лежит прошлая версия текста, которую заказчица уже
       заменила на самой главной; копировать её незачем. */
    ...previewTags({
      title: copy.metaTitle,
      description,
      path: `/${locale}`,
      locale,
      image: cld(copy.hero.image, 'og'),
    }),
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;

  const copy = getHomeCopy(locale);
  const quizHref = `/${locale}/quiz/${toSlug(FIRST_QUESTION.id)}`;
  const [first, second, third] = copy.hero.headline;

  return (
    <div className={styles.page} data-home="">
      <section className={styles.hero}>
        {/* Одно фото, два размера: вертикальный кроп на телефон. */}
        <picture>
          <source
            media="(max-width: 700px)"
            srcSet={cld(copy.hero.image, 'homeHeroMobile')}
          />
          <img
            className={styles.heroBg}
            src={cld(copy.hero.image, 'homeHero')}
            alt="Textured wall in warm light"
            data-hero-photo=""
            fetchPriority="high"
          />
        </picture>
        <div className={styles.scrim} />
        <div className={styles.tint} />

        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            {first}
            <br />
            {second}
            {/* Перенос перед последним словом — только на телефоне,
                как на живом сайте. */}
            <br className={styles.brMobile} />
            {third}
          </h1>

          <p className={styles.heroCopy}>
            {copy.hero.copy.map((part, i) => (
              <span key={i} className={part.accent ? styles.emphasis : undefined}>
                {part.text}
              </span>
            ))}
          </p>

          <Link className={styles.heroBegin} href={quizHref}>
            {copy.begin} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className={styles.how}>
        <span className={`${styles.kicker} ${styles.howKicker}`}>{copy.howLabel}</span>

        <ol className={styles.steps}>
          {copy.steps.map((step) => (
            <li key={step.num}>
              <div className={styles.stepNum}>{step.num}</div>
              <span className={styles.stepLabel}>{step.label}</span>
              {/* {N} → «Seventeen»: слово живого сайта, но число из
                  TOTAL_STEPS, чтобы текст не разошёлся с квизом. */}
              <p className={styles.stepDesc}>
                {step.desc.replace('{N}', numberWord(TOTAL_STEPS))}
              </p>
            </li>
          ))}
        </ol>

        <Link className={styles.howBegin} href={quizHref}>
          {copy.begin} <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
