'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cldVideo, cldPoster } from '@/lib/cloudinary';
import data from '@/data/gender-videos.json';
import styles from './gender-videos.module.css';
import type { MechanicProps } from './mechanics';

/**
 * Q_GENDER — первый вопрос квиза. Перенесено из q-gender.footer.html.
 *
 * Заказчица: «На первом вопросе где видео анимация и где layout который
 * у меня сейчас на моем реальном сайте?» — она права, у меня здесь стоял
 * обычный список кнопок.
 *
 * Приём. На широком экране экран поделён пополам: слева клип, справа
 * вопрос и три варианта строками с разделителями. Наведение на вариант
 * меняет клип слева (переход 0.8 с) и приглушает остальные строки до
 * 0.25. На телефоне клипа слева нет: экран — три полосы по 26dvh, в
 * каждой свой клип под текстом с прозрачностью 0.45 и градиентом сверху.
 *
 * ЧИСЛА ПРОДА СОХРАНЕНЫ: панель 50/50, переход клипа 0.8 с, приглушение
 * 0.25, первый клип показывается через 300 мс после открытия, на
 * телефоне полосы по 26dvh, видео 0.45, градиент чёрный 0.7 → прозрачный
 * к 60%, кегли 15px вопрос / 14px подпись / 10px уточнение.
 *
 * ЧТО ИСПРАВЛЕНО ПРОТИВ ПРОДА.
 *
 * 1. ВЕС. Три клипа 1920×1080 отдавались БЕЗ трансформаций, и все три
 *    с preload="auto" — 30.7 МБ на самом первом экране квиза. Замеры
 *    explicit API: feminine 9 992 535 → 524 459 (19×), masculine
 *    12 084 057 → 325 176 на телефонной ширине (37×). Плюс сразу
 *    грузится только первый клип, остальные — по наведению.
 * 2. Варианты были div'ами с обработчиком click: ни клавиатуры, ни
 *    читалки. Здесь список настоящих кнопок.
 * 3. Текст варианта лежал в разметке ДВА РАЗА: один раз в оверлее для
 *    телефона, второй — прямо в блоке для широкого экрана, и лишний
 *    прятался через CSS. Читалка читала оба. Здесь он один.
 * 4. prefers-reduced-motion: видео не запускается вовсе, вместо него
 *    первый кадр картинкой. Три автоплеящихся клипа — это именно то,
 *    от чего эта настройка защищает.
 * 5. На телефоне прод играл ТРИ клипа 1080p одновременно. Клипы те же,
 *    но в телефонном размере, и первый кадр стоит poster'ом, поэтому
 *    полосы не пустые, пока видео не началось.
 * 6. Своё зерно на странице убрано: оно теперь общее.
 */

interface Option {
  code: string;
  label: string;
  sub: string;
  video: string;
}

const OPTIONS = data.options as Option[];

/** Первый клип показывается не сразу — как в проде. */
const FIRST_VIDEO_MS = 300;

