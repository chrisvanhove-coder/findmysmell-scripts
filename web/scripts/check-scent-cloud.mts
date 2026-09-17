/**
 * Сверка облака запаха (Q_RADIUS) с продом.
 *
 * Запуск:  cd web && npm run check:cloud
 *
 * Здесь три вещи.
 *
 * 1. Размер шарика привязан к тому же варианту: весь смысл экрана в
 *    том, что «радиус» запаха показан размером, и перепутанные числа
 *    сделали бы из ответа противоположный.
 * 2. Скорости пузырей переведены в единицы в СЕКУНДУ ровно множителем
 *    60 от прод-значений на кадр. Это та же ошибка прода, что на шарах
 *    детства и живых фонах: на экране 120 Гц всё ехало вдвое быстрее.
 * 3. Числа шарика (перелёт, размер, градиент) и остальная арифметика
 *    пузырей совпадают с подвалом страницы посимвольно.
 */
import { readFileSync } from 'node:fs';
import data from '../src/data/scent-cloud.json';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const prod = readFileSync('../webflow/live-pages/q-radius.footer.html', 'utf8');
const css = readFileSync('src/components/quiz/scent-cloud.module.css', 'utf8');
const src = readFileSync('src/components/quiz/ScentCloud.tsx', 'utf8');
const screen = readFileSync('src/app/[locale]/quiz/[question]/QuizScreen.tsx', 'utf8');

const BALL = data.ball;
const B = data.bubbles;
const SIZES = BALL.sizes as Record<string, number>;

console.log('\nРазмер шарика привязан к тому же варианту');
{
  /* В проде размеры лежат объектом sizes: { w, h } на каждый код. */
  const prodSizes = [...prod.matchAll(
    /(Q_RADIUS__\w+):\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)\s*\}/g,
  )].map((m) => ({ code: m[1], w: Number(m[2]), h: Number(m[3]) }));

  check('в проде четыре размера', prodSizes.length === 4, String(prodSizes.length));
  check('и у нас четыре', Object.keys(SIZES).length === 4, Object.keys(SIZES).join(', '));
  for (const p of prodSizes) {
    check(`${p.code} → ${p.w}px`, SIZES[p.code] === p.w, String(SIZES[p.code]));
    check(`${p.code}: круг, а не овал`, p.w === p.h, `${p.w}×${p.h}`);
  }
  // Смысл экрана: чем шире «радиус», тем больше шарик.
  const order = ['Q_RADIUS__CLOSE', 'Q_RADIUS__SOFT', 'Q_RADIUS__NOTICEABLE', 'Q_RADIUS__BOLD'];
  check('размер растёт от «у кожи» к «заметно вокруг»',
    order.every((c, i) => i === 0 || SIZES[c] > SIZES[order[i - 1]]),
    order.map((c) => SIZES[c]).join(' → '));
}

console.log('\nСкорости пузырей — прод × 60 (в единицах в секунду)');
{
  const num = (re: RegExp) => {
    const m = re.exec(prod);
    return m ? Number(m[1]) : NaN;
  };
  // const r = 4 + Math.random() * 14;
  const rMin = num(/const r = ([\d.]+) \+ Math\.random\(\) \* [\d.]+/);
  const rSpan = num(/const r = [\d.]+ \+ Math\.random\(\) \* ([\d.]+)/);
  check(`радиус от ${rMin} до ${rMin + rSpan}`,
    B.radiusMin === rMin && B.radiusMax === rMin + rSpan,
    `${B.radiusMin}–${B.radiusMax} против ${rMin}–${rMin + rSpan}`);

  // speedX: (Math.random() - 0.5) * 0.4  → размах на кадр
  const driftFrame = num(/speedX:\s*\(Math\.random\(\) - 0\.5\) \* ([\d.]+)/);
  check(`боковой дрейф ${driftFrame} на кадр → ${B.driftX} в секунду`,
    Math.abs(B.driftX - driftFrame * 60) < 0.001, String(B.driftX));

  // speedY: -(0.15 + Math.random() * 0.35)
  const riseMin = num(/speedY:\s*-\(([\d.]+) \+ Math\.random\(\) \* [\d.]+\)/);
  const riseSpan = num(/speedY:\s*-\([\d.]+ \+ Math\.random\(\) \* ([\d.]+)\)/);
  check(`подъём ${riseMin}–${riseMin + riseSpan} на кадр → ${B.riseMin}–${B.riseMax} в секунду`,
    Math.abs(B.riseMin - riseMin * 60) < 0.001
    && Math.abs(B.riseMax - (riseMin + riseSpan) * 60) < 0.001,
    `${B.riseMin}–${B.riseMax}`);

  // wobbleSpeed: 0.008 + Math.random() * 0.012
  const wMin = num(/wobbleSpeed:\s*([\d.]+) \+ Math\.random\(\) \* [\d.]+/);
  const wSpan = num(/wobbleSpeed:\s*[\d.]+ \+ Math\.random\(\) \* ([\d.]+)/);
  check('скорость качания × 60',
    Math.abs(B.wobbleSpeedMin - wMin * 60) < 0.001
    && Math.abs(B.wobbleSpeedMax - (wMin + wSpan) * 60) < 0.001,
    `${B.wobbleSpeedMin}–${B.wobbleSpeedMax} против ${wMin * 60}–${(wMin + wSpan) * 60}`);

  // Math.sin(b.wobble) * 0.3 — размах качания на кадр
  const ampFrame = num(/Math\.sin\(b\.wobble\) \* ([\d.]+)/);
  check(`размах качания ${ampFrame} на кадр → ${B.wobbleAmp} в секунду`,
    Math.abs(B.wobbleAmp - ampFrame * 60) < 0.001, String(B.wobbleAmp));

  check('в коде шаг умножается на dt, а не прибавляется на кадр',
    src.includes('b.y += b.vy * dt') && src.includes('* dt;'),
    'иначе на 120 Гц пузыри поплывут вдвое быстрее');
}

