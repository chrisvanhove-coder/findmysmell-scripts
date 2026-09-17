/**
 * Канонический адрес сайта и общие теги для ссылок-превью.
 *
 * ЗАЧЕМ. На живом сайте в `<head>` девять og/twitter-тегов, включая
 * картинку 1200×630 — то есть ссылка на квиз в мессенджере или в
 * инстаграме разворачивается карточкой. В порте их не было ни одного:
 * ссылка приезжала голой строкой. Для квиза, который растёт через
 * «вот мой результат, пройди тоже», это потеря заметная.
 *
 * ОТКУДА ЧИСЛА И ТЕКСТ. Теги сверены с `webflow/live-pages/home.head.html`:
 * `og:type=website`, `og:site_name=Find My Smell`, `og:locale=en_GB`,
 * `twitter:card=summary_large_image`, `twitter:site=@findmysmell`,
 * картинка 1200×630.
 *
 * ОДНО ОТСТУПЛЕНИЕ, И ОНО НАМЕРЕННОЕ: описание берётся не из прод-тега,
 * а из текста самой страницы. В проде в `og:description` лежит ПРОШЛАЯ
 * версия текста («The fragrance industry spends billions...») — тот
 * самый, который заказчица на главной уже заменила, а в og-теге он
 * остался. Копировать устаревшее описание в новый сайт незачем.
 */

/** Домен, на котором сайт живёт. Нужен абсолютными ссылками в og и sitemap. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  // Railway отдаёт домен сервиса и в сборке, и в рантайме. До переключения
  // домена сайт действительно живёт здесь, поэтому это верный ответ, а не
  // заглушка.
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) return `https://${railway}`;

  return 'http://localhost:3100';
}

/** Название сайта в карточке ссылки — как в проде. */
export const SITE_NAME = 'Find My Smell';

/** Аккаунт в твиттере из прод-тега `twitter:site`. */
export const TWITTER_SITE = '@findmysmell';

/** Локали в формате og (`og:locale`). В проде стоит en_GB, не en_US. */
export const OG_LOCALE: Record<string, string> = {
  en: 'en_GB',
  fr: 'fr_FR',
  ru: 'ru_RU',
};

/** Размер картинки превью. Оба числа из прод-тегов. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Полный набор тегов превью для страницы.
 *
 * ПОЧЕМУ ОДНОЙ ФУНКЦИЕЙ. Next не дополняет og-объект страницы тем, что
 * стоит в layout, а ЗАМЕНЯЕТ его целиком: как только страница задала
 * свой `openGraph`, из layout не доезжают ни `og:type`, ни
 * `og:site_name`, а `twitter.card` сваливается в `summary` вместо
 * `summary_large_image` — то есть картинка в карточке становится
 * маленькой. Поймано проверкой e2e:seo. Поэтому каждая страница
 * собирает полный набор здесь.
 */
export function previewTags({
  title, description, path, locale, image,
}: {
  title: string;
  description: string;
  /** Путь от корня, с ведущей косой чертой. */
  path: string;
  locale: string;
  /** Готовая ссылка на картинку 1200×630. */
  image: string;
}) {
  return {
    openGraph: {
      type: 'website' as const,
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      locale: OG_LOCALE[locale] ?? OG_LOCALE.en,
      images: [{ ...OG_IMAGE_SIZE, url: image }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: TWITTER_SITE,
      title,
      description,
      images: [image],
    },
  };
}
