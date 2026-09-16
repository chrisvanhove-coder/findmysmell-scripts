/**
 * Доставка картинок из Cloudinary через трансформации.
 *
 * Библиотека — 302 картинки и 357 МБ, 98% веса в PNG. В проде ссылки идут
 * без трансформаций вообще, поэтому страница вопроса тянет до 30 МБ фото,
 * а кружок ингредиента размером 120px приезжает как PNG 2048×2048 на 6.5 МБ.
 *
 * Замеры на реальных ассетах (Cloudinary explicit API, не оценка):
 *
 *   calmnow-wat   2048×1152  4 241 861 → 137 362  (c_limit,w_1400)      31×
 *   oud1          2048×2048  6 563 360 →  12 065  (128×128 кружок)     544×
 *   cozy-blanket  1921×481   1 560 838 →  37 602  (c_limit,w_1000)      42×
 *   home/hero     1536×1536  3 752 217 → 348 984  (c_limit,w_1600)      11×
 *   eau-duelle     800×1200    416 169 →  72 577  (c_limit,w_600)       5.7×
 *
 * Документация Cloudinary требует писать `f_auto/q_auto` отдельными
 * компонентами. Замер показал, что слитная форма `f_auto,q_auto,w_1600`
 * тоже применяется (3 752 217 → 337 404), так что это правило стиля, а не
 * условие работы. Важно другое: `w_` без режима кропа означает `c_scale`,
 * который РАСТЯГИВАЕТ — та ссылка отдавала 1600×1600 из картинки 1536×1536.
 * Поэтому во всех пресетах режим кропа указан явно, и для фонов это
 * `c_limit`, который уменьшает, но никогда не увеличивает.
 */

/** Ширины заданы под CSS-размер × 2 (retina). */
export const PRESETS = {
  /** Кружок ингредиента: .img — clamp(64px, 9vw, 120px). */
  ingredientThumb: 'c_fill,g_auto,h_240,w_240/f_auto/q_auto',
  /** Картинка в модалке ингредиента: .modalImg — до 520px × 240px. */
  ingredientModal: 'c_fill,g_auto,h_480,w_1040/f_auto/q_auto',
  /** Главный флакон: .bottle — clamp(200px, 26vw, 320px). */
  bottleMain: 'c_limit,w_640/f_auto/q_auto',
  /** Флакон альтернативы: .altImg — clamp(84px, 16vw, 168px). */
  bottleAlt: 'c_limit,w_336/f_auto/q_auto',
  /** Флакон в письме: ширина 180. */
  bottleEmail: 'c_limit,w_360/f_auto/q_auto',
  /** Фон на весь экран в квизе: барабан эмоций и живые фоны вопросов. */
  quizBackdrop: 'c_fill,g_auto,h_900,w_1600/f_auto/q_auto',
  /** То же для телефона: вертикаль, вдвое меньше по площади. */
  quizBackdropMobile: 'c_fill,g_auto,h_1280,w_720/f_auto/q_auto',
  /**
   * Плитка ответа в ветке эмоции: полоса примерно 720×70 CSS-пикселей,
   * снимок лежит фоном с cover. Замер explicit API на calm-tea:
   * 1 328 670 → 24 174 байта (в 55 раз меньше). Таких плиток на экране
   * шесть-семь, и прод грел все сразу — около 8 МБ на один вопрос.
   */
  emotionTile: 'c_fill,g_auto,h_260,w_1000/f_auto/q_auto',
  /** Фото в боковой колонке главной: .sidePhoto, 3/2. */
  homeSide: 'c_fill,g_auto,h_480,w_720/f_auto/q_auto',
  /** Фон на всю колонку или экран, десктоп: .midImg. */
  homeFull: 'c_limit,w_1600/f_auto/q_auto',
  /** Тот же фон на мобильном экране — 1600px там не нужны. */
  homeFullMobile: 'c_limit,w_900/f_auto/q_auto',
  /**
   * Фото-герой главной. Замер explicit API на background_home_v16ghx:
   * 2798×1868, 2 413 988 → 505 237 байт (в 4.8 раза меньше). На живом
   * сайте оно отдаётся исходником — 2.4 МБ на первом же экране.
   */
  homeHero: 'c_limit,w_1800/f_auto/q_auto',
  /** Тот же герой вертикальным кропом под телефон: 2 413 988 → 266 923. */
  homeHeroMobile: 'c_fill,g_auto,h_1400,w_900/f_auto/q_auto',
} as const;

