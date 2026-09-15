'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  CONSENT_KEY,
  makeConsent,
  parseConsent,
  screenFor,
  shouldLoadTracker,
  type Decision,
} from '@/lib/consent';
import {
  browserServerSnapshot,
  browserSnapshot,
  consentServerSnapshot,
  consentSnapshot,
  mountedServerSnapshot,
  mountedSnapshot,
  mountedSubscribe,
  notifyConsentChanged,
  parseBrowserSnapshot,
  subscribeConsent,
} from '@/lib/consent-store';
import { forgetBrowser } from '@/lib/answers-store';
import type { Locale } from '@/lib/i18n';
import styles from './consent.module.css';

/* Тексты. Оба языка сразу: панель обязана быть на языке страницы. */

interface Copy {
  open: string;
  bannerTitle: string;
  bannerBody: string;
  accept: string;
  refuse: string;
  more: string;
  panelTitle: string;
  close: string;
  noCookies: string;
  measureTitle: string;
  measureBody: string;
  keyTitle: string;
  keyPresent: (runs: number) => string;
  keyAbsent: string;
  keyBody: string;
  forget: string;
  forgotten: string;
  trackerTitle: string;
  trackerState: (d: Decision) => string;
  change: (d: Decision) => string;
  policy: string;
}

const COPY: Record<Locale, Copy> = {
  en: {
    open: 'Cookies & data',
    bannerTitle: 'Analytics',
    bannerBody:
      'We would like to load Google Analytics to see how the site is used. It sets cookies '
      + 'and sends data to Google. It is off until you say yes, and the quiz works exactly '
      + 'the same either way.',
    accept: 'Allow analytics',
    refuse: 'No thanks',
    more: 'What we already measure',
    panelTitle: 'Cookies & data',
    close: 'Close',
    noCookies: 'This site sets no cookies.',
    measureTitle: 'What we measure',
    measureBody:
      'Our own server counts which quiz question you reached, which one you answered, and '
      + 'which option you chose. These counters carry no IP address, no browser or device '
      + 'details, no referrer, no location and no free text, and they are deleted after '
      + '13 months. Your answers themselves — including anything you write in your own '
      + 'words at the end — are saved separately with your completed run, which is what '
      + 'the research is about. Nothing goes to any other company.',
    keyTitle: 'This browser',
    keyPresent: (runs) =>
      runs > 1
        ? `Your browser holds a random number so a repeat run is not counted as a new person. It has sent ${runs} runs.`
        : 'Your browser holds a random number so a repeat run is not counted as a new person.',
    keyAbsent: 'Your browser holds no number yet. One appears when you finish the quiz.',
    keyBody:
      'It expires after 13 months. It identifies a browser, not you: the same person on a '
      + 'phone and a laptop counts as two. Clearing it makes your next run count as a first '
      + 'run. Runs you already sent stay in our database — they are anonymous and there is '
      + 'nothing in them that points back to you, so we cannot find them to delete.',
    forget: 'Forget this browser',
    forgotten: 'Done — this browser is forgotten.',
    trackerTitle: 'Analytics',
    trackerState: (d) =>
      d === 'granted' ? 'Google Analytics: allowed.' : 'Google Analytics: refused.',
    change: (d) => (d === 'granted' ? 'Turn it off' : 'Allow it'),
    policy: 'Privacy Policy',
  },
  fr: {
    open: 'Cookies et données',
    bannerTitle: 'Mesure d’audience',
    bannerBody:
      'Nous souhaiterions charger Google Analytics pour voir comment le site est utilisé. '
      + 'Cet outil dépose des cookies et transmet des données à Google. Il reste désactivé '
      + 'tant que vous n’avez pas accepté, et le questionnaire fonctionne de la même '
      + 'façon dans les deux cas.',
    accept: 'Autoriser',
    refuse: 'Non merci',
    more: 'Ce que nous mesurons déjà',
    panelTitle: 'Cookies et données',
    close: 'Fermer',
    noCookies: 'Ce site ne dépose aucun cookie.',
    measureTitle: 'Ce que nous mesurons',
    measureBody:
      'Notre propre serveur compte à quelle question vous êtes arrivé, à laquelle vous avez '
      + 'répondu et quelle option vous avez choisie. Ces compteurs ne contiennent ni '
      + 'adresse IP, ni navigateur ou appareil, ni page d’origine, ni localisation, ni '
      + 'texte libre, et ils sont supprimés au bout de 13 mois. Vos réponses elles-mêmes '
      + '— y compris ce que vous écrivez avec vos propres mots à la fin — sont conservées '
      + 'séparément avec votre passage terminé : c’est l’objet de la recherche. Rien '
      + 'n’est transmis à une autre société.',
    keyTitle: 'Ce navigateur',
    keyPresent: (runs) =>
      runs > 1
        ? `Votre navigateur conserve un nombre aléatoire pour qu’un passage répété ne soit pas compté comme une nouvelle personne. Il a envoyé ${runs} passages.`
        : 'Votre navigateur conserve un nombre aléatoire pour qu’un passage répété ne soit pas compté comme une nouvelle personne.',
    keyAbsent:
      'Votre navigateur ne conserve encore aucun nombre. Il apparaît lorsque vous terminez '
      + 'le questionnaire.',
    keyBody:
      'Il expire au bout de 13 mois. Il identifie un navigateur, pas vous : la même personne '
      + 'sur un téléphone et sur un ordinateur compte pour deux. En l’effaçant, votre '
      + 'prochain passage comptera de nouveau comme un premier. Les passages déjà envoyés '
      + 'restent dans notre base — ils sont anonymes et rien en eux ne renvoie à vous, nous '
      + 'ne pouvons donc pas les retrouver pour les supprimer.',
    forget: 'Oublier ce navigateur',
    forgotten: 'C’est fait — ce navigateur est oublié.',
    trackerTitle: 'Mesure d’audience',
    trackerState: (d) =>
      d === 'granted' ? 'Google Analytics : autorisé.' : 'Google Analytics : refusé.',
    change: (d) => (d === 'granted' ? 'Désactiver' : 'Autoriser'),
    policy: 'Politique de confidentialité',
  },
  ru: {
    open: 'Cookies & data',
    bannerTitle: 'Analytics',
    bannerBody:
      'We would like to load Google Analytics to see how the site is used. It sets cookies '
      + 'and sends data to Google. It is off until you say yes.',
    accept: 'Allow analytics',
    refuse: 'No thanks',
    more: 'What we already measure',
    panelTitle: 'Cookies & data',
    close: 'Close',
    noCookies: 'This site sets no cookies.',
    measureTitle: 'What we measure',
    measureBody:
      'Our own server counts which quiz question you reached and which option you chose. '
      + 'These counters carry no IP address, no device details and no free text. Your '
      + 'answers themselves are saved with your completed run. Nothing goes to any other '
      + 'company.',
    keyTitle: 'This browser',
    keyPresent: () =>
      'Your browser holds a random number so a repeat run is not counted as a new person.',
    keyAbsent: 'Your browser holds no number yet.',
    keyBody: 'It expires after 13 months. It identifies a browser, not you.',
    forget: 'Forget this browser',
    forgotten: 'Done — this browser is forgotten.',
    trackerTitle: 'Analytics',
    trackerState: (d) =>
      d === 'granted' ? 'Google Analytics: allowed.' : 'Google Analytics: refused.',
    change: (d) => (d === 'granted' ? 'Turn it off' : 'Allow it'),
    policy: 'Privacy Policy',
  },
};

