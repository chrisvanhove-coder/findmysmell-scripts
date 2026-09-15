'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cld } from '@/lib/cloudinary';
import {
  drawShareCard,
  punchFits,
  FALLBACK_FONTS,
  type CardArch,
  type CardContent,
  type CardFonts,
} from '@/lib/share-card';
import { pickFromBrowser } from '@/lib/picked-client';
import type { Locale } from '@/lib/i18n';
import type { ArchetypeKey } from '@/lib/archetype-colors';
import styles from './share-card.module.css';

/**
 * Шеринговая карточка. Всплывает, когда человек дочитал результат
 * до конца — так это и было задумано в проде.
 *
 * ЧТО ЭТО НЕ ТАКОЕ. Это не письмо с результатом. Заказчица уже поправила
 * меня на этот счёт: письмо — полный результат для себя, карточка — одна
 * картинка, чтобы её отправили другому. Поэтому здесь нет ни шкал, ни
 * ингредиентов, ни описаний: только то, что заставит отметить друга.
 *
 * ПУТЬ ОБРАТНО. Внутри картинки ссылки нет и быть не может — это png.
 * Единственный путь назад это напечатанный домен, то есть главная. Там
 * стоит «сначала пройдите тест», а не чужой результат, и ссылок на
 * результаты с главной нет ни на одной локали. Это условие карточки,
 * а не отдельная задача.
 *
 * КАРКАС. Дизайн внутри картинки заказчица будет менять вместе со мной;
 * вся геометрия лежит в LAYOUT в lib/share-card.ts.
 */

interface Copy {
  title: string;
  hint: string;
  save: string;
  saving: string;
  share: string;
  close: string;
  alt: string;
}

const COPY: Record<Locale, Copy> = {
  en: {
    title: 'Share your scent',
    hint: 'Save it, post it, tag the friend it is about.',
    save: 'Save image',
    saving: 'Saving…',
    share: 'Share',
    close: 'Close',
    alt: 'Your share card',
  },
  fr: {
    title: 'Partagez votre parfum',
    hint: 'Enregistrez-la, publiez-la, identifiez l’ami·e concerné·e.',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    share: 'Partager',
    close: 'Fermer',
    alt: 'Votre carte à partager',
  },
  ru: {
    title: 'Share your scent',
    hint: 'Save it, post it, tag the friend it is about.',
    save: 'Save image',
    saving: 'Saving…',
    share: 'Share',
    close: 'Close',
    alt: 'Your share card',
  },
};

/* Умеет ли браузер отдавать файл в родной шеринг. Это свойство среды, а
   не состояние React, поэтому читается снимком, а не setState в эффекте:
   на сервере false, в браузере — как есть, и разметка при гидрации
   совпадает. */
const noSubscribe = () => () => {};
const canShareNow = () =>
  typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
const canShareOnServer = () => false;

/** Имена шрифтов, которые страница действительно загрузила. */
function pageFonts(): CardFonts {
  try {
    const s = getComputedStyle(document.documentElement);
    const pick = (name: string, fallback: string) =>
      s.getPropertyValue(name).trim() || fallback;
    return {
      display: pick('--fms-sans', FALLBACK_FONTS.display),
      mono: pick('--fms-mono', FALLBACK_FONTS.mono),
      serif: pick('--fms-serif', FALLBACK_FONTS.serif),
    };
  } catch {
    return FALLBACK_FONTS;
  }
}

