'use client';

import { useEffect, useRef, useState } from 'react';
import type { ArchetypeKey } from '@/lib/archetype-colors';
import vinyl from '@/data/vinyl.json';
import styles from './vinyl.module.css';

/**
 * Винил-плеер в углу: у каждого архетипа своя музыка.
 * Порт initFloatingVinyl из result48.js — пластинка, тонарм, подпись.
 *
 * Отличия от прода, оба намеренные:
 *
 * 1. Крупнее и заметнее. В проде подпись «press play» была почти
 *    невидимой (прозрачность 0.35, 9px), и заказчик отдельно просила,
 *    чтобы было понятно, что сюда надо нажимать.
 * 2. Это <button>, а не <div> с обработчиком: элемент управления должен
 *    работать с клавиатуры и объявляться экранным диктором.
 */

const DATA = vinyl as Record<string, { color: string; track: string }>;

export default function VinylPlayer({ archetype }: { archetype: ArchetypeKey }) {
  const entry = DATA[archetype];
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Аудио создаётся при первом нажатии: браузеры всё равно не дают
  // запустить звук без действия человека, а лишний запрос за файлом
  // на загрузке страницы никому не нужен.
  const toggle = () => {
    if (!entry) return;
    if (!audioRef.current) {
      const audio = new Audio(entry.track);
      audio.loop = true;
      audio.volume = 0.4;
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    // Показываем «играет» сразу, не дожидаясь загрузки файла: иначе на
    // медленной сети нажатие выглядит так, будто кнопка сломана. Если
    // воспроизведение не началось — возвращаем как было, и человек
    // видит, что ничего не вышло, вместо вечно крутящейся пластинки.
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));
  };

  // Уходя со страницы, звук выключаем.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (!entry) return null;

  return (
    <button
      type="button"
      className={styles.player}
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? 'Pause the music' : 'Play the music'}
    >
      <span className={`${styles.arm} ${playing ? styles.armPlaying : ''}`} aria-hidden="true" />
      <span className={`${styles.record} ${playing ? styles.spinning : ''}`} aria-hidden="true">
        <span className={styles.label} style={{ background: entry.color }} />
        <span className={styles.hole} />
      </span>
      <span className={styles.status} aria-hidden="true">
        ♪ {playing ? 'playing' : 'press play'}
      </span>
    </button>
  );
}
