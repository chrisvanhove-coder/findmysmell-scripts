import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { ARCHETYPE_KEYS, type ArchetypeKey } from '@/lib/archetype-colors';
import { getArchetype } from '@/lib/content';
import { match } from '@/lib/matching';
import Ingredients from './Ingredients';
import ScentDna from './ScentDna';
import Flashlight from '@/components/Flashlight';
import ShareCard from '@/components/ShareCard';
import { parsePunch } from '@/lib/share-card';
import { cld } from '@/lib/cloudinary';
import { previewTags } from '@/lib/site';
import { HOME_HERO } from '@/lib/home';
import { t } from '@/lib/copy';
import shareCardsEn from '@/data/share-cards.en.json';
import shareCardsFr from '@/data/share-cards.fr.json';
import punchLinesEn from '@/data/punch-lines.en.json';
import punchLinesFr from '@/data/punch-lines.fr.json';
import tagLinesEn from '@/data/tag-lines.en.json';
import ResultMatch from './ResultMatch';
import RecordSubmission from './RecordSubmission';
import ResultGate from '@/components/ResultGate';
import SubscribeForm from './SubscribeForm';
import VinylPlayer from './VinylPlayer';
import styles from './result.module.css';

/**
 * Данные шеринговой карточки по локали.
 *
 * ФРАНЦУЗСКИЙ ЕСТЬ, И ОН НАСТОЯЩИЙ. `share-cards.fr.json` и
 * `punch-lines.fr.json` собраны из живого французского сайта: страница
 * `/fr/result` в Webflow подключает `result-shared-fr.js` из ЭТОГО
 * репозитория через jsDelivr, то есть файл в репозитории и есть прод.
 * Тексты оттуда взяты дословно, ничего не переведено мной.
 *
 * ЧЕГО ВО ФРАНЦУЗСКОМ НЕТ — СТРОКИ «@tag the friend who…». На живом
 * французском сайте карточка другого, более раннего поколения: у неё в
 * подвале «découvrez le vôtre sur · findmysmell.com», а строки @tag нет
 * вовсе (в `result-shared-fr.js` нет ни FMS_TAG_LINES, ни панчлайнов —
 * они появились только в английском `result-shared15.js`). Придумывать
 * их за заказчицу нельзя: это её текст и, по её же словам, главный
 * механизм шеринга. Поэтому на французской карточке строка @tag пустая —
 * КАК ТОЛЬКО ОНА НАПИШЕТ СЕМЬ ФРАНЦУЗСКИХ СТРОК, сюда добавляется
 * `tag-lines.fr.json`, и больше ничего менять не нужно.
 *
 * КЕГЛИ ФРАНЦУЗСКОГО ПАНЧЛАЙНА ИЗМЕРЕНЫ, А НЕ ПОДОБРАНЫ НА ГЛАЗ:
 * подобраны наибольшие, при которых самая длинная строка влезает в
 * ширину карточки, а блок — в полосу до бутылки. Английские кегли
 * заказчица набирала построчно и по смыслу (у CEO слово «and» крупнее
 * всех), французские так не набирались — это задача дизайнерского
 * прохода, а не порта.
 */
