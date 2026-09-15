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
  /** Фото в боковой колонке главной: .sidePhoto, 3/2. */
  homeSide: 'c_fill,g_auto,h_480,w_720/f_auto/q_auto',
  /** Фон на всю колонку или экран, десктоп: .midImg. */
  homeFull: 'c_limit,w_1600/f_auto/q_auto',
  /** Тот же фон на мобильном экране — 1600px там не нужны. */
  homeFullMobile: 'c_limit,w_900/f_auto/q_auto',
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
