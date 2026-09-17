'use client';

import { useSyncExternalStore } from 'react';

/**
 * Просит ли человек убрать движение.
 *
 * ПОЧЕМУ ЧЕРЕЗ useSyncExternalStore, А НЕ useState В useEffect. Через
 * состояние в эффекте ответ появляется только ПОСЛЕ первой отрисовки, и
 * один кадр экран живёт как будто движение разрешено. На вопросах с
 * клипами это не косметика: за этот кадр браузер успевает начать
 * скачивать видео, которое человек просил не проигрывать. Поймано
 * проверкой e2e:skin — при prefers-reduced-motion в сеть всё равно
 * уходил один клип флакона.
 *
 * На сервере отвечаем «движение разрешено»: механики всё равно
 * подключаются с ssr: false, а первый клиентский снимок уже настоящий.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

const now = () => window.matchMedia(QUERY).matches;
const onServer = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, now, onServer);
}
