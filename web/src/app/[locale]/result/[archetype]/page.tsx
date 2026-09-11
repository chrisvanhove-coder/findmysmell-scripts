import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { ARCHETYPE_KEYS, type ArchetypeKey } from '@/lib/archetype-colors';
import { getArchetype } from '@/lib/content';
import { match, type Preferences } from '@/lib/matching';
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

// Каждый результат — отдельный адрес. Это даёт серверный рендер под шеринг
// и предпросмотр любого архетипа без прохождения квиза.
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

/** Оси можно задать в адресе (?s=0&r=1&p=2), чтобы смотреть подбор без квиза. */
function previewPreferences(sp: Record<string, string | string[] | undefined>): Preferences | null {
  const axis = (v: string | string[] | undefined) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
  };
  const sweet = axis(sp.s), raw = axis(sp.r), projection = axis(sp.p);
  if (sweet === null || raw === null || projection === null) return null;
  return { sweet, raw, projection };
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = parse(await params);
  if (!parsed) notFound();

  const a = getArchetype(parsed.locale, parsed.key);
  const picked = match(parsed.key, previewPreferences(await searchParams));
  if (!picked) notFound();
  const { main, alternatives } = picked;
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

      <section className={styles.match}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.bottle} src={main.imageUrl} alt={main.name} />
        <h2 className={styles.matchName}>{main.name}</h2>
        <span className={styles.house}>{main.house}</span>
        <p className={styles.matchDesc}>{main.description}</p>
        <a className={styles.cta} href={main.shopUrl} target="_blank" rel="noopener noreferrer">
          Discover
        </a>
      </section>

      <section className={styles.alts}>
        <span className={styles.label}>Also worth trying</span>
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
              <span className={styles.altName}>{alt.name}</span>
              <span className={styles.altHouse}>{alt.house}</span>
              <p className={styles.altDesc}>{alt.description}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
