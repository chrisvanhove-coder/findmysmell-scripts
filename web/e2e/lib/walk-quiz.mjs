/**
 * Проход квиза до страницы результата — один на все браузерные проверки.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Этот проход был скопирован в пяти файлах, и
 * копии разошлись: quiz-flow знал про механики, а submission, funnel и
 * repeat-runs искали только `ul li button` и падали на первом же экране
 * с барабаном. То есть проверки отправки прохождения, воронки и
 * повторных проходов молча перестали работать, как только появилась
 * первая механика. Теперь способ ответить один, и новую механику надо
 * добавить в одном месте.
 *
 * КАК ОТВЕЧАТЬ НА ЭКРАНЕ. Порядок проверок важен: у вопроса может быть
 * и своя механика, и общий список — например у карточек поколений
 * кнопки лежат внутри `ul li`, и по общему правилу тест нажал бы не то.
 * Поэтому сначала ищем помеченные кнопки и особые роли, и только
 * потом общий список.
 */

/** Любой способ ответить: пока его нет, экран ещё не готов. */
export const ANY_ANSWER = [
  'ul li button',
  '[role="slider"]',
  '[role="listbox"]',
  'button[data-answer]',
  '#country-search',
  'textarea',
].join(', ');

/**
 * Проходит квиз от первого вопроса до результата.
 *
 * @param page страница Playwright
 * @param opts.base адрес сервера
 * @param opts.agree согласие на исследование на закрывающем экране
 * @param opts.openText текст открытого ответа
 * @param opts.onStep вызывается со слагом каждого пройденного экрана
 * @param opts.pick какой вариант выбирать на экране со списком: (n, i) =>
 *   индекс. По умолчанию i % n — разные ответы на разных экранах. Нужен
 *   тем проверкам, которым важно получить РАЗНЫЕ архетипы за два прохода:
 *   без него оба прохода отвечают одинаково и дают один архетип.
 * @returns список пройденных слагов
 */
export async function walkQuiz(page, {
  base = process.env.BASE_URL ?? 'http://localhost:3000',
  agree = true,
  openText = 'smells like my grandmother kitchen',
  onStep = null,
  pick = (n, i) => i % n,
} = {}) {
  await page.goto(`${base}/en/quiz/q-gender`, { waitUntil: 'networkidle' });

  const visited = [];
  for (let i = 0; i < 30; i += 1) {
    const url = page.url();
    if (url.includes('/result/')) break;
    const slug = url.split('/').pop();
    visited.push(slug);
    if (onStep) await onStep(slug, page);

    // Механики подгружаются отдельным куском (ssr: false), поэтому сразу
    // после смены адреса на экране ещё ничего нет.
    await page.locator(ANY_ANSWER).first().waitFor({ timeout: 10000 });

    const tagged = await page.locator('button[data-answer]').count();
    const slider = await page.locator('[role="slider"]').count();
    const listbox = await page.locator('[role="listbox"]').count();
    const search = await page.locator('#country-search').count();
    const open = await page.locator('textarea').count();

    if (search) {
      await page.locator('#country-search').fill('Fra');
      await page.locator('[role="option"] button').first().click();
    } else if (open) {
      await page.locator('textarea').fill(openText);
      // Две кнопки — согласие на исследование, а не отправка и пропуск.
      await page.getByRole('button', {
        name: agree ? 'Agree & continue' : 'Disagree & continue',
        exact: true,
      }).click();
    } else if (slider) {
      // Флакон: поднять уровень и подтвердить. До первой тяги кнопка
      // подтверждения намеренно недоступна.
      await page.locator('[role="slider"]').focus();
      await page.keyboard.press('End');
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /CONFIRM/ }).click();
    } else if (listbox) {
      // Барабан: выбрать слово, которое стоит в окне.
      await page.locator('[role="listbox"]').focus();
      await page.keyboard.press('Enter');
    } else if (tagged) {
      await page.locator('button[data-answer]').nth(pick(tagged, i) % tagged).click();
    } else {
      const options = page.locator('ul li button');
      const n = await options.count();
      if (!n) throw new Error(`нет вариантов на ${slug}`);
      await options.nth(pick(n, i) % n).click();
    }

    /* 15 секунд, а не 5. Экраны с механиками уходят дальше не сразу:
       варианты на Q_DAYTDAY сначала долетают (до 1.2 с) и только потом
       становятся нажимаемыми, выбранный рассыпается в пыль (0.9 с),
       строки Q_STAYWELL уезжают за экран (0.8 с), карточка поколения
       держит паузу 0.6 с, клип Q_GENDER — свою. Плюс dev-сервер собирает
       маршрут при первом заходе. */
    await page.waitForFunction((prev) => location.href !== prev, url, { timeout: 15000 });
  }

  return visited;
}