export type Preset = keyof typeof PRESETS;

const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;
/** Компонент трансформации: c_limit / w_600 / f_auto, через запятую. */
const LOOKS_TRANSFORMED = /^[a-z]{1,3}_[^/,]+(?:,[a-z]{1,3}_[^/,]+)*$/;

/**
 * Вставляет трансформацию в ссылку Cloudinary. Возвращает ссылку без
 * изменений, если она не из Cloudinary, если это SVG (вектор ужимать нечем)
 * или если трансформация в ней уже есть — иначе при повторном проходе
 * получился бы `c_limit,w_640/c_limit,w_640`.
 */
export function cld(url: string, preset: Preset): string {
  if (!url || !CLOUDINARY.test(url)) return url;
  if (url.endsWith('.svg')) return url;

  const [head, tail] = url.split('/upload/');
  if (tail === undefined) return url;

  const first = tail.split('/')[0];
  if (LOOKS_TRANSFORMED.test(first)) return url;

  return `${head}/upload/${PRESETS[preset]}/${tail}`;
}

/* ─────────────────────────── видео ─────────────────────────── */

/**
 * Пресеты видео.
 *
 * ЗАЧЕМ. На первом вопросе квиза (Q_GENDER) на живом сайте лежат три
 * клипа 1920×1080 БЕЗ ЛЮБЫХ ТРАНСФОРМАЦИЙ и все три с preload="auto":
 * feminine 9 992 535, unisex 8 594 700, masculine 12 084 057 байт —
 * 30.7 МБ на самом первом экране квиза. На телефоне они ещё и играют
 * все три одновременно.
 *
 * Замеры explicit API (не оценка):
 *   feminine  1920×1080  9 992 535 → 524 459  (c_limit,w_1280)   19×
 *   masculine 1920×1080 12 084 057 → 325 176  (c_limit,w_720)    37×
 */
export const VIDEO_PRESETS = {
  /** Клип на полэкрана в квизе. */
  quizVideo: 'c_limit,w_1280/vc_auto/q_auto',
  /** Тот же клип на телефоне: там он лежит полосой в четверть экрана. */
  quizVideoMobile: 'c_limit,w_720/vc_auto/q_auto',
} as const;

export type VideoPreset = keyof typeof VIDEO_PRESETS;

const CLOUDINARY_VIDEO = /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//;

/** Вставляет трансформацию в ссылку на видео Cloudinary. */
export function cldVideo(url: string, preset: VideoPreset): string {
  if (!url || !CLOUDINARY_VIDEO.test(url)) return url;
  const [head, tail] = url.split('/upload/');
  if (tail === undefined) return url;
  const first = tail.split('/')[0];
  if (LOOKS_TRANSFORMED.test(first)) return url;
  return `${head}/upload/${VIDEO_PRESETS[preset]}/${tail}`;
}

/**
 * Первый кадр клипа как картинка.
 *
 * Нужен двумя способами: как poster, пока видео не проигралось, и как
 * замена видео целиком при prefers-reduced-motion — там движение
 * включать нельзя, а показать кадр можно.
 */
export function cldPoster(url: string, width = 1280): string {
  if (!url || !CLOUDINARY_VIDEO.test(url)) return url;
  const [head, tail] = url.split('/upload/');
  if (tail === undefined) return url;
  // so_0 — нулевая секунда; расширение меняем на jpg, иначе Cloudinary
  // отдаст видео, а не кадр.
  const still = tail.replace(/\.(mp4|webm|mov)$/i, '.jpg');
  return `${head}/upload/so_0/c_limit,w_${width}/f_jpg/q_auto/${still}`;
}