/** Событие, которым подвал открывает панель. */
export const OPEN_CONSENT_EVENT = 'fms:open-consent';

/**
 * Google Consent Mode v2. Отказ по умолчанию выставляется ДО загрузки
 * gtag.js — иначе тег успевает отправить первый хит до того, как узнает
 * об отказе, и гейт становится украшением.
 */
function denyByDefault() {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  const push = (...args: unknown[]) => w.dataLayer!.push(args);
  push('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });
}

function loadTracker(id: string) {
  if (document.getElementById('fms-ga')) return;
  denyByDefault();

  const w = window as unknown as { dataLayer?: unknown[] };
  const push = (...args: unknown[]) => w.dataLayer!.push(args);
  push('consent', 'update', { analytics_storage: 'granted' });
  push('js', new Date());
  push('config', id, { anonymize_ip: true });

  const s = document.createElement('script');
  s.id = 'fms-ga';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export default function ConsentGate({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const trackerId = process.env.NEXT_PUBLIC_GA_ID ?? '';
  const configured = trackerId.length > 0;

  // Выбор и состояние ключа читаются из хранилища через подписку: так
  // видно изменение из другой вкладки, и так React не жалуется на
  // setState в эффекте.
  const rawConsent = useSyncExternalStore(
    subscribeConsent, consentSnapshot, consentServerSnapshot,
  );
  const record = useMemo(() => parseConsent(rawConsent), [rawConsent]);

  const keyState = parseBrowserSnapshot(useSyncExternalStore(
    subscribeConsent, browserSnapshot, browserServerSnapshot,
  ));

  // До гидрации мы не знаем, выбирал ли человек, — и не рисуем ничего,
  // иначе баннер мигнул бы тем, кто уже ответил.
  const ready = useSyncExternalStore(
    mountedSubscribe, mountedSnapshot, mountedServerSnapshot,
  );

  const [panel, setPanel] = useState(false);
  const [forgotten, setForgotten] = useState(false);

  useEffect(() => {
    const open = () => { setForgotten(false); setPanel(true); };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  // Трекер грузится только по явному «да» и только после гидрации.
  useEffect(() => {
    if (!ready) return;
    if (shouldLoadTracker(configured, record)) loadTracker(trackerId);
  }, [ready, configured, record, trackerId]);

  const decide = useCallback((decision: Decision) => {
    const next = makeConsent(decision);
    try {
      globalThis.localStorage?.setItem(CONSENT_KEY, JSON.stringify(next));
    } catch { /* не сохранилось — спросим в следующий раз */ }
    notifyConsentChanged();
    // Отзыв согласия должен реально выключать тег, а не только менять
    // надпись. gtag живёт до перезагрузки, поэтому перезагружаем.
    if (decision === 'denied' && document.getElementById('fms-ga')) {
      window.location.reload();
    }
  }, []);

  const forget = useCallback(() => {
    forgetBrowser();
    notifyConsentChanged();
    setForgotten(true);
  }, []);

  if (!ready) return null;

  const screen = screenFor(configured, record);

  return (
    <>
      {screen === 'banner' && (
        <div className={styles.banner} role="region" aria-label={copy.bannerTitle}>
          <div className={styles.bannerText}>
            <strong>{copy.bannerTitle}</strong>
            <p>{copy.bannerBody}</p>
          </div>
          <div className={styles.bannerButtons}>
            {/* Отказ первым и тем же весом: CNIL требует, чтобы отказаться
                было не труднее, чем согласиться. */}
            <button type="button" className={styles.btn} onClick={() => decide('denied')}>
              {copy.refuse}
            </button>
            <button type="button" className={styles.btn} onClick={() => decide('granted')}>
              {copy.accept}
            </button>
          </div>
          <button
            type="button"
            className={styles.bannerMore}
            onClick={() => setPanel(true)}
          >
            {copy.more}
          </button>
        </div>
      )}

      {panel && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={copy.panelTitle}>
          <div className={styles.panel}>
            <header className={styles.panelTop}>
              <h2>{copy.panelTitle}</h2>
              <button
                type="button"
                className={styles.close}
                onClick={() => setPanel(false)}
                aria-label={copy.close}
              >
                ✕
              </button>
            </header>

            <p className={styles.lead}>{copy.noCookies}</p>

            <section className={styles.section}>
              <h3>{copy.measureTitle}</h3>
              <p>{copy.measureBody}</p>
            </section>

            <section className={styles.section}>
              <h3>{copy.keyTitle}</h3>
              <p>
                {keyState.present ? copy.keyPresent(keyState.runs) : copy.keyAbsent}
              </p>
              <p>{copy.keyBody}</p>
              {forgotten ? (
                <p className={styles.done}>{copy.forgotten}</p>
              ) : (
                <button
                  type="button"
                  className={styles.btn}
                  onClick={forget}
                  disabled={!keyState.present}
                >
                  {copy.forget}
                </button>
              )}
            </section>

            {configured && (
              <section className={styles.section}>
                <h3>{copy.trackerTitle}</h3>
                <p>{record ? copy.trackerState(record.decision) : copy.bannerBody}</p>
                {record ? (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => decide(record.decision === 'granted' ? 'denied' : 'granted')}
                  >
                    {copy.change(record.decision)}
                  </button>
                ) : (
                  <div className={styles.bannerButtons}>
                    <button type="button" className={styles.btn} onClick={() => decide('denied')}>
                      {copy.refuse}
                    </button>
                    <button type="button" className={styles.btn} onClick={() => decide('granted')}>
                      {copy.accept}
                    </button>
                  </div>
                )}
              </section>
            )}

            <Link className={styles.policyLink} href={`/${locale}/privacy-policy`}>
              {copy.policy}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

/** Ссылка для подвала: открывает панель, не зная о её внутреннем состоянии. */
export function ConsentLink({ locale }: { locale: Locale }) {
  return (
    <button
      type="button"
      className={styles.footerLink}
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      {COPY[locale].open}
    </button>
  );
}
