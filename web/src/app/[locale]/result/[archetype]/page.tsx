import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { ARCHETYPE_KEYS, type ArchetypeKey } from '@/lib/archetype-colors';
import { getArchetype } from '@/lib/content';
import { match } from '@/lib/matching';
import ResultMatch from './ResultMatch';
import styles from './result.module.css';

interface RouteParams {
  locale: string;
  archetype: string;
}

function parse(params: RouteParams): { locale: Locale; key: ArchetypeKey } | null {
  if (!isLocale(params.locale)) return null;
  const key = ARCHETYPE_KEYS.find((a) => a.toLowerCase() === params.archetype.toLowerCase());
  if (!key) return null;
  return { locale: params.locale, key };
}

// Каждый результат — свой адрес, собранный заранее. Это то, что уходит
// в мессенджер при шеринге; подбор под конкретного человека доводится
// на клиенте, потому что его ответы есть только в его браузере.
export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    ARCHETYPE_KEYS.map((key) => ({ locale, archetype: key.toLowerCase() })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const parsed = parse(await params);
  if (!parsed) return {};
  const a = getArchetype(parsed.locale, parsed.key);
  return {
    title: `${a.you} ${a.identity} — Find My Smell`,
    description: a.descriptor,
  };
}

export default async function ResultPage({ params }: { params: Promise<RouteParams> }) {
  const parsed = parse(await params);
  if (!parsed) notFound();

  const a = getArchetype(parsed.locale, parsed.key);
  const fallback = match(parsed.key, null);
  if (!fallback) notFound();

  const [pullQuote, ...rest] = a.desc;
  const closer = rest.length > 1 ? rest[rest.length - 1] : null;
  const body = closer ? rest.slice(0, -1) : rest;

  return (
    <main className={styles.page} data-archetype={parsed.key}>
      <header className={styles.hero}>
        <span className={styles.you}>{a.you}</span>
        <h1 className={styles.identity}>{a.identity}</h1>
        <span className={styles.descriptor}>{a.descriptor}</span>
      </header>

      <section className={styles.personality}>
        <div className={styles.prose}>
          <p className={styles.para}>{pullQuote}</p>
          {body.map((p, i) => (
            <p key={i} className={styles.para}>
              {p}
            </p>
          ))}
          {closer && <p className={`${styles.para} ${styles.closer}`}>{closer}</p>}
        </div>
      </section>

      <section className={styles.ingredients}>
        <span className={styles.label}>Ingredients worth discovering</span>
        <div className={styles.ingredientList}>
          {a.ingredients.map((ing) => (
            <article key={ing.name} className={styles.ingredient}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.ingredientImg} src={ing.img} alt={ing.name} />
              <span className={styles.ingredientName}>{ing.name}</span>
              <p className={styles.ingredientDesc}>{ing.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <ResultMatch
        archetype={parsed.key}
        fallback={fallback}
        labels={{
          main: 'Your scent',
          alternatives: 'Also worth trying',
          discover: 'Discover',
        }}
      />
    </main>
  );
}