console.log('\nОстальная арифметика пузырей — как в проде');
{
  check(`пузырей ${B.count}`, prod.includes(`BUBBLE_COUNT = ${B.count}`), String(B.count));
  check('цвет #f1e09b', prod.includes(`rgba(${B.count === 28 ? '241, 224, 155' : ''}`)
    || prod.includes('rgba(241, 224, 155,'), data.color);
  check(`прозрачность ${B.opacityMin}–${B.opacityMax}`,
    prod.includes(`opacity: ${B.opacityMin} + Math.random() * ${
      Math.round((B.opacityMax - B.opacityMin) * 100) / 100}`),
    `${B.opacityMin}–${B.opacityMax}`);
  check(`заливка вполовину от прозрачности (${B.fillOfOpacity})`,
    prod.includes(`b.opacity * ${B.fillOfOpacity}`));
  check(`обод ${B.rimWidth}px`, prod.includes(`lineWidth = ${B.rimWidth}`));
  check(`блик радиусом ${B.highlightOfRadius} от пузыря`,
    prod.includes(`b.r * ${B.highlightOfRadius}`));
  check(`со смещением ${B.highlightOffsetOfRadius}`,
    prod.includes(`b.r * ${B.highlightOffsetOfRadius}`));
  check(`и прозрачностью ${B.highlightOfOpacity} от пузыря`,
    prod.includes(`b.opacity * ${B.highlightOfOpacity}`));
  check('уплыл за верх — рождается снизу', prod.includes('makeBubble(H + b.r)')
    && src.includes('make(true)'));
}

console.log('\nЧисла шарика совпадают с продом');
{
  check(`основание ${BALL.basePx}px`,
    prod.includes(`width: ${BALL.basePx}px`) && css.includes(`width: ${BALL.basePx}px`));
  check(`перелёт ${BALL.moveMs} мс с перебросом`,
    prod.includes(`top ${BALL.moveMs / 1000}s ${BALL.ease}`)
    && css.includes(`top ${BALL.moveMs / 1000}s ${BALL.ease}`));
  check(`размер ${BALL.sizeMs} мс`,
    prod.includes(`width ${BALL.sizeMs / 1000}s ease`)
    && css.includes(`width ${BALL.sizeMs / 1000}s ease`));
  check(`прозрачность ${BALL.fadeMs} мс`,
    prod.includes(`opacity ${BALL.fadeMs / 1000}s ease`)
    && css.includes(`opacity ${BALL.fadeMs / 1000}s ease`));
  check('градиент тот же',
    css.includes('rgba(241, 224, 155, 0.9) 0%')
    && css.includes('rgba(241, 224, 155, 0.4) 40%')
    && css.includes('rgba(241, 224, 155, 0) 70%'));
  check('шарик скрыт через scale(0), как в проде',
    prod.includes('translate(-50%, -50%) scale(0)')
    && css.includes('translate(-50%, -50%) scale(0)'));
}

console.log('\nЭто украшение обычного экрана, а не своя механика');
{
  /* В проде эта страница была обычным списком Webflow, а шарик и пузыри
     дорисовывал скрипт из подвала. Так же и здесь: список общий. */
  check('облако подключено к экрану вопроса', screen.includes('<ScentCloud active={looking} />'));
  check('и только для Q_RADIUS', src.includes("questionId === 'Q_RADIUS'"));
  check('наведение и фокус отслеживаются и без фотографий',
    screen.includes('const watching = photos !== undefined || cloud'),
    'иначе на этом экране шарик никуда не полетит');
  const mechanics = readFileSync('src/components/quiz/mechanics.ts', 'utf8');
  check('своей механики у Q_RADIUS нет — список остаётся общим',
    !mechanics.includes('Q_RADIUS'));
}

console.log('\nИсправления против прода на месте');
{
  check('холст в пикселях устройства',
    src.includes('devicePixelRatio') && src.includes('ctx.setTransform(dpr'),
    'в проде cvs.width = innerWidth, то есть на retina пузыри были мылом');
  check('кадры не крутятся в спрятанной вкладке',
    src.includes('document.hidden') && src.includes('visibilitychange'),
    'в проде цикл жил вечно');
  check('шаг по времени ограничен сверху',
    src.includes('Math.min((ts - last) / 1000, 0.1)'),
    'иначе после возврата из спрятанной вкладки пузыри прыгнут');
  check('prefers-reduced-motion: пузыри стоят',
    src.includes('useReducedMotion') && src.includes('if (still || document.hidden) return'));
  check('шарик не шире экрана',
    src.includes('Math.min(SIZES[active], limit)'),
    'в проде на телефоне он оставался 320px: media-запрос перебивался инлайном');
  check('холст и шарик живут внутри экрана вопроса',
    !src.includes('document.body.appendChild'),
    'в проде оба добавлялись в body и оставались там после уходa со страницы');
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nОблако запаха сходится с продом.\n');
process.exit(failed ? 1 : 0);