/* Узкий экран определяем так же, как прод: по отсутствию наведения. */
const hoverSubscribe = (cb: () => void) => {
  const mq = window.matchMedia('(hover: none), (max-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const narrowNow = () => window.matchMedia('(hover: none), (max-width: 768px)').matches;
const narrowOnServer = () => false;

export default function GenderVideos({ onChoose }: MechanicProps) {
  const narrow = useSyncExternalStore(hoverSubscribe, narrowNow, narrowOnServer);
  const [still, setStill] = useState(false);
  const [looking, setLooking] = useState<string | null>(null);
  /** Какие клипы уже разрешено грузить: сразу только первый. */
  const [loaded, setLoaded] = useState<string[]>([OPTIONS[0].code]);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStill(mq.matches);
    const onChange = () => setStill(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* Первый клип проявляется через 300 мс — как в проде. */
  useEffect(() => {
    if (narrow || still) return;
    const id = setTimeout(() => setLooking((cur) => cur ?? OPTIONS[0].code), FIRST_VIDEO_MS);
    return () => clearTimeout(id);
  }, [narrow, still]);

  /* Наведение переключает клип: играет только видимый. */
  useEffect(() => {
    if (narrow || still) return;
    for (const o of OPTIONS) {
      const v = videos.current[o.code];
      if (!v) continue;
      if (o.code === looking) v.play().catch(() => {});
      else v.pause();
    }
  }, [looking, narrow, still]);

  function look(code: string) {
    setLooking(code);
    // Клип этого варианта грузим, только когда на него посмотрели.
    setLoaded((cur) => (cur.includes(code) ? cur : [...cur, code]));
  }

  const preset = narrow ? 'quizVideoMobile' : 'quizVideo';

  return (
    <div className={styles.stage} data-gender-videos="">
      {/* Клип на полэкрана. На телефоне эта панель скрыта. */}
      <div className={styles.videoPanel} aria-hidden="true">
        {OPTIONS.map((o) => {
          const on = looking === o.code;
          return still ? (
            /* eslint-disable-next-line @next/next/no-img-element --
               кадр уже приходит из Cloudinary в нужном размере и формате
               (so_0/c_limit/f_jpg/q_auto); next/image прогнал бы его
               через свой оптимизатор второй раз, без выигрыша. */
            <img
              key={o.code}
              className={on ? `${styles.video} ${styles.videoOn}` : styles.video}
              src={cldPoster(o.video)}
              alt=""
              data-video-still={o.code}
            />
          ) : (
            <video
              key={o.code}
              ref={(el) => { videos.current[o.code] = el; }}
              className={on ? `${styles.video} ${styles.videoOn}` : styles.video}
              /* Клип подставляется только когда разрешён: иначе браузер
                 начнёт тянуть все три сразу, как в проде. И только на
                 широком экране: на телефоне эта панель скрыта, но без
                 проверки браузер всё равно скачивал бы широкий клип
                 вдобавок к телефонному. Поймано замером запросов. */
              src={!narrow && loaded.includes(o.code)
                ? cldVideo(o.video, 'quizVideo') : undefined}
              poster={cldPoster(o.video)}
              muted
              loop
              playsInline
              preload={o.code === OPTIONS[0].code ? 'auto' : 'metadata'}
              data-video={o.code}
            />
          );
        })}
      </div>

      <div className={styles.contentPanel}>
        <h1 className={styles.question}>{data.question}</h1>
        {/* Подсказка про касание — на телефоне. */}
        <p className={styles.hint}>{data.hint}</p>

        <ul className={styles.options}>
          {OPTIONS.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                className={[
                  styles.option,
                  looking && looking !== o.code ? styles.dimmed : '',
                ].filter(Boolean).join(' ')}
                data-answer={o.code}
                onMouseEnter={() => look(o.code)}
                onMouseLeave={() => setLooking(null)}
                onFocus={() => look(o.code)}
                onBlur={() => setLooking(null)}
                onClick={() => onChoose(o.code)}
              >
                {/* Клип под текстом — только на телефоне. Тот же файл,
                    но в телефонном размере. */}
                {still ? (
                  /* eslint-disable-next-line @next/next/no-img-element --
                     см. выше: размер и формат задаёт Cloudinary. */
                  <img
                    className={styles.optionMedia}
                    src={cldPoster(o.video, 720)}
                    alt=""
                    aria-hidden="true"
                  />
                ) : (
                  <video
                    className={styles.optionMedia}
                    src={narrow ? cldVideo(o.video, preset) : undefined}
                    poster={cldPoster(o.video, 720)}
                    autoPlay={narrow}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                    data-option-video={o.code}
                  />
                )}
                <span className={styles.optionText}>
                  <span className={styles.label}>{o.label}</span>
                  <span className={styles.sub}>{o.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
