'use client';

import { useEffect } from 'react';
import type { Locale } from '@/lib/i18n';
import {
  loadAnswers,
  loadOpenText,
  loadResearchConsent,
  runToken,
  wasSent,
  markSent,
} from '@/lib/answers-store';

/**
 * Отправляет прохождение в базу — один раз за проход.
 *
 * Ничего не рисует. Отдельным компонентом, а не внутри ResultMatch, потому
 * что это не про подбор флакона: подбор влияет на разметку, а это побочный
 * эффект, который не должен мешать показу результата.
 *
 * Почему на клиенте: ответы живут только в браузере, сервер их не видит.
 * Почему безопасно: победитель и баллы пересчитываются на сервере из ответов,
 * присланным значениям он не верит (см. src/lib/submission.ts).
 */
export default function RecordSubmission({ locale }: { locale: Locale }) {
  useEffect(() => {
    // Согласие записывается на последнем экране квиза. Если его нет вовсе,
    // человек до конца не дошёл — скорее всего пришёл по ссылке на чужой
    // результат. Такое прохождение не наше.
    const consent = loadResearchConsent();
    if (consent === null) return;

    if (wasSent()) return;

    const answers = loadAnswers();
    if (!('Q_RADIUS' in answers)) return;

    // Флаг ставим до запроса: в dev StrictMode эффект выполняется дважды,
    // и второй проход должен увидеть, что отправка уже начата.
    // От потери самого флага защищает уникальный clientToken на сервере.
    markSent();

    // Запрос намеренно не отменяется при размонтировании и идёт с keepalive:
    // человек может уйти со страницы сразу, прохождение всё равно должно
    // доехать. Отмена в cleanup здесь бы его просто теряла.
    fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale,
        answers,
        openAnswer: loadOpenText(),
        consentResearch: consent,
        clientToken: runToken(),
      }),
      keepalive: true,
    }).catch(() => {
      // Аналитика не должна ничего ломать. Человек уже видит свой архетип.
    });
  }, [locale]);

  return null;
}
