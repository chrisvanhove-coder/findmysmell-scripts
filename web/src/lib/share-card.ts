/**
 * Рисование шеринговой карточки. Перенесено из fmsDrawShareCard
 * (result-shared15.js) с тремя правками, которые попросила заказчица:
 *
 *   1. @TAG НАВЕРХ. В проде строка «@tag the friend who…» стояла в самом
 *      низу мелким курсивом. Именно она заставляет человека отметить
 *      друга — то есть она и есть механизм шеринга, а не подпись.
 *   2. ПАНЧЛАЙН ГЛАВНЫЙ. Он и был крупным, но ниже @tag.
 *   3. ИМЕНИ АРХЕТИПА НЕТ. В проде на карточке печаталось headline вида
 *      «YOU ARE A HUG.» — это внутреннее имя, снаружи оно не значит
 *      ничего. Убрано с карточки; в данных остаётся, оттуда собирается
 *      заголовок вкладки.
 *
 * ЭТО КАРКАС. Дизайн внутри карточки заказчица будет менять вместе со
 * мной, поэтому вся геометрия собрана в LAYOUT одним объектом, а рисование
 * разложено на шаги, каждый из которых можно выкинуть или переставить,
 * не разбирая остальное.
 */

export interface CardArch {
  bg: string;
  accent: string;
  text: string;
  img: string;
}

export interface CardContent {
  /** Строки панчлайна: текст и кегль, как в проде. */
  punch: Array<[string, number]>;
  tagLine: string;
  perfumeName: string;
  perfumeHouse: string;
  bottleImg: string;
}

/**
 * Геометрия. Формат 1080×1350 — это 4:5, вертикаль инстаграма: карточка
 * шире не бывает и обрезаться не должна.
 */
export const LAYOUT = {
  W: 1080,
  H: 1350,
  PAD: 60,

  /* @tag наверху: своя полоса, отделённая линией. Полоса поджата
     намеренно — самый высокий панчлайн (CEO, 334px со строкой в 100px)
     должен влезать между ней и бутылкой. */
  tagY: 74,
  tagFontSize: 30,
  tagRuleY: 104,

  /* Панчлайн — главный блок. Начинается сразу под полосой @tag. */
  punchStartY: 140,
  punchLineGap: 8,

  /* Бутылка крупнее прода: с карточки ушёл headline, и без этого
     нижняя треть оставалась пустой. */
  bottleZoneTop: 500,
  bottleW: 440,
  bottleH: 520,

  perfumeNameY: 1130,
  perfumeFontSize: 34,
  perfumeBrandY: 1174,
  perfumeBrandFontSize: 22,

  footerY: 1286,
  footerFontSize: 28,

  /* Зерно: как в проде — шаг 3px, overlay, alpha 0.05. */
  grainStep: 3,
  grainAlpha: 0.05,
} as const;

/** Шрифты берём те, что страница уже загрузила, а не «Impact, если есть». */
export interface CardFonts {
  display: string;   // панчлайн и название парфюма
  mono: string;      // подписи и адрес сайта
  serif: string;     // строка @tag
}

export const FALLBACK_FONTS: CardFonts = {
  display: '"Arial Black", Arial, sans-serif',
  mono: 'Inconsolata, monospace',
  serif: 'Georgia, serif',
};

/** Высота блока панчлайна — нужна, чтобы проверить, что он не наедает бутылку. */
export function punchHeight(punch: Array<[string, number]>): number {
  if (punch.length === 0) return 0;
  const text = punch.reduce((sum, [, size]) => sum + size, 0);
  return text + LAYOUT.punchLineGap * (punch.length - 1);
}

/** Влезает ли панчлайн в отведённую полосу, не залезая на бутылку. */
export function punchFits(punch: Array<[string, number]>): boolean {
  return LAYOUT.punchStartY + punchHeight(punch) <= LAYOUT.bottleZoneTop;
}

/* ── читаемость ─────────────────────────────────────────────────────── */

/** Относительная яркость по WCAG. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const v = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Ниже этого крупный текст в ленте телефона уже не читается. */
export const MIN_PUNCH_CONTRAST = 4.5;

/**
 * Каким цветом набирать панчлайн.
 *
 * Обычно это arch.text — цвет из палитры архетипа, как в проде. Но у
 * THERAPIST светлый текст #f0f0e0 на оливковом #8f9a54 даёт 2.6:1, то есть
 * ГЛАВНАЯ НАДПИСЬ КАРТОЧКИ не читается — и так было в проде. Поэтому
 * правило: держим arch.text, пока он читается, иначе берём arch.accent
 * (у THERAPIST это почти чёрный, 5.4:1).
 *
 * Правило намеренно консервативное: «выбрать более контрастный» поменяло бы
 * цвет и там, где всё в порядке. Здесь меняется только то, что сломано.
 */