export default function ShareCard({
  locale,
  archetype,
  arch,
  punch,
  tagLine,
  fallbackName,
  fallbackHouse,
  fallbackImg,
}: {
  locale: Locale;
  archetype: string;
  arch: CardArch;
  punch: Array<[string, number]>;
  tagLine: string;
  fallbackName: string;
  fallbackHouse: string;
  fallbackImg: string;
}) {
  const copy = COPY[locale];
  const canShare = useSyncExternalStore(noSubscribe, canShareNow, canShareOnServer);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  // Закрыл — больше не показываем сам. Открыть можно кнопкой.
  const dismissed = useRef(false);

  /* Всплывает при прокрутке до конца. IntersectionObserver, а не слушатель
     scroll: он не считает ничего, пока метка не попала в кадр. */
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // Без rootMargin намеренно. Отрицательный нижний отступ поджимает
    // низ области наблюдения — а метка стоит САМОЙ ПОСЛЕДНЕЙ на странице,
    // и тогда она не попадает в кадр никогда, сколько ни прокручивай.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !dismissed.current) setOpen(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Флакон выбирается тем же помощником, что и на странице результата,
     иначе на карточке однажды окажется не тот парфюм, что в результате. */
  const content: CardContent = (() => {
    const picked = typeof window === 'undefined'
      ? null
      : pickFromBrowser(archetype as ArchetypeKey)?.main ?? null;
    const name = picked?.name ?? fallbackName;
    const img = picked?.imageUrl ?? fallbackImg;

    // ДОМ ПОКАЗЫВАЕМ ТОЛЬКО ВЫВЕРЕННЫЙ. Поле house в perfumes.json — слаг
    // из Webflow, и он не просто некрасивый: у семи позиций он называет
    // другой парфюм, а у четырёх чужой дом (подробности в 9.7 HANDOFF).
    // Страница результата его поэтому не показывает; на карточке, которую
    // публикуют, ошибка была бы тем хуже. Берём выверенный дом из
    // archetypes.*.json и только если подобрался именно тот флакон.
    const house = name === fallbackName ? fallbackHouse : '';

    return {
      punch,
      tagLine,
      perfumeName: name,
      perfumeHouse: house,
      // 680px под слот 340px: холст рисуется в двойном размере.
      bottleImg: cld(img, 'bottleMain'),
    };
  })();

  const draw = useCallback(async () => {
    const el = canvas.current;
    if (!el) return;
    // Ждём шрифты: без этого canvas нарисует панчлайн подстановочным
    // шрифтом, и сохранённая картинка будет не та, что на экране.
    try { await document.fonts.ready; } catch { /* не критично */ }
    await drawShareCard(el, arch, content, pageFonts());
    setDrawn(true);
  }, [arch, content]);

  useEffect(() => {
    if (!open || drawn) return;
    void draw();
  }, [open, drawn, draw]);

  const filename = `findmysmell-${archetype.toLowerCase()}.png`;

  const blob = useCallback(
    () => new Promise<Blob | null>((resolve) => {
      const el = canvas.current;
      if (!el) { resolve(null); return; }
      el.toBlob((b) => resolve(b), 'image/png');
    }),
    [],
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const b = await blob();
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      // Освобождаем не сразу: Safari успевает начать скачивание.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setSaving(false);
    }
  }, [blob, filename]);

  /* Родной шеринг там, где он есть: на телефоне это отправка в мессенджер
     одним касанием, а не «сохранить и найти в галерее». */
  const share = useCallback(async () => {
    const b = await blob();
    if (!b) return;
    const file = new File([b], filename, { type: 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) { void save(); return; }
    try {
      await navigator.share({ files: [file], text: tagLine });
    } catch {
      /* человек передумал — это не ошибка */
    }
  }, [blob, filename, save, tagLine]);

  const close = useCallback(() => {
    dismissed.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <>
      {/* Метка конца страницы. Ничего не рисует. */}
      <div ref={sentinel} className={styles.sentinel} aria-hidden />

      {/* Кнопка на случай, если карточку закрыли, а потом передумали. */}
      <button
        type="button"
        className={styles.reopen}
        onClick={() => { dismissed.current = false; setOpen(true); }}
        hidden={open}
      >
        {copy.share}
      </button>

      {open && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={copy.title}>
          <div className={styles.box} data-share-card>
            <button
              type="button"
              className={styles.close}
              onClick={close}
              aria-label={copy.close}
            >
              ✕
            </button>
            <p className={styles.title}>{copy.title}</p>
            <canvas
              ref={canvas}
              className={styles.canvas}
              role="img"
              aria-label={copy.alt}
            />
            <p className={styles.hint}>{copy.hint}</p>
            <div className={styles.actions}>
              {canShare && (
                <button type="button" className={styles.btn} onClick={() => void share()} disabled={!drawn}>
                  {copy.share}
                </button>
              )}
              <button type="button" className={styles.btn} onClick={() => void save()} disabled={!drawn || saving}>
                {saving ? copy.saving : copy.save}
              </button>
            </div>
            {/* Если панчлайн однажды перестанет влезать, это видно сразу,
                а не после того, как карточку опубликуют обрезанной. */}
            {!punchFits(punch) && (
              <p className={styles.warn}>
                Панчлайн не влезает в полосу — поправьте кегли в punch-lines.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
