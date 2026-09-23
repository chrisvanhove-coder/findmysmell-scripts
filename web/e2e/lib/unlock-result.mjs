import { readFileSync } from 'node:fs';

/**
 * Открывает странице результата дверь: кладёт в браузер полный набор
 * ответов ещё до первой отрисовки.
 *
 * ЗАЧЕМ. Результат закрыт пропуском (src/components/ResultGate.tsx): без
 * пройденного квиза страница не рендерится ни в браузере, ни в HTML с
 * сервера. Проверкам, которые смотрят на саму страницу — фонарик, Scent
 * DNA, карточку для шеринга, — проходить восемнадцать экранов ради этого
 * незачем, им нужен только допуск.
 *
 * ПОЧЕМУ В ОБА ХРАНИЛИЩА. Сайт пишет ответы и в sessionStorage, и в
 * localStorage и читает из любого (src/lib/answers-store.ts). Кладём так
 * же, чтобы проверка не зависела от того, какое из них он спросит первым.
 *
 * Наборы берутся из e2e/lib/complete-run.json — по одному на каждую ветку
 * эмоции. Генерирует их `npm run fixture:run`, полноту всех семи стережёт
 * `npm run check:revisions`.
 */
const RUNS = JSON.parse(readFileSync(new URL('./complete-run.json', import.meta.url), 'utf8'));

/**
 * Кладёт полное прохождение И отметку об удачной отправке — ровно то
 * состояние, в котором человек оказывается, честно дойдя до результата.
 *
 * @param page страница Playwright — вызывать ДО первого goto
 * @param extra ответы поверх набора: чем вопрос отличается в этой проверке
 */
export async function unlockResult(page, extra = {}) {
  /* Ветку берём по эмоции из `extra`: Q_EMO разводит квиз на семь хвостов,
     и набор от другой ветки оставит дыры — гейт развернёт страницу. */
  const emotion = String(extra.Q_EMO ?? '').replace('Q_EMO__', '') || 'CALM';
  const base = RUNS[emotion] ?? RUNS.CALM;
  const answers = { ...base, ...extra };
  await page.addInitScript((a) => {
    const raw = JSON.stringify(a);
    for (const store of [sessionStorage, localStorage]) {
      try {
        store.setItem('quiz_answers', raw);
        /* И отметка «сохранено». Без неё прохождение считается НАЧАТЫМ и
           незаконченным, и кнопка BEGIN на главной открывает окно
           «продолжить или начать заново» вместо перехода к вопросам —
           проверки, которые по этой кнопке ходят, вставали намертво.
           Человек, дошедший до результата по-настоящему, эту отметку
           тоже имеет: её ставит удачная отправка. */
        store.setItem('quiz_sent', '1');
      } catch { /* приватный режим */ }
    }
  }, answers);
  return answers;
}

export { RUNS as COMPLETE_RUNS };