export function punchColor(arch: CardArch): string {
  if (contrast(arch.text, arch.bg) >= MIN_PUNCH_CONTRAST) return arch.text;
  return contrast(arch.accent, arch.bg) > contrast(arch.text, arch.bg)
    ? arch.accent
    : arch.text;
}

/* ── шаги рисования ─────────────────────────────────────────────────── */

type Ctx = CanvasRenderingContext2D;

function drawBackground(ctx: Ctx, arch: CardArch) {
  ctx.fillStyle = arch.bg;
  ctx.fillRect(0, 0, LAYOUT.W, LAYOUT.H);
}

/**
 * Зерно. Прод рисовал 1080/3 × 1350/3 = 162 000 прямоугольников по одному
 * вызову fillRect каждый — на телефоне это заметная пауза. Здесь то же
 * зерно собирается в ImageData и кладётся одним putImageData.
 */
function drawGrain(ctx: Ctx) {
  const { W, H, grainStep: step, grainAlpha } = LAYOUT;
  const cells = ctx.createImageData(W, H);
  const data = cells.data;

  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const v = Math.floor(Math.random() * 255);
      for (let dy = 0; dy < step && y + dy < H; dy += 1) {
        for (let dx = 0; dx < step && x + dx < W; dx += 1) {
          const i = ((y + dy) * W + (x + dx)) * 4;
          data[i] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = 255;
        }
      }
    }
  }

  // Слой зерна кладётся через отдельный холст: putImageData игнорирует
  // globalCompositeOperation, а нам нужен overlay, как в проде.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  layer.getContext('2d')?.putImageData(cells, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grainAlpha;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/** @tag наверху плюс отделяющая линия. */
function drawTagLine(ctx: Ctx, arch: CardArch, fonts: CardFonts, tagLine: string) {
  const { PAD, W, tagY, tagFontSize, tagRuleY } = LAYOUT;

  ctx.textAlign = 'left';
  /* Пустая строка бывает на локалях, где @tag ещё не написан: тогда
     печатать нечего, но ЛИНИЮ оставляем — она держит верх карточки, и
     без неё панчлайн повисает в воздухе. Отступ под панчлайн фиксирован,
     так что раскладка не едет. */
  if (tagLine) {
    /* Кегль ужимаем, если строка не влезает: она печатается в одну
       строчку без переноса, а французские строки длиннее английских
       примерно на четверть. Меряем настоящим шрифтом, а не на глаз —
       и когда приедет HIGHCRUISER, ширина букв изменится сама. */
    const size = fitSerifWidth(ctx, tagLine, tagFontSize, fonts);
    ctx.font = `italic 400 ${size}px ${fonts.serif}`;
    ctx.fillStyle = arch.text;
    ctx.globalAlpha = 0.9;
    ctx.fillText(tagLine, PAD, tagY);
  }

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = arch.text;
  ctx.fillRect(PAD, tagRuleY, W - PAD * 2, 1);
  ctx.globalAlpha = 1;
}

/**
 * То же для строки @tag: она набрана курсивом другого шрифта, и мерить
 * её кеглем панчлайна нельзя — ширина букв у них разная.
 */
function fitSerifWidth(ctx: Ctx, text: string, wanted: number, fonts: CardFonts): number {
  const maxW = LAYOUT.W - LAYOUT.PAD * 2;
  let size = wanted;
  while (size > 8) {
    ctx.font = `italic 400 ${size}px ${fonts.serif}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  }
  return size;
}

/**
 * Наибольший кегль не крупнее желаемого, при котором строка влезает в
 * ширину карточки. Меряет настоящим шрифтом страницы, а не на глаз.
 */
export function fitWidth(ctx: Ctx, text: string, wanted: number, fonts: CardFonts): number {
  const maxW = LAYOUT.W - LAYOUT.PAD * 2;
  let size = wanted;
  while (size > 8) {
    ctx.font = `700 ${size}px ${fonts.display}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  }
  return size;
}

