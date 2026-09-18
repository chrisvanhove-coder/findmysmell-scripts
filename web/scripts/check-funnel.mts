/**
 * Проверки измерения воронки. Роут открыт наружу, поэтому граница проверяется
 * тестом, а не на доверии: что принимается, что отбрасывается, и — главное —
 * что в строку не попадает ничего личного.
 *
 * Запуск: npm run check:funnel
 */
import { readFileSync } from 'node:fs';
import { parseFunnelEvent, FUNNEL_LIMITS } from '../src/lib/funnel-event.ts';

let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok    ${name}`);
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`); }
}

const good = { runToken: 'abc-123', step: 'Q_ENV_CHILD', event: 'view', locale: 'en' };

console.log('\nчто принимается');
check('минимальное валидное событие', parseFunnelEvent(good).ok);
check('с кодом ответа',
  parseFunnelEvent({ ...good, event: 'answer', answerCode: 'Q_ENV_CHILD__SEA' }).ok);
check('служебные шаги RESULT и EMAIL_SENT',
  parseFunnelEvent({ ...good, step: 'RESULT' }).ok &&
  parseFunnelEvent({ ...good, step: 'EMAIL_SENT' }).ok);
check('answerCode: null допустим', parseFunnelEvent({ ...good, answerCode: null }).ok);

console.log('\nчто отбрасывается');
for (const [name, body] of [
  ['не объект', 'nope'],
  ['без runToken', { ...good, runToken: undefined }],
  ['пустой runToken', { ...good, runToken: '   ' }],
  ['слишком длинный runToken', { ...good, runToken: 'x'.repeat(FUNNEL_LIMITS.runToken + 1) }],
  ['неизвестный event', { ...good, event: 'click' }],
  ['шаг не по формату', { ...good, step: 'DROP TABLE users' }],
  ['шаг в нижнем регистре', { ...good, step: 'q_gender' }],
  ['произвольный шаг', { ...good, step: 'SOMETHING_ELSE' }],
  ['без locale', { ...good, locale: undefined }],
  ['слишком длинный answerCode', { ...good, answerCode: 'x'.repeat(FUNNEL_LIMITS.answerCode + 1) }],
] as [string, unknown][]) {
  check(name, parseFunnelEvent(body).ok === false);
}

console.log('\nчто в строку не попадает (это и есть основание не спрашивать согласия)');
const r = parseFunnelEvent({
  ...good,
  event: 'answer',
  answerCode: 'Q_ATMOS__SEA_AIR',
  // Всё это клиент может прислать, и всё это должно быть выброшено.
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0',
  referrer: 'https://google.com/search?q=perfume',
  email: 'someone@example.com',
  openAnswer: 'my grandmother kitchen',
  screen: '390x844',
  city: 'Lyon',
});
const keys = r.ok ? Object.keys(r.value).sort() : [];
check('в строке ровно пять полей и ни одного лишнего',
  keys.join(',') === 'answerCode,event,locale,runToken,step', keys.join(','));
for (const k of ['ip', 'userAgent', 'referrer', 'email', 'openAnswer', 'screen', 'city']) {
  check(`${k} отброшен`, !keys.includes(k));
}

console.log('\nсогласованность со схемой и политикой');
const schema = readFileSync('src/db/schema.ts', 'utf8');
const funnelBlock = schema.slice(schema.indexOf('export const funnelEvents'));
for (const forbidden of ['ipAddress', 'userAgent', 'referrer', 'fingerprint']) {
  check(`в таблице нет колонки ${forbidden}`, !funnelBlock.includes(forbidden));
}
const purge = readFileSync('scripts/purge-retention.mts', 'utf8');
check('срок funnel_events в скрипте очистки — 13 месяцев',
  /funnel_events'[^}]*months:\s*13/.test(purge));
check('срок submissions — 36 месяцев (политика: 3 года)',
  /submissions'[^}]*months:\s*36/.test(purge));
check('срок subscribers — 12 месяцев (политика: 12 месяцев)',
  /subscribers'[^}]*months:\s*12/.test(purge));
check('очистка по умолчанию ничего не удаляет',
  purge.includes("includes('--apply')"));

const policy = readFileSync('src/data/privacy.en.json', 'utf8');
check('политика по-прежнему честна: куки не ставятся',
  policy.includes('This website sets no cookies'));
check('политика описывает измерение аудитории',
  /audience measurement|Audience Measurement/.test(policy),
  'нужен раздел про измерение — иначе собираем то, о чём не сказали');

// Ключ браузера — уже хранение на устройстве, и он живёт 13 месяцев, а не
// до конца сессии. Раз он есть в коде, он обязан быть и в политике, иначе
// освобождение CNIL на него не распространяется.
const keyInCode = readFileSync('src/lib/answers-store.ts', 'utf8').includes('fms_browser');
check('политика раскрывает ключ браузера',
  !keyInCode || /Recognising Repeat Runs/.test(policy),
  'в коде есть fms_browser — в политике должен быть раздел 4.4');
check('политика не называет ответы полностью анонимными',
  !keyInCode || !/For anonymous quiz responses/.test(policy),
  'с ключом браузера это псевдонимность, а не анонимность');
check('срок ключа браузера в коде — 13 месяцев',
  readFileSync('src/lib/answers-store.ts', 'utf8').includes('13 * 30'),
  'потолок CNIL для идентификаторов измерения');

/* Шаг RESULT должен считать всех, кто дошёл до результата, а не только тех,
   чьё прохождение записалось. Один раз уже случилось обратное: отправку
   события занесли внутрь эффекта, который выходит по «нет согласия»,
   «ответы неполные» и «уже отправлено», — и последний шаг воронки стал
   мерить сохранение, а не приход. Проверяем по исходнику: событие RESULT
   стоит ВЫШЕ этих условий. */
const record = readFileSync('src/app/[locale]/result/[archetype]/RecordSubmission.tsx', 'utf8');
const resultStep = record.indexOf("step: 'RESULT'");
const consentGuard = record.indexOf('loadResearchConsent()');
check('шаг RESULT отправляется до проверки согласия',
  resultStep !== -1 && consentGuard !== -1 && resultStep < consentGuard,
  'иначе «дошёл до результата» окажется меньше правды');
check('шаг RESULT не зависит от флага отправки',
  resultStep !== -1 && resultStep < record.indexOf('wasSent()'),
  'перезагрузка страницы результата — это тоже приход на шаг');

console.log(failed ? `\n${failed} проверок упало\n` : '\nвсе проверки прошли\n');
process.exit(failed ? 1 : 0);
