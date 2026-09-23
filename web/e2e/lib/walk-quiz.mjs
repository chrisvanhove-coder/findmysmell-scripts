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
 * @param opts.touch пальцем, а не мышью. На вопросах с фотографиями
 *   (Q_ATMOS и другие) устройство без наведения устроено так: первое
 *   касание ПОКАЗЫВАЕТ снимок места и подсказку «Tap again to choose», и
 *   только второе выбирает — так было и на старом сайте, иначе
 *   фотографию на телефоне не увидел бы никто. Одиночного нажатия там
 *   не хватает, и проход вставал бы на таймауте. Включать для мобильных
 *   проверок.
 * @returns список пройденных слагов
 */
/**
 * Второе касание там, где его требует вопрос с фотографиями.
 * Ждём подсказку, которую экран показывает после первого касания, и
 * только тогда касаемся снова: так проверка идёт за видимым состоянием
 * экрана, а не вслепую жмёт дважды — лишнее нажатие на обычном варианте
 * выбрало бы соседний ответ на следующем экране.
 */
async function tapAgain(page, option) {
  const hint = page.getByText('Tap again to choose', { exact: true });
  try {
    await hint.waitFor({ state: 'visible', timeout: 1200 });
  } catch {
    return; // подсказки нет — обычный вариант, выбран с первого раза
  }
  await option.click();
}

export async function walkQuiz(page, {
  base = process.env.BASE_URL ?? 'http://localhost:3000',
  agree = true,
  openText = 'smells like my grandmother kitchen',
  onStep = null,
  pick = (n, i) => i % n,
  touch = false,
} = {}) {
  await page.goto(`${base}/en`, { waitUntil: 'networkidle' });
  await page.locator('a[href="/en/quiz/q-gender"]').first().click();
  await page.waitForURL('**/quiz/q-gender');

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
    /** Код выбранного варианта — нужен, чтобы узнать «Other». */
    let code = null;

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
      const chosen = page.locator('button[data-answer]').nth(pick(tagged, i) % tagged);
      code = await chosen.getAttribute('data-answer');
      await chosen.click();
      await tapAgain(page, chosen);
    } else {
      const options = page.locator('ul li button');
      const n = await options.count();
      if (!n) throw new Error(`нет вариантов на ${slug}`);
      const chosen = options.nth(pick(n, i) % n);
      // id кнопки — `answer-<КОД>`: по нему видно, открывает ли этот
      // вариант окошко «Other».
      code = (await chosen.getAttribute('id'))?.replace(/^answer-/, '') ?? null;
      await chosen.click();
      await tapAgain(page, chosen);
    }

    /* Вариант «Other» открывает окошко и просит написать своё. Пока в
       нём не написано, вопрос не отвечен и экран не сменится — то есть
       без этого шага проход встал бы здесь на таймауте.
       Ждём окошко только на таких вариантах: ждать его на каждом экране
       значило бы добавлять паузу ко всем двадцати трём. */
    if (code?.endsWith('__OTHER')) {
      const input = page.locator('[data-open-answer] #open-answer-input');
      await input.waitFor({ timeout: 5000 });
      await input.fill(openText);
      await page.locator('#open-answer-submit').click();
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