function drawPunch(ctx: Ctx, arch: CardArch, fonts: CardFonts, punch: Array<[string, number]>) {
  const { PAD, punchStartY, punchLineGap } = LAYOUT;
  let y = punchStartY;
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.fillStyle = punchColor(arch);
  for (const [text, wanted] of punch) {
    /* Кегль ужимаем, если строка не влезает по ширине. Английские кегли
       набраны вручную под свой шрифт и сюда не попадают, а вот
       вычисленные (французские) считаны на запасном Arial Black — когда
       приедет HIGHCRUISER, буквы станут другой ширины. Пусть лучше строка
       окажется чуть мельче, чем уедет за край карточки. */
    const size = fitWidth(ctx, text, wanted, fonts);
    ctx.font = `700 ${size}px ${fonts.display}`;
    ctx.fillText(text, PAD, y + size);
    y += size + punchLineGap;
  }
}

function drawBottle(ctx: Ctx, img: HTMLImageElement) {
  const { W, bottleZoneTop, bottleW, bottleH } = LAYOUT;
  const nw = img.naturalWidth || img.width || bottleW;
  const nh = img.naturalHeight || img.height || bottleH;
  const scale = Math.min(bottleW / nw, bottleH / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  ctx.globalAlpha = 1;
  ctx.drawImage(img, W / 2 - dw / 2, bottleZoneTop + (bottleH - dh) / 2, dw, dh);
}

function drawPerfume(ctx: Ctx, arch: CardArch, fonts: CardFonts, c: CardContent) {
  const { W, PAD, perfumeNameY, perfumeFontSize, perfumeBrandY, perfumeBrandFontSize } = LAYOUT;

  ctx.textAlign = 'right';
  ctx.font = `700 ${perfumeFontSize}px ${fonts.display}`;
  ctx.fillStyle = arch.text;
  ctx.globalAlpha = 0.95;
  ctx.fillText(c.perfumeName, W - PAD, perfumeNameY);

  ctx.font = `400 ${perfumeBrandFontSize}px ${fonts.mono}`;
  ctx.fillStyle = arch.accent;
  ctx.globalAlpha = 0.75;
  ctx.fillText(c.perfumeHouse, W - PAD, perfumeBrandY);
  ctx.globalAlpha = 1;
}

/**
 * Подвал — только адрес сайта. Внутри картинки ссылки нет и быть не может,
 * поэтому напечатанный домен это единственный путь назад; ведёт он на
 * главную, где стоит «сначала пройдите тест», а не чужой результат.
 */
function drawFooter(ctx: Ctx, arch: CardArch, fonts: CardFonts) {
  const { W, PAD, footerY, footerFontSize } = LAYOUT;
  ctx.font = `700 ${footerFontSize}px ${fonts.mono}`;
  ctx.fillStyle = arch.text;
  ctx.globalAlpha = 1;
  ctx.textAlign = 'right';
  ctx.fillText('findmysmell.com', W - PAD, footerY);
  ctx.textAlign = 'left';
}

/**
 * Рисует карточку целиком. Флакон ждём, но НЕ БЕСКОНЕЧНО: если картинка
 * не пришла, карточка рисуется без неё, а не остаётся пустой. В проде
 * onerror вёл себя так же — это единственное, что там было устроено
 * правильно на этот счёт.
 */
export async function drawShareCard(
  canvas: HTMLCanvasElement,
  arch: CardArch,
  content: CardContent,
  fonts: CardFonts = FALLBACK_FONTS,
): Promise<void> {
  canvas.width = LAYOUT.W;
  canvas.height = LAYOUT.H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawBackground(ctx, arch);
  drawGrain(ctx);
  drawTagLine(ctx, arch, fonts, content.tagLine);
  drawPunch(ctx, arch, fonts, content.punch);

  const bottle = await loadImage(content.bottleImg);
  if (bottle) drawBottle(ctx, bottle);

  drawPerfume(ctx, arch, fonts, content);
  drawFooter(ctx, arch, fonts);
}

/**
 * crossOrigin обязателен: без него холст «портится» и toDataURL бросает,
 * то есть карточку нельзя будет сохранить. Cloudinary отдаёт CORS-заголовки.
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Панчлайн из punch-lines.json. JSON типизируется как (string|number)[][],
 * и привести его к [string, number][] можно было бы одним `as unknown as`.
 * Здесь вместо этого разбор с проверкой: правка данных, в которой забыли
 * кегль, должна давать пустую строку, а не NaN-кегль в canvas.
 */
export function parsePunch(raw: unknown): Array<[string, number]> {
  if (!Array.isArray(raw)) return [];
  const out: Array<[string, number]> = [];
  for (const line of raw) {
    if (!Array.isArray(line) || line.length < 2) continue;
    const [text, size] = line;
    if (typeof text !== 'string' || !text) continue;
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) continue;
    out.push([text, size]);
  }
  return out;
}
