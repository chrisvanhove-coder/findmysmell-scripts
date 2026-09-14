'use client';

import type { ArchetypeKey } from './archetype-colors';
import { loadAnswers } from './answers-store';
import { match, preferencesFrom, emotionBiasFrom, type Match } from './matching';

/**
 * Подбор флакона по ответам, которые лежат в браузере.
 *
 * Живёт отдельным модулем, потому что нужен в двух местах: страница
 * результата показывает подобранный флакон, а форма подписки отправляет
 * его вместе с адресом, чтобы письмо могло назвать конкретный парфюм.
 * Две копии этой логики рано или поздно разошлись бы — здесь она одна.
 *
 * Оси можно подменить через адрес (?s=0&r=1&p=2&emo=cozy), чтобы смотреть
 * подбор без прохождения квиза.
 *
 * Возвращает null, если квиз не пройден: звать не из чего.
 */
export function pickFromBrowser(archetype: ArchetypeKey): Match | null {
  const sp = new URLSearchParams(window.location.search);
  const axis = (k: string) => {
    const n = Number(sp.get(k));
    return sp.has(k) && Number.isInteger(n) && n >= 0 && n <= 3 ? n : null;
  };
  const s = axis('s');
  const r = axis('r');
  const p = axis('p');
  const emo = sp.get('emo');

  const answers = loadAnswers();
  const prefs =
    s !== null && r !== null && p !== null
      ? { sweet: s, raw: r, projection: p }
      : preferencesFrom(answers);
  if (!prefs) return null;

  const bias = emo
    ? emotionBiasFrom({ Q_EMO: `Q_EMO__${emo.toUpperCase()}` })
    : emotionBiasFrom(answers);

  return match(archetype, prefs, bias);
}