const CARD_DATA: Record<Locale, {
  cards: Record<string, unknown>;
  punch: Record<string, unknown>;
  tags: Record<string, string>;
}> = {
  en: { cards: shareCardsEn, punch: punchLinesEn, tags: tagLinesEn },
  fr: { cards: shareCardsFr, punch: punchLinesFr, tags: {} },
  ru: { cards: shareCardsEn, punch: punchLinesEn, tags: tagLinesEn },
};

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

  /* ЗАГОЛОВОК — ПАНЧЛАЙН. И во вкладке, и в карточке ссылки: «Да, замени
     панчлайном везде». Это то же правило, по которому сделана
     шеринговая карточка: «Панчлайн главным, @tag наверх, имя архетипа
     не надо потому что это внутреннее имя». Плюс «You are politely
     unreachable» она просила стереть со всех архетипов — на странице
     этого героя нет, и в заголовке ему тоже места нет.

     Запасной вариант (`you` + `identity`) остаётся на случай, если у
     архетипа почему-то не окажется панчлайна: пустой заголовок хуже
     старого. Сами тексты живут в данных и больше нигде не показываются. */
  const punchLine = parsePunch(
    (CARD_DATA[parsed.locale].punch as Record<string, unknown>)[parsed.key])
    .map(([text]) => text)
    .join(' ');
  const headline = punchLine || `${a.you} ${a.identity}`;
  /* Во вкладке — с названием сайта, в карточке ссылки — без: там название
     несёт отдельный тег og:site_name, и дублировать его незачем. */
  const title = `${headline} — Find My Smell`;

  /* Ссылкой на результат делятся чаще всего — значит она обязана
     разворачиваться карточкой. Картинка здесь общая, фирменная: у
     архетипов своих фотографий нет, а шеринговая карточка рисуется на
     canvas в браузере и серверу недоступна. */
  return {
    title,
    description: a.descriptor,
    alternates: { canonical: `/${parsed.locale}/result/${parsed.key.toLowerCase()}` },
    /* Из выдачи убрано вместе с закрытием страницы: результат виден только
       прошедшему квиз (components/ResultGate.tsx), и человек, пришедший на
       неё из поиска, увидел бы пустоту и уехал на вопросы. Ссылку-превью
       теги ниже по-прежнему собирают: ими пользуются мессенджеры, когда
       человек делится своим результатом сам. */
    robots: { index: false, follow: true },
    ...previewTags({
      title: headline,
      description: a.descriptor,
      path: `/${parsed.locale}/result/${parsed.key.toLowerCase()}`,
      locale: parsed.locale,
      image: cld(HOME_HERO, 'og'),
    }),
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

/** Те же подписи на языке страницы; английские остаются запасными. */
const labelsFor = (locale: Locale) => ({
  main: t(locale, 'result.main', LABELS.main),
  alternatives: t(locale, 'result.alternatives', LABELS.alternatives),
  alternativesSub: t(locale, 'result.alternativesSub', LABELS.alternativesSub),
  discover: t(locale, 'result.discover', LABELS.discover),
});

export default async function ResultPage({ params }: { params: Promise<RouteParams> }) {
  const parsed = parse(await params);
  if (!parsed) notFound();

  const a = getArchetype(parsed.locale, parsed.key);
  const fallback = match(parsed.key, null);
  if (!fallback) notFound();

  // Первый абзац в проде — не начало текста, а фраза над диаграммой ДНК
  // (z1 в result48.js). Поэтому он уходит в ScentDna, а не в блок текста.
  const labels = labelsFor(parsed.locale);

  const [pullQuote, ...rest] = a.desc;
  const closer = rest.length > 1 ? rest[rest.length - 1] : null;
  const body = closer ? rest.slice(0, -1) : rest;

  /* Данные карточки по локали (см. CARD_DATA). Русского контента нет
     нигде — там, как и на всей странице, английский. */
  const data = CARD_DATA[parsed.locale];
  const card = (data.cards as Record<string, typeof shareCardsEn.CEO>)[parsed.key];
  const punch = parsePunch((data.punch as Record<string, unknown>)[parsed.key]);
  const tag = (data.tags as Record<string, string>)[parsed.key] ?? '';

  return (
    <main className={styles.page} data-archetype={parsed.key}>
      {/* Всё содержимое — внутри пропуска: без пройденного квиза оно не
          отрисуется ни в браузере, ни в HTML, который отдаёт сервер. */}
      <ResultGate locale={parsed.locale} archetype={parsed.key}>
      {/* Старого героя («You are / politely unreachable») здесь нет намеренно:
          заказчик убрала его со всех архетипов. Результат начинается сразу
          со Scent DNA. Тексты you/identity/descriptor остались в данных —
          из них собирается заголовок вкладки и превью ссылки. */}
      <ScentDna locale={parsed.locale} archetype={parsed.key} quote={pullQuote} />

      {/* Фонарик по штукатурке — как в проде: текстура проявляется под
          курсором и тянется следом. Блок текста внутри, поверх слоя. */}
      <Flashlight className={styles.personality}>
        <div className={styles.prose}>
          {body.map((p, i) => (
            <p key={i} className={styles.para}>
              {p}
            </p>
          ))}
          {closer && <p className={`${styles.para} ${styles.closer}`}>{closer}</p>}
        </div>
      </Flashlight>

      <Ingredients locale={parsed.locale} ingredients={a.ingredients} band={labels.main} />

      <ResultMatch
        archetype={parsed.key}
        fallback={fallback}
        labels={labels}
        locale={parsed.locale}
      />

      <SubscribeForm locale={parsed.locale} archetype={parsed.key} />

      {/* У каждого архетипа своя музыка. */}
      <VinylPlayer locale={parsed.locale} archetype={parsed.key} />

      {/* Всплывает, когда человек дочитал до конца. Каркас: дизайн внутри
          картинки заказчица будет менять вместе со мной. */}
      <ShareCard
        locale={parsed.locale}
        archetype={parsed.key}
        arch={card}
        punch={punch}
        tagLine={tag}
        fallbackName={a.main.name}
        fallbackHouse={a.main.house}
        fallbackImg={a.main.img}
      />

      {/* Ничего не рисует: пишет прохождение в базу один раз за проход. */}
      <RecordSubmission locale={parsed.locale} />
      </ResultGate>
    </main>
  );
}
