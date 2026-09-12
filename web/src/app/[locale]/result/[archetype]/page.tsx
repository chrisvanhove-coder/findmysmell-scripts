import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { ARCHETYPE_KEYS, type ArchetypeKey } from '@/lib/archetype-colors';
import { getArchetype } from '@/lib/content';
import { match } from '@/lib/matching';
import Ingredients from './Ingredients';
import ScentDna from './ScentDna';
import ResultMatch from './ResultMatch';
import RecordSubmission from './RecordSubmission';
import SubscribeForm from './SubscribeForm';
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

// Подписи зон как в проде (result48.js), не свои. `main` — та самая
// большая строка над флаконом; она живёт внизу светлой зоны и наполовину
// уходит под тёмную, поэтому отдаётся в Ingredients, а не в ResultMatch.
const LABELS = {
  main: 'your scent',
  alternatives: 'Also consider',
  alternativesSub: 'Same energy, different character',
  discover: 'Discover →',
};

export default async function ResultPage({ params }: { params: Promise<RouteParams> }) {
  const parsed = parse(await params);
  if (!parsed) notFound();

  const a = getArchetype(parsed.locale, parsed.key);
  const fallback = match(parsed.key, null);
  if (!fallback) notFound();

  // Первый абзац в проде — не начало текста, а фраза над диаграммой ДНК
  // (z1 в result48.js). Поэтому он уходит в ScentDna, а не в блок текста.
  const [pullQuote, ...rest] = a.desc;
  const closer = rest.length > 1 ? rest[rest.length - 1] : null;
  const body = closer ? rest.slice(0, -1) : rest;

  return (
    <main className={styles.page} data-archetype={parsed.key}>
      {/* Старого героя («You are / politely unreachable») здесь нет намеренно:
          заказчик убрала его со всех архетипов. Результат начинается сразу
          со Scent DNA. Тексты you/identity/descriptor остались в данных —
          из них собирается заголовок вкладки и превью ссылки. */}
      <ScentDna archetype={parsed.key} quote={pullQuote} />

      <section className={styles.personality}>
        <div className={styles.prose}>
          {body.map((p, i) => (
            <p key={i} className={styles.para}>
              {p}
            </p>
          ))}
          {closer && <p className={`${styles.para} ${styles.closer}`}>{closer}</p>}
        </div>
      </section>

      <Ingredients ingredients={a.ingredients} band={LABELS.main} />

      <ResultMatch
        archetype={parsed.key}
        fallback={fallback}
        labels={LABELS}
      />

      <SubscribeForm locale={parsed.locale} archetype={parsed.key} />

      {/* Ничего не рисует: пишет прохождение в базу один раз за проход. */}
      <RecordSubmission locale={parsed.locale} />
    </main>
  );
}
