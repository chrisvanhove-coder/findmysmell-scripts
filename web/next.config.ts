import type { NextConfig } from 'next';

/**
 * РЕДИРЕКТЫ СО СТАРЫХ АДРЕСОВ.
 *
 * Зачем. На живом сайте адреса плоские: `/q-gender`, `/q-calm`,
 * `/result`, `/privacy-policy`. В порте они с локалью и разделом:
 * `/en/quiz/q-gender`, `/en/result/<архетип>`, `/en/privacy-policy`.
 * Без этой таблицы в день переключения домена КАЖДАЯ ссылка из поиска и
 * каждая ссылка, которой кто-то поделился, отдаст 404 — а у квиза весь
 * рост идёт как раз через «вот мой результат, пройди тоже».
 *
 * Список адресов не придуман: он взят из страниц самого сайта через
 * Webflow API (поле `publishedPath` у каждой страницы). Их там 75 штук
 * в трёх наборах — без префикса (английские), `/fr/...` и `/ru/...`.
 *
 * `permanent: true` — это 308: поисковик переносит на новый адрес вес
 * старого, а не считает страницу временно переехавшей.
 */
const LOCALE_PREFIX = 'fr|ru';

const redirects = async () => [
  /* Экраны квиза. Правилом, а не списком из 24 строк: любой адрес вида
     `/q-что-угодно` уходит в раздел квиза. Несуществующий вопрос там
     честно отдаст 404 — но уже наш, а не «страница пропала». */
  {
    source: '/:question(q-[a-z0-9-]+)',
    destination: '/en/quiz/:question',
    permanent: true,
  },
  /* Единственная страница с русским суффиксом в адресе: `/ru/q-gender-ru`.
     ВЫШЕ общего правила намеренно: правила разбираются по порядку, и
     общее `/ru/q-...` увело бы её в несуществующий `/ru/quiz/q-gender-ru`.
     Поймано проверкой e2e:seo. */
  {
    source: '/ru/q-gender-ru',
    destination: '/ru/quiz/q-gender',
    permanent: true,
  },
  {
    source: `/:locale(${LOCALE_PREFIX})/:question(q-[a-z0-9-]+)`,
    destination: '/:locale/quiz/:question',
    permanent: true,
  },

  /* Результат. На старом адресе он читал ответы из хранилища и показывал
     архетип — ровно это делает и `/en/result`. */
  { source: '/result', destination: '/en/result', permanent: true },

  /* Юридические страницы. */
  { source: '/privacy-policy', destination: '/en/privacy-policy', permanent: true },
  { source: '/legal-notice', destination: '/en/legal-notice', permanent: true },

  /* Главная в Webflow лежала и по адресу `/home` (во французском и
     русском наборах — `/fr/home`, `/ru/home`). */
  { source: '/home', destination: '/en', permanent: true },
  {
    source: `/:locale(${LOCALE_PREFIX})/home`,
    destination: '/:locale',
    permanent: true,
  },

  /* Страницы, которых в новом сайте нет и не будет: прошлая главная,
     заготовка русского квиза и коллекция флаконов из CMS Webflow
     (`/perfumes/<слаг>`). Ведём на главную, а не в 404: для поиска это
     «страница переехала», а не «сайт сломался». Если заказчица захочет
     страницы флаконов — это отдельная работа, и тогда правило уйдёт. */
  { source: '/old-home', destination: '/en', permanent: true },
  { source: '/quiz-ru', destination: '/en', permanent: true },
  { source: '/perfumes', destination: '/en', permanent: true },
  { source: '/perfumes/:slug*', destination: '/en', permanent: true },
];

const config: NextConfig = {
  // Next 16 иначе роняет свои AGENTS.md и CLAUDE.md прямо в web/ при каждом
  // запуске dev-сервера. В репозитории они не нужны.
  agentRules: false,
  // Railway запускает контейнер, а не serverless — standalone режет размер образа.
  output: 'standalone',
  images: {
    // Все изображения уже на Cloudinary и на CDN Webflow, они сами умеют
    // ресайз и webp через параметры URL. Свой оптимизатор только жёг бы CPU.
    unoptimized: true,
  },
  redirects,
};

export default config;
