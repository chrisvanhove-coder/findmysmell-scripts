import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES } from '@/lib/i18n';
import { getLegalNotice } from '@/lib/legal';
import styles from '../privacy-policy/privacy.module.css';

/**
 * Mentions légales. Во Франции это обязательная страница (LCEN): кто
 * издаёт сайт, кто отвечает за публикацию, кто его хостит.
 *
 * Вёрстка та же, что у политики приватности, — отсюда общий модуль стилей.
 */

interface RouteParams {
  locale: string;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const doc = getLegalNotice(locale);
  return {
    title: `${doc.title} — Find My Smell`,
    // Юридическую страницу незачем показывать в поиске отдельно от сайта.
    robots: { index: false, follow: true },
  };
}

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const doc = getLegalNotice(locale);

  return (
    <main className={styles.page}>
      <article className={styles.doc}>
        <h1 className={styles.title}>{doc.title}</h1>
        <p className={styles.updated}>{doc.updated}</p>

        {doc.sections.map((section) => (
          <section key={section.heading} className={styles.section}>
            <h2 className={styles.heading}>{section.heading}</h2>
            {section.blocks.map((block, i) => {
              if (block.sub) {
                return (
                  <h3 key={i} className={styles.sub}>
                    {block.sub}
                  </h3>
                );
              }
              if (block.list) {
                return (
                  <ul key={i} className={styles.list}>
                    {block.list.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className={styles.para}>
                  {block.p}
                </p>
              );
            })}
          </section>
        ))}
      </article>
    </main>
  );
}
