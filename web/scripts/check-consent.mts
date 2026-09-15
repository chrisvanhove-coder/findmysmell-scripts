/**
 * Проверка гейта согласия.
 *
 * Запуск:  cd web && npm run check:consent
 *
 * Прежний баннер в проде был украшением: он просил согласия, а загрузка
 * трекеров в нём была закомментирована. Здесь проверяется ровно
 * противоположное — что без явного «да» трекер НЕ грузится ни в одном
 * состоянии, и что текст баннера не обещает того, чего на сайте нет.
 */
import { readFileSync } from 'node:fs';
import {
  CONSENT_KEY,
  CONSENT_VERSION,
  makeConsent,
  parseConsent,
  screenFor,
  shouldLoadTracker,
} from '../src/lib/consent.ts';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`);
  }
}

const granted = makeConsent('granted');
const denied = makeConsent('denied');

console.log('\nБез явного согласия трекер не грузится');
{
  // Это главная проверка файла. Любое состояние, кроме «настроен И
  // согласился», обязано давать false.
  const cases: Array<[string, boolean, ReturnType<typeof parseConsent>]> = [
    ['трекер не настроен, выбора нет', false, null],
    ['трекер не настроен, человек согласился', false, granted],
    ['трекер не настроен, человек отказался', false, denied],
    ['трекер настроен, выбора ещё нет', true, null],
    ['трекер настроен, человек отказался', true, denied],
  ];
  for (const [label, configured, record] of cases) {
    check(`не грузится: ${label}`, !shouldLoadTracker(configured, record));
  }
  check('грузится только при «настроен + согласился»',
    shouldLoadTracker(true, granted));
}

console.log('\nЧто показывается');
{
  // Пока трекеров нет, спрашивать не о чем: баннер про несуществующие
  // куки — это неверное утверждение в юридическом уведомлении.
  check('без трекера баннера нет', screenFor(false, null) === 'nothing');
  check('без трекера баннера нет и после выбора',
    screenFor(false, granted) === 'nothing');
  check('с трекером и без выбора — баннер', screenFor(true, null) === 'banner');
  check('с трекером и с выбором — тихо', screenFor(true, granted) === 'quiet');
  check('отказ тоже закрывает баннер навсегда',
    screenFor(true, denied) === 'quiet');
}

console.log('\nРазбор записи в хранилище');
{
  check('своя запись читается', parseConsent(JSON.stringify(granted))?.decision === 'granted');
  check('отказ читается', parseConsent(JSON.stringify(denied))?.decision === 'denied');
  check('есть время выбора — согласие доказуемо',
    typeof parseConsent(JSON.stringify(granted))?.at === 'string');

  const broken: Array<[string, string | null]> = [
    ['пусто', null],
    ['пустая строка', ''],
    ['не json', '{не json'],
    ['не объект', '"granted"'],
    ['число', '42'],
    ['null внутри', 'null'],
    ['без решения', JSON.stringify({ v: CONSENT_VERSION, at: '2026-01-01' })],
    ['чужое решение', JSON.stringify({ v: CONSENT_VERSION, decision: 'maybe', at: 'x' })],
    ['без времени', JSON.stringify({ v: CONSENT_VERSION, decision: 'granted' })],
    ['старая версия вопроса', JSON.stringify({ v: 0, decision: 'granted', at: 'x' })],
    ['будущая версия вопроса', JSON.stringify({ v: 99, decision: 'granted', at: 'x' })],
  ];
  for (const [label, raw] of broken) {
    check(`битая запись (${label}) = «не выбирал»`, parseConsent(raw) === null);
  }

  // Самое опасное: битая или устаревшая запись НЕ должна превращаться
  // в согласие.
  for (const [label, raw] of broken) {
    check(`битая запись (${label}) не грузит трекер`,
      !shouldLoadTracker(true, parseConsent(raw)));
  }
}

console.log('\nКод гейта делает то, что обещает');
{
  const gate = readFileSync('src/components/ConsentGate.tsx', 'utf8');

  check('тег грузится только через shouldLoadTracker',
    gate.includes('if (shouldLoadTracker(configured, record)) loadTracker'),
    'загрузка не должна вызываться ни из какой другой ветки');
  check('Consent Mode выставляет отказ по умолчанию',
    gate.includes("analytics_storage: 'denied'"));
  check('отказ по умолчанию стоит ДО вставки gtag.js',
    gate.indexOf('denyByDefault()') < gate.indexOf('googletagmanager.com'),
    'иначе тег успеет отправить первый хит');
  check('отзыв согласия перезагружает страницу',
    gate.includes("if (decision === 'denied' && document.getElementById('fms-ga'))"),
    'gtag живёт до перезагрузки — иначе отзыв только меняет надпись');
  check('id трекера экранируется в адресе',
    gate.includes('encodeURIComponent(id)'));
  check('кнопка отказа стоит раньше кнопки согласия',
    gate.indexOf("decide('denied')") < gate.indexOf("decide('granted')"),
    'CNIL: отказаться не должно быть труднее, чем согласиться');

  const css = readFileSync('src/components/consent.module.css', 'utf8');
  check('у кнопок один класс, а значит один вес',
    (gate.match(/className=\{styles\.btn\}/g) ?? []).length >= 4
    && !/\.btnAccept|\.btnPrimary/.test(css),
    'разный вид кнопок — это тёмный паттерн');

  check('баннер не накрывает подвал с обязательными ссылками',
    css.includes('bottom: var(--fms-footer-h'));
}

console.log('\nТекст не обещает того, чего нет');
{
  const gate = readFileSync('src/components/ConsentGate.tsx', 'utf8');
  // Формулировки из старого баннера, которые были неправдой.
  for (const lie of [
    'We use cookies to personalize',
    'affiliate tracking',
    'Accept All Cookies',
  ]) {
    check(`нет формулировки «${lie}»`, !gate.includes(lie));
  }
  check('панель прямо говорит, что куки не ставятся',
    gate.includes('This site sets no cookies.'));
  check('панель говорит, что ключ про браузер, а не про человека',
    gate.includes('It identifies a browser, not you'));
  check('панель не обещает удалить уже отправленные прохождения',
    gate.includes('we cannot find them to delete'),
    'кнопка «забыть браузер» стирает ключ, а не строки в базе');

  const store = readFileSync('src/lib/answers-store.ts', 'utf8');
  check('кнопка «забыть браузер» стирает и ключ, и счётчик',
    /forgetBrowser[\s\S]*BROWSER_KEY, RUNS_KEY/.test(store));
}

console.log('\nСогласованность с политикой');
{
  const policy = readFileSync('src/data/privacy.en.json', 'utf8');
  const gateOn = Boolean(process.env.NEXT_PUBLIC_GA_ID);
  // Политика утверждает, что сторонних трекеров нет. Пока это так, всё
  // сходится. Если однажды ключ GA будет задан на сборке, политику надо
  // править — и эта проверка об этом скажет.
  check('политика утверждает отсутствие сторонней аналитики',
    policy.includes('We run no third-party analytics'));
  check('ключ GA не задан, значит политика ещё верна', !gateOn,
    'NEXT_PUBLIC_GA_ID задан — раздел 4 политики надо переписать, '
    + 'там сказано, что сторонней аналитики нет');
  check('ключ хранения выбора не совпадает со старым webflow-ключом',
    CONSENT_KEY !== 'cookieConsent',
    'старый ключ означал согласие на другой вопрос');
}

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
