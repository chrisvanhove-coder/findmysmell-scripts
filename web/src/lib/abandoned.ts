'use client';

import {
  loadAnswers, loadOpenText, loadQuestionOpens, loadResearchConsent,
  runToken, revision, wasSent, browserKey, submissionRunIndex,
} from './answers-store';
import type { Locale } from './i18n';

/**
 * Брошенное прохождение — то, что человек успел ответить, прежде чем уйти.
 *
 * ЗАЧЕМ. В воронке уже видно, НА КАКОМ вопросе люди уходят: она считает
 * показы и ответы по каждому шагу. Чего в ней нет — ЧТО именно успели
 * ответить те, кто ушёл: это счётчики, а не наборы ответов. Заказчица
 * попросила сохранять и их.
 *
 * КОГДА ОТПРАВЛЯЕТСЯ. Только когда страница уходит из-под человека:
 * `pagehide` (закрытие вкладки, переход на другой сайт, назад в историю) и
 * `visibilitychange` в hidden (телефон свернули, переключили вкладку) —
 * второе на мобильных часто единственное, что вообще успевает случиться.
 * Переходы между вопросами внутри сайта роутером эти события НЕ вызывают,
 * так что на каждый вопрос запроса не будет.
 *
 * ЧЕМ ОТПРАВЛЯЕТСЯ. sendBeacon: браузер доставляет его уже после того, как
 * страница закрылась. Ответ прочитать нельзя, поэтому отметки «сохранено»
 * такая отправка не ставит — она всегда «по возможности». Настоящая
 * отправка результата (RecordSubmission) остаётся как была.
 *
 * ЧТО ЭТО НЕ ЛОМАЕТ. Строка живёт под тем же clientToken, что и итоговая, и
 * версия у неё меньше: когда человек вернётся и дойдёт до конца, итоговая
 * отправка перезапишет ту же строку, а брошенная не воскреснет — этим
 * занимается setWhere по revision в /api/submissions.
 *
 * СОГЛАСИЕ. Галочку про исследование показывают на последнем экране, и
 * брошенное прохождение до неё не дошло. Поэтому уходит false — «согласия
 * нет», и в исследование такая запись не идёт, ровно как отказ. Отличить
 * «не спрашивали» от «отказался» можно по `completed` (см. schema.ts).
 */

/** Последняя версия, которую уже отправляли: не шлём одно и то же дважды. */
let sentRevision: number | null = null;

/** Отправляет то, что накопилось, если это имеет смысл. */
export function sendAbandonedRun(locale: Locale): void {
  if (typeof window === 'undefined') return;

  const answers = loadAnswers();
  // Нечего сохранять — человек ушёл, не ответив ни на что.
  if (Object.keys(answers).length === 0) return;
  /* Уже подтверждено сервером — трогать нечего. Это единственное условие:
     полнота ответов тут не проверяется НАРОЧНО. Человек, ответивший на все
     вопросы и ушедший с последнего экрана, не нажав ни «Agree», ни
     «Disagree», до страницы результата не доходит — и раньше его ответы
     пропадали целиком, хотя это самый полный из брошенных наборов. */
  if (wasSent()) return;

  const version = revision();
  if (sentRevision === version) return;
  sentRevision = version;

  const body = JSON.stringify({
    locale,
    answers,
    openAnswer: loadOpenText(),
    questionOpens: loadQuestionOpens(),
    // Согласия ещё не спрашивали — значит его нет. См. заголовок файла.
    consentResearch: loadResearchConsent() ?? false,
    clientToken: runToken(),
    revision: version,
    browserKey: browserKey(),
    runIndex: submissionRunIndex(),
  });

  try {
    // Blob с типом: без него часть браузеров отправляет text/plain,
    // и роут не распознаёт JSON. Тот же приём, что в lib/funnel.ts.
    navigator.sendBeacon?.('/api/submissions', new Blob([body], { type: 'application/json' }));
  } catch {
    // Уходящая страница не место для обработки ошибок: человек уже ушёл.
  }
}

/**
 * Вешает отправку на уход со страницы. Возвращает снятие — для useEffect.
 */
export function watchForAbandon(locale: Locale): () => void {
  const onHide = () => sendAbandonedRun(locale);
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') sendAbandonedRun(locale);
  };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
